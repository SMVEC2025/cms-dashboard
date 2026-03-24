do $$
declare
  post_type_constraint text;
begin
  select c.conname
  into post_type_constraint
  from pg_constraint c
  where c.conrelid = 'public.posts'::regclass
    and pg_get_constraintdef(c.oid) like '%post_type%'
  limit 1;

  if post_type_constraint is not null then
    execute format(
      'alter table public.posts drop constraint %I',
      post_type_constraint
    );
  end if;
end;
$$;

alter table public.posts
add constraint posts_post_type_check
check (post_type in ('news', 'event', 'blog'));
