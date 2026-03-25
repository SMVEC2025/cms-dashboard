import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { listMediaAssets, uploadMedia } from '@/services/mediaService';
import { formatDate } from '@/lib/utils';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadsPage() {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    const loadFiles = async () => {
      try {
        setLoading(true);
        const assets = await listMediaAssets({ imageOnly: true });
        if (active) {
          setFiles(assets);
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

    loadFiles();

    return () => {
      active = false;
    };
  }, []);

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return files;
    const query = search.trim().toLowerCase();
    return files.filter((file) => {
      const contextLabel = file.context || 'uploads';
      return `${file.name} ${contextLabel}`.toLowerCase().includes(query);
    });
  }, [files, search]);

  const handleUpload = async (event) => {
    const fileList = Array.from(event.target.files || []);
    if (!fileList.length) return;

    const toastId = toast.loading(
      fileList.length === 1 ? `Uploading ${fileList[0].name}...` : `Uploading 1 of ${fileList.length} files...`,
    );

    try {
      setUploading(true);
      const results = [];

      for (const [index, file] of fileList.entries()) {
        toast.loading(
          fileList.length === 1
            ? `Uploading ${file.name}...`
            : `Uploading ${index + 1} of ${fileList.length}: ${file.name}`,
          { id: toastId },
        );

        const asset = await uploadMedia({ file, folder: 'uploads' });
        results.push({
          id: asset.id || crypto.randomUUID(),
          url: asset.publicUrl,
          name: asset.fileName || file.name,
          size: asset.sizeBytes || file.size,
          type: asset.mimeType || file.type,
          uploadedAt: asset.createdAt || new Date().toISOString(),
          context: asset.context || 'uploads',
        });
      }

      setFiles((prev) => [...results, ...prev]);
      toast.success(
        results.length === 1 ? 'File uploaded.' : `${results.length} files uploaded.`,
        { id: toastId },
      );
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard.');
  };

  return (
    <div className="media-page">
      <div className="media-page__header">
        <div>
          <span className="eyebrow">Media</span>
          <h2>Uploads</h2>
          <p className="media-page__subtitle">
            Review the full image history across uploads, event media, gallery, and editorial content.
          </p>
        </div>

        <div className="media-page__header-actions">
          <div className="ml-toolbar__search uploads-page__search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search uploads"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="media-page__view-toggle">
            <button
              type="button"
              className={`media-page__view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              type="button"
              className={`media-page__view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={handleUpload}
        />
      </div>

      {loading ? (
        <div className="media-page__empty">
          <div className="media-page__empty-icon skeleton" />
          <h3>Loading uploads</h3>
          <p>Fetching files from your editorial workspace.</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="media-page__empty">
          <div className="media-page__empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3>{search ? 'No uploads found' : 'No uploads yet'}</h3>
          <p>
            {search
              ? 'Try a different search term to find earlier uploaded images.'
              : 'Upload files to manage them centrally. Images from events, posts, gallery, and editor content will appear here.'}
          </p>
          {!search && (
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => inputRef.current?.click()}
            >
              Upload your first file
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="ml-content uploads-page__content">
          <div className="ml-grid uploads-page__grid">
            {filteredFiles.map((file) => (
              <div key={file.id} className="ml-card uploads-page__card">
                <div className="ml-card__media">
                  <img src={file.url} alt={file.name} loading="lazy" />
                  <div className="ml-card__hover-actions" onClick={(event) => event.stopPropagation()}>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="ml-card__preview">
                      Preview
                    </a>
                  </div>
                </div>

                <div className="uploads-page__card-footer">
                  <div className="ml-card__info uploads-page__card-info">
                    <span className="ml-card__name" title={file.name}>{file.name}</span>
                    <span className="uploads-page__card-meta">
                      {formatFileSize(file.size)} · {formatDate(file.uploadedAt)}
                    </span>
                    <span className="uploads-page__card-context">{file.context || 'uploads'}</span>
                  </div>

                  <div className="ml-card__actions uploads-page__card-actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" title="Copy URL" onClick={() => copyUrl(file.url)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" title="Open">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="ml-list-wrap uploads-page__list-wrap">
          <table className="ml-list">
            <thead>
              <tr>
                <th>File</th>
                <th>Source</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th style={{ width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className="ml-list__file">
                      <div className="ml-list__thumb">
                        <img src={file.url} alt="" />
                      </div>
                      <span className="ml-list__name">{file.name}</span>
                    </div>
                  </td>
                  <td className="ml-list__meta">
                    <span className="uploads-page__source-pill">{file.context || 'uploads'}</span>
                  </td>
                  <td className="ml-list__meta">{formatFileSize(file.size)}</td>
                  <td className="ml-list__meta">{formatDate(file.uploadedAt)}</td>
                  <td>
                    <div className="ml-list__actions">
                      <button type="button" title="Copy URL" onClick={() => copyUrl(file.url)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </button>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" title="Open">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UploadsPage;
