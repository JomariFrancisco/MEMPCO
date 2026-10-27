import test from 'node:test';
import assert from 'node:assert/strict';
import { attachmentPath, privateAttachment, isActiveAccount, validateTransition, mergeMessages, queueRank, handlingMilliseconds, isHelpdeskQueueEligible, BURNOUT_REQUIRED_TESTS, BURNOUT_REQUIRED_SOFTWARE, BURNOUT_REQUIRED_MONITORING, BURNOUT_REQUIRED_EVALUATION, monthlyTicketSnapshots } from '../lib/tickets/workflow.mjs';

test('only explicitly active accounts pass', () => {
  for (const status of ['Locked', 'Inactive', '', null]) assert.equal(isActiveAccount({status}), false);
  assert.equal(isActiveAccount({status:'Active'}), true);
});
test('normal closure and reopening require evidence and authority', () => {
  const ticket = {status:'In Progress'};
  assert.throws(() => validateTransition(ticket, {status:'Resolved'}, {role:'admin'}));
  assert.doesNotThrow(() => validateTransition(ticket, {status:'Resolved',resolution:'Restored network access.'}, {role:'admin'}));
  assert.throws(() => validateTransition({status:'Resolved'}, {status:'In Progress',reopenReason:'Member reports recurrence'}, {role:'admin'}));
  assert.doesNotThrow(() => validateTransition({status:'Cancelled'}, {status:'In Progress',reopenReason:'Cancellation was incorrect'}, {role:'superadmin'}));
  assert.throws(() => validateTransition({status:'Created'}, {status:'Resolved',resolution:'Not actually handled yet'}, {role:'admin'}));
});
test('Burnout cannot pass without evidence or before three full days', () => {
  const ticket = {status:'Under Burnout',support_category:'Burnout'};
  assert.throws(() => validateTransition(ticket, {status:'Passed Burnout'}, {role:'admin'}));
  const burnoutReport = {
    testingChecklist:BURNOUT_REQUIRED_TESTS.map(id=>({id,status:'Pass'})),
    softwareChecklist:BURNOUT_REQUIRED_SOFTWARE.map(id=>({id,installed:true})),
    monitoring:BURNOUT_REQUIRED_MONITORING.map(id=>({id,result:'Stable',remarks:'Observed throughout testing.'})),
    finalEvaluation:BURNOUT_REQUIRED_EVALUATION.map(id=>({id,status:'Complete',remarks:'Reviewed and recorded by ICT.'})),
  };
  assert.throws(() => validateTransition(
    {...ticket,burnout_started_at:'2026-01-01T00:00:00Z'},
    {status:'Passed Burnout',burnoutReport:{...burnoutReport,finalEvaluation:[]}},
    {role:'admin'},
    Date.parse('2026-01-04T00:00:00Z')
  ));
  assert.throws(() => validateTransition(ticket, {status:'Passed Burnout',burnoutReport}, {role:'admin'}));
  assert.doesNotThrow(() => validateTransition({...ticket,burnout_started_at:'2026-01-01T00:00:00Z'}, {status:'Passed Burnout',burnoutReport}, {role:'admin'}, Date.parse('2026-01-04T00:00:00Z')));
});
test('history merge preserves live arrivals and deduplicates IDs', () => {
  const live = {id:'b',createdAtRaw:'2026-01-02T00:00:00Z'};
  assert.deepEqual(mergeMessages([live],[{id:'a',createdAtRaw:'2026-01-01T00:00:00Z'},live]).map(row=>row.id),['a','b']);
});
test('stored file URLs become authenticated downloads', () => {
  const path='user/saar/approval.pdf';
  assert.equal(attachmentPath({url:`https://example.invalid/storage/v1/object/public/ticket-attachments/${path}`}),path);
  assert.equal(privateAttachment({path}).url,`/api/tickets/attachments?path=${encodeURIComponent(path)}`);
  assert.equal(attachmentPath({url:'https://external.invalid/not-a-pdf'}),'');
});
test('queue ordering separates medium and low', () => assert.ok(queueRank({sla:'Medium'}) < queueRank({sla:'Low'})));
test('helpdesk queue includes new Burnout requests and excludes assigned, started, or locked tickets', () => {
  const ticket = {status:'Created',supportCategory:'General ICT',technician:'Unassigned',priority:'Low'};
  assert.equal(isHelpdeskQueueEligible(ticket), true);
  assert.equal(isHelpdeskQueueEligible({...ticket,supportCategory:'Burnout'}), true);
  assert.equal(isHelpdeskQueueEligible({...ticket,supportCategory:'Burnout',status:'For Inspection'}), false);
  assert.equal(isHelpdeskQueueEligible({...ticket,technicianId:'staff-1'}), false);
  assert.equal(isHelpdeskQueueEligible({...ticket,workStartedAt:'2026-01-01T00:00:00Z'}), false);
  assert.equal(isHelpdeskQueueEligible({...ticket,lockedBy:'staff-1',lockExpiresAt:new Date(Date.now()+60_000).toISOString()}), false);
});
test('reopened handling sums sessions, not closed time', () => {
  assert.equal(handlingMilliseconds({handlingSeconds:3600,workStartedAt:'2026-01-08T00:00:00Z'},Date.parse('2026-01-08T00:10:00Z')),4200000);
});
test('monthly reports use period-end state and distinguish carry-in from submissions',()=>{
  const ticket={id:'1',status:'Resolved',createdAtRaw:'2026-09-01T00:00:00Z',statusHistory:[{status:'Submitted',timestamp:'2026-09-01T00:00:00Z'},{status:'Resolved',timestamp:'2026-10-20T00:00:00Z'}]};
  assert.equal(monthlyTicketSnapshots([ticket],new Date(2026,8,1))[0].status,'Created');
  const october=monthlyTicketSnapshots([ticket],new Date(2026,9,1))[0];
  assert.equal(october.periodSubmitted,false);assert.equal(october.periodResolved,true);
});
