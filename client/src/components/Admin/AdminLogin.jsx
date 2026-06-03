// src/components/Admin/AdminLogin.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../api/api';
import './AdminLogin.css';

let initialFormHash = null;

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('login');
  const [code, setCode] = useState('');
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

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'super-admin' || user.userType === 'admin')) {
      navigate('/admin');
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
    }, 90000); // 90 seconds
  };

  useEffect(() => {
    // Visibility and Blur check
    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurTimerRef.current = setTimeout(destroyForm, 30000); // 30 seconds
      } else {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      }
    };

    const handleWindowBlur = () => {
      blurTimerRef.current = setTimeout(destroyForm, 30000);
    };

    const handleWindowFocus = () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Initial inactivity timer
    resetInactivityTimer();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
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

  // DOM Integrity Monitoring (Layer 6)
  useEffect(() => {
    let integrityInterval = null;
    
    const sanitizeFormHTML = (html) => {
      if (!html) return '';
      return html
        .replace(/value="[^"]*"/g, '')
        .replace(/disabled/g, '')
        .replace(/placeholder="[^"]*"/g, '')
        .replace(/class="[^"]*"/g, '')
        .replace(/style="[^"]*"/g, '')
        .replace(/autocomplete="[^"]*"/g, '')
        .replace(/\s+/g, '');
    };

    const computeHash = async (html) => {
      const sanitized = sanitizeFormHTML(html);
      const encoded = new TextEncoder().encode(sanitized);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    };

    const setupIntegrity = async () => {
      if (formRef.current) {
        initialFormHash = await computeHash(formRef.current.innerHTML);
        
        integrityInterval = setInterval(async () => {
          if (formRef.current) {
            const currentHash = await computeHash(formRef.current.innerHTML);
            if (initialFormHash && currentHash !== initialFormHash) {
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
          }
        }, 5000);
      }
    };

    // Wait slightly for DOM to settle
    setTimeout(setupIntegrity, 500);

    return () => {
      if (integrityInterval) clearInterval(integrityInterval);
    };
  }, []);

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
            setStep('2fa');
            setShowPassword(false);
            showNotification('Verification code sent to your email', 'info');
          } else {
            navigate('/admin');
          }
        } else {
          await verifyAdmin2FA(emailVal, code);
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

    const currentEmail = emailRef.current?.value || '';
    const currentPassword = passwordRef.current?.value || '';

    // Clear DOM inputs immediately to prevent memory leaks/sniffing (Layer 1)
    if (emailRef.current) emailRef.current.value = '';
    if (passwordRef.current) passwordRef.current.value = '';

    attemptLogin(currentEmail, currentPassword, false);
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
      <div className="adl-glow adl-glow--gold" />
      <div className="adl-glow adl-glow--blue" />

      <motion.div
        className="adl-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="adl-topbar">
          {step === '2fa' && (
            <button className="adl-icon-btn" onClick={handleGoBack} aria-label="Go back">
              <FaArrowLeft />
            </button>
          )}
          <span className="adl-badge">SECURE PORTAL</span>
        </div>

        <div className="adl-header">
          <img src="/rerendet-logo.png" alt="Rerendet Coffee" className="adl-logo" />
          <h1 className="adl-title">
            {step === 'login' ? 'Admin Portal' : 'Verify Identity'}
          </h1>
          <p className="adl-subtitle">
            {step === 'login'
              ? 'Restricted to authorised administrators only'
              : `Code verification for account`}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="adl-error"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: '20px' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            >
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {formDestroyed ? (
          <div className="adl-destroyed-message" onClick={() => setFormDestroyed(false)} style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer', color: '#D4AF37' }}>
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
          <span>End-to-end encrypted session</span>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;