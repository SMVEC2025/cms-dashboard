import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import CustomSelect from '@/components/ui/CustomSelect';
import { useAuth } from '@/hooks/useAuth';
import { POST_STATUS } from '@/lib/constants';
import { formatDate, formatPostTypeLabel } from '@/lib/utils';
import { listReviewQueue, updateReviewStatus } from '@/services/postsService';
import PostPreview from '@/components/preview/PostPreview';

const actionMap = [
  { status: POST_STATUS.REVISION, label: 'Request Revision' },
  { status: POST_STATUS.APPROVED, label: 'Approve' },
  { status: POST_STATUS.REJECTED, label: 'Reject' },
  { status: POST_STATUS.PUBLISHED, label: 'Publish' },
];
const postTypeOptions = [
  { value: '', label: 'All content types' },
  { value: 'news', label: 'News' },
  { value: 'event', label: 'Events' },
  { value: 'blog', label: 'Blogs' },
];

function ReviewQueuePage() {
  const { user, colleges, selectedCollegeName } = useAuth();
  const [searchParams] = useSearchParams();
  const [collegeFilter, setCollegeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(POST_STATUS.SUBMITTED);
  const [postTypeFilter, setPostTypeFilter] = useState('');
  const [queue, setQueue] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const requestedPostId = searchParams.get('postId');

  const activePost = useMemo(() => queue.find((item) => item.id === activeId) || queue[0], [activeId, queue]);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listReviewQueue({
        collegeId: collegeFilter,
        status: statusFilter,
        postType: postTypeFilter,
      });
      setQueue(data);
      const matchedPost = requestedPostId
        ? data.find((item) => item.id === requestedPostId)
        : null;
      const nextActivePost = matchedPost || data[0];

      setActiveId(nextActivePost?.id || '');
      setReviewNotes(nextActivePost?.review_notes || '');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [collegeFilter, postTypeFilter, requestedPostId, statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setReviewNotes(activePost?.review_notes || '');
  }, [activePost]);

  const handleAction = async (status) => {
    if (!activePost) {
      return;
    }

    try {
      setSaving(true);
      await updateReviewStatus({
        postId: activePost.id,
        reviewerId: user.id,
        status,
        reviewNotes,
        sourceTable: activePost.source_table,
      });
      toast.success(`Post updated: ${status.replace('_', ' ')}.`);
      await loadQueue();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="review-layout">
      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Approval workflow</span>
            <h3>Submitted content</h3>
          </div>
        </div>

        <div className="toolbar toolbar--stacked">
          <CustomSelect
            value={collegeFilter}
            onChange={setCollegeFilter}
            options={[
              { value: '', label: 'All colleges' },
              ...colleges.map(c => ({ value: c.id, label: c.name })),
            ]}
            placeholder="All colleges"
          />

          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All review statuses' },
              { value: POST_STATUS.SUBMITTED, label: 'Pending Review' },
              { value: POST_STATUS.REVISION, label: 'Revision Requested' },
              { value: POST_STATUS.APPROVED, label: 'Approved' },
            ]}
            placeholder="All review statuses"
          />

          <CustomSelect
            value={postTypeFilter}
            onChange={setPostTypeFilter}
            options={postTypeOptions}
            placeholder="All types"
          />
        </div>

        {loading ? (
          <div className="panel__body">
            <p className="muted">Loading review queue...</p>
          </div>
        ) : queue.length ? (
          <div className="review-list">
            {queue.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`review-list__item ${activePost?.id === item.id ? 'is-active' : ''}`}
                onClick={() => setActiveId(item.id)}
              >
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {item.college_name || selectedCollegeName} &middot;{' '}
                    {formatPostTypeLabel(item.post_type)}
                  </p>
                </div>
                <div className="review-list__meta">
                  <StatusBadge status={item.status} />
                  <small>{formatDate(item.updated_at)}</small>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Queue is clear"
            description="No submitted or approved news, events, or blogs match the current filters."
          />
        )}
      </section>

      <section className="panel panel--preview">
        {activePost ? (
          <>
            <div className="panel__header">
              <h3 className="panel__title">{activePost.title}</h3>
              <StatusBadge status={activePost.status} />
            </div>

            <PostPreview
              post={{
                ...activePost,
                tags: activePost.tags || [],
                content_html: activePost.content_html || '',
              }}
              selectedCollegeName={activePost.college_name || selectedCollegeName}
            />

            <div className="review-actions">
              <label>
                <span>Review notes</span>
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  rows={4}
                  placeholder="Explain why you approved, rejected, or requested a revision."
                />
              </label>

              <div className="review-actions__buttons">
                {actionMap.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    className={`btn ${action.status === POST_STATUS.PUBLISHED ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => handleAction(action.status)}
                    disabled={saving}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No queued events and blogs are found" description="" />
        )}
      </section>
    </div>
  );
}

export default ReviewQueuePage;
