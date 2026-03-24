import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { listMediaAssets, uploadMedia } from '@/services/mediaService';

function GalleryPage() {
  const inputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;

    const loadImages = async () => {
      try {
        setLoading(true);
        const assets = await listMediaAssets({ imageOnly: true });
        if (active) {
          setImages(assets);
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

    loadImages();

    return () => {
      active = false;
    };
  }, []);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploading(true);
      const results = [];
      for (const file of files) {
        const asset = await uploadMedia({ file, folder: 'gallery' });
        results.push({
          id: asset.id || crypto.randomUUID(),
          url: asset.publicUrl,
          name: asset.fileName || file.name,
          size: asset.sizeBytes || file.size,
          type: asset.mimeType || file.type,
          uploadedAt: asset.createdAt || new Date().toISOString(),
          context: asset.context || 'gallery',
        });
      }
      setImages((prev) => [...results, ...prev]);
      toast.success(
        results.length === 1
          ? 'Image uploaded.'
          : `${results.length} images uploaded.`,
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
          <h2>Gallery</h2>
          <p className="media-page__subtitle">
            Upload and manage images for your editorial content.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {uploading ? 'Uploading...' : 'Upload Images'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleUpload}
        />
      </div>

      {loading ? (
        <div className="media-page__empty">
          <div className="media-page__empty-icon skeleton" />
          <h3>Loading gallery</h3>
          <p>Fetching uploaded images from your editorial workspace.</p>
        </div>
      ) : images.length === 0 ? (
        <div className="media-page__empty">
          <div className="media-page__empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h3>No images yet</h3>
          <p>
            Upload images to build your gallery. Supported formats include JPG,
            PNG, WebP, and GIF.
          </p>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => inputRef.current?.click()}
          >
            Upload your first image
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {images.map((img) => (
            <div
              key={img.id}
              className={`gallery-card ${selected === img.id ? 'is-selected' : ''}`}
              onClick={() => setSelected(img.id === selected ? null : img.id)}
            >
              <div className="gallery-card__media">
                <img src={img.url} alt={img.name} />
              </div>
              <div className="gallery-card__info">
                <span className="gallery-card__name">{img.name}</span>
                <span className="gallery-card__size">
                  {(img.size / 1024).toFixed(1)} KB
                </span>
              </div>
              {selected === img.id && (
                <div className="gallery-card__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--compact"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyUrl(img.url);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy URL
                  </button>
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--ghost btn--compact"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Open
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GalleryPage;
