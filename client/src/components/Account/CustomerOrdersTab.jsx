// client/src/components/Account/CustomerOrdersTab.jsx — Minimalist Quiet Luxury Orders Suite
import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaEye, FaReceipt, FaTimes, FaPrint, FaArrowRight
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
  const { token, showNotification, publicSettings } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

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
        body: JSON.stringify({ cancellationReason: 'customer_portal_cancellation' })
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
    <div className="ord-luxury-canvas">
      {/* ══ Editorial Header ══ */}
      <div className="ord-luxury-header">
        <span className="ord-luxury-tag">ORDERS</span>
        <h2 className="ord-luxury-title">My Orders</h2>
        <p className="ord-luxury-sub">
          View your order history, track deliveries, and view invoices.
        </p>
        <div className="ord-luxury-h-line" />
      </div>

      {/* ══ Search & Minimal Filters Strip ══ */}
      <div className="ord-luxury-controls">
        <div className="ord-filter-pills-row">
          <button
            type="button"
            className={`ord-pill-filter ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({orders.length})
          </button>
          <button
            type="button"
            className={`ord-pill-filter ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={`ord-pill-filter ${statusFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => setStatusFilter('delivered')}
          >
            Delivered
          </button>
          <button
            type="button"
            className={`ord-pill-filter ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>

        <div className="ord-search-minimal">
          <FaSearch className="search-ico" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ord-search-minimal-input"
          />
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

                  <div className="ord-clean-badges-right">
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

                  <div className="ord-clean-actions">
                    <button
                      type="button"
                      className="ord-action-btn outline"
                      onClick={() => setSelectedInvoiceOrder(order)}
                    >
                      <FaReceipt /> View Receipt
                    </button>

                    <button
                      type="button"
                      className="ord-action-btn solid"
                      onClick={() => navigate(`/order-tracking/${order._id}`)}
                    >
                      Track Order <FaArrowRight style={{ fontSize: '0.7rem' }} />
                    </button>

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
        /* Empty State */
        <div className="ord-clean-empty">
          <h3 className="ord-clean-empty-title">
            {searchTerm ? 'No matching orders found' : 'No orders yet'}
          </h3>
          <p className="ord-clean-empty-text">
            {searchTerm
              ? `No orders match your search for "${searchTerm}".`
              : 'You have not placed any orders yet. Discover our fresh roasted coffee.'}
          </p>
          <button
            type="button"
            className="ord-action-btn solid"
            onClick={() => navigate('/#coffee-shop')}
          >
            Shop Coffee
          </button>
        </div>
      )}

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

              <div className="or-toolbar no-print" style={{ padding: '1.25rem 2rem 0', margin: 0 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--inv-text-muted)' }}>
                  Official Digital Invoice · #{selectedInvoiceOrder.orderNumber}
                </span>
                <button
                  type="button"
                  className="or-btn primary"
                  onClick={() => window.print()}
                >
                  <FaPrint /> Print Official Invoice
                </button>
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

                <div className="or-body-grid">
                  <div className="or-left-col">
                    <div className="or-title-wrapper">
                      <h1 className="or-vertical-title">Invoice.</h1>
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

                      <div className="or-three-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>

                  <div className="or-right-col">
                    <div className="or-header-meta">
                      <div className="or-brand-capsule">
                        <span className="or-capsule-name">
                          {store.name || 'Rerendet Co.'}
                        </span>
                        <img
                          src={store.logo || '/rerendet-emblem.png'}
                          alt="Rerendet Emblem"
                          className="or-capsule-emblem"
                          onError={(e) => { e.target.src = '/rerendet-logo.png'; }}
                        />
                      </div>

                      <div className="or-meta-item">
                        <span className="or-meta-title">Invoice No :</span>
                        <span className="or-meta-val">No. {selectedInvoiceOrder.orderNumber}</span>
                      </div>

                      <div className="or-meta-item">
                        <span className="or-meta-title">Invoice Date:</span>
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

                <div className="or-dark-banner">
                  <DotGrid className="top-right" />
                  <DotGrid className="bottom-left" />

                  <div className="or-signature-block">
                    <div className="or-signature-area">
                      {store.signature ? (
                        <img
                          src={store.signature}
                          alt="Authorized Signature"
                          className="or-signature-img"
                        />
                      ) : (
                        <div className="or-signature-cursive">
                          Rerendet
                        </div>
                      )}
                    </div>
                    <p className="or-signatory-name">
                      {store.signatoryName || 'Authorized Signatory'}
                    </p>
                  </div>

                  <div className="or-details-block">
                    <div>
                      <h3 className="or-banner-section-title">Payment Details:</h3>
                      <p className="or-banner-text">
                        <strong>Method:</strong> {selectedInvoiceOrder.paymentMethod === 'mpesa' ? 'M-PESA Express' : 'Credit / Debit Card'}<br />
                        <strong>Receipt Ref:</strong> {selectedInvoiceOrder.transactionId || 'Completed Transaction'}
                      </p>
                    </div>

                    <div>
                      <h3 className="or-banner-section-title">Notes:</h3>
                      <p className="or-banner-text">
                        Payment verified. 100% shade-grown Arabica from the Great Rift Valley highlands.
                      </p>
                    </div>
                  </div>
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
