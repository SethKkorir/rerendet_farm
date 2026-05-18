import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaLock, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import './SessionLock.css';

const SessionLock = () => {
    const {
        isLocked,
        user,
        unlockSession,
        logout,
        login,
        loginAdmin,
        loginWithGoogle,
        showError
    } = useContext(AppContext);

    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [shaking, setShaking] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const inputRef = useRef(null);

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-focus input when locked
    useEffect(() => {
        if (isLocked) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isLocked]);

    // Prevent background scrolling when locked
    useEffect(() => {
        if (isLocked) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isLocked]);

    const triggerShake = () => {
        setShaking(true);
        setTimeout(() => setShaking(false), 600);
    };

    const handleUnlock = async (e) => {
        e.preventDefault();
        if (!password.trim()) return;
        setLoading(true);

        try {
            if (user?.role === 'admin' || user?.role === 'super-admin' || user?.userType === 'admin') {
                await loginAdmin({ email: user.email, password });
            } else {
                await login({ email: user.email, password });
            }
            unlockSession();
            setPassword('');
        } catch (error) {
            triggerShake();
            setPassword('');
            setTimeout(() => inputRef.current?.focus(), 100);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleUnlock = async () => {
        try {
            if (window.google) {
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        showError("Google sign-in was cancelled");
                    }
                });
            } else {
                showError("Google Sign-In is not available");
            }
        } catch (error) {
            showError("Google unlock failed");
        }
    };

    // Render the Google button when locked and user has Google auth
    useEffect(() => {
        if (isLocked && user?.googleId && window.google) {
            try {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: async (response) => {
                        try {
                            await loginWithGoogle(response);
                            unlockSession();
                        } catch (err) {
                            triggerShake();
                        }
                    }
                });
                const btn = document.getElementById('googleLockBtn');
                if (btn) {
                    window.google.accounts.id.renderButton(btn, {
                        theme: 'filled_black',
                        size: 'large',
                        text: 'signin_with',
                        width: 320
                    });
                }
            } catch (err) {
                console.error('Google script error', err);
            }
        }
    }, [isLocked, user, loginWithGoogle, unlockSession]);

    const handleLogout = () => {
        logout();
        unlockSession();
    };

    if (!isLocked) return null;

    const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <AnimatePresence>
            {isLocked && (
                <motion.div
                    className="session-lock-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    <motion.div
                        className={`session-lock-container ${shaking ? 'shake' : ''}`}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Header */}
                        <div className="lock-header">
                            <motion.div
                                className="lock-icon-wrap"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                            >
                                <FaLock className="lock-icon" />
                            </motion.div>
                            <h2>Session Locked</h2>
                            <p className="lock-time">
                                {timeStr} · {dateStr}
                            </p>
                        </div>

                        {/* User Avatar */}
                        <motion.div
                            className="user-profile-preview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <div className="lock-avatar-wrap">
                                {user?.profilePicture ? (
                                    <img
                                        src={user.profilePicture}
                                        alt={user.firstName}
                                        className="lock-avatar"
                                    />
                                ) : (
                                    <div className="lock-avatar-placeholder">
                                        <FaUser />
                                    </div>
                                )}
                            </div>
                            <h3>{user?.firstName} {user?.lastName}</h3>
                            <p>{user?.email}</p>
                        </motion.div>

                        {/* Unlock Form */}
                        <motion.div
                            className="unlock-form-container"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                        >
                            {user?.googleId ? (
                                <div className="google-unlock">
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                        Re-authenticate to continue
                                    </p>
                                    <div id="googleLockBtn" />
                                </div>
                            ) : (
                                <form onSubmit={handleUnlock} className="unlock-form">
                                    <div className="lock-input-group" style={{ position: 'relative' }}>
                                        <input
                                            ref={inputRef}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(p => !p)}
                                            style={{
                                                position: 'absolute',
                                                right: '16px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: 'rgba(255,255,255,0.3)',
                                                cursor: 'pointer',
                                                padding: 0,
                                                fontSize: '1rem'
                                            }}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        className="unlock-btn"
                                        disabled={loading || !password.trim()}
                                    >
                                        {loading ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                                </svg>
                                                Verifying…
                                            </span>
                                        ) : (
                                            'Unlock Session'
                                        )}
                                    </button>
                                </form>
                            )}
                        </motion.div>

                        {/* Footer */}
                        <div className="lock-footer">
                            <button onClick={handleLogout} className="logout-text-btn">
                                Not you? Sign out completely
                            </button>
                        </div>

                        {/* Inline spinner style */}
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SessionLock;
