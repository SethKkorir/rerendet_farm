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

    // 2FA State
    const [twoFAData, setTwoFAData] = useState({ password: '' });
    const [show2FAConfirm, setShow2FAConfirm] = useState(false);
    const [twoFALoading, setTwoFALoading] = useState(false);

    // Delete Account State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Activity Logs State
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await API.get('/auth/activity');
            if (res.data.success) {
                setLogs(res.data.data);
            }
        } catch (error) {
            console.error('Fetch logs error:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
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
                </div>

                {/* Right Side: Activity */}
                <div className="security-logs-column">
                    <div className="sec-card glass-morph activity-container">
                        <div className="sec-card-header mb-4">
                            <div className="header-title">
                                <div className="accent-icon">
                                    <FaHistory />
                                </div>
                                <div>
                                    <h5>Access Logs</h5>
                                    <p>Real-time session tracking</p>
                                </div>
                            </div>
                        </div>

                        <div className="activity-vault">
                            {logsLoading ? (
                                <div className="vault-loading">
                                    <div className="vault-spinner"></div>
                                    <span>Scanning Ledger...</span>
                                </div>
                            ) : logs.length > 0 ? (
                                <div className="vault-list">
                                    {logs.map(log => (
                                        <div className="vault-entry" key={log._id}>
                                            <div className="entry-icon">
                                                <FaDesktop />
                                            </div>
                                            <div className="entry-details">
                                                <div className="entry-header">
                                                    <span className="entry-action">{log.action}</span>
                                                    <span className={`entry-tag ${log.details?.method === '2FA_VERIFIED' ? 'gold' : 'silver'}`}>
                                                        {log.details?.method === '2FA_VERIFIED' ? '2FA' : 'Basic'}
                                                    </span>
                                                </div>
                                                <div className="entry-meta">
                                                    <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="vault-empty">
                                    <FaShieldAlt />
                                    <p>Your security ledger is currently clean.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityTab;
