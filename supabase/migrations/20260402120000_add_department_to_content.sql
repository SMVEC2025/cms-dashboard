alter table public.posts
  add column if not exists department text;

alter table public.blogs
  add column if not exists department text;

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
  p.department,
  p.location,
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
  b.department,
  b.location,
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
