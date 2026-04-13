import clsx from 'clsx';
import { useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME, NAV_ITEMS, GENERAL_NAV_ITEMS } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { FaPlus } from "react-icons/fa6";

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  content: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  create: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  blog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17.5a2.5 2.5 0 0 0-2.5-2.5H5z" />
      <path d="M5 4.5v15A2.5 2.5 0 0 0 7.5 22H19" />
      <line x1="9" y1="7" x2="16" y2="7" />
      <line x1="9" y1="11" x2="16" y2="11" />
      <line x1="9" y1="15" x2="13" y2="15" />
    </svg>
  ),
  blogCreate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17.5a2.5 2.5 0 0 0-2.5-2.5H5z" />
      <path d="M5 4.5v15A2.5 2.5 0 0 0 7.5 22H19" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  review: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  userAdd: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 10-16 0" />
      <circle cx="12" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  ),
  college: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-4h6v4" />
      <path d="M9 10h1" />
      <path d="M14 10h1" />
      <path d="M9 14h1" />
      <path d="M14 14h1" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  gallery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  uploads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  drafts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
};

function Sidebar({ open, onClose, collapsed, isMobile, onToggleCollapse }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = NAV_ITEMS[profile?.role || 'staff'];
  const primaryNavRef = useRef(null);
  const generalNavRef = useRef(null);
  const [hoverPills, setHoverPills] = useState({
    primary: null,
    general: null,
  });

  const setHoverPill = (group, event) => {
    const container = group === 'primary' ? primaryNavRef.current : generalNavRef.current;

    if (!container) {
      return;
    }

    const itemRect = event.currentTarget.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setHoverPills((current) => ({
      ...current,
      [group]: {
        top: itemRect.top - containerRect.top + 4,
        left: itemRect.left - containerRect.left,
        width: itemRect.width,
        height: itemRect.height - 8,
      },
    }));
  };

  const clearHoverPill = (group) => {
    setHoverPills((current) => ({
      ...current,
      [group]: null,
    }));
  };

  const isItemActive = (itemPath) => {
    const pathname = location.pathname;

    if (itemPath === '/') {
      return pathname === '/';
    }

    if (itemPath === '/posts') {
      return pathname === '/posts' || /^\/posts\/[^/]+\/edit$/.test(pathname);
    }

    if (itemPath === '/posts/new') {
      return pathname === '/posts/new';
    }

    if (itemPath === '/blogs') {
      return pathname === '/blogs' || /^\/blogs\/[^/]+\/edit$/.test(pathname);
    }

    if (itemPath === '/blogs/new') {
      return pathname === '/blogs/new';
    }

    return pathname === itemPath;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div className={clsx('app-shell__scrim', open && 'is-visible')} onClick={onClose} />
      <aside className={clsx('sidebar', open && 'is-open', collapsed && !isMobile && 'is-collapsed')}>
        <button
          type="button"
          className={clsx('sidebar__edge-toggle', collapsed && !isMobile && 'is-collapsed')}
          onClick={isMobile ? onClose : onToggleCollapse}
          aria-label={isMobile ? 'Close sidebar' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          title={isMobile ? 'Close sidebar' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
        >
          <svg className="sidebar__edge-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="sidebar__inner">
          <div className="sidebar__scroll">
            <div className="sidebar__brand">
              <div className="sidebar__logo">
                <img src="/logo.png" alt={`${APP_NAME} logo`} />
              </div>
              <div className="sidebar__brand-text">
                <p>{APP_NAME}</p>
                <span>{profile?.role === 'admin' ? 'Admin Console' : 'Editorial Workspace'}</span>
              </div>
            </div>
            <span className="sidebar__section-label">Overview</span>
            <nav
              ref={primaryNavRef}
              className="sidebar__nav"
              onMouseLeave={() => clearHoverPill('primary')}
            >
              <span
                className={clsx('sidebar__hover-pill', hoverPills.primary && 'is-visible')}
                style={
                  hoverPills.primary
                    ? {
                        top: `${hoverPills.primary.top}px`,
                        left: `${hoverPills.primary.left}px`,
                        width: `${hoverPills.primary.width}px`,
                        height: `${hoverPills.primary.height}px`,
                      }
                    : undefined
                }
              />
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  onMouseEnter={(event) => setHoverPill('primary', event)}
                  onFocus={(event) => setHoverPill('primary', event)}
                  className={clsx('sidebar__link', isItemActive(item.to) && 'is-active')}
                  title={collapsed && !isMobile ? item.label : undefined}
                >
                  {ICONS[item.icon]}
                  <span className="sidebar__link-label">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {GENERAL_NAV_ITEMS.length > 0 && (
              <>
                <span className="sidebar__section-label">General</span>
                <nav
                  ref={generalNavRef}
                  className="sidebar__nav"
                  onMouseLeave={() => clearHoverPill('general')}
                >
                  <span
                    className={clsx('sidebar__hover-pill', hoverPills.general && 'is-visible')}
                    style={
                      hoverPills.general
                        ? {
                            top: `${hoverPills.general.top}px`,
                            left: `${hoverPills.general.left}px`,
                            width: `${hoverPills.general.width}px`,
                            height: `${hoverPills.general.height}px`,
                          }
                        : undefined
                    }
                  />
                  {GENERAL_NAV_ITEMS.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      onMouseEnter={(event) => setHoverPill('general', event)}
                      onFocus={(event) => setHoverPill('general', event)}
                      className={clsx('sidebar__link', isItemActive(item.to) && 'is-active')}
                      title={collapsed && !isMobile ? item.label : undefined}
                    >
                      {ICONS[item.icon]}
                      <span className="sidebar__link-label">{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </>
            )}
          </div>

          <div className="sidebar__bottom">
            <NavLink
              to="/posts/new"
              className="sidebar__create-btn"
              onClick={onClose}
              title={collapsed && !isMobile ? 'Create Post' : undefined}
            >
              <FaPlus/>
              <span className="sidebar__create-label">Create Post</span>
            </NavLink>
            <button
              type="button"
              className="sidebar__bottom-link"
              onClick={handleSignOut}
              title={collapsed && !isMobile ? 'Sign Out' : undefined}
            >
              {ICONS.logout}
              <span className="sidebar__bottom-label">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
