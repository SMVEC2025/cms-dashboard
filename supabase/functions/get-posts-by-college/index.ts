import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POST_OVERVIEW_COLUMNS = [
  'id',
  'source_table',
  'college_id',
  'college_name',
  'author_id',
  'author_name',
  'reviewer_id',
  'reviewer_name',
  'post_type',
  'status',
  'title',
  'slug',
  'summary',
  'featured_image_url',
  'content_html',
  'event_date',
  'event_time',
  'location',
  'venue',
  'organizer',
  'category',
  'tags',
  'review_notes',
  'submitted_at',
  'reviewed_at',
  'published_at',
  'created_at',
  'updated_at',
].join(',');

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function parseLimit(rawLimit: string | null) {
  if (!rawLimit) {
    return 100;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error('Query param "limit" must be a positive integer.');
  }

  return Math.min(parsed, 500);
}

const PUBLISHED_STATUS = 'published';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed. Use GET.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret.' }, 500);
    }

    const url = new URL(req.url);
    const collegeId = (
      url.searchParams.get('eid')
      ?? url.searchParams.get('id')
      ?? url.searchParams.get('collegeId')
      ?? url.searchParams.get('college_id')
      ?? ''
    ).trim();
    const collegeShortCode = (
      url.searchParams.get('short_code')
      ?? url.searchParams.get('shortCode')
      ?? ''
    ).trim();
    const postType = url.searchParams.get('postType')?.trim() || null;
    const limit = parseLimit(url.searchParams.get('limit'));

    if (!collegeId && !collegeShortCode) {
      return jsonResponse(
        { error: 'Missing required query param. Pass "eid" (college id) or "short_code".' },
        400,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let collegeQuery = supabase
      .from('colleges')
      .select('id,name,short_code')
      .limit(1);

    if (collegeId) {
      collegeQuery = collegeQuery.eq('id', collegeId);
    } else {
      collegeQuery = collegeQuery.ilike('short_code', collegeShortCode);
    }

    const { data: collegeRows, error: collegeError } = await collegeQuery;

    if (collegeError) {
      return jsonResponse({ error: collegeError.message }, 500);
    }

    const college = collegeRows?.[0];

    if (!college) {
      return jsonResponse(
        { error: 'College not found for the given "eid" or "short_code".' },
        404,
      );
    }

    let query = supabase
      .from('post_overview')
      .select(POST_OVERVIEW_COLUMNS)
      .eq('college_id', college.id)
      .eq('status', PUBLISHED_STATUS)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (postType) {
      query = query.eq('post_type', postType);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      return jsonResponse({ error: postsError.message }, 500);
    }

    return jsonResponse({
      college: {
        id: college.id,
        name: college.name,
        short_code: college.short_code ?? null,
      },
      count: posts?.length ?? 0,
      posts: posts ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return jsonResponse({ error: message }, 500);
  }
});
