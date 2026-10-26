import { NextResponse } from 'next/server';
import { authorizeHelpdesk } from '@/lib/server/helpdesk';

export async function GET(request) {
  try {
    const {auth} = await authorizeHelpdesk();
    const path=new URL(request.url).searchParams.get('path') || '';
    if (!path || path.includes('..') || path.startsWith('/')) return NextResponse.json({error:'Invalid attachment path.'},{status:400});
    const {data,error} = await auth.storage.from('ticket-attachments').createSignedUrl(path,60);
    if (error || !data?.signedUrl) return NextResponse.json({error:'Attachment access denied.'},{status:403});
    return NextResponse.redirect(data.signedUrl,{status:307,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
  } catch(error) { return NextResponse.json({error:error.message},{status:error.status || 400}); }
}
