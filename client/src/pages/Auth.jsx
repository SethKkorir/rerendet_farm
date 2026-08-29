/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Lock, Mail, User, ShieldAlert, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { forgotPassword, resetPassword, resendVerification } from '../api/api';
import './Auth.css';

export default function Auth() {
  const { login, register, verify2FA, verifyEmail, loading, isAuthenticated, showAlert } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Modes: 'login', 'signup', 'forgot-password', 'reset-password', 'verify-email', '2fa-login'
  const modeParam = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState(modeParam);

  // Redirect handling
  const redirectParam = searchParams.get('redirect') || 'account';

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verification & Reset states
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);

  // Sync with search param changes
  useEffect(() => {
    setMode(modeParam);
    setError('');
  }, [modeParam]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && mode !== 'verify-email' && mode !== '2fa-login') {
      navigate(redirectParam === 'checkout' ? '/checkout' : '/account');
    }
  }, [isAuthenticated, navigate, mode, redirectParam]);

  // Resend timer countdown
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Password strength logic
  const evaluatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Empty', color: '#666', feedback: 'Enter a secure password' };
    let score = 0;
    
    // Length check
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    
    // Diversity check
    let hasLower = /[a-z]/.test(pass);
    let hasUpper = /[A-Z]/.test(pass);
    let hasDigit = /\d/.test(pass);
    let hasSpecial = /[^A-Za-z0-9]/.test(pass);
    
    const diversityCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
    if (diversityCount >= 3) score++;
    if (diversityCount === 4 && pass.length >= 10) score++;
    
    if (score > 4) score = 4;
    
    const colors = ['#e11d48', '#f97316', '#eab308', '#22c55e', '#10b981'];
    const labels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
    const feedbacks = [
        'Add uppercase, numbers, or symbols',
        'Make it longer with mixed characters',
        'Good, but could be longer',
        'Secure password!',
        'Ultra secure, perfect password!'
    ];
    
    return {
        score,
        label: labels[score],
        color: colors[score],
        feedback: feedbacks[score]
    };
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!email || !password) {
        setError('Please fill in all fields.');
        return;
      }
      try {
        const data = await login({ email, password });
        if (data?.requires2FA) {
          setMode('2fa-login');
          setVerificationCode(['', '', '', '', '', '']);
        } else {
          navigate(redirectParam === 'checkout' ? '/checkout' : '/account');
        }
      } catch (err) {
        setPassword('');
        setError(err.response?.data?.message || err.message || 'Login failed');
      }
    } else if (mode === 'signup') {
      if (!fullName || !email || !password || !confirmPassword) {
        setError('Please fill in all fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '.';

      try {
        await register({
          firstName,
          lastName,
          email,
          password
        });
        setMode('verify-email');
        setVerificationCode(['', '', '', '', '', '']);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Registration failed');
      }
    } else if (mode === 'forgot-password') {
      if (!email) {
        setError('Please enter your email address.');
        return;
      }
      try {
        await forgotPassword({ email });
        showAlert('Reset code sent to your email', 'success');
        setMode('reset-password');
        setVerificationCode(['', '', '', '', '', '']);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to send reset code');
      }
    } else if (mode === 'reset-password') {
      const code = verificationCode.join('');
      if (code.length !== 6) {
        setError('Please enter the complete 6-digit code.');
        return;
      }
      if (!password || !confirmPassword) {
        setError('Please fill in password fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      try {
        await resetPassword({
          email,
          code,
          newPassword: password
        });
        showAlert('Password reset successfully! Please login.', 'success');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Password reset failed');
      }
    }
  };

  // OTP Verification Handlers
  const handleVerificationSubmit = async (forcedCode = null) => {
    setError('');
    const code = forcedCode || verificationCode.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    try {
      if (mode === '2fa-login') {
        await verify2FA(email, code);
        navigate(redirectParam === 'checkout' ? '/checkout' : '/account');
      } else {
        await verifyEmail(email, code);
        showAlert('Email verified successfully!', 'success');
        navigate(redirectParam === 'checkout' ? '/checkout' : '/account');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    }
  };

  const handleVerificationInput = (index, value) => {
    const char = value.slice(-1);
    const isHex = mode === 'reset-password';
    const allowedRegex = isHex ? /^[0-9a-fA-F]$/ : /^\d$/;

    if (char && !allowedRegex.test(char)) return;

    const finalChar = (isHex && char) ? char.toLowerCase() : char;
    const newCode = [...verificationCode];
    newCode[index] = finalChar;
    setVerificationCode(newCode);

    if (finalChar && index < 5) {
      const nextInput = document.getElementById(`v-page-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      setTimeout(() => {
        if (mode === 'reset-password') {
          setError('');
        } else {
          handleVerificationSubmit(fullCode);
        }
      }, 100);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`v-page-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const isHex = mode === 'reset-password';
    const allowedRegex = isHex ? /^[0-9a-fA-F]+$/ : /^\d+$/;

    if (!allowedRegex.test(pastedData)) return;

    const finalPasted = isHex ? pastedData.toLowerCase() : pastedData;
    const newCode = finalPasted.split('').concat(Array(6 - finalPasted.length).fill('')).slice(0, 6);
    setVerificationCode(newCode);

    const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
    const nextInput = document.getElementById(`v-page-${nextIndex}`);
    if (nextInput) nextInput.focus();

    if (pastedData.length === 6) {
      setTimeout(() => {
        if (mode !== 'reset-password') {
          handleVerificationSubmit(finalPasted);
        }
      }, 100);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    try {
      await resendVerification(email);
      showAlert('A new code has been sent to your email.', 'success');
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    }
  };

  return (
    <div id="auth-page-root" className="auth-page-wrapper">
      <div className="auth-card-embedded">
        <div className="auth-embedded-content">
          
          <div className="auth-header-container">
            {mode !== 'login' && mode !== 'signup' && (
              <button 
                type="button" 
                onClick={() => {
                  setError('');
                  setMode('login');
                }}
                className="auth-back-arrow-btn"
                aria-label="Back to Login"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="auth-brand-logo-container">
              <img src="/rerendet-logo.png" alt="Rerendet Logo" className="auth-brand-logo" />
            </div>
            <p className="auth-header-desc">
              {mode === 'login' && 'Sign in to access your dashboard and checkout.'}
              {mode === 'signup' && 'Create an account to track your orders.'}
              {mode === 'forgot-password' && 'Enter your email to reset your security credentials.'}
              {mode === 'reset-password' && 'Enter reset code and your new password.'}
              {mode === 'verify-email' && 'Please verify your email address to continue.'}
              {mode === '2fa-login' && 'Please verify your identity with two-factor security.'}
            </p>
          </div>

          {error && (
            <div className="auth-error-banner">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <p className="auth-error-text">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-embedded-form">
            {mode === 'signup' && (
              <div className="auth-form-group">
                <label className="auth-form-label">Full Name</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><User className="w-3.5 h-3.5" /></span>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="auth-input-style"
                    required
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'forgot-password' || mode === 'reset-password') && (
              <div className="auth-form-group">
                <label className="auth-form-label">Email</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><Mail className="w-3.5 h-3.5" /></span>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input-style"
                    required
                    disabled={mode === 'reset-password'}
                  />
                </div>
              </div>
            )}

            {(mode === 'verify-email' || mode === '2fa-login' || mode === 'reset-password') && (
              <div className="auth-form-group">
                <label className="auth-form-label">
                  {mode === 'reset-password' ? 'Reset Code' : 'Verification Code'}
                </label>
                <div className="auth-otp-wrapper">
                  {verificationCode.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`v-page-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleVerificationInput(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      className="auth-otp-input"
                    />
                  ))}
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
              <div className="auth-form-group">
                <label className="auth-form-label">
                  {mode === 'reset-password' ? 'New Password' : 'Password'}
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><Lock className="w-3.5 h-3.5" /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input-style"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-password-toggle"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                
                {/* Password strength indicators */}
                {(mode === 'signup' || mode === 'reset-password') && password && (
                  <div className="auth-strength-container" style={{ marginTop: '0.5rem' }}>
                    <div className="auth-strength-bars" style={{ display: 'flex', gap: '4px', height: '4px', margin: '6px 0 4px' }}>
                      {[0, 1, 2, 3].map((index) => {
                        const strength = evaluatePasswordStrength(password);
                        const isActive = strength.score > index;
                        return (
                          <div
                            key={index}
                            style={{
                              flex: 1,
                              height: '100%',
                              borderRadius: '2px',
                              backgroundColor: isActive ? strength.color : 'rgba(255, 255, 255, 0.08)',
                              transition: 'background-color 0.3s ease'
                            }}
                          />
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '600' }}>
                      <span style={{ color: evaluatePasswordStrength(password).color }}>
                        {evaluatePasswordStrength(password).label}
                      </span>
                      <span style={{ color: 'rgba(245, 240, 235, 0.45)' }}>
                        {evaluatePasswordStrength(password).feedback}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(mode === 'signup' || mode === 'reset-password') && (
              <div className="auth-form-group">
                <label className="auth-form-label">Confirm Password</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon"><Lock className="w-3.5 h-3.5" /></span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="auth-input-style"
                    required
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="auth-login-helper-row">
                <label className="auth-remember-me-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="auth-remember-checkbox"
                  />
                  <span>Remember session</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('forgot-password');
                  }}
                  className="auth-forgot-password-link"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <div className="auth-submit-container">
              {mode !== 'verify-email' && mode !== '2fa-login' ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-embedded-auth-submit"
                >
                  {loading ? 'Evaluating security...' : 
                   mode === 'login' ? 'Login' : 
                   mode === 'signup' ? 'Sign Up' : 
                   mode === 'forgot-password' ? 'Send Reset Code' : 
                   'Reset Password'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleVerificationSubmit()}
                  disabled={loading}
                  className="btn-embedded-auth-submit"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {(mode === 'verify-email' || mode === '2fa-login') && (
              <div className="auth-resend-container">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || resendTimer > 0}
                  className="auth-resend-btn"
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div className="auth-switch-mode-container">
                <p className="auth-switch-text">
                  {mode === 'login' ? (
                    <>
                      New here?
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="auth-switch-btn"
                      >
                        create account instead
                      </button>
                    </>
                  ) : (
                    <>
                      Already registered?
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="auth-switch-btn"
                      >
                        Login instead
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}
          </form>

        </div>
      </div>
    </div>
  );
}
