// components/Account/AccountDashboard.jsx
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaUser, FaShoppingBag, FaMapMarkerAlt, FaCreditCard,
  FaSignOutAlt, FaLock, FaTimes, FaHome, FaShieldAlt,
  FaLifeRing, FaChevronRight, FaBox, FaEllipsisH,
  FaCartPlus, FaTruck, FaCheckCircle, FaClock, FaSyncAlt,
  FaLeaf, FaCalendarAlt, FaCoffee
} from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './AccountDashboard.css';

// Import Tab Components
import OrdersTab from './OrdersTab';
import AddressesTab from './AddressesTab';
import WalletTab from './WalletTab';
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';
import TicketsTab from './TicketsTab';
import SubscriptionsTab from './SubscriptionsTab';
import PaymentMethodsTab from './PaymentMethodsTab';
import { getMySubscriptions } from '../../api/api';

/* ───────────── helpers ───────────── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDate = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

const ORDER_STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];

const stepIndex = (status) => {
  const s = (status || '').toLowerCase();
  const idx = ORDER_STEPS.indexOf(s);
  return idx === -1 ? 0 : idx;
};

const maskPhone = (phone) => {
  if (!phone) return 'Not linked';
  return phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 ••• $3');
};

/* ───────────── OverviewTab (Story 1) ───────────── */
const OverviewTab = ({ user, orders, onNavigate }) => {
  const { addToCart, showNotification, validateCartWithServer, openCart } = useContext(AppContext);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeSub, setActiveSub] = useState(null);

  useEffect(() => {
    getMySubscriptions().then(res => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        setSubscriptions(res.data.data);
        const active = res.data.data.find(s => s.status === 'active');
        setActiveSub(active || null);
      }
    }).catch(() => {});
  }, []);

  const unpaidOrders = orders.filter(o => o.paymentStatus !== 'paid').length;
  const activeOrder = orders.find(o =>
    ['confirmed', 'processing', 'shipped', 'pending'].includes((o.status || '').toLowerCase())
  );
  const displayPhone = user.wallet?.mpesaPhone || user.phone;

  // Build "Buy Again" items from order history (most recent unique items)
  const buyAgainItems = useMemo(() => {
    const seen = new Map();
    for (const order of orders) {
      for (const item of (order.items || order.orderItems || [])) {
        const name = item.name || item.productName || 'Specialty Coffee';
        const prodId = item.product?._id || item.product || item._id;
        if (!seen.has(name) && prodId) {
          seen.set(name, {
            _id: prodId,
            name,
            price: item.price || 0,
            image: item.image || item.productImage || item.product?.image || null,
            quantity: item.quantity || 1,
            size: item.size || 'Standard 250g'
          });
        }
      }
    }
    return Array.from(seen.values()).slice(0, 6);
  }, [orders]);

  // Handle Quick Reorder with Live Validation (Story 1 & 2)
  const handleQuickReorder = async (item) => {
    try {
      showNotification('Validating availability…', 'info');
      const validation = typeof validateCartWithServer === 'function'
        ? await validateCartWithServer([{ product: item._id, quantity: 1, size: item.size, price: item.price }])
        : { isValid: true, items: [{ product: item._id, price: item.price }] };

      const valItem = validation?.items?.[0] || { price: item.price };
      if (valItem.isOutOfStock) {
        showNotification('This roast is currently out of stock.', 'error');
        return;
      }

      addToCart({
        _id: item._id,
        name: item.name,
        price: valItem.price || item.price,
        image: item.image
      }, 1, item.size);

      showNotification(`${item.name} added to cart!`, 'success');
      if (typeof openCart === 'function') openCart();
    } catch (e) {
      showNotification('Could not add item to cart', 'error');
    }
  };

  // Loyalty tier progress
  const loyaltyPoints = user?.loyaltyPoints || 0;
  const nextTier = loyaltyPoints < 500 ? { name: 'Silver', target: 500 }
    : loyaltyPoints < 2000 ? { name: 'Gold', target: 2000 }
    : loyaltyPoints < 5000 ? { name: 'Platinum', target: 5000 }
    : { name: 'Diamond', target: 10000 };
  const tierProgress = Math.min((loyaltyPoints / nextTier.target) * 100, 100);

  return (
    <div className="noir-overview">
      {/* Greeting */}
      <div className="noir-greeting">
        <h1>{getGreeting()}, {user.firstName || 'there'}.</h1>
        <p className="noir-date">{formatDate()}</p>
      </div>

      {/* 2FA Security Alert */}
      {!user.twoFactorEnabled && (
        <div className="noir-alert-banner" onClick={() => onNavigate('security')}>
          <div className="alert-icon-box"><FaShieldAlt /></div>
          <div className="alert-content">
            <span className="alert-title">Enable Two-Factor Authentication</span>
            <span className="alert-desc">Enhance your account security with SMS or Authenticator app OTP.</span>
          </div>
          <FaChevronRight className="alert-chevron" />
        </div>
      )}

      {/* Active Subscription Countdown Banner (Story 1 & 3) */}
      {activeSub && (
        <div className="sub-overview-banner" onClick={() => onNavigate('subscriptions')}>
          <div className="sub-banner-icon"><FaCalendarAlt /></div>
          <div className="sub-banner-content">
            <span className="sub-banner-badge"><FaLeaf size={10} /> Active Coffee Subscription</span>
            <h4>Next Fresh Roast Delivery: {new Date(activeSub.nextBillingDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
            <p>Schedule: Every {activeSub.frequency.replace('-', ' ')} · 5% subscriber discount active</p>
          </div>
          <button type="button" className="sub-banner-btn">Manage <FaChevronRight size={12} /></button>
        </div>
      )}

      {/* Active Order Snapshot */}
      {activeOrder ? (
        <div className="noir-active-order" onClick={() => onNavigate('orders')}>
          <div className="active-order-top">
            <div>
              <span className="active-order-label">Most Recent Order</span>
              <h3 className="active-order-id">#{activeOrder.orderNumber || (activeOrder._id || '').slice(-8).toUpperCase()}</h3>
            </div>
            <div className="active-order-amount">
              KES {(activeOrder.total || activeOrder.totalPrice || 0).toLocaleString()}
            </div>
          </div>
          <div className="order-progress-track">
            {ORDER_STEPS.map((step, i) => {
              const current = stepIndex(activeOrder.status);
              const isDone = i <= current;
              const isActive = i === current;
              return (
                <React.Fragment key={step}>
                  {i > 0 && <div className={`progress-line ${i <= current ? 'done' : ''}`} />}
                  <div className={`progress-node ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                    <div className="node-dot">
                      {isDone ? <FaCheckCircle /> : <span className="dot-num">{i + 1}</span>}
                    </div>
                    <span className="node-label">{step}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="active-order-items-row">
            {(activeOrder.items || activeOrder.orderItems || []).slice(0, 3).map((item, i) => (
              <span key={i} className="ao-item-chip">
                {item.name || item.product?.name || 'Coffee Roast'} × {item.quantity || 1}
              </span>
            ))}
            {(activeOrder.items || activeOrder.orderItems || []).length > 3 && (
              <span className="ao-item-chip ao-more">+{(activeOrder.items || activeOrder.orderItems).length - 3} more</span>
            )}
          </div>
        </div>
      ) : (
        <div className="overview-welcome-card">
          <div className="welcome-coffee-icon"><FaCoffee /></div>
          <div>
            <h3>Welcome to Rerendet Farm!</h3>
            <p>You haven't placed any orders yet. Discover our fresh high-elevation single-origin specialty coffees.</p>
            <button
              type="button"
              className="btn-order-primary"
              onClick={() => window.location.href = '/'}
              style={{ marginTop: '0.85rem' }}
            >
              Explore Specialty Roasts
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="noir-stats-grid">
        <div className="noir-stat" onClick={() => onNavigate('orders')}>
          <span className="stat-number">{orders.length}</span>
          <span className="stat-name">Total Orders</span>
        </div>
        <div className="noir-stat" onClick={() => onNavigate('subscriptions')}>
          <span className="stat-number accent-warm">{subscriptions.filter(s => s.status === 'active').length}</span>
          <span className="stat-name">Active Subscriptions</span>
        </div>
        <div className="noir-stat" onClick={() => onNavigate('wallet')}>
          <span className="stat-number accent-green">KES {(user?.storeCredit || 0).toLocaleString()}</span>
          <span className="stat-name">Store Credit</span>
        </div>
        <div className="noir-stat" onClick={() => onNavigate('wallet')}>
          <span className="stat-number accent-gold">{(user?.loyaltyPoints || 0).toLocaleString()}</span>
          <span className="stat-name">Reward Points</span>
        </div>
      </div>

      {/* Reorder Your Favorites (Story 1 & 2) */}
      {buyAgainItems.length > 0 && (
        <div className="noir-section">
          <div className="section-header">
            <h3>Reorder Your Favorites</h3>
            <button type="button" className="link-btn" onClick={() => onNavigate('orders')}>
              All past orders <FaChevronRight />
            </button>
          </div>
          <div className="buy-again-scroll">
            {buyAgainItems.map((item, i) => (
              <div key={i} className="buy-again-card">
                <div className="ba-image">
                  {item.image
                    ? <img src={item.image} alt={item.name} />
                    : <FaCoffee size={24} />}
                </div>
                <div className="ba-info">
                  <span className="ba-name">{item.name}</span>
                  <span className="ba-price">KES {item.price.toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  className="ba-add-btn"
                  onClick={() => handleQuickReorder(item)}
                  title="Reorder item"
                >
                  <FaCartPlus />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loyalty + Wallet Row */}
      <div className="noir-bottom-grid">
        {/* Loyalty Tier */}
        <div className="noir-section-card">
          <div className="section-header">
            <h3>Loyalty Status</h3>
            <span className="tier-badge">{loyaltyPoints < 500 ? 'Bronze' : loyaltyPoints < 2000 ? 'Silver' : loyaltyPoints < 5000 ? 'Gold' : 'Platinum'}</span>
          </div>
          <div className="loyalty-progress-wrap">
            <div className="loyalty-bar-bg">
              <div className="loyalty-bar-fill" style={{ width: `${tierProgress}%` }} />
            </div>
            <div className="loyalty-meta">
              <span>{loyaltyPoints.toLocaleString()} pts</span>
              <span>{nextTier.target.toLocaleString()} pts — {nextTier.name}</span>
            </div>
          </div>
          <p className="loyalty-hint">Earn 1 reward point for every KES 100 spent. Points convert directly into checkout discounts.</p>
        </div>

        {/* Payment & Security Snapshot */}
        <div className="noir-section-card">
          <div className="section-header">
            <h3>Saved Payments</h3>
            <button type="button" className="link-btn" onClick={() => onNavigate('payments')}>Manage <FaChevronRight /></button>
          </div>
          <div className="wallet-snap">
            <div className="wallet-snap-icon">
              <FaCreditCard />
            </div>
            <div className="wallet-snap-info">
              <span className="wallet-snap-number">{maskPhone(displayPhone)}</span>
              <span className="wallet-snap-label">M-Pesa / Tokenized Cards</span>
            </div>
          </div>

          <div className="security-snap">
            <FaLock />
            <span>2FA Protection: <strong>{user.twoFactorEnabled ? 'Active' : 'Disabled'}</strong></span>
            {!user.twoFactorEnabled && (
              <button type="button" className="snap-action-btn" onClick={() => onNavigate('security')}>Enable</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────────── AccountDashboard Container ───────────── */
function AccountDashboard() {
  const {
    user,
    userType,
    logout,
    fetchUserOrders,
    orderRefreshTrigger
  } = useContext(AppContext);

  const navigate = useNavigate();

  // Block admin users from customer view
  const isAdminUser = userType === 'admin' || user?.role === 'admin' || user?.role === 'super-admin';
  useEffect(() => {
    if (user && isAdminUser) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdminUser, navigate]);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tabId) => setSearchParams({ tab: tabId });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Real Data State (Live Server Fetches - Acceptance Criteria)
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      loadOrders(true);
    }
  }, [user, activeTab, orderRefreshTrigger]);

  // Live polling every 20s
  useEffect(() => {
    let pollInterval;
    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      pollInterval = setInterval(() => loadOrders(false), 20000);
    }
    return () => clearInterval(pollInterval);
  }, [user, activeTab]);

  const loadOrders = async (showLoading = true) => {
    if (showLoading) setOrdersLoading(true);
    try {
      const payload = await fetchUserOrders(1, 20);
      if (payload?.data?.orders) setOrders(payload.data.orders);
      else if (payload?.orders) setOrders(payload.orders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      if (showLoading) setOrdersLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Complete Tabs matching all 7 user stories
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaHome /> },
    { id: 'orders', label: 'My Orders', icon: <FaShoppingBag /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <FaSyncAlt /> },
    { id: 'addresses', label: 'Addresses', icon: <FaMapMarkerAlt /> },
    { id: 'payments', label: 'Payment Methods', icon: <FaCreditCard /> },
    { id: 'wallet', label: 'Wallet & Rewards', icon: <FaLeaf /> },
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
    { id: 'security', label: 'Security & 2FA', icon: <FaLock /> },
    { id: 'tickets', label: 'Help & Support', icon: <FaLifeRing /> },
  ];

  const bottomTabs = tabs.slice(0, 4);
  const moreTabs = tabs.slice(4);

  if (!user) return null;

  return (
    <div className="noir-dashboard">
      <div className="noir-layout">

        {/* ── Desktop Sidebar ── */}
        <aside className={`noir-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="noir-sidebar-profile">
            <div className="noir-avatar">
              {user.firstName?.charAt(0) || <FaUser />}
            </div>
            <div className="noir-profile-info">
              <span className="noir-member-tag">Rerendet Coffee Member</span>
              <h3 className="noir-profile-name">{user.firstName} {user.lastName}</h3>
              <p className="noir-profile-email">{user.email}</p>
            </div>
          </div>

          <div className="noir-sidebar-divider" />

          <nav className="noir-sidebar-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`noir-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-text">{tab.label}</span>
                {activeTab === tab.id && <div className="nav-active-bar" />}
              </button>
            ))}
          </nav>

          <div className="noir-sidebar-divider" />

          <button type="button" className="noir-nav-btn noir-logout-btn" onClick={handleLogout}>
            <span className="nav-icon"><FaSignOutAlt /></span>
            <span className="nav-text">Sign out</span>
          </button>
        </aside>

        {/* Mobile sidebar backdrop */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              className="noir-sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Main Content Area ── */}
        <main className="noir-main">
          {/* Mobile top bar */}
          <div className="noir-mobile-topbar">
            <div className="mobile-top-left">
              <div className="noir-avatar-sm">
                {user.firstName?.charAt(0) || <FaUser />}
              </div>
              <div>
                <p className="mobile-greeting">{getGreeting()},</p>
                <h3 className="mobile-name">{user.firstName}</h3>
              </div>
            </div>
            <button type="button" className="noir-menu-trigger" onClick={() => setIsSidebarOpen(true)}>
              <FaUser />
            </button>
          </div>

          {/* Tab header */}
          <div className="noir-tab-header">
            <p className="tab-breadcrumb">Customer Portal</p>
            <h2 className="tab-title">
              {tabs.find(t => t.id === activeTab)?.label || 'Overview'}
            </h2>
          </div>

          {/* Tab View Router */}
          <div className="noir-content-area">
            {activeTab === 'overview' && <OverviewTab user={user} orders={orders} onNavigate={setActiveTab} />}
            {activeTab === 'orders' && <OrdersTab orders={orders} loading={ordersLoading} onRefresh={() => loadOrders(true)} />}
            {activeTab === 'subscriptions' && <SubscriptionsTab />}
            {activeTab === 'addresses' && <AddressesTab />}
            {activeTab === 'payments' && <PaymentMethodsTab />}
            {activeTab === 'wallet' && <WalletTab />}
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="noir-bottom-nav">
        {bottomTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setMoreMenuOpen(false); }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`bottom-nav-item ${moreTabs.some(t => t.id === activeTab) ? 'active' : ''}`}
          onClick={() => setMoreMenuOpen(!moreMenuOpen)}
        >
          <FaEllipsisH />
          <span>More</span>
        </button>

        {/* More menu flyout */}
        <AnimatePresence>
          {moreMenuOpen && (
            <motion.div
              className="more-menu-flyout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {moreTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`more-menu-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(tab.id); setMoreMenuOpen(false); }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
              <button type="button" className="more-menu-item logout-item" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>Sign out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Backdrop for more menu */}
      {moreMenuOpen && (
        <div className="more-menu-backdrop" onClick={() => setMoreMenuOpen(false)} />
      )}
    </div>
  );
}

export default AccountDashboard;