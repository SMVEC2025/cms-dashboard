import { POST_STATUS, ROLES } from '@/lib/constants';
import { requireSupabase } from '@/lib/supabase';
import { logAuditEvent } from './auditService';

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

async function countPosts({ role, userId, collegeId, status }) {
  const client = requireSupabase();
  let query = client.from('posts').select('id', { count: 'exact', head: true });
  query = applyPostScope(query, { role, userId, collegeId });

  if (status) {
    query = query.eq('status', status);
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
    client.from('post_overview').select('*').order('updated_at', { ascending: false }).limit(6),
    { role, userId, collegeId },
  );

  const [
    totalPosts,
    drafts,
    pendingPosts,
    publishedPosts,
    { data: recentPosts, error: recentError },
  ] = await Promise.all([
    countPosts({ role, userId, collegeId }),
    countPosts({ role, userId, collegeId, status: POST_STATUS.DRAFT }),
    countPosts({ role, userId, collegeId, status: POST_STATUS.SUBMITTED }),
    countPosts({ role, userId, collegeId, status: POST_STATUS.PUBLISHED }),
    recentQuery,
  ]);

  if (recentError) {
    throw recentError;
  }

  return {
    stats: {
      totalPosts,
      drafts,
      pendingPosts,
      publishedPosts,
    },
    recentPosts: recentPosts || [],
  };
}

export async function listPosts({ role, userId, collegeId, status, search, postType }) {
  const client = requireSupabase();
  let query = applyPostScope(
    client.from('post_overview').select('*').order('updated_at', { ascending: false }),
    { role, userId, collegeId },
  );

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (postType) {
    query = query.eq('post_type', postType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getPostById(postId) {
  const client = requireSupabase();
  const { data, error } = await client.from('posts').select('*').eq('id', postId).single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePostFeaturedImage({ postId, authorId, featuredImageUrl, featuredImageAssetId }) {
  const client = requireSupabase();
  const patch = {
    featured_image_url: featuredImageUrl || null,
    featured_image_asset_id: featuredImageAssetId || null,
  };

  const { data, error } = await client
    .from('posts')
    .update(patch)
    .eq('id', postId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: authorId,
    action: 'post.featured_image_updated',
    entity_type: 'post',
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
  const record = {
    ...payload,
    status: POST_STATUS.DRAFT,
    submitted_at: null,
  };

  const query = payload.id
    ? client.from('posts').update(record).eq('id', payload.id)
    : client.from('posts').insert(record);

  const { data, error } = await query.select('*').single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: payload.author_id,
    action: payload.id ? 'post.updated' : 'post.created',
    entity_type: 'post',
    entity_id: data.id,
    metadata: { status: data.status, college_id: data.college_id },
  });

  return data;
}

export async function submitPost(payload) {
  const client = requireSupabase();
  const record = {
    ...payload,
    status: POST_STATUS.SUBMITTED,
    submitted_at: new Date().toISOString(),
  };

  const query = payload.id
    ? client.from('posts').update(record).eq('id', payload.id)
    : client.from('posts').insert(record);

  const { data, error } = await query.select('*').single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: payload.author_id,
    action: 'post.submitted',
    entity_type: 'post',
    entity_id: data.id,
    metadata: { status: data.status, college_id: data.college_id },
  });

  return data;
}

export async function listReviewQueue({ collegeId, status, postType }) {
  const client = requireSupabase();
  let query = client
    .from('post_overview')
    .select('*')
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

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateReviewStatus({ postId, reviewerId, status, reviewNotes }) {
  const client = requireSupabase();
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
    .from('posts')
    .update(patch)
    .eq('id', postId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await logAuditEvent({
    actor_id: reviewerId,
    action: `post.${status}`,
    entity_type: 'post',
    entity_id: postId,
    metadata: { review_notes: reviewNotes || null },
  });

  return data;
}
