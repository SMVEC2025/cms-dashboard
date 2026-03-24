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
