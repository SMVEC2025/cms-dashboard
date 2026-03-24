export const APP_NAME = import.meta.env.VITE_APP_NAME || 'SMVEC CMS';

export const COLLEGES = [
  { id: 'smvec-engineering-college', name: 'SMVEC Engineering college' },
  { id: 'smvsas-arts-and-science', name: 'SMVSAS Arts and Science' },
  { id: 'smvec-centre-of-legal-education', name: 'SMVEC Centre of legal education' },
  { id: 'smvec-school-of-agricultural-science', name: 'SMVEC school of agricultural science' },
  { id: 'smvec-allied-health-science', name: 'SMVEC Allied Health Science' },
  { id: 'smv-school', name: 'SMV School' },
  { id: 'takshashila-university', name: 'Takshashila University' },
  { id: 'takshashila-engineering-college', name: 'Takshashila Engineering college' },
  { id: 'takshashila-medical-college', name: 'Takshashila Medical college' },
  { id: 'smvec', name: 'SMVEC' },
  { id: 'smvmch-college-and-hospital', name: 'SMVMCH College and hospital' },
  { id: 'mvit', name: 'MVIT' },
  { id: 'smv-super-speciality-hospital', name: 'SMV Super speciality hospital' },
  { id: 'mailam-engineering-college', name: 'Mailam engineering college' },
];

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
    { to: '/posts', label: 'Posts', icon: 'content' },
    { to: '/posts/new', label: 'New Post', icon: 'create' },
    { to: '/blogs', label: 'Blogs', icon: 'blog' },
    { to: '/blogs/new', label: 'New Blog', icon: 'blogCreate' },
    { to: '/gallery', label: 'Gallery', icon: 'gallery' },
    { to: '/uploads', label: 'Uploads', icon: 'uploads' },
  ],
  admin: [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
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
