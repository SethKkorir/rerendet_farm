// client/src/components/Account/SecurityTab.jsx — Minimalist Quiet Luxury Security Suite
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import API, { getCustomerSessions, revokeCustomerSession, revokeAllOtherSessions } from '../../api/api';
import {
  FaLock, FaShieldAlt, FaKey, FaTrash, FaCheckCircle,
  FaExclamationTriangle, FaClock, FaDesktop, FaFingerprint,
  FaUnlock, FaArrowRight, FaSignOutAlt, FaMobileAlt
} from 'react-icons/fa';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const SecurityTab = () => {
  const { user, deleteAccount, showSuccess, showError, token } = useContext(AppContext);
  const navigate = useNavigate();

  // Local overrides to immediately reflect changes
  const [localPasswordChangedAt, setLocalPasswordChangedAt] = useState(user?.passwordChangedAt || null);
  const [localOverrideActive, setLocalOverrideActive] = useState(Boolean(user?.allowPasswordChangeOverride));

  useEffect(() => {
    if (user?.passwordChangedAt) setLocalPasswordChangedAt(user.passwordChangedAt);
    setLocalOverrideActive(Boolean(user?.allowPasswordChangeOverride));
  }, [user?.passwordChangedAt, user?.allowPasswordChangeOverride]);

  // 30-Day Password Cooldown Calculations
  const { isCooldownActive, daysRemaining, eligibleDate, lastChangedFormatted } = useMemo(() => {
    if (localOverrideActive) {
      return { isCooldownActive: false, daysRemaining: 0, eligibleDate: null, lastChangedFormatted: null };
    }

    if (!localPasswordChangedAt) {
      return { isCooldownActive: false, daysRemaining: 0, eligibleDate: null, lastChangedFormatted: null };
    }

    const lastDate = new Date(localPasswordChangedAt);
    const elapsed = Date.now() - lastDate.getTime();

    if (elapsed >= THIRTY_DAYS_MS) {
      return { isCooldownActive: false, daysRemaining: 0, eligibleDate: null, lastChangedFormatted: null };
    }

    const remaining = Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
    const nextDate = new Date(lastDate.getTime() + THIRTY_DAYS_MS).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const lastFormatted = lastDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return {
      isCooldownActive: true,
      daysRemaining: remaining,
      eligibleDate: nextDate,
      lastChangedFormatted: lastFormatted
    };
  }, [localPasswordChangedAt, localOverrideActive]);

  // Password Change State
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2FA State
  const [twoFAData, setTwoFAData] = useState({ password: '' });
  const [show2FAConfirm, setShow2FAConfirm] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);

  // Delete Account State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Activity Logs
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Active Sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await getCustomerSessions();
      if (res.data?.success) {
        setSessions(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (jti) => {
    try {
      await revokeCustomerSession(jti);
      showSuccess?.('Session signed out successfully');
      setSessions(prev => prev.filter(s => s.jti !== jti));
    } catch (err) {
      showError?.(err.response?.data?.message || 'Failed to sign out session');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await revokeAllOtherSessions();
      showSuccess?.('All other sessions signed out');
      fetchSessions();
    } catch (err) {
      showError?.(err.response?.data?.message || 'Failed to sign out other sessions');
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    (async () => {
      setLogsLoading(true);
      try {
        const res = await API.get('/auth/activity');
        if (res.data.success) {
          setLogs(res.data.data || []);
        }
      } catch (err) {
        console.error('Fetch logs error:', err);
      } finally {
        setLogsLoading(false);
      }
    })();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return showError?.('New passwords do not match');
    }
    if (passwordData.newPassword.length < 8) {
      return showError?.('Password must be at least 8 characters');
    }

    setPasswordLoading(true);
    try {
      const activeToken = token || (JSON.parse(localStorage.getItem('auth') || '{}').token);
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update password');

      showSuccess?.('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setLocalPasswordChangedAt(new Date().toISOString());
      setLocalOverrideActive(false);
    } catch (error) {
      showError?.(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggle2FA = async (e) => {
    e.preventDefault();
    setTwoFALoading(true);
    try {
      const activeToken = token || (JSON.parse(localStorage.getItem('auth') || '{}').token);
      const response = await fetch('/api/auth/toggle-2fa', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          enabled: !user.twoFactorEnabled,
          password: twoFAData.password
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update 2FA settings');

      showSuccess?.(`Two-Factor Authentication ${!user.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
      setShow2FAConfirm(false);
      setTwoFAData({ password: '' });
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      showError?.(error.message);
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    if (e) e.preventDefault();
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
    } catch (error) {
      showError?.(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const is2FA = Boolean(user?.twoFactorEnabled);

  return (
    <div className="ord-luxury-canvas" style={{ padding: 0 }}>
      {/* ══ Editorial Header ══ */}
      <div style={{ marginBottom: '1.25rem' }}>
        <span className="rc-dash-eyebrow">— YOUR ACCOUNT</span>
        <h2 className="rc-dash-title">Password & security</h2>
        <p className="rc-dash-sub">
          Manage your password, login security, and two-factor authentication.
        </p>
      </div>

      {/* ── Card 1: Two-Factor Authentication ── */}
      <div className="ord-clean-card">
        <div className="ord-clean-top">
          <div className="ord-clean-meta-left">
            <span className="ord-clean-number">Two-Factor Authentication (2FA)</span>
            <span className="ord-clean-dot-sep" />
            <span className="ord-clean-date">Verification Code</span>
          </div>

          <div className="ord-clean-badges-right">
            <span className={`ord-clean-status-pill ${is2FA ? 'delivered' : 'cancelled'}`}>
              {is2FA ? 'Enabled' : 'Not Enabled'}
            </span>
          </div>
        </div>

        <div className="ord-clean-divider" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ fontSize: '0.86rem', color: 'var(--cust-text-muted)', margin: 0, maxWidth: '580px', lineHeight: 1.6 }}>
            {is2FA
              ? 'Two-factor authentication is active. You will be asked for a verification code when signing in.'
              : 'Add extra security to your account. When enabled, you will need a verification code to log in.'}
          </p>

          <button
            type="button"
            className={`ord-action-btn ${is2FA ? 'outline' : 'solid'}`}
            onClick={() => setShow2FAConfirm(!show2FAConfirm)}
          >
            <FaShieldAlt /> {is2FA ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>

        {/* 2FA Password Confirmation Modal/Box */}
        {show2FAConfirm && (
          <form onSubmit={handleToggle2FA} style={{ marginTop: '1rem', padding: '1.25rem', background: 'var(--cust-bg-home)', borderRadius: '12px', border: '1px solid var(--cust-border)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cust-text)', display: 'block', marginBottom: '0.5rem' }}>
              Confirm your password to {is2FA ? 'disable' : 'enable'} 2FA:
            </span>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="password"
                placeholder="Account password"
                value={twoFAData.password}
                onChange={(e) => setTwoFAData({ password: e.target.value })}
                required
                className="ord-search-minimal-input"
                style={{ flex: 1, minWidth: '220px', borderRadius: '8px', padding: '0.6rem 1rem' }}
              />
              <button
                type="submit"
                className="ord-action-btn solid"
                disabled={twoFALoading}
              >
                {twoFALoading ? 'Verifying…' : 'Confirm'}
              </button>
              <button
                type="button"
                className="ord-action-btn outline"
                onClick={() => setShow2FAConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Card 2: Password Update (30-Day Policy) ── */}
      <div className="ord-clean-card">
        <div className="ord-clean-top">
          <div className="ord-clean-meta-left">
            <span className="ord-clean-number">Change Password</span>
            <span className="ord-clean-dot-sep" />
            <span className="ord-clean-date">Security Policy</span>
          </div>

          <div className="ord-clean-badges-right">
            {localOverrideActive ? (
              <span className="ord-clean-status-pill delivered">
                <FaUnlock style={{ marginRight: '4px' }} /> Early Change Allowed
              </span>
            ) : isCooldownActive ? (
              <span className="ord-clean-status-pill processing">
                <FaLock style={{ marginRight: '4px' }} /> Cooldown Active ({daysRemaining}d)
              </span>
            ) : (
              <span className="ord-clean-status-pill delivered">
                <FaCheckCircle style={{ marginRight: '4px' }} /> Ready to Change
              </span>
            )}
          </div>
        </div>

        <div className="ord-clean-divider" />

        {/* Cooldown or Override Banner */}
        {localOverrideActive ? (
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem'
          }}>
            <FaUnlock style={{ color: '#10B981', fontSize: '1.25rem', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--cust-text)', lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: '#10B981' }}>Early Password Change Allowed:</strong> Customer care has authorized a 24-hour policy exception for your account.
              </div>
              {user?.passwordOverrideReason && (
                <div style={{ marginTop: '2px', color: 'var(--cust-text-muted)', fontSize: '0.78rem' }}>
                  Reason: <em>"{user.passwordOverrideReason}"</em>
                </div>
              )}
              {user?.passwordOverrideExpiresAt && (
                <div style={{ marginTop: '4px', color: '#10B981', fontWeight: 600, fontSize: '0.78rem' }}>
                  Valid until: {new Date(user.passwordOverrideExpiresAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ) : isCooldownActive ? (
          <div style={{
            padding: '1.2rem 1.4rem',
            borderRadius: '12px',
            background: 'var(--cust-border-subtle)',
            border: '1px solid var(--cust-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(196, 151, 70, 0.12)',
                color: 'var(--cust-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0
              }}>
                <FaLock />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--cust-text)' }}>
                  Password Changed Recently
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--cust-text-muted)', lineHeight: 1.5 }}>
                  You can only change your password once every 30 days. Last changed on <strong>{lastChangedFormatted}</strong>.
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--cust-gold)', fontWeight: 600 }}>
                  You can change your password again in {daysRemaining} day{daysRemaining > 1 ? 's' : ''} ({eligibleDate}).
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--cust-border)',
              paddingTop: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--cust-text-dim)' }}>
                Need to change your password sooner?
              </span>
              <button
                type="button"
                className="ord-action-btn outline"
                style={{ fontSize: '0.76rem', padding: '0.4rem 0.9rem' }}
                onClick={() => navigate('/account?tab=tickets')}
              >
                Contact Support <FaArrowRight style={{ fontSize: '0.68rem' }} />
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--cust-text-muted)' }}>
            Passwords must be at least 8 characters. You can only change your password once every 30 days.
          </p>
        )}

        {/* Password Form (active or disabled based on cooldown) */}
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            opacity: isCooldownActive ? 0.45 : 1,
            pointerEvents: isCooldownActive ? 'none' : 'auto'
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required={!isCooldownActive}
                disabled={isCooldownActive}
                placeholder="••••••••"
                className="ord-search-minimal-input"
                style={{ borderRadius: '10px', padding: '0.7rem 1rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required={!isCooldownActive}
                disabled={isCooldownActive}
                placeholder="••••••••"
                className="ord-search-minimal-input"
                style={{ borderRadius: '10px', padding: '0.7rem 1rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required={!isCooldownActive}
                disabled={isCooldownActive}
                placeholder="••••••••"
                className="ord-search-minimal-input"
                style={{ borderRadius: '10px', padding: '0.7rem 1rem' }}
              />
            </div>
          </div>

          <div className="ord-clean-divider" />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="ord-action-btn solid"
              disabled={passwordLoading || isCooldownActive}
              style={{
                opacity: isCooldownActive ? 0.6 : 1,
                cursor: isCooldownActive ? 'not-allowed' : 'pointer'
              }}
            >
              {passwordLoading ? 'Updating…' : isCooldownActive ? `Policy Cooldown (${daysRemaining}d remaining)` : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Card 2b: Active Sessions & Connected Devices ── */}
      <div className="ord-clean-card">
        <div className="ord-clean-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="ord-clean-number">Connected Devices</span>
            <span className="ord-clean-date">Active Sessions</span>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              className="ord-clean-cancel-link"
              onClick={handleRevokeAllOtherSessions}
              style={{ fontSize: '0.78rem', color: '#EF4444' }}
            >
              Sign out all other sessions
            </button>
          )}
        </div>

        <div className="ord-clean-divider" />

        {sessionsLoading ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)', margin: '1rem 0' }}>
            Loading active sessions…
          </p>
        ) : sessions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {sessions.map((sess) => {
              const isCurrent = sess.isCurrent || sess.current;
              const isMobile = (sess.deviceType || '').toLowerCase().includes('mobile') || (sess.userAgent || '').includes('Mobile');
              return (
                <div
                  key={sess._id || sess.jti}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: isCurrent ? 'rgba(196, 151, 70, 0.08)' : 'var(--cust-bg-home)',
                    border: isCurrent ? '1px solid rgba(196, 151, 70, 0.25)' : '1px solid transparent',
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(196, 151, 70, 0.12)',
                      color: 'var(--cust-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem'
                    }}>
                      {isMobile ? <FaMobileAlt /> : <FaDesktop />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--cust-text)' }}>
                          {sess.browser || 'Web Browser'} on {sess.os || 'Desktop'}
                        </span>
                        {isCurrent && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#10B981',
                            color: '#FFFFFF'
                          }}>
                            Current Device
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--cust-text-muted)', marginTop: '2px' }}>
                        IP: {sess.ipAddress || 'Verified IP'} • Last active: {sess.lastActivity ? new Date(sess.lastActivity).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                  </div>

                  {!isCurrent && sess.jti && (
                    <button
                      type="button"
                      className="ord-action-btn outline"
                      onClick={() => handleRevokeSession(sess.jti)}
                      style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    >
                      <FaSignOutAlt style={{ marginRight: '4px' }} /> Sign Out
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)', margin: 0 }}>
            Your current browser session is securely active.
          </p>
        )}
      </div>

      {/* ── Card 3: Recent Activity Logs ── */}
      <div className="ord-clean-card">
        <div className="ord-clean-top">
          <span className="ord-clean-number">Recent Login Activity</span>
          <span className="ord-clean-date">Account Activity</span>
        </div>

        <div className="ord-clean-divider" />

        {logsLoading ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)', margin: '1rem 0' }}>
            Loading login activity…
          </p>
        ) : logs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.slice(0, 4).map((log, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'var(--cust-bg-home)',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FaDesktop style={{ color: 'var(--cust-gold)' }} />
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--cust-text)' }}>
                      {log.action || 'Account Sign In'}
                    </span>
                    <span style={{ color: 'var(--cust-text-muted)', marginLeft: '8px' }}>
                      {log.ipAddress || 'Verified Session'}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--cust-text-muted)' }}>
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recent'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)', margin: 0 }}>
            No suspicious activity recorded. Your account sessions are optimal.
          </p>
        )}
      </div>

      {/* ── Card 4: Danger Zone ── */}
      <div className="ord-clean-card" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
        <div className="ord-clean-top">
          <div>
            <span className="ord-clean-number" style={{ color: '#EF4444' }}>Danger Zone</span>
            <p style={{ fontSize: '0.82rem', color: 'var(--cust-text-muted)', margin: '4px 0 0' }}>
              Permanently close your Rerendet account and erase subscription data.
            </p>
          </div>

          <button
            type="button"
            className="ord-clean-cancel-link"
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
          >
            Delete account
          </button>
        </div>

        {showDeleteConfirm && (
          <form onSubmit={handleDeleteAccount} style={{ marginTop: '1rem', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EF4444', display: 'block', marginBottom: '0.5rem' }}>
              Confirm your password to permanently delete this account:
            </span>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="password"
                placeholder="Account password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
                className="ord-search-minimal-input"
                style={{ flex: 1, minWidth: '220px', borderRadius: '8px', padding: '0.6rem 1rem' }}
              />
              <button
                type="submit"
                className="ord-action-btn"
                style={{ background: '#EF4444', color: '#FFFFFF', border: 'none' }}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting…' : 'Confirm Permanent Deletion'}
              </button>
              <button
                type="button"
                className="ord-action-btn outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SecurityTab;
