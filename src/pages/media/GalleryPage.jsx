import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheck,
  FiChevronRight,
  FiCopy,
  FiExternalLink,
  FiFolder,
  FiFolderPlus,
  FiGrid,
  FiImage,
  FiList,
  FiSearch,
  FiTrash2,
  FiUpload,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { startUploadStatusToast } from '@/lib/uploadStatusToast';
import {
  listMediaAssets,
  uploadMedia,
  deleteMediaAsset,
  listFolders,
  createFolder,
  deleteFolder,
  renameFolder,
} from '@/services/mediaService';
import { formatDate } from '@/lib/utils';

const SMALL_FILE_BYTES = 1024 * 1024;

/* ── helpers ── */
function buildTree(flat) {
  const map = {};
  const roots = [];
  for (const f of flat) {
    map[f.id] = { ...f, children: [] };
  }
  for (const f of flat) {
    if (f.parentId && map[f.parentId]) {
      map[f.parentId].children.push(map[f.id]);
    } else {
      roots.push(map[f.id]);
    }
  }
  return { roots, map };
}

function getBreadcrumb(map, folderId) {
  const trail = [];
  let cur = folderId;
  while (cur && map[cur]) {
    trail.unshift(map[cur]);
    cur = map[cur].parentId;
  }
  return trail;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Folder tree node ── */
function FolderNode({ folder, currentId, expanded, onToggle, onSelect, onContextMenu }) {
  const isActive = folder.id === currentId;
  const hasChildren = folder.children?.length > 0;
  const isOpen = expanded.has(folder.id);

  return (
    <li className="ml-tree__item">
      <button
        type="button"
        className={`ml-tree__btn ${isActive ? 'is-active' : ''}`}
        onClick={() => onSelect(folder.id)}
        onContextMenu={(e) => onContextMenu(e, folder)}
      >
        <span
          className={`ml-tree__arrow ${hasChildren ? '' : 'ml-tree__arrow--hidden'}`}
          onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }}
        >
          <FiChevronRight className={isOpen ? 'rotated' : ''} size={13} />
        </span>
        <FiFolder size={15} className="ml-tree__icon" />
        <span className="ml-tree__name">{folder.name}</span>
      </button>
      {hasChildren && isOpen && (
        <ul className="ml-tree__children">
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              currentId={currentId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ── Main Gallery Page ── */
function GalleryPage() {
  const inputRef = useRef(null);
  const [folders, setFolders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const { roots, map } = useMemo(() => buildTree(folders), [folders]);
  const breadcrumb = useMemo(() => getBreadcrumb(map, currentFolderId), [map, currentFolderId]);

  /* child folders of current */
  const childFolders = useMemo(
    () => currentFolderId && map[currentFolderId]
      ? map[currentFolderId].children
      : roots,
    [currentFolderId, map, roots],
  );

  /* load folders once */
  useEffect(() => {
    listFolders().then(setFolders).catch(() => {});
  }, []);

  /* load assets when folder changes */
  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listMediaAssets({
        imageOnly: true,
        folderId: currentFolderId ?? null,
        contexts: ['gallery'],
      });
      setAssets(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  /* filtered assets by search */
  const filteredAssets = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.toLowerCase();
    return assets.filter((a) => a.name.toLowerCase().includes(q));
  }, [assets, search]);

  /* actions */
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const uploadStatus = startUploadStatusToast();

    try {
      setUploading(true);
      const allSmallFiles = files.every((file) => file.size <= SMALL_FILE_BYTES);
      const concurrency = allSmallFiles ? 6 : 3;
      const results = [];

      for (let batchStart = 0; batchStart < files.length; batchStart += concurrency) {
        const batch = files.slice(batchStart, batchStart + concurrency);

        const batchResults = await Promise.all(
          batch.map(async (file) => {
            const asset = await uploadMedia({ file, folder: 'gallery', folderId: currentFolderId });
            return {
              id: asset.id || crypto.randomUUID(),
              url: asset.publicUrl,
              name: asset.fileName || file.name,
              size: asset.sizeBytes || file.size,
              type: asset.mimeType || file.type,
              uploadedAt: asset.createdAt || new Date().toISOString(),
              folderId: asset.folderId || currentFolderId,
            };
          }),
        );

        results.push(...batchResults);
      }
      setAssets((prev) => [...results, ...prev]);
      uploadStatus.success(results.length === 1 ? 'File uploaded.' : `${results.length} files uploaded.`);
    } catch (err) {
      uploadStatus.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!selected.size) return;
    try {
      for (const id of selected) {
        await deleteMediaAsset(id);
      }
      setAssets((prev) => prev.filter((a) => !selected.has(a.id)));
      toast.success(`${selected.size} file${selected.size > 1 ? 's' : ''} deleted.`);
      setSelected(new Set());
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const folder = await createFolder({ name, parentId: currentFolderId });
      setFolders((prev) => [...prev, folder]);
      setNewFolderName('');
      setNewFolderOpen(false);
      toast.success(`Folder "${name}" created.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteFolder = useCallback(async (id) => {
    try {
      await deleteFolder(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (currentFolderId === id) setCurrentFolderId(null);
      toast.success('Folder deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  }, [currentFolderId]);

  const handleRenameFolder = async () => {
    if (!renamingId || !renameValue.trim()) return;
    try {
      await renameFolder(renamingId, renameValue);
      setFolders((prev) => prev.map((f) => (f.id === renamingId ? { ...f, name: renameValue.trim() } : f)));
      toast.success('Folder renamed.');
    } catch (err) {
      toast.error(err.message);
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied.');
  };

  const toggleExpand = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const navigateToFolder = (id) => {
    setCurrentFolderId(id);
    setSelected(new Set());
    setSearch('');
    if (id) setExpanded((prev) => new Set([...prev, id]));
  };

  const openFolderContextMenu = useCallback((event, folder) => {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent('cms:open-context-menu', {
      detail: {
        x: event.clientX,
        y: event.clientY,
        groups: [[
          {
            id: 'folder-rename',
            label: 'Rename',
            onSelect: () => {
              setRenamingId(folder.id);
              setRenameValue(folder.name);
            },
          },
          {
            id: 'folder-delete',
            label: 'Delete',
            destructive: true,
            onSelect: () => {
              handleDeleteFolder(folder.id);
            },
          },
        ]],
      },
    }));
  }, [handleDeleteFolder]);

  return (
    <div className="ml">
      {/* ── Sidebar ── */}
      <aside className="ml-sidebar">
        <div className="ml-sidebar__header">
          <h3 className="ml-sidebar__title">
            <FiImage size={16} />
            Media Library
          </h3>
          <button type="button" className="ml-sidebar__mini-action" title="New folder" onClick={() => setNewFolderOpen(true)}>
            <FiFolderPlus size={14} />
          </button>
        </div>

        <button
          type="button"
          className={`ml-sidebar__root ${currentFolderId === null ? 'is-active' : ''}`}
          onClick={() => navigateToFolder(null)}
        >
          <span>All Files</span>
          <span className="ml-sidebar__count">{assets.length}</span>
        </button>

        <nav className="ml-tree">
          <ul className="ml-tree__list">
            {roots.map((folder) => (
              <FolderNode
                key={folder.id}
                folder={folder}
                currentId={currentFolderId}
                expanded={expanded}
                onToggle={toggleExpand}
                onSelect={navigateToFolder}
                onContextMenu={openFolderContextMenu}
              />
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="ml-sidebar__add"
          onClick={() => setNewFolderOpen(true)}
        >
          <FiFolderPlus size={15} />
          New Folder
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-main">
        {/* Breadcrumb */}
        <div className="ml-breadcrumb">
          <button type="button" className="ml-breadcrumb__item" onClick={() => navigateToFolder(null)}>
            Media Library
          </button>
          {breadcrumb.map((seg) => (
            <span key={seg.id} className="ml-breadcrumb__seg">
              <FiChevronRight size={13} />
              <button type="button" className="ml-breadcrumb__item" onClick={() => navigateToFolder(seg.id)}>
                {seg.name}
              </button>
            </span>
          ))}
        </div>

        {/* Toolbar */}
        <div className="ml-toolbar">
          <div className="ml-toolbar__left">
            <div className="ml-toolbar__search">
              <FiSearch size={15} />
              <input
                type="search"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="ml-toolbar__actions">
            {selected.size > 0 && (
              <button type="button" className="ml-toolbar__btn ml-toolbar__btn--danger" onClick={handleDelete} title="Delete selected">
                <FiTrash2 size={15} />
              </button>
            )}
            <div className="ml-toolbar__view-toggle">
              <button
                type="button"
                className={`ml-toolbar__view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <FiList size={15} />
              </button>
              <button
                type="button"
                className={`ml-toolbar__view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <FiGrid size={15} />
              </button>
            </div>
            <button
              type="button"
              className="btn btn--primary ml-toolbar__upload"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <FiUpload size={15} />
              {uploading ? 'Uploading…' : 'Upload File'}
            </button>
          </div>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
        </div>

        {/* Content area */}
        <div className="ml-content">
          {loading ? (
            <div className="ml-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="ml-card ml-card--skeleton">
                  <div className="ml-card__media skeleton" />
                  <div className="ml-card__info">
                    <div className="skeleton skeleton--text" style={{ width: '70%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Sub-folders */}
              {childFolders.length > 0 && (
                <div className="ml-folders-row">
                  {childFolders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="ml-folder-chip"
                      onClick={() => navigateToFolder(f.id)}
                      onContextMenu={(e) => openFolderContextMenu(e, f)}
                    >
                      <FiFolder size={16} />
                      <span>{f.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Files */}
              {filteredAssets.length === 0 ? (
                <div className="ml-empty">
                  <div className="ml-empty__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <h3>{search ? 'No results found' : 'No files here'}</h3>
                  <p>{search ? 'Try a different search term.' : 'Upload files or create a folder to organise your media.'}</p>
                  {!search && (
                    <button type="button" className="btn btn--outline" onClick={() => inputRef.current?.click()}>
                      Upload your first file
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="ml-grid">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`ml-card ${selected.has(asset.id) ? 'is-selected' : ''}`}
                      onClick={() => toggleSelect(asset.id)}
                    >
                      <div className="ml-card__media">
                        <img src={asset.url} alt={asset.name} loading="lazy" />
                        <button
                          type="button"
                          className={`ml-card__check ${selected.has(asset.id) ? 'is-selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(asset.id);
                          }}
                          aria-label={selected.has(asset.id) ? 'Deselect file' : 'Select file'}
                        >
                          {selected.has(asset.id) && <FiCheck size={14} />}
                        </button>
                        <div className="ml-card__hover-actions" onClick={(e) => e.stopPropagation()}>
                          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="ml-card__preview">
                            Preview
                          </a>
                        </div>
                      </div>
                      <div className="ml-card__info">
                        <span className="ml-card__name" title={asset.name}>{asset.name}</span>
                        <span className="ml-card__meta">
                          {formatFileSize(asset.size)}
                        </span>
                      </div>
                      <div className="ml-card__actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" title="Copy URL" onClick={() => copyUrl(asset.url)}>
                          <FiCopy size={13} />
                        </button>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer" title="Open">
                          <FiExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ml-list-wrap">
                  <table className="ml-list">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }} />
                        <th>Name</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th style={{ width: 90 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset) => (
                        <tr key={asset.id} className={selected.has(asset.id) ? 'is-selected' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.has(asset.id)}
                              onChange={() => toggleSelect(asset.id)}
                              className="ml-list__check"
                            />
                          </td>
                          <td>
                            <div className="ml-list__file">
                              <div className="ml-list__thumb">
                                <img src={asset.url} alt="" />
                              </div>
                              <span className="ml-list__name">{asset.name}</span>
                            </div>
                          </td>
                          <td className="ml-list__meta">{formatFileSize(asset.size)}</td>
                          <td className="ml-list__meta">{formatDate(asset.uploadedAt)}</td>
                          <td>
                            <div className="ml-list__actions">
                              <button type="button" title="Copy URL" onClick={() => copyUrl(asset.url)}>
                                <FiCopy size={13} />
                              </button>
                              <a href={asset.url} target="_blank" rel="noopener noreferrer" title="Open">
                                <FiExternalLink size={13} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── New folder dialog ── */}
      {newFolderOpen && (
        <div className="ml-dialog-backdrop" onClick={() => setNewFolderOpen(false)}>
          <div className="ml-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Create Folder</h3>
            <p>
              {currentFolderId && map[currentFolderId]
                ? `Inside "${map[currentFolderId].name}"`
                : 'At root level'}
            </p>
            <input
              autoFocus
              type="text"
              placeholder="Folder name"
              className="ml-dialog__input"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="ml-dialog__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setNewFolderOpen(false)}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename dialog ── */}
      {renamingId && (
        <div className="ml-dialog-backdrop" onClick={() => setRenamingId(null)}>
          <div className="ml-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Rename Folder</h3>
            <input
              autoFocus
              type="text"
              placeholder="New name"
              className="ml-dialog__input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
            />
            <div className="ml-dialog__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setRenamingId(null)}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={handleRenameFolder} disabled={!renameValue.trim()}>Rename</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default GalleryPage;
