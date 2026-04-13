import { createClient } from 'npm:@supabase/supabase-js@2';
import { PutObjectCommand, S3Client } from 'npm:@aws-sdk/client-s3@3.758.0';

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
    console.log('r2-upload request received', {
      method: req.method,
      url: req.url,
    });

    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      console.error('r2-upload missing authorization header');
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const supabaseUrl = readEnv('SUPABASE_URL');
    const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
    const bucketName = readEnv('R2_BUCKET', 'R2_BUCKET_NAME');
    const publicBase = readEnv('R2_PUBLIC_BASE_URL', 'R2_PUBLIC_URL');
    const defaultFolder = readEnv('R2_UPLOAD_FOLDER') || 'institutional-cms';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('r2-upload missing supabase secrets', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret.' }, 500);
    }

    if (!bucketName || !publicBase) {
      console.error('r2-upload missing R2 secrets', {
        hasBucketName: Boolean(bucketName),
        hasPublicBase: Boolean(publicBase),
      });
      return jsonResponse({ error: 'Missing R2 bucket or public URL secret.' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const jwt = authorization.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.error('r2-upload auth failed', {
        authError: authError?.message,
        hasUser: Boolean(user),
      });
      return jsonResponse({ error: 'Invalid or expired user session.' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('selected_college_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.selected_college_id) {
      console.error('r2-upload profile lookup failed', {
        userId: user.id,
        profileError: profileError?.message,
        selectedCollegeId: profile?.selected_college_id ?? null,
      });
      return jsonResponse({ error: 'No selected college is linked to this user.' }, 400);
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const folder = formData.get('folder')?.toString() || 'posts';

    if (!(file instanceof File)) {
      console.error('r2-upload invalid file payload', {
        folder,
        fileType: typeof file,
      });
      return jsonResponse({ error: 'Expected a file upload.' }, 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return jsonResponse({ error: 'File is too large. Maximum upload size is 10 MB.' }, 413);
    }

    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-').toLowerCase();
    const keyFolder = [defaultFolder, folder].filter(Boolean).join('/');
    const key = `${profile.selected_college_id}/${keyFolder}/${crypto.randomUUID()}-${sanitizedName || `asset.${extension}`}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    try {
      await r2.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: bytes,
          ContentType: file.type || 'application/octet-stream',
        }),
      );
    } catch (r2Error) {
      console.error('r2-upload storage upload failed', {
        key,
        bucketName,
        message: r2Error instanceof Error ? r2Error.message : 'Unknown R2 upload error',
      });
      throw r2Error;
    }

    const publicUrl = `${publicBase.replace(/\/$/, '')}/${key}`;

    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        college_id: profile.selected_college_id,
        uploader_id: user.id,
        bucket_key: key,
        public_url: publicUrl,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        context: folder,
        metadata: {
          source: 'supabase-edge-function',
        },
      })
      .select('*')
      .single();

    if (assetError) {
      console.error('r2-upload media_assets insert failed', {
        userId: user.id,
        key,
        publicUrl,
        message: assetError.message,
      });
      return jsonResponse({ error: assetError.message }, 500);
    }

    console.log('r2-upload completed', {
      assetId: asset.id,
      key,
      userId: user.id,
      collegeId: profile.selected_college_id,
    });

    return jsonResponse({
      id: asset.id,
      key,
      publicUrl,
      fileName: asset.file_name,
      mimeType: asset.mime_type,
      sizeBytes: asset.size_bytes,
      context: asset.context,
      createdAt: asset.created_at,
      provider: 'cloudflare-r2',
      bytes: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upload error.';
    console.error('r2-upload unhandled error', { message });
    return jsonResponse({ error: message }, 500);
  }
});
