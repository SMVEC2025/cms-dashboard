import DOMPurify from 'dompurify';
import { formatDateTime, formatPostTypeLabel, readingTimeFromHtml } from '@/lib/utils';

function PostPreview({ post, selectedCollegeName }) {
  const sanitizedHtml = DOMPurify.sanitize(post?.content_html || '');
  const metaItems = [
    selectedCollegeName,
    post.post_type === 'event' ? formatDateTime(post.event_date, post.event_time) : null,
    readingTimeFromHtml(post.content_html),
  ].filter(Boolean);

  if (!post) {
    return null;
  }

  return (
    <article className="preview-card">
      <div className="preview-card__hero">
        <div className="preview-card__hero-copy">
          <span className="preview-card__eyebrow">{formatPostTypeLabel(post.post_type)}</span>
          {post.seo_description && (
            <p className="preview-card__lede">{post.seo_description}</p>
          )}
        </div>

        <div className="preview-meta">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      {post.featured_image_url ? (
        <div className="preview-card__image-shell">
          <img className="preview-card__image" src={post.featured_image_url} alt={post.title || 'Featured'} />
        </div>
      ) : null}

      <div className="preview-card__details">
        {post.post_type === 'event' && (
          <>
            <div>
              <strong>Location</strong>
              <span>{post.location || 'Location TBD'}</span>
            </div>
            <div>
              <strong>Venue</strong>
              <span>{post.venue || 'Venue TBD'}</span>
            </div>
          </>
        )}
        <div>
          <strong>Category</strong>
          <span>{post.category || 'Uncategorized'}</span>
        </div>
      </div>

      {post.tags?.length ? (
        <div className="tag-row">
          {post.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}

      <div className="preview-card__content tiptap-content" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />

      <div className="seo-box">
        <strong>SEO Preview</strong>
        <h4>{post.seo_title || post.title || 'SEO title missing'}</h4>
        <p>{post.seo_description || 'SEO description missing'}</p>
      </div>
    </article>
  );
}

export default PostPreview;
