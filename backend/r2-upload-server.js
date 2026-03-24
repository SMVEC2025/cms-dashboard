import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');

dotenv.config({ path: resolve(projectRoot, '.env') });
dotenv.config({ path: resolve(currentDir, '.env'), override: true });

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const port = Number(process.env.UPLOAD_SERVER_PORT || 4000);
const defaultFolder = process.env.R2_UPLOAD_FOLDER || 'institutional-cms';
const r2AccountId = process.env.R2_ACCOUNT_ID || '';
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const r2BucketName = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || '';
const r2PublicBaseUrl = process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || '';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

function envStatus() {
  return {
    hasAccountId: Boolean(r2AccountId),
    hasAccessKeyId: Boolean(r2AccessKeyId),
    hasSecretAccessKey: Boolean(r2SecretAccessKey),
    hasBucketName: Boolean(r2BucketName),
    hasPublicBaseUrl: Boolean(r2PublicBaseUrl),
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseAnonKey: Boolean(supabaseAnonKey),
  };
}

function serializeR2Error(error) {
  if (!error) {
    return {
      message: 'Unknown R2 upload error.',
      name: 'UnknownError',
    };
  }

  return {
    message: error.message || 'Unknown R2 upload error.',
    name: error.name || 'R2Error',
    code: error.Code || error.code || null,
    statusCode: error.$metadata?.httpStatusCode || error.statusCode || null,
  };
}

function ensureR2Config(res) {
  const status = envStatus();
  if (
    status.hasAccountId &&
    status.hasAccessKeyId &&
    status.hasSecretAccessKey &&
    status.hasBucketName &&
    status.hasPublicBaseUrl
  ) {
    return true;
  }

  console.error('r2-upload missing env', status);
  res.status(500).json({
    error: 'Missing Cloudflare R2 environment variables.',
    details: status,
  });
  return false;
}

function ensureSupabaseConfig(res) {
  if (supabaseUrl && supabaseAnonKey) {
    return true;
  }

  console.error('r2-upload missing supabase env', {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseAnonKey: Boolean(supabaseAnonKey),
  });
  res.status(500).json({
    error: 'Missing Supabase environment variables for media metadata.',
  });
  return false;
}

async function getAuthenticatedContext(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return null;
  }

  const authorization = req.headers.authorization || '';
  const token = authorization.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token.' });
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('r2-upload local auth failed', {
      message: authError?.message || 'No user resolved',
    });
    res.status(401).json({ error: 'Invalid or expired user session.' });
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('selected_college_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.selected_college_id) {
    console.error('r2-upload local profile lookup failed', {
      userId: user.id,
      message: profileError?.message || 'No selected college',
    });
    res.status(400).json({ error: 'No selected college is linked to this user.' });
    return null;
  }

  return { supabase, user, profile };
}

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.get('/api/health', async (_req, res) => {
  if (!ensureR2Config(res)) {
    return;
  }

  try {
    res.json({
      ok: true,
      provider: 'cloudflare-r2',
      env: envStatus(),
      bucketName: r2BucketName,
    });
  } catch (error) {
    const details = serializeR2Error(error);
    console.error('r2 health check failed', details);
    res.status(500).json({
      ok: false,
      provider: 'cloudflare-r2',
      env: envStatus(),
      error: details,
    });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  console.log('r2-upload request received', {
    fileName: req.file?.originalname || null,
    fileSize: req.file?.size || null,
    mimeType: req.file?.mimetype || null,
    folder: req.body?.folder || null,
  });

  if (!ensureR2Config(res)) {
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No file received. Expected multipart field "file".' });
    return;
  }

  try {
    const context = await getAuthenticatedContext(req, res);
    if (!context) {
      return;
    }

    const folder = [defaultFolder, req.body?.folder || 'posts'].filter(Boolean).join('/');
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-').toLowerCase();
    const key = `${context.profile.selected_college_id}/${folder}/${crypto.randomUUID()}-${sanitizedName}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || 'application/octet-stream',
      }),
    );

    const publicUrl = `${r2PublicBaseUrl.replace(/\/$/, '')}/${key}`;
    const { data: asset, error: assetError } = await context.supabase
      .from('media_assets')
      .insert({
        college_id: context.profile.selected_college_id,
        uploader_id: context.user.id,
        bucket_key: key,
        public_url: publicUrl,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype || 'application/octet-stream',
        size_bytes: req.file.size,
        context: req.body?.folder || 'posts',
        metadata: {
          source: 'local-r2-upload-server',
        },
      })
      .select('id, public_url, file_name, mime_type, size_bytes, context, created_at')
      .single();

    if (assetError) {
      console.error('r2-upload local media_assets insert failed', {
        message: assetError.message,
      });
      res.status(500).json({
        error: assetError.message,
      });
      return;
    }

    console.log('r2-upload success', {
      key,
      publicUrl,
      assetId: asset.id,
    });

    res.json({
      id: asset.id,
      key,
      publicUrl,
      fileName: asset.file_name,
      mimeType: asset.mime_type,
      sizeBytes: asset.size_bytes,
      context: asset.context,
      createdAt: asset.created_at,
      provider: 'cloudflare-r2',
      bytes: req.file.size,
    });
  } catch (error) {
    const details = serializeR2Error(error);
    console.error('r2-upload failed', details);
    res.status(500).json({
      error: details.message,
      details,
    });
  }
});

app.listen(port, () => {
  console.log(`R2 upload server listening on http://localhost:${port}`);
});
