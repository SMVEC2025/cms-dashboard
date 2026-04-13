import { requireSupabase } from '@/lib/supabase';

export const DEFAULT_STAFF_PASSWORD = 'smvec@123';
const PRIMARY_CREATE_STAFF_RPC = 'admin_create_staff_user_rpc';

function isMissingRpcSignatureError(error) {
  const message = error?.message || '';
  return (
    error?.code === 'PGRST202'
    || message.includes('Could not find the function public.admin_create_staff_user')
    || message.includes('Could not find the function public.admin_create_staff_user_rpc')
  );
}

async function invokeCreateStaffRpc(client, rpcName, payload) {
  return client.rpc(rpcName, payload);
}

export async function createStaffUser({ email, password = DEFAULT_STAFF_PASSWORD }) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim() || DEFAULT_STAFF_PASSWORD;

  let { data, error } = await invokeCreateStaffRpc(client, PRIMARY_CREATE_STAFF_RPC, {
    target_email: normalizedEmail,
    target_password: normalizedPassword,
  });

  if (error) {
    if (isMissingRpcSignatureError(error)) {
      throw new Error(
        'Database function admin_create_staff_user_rpc is missing in your Supabase project. Run migration 20260413110000 and reload PostgREST schema cache.',
      );
    }
    throw error;
  }

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
}
