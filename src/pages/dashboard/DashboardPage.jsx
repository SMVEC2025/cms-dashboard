import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import StatCard from '@/components/common/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardData } from '@/services/postsService';
import { POST_STATUS, ROLES } from '@/lib/constants';
import { formatDate, formatPostTypeLabel } from '@/lib/utils';

const STATUS_LABELS = {
  published: 'Published',
  draft: 'Draft',
  submitted: 'Pending',
  approved: 'Approved',
  revision_requested: 'Revision',
  rejected: 'Rejected',
};
const STATUS_CLASS_MAP = {
  published: 'published',
  draft: 'draft',
  submitted: 'pending',
  approved: 'published',
  revision_requested: 'pending',
  rejected: 'pending',
};
const POST_TYPE_LABELS = {
  event: 'Event',
  news: 'News',
  blog: 'Blog',
};

function DashboardPage() {
  const {
    profile,
    user,
    selectedCollegeName,
    loading: authLoading,
  } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const role = profile?.role;
  const collegeId = profile?.selected_college_id;
  const userId = user?.id;

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      if (authLoading) {
        return;
      }

      if (!role || !userId) {
        if (active) {
          setDashboard(null);
          setLoading(false);
        }
        return;
      }

      try {
        if (active) {
          setLoading(true);
        }
        const data = await getDashboardData({
          role,
          userId,
          collegeId,
        });
        if (active) {
          setDashboard(data);
        }
      } catch (error) {
        if (active) {
          toast.error(error.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [authLoading, collegeId, role, userId]);

  const stats = dashboard?.stats || {
    totalPosts: 0,
    drafts: 0,
    pendingPosts: 0,
    publishedPosts: 0,
  };

  const recentPosts = dashboard?.recentPosts || [];
  const reviewQueue = dashboard?.reviewQueue || [];
  const isAdminDashboard = role === ROLES.ADMIN;
  const dashboardItems = isAdminDashboard ? reviewQueue : recentPosts;
  const adminSubmittedItems = reviewQueue.filter((post) => post.status === POST_STATUS.SUBMITTED);
  const activityItems = isAdminDashboard ? adminSubmittedItems : dashboardItems.slice(0, 4);
  const featuredRecentPosts = recentPosts.slice(0, 3);

  // Derive event analytics from recent posts
  const eventPosts = recentPosts.filter((p) => p.post_type === 'event');
  const newsPosts = recentPosts.filter((p) => p.post_type === 'news');
  const blogPosts = recentPosts.filter((p) => p.post_type === 'blog');
  const maxTypeCount = Math.max(eventPosts.length, newsPosts.length, blogPosts.length, 1);

  const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'there';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  if (loading) {
    return (
      <div className="dashboard dashboard--two-col">
        <div className="dashboard__main">
          <div className="dashboard__header">
            <div>
              <h2>Dashboard</h2>
              <p className="dashboard__subtitle">Loading your workspace...</p>
            </div>
          </div>
          <div className="stats-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton--stat" />
            ))}
          </div>
          <section className="dashboard-card">
            <div className="story-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton skeleton--story-card" />
              ))}
            </div>
          </section>
          <section className="dashboard-card">
            <div className="stack-sm">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton skeleton--activity-row" />
              ))}
            </div>
          </section>
        </div>
        <aside className="dashboard__sidebar dashboard__sidebar--loading">
          <div className="skeleton skeleton--sidebar-profile" />
          <div className="skeleton skeleton--sidebar-card" />
          <div className="skeleton skeleton--sidebar-card" />
        </aside>
      </div>
    );
  }

  return (
    <div className="dashboard dashboard--two-col">
      {/* ── Left: Main content ── */}
      <div className={`dashboard__main${isAdminDashboard ? ' dashboard__main--admin' : ''}`}>
        {/* Stat pills */}
        <section className="stats-grid">
          <StatCard
            label="Total Posts"
            value={stats.totalPosts}
            description="All content entries"
            tone="violet"
          />
          <StatCard
            label="Published"
            value={stats.publishedPosts}
            description="Live content"
            tone="blue"
          />
          <StatCard
            label="Pending Review"
            value={stats.pendingPosts}
            description="Awaiting approval"
            tone="amber"
          />
          <StatCard
            label="Drafts"
            value={stats.drafts}
            description="Work in progress"
            tone="rose"
          />
        </section>

        {!isAdminDashboard && (
          <section className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <span className="dashboard-card__eyebrow">Recent content</span>
                <h3>Latest stories in motion</h3>
              </div>
              <Link to="/posts" className="dashboard-card__header-action">
                View Library
              </Link>
            </div>
            <div className="story-grid">
              {featuredRecentPosts.length > 0 ? (
                featuredRecentPosts.map((post) => (
                  <div className="story-card" key={post.id}>
                    <div className="story-card__thumb">
                      <img
                        className="story-card__thumb-image"
                        src={post.featured_image_url || '/disabledimage.webp'}
                        alt={post.title || 'Story thumbnail'}
                      />
                      <span className={`story-card__badge story-card__badge--${STATUS_CLASS_MAP[post.status] || 'draft'}`}>
                        {STATUS_LABELS[post.status] || post.status}
                      </span>
                    </div>

                    <div className="story-card__body">
                      <div className="story-card__title-row">
                        <h4>
                          {post.title}
                          <span className="story-card__type-tag">
                            ({POST_TYPE_LABELS[post.post_type] || post.post_type})
                          </span>
                        </h4>
                      </div>
                      <p className="story-card__category">
                        {post.category || 'Editorial'} &middot; {selectedCollegeName}
                      </p>

                      <div className="story-card__meta-list">
                        <div className="story-card__meta-row">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{formatDate(post.updated_at)}</span>
                        </div>
                        <div className="story-card__meta-row">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{selectedCollegeName}</span>
                        </div>
                        <div className="story-card__meta-row">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span>{POST_TYPE_LABELS[post.post_type] || post.post_type}</span>
                        </div>
                      </div>

                      <div className="story-card__footer">
                        <span className="story-card__status-text">
                          Status: <strong>{STATUS_LABELS[post.status] || post.status}</strong>
                        </span>
                        <Link
                          to={`${post.post_type === 'blog' ? '/blogs' : '/posts'}/${post.id}/edit`}
                          className="story-card__action"
                        >
                          Edit Post
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty">
                  <div className="dashboard-empty__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <span className="dashboard-empty__eyebrow">Ready to publish</span>
                  <h4>No Post yet</h4>
                  <p>
                    Start with a post, event update, or blog article for {selectedCollegeName}.
                    Once your first story is drafted, this workspace will begin surfacing your pipeline here.
                  </p>
                  <div className="dashboard-empty__actions">
                    <Link to="/posts/new" className="btn btn--dashed">
                      Create New Post
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Activity feed table */}
        <section className="dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <span className="dashboard-card__eyebrow">{isAdminDashboard ? 'Queue activity' : 'Activity feed'}</span>
              <h3>{isAdminDashboard ? 'Latest review activity' : 'Recent editorial activity'}</h3>
            </div>
            <Link to={isAdminDashboard ? '/review' : '/posts'} className="dashboard-card__header-action">
              {isAdminDashboard ? 'Open Queue' : 'View All'}
            </Link>
          </div>
          <div className="team-list">
            {activityItems.length > 0 ? (
              activityItems.map((post, index) => {
                const colors = ['#2d3894', '#3b82f6', '#f59e0b', '#e11d48'];
                const itemContent = (
                  <>
                    <div
                      className="team-list__avatar"
                      style={{ background: colors[index % colors.length] }}
                    >
                      {(post.title || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="team-list__details">
                      <strong>{post.title}</strong>
                      <span>{formatPostTypeLabel(post.post_type)} &middot; {formatDate(post.updated_at)}</span>
                    </div>
                    <span className={`team-list__status team-list__status--${STATUS_CLASS_MAP[post.status] || 'draft'}`}>
                      {STATUS_LABELS[post.status] || post.status}
                    </span>
                  </>
                );

                if (isAdminDashboard) {
                  return (
                    <Link
                      key={post.id}
                      to={`/review?postId=${post.id}`}
                      className="team-list__item"
                    >
                      {itemContent}
                    </Link>
                  );
                }

                return (
                  <div className="team-list__item" key={post.id}>
                    {itemContent}
                  </div>
                );
              })
            ) : (
              <p className="muted" style={{ fontSize: '0.88rem' }}>
                {isAdminDashboard ? 'No submitted events or blogs to display.' : 'No recent activity to display.'}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Right: Sidebar ── */}
      <aside className="dashboard__sidebar">
        {/* Greeting / Profile card */}
        <div className="dash-profile">
          <div className="dash-profile__avatar">
            {displayName.charAt(0)}
          </div>
          <h3 className="dash-profile__greeting">
            Good Morning, {displayName}
          </h3>
          <p className="dash-profile__sub">
            Continue your editorial workflow!
          </p>
        </div>

        {/* Content Analytics */}
        <div className="dash-sidebar-card">
          <div className="dash-sidebar-card__header">
            <h4>Content Analytics</h4>
          </div>
          <p className="dash-analytics__subtitle">Post distribution by type</p>
          <div className="dash-analytics">
            <div className="dash-analytics__y-axis">
              <span>{maxTypeCount}</span>
              <span>{Math.round(maxTypeCount * 0.5)}</span>
              <span>0</span>
            </div>
            <div className="dash-analytics__bars">
              <div className="dash-analytics__gridlines">
                <span /><span /><span />
              </div>
              <div className="dash-analytics__col">
                <div className="dash-analytics__bar-group">
                  <div
                    className="dash-analytics__bar dash-analytics__bar--events"
                    style={{ height: `${(eventPosts.length / maxTypeCount) * 100}%` }}
                  />
                  <div
                    className="dash-analytics__bar dash-analytics__bar--events-pub"
                    style={{ height: `${(eventPosts.filter((p) => p.status === 'published').length / maxTypeCount) * 100}%` }}
                  />
                </div>
                <span className="dash-analytics__label">Events</span>
              </div>
              <div className="dash-analytics__col">
                <div className="dash-analytics__bar-group">
                  <div
                    className="dash-analytics__bar dash-analytics__bar--news"
                    style={{ height: `${(newsPosts.length / maxTypeCount) * 100}%` }}
                  />
                  <div
                    className="dash-analytics__bar dash-analytics__bar--news-pub"
                    style={{ height: `${(newsPosts.filter((p) => p.status === 'published').length / maxTypeCount) * 100}%` }}
                  />
                </div>
                <span className="dash-analytics__label">News</span>
              </div>
              <div className="dash-analytics__col">
                <div className="dash-analytics__bar-group">
                  <div
                    className="dash-analytics__bar dash-analytics__bar--blogs"
                    style={{ height: `${(blogPosts.length / maxTypeCount) * 100}%` }}
                  />
                  <div
                    className="dash-analytics__bar dash-analytics__bar--blogs-pub"
                    style={{ height: `${(blogPosts.filter((p) => p.status === 'published').length / maxTypeCount) * 100}%` }}
                  />
                </div>
                <span className="dash-analytics__label">Blogs</span>
              </div>
            </div>
          </div>
          <div className="dash-analytics__legend">
            <span className="dash-analytics__legend-item">
              <span className="dash-analytics__legend-dot dash-analytics__legend-dot--total" />
              Total
            </span>
            <span className="dash-analytics__legend-item">
              <span className="dash-analytics__legend-dot dash-analytics__legend-dot--published" />
              Published
            </span>
          </div>
          <div className="dash-analytics__stats">
            <div className="dash-analytics__stat">
              <span className="dash-analytics__stat-dot" style={{ background: '#2d3894' }} />
              <strong>{eventPosts.length}</strong>
              <span>Events</span>
            </div>
            <div className="dash-analytics__stat">
              <span className="dash-analytics__stat-dot" style={{ background: '#3b82f6' }} />
              <strong>{newsPosts.length}</strong>
              <span>News</span>
            </div>
            <div className="dash-analytics__stat">
              <span className="dash-analytics__stat-dot" style={{ background: '#8b5cf6' }} />
              <strong>{blogPosts.length}</strong>
              <span>Blogs</span>
            </div>
          </div>
        </div>

        {/* Workspace card */}
        <div className="dash-sidebar-card">
          <div className="dash-sidebar-card__header">
            <h4>Workspace</h4>
            <Link to="/posts/new" className="dash-sidebar-card__action">
              + New
            </Link>
          </div>
          <div className="dash-workspace">
            <div className="dash-workspace__item">
              <div className="dash-workspace__icon dash-workspace__icon--violet">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 22V12h6v10" />
                  <path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M15 11h.01" />
                </svg>
              </div>
              <div className="dash-workspace__info">
                <strong>{selectedCollegeName}</strong>
                <span>Active workspace</span>
              </div>
            </div>
            <div className="dash-workspace__item">
              <div className="dash-workspace__icon dash-workspace__icon--blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="dash-workspace__info">
                <strong>{stats.totalPosts} Posts</strong>
                <span>{stats.publishedPosts} published</span>
              </div>
            </div>
            <div className="dash-workspace__item">
              <div className="dash-workspace__icon dash-workspace__icon--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="dash-workspace__info">
                <strong>{stats.pendingPosts} Pending</strong>
                <span>Awaiting review</span>
              </div>
            </div>
            <div className="dash-workspace__item">
              <div className="dash-workspace__icon dash-workspace__icon--rose">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div className="dash-workspace__info">
                <strong>{stats.drafts} Drafts</strong>
                <span>Work in progress</span>
              </div>
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}

export default DashboardPage;
