drop policy if exists "authenticated users can create posts for their selected college" on public.posts;
drop policy if exists "authenticated users can create posts (admin any college)" on public.posts;

create policy "authenticated users can create posts (admin any college)"
on public.posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    public.is_admin(auth.uid())
    or college_id = (
      select selected_college_id
      from public.profiles
      where id = auth.uid()
    )
  )
);

do $$
begin
  if to_regclass('public.blogs') is not null then
    execute 'drop policy if exists "authenticated users can create blogs for their selected college" on public.blogs';
    execute 'drop policy if exists "authenticated users can create blogs (admin any college)" on public.blogs';
    execute '
      create policy "authenticated users can create blogs (admin any college)"
      on public.blogs
      for insert
      to authenticated
      with check (
        author_id = auth.uid()
        and (
          public.is_admin(auth.uid())
          or college_id = (
            select selected_college_id
            from public.profiles
            where id = auth.uid()
          )
        )
      )
    ';
  end if;
end $$;
