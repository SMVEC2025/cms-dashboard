import { POST_STATUS, ROLES } from '@/lib/constants';
import { requireSupabase } from '@/lib/supabase';
import { logAuditEvent } from './auditService';

const CONTENT_TABLES = ['posts', 'blogs'];
const POST_OVERVIEW_LIST_COLUMNS = [
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
  'featured_image_url',
  'event_date',
  'event_time',
  'location',
  'venue',
  'category',
  'tags',
  'review_notes',
  'submitted_at',
  'reviewed_at',
  'published_at',
  'created_at',
  'updated_at',
].join(',');
const STAFF_IDS_CACHE_TTL_MS = 5 * 60 * 1000;

let staffIdsCache = null;
let staffIdsCacheAt = 0;
let staffIdsRequest = null;

function applyPostScope(query, { role, userId, collegeId }) {
  let scopedQuery = query;

  if (collegeId) {
    scopedQuery = scopedQuery.eq('college_id', collegeId);
  }

  if (role === ROLES.STAFF) {
    scopedQuery = scopedQuery.eq('author_id', userId);
  }

  return scopedQuery;
}

function getSourceTableForPostType(postType) {
  return postType === 'blog' ? 'blogs' : 'posts';
}

function getEntityTypeForTable(sourceTable) {
  return sourceTable === 'blogs' ? 'blog' : 'post';
}

function shouldUseCachedStaffIds() {
  if (!staffIdsCache?.length) {
    return false;
  }

  return Date.now() - staffIdsCacheAt < STAFF_IDS_CACHE_TTL_MS;
}

async function getStaffIds(client) {
  if (shouldUseCachedStaffIds()) {
    return staffIdsCache;
  }

  if (staffIdsRequest) {
    return staffIdsRequest;
  }

  staffIdsRequest = (async () => {
    const { data: staffProfiles, error: staffError } = await client
      .from('profiles')
      .select('id')
      .eq('role', ROLES.STAFF);

    if (staffError) {
      throw staffError;
    }

    staffIdsCache = (staffProfiles || []).map((profile) => profile.id);
    staffIdsCacheAt = Date.now();
    return staffIdsCache;
  })();

  try {
    return await staffIdsRequest;
  } finally {
    staffIdsRequest = null;
  }
}

function normalizeContentPayload(payload) {
  const persistedPayload = { ...payload };
  delete persistedPayload.direct_publish;

  return {
    ...persistedPayload,
    // Older schemas still require summary, even though the editor no longer exposes it.
    summary: persistedPayload.summary ?? '',
  };
}

