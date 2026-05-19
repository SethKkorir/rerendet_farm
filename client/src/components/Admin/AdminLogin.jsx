// src/components/Admin/AdminLogin.jsx
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './AdminLogin.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('login');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { user, isAuthenticated, loginAdmin, verifyAdmin2FA, showNotification } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'super-admin' || user.userType === 'admin')) {
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
          setShowPassword(false);
          showNotification('Verification code sent to your email', 'info');
        } else {
          navigate('/admin');
        }
      } else {
        await verifyAdmin2FA(formData.email, code);
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setStep('login');
    setCode('');
    setError('');
    setShowPassword(false);
  };

  const preventAction = (e) => e.preventDefault();

  return (
    <div className="adl-page">
      {/* Ambient glows */}
      <div className="adl-glow adl-glow--gold" />
      <div className="adl-glow adl-glow--blue" />

      <motion.div
        className="adl-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* Top bar */}
        <div className="adl-topbar">
          {step === '2fa' && (
            <button className="adl-icon-btn" onClick={handleGoBack} aria-label="Go back">
              <FaArrowLeft />
            </button>
          )}
          <span className="adl-badge">SECURE PORTAL</span>
        </div>

        {/* Logo + heading */}
        <div className="adl-header">
          <img src="/rerendet-logo.png" alt="Rerendet Coffee" className="adl-logo" />
          <h1 className="adl-title">
            {step === 'login' ? 'Admin Portal' : 'Verify Identity'}
          </h1>
          <p className="adl-subtitle">
            {step === 'login'
              ? 'Restricted to authorised administrators only'
              : `Code sent to ${formData.email}`}
          </p>
        </div>

        {/* Error */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="adl-form">
          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="adl-fields"
              >
                {/* Email */}
                <div className="adl-field">
                  <label className="adl-label" htmlFor="adl-email">Email Address</label>
                  <div className="adl-input-wrap">
                    <input
                      id="adl-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
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

                {/* Password */}
                <div className="adl-field">
                  <label className="adl-label" htmlFor="adl-password">Password</label>
                  <div className="adl-input-wrap">
                    <input
                      id="adl-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
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

                {/* Honeypot */}
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

        {/* Footer */}
        <div className="adl-footer">
          <FaShieldAlt className="adl-footer-icon" />
          <span>End-to-end encrypted session</span>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;