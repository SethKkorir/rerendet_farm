// src/components/Admin/AdminLogin.jsx — Premium Overhaul
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft, FaExclamationCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './AdminLogin.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('login'); // 'login' or '2fa'
  const [code, setCode] = useState('');

  const { user, isAuthenticated, loginAdmin, verifyAdmin2FA, showNotification } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'super-admin' || user.userType === 'admin')) {
      console.log('🔄 Authenticated admin on login page, redirecting to dashboard...');
      navigate('/admin');
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (step === 'login') {
        const response = await loginAdmin(formData);
        if (response.requires2FA) {
          setStep('2fa');
          showNotification('Verification code sent to your email', 'info');
        } else {
          navigate('/admin');
        }
      } else {
        await verifyAdmin2FA(formData.email, code);
        navigate('/admin');
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    showNotification('Security Active: Context menu disabled for your protection', 'info');
  };

  const handlePreventAction = (e) => {
    e.preventDefault();
    showNotification('Security Active: Copy/Paste restricted on this field', 'warning');
  };

  return (
    <div className="admin-login-page" onContextMenu={handleContextMenu}>
      <div className="admin-login-container">
        <motion.div
          className="admin-login-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="login-header">
            <img src="/rerendet-logo.png" alt="Rerendet" className="logo-img" />
            <h2>{step === 'login' ? 'Admin Portal' : 'Identity Verification'}</h2>
            <p>{step === 'login' ? 'Secure access for Rerendet administrators' : 'Enter the security code sent to your email'}</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                className="error-message"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <FaExclamationCircle />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="login-form">
            <AnimatePresence mode="wait">
              {step === 'login' ? (
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
                >
                  <div className="form-group">
                    <label>Email Address</label>
                    <div className="input-wrapper">
                      <FaEnvelope className="input-icon" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="admin@rerendetcoffee.com"
                        required
                        disabled={loading}
                        className="form-input"
                        autoComplete="off"
                        spellCheck="false"
                        data-lpignore="true"
                        onPaste={handlePreventAction}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <div className="input-wrapper">
                      <FaLock className="input-icon" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="form-input"
                        autoComplete="current-password"
                        spellCheck="false"
                        data-lpignore="true"
                        onCopy={handlePreventAction}
                        onPaste={handlePreventAction}
                        onCut={handlePreventAction}
                        onDragStart={handlePreventAction}
                      />
                    </div>
                  </div>

                  {/* Honeypot field to trap bots */}
                  <input type="text" name="bot_trap" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />
                </motion.div>
              ) : (
                <motion.div
                  key="2fa-fields"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="form-group">
                    <label>Authentication Code</label>
                    <div className="input-wrapper">
                      <FaShieldAlt className="input-icon" />
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        required
                        disabled={loading}
                        className="form-input"
                        style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '1.5rem', paddingLeft: '18px' }}
                        autoFocus
                        onPaste={handlePreventAction}
                        autoComplete="one-time-code"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <div className="btn-spinner"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <span>{step === 'login' ? 'Authorize Access' : 'Verify Identity'}</span>
              )}
            </button>

            {step === '2fa' && (
              <button type="button" className="back-btn" onClick={() => setStep('login')}>
                <FaArrowLeft style={{ fontSize: '0.8rem', marginRight: '8px' }} />
                Change Account
              </button>
            )}

            <div className="login-security-footer">
              <FaShieldAlt style={{ color: 'var(--color-primary, #D4AF37)', fontSize: '0.7rem' }} />
              <span>End-to-End Encrypted Admin Session</span>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;