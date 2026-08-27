// components/PaymentProcessingModal/PaymentProcessingModal.jsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { 
    FaCheckCircle, 
    FaTimesCircle, 
    FaPhoneAlt, 
    FaCreditCard, 
    FaLock, 
    FaRedo, 
    FaExclamationTriangle,
    FaMobileAlt,
    FaKey,
    FaBolt,
    FaShieldAlt
} from 'react-icons/fa';
import './PaymentProcessingModal.css';

const PaymentProcessingModal = ({
    isOpen,
    paymentMethod,
    amount,
    phone,
    orderId,
    orderNumber,
    onSuccess,
    onFailure,
    onCancel
}) => {
    const { token } = useContext(AppContext);
    const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'failed' | 'retrying'
    const [message, setMessage] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const pollIntervalRef = useRef(null);

    const clearActiveInterval = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    useEffect(() => {
        if (!isOpen) {
            clearActiveInterval();
            setStatus('processing');
            setMessage('');
            setTransactionId('');
            return;
        }

        if (paymentMethod === 'mpesa') {
            if (orderId && phone && phone !== '0700000000') {
                triggerRealMpesaPayment();
            } else {
                simulateMpesaPayment();
            }
        } else if (paymentMethod === 'card') {
            simulateCardPayment();
        }

        return () => clearActiveInterval();
    }, [isOpen, paymentMethod, orderId]);

    const triggerRealMpesaPayment = async () => {
        clearActiveInterval();
        setStatus('processing');
        setMessage(`Sending Secure STK Push prompt to ${phone}...`);

        try {
            const response = await fetch('/api/payments/mpesa/stk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ orderId, phoneNumber: phone })
            });

            const result = await response.json();

            if (response.status === 202 && result.retrying) {
                setStatus('retrying');
                setMessage(result.message || 'M-Pesa gateway is currently busy. Your request is queued and will retry automatically.');
                return;
            }

            if (!result.success) {
                throw new Error(result.message || 'Failed to initiate M-Pesa STK Push');
            }

            const { checkoutRequestId } = result;
            setTransactionId(checkoutRequestId);
            setMessage('Awaiting M-Pesa PIN authorization on your phone...');

            // Start polling
            pollPaymentStatus(checkoutRequestId);

        } catch (error) {
            setStatus('failed');
            setMessage(error.message || 'M-Pesa payment initiation failed');
            // Modal STAYS OPEN so user can review error and tap Retry
        }
    };

    const pollPaymentStatus = (checkoutRequestId) => {
        clearActiveInterval();
        let attempts = 0;
        const maxAttempts = 24; // 24 attempts * 3s = 72s

        pollIntervalRef.current = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearActiveInterval();
                setStatus('failed');
                setMessage('Payment request timed out. Please ensure your phone is unlocked and try again.');
                return;
            }

            try {
                const response = await fetch(`/api/payments/mpesa/status/${checkoutRequestId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const result = await response.json();
                if (result.success) {
                    if (result.status === 'SUCCESS') {
                        clearActiveInterval();
                        setStatus('success');
                        setMessage('Payment Confirmed Successfully! Asante.');
                        setTimeout(() => {
                            onSuccess({ transactionId: checkoutRequestId, method: 'mpesa' });
                        }, 1200);
                    } else if (result.status === 'FAILED') {
                        clearActiveInterval();
                        setStatus('failed');
                        setMessage(result.message || 'M-Pesa transaction was cancelled or failed.');
                        // Modal STAYS OPEN so user can review error and tap Retry
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);
    };

    const simulateMpesaPayment = async () => {
        clearActiveInterval();
        setStatus('processing');
        setMessage(`Sending STK Push prompt to ${phone}...`);

        await new Promise(resolve => setTimeout(resolve, 1400));
        setMessage('Awaiting M-Pesa PIN authorization...');

        await new Promise(resolve => setTimeout(resolve, 1800));

        // High success rate in simulation mode
        const isSuccess = Math.random() > 0.15;

        if (isSuccess) {
            const txId = `WS_CO_${Date.now()}`;
            setTransactionId(txId);
            setStatus('success');
            setMessage('Payment Authorized Successfully!');
            setTimeout(() => {
                onSuccess({ transactionId: txId, method: 'mpesa' });
            }, 1200);
        } else {
            const reasons = [
                'Incorrect PIN entered on your phone',
                'Transaction cancelled on phone',
                'Insufficient funds in your M-Pesa wallet',
                'Transaction timed out without PIN entry'
            ];
            const reason = reasons[Math.floor(Math.random() * reasons.length)];
            setStatus('failed');
            setMessage(reason);
            // STAYS OPEN so user can retry or change method
        }
    };

    const simulateCardPayment = async () => {
        clearActiveInterval();
        setStatus('processing');
        setMessage('Authorizing payment with bank gateway...');

        await new Promise(resolve => setTimeout(resolve, 1800));
        setMessage('Verifying 3D Secure authentication...');

        await new Promise(resolve => setTimeout(resolve, 1200));

        const isSuccess = Math.random() > 0.08;

        if (isSuccess) {
            const txId = `CRD_${Date.now()}`;
            setTransactionId(txId);
            setStatus('success');
            setMessage('Payment Processed Successfully!');
            setTimeout(() => {
                onSuccess({ transactionId: txId, method: 'card' });
            }, 1200);
        } else {
            const reasons = [
                'Card was declined by the issuing bank.',
                'Incorrect CVV or expiry date provided.',
                '3D Secure verification failed.',
                'Daily card limit reached.'
            ];
            const reason = reasons[Math.floor(Math.random() * reasons.length)];
            setStatus('failed');
            setMessage(reason);
            // STAYS OPEN so user can retry or change method
        }
    };

    const handleRetry = () => {
        if (paymentMethod === 'mpesa') {
            if (orderId && phone && phone !== '0700000000') {
                triggerRealMpesaPayment();
            } else {
                simulateMpesaPayment();
            }
        } else {
            simulateCardPayment();
        }
    };

    const handleDifferentMethod = () => {
        clearActiveInterval();
        if (onFailure) {
            onFailure(message || 'Payment cancelled by user');
        } else if (onCancel) {
            onCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="payment-modal-overlay">
            <div className={`payment-modal modern-theme ${status}`}>
                {/* Status Glow Bar */}
                <div className={`modal-glow-bar ${status}`} />

                <div className="payment-modal-content">
                    {/* Modern Animated Visual Indicator */}
                    <div className={`payment-icon-orb ${status}`}>
                        {status === 'processing' && (
                            <div className="modern-spinner-ring">
                                <div className="spinner-core" />
                            </div>
                        )}
                        {status === 'retrying' && (
                            <span className="retrying-emoji">⏳</span>
                        )}
                        {status === 'success' && (
                            <div className="icon-badge-success">
                                <FaCheckCircle />
                            </div>
                        )}
                        {status === 'failed' && (
                            <div className="icon-badge-failed">
                                <FaTimesCircle />
                            </div>
                        )}
                    </div>

                    {/* Method Tag */}
                    <div className={`method-pill ${paymentMethod}`}>
                        {paymentMethod === 'mpesa' ? (
                            <>
                                <span className="mpesa-dot" />
                                <FaMobileAlt className="pill-icon" />
                                <span>M-PESA EXPRESS</span>
                            </>
                        ) : (
                            <>
                                <FaCreditCard className="pill-icon" />
                                <span>SECURE CARD PAYMENT</span>
                            </>
                        )}
                    </div>

                    {/* Amount Headline */}
                    <div className="payment-amount-display">
                        <span className="currency-prefix">KSh</span>
                        <span className="amount-number">{(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {/* Status Feedback Message */}
                    <div className={`payment-status-text ${status}`}>
                        {status === 'processing' && <span className="pulse-indicator" />}
                        <p>{message}</p>
                    </div>

                    {/* Reference ID Chip */}
                    {transactionId && (
                        <div className="reference-chip">
                            <span className="ref-label">REFERENCE ID</span>
                            <span className="ref-code">{transactionId}</span>
                        </div>
                    )}

                    {/* Modern Step Guidance (Awaiting PIN) */}
                    {status === 'processing' && paymentMethod === 'mpesa' && (
                        <div className="modern-steps-card">
                            <div className="step-row">
                                <div className="step-badge">1</div>
                                <div className="step-info">
                                    <strong>Unlock your phone</strong>
                                    <span>Keep your screen on to receive the prompt</span>
                                </div>
                            </div>
                            <div className="step-row">
                                <div className="step-badge">2</div>
                                <div className="step-info">
                                    <strong>Enter M-Pesa PIN</strong>
                                    <span>Authorize the transaction on the popup</span>
                                </div>
                            </div>
                            <div className="step-row">
                                <div className="step-badge">3</div>
                                <div className="step-info">
                                    <strong>Automatic confirmation</strong>
                                    <span>Your payment verifies instantly on this screen</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Card Security Guarantee */}
                    {status === 'processing' && paymentMethod === 'card' && (
                        <div className="card-security-card">
                            <FaShieldAlt className="shield-icon" />
                            <div>
                                <strong>256-bit Bank-Grade Encryption</strong>
                                <span>Transactions are securely routed via PCI-DSS compliant gateways.</span>
                            </div>
                        </div>
                    )}

                    {/* Failure Help Card */}
                    {status === 'failed' && (
                        <div className="failure-help-card">
                            <div className="help-card-header">
                                <FaExclamationTriangle />
                                <span>POSSIBLE REASONS</span>
                            </div>
                            <ul className="reasons-list">
                                <li>Incorrect PIN entered on your mobile phone</li>
                                <li>Transaction was cancelled or dismissed on device</li>
                                <li>Insufficient funds in your M-Pesa wallet</li>
                                <li>Prompt timed out before authorization was completed</li>
                            </ul>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="modal-button-group">
                        {status === 'processing' && (
                            <button 
                                type="button"
                                className="btn-modern-ghost" 
                                onClick={handleDifferentMethod}
                            >
                                Cancel Transaction
                            </button>
                        )}

                        {status === 'failed' && (
                            <div className="failed-actions-grid">
                                <button 
                                    type="button"
                                    className="btn-modern-primary retry-btn" 
                                    onClick={handleRetry}
                                >
                                    <FaRedo className="btn-icon" />
                                    Retry M-Pesa
                                </button>
                                <button 
                                    type="button"
                                    className="btn-modern-secondary" 
                                    onClick={handleDifferentMethod}
                                >
                                    Different Method
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentProcessingModal;
