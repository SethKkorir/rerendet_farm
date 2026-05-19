import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { FaCoffee, FaTimes, FaEye, FaEyeSlash, FaArrowLeft, FaEnvelope, FaLock, FaUser, FaGoogle } from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import { forgotPassword, resetPassword, verifyEmail, resendVerification } from '../../api/api';
import './AuthModal.css';

const defaultPolicies = {
    termsConditions: `
# Terms & Conditions
Welcome to Rerendet Coffee. By accessing our platform and purchasing our premium highland specialty coffees, you agree to comply with the following terms:

## 1. Quality and Specialty Standards
All Rerendet coffee is specialty-grade Arabica, grown at elevations of 1,800m above sea level in the rich volcanic soils of Kenya, hand-picked, and medium-roasted to order. We guarantee maximum freshness upon delivery.

## 2. Orders and Payments
All pricing is in KSh (Kenya Shillings). We support fully secure M-Pesa, debit/credit cards, and cash-on-delivery payments. Order cancellations are accepted within 1 hour of placement before roasting begins.

## 3. Shipping and Logistics
We partner with premium local couriers to deliver freshly roasted coffee directly to your doorstep. Deliveries are processed within 24-48 hours.

## 4. Intellectual Property
All content, photography, branding, custom-blended recipes, and coffee-builder configurations are the exclusive property of Rerendet Coffee.
    `,
    privacyPolicy: `
# Privacy Policy
At Rerendet Coffee, we are committed to protecting your personal information and ensuring a highly secure, premium shopping experience.

## 1. Personal Data Collected
We securely collect and store your name, email address, shipping address, phone number, and preferences solely to facilitate coffee order processing, seamless shipping logistics, and account security.

## 2. Secure Payment Processing
We do not store or process credit card details on our servers. All financial transactions are fully tokenized and routed securely through PCI-DSS compliant direct payment gateways.

## 3. Account Health & Security
Your credentials are fully hashed using industry-standard bcrypt encryption. You may enable Two-Factor Authentication (2FA) inside your profile settings for maximum account protection.

## 4. Data Deletion
We respect your right to privacy. You can permanently delete your account and wipe all personal order history at any time directly through your Profile Dashboard.
    `
};

