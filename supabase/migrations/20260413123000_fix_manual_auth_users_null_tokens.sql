-- Fix auth.users rows created manually with null token fields.
-- Null values here can cause password login failures in GoTrue ("Database error querying schema").
update auth.users u
set
  confirmation_token = coalesce(u.confirmation_token, ''),
  email_change = coalesce(u.email_change, ''),
  email_change_token_new = coalesce(u.email_change_token_new, ''),
  recovery_token = coalesce(u.recovery_token, '')
where exists (
  select 1
  from public.profiles p
  where p.id = u.id
    and p.role = 'staff'
)
and (
  u.confirmation_token is null
  or u.email_change is null
  or u.email_change_token_new is null
  or u.recovery_token is null
);

select pg_notify('pgrst', 'reload schema');

