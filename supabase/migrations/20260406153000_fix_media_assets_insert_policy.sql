alter table public.media_assets enable row level security;

drop policy if exists "staff can read scoped media and admins can read all media" on public.media_assets;
create policy "staff can read scoped media and admins can read all media"
on public.media_assets
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or uploader_id = auth.uid()
  or college_id = (
    select selected_college_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists "authenticated users can insert scoped media" on public.media_assets;
drop policy if exists "authenticated users can insert media (admin any college)" on public.media_assets;
create policy "authenticated users can insert media (admin any college)"
on public.media_assets
for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and (
    public.is_admin(auth.uid())
    or college_id = (
      select selected_college_id
      from public.profiles
      where id = auth.uid()
    )
  )
);
