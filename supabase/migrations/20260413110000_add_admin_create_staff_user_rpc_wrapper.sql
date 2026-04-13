create or replace function public.admin_create_staff_user_rpc(
  target_email text,
  target_password text default 'smvec@123'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  created_row record;
begin
  select *
  into created_row
  from public.admin_create_staff_user(target_email, target_password);

  return jsonb_build_object(
    'user_id', created_row.user_id,
    'email', created_row.email,
    'role', created_row.role
  );
end;
$$;

revoke all on function public.admin_create_staff_user_rpc(text, text) from public;
grant execute on function public.admin_create_staff_user_rpc(text, text) to authenticated;

