import { NextResponse } from 'next/server';
import { authorizeHelpdesk, storeHelpdeskAttachment, removeHelpdeskFiles, drainHelpdeskCleanup } from '@/lib/server/helpdesk';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';

export async function POST(request) {
  const uploadedPaths=[];
  let db, saved=false;
  try {
    const authorization=await authorizeHelpdesk();
    const authClient=authorization.auth;
    const {user}=authorization;
    db=authorization.db;
    await drainHelpdeskCleanup(db);
    const rate=checkRateLimit(request,{key:'helpdesk:messages',identity:user.id,limit:30,windowMs:60000});
    if (!rate.allowed) return rateLimitResponse(rate);
    const body=await request.json();
    const message=String(body.message || '').trim();
    const clientMessageId=String(body.clientMessageId || '');
    const attachments=body.attachments || [];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMessageId)) throw new Error('Refresh the conversation and try sending again.');
    if (!Array.isArray(attachments) || attachments.length>5 || message.length>10000 || (!message && !attachments.length)) throw new Error('Enter a message or up to five photos.');
    const attachmentBytes=attachments.reduce((total,attachment)=>{
      const dataUrl=String(attachment?.dataUrl || '');
      const encoded=dataUrl.match(/^data:[^;,]+;base64,(.*)$/s)?.[1];
      return total+(encoded ? Math.floor(encoded.length*3/4) : 0);
    },0);
    if (attachmentBytes > 10*1024*1024) throw new Error('Conversation photos cannot exceed 10 MB in total.');
    const {data:ticket,error} = await authClient.from('tickets').select('id').eq('id',body.ticketId).single();
    if (error || !ticket) throw Object.assign(new Error('Ticket access denied.'),{status:403});
    const stored=[];
    for (const attachment of attachments) stored.push(await storeHelpdeskAttachment(db,attachment,{
      folder:`${user.id}/messages/${ticket.id}`,allowedTypes:['image/jpeg','image/png','image/gif','image/webp'],maxBytes:4*1024*1024,uploadedPaths,
    }));
    const result=await db.rpc('send_helpdesk_message',{target_ticket_id:ticket.id,message_text:message,message_attachments:stored,actor_id:user.id,p_client_message_id:clientMessageId});
    if (result.error) throw new Error(result.error.message);
    const savedPaths=new Set((result.data?.attachments || []).map((attachment) => attachment?.path).filter(Boolean));
    await removeHelpdeskFiles(db,uploadedPaths.filter((path) => !savedPaths.has(path)));
    saved=true;
    const {data:ticketState,error:ticketStateError}=await db.from('tickets').select('version').eq('id',ticket.id).single();
    return NextResponse.json({message:result.data,ticketVersion:ticketStateError ? null : ticketState.version});
  } catch(error) {
    if (db && !saved) await removeHelpdeskFiles(db,uploadedPaths);
    return NextResponse.json({error:error.message},{status:error.status || 400});
  }
}
