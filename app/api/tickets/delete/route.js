import { NextResponse } from 'next/server';
import { authorizeHelpdesk, drainHelpdeskCleanup } from '@/lib/server/helpdesk';

export async function POST(request) {
  try {
    const {auth,profile,db}=await authorizeHelpdesk();
    if (profile.role!=='superadmin') return NextResponse.json({error:'Only the superadmin can delete tickets.'},{status:403});
    const {ticketId}=await request.json();
    if (!ticketId) throw new Error('Ticket ID is required.');
    const {error}=await auth.rpc('delete_helpdesk_ticket',{target_ticket_id:ticketId});
    if (error) throw new Error(error.message);
    await drainHelpdeskCleanup(db);
    return NextResponse.json({deleted:true});
  } catch(error) {return NextResponse.json({error:error.message},{status:error.status || 400});}
}
