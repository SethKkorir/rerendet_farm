// src/components/Admin/AdminRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const AdminRoute = ({ children, requiredRole = 'admin' }) => {
  const { user, userType, isAuthenticated } = useContext(AppContext);

  console.log('🔍 AdminRoute check:', {
    isAuthenticated,
    hasUser: !!user,
    userType,
    userUserType: user?.userType,
    userRole: user?.role,
    requiredRole
  });

  // Check authentication first with synchronous localStorage fallback to prevent state propagation race conditions
  if (!isAuthenticated || !user) {
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        if (parsed.userType === 'admin' || parsed.user?.role === 'admin' || parsed.user?.role === 'super-admin') {
          console.log('⏳ Local session matches admin, waiting for React state propagation...');
          return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121212' }}>
              <div className="btn-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.1)', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          );
        }
      } catch (e) {
        console.error('Failed to parse local session:', e);
      }
    }

    console.log('❌ No user or not authenticated, redirecting to login');
    const adminSegment = import.meta.env.VITE_ADMIN_PATH_SEGMENT || 'admin';
    return <Navigate to={`/admin/${adminSegment}/login`} replace />;
  }

  // PRIMARY FIX: Simplified logic - use BOTH state and user object for robustness
  // But trust the actual user object from backend as source of truth
  const isAdminByType = user.userType === 'admin' ||
    user.role === 'admin' ||
    user.role === 'super-admin';

  if (!isAdminByType) {
    console.warn('⛔ AdminRoute Access Denied: User is not an admin', { email: user.email, userType: user.userType, role: user.role });
    return <Navigate to="/" replace />;
  }

  // FIX: For basic admin routes (requiredRole === 'admin'), grant access immediately
  // This allows any admin to access /admin and basic admin routes
  if (requiredRole === 'admin') {
    console.log('✅ AdminRoute access granted (basic admin route)');
    return children;
  }

  // ONLY for routes requiring specific roles (super-admin, etc.), check role hierarchy
  console.log('🔐 Checking role hierarchy for required role:', requiredRole);

  // Normalize role (handle both 'super-admin' and 'super_admin')
  const userRole = user.role || 'admin';
  const normalizedRole = userRole.replace('_', '-'); // Standardize to use hyphens
  const normalizedRequiredRole = requiredRole?.replace('_', '-') || 'admin';

  // Role hierarchy definition
  const roleHierarchy = {
    'support': ['support'],
    'moderator': ['support', 'moderator'],
    'admin': ['support', 'moderator', 'admin'],
    'super-admin': ['support', 'moderator', 'admin', 'super-admin']
  };

  // Check if user has required role or higher
  const allowedRoles = roleHierarchy[normalizedRequiredRole] ||
    roleHierarchy[requiredRole] ||
    roleHierarchy['admin'];

  const hasRequiredRole = allowedRoles.includes(userRole) ||
    allowedRoles.includes(normalizedRole);

  console.log('📊 Role check details:', {
    userRole,
    normalizedRole,
    requiredRole: normalizedRequiredRole,
    allowedRoles,
    hasRequiredRole
  });

  if (!hasRequiredRole) {
    console.log('❌ User does not have required role for privileged route:', {
      userRole,
      requiredRole: normalizedRequiredRole
    });
    return (
      <div className="access-denied" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Required role: {requiredRole}, Your role: {userRole || 'admin'}
        </p>
        <button
          onClick={() => window.history.back()}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  console.log('✅ AdminRoute access granted (role-based route)');
  return children;
};

export default AdminRoute;