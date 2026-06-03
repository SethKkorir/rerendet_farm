import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaUser, FaShoppingBag, FaMapMarkerAlt, FaCreditCard,
  FaSignOutAlt, FaLock, FaTimes, FaHome, FaShieldAlt,
  FaLifeRing, FaChevronRight, FaBox, FaEllipsisH,
  FaCartPlus, FaTruck, FaCheckCircle, FaClock
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

/* ───────────── OverviewTab ───────────── */
const OverviewTab = ({ user, orders, onNavigate }) => {
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
        const name = item.name || item.productName || 'Coffee';
        if (!seen.has(name)) {
          seen.set(name, {
            name,
            price: item.price || 0,
            image: item.image || item.productImage || null,
            quantity: item.quantity || 1,
          });
        }
      }
    }
    return Array.from(seen.values()).slice(0, 6);
  }, [orders]);

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

      {/* 2FA Alert */}
      {!user.twoFactorEnabled && (
        <div className="noir-alert-banner" onClick={() => onNavigate('security')}>
          <div className="alert-icon-box"><FaShieldAlt /></div>
          <div className="alert-content">
            <span className="alert-title">Enable Two-Factor Authentication</span>
            <span className="alert-desc">Your account is protected by password only.</span>
          </div>
          <FaChevronRight className="alert-chevron" />
        </div>
      )}

      {/* Running Low Streak Banner */}
      {(() => {
        if (!user.lastReorderDate) return null;
        const avg = user.reorderAverageDays || 30;
        const lastDate = new Date(user.lastReorderDate);
        const nextDeadline = new Date(lastDate.getTime() + avg * 24 * 60 * 60 * 1000);
        const diffMs = nextDeadline - new Date();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        
        if (daysLeft <= 2 && user.reorderStreak > 0) {
          return (
            <div className="noir-alert-banner running-low-banner" style={{ background: '#3b2520', borderColor: '#5c3e35', color: '#fff', marginBottom: '20px' }} onClick={() => window.location.href = '/products'}>
              <div className="alert-icon-box" style={{ background: '#5c3e35', color: '#f5efe6' }}>☕</div>
              <div className="alert-content">
                <span className="alert-title" style={{ color: '#f5efe6', fontWeight: 'bold' }}>Running low on coffee?</span>
                <span className="alert-desc" style={{ color: '#dcd3c9' }}>
                  Place your next order in the next {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to preserve your <strong>{user.reorderStreak}-order reorder streak</strong>!
                </span>
              </div>
              <FaChevronRight className="alert-chevron" style={{ color: '#f5efe6' }} />
            </div>
          );
        }
        return null;
      })()}

      {/* Streak Milestone Progress Card */}
      {user.reorderStreak > 0 && user.lastReorderDate && (
        <div className="noir-section-card streak-card" style={{ marginBottom: '20px', padding: '15px' }}>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔥 Streak: {user.reorderStreak} {user.reorderStreak === 1 ? 'Order' : 'Orders'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#a08a75' }}>
              Avg interval: {user.reorderAverageDays || 30} days
            </span>
          </div>
          {(() => {
            const avg = user.reorderAverageDays || 30;
            const lastDate = new Date(user.lastReorderDate);
            const nextDeadline = new Date(lastDate.getTime() + avg * 24 * 60 * 60 * 1000);
            const diffMs = nextDeadline - new Date();
            const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            const progressPercent = Math.max(0, Math.min(100, (daysLeft / avg) * 100));
            return (
              <div style={{ marginTop: '10px' }}>
                <div style={{ background: '#25211e', borderRadius: '4px', height: '8px', overflow: 'hidden', margin: '5px 0' }}>
                  <div style={{ background: '#d4af37', height: '100%', width: `${progressPercent}%`, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#a08a75' }}>
                  <span>Last ordered: {new Date(user.lastReorderDate).toLocaleDateString()}</span>
                  <span>{daysLeft} days left to save streak</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Active Order Snapshot */}
      {activeOrder && (
        <div className="noir-active-order" onClick={() => onNavigate('orders')}>
          <div className="active-order-top">
            <div>
              <span className="active-order-label">Active Order</span>
              <h3 className="active-order-id">#{(activeOrder.orderNumber || activeOrder._id || '').toString().slice(-8).toUpperCase()}</h3>
            </div>
            <div className="active-order-amount">
              KES {(activeOrder.totalPrice || activeOrder.totalAmount || 0).toLocaleString()}
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
                {item.name || item.productName} × {item.quantity || 1}
              </span>
            ))}
            {(activeOrder.items || activeOrder.orderItems || []).length > 3 && (
              <span className="ao-item-chip ao-more">+{(activeOrder.items || activeOrder.orderItems).length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="noir-stats-grid">
        <div className="noir-stat" onClick={() => onNavigate('orders')}>
          <span className="stat-number">{orders.length}</span>
          <span className="stat-name">Total Orders</span>
        </div>
        <div className="noir-stat">
          <span className="stat-number">{unpaidOrders}</span>
          <span className="stat-name">Pending</span>
        </div>
        <div className="noir-stat">
          <span className="stat-number accent-green">KES {(user?.storeCredit || 0).toLocaleString()}</span>
          <span className="stat-name">Store Credit</span>
        </div>
        <div className="noir-stat" onClick={() => onNavigate('wallet')}>
          <span className="stat-number accent-warm">{(user?.loyaltyPoints || 0).toLocaleString()}</span>
          <span className="stat-name">Reward Points</span>
        </div>
      </div>

      {/* Buy Again */}
      {buyAgainItems.length > 0 && (
        <div className="noir-section">
          <div className="section-header">
            <h3>Buy Again</h3>
            <button className="link-btn" onClick={() => onNavigate('orders')}>View all orders <FaChevronRight /></button>
          </div>
          <div className="buy-again-scroll">
            {buyAgainItems.map((item, i) => (
              <div key={i} className="buy-again-card">
                <div className="ba-image">
                  {item.image
                    ? <img src={item.image} alt={item.name} />
                    : <FaBox />}
                </div>
                <div className="ba-info">
                  <span className="ba-name">{item.name}</span>
                  <span className="ba-price">KES {item.price.toLocaleString()}</span>
                </div>
                <button className="ba-add-btn" title="Add to cart">
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
            <h3>Loyalty Tier</h3>
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
          <p className="loyalty-hint">Earn points with every purchase. Redeem for discounts.</p>
        </div>

        {/* Wallet Snapshot */}
        <div className="noir-section-card">
          <div className="section-header">
            <h3>Payment Method</h3>
            <button className="link-btn" onClick={() => onNavigate('wallet')}>Manage <FaChevronRight /></button>
          </div>
          <div className="wallet-snap">
            <div className="wallet-snap-icon">
              <img src="/M-PESA_LOGO-01.svg.png" alt="M-Pesa" />
            </div>
            <div className="wallet-snap-info">
              <span className="wallet-snap-number">{maskPhone(displayPhone)}</span>
              <span className="wallet-snap-label">Primary • M-Pesa</span>
            </div>
          </div>

          {/* Security snapshot */}
          <div className="security-snap">
            <FaLock />
            <span>2FA: <strong>{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</strong></span>
            {!user.twoFactorEnabled && (
              <button className="snap-action-btn" onClick={() => onNavigate('security')}>Enable</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────────── AccountDashboard ───────────── */
function AccountDashboard() {
  const {
    user,
    userType,
    logout,
    fetchUserOrders,
    orderRefreshTrigger
  } = useContext(AppContext);

  const navigate = useNavigate();

  // Block admin users
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

  // Real Data State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      loadOrders(true);
    }
  }, [user, activeTab, orderRefreshTrigger]);

  // LIVE POLLING
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
      const payload = await fetchUserOrders(1, 15);
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

  // Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaHome /> },
    { id: 'orders', label: 'My Orders', icon: <FaShoppingBag /> },
    { id: 'addresses', label: 'Addresses', icon: <FaMapMarkerAlt /> },
    { id: 'wallet', label: 'Wallet', icon: <FaCreditCard /> },
    { id: 'tickets', label: 'Support', icon: <FaLifeRing /> },
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
    { id: 'security', label: 'Security', icon: <FaLock /> },
  ];

  // Bottom nav: first 4 + "More" trigger
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
              <span className="noir-member-tag">Rerendet Member</span>
              <h3 className="noir-profile-name">{user.firstName} {user.lastName}</h3>
              <p className="noir-profile-email">{user.email}</p>
            </div>
          </div>

          <div className="noir-sidebar-divider" />

          <nav className="noir-sidebar-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
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

          <button className="noir-nav-btn noir-logout-btn" onClick={handleLogout}>
            <span className="nav-icon"><FaSignOutAlt /></span>
            <span className="nav-text">Log out</span>
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

        {/* ── Main Content ── */}
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
            <button className="noir-menu-trigger" onClick={() => setIsSidebarOpen(true)}>
              <FaUser />
            </button>
          </div>

          {/* Tab header */}
          <div className="noir-tab-header">
            <p className="tab-breadcrumb">Dashboard</p>
            <h2 className="tab-title">
              {tabs.find(t => t.id === activeTab)?.label || 'Overview'}
            </h2>
          </div>

          {/* Tab Content */}
          <div className="noir-content-area">
            {activeTab === 'overview' && <OverviewTab user={user} orders={orders} onNavigate={setActiveTab} />}
            {activeTab === 'orders' && <OrdersTab orders={orders} loading={ordersLoading} onRefresh={() => loadOrders(true)} />}
            {activeTab === 'addresses' && <AddressesTab />}
            {activeTab === 'wallet' && <WalletTab />}
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="noir-bottom-nav">
        {bottomTabs.map(tab => (
          <button
            key={tab.id}
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setMoreMenuOpen(false); }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
        <button
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
                  className={`more-menu-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(tab.id); setMoreMenuOpen(false); }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
              <button className="more-menu-item logout-item" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>Log out</span>
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