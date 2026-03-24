import DOMPurify from 'dompurify';
import { formatDateTime, formatPostTypeLabel, readingTimeFromHtml } from '@/lib/utils';

function PostPreview({ post, selectedCollegeName }) {
  const sanitizedHtml = DOMPurify.sanitize(post?.content_html || '');

  if (!post) {
    return null;
  }

  return (
    <article className="preview-card">
      <div className="preview-card__hero">
        <div>
          <span className="eyebrow">{formatPostTypeLabel(post.post_type)}</span>
          <h2>{post.title || 'Untitled post'}</h2>
          <p>{post.summary || 'Add a short summary to improve list and search experiences.'}</p>
        </div>

        <div className="preview-meta">
          <span>{selectedCollegeName}</span>
          {post.post_type === 'event' && <span>{formatDateTime(post.event_date, post.event_time)}</span>}
          <span>{readingTimeFromHtml(post.content_html)}</span>
        </div>
      </div>

      {post.featured_image_url ? (
        <img className="preview-card__image" src={post.featured_image_url} alt={post.title || 'Featured'} />
      ) : null}

      <div className="preview-card__details">
        {post.post_type === 'event' && (
          <>
            <div>
              <strong>Venue</strong>
              <span>{post.venue || 'Venue TBD'}</span>
            </div>
            <div>
              <strong>Organizer</strong>
              <span>{post.organizer || 'Organizer pending'}</span>
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

      <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />

      <div className="seo-box">
        <strong>SEO Preview</strong>
        <h4>{post.seo_title || post.title || 'SEO title missing'}</h4>
        <p>{post.seo_description || post.summary || 'SEO description missing'}</p>
      </div>
    </article>
  );
}

export default PostPreview;
