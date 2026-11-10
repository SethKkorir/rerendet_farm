// src/components/Admin/AdminLayout.jsx
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt, FaShoppingBag, FaBox, FaUsers,
  FaEnvelope, FaChartBar, FaCog, FaSignOutAlt,
  FaBars, FaTimes, FaBell,
  FaBullhorn, FaAd, FaSun, FaMoon, FaChevronLeft, 
  FaChevronRight, FaHistory, FaPenNib, FaTicketAlt,
  FaCreditCard, FaBoxOpen, FaBook, FaExternalLinkAlt,
  FaShieldAlt, FaFileInvoiceDollar, FaReceipt,
  FaLock, FaCheckCircle
} from 'react-icons/fa';
import './AdminLayout.css';
import './AdminMobile.css';
import CommandPalette from './CommandPalette';
import AlertCenter from './AlertCenter';
import API, { getAdminAlerts, getAdminSessions, revokeAllOtherAdminSessions } from '../../api/api';

// Bottom nav items (5 most used on mobile)
const BOTTOM_NAV = [
  { id: 'dashboard', label: 'Home', Icon: FaTachometerAlt, color: '#D4AF37', bg: 'rgba(212,175,55,0.18)', path: '/admin' },
  { id: 'orders', label: 'Orders', Icon: FaShoppingBag, color: '#3b82f6', bg: 'rgba(59,130,246,0.18)', path: '/admin/orders' },
  { id: 'products', label: 'Products', Icon: FaBox, color: '#10b981', bg: 'rgba(16,185,129,0.18)', path: '/admin/products' },
  { id: 'analytics', label: 'Stats', Icon: FaChartBar, color: '#06b6d4', bg: 'rgba(6,182,212,0.18)', path: '/admin/analytics' },
  { id: 'settings', label: 'More', Icon: FaBars, color: '#94a3b8', bg: 'rgba(148,163,184,0.18)', path: null },
];

