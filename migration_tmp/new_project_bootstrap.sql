-- Auto-generated from supabase/migrations in filename order

-- ===== BEGIN 20260319_initial_cms.sql =====
create extension if not exists pgcrypto;

create table if not exists public.colleges (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.colleges (id, name)
values
  ('smvec-engineering-college', 'SMVEC Engineering college'),
  ('smvsas-arts-and-science', 'SMVSAS Arts and Science'),
  ('smvec-centre-of-legal-education', 'SMVEC Centre of legal education'),
  ('smvec-school-of-agricultural-science', 'SMVEC school of agricultural science'),
  ('smvec-allied-health-science', 'SMVEC Allied Health Science'),
  ('smv-school', 'SMV School'),
  ('takshashila-university', 'Takshashila University'),
  ('takshashila-engineering-college', 'Takshashila Engineering college'),
  ('takshashila-medical-college', 'Takshashila Medical college'),
  ('smvec', 'SMVEC'),
  ('smvmch-college-and-hospital', 'SMVMCH College and hospital'),
  ('mvit', 'MVIT'),
  ('smv-super-speciality-hospital', 'SMV Super speciality hospital'),
  ('mailam-engineering-college', 'Mailam engineering college')
on conflict (id) do update set name = excluded.name;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'staff' check (role in ('staff', 'admin')),
  selected_college_id text references public.colleges (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  college_id text references public.colleges (id),
  uploader_id uuid not null references public.profiles (id) on delete cascade,
  storage_provider text not null default 'cloudflare-r2',
  bucket_key text not null unique,
  public_url text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  context text not null default 'post_media',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  college_id text not null references public.colleges (id),
  author_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_id uuid references public.profiles (id),
  featured_image_asset_id uuid references public.media_assets (id),
  post_type text not null check (post_type in ('news', 'event', 'blog')),
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
  constraint posts_college_slug_unique unique (college_id, slug)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

alter table public.colleges enable row level security;
alter table public.profiles enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "authenticated users can read colleges" on public.colleges;
create policy "authenticated users can read colleges"
on public.colleges
for select
to authenticated
using (true);

drop policy if exists "users can read own profile or admins read all" on public.profiles;
create policy "users can read own profile or admins read all"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "users can update own profile or admins update all" on public.profiles;
create policy "users can update own profile or admins update all"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

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
create policy "authenticated users can insert scoped media"
on public.media_assets
for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and college_id = (
    select selected_college_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists "staff can read own posts and admins all posts" on public.posts;
create policy "staff can read own posts and admins all posts"
on public.posts
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

drop policy if exists "authenticated users can create posts for their selected college" on public.posts;
create policy "authenticated users can create posts for their selected college"
on public.posts
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

drop policy if exists "staff can update own scoped posts and admins all posts" on public.posts;
create policy "staff can update own scoped posts and admins all posts"
on public.posts
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

drop policy if exists "authenticated users can insert audit logs" on public.audit_logs;
create policy "authenticated users can insert audit logs"
on public.audit_logs
for insert
to authenticated
with check (actor_id = auth.uid());

drop policy if exists "users can read own audit logs and admins read all" on public.audit_logs;
create policy "users can read own audit logs and admins read all"
on public.audit_logs
for select
to authenticated
using (actor_id = auth.uid() or public.is_admin(auth.uid()));

drop view if exists public.post_overview;

create view public.post_overview
with (security_invoker = true) as
select
  p.id,
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
left join public.profiles reviewer_profile on reviewer_profile.id = p.reviewer_id;

grant select on public.post_overview to authenticated;
-- ===== END 20260319_initial_cms.sql =====


-- ===== BEGIN 20260323_add_blog_post_type.sql =====
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
-- ===== END 20260323_add_blog_post_type.sql =====


-- ===== BEGIN 20260325_media_asset_delete_policy.sql =====
drop policy if exists "owner or admin media delete" on public.media_assets;
create policy "owner or admin media delete"
on public.media_assets
for delete
to authenticated
using (
  uploader_id = auth.uid()
  or public.is_admin(auth.uid())
);
-- ===== END 20260325_media_asset_delete_policy.sql =====


-- ===== BEGIN 20260325_media_folders.sql =====
-- ── Media folders ──
create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  college_id text not null references public.colleges (id),
  parent_id uuid references public.media_folders (id) on delete cascade,
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint unique_folder_name_per_parent unique (college_id, parent_id, name)
);

-- Add folder reference to media_assets
alter table public.media_assets
  add column if not exists folder_id uuid references public.media_folders (id) on delete set null;

-- RLS
alter table public.media_folders enable row level security;

-- Staff can read folders in their college, admins can read all
drop policy if exists "scoped folder read" on public.media_folders;
create policy "scoped folder read"
on public.media_folders for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or p.selected_college_id = media_folders.college_id)
  )
);

-- Authenticated users can create folders in their college
drop policy if exists "scoped folder insert" on public.media_folders;
create policy "scoped folder insert"
on public.media_folders for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.selected_college_id = media_folders.college_id
  )
);

-- Users can update folders they created (rename)
drop policy if exists "owner folder update" on public.media_folders;
create policy "owner folder update"
on public.media_folders for update
using (created_by = auth.uid());

-- Users can delete folders they created, admins can delete any
drop policy if exists "owner or admin folder delete" on public.media_folders;
create policy "owner or admin folder delete"
on public.media_folders for delete
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
-- ===== END 20260325_media_folders.sql =====


-- ===== BEGIN 20260325_split_blogs_table.sql =====
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
-- ===== END 20260325_split_blogs_table.sql =====


-- ===== BEGIN 20260326093800_remove_summary_requirement.sql =====
alter table public.posts
  alter column summary drop not null;

alter table public.blogs
  alter column summary drop not null;
-- ===== END 20260326093800_remove_summary_requirement.sql =====


-- ===== BEGIN 20260326095600_add_location_to_content.sql =====
alter table public.posts
  add column if not exists location text;

alter table public.blogs
  add column if not exists location text;

update public.posts
set location = organizer
where location is null
  and organizer is not null;

update public.blogs
set location = organizer
where location is null
  and organizer is not null;

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
-- ===== END 20260326095600_add_location_to_content.sql =====


-- ===== BEGIN 20260331101500_allow_admin_cross_college_insert.sql =====
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
-- ===== END 20260331101500_allow_admin_cross_college_insert.sql =====


-- ===== BEGIN 20260402120000_add_department_to_content.sql =====
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
-- ===== END 20260402120000_add_department_to_content.sql =====

