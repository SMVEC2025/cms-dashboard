import { createClient } from 'npm:@supabase/supabase-js@2';
import { PutObjectCommand, S3Client } from 'npm:@aws-sdk/client-s3@3.758.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.758.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${readEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: readEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: readEnv('R2_SECRET_ACCESS_KEY'),
  },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const supabaseUrl = readEnv('SUPABASE_URL');
    const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
    const bucketName = readEnv('R2_BUCKET', 'R2_BUCKET_NAME');
    const publicBase = readEnv('R2_PUBLIC_BASE_URL', 'R2_PUBLIC_URL');
    const defaultFolder = readEnv('R2_UPLOAD_FOLDER') || 'institutional-cms';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret.' }, 500);
    }

    if (!bucketName || !publicBase) {
      return jsonResponse({ error: 'Missing R2 bucket or public URL secret.' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authorization.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid or expired user session.' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('selected_college_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.selected_college_id) {
      return jsonResponse({ error: 'No selected college is linked to this user.' }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const folder = typeof body?.folder === 'string' && body.folder.trim() ? body.folder.trim() : 'uploads';
    const fileName = typeof body?.fileName === 'string' && body.fileName.trim() ? body.fileName.trim() : 'asset.bin';
    const fileType = typeof body?.fileType === 'string' && body.fileType.trim()
      ? body.fileType.trim()
      : 'application/octet-stream';
    const fileSize = Number.isFinite(body?.fileSize) ? Number(body.fileSize) : 0;

    if (fileSize > 10 * 1024 * 1024) {
      return jsonResponse({ error: 'File is too large. Maximum upload size is 10 MB.' }, 413);
    }

    const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '-').toLowerCase();
    const keyFolder = [defaultFolder, folder].filter(Boolean).join('/');
    const key = `${profile.selected_college_id}/${keyFolder}/${crypto.randomUUID()}-${sanitizedName || `asset.${extension}`}`;
    const publicUrl = `${publicBase.replace(/\/$/, '')}/${key}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });
    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

    return jsonResponse({
      signedUrl,
      key,
      publicUrl,
      fileName,
      mimeType: fileType,
      provider: 'cloudflare-r2',
      expiresIn: 300,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown signing error.';
    return jsonResponse({ error: message }, 500);
  }
});
