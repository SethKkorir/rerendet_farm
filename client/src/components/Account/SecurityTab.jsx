import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import API from '../../api/api';
import {
    FaLock, FaShieldAlt, FaKey, FaTrash, FaCheckCircle,
    FaExclamationTriangle, FaHistory, FaDesktop, FaFingerprint,
    FaArrowRight, FaShieldVirus
} from 'react-icons/fa';

const SecurityTab = () => {
    const { user, updateUserProfile, deleteAccount, loading: contextLoading, showSuccess, showError, token, logout } = useContext(AppContext);

    const evaluatePasswordStrength = (pass) => {
        if (!pass) return { score: 0, label: 'Empty', color: '#666', feedback: 'Enter a secure password' };
        let score = 0;
        if (pass.length >= 8) score++;
        if (pass.length >= 12) score++;
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

    // Password Change State
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [pwnedCount, setPwnedCount] = useState(null);
    const [hibpChecking, setHibpChecking] = useState(false);

    // SubtleCrypto SHA-1 helper for HaveIBeenPwned k-anonymity
    const sha1 = async (string) => {
        const utf8 = new TextEncoder().encode(string);
        const hashBuffer = await window.crypto.subtle.digest('SHA-1', utf8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.toUpperCase();
    };

    const checkPasswordPwned = async (password) => {
        if (!password || password.length < 6) return 0;
        try {
            setHibpChecking(true);
            const hash = await sha1(password);
            const prefix = hash.slice(0, 5);
            const suffix = hash.slice(5);
            
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
            if (!response.ok) return 0;
            const text = await response.text();
            
            const lines = text.split('\n');
            for (const line of lines) {
                const [partsSuffix, countStr] = line.split(':');
                if (partsSuffix.trim() === suffix) {
                    return parseInt(countStr.trim(), 10);
                }
            }
            return 0;
        } catch (err) {
            console.error('HIBP check error:', err);
            return 0;
        } finally {
            setHibpChecking(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (passwordData.newPassword && passwordData.newPassword.length >= 8) {
                const count = await checkPasswordPwned(passwordData.newPassword);
                setPwnedCount(count);
            } else {
                setPwnedCount(null);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [passwordData.newPassword]);

    // 2FA State
    const [twoFAData, setTwoFAData] = useState({ password: '' });
    const [show2FAConfirm, setShow2FAConfirm] = useState(false);
    const [twoFALoading, setTwoFALoading] = useState(false);

    // Delete Account State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    // FIX 8: Unified Security Activity state
    const [timeline, setTimeline] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [sessions, setSessions] = useState([]);

    const getJtiFromToken = (tok) => {
        if (!tok) return null;
        try {
            const base64Url = tok.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload).jti;
        } catch (e) {
            return null;
        }
    };

    const fetchSecurityActivity = async () => {
        setTimelineLoading(true);
        try {
            const [sessionsRes, logsRes] = await Promise.all([
                fetch('/api/auth/sessions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/auth/activity', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const sessionsData = await sessionsRes.json();
            const logsData = await logsRes.json();

            let activeSessions = [];
            if (sessionsData.success) {
                activeSessions = sessionsData.data;
                setSessions(activeSessions);
            }
            let accessLogs = [];
            if (logsData.success) {
                accessLogs = logsData.data;
            }

            // Build unified timeline
            const unified = [];
            accessLogs.forEach(log => {
                const jti = log.jti || log.details?.jti || null;
                const isSessionEvent = !!activeSessions.find(s => s.jti === jti);
                unified.push({
                    id: log._id,
                    type: isSessionEvent ? 'session' : 'access',
                    action: log.action,
                    ip: log.ipAddress || log.details?.ipAddress || log.details?.ip || 'Unknown',
                    userAgent: log.userAgent || log.details?.userAgent || 'Unknown Device',
                    createdAt: new Date(log.createdAt),
                    jti,
                    method: log.details?.method || 'Basic'
                });
            });

            // Make sure active sessions are represented on timeline
            activeSessions.forEach(sess => {
                const alreadyAdded = unified.some(item => item.jti === sess.jti);
                if (!alreadyAdded) {
                    unified.push({
                        id: sess.jti,
                        type: 'session',
                        action: `Logged In: ${sess.deviceInfo || 'Active Session'}`,
                        ip: sess.ipAddress || 'Unknown',
                        userAgent: sess.userAgent || 'Unknown Device',
                        createdAt: new Date(sess.createdAt),
                        jti: sess.jti,
                        method: 'Session'
                    });
                }
            });

            unified.sort((a, b) => b.createdAt - a.createdAt);
            setTimeline(unified);

        } catch (error) {
            console.error('Fetch security activity error:', error);
        } finally {
            setTimelineLoading(false);
        }
    };

    const handleRemoveSession = async (jti) => {
        try {
            const res = await fetch(`/api/auth/sessions/${jti}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('Session revoked successfully');
                await fetchSecurityActivity();
            } else {
                showError(data.message || 'Failed to revoke session');
            }
        } catch (error) {
            showError('Failed to revoke session');
        }
    };

    const handleRevokeAllOtherSessions = async () => {
        try {
            const res = await fetch('/api/auth/sessions/mine/all', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showSuccess('All other sessions revoked');
                await fetchSecurityActivity();
            } else {
                showError(data.message || 'Failed to revoke other sessions');
            }
        } catch (error) {
            showError('Failed to revoke other sessions');
        }
    };

    useEffect(() => {
        fetchSecurityActivity();
    }, []);

    // --- Password Change ---
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return showError('New passwords do not match');
        }
        if (passwordData.newPassword.length < 8) {
            return showError('Password must be at least 8 characters');
        }

        setPasswordLoading(true);
        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update password');

            showSuccess('Password updated successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            showError(error.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    // --- 2FA Toggle ---
    const handleToggle2FA = async (e) => {
        e.preventDefault();
        setTwoFALoading(true);
        try {
            const response = await fetch('/api/auth/toggle-2fa', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    enabled: !user.twoFactorEnabled,
                    password: twoFAData.password
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update 2FA settings');

            showSuccess(`Two-Factor Authentication ${!user.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
            setShow2FAConfirm(false);
            setTwoFAData({ password: '' });

            // Soft reload to get fresh user data
            setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            showError(error.message);
        } finally {
            setTwoFALoading(false);
        }
    };

    // --- Delete Account ---
    const handleDeleteAccount = async (e) => {
        if (e) e.preventDefault();
        setDeleteLoading(true);
        try {
            await deleteAccount(deletePassword);
        } catch (error) {
            showError(error.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="security-tab-premium">
            {/* Header Health Overview */}
            <div className="security-health-card">
                <div className="health-visual">
                    <div className={`health-icon-wrap ${user.twoFactorEnabled ? 'strong' : 'danger'}`}>
                        <FaShieldVirus />
                    </div>
                </div>
                <div className="health-content">
                    <div className="health-status-row">
                        <h4>Security Health</h4>
                        <span className={`health-pill ${user.twoFactorEnabled ? 'success' : 'danger'}`}>
                            {user.twoFactorEnabled ? 'Optimal Protection' : 'Basic Protection'}
                        </span>
                    </div>
                    <p>
                        {user.twoFactorEnabled
                            ? "Your account is guarded with enterprise-grade two-factor authentication."
                            : "Enhance your security by enabling two-factor authentication."}
                    </p>
                </div>
            </div>

            <div className="security-grid">
                {/* Left Side: Actions */}
                <div className="security-actions-column">
                    {/* 2FA Card */}
                    <div className="sec-card glass-morph">
                        <div className="sec-card-header">
                            <div className="header-title">
                                <div className="accent-icon">
                                    <FaFingerprint />
                                </div>
                                <div>
                                    <h5>Two-Factor Authentication</h5>
                                    <p>Encrypted email verification</p>
                                </div>
                            </div>
                            <label className="premium-switch">
                                <input
                                    type="checkbox"
                                    checked={user.twoFactorEnabled}
                                    onChange={() => setShow2FAConfirm(true)}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        {show2FAConfirm && (
                            <div className="sec-form-overlay">
                                <form onSubmit={handleToggle2FA}>
                                    <p>Confirm with your password</p>
                                    <div className="input-with-icon">
                                        <FaLock />
                                        <input
                                            type="password"
                                            placeholder="Current Password"
                                            value={twoFAData.password}
                                            onChange={(e) => setTwoFAData({ password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="overlay-actions mt-3">
                                        <button
                                            type="button"
                                            className="btn-text-only"
                                            onClick={() => setShow2FAConfirm(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn-premium-solid"
                                            disabled={twoFALoading}
                                        >
                                            {twoFALoading ? '...' : 'Verify'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Password Card */}
                    <div className="sec-card glass-morph mt-4">
                        <div className="sec-card-header mb-4">
                            <div className="header-title">
                                <div className="accent-icon">
                                    <FaKey />
                                </div>
                                <div>
                                    <h5>Change Password</h5>
                                    <p>Ensure your account remains secure</p>
                                </div>
                            </div>
                        </div>

                        <form className="premium-form-sec" onSubmit={handlePasswordChange}>
                            <div className="form-group-sec">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row-sec">
                                <div className="form-group-sec">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Min 8 characters"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        required
                                    />
                                    {passwordData.newPassword && (
                                        <div className="password-strength-container" style={{ marginTop: '0.5rem', width: '100%' }}>
                                            <div className="strength-bars-wrap" style={{ display: 'flex', gap: '4px', height: '4px', margin: '6px 0 4px' }}>
                                                {[0, 1, 2, 3].map((index) => {
                                                    const strength = evaluatePasswordStrength(passwordData.newPassword);
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
                                                <span style={{ color: evaluatePasswordStrength(passwordData.newPassword).color }}>
                                                    {evaluatePasswordStrength(passwordData.newPassword).label}
                                                </span>
                                                <span style={{ color: '#94a3b8' }}>
                                                    {evaluatePasswordStrength(passwordData.newPassword).feedback}
                                                </span>
                                            </div>
                                            {hibpChecking && (
                                                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '5px' }}>
                                                    Checking password credentials leak database...
                                                </div>
                                            )}
                                            {pwnedCount > 0 && (
                                                <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FaExclamationTriangle />
                                                    <span>Warning: This password was leaked {pwnedCount.toLocaleString()} times in HIBP database!</span>
                                                </div>
                                            )}
                                            {pwnedCount === 0 && (
                                                <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '6px', fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <FaCheckCircle />
                                                    <span>Safe: No known database leaks detected.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group-sec">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Verify password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn-premium-outline full-width mt-4" disabled={passwordLoading}>
                                {passwordLoading ? 'Updating...' : 'Update Password'}
                                <FaArrowRight />
                            </button>
                        </form>
                    </div>

                    {/* Delete Zone */}
                    <div className="sec-card danger-card mt-4">
                        <div className="danger-header">
                            <FaTrash />
                            <h5>Danger Zone</h5>
                        </div>
                        <p>Permanently delete your account and all of your data.</p>

                        {!showDeleteConfirm ? (
                            <button className="btn-danger-minimal" onClick={() => setShowDeleteConfirm(true)}>
                                Delete Account
                            </button>
                        ) : (
                            <div className="danger-confirm-box">
                                <p>Permanently delete account? Enter password to confirm.</p>
                                <div className="input-with-icon mb-3">
                                    <FaLock />
                                    <input
                                        type="password"
                                        placeholder="Enter password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        className="danger-input"
                                        autoFocus
                                    />
                                </div>
                                <div className="danger-btn-group" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                                    <button className="btn-text-only" onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}>Abort</button>
                                    <button
                                        className="btn-danger-minimal"
                                        onClick={handleDeleteAccount}
                                        disabled={deleteLoading || !deletePassword}
                                    >
                                        {deleteLoading ? 'Processing...' : 'Delete Permanently'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                          {/* Right Side: Unified Security Activity */}
                <div className="security-logs-column">
                    <div className="sec-card glass-morph activity-container">
                        <div className="sec-card-header mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="header-title">
                                <div className="accent-icon">
                                    <FaHistory />
                                </div>
                                <div>
                                    <h5>Security Activity</h5>
                                    <p>Unified session and access tracking</p>
                                </div>
                            </div>
                            {sessions.length > 1 && (
                                <button 
                                    className="btn-danger-minimal" 
                                    onClick={handleRevokeAllOtherSessions}
                                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                                >
                                    Revoke All Other Sessions
                                </button>
                            )}
                        </div>

                        <div className="activity-vault">
                            {timelineLoading ? (
                                <div className="vault-loading">
                                    <div className="vault-spinner"></div>
                                    <span>Scanning Ledger...</span>
                                </div>
                            ) : timeline.length > 0 ? (
                                <div className="vault-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {timeline.map(item => {
                                        const currentJti = getJtiFromToken(token);
                                        const isCurrent = item.jti === currentJti;
                                        const isActive = sessions.some(s => s.jti === item.jti);

                                        return (
                                            <div className="vault-entry" key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div className="entry-details" style={{ flex: 1 }}>
                                                    <div className="entry-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className="entry-action" style={{ fontWeight: '600', color: '#f4f4f5' }}>{item.action}</span>
                                                        {isActive && (
                                                            isCurrent ? (
                                                                <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                                    This device — current session
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                                    Active device
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                    <div className="entry-meta" style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                        <span>IP: {item.ip}</span>
                                                        <span>•</span>
                                                        <span>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {item.method && (
                                                            <>
                                                                <span>•</span>
                                                                <span style={{ textTransform: 'capitalize' }}>{item.method}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {isActive && (
                                                    <button
                                                        onClick={() => handleRemoveSession(item.jti)}
                                                        disabled={isCurrent}
                                                        style={{
                                                            background: 'transparent',
                                                            border: '1px solid rgba(239,68,68,0.2)',
                                                            color: isCurrent ? '#52525b' : '#ef4444',
                                                            padding: '0.4rem 0.85rem',
                                                            borderRadius: '6px',
                                                            cursor: isCurrent ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            opacity: isCurrent ? 0.4 : 1,
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="vault-empty" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                    <FaShieldAlt style={{ fontSize: '2rem', color: '#52525b', marginBottom: '0.5rem' }} />
                                    <p style={{ color: '#71717a', fontSize: '0.85rem' }}>Your security ledger is currently clean.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>              </div>
            </div>
        </div>
    );
};

export default SecurityTab;
