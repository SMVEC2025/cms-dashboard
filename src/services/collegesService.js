import { requireSupabase } from '@/lib/supabase';

let collegesCache = null;
let collegesRequest = null;

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

  if (!force && collegesRequest) {
    return collegesRequest;
  }

  const client = requireSupabase();
  collegesRequest = (async () => {
    const { data, error } = await client
      .from('colleges')
      .select('id, name, short_code, departments')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    collegesCache = (data || []).map(normalizeCollege);
    return collegesCache;
  })();

  try {
    return await collegesRequest;
  } finally {
    collegesRequest = null;
  }
}

export function clearCollegesCache() {
  collegesCache = null;
  collegesRequest = null;
}
