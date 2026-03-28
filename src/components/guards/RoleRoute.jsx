import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function RoleRoute({ roles, children }) {
  const { loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="app-loader">
        <div className="app-loader__spinner" />
      </div>
    );
  }

  if (!roles.includes(profile?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RoleRoute;
