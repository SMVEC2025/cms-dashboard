import { requireSupabase } from '@/lib/supabase';

export async function logAuditEvent(payload) {
  const client = requireSupabase();
  const { error } = await client.from('audit_logs').insert(payload);

  if (error) {
    console.error(error);
    throw error;
  }
}

