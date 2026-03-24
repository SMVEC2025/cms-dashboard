import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import PublicOnlyRoute from '@/components/guards/PublicOnlyRoute';
import RoleRoute from '@/components/guards/RoleRoute';

// Eager-load small outer pages to avoid full-page flash
import LoginPage from '@/pages/auth/LoginPage';
import CollegeSelectionPage from '@/pages/auth/CollegeSelectionPage';
import PreviewPage from '@/pages/posts/PreviewPage';

// Lazy-load dashboard pages — Suspense is inside AppShell so only content area shows loader
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const PostListPage = lazy(() => import('@/pages/posts/PostListPage'));
const PostEditorPage = lazy(() => import('@/pages/posts/PostEditorPage'));
const ReviewQueuePage = lazy(() => import('@/pages/admin/ReviewQueuePage'));
const GalleryPage = lazy(() => import('@/pages/media/GalleryPage'));
const UploadsPage = lazy(() => import('@/pages/media/UploadsPage'));

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/select-college"
        element={
          <ProtectedRoute>
            <CollegeSelectionPage />
          </ProtectedRoute>
        }
      />

      {/* Standalone preview page — opens in a new tab */}
      <Route path="/preview" element={<PreviewPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute requireCollege>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="posts" element={<PostListPage />} />
        <Route path="posts/new" element={<PostEditorPage />} />
        <Route path="posts/:postId/edit" element={<PostEditorPage />} />
        <Route path="blogs" element={<PostListPage />} />
        <Route path="blogs/new" element={<PostEditorPage />} />
        <Route path="blogs/:postId/edit" element={<PostEditorPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="uploads" element={<UploadsPage />} />
        <Route
          path="review"
          element={
            <RoleRoute roles={['admin']}>
              <ReviewQueuePage />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
