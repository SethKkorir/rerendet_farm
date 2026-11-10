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
    isCustomer,
    authLoading,
    fetchUserOrders,
    orderRefreshTrigger,
    publicSettings,
    logout
  } = useContext(AppContext);

  const navigate = useNavigate();

  // Zero-Trust: Dashboards fetch user details directly from /api/auth/me on mount
  const [profileUser, setProfileUser] = useState(user);
  useEffect(() => {
    let isMounted = true;
    import('../../api/api').then(({ default: API }) => {
      API.get('/auth/me')
        .then(res => {
          if (res.data?.success && res.data?.data && isMounted) {
            setProfileUser(res.data.data.user || res.data.data);
          }
        })
        .catch(err => console.error('Failed to fetch fresh user profile:', err));
    });
    return () => { isMounted = false; };
  }, []);

  const activeUser = profileUser || user;

  // Only authenticated customers can access the customer portal
  useEffect(() => {
    if (!authLoading && (!user || !isCustomer)) {
      navigate('/login?redirect=/account', { replace: true });
    }
  }, [authLoading, user, isCustomer, navigate]);

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

  if (!user || !isCustomer) {
    return (
      <div className="customer-layout session-expired-layout">
        <div className="session-expired-card">
          <div className="session-expired-icon">
            <FaUser />
          </div>
          <h2 className="session-expired-title">Customer Sign In Required</h2>
          <p className="session-expired-desc">Please sign in with your customer account to access the customer portal.</p>
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
            {/* ── Brand Header ── */}
            <div className="portal-sidebar-brand" onClick={() => setActiveTab('overview')}>
              <div className="portal-brand-badge">R·C</div>
              <div className="portal-brand-text">
                <span className="brand-title">Rerendet</span>
                <span className="brand-subtitle">COFFEE</span>
              </div>
              <button className="portal-mobile-close" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}>
                <FaTimes />
              </button>
            </div>

            {/* ── User Identity Pill Card (Matching Screenshot Avatar + Name + Gold member) ── */}
            <div className="portal-sidebar-user-card" onClick={() => setActiveTab('profile')}>
              <div className="portal-user-avatar">
                {((activeUser?.firstName?.[0] || 'S') + (activeUser?.lastName?.[0] || 'K')).toUpperCase()}
              </div>
              <div className="portal-user-info">
                <span className="portal-user-name">
                  {activeUser?.firstName ? `${activeUser.firstName} ${activeUser.lastName || ''}`.trim() : (activeUser?.email || 'Customer')}
                </span>
                <span className="portal-user-tier">Gold member</span>
              </div>
              <FaChevronDown className="portal-user-chevron" />
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
                          {isActive && <span className="pill-active-arrow">↗</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* ── Protection Note at bottom of sidebar ── */}
            <div className="portal-sidebar-protection-note">
              <FaShieldAlt className="protection-icon" />
              <span>Your details are protected with care.</span>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN CANVAS ═══ */}
        <div className="portal-main-canvas">
          {/* Mobile-Only Dashboard Header */}
          <div className="portal-mobile-app-header">
            <div className="portal-mobile-brand-pill" onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}>
              <span className="portal-mobile-badge">R·C</span>
              <span className="portal-mobile-title">
                {navSections.flatMap(s => s.items).find(i => i.id === activeTab)?.label || 'Overview'}
              </span>
            </div>
            <button
              type="button"
              className="portal-mobile-avatar-pill"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              aria-label="Toggle Full Account Menu"
            >
              <span>{((activeUser?.firstName?.[0] || 'S') + (activeUser?.lastName?.[0] || 'K')).toUpperCase()}</span>
              {!activeUser?.twoFactorEnabled && <span className="portal-avatar-alert-dot" />}
            </button>
          </div>

          {/* ── Active Tab View ── */}
          <main className="portal-content-body modern-main-content">
            {activeTab === 'overview' && (
              <OverviewTab
                user={activeUser}
                orders={orders}
                onNavigate={setActiveTab}
                publicSettings={publicSettings}
              />
            )}
            {activeTab === 'orders' && (
              <OrdersTab orders={orders} loading={ordersLoading} onRefresh={() => loadOrders(true)} />
            )}
            {activeTab === 'addresses' && <AddressesTab />}
            {activeTab === 'wallet' && <WalletTab onNavigate={setActiveTab} />}
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'profile' && <ProfileTab onNavigate={setActiveTab} />}
            {activeTab === 'security' && <SecurityTab />}
          </main>

          {/* ── Dashboard Canvas Footer ── */}
          <footer className="portal-canvas-footer">
            <span className="footer-left">Made with care in Kenya</span>
            <span className="footer-right">© {new Date().getFullYear()} Rerendet Coffee</span>
          </footer>
        </div>
      </div>

      {/* ═══ MOBILE BOTTOM APP BAR (Native App Experience) ═══ */}
      <nav className="portal-mobile-bottom-bar" aria-label="Account Bottom Navigation">
        <button
          type="button"
          className={`portal-bottom-nav-item ${activeTab === 'overview' && !isSidebarOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('overview');
            setIsSidebarOpen(false);
          }}
        >
          <div className="portal-bottom-nav-icon">
            <FaHome />
          </div>
          <span className="portal-bottom-nav-label">Home</span>
          {activeTab === 'overview' && !isSidebarOpen && <span className="portal-bottom-nav-dot" />}
        </button>

        <button
          type="button"
          className={`portal-bottom-nav-item ${activeTab === 'orders' && !isSidebarOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('orders');
            setIsSidebarOpen(false);
          }}
        >
          <div className="portal-bottom-nav-icon">
            <FaShoppingBag />
            {orders && orders.length > 0 && <span className="portal-bottom-badge">{orders.length}</span>}
          </div>
          <span className="portal-bottom-nav-label">Orders</span>
          {activeTab === 'orders' && !isSidebarOpen && <span className="portal-bottom-nav-dot" />}
        </button>

        <button
          type="button"
          className={`portal-bottom-nav-item ${activeTab === 'wallet' && !isSidebarOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('wallet');
            setIsSidebarOpen(false);
          }}
        >
          <div className="portal-bottom-nav-icon">
            <FaCreditCard />
          </div>
          <span className="portal-bottom-nav-label">M-Pesa</span>
          {activeTab === 'wallet' && !isSidebarOpen && <span className="portal-bottom-nav-dot" />}
        </button>

        <button
          type="button"
          className={`portal-bottom-nav-item ${activeTab === 'tickets' && !isSidebarOpen ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('tickets');
            setIsSidebarOpen(false);
          }}
        >
          <div className="portal-bottom-nav-icon">
            <FaHeadset />
          </div>
          <span className="portal-bottom-nav-label">Support</span>
          {activeTab === 'tickets' && !isSidebarOpen && <span className="portal-bottom-nav-dot" />}
        </button>

        <button
          type="button"
          className={`portal-bottom-nav-item ${(['profile', 'addresses', 'security'].includes(activeTab) || isSidebarOpen) ? 'active' : ''}`}
          onClick={() => setIsSidebarOpen(prev => !prev)}
          aria-label="Account Menu"
        >
          <div className="portal-bottom-nav-icon">
            <FaUser />
            {!user?.twoFactorEnabled && <span className="portal-bottom-alert-dot" />}
          </div>
          <span className="portal-bottom-nav-label">{isSidebarOpen ? 'Close' : 'Account'}</span>
          {(['profile', 'addresses', 'security'].includes(activeTab) || isSidebarOpen) && (
            <span className="portal-bottom-nav-dot" />
          )}
        </button>
      </nav>
    </div>
  );
}

export default AccountDashboard;
