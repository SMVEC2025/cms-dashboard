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
