// src/components/Admin/OrdersManagement.jsx — Premium Rewrite
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaEye, FaEdit, FaSync, FaBoxOpen,
  FaTimes, FaChevronLeft, FaChevronRight,
  FaShippingFast, FaCheckCircle, FaTimesCircle,
  FaMoneyBillWave, FaClipboardList, FaTruck,
  FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope,
  FaTag, FaClock, FaCoffee, FaBell, FaCalendar
} from 'react-icons/fa';
import './OrdersManagement.css';

// ─── Config ─────────────────────────────────────────────────────
const PAYMENT_COLORS = {
  paid: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', dot: '#10b981' },
  pending: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', dot: '#f59e0b' },
  failed: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', dot: '#ef4444' },
  refunded: { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', dot: '#6b7280' },
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
  const cfg = PAYMENT_COLORS[status] || PAYMENT_COLORS.pending;
  return (
    <span className="om-pay-badge" style={{ background: cfg.bg, color: cfg.text }}>
      <span className="om-dot" style={{ background: cfg.dot }} />
      {status}
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
    fulfillmentStatus: 'all',
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
        setStats({
          total: data.data.pagination?.total || orderList.length,
          pending: orderList.filter(o => !['shipped', 'delivered', 'returned'].includes(o.fulfillmentStatus)).length,
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

  const FULFILLMENT_PILLS = ['all', 'unfulfilled', 'packed', 'shipped', 'delivered', 'returned'];

  return (
    <div className="orders-management">
      {/* ── Stats Row ── */}
      <div className="om-stats-row">
        {[
          { icon: <FaClipboardList />, label: 'Total Orders', value: pagination.total || stats.total, color: '#3b82f6' },
          { icon: <FaClock />, label: 'Awaiting Prep', value: stats.pending, color: '#f59e0b' },
          { icon: <FaShippingFast />, label: 'Shipped (Page)', value: stats.shipped, color: '#8b5cf6' },
          { icon: <FaMoneyBillWave />, label: 'Revenue (Page)', value: `KES ${stats.revenue.toLocaleString()}`, color: '#10b981' },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="om-stat-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div className="om-stat-icon" style={{ background: `${s.color}1a`, color: s.color }}>{s.icon}</div>
            <div>
              <p className="om-stat-value">{s.value}</p>
              <p className="om-stat-label">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="om-toolbar">
        <div className="om-search-box">
          <FaSearch className="om-search-icon" />
          <input
            type="text"
            placeholder="Search order # or customer…"
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
          <option value="all">💳 All Payments</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
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
            {f === 'all' ? 'All Orders' : FULFILLMENT_CONFIG[f]?.label || f}
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
                      <strong>#{order.orderNumber}</strong>
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
                  <td><PayBadge status={order.paymentStatus} /></td>
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

const OrderDrawer = ({ order, onClose, onUpdate, onManualOverride, onRefund }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'pending');
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus || 'unfulfilled');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  // Manual actions UI states
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideRef, setOverrideRef] = useState('');
  const [overrideMethod, setOverrideMethod] = useState('MPESA');

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [forceManualRefund, setForceManualRefund] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Sync state with incoming order prop modifications
  useEffect(() => {
    if (order) {
      setPaymentStatus(order.paymentStatus || 'pending');
      setFulfillmentStatus(order.fulfillmentStatus || 'unfulfilled');
      setTrackingNumber(order.trackingNumber || '');
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

        {/* ── Tabs ── */}
        <div className="om-drawer-tabs">
          {[
            { id: 'details', label: '📦 Details' },
            { id: 'update', label: '✏️ Update Status' },
            { id: 'timeline', label: '📋 History' },
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
                  <h4 className="om-section-title"><FaUser /> Customer</h4>
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
                    <div className={`om-pay-indicator ${order.paymentStatus}`}>
                      <span className="om-pay-dot" />
                      {order.paymentStatus === 'paid' ? '✓ Payment received' : `Payment ${order.paymentStatus}`} via {order.paymentMethod}
                    </div>

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
                            placeholder="e.g. Received Paybill transfer or direct Cash" 
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
                            <label>Method</label>
                            <select value={overrideMethod} onChange={e => setOverrideMethod(e.target.value)}>
                              <option value="MPESA">M-Pesa</option>
                              <option value="CASH">Cash</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="STRIPE">Stripe</option>
                              <option value="PAYPAL">PayPal</option>
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
                        {order.paymentMethod?.toLowerCase() === 'paypal' && (
                          <div className="om-form-field checkbox-field">
                            <input 
                              type="checkbox" 
                              id="forceManual" 
                              checked={forceManualRefund} 
                              onChange={e => setForceManualRefund(e.target.checked)} 
                            />
                            <label htmlFor="forceManual">Local record only (bypass gateway API)</label>
                          </div>
                        )}
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
                  </div>

                  <div className="om-form-field">
                    <label>Fulfillment Status</label>
                    <div className="om-fulfill-options">
                      {['unfulfilled', 'packed', 'shipped', 'delivered', 'returned'].map(s => {
                        const cfg = FULFILLMENT_CONFIG[s];
                        return (
                          <button
                            key={s}
                            type="button"
                            className={`om-fulfill-option ${fulfillmentStatus === s ? 'active' : ''}`}
                            style={fulfillmentStatus === s ? { borderColor: cfg.color, background: `${cfg.color}18`, color: cfg.color } : {}}
                            onClick={() => setFulfillmentStatus(s)}
                          >
                            {cfg.icon} {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="om-form-field">
                    <label>
                      Logistics ID (Tracking #)
                      <span className="om-hint"> — Auto-generated as RC...</span>
                    </label>
                    <div className="om-input-with-button">
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={e => setTrackingNumber(e.target.value)}
                        placeholder="e.g., RC49A"
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