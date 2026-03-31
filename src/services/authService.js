import { requireSupabase } from '@/lib/supabase';

let signOutPromise = null;

export async function getSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function onAuthStateChange(callback) {
  const client = requireSupabase();
  return client.auth.onAuthStateChange(callback);
}

export async function signInWithPassword({ email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateUserMetadata(data) {
  const client = requireSupabase();
  const { data: result, error } = await client.auth.updateUser({ data });

  if (error) {
    throw error;
  }

  return result.user;
}

export async function updateUserPassword(password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signOut() {
  if (signOutPromise) {
    return signOutPromise;
  }

  signOutPromise = (async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signOut({ scope: 'local' });

    if (
      error &&
      !error.message?.includes("Lock broken by another request with the 'steal' option.")
    ) {
      throw error;
    }
  })();

  try {
    await signOutPromise;
  } finally {
    signOutPromise = null;
  }
}
