import { requireSupabase } from '@/lib/supabase';
import { logAuditEvent } from './auditService';

const profileCache = new Map();
const profileRequests = new Map();

function cacheProfile(profile) {
  if (profile?.id) {
    profileCache.set(profile.id, profile);
  }

  return profile;
}

export function clearProfileCache(userId) {
  if (userId) {
    profileCache.delete(userId);
    profileRequests.delete(userId);
    return;
  }

  profileCache.clear();
  profileRequests.clear();
}

export async function ensureProfile(user) {
  const client = requireSupabase();
  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff User',
  };

  const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}

export async function fetchProfile(userId, { force = false, allowMissing = false } = {}) {
  if (!force && profileCache.has(userId)) {
    return profileCache.get(userId);
  }

  if (profileRequests.has(userId)) {
    return profileRequests.get(userId);
  }

  const client = requireSupabase();
  const request = (async () => {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      if (allowMissing) {
        return null;
      }

      throw new Error('Profile not found for the current user.');
    }

    return cacheProfile(data);
  })();

  profileRequests.set(userId, request);

  try {
    return await request;
  } finally {
    profileRequests.delete(userId);
  }
}

export async function fetchOrCreateProfile(user, options = {}) {
  const existingProfile = await fetchProfile(user.id, {
    ...options,
    allowMissing: true,
  });

  if (existingProfile) {
    return existingProfile;
  }

  await ensureProfile(user);
  return fetchProfile(user.id, { force: true });
}

export async function updateSelectedCollege({ userId, collegeId }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .update({
      selected_college_id: collegeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: userId,
    action: 'college.selected',
    entity_type: 'profile',
    entity_id: userId,
    metadata: { college_id: collegeId },
  });

  return cacheProfile(data);
}

export async function updateProfileName({ userId, fullName }) {
  const client = requireSupabase();
  const normalizedName = fullName.trim();
  const { data, error } = await client
    .from('profiles')
    .update({
      full_name: normalizedName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: userId,
    action: 'profile.name_updated',
    entity_type: 'profile',
    entity_id: userId,
    metadata: { full_name: normalizedName },
  });

  return cacheProfile(data);
}
