import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { formatDateTime, formatPostTypeLabel, readingTimeFromHtml } from '@/lib/utils';

function PreviewPage() {
  const [post, setPost] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cms-preview');
      if (raw) setPost(JSON.parse(raw));
    } catch {
      /* ignore parse errors */
    }
  }, []);

  if (!post) {
    return (
      <div className="preview-standalone">
        <div className="preview-standalone__empty">
          <h2>No preview data</h2>
          <p>Open this page from the editor&apos;s Preview button.</p>
        </div>
      </div>
    );
  }

  const sanitizedHtml = DOMPurify.sanitize(post.content_html || '');

  return (
    <div className="preview-standalone">
      <header className="preview-standalone__header">
        <span className="preview-standalone__badge">Preview</span>
        <span className="preview-standalone__college">
          {post.collegeName || 'College'}
        </span>
      </header>

      <article className="preview-standalone__article">
        <div className="preview-standalone__meta-bar">
          <span className="preview-standalone__type">{formatPostTypeLabel(post.post_type)}</span>
          {post.category && (
            <span className="preview-standalone__category">{post.category}</span>
          )}
          <span className="preview-standalone__reading">
            {readingTimeFromHtml(post.content_html)}
          </span>
        </div>

        <h1 className="preview-standalone__title">
          {post.title || 'Untitled post'}
        </h1>

        {post.summary && (
          <p className="preview-standalone__summary">{post.summary}</p>
        )}

        <div className="preview-standalone__details">
          {post.post_type === 'event' && post.event_date && (
            <div className="preview-standalone__detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{formatDateTime(post.event_date, post.event_time)}</span>
            </div>
          )}
          {post.post_type === 'event' && post.venue && (
            <div className="preview-standalone__detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{post.venue}</span>
            </div>
          )}
          {post.post_type === 'event' && post.organizer && (
            <div className="preview-standalone__detail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{post.organizer}</span>
            </div>
          )}
        </div>

        {post.featured_image_url && (
          <img
            className="preview-standalone__hero"
            src={post.featured_image_url}
            alt={post.title || 'Featured'}
          />
        )}

        {post.tags?.length > 0 && (
          <div className="preview-standalone__tags">
            {post.tags.map((tag) => (
              <span key={tag} className="preview-standalone__tag">{tag}</span>
            ))}
          </div>
        )}

        <div
          className="tiptap-content preview-standalone__content"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />

        {(post.seo_title || post.seo_description) && (
          <div className="preview-standalone__seo">
            <span className="preview-standalone__seo-label">SEO Preview</span>
            <h4>{post.seo_title || post.title || 'SEO title'}</h4>
            <p>{post.seo_description || post.summary || 'SEO description'}</p>
          </div>
        )}
      </article>
    </div>
  );
}

export default PreviewPage;
