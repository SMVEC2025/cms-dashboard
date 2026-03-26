alter table public.posts
  alter column summary drop not null;

alter table public.blogs
  alter column summary drop not null;
