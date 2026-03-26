import { Link } from 'react-router-dom';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FiSearch, FiArrowRight, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { POST_STATUS } from '@/lib/constants';
import { formatDate, formatPostTypeLabel } from '@/lib/utils';
import { getPostById, listPosts } from '@/services/postsService';

const TYPE_TABS = [
  { id: 'all',   label: 'All Drafts' },
  { id: 'posts', label: 'Posts & Events' },
  { id: 'blogs', label: 'Blogs' },
];

function SkeletonRow() {
  return (
    <tr className="post-table__skeleton-row">
      <td>
        <div className="skeleton skeleton--text" style={{ width: '58%' }} />
        <div className="skeleton skeleton--text" style={{ width: '32%', marginTop: 6 }} />
      </td>
      <td><div className="skeleton skeleton--badge" /></td>
      <td><div className="skeleton skeleton--text" style={{ width: '55%' }} /></td>
      <td><div className="skeleton skeleton--text" style={{ width: '50%' }} /></td>
      <td />
    </tr>
  );
}

function DraftsPage() {
  const { profile, user, selectedCollegeName, getCollegeNameById } = useAuth();
  const [typeFilter, setTypeFilter]   = useState('all');
  const [search, setSearch]           = useState('');
  const [drafts, setDrafts]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const deferredSearch = useDeferredValue(search);

  const role      = profile?.role;
  const collegeId = profile?.selected_college_id;
  const userId    = user?.id;

  const postsDrafts = useMemo(() => drafts.filter((d) => d.source_table === 'posts'), [drafts]);
  const blogsDrafts = useMemo(() => drafts.filter((d) => d.source_table === 'blogs'), [drafts]);

  const counts = { all: drafts.length, posts: postsDrafts.length, blogs: blogsDrafts.length };

  const visible = useMemo(() => {
    if (typeFilter === 'posts') return postsDrafts;
    if (typeFilter === 'blogs') return blogsDrafts;
    return drafts;
  }, [typeFilter, drafts, postsDrafts, blogsDrafts]);

  useEffect(() => {
    const load = async () => {
      if (!role || !userId) return;
      try {
        setLoading(true);
        const data = await listPosts({
          role,
          userId,
          collegeId,
          status: POST_STATUS.DRAFT,
          search: deferredSearch,
        });
        setDrafts(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [collegeId, deferredSearch, role, userId]);

  const openPreview = async (post) => {
    try {
      const sourceTable = post.source_table || (post.post_type === 'blog' ? 'blogs' : 'posts');
      const full = await getPostById(post.id, { sourceTable });
      sessionStorage.setItem('cms-preview', JSON.stringify({
        ...full,
        tags: full.tags || [],
        collegeName: full.college_name || selectedCollegeName || getCollegeNameById(full.college_id),
      }));
      window.open('/preview', '_blank');
    } catch {
      toast.error('Failed to load preview.');
    }
  };

  const editPath = (post) =>
    `${post.source_table === 'blogs' ? '/blogs' : '/posts'}/${post.id}/edit`;

  return (
    <div className="stack-lg">
      <section className="post-list-panel">

        {/* ── Header ── */}
        <div className="post-list-panel__header">
          <div className="post-list-panel__title-group">
            <span className="post-list-panel__eyebrow">Content workspace</span>
            <div className="post-list-panel__title-row">
              <h2 className="post-list-panel__title">Drafts</h2>
              {!loading && (
                <span className="post-list-panel__count">{visible.length}</span>
              )}
            </div>
          </div>
          <div className="drafts-header-ctas">
            <Link to="/posts/new" className="btn btn--outline btn--compact">New Post</Link>
            <Link to="/blogs/new" className="btn btn--primary btn--compact">New Blog</Link>
          </div>
        </div>

        {/* ── Toolbar: type tabs + search ── */}
        <div className="drafts-toolbar">
          <div className="drafts-type-tabs">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`drafts-type-tab${typeFilter === tab.id ? ' is-active' : ''}`}
                onClick={() => setTypeFilter(tab.id)}
              >
                {tab.label}
                {!loading && (
                  <span className="drafts-type-tab__count">{counts[tab.id]}</span>
                )}
              </button>
            ))}
          </div>
          <div className="post-search">
            <FiSearch className="post-search__icon" />
            <input
              type="search"
              className="post-search__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drafts by title or slug…"
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="post-table-wrap">
          <table className="post-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Last Modified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : visible.length ? (
                visible.map((post) => (
                  <tr key={post.id} className="post-table__row">
                    <td>
                      <div className="post-table__title-cell">
                        {post.title
                          ? <span className="post-table__title">{post.title}</span>
                          : <span className="post-table__title drafts-untitled">Untitled</span>
                        }
                        <span className="post-table__slug">{post.slug || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="post-type-chip">{formatPostTypeLabel(post.post_type)}</span>
                    </td>
                    <td className="post-table__college">{post.category || '—'}</td>
                    <td className="post-table__date">{formatDate(post.updated_at)}</td>
                    <td className="post-table__action-cell">
                      <button
                        type="button"
                        className="post-table__preview-btn"
                        onClick={() => openPreview(post)}
                        title="Preview"
                      >
                        <FiEye size={14} />
                      </button>
                      <Link to={editPath(post)} className="post-table__edit-btn">
                        Edit <FiArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                    <EmptyState
                      title="No drafts found"
                      description={
                        search
                          ? 'No drafts match your search. Try a different keyword.'
                          : 'Saved drafts appear here. Start a new post or blog to begin writing.'
                      }
                      action={
                        <div className="drafts-empty-actions">
                          <Link to="/posts/new" className="btn btn--outline">New Post</Link>
                          <Link to="/blogs/new" className="btn btn--primary">New Blog</Link>
                        </div>
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

export default DraftsPage;
