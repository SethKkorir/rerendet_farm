import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaUser, FaShoppingBag, FaMapMarkerAlt, FaCreditCard,
  FaLock, FaTimes, FaHome, FaShieldAlt, FaHistory, FaCheckCircle, FaLifeRing,
  FaChevronLeft, FaChevronRight, FaBars, FaSearch, FaMoon, FaSun, FaBell, FaChevronDown,
  FaArrowRight, FaHeadset, FaInfoCircle, FaClock, FaComments, FaSignOutAlt
} from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getWhatsAppLink } from '../../utils/whatsappHelper';
import BrandLoader from '../UI/BrandLoader';
import './AccountDashboard.css';

// Import Tab Components
import OverviewTab from './OverviewTab';
import OrdersTab from './CustomerOrdersTab';
import AddressesTab from './AddressesTab';
import WalletTab from './WalletTab';
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';
import TicketsTab from './TicketsTab';

// ── Main Customer Portal Dashboard Shell ──────────────────────────────────
function AccountDashboard() {
  const {
    user,
    userType,
    authLoading,
    fetchUserOrders,
    orderRefreshTrigger,
    publicSettings,
    logout
  } = useContext(AppContext);

  const navigate = useNavigate();

  // Redirect unauthenticated users ONLY after auth loading settles
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/account', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Block admin users from customer portal
  const isAdminUser = userType === 'admin' || user?.role === 'admin' || user?.role === 'super-admin';
  useEffect(() => {
    if (!authLoading && user && isAdminUser) {
      navigate('/admin', { replace: true });
    }
  }, [authLoading, user, isAdminUser, navigate]);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (user && (activeTab === 'orders' || activeTab === 'overview')) {
      loadOrders(true);
    }
  }, [user, activeTab, orderRefreshTrigger]);

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


  const storeLogo = publicSettings?.store?.logo || '/rerendet-logo.png';
  const storeName = publicSettings?.store?.name || 'Rerendet Coffee';

  // ── Navigation Structure ──
  const navSections = [
    {
      label: 'MAIN',
      items: [
        { id: 'overview', label: 'Overview', Icon: FaHome },
        { id: 'orders', label: 'My Orders', Icon: FaShoppingBag },
        { id: 'addresses', label: 'Addresses', Icon: FaMapMarkerAlt },
      ]
    },
    {
      label: 'ACCOUNT',
      items: [
        { id: 'wallet', label: 'M-Pesa Payment', Icon: FaCreditCard },
        { id: 'profile', label: 'Profile', Icon: FaUser },
        { id: 'security', label: 'Password & Security', Icon: FaLock, alert: !user?.twoFactorEnabled },
      ]
    },
    {
      label: 'SUPPORT',
      items: [
        { id: 'tickets', label: 'Help & Support', Icon: FaHeadset },
        {
          id: 'logout',
          label: 'Log Out',
          Icon: FaSignOutAlt,
          danger: true,
          action: async () => {
            await logout();
            navigate('/');
          }
        },
      ]
    }
  ];

  if (authLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BrandLoader minHeight="60vh" subtitle="AUTHENTICATING CUSTOMER PORTAL" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="customer-layout session-expired-layout">
        <div className="session-expired-card">
          <div className="session-expired-icon">
            <FaUser />
          </div>
          <h2 className="session-expired-title">Session Expired</h2>
          <p className="session-expired-desc">Your session has timed out or requires authentication. Please sign in to continue.</p>
          <button
            type="button"
            className="btn-order-primary session-expired-btn"
            onClick={() => navigate('/login?redirect=/account')}
          >
            Sign In to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-master-wrapper">
      <div className="portal-container">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div className="portal-sb-overlay" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* ═══ LUXURY DARK CHOCOLATE SIDEBAR (Matching Image 2) ═══ */}
        <aside className={`portal-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-inner-stack">
            {/* ── Brand Header (Emblem + Gold Serif) ── */}
            <div className="portal-sidebar-brand" onClick={() => setActiveTab('overview')}>
              <img
                src={storeLogo}
                alt={storeName}
                className="portal-brand-logo-img"
                onError={(e) => { e.target.src = '/rerendet-logo.png'; }}
              />
              <div className="portal-brand-text">
                <span className="brand-title">Rerendet</span>
                <span className="brand-subtitle">Coffee</span>
              </div>
              <button className="portal-mobile-close" onClick={() => setIsSidebarOpen(false)}>
                <FaTimes />
              </button>
            </div>

            {/* ── Nav Sections ── */}
            <nav className="portal-nav-groups">
              {navSections.map(section => (
                <div key={section.label} className="portal-nav-group">
                  <span className="portal-group-label">{section.label}</span>
                  <div className="portal-group-items">
                    {section.items.map(item => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          className={`portal-nav-pill ${isActive ? 'active' : ''} ${item.danger ? 'danger-pill' : ''}`}
                          onClick={() => {
                            if (item.action) {
                              item.action();
                            } else {
                              setActiveTab(item.id);
                            }
                            setIsSidebarOpen(false);
                          }}
                        >
                          <span className="pill-icon">
                            <item.Icon />
                          </span>
                          <span className="pill-label">{item.label}</span>
                          {item.alert && <span className="pill-alert-dot" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* ═══ MAIN CANVAS ═══ */}
        <div className="portal-main-canvas">
          {/* Mobile-Only Dashboard Subbar */}
          <div className="portal-mobile-subbar">
            <button className="portal-mobile-menu-pill" onClick={() => setIsSidebarOpen(true)}>
              <FaBars />
              <span>Menu</span>
            </button>
            <span className="portal-mobile-section-name">
              {navSections.flatMap(s => s.items).find(i => i.id === activeTab)?.label || 'Overview'}
            </span>
          </div>

          {/* ── Active Tab View ── */}
          <main className="portal-content-body modern-main-content">
            {activeTab === 'overview' && (
              <OverviewTab
                user={user}
                orders={orders}
                onNavigate={setActiveTab}
                publicSettings={publicSettings}
              />
            )}
            {activeTab === 'orders' && (
              <OrdersTab orders={orders} loading={ordersLoading} onRefresh={() => loadOrders(true)} />
            )}
            {activeTab === 'addresses' && <AddressesTab />}
            {activeTab === 'wallet' && <WalletTab />}
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'security' && <SecurityTab />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default AccountDashboard;
