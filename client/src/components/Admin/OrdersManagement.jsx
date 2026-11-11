// src/components/Admin/OrdersManagement.jsx — Premium Rewrite
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaEye, FaEdit, FaSync, FaBoxOpen,
  FaTimes, FaChevronLeft, FaChevronRight,
  FaShippingFast, FaCheckCircle, FaTimesCircle,
  FaMoneyBillWave, FaClipboardList, FaTruck,
  FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope,
  FaTag, FaClock, FaCoffee, FaBell, FaCalendar,
  FaCopy, FaArrowRight, FaWhatsapp, FaFileAlt
} from 'react-icons/fa';
import './OrdersManagement.css';

// ─── Config ─────────────────────────────────────────────────────
const PAYMENT_COLORS = {
  paid: { label: 'Paid', bg: 'rgba(16,185,129,0.12)', text: '#10b981', dot: '#10b981' },
  pending: { label: 'Awaiting Payment', bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', dot: '#f59e0b' },
  payment_reported: { label: 'Payment Reported', bg: 'rgba(217,119,6,0.15)', text: '#d97706', dot: '#d97706' },
  partially_paid: { label: 'Partially Paid', bg: 'rgba(234,88,12,0.12)', text: '#ea580c', dot: '#ea580c' },
  expired: { label: 'Expired', bg: 'rgba(107,114,128,0.15)', text: '#6b7280', dot: '#6b7280' },
  failed: { label: 'Failed', bg: 'rgba(239,68,68,0.12)', text: '#ef4444', dot: '#ef4444' },
  refunded: { label: 'Refunded', bg: 'rgba(107,114,128,0.12)', text: '#6b7280', dot: '#6b7280' },
};

const FULFILLMENT_CONFIG = {
  unfulfilled: { label: 'Confirmed', step: 0, icon: <FaBoxOpen />, color: '#6b7280' },
  packed: { label: 'Processing', step: 1, icon: <FaClipboardList />, color: '#3b82f6' },
  shipped: { label: 'Shipped', step: 2, icon: <FaTruck />, color: '#8b5cf6' },
  delivered: { label: 'Delivered', step: 3, icon: <FaCheckCircle />, color: '#10b981' },
  returned: { label: 'Returned', step: -1, icon: <FaTimesCircle />, color: '#ef4444' },
};

const formatDate = (d) => !d ? '—' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDateTime = (d) => !d ? '—' : new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Status Badge ────────────────────────────────────────────────
const PayBadge = ({ status }) => {
  const cfg = PAYMENT_COLORS[status] || { label: status, bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', dot: '#f59e0b' };
  return (
    <span className="om-pay-badge" style={{ background: cfg.bg, color: cfg.text }}>
      <span className="om-dot" style={{ background: cfg.dot }} />
      {cfg.label || status}
    </span>
  );
};

const FulfillBadge = ({ status }) => {
  const cfg = FULFILLMENT_CONFIG[status] || FULFILLMENT_CONFIG.unfulfilled;
  return (
    <span className="om-fulfill-badge" style={{ color: cfg.color, background: `${cfg.color}18` }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Fulfillment Pipeline ────────────────────────────────────────
const FulfillPipeline = ({ status }) => {
  const steps = ['unfulfilled', 'packed', 'shipped', 'delivered'];
  const current = FULFILLMENT_CONFIG[status]?.step ?? 0;
  const isReturned = status === 'returned';

  if (isReturned) {
    return (
      <div className="om-pipeline returned">
        <FaTimesCircle /> Order Returned
      </div>
    );
  }

  return (
    <div className="om-pipeline">
      {steps.map((step, i) => {
        const cfg = FULFILLMENT_CONFIG[step];
        const done = current >= cfg.step;
        const active = current === cfg.step;
        return (
          <React.Fragment key={step}>
            <div className={`om-pipeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
              <div className="om-pipeline-dot">{cfg.icon}</div>
              <span>{cfg.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`om-pipeline-line ${current > cfg.step ? 'done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Customer Initials Avatar ────────────────────────────────────
const CustomerAvatar = ({ user }) => {
  const initials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'G';
  return <div className="om-customer-avatar">{initials}</div>;
};

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const OrdersManagement = () => {
  const { showNotification, token } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, shipped: 0, revenue: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    paymentStatus: 'all',
    fulfillmentStatus: 'active',
    search: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setFilters(p => ({ ...p, search: searchTerm, page: 1 })), 450);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { fetchOrders(); }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(k => {
        if (filters[k] && filters[k] !== 'all') params.append(k, filters[k]);
      });

      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();

      if (data.success) {
        const orderList = data.data.orders || [];
        setOrders(orderList);
        setPagination(data.data.pagination || {});

        const awaitingPaymentCount = data.data.counts?.awaitingPayment !== undefined
          ? data.data.counts.awaitingPayment
          : orderList.filter(o => o.paymentMethod === 'paybill' && o.paymentStatus === 'pending' && !o.paymentReporting?.reported && o.orderStatus !== 'cancelled').length;

        const paymentReportedCount = data.data.counts?.paymentReported !== undefined
          ? data.data.counts.paymentReported
          : orderList.filter(o => o.paymentMethod === 'paybill' && (o.paymentStatus === 'payment_reported' || o.paymentReporting?.reported) && o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled').length;

        const partiallyPaidCount = data.data.counts?.partiallyPaid !== undefined
          ? data.data.counts.partiallyPaid
          : orderList.filter(o => o.paymentMethod === 'paybill' && o.paymentStatus === 'partially_paid' && o.orderStatus !== 'cancelled').length;

        const awaitingPrepCount = data.data.counts?.awaitingPrep !== undefined
          ? data.data.counts.awaitingPrep
          : orderList.filter(o => (o.paymentStatus === 'paid' || o.paymentMethod === 'cod') && o.fulfillmentStatus === 'unfulfilled' && o.orderStatus !== 'cancelled').length;

        setStats({
          total: data.data.pagination?.total || orderList.length,
          awaitingPayment: awaitingPaymentCount,
          paymentReported: paymentReportedCount,
          partiallyPaid: partiallyPaidCount,
          pending: awaitingPrepCount,
          shipped: orderList.filter(o => o.fulfillmentStatus === 'shipped').length,
          revenue: orderList.reduce((sum, o) => sum + (o.total || 0), 0),
        });
      }
    } catch (err) {
      showNotification(err.message || 'Failed to load orders', 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId, payload) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment confirmation failed');
      }
      if (data.success) {
        showNotification(data.message || 'Payment confirmed successfully', 'success');
        fetchOrders();
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(data.data);
        }
        return true;
      }
    } catch (err) {
      showNotification(err.message || 'Confirmation failed', 'error');
      return false;
    }
  };

  const updateOrderStatus = async (orderId, updates) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, notifyCustomer: true })
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      if (data.success) {
        showNotification('Order updated successfully', 'success');
        fetchOrders();
        // Refresh selected order state too
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(prev => ({ ...prev, ...updates }));
        }
      } else throw new Error(data.message);
    } catch (err) {
      showNotification(err.message || 'Update failed', 'error');
    }
  };

  const handleManualOverride = async (orderId, payload) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/manual-override`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to override payment');
      }
      const data = await res.json();
      if (data.success) {
        showNotification('Order manually marked as paid successfully', 'success');
        fetchOrders();
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(data.data);
        }
        return true;
      }
    } catch (err) {
      showNotification(err.message || 'Manual override failed', 'error');
      return false;
    }
  };

  const handleRefund = async (orderId, payload) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to initiate refund');
      }
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Refund successfully processed', 'success');
        fetchOrders();
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(data.data);
        }
        return true;
      }
    } catch (err) {
      showNotification(err.message || 'Refund processing failed', 'error');
      return false;
    }
  };

  const handleSelectAll = (e) => setSelectedOrders(e.target.checked ? orders.map(o => o._id) : []);
  const handleSelectOrder = (id) =>
    setSelectedOrders(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const FULFILLMENT_PILLS = ['active', 'payment_queue', 'awaiting_payment', 'unfulfilled', 'packed', 'shipped', 'delivered', 'returned', 'all'];

  const pillCounts = useMemo(() => {
    const counts = {
      active: 0,
      all: pagination.total || orders.length,
      payment_queue: stats.paymentReported || 0,
      awaiting_payment: stats.awaitingPayment || 0
    };
    orders.forEach(o => {
      const st = o.fulfillmentStatus || 'unfulfilled';
      counts[st] = (counts[st] || 0) + 1;
      if (st !== 'delivered' && st !== 'returned' && o.orderStatus !== 'cancelled') {
        counts.active = (counts.active || 0) + 1;
      }
    });
    return counts;
  }, [orders, pagination.total, stats.paymentReported, stats.awaitingPayment]);

  const copyOrderNumber = (e, num) => {
    e.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(num);
      showNotification(`Copied Order #${num} to clipboard`, 'info');
    }
  };

  return (
    <div className="orders-management">
      {/* ── Page Header ── */}
      <div className="om-page-header">
        <div>
          <h1 className="om-title">Orders & Fulfillment</h1>
          <p className="om-subtitle">Monitor customer orders, verify payments against bank records, and dispatch shipments</p>
        </div>
        <div className="om-header-actions">
          <span className="om-live-badge">
            <span className="om-live-dot" /> {pagination.total || stats.total} Total Orders
          </span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="om-stats-row">
        {[
          { icon: <FaClipboardList />, label: 'Total Orders', value: (pagination.total || stats.total).toLocaleString(), sub: 'All-time volume', color: '#3b82f6' },
          { icon: <FaClock />, label: 'Awaiting Payment', value: (stats.awaitingPayment || 0).toLocaleString(), sub: 'Unpaid Paybill orders', color: '#f59e0b' },
          { icon: <FaBell />, label: 'Payment Reported', value: (stats.paymentReported || 0).toLocaleString(), sub: 'Needs bank check', color: '#d97706' },
          { icon: <FaTag />, label: 'Partially Paid', value: (stats.partiallyPaid || 0).toLocaleString(), sub: 'Balance due', color: '#ea580c' },
          { icon: <FaBoxOpen />, label: 'Awaiting Prep', value: (stats.pending || 0).toLocaleString(), sub: 'Paid & COD to roast', color: '#10b981' },
          { icon: <FaShippingFast />, label: 'In Transit', value: (stats.shipped || 0).toLocaleString(), sub: 'Dispatched with courier', color: '#8b5cf6' },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="om-stat-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ '--stat-color': s.color }}
          >
            <div className="om-stat-icon" style={{ background: `${s.color}1a`, color: s.color }}>{s.icon}</div>
            <div className="om-stat-content">
              <p className="om-stat-value">{s.value}</p>
              <p className="om-stat-label">{s.label}</p>
              <p className="om-stat-sub">{s.sub}</p>
            </div>
            <div className="om-stat-bar" />
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="om-toolbar">
        <div className="om-search-box">
          <FaSearch className="om-search-icon" />
          <input
            type="text"
            placeholder="Search order #, customer, or phone…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="om-clear-btn" onClick={() => setSearchTerm('')}><FaTimes /></button>
          )}
        </div>

        {/* Payment filter */}
        <select
          className="om-select"
          value={filters.paymentStatus}
          onChange={e => setFilters(p => ({ ...p, paymentStatus: e.target.value, page: 1 }))}
        >
          <option value="all">All Payments</option>
          <option value="awaiting_payment">Awaiting Payment (Paybill)</option>
          <option value="pending">Pending</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="expired">Expired</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        {/* Date range */}
        <div className="om-date-range">
          <FaCalendar />
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters(p => ({ ...p, startDate: e.target.value, page: 1 }))}
          />
          <span>—</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters(p => ({ ...p, endDate: e.target.value, page: 1 }))}
          />
        </div>

        <button className="om-refresh-btn" onClick={fetchOrders} disabled={loading} title="Refresh">
          <FaSync className={loading ? 'om-spin' : ''} />
        </button>
      </div>

      {/* ── Fulfillment Pills ── */}
      <div className="om-fulfill-pills">
        {FULFILLMENT_PILLS.map(f => (
          <button
            key={f}
            className={`om-fulfill-pill ${filters.fulfillmentStatus === f ? 'active' : ''}`}
            onClick={() => setFilters(p => ({ ...p, fulfillmentStatus: f, page: 1 }))}
          >
            <span>
              {f === 'payment_queue' && <FaBell style={{ marginRight: '6px', fontSize: '11px', color: '#D97706' }} />}
              {f === 'awaiting_payment' && <FaClock style={{ marginRight: '6px', fontSize: '11px' }} />}
              {f === 'active'
                ? 'Active Orders'
                : f === 'all'
                ? 'All Orders'
                : f === 'payment_queue'
                ? 'Verification Queue'
                : f === 'awaiting_payment'
                ? 'Awaiting Payment'
                : f === 'delivered'
                ? 'Delivered (Archived)'
                : FULFILLMENT_CONFIG[f]?.label || f}
            </span>
            {pillCounts[f] !== undefined && (
              <span className="om-pill-count">{pillCounts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Bulk Bar ── */}
      <AnimatePresence>
        {selectedOrders.length > 0 && (
          <motion.div
            className="om-bulk-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>{selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected</span>
            <button className="om-bulk-clear" onClick={() => setSelectedOrders([])}>
              <FaTimes /> Clear Selection
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ── */}
      {loading ? (
        <div className="om-loading">
          <div className="om-spinner" />
          <p>Loading orders…</p>
        </div>
      ) : (
        <div className="om-table-wrap">
          <table className="om-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" onChange={handleSelectAll}
                    checked={orders.length > 0 && selectedOrders.length === orders.length} />
                </th>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Fulfillment</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="om-empty-row">
                    <div className="om-empty">
                      <FaBoxOpen className="om-empty-icon" />
                      <h3>No orders found</h3>
                      <p>{searchTerm ? `No results for "${searchTerm}"` : 'Try adjusting your filters'}</p>
                    </div>
                  </td>
                </tr>
              ) : orders.map((order, i) => (
                <motion.tr
                  key={order._id}
                  className={`om-row ${selectedOrders.includes(order._id) ? 'selected' : ''}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.025 }}
                  onClick={() => setSelectedOrder(order)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      checked={selectedOrders.includes(order._id)}
                      onChange={() => handleSelectOrder(order._id)} />
                  </td>
                  <td>
                    <div className="om-order-num-cell">
                      <div className="om-order-num-row">
                        <strong className="om-order-chip">#{order.orderNumber}</strong>
                        <button
                          className="om-copy-chip-btn"
                          onClick={e => copyOrderNumber(e, order.orderNumber)}
                          title="Copy Order #"
                        >
                          <FaCopy />
                        </button>
                      </div>
                      <span className="om-item-count">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td>
                    <div className="om-customer-cell">
                      <CustomerAvatar user={order.user} />
                      <div>
                        <strong>{order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest'}</strong>
                        <span className="om-customer-email">{order.user?.email || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="om-amount">KES {order.total?.toLocaleString()}</span>
                    <span className="om-pay-method">{order.paymentMethod}</span>
                  </td>
                  <td>
                    <PayBadge status={order.paymentStatus} />
                    {order.paymentReporting?.reported && order.paymentStatus !== 'paid' && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#D97706', fontWeight: 700, marginTop: '3px' }}>
                        🔔 Reported: {order.paymentReporting.mpesaCode || 'Unspecified'}
                      </span>
                    )}
                  </td>
                  <td><FulfillBadge status={order.fulfillmentStatus} /></td>
                  <td><span className="om-date">{formatDate(order.createdAt)}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="om-view-btn" onClick={() => setSelectedOrder(order)} title="Open Order">
                      <FaEye />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="om-pagination">
              <button className="om-page-btn" disabled={filters.page === 1}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>
                <FaChevronLeft /> Prev
              </button>
              <span className="om-page-info">Page {filters.page} of {pagination.pages} · {pagination.total} orders</span>
              <button className="om-page-btn" disabled={filters.page === pagination.pages}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>
                Next <FaChevronRight />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Order Drawer ── */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDrawer
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdate={updateOrderStatus}
            onManualOverride={handleManualOverride}
            onConfirmPayment={handleConfirmPayment}
            onRefund={handleRefund}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  ORDER DETAIL DRAWER
// ═══════════════════════════════════════════════════════════════
const SUGGESTED_MESSAGES = {
  unfulfilled: "Your order has been confirmed and is being processed by our team.",
  packed: "Good news! Your beans have been hand-selected and packed. They are now awaiting dispatch.",
  shipped: "Your premium selection has departed our farm. Your coffee is on its way to you!",
  delivered: "The peak of coffee has arrived! Your order has been delivered. We hope you enjoy every sip.",
  returned: "We noticed your order was returned. Our team will contact you shortly to resolve this."
};

const OrderDrawer = ({ order, onClose, onUpdate, onManualOverride, onConfirmPayment, onRefund }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'pending');
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus || 'unfulfilled');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Paybill Confirm Payment UI states
  const [confirmMpesaCode, setConfirmMpesaCode] = useState(order?.paymentConfirmation?.mpesaCode || '');
  const [confirmAmount, setConfirmAmount] = useState(order?.total || '');
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Manual actions UI states
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideRef, setOverrideRef] = useState('');
  const [overrideMethod, setOverrideMethod] = useState('MPESA');

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [forceManualRefund, setForceManualRefund] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const isPaybillUnpaid = order?.paymentMethod === 'paybill' && order?.paymentStatus !== 'paid';

  // Sync state with incoming order prop modifications
  useEffect(() => {
    if (order) {
      setPaymentStatus(order.paymentStatus || 'pending');
      setFulfillmentStatus(order.fulfillmentStatus || 'unfulfilled');
      setTrackingNumber(order.trackingNumber || '');
      const prevPaid = (order.paymentConfirmations || []).reduce((s, c) => s + (Number(c.amountReceived) || 0), 0);
      const remainingBalance = Math.max(0, (order.total || 0) - prevPaid);
      setConfirmAmount(remainingBalance > 0 ? remainingBalance : order.total || '');
      setConfirmMpesaCode(order.paymentReporting?.mpesaCode || order.paymentConfirmation?.mpesaCode || '');
    }
  }, [order]);

  // Auto-suggest message when fulfillment status changes
  useEffect(() => {
    if (activeTab === 'update' && fulfillmentStatus !== order.fulfillmentStatus) {
      setMessage(SUGGESTED_MESSAGES[fulfillmentStatus] || '');
    }
  }, [fulfillmentStatus, activeTab, order.fulfillmentStatus]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    await onUpdate(order._id, { paymentStatus, fulfillmentStatus, trackingNumber, message });
    setUpdating(false);
  };

  return (
    <>
      <motion.div
        className="om-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="om-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 250 }}
      >
        {/* ── Drawer Header ── */}
        <div className="om-drawer-header">
          <div className="om-drawer-title-block">
            <span className="om-drawer-label">Order</span>
            <strong className="om-drawer-num">#{order.orderNumber}</strong>
          </div>
          <div className="om-drawer-header-badges">
            <PayBadge status={order.paymentStatus} />
            <FulfillBadge status={order.fulfillmentStatus} />
          </div>
          <button className="om-drawer-close" onClick={onClose}><FaTimes /></button>
        </div>

        {/* ── Fulfillment Pipeline ── */}
        <div className="om-drawer-pipeline">
          <FulfillPipeline status={order.fulfillmentStatus} />
        </div>

        {/* Quick Advance Bar */}
        {order.fulfillmentStatus !== 'delivered' && order.fulfillmentStatus !== 'returned' && (
          <div className="om-quick-advance-strip">
            <div className="om-advance-text">
              <span>Next Stage:</span>
              <strong>
                {order.fulfillmentStatus === 'unfulfilled' && 'Processing & Packaging'}
                {order.fulfillmentStatus === 'packed' && 'Dispatched (Shipped)'}
                {order.fulfillmentStatus === 'shipped' && 'Delivered to Customer'}
              </strong>
              {isPaybillUnpaid && (
                <span className="om-advance-disabled-badge">· (Payment required before prep)</span>
              )}
            </div>
            <button
              type="button"
              className="om-advance-btn"
              disabled={advancing || isPaybillUnpaid}
              title={isPaybillUnpaid ? 'Payment must be confirmed before order can be packed or dispatched' : ''}
              onClick={async () => {
                if (isPaybillUnpaid) return;
                setAdvancing(true);
                let nextStatus = 'packed';
                let genTracking = trackingNumber;
                if (order.fulfillmentStatus === 'unfulfilled') {
                  nextStatus = 'packed';
                } else if (order.fulfillmentStatus === 'packed') {
                  nextStatus = 'shipped';
                  if (!genTracking) {
                    genTracking = Math.floor(1000 + Math.random() * 9000).toString();
                  }
                } else if (order.fulfillmentStatus === 'shipped') {
                  nextStatus = 'delivered';
                }

                await onUpdate(order._id, {
                  fulfillmentStatus: nextStatus,
                  paymentStatus: order.paymentStatus,
                  trackingNumber: genTracking,
                  message: SUGGESTED_MESSAGES[nextStatus] || ''
                });
                setAdvancing(false);
              }}
            >
              <span>{isPaybillUnpaid ? '🔒 Paybill Unpaid' : advancing ? 'Updating…' : 'Advance Stage'}</span>
              <FaArrowRight />
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="om-drawer-tabs">
          {[
            { id: 'details', label: 'Details' },
            { id: 'update', label: 'Update Status' },
            { id: 'timeline', label: 'Activity Log' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`om-drawer-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="om-drawer-body">
          <AnimatePresence mode="wait">

            {/* ═══ DETAILS ═══ */}
            {activeTab === 'details' && (
              <motion.div key="details" className="om-tab-pane" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>

                {/* Customer */}
                <div className="om-drawer-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 className="om-section-title" style={{ margin: 0 }}><FaUser /> Customer</h4>
                    {(order.shippingAddress?.phone || order.user?.phone) && (
                      <a
                        href={`https://wa.me/${(order.shippingAddress?.phone || order.user?.phone).replace(/\D/g, '').replace(/^0/, '254')}?text=${encodeURIComponent(
                          isPaybillUnpaid
                            ? `Hi ${order.shippingAddress?.firstName || order.user?.firstName || 'Customer'}, regarding your order #${order.orderNumber} for KES ${order.total?.toLocaleString()}. Please complete payment via M-Pesa Paybill: Business No: 888888, Account No: ${order.orderNumber}, Amount: KES ${order.total?.toLocaleString()}. Reply with your M-Pesa confirmation code once sent!`
                            : `Hi ${order.shippingAddress?.firstName || order.user?.firstName || 'Customer'}, regarding your Rerendet Coffee order #${order.orderNumber}...`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="om-whatsapp-customer-btn"
                        title="Chat with customer on WhatsApp"
                      >
                        <FaWhatsapp /> WhatsApp Customer
                      </a>
                    )}
                  </div>
                  <div className="om-customer-profile">
                    <CustomerAvatar user={order.user} />
                    <div>
                      <strong>{order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest Customer'}</strong>
                      {order.user?.email && <span className="om-detail-sub"><FaEnvelope /> {order.user.email}</span>}
                    </div>
                  </div>
                  {order.shippingAddress && (
                    <div className="om-address-box">
                      <div className="om-address-row"><FaMapMarkerAlt /> {order.shippingAddress.address}, {order.shippingAddress.city}</div>
                      {order.shippingAddress.phone && <div className="om-address-row"><FaPhone /> {order.shippingAddress.phone}</div>}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="om-drawer-section">
                  <h4 className="om-section-title"><FaCoffee /> Items ({order.items?.length || 0})</h4>
                  <div className="om-items-list">
                    {order.items?.map((item, i) => (
                      <div key={i} className="om-item-row">
                        <div className="om-item-thumb">
                          <img
                            src={item.image || item.product?.images?.[0]?.url || '/placeholder-coffee.jpg'}
                            alt={item.name}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        </div>
                        <div className="om-item-info">
                          <strong>{item.name}</strong>
                          <div className="om-item-tags">
                            {item.size && <span>{item.size}</span>}
                            {item.grind && <span>{item.grind}</span>}
                          </div>
                        </div>
                        <div className="om-item-price">
                          <span className="om-item-qty">× {item.quantity}</span>
                          <strong>KES {(item.price * item.quantity)?.toLocaleString()}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                  {/* Payment Summary */}
                  <div className="om-drawer-section">
                    <h4 className="om-section-title"><FaMoneyBillWave /> Payment Summary</h4>
                    <div className="om-summary">
                      <div className="om-summary-row"><span>Subtotal</span><span>KES {order.subtotal?.toLocaleString()}</span></div>
                      <div className="om-summary-row"><span>Shipping</span><span>KES {order.shippingCost?.toLocaleString() || '0'}</span></div>
                      {order.tax > 0 && <div className="om-summary-row"><span>Tax</span><span>KES {order.tax?.toLocaleString()}</span></div>}
                      <div className="om-summary-row total"><span>Total</span><span>KES {order.total?.toLocaleString()}</span></div>
                    </div>
                    {/* Payment Indicator */}
                    <div className={`om-pay-indicator ${order.paymentStatus}`}>
                      <span className="om-pay-dot" />
                      {order.paymentStatus === 'paid' ? '✓ Verified & Paid' : `Payment ${order.paymentStatus}`} via {order.paymentMethod === 'paybill' ? 'DTB M-Pesa Paybill' : order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                    </div>

                    {/* Customer Reported Payment Notice */}
                    {order.paymentReporting?.reported && (
                      <div className="om-reported-payment-box" style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '12px', padding: '14px 16px', margin: '14px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaBell style={{ color: '#D97706', fontSize: '15px' }} />
                            <strong style={{ color: '#92400E', fontSize: '13.5px' }}>Customer Reported Payment</strong>
                          </div>
                          {order.paymentReporting.mpesaCode && (
                            <button
                              type="button"
                              onClick={() => setConfirmMpesaCode(order.paymentReporting.mpesaCode)}
                              style={{ background: '#D97706', color: '#FFF', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Prefill Code
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#78350F', lineHeight: 1.6 }}>
                          <div>Submitted Code: <strong className="mono" style={{ fontSize: '13px', color: '#1E150F' }}>{order.paymentReporting.mpesaCode || 'None provided'}</strong></div>
                          <div>Reported At: <strong>{formatDateTime(order.paymentReporting.reportedAt)}</strong></div>
                          {order.paymentReporting.customerPhone && <div>Phone: <strong>{order.paymentReporting.customerPhone}</strong></div>}
                          {order.paymentReporting.notes && <div>Customer Note: <em>"{order.paymentReporting.notes}"</em></div>}
                        </div>
                      </div>
                    )}

                    {/* Confirm Paybill Payment Form (Visible when not paid in full) */}
                    {order.paymentMethod === 'paybill' && order.paymentStatus !== 'paid' && (
                      <div className="om-confirm-paybill-box" style={{ margin: '14px 0' }}>
                        <div className="om-confirm-paybill-header">
                          <span className="om-confirm-paybill-badge">Diamond Trust Bank (DTB) Verification &bull; Paybill 516600 &bull; Acc 934558</span>
                          <h5>Verify &amp; Confirm Payment</h5>
                          <p>Check DTB Paybill (516600) statement or M-Pesa notification, enter verified transaction code &amp; actual amount received:</p>
                        </div>
                        <div className="om-form-grid-2">
                          <div className="om-form-field">
                            <label>Verified M-Pesa Code *</label>
                            <input
                              type="text"
                              placeholder="e.g. QK876XYZ20"
                              value={confirmMpesaCode}
                              onChange={e => setConfirmMpesaCode(e.target.value.toUpperCase())}
                              className="mono"
                              required
                            />
                          </div>
                          <div className="om-form-field">
                            <label>Amount Received (KES) *</label>
                            <input
                              type="number"
                              placeholder={`Total: KES ${order.total}`}
                              value={confirmAmount}
                              onChange={e => setConfirmAmount(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="om-form-actions" style={{ marginTop: '10px' }}>
                          <button
                            type="button"
                            className="om-submit-sub-btn success"
                            disabled={confirmingPayment || !confirmMpesaCode.trim() || !confirmAmount}
                            onClick={async () => {
                              setConfirmingPayment(true);
                              await onConfirmPayment(order._id, {
                                mpesaCode: confirmMpesaCode.trim().toUpperCase(),
                                amountReceived: parseFloat(confirmAmount)
                              });
                              setConfirmingPayment(false);
                            }}
                          >
                            {confirmingPayment ? 'Verifying & Generating Receipt...' : '✓ Confirm Payment & Issue Receipt'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Verified Transactions History Log */}
                    {((order.paymentConfirmations && order.paymentConfirmations.length > 0) || order.paymentConfirmation?.mpesaCode) && (
                      <div className="om-confirmed-record-box" style={{ margin: '14px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="om-confirmed-label">✓ Verified Bank Record(s)</span>
                          {order.receipt?.receiptNumber && (
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#166534', fontWeight: 700 }}>
                              Receipt: {order.receipt.receiptNumber}
                            </span>
                          )}
                        </div>

                        {Array.isArray(order.paymentConfirmations) && order.paymentConfirmations.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {order.paymentConfirmations.map((conf, cIdx) => (
                              <div key={cIdx} style={{ fontSize: '12px', padding: '6px 10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                  <span className="mono">{conf.mpesaCode}</span>
                                  <span style={{ color: '#16A34A' }}>KES {(conf.amountReceived || 0).toLocaleString()}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                  Verified {formatDateTime(conf.confirmedAt)} {conf.receiptNumber ? `(Receipt: ${conf.receiptNumber})` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <div>M-Pesa Ref: <strong className="mono">{order.paymentConfirmation.mpesaCode}</strong></div>
                            <div>Amount: <strong>KES {order.paymentConfirmation.amountReceived?.toLocaleString()}</strong></div>
                            {order.paymentConfirmation.confirmedAt && (
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                Confirmed on {formatDateTime(order.paymentConfirmation.confirmedAt)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Outstanding Balance if partially paid */}
                        {order.paymentStatus === 'partially_paid' && (
                          <div style={{ marginTop: '10px', padding: '8px 12px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#991B1B', fontWeight: 700 }}>Outstanding Balance:</span>
                            <strong style={{ fontSize: '14px', color: '#DC2626' }}>
                              KES {((order.total || 0) - (order.paymentConfirmations?.reduce((s, c) => s + (c.amountReceived || 0), 0) || order.paymentConfirmation?.amountReceived || 0)).toLocaleString()}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Official Digital PDF Receipt Download Button */}
                    {(order.paymentStatus === 'paid' || order.receipt?.receiptNumber) && (
                      <div style={{ margin: '14px 0' }}>
                        <a
                          href={`/api/admin/orders/${order._id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="om-submit-sub-btn"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: '#0F172A',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            padding: '12px 18px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '13px'
                          }}
                        >
                          <FaFileAlt /> Download Official Receipt (PDF) #{order.receipt?.receiptNumber || 'Official'}
                        </a>
                      </div>
                    )}

                    {/* Mark COD as Paid */}
                    {order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' && (
                      <div style={{ marginTop: '12px' }}>
                        <button
                          type="button"
                          className="om-action-btn-override"
                          style={{ background: '#10b981', color: '#fff' }}
                          onClick={() => onConfirmPayment(order._id, { amountReceived: order.total })}
                        >
                          ✓ Confirm COD Payment Collection (Delivered)
                        </button>
                      </div>
                    )}

                    {/* Manual Override Action Section */}
                    {order.paymentStatus === 'pending' && !showOverrideForm && (
                      <button 
                        type="button" 
                        className="om-action-btn-override" 
                        onClick={() => setShowOverrideForm(true)}
                      >
                        ⚡ Mark Paid (Manual Override)
                      </button>
                    )}

                    {showOverrideForm && (
                      <motion.div className="om-inline-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h5>⚡ Manual Payment Override</h5>
                        <div className="om-form-field">
                          <label>Override Reason</label>
                          <input 
                            type="text" 
                            value={overrideReason} 
                            onChange={e => setOverrideReason(e.target.value)} 
                            placeholder="e.g. Received direct bank transfer or Cash at roastery" 
                            required 
                          />
                        </div>
                        <div className="om-form-grid-2">
                          <div className="om-form-field">
                            <label>Receipt Ref #</label>
                            <input 
                              type="text" 
                              value={overrideRef} 
                              onChange={e => setOverrideRef(e.target.value)} 
                              placeholder="e.g. M-Pesa Code" 
                            />
                          </div>
                          <div className="om-form-field">
                            <label>Payment Channel</label>
                            <select value={overrideMethod} onChange={e => setOverrideMethod(e.target.value)}>
                              <option value="MPESA">M-Pesa Paybill</option>
                              <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                              <option value="CASH">Cash at Roastery</option>
                            </select>
                          </div>
                        </div>
                        <div className="om-form-actions">
                          <button 
                            type="button" 
                            className="om-submit-sub-btn success" 
                            disabled={submittingAction}
                            onClick={async () => {
                              if (!overrideReason.trim()) return alert('Please enter an override reason');
                              setSubmittingAction(true);
                              const ok = await onManualOverride(order._id, {
                                reason: overrideReason,
                                referenceId: overrideRef,
                                method: overrideMethod
                              });
                              setSubmittingAction(false);
                              if (ok) {
                                setShowOverrideForm(false);
                                setOverrideReason('');
                                setOverrideRef('');
                              }
                            }}
                          >
                            {submittingAction ? 'Settle...' : 'Settle Paid'}
                          </button>
                          <button type="button" className="om-cancel-sub-btn" onClick={() => setShowOverrideForm(false)}>
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Refund Action Section */}
                    {order.paymentStatus === 'paid' && !showRefundForm && (
                      <button 
                        type="button" 
                        className="om-action-btn-refund" 
                        onClick={() => setShowRefundForm(true)}
                      >
                        💸 Initiate Refund / Return Order
                      </button>
                    )}

                    {showRefundForm && (
                      <motion.div className="om-inline-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h5>💸 Initiate Refund Management</h5>
                        <div className="om-form-field">
                          <label>Reason for Refund</label>
                          <input 
                            type="text" 
                            value={refundReason} 
                            onChange={e => setRefundReason(e.target.value)} 
                            placeholder="e.g. Out of stock or customer cancelled" 
                            required 
                          />
                        </div>
                        <div className="om-form-actions">
                          <button 
                            type="button" 
                            className="om-submit-sub-btn danger" 
                            disabled={submittingAction}
                            onClick={async () => {
                              if (!refundReason.trim()) return alert('Please enter a refund reason');
                              setSubmittingAction(true);
                              const ok = await onRefund(order._id, {
                                reason: refundReason,
                                forceManual: forceManualRefund
                              });
                              setSubmittingAction(false);
                              if (ok) {
                                setShowRefundForm(false);
                                setRefundReason('');
                              }
                            }}
                          >
                            {submittingAction ? 'Processing...' : 'Authorize Refund'}
                          </button>
                          <button type="button" className="om-cancel-sub-btn" onClick={() => setShowRefundForm(false)}>
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                <div className="om-drawer-section">
                  <h4 className="om-section-title"><FaTag /> Order Info</h4>
                  <div className="om-info-row-list">
                    <div className="om-info-pair"><span>Order Date</span><strong>{formatDateTime(order.createdAt)}</strong></div>
                    <div className="om-info-pair"><span>Order ID</span><strong className="mono">#{order.orderNumber}</strong></div>
                    {order.trackingNumber && <div className="om-info-pair"><span>Tracking</span><strong className="mono">{order.trackingNumber}</strong></div>}
                    {order.notes && <div className="om-info-pair"><span>Customer Note</span><strong>{order.notes}</strong></div>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ UPDATE ═══ */}
            {activeTab === 'update' && (
              <motion.div key="update" className="om-tab-pane" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                <form onSubmit={handleUpdate} className="om-update-form">

                  <div className="om-form-field">
                    <label>Payment Status</label>
                    {order.paymentMethod === 'paybill' ? (
                      <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                        🔒 <strong>Manual Paybill Verification Active:</strong> To confirm or record payment, use the <em>Verify &amp; Confirm Payment</em> form on the <strong>Details</strong> tab. This records the verified M-Pesa transaction code and generates the official digital receipt.
                      </div>
                    ) : (
                      <div className="om-pay-options">
                        {['pending', 'paid', 'failed', 'refunded'].map(s => {
                          const cfg = PAYMENT_COLORS[s];
                          return (
                            <button
                              key={s}
                              type="button"
                              className={`om-pay-option ${paymentStatus === s ? 'active' : ''}`}
                              style={paymentStatus === s ? { borderColor: cfg.text, background: cfg.bg, color: cfg.text } : {}}
                              onClick={() => setPaymentStatus(s)}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="om-form-field">
                    <label>Fulfillment Status</label>
                    <div className="om-fulfill-options">
                      {['unfulfilled', 'packed', 'shipped', 'delivered', 'returned'].map(s => {
                        const cfg = FULFILLMENT_CONFIG[s];
                        const isDisabled = isPaybillUnpaid && ['packed', 'shipped'].includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={isDisabled}
                            className={`om-fulfill-option ${fulfillmentStatus === s ? 'active' : ''}`}
                            style={{
                              ...(fulfillmentStatus === s ? { borderColor: cfg.color, background: `${cfg.color}18`, color: cfg.color } : {}),
                              ...(isDisabled ? { opacity: 0.35, cursor: 'not-allowed' } : {})
                            }}
                            onClick={() => {
                              if (isDisabled) {
                                alert('Paybill payment must be confirmed by an admin before packing or shipping.');
                                return;
                              }
                              setFulfillmentStatus(s);
                            }}
                          >
                            {cfg.icon} {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                    {isPaybillUnpaid && (
                      <span className="om-hint" style={{ color: '#ef4444', display: 'block', marginTop: '6px' }}>
                        ⚠️ Paybill order is unpaid. Confirm payment before marking as packed or shipped.
                      </span>
                    )}
                  </div>

                  <div className="om-form-field">
                    <label>
                      Logistics ID (Tracking #)
                      <span className="om-hint"> — 4-digit code e.g. 2345</span>
                    </label>
                    <div className="om-input-with-button">
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={e => setTrackingNumber(e.target.value)}
                        placeholder="e.g., 2345"
                        required={fulfillmentStatus === 'shipped'}
                        className="mono"
                      />
                      <button
                        type="button"
                        className="om-mini-action-btn"
                        onClick={() => {
                          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                          let rand = '';
                          for (let i = 0; i < 3; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
                          setTrackingNumber(`RC${rand}`);
                        }}
                        title="Regenerate"
                      >
                        <FaSync />
                      </button>
                    </div>
                  </div>

                  <div className="om-form-field">
                    <label>Customer Notification Message <span className="om-hint">(optional — will be emailed)</span></label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="e.g., Your order has been shipped and will arrive in 2-3 days..."
                      rows={4}
                    />
                  </div>

                  <button type="submit" className="om-update-btn" disabled={updating}>
                    {updating ? 'Saving changes…' : '✓ Save Status Update'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ═══ TIMELINE ═══ */}
            {activeTab === 'timeline' && (
              <motion.div key="timeline" className="om-tab-pane" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                <div className="om-drawer-section">
                  <h4 className="om-section-title"><FaClipboardList /> Order Activity</h4>
                  {order.orderEvents?.length > 0 ? (
                    <div className="om-timeline">
                      {order.orderEvents.slice().reverse().map((event, i) => (
                        <div key={i} className="om-timeline-item">
                          <div className="om-timeline-dot" />
                          <div className="om-timeline-content">
                            <span className="om-timeline-time">{formatDateTime(event.timestamp)}</span>
                            <PayBadge status={event.status} />
                            {event.note && <p className="om-timeline-note">{event.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="om-no-events">
                      <FaBell />
                      <p>No activity history recorded yet.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default OrdersManagement;