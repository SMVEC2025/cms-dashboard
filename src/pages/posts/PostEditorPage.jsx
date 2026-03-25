import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DatePickerField from '@/components/common/DatePickerField';
import EditorImagePicker from '@/components/editor/EditorImagePicker';
import RichTextEditor from '@/components/editor/RichTextEditor';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORY_OPTIONS, POST_TYPES } from '@/lib/constants';
import { formatPostTypeLabel, parseTagInput, slugify, tagsToInput } from '@/lib/utils';
import { uploadMedia } from '@/services/mediaService';
import {
  getPostById,
  saveDraft,
  submitPost,
  updatePostFeaturedImage,
} from '@/services/postsService';
import { IoMdClose } from "react-icons/io";

const defaultValues = {
  post_type: 'event',
  title: '',
  slug: '',
  summary: '',
  featured_image_url: '',
  event_date: '',
  event_time: '',
  venue: '',
  organizer: '',
  category: 'Announcement',
  tags: '',
  seo_title: '',
  seo_description: '',
};

const TABS = [
  { id: 'content', label: 'Content' },
  { id: 'meta', label: 'Meta' },
];

function PostEditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { postId } = useParams();
  const { profile, user, selectedCollegeName } = useAuth();
  const isBlogRoute = location.pathname.startsWith('/blogs');
  const isNewPostRoute = !postId && !isBlogRoute;
  const sourceTable = isBlogRoute ? 'blogs' : 'posts';
  const importInputRef = useRef(null);
  const previewHandlerRef = useRef(null);
  const persistHandlerRef = useRef(null);
  const [manualSlug, setManualSlug] = useState(Boolean(postId));
  const [loading, setLoading] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [featuredPickerOpen, setFeaturedPickerOpen] = useState(false);
  const [importingContent, setImportingContent] = useState(false);
  const [featuredAsset, setFeaturedAsset] = useState(null);
  const [existingPost, setExistingPost] = useState(null);
  const [contentState, setContentState] = useState({ html: '', json: null });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      ...defaultValues,
      post_type: isBlogRoute ? 'blog' : defaultValues.post_type,
      category: isBlogRoute ? 'Blog' : defaultValues.category,
    },
  });

  const slugField = register('slug', { required: 'Slug is required.' });
  const eventDateField = register('event_date');
  const watchedValues = watch();
  const selectedPostType = watchedValues.post_type || defaultValues.post_type;
  const isEventPost = selectedPostType === 'event';
  const isBlogPost = selectedPostType === 'blog';
  const editorPostTypeOptions = isBlogRoute
    ? POST_TYPES.filter((option) => option.value === 'blog')
    : POST_TYPES.filter((option) => option.value !== 'blog');

  const handleEventDateChange = (nextValue) => {
    setValue('event_date', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  useEffect(() => {
    if (!postId) return;
    const loadPost = async () => {
      try {
        setLoading(true);
        const post = await getPostById(postId, { sourceTable });
        setExistingPost(post);
        setValue('post_type', post.post_type);
        setValue('title', post.title);
        setValue('slug', post.slug);
        setValue('summary', post.summary);
        setValue('featured_image_url', post.featured_image_url || '');
        setValue('event_date', post.event_date || '');
        setValue('event_time', post.event_time || '');
        setValue('venue', post.venue || '');
        setValue('organizer', post.organizer || '');
        setValue('category', post.category || 'Announcement');
        setValue('tags', tagsToInput(post.tags));
        setValue('seo_title', post.seo_title || '');
        setValue('seo_description', post.seo_description || '');
        setContentState({
          html: post.content_html || '',
          json: post.content_json || null,
        });
        setManualSlug(true);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [postId, setValue, sourceTable]);

  useEffect(() => {
    if (manualSlug) return;
    setValue('slug', slugify(watchedValues.title || ''));
  }, [manualSlug, setValue, watchedValues.title]);

  useEffect(() => {
    if (isEventPost) {
      return;
    }

    setValue('event_date', '');
    setValue('event_time', '');
    setValue('venue', '');
    setValue('organizer', '');
  }, [isEventPost, setValue]);

  useEffect(() => {
    if (!isBlogRoute) {
      return;
    }

    setValue('post_type', 'blog');

    if (!watch('category')) {
      setValue('category', 'Blog');
    }
  }, [isBlogRoute, setValue, watch]);

  const uploadFeaturedAsset = async (file) => {
    if (!file) return;
    setFeaturedUploading(true);
    try {
      return await uploadMedia({ file, folder: 'featured-images' });
    } finally {
      setFeaturedUploading(false);
    }
  };

  const applyFeaturedAsset = async (asset, successMessage = 'Featured image updated.') => {
    if (!asset?.publicUrl) return;

    setFeaturedAsset(asset);
    setValue('featured_image_url', asset.publicUrl, { shouldDirty: true });

    if (existingPost?.id) {
        const updatedPost = await updatePostFeaturedImage({
          postId: existingPost.id,
          authorId: existingPost.author_id || user.id,
          featuredImageUrl: asset.publicUrl,
          featuredImageAssetId: asset.id,
          sourceTable,
        });
      setExistingPost(updatedPost);
    }

    if (successMessage) {
      toast.success(successMessage);
    }
  };

  const handleFeaturedImageSelect = async (asset) => {
    try {
      await applyFeaturedAsset(asset, 'Featured image selected.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRemoveFeaturedImage = async () => {
    try {
      setFeaturedAsset(null);
      setValue('featured_image_url', '', { shouldDirty: true });

      if (existingPost?.id) {
        const updatedPost = await updatePostFeaturedImage({
          postId: existingPost.id,
          authorId: existingPost.author_id || user.id,
          featuredImageUrl: null,
          featuredImageAssetId: null,
          sourceTable,
        });
        setExistingPost(updatedPost);
      }

      toast.success('Featured image removed.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleFeaturedImageUpload = async (file) => {
    try {
      const asset = await uploadFeaturedAsset(file);
      await applyFeaturedAsset(asset, null);
      return asset;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const handleEditorImageUpload = async (file) => {
    return uploadMedia({ file, folder: 'editor-media' });
  };

  const openPreview = () => {
    const previewData = {
      ...watchedValues,
      tags: parseTagInput(watchedValues.tags),
      content_html: contentState.html,
      collegeName: selectedCollegeName,
    };
    sessionStorage.setItem('cms-preview', JSON.stringify(previewData));
    window.open('/preview', '_blank');
  };

  const handleImportContent = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setImportingContent(true);
      const { importDocumentFile } = await import('@/services/documentImportService');
      const importedDocument = await importDocumentFile(file);
      if (!importedDocument.html) {
        throw new Error('No readable text was found in that document.');
      }
      const currentHtml = (contentState.html || '').trim();
      const hasExistingContent = currentHtml && currentHtml !== '<p></p>';

      let nextHtml = importedDocument.html;
      if (hasExistingContent) {
        const replaceExisting = window.confirm(
          'Replace the current workspace content with the imported document?\n\nChoose Cancel to append the imported content below the current content.',
        );

        nextHtml = replaceExisting
          ? importedDocument.html
          : `${currentHtml}<hr /><p></p>${importedDocument.html}`;
      }

      setContentState({
        html: nextHtml,
        json: null,
      });

      if (importedDocument.warnings.length) {
        toast.success(`Document imported with ${importedDocument.warnings.length} formatting note(s).`);
      } else {
        toast.success('Document imported into the workspace.');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImportingContent(false);
      event.target.value = '';
    }
  };

  const persistPost = async (mode) => {
    const values = watch();
    if (!contentState.html) {
      toast.error('Add the main content before saving.');
      return;
    }
    const payload = {
      id: postId,
      author_id: existingPost?.author_id || user.id,
      college_id: profile.selected_college_id,
      post_type: values.post_type,
      title: values.title,
      slug: values.slug,
      summary: values.summary,
      featured_image_url: values.featured_image_url || null,
      featured_image_asset_id:
        featuredAsset?.id || existingPost?.featured_image_asset_id || null,
      content_html: contentState.html,
      content_json: contentState.json,
      event_date: isEventPost ? values.event_date || null : null,
      event_time: isEventPost ? values.event_time || null : null,
      venue: isEventPost ? values.venue || null : null,
      organizer: isEventPost ? values.organizer || null : null,
      category: values.category || null,
      tags: parseTagInput(values.tags),
      seo_title: values.seo_title || null,
      seo_description: values.seo_description || null,
    };
    try {
      setSaving(true);
      const savedPost =
        mode === 'submit'
          ? await submitPost(payload)
          : await saveDraft(payload);
      setExistingPost(savedPost);
      const contentLabel = formatPostTypeLabel(savedPost.post_type || values.post_type);
      toast.success(
        mode === 'submit'
          ? `${contentLabel} submitted for admin approval.`
          : `${contentLabel} draft saved.`,
      );
      if (!postId) {
        const editBase = savedPost.post_type === 'blog' ? '/blogs' : '/posts';
        navigate(`${editBase}/${savedPost.id}/edit`, { replace: true });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    previewHandlerRef.current = openPreview;
    persistHandlerRef.current = persistPost;
  });

  useEffect(() => {
    const handleSaveDraftRequest = () => {
      persistHandlerRef.current?.('draft');
    };

    const handlePreviewRequest = () => {
      previewHandlerRef.current?.();
    };

    const handleImportRequest = () => {
      importInputRef.current?.click();
    };

    window.addEventListener('cms:editor-save-draft', handleSaveDraftRequest);
    window.addEventListener('cms:editor-preview', handlePreviewRequest);
    window.addEventListener('cms:editor-import', handleImportRequest);

    return () => {
      window.removeEventListener('cms:editor-save-draft', handleSaveDraftRequest);
      window.removeEventListener('cms:editor-preview', handlePreviewRequest);
      window.removeEventListener('cms:editor-import', handleImportRequest);
    };
  }, []);

  if (loading) {
    return (
      <div className="cms-editor">
        <div className="cms-editor__loading">
          <div className="skeleton" style={{ height: 56, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 400, borderRadius: 16, marginTop: 16 }} />
        </div>
      </div>
    );
  }

  return (
    <form
      className="cms-editor"
      onSubmit={handleSubmit(() => persistPost('draft'))}
    >
      <EditorImagePicker
        open={featuredPickerOpen}
        onClose={() => setFeaturedPickerOpen(false)}
        onInsert={handleFeaturedImageSelect}
        onUpload={handleFeaturedImageUpload}
        eyebrow="Featured Image"
        title="Choose featured image"
        confirmLabel="Use as featured image"
        ariaLabel="Choose featured image"
      />
      <input type="hidden" {...eventDateField} />
      <input
        ref={importInputRef}
        type="file"
        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={handleImportContent}
      />
      {/* ── Title Bar ── */}
      <div className="cms-editor__title-bar">
        <input
          type="text"
          className="cms-editor__title-input"
          placeholder={isBlogRoute ? 'Enter blog title...' : 'Enter post title...'}
          {...register('title', { required: 'Title is required.' })}
        />
        <div className="cms-editor__title-actions">
          {!isNewPostRoute && (
            <CustomSelect
              className="cms-editor__type-select"
              value={watch('post_type')}
              onChange={val => setValue('post_type', val, { shouldValidate: true })}
              options={editorPostTypeOptions}
              disabled={isBlogRoute}
            />
          )}

          <button
            type="button"
            className="btn btn--outline btn--compact"
            onClick={openPreview}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            </svg>
            Preview
          </button>

          <button
            type="submit"
            className="btn btn--primary btn--compact"
            disabled={saving}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      {errors.title && (
        <small className="field-error" style={{ padding: '0 1.75rem' }}>
          {errors.title.message}
        </small>
      )}

      {/* ── Tab Bar ── */}
      <div className="cms-editor__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`cms-editor__tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Two-column Body ── */}
      <div className="cms-editor__body">
        <div className="cms-editor__main">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <>
              {/* Text Block */}
              <div className="cms-block">
                <div className="cms-block__header">
                  <div className="cms-block__title-group">
                    <span className="cms-block__indicator" />
                    <span className="cms-block__label">Text</span>
                  </div>
                  <div className="cms-block__actions">
                    <button type="button" className="cms-block__action" title="Delete">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="cms-block__action"
                      title={importingContent ? 'Importing...' : 'Import data'}
                      aria-label={importingContent ? 'Importing document' : 'Import data'}
                      data-tooltip={importingContent ? 'Importing...' : 'Import data'}
                      onClick={() => importInputRef.current?.click()}
                      disabled={importingContent}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <RichTextEditor
                  value={contentState.html}
                  onChange={setContentState}
                  onImageUpload={handleEditorImageUpload}
                />
              </div>

              {/* Image Block */}
              <div className="cms-block">
                <div className="cms-block__header">
                  <div className="cms-block__title-group">
                    <span className="cms-block__indicator cms-block__indicator--media" />
                    <span className="cms-block__label">Image</span>
                  </div>
                </div>
                <div className="cms-block__content">
                  <div className="cms-upload-zone">
                    <div className="cms-upload-zone__top">
                      <div>
                        <span className="cms-upload-zone__label">Featured image*</span>
                        <p className="cms-upload-zone__helper">
                          Choose an image from your media library or upload a new one for this post.
                        </p>
                      </div>
                      
                    </div>
                    <button
                      type="button"
                      className="cms-upload-zone__droparea"
                      onClick={() => setFeaturedPickerOpen(true)}
                    >
                      <span className="cms-upload-zone__dropicon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </span>
                      <span className="cms-upload-zone__copy">
                        <strong>
                          {featuredUploading ? 'Uploading...' : 'Choose from gallery or upload an image'}
                        </strong>
                        <small>Recommended landscape image for cards and preview pages.</small>
                      </span>
                      <span className="cms-upload-zone__trigger">Browse media</span>
                    </button>
                    {watchedValues.featured_image_url && (
                      <button
                        type="button"
                        className="cms-upload-zone__preview"
                        onClick={() => setFeaturedPickerOpen(true)}
                      >
                        <span className="cms-upload-zone__preview-badge">Featured image</span>
                        <button
                          type="button"
                          className="cms-upload-zone__preview-remove"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleRemoveFeaturedImage();
                          }}
                          aria-label="Remove featured image"
                          title="Remove featured image"
                        >
                          <IoMdClose />
                        </button>
                        <img
                          src={watchedValues.featured_image_url}
                          alt="Featured"
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Block */}
              <div className="cms-block">
                <div className="cms-block__header">
                  <div className="cms-block__title-group">
                    <span className="cms-block__indicator cms-block__indicator--info" />
                    <span className="cms-block__label">Summary</span>
                  </div>
                </div>
                <div className="cms-block__content">
                  {isBlogPost && (
                    <div className="revision-note" style={{ marginBottom: '1rem' }}>
                      <strong>Blog approval workflow</strong>
                      <p>
                        Blogs follow the same institutional review flow as news and events.
                        Staff can save drafts, but submitting a blog sends it to admin for approval
                        before publication.
                      </p>
                    </div>
                  )}
                  <textarea
                    rows={3}
                    placeholder={
                      isEventPost
                        ? 'Give editors and search engines a concise summary of the event.'
                        : isBlogPost
                          ? 'Summarize the blog article in a concise editorial abstract.'
                        : 'Give editors and search engines a concise summary of the article.'
                    }
                    {...register('summary')}
                  />
                  {errors.summary && (
                    <small className="field-error">
                      {errors.summary.message}
                    </small>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Meta Tab */}
          {activeTab === 'meta' && (
            <div className="cms-block">
              <div className="cms-block__header">
                <div className="cms-block__title-group">
                  <span className="cms-block__indicator cms-block__indicator--info" />
                  <span className="cms-block__label">Publishing Metadata</span>
                </div>
              </div>
              <div className="cms-block__content">
                <div className="cms-field-grid">
                  {isEventPost ? (
                    <>
                      <label className="field-group">
                        <span>Event date</span>
                        <DatePickerField
                          value={watchedValues.event_date}
                          onChange={handleEventDateChange}
                        />
                      </label>
                      <label className="field-group">
                        <span>Event time</span>
                        <input type="time" {...register('event_time')} />
                      </label>
                      <label className="field-group">
                        <span>Venue</span>
                        <input
                          type="text"
                          placeholder="Main auditorium"
                          {...register('venue')}
                        />
                      </label>
                      <label className="field-group">
                        <span>Organizer</span>
                        <input
                          type="text"
                          placeholder="Department of Computer Science"
                          {...register('organizer')}
                        />
                      </label>
                    </>
                  ) : (
                    <div className="revision-note">
                      <strong>Article metadata</strong>
                      <p>
                        Blogs and news posts do not require event schedule, venue,
                        or organizer details. Focus on the article summary, category,
                        tags, and featured image.
                      </p>
                    </div>
                  )}
                </div>
                {existingPost?.review_notes && (
                  <div className="revision-note" style={{ marginTop: '1.25rem' }}>
                    <strong>Latest review note</strong>
                    <p>{existingPost.review_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Right Sidebar ── */}
        <aside className="cms-editor__sidebar">
          <div className="cms-sidebar-card">
            <div className="cms-sidebar-section">
              <span className="cms-sidebar-section__label">Author</span>
              <div className="cms-sidebar-author">
                <div className="cms-sidebar-author__avatar">
                  {(user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="cms-sidebar-author__name">
                  {user?.email?.split('@')[0] || 'Unknown'}
                </span>
              </div>
            </div>

            {isEventPost && (
              <div className="cms-sidebar-section">
                <span className="cms-sidebar-section__label">Event schedule</span>
                <div className="cms-sidebar-section__row">
                  <DatePickerField
                    value={watchedValues.event_date}
                    onChange={handleEventDateChange}
                  />
                  <input type="time" {...register('event_time')} />
                </div>
              </div>
            )}

            <div className="cms-sidebar-section">
              <span className="cms-sidebar-section__label">Category</span>
              <CustomSelect
                value={watch('category')}
                onChange={val => setValue('category', val)}
                options={CATEGORY_OPTIONS.map(opt => ({ value: opt, label: opt }))}
              />
            </div>

            <div className="cms-sidebar-section">
              <span className="cms-sidebar-section__label">Tags</span>
              <input
                type="text"
                placeholder="campus, seminar, placements"
                {...register('tags')}
              />
              <small className="helper-text">Separate with commas</small>
            </div>

            <div className="cms-sidebar-section">
              <span className="cms-sidebar-section__label">Slug</span>
              <input
                type="text"
                placeholder="auto-generated-slug"
                {...slugField}
                onChange={(event) => {
                  setManualSlug(true);
                  slugField.onChange({
                    target: {
                      name: slugField.name,
                      value: slugify(event.target.value),
                    },
                  });
                }}
              />
              {errors.slug && (
                <small className="field-error">{errors.slug.message}</small>
              )}
            </div>

            {existingPost?.status && (
              <div className="cms-sidebar-section">
                <span className="cms-sidebar-section__label">Status</span>
                <StatusBadge status={existingPost.status} />
              </div>
            )}

            <div className="cms-sidebar-section">
              <span className="cms-sidebar-section__label">College</span>
              <span className="cms-sidebar-college">{selectedCollegeName}</span>
            </div>

            {isBlogPost && (
              <div className="cms-sidebar-section">
                <span className="cms-sidebar-section__label">Publishing flow</span>
                <small className="helper-text">
                  Blog drafts stay private until an admin approves and publishes them.
                </small>
              </div>
            )}
          </div>

          <div className="cms-sidebar-card cms-sidebar-card--actions">
            <button
              type="submit"
              className="btn btn--outline btn--full"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--full"
              onClick={handleSubmit(() => persistPost('submit'))}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Submit for Review'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}

export default PostEditorPage;
