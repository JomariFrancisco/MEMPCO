-- Store the selected third-party escalation category and company name separately.
-- Apply this to existing deployments before using the updated ticket editor.
alter table public.tickets
  add column if not exists escalation_partner_company text not null default '';

notify pgrst, 'reload schema';
