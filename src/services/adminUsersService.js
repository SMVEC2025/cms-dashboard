import { requireSupabase } from '@/lib/supabase';

export const DEFAULT_STAFF_PASSWORD = 'smvec@123';

export async function createStaffUser({ email, password = DEFAULT_STAFF_PASSWORD }) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim() || DEFAULT_STAFF_PASSWORD;

  const { data, error } = await client.rpc('admin_create_staff_user', {
    target_email: normalizedEmail,
    target_password: normalizedPassword,
  });

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
}
