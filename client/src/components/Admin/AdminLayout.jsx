// src/components/Admin/AdminLayout.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { playNotificationSound } from '../../utils/sound';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTachometerAlt, FaShoppingBag, FaBox, FaUsers,
  FaEnvelope, FaChartBar, FaCog, FaSignOutAlt,
  FaBars, FaTimes, FaBell, FaUserCircle,
  FaInfoCircle, FaExclamationCircle, FaBullhorn, FaAd,
  FaSun, FaMoon, FaChevronLeft, FaChevronRight, FaStore, FaHistory, FaPenNib, FaTicketAlt,
  FaCreditCard, FaFileInvoiceDollar, FaBoxOpen, FaBook
} from 'react-icons/fa';
import './AdminLayout.css';
import './AdminMobile.css';
import CommandPalette from './CommandPalette';
import AlertCenter from './AlertCenter';

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
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', Icon: FaTachometerAlt, path: '/admin', color: '#D4AF37', bg: 'rgba(212,175,55,0.18)' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'orders', label: 'Orders', Icon: FaShoppingBag, path: '/admin/orders', color: '#3b82f6', bg: 'rgba(59,130,246,0.18)' },
      { id: 'products', label: 'Products', Icon: FaBox, path: '/admin/products', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
      { id: 'inventory-health', label: 'Inventory Health', Icon: FaBoxOpen, path: '/admin/inventory-health', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
      { id: 'payments', label: 'Payments', Icon: FaCreditCard, path: '/admin/payments', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
      { id: 'analytics', label: 'Analytics & Reports', Icon: FaChartBar, path: '/admin/analytics', color: '#06b6d4', bg: 'rgba(6,182,212,0.18)' },
      { id: 'users', label: 'Users', Icon: FaUsers, path: '/admin/users', color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)' },
      { id: 'contacts', label: 'Contacts', Icon: FaEnvelope, path: '/admin/contacts', color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { id: 'marketing', label: 'Marketing', Icon: FaBullhorn, path: '/admin/marketing', color: '#ec4899', bg: 'rgba(236,72,153,0.18)' },
      { id: 'ads', label: 'Ads & Promos', Icon: FaAd, path: '/admin/ads', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
      { id: 'coupons', label: 'Coupons', Icon: FaTicketAlt, path: '/admin/coupons', color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' },
      { id: 'blogs', label: 'Blogs', Icon: FaPenNib, path: '/admin/blogs', color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', Icon: FaCog, path: '/admin/settings', color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' },
      { id: 'operational-controls', label: 'Operational Controls', Icon: FaCog, path: '/admin/controls', color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
      { id: 'active-sessions', label: 'Active Sessions', Icon: FaUsers, path: '/admin/sessions', color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)' },
      { id: 'documentation', label: 'Documentation', Icon: FaBook, path: '/admin/documentation', color: '#10b981', bg: 'rgba(16,185,129,0.18)' },
      { id: 'logs', label: 'Security Logs', Icon: FaHistory, path: '/admin/logs', color: '#ef4444', bg: 'rgba(239,68,68,0.18)' },
      { id: 'audit-feed', label: 'Activity Log Feed', Icon: FaHistory, path: '/admin/audit-feed', color: '#ef4444', bg: 'rgba(239,68,68,0.18)' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// ─── Component ───────────────────────────────────────────────
const AdminLayout = ({ children }) => {
  const { user, logout, showNotification, token } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // ── Theme ──
  const [adminDark, setAdminDark] = useState(() => localStorage.getItem('darkMode') === 'true');

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

  // ── Gap 1: Dynamic AlertCenter Badge counts ──
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);
  const [alertCounts, setAlertCounts] = useState({ critical: 0, warning: 0, info: 0 });

  const fetchAlertCounts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAlertCounts(data.data.counts || { critical: 0, warning: 0, info: 0 });
      }
    } catch {}
  };

  useEffect(() => {
    fetchAlertCounts();
    const interval = setInterval(fetchAlertCounts, 60000);
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

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <CommandPalette />

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

        {/* Ambient orbs */}
        <div className="sb-orb sb-orb-top" />
        <div className="sb-orb sb-orb-bottom" />

        {/* ── Brand ── */}
        <div className="sidebar-header">
          <motion.div
            className="sidebar-logo"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/admin')}
            style={{ cursor: 'pointer' }}
          >
            <div className="sb-logo-chip"><FaStore /></div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-main">Rerendet</span>
                <span className="brand-sub">Admin Panel</span>
              </div>
            )}
          </motion.div>

          <div className="sb-header-actions">
            <button
              className="sb-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* ── Nav groups ── */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className="sb-nav-group">
              {!collapsed && (
                <span className="nav-section-label">{group.label}</span>
              )}
              {collapsed && gi > 0 && <div className="sb-group-divider" />}

              {group.items.map((item, idx) => {
                const isActive = activeMenu === item.id;
                return (
                  <div
                    key={item.id}
                    className="sb-item-wrap"
                    onMouseEnter={() => collapsed && setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <motion.button
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (gi * 4 + idx) * 0.04, ease: 'easeOut' }}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleMenuClick(item)}
                    >
                      {/* Left active bar */}
                      {isActive && (
                        <motion.span
                          className="nav-active-bar"
                          style={{ background: item.color }}
                          layoutId="activeBar"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}

                      {/* Icon chip */}
                      <span
                        className="nav-icon-chip"
                        style={{
                          background: isActive ? item.bg : 'rgba(255,255,255,0.07)',
                          color: isActive ? item.color : 'rgba(255,255,255,0.4)',
                          boxShadow: isActive ? `0 0 14px ${item.color}50` : 'none',
                        }}
                      >
                        <item.Icon />
                      </span>

                      {!collapsed && (
                        <span className="nav-label">{item.label}</span>
                      )}

                      {/* Collapsed active dot */}
                      {isActive && collapsed && (
                        <span className="nav-active-dot" style={{ background: item.color }} />
                      )}
                    </motion.button>

                    {/* Tooltip (collapsed only) */}
                    <AnimatePresence>
                      {collapsed && hoveredItem === item.id && (
                        <motion.div
                          className="sb-tooltip"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.14 }}
                        >
                          <span className="sb-tip-dot" style={{ background: item.color }} />
                          {item.label}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="profile-avatar-wrap">
              <FaUserCircle className="profile-avatar" />
              <span className="profile-online-dot" />
            </div>
            {!collapsed && (
              <div className="profile-info">
                <span className="admin-name">{user?.firstName} {user?.lastName}</span>
                <span className="admin-role">{user?.role || 'Administrator'}</span>
              </div>
            )}
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <FaSignOutAlt />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && !collapsed && (
        <div className="sb-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══ MAIN ═══ */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(s => !s)}>
              <FaBars />
            </button>
            <div className="header-page-info">
              {activeItem && (
                <span
                  className="header-page-icon"
                  style={{ background: activeItem.bg, color: activeItem.color }}
                >
                  <activeItem.Icon />
                </span>
              )}
              <h1 className="page-title">
                {activeItem?.label || 'Admin Panel'}
              </h1>
            </div>
          </div>

          <div className="header-right">
            <button
              className="admin-theme-toggle"
              onClick={() => setAdminDark(!adminDark)}
              title={adminDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className={`theme-icon ${adminDark ? 'sun' : 'moon'}`}>
                {adminDark ? <FaSun /> : <FaMoon />}
              </span>
              <span className="theme-label">{adminDark ? 'Light' : 'Dark'}</span>
            </button>

            <div className="notification-wrapper">
              <button className="notification-btn" onClick={() => setIsAlertCenterOpen(true)}>
                <FaBell />
                {totalAlerts > 0 && (
                  <span className="alert-badges-container" style={{ position: 'absolute', top: '-8px', right: '-12px', display: 'flex', gap: '2px' }}>
                    {alertCounts.critical > 0 && <span className="alert-pill-badge crit">{alertCounts.critical}</span>}
                    {alertCounts.warning > 0 && <span className="alert-pill-badge warn">{alertCounts.warning}</span>}
                    {alertCounts.info > 0 && <span className="alert-pill-badge inf">{alertCounts.info}</span>}
                  </span>
                )}
              </button>
            </div>
            
            <AlertCenter isOpen={isAlertCenterOpen} onClose={() => setIsAlertCenterOpen(false)} />
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
                  setSidebarOpen(true);
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
        {/* Logout visible in mobile bottom bar */}
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
    </div>
  );
};

export default AdminLayout;