async function fetchRecordById(client, sourceTable, postId) {
  const { data, error } = await client
    .from(sourceTable)
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function resolveSourceTable(client, postId, preferredSourceTable) {
  if (preferredSourceTable) {
    return preferredSourceTable;
  }

  for (const sourceTable of CONTENT_TABLES) {
    const record = await fetchRecordById(client, sourceTable, postId);

    if (record) {
      return sourceTable;
    }
  }

  throw new Error('Content not found.');
}

async function countPosts({ role, userId, collegeId, status, postType }) {
  const client = requireSupabase();
  let query = client.from('post_overview').select('id', { count: 'exact', head: true });
  query = applyPostScope(query, { role, userId, collegeId });

  if (status) {
    query = query.eq('status', status);
  }

  if (postType) {
    query = query.eq('post_type', postType);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
}

export async function getDashboardData({ role, userId, collegeId }) {
  const client = requireSupabase();
  const recentQuery = applyPostScope(
    client
      .from('post_overview')
      .select(POST_OVERVIEW_LIST_COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(6),
    { role, userId, collegeId },
  );
  let reviewQueueQuery = null;

  if (role === ROLES.ADMIN) {
    reviewQueueQuery = client
      .from('post_overview')
      .select(POST_OVERVIEW_LIST_COLUMNS)
      .eq('status', POST_STATUS.SUBMITTED)
      .in('post_type', ['event', 'blog'])
      .order('submitted_at', { ascending: false, nullsFirst: false });
  }

  const [
    totalPosts,
    drafts,
    pendingPosts,
    publishedPosts,
    totalEvents,
    publishedEvents,
    totalNews,
    publishedNews,
    totalBlogs,
    publishedBlogs,
    { data: recentPosts, error: recentError },
    reviewQueueResult,
  ] = await Promise.all([
    countPosts({ role, userId, collegeId }),
    countPosts({ role, userId, collegeId, status: POST_STATUS.DRAFT }),
    countPosts({ role, userId, collegeId, status: POST_STATUS.SUBMITTED }),
    countPosts({ role, userId, collegeId, status: POST_STATUS.PUBLISHED }),
    countPosts({ role, userId, collegeId, postType: 'event' }),
    countPosts({ role, userId, collegeId, postType: 'event', status: POST_STATUS.PUBLISHED }),
    countPosts({ role, userId, collegeId, postType: 'news' }),
    countPosts({ role, userId, collegeId, postType: 'news', status: POST_STATUS.PUBLISHED }),
    countPosts({ role, userId, collegeId, postType: 'blog' }),
    countPosts({ role, userId, collegeId, postType: 'blog', status: POST_STATUS.PUBLISHED }),
    recentQuery,
    reviewQueueQuery ?? Promise.resolve({ data: [], error: null }),
  ]);

  if (recentError) {
    throw recentError;
  }

  if (reviewQueueResult?.error) {
    throw reviewQueueResult.error;
  }

  return {
    stats: {
      totalPosts,
      drafts,
      pendingPosts,
      publishedPosts,
    },
    contentBreakdown: {
      event: {
        total: totalEvents,
        published: publishedEvents,
      },
      news: {
        total: totalNews,
        published: publishedNews,
      },
      blog: {
        total: totalBlogs,
        published: publishedBlogs,
      },
    },
    recentPosts: recentPosts || [],
    reviewQueue: reviewQueueResult?.data || [],
  };
}

export async function listPosts({
  role,
  userId,
  collegeId,
  status,
  search,
  postType,
  sourceTable,
  createdByStaffOnly = false,
}) {
  const client = requireSupabase();
  let query = applyPostScope(
    client
      .from('post_overview')
      .select(POST_OVERVIEW_LIST_COLUMNS)
      .order('updated_at', { ascending: false }),
    { role, userId, collegeId },
  );

  if (createdByStaffOnly && role === ROLES.ADMIN) {
    const staffIds = await getStaffIds(client);
    if (!staffIds.length) {
      return [];
    }

    query = query.in('author_id', staffIds);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (postType) {
    query = query.eq('post_type', postType);
  }

  if (sourceTable) {
    query = query.eq('source_table', sourceTable);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getPostById(postId, options = {}) {
  const client = requireSupabase();
  const { sourceTable } = options;
  const table = await resolveSourceTable(client, postId, sourceTable);
  const data = await fetchRecordById(client, table, postId);

  if (!data) {
    throw new Error('Content not found.');
  }

  const { data: overview } = await client
    .from('post_overview')
    .select('author_name, college_name, source_table')
    .eq('id', postId)
    .eq('source_table', table)
    .maybeSingle();

  return {
    ...data,
    author_name: overview?.author_name || data.author_name || null,
    college_name: overview?.college_name || null,
  };
}

export async function updatePostFeaturedImage({
  postId,
  authorId,
  featuredImageUrl,
  featuredImageAssetId,
  sourceTable,
}) {
  const client = requireSupabase();
  const table = await resolveSourceTable(client, postId, sourceTable);
  const entityType = getEntityTypeForTable(table);
  const patch = {
    featured_image_url: featuredImageUrl || null,
    featured_image_asset_id: featuredImageAssetId || null,
  };

  const { data, error } = await client
    .from(table)
    .update(patch)
    .eq('id', postId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: authorId,
    action: `${entityType}.featured_image_updated`,
    entity_type: entityType,
    entity_id: postId,
    metadata: {
      featured_image_url: patch.featured_image_url,
      featured_image_asset_id: patch.featured_image_asset_id,
    },
  });

  return data;
}

export async function saveDraft(payload) {
  const client = requireSupabase();
  const sourceTable = getSourceTableForPostType(payload.post_type);
  const entityType = getEntityTypeForTable(sourceTable);
  const record = {
    ...normalizeContentPayload(payload),
    status: POST_STATUS.DRAFT,
    submitted_at: null,
  };

  const query = payload.id
    ? client.from(sourceTable).update(record).eq('id', payload.id)
    : client.from(sourceTable).insert(record);

  const { data, error } = await query.select('*').single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: payload.author_id,
    action: payload.id ? `${entityType}.updated` : `${entityType}.created`,
    entity_type: entityType,
    entity_id: data.id,
    metadata: { status: data.status, college_id: data.college_id },
  });

  return data;
}

export async function submitPost(payload) {
  const client = requireSupabase();
  const sourceTable = getSourceTableForPostType(payload.post_type);
  const entityType = getEntityTypeForTable(sourceTable);
  const now = new Date().toISOString();
  const shouldPublishDirectly = Boolean(payload.direct_publish);
  const record = shouldPublishDirectly
    ? {
        ...normalizeContentPayload(payload),
        status: POST_STATUS.PUBLISHED,
        published_at: now,
        reviewer_id: payload.author_id,
        reviewed_at: now,
      }
    : {
        ...normalizeContentPayload(payload),
        status: POST_STATUS.SUBMITTED,
        submitted_at: now,
        published_at: null,
      };

  const query = payload.id
    ? client.from(sourceTable).update(record).eq('id', payload.id)
    : client.from(sourceTable).insert(record);

  const { data, error } = await query.select('*').single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: payload.author_id,
    action: shouldPublishDirectly ? `${entityType}.published` : `${entityType}.submitted`,
    entity_type: entityType,
    entity_id: data.id,
    metadata: { status: data.status, college_id: data.college_id },
  });

  return data;
}

export async function listReviewQueue({ collegeId, status, postType, sourceTable }) {
  const client = requireSupabase();
  let query = client
    .from('post_overview')
    .select(POST_OVERVIEW_LIST_COLUMNS)
    .in('status', [POST_STATUS.SUBMITTED, POST_STATUS.REVISION, POST_STATUS.APPROVED])
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (collegeId) {
    query = query.eq('college_id', collegeId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (postType) {
    query = query.eq('post_type', postType);
  }

  if (sourceTable) {
    query = query.eq('source_table', sourceTable);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateReviewStatus({ postId, reviewerId, status, reviewNotes, sourceTable }) {
  const client = requireSupabase();
  const table = await resolveSourceTable(client, postId, sourceTable);
  const entityType = getEntityTypeForTable(table);
  const patch = {
    status,
    review_notes: reviewNotes || null,
    reviewer_id: reviewerId,
    reviewed_at: new Date().toISOString(),
  };

  if (status === POST_STATUS.PUBLISHED) {
    patch.published_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from(table)
    .update(patch)
    .eq('id', postId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: reviewerId,
    action: `${entityType}.${status}`,
    entity_type: entityType,
    entity_id: postId,
    metadata: { review_notes: reviewNotes || null },
  });

  return data;
}
