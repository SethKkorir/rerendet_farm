// client/src/components/Account/OverviewTab.jsx — Minimalist Quiet Luxury Member Overview (Matching Image 3)
import React, { useMemo, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaShoppingBag, FaShieldAlt, FaLock, FaClock, FaCheck, FaArrowRight,
  FaCheckCircle, FaReceipt
} from 'react-icons/fa';

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

const OverviewTab = ({ user, orders = [], onNavigate }) => {
  const navigate = useNavigate();
  const { token, showNotification } = useContext(AppContext);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  const handleConfirmDelivery = async (order) => {
    if (!window.confirm(`Has order #${order.orderNumber} arrived at your address?`)) return;
    setConfirmingDelivery(true);
    try {
      const activeToken = token || (JSON.parse(localStorage.getItem('auth') || '{}').token);
      const res = await fetch(`/api/orders/${order._id}/confirm-delivery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        showNotification?.('Package arrival confirmed! Thank you.', 'success');
        order.fulfillmentStatus = 'delivered';
        order.customerDeliveredConfirmed = true;
      } else {
        showNotification?.(data.message || 'Confirmation failed', 'error');
      }
    } catch {
      showNotification?.('Network error during confirmation', 'error');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  // Active (unfulfilled or in-transit) vs Delivered
  const { activeOrders, latestOrder } = useMemo(() => {
    const active = orders.filter(o => {
      const isCancelled = o.status === 'cancelled' || o.orderStatus === 'cancelled';
      const isDelivered = o.fulfillmentStatus === 'delivered';
      return !isCancelled && !isDelivered;
    });

    const latest = orders.length > 0 ? orders[0] : null;
    return { activeOrders: active, latestOrder: latest };
  }, [orders]);

  const fullName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Seth Kipchumba';

  // Format date helper
  const formatOrderDate = (dateStr) => {
    if (!dateStr) return 'Recent Order';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Recent Order';
    }
  };

  return (
    <div className="ord-luxury-canvas ov-overview-canvas" style={{ padding: 0 }}>
      {/* ══ Header Row (Matching Image 3) ══ */}
      <div className="rc-dash-header-block">
        <span className="rc-dash-eyebrow">— YOUR ACCOUNT</span>
        <h2 className="rc-dash-title">
          Welcome, <span className="rc-title-name">{fullName}</span>
        </h2>
        <p className="rc-dash-sub">
          A quick look at your orders, delivery details and account security.
        </p>
      </div>

      {/* ══ 2FA Security Recommendation Banner ══ */}
      {!user?.twoFactorEnabled && (
        <div className="rc-card-white rc-2fa-banner">
          <div className="rc-2fa-banner-left">
            <div className="rc-2fa-icon-wrap">
              <FaShieldAlt />
            </div>
            <div>
              <h4 className="rc-card-title">
                Protect your account with 2FA
              </h4>
              <p className="rc-card-desc">
                Turn on two-factor authentication for extra security whenever you log in.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rc-btn-gold"
            onClick={() => onNavigate('security')}
          >
            Enable 2FA ↗
          </button>
        </div>
      )}

      {/* ══ 3 Stat Cards Grid (Responsive App Metric Tiles) ══ */}
      <div className="rc-stat-grid">
        {/* TOTAL ORDERS */}
        <div
          className="rc-card-white rc-stat-card"
          onClick={() => onNavigate('orders')}
          role="button"
          tabIndex={0}
        >
          <div className="rc-stat-card-top">
            <span className="rc-stat-label">TOTAL ORDERS</span>
            <FaShoppingBag className="rc-stat-icon" />
          </div>
          <div className="rc-stat-number">
            {orders.length}
          </div>
          <div className="rc-stat-bottom">
            <span className="rc-stat-subtext">{orders.length === 1 ? '1 order placed' : `${orders.length} orders placed`}</span>
            <span className="rc-stat-arrow-link">
              View orders →
            </span>
          </div>
        </div>

        {/* ACTIVE ORDERS */}
        <div
          className="rc-card-white rc-stat-card"
          onClick={() => onNavigate('orders')}
          role="button"
          tabIndex={0}
        >
          <div className="rc-stat-card-top">
            <span className="rc-stat-label">ACTIVE ORDERS</span>
            <FaClock className="rc-stat-icon" />
          </div>
          <div className="rc-stat-number">
            {activeOrders.length}
          </div>
          <div className="rc-stat-bottom">
            <span className="rc-stat-subtext">{activeOrders.length === 0 ? 'No active orders' : `${activeOrders.length} active`}</span>
            <span className="rc-stat-arrow-link">
              Track →
            </span>
          </div>
        </div>

        {/* ACCOUNT SECURITY */}
        <div
          className="rc-card-white rc-stat-card"
          onClick={() => onNavigate('security')}
          role="button"
          tabIndex={0}
        >
          <div className="rc-stat-card-top">
            <span className="rc-stat-label">ACCOUNT SECURITY</span>
            <FaLock className="rc-stat-icon" />
          </div>
          <div className={`rc-stat-number ${user?.twoFactorEnabled ? 'security-fortified' : 'security-standard'}`}>
            {user?.twoFactorEnabled ? 'Fortified' : 'Standard'}
          </div>
          <div className="rc-stat-bottom">
            <span className="rc-stat-subtext">{user?.twoFactorEnabled ? '2FA Active' : '2FA recommended'}</span>
            <span className="rc-stat-arrow-link">
              Manage →
            </span>
          </div>
        </div>
      </div>

      {/* ══ Recent Activity Section ══ */}
      <div className="rc-activity-section">
        <div className="rc-activity-header">
          <div>
            <span className="rc-activity-eyebrow">
              RECENT ACTIVITY
            </span>
            <h3 className="rc-section-heading">
              Latest order
            </h3>
          </div>

          <button
            type="button"
            className="rc-history-link-btn"
            onClick={() => onNavigate('orders')}
          >
            Order history →
          </button>
        </div>

        {latestOrder ? (
          <div className="rc-card-white rc-latest-order-card">
            <div className="rc-order-header-row">
              <div className="rc-order-ref-meta">
                <span className="rc-order-ref-title">
                  Order #{latestOrder.orderNumber || latestOrder._id.slice(-8).toUpperCase()}
                </span>
                <span className="rc-order-sep">·</span>
                <span className="rc-order-date-text">
                  {formatOrderDate(latestOrder.createdAt)}
                </span>
              </div>

              {(() => {
                const isLatestCancelled = latestOrder.status === 'cancelled' || latestOrder.orderStatus === 'cancelled';
                return (
                  <span
                    className="rc-badge-preferred"
                    style={isLatestCancelled ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' } : undefined}
                  >
                    {isLatestCancelled ? 'Cancelled' : (latestOrder.fulfillmentStatus || latestOrder.status || 'Processing')}
                  </span>
                );
              })()}
            </div>

            <div className="rc-order-summary-row">
              <div className="rc-order-amount-col">
                <span className="rc-order-amount-label">
                  Total Amount
                </span>
                <span className="rc-order-amount-value">
                  KES {Number(latestOrder.total || latestOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>

              {(() => {
                const isLatestCancelled = latestOrder.status === 'cancelled' || latestOrder.orderStatus === 'cancelled';
                return (
                  <div className="rc-order-actions-group">
                    <button
                      type="button"
                      className="rc-btn-white"
                      onClick={() => onNavigate('orders')}
                    >
                      <FaReceipt style={{ fontSize: '0.75rem' }} /> {isLatestCancelled ? 'Order details' : 'Receipt'}
                    </button>
                    {!isLatestCancelled && latestOrder.fulfillmentStatus === 'shipped' && !latestOrder.customerDeliveredConfirmed && (
                      <button
                        type="button"
                        className="rc-btn-gold"
                        style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff' }}
                        onClick={() => handleConfirmDelivery(latestOrder)}
                        disabled={confirmingDelivery}
                      >
                        {confirmingDelivery ? 'Confirming…' : '✓ Confirm Received'}
                      </button>
                    )}
                    {!isLatestCancelled ? (
                      <button
                        type="button"
                        className="rc-btn-gold"
                        onClick={() => navigate(`/track-order/${latestOrder._id}`)}
                      >
                        Track order →
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rc-btn-gold rc-btn-dark-fallback"
                        onClick={() => onNavigate('orders')}
                      >
                        View in orders →
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="rc-card-white rc-no-orders-card">
            <div className="rc-no-orders-icon-wrap">
              <FaShoppingBag />
            </div>
            <h4 className="rc-no-orders-title">
              No orders yet
            </h4>
            <p className="rc-no-orders-desc">
              Your first order will appear here, with updates from checkout through delivery.
            </p>
          </div>
        )}
      </div>

      {/* ══ Account In Good Standing Banner ══ */}
      <div className="rc-card-white rc-standing-card">
        <div className="rc-standing-left">
          <div className="rc-standing-icon-wrap">
            <FaCheck />
          </div>
          <div>
            <h4 className="rc-standing-title">
              Your account is in good standing
            </h4>
            <p className="rc-standing-desc">
              {user?.twoFactorEnabled ? 'Two-step verification is active on your account.' : 'Add two-step verification for an extra layer of protection.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
