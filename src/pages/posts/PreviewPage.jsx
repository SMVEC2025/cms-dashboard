import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  formatDate,
  formatDateTime,
  formatPostTypeLabel,
  formatStatusLabel,
  readingTimeFromHtml,
} from '@/lib/utils';

function SocialButton({ label, onClick, children }) {
  return (
    <button type="button" className="pv-event-card__social" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function PreviewPage() {
  const [post, setPost] = useState(null);
  const [shareLabel, setShareLabel] = useState('Share preview');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cms-preview');
      if (raw) {
        setPost(JSON.parse(raw));
      }
    } catch {
      /* ignore parse errors */
    }
  }, []);

  useEffect(() => {
    document.body.classList.add('pv-body-page');

    return () => {
      document.body.classList.remove('pv-body-page');
    };
  }, []);

  useEffect(() => {
    if (!post?.title) {
      document.title = 'Preview';
      return;
    }

    document.title = `${post.title} | Preview`;
  }, [post]);

  const isEventPreview = post?.post_type === 'event';
  const sanitizedHtml = DOMPurify.sanitize(post?.content_html || '');
  const readingTime = readingTimeFromHtml(post?.content_html);
  const statusLabel = post?.status ? formatStatusLabel(post.status) : 'Draft preview';
  const safeTags = Array.isArray(post?.tags) ? post.tags.filter(Boolean) : [];
  const fallbackImage = '/disabledimage.webp';
  const heroImage = post?.featured_image_url || fallbackImage;
  const eventDateLabel = post?.event_date ? formatDate(post.event_date, 'dd/MM/yyyy') : 'Date TBD';
  const eventTimeLabel = post?.event_time || 'Time TBD';
  const eventLocationLabel = post?.location || 'Location TBD';
  const eventVenueLabel = post?.venue || 'Venue TBD';

  const handleShare = async () => {
    const sharePayload = {
      title: post?.title || 'Preview',
      text: post?.title || 'Check this preview.',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(sharePayload);
        setShareLabel('Shared');
        window.setTimeout(() => setShareLabel('Share preview'), 1800);
        return;
      } catch {
        /* ignore cancelled share */
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(sharePayload.url);
      setShareLabel('Link copied');
      window.setTimeout(() => setShareLabel('Share preview'), 1800);
      return;
    }

    setShareLabel('Share unavailable');
    window.setTimeout(() => setShareLabel('Share preview'), 1800);
  };

  if (!post) {
    return (
      <div className="pv">
        <div className="pv-shell">
          <section className="pv-empty-card">
            <span className="pv-empty-card__eyebrow">Preview</span>
            <h1>No preview data found</h1>
            <p>
              Open this route from the editor using the Preview action so the draft data is
              passed into the standalone page.
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (isEventPreview) {
    return (
      <div className="pv pv--event pv--event-reference">
        <section className="pv-event-hero">
          <div className="pv-event-hero__media">
            <img src={heroImage} alt={post.title || 'Preview hero'} />
          </div>
          <div className="pv-event-hero__overlay" />

          <div className="pv-event-hero__inner">
            <div className="pv-event-hero__copy">
              <div className="pv-event-hero__chips">
                <span className="pv-chip pv-chip--glass">{formatPostTypeLabel(post.post_type)}</span>
                {post.category && <span className="pv-chip pv-chip--glass-soft">{post.category}</span>}
              </div>

              <h1 className="pv-event-hero__title">{post.title || 'Untitled event'}</h1>
            </div>
          </div>
        </section>

        <div className="pv-event-stage">
          <article className="pv-event-article">



            {safeTags.length > 0 && (
              <div className="pv-tags">
                {safeTags.map((tag) => (
                  <span key={tag} className="pv-tags__item">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="pv-event-article__lede">
              <strong>{post.collegeName || 'College'}</strong>
              {' Review the event details, article body, and metadata before publishing.'}
            </p>
            <div
              className="tiptap-content pv-body__content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />

            {(post.seo_title || post.seo_description) && (
              <section className="pv-seo">
                <span className="pv-seo__label">SEO Preview</span>
                <h3>{post.seo_title || post.title || 'SEO title'}</h3>
                <p>{post.seo_description || 'SEO description'}</p>
              </section>
            )}
          </article>

          <aside className="pv-event-sidebar">
            <section className="pv-event-card">
              <h3 className="pv-event-card__title">Event Detail</h3>

              <div className="pv-event-card__rows">
                <div className="pv-event-card__row">
                  <div className="pv-event-card__row-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>Date</span>
                  </div>
                  <strong>{eventDateLabel}</strong>
                </div>

                <div className="pv-event-card__row">
                  <div className="pv-event-card__row-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Time</span>
                  </div>
                  <strong>{eventTimeLabel}</strong>
                </div>

                <div className="pv-event-card__row">
                  <div className="pv-event-card__row-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Location</span>
                  </div>
                  <strong>{eventLocationLabel}</strong>
                </div>

                <div className="pv-event-card__row">
                  <div className="pv-event-card__row-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7.5h18" />
                      <path d="M5 7.5V18a2 2 0 002 2h10a2 2 0 002-2V7.5" />
                      <path d="M8 7.5V5.5A1.5 1.5 0 019.5 4h5A1.5 1.5 0 0116 5.5v2" />
                    </svg>
                    <span>Venue</span>
                  </div>
                  <strong>{eventVenueLabel}</strong>
                </div>
              </div>

              <div className="pv-event-card__share-wrap">
                <button type="button" className="pv-event-card__share" onClick={handleShare}>
                  Share This Event
                </button>

                <div className="pv-event-card__socials">
                  <SocialButton label="Share on Facebook" onClick={handleShare}>
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.6 1.7-1.6H16V4.8c-.4-.1-1.2-.2-2.2-.2-2.2 0-3.8 1.3-3.8 3.9V11H7.5v3H10v7h3.5z" />
                    </svg>
                  </SocialButton>
                  <SocialButton label="Share on Instagram" onClick={handleShare}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                      <circle cx="12" cy="12" r="3.75" />
                      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </SocialButton>
                  <SocialButton label="Share on X" onClick={handleShare}>
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.9 3H21l-4.6 5.3L22 21h-4.7l-3.7-4.8L9.3 21H7.2l5-5.8L2 3h4.8l3.4 4.4L13.9 3h5zM17 19.3h1.3L6.1 4.6H4.7L17 19.3z" />
                    </svg>
                  </SocialButton>
                  <SocialButton label="Share on YouTube" onClick={handleShare}>
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M21.6 7.2a2.8 2.8 0 00-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 00-2 2C2 9 2 12 2 12s0 3 .4 4.8a2.8 2.8 0 002 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 002-2C22 15 22 12 22 12s0-3-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z" />
                    </svg>
                  </SocialButton>
                </div>
              </div>
            </section>


          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className={`pv ${isEventPreview ? 'pv--event' : 'pv--story'}`}>
      <div className="pv-shell">
        <header className="pv-topbar">
          <div>
            <span className="pv-topbar__eyebrow">Live preview</span>
            <h1>Standalone article preview</h1>
          </div>
          <button type="button" className="pv-topbar__action" onClick={handleShare}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {shareLabel}
          </button>
        </header>

        <section className="pv-hero">
          <div className="pv-hero__copy">
            <div className="pv-hero__chips">
              <span className={`pv-chip ${isEventPreview ? 'pv-chip--glass' : 'pv-chip--solid'}`}>
                {formatPostTypeLabel(post.post_type)}
              </span>
              {post.category && <span className="pv-chip pv-chip--subtle">{post.category}</span>}
              <span className="pv-chip pv-chip--muted">{statusLabel}</span>
            </div>

            <h2 className="pv-hero__title">
              {post.title || (isEventPreview ? 'Untitled event' : 'Untitled article')}
            </h2>

            <div className="pv-hero__stats">
              <div className="pv-stat">
                <span className="pv-stat__label">College</span>
                <strong>{post.collegeName || 'College not set'}</strong>
              </div>
              <div className="pv-stat">
                <span className="pv-stat__label">Reading time</span>
                <strong>{readingTime}</strong>
              </div>
              <div className="pv-stat">
                <span className="pv-stat__label">Schedule</span>
                <strong>{isEventPreview ? formatDateTime(post.event_date, post.event_time) : 'Publication metadata preview'}</strong>
              </div>
            </div>
          </div>

          <div className="pv-hero__visual">
            <div className="pv-hero__image-frame">
              <img src={heroImage} alt={post.title || 'Preview hero'} />
            </div>
          </div>
        </section>

        <main className="pv-layout">
          <article className="pv-article">
            {safeTags.length > 0 && (
              <div className="pv-tags">
                {safeTags.map((tag) => (
                  <span key={tag} className="pv-tags__item">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div
              className="tiptap-content pv-body__content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />

            {(post.seo_title || post.seo_description) && (
              <section className="pv-seo">
                <span className="pv-seo__label">SEO Preview</span>
                <h3>{post.seo_title || post.title || 'SEO title'}</h3>
                <p>{post.seo_description || 'SEO description'}</p>
              </section>
            )}
          </article>

          <aside className="pv-sidebar">
            <section className="pv-panel">
              <span className="pv-panel__label">Publishing</span>
              <div className="pv-detail-list">
                <div className="pv-detail">
                  <span>Type</span>
                  <strong>{formatPostTypeLabel(post.post_type)}</strong>
                </div>
                <div className="pv-detail">
                  <span>Status</span>
                  <strong>{statusLabel}</strong>
                </div>
                <div className="pv-detail">
                  <span>Category</span>
                  <strong>{post.category || 'Uncategorized'}</strong>
                </div>
                <div className="pv-detail">
                  <span>Reading time</span>
                  <strong>{readingTime}</strong>
                </div>
              </div>
            </section>

            {isEventPreview && (
              <section className="pv-panel pv-panel--accent">
                <span className="pv-panel__label">Event details</span>
                <div className="pv-detail-list">
                  <div className="pv-detail">
                    <span>Date</span>
                    <strong>{post.event_date ? formatDate(post.event_date, 'dd MMM yyyy') : 'Date TBD'}</strong>
                  </div>
                  <div className="pv-detail">
                    <span>Time</span>
                    <strong>{post.event_time || 'Time TBD'}</strong>
                  </div>
                  <div className="pv-detail">
                    <span>Location</span>
                    <strong>{post.location || 'Location TBD'}</strong>
                  </div>
                  <div className="pv-detail">
                    <span>Venue</span>
                    <strong>{post.venue || 'Venue TBD'}</strong>
                  </div>
                </div>
              </section>
            )}

            <section className="pv-panel">
              <span className="pv-panel__label">Editorial notes</span>
              <p className="pv-panel__copy">
                This page reflects the current draft snapshot stored from the editor. Review title
                length, featured media, metadata, and content spacing before submitting.
              </p>
            </section>
          </aside>
        </main>

        <footer className="pv-footer">
          <span>{post.collegeName || 'College not set'}</span>
          <span>{readingTime}</span>
          <span>{statusLabel}</span>
        </footer>
      </div>
    </div>
  );
}

export default PreviewPage;
