import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const pageMap = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Plan, prioritize, and manage your editorial content with ease.',
  },
  '/posts': {
    title: 'Content Library',
    subtitle: 'Manage drafts, published content, and items in review.',
  },
  '/posts/new': {
    title: 'Create Post',
    subtitle: 'Craft a polished event, news update, or blog article with preview-ready content.',
  },
  '/blogs': {
    title: 'Blogs',
    subtitle: 'Manage long-form editorial articles, draft blog stories, and publishing status.',
  },
  '/blogs/new': {
    title: 'Create Blog',
    subtitle: 'Write a polished blog article and submit it for admin approval before publishing.',
  },
  '/gallery': {
    title: 'Gallery',
    subtitle: 'Upload and manage images for your editorial content.',
  },
  '/uploads': {
    title: 'Uploads',
    subtitle: 'Manage all uploaded files across your editorial workspace.',
  },
  '/review': {
    title: 'Review Queue',
    subtitle: 'Approve, reject, publish, or request revisions across colleges.',
  },
  '/select-college': {
    title: 'College Selection',
    subtitle: 'Bind your session to one institution before entering the CMS.',
  },
};

function Topbar({ onMenuClick }) {
  const location = useLocation();
  const { profile, user } = useAuth();
  const meta = (() => {
    if (/^\/blogs\/[^/]+\/edit$/.test(location.pathname)) {
      return {
        title: 'Edit Blog',
        subtitle: 'Update blog content, media, SEO, and the approval workflow.',
      };
    }

    if (/^\/posts\/[^/]+\/edit$/.test(location.pathname)) {
      return {
        title: 'Edit Post',
        subtitle: 'Update content, media, metadata, and publishing workflow.',
      };
    }

    return pageMap[location.pathname] || {
      title: 'Dashboard',
      subtitle: 'Plan, prioritize, and manage your editorial content with ease.',
    };
  })();

  const initials = (user?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button type="button" className="topbar__menu" onClick={onMenuClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="topbar__heading">
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
        </div>
      </div>

      <div className="topbar__search">
        <div className="topbar__search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input type="text" placeholder="Search content..." />
      </div>

      <div className="topbar__right">
      

        <button type="button" className="topbar__icon-btn" title="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="topbar__dot" />
        </button>

        <div className="topbar__user">
          <div className="topbar__avatar">{initials}</div>
          <div className="topbar__user-info">
            <span>{user?.email?.split('@')[0] || 'User'}</span>
            <small>{profile?.role || 'staff'} access</small>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
