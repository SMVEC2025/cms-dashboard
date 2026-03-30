import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiImage, FiSearch, FiUpload, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { startUploadStatusToast } from '@/lib/uploadStatusToast';
import { listMediaAssets, uploadMedia } from '@/services/mediaService';

const SOURCE_TABS = [
  {
    id: 'uploads',
    label: 'Uploads',
    description: 'Previous uploads and editor media',
    match: (asset) => asset.context !== 'gallery',
  },
  {
    id: 'gallery',
    label: 'Gallery',
    description: 'Images already organised in gallery',
    match: (asset) => asset.context === 'gallery',
  },
];

function formatFileSize(bytes = 0) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapUploadedAsset(asset) {
  return {
    id: asset.id || crypto.randomUUID(),
    publicUrl: asset.publicUrl || asset.url,
    fileName: asset.fileName || asset.name || 'image.webp',
    sizeBytes: asset.sizeBytes || asset.size || 0,
    context: asset.context || 'editor-media',
    createdAt: asset.createdAt || asset.uploadedAt || new Date().toISOString(),
  };
}

function EditorImagePicker({
  open,
  onClose,
  onInsert,
  onUpload,
  eyebrow = 'Insert Image',
  title = 'Media browser',
  confirmLabel = 'Insert image',
  ariaLabel = 'Insert image',
}) {
  const fileInputRef = useRef(null);
  const uploadLockRef = useRef(false);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('uploads');
  const [search, setSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  useEffect(() => {
    if (!open) return undefined;

    const loadAssets = async () => {
      try {
        setLoading(true);
        const mediaAssets = await listMediaAssets({ imageOnly: true });
        setAssets(mediaAssets);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  const visibleAssets = useMemo(() => {
    const currentTab = SOURCE_TABS.find((tab) => tab.id === activeTab) || SOURCE_TABS[0];
    const baseAssets = assets.filter(currentTab.match);
    const query = search.trim().toLowerCase();

    if (!query) {
      return baseAssets;
    }

    return baseAssets.filter((asset) => {
      const haystack = `${asset.fileName || ''} ${asset.context || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeTab, assets, search]);

  useEffect(() => {
    if (!open) return;

    if (!visibleAssets.length) {
      setSelectedAssetId(null);
      return;
    }

    if (!visibleAssets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(null);
    }
  }, [open, selectedAssetId, visibleAssets]);

  const selectedAsset = useMemo(
    () => visibleAssets.find((asset) => asset.id === selectedAssetId) || null,
    [selectedAssetId, visibleAssets],
  );

  const processUpload = async (file) => {
    if (!file || uploadLockRef.current) return;
    const uploadStatus = startUploadStatusToast();

    try {
      uploadLockRef.current = true;
      setUploading(true);
      const uploaded = onUpload
        ? await onUpload(file)
        : await uploadMedia({ file, folder: 'editor-media' });
      const mapped = mapUploadedAsset(uploaded);
      setAssets((current) => {
        const deduped = current.filter(
          (asset) => asset.id !== mapped.id && asset.publicUrl !== mapped.publicUrl,
        );
        return [mapped, ...deduped];
      });
      setActiveTab('uploads');
      setSelectedAssetId(mapped.id);
      uploadStatus.success('Image uploaded.');
    } catch (error) {
      uploadStatus.error(error.message);
    } finally {
      uploadLockRef.current = false;
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    await processUpload(file);
    if (event.target) event.target.value = '';
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    await processUpload(file);
  };

  const handleInsert = () => {
    if (!selectedAsset) return;
    onInsert(selectedAsset);
    onClose();
  };

  const clearSelection = () => {
    setSelectedAssetId(null);
  };

  if (!open) return null;

  return createPortal(
    <div className="emp" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <button type="button" className="emp__backdrop" aria-label="Close" onClick={onClose} />

      <div className="emp__panel">
        {/* Header */}
        <div className="emp__header">
          <div>
            <span className="emp__eyebrow">{eyebrow}</span>
            <h3 className="emp__title">{title}</h3>
          </div>
          <button type="button" className="emp__close" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>

        <div className="emp__body">
          {/* Left - Library */}
          <section className="emp__library">
            {/* Tabs + Search */}
            <div className="emp__toolbar">
              <div className="emp__tabs">
                {SOURCE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`emp__tab ${activeTab === tab.id ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="emp__tab-label">{tab.label}</span>
                    <span className="emp__tab-desc">{tab.description}</span>
                  </button>
                ))}
              </div>
              <label className="emp__search">
                <FiSearch size={15} />
                <input
                  type="search"
                  placeholder="Search images"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            {/* Grid */}
            <div className="emp__results">
              {loading ? (
                <div className="emp__grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="emp__card emp__card--skeleton">
                      <div className="skeleton emp__card-media" />
                      <div className="skeleton skeleton--text" style={{ width: '65%' }} />
                    </div>
                  ))}
                </div>
              ) : visibleAssets.length ? (
                <div className="emp__grid">
                  {visibleAssets.map((asset) => {
                    const isSelected = asset.id === selectedAssetId;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        className={`emp__card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedAssetId(asset.id)}
                        onDoubleClick={() => { onInsert(asset); onClose(); }}
                      >
                        <div className="emp__card-media">
                          <img src={asset.publicUrl || asset.url} alt={asset.fileName || asset.name} loading="lazy" />
                          {isSelected && (
                            <span className="emp__card-check">
                              <FiCheck size={13} />
                            </span>
                          )}
                        </div>
                        <div className="emp__card-meta">
                          <strong title={asset.fileName || asset.name}>{asset.fileName || asset.name}</strong>
                          <span>{formatFileSize(asset.sizeBytes || asset.size)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="emp__empty">
                  <div className="emp__empty-icon"><FiImage size={22} /></div>
                  <h4>No images found</h4>
                  <p>
                    {search
                      ? 'Try a different search term or upload a new file.'
                      : activeTab === 'gallery'
                        ? 'No gallery images available yet.'
                        : 'No uploaded images available yet.'}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Right - Sidebar */}
          <aside className="emp__sidebar">
            {selectedAsset ? (
              /* ── Preview of selected/uploaded image ── */
              <div className="emp__preview">
                <div className="emp__preview-header">
                  <span className="emp__section-label">Preview</span>

                </div>
                <div className="emp__preview-frame">
                  <button type="button" className="emp__preview-discard" onClick={clearSelection} title="Discard selection">
                    <FiX size={14} />
                  </button>
                  <img src={selectedAsset.publicUrl || selectedAsset.url} alt={selectedAsset.fileName || selectedAsset.name} />
                </div>
                <div className="emp__preview-info">
                  <strong>{selectedAsset.fileName || selectedAsset.name}</strong>
                  <span>{formatFileSize(selectedAsset.sizeBytes || selectedAsset.size)} · {formatDate(selectedAsset.createdAt || selectedAsset.uploadedAt)}</span>
                </div>
              </div>
            ) : (
              /* ── Upload drop-zone ── */
              <div className="emp__upload-section">
                <span className="emp__section-label">Quick Upload</span>
                <div
                  className={`emp__dropzone ${dragActive ? 'is-drag-active' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === e.target) setDragActive(false); }}
                  onDrop={handleDrop}
                >
                  <div className="emp__dropzone-icon">
                    <FiUpload size={32} />
                  </div>
                  <strong>Drag and drop an image</strong>
                  <span>Or</span>
                  <button
                    type="button"
                    className="emp__browse"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Browse'}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUpload} />
              </div>
            )}

            {/* Footer buttons */}
            <div className="emp__footer">
              <button type="button" className="btn btn--ghost btn--full" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn--primary btn--full" onClick={handleInsert} disabled={!selectedAsset}>
                {confirmLabel}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default EditorImagePicker;
