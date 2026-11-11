// components/OrderTracking/OrderTracking.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaBox, FaTruck, FaCheckCircle, FaClock, FaMapMarkerAlt,
    FaCalendarAlt, FaChevronLeft, FaPhoneAlt, FaFileAlt,
    FaHistory, FaSync, FaCoffee, FaWarehouse, FaMapMarkedAlt,
    FaCopy, FaCheck, FaShieldAlt, FaWhatsapp
} from 'react-icons/fa';
import './OrderTracking.css';

const OrderTracking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification, token, publicSettings } = useContext(AppContext);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [copiedTracking, setCopiedTracking] = useState(false);
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportMpesaCode, setReportMpesaCode] = useState('');
    const [reportNotes, setReportNotes] = useState('');
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [confirmingDelivery, setConfirmingDelivery] = useState(false);

    const handleConfirmDelivery = async () => {
        if (!order) return;
        if (!window.confirm(`Has order #${order.orderNumber} arrived at your delivery address?`)) return;
        setConfirmingDelivery(true);
        try {
            const targetId = order._id || order.orderNumber;
            const res = await fetch(`/api/orders/track/${targetId}/confirm-delivery`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const data = await res.json();
            if (data.success) {
                showNotification(data.message || 'Package delivery confirmed! Thank you.', 'success');
                fetchOrderDetails(false);
            } else {
                showNotification(data.message || 'Confirmation failed', 'error');
            }
        } catch {
            showNotification('Network error confirming delivery', 'error');
        } finally {
            setConfirmingDelivery(false);
        }
    };

    const handleCopyTracking = () => {
        if (!order?.trackingNumber) return;
        navigator.clipboard.writeText(order.trackingNumber);
        setCopiedTracking(true);
        setTimeout(() => setCopiedTracking(false), 2000);
    };

    const handleReportPayment = async (e) => {
        e?.preventDefault();
        if (!order) return;
        setSubmittingReport(true);
        try {
            const targetId = order._id || order.orderNumber;
            const res = await fetch(`/api/orders/${targetId}/report-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    mpesaCode: reportMpesaCode,
                    customerPhone: order.shippingAddress?.phone || '',
                    notes: reportNotes
                })
            });
            const data = await res.json();
            if (data.success) {
                setReportSuccess(true);
                showNotification('Payment reported successfully! Awaiting verification.', 'success');
                fetchOrderDetails(false);
            } else {
                showNotification(data.message || 'Failed to submit payment report', 'error');
            }
        } catch {
            showNotification('Network error while reporting payment', 'error');
        } finally {
            setSubmittingReport(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchOrderDetails(true);
    }, [id]);

    // REAL-TIME POLLING: Fetch every 10 seconds for "Live" experience
    useEffect(() => {
        // Stop polling if order is already delivered
        if (order?.fulfillmentStatus === 'delivered') return;

        const pollInterval = setInterval(() => {
            fetchOrderDetails(false);
        }, 10000);

        return () => clearInterval(pollInterval);
    }, [id, order?.fulfillmentStatus]);

    const fetchOrderDetails = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            const response = await fetch(`/api/orders/track/${id}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Order not found');

            const result = await response.json();
            if (result.success) {
                setOrder(result.data);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Fetch order error:', error);
            if (isInitial) {
                showNotification('Failed to load tracking details', 'error');
                navigate('/account');
            }
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        const s = status?.toLowerCase();
        if (s === 'confirmed' || s === 'unfulfilled') return <FaCheckCircle />;
        if (s === 'processing' || s === 'packed') return <FaWarehouse />;
        if (s === 'shipped') return <FaTruck />;
        if (s === 'delivered' || s === 'arrived') return <FaBox />;
        if (s === 'returned') return <FaHistory />;
        return <FaClock />;
    };

    const getStatusLabel = (status) => {
        if (!status) return 'Unknown';
        const s = status.toLowerCase();
        if (s === 'unfulfilled') return 'Confirmed';
        if (s === 'packed') return 'Processing';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    if (loading) {
        return (
            <div className="tracking-loader-screen">
                <motion.div
                    className="coffee-loader"
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <FaCoffee />
                </motion.div>
                <p>Syncing tracking data...</p>
            </div>
        );
    }

    if (!order) return null;

    const paybillNumber = publicSettings?.payment?.paybillNumber || '516600';
    const paybillAccount = publicSettings?.payment?.paybillAccount || '934558';
    const whatsappNumber = publicSettings?.payment?.whatsappNumber || '254705684984';

    const isCancelled = order.status === 'cancelled' || order.orderStatus === 'cancelled';
    const isExpired = !isCancelled && (order.paymentStatus === 'expired' || (order.orderStatus === 'cancelled' && order.cancellationReason?.toLowerCase().includes('expired')));
    const isReported = !isCancelled && (order.paymentStatus === 'payment_reported' || order.paymentReporting?.reported || reportSuccess);
    const isPaybill = order.paymentMethod === 'paybill';
    const isPaid = !isCancelled && order.paymentStatus === 'paid';
    const isPartial = !isCancelled && order.paymentStatus === 'partially_paid';
    const isPaybillUnpaid = !isCancelled && isPaybill && !isPaid && !isExpired;
    const isPaybillPending = isPaybillUnpaid;

    const fStatus = order.fulfillmentStatus || 'unfulfilled';

    let progressSteps = [];
    let currentStatusIndex = 0;

    if (isPaybill) {
        progressSteps = [
            { id: 'placed', label: 'Order Placed', icon: <FaCoffee />, desc: 'Fresh beans reserved' },
            {
                id: 'awaiting_payment',
                label: isReported ? 'Payment Reported' : isPartial ? 'Partially Paid' : 'Awaiting Payment',
                icon: <FaClock />,
                desc: isReported ? 'Awaiting admin verification' : isPartial ? 'Balance outstanding' : 'M-Pesa Paybill transfer'
            },
            { id: 'verified', label: 'Payment Verified', icon: <FaCheckCircle />, desc: 'Receipt issued' },
            { id: 'packed', label: 'Roasting & Packing', icon: <FaWarehouse />, desc: 'Prepared at farm' },
            { id: 'shipped', label: 'Out for Delivery', icon: <FaTruck />, desc: 'En route with courier' },
            { id: 'delivered', label: 'Delivered', icon: <FaBox />, desc: 'Arrived at your door' }
        ];

        if (isExpired) {
            currentStatusIndex = 1;
        } else if (!isPaid) {
            currentStatusIndex = 1;
        } else if (fStatus === 'delivered') {
            currentStatusIndex = 5;
        } else if (fStatus === 'shipped') {
            currentStatusIndex = 4;
        } else if (fStatus === 'packed') {
            currentStatusIndex = 3;
        } else {
            currentStatusIndex = 2;
        }
    } else {
        // Cash on Delivery
        progressSteps = [
            { id: 'placed', label: 'Order Placed', icon: <FaCoffee />, desc: 'Logged & confirmed' },
            { id: 'packed', label: 'Roasting & Packing', icon: <FaWarehouse />, desc: 'Prepared at farm' },
            { id: 'shipped', label: 'Out for Delivery', icon: <FaTruck />, desc: 'En route with courier' },
            { id: 'delivered', label: 'Delivered', icon: <FaBox />, desc: 'Arrived at your door' },
            { id: 'collected', label: isPaid ? 'Payment Collected' : 'COD Due on Arrival', icon: <FaCheckCircle />, desc: isPaid ? 'Verified by courier' : 'Pay cash upon delivery' }
        ];

        if (fStatus === 'delivered') {
            currentStatusIndex = isPaid ? 4 : 3;
        } else if (fStatus === 'shipped') {
            currentStatusIndex = 2;
        } else if (fStatus === 'packed') {
            currentStatusIndex = 1;
        } else {
            currentStatusIndex = 0;
        }
    }

    const containerVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.45,
                staggerChildren: 0.08
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="ot-wrapper"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Dynamic Header */}
            <header className="ot-header">
                <div className="ot-header-nav">
                    <Link to="/account" className="ot-back-link">
                        <FaChevronLeft className="ot-back-icon" /> <span>Back to Account</span>
                    </Link>
                </div>

                <div className="ot-header-hero">
                    <motion.h1 variants={itemVariants} className="ot-hero-title">
                        {isCancelled ? 'Order Details (Cancelled)' : isExpired ? 'Order Expired' : 'Order Fulfillment Journey'}
                    </motion.h1>

                    <motion.div variants={itemVariants} className="ot-order-id-badges">
                        <div className="ot-badge-order">
                            <span className="ot-badge-label">ORDER</span>
                            <span className="ot-badge-val">#{order.orderNumber}</span>
                        </div>
                        {order.trackingNumber && (
                            <div
                                className="ot-badge-tracking"
                                onClick={handleCopyTracking}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCopyTracking(); }}
                                title="Click to copy waybill tracking number"
                            >
                                <span className="ot-badge-label">WAYBILL</span>
                                <span className="ot-badge-val">{order.trackingNumber}</span>
                                <span className="ot-copy-pill">
                                    {copiedTracking ? <span className="ot-copied-txt"><FaCheck /> Copied</span> : <FaCopy />}
                                </span>
                            </div>
                        )}
                    </motion.div>
                </div>
            </header>

            <div className="ot-main-container">

                {/* Cancelled Order Banner */}
                {isCancelled && (
                    <motion.div variants={itemVariants} className="ot-expired-banner" style={{ borderColor: '#FECACA', background: '#FEF2F2' }}>
                        <div className="ot-expired-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>✕</div>
                        <h3 style={{ color: '#991B1B' }}>This Order Has Been Cancelled</h3>
                        <p style={{ color: '#7F1D1D' }}>
                            {order.cancellationReason && order.cancellationReason !== 'other' && order.cancellationReason !== 'changed_mind'
                                ? `Order #${order.orderNumber} was cancelled (${order.cancellationReason.replace(/_/g, ' ')}).`
                                : `Order #${order.orderNumber} has been cancelled.`}
                            {' Any fresh highland beans reserved for this order have been returned to our inventory.'}
                            {order.paymentStatus === 'refunded' && ' If this order was paid, your refund or store credit has been processed.'}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
                            <Link to="/#coffee-shop" className="ot-reorder-btn" style={{ background: '#991B1B', color: '#FFFFFF' }}>
                                Browse Coffee Shop &amp; Reorder
                            </Link>
                            <Link to="/account?tab=orders" className="ot-reorder-btn" style={{ background: '#475569', color: '#FFFFFF' }}>
                                Back to My Orders
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* Expired Order Banner */}
                {isExpired && (
                    <motion.div variants={itemVariants} className="ot-expired-banner">
                        <div className="ot-expired-icon">⏳</div>
                        <h3>Order Expired</h3>
                        <p>
                            This order was not paid within the 24-hour reservation window and has expired. Reserved items have been returned to our fresh roastery inventory.
                        </p>
                        <Link to="/#coffee-shop" className="ot-reorder-btn">
                            Browse Coffee Shop &amp; Reorder
                        </Link>
                    </motion.div>
                )}

                {/* Unpaid Paybill Instructions & Reporting Action */}
                {isPaybillUnpaid && (
                    <motion.div variants={itemVariants} className="ot-paybill-instructions-card">
                        <div className="ot-paybill-header">
                            <FaClock style={{ color: isReported ? '#10b981' : '#f59e0b', fontSize: '20px' }} />
                            <h3>{isReported ? 'Payment Reported — Awaiting Admin Verification' : 'Awaiting M-Pesa Paybill Payment'}</h3>
                        </div>
                        <p style={{ margin: '0 0 10px', color: '#475569', fontSize: '14px' }}>
                            {isReported
                                ? 'We have received your payment submission! Our finance team is currently verifying your M-Pesa transaction.'
                                : 'Your fresh beans are reserved! Follow the simple steps below to complete your payment via M-Pesa Paybill:'}
                        </p>
                        <div className="ot-paybill-steps">
                            <div>1. Go to <strong>M-Pesa</strong> &rarr; Select <strong>Lipa na M-Pesa</strong> &rarr; <strong>Paybill</strong></div>
                            <div>2. Business Number (Paybill): <strong style={{ fontFamily: 'monospace', fontSize: '15px' }}>{paybillNumber}</strong></div>
                            <div>3. Account Number: <strong style={{ fontFamily: 'monospace', fontSize: '15px' }}>{paybillAccount}</strong> <span style={{ fontSize: '13px', color: '#64748B' }}>(Reference: <strong>{order.orderNumber}</strong>)</span></div>
                            <div>4. Amount: <strong style={{ color: '#ea580c', fontSize: '15px' }}>KES {order.total?.toLocaleString()}</strong></div>
                            <div>5. Enter your M-Pesa PIN and press Send</div>
                        </div>

                        {/* Interactive "I've made the payment" Action */}
                        {!isReported ? (
                            <div style={{ marginTop: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <span style={{ fontSize: '13.5px', color: '#1E293B', fontWeight: 600 }}>Already sent your payment?</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowReportForm(prev => !prev)}
                                        style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        {showReportForm ? 'Close Form' : "I've made the payment"}
                                    </button>
                                </div>

                                {showReportForm && (
                                    <form onSubmit={handleReportPayment} style={{ marginTop: '14px' }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                                                M-Pesa Reference Code (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. QKH7123456"
                                                value={reportMpesaCode}
                                                onChange={e => setReportMpesaCode(e.target.value.toUpperCase())}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'monospace' }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                                                Notes (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Sent from 0712345678"
                                                value={reportNotes}
                                                onChange={e => setReportNotes(e.target.value)}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submittingReport}
                                            style={{ background: '#10B981', color: '#FFFFFF', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            {submittingReport ? 'Submitting...' : 'Submit Payment Report'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <div style={{ marginTop: '14px', padding: '12px 16px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FaCheckCircle style={{ color: '#16A34A', fontSize: '18px' }} />
                                <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                                    Payment Report Logged {order.paymentReporting?.mpesaCode ? `(${order.paymentReporting.mpesaCode})` : ''}. Awaiting bank verification.
                                </span>
                            </div>
                        )}

                        <div style={{ marginTop: '16px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <a
                                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                                    `Hello Rerendet Coffee, I am following up on Order #${order.orderNumber} (KES ${order.total?.toLocaleString()}). Customer: ${order.shippingAddress?.firstName || 'Customer'}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ot-whatsapp-pay-btn"
                            >
                                <FaWhatsapp style={{ fontSize: '18px' }} /> WhatsApp Concierge (Optional)
                            </a>
                            <span style={{ fontSize: '12.5px', color: '#b45309' }}>
                                ⏳ Order is confirmed once admin verifies bank/SMS record. Unpaid orders expire after 24h.
                            </span>
                        </div>
                    </motion.div>
                )}

                {/* Digital Payment Receipt Card (When Verified/Paid ONLY) */}
                {(isPaid && order.receipt?.receiptNumber) && (
                    <motion.div variants={itemVariants} className="ot-paybill-instructions-card" style={{ borderColor: '#BBF7D0', background: '#F0FDF4' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <FaFileAlt />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '16px', color: '#166534', fontWeight: 800 }}>Official Digital Payment Receipt</h4>
                                    <span style={{ fontSize: '13px', color: '#475569' }}>
                                        Receipt #{order.receipt.receiptNumber} • {order.paymentMethod === 'cod' ? 'Cash on Delivery Settled' : 'Bank M-Pesa Verified'}
                                    </span>
                                </div>
                            </div>

                            <a
                                href={`/api/orders/${order._id || order.orderNumber}/receipt`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ot-whatsapp-pay-btn"
                                style={{ background: '#166534', textDecoration: 'none' }}
                            >
                                <FaFileAlt style={{ fontSize: '15px' }} /> Download PDF Receipt
                            </a>
                        </div>
                    </motion.div>
                )}

                {/* Customer Package Delivery Confirmation Box */}
                {!isCancelled && !isExpired && (order.fulfillmentStatus === 'shipped' || order.customerDeliveredConfirmed) && (
                    <motion.div
                        variants={itemVariants}
                        className="ot-paybill-instructions-card"
                        style={{
                            borderColor: order.customerDeliveredConfirmed ? '#BBF7D0' : '#FDE68A',
                            background: order.customerDeliveredConfirmed ? '#F0FDF4' : '#FFFBEB',
                            marginBottom: '18px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    background: order.customerDeliveredConfirmed ? '#DCFCE7' : '#FEF3C7',
                                    color: order.customerDeliveredConfirmed ? '#16A34A' : '#D97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px'
                                }}>
                                    <FaCheckCircle />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '16px', color: order.customerDeliveredConfirmed ? '#166534' : '#92400E', fontWeight: 800 }}>
                                        {order.customerDeliveredConfirmed ? 'Package Arrival Confirmed' : 'Has Your Package Arrived?'}
                                    </h4>
                                    <span style={{ fontSize: '13px', color: '#475569' }}>
                                        {order.customerDeliveredConfirmed
                                            ? 'Thank you for confirming receipt. Enjoy your freshly roasted coffee!'
                                            : 'Let our team know once your parcel arrives so we can finalize delivery.'}
                                    </span>
                                </div>
                            </div>

                            {!order.customerDeliveredConfirmed && (
                                <button
                                    type="button"
                                    onClick={handleConfirmDelivery}
                                    disabled={confirmingDelivery}
                                    style={{
                                        background: '#16A34A',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontSize: '13.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <FaCheck /> {confirmingDelivery ? 'Confirming...' : 'I Have Received My Coffee'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Visual Journey - Progress Section */}
                {!isCancelled && !isExpired && (
                    <motion.section variants={itemVariants} className="ot-journey-section">
                        <div className="ot-journey-header">
                            <div className="ot-journey-titles">
                                <h2>Fulfillment Journey</h2>
                                <span className="ot-journey-subtitle">Real-time milestones from farm roast to delivery</span>
                            </div>
                            <div className={`ot-status-badge ${isPaybillUnpaid ? (isReported ? 'processing' : 'pending') : isExpired ? 'returned' : fStatus}`}>
                                <span className="ot-status-dot" />
                                <span>
                                    {isExpired
                                        ? 'Expired'
                                        : isPaybillUnpaid
                                            ? (isReported ? 'Payment Reported' : isPartial ? 'Partially Paid' : 'Awaiting Payment')
                                            : fStatus === 'delivered'
                                                ? 'Delivered'
                                                : fStatus === 'shipped'
                                                    ? 'Out for Delivery'
                                                    : fStatus === 'packed'
                                                        ? 'Ready for Dispatch'
                                                        : 'Order Confirmed'}
                                </span>
                            </div>
                        </div>

                        <div className="ot-stepper-container">
                            {progressSteps.map((step, index) => {
                                const isCompleted = index < currentStatusIndex || (!isPaybillPending && fStatus === 'delivered');
                                const isActive = index === currentStatusIndex && !isExpired && (isPaybillPending || fStatus !== 'delivered');

                                return (
                                    <div key={step.id} className={`ot-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                                        <div className="ot-step-visual">
                                            <div className="ot-step-circle">
                                                {isCompleted ? <FaCheckCircle /> : step.icon}
                                            </div>
                                            {index < progressSteps.length - 1 && (
                                                <div className="ot-step-connector">
                                                    <div
                                                        className="ot-connector-fill"
                                                        style={{ width: isCompleted ? '100%' : '0%' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="ot-step-info">
                                            <div className="ot-step-label">{step.label}</div>
                                            <div className="ot-step-desc">{step.desc}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.section>
                )}

                {/* ── Order Items & Summary ── */}
                <motion.section variants={itemVariants} className="ot-order-summary-card">
                    <div className="ot-summary-header">
                        <h3>Order Summary</h3>
                        <span className="ot-summary-items-count">
                            {order.items?.length || 0} {(order.items?.length === 1 ? 'item' : 'items')}
                        </span>
                    </div>

                    <div className="ot-summary-items-list">
                        {(order.items || []).map((item, idx) => (
                            <div key={idx} className="ot-summary-item-row">
                                {item.image && (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="ot-summary-item-img"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                )}
                                <div className="ot-summary-item-info">
                                    <div className="ot-summary-item-name">{item.name}</div>
                                    <div className="ot-summary-item-meta">
                                        {item.size || 'Standard'} · Qty: {item.quantity}
                                    </div>
                                </div>
                                <div className="ot-summary-item-price">
                                    KES {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="ot-summary-totals">
                        {order.shippingCost > 0 && (
                            <div className="ot-summary-total-row">
                                <span>Highland Delivery</span>
                                <span>KES {order.shippingCost.toLocaleString()}</span>
                            </div>
                        )}
                        {order.discountAmount > 0 && (
                            <div className="ot-summary-total-row discount">
                                <span>Special Discount</span>
                                <span>− KES {order.discountAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="ot-summary-total-row grand-total">
                            <span>Total Amount</span>
                            <strong>KES {order.total?.toLocaleString()}</strong>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="ot-summary-actions">
                        <button
                            type="button"
                            className="ot-actions-btn"
                            onClick={() => navigate(`/order-confirmation/${id || order?._id}`)}
                        >
                            <FaFileAlt />
                            <span>Digital Receipt &amp; Invoice</span>
                        </button>
                        <Link to="/#coffee-shop" className="ot-secondary-btn">
                            Browse Coffee Shop
                        </Link>
                    </div>
                </motion.section>

                {/* Logistical History — Only if actual checkpoints have been logged */}
                {order.trackingHistory && order.trackingHistory.length > 0 && (
                    <motion.section variants={itemVariants} className="ot-timeline-section" style={{ marginTop: '1.5rem' }}>
                        <div className="ot-section-cap">
                            <div className="ot-cap-titles">
                                <h3><FaHistory className="ot-cap-icon" /> Live Delivery Checkpoints</h3>
                                <span className="ot-cap-sub">Recorded event checkpoints</span>
                            </div>
                            <button className="ot-refresh-btn" onClick={() => fetchOrderDetails(false)} title="Refresh tracking updates">
                                <FaSync />
                            </button>
                        </div>

                        <div className="ot-timeline">
                            <AnimatePresence mode="popLayout">
                                {order.trackingHistory.slice().reverse().map((event, index) => (
                                    <motion.div
                                        key={index}
                                        className="ot-timeline-item"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="ot-timeline-marker">
                                            <div className={`ot-marker-dot ${event.status?.toLowerCase()}`}>
                                                {getStatusIcon(event.status)}
                                            </div>
                                        </div>
                                        <div className="ot-timeline-content">
                                            <div className="ot-timeline-header">
                                                <span className="ot-event-tag">{getStatusLabel(event.status)}</span>
                                                <span className="ot-event-date">
                                                    {new Date(event.timestamp).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <p className="ot-event-msg">{event.message}</p>
                                            {event.location && (
                                                <div className="ot-event-location">
                                                    <FaMapMarkerAlt /> {event.location}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.section>
                )}
            </div>
        </motion.div>
    );
};

export default OrderTracking;

