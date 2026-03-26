import { requireSupabase } from '@/lib/supabase';

let collegesCache = null;

function normalizeCollege(row) {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code || null,
    departments: Array.isArray(row.departments) ? row.departments : null,
  };
}

export async function listColleges({ force = false } = {}) {
  if (!force && collegesCache) {
    return collegesCache;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('colleges')
    .select('id, name, short_code, departments')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  collegesCache = (data || []).map(normalizeCollege);
  return collegesCache;
}

export function clearCollegesCache() {
  collegesCache = null;
}
