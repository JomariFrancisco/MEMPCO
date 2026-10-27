# ICT Helpdesk Consolidated Findings

Review date: 2026-10-23  
Status: Findings compiled; local application and migration changes are present. The migration has not been applied to any Supabase project.

## Scope

This report consolidates the three ICT helpdesk review rounds into one register. It covers employee submission and editing, ICT administration, ticket APIs, Supabase policies and storage, conversations, Burnout handling, notifications, queues, reporting, and account lifecycle effects on ticket records.

The separate MRDSS case-trail and concern-type requests are outside this report. Existing unrelated worktree changes have not been reverted or modified.

Findings retain their original review order as F01-F25. Related findings are cross-referenced rather than treated as interchangeable defects.

## Executive Summary

| Review Priority | Count | Meaning |
| --- | ---: | --- |
| P1 | 9 | Address first: access control, confidentiality, record retention, concurrency, or materially unsafe workflow behavior. |
| P2 | 16 | Address next: correctness, reliability, reporting, usability, or scaling risks. |
| Total | 25 | Consolidated findings from all three review rounds. |

These review priorities are not the application's ticket SLA or priority labels. Local remediation now defines calendar-hour response and resolution targets: Low 72/120 hours, Medium 24/72 hours, High 24/24 hours, and Critical 8/8 hours. Targets start at submission and continue during waiting states. Burnout units may pass after three full elapsed testing days when the recorded checks are complete; five days remains the target observation window.

The main architectural concern is that ticket handling rules are distributed between browser components, API handlers, and database policies. A rule enforced by one path is not necessarily enforced by the others. Ownership, state transitions, audit events, and record visibility consequently do not have one consistently enforced authority.

### Evidence And Limits

- **Source verified** means the behavior or gap is present in the reviewed repository code. It does not mean a production incident has occurred.
- **In-memory checked** means selected real helpers, effects, or contracts were exercised with controlled inputs and mocked dependencies. These checks are not a complete end-to-end test suite or a live Supabase policy test.
- Database findings assume the deployed database uses the reviewed policies, grants, triggers, and foreign keys. Live deployment state was not compared with the repository.
- The Locked-account API finding depends on an existing valid portal session and the configured service-role write path.
- F18 is explicitly a scaling risk whose activation depends on the configured database response limit and record volume.
- No production data was changed and no live exploit was attempted. The local hardening migration includes best-effort backfills; historical first-response and Burnout start times cannot be reconstructed where they were never recorded.

## Findings Index

| ID | Priority | Area | Finding |
| --- | --- | --- | --- |
| F01 | P1 | Authorization | Direct database access bypasses important API field restrictions. |
| F02 | P1 | Privacy | Ticket files are public and internal-labelled remarks reach employees. |
| F03 | P1 | Concurrency | Ticket locks do not enforce write ownership or prevent stale saves. |
| F04 | P1 | Workflow | Server-side ticket transitions and closure requirements are incomplete. |
| F05 | P1 | Burnout | Defaults and status handling can misrepresent testing and outcomes. |
| F06 | P2 | Audit | Competing, client-writable histories weaken audit reliability. |
| F07 | P2 | Service Process | SLA labels do not provide an executable response and resolution process. |
| F08 | P2 | Queue | Employee and ICT queue calculations disagree. |
| F09 | P2 | Notifications | Alerts do not provide a dependable persistent work-inbox process. |
| F10 | P2 | Identity And Retry | Ticket numbering and submission retries can create identity confusion or duplicates. |
| F11 | P1 | Retention | Account deletion cascades into ticket and conversation history. |
| F12 | P1 | Validation | An unverified URL can satisfy the required SAAR PDF check. |
| F13 | P2 | Realtime | The open-ticket timer repeatedly restarts conversation subscriptions. |
| F14 | P2 | Data Contract | Ticket update responses omit the saved Burnout report. |
| F15 | P2 | Reliability | Users sharing an IP address share the ticket-update rate limit. |
| F16 | P2 | Storage Lifecycle | Failed submissions and deleted tickets leave uploaded files behind. |
| F17 | P2 | Submission | Changing category or concern replaces entered issue details. |
| F18 | P2 | Scaling | Database reads are not paginated even though the UI is. |
| F19 | P1 | Account Control | Locked accounts can pass the ticket API's account-status check. |
| F20 | P1 | Conversation Integrity | Message display names and role labels can be falsified. |
| F21 | P2 | Conversation Delivery | A delayed history fetch can hide a newly received message. |
| F22 | P2 | Reporting | Monthly reports mix period activity with current ticket state. |
| F23 | P2 | Reporting | Hardcoded staff names omit valid administrators from workload totals. |
| F24 | P2 | Timing | Reopened ticket timers include time spent closed. |
| F25 | P2 | Conversation Storage | Chat image data is embedded directly in database rows. |

