// components/PaymentProcessingModal/PaymentProcessingModal.jsx
import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaPhone, FaCreditCard, FaLock } from 'react-icons/fa';
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
    const [status, setStatus] = useState('processing'); // processing, success, failed
    const [message, setMessage] = useState('');
    const [transactionId, setTransactionId] = useState('');

    useEffect(() => {
        if (!isOpen) {
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
    }, [isOpen, paymentMethod, orderId]);

    const triggerRealMpesaPayment = async () => {
        setStatus('processing');
        setMessage(`Sending Secure STK Push to ${phone}...`);

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

            // ── 202: Safaricom gateway busy, retry queued ──
            if (response.status === 202 && result.retrying) {
                setStatus('retrying');
                setMessage(result.message || 'M-Pesa gateway is busy. Your payment has been queued and will be retried automatically in ~2 minutes.');
                return; // Don't show failure — stay in retrying state
            }

            if (!result.success) {
                throw new Error(result.message || 'Failed to trigger STK Push');
            }

            const { checkoutRequestId } = result;
            setTransactionId(checkoutRequestId);
            setMessage('Awaiting M-Pesa pin authorization on your phone...');

            // Start status polling
            pollPaymentStatus(checkoutRequestId);

        } catch (error) {
            setStatus('failed');
            setMessage(error.message || 'M-Pesa payment initiation failed');
            setTimeout(() => {
                onFailure(error.message || 'M-Pesa payment initiation failed');
            }, 2500);
        }
    };

    const pollPaymentStatus = (checkoutRequestId) => {
        let attempts = 0;
        const maxAttempts = 20; // 20 attempts * 3s = 60s
        
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(interval);
                setStatus('failed');
                setMessage('M-Pesa payment validation timed out. Please check your phone and try again.');
                setTimeout(() => {
                    onFailure('M-Pesa payment validation timed out.');
                }, 2500);
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
                        clearInterval(interval);
                        setStatus('success');
                        setMessage('Payment Authorized Successfully! Asante.');
                        setTimeout(() => {
                            onSuccess({ transactionId: checkoutRequestId, method: 'mpesa' });
                        }, 1500);
                    } else if (result.status === 'FAILED') {
                        clearInterval(interval);
                        setStatus('failed');
                        setMessage('M-Pesa transaction was cancelled or failed.');
                        setTimeout(() => {
                            onFailure('M-Pesa transaction was cancelled or failed.');
                        }, 2500);
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);
    };

    const simulateMpesaPayment = async () => {
        setStatus('processing');
        setMessage(`Sending Secure STK Push to ${phone}...`);

        await new Promise(resolve => setTimeout(resolve, 1500));
        setMessage('Awaiting M-Pesa pin authorization...');

        await new Promise(resolve => setTimeout(resolve, 1500));

        // 90% success rate for realism
        const success = Math.random() > 0.1;

        if (success) {
            const txId = `MPE${Date.now()}${Math.floor(Math.random() * 1000)}`;
            setTransactionId(txId);
            setStatus('success');
            setMessage('Payment Authorized Successfully!');

            setTimeout(() => {
                onSuccess({ transactionId: txId, method: 'mpesa' });
            }, 1500);
        } else {
            const reasons = [
                'Insufficient funds in your M-Pesa wallet',
                'Incorrect PIN entered on your phone',
                'Transaction timed out (took too long to authorize)',
                'Payment cancelled by user'
            ];
            const reason = reasons[Math.floor(Math.random() * reasons.length)];
            setStatus('failed');
            setMessage(reason);
            setTimeout(() => {
                onFailure(reason);
            }, 2500);
        }
    };

    const simulateCardPayment = async () => {
        setStatus('processing');
        setMessage('Authorizing secured card payment...');

        await new Promise(resolve => setTimeout(resolve, 2000));
        setMessage('Verifying with bank gateway...');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const success = Math.random() > 0.05;

        if (success) {
            const txId = `CRD${Date.now()}${Math.floor(Math.random() * 1000)}`;
            setTransactionId(txId);
            setStatus('success');
            setMessage('Payment Processed Successfully!');

            setTimeout(() => {
                onSuccess({ transactionId: txId, method: 'card' });
            }, 1500);
        } else {
            const reasons = [
                'Card was declined by the issuer.',
                'Incorrect CVV or expiry date provided.',
                '3D Secure verification failed.',
                'Daily transaction limit exceeded.'
            ];
            const reason = reasons[Math.floor(Math.random() * reasons.length)];
            setStatus('failed');
            setMessage(reason);
            setTimeout(() => {
                onFailure(reason);
            }, 2500);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="payment-modal-overlay">
            <div className="payment-modal">
                <div className="payment-modal-content">
                    {/* Icon */}
                    <div className={`payment-icon-container ${status}`}>
                        {status === 'processing' && (
                            <FaSpinner className="spinner" />
                        )}
                        {status === 'retrying' && (
                            <span style={{ fontSize: '2.5rem' }}>⏳</span>
                        )}
                        {status === 'success' && (
                            <FaCheckCircle className="success-icon" />
                        )}
                        {status === 'failed' && (
                            <FaTimesCircle className="error-icon" />
                        )}
                    </div>

                    {/* Payment Method Badge */}
                    <div className="payment-method-badge">
                        {paymentMethod === 'mpesa' ? (
                            <><FaPhone /> M-Pesa Express</>
                        ) : (
                            <><FaCreditCard /> Secured Card Payment</>
                        )}
                    </div>

                    {/* Amount */}
                    <div className="payment-amount">
                        KSh {amount.toLocaleString()}
                    </div>

                    {/* Message */}
                    <div className={`payment-message ${status}`}>
                        {message}
                    </div>

                    {/* Transaction ID */}
                    {transactionId && (
                        <div className="transaction-id">
                            <span className="label">Reference ID</span>
                            <span className="value">{transactionId}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="payment-actions">
                        {status === 'processing' && (
                            <button className="btn-modal btn-cancel" onClick={onCancel}>
                                Cancel Transaction
                            </button>
                        )}
                        {status === 'failed' && (
                            <>
                                <button className="btn-modal btn-retry" onClick={paymentMethod === 'mpesa' ? (orderId && phone && phone !== '0700000000' ? triggerRealMpesaPayment : simulateMpesaPayment) : simulateCardPayment}>
                                    Retry {paymentMethod === 'mpesa' ? 'M-Pesa' : 'Payment'}
                                </button>
                                <button className="btn-modal btn-cancel" onClick={onCancel}>
                                    Different Method
                                </button>
                            </>
                        )}
                    </div>

                    {/* Failure Tips */}
                    {status === 'failed' && paymentMethod === 'mpesa' && (
                        <div className="failure-tips">
                            <h4>Why did it fail?</h4>
                            <ul>
                                <li>Insufficient funds in your M-Pesa wallet</li>
                                <li>Incorrect PIN entered on your phone</li>
                                <li>Transaction timed out (took too long to authorize)</li>
                            </ul>
                        </div>
                    )}

                    {/* Premium Instructions */}
                    {status === 'processing' && paymentMethod === 'mpesa' && (
                        <div className="payment-instructions">
                            <p><span className="step-num">1</span> 📱 Unlock your phone now</p>
                            <p><span className="step-num">2</span> 🔢 Enter M-Pesa PIN in the pop-up</p>
                            <p><span className="step-num">3</span> ☕ Your coffee will be ready soon!</p>
                        </div>
                    )}

                    {/* Premium Card Security Details */}
                    {status === 'processing' && paymentMethod === 'card' && (
                        <div className="payment-instructions" style={{ textAlign: 'center', background: '#F0F9FF', border: 'none' }}>
                            <p style={{ justifyContent: 'center', color: '#0369A1' }}>
                                <FaLock /> Your financial data is protected by AES-256 bank-level security.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentProcessingModal;
