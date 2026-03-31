import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import DatePickerField from '@/components/common/DatePickerField';
import TimePickerField from '@/components/common/TimePickerField';
import EditorImagePicker from '@/components/editor/EditorImagePicker';
import RichTextEditor from '@/components/editor/RichTextEditor';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORY_OPTIONS, POST_STATUS, POST_TYPES, ROLES } from '@/lib/constants';
import { formatPostTypeLabel, parseTagInput, slugify, tagsToInput } from '@/lib/utils';
import { uploadMedia } from '@/services/mediaService';
import {
  getPostById,
  saveDraft,
  submitPost,
  updatePostFeaturedImage,
} from '@/services/postsService';
import { IoMdClose } from "react-icons/io";
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';

const EDITOR_TOUR = [
  {
    target: null,
    icon: '🎯',
    title: "Let's create your first post!",
    content: "This is the post editor. We'll walk you through each section so you can publish your first piece with ease.",
  },
  {
    target: '[data-tour="editor-title"]',
    icon: '📝',
    title: 'Start with a Great Title',
    content: 'Give your post a clear, descriptive title. This is the first thing readers will see.',
  },
  {
    target: '[data-tour="editor-description"]',
    icon: '💬',
    title: 'Add a Short Description',
    content: 'Write a 10–100 word summary. It appears in search results and post previews — keep it punchy.',
  },
  {
    target: '[data-tour="editor-content"]',
    icon: '✍️',
    title: 'Write Your Content',
    content: 'Use the rich text editor below to write and format your article. The toolbar lets you add headings, images, lists, and links.',
  },
  {
    target: '[data-tour="editor-save"]',
    icon: '🚀',
    title: 'Save & Submit',
    content: '"Save as draft" preserves your work any time. When the post is ready, use the sidebar to submit it for admin review.',
  },
];

const defaultValues = {
  post_type: 'event',
  title: '',
  slug: '',
  featured_image_url: '',
  event_date: '',
  event_time: '',
  location: '',
  venue: '',
  category: 'Announcement',
  tags: '',
  seo_title: '',
  seo_description: '',
};

const TABS = [
  { id: 'content', label: 'Content' },
  { id: 'meta', label: 'Meta' },
];
const CUSTOM_CATEGORY_VALUE = '__custom_category__';

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function limitToWordCount(value, maxWords) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return value;
  }

  return words.slice(0, maxWords).join(' ');
}

function buildSnapshot(fields, contentHtml, collegeId = '') {
  return JSON.stringify({
    title: fields.title || '',
    slug: fields.slug || '',
    featured_image_url: fields.featured_image_url || '',
    event_date: fields.event_date || '',
    event_time: fields.event_time || '',
    location: fields.location || '',
    venue: fields.venue || '',
    category: fields.category || '',
    tags: fields.tags || '',
    seo_title: fields.seo_title || '',
    seo_description: fields.seo_description || '',
    content: contentHtml || '',
    college_id: collegeId || '',
  });
}

function PostEditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { postId } = useParams();
  const {
    profile,
    user,
    selectedCollegeName,
    selectedCollegeId,
    colleges,
    getCollegeNameById,
  } = useAuth();
  const isBlogRoute = location.pathname.startsWith('/blogs');
  const isNewPostRoute = !postId && !isBlogRoute;
  const isAdmin = profile?.role === ROLES.ADMIN;
  const sourceTable = isBlogRoute ? 'blogs' : 'posts';
  const importInputRef = useRef(null);
  const previewHandlerRef = useRef(null);
  const persistHandlerRef = useRef(null);
  const [manualSlug, setManualSlug] = useState(Boolean(postId));
  const [loading, setLoading] = useState(Boolean(postId));
  const [savingMode, setSavingMode] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [featuredPickerOpen, setFeaturedPickerOpen] = useState(false);
  const [importingContent, setImportingContent] = useState(false);
  const [featuredAsset, setFeaturedAsset] = useState(null);
  const [existingPost, setExistingPost] = useState(null);
  const [contentState, setContentState] = useState({ html: '', json: null });
  const [isCustomCategorySelected, setIsCustomCategorySelected] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  const [targetCollegeId, setTargetCollegeId] = useState('');
  const submittedSnapshotRef = useRef(null);
  const tourCheckedRef = useRef(false);
  const [editorTourOpen, setEditorTourOpen] = useState(false);
  const { hasSeen, markSeen } = useOnboarding(user?.id);

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
  const descriptionField = register('seo_description', {
    validate: (value) => {
      const wordCount = countWords(value || '');

      if (wordCount < 10) {
        return 'Description must be at least 10 words.';
      }

      if (wordCount > 100) {
        return 'Description cannot exceed 100 words.';
      }

      return true;
    },
  });
  const watchedValues = watch();
  const selectedPostType = watchedValues.post_type || defaultValues.post_type;
  const selectedCategory = watchedValues.category || '';
  const isEventPost = selectedPostType === 'event';
  const isBlogPost = selectedPostType === 'blog';
  const eventDateField = register('event_date', {
    validate: (value) => {
      if (!isEventPost) {
        return true;
      }

      return value ? true : 'Event date is required.';
    },
  });
  const eventTimeField = register('event_time', {
    validate: (value) => {
      if (!isEventPost) {
        return true;
      }

      return value ? true : 'Event time is required.';
    },
  });
  const hasPresetCategory = CATEGORY_OPTIONS.includes(selectedCategory);
  const showCustomCategoryInput = isCustomCategorySelected || Boolean(selectedCategory && !hasPresetCategory);
  const editorPostTypeOptions = isBlogRoute
    ? POST_TYPES.filter((option) => option.value === 'blog')
    : POST_TYPES.filter((option) => option.value !== 'blog');
  const categoryOptions = [
    ...CATEGORY_OPTIONS.map((opt) => ({ value: opt, label: opt })),
    { value: CUSTOM_CATEGORY_VALUE, label: 'Other' },
  ];
  const isSaving = savingMode !== null;
  const currentUserName = profile?.full_name || user?.email?.split('@')[0] || 'Unknown';
  const authorDisplayName = existingPost
    ? existingPost.author_name
      || (existingPost.author_id === user?.id ? currentUserName : 'Staff')
    : currentUserName;
  const collegeDisplayName = existingPost?.college_name
    || getCollegeNameById(targetCollegeId)
    || selectedCollegeName;
  const collegeOptions = colleges.map((college) => ({
    value: college.id,
    label: college.name,
  }));

  const navigateToEditor = (savedPost) => {
    const editBase = savedPost.post_type === 'blog' ? '/blogs' : '/posts';
    navigate(`${editBase}/${savedPost.id}/edit`, { replace: true });
  };

  const handleEventDateChange = (nextValue) => {
    setValue('event_date', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleEventTimeChange = (nextValue) => {
    setValue('event_time', nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleDescriptionChange = (event) => {
    const limitedValue = limitToWordCount(event.target.value, 100);

    if (limitedValue !== event.target.value) {
      event.target.value = limitedValue;
    }

    descriptionField.onChange(event);
  };

  useEffect(() => {
    if (!postId) {
      setIsReadOnlyMode(false);
      return;
    }

    const viewModeRequested = isAdmin && new URLSearchParams(location.search).get('mode') === 'view';
    setIsReadOnlyMode(viewModeRequested);
  }, [isAdmin, location.search, postId]);

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
        setValue('featured_image_url', post.featured_image_url || '');
        setValue('event_date', post.event_date || '');
        setValue('event_time', post.event_time || '');
        setValue('location', post.location || '');
        setValue('venue', post.venue || '');
        setValue('category', post.category || 'Announcement');
        setValue('tags', tagsToInput(post.tags));
        setValue('seo_title', post.seo_title || '');
        setValue('seo_description', post.seo_description || '');
        setContentState({
          html: post.content_html || '',
          json: post.content_json || null,
        });
        setManualSlug(true);
        if (post.status === POST_STATUS.SUBMITTED) {
          setIsLocked(true);
          submittedSnapshotRef.current = buildSnapshot({
            title: post.title,
            slug: post.slug,
            featured_image_url: post.featured_image_url || '',
            event_date: post.event_date || '',
            event_time: post.event_time || '',
            location: post.location || '',
            venue: post.venue || '',
            category: post.category || 'Announcement',
            tags: tagsToInput(post.tags),
            seo_title: post.seo_title || '',
            seo_description: post.seo_description || '',
          }, post.content_html || '', post.college_id || '');
        }
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
    setValue('location', '');
    setValue('venue', '');
  }, [isEventPost, setValue]);

  useEffect(() => {
    if (!isBlogRoute) {
      return;
    }

    setValue('post_type', 'blog');

    if (!selectedCategory && !isCustomCategorySelected) {
      setValue('category', 'Blog');
    }
  }, [isBlogRoute, isCustomCategorySelected, selectedCategory, setValue]);

  useEffect(() => {
    if (selectedCategory && !CATEGORY_OPTIONS.includes(selectedCategory)) {
      setIsCustomCategorySelected(true);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (!isLocked || !submittedSnapshotRef.current) return;
    const current = buildSnapshot(watchedValues, contentState.html, targetCollegeId);
    if (current !== submittedSnapshotRef.current) {
      setIsLocked(false);
      submittedSnapshotRef.current = null;
    }
  }, [watchedValues, contentState, isLocked, targetCollegeId]);

  useEffect(() => {
    if (existingPost?.college_id) {
      setTargetCollegeId(existingPost.college_id);
      return;
    }

    if (targetCollegeId) {
      return;
    }

    const fallbackCollegeId = selectedCollegeId || profile?.selected_college_id || colleges[0]?.id || '';
    if (fallbackCollegeId) {
      setTargetCollegeId(fallbackCollegeId);
    }
  }, [
    colleges,
    existingPost?.college_id,
    profile?.selected_college_id,
    selectedCollegeId,
    targetCollegeId,
  ]);

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
        authorId: user.id,
        featuredImageUrl: asset.publicUrl,
        featuredImageAssetId: asset.id,
        sourceTable,
      });
      setExistingPost((previousPost) => ({
        ...updatedPost,
        author_name: previousPost?.author_name || updatedPost.author_name || null,
        college_name: previousPost?.college_name || updatedPost.college_name || null,
      }));
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
          authorId: user.id,
          featuredImageUrl: null,
          featuredImageAssetId: null,
          sourceTable,
        });
        setExistingPost((previousPost) => ({
          ...updatedPost,
          author_name: previousPost?.author_name || updatedPost.author_name || null,
          college_name: previousPost?.college_name || updatedPost.college_name || null,
        }));
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
      collegeName: getCollegeNameById(targetCollegeId) || selectedCollegeName,
    };
    sessionStorage.setItem('cms-preview', JSON.stringify(previewData));
    window.open('/preview', '_blank');
  };

  const handleImportContent = async (event) => {
    if (isReadOnlyMode) {
      event.target.value = '';
      toast.error('Click Edit to import content.');
      return;
    }

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
    if (isReadOnlyMode) {
      toast.error('Click Edit to make changes.');
      return;
    }

    const values = watch();
    if (!contentState.html) {
      toast.error('Add the main content before saving.');
      return;
    }
    const resolvedCollegeId = isAdmin
      ? (targetCollegeId || existingPost?.college_id || profile?.selected_college_id || null)
      : (existingPost?.college_id || profile?.selected_college_id || null);

    if (!resolvedCollegeId) {
      toast.error('Select a college before saving this post.');
      return;
    }

    const shouldAssignAdminAsAuthor = Boolean(postId && isAdmin && existingPost?.id);
    const shouldDirectPublish = Boolean(mode === 'submit' && isAdmin);

    const payload = {
      id: postId,
      author_id: shouldAssignAdminAsAuthor ? user.id : (existingPost?.author_id || user.id),
      college_id: resolvedCollegeId,
      post_type: values.post_type,
      title: values.title,
      slug: values.slug,
      featured_image_url: values.featured_image_url || null,
      featured_image_asset_id:
        featuredAsset?.id || existingPost?.featured_image_asset_id || null,
      content_html: contentState.html,
      content_json: contentState.json,
      event_date: isEventPost ? values.event_date || null : null,
      event_time: isEventPost ? values.event_time || null : null,
      location: isEventPost ? values.location || null : null,
      venue: isEventPost ? values.venue || null : null,
      category: values.category || null,
      tags: parseTagInput(values.tags),
      seo_title: values.seo_title || null,
      seo_description: values.seo_description || null,
      direct_publish: shouldDirectPublish,
    };
    try {
      setSavingMode(mode);
      const savedPost =
        mode === 'submit'
          ? await submitPost(payload)
          : await saveDraft(payload);
      setExistingPost((previousPost) => ({
        ...savedPost,
        author_name:
          savedPost.author_id === user.id
            ? currentUserName
            : previousPost?.author_name || savedPost.author_name || null,
        college_name: savedPost.college_name || getCollegeNameById(savedPost.college_id) || null,
      }));
      const contentLabel = formatPostTypeLabel(savedPost.post_type || values.post_type);
      toast.success(
        mode === 'submit'
          ? (shouldDirectPublish
              ? `${contentLabel} published successfully.`
              : `${contentLabel} submitted for admin approval.`)
          : `${contentLabel} draft saved.`,
      );
      if (mode === 'submit') {
        if (shouldDirectPublish) {
          setIsLocked(false);
          submittedSnapshotRef.current = null;
        } else {
          setIsLocked(true);
          submittedSnapshotRef.current = buildSnapshot(values, contentState.html, resolvedCollegeId);
        }
      }
      if (!postId) {
        navigateToEditor(savedPost);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingMode(null);
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

  // Show editor tour for staff users on their first new-post creation.
  // Guard on user?.id so the check never runs before auth has loaded.
  useEffect(() => {
    if (loading || !user?.id || tourCheckedRef.current) return;
    if (isAdmin) return;
    if (postId) return; // only for brand-new posts, not editing
    tourCheckedRef.current = true;
    if (!hasSeen('post-editor')) {
      const t = setTimeout(() => setEditorTourOpen(true), 700);
      return () => clearTimeout(t);
    }
  }, [loading, user?.id, isAdmin, postId, hasSeen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleEditorTourFinish = () => {
    markSeen('post-editor');
    setEditorTourOpen(false);
  };

  return (
    <>
    <OnboardingTour steps={EDITOR_TOUR} isOpen={editorTourOpen} onFinish={handleEditorTourFinish} />
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
      <input type="hidden" {...eventTimeField} />
      <input
        ref={importInputRef}
        type="file"
        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={handleImportContent}
      />
      {/* ── Title Bar ── */}
      <div className="cms-editor__title-bar">
        <label className="cms-editor__title-field" data-tour="editor-title">
          <span className="cms-editor__title-label">Title</span>
          <input
            type="text"
            className="cms-editor__title-input"
            placeholder={isBlogRoute ? 'Enter blog title...' : 'Enter post title...'}
            disabled={isReadOnlyMode}
            {...register('title', { required: 'Title is required.' })}
          />
        </label>
        <div className="cms-editor__title-actions" data-tour="editor-save">
          {!isNewPostRoute && (
            <CustomSelect
              className="cms-editor__type-select"
              value={watch('post_type')}
              onChange={val => setValue('post_type', val, { shouldValidate: true })}
              options={editorPostTypeOptions}
              disabled={isBlogRoute || isReadOnlyMode}
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

          {isReadOnlyMode ? (
            <button
              type="button"
              className="btn btn--primary btn--compact"
              onClick={() => setIsReadOnlyMode(false)}
            >
              Edit
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn--primary btn--compact"
              disabled={isSaving}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {savingMode === 'draft' ? 'Saving...' : 'Save as draft'}
            </button>
          )}
        </div>
      </div>
      {errors.title && (
        <small className="field-error" style={{ padding: '0 1.75rem' }}>
          {errors.title.message}
        </small>
      )}

      {/* ── Tab Bar ── */}
      <div className="cms-editor__description-bar" data-tour="editor-description">
        <label className="cms-editor__description-field">
          <span className="cms-editor__description-label">Description</span>
          <textarea
            rows={3}
            className="cms-editor__description-input"
          placeholder={
            isBlogRoute
              ? 'Write a short description for this blog.'
              : isEventPost
                ? 'Write a short description for this post or event.'
                : 'Write a short description for this post.'
          }
          {...descriptionField}
          onChange={handleDescriptionChange}
          disabled={isReadOnlyMode}
        />
      </label>
        <small className="helper-text">Minimum 10 words, maximum 100 words.</small>
        {errors.seo_description && (
          <small className="field-error">{errors.seo_description.message}</small>
        )}
      </div>

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
      <fieldset className="cms-editor__fieldset" disabled={isReadOnlyMode}>
      <div className="cms-editor__body">
        <div className="cms-editor__main">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <>
              {/* Text Block */}
              <div className="cms-block" data-tour="editor-content">
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
                  readOnly={isReadOnlyMode}
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

              {isBlogPost && (
                <div className="cms-block">
                  <div className="cms-block__header">
                    <div className="cms-block__title-group">
                      <span className="cms-block__indicator cms-block__indicator--info" />
                      <span className="cms-block__label">Workflow</span>
                    </div>
                  </div>
                <div className="cms-block__content">
                  <div className="revision-note">
                    <strong>Blog approval workflow</strong>
                    <p>
                        Wait for admin approval to reflect this on website.
                    </p>
                  </div>
                </div>
              </div>
              )}
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
                        <span>Event date*</span>
                        <DatePickerField
                          value={watchedValues.event_date}
                          onChange={handleEventDateChange}
                        />
                        {errors.event_date && (
                          <small className="field-error">{errors.event_date.message}</small>
                        )}
                      </label>
                      <label className="field-group">
                        <span>Event time*</span>
                        <TimePickerField
                          value={watchedValues.event_time}
                          onChange={handleEventTimeChange}
                        />
                        {errors.event_time && (
                          <small className="field-error">{errors.event_time.message}</small>
                        )}
                      </label>
                      <label className="field-group">
                        <span>Location</span>
                        <input
                          type="text"
                          placeholder="Puducherry campus"
                          {...register('location')}
                        />
                      </label>
                      <label className="field-group">
                        <span>Venue</span>
                        <input
                          type="text"
                          placeholder="Main auditorium"
                          {...register('venue')}
                        />
                      </label>
                    </>
                  ) : (
                    <div className="revision-note">
                      <strong>Article metadata</strong>
                      <p>
                        Blogs and news posts do not require event schedule, location,
                        or venue details. Focus on category, tags, and featured image.
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
                  {(authorDisplayName || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="cms-sidebar-author__name">
                  {authorDisplayName}
                </span>
              </div>
            </div>

            {isEventPost && (
              <div className="cms-sidebar-section">
                <span className="cms-sidebar-section__label">Event schedule*</span>
                <div className="cms-sidebar-section__row">
                  <DatePickerField
                    value={watchedValues.event_date}
                    onChange={handleEventDateChange}
                  />
                  <TimePickerField
                    value={watchedValues.event_time}
                    onChange={handleEventTimeChange}
                  />
                </div>
                {(errors.event_date || errors.event_time) && (
                  <small className="field-error">
                    {errors.event_date?.message || errors.event_time?.message}
                  </small>
                )}
              </div>
            )}

            <div className="cms-sidebar-section">
              <span className="cms-sidebar-section__label">Category</span>
              <CustomSelect
                value={showCustomCategoryInput ? CUSTOM_CATEGORY_VALUE : selectedCategory}
                onChange={(val) => {
                  if (val === CUSTOM_CATEGORY_VALUE) {
                    setIsCustomCategorySelected(true);
                    setValue('category', '', { shouldDirty: true, shouldTouch: true });
                    return;
                  }

                  setIsCustomCategorySelected(false);
                  setValue('category', val, { shouldDirty: true, shouldTouch: true });
                }}
                options={categoryOptions}
              />
              {showCustomCategoryInput && (
                <>
                  <div className='category-input'>
                    <small className="helper-text category">Enter category</small>

                  <input
                    type="text"
                    placeholder="Enter custom category"
                    value={selectedCategory}
                    onChange={(event) => {
                      setValue('category', event.target.value, {
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                  />
                  </div>
                </>
              )}
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

            {existingPost?.review_notes && (
              <div className="cms-sidebar-section">
                <span className="cms-sidebar-section__label">Review Notes</span>
                <div className="cms-sidebar-note">
                  <p>{existingPost.review_notes}</p>
                </div>
              </div>
            )}

            {existingPost?.status && (
              <div className="cms-sidebar-section">
                <span className="cms-sidebar-section__label">Status</span>
                <StatusBadge status={existingPost.status} />
              </div>
            )}

            <div className="cms-sidebar-section">
              <span className="cms-sidebar-section__label">College</span>
              {isAdmin ? (
                <>
                  <CustomSelect
                    value={targetCollegeId}
                    onChange={setTargetCollegeId}
                    options={collegeOptions}
                    placeholder="Select college"
                    disabled={isReadOnlyMode}
                  />
                </>
              ) : (
                <span className="cms-sidebar-college">{collegeDisplayName}</span>
              )}
            </div>

            {isBlogPost && (
              <div className="cms-sidebar-section">
                <span className="cms-sidebar-section__label">Publishing flow</span>
                <small className="helper-text">
                  Wait for admin approval to reflect this on website.
                </small>
              </div>
            )}
          </div>

          {!isReadOnlyMode && (
            <div className="cms-sidebar-card cms-sidebar-card--actions">
            <button
              type="submit"
              className="btn btn--outline btn--full"
              disabled={isSaving}
            >
              {savingMode === 'draft' ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              className={`submit-review-btn${savingMode === 'submit' ? ' is-submitting' : ''}${isLocked ? ' is-success' : ''}`}
              onClick={handleSubmit(() => persistPost('submit'))}
              disabled={isSaving || isLocked}
            >
              <span className="submit-review-btn__icon">
                {isLocked ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path fill="currentColor" d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path fill="currentColor" d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" />
                  </svg>
                )}
              </span>
              <span className="submit-review-btn__label">
                {isLocked
                  ? 'Submitted!'
                  : savingMode === 'submit'
                    ? (isAdmin ? 'Publishing...' : 'Submitting...')
                    : (isAdmin ? 'Publish' : 'Submit for Review')}
              </span>
            </button>
          </div>
          )}
        </aside>
      </div>
      </fieldset>
    </form>
    </>
  );
}

export default PostEditorPage;