## Remediation Status

The remaining partial findings were addressed locally as follows. These changes are not active in a deployed environment until the migration and matching application are released.

- **F05:** Employee ticket views now distinguish Passed Burnout, Failed Burnout, Damaged, For Repair, For Replacement, Ready for Deployment, and Deployed from normal Resolved. Passing now requires every required test and software item, all five monitoring records, both final evaluation records, and at least three full elapsed days. Five days remains the target observation period.
- **F07:** The selected internal ICT owner is now a profile ID, separate from the external escalation partner. The existing calendar-hour targets remain Low 72/120, Medium 24/72, High 24/24, and Critical 8/8 for first response/resolution. These are an implementation mapping of the supplied ranges, not an approved business-hours policy. Hourly reminders are in-app only; no email, push, or manager escalation chain is configured.
- **F08:** Admin queue ordering and employee queue positions now share Critical, High, Medium, Low ranking and the same eligibility rules for assignment, work started, notes, Burnout requests, and active edit locks. The migration also accounts for private ICT notes in the employee queue calculation.
- **F09:** An hourly scheduled function creates deduplicated, persistent inbox alerts for overdue first response, resolution, and waiting/scheduled next actions. Alerts go to the requester and assigned ICT staff, or active ICT admins when there is no active ICT assignee. Burnout 3-day/5-day observation reminders remain dashboard-derived. No email or push delivery is included.
- **F23:** New assignments, workload summaries, profile handling lists, and ticket history use stable technician profile IDs. Existing display names are backfilled when they match an ICT profile; unmatched legacy assignments retain their historical text and remain grouped by that text until reassigned.

## Current Ticket Flow

1. An employee submits request details, optional photos, and a SAAR attachment when the request is classified as requiring it. Burnout requests have a separate submission experience and department restriction.
2. The browser calls the ticket API. The API reads the user/profile, derives ticket priority and impact, processes attachments, and creates a ticket with a Submitted history entry.
3. The employee and ICT dashboards load tickets through the client library. Queue positions and dashboard ordering use matching eligibility and priority rules.
4. An administrator opens a ticket and claims an edit lock. The accountable ICT technician is stored by profile ID, independently of the temporary edit lock. Starting work changes status and starts timing; note fields can autosave separately from the main form save.
5. ICT can update notes, select an internal technician profile, set an external escalation partner separately, change priority, defer work through Moved Date, or choose an outcome. Conversations are enabled according to the handling state.
6. A resolution or final Burnout outcome ends timing. Normal resolved records and final Burnout records are treated as closed in relevant UI paths; superadmin reopening is a separate action.
7. Dashboards, reports, and print views reconstruct activity from ticket fields and JSON history. Separate database status-event records also exist, but are not the common reporting authority.

## P1 Findings

### F01. Direct Database Access Bypasses API Restrictions

