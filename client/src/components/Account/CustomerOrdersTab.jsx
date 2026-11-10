// client/src/components/Account/CustomerOrdersTab.jsx — Minimalist Quiet Luxury Orders Suite
import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaEye, FaReceipt, FaTimes, FaPrint, FaArrowRight, FaDownload
} from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import './OrdersTab.css';
import '../Checkout/OrderReceipt.css';

/* ── 4x4 Gold Dot Matrix Pattern Component ── */
const DotGrid = ({ className = '' }) => (
  <div className={`or-dot-grid ${className}`} aria-hidden="true">
    {Array.from({ length: 16 }).map((_, i) => (
      <span key={i} />
    ))}
  </div>
);

/* ── Safe Product Image Resolver ── */
const getItemImage = (item) => {
  if (item?.product?.images && item.product.images.length > 0) {
    const img = item.product.images[0];
    return typeof img === 'string' ? img : img?.url || '/hero-product.png';
  }
  if (item?.product?.image) return item.product.image;
  if (item?.image) return item.image;
  return '/hero-product.png';
};

const CustomerOrdersTab = ({ orders = [], loading = false, onRefresh }) => {
  const navigate = useNavigate();
  const { token, showNotification, publicSettings, addToCart, setIsCartOpen } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) {
      navigate('/#coffee-shop');
      return;
    }
    order.items.forEach(item => {
      addToCart?.(
        item.product || { _id: item.productId, name: item.name, price: item.price, images: item.image ? [item.image] : [] },
        item.quantity || 1,
        item.size || '250g',
        item.grind || 'Whole Bean'
      );
    });
    setIsCartOpen?.(true);
    showNotification?.('Items added to your bag!', 'success');
  };

  const store = publicSettings?.store || {};

  // Filter Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const isCancelled = order.status === 'cancelled' || order.orderStatus === 'cancelled';
      const isDelivered = order.fulfillmentStatus === 'delivered';
      const isActive = !isCancelled && !isDelivered;

      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'delivered' && (!isDelivered || isCancelled)) return false;
      if (statusFilter === 'cancelled' && !isCancelled) return false;

      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const numMatch = order.orderNumber?.toLowerCase().includes(term);
      const itemMatch = order.items?.some(it =>
        (it.product?.name || it.name)?.toLowerCase().includes(term)
      );

      return numMatch || itemMatch;
    });
  }, [orders, statusFilter, searchTerm]);

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to cancel order #${order.orderNumber}?`)) return;
    setCancellingId(order._id);
    try {
      const activeToken = token || (JSON.parse(localStorage.getItem('auth') || '{}').token);
      const res = await fetch(`/api/orders/${order._id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancellationReason: 'changed_mind',
          cancellationNote: 'Cancelled via customer portal'
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.('Order cancelled successfully', 'success');
        onRefresh?.();
      } else {
        showNotification?.(data.message || 'Cancellation failed', 'error');
      }
    } catch {
      showNotification?.('Network error during cancellation', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="ord-luxury-canvas" style={{ padding: 0 }}>
      {/* ══ Editorial Header (Matching Image 2) ══ */}
      <div style={{ marginBottom: '1.25rem' }}>
        <span className="rc-dash-eyebrow">— YOUR ACCOUNT</span>
        <h2 className="rc-dash-title">My orders</h2>
        <p className="rc-dash-sub">
          Every order, from the first confirmation to the final delivery.
        </p>
      </div>

      {/* ══ Search & Filter Pills Row (Matching Image 2) ══ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '0.65rem 1rem',
        borderRadius: '16px',
        border: '1px solid #EBE4D8'
      }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '20px',
              border: 'none',
              background: statusFilter === 'all' ? '#EFE7DA' : 'transparent',
              color: statusFilter === 'all' ? '#1E140E' : '#69584B',
              fontWeight: statusFilter === 'all' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            All orders
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '20px',
              border: 'none',
              background: statusFilter === 'active' ? '#EFE7DA' : 'transparent',
              color: statusFilter === 'active' ? '#1E140E' : '#69584B',
              fontWeight: statusFilter === 'active' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            In progress
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('delivered')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '20px',
              border: 'none',
              background: statusFilter === 'delivered' ? '#EFE7DA' : 'transparent',
              color: statusFilter === 'delivered' ? '#1E140E' : '#69584B',
              fontWeight: statusFilter === 'delivered' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Delivered
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: '#FAF7F2',
          padding: '0.45rem 1rem',
          borderRadius: '12px',
          border: '1px solid #ECE4D8',
          minWidth: '220px'
        }}>
          <FaSearch style={{ color: '#8E7D70', fontSize: '0.8rem' }} />
          <input
            type="text"
            placeholder="Search your order history"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.84rem',
              color: '#1E140E',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* ══ Order History Container (Matching Image 2) ══ */}
      <div className="rc-card-white" style={{ padding: '1.75rem 2rem', marginBottom: '1.75rem' }}>
        {/* Card Header: Icon + Title + Orders Placed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(202, 160, 88, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#B58838',
            fontSize: '0.85rem',
            flexShrink: 0
          }}>
            📦
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1E140E', margin: '0 0 2px 0' }}>
              Order history
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#69584B', margin: 0 }}>
              {filteredOrders.length === 1 ? '1 order placed so far' : `${filteredOrders.length} orders placed so far`}
            </p>
          </div>
        </div>

      {/* ══ Orders List ══ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--ord-text-sub)' }}>
          <p>Loading your orders…</p>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="ord-luxury-list">
          {filteredOrders.map(order => {
            const isCancelled = order.status === 'cancelled' || order.orderStatus === 'cancelled';
            const isCancelable = !isCancelled && (order.fulfillmentStatus === 'unfulfilled' || !order.fulfillmentStatus);
            const isDelivered = order.fulfillmentStatus === 'delivered';
            const isShipped = order.fulfillmentStatus === 'shipped';
            const items = order.items || [];

            const formattedDate = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              : 'Recent Order';

            const statusClass = isCancelled ? 'cancelled' : isDelivered ? 'delivered' : isShipped ? 'shipped' : 'processing';
            const statusLabel = isCancelled ? 'Cancelled' : isDelivered ? 'Delivered' : isShipped ? 'In Transit' : 'Preparing Order';

            return (
              <div key={order._id} className="ord-clean-card">
                {/* Top Meta Strip */}
                <div className="ord-clean-top">
                  <div className="ord-clean-meta-left">
                    <span className="ord-clean-number">Order #{order.orderNumber}</span>
                    <span className="ord-clean-dot-sep" />
                    <span className="ord-clean-date">{formattedDate}</span>
                  </div>

                  <div className="ord-clean-badges-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {order.paymentMethod === 'paybill' && (
                      <span
                        className="ord-clean-pay-pill"
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: order.paymentStatus === 'paid' ? '#E8F5E9' : order.paymentStatus === 'partially_paid' ? '#FEF3C7' : (order.paymentStatus === 'payment_reported' || order.paymentReporting?.reported) ? '#FEF3C7' : order.paymentStatus === 'expired' ? '#F1F5F9' : '#FFFBEB',
                          color: order.paymentStatus === 'paid' ? '#1B5E20' : order.paymentStatus === 'partially_paid' ? '#92400E' : (order.paymentStatus === 'payment_reported' || order.paymentReporting?.reported) ? '#92400E' : order.paymentStatus === 'expired' ? '#64748B' : '#B45309',
                          border: `1px solid ${order.paymentStatus === 'paid' ? '#C8E6C9' : '#FDE68A'}`
                        }}
                      >
                        {order.paymentStatus === 'paid'
                          ? '✓ Paid (M-Pesa)'
                          : order.paymentStatus === 'partially_paid'
                          ? 'Partially Paid'
                          : (order.paymentStatus === 'payment_reported' || order.paymentReporting?.reported)
                          ? 'Payment Reported'
                          : order.paymentStatus === 'expired'
                          ? 'Expired'
                          : 'Awaiting Payment'}
                      </span>
                    )}
                    {order.paymentMethod === 'cod' && (
                      <span
                        className="ord-clean-pay-pill"
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: order.paymentStatus === 'paid' ? '#E8F5E9' : '#F1F5F9',
                          color: order.paymentStatus === 'paid' ? '#1B5E20' : '#475569',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        {order.paymentStatus === 'paid' ? '✓ COD Settled' : 'Cash on Delivery'}
                      </span>
                    )}
                    <span className={`ord-clean-status-pill ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div className="ord-clean-divider" />

                {/* Products List */}
                <div className="ord-clean-items">
                  {items.map((item, idx) => (
                    <div key={idx} className="ord-clean-item">
                      <div className="ord-clean-item-left">
                        <img
                          src={getItemImage(item)}
                          alt={item.name}
                          className="ord-clean-thumb"
                          onError={(e) => { e.target.src = '/hero-product.png'; }}
                        />
                        <div className="ord-clean-item-info">
                          <span className="ord-clean-item-title">{item.product?.name || item.name}</span>
                          <span className="ord-clean-item-spec">
                            {item.size || '250g'} · Quantity: {item.quantity}
                          </span>
                        </div>
                      </div>

                      <span className="ord-clean-item-price">
                        KES {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="ord-clean-divider" />

                {/* Bottom Total & Actions */}
                <div className="ord-clean-bottom">
                  <div className="ord-clean-total-wrap">
                    <span className="ord-clean-total-label">Total</span>
                    <span className="ord-clean-total-val">
                      KES {order.total?.toLocaleString()}
                    </span>
                  </div>

                  <div className="ord-clean-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {!isCancelled && order.paymentMethod === 'paybill' && ['pending', 'payment_reported', 'partially_paid'].includes(order.paymentStatus) && (
                      <button
                        type="button"
                        className="ord-action-btn outline"
                        style={{ color: '#D97706', borderColor: '#FCD34D', background: '#FEF3C7' }}
                        onClick={() => navigate(`/track-order/${order._id}`)}
                      >
                        {order.paymentStatus === 'payment_reported' || order.paymentReporting?.reported ? 'Payment Reported' : 'Complete / Report Payment'}
                      </button>
                    )}

                    {!isCancelled && (order.paymentStatus === 'paid' && order.receipt?.receiptNumber) && (
                      <a
                        href={`/api/orders/${order._id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ord-action-btn outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      >
                        <FaReceipt /> Download PDF Receipt
                      </a>
                    )}

                    {!isCancelled ? (
                      <button
                        type="button"
                        className="ord-action-btn solid"
                        onClick={() => navigate(`/track-order/${order._id}`)}
                      >
                        Track Order <FaArrowRight style={{ fontSize: '0.7rem' }} />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="ord-action-btn outline"
                          style={{ borderColor: '#E2DDD5', color: '#64748B' }}
                          onClick={() => navigate(`/track-order/${order._id}`)}
                        >
                          Order Details
                        </button>
                        <button
                          type="button"
                          className="ord-action-btn solid"
                          style={{ background: '#1E140E', color: '#FFFFFF' }}
                          onClick={() => handleReorder(order)}
                        >
                          Order Again
                        </button>
                      </>
                    )}

                    {isCancelable && (
                      <button
                        type="button"
                        className="ord-clean-cancel-link"
                        disabled={cancellingId === order._id}
                        onClick={() => handleCancelOrder(order)}
                      >
                        {cancellingId === order._id ? 'Cancelling…' : 'Cancel order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State (Matching Image 2) */
        <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#FAF6EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: '#B58838',
            fontSize: '1.6rem'
          }}>
            📦
          </div>
          <h4 style={{
            fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)',
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#1E140E',
            margin: '0 0 0.65rem'
          }}>
            Your order history starts here
          </h4>
          <p style={{ color: '#665548', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: 1.5 }}>
            When you place an order, you'll find its receipt, delivery progress and tracking details right here.
          </p>

          {/* 3 Step Row (Matching Image 2) */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2rem',
            padding: '1.25rem 0',
            borderTop: '1px solid #F2ECE3',
            borderBottom: '1px solid #F2ECE3',
            maxWidth: '560px',
            margin: '0 auto 2rem',
            fontSize: '0.85rem',
            color: '#69584B',
            fontWeight: 500
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>📦</span>
              <span>Order confirmed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>🔍</span>
              <span>Track your parcel</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>🚚</span>
              <span>Delivered to you</span>
            </div>
          </div>

          <button
            type="button"
            className="rc-btn-gold"
            onClick={() => navigate('/#coffee-shop')}
          >
            Back to your account →
          </button>
        </div>
      )}
      </div>

      {/* ══ Need a Hand Banner (Matching Image 2) ══ */}
      <div className="rc-card-white" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.75rem', marginBottom: 0 }}>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E140E', margin: '0 0 2px 0' }}>
            Need a hand with an order?
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#665548', margin: 0 }}>
            Our team can help with delivery questions and order updates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/account?tab=tickets')}
          style={{
            background: 'none',
            border: 'none',
            color: '#B58838',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0
          }}
        >
          Visit help & support ↗
        </button>
      </div>

      {/* ══ Floating Liceria Luxury Invoice Modal ══ */}
      <AnimatePresence>
        {selectedInvoiceOrder && (
          <div
            className="ord-modal-backdrop"
            onClick={() => setSelectedInvoiceOrder(null)}
          >
            <motion.div
              className="ord-invoice-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="ord-modal-close-btn"
                onClick={() => setSelectedInvoiceOrder(null)}
                aria-label="Close Invoice Modal"
              >
                <FaTimes />
              </button>

              <div className="or-toolbar no-print" style={{ padding: '1.25rem 2rem 0', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--inv-text-muted)' }}>
                  {(selectedInvoiceOrder.paymentStatus === 'paid' && selectedInvoiceOrder.receipt?.receiptNumber)
                    ? `Official Payment Receipt · #${selectedInvoiceOrder.receipt.receiptNumber}`
                    : `Official Digital Invoice · #${selectedInvoiceOrder.orderNumber}`}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(selectedInvoiceOrder.paymentStatus === 'paid' && selectedInvoiceOrder.receipt?.receiptNumber) && (
                    <a
                      href={`/api/orders/${selectedInvoiceOrder._id || selectedInvoiceOrder.orderNumber}/receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="or-btn primary"
                      style={{ textDecoration: 'none', background: '#10B981', color: '#FFFFFF', borderColor: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FaDownload /> Download PDF
                    </a>
                  )}
                  <button
                    type="button"
                    className="or-btn primary"
                    onClick={() => window.print()}
                  >
                    <FaPrint /> Print {selectedInvoiceOrder.paymentStatus === 'paid' || selectedInvoiceOrder.receipt?.receiptNumber ? 'Receipt' : 'Invoice'}
                  </button>
                </div>
              </div>

              {/* Exact Liceria Editorial Sheet */}
              <div className="or-sheet" style={{ margin: '1rem auto 0', boxShadow: 'none' }}>
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
                    onError={(e) => { e.target.src = '/rerendet-logo.png'; }}
                  />
                  <h2 className="or-center-brand-name">{store.name || 'RERENDET COFFEE ROASTERS'}</h2>
                  <p className="or-center-brand-sub">Great Rift Valley Highlands · Bomet, Kenya</p>
                </div>

                <div className="or-body-grid">
                  <div className="or-left-col">
                    <div className="or-title-wrapper">
                      <h1 className="or-vertical-title">
                        {selectedInvoiceOrder.paymentStatus === 'paid' || selectedInvoiceOrder.receipt?.receiptNumber ? 'Receipt.' : 'Invoice.'}
                      </h1>
                      <div className="or-vertical-accent-line">
                        <div className="or-accent-dot" />
                      </div>
                    </div>

                    <div className="or-client-box">
                      <span className="or-label-sm">Invoice To :</span>
                      <h2 className="or-client-name">
                        {selectedInvoiceOrder.shippingAddress
                          ? `${selectedInvoiceOrder.shippingAddress.firstName || ''} ${selectedInvoiceOrder.shippingAddress.lastName || ''}`.trim()
                          : selectedInvoiceOrder.user?.name || 'Valued Customer'}
                      </h2>
                      <p className="or-client-text">
                        {selectedInvoiceOrder.shippingAddress?.phone || store.phone || '+254 700 000 000'}
                      </p>
                      <p className="or-client-text">
                        {selectedInvoiceOrder.shippingAddress?.email || selectedInvoiceOrder.user?.email || 'customer@rerendetcoffee.com'}
                      </p>
                      <p className="or-client-text">
                        {selectedInvoiceOrder.shippingAddress?.address ? `${selectedInvoiceOrder.shippingAddress.address}, ` : ''}
                        {`${selectedInvoiceOrder.shippingAddress?.town ? selectedInvoiceOrder.shippingAddress.town + ', ' : ''}${selectedInvoiceOrder.shippingAddress?.county ? selectedInvoiceOrder.shippingAddress.county + ', ' : ''}${selectedInvoiceOrder.shippingAddress?.country || 'Kenya'}`}
                      </p>

                      <div className="or-paymethod-capsule">
                        <span className="or-paymethod-title">Payment Method</span>
                        <span className="or-paymethod-val">
                          {selectedInvoiceOrder.paymentMethod === 'paybill' ? 'M-Pesa Paybill' : (selectedInvoiceOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : (selectedInvoiceOrder.paymentMethod === 'card' ? 'Credit / Debit Card' : 'M-Pesa'))}
                        </span>
                        <span
                          className="or-paymethod-status"
                          style={{ color: (selectedInvoiceOrder.paymentStatus === 'paid' || selectedInvoiceOrder.receipt?.receiptNumber) ? '#10B981' : '#F59E0B' }}
                        >
                          {(selectedInvoiceOrder.paymentStatus === 'paid' || selectedInvoiceOrder.receipt?.receiptNumber) ? '✓ PAID IN FULL (Verified)' : '⏳ Awaiting Payment'}
                        </span>
                      </div>

                      <div className="or-three-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>

                  <div className="or-right-col">
                    <div className="or-header-meta">
                      {(selectedInvoiceOrder.paymentStatus === 'paid' || selectedInvoiceOrder.receipt?.receiptNumber) && selectedInvoiceOrder.receipt?.receiptNumber ? (
                        <>
                          <div className="or-meta-item">
                            <span className="or-meta-title">Receipt No :</span>
                            <span className="or-meta-val" style={{ color: '#10B981', fontWeight: 800 }}>{selectedInvoiceOrder.receipt.receiptNumber}</span>
                          </div>
                          <div className="or-meta-item">
                            <span className="or-meta-title">Order No :</span>
                            <span className="or-meta-val">#{selectedInvoiceOrder.orderNumber}</span>
                          </div>
                        </>
                      ) : (
                        <div className="or-meta-item">
                          <span className="or-meta-title">Invoice No :</span>
                          <span className="or-meta-val">No. {selectedInvoiceOrder.orderNumber}</span>
                        </div>
                      )}

                      <div className="or-meta-item">
                        <span className="or-meta-title">{selectedInvoiceOrder.paymentStatus === 'paid' || selectedInvoiceOrder.receipt?.receiptNumber ? 'Receipt Date:' : 'Invoice Date:'}</span>
                        <span className="or-meta-val">
                          {selectedInvoiceOrder.createdAt
                            ? new Date(selectedInvoiceOrder.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })
                            : new Date().toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <div className="or-meta-item">
                        <span className="or-meta-title">Status :</span>
                        <span className="or-meta-val" style={{ color: (selectedInvoiceOrder.paymentStatus === 'paid' || selectedInvoiceOrder.receipt?.receiptNumber) ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                          {(selectedInvoiceOrder.paymentStatus === 'paid' || selectedInvoiceOrder.receipt?.receiptNumber) ? 'PAID IN FULL (Verified)' : 'Awaiting Payment'}
                        </span>
                      </div>

                      <div className="or-three-dots" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>

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
                          {selectedInvoiceOrder.items?.map((item, idx) => (
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

                          {selectedInvoiceOrder.shippingCost > 0 && (
                            <tr>
                              <td className="col-no">{(selectedInvoiceOrder.items?.length || 0) + 1}.</td>
                              <td className="col-desc">
                                <div className="or-desc-name">Highland Express Dispatch</div>
                                <div className="or-desc-meta">Direct to {selectedInvoiceOrder.shippingAddress?.city || 'Destination'}</div>
                              </td>
                              <td className="col-amt">
                                KES {selectedInvoiceOrder.shippingCost.toLocaleString()}
                              </td>
                            </tr>
                          )}

                          {selectedInvoiceOrder.discountAmount > 0 && (
                            <tr>
                              <td className="col-no">—</td>
                              <td className="col-desc">
                                <div className="or-desc-name" style={{ color: '#10B981' }}>Special Reserve Coupon Applied</div>
                                <div className="or-desc-meta">Seasonal Promotion</div>
                              </td>
                              <td className="col-amt" style={{ color: '#10B981' }}>
                                − KES {selectedInvoiceOrder.discountAmount.toLocaleString()}
                              </td>
                            </tr>
                          )}

                          <tr className="or-table-total-row">
                            <td colSpan="2" style={{ fontWeight: 800 }}>Total</td>
                            <td className="col-amt">
                              KES {selectedInvoiceOrder.total?.toLocaleString()}
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerOrdersTab;
