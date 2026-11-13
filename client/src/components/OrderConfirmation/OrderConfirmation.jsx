// components/OrderConfirmation/OrderConfirmation.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaStore, FaBell, FaLeaf, FaTimes, FaReceipt,
  FaPrint, FaDownload
} from 'react-icons/fa';
import './OrderConfirmation.css';
import '../Checkout/OrderReceipt.css';

/* ── 4x4 Gold Dot Matrix Pattern Component ── */
const DotGrid = ({ className = '' }) => (
  <div className={`or-dot-grid ${className}`} aria-hidden="true">
    {Array.from({ length: 16 }).map((_, i) => (
      <span key={i} />
    ))}
  </div>
);

/* ── Minimal Confetti Burst ── */
const Particle = ({ style }) => <div className="oc-particle" style={style} />;

const generateParticles = (count = 35) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${2.0 + Math.random() * 2}s`,
    color: ['#10B981', '#D4AF37', '#C4835A', '#FAF7F2', '#E5A96E'][i % 5],
    size: `${5 + Math.random() * 6}px`,
    rotate: `${Math.random() * 360}deg`,
  }));

const OrderConfirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, token, refreshOrders, publicSettings } = useContext(AppContext);

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [showBurst, setShowBurst] = useState(true);
  const [particles] = useState(() => generateParticles(35));
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    refreshOrders?.();
    if (!order && id) {
      fetchOrder();
    }
    const timer = setTimeout(() => setShowBurst(false), 3200);
    return () => clearTimeout(timer);
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
      navigate('/account?tab=orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="oc-clean-page">
        <div className="oc-loading-wrap">
          <div className="oc-clean-spinner" />
          <p style={{ color: 'var(--oc-text-muted)', fontSize: '0.95rem' }}>
            Preparing your order confirmation…
          </p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  // Extract clean summary data
  const items = order.items || [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const shipping = order.shippingAddress || {};
  const customerName = shipping.firstName || order.user?.name?.split(' ')[0] || 'Coffee Lover';
  const destination = shipping.town || shipping.city || shipping.county || 'Nairobi';

  // Format order confirmation time & date
  const orderTime = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  const invoiceDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

  // Hero product image matching the home hero section
  const heroProductImage = publicSettings?.hero?.imageUrl || '/hero-product.png';

  const store = publicSettings?.store || {};
  const clientName = `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() || order.user?.name || 'Valued Customer';
  const clientPhone = shipping.phone || store.phone || '+254 700 000 000';
  const clientEmail = shipping.email || order.user?.email || 'customer@rerendetcoffee.com';
  const clientLocation = `${shipping.town ? shipping.town + ', ' : ''}${shipping.city || shipping.county || 'Nairobi, Kenya'}`;

  // Signature: use admin uploaded signature if present, or fallback to signature script
  const signatureUrl = store.signature || '';
  const signatoryName = store.signatoryName || 'Authorized Farm Signatory';

  const isCancelled = order.status === 'cancelled' || order.orderStatus === 'cancelled';
  const isPaid = !isCancelled && (order.paymentStatus === 'paid' || !!order.receipt?.receiptNumber);
  const getPaymentMethodLabel = (method) => {
    if (!method) return 'M-Pesa Paybill';
    const m = String(method).toLowerCase();
    if (m === 'paybill') return 'M-Pesa Paybill';
    if (m === 'cod') return 'Cash on Delivery';
    if (m === 'card') return 'Credit / Debit Card';
    if (m === 'mpesa') return 'M-Pesa';
    return method.toUpperCase();
  };
  const paymentMethodLabel = getPaymentMethodLabel(order.paymentMethod);
  const paymentReference = order.receipt?.receiptNumber
    || order.paymentConfirmation?.mpesaCode
    || order.paymentReporting?.reportedMpesaCode
    || order.transactionId
    || (order.paymentMethod === 'paybill' ? `Paybill 516600 (Rerendet Farm • Acc: 934558 • Ref: ${order.orderNumber})` : 'Pending Verification');

  return (
    <div className="oc-clean-page">
      {/* Subtle celebratory confetti */}
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

      {/* ══ SPLIT CONFIRMATION CARD (Target Mockup Replica) ══ */}
      <motion.div
        className="oc-clean-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* ── LEFT PANE: BRAND & HERO COFFEE PACKAGING ── */}
        <div className="oc-left-pane">
          {/* Top Brand Mark - Huge Logo without redundant text line */}
          <div className="oc-brand-header">
            <img
              src={store.logo || '/rerendet-logo.png'}
              alt={store.name || 'Rerendet Coffee'}
              className="oc-brand-logo-img"
            />
          </div>

          {/* Center Product Image matching Hero section */}
          <div className="oc-visual-center">
            <img
              src={heroProductImage}
              alt="Rerendet Artisan Coffee Roast"
              className="oc-visual-bag"
              onError={(e) => {
                e.target.src = '/hero-product.png';
              }}
            />
          </div>

          {/* Bottom Single-Origin Pill */}
          <div className="oc-feature-pill">
            <FaLeaf className="oc-feature-icon" style={{ color: 'var(--oc-gold)' }} />
            <span>100% shade-grown Arabica from the Great Rift Valley highlands.</span>
          </div>
        </div>

        {/* ── RIGHT PANE: CLEAN CONFIRMATION DETAILS ── */}
        <div className="oc-right-pane">
          {/* Top Right Close Button */}
          <button
            type="button"
            className="oc-close-btn"
            onClick={() => navigate('/')}
            title="Back to shop"
            aria-label="Close"
          >
            <FaTimes />
          </button>

          {/* Icon Circle */}
          <div className="oc-check-wrap">
            <div
              className="oc-check-circle"
              style={isCancelled ? { background: '#FEE2E2', borderColor: '#FCA5A5', color: '#DC2626' } : undefined}
            >
              {isCancelled ? (
                <FaTimes style={{ fontSize: '18px' }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>

          {/* Headline & Subtitle */}
          <div className="oc-heading-group">
            <h1 className="oc-thank-title">
              {isCancelled ? `Order Cancelled` : `Thank you, ${customerName}! 🎉`}
            </h1>
            <p className="oc-thank-sub">
              {isCancelled
                ? `Order #${order.orderNumber} has been cancelled. Any reserved stock has been released.`
                : `Your order has been received and is being prepared with care.`}
            </p>
          </div>

          {/* Order Mini Pill */}
          <div className="oc-order-box">
            <div className="oc-order-left">
              <div className="oc-order-icon-shell">
                <FaStore />
              </div>
              <div className="oc-order-info">
                <span className="oc-order-num">Order #{order.orderNumber}</span>
                <span className="oc-order-subtext">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} · Delivery to {destination}
                </span>
              </div>
            </div>
          </div>

          {/* 3-Step Vertical Timeline (Non-cancelled orders ONLY) */}
          {!isCancelled && (
            <div className="oc-timeline">
              {/* Step 1: Confirmed */}
              <div className="oc-timeline-step">
                <div className="oc-timeline-dot active" />
                <div className="oc-step-content">
                  <span className="oc-step-name">Order confirmed</span>
                  <span className="oc-step-sub">{orderTime}</span>
                </div>
              </div>

              {/* Step 2: Preparing */}
              <div className="oc-timeline-step">
                <div className="oc-timeline-dot pending" />
                <div className="oc-step-content">
                  <span className="oc-step-name">Preparing your order</span>
                  <span className="oc-step-sub">We'll notify you soon</span>
                </div>
              </div>

              {/* Step 3: Out for delivery */}
              <div className="oc-timeline-step">
                <div className="oc-timeline-dot pending" />
                <div className="oc-step-content">
                  <span className="oc-step-name">Ready for delivery</span>
                  <span className="oc-step-sub">Estimated 2–3 business days</span>
                </div>
              </div>
            </div>
          )}

          {/* Notification Callout */}
          {!isCancelled && (
            <div className="oc-notify-callout">
              <FaBell className="oc-notify-icon" />
              <span>We'll send you a notification when your order is ready.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="oc-actions-group">
            <button
              type="button"
              className="btn-oc-track"
              onClick={() => navigate('/account?tab=orders')}
            >
              {isCancelled ? 'View My Orders' : 'Track order'}
            </button>

            {isPaid && (
              <button
                type="button"
                className="btn-oc-receipt"
                onClick={() => setShowReceiptModal(true)}
              >
                <FaReceipt /> View receipt
              </button>
            )}

            <Link to="/" className="btn-oc-back">
              Back to shop
            </Link>
          </div>

        </div>
      </motion.div>

      {/* ══ FLOATING RECEIPT POP-UP MODAL (Exact Liceria Editorial Invoice) ══ */}
      <AnimatePresence>
        {showReceiptModal && (
          <div
            className="oc-modal-backdrop"
            onClick={() => setShowReceiptModal(false)}
          >
            <motion.div
              className="oc-receipt-modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Floating Toolbar */}
              <div className="oc-modal-header no-print">
                <div className="oc-modal-title-group">
                  <FaReceipt className="oc-modal-title-icon" />
                  <div>
                    <h3 className="oc-modal-title">{isPaid ? 'Official Payment Receipt' : 'Order Invoice'}</h3>
                    <p className="oc-modal-sub">
                      {isPaid && order.receipt?.receiptNumber ? `Receipt #${order.receipt.receiptNumber}` : `Order #${order.orderNumber}`}
                    </p>
                  </div>
                </div>
                <div className="oc-modal-header-actions">
                  {(isPaid && order.receipt?.receiptNumber) && (
                    <a
                      href={`/api/orders/${order._id || order.orderNumber}/receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="oc-modal-print-btn"
                      style={{ textDecoration: 'none', background: '#10B981', color: '#FFFFFF', borderColor: '#10B981' }}
                      title="Download Official PDF Receipt"
                    >
                      <FaDownload /> Download PDF
                    </a>
                  )}
                  <button
                    type="button"
                    className="oc-modal-print-btn"
                    onClick={handlePrint}
                    title="Print Document"
                  >
                    <FaPrint /> Print
                  </button>
                  <button
                    type="button"
                    className="oc-modal-close-btn"
                    onClick={() => setShowReceiptModal(false)}
                    aria-label="Close"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* Modal Body: The Exact Editorial Document Sheet */}
              <div className="oc-modal-body" style={{ padding: 0 }}>
                <div className="or-sheet" style={{ maxWidth: '100%', boxShadow: 'none' }}>
                  {/* Subtle decorative curves in upper corner */}
                  <svg className="or-sheet-curves" viewBox="0 0 480 240" fill="none">
                    <path
                      d="M50 0C160 80 320 60 480 180"
                      stroke="#D4AF37"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                      opacity="0.4"
                    />
                    <path
                      d="M120 0C220 120 360 90 480 220"
                      stroke="#171311"
                      strokeWidth="0.8"
                      opacity="0.25"
                    />
                    <circle cx="430" cy="50" r="140" stroke="#E2DDD5" strokeWidth="1" />
                  </svg>

                  {/* Top Centered Brand Logo & Title */}
                  <div className="or-center-logo-header">
                    <img
                      src={store.logo || '/rerendet-logo.png'}
                      alt={store.name || 'Rerendet Coffee'}
                      className="or-center-brand-logo"
                      onError={(e) => {
                        e.target.src = '/rerendet-logo.png';
                      }}
                    />
                    <h2 className="or-center-brand-name">{store.name || 'RERENDET COFFEE ROASTERS'}</h2>
                    <p className="or-center-brand-sub">Great Rift Valley Highlands · Bomet, Kenya</p>
                  </div>

                  {/* ══ Upper Body Grid ══ */}
                  <div className="or-body-grid">
                    {/* ── Left Column: Giant Vertical Title + Client Info ── */}
                    <div className="or-left-col">
                      <div className="or-title-wrapper">
                        <h1 className="or-vertical-title">{isPaid ? 'Receipt.' : 'Invoice.'}</h1>
                        <div className="or-vertical-accent-line">
                          <div className="or-accent-dot" />
                        </div>
                      </div>

                      <div className="or-client-box">
                        <span className="or-label-sm">Invoice To :</span>
                        <h2 className="or-client-name">{clientName}</h2>
                        <p className="or-client-text">{clientPhone}</p>
                        <p className="or-client-text">{clientEmail}</p>
                        <p className="or-client-text">{clientLocation}</p>

                        <div className="or-paymethod-capsule">
                          <span className="or-paymethod-title">Payment Method</span>
                          <span className="or-paymethod-val">{paymentMethodLabel}</span>
                          <span
                            className="or-paymethod-status"
                            style={{ color: isPaid ? '#10B981' : '#F59E0B' }}
                          >
                            {isPaid ? '✓ PAID IN FULL (Verified)' : '⏳ Awaiting Payment'}
                          </span>
                        </div>

                        <div className="or-three-dots">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>

                    {/* ── Right Column: Metadata & Items Table ── */}
                    <div className="or-right-col">
                      {/* Header Meta */}
                      <div className="or-header-meta">
                        {isPaid && order.receipt?.receiptNumber ? (
                          <>
                            <div className="or-meta-item">
                              <span className="or-meta-title">Receipt No :</span>
                              <span className="or-meta-val" style={{ color: '#10B981', fontWeight: 800 }}>{order.receipt.receiptNumber}</span>
                            </div>
                            <div className="or-meta-item">
                              <span className="or-meta-title">Order No :</span>
                              <span className="or-meta-val">#{order.orderNumber}</span>
                            </div>
                          </>
                        ) : (
                          <div className="or-meta-item">
                            <span className="or-meta-title">Invoice No :</span>
                            <span className="or-meta-val">No. {order.orderNumber}</span>
                          </div>
                        )}

                        <div className="or-meta-item">
                          <span className="or-meta-title">{isPaid ? 'Receipt Date:' : 'Invoice Date:'}</span>
                          <span className="or-meta-val">{invoiceDate}</span>
                        </div>

                        <div className="or-meta-item">
                          <span className="or-meta-title">Status :</span>
                          <span className="or-meta-val" style={{ color: isPaid ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                            {isPaid ? 'PAID IN FULL (Verified)' : (order.paymentStatus === 'payment_reported' ? 'Payment Reported (Reviewing)' : 'Awaiting Payment')}
                          </span>
                        </div>

                        <div className="or-three-dots" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>

                      {/* Editorial Table */}
                      <div className="or-table-container">
                        <table className="or-table">
                          <thead>
                            <tr>
                              <th className="col-no">No</th>
                              <th className="col-desc">Description</th>
                              <th className="col-amt">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="col-no">{idx + 1}.</td>
                                <td className="col-desc">
                                  <div className="or-desc-name">{item.name}</div>
                                  <div className="or-desc-meta">
                                    {item.size || 'Standard 250g'} · Qty: {item.quantity}
                                  </div>
                                </td>
                                <td className="col-amt">
                                  KES {(item.price * item.quantity).toLocaleString()}
                                </td>
                              </tr>
                            ))}

                            {/* Shipping Fee if applicable */}
                            {order.shippingCost > 0 && (
                              <tr>
                                <td className="col-no">{items.length + 1}.</td>
                                <td className="col-desc">
                                  <div className="or-desc-name">Highland Express Delivery</div>
                                  <div className="or-desc-meta">Courier Dispatch to {shipping.city || 'Destination'}</div>
                                </td>
                                <td className="col-amt">
                                  KES {order.shippingCost.toLocaleString()}
                                </td>
                              </tr>
                            )}

                            {/* Discount row if applicable */}
                            {order.discountAmount > 0 && (
                              <tr>
                                <td className="col-no">—</td>
                                <td className="col-desc">
                                  <div className="or-desc-name" style={{ color: '#10B981' }}>Special Promotion Applied</div>
                                  <div className="or-desc-meta">Coupon / Seasonal Perk</div>
                                </td>
                                <td className="col-amt" style={{ color: '#10B981' }}>
                                  − KES {order.discountAmount.toLocaleString()}
                                </td>
                              </tr>
                            )}

                            {/* Total Row */}
                            <tr className="or-table-total-row">
                              <td colSpan="2" style={{ fontWeight: 800 }}>Total</td>
                              <td className="col-amt">
                                KES {order.total?.toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Clean Minimalist Single-Page Roastery Footer */}
                  <div className="or-minimal-footer">
                    <div className="or-footer-divider" />
                    <p className="or-footer-policy">
                      Goods once sold are not returnable unless damaged upon delivery.
                    </p>
                    <p className="or-footer-contact">
                      Support Email: {store.email || 'rerendet@gmail.com'} &bull; Contact / WhatsApp: {store.phone || '+254 705 684 894'}
                    </p>
                    <p className="or-footer-estate">
                      {store.name || 'Rerendet Coffee Roasters Limited'} &bull; Bomet Highlands, Great Rift Valley, Kenya
                    </p>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="oc-modal-footer no-print">
                {(isPaid && order.receipt?.receiptNumber) && (
                  <a
                    href={`/api/orders/${order._id || order.orderNumber}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-modal-print"
                    style={{ textDecoration: 'none', background: '#10B981', color: '#FFFFFF' }}
                  >
                    <FaDownload /> Download Official PDF Receipt
                  </a>
                )}
                <button
                  type="button"
                  className="btn-modal-print"
                  onClick={handlePrint}
                >
                  <FaPrint /> Print {isPaid ? 'Official Receipt' : 'Invoice'}
                </button>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderConfirmation;
