// components/Checkout/OrderReceipt.jsx — Editorial Luxury Invoice
import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion } from 'framer-motion';
import { FaPrint, FaArrowLeft, FaReceipt, FaDownload } from 'react-icons/fa';
import './OrderReceipt.css';

/* ── 4x4 Gold Dot Matrix Pattern Component ── */
const DotGrid = ({ className = '' }) => (
  <div className={`or-dot-grid ${className}`} aria-hidden="true">
    {Array.from({ length: 16 }).map((_, i) => (
      <span key={i} />
    ))}
  </div>
);

const OrderReceipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, showNotification, publicSettings } = useContext(AppContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success && result.data) {
          setOrder(result.data);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        console.error(err);
        showNotification?.('Could not load invoice details', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="or-page">
        <div className="or-loading">
          <div className="or-spinner" />
          <p>Preparing official invoice…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="or-page">
        <div className="or-error">
          <FaReceipt className="or-error-icon" />
          <h2>Invoice Not Found</h2>
          <button className="or-btn primary" onClick={() => navigate('/account?tab=orders')}>
            Go to My Orders
          </button>
        </div>
      </div>
    );
  }

  const addr = order.shippingAddress || {};
  const items = order.items || [];
  const store = publicSettings?.store || {};

  // Formatted date (e.g. "17 November, 2024")
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

  const clientName = `${addr.firstName || ''} ${addr.lastName || ''}`.trim() || order.user?.name || 'Valued Customer';
  const clientPhone = addr.phone || store.phone || '+254 700 000 000';
  const clientEmail = addr.email || order.user?.email || 'customer@rerendetcoffee.com';
  const clientLocation = `${addr.town ? addr.town + ', ' : ''}${addr.city || addr.county || 'Nairobi, Kenya'}`;

  // Signature: use admin uploaded signature if present, or fallback to signature script
  const signatureUrl = store.signature || '';
  const signatoryName = store.signatoryName || 'Authorized Farm Signatory';

  const isPaid = order.paymentStatus === 'paid' || !!order.receipt?.receiptNumber;
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
    || (order.paymentMethod === 'paybill' ? `Paybill 516600 (Acc: 934558 • Ref: ${order.orderNumber})` : 'Pending Verification');

  return (
    <div className="or-page">
      {/* ── Top Floating Toolbar (No Print) ── */}
      <div className="or-toolbar no-print">
        <button className="or-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <div className="or-toolbar-actions">
          {(isPaid && order.receipt?.receiptNumber) && (
            <a
              href={`/api/orders/${order._id || order.orderNumber}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
              className="or-btn primary"
              style={{ textDecoration: 'none', background: '#10B981', color: '#FFFFFF', borderColor: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FaDownload /> Download PDF Receipt
            </a>
          )}
          <button className="or-btn outline" onClick={handlePrint}>
            <FaPrint /> Print {isPaid ? 'Receipt' : 'Invoice'}
          </button>
        </div>
      </div>

      {/* ── Editorial Invoice Document Sheet ── */}
      <motion.div
        className="or-sheet"
        ref={printRef}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
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
                        <div className="or-desc-meta">Courier Dispatch to {addr.city || 'Destination'}</div>
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

      </motion.div>
    </div>
  );
};

export default OrderReceipt;
