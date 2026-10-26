-- Repair existing branch-review cases whose area assignment was not backfilled.
-- Apply after mrdss_role_routing_workflow_migration.sql.

update public.member_concerns c
set destination_area_id = b.area_id,
    updated_at = now()
from public.concern_branches b
where c.workflow_stage = 'branch_review'
  and c.destination_type = 'branch'
  and c.destination_branch_id = b.id
  and c.destination_area_id is distinct from b.area_id;

notify pgrst, 'reload schema';