// ─── Navigation structure ────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: FaTachometerAlt, path: '/admin', color: '#D4AF37', bg: 'rgba(212,175,55,0.18)' },
    ],
  },
  {
    label: 'Store Operations',
    items: [
      { id: 'orders', label: 'Orders', Icon: FaShoppingBag, path: '/admin/orders', color: '#3b82f6', bg: 'rgba(59,130,246,0.18)', badgeKey: 'pendingOrders', badgeType: 'warn' },
      { id: 'products', label: 'Products & Inventory', Icon: FaBox, path: '/admin/products', color: '#10b981', bg: 'rgba(16,185,129,0.18)', badgeKey: 'lowStockCount', badgeType: 'crit' },
    ],
  },
  {
    label: 'Finance & Billing',
    items: [
      { id: 'invoices', label: 'Invoices', Icon: FaFileInvoiceDollar, path: '/admin/invoices', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
      { id: 'transactions', label: 'Transactions', Icon: FaReceipt, path: '/admin/transactions', color: '#3b82f6', bg: 'rgba(59,130,246,0.18)' },
    ],
  },
  {
    label: 'Audience & Growth',
    items: [
      { id: 'analytics', label: 'Analytics & Reports', Icon: FaChartBar, path: '/admin/analytics', color: '#06b6d4', bg: 'rgba(6,182,212,0.18)' },
      { id: 'users', label: 'Customers', Icon: FaUsers, path: '/admin/users', color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)' },
      { id: 'contacts', label: 'Inquiries', Icon: FaEnvelope, path: '/admin/contacts', color: '#f59e0b', bg: 'rgba(245,158,11,0.18)', badgeKey: 'unreadContacts', badgeType: 'info' },
      { id: 'marketing', label: 'Marketing', Icon: FaBullhorn, path: '/admin/marketing', color: '#ec4899', bg: 'rgba(236,72,153,0.18)' },
      { id: 'ads', label: 'Ads & Promos', Icon: FaAd, path: '/admin/ads', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
      { id: 'coupons', label: 'Coupons', Icon: FaTicketAlt, path: '/admin/coupons', color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' },
      { id: 'blogs', label: 'Coffee Journal', Icon: FaPenNib, path: '/admin/blogs', color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)' },
    ],
  },
  {
    label: 'System & Security',
    items: [
      { id: 'settings', label: 'Settings', Icon: FaCog, path: '/admin/settings', color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' },
      { id: 'documentation', label: 'Documentation', Icon: FaBook, path: '/admin/documentation', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
      { id: 'logs', label: 'Security & Activity Logs', Icon: FaShieldAlt, path: '/admin/logs', color: '#ef4444', bg: 'rgba(239,68,68,0.18)', badgeKey: 'criticalAlerts', badgeType: 'crit' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// ─── Component ───────────────────────────────────────────────
const AdminLayout = ({ children }) => {
  const { user, logout, showNotification, token, fetchDashboardStats } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 1024 : true);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adminSidebarCollapsed') === 'true');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [hoveredItem, setHoveredItem] = useState(null);

  // Auto-close mobile sidebar when route changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // ── Theme ──
  const [adminDark, setAdminDark] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', collapsed);
  }, [collapsed]);

  // Synchronize theme with document attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', adminDark ? 'dark' : 'light');
    localStorage.setItem('darkMode', adminDark);
  }, [adminDark]);

  useEffect(() => {
    const sync = e => { if (e.key === 'darkMode') setAdminDark(e.newValue === 'true'); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // ── Dynamic Badges & Metrics ──
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, info: 0 });
  const [navMetrics, setNavMetrics] = useState({
    pendingOrders: 0,
    lowStockCount: 0,
    unreadContacts: 0,
    criticalAlerts: 0
  });

  // ── Session Telemetry & Mobile App Drawer ──
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionStartTime] = useState(() => {
    const stored = sessionStorage.getItem('adminSessionStart');
    if (stored) return Number(stored);
    const now = Date.now();
    sessionStorage.setItem('adminSessionStart', now);
    return now;
  });

  const fetchSessionsData = async () => {
    if (!token) return;
    try {
      const res = await getAdminSessions();
      if (res.data?.success) {
        setSessionCount((res.data.data || []).length || 1);
      }
    } catch {}
  };

  const handleTerminateOtherSessions = async () => {
    if (!window.confirm('Terminate all other active admin sessions across devices?')) return;
    setRevokingSessions(true);
    try {
      await revokeAllOtherAdminSessions();
      showNotification('Other active sessions terminated', 'success');
      fetchSessionsData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to terminate other sessions', 'error');
    } finally {
      setRevokingSessions(false);
    }
  };

  const fetchAlertCounts = async () => {
    if (!token || !user) return;
    const isAdmin = user.userType === 'admin' || ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(user.role);
    if (!isAdmin) return;
    try {
      const res = await getAdminAlerts();
      if (res.data?.success) {
        const counts = res.data.data?.counts || { critical: 0, warning: 0, info: 0 };
        setAlertCounts(counts);
        setNavMetrics(prev => ({ ...prev, criticalAlerts: counts.critical }));
      }
    } catch {}
  };

  const fetchLiveCounts = async () => {
    if (!token) return;
    try {
      if (typeof fetchDashboardStats === 'function') {
        const sRes = await fetchDashboardStats('30d');
        if (sRes?.success && sRes?.data) {
          setNavMetrics(prev => ({
            ...prev,
            pendingOrders: sRes.data.overview?.pendingOrders || 0,
            lowStockCount: sRes.data.lowStockProducts?.length || 0,
          }));
        }
      }

      // Check unread contacts
      const cRes = await API.get('/admin/contacts?status=new');
      if (cRes.data?.total !== undefined) {
        setNavMetrics(prev => ({ ...prev, unreadContacts: cRes.data.total }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchAlertCounts();
    fetchLiveCounts();
    const interval = setInterval(() => {
      fetchAlertCounts();
      fetchLiveCounts();
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const totalAlerts = alertCounts.critical + alertCounts.warning + alertCounts.info;

  // ── Active route ──
  useEffect(() => {
    const path = location.pathname;
    const match = ALL_ITEMS.filter(i => i.path !== '/admin').find(i => path.startsWith(i.path));
    if (match) setActiveMenu(match.id);
    else if (path === '/admin' || path === '/admin/') setActiveMenu('dashboard');
  }, [location.pathname]);

  const handleMenuClick = item => {
    setActiveMenu(item.id);
    navigate(item.path);
    if (window.innerWidth <= 1024) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try { await logout(); showNotification('Logged out', 'info'); } catch { }
    const adminSegment = import.meta.env.VITE_ADMIN_PATH_SEGMENT || 'admin';
    navigate(`/admin/${adminSegment}/login`);
  };

  const activeItem = ALL_ITEMS.find(i => i.id === activeMenu);

  // User initials
  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    : 'AD';

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <CommandPalette />

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

        {/* ── Brand Header (Clean & Minimal) ── */}
        <div className="sidebar-header">
          <motion.div
            className="sidebar-logo"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/admin')}
            title="Rerendet Admin Dashboard"
          >
            <div className="sb-logo-emblem-wrap">
              <img
                src="/rerendet-emblem.png"
                alt="Rerendet"
                className="sb-brand-emblem"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/rerendet-logo.png';
                }}
              />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-main">Rerendet</span>
                <span className="brand-sub">Admin</span>
              </div>
            )}
          </motion.div>

          <div className="sb-header-actions">
            <button
              className="sb-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle sidebar collapse"
            >
              {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* ── Navigation groups ── */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className="sb-nav-group">
              {!collapsed && (
                <span className="nav-section-label">{group.label}</span>
              )}
              {collapsed && gi > 0 && <div className="sb-group-divider" />}

              {group.items.map((item, idx) => {
                const isActive = activeMenu === item.id;
                const badgeValue = item.badgeKey ? navMetrics[item.badgeKey] : 0;
                const hasBadge = Boolean(badgeValue && badgeValue > 0);

                return (
                  <div
                    key={item.id}
                    className="sb-item-wrap"
                    onMouseEnter={() => collapsed && setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (gi * 3 + idx) * 0.02, ease: 'easeOut' }}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleMenuClick(item)}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.span
                          className="nav-active-bar"
                          layoutId="activeBar"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}

                      {/* Icon chip */}
                      <span className={`nav-icon-chip ${isActive ? 'active' : ''}`}>
                        <item.Icon />
                        {collapsed && hasBadge && (
                          <span className={`sb-collapsed-dot ${item.badgeType || 'warn'}`} />
                        )}
                      </span>

                      {!collapsed && (
                        <span className="nav-label">{item.label}</span>
                      )}

                      {/* Live Counter Badge */}
                      {!collapsed && hasBadge && (
                        <span className={`nav-badge ${item.badgeType || 'warn'}`}>
                          {badgeValue}
                        </span>
                      )}
                    </motion.button>

                    {/* Tooltip (collapsed mode) */}
                    <AnimatePresence>
                      {collapsed && hoveredItem === item.id && (
                        <motion.div
                          className="sb-tooltip"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          transition={{ duration: 0.12 }}
                        >
                          <span className="sb-tip-dot" />
                          <span>{item.label}</span>
                          {hasBadge && (
                            <span className={`sb-tip-badge ${item.badgeType || 'warn'}`}>
                              {badgeValue}
                            </span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer / Admin Identity ── */}
        <div className="sidebar-footer">
          <div className="admin-profile" onClick={() => navigate('/admin/settings')}>
            <div className="profile-avatar-wrap">
              <div className="profile-initials-chip">{initials}</div>
              <span className="profile-online-dot" />
            </div>
            {!collapsed && (
              <div className="profile-info">
                <span className="admin-name">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Administrator'}
                </span>
                <span className="admin-role-pill">
                  {user?.role === 'super-admin' ? 'Super Admin' : (user?.role || 'Admin')}
                </span>
              </div>
            )}
            {!collapsed && (
              <button
                className="sb-profile-settings-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/admin/settings');
                }}
                title="Settings"
                aria-label="Settings"
              >
                <FaCog />
              </button>
            )}
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Sign Out">
            <FaSignOutAlt />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && !collapsed && (
        <div className="sb-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══ MAIN ═══ */}
      <div className="admin-main">
        {/* ── Header Bar (Clean, Minimal, Quiet Luxury) ── */}
        <header className="admin-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setMobileDrawerOpen(true);
                } else {
                  setSidebarOpen(s => !s);
                }
              }}
              aria-label="Toggle menu"
            >
              <FaBars />
            </button>
            <h1 className="page-title">
              {activeItem?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="header-right">
            {/* Live Session Pill */}
            <button
              className="header-session-pill"
              onClick={() => {
                fetchSessionsData();
                setShowSessionModal(true);
              }}
              title="Active Admin Session"
              aria-label="Active Session"
            >
              <span className="session-status-dot" />
              <span className="session-pill-label">Active Session</span>
            </button>

            {/* Direct Storefront link */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="header-store-btn"
              title="Open Live Storefront"
            >
              <span>Store</span>
              <FaExternalLinkAlt className="header-ext-icon" />
            </a>

            {/* Theme Toggle (Icon only) */}
            <button
              className="admin-theme-btn"
              onClick={() => setAdminDark(!adminDark)}
              title={adminDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {adminDark ? <FaSun className="theme-sun" /> : <FaMoon className="theme-moon" />}
            </button>

            {/* Notification Bell (Clean single-counter badge & toggle dropdown) */}
            <div className="notification-wrapper">
              <button
                className={`notification-btn ${isAlertCenterOpen ? 'active' : ''}`}
                onClick={() => setIsAlertCenterOpen(prev => !prev)}
                title="Alerts & Notifications"
                aria-label="Alerts"
                aria-expanded={isAlertCenterOpen}
              >
                <FaBell />
                {totalAlerts > 0 && (
                  <span className="notif-badge">
                    {totalAlerts > 99 ? '99+' : totalAlerts}
                  </span>
                )}
              </button>
              
              <AlertCenter isOpen={isAlertCenterOpen} onClose={() => setIsAlertCenterOpen(false)} />
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="admin-bottom-nav" role="navigation" aria-label="Mobile navigation">
        {BOTTOM_NAV.map(item => {
          const isActive = item.id === activeMenu;
          const isMore = item.path === null;
          return (
            <button
              key={item.id}
              className={`bn-item ${isActive ? 'active' : ''}`}
              style={{ '--bn-color': item.color, '--bn-bg': item.bg }}
              onClick={() => {
                if (isMore) {
                  setMobileDrawerOpen(true);
                } else {
                  handleMenuClick(item);
                }
              }}
              aria-label={item.label}
            >
              <span className="bn-icon"><item.Icon /></span>
              <span className="bn-label">{item.label}</span>
            </button>
          );
        })}
        <button
          className="bn-item bn-logout"
          style={{ '--bn-color': '#ef4444', '--bn-bg': 'rgba(239,68,68,0.18)' }}
          onClick={handleLogout}
          aria-label="Logout"
        >
          <span className="bn-icon"><FaSignOutAlt /></span>
          <span className="bn-label">Logout</span>
        </button>
      </nav>

      {/* ═══ MOBILE APP DRAWER / BOTTOM SHEET (Comes down like an app) ═══ */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="mobile-drawer-root">
            <motion.div
              className="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.div
              className="mobile-drawer-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {/* Swipe / pull handle */}
              <div className="mobile-drawer-handle-wrap" onClick={() => setMobileDrawerOpen(false)}>
                <span className="mobile-drawer-handle-bar" />
              </div>

              {/* Active Session Card in Mobile Drawer */}
              <div className="mobile-drawer-session-card">
                <div className="md-session-top">
                  <div className="md-session-status">
                    <span className="session-status-dot" />
                    <span>Active Session</span>
                  </div>
                  <span className="md-session-role-pill">
                    {user?.role === 'super-admin' ? 'Super Admin' : (user?.role || 'Admin')}
                  </span>
                </div>
                <div className="md-session-body">
                  <div className="profile-initials-chip">{initials}</div>
                  <div className="md-session-meta">
                    <span className="md-session-name">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Administrator'}
                    </span>
                    <span className="md-session-email">{user?.email || 'admin@rerendet.com'}</span>
                  </div>
                </div>
              </div>

              {/* App Drawer Navigation Sections */}
              <div className="mobile-drawer-nav">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label} className="md-nav-section">
                    <span className="md-section-label">{group.label}</span>
                    <div className="md-section-grid">
                      {group.items.map((item) => {
                        const isActive = activeMenu === item.id;
                        const badgeValue = item.badgeKey ? navMetrics[item.badgeKey] : 0;
                        return (
                          <button
                            key={item.id}
                            className={`md-item-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              handleMenuClick(item);
                              setMobileDrawerOpen(false);
                            }}
                          >
                            <span className="md-icon-wrap" style={{ color: item.color, background: item.bg }}>
                              <item.Icon />
                            </span>
                            <span className="md-item-text">{item.label}</span>
                            {badgeValue > 0 && (
                              <span className={`md-item-badge ${item.badgeType || 'warn'}`}>
                                {badgeValue}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer Footer Actions */}
              <div className="mobile-drawer-actions">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="md-action-btn md-action-store"
                  onClick={() => setMobileDrawerOpen(false)}
                >
                  <FaExternalLinkAlt /> Live Storefront
                </a>
                <button
                  className="md-action-btn md-action-logout"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    handleLogout();
                  }}
                >
                  <FaSignOutAlt /> Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ ACTIVE SESSION TELEMETRY MODAL (Desktop & Mobile) ═══ */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="admin-session-modal-root">
            <motion.div
              className="admin-session-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSessionModal(false)}
            />
            <motion.div
              className="admin-session-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="admin-session-card-header">
                <div className="session-modal-title">
                  <FaShieldAlt className="session-shield-icon" />
                  <div>
                    <h3>Admin Session Status</h3>
                    <p>Cryptographically verified administrative authorization</p>
                  </div>
                </div>
                <button
                  className="session-modal-close"
                  onClick={() => setShowSessionModal(false)}
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="admin-session-info-grid">
                <div className="session-info-row">
                  <span className="session-info-label">Current Identity</span>
                  <span className="session-info-val">
                    {user?.firstName} {user?.lastName} ({user?.email})
                  </span>
                </div>
                <div className="session-info-row">
                  <span className="session-info-label">Role & Privilege</span>
                  <span className="session-role-pill">
                    {user?.role === 'super-admin' ? 'Super Administrator' : (user?.role || 'Administrator')}
                  </span>
                </div>
                <div className="session-info-row">
                  <span className="session-info-label">Connection Status</span>
                  <span className="session-status-live">
                    <span className="session-status-dot" /> Secure · Valid Token
                  </span>
                </div>
                <div className="session-info-row">
                  <span className="session-info-label">Session Established</span>
                  <span className="session-info-val">
                    {new Date(sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="session-info-row">
                  <span className="session-info-label">Active Concurrent Sessions</span>
                  <span className="session-info-val">
                    {sessionCount} active device{sessionCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="admin-session-card-footer">
                <button
                  className="btn-revoke-others"
                  onClick={handleTerminateOtherSessions}
                  disabled={revokingSessions}
                >
                  <FaLock />
                  <span>{revokingSessions ? 'Revoking…' : 'Revoke All Other Devices'}</span>
                </button>
                <button
                  className="btn-session-signout"
                  onClick={() => {
                    setShowSessionModal(false);
                    handleLogout();
                  }}
                >
                  <FaSignOutAlt />
                  <span>Sign Out Current</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLayout;