- **Problem:** Employee ticket UPDATE policies restrict which rows can be changed, but broad table grants do not impose the API's employee field allowlist. Profile UPDATE permissions also allow ICT administrators to modify privileged profile fields without the user-management API's role-change checks.
- **Impact:** Browser/API restrictions are not a complete authorization boundary. Direct authenticated database requests can reach sensitive fields that the normal UI or API would reject.
- **Evidence:** [Ticket UPDATE policy](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1437>), [profile UPDATE policy](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:976>), [table grants](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:2675>).
- **Suggested correction:** Enforce allowed actors, fields, and transitions in the database or a single controlled write interface. Restrict direct writes and protect privileged profile changes independently of the UI.
- **Verification:** Source verified against the repository schema; deployed grants and policies remain to be checked.

### F02. Public Files And Internal Remarks Lack Privacy Boundaries

- **Problem:** The ticket-attachments bucket is public. The administrator notes field invites internal remarks, but the same field is returned and displayed to the employee.
- **Impact:** Possession of a public attachment URL can bypass ticket-specific access checks. Staff may place sensitive information in a field they reasonably interpret as internal, while employees can read it.
- **Evidence:** [Attachment bucket configuration](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:2504>), [public read policy](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:2572>), [internal-note placeholder](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7648>), [employee remarks display](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/employee-dashboard/employee-dashboard.jsx:1933>).
- **Suggested correction:** Use private ticket storage with authorized downloads. Separate genuinely internal notes from requester-visible updates and enforce that separation in returned data.
- **Verification:** Source verified; production bucket state and the sensitivity of existing uploaded documents were not inspected.

### F03. Locks Do Not Enforce Write Ownership

- **Problem:** Claiming a ticket uses a timed lock, but subsequent ticket writes do not require the caller to hold it. Updates also lack a record-version condition. Open-ticket locks expire without a heartbeat extending ownership.
- **Impact:** Two administrators, a stale tab, or a delayed save can overwrite newer work. The lock indicator is not a reliable guarantee of exclusive editing.
- **Evidence:** [Lock RPC](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1516>), [20-minute expiry](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1542>), [UPDATE predicate](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:910>).
- **Suggested correction:** Check lock ownership and expected record version atomically on every relevant write. Add renewal, expiry handling, and an explicit conflict response.
- **Verification:** Source verified. This concerns write concurrency, not just UI lock visibility.

### F04. Transition And Closure Rules Are Incomplete On The Server

- **Problem:** The ticket API accepts mapped status updates without a complete allowed-transition matrix or consistent resolution requirements. Some closed-record protections exist mainly in UI code; note updates can still reach closed records, and normal Cancelled handling does not have the same reopening guard as Resolved handling.
- **Impact:** Callers can create states the normal interface intends to prevent, including incomplete closure or inconsistent reopening behavior.
- **Evidence:** [Server state rules](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:517>), [closed-ticket guard](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:776>), [mapped update path](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:902>).
- **Suggested correction:** Define role-aware commands with required fields and explicit allowed source/destination states. Treat closure, cancellation, and reopening as distinct validated actions.
- **Verification:** Source verified, with selected API behavior checked using mocked dependencies in the earlier review.

### F05. Burnout Defaults And Outcome Labels Can Misrepresent Testing

- **Problem:** New or missing checklist entries default to Pass, software entries default to installed, and other report defaults imply completion. Inspection can start the timing used for Burnout evaluation. Early completion is warned about rather than consistently prevented, and employee views collapse failed or repair-related outcomes into Resolved.
- **Impact:** A report can appear tested without recorded evidence, elapsed inspection time can be mistaken for testing time, and failed units can look successfully resolved to the requester.
- **Evidence:** [Default report](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:2698>), [missing-row defaults](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:2736>), [inspection timing](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:528>), [early-completion handling](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:8342>), [employee status mapping](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/employee-dashboard/employee-dashboard.jsx:429>).
- **Suggested correction:** Start with Not Tested/Not Recorded values; separate inspection from actual testing; enforce the agreed observation policy server-side; preserve successful, failed, repair, and replacement outcomes distinctly.
- **Verification:** Source verified. The exact minimum testing policy should be confirmed before implementation.

