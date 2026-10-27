import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { sanitizeStoredAttachment, uploadDataUrlToStorage } from '@/lib/server/storageUploads';
import { attachmentPath, isActiveAccount } from '@/lib/tickets/workflow.mjs';

export async function authorizeHelpdesk() {
  const auth = await createClient();
  const {data:{user},error} = await auth.auth.getUser();
  if (error || !user) throw Object.assign(new Error('Login required.'),{status:401});
  const {data:validSession,error:sessionError}=await auth.rpc('has_valid_portal_session');
  if (sessionError || validSession !== true) throw Object.assign(new Error('Your portal session is no longer active. Please sign in again.'),{status:403});
  const {data:profile,error:profileError} = await auth.from('profiles').select('id,role,full_name,email,status').eq('id',user.id).single();
  if (profileError || !isActiveAccount(profile)) throw Object.assign(new Error('An active portal session and account are required.'),{status:403});
  if (!hasSupabaseAdminConfig()) throw Object.assign(new Error('The secure helpdesk server is not configured.'),{status:503});
  return {auth,user,profile,db:createAdminClient()};
}

export async function storeHelpdeskAttachment(db, attachment, {folder,allowedTypes,maxBytes,uploadedPaths=[]}) {
  if (!attachment) return null;
  if (String(attachment.dataUrl || '').startsWith('data:')) {
    const uploaded = await uploadDataUrlToStorage(db,{bucket:'ticket-attachments',folder,dataUrl:attachment.dataUrl,fileName:attachment.name,allowedTypes,maxBytes});
    if (!uploaded) throw new Error('Invalid attachment data.');
    uploadedPaths.push(uploaded.path);
    return {...sanitizeStoredAttachment(attachment),...uploaded,id:uploaded.path};
  }
  const path = attachmentPath(attachment);
  if (!path || path.includes('..') || !path.startsWith(`${folder.split('/')[0]}/`)) throw new Error('Choose an uploaded attachment belonging to this ticket owner.');
  const {data,error} = await db.storage.from('ticket-attachments').download(path);
  if (error || !data || data.size > maxBytes || !allowedTypes.includes(data.type)) throw new Error('The attachment could not be verified. Upload the file again.');
  const bytes=Buffer.from(await data.slice(0,12).arrayBuffer());
  const validType={
    'application/pdf':()=>bytes.subarray(0,5).toString()==='%PDF-',
    'image/jpeg':()=>bytes[0]===255&&bytes[1]===216&&bytes[2]===255,
    'image/png':()=>bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'image/gif':()=>/^GIF8[79]a$/.test(bytes.subarray(0,6).toString()),
    'image/webp':()=>bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP',
  }[data.type];
  if (!validType?.()) throw new Error('File contents do not match the declared attachment type. Upload it again.');
  return {...sanitizeStoredAttachment(attachment),path,type:data.type,size:data.size};
}

export async function removeHelpdeskFiles(db, paths) {
  const safe = [...new Set(paths)].filter(path=>typeof path==='string' && path && !path.includes('..') && !path.startsWith('/'));
  if (!safe.length) return;
  const {error} = await db.storage.from('ticket-attachments').remove(safe);
  if (error) {
    await db.from('helpdesk_file_cleanup').upsert(safe.map(path=>({path})),{onConflict:'path'});
    console.error('[Helpdesk attachment cleanup]',error.message);
  }
}

export async function drainHelpdeskCleanup(db) {
  const {data,error} = await db.from('helpdesk_file_cleanup').select('path').order('queued_at').limit(100);
  if (error || !data?.length) return;
  const paths=data.map(row=>row.path);
  const {error:removeError} = await db.storage.from('ticket-attachments').remove(paths);
  if (!removeError) await db.from('helpdesk_file_cleanup').delete().in('path',paths);
}
