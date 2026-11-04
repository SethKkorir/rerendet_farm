import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaClock, FaSignOutAlt, FaCheck, FaUser, FaShieldAlt } from 'react-icons/fa';
import './SessionLock.css';

const COUNTDOWN_TOTAL_SECONDS = 60; // 60-second warning countdown before auto-logout

const SessionLock = () => {
    const {
        isLocked,
        user,
        unlockSession,
        logout,
        showWarning,
        showInfo
    } = useContext(AppContext);

    const [timeLeft, setTimeLeft] = useState(COUNTDOWN_TOTAL_SECONDS);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const timerRef = useRef(null);

    // Auto-logout when countdown expires
    const handleAutoLogout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            unlockSession();
            await logout();
            if (showWarning) {
                showWarning('You were logged out automatically due to inactivity.');
            }
        } catch (error) {
            console.error('Error during session auto-logout:', error);
            unlockSession();
        } finally {
            setIsLoggingOut(false);
        }
    }, [isLoggingOut, unlockSession, logout, showWarning]);

    // User chooses to stay logged in
    const handleStayLoggedIn = useCallback(() => {
        setTimeLeft(COUNTDOWN_TOTAL_SECONDS);
        unlockSession();
        if (showInfo) {
            showInfo('Session active. Welcome back!');
        }
    }, [unlockSession, showInfo]);

    // User manually clicks to log out immediately
    const handleManualLogout = useCallback(async () => {
        setIsLoggingOut(true);
        try {
            unlockSession();
            await logout();
        } finally {
            setIsLoggingOut(false);
        }
    }, [unlockSession, logout]);

    // Countdown timer tick logic
    useEffect(() => {
        if (!isLocked) {
            setTimeLeft(COUNTDOWN_TOTAL_SECONDS);
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        setTimeLeft(COUNTDOWN_TOTAL_SECONDS);

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleAutoLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isLocked, handleAutoLogout]);

    // Keyboard support: Pressing Enter or Space extends session immediately
    useEffect(() => {
        if (!isLocked) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                e.preventDefault();
                handleStayLoggedIn();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLocked, handleStayLoggedIn]);

    // Lock page background scrolling while countdown popup is active
    useEffect(() => {
        if (isLocked) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isLocked]);

    if (!isLocked) return null;

    // SVG Circular Timer Calculations
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (timeLeft / COUNTDOWN_TOTAL_SECONDS) * circumference;
    const isUrgent = timeLeft <= 15;

    // Format mm:ss
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    return (
        <AnimatePresence>
            {isLocked && (
                <motion.div
                    className="session-timeout-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                    <motion.div
                        className={`session-timeout-modal ${isUrgent ? 'urgent' : ''}`}
                        role="alertdialog"
                        aria-labelledby="timeout-title"
                        aria-describedby="timeout-desc"
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 15 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Top Security Pill */}
                        <div className="timeout-badge-wrap">
                            <span className="timeout-badge">
                                <FaShieldAlt className="timeout-badge-icon" />
                                Inactivity Notice
                            </span>
                        </div>

                        {/* Circular Countdown Display */}
                        <div className="timeout-circle-wrap">
                            <svg className="timeout-circle-svg" width="100" height="100" viewBox="0 0 100 100">
                                <circle
                                    className="timeout-circle-bg"
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                />
                                <circle
                                    className={`timeout-circle-progress ${isUrgent ? 'urgent' : ''}`}
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    style={{
                                        strokeDasharray: circumference,
                                        strokeDashoffset: strokeDashoffset
                                    }}
                                />
                            </svg>
                            <div className="timeout-time-display">
                                <span className={`timeout-digits ${isUrgent ? 'urgent' : ''}`}>{formattedTime}</span>
                                <span className="timeout-unit">sec</span>
                            </div>
                        </div>

                        {/* Modal Heading & Text */}
                        <h2 id="timeout-title" className="timeout-title">
                            Are you still there?
                        </h2>
                        <p id="timeout-desc" className="timeout-description">
                            You have been inactive for a while. To protect your account, your session will automatically log out when the timer reaches zero.
                        </p>

                        {/* User Account Info Chip */}
                        {user && (
                            <div className="timeout-user-pill">
                                <div className="timeout-user-avatar">
                                    {user.profilePicture ? (
                                        <img src={user.profilePicture} alt={user.firstName} />
                                    ) : (
                                        <FaUser />
                                    )}
                                </div>
                                <div className="timeout-user-text">
                                    <span className="timeout-user-name">
                                        {user.firstName} {user.lastName}
                                    </span>
                                    <span className="timeout-user-email">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="timeout-actions">
                            <button
                                type="button"
                                className="timeout-btn-primary"
                                onClick={handleStayLoggedIn}
                                autoFocus
                            >
                                <FaCheck className="btn-icon" />
                                Stay Logged In
                            </button>

                            <button
                                type="button"
                                className="timeout-btn-secondary"
                                onClick={handleManualLogout}
                                disabled={isLoggingOut}
                            >
                                <FaSignOutAlt className="btn-icon" />
                                {isLoggingOut ? 'Logging out...' : 'Log Out Now'}
                            </button>
                        </div>

                        <div className="timeout-hint">
                            Press <kbd>Enter</kbd> or <kbd>Space</kbd> to continue working
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SessionLock;
