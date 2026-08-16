import { Navigate, Outlet } from 'react-router-dom';
import { LoadingState } from '../components/common/LoadingState';
import { useAuth } from './AuthContext';

/** Gate for authenticated routes. Optionally restrict by role. */
export function ProtectedRoute({ roles }) {
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingState full />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