### F11. Account Deletion Destroys Helpdesk History

- **Problem:** Account deletion removes the auth user, which cascades into the profile. Ticket ownership and message authorship foreign keys cascade on profile deletion as well.
- **Impact:** Successful employee-account deletion removes owned tickets. Deleting ICT staff also removes their messages from other people's tickets, weakening retained conversation evidence.
- **Evidence:** [Account deletion](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/admin/users/route.js:626>), [profile ownership](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:60>), [ticket ownership](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1058>), [message authorship](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1613>).
- **Suggested correction:** Prefer account deactivation. Retain immutable requester/author snapshots and use a deliberate record-retention policy instead of cascading helpdesk deletion from account administration.
- **Verification:** Source verified against the schema; this describes the cascade when deletion succeeds, not proof that any existing account has already lost records.

### F12. An Unverified URL Satisfies The SAAR Requirement

- **Problem:** Non-data-URL attachments pass through stored-attachment sanitization without verifying a PDF object. The required-SAAR check then treats a nonempty URL or path as sufficient.
- **Impact:** A role-modification request can pass the attachment-presence requirement without a real uploaded SAAR PDF. This is separate from whether an authentic document has actually been approved.
- **Evidence:** [Attachment processing](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:130>), [presence check](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:283>), [submission requirement](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:607>).
- **Suggested correction:** Validate the authorized storage object, owner/path, existence, size, and PDF type before accepting the attachment. Treat approval as a separate workflow requirement if approval must be tracked.
- **Verification:** In-memory checked: a non-PDF external URL satisfied the attachment check without a storage upload or object verification.

### F19. Locked Accounts Pass The Ticket API Status Check

- **Problem:** The API rejects Inactive profiles but accepts Locked profiles. Updating an account's status does not itself revoke the portal-session record in the reviewed account-update path.
- **Impact:** With an existing valid portal session and the service-role API path configured, a Locked user can pass the account check; an administrator's role is still recognized as privileged.
- **Evidence:** [Ticket account check](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:344>), [write-client selection](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:765>), [account update](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/admin/users/route.js:533>).
- **Suggested correction:** Require an explicitly Active account on every protected action, centralize this check, and revoke active sessions when an account is locked or deactivated.
- **Verification:** In-memory checked: getActiveProfile returned a Locked administrator and the role helper still granted administrator classification. No live Locked-account write was attempted.

### F20. Conversation Author Labels Can Be Falsified

- **Problem:** Message sender name, email, and role come from client data. The INSERT policy verifies sender_id and ticket participation, not the accuracy of the displayed author metadata.
- **Impact:** A permitted participant can keep their own authenticated ID while storing another display name or an Admin role label. This misrepresents conversation authorship; it does not by itself grant administrator account permissions.
- **Evidence:** [Message payload](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/tickets/portalTickets.js:980>), [insert policy](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1672>), [display mapping](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/tickets/portalTickets.js:591>).
- **Suggested correction:** Derive author identity and role from the authenticated profile in a trusted write path, then store an immutable author snapshot.
- **Verification:** In-memory checked: the real message helper retained a supplied Admin label and alternate display name for an employee sender ID. Database policy implications were source-reviewed, not live-tested.

## P2 Findings

### F06. Competing, Writable Histories Weaken Audit Reliability

- **Problem:** Browser saves can replace the ticket's status_history JSON. A separate ticket_status_events table is populated by triggers, while permitted participants can also insert status-event rows. Reports mainly interpret the JSON history rather than one authoritative event stream.
- **Impact:** History can be rewritten, dropped during competing saves, or disagree with the database event table. Audit and reporting do not necessarily describe the same sequence of actions.
- **Evidence:** [Client-built history](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:8252>), [history update mapping](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:486>), [event INSERT policy](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1785>), [report history selection](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:1179>).
- **Suggested correction:** Make events append-only and generated by validated actions in the same transaction as the ticket update. Build reporting from that authoritative history.
- **Verification:** Source verified. Related to F03, but concerns audit integrity rather than edit-lock ownership.

