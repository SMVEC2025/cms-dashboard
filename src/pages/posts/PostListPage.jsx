import { Link, useLocation } from 'react-router-dom';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FiSearch, FiArrowRight, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import CustomSelect from '@/components/ui/CustomSelect';
import { useAuth } from '@/hooks/useAuth';
import { POST_STATUS, ROLES } from '@/lib/constants';
import { formatDate, formatPostTypeLabel } from '@/lib/utils';
import { getPostById, listPosts } from '@/services/postsService';

const filterOptions = [
  { value: '', label: 'All statuses' },
  { value: POST_STATUS.DRAFT, label: 'Drafts' },
  { value: POST_STATUS.SUBMITTED, label: 'Pending Review' },
  { value: POST_STATUS.APPROVED, label: 'Approved' },
  { value: POST_STATUS.PUBLISHED, label: 'Published' },
  { value: POST_STATUS.REVISION, label: 'Revision Requested' },
  { value: POST_STATUS.REJECTED, label: 'Rejected' },
];

function SkeletonRow() {
  return (
    <tr className="post-table__skeleton-row">
      <td><div className="skeleton skeleton--text" style={{ width: '60%' }} /><div className="skeleton skeleton--text" style={{ width: '35%', marginTop: 6 }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: '70%' }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: '50%' }} /></td>
      <td><div className="skeleton skeleton--badge" /></td>
      <td><div className="skeleton skeleton--text" style={{ width: '55%' }} /></td>
      <td />
    </tr>
  );
}

function PostListPage() {
  const location = useLocation();
  const { profile, user, colleges, selectedCollegeName, getCollegeNameById } = useAuth();
  const [status, setStatus] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const deferredSearch = useDeferredValue(search);
  const role = profile?.role;
  const collegeId = profile?.selected_college_id;
  const userId = user?.id;
  const isAdminView = role === ROLES.ADMIN;
  const scopedCollegeId = isAdminView ? collegeFilter : collegeId;
  const isBlogsView = location.pathname.startsWith('/blogs');
  const copy = useMemo(
    () => (isBlogsView
      ? {
          eyebrow: 'Blog studio',
          title: 'Manage blogs',
          ctaLabel: 'New Blog',
          ctaTo: '/blogs/new',
          searchPlaceholder: 'Search blogs by title or slug…',
          emptyTitle: 'No matching blogs',
          emptyDescription: 'Try a different filter or create a fresh blog draft for your college.',
          createLabel: 'Create blog',
          editBasePath: '/blogs',
        }
      : {
          eyebrow: 'Content library',
          title: 'Manage posts',
          ctaLabel: 'New Post',
          ctaTo: '/posts/new',
          searchPlaceholder: 'Search by title or slug…',
          emptyTitle: 'No matching posts',
          emptyDescription: 'Try a different filter or create a fresh post for your college.',
          createLabel: 'Create post',
          editBasePath: '/posts',
        }),
    [isBlogsView],
  );

  const openPreview = async (postId) => {
    try {
      const post = await getPostById(postId, { sourceTable: isBlogsView ? 'blogs' : 'posts' });
      const previewData = {
        ...post,
        tags: post.tags || [],
        collegeName: post.college_name || getCollegeNameById(post.college_id) || selectedCollegeName,
      };
      sessionStorage.setItem('cms-preview', JSON.stringify(previewData));
      window.open('/preview', '_blank');
    } catch {
      toast.error('Failed to load preview.');
    }
  };

  useEffect(() => {
    const loadPosts = async () => {
      if (!role || !userId) return;
      try {
        setLoading(true);
        const data = await listPosts({
          role,
          userId,
          collegeId: scopedCollegeId,
          status,
          search: deferredSearch,
          postType: isBlogsView ? 'blog' : undefined,
          sourceTable: isBlogsView ? 'blogs' : 'posts',
          createdByStaffOnly: isAdminView,
        });
        setPosts(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, [deferredSearch, isAdminView, isBlogsView, role, scopedCollegeId, status, userId]);

  return (
    <div className="stack-lg">
      <section className="post-list-panel">

        {/* ── Header ── */}
        <div className="post-list-panel__header">
          <div className="post-list-panel__title-group">
            <span className="post-list-panel__eyebrow">{copy.eyebrow}</span>
            <div className="post-list-panel__title-row">
              <h2 className="post-list-panel__title">{copy.title}</h2>
              {!loading && (
                <span className="post-list-panel__count">{posts.length}</span>
              )}
            </div>
          </div>
          <Link to={copy.ctaTo} className="btn btn--primary post-list-panel__cta">
            {copy.ctaLabel}
          </Link>
        </div>

        {/* ── Filters ── */}
        <div className="post-list-panel__toolbar">
          <div className="post-search">
            <FiSearch className="post-search__icon" />
            <input
              type="search"
              className="post-search__input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </div>
          {isAdminView && (
            <CustomSelect
              value={collegeFilter}
              onChange={setCollegeFilter}
              options={[
                { value: '', label: 'All colleges' },
                ...colleges.map((college) => ({ value: college.id, label: college.name })),
              ]}
              placeholder="All colleges"
              className="post-list-panel__filter post-list-panel__filter--college"
            />
          )}
          <CustomSelect
            value={status}
            onChange={setStatus}
            options={filterOptions}
            placeholder="All statuses"
            className="post-list-panel__filter"
          />
        </div>

        {/* ── Table ── */}
        <div className="post-table-wrap">
          <table className="post-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>College</th>
                <th>Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : posts.length ? (
                posts.map(post => (
                  <tr key={post.id} className="post-table__row">
                    <td>
                      <div className="post-table__title-cell">
                        <span className="post-table__title">{post.title}</span>
                        <span className="post-table__slug">{post.slug}</span>
                        {post.status === POST_STATUS.REVISION && post.review_notes && (
                          <span className="post-table__review-note">
                            Revision note: {post.review_notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="post-table__college">{post.college_name || getCollegeNameById(post.college_id)}</td>
                    <td>
                      <span className="post-type-chip">{formatPostTypeLabel(post.post_type)}</span>
                    </td>
                    <td><StatusBadge status={post.status} /></td>
                    <td className="post-table__date">{formatDate(post.updated_at)}</td>
                    <td className="post-table__action-cell">
                      <button
                        type="button"
                        className="post-table__preview-btn"
                        onClick={() => openPreview(post.id)}
                        title="Preview"
                      >
                        <FiEye size={14} />
                      </button>
                      <Link
                        className="post-table__edit-btn"
                        to={`${copy.editBasePath}/${post.id}/edit${isAdminView ? '?mode=view' : ''}`}
                      >
                        {isAdminView ? 'Open' : 'Edit'} <FiArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                    <EmptyState
                      title={copy.emptyTitle}
                      description={copy.emptyDescription}
                      action={
                        <Link to={copy.ctaTo} className="btn btn--primary">
                          {copy.createLabel}
                        </Link>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>
    </div>
  );
}

export default PostListPage;
