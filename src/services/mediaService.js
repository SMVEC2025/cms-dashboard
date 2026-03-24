import { requireSupabase } from '@/lib/supabase';

const mediaFunctionName = import.meta.env.VITE_SUPABASE_MEDIA_FUNCTION || 'r2-upload';
const mediaUploadUrl = import.meta.env.VITE_MEDIA_UPLOAD_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value || '');
}

async function uploadToAbsoluteUrl(url, formData, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `Media upload failed with status ${response.status}.`);
  }

  return payload;
}

async function extractFunctionError(error) {
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const payload = await error.context.json();
      if (payload?.error) {
        return payload.error;
      }
    } catch {
      return error.message;
    }
  }

  return error?.message || 'Media upload failed.';
}

function deriveBucketKey(payload, fallbackFolder) {
  if (payload?.key) {
    return payload.key;
  }

  if (payload?.publicUrl) {
    try {
      return new URL(payload.publicUrl).pathname.replace(/^\/+/, '');
    } catch {
      return `${fallbackFolder}/${payload.fileName || crypto.randomUUID()}`;
    }
  }

  return `${fallbackFolder}/${payload?.fileName || crypto.randomUUID()}`;
}

async function ensureMediaAssetMetadata({ client, session, payload, folder, file }) {
  if (payload?.id || !session?.user?.id || !payload?.publicUrl) {
    return payload;
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('selected_college_id')
    .eq('id', session.user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  if (!profile?.selected_college_id) {
    throw new Error('No selected college is linked to this user.');
  }

  const bucketKey = deriveBucketKey(payload, folder);
  const rowPayload = {
    college_id: profile.selected_college_id,
    uploader_id: session.user.id,
    storage_provider: payload.provider || 'cloudflare-r2',
    bucket_key: bucketKey,
    public_url: payload.publicUrl,
    file_name: payload.fileName || file.name,
    mime_type: payload.mimeType || file.type || 'application/octet-stream',
    size_bytes: payload.sizeBytes || file.size || 0,
    context: payload.context || folder,
    metadata: {
      source: 'browser-media-metadata-fallback',
    },
  };

  const { data: existingAsset } = await client
    .from('media_assets')
    .select('id, public_url, file_name, mime_type, size_bytes, context, created_at')
    .eq('bucket_key', bucketKey)
    .maybeSingle();

  if (existingAsset) {
    return {
      id: existingAsset.id,
      publicUrl: existingAsset.public_url,
      fileName: existingAsset.file_name,
      mimeType: existingAsset.mime_type,
      sizeBytes: existingAsset.size_bytes,
      context: existingAsset.context,
      createdAt: existingAsset.created_at,
      key: bucketKey,
      provider: rowPayload.storage_provider,
    };
  }

  const { data: asset, error: insertError } = await client
    .from('media_assets')
    .insert(rowPayload)
    .select('id, public_url, file_name, mime_type, size_bytes, context, created_at')
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    id: asset.id,
    publicUrl: asset.public_url,
    fileName: asset.file_name,
    mimeType: asset.mime_type,
    sizeBytes: asset.size_bytes,
    context: asset.context,
    createdAt: asset.created_at,
    key: bucketKey,
    provider: rowPayload.storage_provider,
  };
}

export async function uploadMedia({ file, folder = 'posts' }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  const authHeaders = {
    ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };

  if (isAbsoluteUrl(mediaUploadUrl)) {
    try {
      const payload = await uploadToAbsoluteUrl(mediaUploadUrl, formData, authHeaders);
      return ensureMediaAssetMetadata({
        client,
        session,
        payload,
        folder,
        file,
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Local upload server is unreachable at ${mediaUploadUrl}. Start the local backend and try again.`);
      }

      throw error;
    }
  }

  if (isAbsoluteUrl(mediaFunctionName)) {
    return uploadToAbsoluteUrl(mediaFunctionName, formData, {
      ...authHeaders,
    });
  }

  const { data, error } = await client.functions.invoke(mediaFunctionName, {
    body: formData,
  });

  if (error) {
    throw new Error(await extractFunctionError(error));
  }

  return data;
}

function mapMediaAsset(asset) {
  return {
    id: asset.id,
    url: asset.public_url,
    publicUrl: asset.public_url,
    name: asset.file_name,
    fileName: asset.file_name,
    size: asset.size_bytes || 0,
    sizeBytes: asset.size_bytes || 0,
    type: asset.mime_type || '',
    mimeType: asset.mime_type || '',
    uploadedAt: asset.created_at,
    createdAt: asset.created_at,
    context: asset.context,
    metadata: asset.metadata || {},
  };
}

export async function listMediaAssets({ imageOnly = false } = {}) {
  const client = requireSupabase();
  let query = client
    .from('media_assets')
    .select('id, public_url, file_name, mime_type, size_bytes, context, metadata, created_at')
    .order('created_at', { ascending: false });

  if (imageOnly) {
    query = query.like('mime_type', 'image/%');
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(mapMediaAsset);
}