### F07. SLA Labels Do Not Form An Executable Service Process

- **Problem:** SLA is primarily a priority/impact label without distinct response and resolution deadlines, explicit pause rules, or a dependable escalation schedule. Moved Date records the action timestamp instead of an explicit future appointment. Escalation uses the technician field for an external partner, replacing internal ownership.
- **Impact:** ICT cannot reliably distinguish response breaches, resolution breaches, waiting time, deferred appointments, and the internal person accountable for an externally handled ticket.
- **Evidence:** [SLA derivation](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/tickets/sla.js:1>), [Moved Date value](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7440>), [technician selection](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7080>), [ticket timing rules](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:517>).
- **Suggested correction:** Separate priority from service targets. Store response/resolution due times, next-action or appointment dates, waiting reasons, internal owner, and external recipient as distinct concepts.
- **Verification:** Source-verified process gap. Required business hours, target durations, and pause policies are not decided by this report.

### F08. Employee And ICT Queues Disagree

- **Problem:** The SQL employee queue ranks Critical, High, Medium, then Low. The administrator queue gives Critical and High special handling but otherwise uses FIFO. The administrator queue also excludes active edit locks, unlike the employee queue calculation.
- **Impact:** An employee's displayed position can disagree with the administrator's visible work order even when both views have fresh data.
- **Evidence:** [Employee queue RPC](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1469>), [administrator queue ordering](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:943>), [lock exclusion](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:4604>).
- **Suggested correction:** Define one queue eligibility and ordering policy, calculated centrally and consumed by both views. Distinguish an edit lock from actually accepting work.
- **Verification:** Source verified; no live queue positions were compared.

### F09. Notifications Do Not Provide A Dependable Work Inbox

- **Problem:** Administrator notification state is updated without being rendered as a corresponding inbox in the reviewed dashboard. Important reminders depend on an open browser, conversation unread counts are local to the modal, and the database notification flow is not a complete assignment/reply/status notification process.
- **Impact:** New work, replies, and overdue follow-ups can be missed when staff are away, the modal closes, or the browser reloads.
- **Evidence:** [Discarded notification-state value](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7846>), [browser reminder generation](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:8085>), [unread reset](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7165>), [submission notification trigger](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1904>).
- **Suggested correction:** Persist recipient-specific events and read positions. Use a visible work inbox and a scheduled delivery mechanism for actionable reminders.
- **Verification:** Source verified. Existing submission notifications do not establish coverage for all ticket lifecycle events.

### F10. Ticket Numbering And Retry Behavior Weaken Identity

- **Problem:** Helpdesk IDs reuse deleted sequence numbers and find the next gap without atomic allocation. Recent-ticket sorting prioritizes numeric suffixes before dates, which is unsafe across years. Submission retries do not carry a durable idempotency key.
- **Impact:** Ticket references can be reused for different requests, concurrent submissions can collide, newer-year records can sort behind older records, and an uncertain submission retry can create a duplicate request.
- **Evidence:** [ID generation](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1029>), [recent sorting](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:876>), [submission request](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/tickets/portalTickets.js:791>).
- **Suggested correction:** Use immutable, non-reused identity with atomic display-number allocation. Sort recency by canonical timestamps and accept an idempotency key for creation.
- **Verification:** Source verified. Duplicate-submission risk concerns retries after uncertain outcomes, not a claim that the normal submit button lacks a local double-click guard.

### F13. Timer Renders Repeatedly Restart Conversation Subscriptions

- **Problem:** The parent passes an inline realtime callback to the modal. The subscription effect depends on that callback, while the parent timer rerenders every second when a ticket is selected.
- **Impact:** Message history is repeatedly fetched, unread counts are reset, and both message and ticket subscriptions repeatedly disconnect and reconnect.
- **Evidence:** [Subscription dependencies](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7111>), [one-second timer](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:8092>), [inline callback](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:8662>).
- **Suggested correction:** Stabilize the callback or decouple the effect from callback identity. Subscription lifetime should follow ticket identity, not elapsed-time renders.
- **Verification:** In-memory checked: opening plus three simulated timer renders caused four history fetches, eight subscription registrations, and six unsubscriptions.

