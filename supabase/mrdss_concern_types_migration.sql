-- Run in the Supabase SQL Editor for an existing member concerns deployment.
-- Retain legacy message types for existing cases and previously loaded forms.

alter table public.member_concerns
drop constraint if exists member_concerns_concern_type_check,
add constraint member_concerns_concern_type_check
check (concern_type in ('Complain', 'Inquiries', 'Request', 'Feedback', 'Others', 'Concern', 'Question', 'Compliment'));

notify pgrst, 'reload schema';
