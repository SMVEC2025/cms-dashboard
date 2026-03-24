import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const MENU_WIDTH = 308;
const MENU_PADDING = 18;

function getPlatformMetaKey() {
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  const isApplePlatform = /Mac|iPhone|iPad|iPod/i.test(platform);

  return {
    isApplePlatform,
    metaLabel: isApplePlatform ? '⌘' : 'Ctrl',
    altLabel: isApplePlatform ? '⌥' : 'Alt',
  };
}

function buildShortcut(parts) {
  return parts.join(' ');
}

function GlobalContextMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, selectedCollegeName, signOut } = useAuth();
  const [menuState, setMenuState] = useState({
    open: false,
    x: 0,
    y: 0,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef(null);

  const shortcutMeta = useMemo(() => getPlatformMetaKey(), []);
  const shortcuts = useMemo(
    () => ({
      reload: buildShortcut([shortcutMeta.metaLabel, 'R']),
      createEvent: buildShortcut([shortcutMeta.metaLabel, shortcutMeta.altLabel, 'E']),
      createBlog: buildShortcut([shortcutMeta.metaLabel, shortcutMeta.altLabel, 'R']),
      settings: buildShortcut([shortcutMeta.metaLabel, ',']),
      logout: buildShortcut([shortcutMeta.metaLabel, 'Shift', 'Q']),
    }),
    [shortcutMeta],
  );

  const openContextMenu = (clientX, clientY) => {
    const maxX = Math.max(MENU_PADDING, window.innerWidth - MENU_WIDTH - MENU_PADDING);
    const nextX = Math.min(clientX, maxX);
    const nextY = Math.min(clientY, window.innerHeight - 280);

    setMenuState({
      open: true,
      x: Math.max(MENU_PADDING, nextX),
      y: Math.max(MENU_PADDING, nextY),
    });
  };

  const closeContextMenu = () => {
    setMenuState((current) => ({ ...current, open: false }));
  };

  const isEditorRoute = /^\/(posts|blogs)\/(new|[^/]+\/edit)$/.test(location.pathname);

  const actionGroups = useMemo(
    () => [
      [
        {
          id: 'reload',
          label: 'Reload',
          shortcut: shortcuts.reload,
          onSelect: () => window.location.reload(),
        },
      ],
      [
        {
          id: 'create-event',
          label: 'Create event',
          shortcut: shortcuts.createEvent,
          onSelect: () => navigate('/posts/new'),
        },
        {
          id: 'create-blog',
          label: 'Create blog',
          shortcut: shortcuts.createBlog,
          onSelect: () => navigate('/blogs/new'),
        },
        {
          id: 'gallery',
          label: 'Gallery',
          onSelect: () => navigate('/gallery'),
        },
        {
          id: 'uploads',
          label: 'Uploads',
          onSelect: () => navigate('/uploads'),
        },
        {
          id: 'settings',
          label: 'Settings',
          shortcut: shortcuts.settings,
          onSelect: () => setSettingsOpen(true),
        },
      ],
      ...(isEditorRoute
        ? [[
            {
              id: 'save-draft',
              label: 'Save draft',
              onSelect: () => window.dispatchEvent(new Event('cms:editor-save-draft')),
            },
            {
              id: 'preview-post',
              label: 'Preview',
              onSelect: () => window.dispatchEvent(new Event('cms:editor-preview')),
            },
            {
              id: 'import-data',
              label: 'Import data',
              onSelect: () => window.dispatchEvent(new Event('cms:editor-import')),
            },
          ]]
        : []),
      [
        {
          id: 'logout',
          label: 'Log out',
          shortcut: shortcuts.logout,
          onSelect: async () => {
            await signOut();
            navigate('/login', { replace: true });
          },
        },
      ],
    ],
    [isEditorRoute, navigate, shortcuts, signOut],
  );

  useEffect(() => {
    const handleContextMenu = (event) => {
      event.preventDefault();
      openContextMenu(event.clientX, event.clientY);
    };

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) {
        return;
      }

      closeContextMenu();
    };

    const handleViewportChange = () => {
      closeContextMenu();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeContextMenu();
        setSettingsOpen(false);
        return;
      }

      const isMetaPressed = event.metaKey || event.ctrlKey;
      if (!isMetaPressed) {
        return;
      }

      const loweredKey = event.key.toLowerCase();
      if (event.altKey && (loweredKey === 'e' || event.code === 'KeyE')) {
        event.preventDefault();
        navigate('/posts/new');
        closeContextMenu();
        return;
      }

      if (event.altKey && (loweredKey === 'r' || event.code === 'KeyR' || loweredKey === 'b' || event.code === 'KeyB')) {
        event.preventDefault();
        navigate('/blogs/new');
        closeContextMenu();
        return;
      }

      if (!event.altKey && loweredKey === ',') {
        event.preventDefault();
        setSettingsOpen(true);
        closeContextMenu();
        return;
      }

      if (event.shiftKey && loweredKey === 'q') {
        event.preventDefault();
        signOut().then(() => {
          navigate('/login', { replace: true });
        });
        closeContextMenu();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, signOut]);

  return createPortal(
    <>
      {menuState.open && (
        <div
          ref={menuRef}
          className="global-context-menu"
          style={{
            left: menuState.x,
            top: menuState.y,
          }}
        >
          <div className="global-context-menu__list">
            {actionGroups.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`} className="global-context-menu__group">
                {group.map((item) => {
                  const TrailingIcon = item.trailingIcon;
                  const isButton = Boolean(item.onSelect);

                  if (!isButton) {
                    return (
                      <div
                        key={item.id}
                        className="global-context-menu__item global-context-menu__item--muted"
                      >
                        <span className="global-context-menu__item-label">{item.label}</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="global-context-menu__item"
                      onClick={() => {
                        item.onSelect();
                        closeContextMenu();
                      }}
                    >
                      <span className="global-context-menu__item-label">{item.label}</span>
                      <span className="global-context-menu__item-trailing">
                        {item.shortcut && (
                          <span className="global-context-menu__shortcut">{item.shortcut}</span>
                        )}
                        {TrailingIcon && <TrailingIcon size={15} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

        
        </div>
      )}

      {settingsOpen && (
        <div
          className="context-settings-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Quick settings"
        >
          <button
            type="button"
            className="context-settings-sheet__backdrop"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          />

          <div className="context-settings-sheet__panel">
            <div className="context-settings-sheet__topbar">
              <div>
                <span className="context-settings-sheet__eyebrow">Settings</span>
                <h3>Workspace Preferences</h3>
              </div>
              <button
                type="button"
                className="context-settings-sheet__close"
                onClick={() => setSettingsOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="context-settings-sheet__section">
              <span className="context-settings-sheet__label">Current Workspace</span>
              <strong>{isAuthenticated ? selectedCollegeName : 'Guest workspace'}</strong>
            </div>

            <div className="context-settings-sheet__section">
              <span className="context-settings-sheet__label">Shortcut Suggestions</span>
              <div className="context-settings-sheet__shortcuts">
                <div className="context-settings-sheet__shortcut-row">
                  <span>Reload</span>
                  <kbd>{shortcuts.reload}</kbd>
                </div>
                <div className="context-settings-sheet__shortcut-row">
                  <span>Create event</span>
                  <kbd>{shortcuts.createEvent}</kbd>
                </div>
                <div className="context-settings-sheet__shortcut-row">
                  <span>Create blog</span>
                  <kbd>{shortcuts.createBlog}</kbd>
                </div>
                <div className="context-settings-sheet__shortcut-row">
                  <span>Open settings</span>
                  <kbd>{shortcuts.settings}</kbd>
                </div>
                <div className="context-settings-sheet__shortcut-row">
                  <span>Log out</span>
                  <kbd>{shortcuts.logout}</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}

export default GlobalContextMenu;