### F14. API Update Responses Omit The Burnout Report

- **Problem:** The API can update burnout_report but does not select it in returned ticket columns. The client mapper consequently turns the omitted report into burnoutReport: null and propagates that result into UI state.
- **Impact:** An autosave or update response can make an existing report appear missing until a full refetch. This response omission alone does not delete the database report.
- **Evidence:** [API return columns](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:8>), [writable report mapping](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:491>), [client row mapping](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/tickets/portalTickets.js:513>), [autosave propagation](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7297>).
- **Suggested correction:** Define a consistent ticket response contract, return the report, and avoid treating an omitted partial-response field as an explicit deletion.
- **Verification:** In-memory checked: a saved report mapped correctly from a full row and became null after projecting the API return columns.

### F15. Shared-IP Rate Limits Can Block Unrelated Staff Saves

- **Problem:** Ticket PATCH requests share a 40-per-minute bucket keyed by client IP unless an explicit identity is supplied. The ticket handler does not provide a user identity, while notes autosave after a short debounce.
- **Impact:** Coordinators behind the same branch/NAT connection can consume one another's update allowance and receive save failures while using the application normally.
- **Evidence:** [PATCH limit](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:749>), [rate-limit key](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/server/rateLimit.js:20>), [autosave debounce](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7317>).
- **Suggested correction:** Apply authenticated-user limits appropriate to the save pattern, retain a separate abuse-oriented IP limit, and support sensible retry/coalescing behavior.
- **Verification:** In-memory checked: the 41st combined update from one simulated IP was rejected.

### F16. File Cleanup Is Not Tied To Submission Or Deletion

- **Problem:** SAAR and photo uploads can happen before all request validation or ticket insertion succeeds. Failure does not roll back uploaded objects. Ticket deletion removes database records but does not remove associated storage objects.
- **Impact:** Failed and deleted requests can leave retained documents, unnecessary storage use, and file URLs that outlive the intended ticket lifecycle.
- **Evidence:** [Upload before later validation](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:607>), [photo processing and description validation](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:683>), [ticket deletion](<C:/Users/user/Desktop/MEMPCO WEBSITE/supabase/schema.sql:1726>).
- **Suggested correction:** Validate before upload where possible. Track attachment ownership and lifecycle, clean up failed uploads, and apply a documented retention/deletion policy to ticket files.
- **Verification:** Source verified; existing storage objects were not inventoried or deleted. Public-file exposure is separately covered by F02.

### F17. Selection Changes Replace Entered Issue Details

- **Problem:** Changing support category or concern type unconditionally replaces the description with a generated template.
- **Impact:** An employee can lose already-entered symptoms, troubleshooting, or business impact while correcting a classification choice.
- **Evidence:** [Form-change handler](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/employee-dashboard/employee-dashboard.jsx:2675>), [unconditional replacement](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/employee-dashboard/employee-dashboard.jsx:2704>).
- **Suggested correction:** Preserve user-entered content, replace only untouched template text, or ask before discarding entered details.
- **Verification:** Source verified; this is different from F14's saved-report response mismatch.

### F18. Frontend Pagination Does Not Fetch All Database Pages

- **Problem:** Ticket-list queries do not use range pagination or retrieve subsequent pages. Frontend pagination, filtering, and reporting operate only on the rows returned by that query.
- **Impact:** Once eligible records exceed the configured database response limit, older tickets can silently disappear from UI results and report calculations. Full ticket payloads also increase refresh cost.
- **Evidence:** [Administrator ticket query](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/tickets/portalTickets.js:717>), [employee ticket query](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/tickets/portalTickets.js:755>).
- **Suggested correction:** Use server-side pagination/filtering for lists and complete, appropriately scoped aggregate/event queries for reporting. Fetch large detail fields when opening a ticket.
- **Verification:** Source-verified query gap; actual truncation is deployment- and volume-dependent. The configured production row limit was not checked.