const AuthModal = ({ isOpen, onClose, initialView = 'login' }) => {
    const { login, register, loginWithGoogle, verify2FA, verifyEmail, loading: authLoading, showSuccess, showError, showNotification, publicSettings } = useContext(AppContext);

    // Views: login, signup, forgot-password, reset-password, verify-email, policies
    const [view, setView] = useState(initialView);
    const [policyType, setPolicyType] = useState('termsConditions');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    // Form States
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [signupData, setSignupData] = useState({
        firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
        phone: '', gender: '', dob: '', agreeTerms: false
    });
    const [signupStep, setSignupStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetData, setResetData] = useState({ code: '', newPassword: '', confirmPassword: '' });
    const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
    const [resendTimer, setResendTimer] = useState(0);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setErrors({});
            setSignupStep(1);
            setResendTimer(0);
        }
    }, [isOpen, initialView]);

    // Resend Timer Logic
    useEffect(() => {
        let timer;
        if (resendTimer > 0) {
            timer = setInterval(() => setResendTimer(t => t - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [resendTimer]);

    // GOOGLE LOGIN (Custom Hook)
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const data = await loginWithGoogle({ accessToken: tokenResponse.access_token });
                if (data?.requires2FA) {
                    setLoginData(prev => ({ ...prev, email: data.email }));
                    setSignupData(prev => ({ ...prev, email: data.email }));
                    setView('2fa-login');
                } else {
                    onClose();
                }
            } catch (err) {
                // Handled in context
            }
        },
        onError: () => setErrors({ general: 'Google Auth failed' })
    });

    if (!isOpen) return null;

    // --- Handlers ---

    const handleInputChange = (setter) => (e) => {
        const { name, value, type, checked } = e.target;
        setter(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error for this field
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // LOGIN
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!loginData.email || !loginData.password) return setErrors({ general: 'All fields are required' });

        setLoading(true);
        setErrors({});
        try {
            const data = await login(loginData);
            if (data?.requires2FA) {
                // If 2FA required, switch to 2FA view
                setView('2fa-login');
                setVerificationCode(['', '', '', '', '', '']); // Clear code
            } else {
                onClose();
            }
        } catch (err) {
            // Explicitly set the error here so it shows in the modal
            const msg = err.response?.data?.message || err.message || 'Login failed';
            setErrors({ general: msg });
        } finally {
            setLoading(false);
        }
    };

    // SIGNUP
    const handleSignupNext = (e) => {
        e.preventDefault();
        setErrors({});

        if (signupStep === 1) {
            if (!validateEmail(signupData.email)) return setErrors({ email: 'Invalid email address' });
            setSignupStep(2);
        } else if (signupStep === 2) {
            if (signupData.password.length < 8) return setErrors({ password: 'Password must be at least 8 characters' });
            if (signupData.password !== signupData.confirmPassword) return setErrors({ confirmPassword: 'Passwords do not match' });
            setSignupStep(3);
        } else if (signupStep === 3) {
            if (!signupData.firstName) return setErrors({ firstName: 'First name is required' });
            if (!signupData.lastName) return setErrors({ lastName: 'Last name is required' });
            setSignupStep(4);
        }
        setErrors({}); // Clear errors when moving forward
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (!signupData.agreeTerms) return setErrors({ agreeTerms: 'You must agree to the terms' });

        setLoading(true);
        setErrors({});
        try {
            await register(signupData); // This triggers email sending on backend
            setView('verify-email');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Registration failed';
            setErrors({ general: msg });
        } finally {
            setLoading(false);
        }
    };

    // VERIFICATION
    const handleVerification = async (e, forcedCode = null) => {
        if (e) e.preventDefault();
        const code = forcedCode || verificationCode.join('');
        if (code.length !== 6) return setErrors({ code: 'Enter full 6-digit code' });

        setLoading(true);
        try {
            const email = view === 'reset-password' ? forgotEmail : signupData.email || loginData.email;

            if (view === '2fa-login') {
                return await handle2FASubmit(null, code);
            }

            // Email Verification
            await verifyEmail(email, code);
            onClose(); // Auto-login and close modal on success

        } catch (err) {
            setErrors({ general: err.response?.data?.message || 'Verification failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationInput = (index, value) => {
        const char = value.slice(-1);
        
        // Determine allowed characters based on view
        const isHex = view === 'reset-password';
        const allowedRegex = isHex ? /^[0-9a-fA-F]$/ : /^\d$/;

        if (char && !allowedRegex.test(char)) return;

        // Auto-lowercase hex characters for consistency
        const finalChar = (isHex && char) ? char.toLowerCase() : char;

        const newCode = [...verificationCode];
        newCode[index] = finalChar;
        setVerificationCode(newCode);

        // Auto move to next input
        if (finalChar && index < 5) {
            const nextInput = document.getElementById(`v-${index + 1}`);
            if (nextInput) nextInput.focus();
        }

        // Trigger auto-submit if full
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
            setErrors(prev => ({ ...prev, code: '' }));
            // We'll let the user see the digits for a split second before auto-submitting
            setTimeout(() => {
                if (view === 'verify-email') handleVerification(null, fullCode);
                else if (view === '2fa-login') handle2FASubmit(null, fullCode);
                else if (view === 'reset-password') setErrors(prev => ({ ...prev, code: '' })); // Just clear error for reset view
            }, 100);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
            const prevInput = document.getElementById(`v-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        
        const isHex = view === 'reset-password';
        const allowedRegex = isHex ? /^[0-9a-fA-F]+$/ : /^\d+$/;
        
        if (!allowedRegex.test(pastedData)) return;

        const finalPasted = isHex ? pastedData.toLowerCase() : pastedData;
        const newCode = finalPasted.split('').concat(Array(6 - finalPasted.length).fill('')).slice(0, 6);
        setVerificationCode(newCode);

        // Focus the appropriate input
        const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
        const nextInput = document.getElementById(`v-${nextIndex}`);
        if (nextInput) nextInput.focus();

        if (pastedData.length === 6) {
            setErrors(prev => ({ ...prev, code: '' }));
            setTimeout(() => {
                if (view === 'verify-email') handleVerification(null, finalPasted);
                else if (view === '2fa-login') handle2FASubmit(null, finalPasted);
            }, 100);
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0) return;

        setLoading(true);
        try {
            const email = view === 'reset-password' ? forgotEmail : signupData.email || loginData.email;
            await resendVerification(email);
            showSuccess('A new verification code has been sent.');
            setResendTimer(60); // 60s cooldown
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    // FORGOT PASSWORD
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!validateEmail(forgotEmail)) return setErrors({ email: 'Invalid email' });

        setLoading(true);
        setErrors({});
        try {
            await forgotPassword({ email: forgotEmail });
            showSuccess('Reset code sent to your email');
            setView('reset-password');
            setVerificationCode(['', '', '', '', '', '']); // reset code for next step
        } catch (err) {
            setErrors({ general: err.response?.data?.message || err.message || 'Failed to send code' });
        } finally {
            setLoading(false);
        }
    };

    // RESET PASSWORD
    const handleResetPassword = async (e) => {
        e.preventDefault();
        const code = verificationCode.join('');
        if (code.length !== 6) return setErrors({ code: 'Enter 6-digit code' });
        if (resetData.newPassword !== resetData.confirmPassword) return setErrors({ confirmPassword: 'Passwords do not match' });

        setLoading(true);
        try {
            await resetPassword({
                email: forgotEmail,
                code,
                newPassword: resetData.newPassword
            });
            showSuccess('Password reset successfully! Please login.');
            setErrors({});
            setView('login');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Reset failed';
            setErrors({ general: msg });
        } finally {
            setLoading(false);
        }
    };

    // 2FA SUBMIT
    const handle2FASubmit = async (e, forcedCode = null) => {
        if (e) e.preventDefault();
        const code = forcedCode || verificationCode.join('');
        if (code.length !== 6) return setErrors({ code: 'Enter full 6-digit code' });

        setLoading(true);
        try {
            // Determine email to use
            const email = loginData.email || signupData.email; // Should be in loginData for login flow
            await verify2FA(email, code);
            onClose(); // Success handled in context (showSuccess)
        } catch (err) {
            setErrors({ general: 'Verification failed. Please check the code.' });
        } finally {
            setLoading(false);
        }
    };

    const evaluatePasswordStrength = (pass) => {
        if (!pass) return { score: 0, label: 'Empty', color: '#666', feedback: 'Enter a secure password' };
        let score = 0;
        
        // Length check
        if (pass.length >= 8) score++;
        if (pass.length >= 12) score++;
        
        // Diversity check
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

    // --- Render Helpers ---

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 }
    };

    const contentVariants = {
        hidden: { x: 20, opacity: 0 },
        visible: { x: 0, opacity: 1 },
        exit: { x: -20, opacity: 0 }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="auth-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="auth-modal-container"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={e => e.stopPropagation()}
                >
                    <button className="close-auth-btn" onClick={onClose} aria-label="Close modal"><FaTimes /></button>

                    {(view !== 'login' && view !== '2fa-login' && (view !== 'signup' || signupStep > 1 || view === 'policies')) && (
                        <button
                            className="back-btn"
                            onClick={() => {
                                setErrors({});
                                if (view === 'policies') {
                                    setView('signup');
                                } else if (view === 'signup' && signupStep > 1) {
                                    setSignupStep(s => s - 1);
                                } else {
                                    setView('login');
                                    setSignupStep(1);
                                }
                            }}
                            aria-label="Go back"
                        >
                            <FaArrowLeft />
                        </button>
                    )}

                    <div className="auth-content">
                        {/* Header Section */}
                        <div className="auth-header">
                            <div className="auth-premium-watermark">PREMIUM</div>
                            <div className="auth-logo">
                                <img src="/rerendet-logo.png" alt="Rerendet" />
                            </div>
                            <h2 className="premium-title">
                                {view === 'login' && 'Welcome Back'}
                                {view === 'signup' && 'Create Account'}
                                {view === 'forgot-password' && 'Reset Password'}
                                {view === 'verify-email' && 'Verify Email'}
                                {view === 'reset-password' && 'New Password'}
                                {view === '2fa-login' && 'Security Verification'}
                                {view === 'policies' && (policyType === 'termsConditions' ? 'Terms & Conditions' : 'Privacy Policy')}
                            </h2>
                            <p className="auth-subtitle">
                                {view === 'login' && 'Log in to manage your orders and profile'}
                                {view === 'signup' && 'Join our community for a premium experience'}
                                {view === 'forgot-password' && "Don't worry, we'll help you get back in"}
                                {view === 'verify-email' && 'We sent a code to your email'}
                                {view === '2fa-login' && 'Enter the code sent to your email'}
                                {view === 'policies' && 'Please review our guiding principles'}
                            </p>
                        </div>

                        {/* Error Banner */}
                        {errors.general && <div className="error-message">{errors.general}</div>}

                        {/* VIEWS */}
                        <AnimatePresence mode="wait">

                            {/* LOGIN VIEW */}
                            {view === 'login' && (
                                <motion.form
                                    key="login"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={handleLogin}
                                >
                                    <div className="form-group">
                                        <label>Email</label>
                                        <div className="form-input-wrapper">
                                            <input
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                className={`form-input ${errors.email ? 'error' : ''}`}
                                                value={loginData.email}
                                                onChange={handleInputChange(setLoginData)}
                                                placeholder="hello@example.com"
                                            />
                                            <FaEnvelope className="input-icon-btn" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Password</label>
                                        <div className="form-input-wrapper">
                                            <input
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-input"
                                                autoComplete="current-password"
                                                value={loginData.password}
                                                onChange={handleInputChange(setLoginData)}
                                                placeholder="••••••••"
                                            />
                                            <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        </div>
                                        <button type="button" className="forgot-password-link" onClick={() => setView('forgot-password')}>
                                            Forgot Password?
                                        </button>
                                    </div>

                                    <button type="submit" className="primary-btn" disabled={loading || authLoading}>
                                        {(loading || authLoading) ? <FaCoffee className="logo-spin" /> : 'Log In'}
                                    </button>

                                    <div className="auth-divider"><span>OR</span></div>

                                    <div className="social-login-wrapper">
                                        <button
                                            type="button"
                                            className="custom-google-btn login"
                                            onClick={() => showNotification('Google login is coming soon!', 'info')}
                                            disabled={loading || authLoading}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                            </svg>
                                            <span>Login with Google (Coming Soon)</span>
                                        </button>
                                    </div>

                                    <div className="auth-footer">
                                        New here? <button type="button" className="link-btn" onClick={() => setView('signup')}>Create an account</button>
                                    </div>
                                </motion.form>
                            )}

                            {/* SIGNUP VIEW */}
                            {view === 'signup' && (
                                <motion.form
                                    key="signup"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={signupStep === 4 ? handleSignupSubmit : handleSignupNext}
                                >
                                    <div className="signup-progress">
                                        {[1, 2, 3, 4].map(step => (
                                            <div key={step} className={`progress-dot ${signupStep >= step ? 'active' : ''}`} />
                                        ))}
                                    </div>

                                    {/* Step 1: Email */}
                                    {signupStep === 1 && (
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <div className="form-input-wrapper">
                                                <input
                                                    name="email" type="email" className="form-input"
                                                    autoComplete="email"
                                                    value={signupData.email} onChange={handleInputChange(setSignupData)}
                                                    placeholder="hello@example.com" autoFocus
                                                />
                                                <FaEnvelope className="input-icon-btn" />
                                            </div>
                                            {errors.email && <span className="error-text">{errors.email}</span>}
                                        </div>
                                    )}

                                    {/* Step 2: Password */}
                                    {signupStep === 2 && (
                                        <>
                                            <div className="form-group">
                                                <label>Password</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        name="password" type={showPassword ? 'text' : 'password'} className="form-input"
                                                        autoComplete="new-password"
                                                        value={signupData.password} onChange={handleInputChange(setSignupData)}
                                                        placeholder="••••••••" autoFocus
                                                    />
                                                    <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                                    </button>
                                                </div>
                                                {signupData.password && (
                                                    <div className="password-strength-container" style={{ marginTop: '0.5rem' }}>
                                                        <div className="strength-bars-wrap" style={{ display: 'flex', gap: '4px', height: '4px', margin: '6px 0 4px' }}>
                                                            {[0, 1, 2, 3].map((index) => {
                                                                const strength = evaluatePasswordStrength(signupData.password);
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
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                                                            <span style={{ color: evaluatePasswordStrength(signupData.password).color }}>
                                                                {evaluatePasswordStrength(signupData.password).label}
                                                            </span>
                                                            <span style={{ color: 'var(--text-muted)' }}>
                                                                {evaluatePasswordStrength(signupData.password).feedback}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                {errors.password && <span className="error-text">{errors.password}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm Password</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        name="confirmPassword" type={showPassword ? 'text' : 'password'} className="form-input"
                                                        autoComplete="new-password"
                                                        value={signupData.confirmPassword} onChange={handleInputChange(setSignupData)}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                                            </div>
                                        </>
                                    )}

                                    {/* Step 3: Details */}
                                    {signupStep === 3 && (
                                        <>
                                            <div className="form-group">
                                                <label>First Name</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        name="firstName" className="form-input"
                                                        autoComplete="new-user-first-name"
                                                        value={signupData.firstName} onChange={handleInputChange(setSignupData)}
                                                        placeholder="John" autoFocus
                                                    />
                                                    <FaUser className="input-icon-btn" />
                                                </div>
                                                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                                            </div>
                                            <div className="form-group">
                                                <label>Last Name</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        name="lastName" className="form-input"
                                                        autoComplete="new-user-last-name"
                                                        value={signupData.lastName} onChange={handleInputChange(setSignupData)}
                                                        placeholder="Doe"
                                                    />
                                                    <FaUser className="input-icon-btn" />
                                                </div>
                                                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                                            </div>
                                        </>
                                    )}

                                    {/* Step 4: Final */}
                                    {signupStep === 4 && (
                                        <>
                                            <div className="form-group">
                                                <label>Gender (Optional)</label>
                                                <select name="gender" className="form-input" value={signupData.gender} onChange={handleInputChange(setSignupData)}>
                                                    <option value="">Select</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '15px', marginTop: '1rem' }}>
                                                <input
                                                    type="checkbox" name="agreeTerms"
                                                    checked={signupData.agreeTerms} onChange={handleInputChange(setSignupData)}
                                                    style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
                                                />
                                                <label style={{ fontSize: '0.85rem', textTransform: 'none', letterSpacing: 'normal', fontWeight: '500', padding: 0 }}>
                                                    I agree to <button type="button" onClick={(e) => { e.preventDefault(); setPolicyType('termsConditions'); setView('policies'); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '700', textDecoration: 'none', padding: 0 }}>Terms & Conditions</button>
                                                </label>
                                            </div>
                                            {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
                                        </>
                                    )}

                                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '1rem' }}>
                                        {loading ? 'Processing...' : (signupStep === 4 ? 'Create Account' : 'Continue')}
                                    </button>

                                    {signupStep === 1 && (
                                        <>
                                            <div className="auth-divider"><span>OR</span></div>
                                            <div className="social-login-wrapper">
                                                <button
                                                    type="button"
                                                    className="custom-google-btn signup"
                                                    onClick={() => showNotification('Google sign-up is coming soon!', 'info')}
                                                    disabled={loading || authLoading}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                                    </svg>
                                                    <span>Sign up with Google (Coming Soon)</span>
                                                </button>
                                            </div>
                                            <div className="auth-footer">
                                                Already have an account? <button type="button" className="link-btn" onClick={() => { setView('login'); setErrors({}); }}>Log In</button>
                                            </div>
                                        </>
                                    )}
                                </motion.form>
                            )}

                            {/* FORGOT PASSWORD VIEW */}
                            {view === 'forgot-password' && (
                                <motion.form
                                    key="forgot"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={handleForgotPassword}
                                >
                                    <div className="form-group">
                                        <label>Enter your email</label>
                                        <input
                                            type="email" className="form-input"
                                            value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                            placeholder="hello@example.com"
                                        />
                                        {errors.email && <span className="error-text">{errors.email}</span>}
                                    </div>

                                    <button type="submit" className="primary-btn" disabled={loading}>
                                        {loading ? 'Sending...' : 'Send Reset Code'}
                                    </button>
                                </motion.form>
                            )}

                            {/* VERIFICATION & RESET & 2FA VIEW */}
                            {(view === 'verify-email' || view === 'reset-password' || view === '2fa-login') && (
                                <motion.form
                                    key="verify"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={view === 'reset-password' ? handleResetPassword : (view === '2fa-login' ? handle2FASubmit : handleVerification)}
                                >
                                    <div className="verification-info" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        {view === 'verify-email' && (
                                            <p className="auth-subtitle">Code sent to <strong>{signupData.email || loginData.email}</strong></p>
                                        )}
                                        {view === '2fa-login' && (
                                            <p className="auth-subtitle">Code sent to <strong>{loginData.email}</strong></p>
                                        )}
                                        {view === 'reset-password' && (
                                            <p className="auth-subtitle">Enter code sent to <strong>{forgotEmail}</strong></p>
                                        )}
                                    </div>

                                    <div className="verification-grid" onPaste={handlePaste}>
                                        {verificationCode.map((digit, i) => (
                                            <input
                                                key={i} id={`v-${i}`}
                                                className="verification-digit"
                                                value={digit}
                                                maxLength={1}
                                                onChange={e => handleVerificationInput(i, e.target.value)}
                                                onKeyDown={e => handleKeyDown(i, e)}
                                                autoFocus={i === 0}
                                                autoComplete="one-time-code"
                                            />
                                        ))}
                                    </div>
                                    {errors.code && <div className="error-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>{errors.code}</div>}

                                    {view === 'reset-password' && (
                                        <>
                                            <div className="form-group">
                                                <label>New Password</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        type="password" className="form-input"
                                                        value={resetData.newPassword}
                                                        onChange={e => setResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                {resetData.newPassword && (
                                                    <div className="password-strength-container" style={{ marginTop: '0.5rem' }}>
                                                        <div className="strength-bars-wrap" style={{ display: 'flex', gap: '4px', height: '4px', margin: '6px 0 4px' }}>
                                                            {[0, 1, 2, 3].map((index) => {
                                                                const strength = evaluatePasswordStrength(resetData.newPassword);
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
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                                                            <span style={{ color: evaluatePasswordStrength(resetData.newPassword).color }}>
                                                                {evaluatePasswordStrength(resetData.newPassword).label}
                                                            </span>
                                                            <span style={{ color: 'var(--text-muted)' }}>
                                                                {evaluatePasswordStrength(resetData.newPassword).feedback}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="form-group">
                                                <label>Confirm Password</label>
                                                <div className="form-input-wrapper">
                                                    <input
                                                        type="password" className="form-input"
                                                        value={resetData.confirmPassword}
                                                        onChange={e => setResetData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '1rem' }}>
                                        {loading ? 'Verifying...' : (view === 'reset-password' ? 'Reset Password' : 'Confirm Verification')}
                                    </button>

                                    <div className="verification-extra-links">
                                        <div className="resend-container">
                                            {resendTimer > 0 ? (
                                                <span className="timer-text">Resend code in {resendTimer}s</span>
                                            ) : (
                                                <button type="button" className="link-btn" onClick={handleResendCode} disabled={loading}>
                                                    Resend Code
                                                </button>
                                            )}
                                        </div>
                                        <div className="policy-note">
                                            By verifying, you confirm you've read our <button type="button" onClick={(e) => { e.preventDefault(); setPolicyType('termsConditions'); setView('policies'); }} className="link-btn-small">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setPolicyType('privacyPolicy'); setView('policies'); }} className="link-btn-small">Privacy Policy</button>
                                        </div>
                                    </div>
                                </motion.form>
                            )}

                            {/* POLICIES VIEW */}
                            {view === 'policies' && (
                                <motion.div
                                    key="policies"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-policy-content"
                                >
                                    <div className="policy-text-wrap">
                                        <div
                                            className="policy-body-rendered"
                                            dangerouslySetInnerHTML={{
                                                __html: (() => {
                                                    const dbPolicy = publicSettings?.policies?.[policyType];
                                                    const isPlaceholder = !dbPolicy || dbPolicy.trim().length < 15 || /updating|updated/i.test(dbPolicy);
                                                    const finalPolicy = isPlaceholder ? defaultPolicies[policyType] : dbPolicy;
                                                    return finalPolicy
                                                        .replace(/\n/g, '<br/>')
                                                        .replace(/## (.*)/g, '<h3>$1</h3>')
                                                        .replace(/# (.*)/g, '<h2>$1</h2>');
                                                })()
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="primary-btn"
                                        style={{ marginTop: '2rem' }}
                                        onClick={() => setView('signup')}
                                    >
                                        I Understand
                                    </button>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AuthModal;
