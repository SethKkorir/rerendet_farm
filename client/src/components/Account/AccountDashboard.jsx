import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaUser, FaShoppingBag, FaMapMarkerAlt, FaCreditCard,
  FaSignOutAlt, FaLock, FaTimes, FaHome, FaShieldAlt, FaHistory, FaCheckCircle, FaLifeRing
} from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './AccountDashboard.css';

// Import Tab Components
import OrdersTab from './OrdersTab';
import AddressesTab from './AddressesTab';
import WalletTab from './WalletTab';
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';
import TicketsTab from './TicketsTab';

// Internal Overview Tab
const OverviewTab = ({ user, orders, onNavigate }) => {
  const unpaidOrders = orders.filter(o => o.paymentStatus !== 'paid').length;

  return (
    <div className="overview-tab">
      {!user.twoFactorEnabled && (
        <div className="security-unhealthy-banner">
          <div className="unhealthy-icon-box">
            <FaShieldAlt />
          </div>
          <div className="unhealthy-content">
            <h4 className="unhealthy-title">Security Recommendation</h4>
            <p className="unhealthy-desc">Your account is currently protected by password only. Enable Two-Factor Authentication (2FA) for an extra layer of defense.</p>
          </div>
          <button className="enable-2fa-cta" onClick={() => onNavigate('security')}>
            Secure Account
          </button>
        </div>
      )}

      <div className="overview-stats-grid">
        <div className="overview-stat-card">
          <div className="stat-icon-wrap"><FaShoppingBag /></div>
          <div className="stat-content">
            <span className="stat-label">Acquisitions</span>
            <span className="stat-value">{orders.length}</span>
          </div>
        </div>
        <div className="overview-stat-card">
          <div className="stat-icon-wrap"><FaCreditCard /></div>
          <div className="stat-content">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{unpaidOrders}</span>
          </div>
        </div>
        <div className={`overview-stat-card ${user.twoFactorEnabled ? 'security-card' : 'at-risk-card'}`}>
          <div className="stat-icon-wrap"><FaShieldAlt /></div>
          <div className="stat-content">
            <span className="stat-label">Account Health</span>
            <span className={`stat-value ${user.twoFactorEnabled ? 'text-success' : 'text-warning'}`}>
              {user.twoFactorEnabled ? 'Secure' : 'At Risk'}
            </span>
          </div>
        </div>
      </div>

      <div className="overview-sections-grid">
        <div className="overview-section-main">
          <h3>Security Overview</h3>
          <div className="security-health-banner">
            <div className="health-info">
              <FaCheckCircle className="text-success" />
              <div>
                <p className="health-title">SSL Encryption Active</p>
                <p className="health-desc">Your connection to Rerendet is end-to-end encrypted.</p>
              </div>
            </div>
          </div>
          <div className="security-features-list">
            <div className="sec-feature-item">
              <FaLock />
              <span>Two-Factor Authentication: <strong>{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</strong></span>
            </div>
            <div className="sec-feature-item">
              <FaHistory />
              <span>Last Login: <strong>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Just now'}</strong></span>
            </div>
          </div>
        </div>

        <div className="overview-section-side">
          <h3>Wallet</h3>
          <div className="wallet-mini-card">
            <div className="mpesa-brand">
              <img src="/M-PESA_LOGO-01.svg.png" alt="M-Pesa" style={{ height: '20px' }} />
            </div>
            {user.wallet?.mpesaPhone || user.phone ? (
              <p className="wallet-number">{user.wallet?.mpesaPhone || user.phone}</p>
            ) : (
              <p className="wallet-number-empty">No number linked</p>
            )}
            <span className="wallet-status">Primary Method</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function AccountDashboard() {
  const {
    user,
    userType,
    logout,
    fetchUserOrders,
    orderRefreshTrigger
  } = useContext(AppContext);

  const navigate = useNavigate();

  // Block admin users from accessing customer dashboard
  const isAdminUser = userType === 'admin' || user?.role === 'admin' || user?.role === 'super-admin';
  useEffect(() => {
    if (user && isAdminUser) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdminUser, navigate]);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Real Data State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Load orders for Overview and Orders tab
  useEffect(() => {
    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      loadOrders(true);
    }
  }, [user, activeTab, orderRefreshTrigger]);

  // LIVE POLLING: Refresh order list every 20 seconds
  useEffect(() => {
    let pollInterval;
    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      pollInterval = setInterval(() => {
        loadOrders(false);
      }, 20000);
    }
    return () => clearInterval(pollInterval);
  }, [user, activeTab]);

  const loadOrders = async (showLoading = true) => {
    if (showLoading) setOrdersLoading(true);
    try {
      const payload = await fetchUserOrders(1, 15);
      if (payload?.data?.orders) {
        setOrders(payload.data.orders);
      } else if (payload?.orders) {
        setOrders(payload.orders);
      }
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

  // Tabs Configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaHome /> },
    { id: 'orders', label: 'My Orders', icon: <FaShoppingBag /> },
    { id: 'addresses', label: 'Addresses', icon: <FaMapMarkerAlt /> },
    { id: 'wallet', label: 'Wallet', icon: <FaCreditCard /> },
    { id: 'tickets', label: 'Support Helpdesk', icon: <FaLifeRing /> },
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
    { id: 'security', label: 'Security', icon: <FaLock /> },
  ];

  if (!user) return null;

  return (
    <div className="modern-account-dashboard">
      <div className="modern-dashboard-container">
        {/* Backdrop for Mobile Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              className="sidebar-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside 
          className={`modern-sidebar ${isSidebarOpen ? 'open' : ''}`}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={(e, info) => {
            if (info.offset.x < -50 || info.velocity.x < -300) {
              setIsSidebarOpen(false);
            }
          }}
        >
          <div className="user-card-modern">
            <div className="avatar-modern-wrap">
              <div className="avatar-modern">
                {user.firstName?.charAt(0) || <FaUser />}
              </div>
              <div className="avatar-glow" />
            </div>
            <div className="user-info-modern">
              <span className="membership-badge">Rerendet Member</span>
              <h3>{user.firstName} {user.lastName}</h3>
              <p className="user-email">{user.email}</p>
              <div className="user-stats-mini">
                <div className="stat-pill">
                  <span className="stat-label">Member Since</span>
                  <span className="stat-value">{user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'New Member'}</span>
                </div>
              </div>
            </div>
          </div>

          <nav className="modern-sidebar-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`modern-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
            <button className="modern-nav-item logout-btn" onClick={handleLogout}>
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </nav>
        </motion.aside>

        {/* Main Content */}
        <main className="modern-main-content">
          <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <FaTimes /> : <FaUser />}
          </button>

          {/* Mobile Profile Card - Premium Edition */}
          <div className="dashboard-mobile-header">
            <div className="mobile-user-card">
              <div className="mobile-avatar-wrap">
                <div className="mobile-avatar">
                  {user.firstName?.charAt(0) || <FaUser />}
                </div>
                <div className="mobile-avatar-glow" />
              </div>
              <div className="mobile-user-info">
                <span className="mobile-membership-badge">
                  <FaShieldAlt style={{ fontSize: '0.8rem' }} /> Rerendet Elite
                </span>
                <p className="mobile-welcome-text">Welcome back,</p>
                <h3>{user.firstName} {user.lastName}</h3>
                <p className="mobile-user-email">{user.email}</p>
                <div className="mobile-user-stats">
                  <div className="mobile-stat-pill">
                    <span className="mobile-stat-label">Member Since</span>
                    <span className="mobile-stat-value">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'New Member'}
                    </span>
                  </div>
                  <div className="mobile-stat-pill">
                    <span className="mobile-stat-label">Total Orders</span>
                    <span className="mobile-stat-value">{orders.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Mobile Tabs */}
          <div className="mobile-tabs-scroll-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`mobile-scroll-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
            <button
              className="mobile-scroll-tab logout-mobile-tab"
              onClick={handleLogout}
            >
              <FaSignOutAlt style={{ color: '#ff4d4d' }} />
              <span style={{ color: '#ff4d4d' }}>Logout</span>
            </button>
          </div>

          <div className="tab-header">
            <p>Member Dashboard</p>
            <h2>
              {activeTab === 'overview' && 'Overview'}
              {activeTab === 'orders' && 'Orders'}
              {activeTab === 'addresses' && 'Addresses'}
              {activeTab === 'wallet' && 'Wallet'}
              {activeTab === 'tickets' && 'Support Helpdesk'}
              {activeTab === 'profile' && 'Profile'}
              {activeTab === 'security' && 'Security'}
            </h2>
          </div>

          <div className="dashboard-view-container">
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
    </div>
  );
}

export default AccountDashboard;