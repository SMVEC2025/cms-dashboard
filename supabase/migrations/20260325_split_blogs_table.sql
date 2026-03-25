create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  college_id text not null references public.colleges (id),
  author_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_id uuid references public.profiles (id),
  featured_image_asset_id uuid references public.media_assets (id),
  post_type text not null default 'blog' check (post_type = 'blog'),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'revision_requested', 'approved', 'rejected', 'published')),
  title text not null,
  slug text not null,
  summary text not null,
  featured_image_url text,
  content_html text not null,
  content_json jsonb,
  event_date date,
  event_time time,
  venue text,
  organizer text,
  category text,
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  review_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blogs_college_slug_unique unique (college_id, slug)
);

drop trigger if exists blogs_set_updated_at on public.blogs;
create trigger blogs_set_updated_at
before update on public.blogs
for each row
execute function public.set_updated_at();

alter table public.blogs enable row level security;

drop policy if exists "staff can read own blogs and admins all blogs" on public.blogs;
create policy "staff can read own blogs and admins all blogs"
on public.blogs
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or (
    author_id = auth.uid()
    and college_id = (
      select selected_college_id
      from public.profiles
      where id = auth.uid()
    )
  )
);

drop policy if exists "authenticated users can create blogs for their selected college" on public.blogs;
create policy "authenticated users can create blogs for their selected college"
on public.blogs
for insert
to authenticated
with check (
  author_id = auth.uid()
  and college_id = (
    select selected_college_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists "staff can update own scoped blogs and admins all blogs" on public.blogs;
create policy "staff can update own scoped blogs and admins all blogs"
on public.blogs
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or (
    author_id = auth.uid()
    and college_id = (
      select selected_college_id
      from public.profiles
      where id = auth.uid()
    )
  )
)
with check (
  public.is_admin(auth.uid())
  or (
    author_id = auth.uid()
    and college_id = (
      select selected_college_id
      from public.profiles
      where id = auth.uid()
    )
  )
);

insert into public.blogs (
  id,
  college_id,
  author_id,
  reviewer_id,
  featured_image_asset_id,
  post_type,
  status,
  title,
  slug,
  summary,
  featured_image_url,
  content_html,
  content_json,
  event_date,
  event_time,
  venue,
  organizer,
  category,
  tags,
  seo_title,
  seo_description,
  review_notes,
  submitted_at,
  reviewed_at,
  published_at,
  created_at,
  updated_at
)
select
  id,
  college_id,
  author_id,
  reviewer_id,
  featured_image_asset_id,
  post_type,
  status,
  title,
  slug,
  summary,
  featured_image_url,
  content_html,
  content_json,
  event_date,
  event_time,
  venue,
  organizer,
  category,
  tags,
  seo_title,
  seo_description,
  review_notes,
  submitted_at,
  reviewed_at,
  published_at,
  created_at,
  updated_at
from public.posts
where post_type = 'blog'
on conflict (id) do update
set
  college_id = excluded.college_id,
  author_id = excluded.author_id,
  reviewer_id = excluded.reviewer_id,
  featured_image_asset_id = excluded.featured_image_asset_id,
  post_type = excluded.post_type,
  status = excluded.status,
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  featured_image_url = excluded.featured_image_url,
  content_html = excluded.content_html,
  content_json = excluded.content_json,
  event_date = excluded.event_date,
  event_time = excluded.event_time,
  venue = excluded.venue,
  organizer = excluded.organizer,
  category = excluded.category,
  tags = excluded.tags,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  review_notes = excluded.review_notes,
  submitted_at = excluded.submitted_at,
  reviewed_at = excluded.reviewed_at,
  published_at = excluded.published_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

delete from public.posts
where post_type = 'blog';

alter table public.posts
drop constraint if exists posts_post_type_check;

alter table public.posts
add constraint posts_post_type_check
check (post_type in ('news', 'event'));

drop view if exists public.post_overview;

create view public.post_overview
with (security_invoker = true) as
select
  p.id,
  'posts'::text as source_table,
  p.college_id,
  c.name as college_name,
  p.author_id,
  author_profile.full_name as author_name,
  p.reviewer_id,
  reviewer_profile.full_name as reviewer_name,
  p.post_type,
  p.status,
  p.title,
  p.slug,
  p.summary,
  p.featured_image_url,
  p.content_html,
  p.event_date,
  p.event_time,
  p.venue,
  p.organizer,
  p.category,
  p.tags,
  p.review_notes,
  p.submitted_at,
  p.reviewed_at,
  p.published_at,
  p.created_at,
  p.updated_at
from public.posts p
join public.colleges c on c.id = p.college_id
left join public.profiles author_profile on author_profile.id = p.author_id
left join public.profiles reviewer_profile on reviewer_profile.id = p.reviewer_id
union all
select
  b.id,
  'blogs'::text as source_table,
  b.college_id,
  c.name as college_name,
  b.author_id,
  author_profile.full_name as author_name,
  b.reviewer_id,
  reviewer_profile.full_name as reviewer_name,
  b.post_type,
  b.status,
  b.title,
  b.slug,
  b.summary,
  b.featured_image_url,
  b.content_html,
  b.event_date,
  b.event_time,
  b.venue,
  b.organizer,
  b.category,
  b.tags,
  b.review_notes,
  b.submitted_at,
  b.reviewed_at,
  b.published_at,
  b.created_at,
  b.updated_at
from public.blogs b
join public.colleges c on c.id = b.college_id
left join public.profiles author_profile on author_profile.id = b.author_id
left join public.profiles reviewer_profile on reviewer_profile.id = b.reviewer_id;

grant select on public.post_overview to authenticated;
