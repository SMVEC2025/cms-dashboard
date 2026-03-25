drop policy if exists "owner or admin media delete" on public.media_assets;
create policy "owner or admin media delete"
on public.media_assets
for delete
to authenticated
using (
  uploader_id = auth.uid()
  or public.is_admin(auth.uid())
);
