/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext, useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import AuthModal from '../components/Auth/AuthModal';
import { AppContext } from '../context/AppContext';

export default function Auth({ defaultView }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useContext(AppContext);

  const redirectParam = searchParams.get('redirect') || sessionStorage.getItem('authRedirect');

  const isReset = defaultView === 'reset-password' ||
    location.pathname.includes('/reset-password') ||
    searchParams.get('view') === 'reset-password' ||
    Boolean(searchParams.get('token') || searchParams.get('resetToken') || searchParams.get('code'));

  // Seamless UX: If already authenticated, redirect immediately to target page or account
  useEffect(() => {
    if (isAuthenticated && user && !isReset) {
      sessionStorage.removeItem('authRedirect');
      if (redirectParam) {
        navigate(redirectParam === 'checkout' ? '/checkout' : (redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`), { replace: true });
      } else {
        const isAdminUser = ['admin', 'super-admin', 'super_admin', 'owner'].includes((user.role || '').toLowerCase()) || user.userType === 'admin';
        // For storefront visits, go to account or homepage
        navigate('/account', { replace: true });
      }
    }
  }, [isAuthenticated, user, isReset, navigate, redirectParam]);

  const isSignup = !isReset && (defaultView === 'signup' ||
    location.pathname.includes('/signup') ||
    searchParams.get('mode') === 'signup');

  return (
    <AuthModal
      isOpen={true}
      embedded={true}
      initialView={isReset ? 'reset-password' : (isSignup ? 'signup' : 'login')}
    />
  );
}
