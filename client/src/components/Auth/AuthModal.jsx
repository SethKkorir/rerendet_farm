import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { FaCoffee, FaTimes, FaEye, FaEyeSlash, FaArrowLeft, FaEnvelope, FaLock, FaUser, FaGoogle } from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import { forgotPassword, verifyResetCode, resetPassword, verifyEmail, resendVerification, checkEmail } from '../../api/api';
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

const AuthModal = ({ isOpen = true, onClose, initialView = 'login', embedded = false }) => {
    const { login, register, loginWithGoogle, verify2FA, verifyEmail, loading: authLoading, showSuccess, showError, showNotification, publicSettings } = useContext(AppContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

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
    const [verifiedResetCode, setVerifiedResetCode] = useState('');
    const [resetData, setResetData] = useState({ code: '', newPassword: '', confirmPassword: '' });
    const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
    const [resendTimer, setResendTimer] = useState(0);

    // Success redirect handler
    const handleAuthSuccess = useCallback(() => {
        if (embedded) {
            const redirect = searchParams.get('redirect') || sessionStorage.getItem('authRedirect') || '/account';
            sessionStorage.removeItem('authRedirect');
            navigate(redirect.startsWith('/') ? redirect : `/${redirect}`);
        }
        if (onClose) onClose();
    }, [embedded, searchParams, navigate, onClose]);

    // View switcher (syncs routes when embedded)
    const switchView = useCallback((newView) => {
        setView(newView);
        setErrors({});
        if (embedded) {
            if (newView === 'signup') {
                navigate('/signup' + (location.search || ''));
            } else if (newView === 'login') {
                navigate('/login' + (location.search || ''));
            }
        }
    }, [embedded, navigate, location.search]);

    // Reset state when modal opens/closes or initialView updates
    useEffect(() => {
        if (isOpen || embedded) {
            const urlEmail = searchParams.get('email') || '';
            const urlToken = searchParams.get('token') || searchParams.get('resetToken') || '';
            const urlCode = searchParams.get('code') || '';

            const isUrlReset = Boolean(urlToken || urlCode || initialView === 'reset-password');
            setView(isUrlReset ? 'reset-password' : initialView);
            setErrors({});
            setSignupStep(1);
            setResendTimer(0);
            setForgotEmail(urlEmail);
            setVerifiedResetCode(urlToken || urlCode);
            if (urlCode && urlCode.length === 6) {
                setVerificationCode(urlCode.split(''));
            } else {
                setVerificationCode(['', '', '', '', '', '']);
            }
            setResetData({ code: '', newPassword: '', confirmPassword: '' });
        }
    }, [isOpen, initialView, embedded, searchParams]);

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
                    handleAuthSuccess();
                }
            } catch (err) {
                // Handled in context
            }
        },
        onError: () => setErrors({ general: 'Google Auth failed' })
    });

    if (!isOpen && !embedded) return null;

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
                handleAuthSuccess();
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
    const handleSignupNext = async (e) => {
        e.preventDefault();
        setErrors({});

        if (signupStep === 1) {
            const email = (signupData.email || '').trim().toLowerCase();
            if (!validateEmail(email)) {
                return setErrors({ email: 'Please enter a valid email address' });
            }

            setLoading(true);
            try {
                const checkRes = await checkEmail(email);
                const exists = checkRes.data?.exists || checkRes.data?.data?.exists;
                if (exists) {
                    setErrors({ email: 'An account with this email already exists. Please log in or use a different email.' });
                    return;
                }
                // Only advance to password step if email does NOT exist in database
                setErrors({});
                setSignupStep(2);
            } catch (err) {
                const msg = err.response?.data?.message || 'Could not verify email availability. Please try again.';
                setErrors({ email: msg });
            } finally {
                setLoading(false);
            }
        } else if (signupStep === 2) {
            const passwordError = validatePasswordRequirements(signupData.password);
            if (passwordError) {
                return setErrors({ password: passwordError });
            }
            if (!signupData.confirmPassword) {
                return setErrors({ confirmPassword: 'Please confirm your password.' });
            }
            if (signupData.password !== signupData.confirmPassword) {
                return setErrors({ confirmPassword: 'Passwords do not match.' });
            }
            setErrors({});
            setSignupStep(3);
        } else if (signupStep === 3) {
            if (!signupData.firstName?.trim()) return setErrors({ firstName: 'First name is required' });
            if (!signupData.lastName?.trim()) return setErrors({ lastName: 'Last name is required' });
            setErrors({});
            setSignupStep(4);
        }
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

    const clearVerificationCode = () => {
        setVerificationCode(['', '', '', '', '', '']);
        setErrors(prev => ({ ...prev, code: '', general: '' }));
        setTimeout(() => {
            document.getElementById('v-0')?.focus();
        }, 50);
    };

    // VERIFICATION
    const handleVerification = async (e, forcedCode = null) => {
        if (e) e.preventDefault();
        const code = (forcedCode || verificationCode.join('')).trim();
        if (code.length !== 6) return setErrors({ code: 'Enter full 6-digit code' });

        setLoading(true);
        try {
            const email = signupData.email || loginData.email;

            if (view === '2fa-login') {
                return await handle2FASubmit(null, code);
            }

            // Email Verification
            await verifyEmail(email, code);
            handleAuthSuccess(); // Auto-login and complete auth on success

        } catch (err) {
            setErrors({ general: err.response?.data?.message || 'Verification failed' });
            setVerificationCode(['', '', '', '', '', '']);
            setTimeout(() => {
                document.getElementById('v-0')?.focus();
            }, 50);
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationInput = (index, value) => {
        const char = value.slice(-1);
        if (char && !/^[0-9a-zA-Z]$/.test(char)) return;

        const newCode = [...verificationCode];
        newCode[index] = char ? char.toUpperCase() : '';
        setVerificationCode(newCode);

        // Auto move to next input
        if (char && index < 5) {
            const nextInput = document.getElementById(`v-${index + 1}`);
            if (nextInput) nextInput.focus();
        }

        // Trigger auto-submit if full
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
            setErrors(prev => ({ ...prev, code: '', general: '' }));
            setTimeout(() => {
                if (view === 'verify-email') handleVerification(null, fullCode);
                else if (view === '2fa-login') handle2FASubmit(null, fullCode);
                else if (view === 'verify-reset-code') handleVerifyResetCode(null, fullCode);
            }, 120);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!verificationCode[index] && index > 0) {
                const newCode = [...verificationCode];
                newCode[index - 1] = '';
                setVerificationCode(newCode);
                const prevInput = document.getElementById(`v-${index - 1}`);
                if (prevInput) prevInput.focus();
            } else if (verificationCode[index]) {
                const newCode = [...verificationCode];
                newCode[index] = '';
                setVerificationCode(newCode);
            }
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\s+/g, '').slice(0, 6);
        if (!/^[0-9a-zA-Z]+$/.test(pastedData)) return;

        const upperPasted = pastedData.toUpperCase();
        const newCode = upperPasted.split('').concat(Array(6 - upperPasted.length).fill('')).slice(0, 6);
        setVerificationCode(newCode);

        // Focus the appropriate input
        const nextIndex = upperPasted.length < 6 ? upperPasted.length : 5;
        const nextInput = document.getElementById(`v-${nextIndex}`);
        if (nextInput) nextInput.focus();

        if (upperPasted.length === 6) {
            setErrors(prev => ({ ...prev, code: '', general: '' }));
            setTimeout(() => {
                if (view === 'verify-email') handleVerification(null, upperPasted);
                else if (view === '2fa-login') handle2FASubmit(null, upperPasted);
                else if (view === 'verify-reset-code') handleVerifyResetCode(null, upperPasted);
            }, 120);
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0) return;

        setLoading(true);
        try {
            const isResetFlow = view === 'verify-reset-code' || view === 'reset-password';
            const email = isResetFlow ? forgotEmail : signupData.email || loginData.email;

            if (isResetFlow) {
                await forgotPassword({ email });
            } else {
                await resendVerification(email);
            }

            showSuccess('A new verification code has been sent.');
            setResendTimer(60); // 60s cooldown
            setVerificationCode(['', '', '', '', '', '']);
            setErrors({});
            setTimeout(() => {
                document.getElementById('v-0')?.focus();
            }, 50);
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    // STEP 1: FORGOT PASSWORD (Enter Email)
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!validateEmail(forgotEmail)) return setErrors({ email: 'Please enter a valid email address' });

        setLoading(true);
        setErrors({});
        try {
            await forgotPassword({ email: forgotEmail });
            showSuccess('Reset code sent to your email');
            setVerificationCode(['', '', '', '', '', '']);
            setVerifiedResetCode('');
            setResendTimer(60);
            setView('verify-reset-code');
            setTimeout(() => {
                document.getElementById('v-0')?.focus();
            }, 100);
        } catch (err) {
            setErrors({ general: err.response?.data?.message || err.message || 'Failed to send code' });
        } finally {
            setLoading(false);
        }
    };

    // STEP 2: VERIFY RESET CODE (Confirm Code Before Entering New Password)
    const handleVerifyResetCode = async (e, forcedCode = null) => {
        if (e) e.preventDefault();
        const code = (forcedCode || verificationCode.join('')).trim();
        if (code.length !== 6) {
            return setErrors({ code: 'Please enter the complete 6-digit verification code' });
        }

        setLoading(true);
        setErrors({});
        try {
            await verifyResetCode({ email: forgotEmail, code });
            setVerifiedResetCode(code);
            showSuccess('Code confirmed! You can now set your new password.');
            setErrors({});
            setView('reset-password');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Invalid or expired verification code';
            setErrors({ general: errorMsg, code: errorMsg });
            // Automatically clear digits and refocus first box on error
            setVerificationCode(['', '', '', '', '', '']);
            setTimeout(() => {
                document.getElementById('v-0')?.focus();
            }, 50);
        } finally {
            setLoading(false);
        }
    };

    // STEP 3: RESET PASSWORD (Set New Password)
    const handleResetPassword = async (e) => {
        e.preventDefault();
        const code = (verifiedResetCode || verificationCode.join('').trim() || searchParams.get('token') || searchParams.get('resetToken') || searchParams.get('code') || '').trim();
        const email = (forgotEmail || searchParams.get('email') || '').trim();

        if (!email) {
            return setErrors({ general: 'Please specify your account email address.' });
        }
        if (!code) {
            setErrors({ general: 'Verification code or reset link token is missing. Please check your reset link or enter your code.' });
            setView('verify-reset-code');
            return;
        }

        const passwordError = validatePasswordRequirements(resetData.newPassword);
        if (passwordError) {
            return setErrors({ newPassword: passwordError });
        }
        if (!resetData.confirmPassword) {
            return setErrors({ confirmPassword: 'Please confirm your password' });
        }
        if (resetData.newPassword !== resetData.confirmPassword) {
            return setErrors({ confirmPassword: 'Passwords do not match' });
        }

        setLoading(true);
        setErrors({});
        try {
            await resetPassword({
                email,
                code,
                newPassword: resetData.newPassword
            });
            showSuccess('Password reset successfully! Please log in with your new password.');
            // Clean up all reset states completely like a pro
            setForgotEmail('');
            setVerificationCode(['', '', '', '', '', '']);
            setVerifiedResetCode('');
            setResetData({ code: '', newPassword: '', confirmPassword: '' });
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
        const code = (forcedCode || verificationCode.join('')).trim();
        if (code.length !== 6) return setErrors({ code: 'Enter full 6-digit code' });

        setLoading(true);
        try {
            // Determine email to use
            const email = loginData.email || signupData.email; // Should be in loginData for login flow
            await verify2FA(email, code);
            handleAuthSuccess(); // Success handled in context (showSuccess)
        } catch (err) {
            setErrors({ general: err.response?.data?.message || '2FA Verification failed' });
            setVerificationCode(['', '', '', '', '', '']);
            setTimeout(() => {
                document.getElementById('v-0')?.focus();
            }, 50);
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

    const validatePasswordRequirements = (password) => {
        if (!password) {
            return 'Password is required.';
        }
        if (password.length < 8) {
            return 'Password must be at least 8 characters long.';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Password must contain at least one uppercase letter (A-Z).';
        }
        if (!/[a-z]/.test(password)) {
            return 'Password must contain at least one lowercase letter (a-z).';
        }
        if (!/\d/.test(password)) {
            return 'Password must contain at least one number (0-9).';
        }
        const strength = evaluatePasswordStrength(password);
        if (strength.score < 3) {
            return 'Password is structurally weak. Please use a stronger combination of letters, numbers, or symbols.';
        }
        return null;
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

    const cardContent = (
        <div
            className={`auth-modal-container ${embedded ? 'auth-embedded-container' : ''}`}
            onClick={e => e.stopPropagation()}
        >
            {!embedded && (
                <button className="close-auth-btn" onClick={onClose} aria-label="Close modal">
                    <FaTimes />
                </button>
            )}

            {(view !== 'login' && view !== '2fa-login') && (
                <button
                    className="back-btn"
                    onClick={() => {
                        setErrors({});
                        if (view === 'policies') {
                            switchView('signup');
                        } else if (view === 'signup' && signupStep > 1) {
                            setSignupStep(s => s - 1);
                        } else if (view === 'reset-password') {
                            // Step 3 -> Back to Step 2
                            setResetData({ code: '', newPassword: '', confirmPassword: '' });
                            switchView('verify-reset-code');
                        } else if (view === 'verify-reset-code') {
                            // Step 2 -> Back to Step 1: CLEAR EMAIL & CODE COMPLETELY!
                            setForgotEmail('');
                            setVerificationCode(['', '', '', '', '', '']);
                            setResetData({ code: '', newPassword: '', confirmPassword: '' });
                            setVerifiedResetCode('');
                            setErrors({});
                            switchView('forgot-password');
                        } else if (view === 'forgot-password') {
                            // Step 1 -> Back to Login
                            setForgotEmail('');
                            setVerificationCode(['', '', '', '', '', '']);
                            setResetData({ code: '', newPassword: '', confirmPassword: '' });
                            setVerifiedResetCode('');
                            setErrors({});
                            switchView('login');
                        } else {
                            switchView('login');
                            setSignupStep(1);
                        }
                    }}
                    aria-label="Go back"
                >
                    <FaArrowLeft />
                </button>
            )}

            <div className="auth-content">
                {/* Header Section (PREMIUM watermark removed) */}
                <div className="auth-header">
                    <div className="auth-logo">
                        <img src="/rerendet-logo.png" alt="Rerendet" />
                    </div>
                    <h2 className="premium-title">
                        {view === 'login' && 'Welcome Back'}
                        {view === 'signup' && 'Create Account'}
                        {view === 'forgot-password' && 'Reset Password'}
                        {view === 'verify-reset-code' && 'Verify Code'}
                        {view === 'reset-password' && 'New Password'}
                        {view === 'verify-email' && 'Verify Email'}
                        {view === '2fa-login' && 'Security Verification'}
                        {view === 'policies' && (policyType === 'termsConditions' ? 'Terms & Conditions' : 'Privacy Policy')}
                    </h2>
                    <p className="auth-subtitle">
                        {view === 'login' && 'Log in to manage your orders and profile'}
                        {view === 'signup' && 'Sign up to manage your orders and profile'}
                        {view === 'forgot-password' && "Enter your email to receive a recovery code"}
                        {view === 'verify-reset-code' && (forgotEmail ? `Enter code sent to ${forgotEmail}` : 'Enter the code sent to your email')}
                        {view === 'reset-password' && 'Create a strong new password for your account'}
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
                                            aria-label="Continue with Google (Coming Soon)"
                                            title="Google login (Coming Soon)"
                                        >
                                            <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="auth-footer">
                                        New here? <button type="button" className="link-btn" onClick={() => switchView('signup')}>Create an account</button>
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
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px', fontSize: '0.73rem' }}>
                                                            <span style={{ color: signupData.password.length >= 8 ? '#10b981' : 'var(--text-muted)' }}>
                                                                {signupData.password.length >= 8 ? '✓' : '•'} 8+ characters
                                                            </span>
                                                            <span style={{ color: /[A-Z]/.test(signupData.password) ? '#10b981' : 'var(--text-muted)' }}>
                                                                {/[A-Z]/.test(signupData.password) ? '✓' : '•'} 1 uppercase (A-Z)
                                                            </span>
                                                            <span style={{ color: /[a-z]/.test(signupData.password) ? '#10b981' : 'var(--text-muted)' }}>
                                                                {/[a-z]/.test(signupData.password) ? '✓' : '•'} 1 lowercase (a-z)
                                                            </span>
                                                            <span style={{ color: /\d/.test(signupData.password) ? '#10b981' : 'var(--text-muted)' }}>
                                                                {/\d/.test(signupData.password) ? '✓' : '•'} 1 number (0-9)
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
                                                    aria-label="Continue with Google (Coming Soon)"
                                                    title="Google sign-up (Coming Soon)"
                                                >
                                                    <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="auth-footer">
                                                Already have an account? <button type="button" className="link-btn" onClick={() => switchView('login')}>Log In</button>
                                            </div>
                                        </>
                                    )}
                                </motion.form>
                            )}

                            {/* STEP 1: FORGOT PASSWORD (Enter Email) */}
                            {view === 'forgot-password' && (
                                <motion.form
                                    key="forgot"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={handleForgotPassword}
                                >
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <div className="form-input-wrapper">
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={forgotEmail}
                                                onChange={e => setForgotEmail(e.target.value)}
                                                placeholder="hello@example.com"
                                                autoFocus
                                            />
                                            <FaEnvelope className="input-icon-btn" />
                                        </div>
                                        {errors.email && <span className="error-text">{errors.email}</span>}
                                    </div>

                                    <button type="submit" className="primary-btn" disabled={loading}>
                                        {loading ? <FaCoffee className="logo-spin" /> : 'Send Reset Code'}
                                    </button>

                                    <div className="auth-footer" style={{ marginTop: '1rem' }}>
                                        Remembered your password? <button type="button" className="link-btn" onClick={() => { switchView('login'); setForgotEmail(''); }}>Log In</button>
                                    </div>
                                </motion.form>
                            )}

                            {/* STEP 2: VERIFY RESET CODE (Enter 6-digit Code Before New Password) */}
                            {view === 'verify-reset-code' && (
                                <motion.form
                                    key="verify-reset-code"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={handleVerifyResetCode}
                                >
                                    <div className="verification-info" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                                        <p className="auth-subtitle" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                                            Code sent to <strong>{forgotEmail}</strong>
                                        </p>
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

                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-0.35rem', marginBottom: '0.45rem' }}>
                                        <button
                                            type="button"
                                            className="link-btn-small"
                                            onClick={clearVerificationCode}
                                            style={{ fontSize: '0.8rem', color: 'var(--auth-forgot-color)' }}
                                        >
                                            Clear code
                                        </button>
                                    </div>

                                    {errors.code && <div className="error-text" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{errors.code}</div>}

                                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '0.25rem' }}>
                                        {loading ? <FaCoffee className="logo-spin" /> : 'Verify Code'}
                                    </button>

                                    <div className="verification-extra-links" style={{ marginTop: '1.25rem' }}>
                                        <div className="resend-container">
                                            {resendTimer > 0 ? (
                                                <span className="timer-text">Resend code in {resendTimer}s</span>
                                            ) : (
                                                <button type="button" className="link-btn" onClick={handleResendCode} disabled={loading}>
                                                    Resend Code
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.form>
                            )}

                            {/* STEP 3: RESET PASSWORD (NEW PASSWORD ONLY) */}
                            {view === 'reset-password' && (
                                <motion.form
                                    key="reset-password"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={handleResetPassword}
                                >
                                    {(forgotEmail || searchParams.get('email')) ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 12px',
                                            background: 'rgba(212, 175, 55, 0.08)',
                                            border: '1px solid rgba(212, 175, 55, 0.25)',
                                            borderRadius: '8px',
                                            fontSize: '0.82rem',
                                            color: 'var(--color-primary)',
                                            marginBottom: '1rem'
                                        }}>
                                            <span>🔒 Resetting password for: <strong>{forgotEmail || searchParams.get('email')}</strong></span>
                                        </div>
                                    ) : (
                                        <div className="form-group">
                                            <label>Account Email</label>
                                            <div className="form-input-wrapper">
                                                <input
                                                    type="email"
                                                    className="form-input"
                                                    value={forgotEmail}
                                                    onChange={e => setForgotEmail(e.target.value)}
                                                    placeholder="you@example.com"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {!verifiedResetCode && verificationCode.join('').trim().length !== 6 && !searchParams.get('token') && !searchParams.get('code') && (
                                        <div className="form-group">
                                            <label>Reset Code (6-digit OTP)</label>
                                            <div className="form-input-wrapper">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={resetData.code}
                                                    onChange={e => {
                                                        const val = e.target.value.trim();
                                                        setResetData(prev => ({ ...prev, code: val }));
                                                        setVerifiedResetCode(val);
                                                    }}
                                                    placeholder="Enter 6-digit OTP code"
                                                    maxLength={6}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>New Password</label>
                                        <div className="form-input-wrapper">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-input"
                                                value={resetData.newPassword}
                                                onChange={e => setResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                autoFocus
                                            />
                                            <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        </div>
                                        {errors.newPassword && <span className="error-text">{errors.newPassword}</span>}

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
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px', fontSize: '0.73rem' }}>
                                                    <span style={{ color: resetData.newPassword.length >= 8 ? '#10b981' : 'var(--text-muted)' }}>
                                                        {resetData.newPassword.length >= 8 ? '✓' : '•'} 8+ characters
                                                    </span>
                                                    <span style={{ color: /[A-Z]/.test(resetData.newPassword) ? '#10b981' : 'var(--text-muted)' }}>
                                                        {/[A-Z]/.test(resetData.newPassword) ? '✓' : '•'} 1 uppercase (A-Z)
                                                    </span>
                                                    <span style={{ color: /[a-z]/.test(resetData.newPassword) ? '#10b981' : 'var(--text-muted)' }}>
                                                        {/[a-z]/.test(resetData.newPassword) ? '✓' : '•'} 1 lowercase (a-z)
                                                    </span>
                                                    <span style={{ color: /\d/.test(resetData.newPassword) ? '#10b981' : 'var(--text-muted)' }}>
                                                        {/\d/.test(resetData.newPassword) ? '✓' : '•'} 1 number (0-9)
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label>Confirm Password</label>
                                        <div className="form-input-wrapper">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-input"
                                                value={resetData.confirmPassword}
                                                onChange={e => setResetData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                            🛡️ For account security, your new password cannot be the same as your previous password.
                                        </p>
                                    </div>

                                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
                                        {loading ? <FaCoffee className="logo-spin" /> : 'Save New Password'}
                                    </button>
                                </motion.form>
                            )}

                            {/* VERIFICATION (EMAIL SIGNUP & 2FA LOGIN) */}
                            {(view === 'verify-email' || view === '2fa-login') && (
                                <motion.form
                                    key="verify"
                                    variants={contentVariants}
                                    initial="hidden" animate="visible" exit="exit"
                                    className="auth-form"
                                    onSubmit={view === '2fa-login' ? handle2FASubmit : handleVerification}
                                >
                                    <div className="verification-info" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                        {view === 'verify-email' && (
                                            <p className="auth-subtitle">Code sent to <strong>{signupData.email || loginData.email}</strong></p>
                                        )}
                                        {view === '2fa-login' && (
                                            <p className="auth-subtitle">Code sent to <strong>{loginData.email}</strong></p>
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

                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-0.35rem', marginBottom: '0.45rem' }}>
                                        <button
                                            type="button"
                                            className="link-btn-small"
                                            onClick={clearVerificationCode}
                                            style={{ fontSize: '0.8rem', color: 'var(--auth-forgot-color)' }}
                                        >
                                            Clear code
                                        </button>
                                    </div>

                                    {errors.code && <div className="error-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>{errors.code}</div>}

                                    <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
                                        {loading ? <FaCoffee className="logo-spin" /> : 'Confirm Verification'}
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
        </div>
    );

    if (embedded) {
        return (
            <div className="auth-page-wrapper">
                {cardContent}
            </div>
        );
    }

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
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                >
                    {cardContent}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AuthModal;
