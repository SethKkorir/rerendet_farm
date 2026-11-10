// src/components/Admin/AdminRoute.jsx - ZERO TRUST ADMIN GUARD
import React, { useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import BrandLoader from '../UI/BrandLoader';

const AdminRoute = ({ children, requiredRole = 'admin' }) => {
  const { user, isAuthenticated, authLoading, logout, setAuth } = useContext(AppContext);
  const navigate = useNavigate();

  if (authLoading) {
    return <BrandLoader fullScreen subtitle="ADMIN CONSOLE SECURE GATE" />;
  }

  // 1. Unauthenticated -> inspect role-isolated admin storage before redirecting
  if (!isAuthenticated || !user) {
    const storedAdmin = localStorage.getItem('admin_auth');
    if (storedAdmin) {
      try {
        const parsed = JSON.parse(storedAdmin);
        const parsedRole = (parsed.user?.role || parsed.userType || '').toLowerCase();
        const isValidAdmin = ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(parsedRole);
        if (isValidAdmin && parsed.user && parsed.token && typeof setAuth === 'function') {
          // Immediately rehydrate state synchronously
          setAuth(parsed.user, parsed.token, 'admin', true);
          return <BrandLoader fullScreen subtitle="RECONNECTING ADMIN GATE" />;
        }
      } catch (e) {}
    }

    const adminSegment = import.meta.env.VITE_ADMIN_PATH_SEGMENT || 'admin';
    return <Navigate to={`/admin/${adminSegment}/login`} replace />;
  }

  // 2. Authenticated as non-admin (Customer role isolation) -> Deny Access
  const userRole = (user.role || '').toLowerCase();
  const isAdmin = ['admin', 'super-admin', 'super_admin', 'owner'].includes(userRole) || user.userType === 'admin';

  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B0F19',
        color: '#F9FAFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: '#111827',
          border: '1px solid #1F2937',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#EF4444' }}>
            Access Denied
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            You are currently signed in as <strong>{user.email}</strong> (<span style={{ textTransform: 'capitalize' }}>{user.role || 'customer'}</span>). Administrative privileges are required to view this console.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/account')}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                background: '#1E3D2F',
                color: '#E8DCC4',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Go to Customer Account
            </button>
            <button
              onClick={async () => {
                await logout();
                const adminSegment = import.meta.env.VITE_ADMIN_PATH_SEGMENT || 'admin';
                navigate(`/admin/${adminSegment}/login`);
              }}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                background: '#374151',
                color: '#F9FAFB',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Log Out & Switch
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Specific role hierarchy check if requiredRole is more privileged (e.g. super-admin)
  if (requiredRole && requiredRole !== 'admin') {
    const isSuperAdmin = ['super-admin', 'super_admin', 'owner'].includes(userRole);
    if (!isSuperAdmin) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#fff' }}>
          <h2>Permission Denied</h2>
          <p>Required privilege level: <strong>{requiredRole}</strong></p>
          <button onClick={() => navigate('/admin')} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Return to Dashboard
          </button>
        </div>
      );
    }
  }

  return children;
};

export default AdminRoute;
