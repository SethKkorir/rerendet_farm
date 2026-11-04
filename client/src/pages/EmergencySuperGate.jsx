// client/src/pages/EmergencySuperGate.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FaShieldAlt,
  FaBolt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaPowerOff,
  FaSync,
  FaClock,
  FaArrowLeft
} from 'react-icons/fa';
import './EmergencySuperGate.css';

const EmergencySuperGate = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  // Confirmation modal state
  const [pendingAction, setPendingAction] = useState(null); // 'enable' | 'disable' | null
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  // 1. Validate token on initial mount WITHOUT consuming it
  useEffect(() => {
    if (!tokenParam) {
      setLoading(false);
      setTokenValid(false);
      setErrorMessage('No emergency token supplied. An emergency link must include a valid cryptographic token parameter.');
      return;
    }

    const verifyToken = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/emergency/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenParam })
        });

        const data = await res.json();
        if (res.ok && data.success && data.valid) {
          setTokenValid(true);
          setTokenData(data.data);
        } else {
          setTokenValid(false);
          setErrorMessage(data.message || 'Emergency token is invalid, expired, or revoked.');
        }
      } catch (err) {
        console.error('Emergency token verification error:', err);
        setTokenValid(false);
        setErrorMessage('Unable to reach emergency gateway backend. Please check network connectivity.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [tokenParam]);

  // 2. Expiration Countdown Timer
  useEffect(() => {
    if (!tokenData?.expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(tokenData.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setTokenValid(false);
        setErrorMessage('This emergency access token has now expired (10-minute validity exceeded).');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenData?.expiresAt]);

  // 3. Execute Emergency Action
  const handleConfirmAction = async () => {
    if (!pendingAction || !tokenParam) return;

    try {
      setExecuting(true);
      const res = await fetch('/api/emergency/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenParam,
          action: pendingAction,
          reason: 'Authorized out-of-band emergency toggle via Super Gate'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setExecutionResult({
          success: true,
          message: data.message,
          maintenanceEnabled: data.data?.maintenanceEnabled,
          executedAt: data.data?.executedAt
        });

        // Safely remove token from browser URL history to prevent leakage
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          // ignore
        }
      } else {
        setExecutionResult({
          success: false,
          message: data.message || 'Emergency action execution failed.'
        });
      }
    } catch (err) {
      setExecutionResult({
        success: false,
        message: 'Network error executing emergency action.'
      });
    } finally {
      setExecuting(false);
      setPendingAction(null);
    }
  };

  return (
    <div className="esg-root">
      <div className="esg-container">
        {/* Header */}
        <div className="esg-brand-header">
          <img src="/rerendet-logo.png" alt="Rerendet Logo" className="esg-logo" />
          <div className="esg-badge">
            <FaShieldAlt /> Enterprise Security Protocol
          </div>
          <h1 className="esg-title">Emergency Super Gate</h1>
          <p className="esg-subtitle">
            Out-of-band storefront maintenance control for authorized SuperAdmins
          </p>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            <FaSync className="st-spin" style={{ fontSize: '2rem', color: '#D4AF37', marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>Verifying emergency cryptographic token...</p>
          </div>
        )}

        {/* EXECUTION RESULT SCREEN */}
        {!loading && executionResult && (
          <div className="esg-result-screen">
            <div className={`esg-result-icon ${executionResult.success ? 'success' : 'error'}`}>
              {executionResult.success ? <FaCheckCircle /> : <FaExclamationTriangle />}
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: '0 0 0.5rem' }}>
              {executionResult.success ? 'Emergency Action Completed' : 'Operation Failed'}
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1rem' }}>
              {executionResult.message}
            </p>

            {executionResult.success && (
              <div className="esg-consumed-notice">
                <FaLock style={{ color: '#D4AF37', marginRight: '6px' }} />
                <strong>Single-Use Enforced:</strong> This emergency cryptographic token has been atomically consumed and cannot be reused.
              </div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/" className="esg-home-link">
                <FaArrowLeft /> Return to Storefront
              </Link>
            </div>
          </div>
        )}

        {/* ERROR / INVALID TOKEN SCREEN */}
        {!loading && !executionResult && !tokenValid && (
          <div className="esg-result-screen">
            <div className="esg-result-icon error">
              <FaLock />
            </div>
            <h2 style={{ fontSize: '1.3rem', color: '#ef4444', margin: '0 0 0.5rem' }}>
              Emergency Access Denied
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 1.5rem' }}>
              {errorMessage}
            </p>
            <div className="esg-consumed-notice">
              Emergency Super Gate links are single-use, strictly bound to verified SuperAdmins, and expire after 10 minutes.
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/" className="esg-home-link">
                <FaArrowLeft /> Return to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* VALID TOKEN ACTIVE INTERFACE */}
        {!loading && !executionResult && tokenValid && tokenData && (
          <>
            {/* Storefront status banner */}
            <div className={`esg-status-card ${tokenData.maintenanceEnabled ? 'maintenance' : 'live'}`}>
              <div className="esg-status-left">
                <div className="esg-status-icon">
                  <FaPowerOff />
                </div>
                <div className="esg-status-text">
                  <strong>
                    {tokenData.maintenanceEnabled ? 'Storefront is OFFLINE (Maintenance Active)' : 'Storefront is ONLINE (Live for Customers)'}
                  </strong>
                  <span>
                    {tokenData.maintenanceEnabled
                      ? 'Customers see the maintenance downtime screen. Order checkout is blocked.'
                      : 'Customers can browse coffee beans, place orders, and pay normally.'}
                  </span>
                </div>
              </div>
              <div className="esg-pulse-badge">
                <span className="pulse-dot" style={{ background: tokenData.maintenanceEnabled ? '#ef4444' : '#10b981' }} />
                {tokenData.maintenanceEnabled ? 'MAINTENANCE ON' : 'STORE LIVE'}
              </div>
            </div>

            {/* Token metadata bar */}
            <div className="esg-token-bar">
              <div>
                <strong>SuperAdmin:</strong> {tokenData.recipientEmail}
              </div>
              <div className="esg-token-countdown">
                <FaClock /> Expires in: {timeLeft || 'Calculating...'}
              </div>
            </div>

            {/* Security Callout */}
            <div className="esg-callout">
              <strong>Emergency Out-of-Band Safeguard:</strong> This emergency gate functions independently of the normal admin dashboard. Clicking an action below will prompt a confirmation dialog and permanently consume this token upon execution.
            </div>

            {/* Actions */}
            <div className="esg-action-grid">
              {!tokenData.maintenanceEnabled ? (
                <button
                  type="button"
                  className="esg-btn-danger"
                  onClick={() => setPendingAction('enable')}
                  disabled={executing}
                >
                  <FaPowerOff /> Take Storefront Offline (Enable Maintenance)
                </button>
              ) : (
                <button
                  type="button"
                  className="esg-btn-success"
                  onClick={() => setPendingAction('disable')}
                  disabled={executing}
                >
                  <FaBolt /> Restore Storefront Access (Disable Maintenance)
                </button>
              )}
            </div>
          </>
        )}

        {/* CONFIRMATION DIALOG MODAL */}
        {pendingAction && (
          <div className="esg-modal-backdrop">
            <div className="esg-modal-card">
              <div className={`esg-modal-icon-badge ${pendingAction === 'enable' ? 'danger' : 'success'}`}>
                {pendingAction === 'enable' ? <FaExclamationTriangle /> : <FaCheckCircle />}
              </div>
              <h3 className="esg-modal-title">
                {pendingAction === 'enable'
                  ? 'Emergency Maintenance Activation'
                  : 'Emergency Maintenance Deactivation'}
              </h3>
              <p className="esg-modal-desc">
                {pendingAction === 'enable'
                  ? 'You are about to take the customer storefront OFFLINE. New customer orders and visits will be blocked until restored.'
                  : 'You are about to restore full storefront access. Customers will immediately be able to browse and place coffee orders.'}
              </p>

              <div className="esg-modal-btn-row">
                <button
                  type="button"
                  className="esg-modal-cancel"
                  onClick={() => setPendingAction(null)}
                  disabled={executing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`esg-modal-confirm ${pendingAction === 'enable' ? 'danger' : 'success'}`}
                  onClick={handleConfirmAction}
                  disabled={executing}
                >
                  {executing ? (
                    <><FaSync className="st-spin" /> Processing...</>
                  ) : pendingAction === 'enable' ? (
                    'Confirm & Take Offline'
                  ) : (
                    'Confirm & Restore Store'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencySuperGate;
