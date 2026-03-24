import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { listMediaAssets, uploadMedia } from '@/services/mediaService';
import { formatDate } from '@/lib/utils';

const FILE_TYPE_ICONS = {
  image: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  document: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  video: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
};

function getFileIcon(type) {
  if (type?.startsWith('image/')) return FILE_TYPE_ICONS.image;
  if (type?.startsWith('video/')) return FILE_TYPE_ICONS.video;
  return FILE_TYPE_ICONS.document;
}

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

  useEffect(() => {
    let active = true;

    const loadFiles = async () => {
      try {
        setLoading(true);
        const assets = await listMediaAssets();
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

  const handleUpload = async (event) => {
    const fileList = Array.from(event.target.files || []);
    if (!fileList.length) return;

    try {
      setUploading(true);
      const results = [];
      for (const file of fileList) {
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
        results.length === 1
          ? 'File uploaded.'
          : `${results.length} files uploaded.`,
      );
    } catch (error) {
      toast.error(error.message);
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
            Manage all uploaded files across your editorial workspace.
          </p>
        </div>
        <div className="media-page__header-actions">
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
      ) : files.length === 0 ? (
        <div className="media-page__empty">
          <div className="media-page__empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h3>No uploads yet</h3>
          <p>
            Upload files to manage them centrally. Images, documents, and other
            media can be uploaded and linked to your posts.
          </p>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => inputRef.current?.click()}
          >
            Upload your first file
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="uploads-grid">
          {files.map((file) => (
            <div key={file.id} className="upload-card">
              <div className="upload-card__preview">
                {file.type?.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} />
                ) : (
                  <div className="upload-card__file-icon">
                    {getFileIcon(file.type)}
                  </div>
                )}
              </div>
              <div className="upload-card__info">
                <span className="upload-card__name" title={file.name}>
                  {file.name}
                </span>
                <span className="upload-card__meta">
                  {formatFileSize(file.size)} &middot;{' '}
                  {formatDate(file.uploadedAt)}
                </span>
              </div>
              <div className="upload-card__actions">
                <button
                  type="button"
                  className="upload-card__action"
                  onClick={() => copyUrl(file.url)}
                  title="Copy URL"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="upload-card__action"
                  title="Open in new tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="uploads-table-wrap">
          <table className="uploads-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className="uploads-table__file">
                      <span className="uploads-table__icon">
                        {getFileIcon(file.type)}
                      </span>
                      <span className="uploads-table__name">{file.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="uploads-table__type">
                      {file.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </span>
                  </td>
                  <td>{formatFileSize(file.size)}</td>
                  <td>{formatDate(file.uploadedAt)}</td>
                  <td>
                    <div className="uploads-table__actions">
                      <button
                        type="button"
                        className="upload-card__action"
                        onClick={() => copyUrl(file.url)}
                        title="Copy URL"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </button>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="upload-card__action"
                        title="Open"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
