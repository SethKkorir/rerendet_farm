// client/src/components/Account/OverviewTab.jsx — Minimalist Quiet Luxury Member Overview (Matching Image 3)
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="rc-dash-eyebrow">— YOUR ACCOUNT</span>
        <h2 className="rc-dash-title">
          Welcome, {fullName}
        </h2>
        <p className="rc-dash-sub">
          A quick look at your orders, delivery details and account security.
        </p>
      </div>

      {/* ══ 2FA Security Recommendation Banner (Matching Image 3) ══ */}
      {!user?.twoFactorEnabled && (
        <div className="rc-card-white" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.75rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(202, 160, 88, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B58838',
              fontSize: '0.95rem',
              flexShrink: 0
            }}>
              <FaShieldAlt />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E140E', margin: '0 0 2px 0' }}>
                Protect your account with 2FA
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#665548', margin: 0 }}>
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

      {/* ══ 3 Stat Cards Grid (Matching Image 3) ══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        {/* TOTAL ORDERS */}
        <div
          className="rc-card-white"
          onClick={() => onNavigate('orders')}
          style={{ cursor: 'pointer', padding: '1.5rem 1.75rem', marginBottom: 0 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E7D70' }}>
              TOTAL ORDERS
            </span>
            <FaShoppingBag style={{ color: '#8E7D70', fontSize: '0.9rem' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)', fontSize: '2.4rem', fontWeight: 700, color: '#1E140E', lineHeight: 1.1, margin: '0.25rem 0 0.85rem' }}>
            {orders.length}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#665548' }}>
            <span>{orders.length === 1 ? '1 order placed' : `${orders.length} orders placed`}</span>
            <span style={{ color: '#1E140E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              View orders →
            </span>
          </div>
        </div>

        {/* ACTIVE ORDERS */}
        <div
          className="rc-card-white"
          onClick={() => onNavigate('orders')}
          style={{ cursor: 'pointer', padding: '1.5rem 1.75rem', marginBottom: 0 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E7D70' }}>
              ACTIVE ORDERS
            </span>
            <FaClock style={{ color: '#8E7D70', fontSize: '0.9rem' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)', fontSize: '2.4rem', fontWeight: 700, color: '#1E140E', lineHeight: 1.1, margin: '0.25rem 0 0.85rem' }}>
            {activeOrders.length}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#665548' }}>
            <span>{activeOrders.length === 0 ? 'No active orders' : `${activeOrders.length} active`}</span>
            <span style={{ color: '#1E140E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Track →
            </span>
          </div>
        </div>

        {/* ACCOUNT SECURITY */}
        <div
          className="rc-card-white"
          onClick={() => onNavigate('security')}
          style={{ cursor: 'pointer', padding: '1.5rem 1.75rem', marginBottom: 0 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E7D70' }}>
              ACCOUNT SECURITY
            </span>
            <FaLock style={{ color: '#8E7D70', fontSize: '0.9rem' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)', fontSize: '2.4rem', fontWeight: 700, color: user?.twoFactorEnabled ? '#2e7d32' : '#B58838', lineHeight: 1.1, margin: '0.25rem 0 0.85rem' }}>
            {user?.twoFactorEnabled ? 'Fortified' : 'Standard'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#665548' }}>
            <span>{user?.twoFactorEnabled ? '2FA Active' : '2FA recommended'}</span>
            <span style={{ color: '#1E140E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Manage →
            </span>
          </div>
        </div>
      </div>

      {/* ══ Recent Activity Section (Matching Image 3) ══ */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '2px' }}>
              RECENT ACTIVITY
            </span>
            <h3 style={{
              fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#1E140E',
              margin: 0
            }}>
              Latest order
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('orders')}
            style={{
              background: 'none',
              border: 'none',
              color: '#1E140E',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Order history →
          </button>
        </div>

        {latestOrder ? (
          <div className="rc-card-white" style={{ padding: '1.75rem 2rem', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E140E' }}>
                  Order #{latestOrder.orderNumber || latestOrder._id.slice(-8).toUpperCase()}
                </span>
                <span style={{ margin: '0 8px', color: '#D4C9BC' }}>·</span>
                <span style={{ fontSize: '0.84rem', color: '#8E7D70' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #F2ECE3' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#8E7D70', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                  Total Amount
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E140E' }}>
                  KES {Number(latestOrder.total || latestOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>

              {(() => {
                const isLatestCancelled = latestOrder.status === 'cancelled' || latestOrder.orderStatus === 'cancelled';
                return (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="rc-btn-white"
                      onClick={() => onNavigate('orders')}
                    >
                      <FaReceipt style={{ fontSize: '0.75rem' }} /> {isLatestCancelled ? 'Order details' : 'Receipt'}
                    </button>
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
                        className="rc-btn-gold"
                        style={{ background: '#1E140E', color: '#FFFFFF' }}
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
          <div className="rc-card-white" style={{ textAlign: 'center', padding: '3.5rem 2rem', marginBottom: 0 }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FAF6EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#CAA058',
              fontSize: '1.4rem'
            }}>
              <FaShoppingBag />
            </div>
            <h4 style={{
              fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)',
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#1E140E',
              margin: '0 0 0.5rem'
            }}>
              No orders yet
            </h4>
            <p style={{ color: '#665548', fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto' }}>
              Your first order will appear here, with updates from checkout through delivery.
            </p>
          </div>
        )}
      </div>

      {/* ══ Account In Good Standing Banner (Matching Image 3) ══ */}
      <div className="rc-card-white" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.75rem', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
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
            <FaCheck />
          </div>
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1E140E', margin: '0 0 2px 0' }}>
              Your account is in good standing
            </h4>
            <p style={{ fontSize: '0.82rem', color: '#665548', margin: 0 }}>
              Add two-step verification for an extra layer of protection.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 600, color: '#B58838' }}>
          <span>✨</span>
          <span>{user?.twoFactorEnabled ? 'Fortified' : 'Standard'}</span>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
