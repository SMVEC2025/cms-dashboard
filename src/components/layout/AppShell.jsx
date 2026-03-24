import { Outlet } from 'react-router-dom';
import { Suspense, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MOBILE_BREAKPOINT = 1100;

function PageFallback() {
  return (
    <div className="page-loader">
      <div className="page-loader__spinner" />
    </div>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebar, setIsMobileSidebar] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);

  useEffect(() => {
    const syncSidebarMode = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobileSidebar(mobile);

      if (mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', syncSidebarMode);

    return () => {
      window.removeEventListener('resize', syncSidebarMode);
    };
  }, []);

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((current) => !current);
  };

  return (
    <div className={`app-shell ${sidebarCollapsed && !isMobileSidebar ? 'is-collapsed' : ''}`}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        isMobile={isMobileSidebar}
        onToggleCollapse={handleToggleSidebarCollapse}
      />
      <div className="app-shell__main">
        <Topbar
          onMenuClick={() => {
            if (isMobileSidebar) {
              setSidebarOpen((current) => !current);
              return;
            }

            handleToggleSidebarCollapse();
          }}
        />
        <main className="page">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
