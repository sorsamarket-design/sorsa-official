import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'brand' | 'creator' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { session, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0A0F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan"></div>
      </div>
    );
  }

  if (!session) {
    const loginPath = requiredRole === 'admin' ? '/auth/admin' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (requiredRole && role === null) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0B0A0F] text-red-400">Error</div>;
  }

  const canAccessRequiredRole =
    !requiredRole ||
    role === requiredRole ||
    (requiredRole === 'brand' && role === 'creator');

  if (requiredRole && !canAccessRequiredRole) {
    if (requiredRole === 'admin') {
      return <Navigate to="/auth/admin" state={{ from: location }} replace />;
    }

    const fallback = role === 'brand' ? '/brand/dashboard' : role === 'admin' ? '/admin/dashboard' : '/creator/campaigns';
    if (location.pathname === fallback) {
      return <div className="min-h-screen flex items-center justify-center bg-[#0B0A0F] text-red-400">Error</div>;
    }
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
