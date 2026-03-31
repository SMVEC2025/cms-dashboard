import { useLocation, useNavigate } from 'react-router-dom';
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
  '/settings': {
    title: 'Settings',
    subtitle: 'Update your account details and password.',
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
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
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

  const initials = displayName.charAt(0).toUpperCase();

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
      

        <button
          type="button"
          className="topbar__icon-btn"
          title="Settings"
          aria-label="Open settings"
          onClick={() => navigate('/settings')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        <div className="topbar__user">
          <div className="topbar__avatar">{initials}</div>
          <div className="topbar__user-info">
            <span>{displayName}</span>
            <small>{profile?.role || 'staff'} access</small>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