### F21. History Loading Can Hide A Newly Received Message

- **Problem:** A conversation subscribes to new messages while its initial history request is in flight. When history returns, it replaces the message list and ID set instead of merging them with messages already received.
- **Impact:** A message received during loading can vanish from the UI until another history fetch. The stored database message is not deleted by this race.
- **Evidence:** [Employee history replacement](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/employee-dashboard/employee-dashboard.jsx:2610>), [employee insert subscription](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/employee-dashboard/employee-dashboard.jsx:2630>), [administrator equivalent](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:7117>).
- **Suggested correction:** Merge by message ID and establish a safe initial-load/live-event handoff. Catch up from a persisted cursor after reconnecting.
- **Verification:** In-memory checked: a received new-message was replaced by an older history response. This also occurs in the employee view and is independent of F13's timer-driven subscription churn.

### F22. Monthly Reports Mix Period Events And Current State

- **Problem:** Monthly ticket selection includes any ticket with an event in the month. Status summaries then count every selected ticket as Submitted and calculate status from the ticket's current state instead of its state at the period boundary.
- **Impact:** A September submission resolved in October counts as an October submission. Reprinting September after October resolution can show a resolved ticket that was still open at September's end.
- **Evidence:** [Submitted count](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:825>), [month event selection](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:1777>), [monthly report data](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:2026>).
- **Suggested correction:** Distinguish submissions during the month, resolutions during the month, carry-in backlog, and period-end backlog. Label current-state views explicitly and derive historical state from trusted events.
- **Verification:** In-memory checked: the October report had only a resolved event but counted one Submitted; the September summary used the later Resolved state.

### F23. Hardcoded Staff Names Omit Valid Administrators

- **Problem:** Workload and technician report totals enumerate a fixed TECHNICIANS list rather than all valid assigned staff. The application can assign work to administrators outside that list.
- **Impact:** New or renamed ICT personnel can handle tickets that contribute to none of the displayed staff workload totals.
- **Evidence:** [Fixed technician list](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/portalStorage.js:72>), [workload calculation](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:4300>), [report technician counts](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:2069>).
- **Suggested correction:** Identify staff by stable profile IDs and derive report membership from actual assignments and authorized staff records, retaining historical display names where appropriate.
- **Verification:** In-memory checked: one ticket assigned to a new ICT staff name produced zero represented tickets in the actual workload calculation.

### F24. Reopened Timers Include The Closed Period

- **Problem:** Reopening retains the original workStartedAt and clears workEndedAt. The elapsed-time formatter measures continuously from that original start.
- **Impact:** Time spent closed is presented as active work. One hour of original handling, seven days closed, and ten minutes after reopening is displayed as seven days, one hour, and ten minutes.
- **Evidence:** [Reopen fields](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:8408>), [elapsed calculation](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/admin-dashboard/page.jsx:2975>), [server start preservation](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/api/tickets/route.js:523>).
- **Suggested correction:** Record separate handling intervals or work sessions. Keep total case age, active handling, waiting, and closed time as distinct measures.
- **Verification:** In-memory checked against the actual formatter; reopen field behavior was source-traced. This is a concrete timing defect within the broader service-process gap in F07.

### F25. Chat Image Data Is Embedded In Database Rows

- **Problem:** Conversation photo helpers produce base64 data URLs. The message helper stores normalized attachments directly in ticket_messages instead of uploading image contents to Storage first.
- **Impact:** Image-heavy messages inflate database rows, conversation history downloads, and realtime payloads. The normal five-photo allowance at up to 4 MiB per image can represent roughly 26.7 MiB of base64 image data before JSON overhead, subject to any earlier platform rejection.
- **Evidence:** [Conversation photo encoding](<C:/Users/user/Desktop/MEMPCO WEBSITE/app/employee-dashboard/employee-dashboard.jsx:989>), [direct attachment insertion](<C:/Users/user/Desktop/MEMPCO WEBSITE/lib/tickets/portalTickets.js:980>).
- **Suggested correction:** Upload chat media to private ticket-scoped storage, validate aggregate and per-file limits, and store only object references and metadata in messages.
- **Verification:** In-memory checked: the actual message helper retained a supplied image data URL in the INSERT payload. No production payload-limit or performance benchmark was performed.

