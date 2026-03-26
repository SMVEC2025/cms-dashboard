export const APP_NAME = import.meta.env.VITE_APP_NAME || 'SMVEC CMS';

export const ROLES = {
  STAFF: 'staff',
  ADMIN: 'admin',
};

export const POST_TYPES = [
  { value: 'news', label: 'News' },
  { value: 'event', label: 'Event' },
  { value: 'blog', label: 'Blog' },
];

export const POST_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVISION: 'revision_requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
};

export const CATEGORY_OPTIONS = [
  'Announcement',
  'Achievement',
  'Admission',
  'Academic Event',
  'Blog',
  'Editorial',
  'Workshop',
  'Seminar',
  'Conference',
  'Campus Life',
  'Research',
  'Placement',
];

export const NAV_ITEMS = {
  staff: [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/drafts', label: 'Drafts', icon: 'drafts' },
    { to: '/posts', label: 'Posts', icon: 'content' },
    { to: '/posts/new', label: 'New Post', icon: 'create' },
    { to: '/blogs', label: 'Blogs', icon: 'blog' },
    { to: '/blogs/new', label: 'New Blog', icon: 'blogCreate' },
    { to: '/gallery', label: 'Gallery', icon: 'gallery' },
    { to: '/uploads', label: 'Uploads', icon: 'uploads' },
  ],
  admin: [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/drafts', label: 'Drafts', icon: 'drafts' },
    { to: '/posts', label: 'Posts', icon: 'content' },
    { to: '/posts/new', label: 'New Post', icon: 'create' },
    { to: '/blogs', label: 'Blogs', icon: 'blog' },
    { to: '/blogs/new', label: 'New Blog', icon: 'blogCreate' },
    { to: '/gallery', label: 'Gallery', icon: 'gallery' },
    { to: '/uploads', label: 'Uploads', icon: 'uploads' },
    { to: '/review', label: 'Review Queue', icon: 'review' },
  ],
};

export const GENERAL_NAV_ITEMS = [];
