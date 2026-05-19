// components/OrderTracking/OrderTracking.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaBox, FaTruck, FaCheckCircle, FaClock, FaMapMarkerAlt,
    FaCalendarAlt, FaChevronLeft, FaPhoneAlt, FaFileAlt,
    FaHistory, FaSync, FaCoffee, FaWarehouse, FaMapMarkedAlt
} from 'react-icons/fa';
import './OrderTracking.css';

const OrderTracking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification, token } = useContext(AppContext);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

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

    const fStatus = order.fulfillmentStatus || 'unfulfilled';
    const currentStatusIndex = fStatus === 'delivered' ? 3 : fStatus === 'shipped' ? 2 : fStatus === 'packed' ? 1 : 0;

    const progressSteps = [
        { id: 'unfulfilled', label: 'Confirmed', icon: <FaCheckCircle />, desc: 'Order received' },
        { id: 'packed', label: 'Processing', icon: <FaWarehouse />, desc: 'Items packed & ready' },
        { id: 'shipped', label: 'Shipped', icon: <FaTruck />, desc: 'Departed facility' },
        { id: 'delivered', label: 'Delivered', icon: <FaBox />, desc: 'Arrived at your door' }
    ];

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
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
                        <FaChevronLeft /> <span>Back to Dashboard</span>
                    </Link>
                    <div className="ot-live-pulse-container">
                        <span className="ot-pulse-indicator"></span>
                        <span className="ot-live-text">Live Order Tracker</span>
                    </div>
                </div>

                <div className="ot-header-content">
                    <motion.div variants={itemVariants} className="ot-order-id-badges">
                        <span className="ot-badge-main">Tracking ID: {order.trackingNumber}</span>
                        <span className="ot-badge-sub">Order #{order.orderNumber}</span>
                    </motion.div>
                    <motion.h1 variants={itemVariants}>Track Your Coffee Journey</motion.h1>
                    <motion.p variants={itemVariants} className="ot-last-sync">
                        Live Status: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </motion.p>
                </div>
            </header>

            <div className="ot-main-container">
                {/* Visual Journey - Progress Section */}
                <motion.section variants={itemVariants} className="ot-journey-section glass-card">
                    <div className="ot-journey-header">
                        <h2>Shipment Journey</h2>
                        <div className={`ot-main-status-pill ${fStatus}`}>
                            {getStatusLabel(fStatus)}
                        </div>
                    </div>

                    <div className="ot-stepper-container">
                        {progressSteps.map((step, index) => {
                            const isCompleted = index < currentStatusIndex || fStatus === 'delivered';
                            const isActive = index === currentStatusIndex;

                            return (
                                <div key={step.id} className={`ot-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                                    <div className="ot-step-visual">
                                        <div className="ot-step-circle">
                                            {step.icon}
                                        </div>
                                        {index < progressSteps.length - 1 && (
                                            <div className="ot-step-connector">
                                                <div
                                                    className="ot-connector-fill"
                                                    style={{ width: isCompleted ? '100%' : '0%' }}
                                                ></div>
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

                <div className="ot-details-grid">
                    {/* Logistical History - Timeline */}
                    <motion.section variants={itemVariants} className="ot-timeline-section glass-card">
                        <div className="ot-section-cap">
                            <h3><FaHistory /> Tracking History</h3>
                            <button className="ot-refresh-btn" onClick={() => fetchOrderDetails(false)}>
                                <FaSync />
                            </button>
                        </div>

                        <div className="ot-timeline">
                            <AnimatePresence mode="popLayout">
                                {order.trackingHistory && order.trackingHistory.length > 0 ? (
                                    order.trackingHistory.slice().reverse().map((event, index) => (
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
                                    ))
                                ) : (
                                    <div className="ot-empty-timeline">
                                        <FaCoffee className="ot-empty-icon" />
                                        <p>Your order has been received. Our team will start preparing your fresh coffee soon.</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.section>

                    {/* Meta Sidebar - Address & ID */}
                    <div className="ot-sidebar">
                        <motion.div variants={itemVariants} className="ot-info-box glass-card premium">
                            <h4>Real-Time Overview</h4>

                            {order.trackingNumber && (
                                <div className="ot-meta-item courier">
                                    <div className="ot-meta-icon"><FaMapMarkedAlt /></div>
                                    <div className="ot-meta-value">
                                        <label>Logistics ID</label>
                                        <div className="ot-tracking-code">{order.trackingNumber}</div>
                                    </div>
                                </div>
                            )}

                            {order.estimatedDeliveryDate && (
                                <div className="ot-meta-item">
                                    <div className="ot-meta-icon"><FaCalendarAlt /></div>
                                    <div className="ot-meta-value">
                                        <label>Expected Arrival</label>
                                        <div className="ot-arrival-date">{new Date(order.estimatedDeliveryDate).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric'
                                        })}</div>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        <motion.div variants={itemVariants} className="ot-info-box glass-card">
                            <h4>Destination Details</h4>
                            <div className="ot-address-card">
                                <div className="ot-dest-header">
                                    <FaMapMarkerAlt />
                                    <span>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</span>
                                </div>
                                <div className="ot-dest-body">
                                    <p>{order.shippingAddress.address}</p>
                                    <p>{order.shippingAddress.city}, {order.shippingAddress.county}</p>
                                    <div className="ot-dest-phone">
                                        <FaPhoneAlt /> {order.shippingAddress.phone}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.button
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="ot-actions-btn"
                            onClick={() => navigate(`/order-confirmation/${id || order?._id}`)}
                        >
                            <FaFileAlt />
                            <span>Digital Receipt</span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default OrderTracking;