## Related Findings

- F01, F04, F19, and F20 concern different authorization gaps: field permissions, transition permissions, account status, and displayed message identity.
- F02 concerns who can read a file; F12 concerns whether a required PDF exists; F16 concerns file lifecycle; F25 concerns where chat media is stored.
- F03 concerns competing writes; F06 concerns trustworthy history; F22 concerns interpreting that history correctly in reports.
- F05 concerns Burnout truth and outcome semantics; F14 concerns missing saved data in API responses.
- F13 concerns subscription lifetime; F21 concerns merging initial history and incoming messages correctly even with a stable subscription.
- F07 concerns the overall service-management model; F24 identifies one specific closed-time calculation error.

## Handling Process

The local workflow now supports this handling model. It still requires operational adoption and the database migration before these guarantees are active in a deployed environment.

1. **Submitted:** Validate the request, establish immutable identity, accept attachments safely, and acknowledge receipt.
2. **Triaged:** Confirm category, business impact, priority, service targets, and whether clarification or approval is needed.
3. **Assigned:** Record one accountable internal ICT owner independently of an external recipient or temporary edit lock.
4. **In Progress:** Record the first response and handling intervals. Each significant action produces a trusted event.
5. **Waiting:** Use explicit waiting-for-requester, vendor, approval, or scheduled-work states with a reason, responsible person, and next-action date. Handling-time accounting pauses while waiting or scheduled; response and resolution SLA clocks continue in calendar hours.
6. **Resolved:** Record diagnosis, action, outcome, and resolution details, then request verification where appropriate. Preserve failed and cancelled outcomes distinctly.
7. **Closed:** Complete requester verification or the agreed closure rule. Further handling uses a reasoned reopen action and a new handling interval.

Burnout has a separate inspection, testing, observation, evaluation, and deployment/repair/replacement path. Passing depends on all required recorded checks and at least three full elapsed testing days; the five-day window remains the target.

All write paths should enforce the same account, role, ownership, transition, and version rules. Ticket changes and trusted audit events should commit together; notifications should be reliably queued after that transaction.

## Suggested Remediation Order

1. **Protect access and retained evidence:** F01, F02, F11, F12, F19, F20.
2. **Establish authoritative workflow and history:** F03, F04, F06, F07, F08, F10, F24.
3. **Make Burnout records truthful and consistent:** F05, F14.
4. **Stabilize day-to-day communication and saves:** F09, F13, F15, F16, F17, F21, F25.
5. **Reconcile complete reporting:** F18, F22, F23.

These groups are planning guidance, not a commitment to implement changes in that sequence without confirming business rules and migration requirements.

## Deployment Notes

- For a new environment, run `supabase/schema.sql`, then `supabase/ict_helpdesk_hardening_migration.sql`, before deploying the matching application code.
- For an existing environment, review and back up the project, then apply the hardening migration once before deploying the matching application code. Do not run it against production without the organization's normal approval and recovery process.
- The local migration is not applied here. It changes access to ticket attachments and internal notes, write permissions, ticket history, status transitions, SLA timestamps, notifications, and cleanup behavior.
- Configure `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` in Netlify. The scheduled function runs hourly on published deploys and requires the hardening migration first. It writes in-app notifications only; it does not send email or push messages.
- No live Supabase policy test, application build, or automated test run was performed for this remediation pass.

The individual findings above remain the pre-remediation review baseline. The remediation status above describes local code only; deployed behavior remains unchanged until the migration and matching application are released.
