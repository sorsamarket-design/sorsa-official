import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'brand' | 'creator';
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a role is required but the session metadata hasn't caught up yet, 
  // we show the loading state instead of redirecting to the wrong dashboard.
  if (requiredRole && role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0A0F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan"></div>
        <p className="ml-4 text-white/60">Verifying account role...</p>
      </div>
    );
  }

  if (requiredRole && role !== requiredRole) {
    // Only redirect if the role is actually known and wrong
    const fallback = role === 'brand' ? '/brand/dashboard' : '/creator/dashboard';
    
    // Check if we're already AT the fallback to avoid loops
    if (location.pathname === fallback) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0A0F] text-white">
          <p>You don't have permission to access this page ({requiredRole} required, found {role}).</p>
        </div>
      );
    }
    
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
