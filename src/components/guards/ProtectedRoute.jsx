import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';

function ProtectedRoute({ children, requireCollege = false }) {
  const location = useLocation();
  const { loading, isAuthenticated, profile, requiresCollegeSelection } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-shell auth-shell--centered">
        <div className="auth-card auth-card--compact">
          <span className="eyebrow">Setup required</span>
          <h1>Connect Supabase to continue</h1>
          <p>Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to start using the CMS.</p>
        </div>
      </div>
    );
  }

  if (loading || (isAuthenticated && !profile)) {
    return (
      <div className="app-loader">
        <div className="app-loader__spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireCollege && requiresCollegeSelection) {
    return <Navigate to="/select-college" replace />;
  }

  return children;
}

export default ProtectedRoute;
