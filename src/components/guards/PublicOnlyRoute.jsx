import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated, profile, requiresCollegeSelection } = useAuth();

  if (loading || (isAuthenticated && !profile)) {
    return (
      <div className="app-loader">
        <div className="app-loader__spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={requiresCollegeSelection ? '/select-college' : '/'} replace />;
  }

  return children;
}

export default PublicOnlyRoute;
