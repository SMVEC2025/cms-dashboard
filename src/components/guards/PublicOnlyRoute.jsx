import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated, requiresCollegeSelection } = useAuth();

  if (loading) {
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
