-- Repair legacy staff users created with provider_id=email instead of provider_id=user_id.
update auth.identities i
set
  provider_id = i.user_id::text,
  identity_data = coalesce(i.identity_data, '{}'::jsonb)
    || jsonb_build_object('sub', i.user_id::text)
where i.provider = 'email'
  and i.provider_id like '%@%'
  and exists (
    select 1
    from public.profiles p
    where p.id = i.user_id
      and p.role = 'staff'
  );

select pg_notify('pgrst', 'reload schema');

