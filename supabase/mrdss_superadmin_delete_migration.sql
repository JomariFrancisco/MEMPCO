-- Allow superadmins to delete MRDSS member concern cases and their attachments.

drop policy if exists "Superadmins can delete member concerns" on public.member_concerns;
create policy "Superadmins can delete member concerns"
on public.member_concerns for delete
to authenticated
using (public.is_superadmin());

grant delete on public.member_concerns to authenticated;

drop policy if exists "Superadmins can delete member concern attachments" on storage.objects;
create policy "Superadmins can delete member concern attachments"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'member-concern-attachments'
  and public.is_superadmin()
);
