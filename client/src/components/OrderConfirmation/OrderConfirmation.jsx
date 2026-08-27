// components/OrderConfirmation/OrderConfirmation.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCheckCircle, FaCoffee, FaTruck, FaDownload,
  FaHome, FaReceipt, FaStar, FaLeaf, FaMagic,
  FaEnvelope, FaShieldAlt, FaCreditCard, FaMapMarkerAlt,
  FaClock, FaGift, FaArrowRight, FaUser, FaCopy, FaCheck,
  FaWhatsapp, FaPrint, FaPhoneAlt, FaCalendarAlt
} from 'react-icons/fa';
import './OrderConfirmation.css';

/* ── Luxury Confetti particles ── */
const Particle = ({ style }) => <div className="oc-particle" style={style} />;

const generateParticles = (count = 50) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2.2 + Math.random() * 2}s`,
    color: ['#D4AF37', '#C4835A', '#10B981', '#ffffff', '#E5A96E', '#38bdf8'][i % 6],
    size: `${5 + Math.random() * 7}px`,
    rotate: `${Math.random() * 360}deg`,
  }));

const JOURNEY_STEPS = [
  { id: 'confirmed', icon: FaCheckCircle, label: 'Order Confirmed', desc: 'Payment verified & secured', time: 'Just now' },
  { id: 'roasting', icon: FaCoffee, label: 'Fresh Roast Batch', desc: 'Crafting in Nandi Highlands', time: 'Within 12 hrs' },
  { id: 'shipped', icon: FaTruck, label: 'Express Dispatch', desc: 'Handed over to courier', time: '24-48 hrs' },
  { id: 'delivered', icon: FaGift, label: 'Doorstep Delivery', desc: 'Fresh coffee at your door', time: 'Estimated ETA' },
];

const OrderConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, token, refreshOrders } = useContext(AppContext);

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [showBurst, setShowBurst] = useState(true);
  const [particles] = useState(() => generateParticles(50));
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    refreshOrders?.();
    if (!order && id) {
      fetchOrder();
    }
    const t1 = setTimeout(() => setShowBurst(false), 3500);
    const t2 = setTimeout(() => setActiveStep(1), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await res.json();
      if (result.success && result.data) {
        setOrder(result.data);
      } else {
        throw new Error(result.message || 'Order not found');
      }
    } catch (err) {
      showNotification('Failed to load order details', 'error');
      navigate('/account/orders');
    } finally {
      setLoading(false);
    }
  };

  const copyOrderNumber = () => {
    if (!order?.orderNumber) return;
    navigator.clipboard.writeText(order.orderNumber);
    setCopiedOrderNumber(true);
    showNotification('Order Number copied to clipboard!', 'success');
    setTimeout(() => setCopiedOrderNumber(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!order) return;
    const msg = `Hi Rerendet Team! I just placed order #${order.orderNumber} for KES ${order.total?.toLocaleString()}. Tracking updates please!`;
    window.open(`https://wa.me/254700000000?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getEstimatedDelivery = () => {
    if (!order?.createdAt) return '2–3 Business Days';
    const d = new Date(order.createdAt);
    d.setDate(d.getDate() + 3);
    return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getPaymentLabel = (method) => {
    const map = { mpesa: 'M-Pesa Express', card: 'Credit / Debit Card', cod: 'Cash on Delivery' };
    return map[method?.toLowerCase()] || method?.toUpperCase() || 'Secured Payment';
  };

  const getPaymentStatusBadge = (status) => {
    if (status === 'paid') return { text: 'Paid & Confirmed', className: 'paid' };
    if (status === 'payment_failed' || status === 'failed') return { text: 'Payment Failed', className: 'failed' };
    return { text: 'Payment Pending', className: 'pending' };
  };

  if (loading) {
    return (
      <div className="oc-modern-page">
        <div className="oc-loading-state">
          <div className="oc-luxury-spinner" />
          <h2>Preparing Your Fresh Coffee Summary…</h2>
          <p>Connecting to highland roast masters</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const paymentBadge = getPaymentStatusBadge(order.paymentStatus);
  const items = order.items || [];
  const shipping = order.shippingAddress || {};

  return (
    <div className="oc-modern-page">
      {/* Ambient glowing orbs */}
      <div className="oc-ambient-orb oc-orb-1" />
      <div className="oc-ambient-orb oc-orb-2" />

      {/* Confetti Animation */}
      <AnimatePresence>
        {showBurst && (
          <motion.div
            className="oc-confetti-wrap"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {particles.map(p => (
              <Particle
                key={p.id}
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                  background: p.color,
                  width: p.size,
                  height: p.size,
                  transform: `rotate(${p.rotate})`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="oc-wrapper">
        
        {/* ══ 1. HERO HEADER ══ */}
        <motion.div
          className="oc-hero-card"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="oc-hero-pattern" />

          {/* Success Ring Icon */}
          <motion.div
            className="oc-success-icon-box"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.1 }}
          >
            <FaCheckCircle className="oc-success-svg" />
            <div className="oc-pulse-ring ring-1" />
            <div className="oc-pulse-ring ring-2" />
          </motion.div>

          <span className="oc-hero-subtitle">Single-Origin Roast Experience</span>
          <h1 className="oc-hero-title">Order Confirmed</h1>
          <p className="oc-hero-description">
            Thank you, <strong className="oc-customer-name">{shipping.firstName || 'Coffee Enthusiast'}</strong>! Your order is secured and entering our small-batch roast cycle.
          </p>

          {/* Order Meta Ribbon */}
          <div className="oc-meta-ribbon">
            <div className="oc-meta-chip">
              <span className="chip-label">Order Signature</span>
              <div className="chip-value-row">
                <strong className="chip-code">#{order.orderNumber}</strong>
                <button
                  type="button"
                  className="oc-copy-btn"
                  onClick={copyOrderNumber}
                  title="Copy Order Number"
                >
                  {copiedOrderNumber ? <FaCheck className="copy-done" /> : <FaCopy />}
                </button>
              </div>
            </div>

            <div className="oc-meta-divider" />

            <div className="oc-meta-chip">
              <span className="chip-label">Payment Status</span>
              <span className={`oc-status-pill ${paymentBadge.className}`}>
                {paymentBadge.text}
              </span>
            </div>

            <div className="oc-meta-divider" />

            <div className="oc-meta-chip">
              <span className="chip-label">Estimated Delivery</span>
              <strong className="chip-highlight"><FaCalendarAlt /> {getEstimatedDelivery()}</strong>
            </div>
          </div>
        </motion.div>

        {/* ══ 2. INTERACTIVE ROAST & DISPATCH JOURNEY ══ */}
        <motion.div
          className="oc-journey-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="oc-journey-header">
            <div>
              <span className="oc-card-tag">Roastery to Cup</span>
              <h2 className="oc-card-heading">Live Fulfillment Journey</h2>
            </div>
            <div className="oc-roast-badge">
              <FaLeaf className="leaf-anim" /> 100% Volcanic Soil Arabica
            </div>
          </div>

          <div className="oc-stepper-grid">
            {JOURNEY_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx <= activeStep;
              const isCurrent = idx === activeStep;

              return (
                <div
                  key={step.id}
                  className={`oc-step-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
                >
                  <div className="oc-step-icon-shell">
                    <Icon />
                    {isCompleted && <div className="oc-check-dot"><FaCheck size={9} /></div>}
                  </div>
                  <div className="oc-step-details">
                    <span className="oc-step-title">{step.label}</span>
                    <span className="oc-step-desc">{step.desc}</span>
                    <span className="oc-step-timing">{step.time}</span>
                  </div>
                  {idx < JOURNEY_STEPS.length - 1 && <div className="oc-step-track" />}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ══ 3. TWO-COLUMN SPLIT: SUMMARY & LOGISTICS ══ */}
        <div className="oc-grid-columns">
          
          {/* Left Column: Curated Items */}
          <motion.div
            className="oc-details-card"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="oc-details-head">
              <h3 className="oc-subheading">Selected Harvest ({items.length})</h3>
              <span className="oc-batch-tag">Direct Trade Certified</span>
            </div>

            <div className="oc-items-stack">
              {items.map((item, idx) => (
                <div key={idx} className="oc-product-row">
                  <div className="oc-product-thumb">
                    <img src={item.image || '/default-product.jpg'} alt={item.name} />
                  </div>
                  <div className="oc-product-content">
                    <h4 className="oc-product-name">{item.name}</h4>
                    <div className="oc-product-tags">
                      <span className="badge-roast">{item.size || 'Standard 250g'}</span>
                      <span className="badge-qty">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="oc-product-pricing">
                    <span className="price-unit">KES {item.price?.toLocaleString()} each</span>
                    <strong className="price-total">KES {(item.price * item.quantity).toLocaleString()}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Ledger */}
            <div className="oc-financial-ledger">
              <div className="ledger-row">
                <span>Subtotal</span>
                <span>KES {order.subtotal?.toLocaleString()}</span>
              </div>
              <div className="ledger-row">
                <span>Delivery & Logistics</span>
                <span>{order.shippingCost > 0 ? `KES ${order.shippingCost.toLocaleString()}` : 'Free Shipping'}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="ledger-row discount">
                  <span>Special Promotion / Discount</span>
                  <span>− KES {order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {order.appliedStoreCredit > 0 && (
                <div className="ledger-row discount">
                  <span>Store Credit Applied</span>
                  <span>− KES {order.appliedStoreCredit.toLocaleString()}</span>
                </div>
              )}
              <div className="ledger-divider" />
              <div className="ledger-row total">
                <span>Total Amount Paid</span>
                <span className="ledger-grand-total">KES {order.total?.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Destination & Logistics Info */}
          <motion.div
            className="oc-logistics-column"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            {/* Delivery Destination Card */}
            <div className="oc-info-tile">
              <div className="oc-tile-icon-box blue">
                <FaMapMarkerAlt />
              </div>
              <div className="oc-tile-content">
                <h4>Delivery Address</h4>
                <p className="oc-tile-text">
                  <strong>{shipping.firstName} {shipping.lastName}</strong><br />
                  {shipping.address}<br />
                  {shipping.landmark && <span className="landmark-text">Near: {shipping.landmark}<br /></span>}
                  {shipping.town ? `${shipping.town}, ` : ''}{shipping.city || shipping.county}<br />
                  {shipping.country || 'Kenya'}
                </p>
                <div className="oc-contact-pill">
                  <FaPhoneAlt size={11} /> {shipping.phone || 'Phone on file'}
                </div>
              </div>
            </div>

            {/* Payment & Security Card */}
            <div className="oc-info-tile">
              <div className="oc-tile-icon-box gold">
                <FaCreditCard />
              </div>
              <div className="oc-tile-content">
                <h4>Payment Method</h4>
                <p className="oc-tile-text">
                  <strong>{getPaymentLabel(order.paymentMethod)}</strong>
                </p>
                {order.transactionId && (
                  <div className="oc-receipt-ref">
                    <span>M-Pesa Receipt:</span>
                    <code>{order.transactionId}</code>
                  </div>
                )}
                <div className="oc-security-badge">
                  <FaShieldAlt /> 256-Bit Encrypted & PCI-DSS Compliant
                </div>
              </div>
            </div>

            {/* Email Notification Card */}
            <div className="oc-info-tile">
              <div className="oc-tile-icon-box green">
                <FaEnvelope />
              </div>
              <div className="oc-tile-content">
                <h4>Order Receipt Dispatched</h4>
                <p className="oc-tile-text">
                  An itemized tax receipt and dispatch link were emailed to:<br />
                  <strong className="email-highlight">{shipping.email || order.user?.email || 'Your email address'}</strong>
                </p>
              </div>
            </div>

          </motion.div>
        </div>

        {/* ══ 4. MODERN ACTION BUTTONS ══ */}
        <motion.div
          className="oc-cta-toolbar"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <button
            type="button"
            className="oc-btn-main primary"
            onClick={() => navigate(`/order-tracking/${id || order._id}`)}
          >
            <FaTruck /> Live Order Tracking
          </button>

          <button
            type="button"
            className="oc-btn-main outline"
            onClick={handlePrint}
          >
            <FaPrint /> Print Official Receipt
          </button>

          <button
            type="button"
            className="oc-btn-main whatsapp"
            onClick={handleWhatsAppShare}
          >
            <FaWhatsapp /> WhatsApp Support
          </button>

          <Link to="/" className="oc-btn-main ghost">
            <FaHome /> Continue Shopping
          </Link>
        </motion.div>

        {/* ══ 5. RERENDET COFFEE QUALITY GUARANTEES ══ */}
        <motion.div
          className="oc-guarantee-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <div className="oc-guarantee-box">
            <div className="guarantee-icon"><FaLeaf /></div>
            <h5>Single Origin Purity</h5>
            <p>100% shade-grown Arabica from the high volcanic soils of the Great Rift Valley.</p>
          </div>
          <div className="oc-guarantee-box">
            <div className="guarantee-icon"><FaCoffee /></div>
            <h5>Roast-to-Order Freshness</h5>
            <p>Sealed in one-way degassing valves to lock in aromatic profiles and sweet tasting notes.</p>
          </div>
          <div className="oc-guarantee-box">
            <div className="guarantee-icon"><FaStar /></div>
            <h5>Member Coffee Rewards</h5>
            <p>Every purchase accrues loyalty points redeemable for exclusive single-lot releases.</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default OrderConfirmation;
