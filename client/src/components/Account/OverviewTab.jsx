// client/src/components/Account/OverviewTab.jsx — Minimalist Quiet Luxury Member Overview
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaShoppingBag, FaShieldAlt, FaCreditCard, FaMapMarkerAlt,
  FaArrowRight, FaHeadset, FaComments, FaClock, FaCheckCircle,
  FaReceipt, FaLock
} from 'react-icons/fa';
import { getWhatsAppLink } from '../../utils/whatsappHelper';

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

/* ── Mask Phone Helper ── */
const maskPhone = (phone) => {
  if (!phone) return null;
  const str = String(phone).trim();
  if (str.length < 8) return str;
  return str.slice(0, 3) + ' ••• ••• ' + str.slice(-3);
};

const OverviewTab = ({ user, orders = [], onNavigate, publicSettings }) => {
  const navigate = useNavigate();
  const whatsAppUrl = getWhatsAppLink(publicSettings);

  // Active (unfulfilled or in-transit) vs Delivered
  const { activeOrders, latestOrder, unpaidCount } = useMemo(() => {
    const active = orders.filter(o => {
      const isCancelled = o.status === 'cancelled' || o.orderStatus === 'cancelled';
      const isDelivered = o.fulfillmentStatus === 'delivered';
      return !isCancelled && !isDelivered;
    });

    const unpaid = orders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'cancelled').length;
    const latest = orders.length > 0 ? orders[0] : null;

    return { activeOrders: active, latestOrder: latest, unpaidCount: unpaid };
  }, [orders]);

  // Shipping destination summary
  const shipping = user?.shippingInfo;
  const hasShippingAddress = Boolean(
    shipping?.address || shipping?.city || shipping?.county || shipping?.town
  );

  // M-Pesa phone
  const mpesaPhone = user?.wallet?.mpesaPhone || user?.phone;

  // Format date
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
    <div className="ord-luxury-canvas ov-overview-canvas">
      {/* ══ Editorial Header ══ */}
      <div className="ord-luxury-header">
        <span className="ord-luxury-tag">MY ACCOUNT</span>
        <h2 className="ord-luxury-title">
          Welcome, {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Valued Customer'}
        </h2>
        <p className="ord-luxury-sub">
          Manage your orders, delivery addresses, and account security.
        </p>
        <div className="ord-luxury-h-line" />
      </div>

      {/* ══ 2FA Security Recommendation Strip ══ */}
      {!user?.twoFactorEnabled && (
        <div className="ov-security-banner">
          <div className="ov-sec-left">
            <div className="ov-sec-icon-circle">
              <FaShieldAlt />
            </div>
            <div className="ov-sec-text">
              <h4 className="ov-sec-title">Protect Your Account with 2FA</h4>
              <p className="ov-sec-desc">
                Turn on two-factor authentication for extra security whenever you log in.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ord-action-btn outline ov-sec-btn"
            onClick={() => onNavigate('security')}
          >
            <span>Enable 2FA</span>
            <FaArrowRight style={{ fontSize: '0.72rem' }} />
          </button>
        </div>
      )}

      {/* ══ 3 Minimalist Metric Tiles ══ */}
      <div className="ov-metrics-row">
        {/* Metric 1: Total Orders */}
        <div className="ov-metric-card" onClick={() => onNavigate('orders')}>
          <div className="ov-metric-top">
            <span className="ov-metric-label">TOTAL ORDERS</span>
            <span className="ov-metric-icon">
              <FaShoppingBag />
            </span>
          </div>
          <div className="ov-metric-val">{orders.length}</div>
          <div className="ov-metric-foot">
            <span>{orders.length === 1 ? '1 order placed' : `${orders.length} orders placed`}</span>
            <span className="ov-metric-link">
              View <FaArrowRight style={{ fontSize: '0.65rem' }} />
            </span>
          </div>
        </div>

        {/* Metric 2: Active Orders */}
        <div className="ov-metric-card" onClick={() => onNavigate('orders')}>
          <div className="ov-metric-top">
            <span className="ov-metric-label">ACTIVE ORDERS</span>
            <span className="ov-metric-icon">
              <FaClock />
            </span>
          </div>
          <div className="ov-metric-val">{activeOrders.length}</div>
          <div className="ov-metric-foot">
            <span>{activeOrders.length === 0 ? 'No active orders' : `${activeOrders.length} in progress`}</span>
            <span className="ov-metric-link">
              Track <FaArrowRight style={{ fontSize: '0.65rem' }} />
            </span>
          </div>
        </div>

        {/* Metric 3: Account Security */}
        <div className="ov-metric-card" onClick={() => onNavigate('security')}>
          <div className="ov-metric-top">
            <span className="ov-metric-label">ACCOUNT SECURITY</span>
            <span className="ov-metric-icon">
              <FaLock />
            </span>
          </div>
          <div className={`ov-metric-val ${user?.twoFactorEnabled ? 'status-fortified' : 'status-standard'}`}>
            {user?.twoFactorEnabled ? '2FA Active' : 'Standard'}
          </div>
          <div className="ov-metric-foot">
            <span>{user?.twoFactorEnabled ? '2FA Protected' : '2FA Recommended'}</span>
            <span className="ov-metric-link">
              Manage <FaArrowRight style={{ fontSize: '0.65rem' }} />
            </span>
          </div>
        </div>
      </div>

      {/* ══ Latest Order Spotlight ══ */}
      <div className="ov-spotlight-section">
        <div className="ov-section-header">
          <div>
            <span className="ov-section-eyebrow">RECENT ACTIVITY</span>
            <h3 className="ov-section-title">Latest Order</h3>
          </div>
          {orders.length > 0 && (
            <button
              type="button"
              className="ov-section-link-btn"
              onClick={() => onNavigate('orders')}
            >
              <span>View All Orders ({orders.length})</span>
              <FaArrowRight style={{ fontSize: '0.72rem' }} />
            </button>
          )}
        </div>

        {latestOrder ? (
          <div className="ord-clean-card ov-spotlight-card">
            {/* Top Meta Strip */}
            <div className="ord-clean-top">
              <div className="ord-clean-meta-left">
                <span className="ord-clean-number">
                  Order #{latestOrder.orderNumber || latestOrder._id.slice(-8).toUpperCase()}
                </span>
                <span className="ord-clean-dot-sep" />
                <span className="ord-clean-date">
                  {formatOrderDate(latestOrder.createdAt)}
                </span>
              </div>

              <div className="ord-clean-badges-right">
                {(() => {
                  const isCancelled = latestOrder.status === 'cancelled' || latestOrder.orderStatus === 'cancelled';
                  const isDelivered = latestOrder.fulfillmentStatus === 'delivered';
                  const isShipped = latestOrder.fulfillmentStatus === 'shipped';
                  const statusClass = isCancelled ? 'cancelled' : isDelivered ? 'delivered' : isShipped ? 'shipped' : 'processing';
                  const statusLabel = isCancelled ? 'Cancelled' : isDelivered ? 'Delivered' : isShipped ? 'In Transit' : 'Preparing Order';
                  return (
                    <span className={`ord-clean-status-pill ${statusClass}`}>
                      {statusLabel}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="ord-clean-divider" />

            {/* Items Preview */}
            <div className="ord-clean-items">
              {(latestOrder.items || []).slice(0, 2).map((item, idx) => (
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
                    KES {Number(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
              {(latestOrder.items || []).length > 2 && (
                <div className="ov-more-items-note">
                  +{latestOrder.items.length - 2} more item(s)
                </div>
              )}
            </div>

            <div className="ord-clean-divider" />

            {/* Total and Quick CTAs */}
            <div className="ord-clean-bottom">
              <div className="ord-clean-total-wrap">
                <span className="ord-clean-total-label">Order Total</span>
                <span className="ord-clean-total-val">
                  KES {Number(latestOrder.total || latestOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="ord-clean-actions">
                <button
                  type="button"
                  className="ord-action-btn outline"
                  onClick={() => onNavigate('orders')}
                >
                  <FaReceipt /> View Details
                </button>

                <button
                  type="button"
                  className="ord-action-btn solid"
                  onClick={() => navigate(`/order-tracking/${latestOrder._id}`)}
                >
                  Track Order <FaArrowRight style={{ fontSize: '0.7rem' }} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="ord-clean-card ov-empty-spotlight">
            <div className="ov-empty-icon-wrap">
              <FaShoppingBag />
            </div>
            <h4 className="ov-empty-title">No Orders Yet</h4>
            <p className="ov-empty-desc">
              You haven't placed any orders yet. Discover our fresh roasted coffee to get started.
            </p>
            <button
              type="button"
              className="ord-action-btn solid ov-empty-btn"
              onClick={() => navigate('/#coffee-shop')}
            >
              <span>Shop Fresh Coffee</span>
              <FaArrowRight style={{ fontSize: '0.72rem' }} />
            </button>
          </div>
        )}
      </div>

      {/* ══ Split Grid: Shipping & M-Pesa ══ */}
      <div className="ov-split-grid">
        {/* Destination Card */}
        <div className="ord-clean-card ov-info-card">
          <div className="ov-info-card-top">
            <div className="ov-info-icon-badge">
              <FaMapMarkerAlt />
            </div>
            <div className="ov-info-meta">
              <span className="ov-info-eyebrow">SHIPPING</span>
              <h4 className="ov-info-title">Delivery Address</h4>
            </div>
          </div>

          <div className="ord-clean-divider" />

          <div className="ov-info-body">
            {hasShippingAddress ? (
              <div className="ov-address-content">
                <p className="ov-address-line primary">
                  {shipping?.address || 'Street address on file'}
                </p>
                <p className="ov-address-line sub">
                  {[shipping?.town, shipping?.county, shipping?.country || 'Kenya'].filter(Boolean).join(', ')}
                </p>
                {shipping?.zip && (
                  <p className="ov-address-line zip">Postal Code: {shipping.zip}</p>
                )}
                {user?.phone && (
                  <p className="ov-address-line phone">Phone: {user.phone}</p>
                )}
              </div>
            ) : (
              <div className="ov-address-empty">
                <p className="ov-empty-inline-text">
                  No shipping address saved yet.
                </p>
                <p className="ov-empty-inline-sub">
                  Add an address for faster checkout.
                </p>
              </div>
            )}
          </div>

          <div className="ov-info-footer">
            <button
              type="button"
              className="ov-card-link-btn"
              onClick={() => onNavigate('addresses')}
            >
              <span>{hasShippingAddress ? 'Edit Address' : 'Add Shipping Address'}</span>
              <FaArrowRight style={{ fontSize: '0.7rem' }} />
            </button>
          </div>
        </div>

        {/* M-Pesa Card */}
        <div className="ord-clean-card ov-info-card">
          <div className="ov-info-card-top">
            <div className="ov-info-icon-badge">
              <FaCreditCard />
            </div>
            <div className="ov-info-meta">
              <span className="ov-info-eyebrow">PAYMENT</span>
              <h4 className="ov-info-title">Lipa na M-Pesa</h4>
            </div>
          </div>

          <div className="ord-clean-divider" />

          <div className="ov-info-body">
            <div className="ov-mpesa-status-box">
              <div className="ov-mpesa-row">
                <span className="ov-mpesa-badge">DEFAULT PAYMENT</span>
                <span className="ov-mpesa-verified">
                  <FaCheckCircle /> 256-Bit SSL
                </span>
              </div>
              <div className="ov-mpesa-number">
                {maskPhone(mpesaPhone) || '07•• ••• •••'}
              </div>
              <p className="ov-mpesa-desc">
                M-Pesa payment prompt will be sent directly to your phone at checkout.
              </p>
            </div>
          </div>

          <div className="ov-info-footer">
            <button
              type="button"
              className="ov-card-link-btn"
              onClick={() => onNavigate('wallet')}
            >
              <span>Manage Payment</span>
              <FaArrowRight style={{ fontSize: '0.7rem' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ══ Customer Support Strip ══ */}
      <div className="ov-concierge-strip">
        <div className="ov-concierge-left">
          <div className="ov-concierge-icon-circle">
            <FaHeadset />
          </div>
          <div className="ov-concierge-text">
            <span className="ov-concierge-tag">SUPPORT</span>
            <h4 className="ov-concierge-title">Need Help with Your Order?</h4>
            <p className="ov-concierge-desc">
              Have questions about your order, our coffee, or your account? Reach out to our team anytime.
            </p>
          </div>
        </div>

        <div className="ov-concierge-actions">
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ord-action-btn solid ov-concierge-wa-btn"
          >
            <FaComments />
            <span>Chat on WhatsApp</span>
          </a>

          <button
            type="button"
            className="ord-action-btn outline"
            onClick={() => onNavigate('tickets')}
          >
            <span>Help & Support</span>
          </button>
        </div>
      </div>

      {/* ══ Security & SSL Footer ══ */}
      <div className="ov-security-footer">
        <div className="ov-sec-foot-item">
          <FaLock className="ov-sec-foot-icon" />
          <span>Secure SSL Connection</span>
        </div>
        <span className="ov-sec-foot-dot" />
        <div className="ov-sec-foot-item">
          <FaClock className="ov-sec-foot-icon" />
          <span>Last Sign-In: {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-GB') : 'Active session'}</span>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
