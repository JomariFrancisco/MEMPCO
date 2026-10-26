import { NextResponse } from 'next/server';
import { authorizeHelpdesk, storeHelpdeskAttachment, removeHelpdeskFiles, drainHelpdeskCleanup } from '@/lib/server/helpdesk';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';
import { isClosed } from '@/lib/tickets/workflow.mjs';

export async function POST(request) {
  const uploadedPaths=[];
  let db, saved=false;
  try {
    const auth=await authorizeHelpdesk(); db=auth.db;
    await drainHelpdeskCleanup(db);
    const rate=checkRateLimit(request,{key:'helpdesk:messages',identity:auth.user.id,limit:30,windowMs:60000});
    if (!rate.allowed) return rateLimitResponse(rate);
    const body=await request.json();
    const message=String(body.message || '').trim();
    const attachments=body.attachments || [];
    if (!Array.isArray(attachments) || attachments.length>5 || message.length>10000 || (!message && !attachments.length)) throw new Error('Enter a message or up to five photos.');
    const attachmentBytes=attachments.reduce((total,attachment)=>{
      const dataUrl=String(attachment?.dataUrl || '');
      const encoded=dataUrl.match(/^data:[^;,]+;base64,(.*)$/s)?.[1];
      return total+(encoded ? Math.floor(encoded.length*3/4) : 0);
    },0);
    if (attachmentBytes > 10*1024*1024) throw new Error('Conversation photos cannot exceed 10 MB in total.');
    const {data:ticket,error} = await auth.from('tickets').select('id,status,owner_id,technician,work_started_at').eq('id',body.ticketId).single();
    if (error || !ticket) throw Object.assign(new Error('Ticket access denied.'),{status:403});
    if (isClosed(ticket.status) || (!ticket.work_started_at && ticket.technician==='Unassigned')) throw new Error('Conversation is closed.');
    const stored=[];
    for (const attachment of attachments) stored.push(await storeHelpdeskAttachment(db,attachment,{
      folder:`${auth.user.id}/messages/${ticket.id}`,allowedTypes:['image/jpeg','image/png','image/gif','image/webp'],maxBytes:4*1024*1024,uploadedPaths,
    }));
    const result=await db.rpc('send_helpdesk_message',{target_ticket_id:ticket.id,message_text:message,message_attachments:stored,actor_id:auth.user.id});
    if (result.error) throw new Error(result.error.message);
    saved=true;
    const {data:ticketState,error:ticketStateError}=await db.from('tickets').select('version').eq('id',ticket.id).single();
    return NextResponse.json({message:result.data,ticketVersion:ticketStateError ? null : ticketState.version});
  } catch(error) {
    if (db && !saved) await removeHelpdeskFiles(db,uploadedPaths);
    return NextResponse.json({error:error.message},{status:error.status || 400});
  }
}
