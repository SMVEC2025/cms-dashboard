create or replace function public.admin_create_staff_user(
  target_email text,
  target_password text default 'smvec@123'
)
returns table (
  user_id uuid,
  email text,
  role text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  requester_id uuid := auth.uid();
  normalized_email text := lower(trim(target_email));
  normalized_password text := coalesce(nullif(trim(target_password), ''), 'smvec@123');
  new_user_id uuid := gen_random_uuid();
  derived_full_name text;
begin
  if requester_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_admin(requester_id) then
    raise exception 'Only admins can create staff users'
      using errcode = '42501';
  end if;

  if normalized_email is null or normalized_email = '' then
    raise exception 'Email is required'
      using errcode = '22023';
  end if;

  if normalized_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Invalid email format'
      using errcode = '22023';
  end if;

  if length(normalized_password) < 8 then
    raise exception 'Password must be at least 8 characters'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from auth.users
    where lower(email) = normalized_email
  ) then
    raise exception 'User already exists for email %', normalized_email
      using errcode = '23505';
  end if;

  derived_full_name := split_part(normalized_email, '@', 1);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    new_user_id,
    'authenticated',
    'authenticated',
    normalized_email,
    crypt(normalized_password, gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', derived_full_name),
    timezone('utc', now()),
    timezone('utc', now())
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', normalized_email
    ),
    'email',
    normalized_email,
    timezone('utc', now()),
    timezone('utc', now())
  );

  insert into public.profiles (id, email, full_name, role)
  values (new_user_id, normalized_email, derived_full_name, 'staff');

  if to_regclass('public.audit_logs') is not null then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      requester_id,
      'user.created',
      'profile',
      new_user_id::text,
      jsonb_build_object(
        'email', normalized_email,
        'role', 'staff'
      )
    );
  end if;

  return query
  select new_user_id, normalized_email, 'staff'::text;
end;
$$;

revoke all on function public.admin_create_staff_user(text, text) from public;
grant execute on function public.admin_create_staff_user(text, text) to authenticated;
