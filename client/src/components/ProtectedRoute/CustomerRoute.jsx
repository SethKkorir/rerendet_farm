// client/src/components/ProtectedRoute/CustomerRoute.jsx - ZERO TRUST CUSTOMER GUARD
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import BrandLoader from '../UI/BrandLoader';

export default function CustomerRoute({ children }) {
  const { user, isAuthenticated, authLoading } = useContext(AppContext);
  const location = useLocation();

  if (authLoading) {
    return <BrandLoader fullScreen subtitle="AUTHENTICATING CUSTOMER PORTAL" />;
  }

  // Not authenticated -> redirect to login with return path
  if (!isAuthenticated || !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children;
}

