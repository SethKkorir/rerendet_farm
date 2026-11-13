// src/components/Admin/AdminLogin.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../api/api';
import './AdminLogin.css';

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('login');
  const [code, setCode] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [formDestroyed, setFormDestroyed] = useState(false);

  const { user, isAuthenticated, loginAdmin, verifyAdmin2FA, showNotification } = useContext(AppContext);
  const navigate = useNavigate();

  // Refs for uncontrolled credential inputs (Layer 1)
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const formRef = useRef(null);
  const challengeRef = useRef('');
  const keystrokeTimings = useRef([]); // (Layer 5)

  // Inactivity / blur timers (Layer 4)
  const blurTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  // Fetch challenge from server (Layer 2)
  const fetchChallenge = async () => {
    try {
      const res = await API.get('/auth/admin/challenge');
      challengeRef.current = res.data.challenge;
    } catch (err) {
      console.error('Failed to load login challenge', err);
    }
  };

  // Seamless redirect if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated && user) {
      const roleName = (user.role || user.userType || '').toLowerCase();
      const isAdmin = ['admin', 'super-admin', 'super_admin', 'owner'].includes(roleName);
      if (isAdmin) {
        navigate('/admin', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch challenge on mount (Layer 2)
  useEffect(() => {
    fetchChallenge();
  }, []);

  // Form Auto-Destruction on Inactivity & Tab Switch (Layer 4)
  const destroyForm = async () => {
    if (emailRef.current) emailRef.current.value = '';
    if (passwordRef.current) passwordRef.current.value = '';
    setError('');
    challengeRef.current = '';
    await fetchChallenge();
    setFormDestroyed(true);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      destroyForm();
    }, 15 * 60 * 1000); // 15 minutes
  };

  useEffect(() => {
    // Initial inactivity timer (relaxed to 15m)
    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  // Keyboard interaction restores destroyed form
  const handleFormKeyDown = (e) => {
    if (formDestroyed) {
      setFormDestroyed(false);
    }
    resetInactivityTimer();
  };

  // Keystroke Timing analysis (Layer 5)
  const handleEmailKeyDown = (e) => {
    keystrokeTimings.current.push(Date.now());
    if (keystrokeTimings.current.length > 10) {
      keystrokeTimings.current.shift();
    }
  };

  // Resend timer countdown effect
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  // DOM Integrity Monitoring (Layer 6) — Monitored specifically in primary login view
  // Verifies form destination, structure, and detects injection attacks (scripts, iframes, malicious action/inputs)
  // without false positives from React state changes (loading/showPassword) or browser autofill/extensions
  useEffect(() => {
    let integrityInterval = null;

    if (step !== 'login') {
      return;
    }

    const checkDOMIntegrity = () => {
      const form = formRef.current;
      if (!form || step !== 'login') return true;

      // 1. Verify no malicious external action attribute has been injected onto the form
      const action = form.getAttribute('action');
      if (action && action !== '' && action !== '#' && !action.startsWith('/')) {
        return false;
      }

      // 2. Check for injected malicious executable elements (scripts, iframes, embeds, objects)
      const maliciousElements = form.querySelectorAll('script, iframe, embed, object');
      if (maliciousElements.length > 0) {
        return false;
      }

      // 3. Check for unauthorized input elements or malicious formaction overrides
      const inputs = form.querySelectorAll('input');
      const allowedNames = new Set(['email', 'password', 'bot_trap', 'code']);
      for (const input of inputs) {
        const name = input.getAttribute('name');
        if (name && !allowedNames.has(name)) {
          return false;
        }
        const formaction = input.getAttribute('formaction');
        if (formaction && !formaction.startsWith('/')) {
          return false;
        }
      }

      // 4. Verify critical inputs remain present and attached to the form
      if (emailRef.current && !form.contains(emailRef.current)) {
        return false;
      }
      if (passwordRef.current && !form.contains(passwordRef.current)) {
        return false;
      }

      return true;
    };

    integrityInterval = setInterval(async () => {
      // Skip check while form is destroyed, submitting, or view has changed
      if (formDestroyed || loading || step !== 'login' || !formRef.current) {
        return;
      }

      const isValid = checkDOMIntegrity();
      if (!isValid) {
        // DOM Tampered!
        if (emailRef.current) emailRef.current.value = '';
        if (passwordRef.current) passwordRef.current.value = '';
        clearInterval(integrityInterval);
        setError('Security check failed. Please contact the administrator.');
        setFormDestroyed(true);

        // Dispatch alert (X-Internal-Alert header set by backend config)
        try {
          await API.post('/auth/admin/security-alert', {
            type: 'dom_tampering',
            ip: 'client-side-detected',
            timestamp: new Date().toISOString()
          }, {
            headers: {
              'X-Internal-Alert': import.meta.env.VITE_INTERNAL_ALERT_SECRET || 'static_internal_security_alert_secret'
            }
          });
        } catch (alertErr) {
          console.error('Failed to submit security alert:', alertErr);
        }
      }
    }, 5000);

    return () => {
      if (integrityInterval) clearInterval(integrityInterval);
    };
  }, [step, loading, formDestroyed]);

  const handleChange = () => {
    setError('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    // Inner helper to preserve credentials in closure scope after DOM inputs are cleared (Layer 1 & 2)
    const attemptLogin = async (emailVal, passwordVal, retryAttempt) => {
      try {
        if (step === 'login') {
          const challenge = challengeRef.current;
          if (!challenge) {
            throw new Error('No authentication challenge loaded. Please refresh.');
          }

          // SubtleCrypto Web API HMAC computation
          const encoder = new TextEncoder();
          const encodedChallenge = encoder.encode(challenge);
          const key = await crypto.subtle.importKey(
            'raw',
            encodedChallenge,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          const credentialString = `${challenge}:${emailVal}:${passwordVal}`;
          const encodedCredentials = encoder.encode(credentialString);
          const sigBuffer = await crypto.subtle.sign('HMAC', key, encodedCredentials);
          const challengeHash = Array.from(new Uint8Array(sigBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          // Keystroke Timing analysis score calculation (Layer 5)
          let botSuspicion = false;
          const timings = keystrokeTimings.current;
          if (timings.length >= 5) {
            const intervals = [];
            for (let i = 1; i < timings.length; i++) {
              intervals.push(timings[i] - timings[i - 1]);
            }
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);
            const coeffOfVariation = stdDev / (mean || 1);
            if (coeffOfVariation < 0.1) {
              botSuspicion = true;
            }
          }

          // XOR encrypt the password with the challenge token so raw password is never sent in cleartext
          let xorEncrypted = '';
          for (let i = 0; i < passwordVal.length; i++) {
            xorEncrypted += String.fromCharCode(passwordVal.charCodeAt(i) ^ challenge.charCodeAt(i % challenge.length));
          }
          const encryptedPassword = btoa(xorEncrypted);

          const response = await loginAdmin({
            email: emailVal,
            challengeHash,
            challenge,
            encryptedPassword,
            botSuspicion
          });

          if (response.requires2FA) {
            setSubmittedEmail(emailVal);
            setStep('2fa');
            setResendTimer(60);
            setShowPassword(false);
            showNotification('Verification code sent to your email', 'info');
          } else {
            navigate('/admin');
          }
        } else {
          const targetEmail = submittedEmail || emailVal;
          await verifyAdmin2FA(targetEmail, code);
          navigate('/admin');
        }
      } catch (err) {
        // Auto-retry once on challenge expired error (Layer 2)
        if (err.response?.status === 401 && err.response?.data?.message?.toLowerCase().includes('challenge') && !retryAttempt) {
          try {
            await fetchChallenge();
            return attemptLogin(emailVal, passwordVal, true);
          } catch (retryErr) {
            setError('Authentication challenge expired and retry failed.');
          }
        } else {
          setError(err.response?.data?.message || err.message || 'Login failed');
        }
      } finally {
        setLoading(false);
      }
    };

    if (step === 'login') {
      const currentEmail = emailRef.current?.value || '';
      const currentPassword = passwordRef.current?.value || '';
      setSubmittedEmail(currentEmail);

      // Clear DOM inputs immediately to prevent memory leaks/sniffing (Layer 1)
      if (emailRef.current) emailRef.current.value = '';
      if (passwordRef.current) passwordRef.current.value = '';

      attemptLogin(currentEmail, currentPassword, false);
    } else {
      attemptLogin(submittedEmail, '', false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0 || loading || !submittedEmail) return;
    setLoading(true);
    try {
      await API.post('/auth/resend-verification', { email: submittedEmail });
      showNotification('A fresh verification code has been sent to your email.', 'success');
      setResendTimer(60);
      setCode('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setStep('login');
    setCode('');
    setError('');
    setShowPassword(false);
    fetchChallenge();
  };

  const preventAction = (e) => e.preventDefault();

  return (
    <div className="adl-page">
      <div className="adl-ambient-glow" />
      <div className="adl-ambient-spotlight" />

      <motion.div
        className="adl-card"
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="adl-topbar">
          {step === '2fa' ? (
            <button className="adl-icon-btn" onClick={handleGoBack} aria-label="Go back">
              <FaArrowLeft />
            </button>
          ) : (
            <a href="/" className="adl-store-link" title="Return to Storefront">
              <FaArrowLeft /> <span>Store</span>
            </a>
          )}
        </div>

        <div className="adl-header">
          <div className="adl-logo-wrap">
            <img src="/rerendet-logo.png" alt="Rerendet Coffee" className="adl-logo" />
          </div>
          <h1 className="adl-title">
            {step === 'login' ? 'Admin Portal' : 'Verify Identity'}
          </h1>
          <p className="adl-subtitle">
            {step === 'login'
              ? 'Restricted to authorised administrators only'
              : 'Enter verification code for account'}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="adl-error"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: '18px' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            >
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {formDestroyed ? (
          <div className="adl-destroyed-message" onClick={() => setFormDestroyed(false)}>
            <p>Session cleared for security. Click here or begin typing to continue.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="adl-form"
            ref={formRef}
            onMouseMove={resetInactivityTimer}
            onTouchStart={resetInactivityTimer}
            onKeyDown={handleFormKeyDown}
          >
            <AnimatePresence mode="wait">
              {step === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="adl-fields"
                >
                  <div className="adl-field">
                    <label className="adl-label" htmlFor="adl-email">Email Address</label>
                    <div className="adl-input-wrap">
                      <input
                        id="adl-email"
                        type="email"
                        name="email"
                        ref={emailRef}
                        defaultValue=""
                        onChange={handleChange}
                        onKeyDown={handleEmailKeyDown}
                        placeholder="admin@rerendetcoffee.com"
                        required
                        disabled={loading}
                        className="adl-input"
                        autoComplete="off"
                        spellCheck="false"
                        onPaste={preventAction}
                      />
                      <FaEnvelope className="adl-input-icon" />
                    </div>
                  </div>

                  <div className="adl-field">
                    <label className="adl-label" htmlFor="adl-password">Password</label>
                    <div className="adl-input-wrap">
                      <input
                        id="adl-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        ref={passwordRef}
                        defaultValue=""
                        onChange={handleChange}
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                        className="adl-input"
                        autoComplete="current-password"
                        spellCheck="false"
                        onCopy={preventAction}
                        onPaste={preventAction}
                        onCut={preventAction}
                      />
                      <button
                        type="button"
                        className="adl-input-icon adl-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <input type="text" name="bot_trap" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />
                </motion.div>
              ) : (
                <motion.div
                  key="2fa"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="adl-fields"
                >
                  <div className="adl-field">
                    <label className="adl-label" htmlFor="adl-code">6-Digit Security Code</label>
                    <input
                      id="adl-code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                      disabled={loading}
                      className="adl-input adl-input--otp"
                      autoFocus
                      autoComplete="one-time-code"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.25rem' }}>
                    {resendTimer > 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        Resend code in {resendTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={loading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d8964e',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Resend Verification Code
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" className="adl-submit" disabled={loading}>
              {loading ? (
                <span className="adl-spinner" />
              ) : (
                step === 'login' ? 'Authorize Access' : 'Verify & Enter'
              )}
            </button>
          </form>
        )}

        <div className="adl-footer">
          <FaShieldAlt className="adl-footer-icon" />
          <span>256-Bit Encrypted Administrative Session</span>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;