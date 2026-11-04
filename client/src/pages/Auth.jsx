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
  const { isAuthenticated } = useContext(AppContext);

  const redirectParam = searchParams.get('redirect') || sessionStorage.getItem('authRedirect') || 'account';

  const isReset = defaultView === 'reset-password' ||
                  location.pathname.includes('/reset-password') ||
                  searchParams.get('view') === 'reset-password' ||
                  Boolean(searchParams.get('token') || searchParams.get('resetToken') || searchParams.get('code'));

  // If already authenticated and NOT in reset flow, redirect to destination
  useEffect(() => {
    if (isAuthenticated && !isReset) {
      navigate(redirectParam === 'checkout' ? '/checkout' : (redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`));
    }
  }, [isAuthenticated, isReset, navigate, redirectParam]);

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
