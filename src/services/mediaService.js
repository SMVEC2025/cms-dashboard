import { requireSupabase } from '@/lib/supabase';

const mediaFunctionName = import.meta.env.VITE_SUPABASE_MEDIA_FUNCTION || 'r2-upload';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const IMAGE_MIME_PREFIX = 'image/';
const IMAGE_PROCESSING_PRESETS = {
  default: {
    maxDimension: 1920,
    quality: 0.82,
    skipBelowBytes: 0,
    minSavingsRatio: 0.05,
  },
  fast: {
    maxDimension: 1440,
    quality: 0.74,
    skipBelowBytes: 350 * 1024,
    minSavingsRatio: 0.02,
  },
};
const FOLDER_COMPRESSION_PRESET = {
  'editor-media': 'fast',
};

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value || '');
}

function shouldProcessImage(file) {
  return Boolean(file?.type?.startsWith(IMAGE_MIME_PREFIX));
}

function buildWebpFileName(name = 'image') {
  const baseName = name.replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}.webp`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image could not be decoded for compression.'));
    };

    image.src = objectUrl;
  });
}

function resolveCompressionPreset(folder, requestedPreset) {
  if (requestedPreset && IMAGE_PROCESSING_PRESETS[requestedPreset]) {
    return IMAGE_PROCESSING_PRESETS[requestedPreset];
  }

  const folderPreset = FOLDER_COMPRESSION_PRESET[folder];
  if (folderPreset && IMAGE_PROCESSING_PRESETS[folderPreset]) {
    return IMAGE_PROCESSING_PRESETS[folderPreset];
  }

  return IMAGE_PROCESSING_PRESETS.default;
}

async function compressImageFileByPreset(file, preset) {
  if (!shouldProcessImage(file)) {
    return file;
  }

  try {
    if (file.size <= preset.skipBelowBytes) {
      return file;
    }

    const image = await loadImageFromFile(file);
    const scale = Math.min(1, preset.maxDimension / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const resized = targetWidth !== image.width || targetHeight !== image.height;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return file;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/webp', preset.quality);
    });

    if (!blob) {
      return file;
    }

    if (!resized && blob.size >= file.size * (1 - preset.minSavingsRatio)) {
      return file;
    }

    return new File([blob], buildWebpFileName(file.name), {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
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

async function ensureMediaAssetMetadata({ client, session, payload, folder, file, folderId }) {
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
    folder_id: folderId || null,
    metadata: {
      source: 'browser-media-metadata-fallback',
    },
  };

  const { data: existingAsset } = await client
    .from('media_assets')
    .select('id, public_url, file_name, mime_type, size_bytes, context, folder_id, created_at')
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
      folderId: existingAsset.folder_id,
      createdAt: existingAsset.created_at,
      key: bucketKey,
      provider: rowPayload.storage_provider,
    };
  }

  const { data: asset, error: insertError } = await client
    .from('media_assets')
    .insert(rowPayload)
    .select('id, public_url, file_name, mime_type, size_bytes, context, folder_id, created_at')
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
    folderId: asset.folder_id,
    createdAt: asset.created_at,
    key: bucketKey,
    provider: rowPayload.storage_provider,
  };
}

export async function uploadMedia({
  file,
  folder = 'posts',
  folderId = null,
  compressionProfile = undefined,
}) {
  const compressionPreset = resolveCompressionPreset(folder, compressionProfile);
  const uploadFile = await compressImageFileByPreset(file, compressionPreset);
  const formData = new FormData();
  formData.append('file', uploadFile);
  formData.append('folder', folder);

  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  const authHeaders = {
    ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };

  if (isAbsoluteUrl(mediaFunctionName)) {
    const payload = await uploadToAbsoluteUrl(mediaFunctionName, formData, {
      ...authHeaders,
    });
    return ensureMediaAssetMetadata({
      client,
      session,
      payload,
      folder,
      file: uploadFile,
      folderId,
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
    folderId: asset.folder_id || null,
    metadata: asset.metadata || {},
  };
}

export async function listMediaAssets({
  imageOnly = false,
  folderId = undefined,
  contexts = undefined,
} = {}) {
  const client = requireSupabase();
  let query = client
    .from('media_assets')
    .select('id, public_url, file_name, mime_type, size_bytes, context, folder_id, metadata, created_at')
    .order('created_at', { ascending: false });

  if (imageOnly) {
    query = query.like('mime_type', 'image/%');
  }

  if (folderId !== undefined) {
    query = folderId ? query.eq('folder_id', folderId) : query.is('folder_id', null);
  }

  if (Array.isArray(contexts) && contexts.length) {
    query = contexts.length === 1
      ? query.eq('context', contexts[0])
      : query.in('context', contexts);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).map(mapMediaAsset);
}

export async function deleteMediaAsset(id) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('media_assets')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw error;

  if (!data?.length) {
    throw new Error('Media asset could not be deleted. Check the Supabase delete policy for media_assets.');
  }
}

export async function moveAssetToFolder(assetId, folderId) {
  const client = requireSupabase();
  const { error } = await client
    .from('media_assets')
    .update({ folder_id: folderId || null })
    .eq('id', assetId);
  if (error) throw error;
}

/* ── Folder operations ── */

function mapFolder(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function listFolders() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('media_folders')
    .select('id, parent_id, name, created_at')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapFolder);
}

export async function createFolder({ name, parentId = null }) {
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  const { data: profile } = await client
    .from('profiles')
    .select('selected_college_id')
    .eq('id', session.user.id)
    .single();

  const { data, error } = await client
    .from('media_folders')
    .insert({
      college_id: profile.selected_college_id,
      parent_id: parentId || null,
      name: name.trim(),
      created_by: session.user.id,
    })
    .select('id, parent_id, name, created_at')
    .single();

  if (error) throw error;
  return mapFolder(data);
}

export async function renameFolder(id, name) {
  const client = requireSupabase();
  const { error } = await client
    .from('media_folders')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id) {
  const client = requireSupabase();
  const { error } = await client.from('media_folders').delete().eq('id', id);
  if (error) throw error;
}
