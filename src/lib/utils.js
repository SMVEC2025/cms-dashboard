import { format } from 'date-fns';
import { POST_STATUS } from './constants';

export function slugify(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  if (!value) {
    return 'Not scheduled';
  }

  try {
    return format(new Date(value), pattern);
  } catch {
    return value;
  }
}

export function formatDateTime(date, time) {
  if (!date && !time) {
    return 'Schedule pending';
  }

  const dateLabel = date ? formatDate(date) : 'Date TBD';
  return time ? `${dateLabel} at ${time}` : dateLabel;
}

export function getCollegeName(collegeId, colleges = []) {
  if (!collegeId) {
    return 'College not selected';
  }

  return colleges.find((college) => college.id === collegeId)?.name || 'College not selected';
}

export function formatStatusLabel(status) {
  const map = {
    [POST_STATUS.DRAFT]: 'Draft',
    [POST_STATUS.SUBMITTED]: 'Pending Review',
    [POST_STATUS.REVISION]: 'Revision Requested',
    [POST_STATUS.APPROVED]: 'Approved',
    [POST_STATUS.REJECTED]: 'Rejected',
    [POST_STATUS.PUBLISHED]: 'Published',
  };

  return map[status] || status;
}

export function formatPostTypeLabel(postType) {
  const map = {
    news: 'News',
    event: 'Event',
    blog: 'Blog',
  };

  return map[postType] || postType;
}

export function parseTagInput(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function tagsToInput(tags = []) {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

export function stripHtml(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function readingTimeFromHtml(value = '') {
  const words = stripHtml(value).split(' ').filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} min read`;
}
