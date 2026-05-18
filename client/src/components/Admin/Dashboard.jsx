// Dashboard.jsx — Premium Command Center Rebuild
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityLogs from './ActivityLogs';
import SystemTelemetry from './SystemTelemetry';
import { AppContext } from '../../context/AppContext';
import {
  FaShoppingBag, FaDollarSign, FaUsers, FaBox,
  FaArrowUp, FaArrowDown, FaEye, FaChartLine,
  FaCoffee, FaPlus, FaCheckCircle, FaSync,
  FaShippingFast, FaExclamationTriangle, FaFire,
  FaClock, FaBell, FaClipboardList, FaThList,
  FaChartBar, FaTruck, FaCreditCard, FaMobileAlt,
  FaLeaf, FaServer
} from 'react-icons/fa';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';

// ─── Helpers ────────────────────────────────────────────────────
const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmtKES = v => `KES ${Number(v || 0).toLocaleString()}`;

const STATUS_META = {
  pending: { label: 'Pending Payment', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  unfulfilled: { label: 'Confirmed', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  confirmed: { label: 'Confirmed', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' }, // Fallback for virtual
  processing: { label: 'Processing', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  packed: { label: 'Processing', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  shipped: { label: 'Shipped', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  delivered: { label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  returned: { label: 'Returned', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const StatusPill = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span className="db-status-pill" style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  );
};

const PIE_COLORS = ['#D4AF37', '#6F4E37', '#A67B5B', '#E3C099', '#8b5cf6', '#3b82f6'];

// ─── Custom Tooltip ──────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-chart-tooltip">
      <div className="db-tt-label">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="db-tt-row">
          <span className="db-tt-dot" style={{ background: p.color }} />
          <span>{p.name === 'revenue' ? fmtKES(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main ────────────────────────────────────────────────────────
const Dashboard = () => {
  const { showAlert, fetchDashboardStats, fetchSalesAnalytics, logout, user, fetchAbandonedCheckouts, isSuperAdmin } = useContext(AppContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [abandonedData, setAbandonedData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [analyticsData, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Theme colors for Recharts
  const [tc, setTc] = useState({ primary: '#D4AF37', text: '#94a3b8', grid: '#e2e8f0', bg: '#ffffff' });

  useEffect(() => {
    const update = () => {
      const s = getComputedStyle(document.documentElement);
      setTc({
        primary: s.getPropertyValue('--color-primary').trim() || '#D4AF37',
        text: s.getPropertyValue('--text-muted').trim() || '#94a3b8',
        grid: s.getPropertyValue('--border-main').trim() || '#e2e8f0',
        bg: s.getPropertyValue('--bg-card').trim() || '#ffffff',
      });
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // Fetch all data
  const fetchAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const [sRes, aRes, abRes] = await Promise.all([
        fetchDashboardStats(timeframe),
        fetchSalesAnalytics(timeframe),
        fetchAbandonedCheckouts()
      ]);
      if (sRes.success) setStats(sRes.data);
      if (abRes.success) setAbandonedData(abRes.data);
      if (aRes.success) {
        setAnalytics(aRes.data);
        const raw = aRes.data.salesData || [];
        const formatted = raw.map(d => ({
          name: d._id ? new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
          revenue: Number(d.total || 0),
          orders: Number(d.orders || 0),
        }));

        setChartData(formatted);
      }
    } catch { showAlert('Failed to load dashboard', 'error'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, [timeframe]);

  // KPI metrics derived from stats + analytics
  const kpis = useMemo(() => [
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: fmtKES(stats?.overview?.totalRevenue),
      change: 0,
      sub: `${fmtKES((stats?.overview?.totalRevenue || 0) / 30)} / day avg`,
      icon: <FaDollarSign />, accent: '#D4AF37',
    },
    {
      id: 'orders',
      label: 'Total Orders',
      value: (stats?.overview?.totalOrders || 0).toLocaleString(),
      change: 0,
      sub: `${stats?.overview?.pendingOrders || 0} awaiting fulfillment`,
      icon: <FaShoppingBag />, accent: '#3b82f6',
    },
    {
      id: 'customers',
      label: 'Customers',
      value: (stats?.overview?.totalUsers || 0).toLocaleString(),
      change: 0,
      sub: `${stats?.overview?.newUsersThisMonth || 0} new this month`,
      icon: <FaUsers />, accent: '#8b5cf6',
    },
    {
      id: 'products',
      label: 'Active Products',
      value: (stats?.overview?.totalProducts || 0).toLocaleString(),
      change: 0,
      sub: `${stats?.lowStockProducts?.length || 0} low stock alerts`,
      icon: <FaBox />, accent: '#10b981',
    },
    {
      id: 'abandoned',
      label: 'Lost Sales',
      value: (abandonedData?.length || 0).toLocaleString(),
      change: 0,
      sub: `Failed payment attempts`,
      icon: <FaExclamationTriangle />, accent: '#ef4444',
    }
  ], [stats, abandonedData]);

  // Quick actions
  const quickActions = [
    { label: 'New Product', icon: <FaPlus />, path: '/admin/products', color: '#D4AF37' },
    { label: 'View Orders', icon: <FaClipboardList />, path: '/admin/orders', color: '#3b82f6' },
    { label: 'Manage Users', icon: <FaUsers />, path: '/admin/users', color: '#8b5cf6' },
    { label: 'Analytics', icon: <FaChartBar />, path: '/admin/analytics', color: '#10b981' },
  ];

  if (loading) return (
    <div className="dashboard-loading">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
        <FaCoffee className="db-load-icon" />
      </motion.div>
      <p>Brewing your data…</p>
    </div>
  );

  const overview = stats?.overview || {};

  return (
    <div className="dashboard">

      {/* ── HEADER ── */}
      <header className="db-header">
        <div className="db-header-left">
          <p className="db-greeting">{greet()}, <strong>{user?.firstName || 'Admin'}</strong> 👋</p>
          <h1 className="db-title">Dashboard Overview</h1>
          <p className="db-sub">
            Real-time performance · Last updated{' '}
            <span className="db-time">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>
        <div className="db-header-right">
          {/* Timeframe pills */}
          <div className="db-tf-pills">
            {[['7d', '7D'], ['30d', '30D'], ['90d', '90D'], ['1y', '1Y'], ['all', 'ALL']].map(([val, lbl]) => (
              <button
                key={val}
                className={`db-tf-pill ${timeframe === val ? 'active' : ''}`}
                onClick={() => setTimeframe(val)}
              >
                {lbl}
              </button>
            ))}
          </div>
          {/* Tab switcher */}
          <div className="db-tabs">
            {[
              { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
              { id: 'reports', label: 'Reports', icon: <FaChartBar /> },
              { id: 'telemetry', label: 'Telemetry', icon: <FaServer /> },
              isSuperAdmin && { id: 'logs', label: 'Logs', icon: <FaThList /> },
            ].filter(Boolean).map(t => (
              <button key={t.id} className={`db-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button className="db-refresh-btn" onClick={() => fetchAll(true)} disabled={refreshing}>
            <FaSync className={refreshing ? 'db-spin' : ''} />
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">

        {/* ══════════════════════════════════
            OVERVIEW TAB
         ══════════════════════════════════ */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* KPI Cards */}
            <div className="db-kpi-grid">
              {kpis.map((k, i) => (
                <motion.div
                  key={k.id}
                  className="db-kpi-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  style={{ '--kpi-accent': k.accent }}
                >
                  <div className="db-kpi-top">
                    <div className="db-kpi-icon" style={{ background: `${k.accent}1A`, color: k.accent }}>
                      {k.icon}
                    </div>
                    <div className={`db-kpi-change ${k.change > 0 ? 'up' : k.change < 0 ? 'down' : 'flat'}`}>
                      {k.change > 0 ? <FaArrowUp /> : k.change < 0 ? <FaArrowDown /> : null}
                      {k.change !== 0 ? `${Math.abs(k.change)}%` : '—'}
                    </div>
                  </div>
                  <div className="db-kpi-value">{k.value}</div>
                  <div className="db-kpi-label">{k.label}</div>
                  <div className="db-kpi-sub">{k.sub}</div>
                  <div className="db-kpi-bar" />
                </motion.div>
              ))}
            </div>

            {/* Charts row */}
            <div className="db-charts-row">
              {/* Revenue Area Chart */}
              <motion.div
                className="db-chart-card db-chart-main"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="db-chart-head">
                  <div>
                    <h3>Revenue Trajectory</h3>
                    <span className="db-chart-badge up"><FaArrowUp /> +12.5% vs last period</span>
                  </div>
                  <div className="db-legend-pills">
                    <span className="db-lpill" style={{ '--c': tc.primary }}>Revenue</span>
                    <span className="db-lpill" style={{ '--c': '#3b82f6' }}>Orders</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tc.primary} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={tc.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gOrd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tc.grid} />
                    <XAxis dataKey="name" stroke={tc.text} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={tc.text} fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v / 1000}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke={tc.primary} strokeWidth={3} fill="url(#gRev)" animationDuration={1200} />
                    <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} fill="url(#gOrd)" animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Donut + Quick Actions */}
              <div className="db-side-col">
                {/* Donut */}
                <motion.div
                  className="db-chart-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="db-chart-head">
                    <h3>Category Split</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={analyticsData?.categoryDistribution || []}
                        cx="50%" cy="50%" innerRadius={52} outerRadius={72}
                        paddingAngle={3} dataKey="value"
                      >
                        {(analyticsData?.categoryDistribution || []).map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '10px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="db-donut-legend">
                    {(analyticsData?.categoryDistribution || []).map((cat, i) => (
                      <div key={cat.name} className="db-donut-row">
                        <span className="db-donut-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                  className="db-quick-actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="db-qa-title">Quick Actions</h3>
                  <div className="db-qa-grid">
                    {quickActions.map(a => (
                      <button key={a.label} className="db-qa-btn" onClick={() => navigate(a.path)} style={{ '--qa-c': a.color }}>
                        <span className="db-qa-icon" style={{ background: `${a.color}1A`, color: a.color }}>{a.icon}</span>
                        <span>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bottom row: Recent Orders + Inventory Alerts */}
            <div className="db-bottom-row">

              {/* Recent Orders */}
              <motion.div
                className="db-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="db-panel-head">
                  <div>
                    <h3>Recent Orders</h3>
                    <span className="db-panel-sub">{overview.pendingOrders || 0} pending action</span>
                  </div>
                  <button className="db-view-all" onClick={() => navigate('/admin/orders')}>
                    <FaEye /> View All
                  </button>
                </div>

                {stats?.recentOrders?.length > 0 ? (
                  <div className="db-orders-table">
                    <div className="db-orders-thead">
                      <span>Order</span>
                      <span>Customer</span>
                      <span>Amount</span>
                      <span>Payment</span>
                      <span>Status</span>
                    </div>
                    {stats.recentOrders.slice(0, 7).map((o, i) => (
                      <motion.div
                        key={o._id}
                        className="db-orders-row"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.03 * i }}
                        onClick={() => navigate('/admin/orders')}
                      >
                        <span className="db-order-num">#{o.orderNumber || o._id?.slice(-6).toUpperCase()}</span>
                        <span className="db-order-customer">{o.user?.firstName} {o.user?.lastName}</span>
                        <span className="db-order-amt">{fmtKES(o.total)}</span>
                        <span className="db-order-pay">
                          {o.paymentMethod === 'mpesa' ? <><FaMobileAlt /> M-Pesa</> : <><FaCreditCard /> Card</>}
                        </span>
                        <StatusPill status={o.status} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="db-empty-state">
                    <FaShoppingBag />
                    <p>No recent orders yet</p>
                  </div>
                )}
              </motion.div>

              {/* Right col: Low Stock + Summary Stats */}
              <div className="db-bottom-right">
                {/* Inventory Alerts */}
                <motion.div
                  className="db-panel"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="db-panel-head">
                    <div>
                      <h3>Inventory Alerts</h3>
                      <span className="db-panel-sub">{stats?.lowStockProducts?.length || 0} items need attention</span>
                    </div>
                    <button className="db-view-all" onClick={() => navigate('/admin/products')}>Manage</button>
                  </div>

                  {stats?.lowStockProducts?.length > 0 ? (
                    <div className="db-stock-list">
                      {stats.lowStockProducts.slice(0, 5).map((p, i) => {
                        const stock = p.inventory?.stock || 0;
                        const threshold = p.inventory?.lowStockThreshold || 10;
                        const pct = Math.min(100, (stock / (threshold * 2)) * 100);
                        const critical = stock <= 2;
                        return (
                          <div key={p._id} className={`db-stock-row ${critical ? 'critical' : ''}`}>
                            <div className="db-stock-info">
                              <span className="db-stock-name">{p.name}</span>
                              <span className={`db-stock-count ${critical ? 'critical' : 'low'}`}>
                                {critical ? '🔴' : '🟡'} {stock} unit{stock !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="db-stock-bar-wrap">
                              <div className="db-stock-bar-fill" style={{ width: `${pct}%`, background: critical ? '#ef4444' : '#f59e0b' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="db-empty-state success">
                      <FaCheckCircle />
                      <p>All products well stocked</p>
                    </div>
                  )}
                </motion.div>

                {/* Mini KPI summary */}
                <motion.div
                  className="db-mini-kpis"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  {[
                    { label: 'Avg. Order Value', value: fmtKES(analyticsData?.averageOrderValue || overview.totalRevenue / Math.max(1, overview.totalOrders)), icon: <FaChartLine />, c: '#D4AF37' },
                    { label: 'Awaiting Prep', value: (overview.totalOrders - overview.shippedOrders - overview.deliveredOrders || 0), icon: <FaClock />, c: '#f59e0b' },
                    { label: 'Shipped (M)', value: overview.shippedOrders || 0, icon: <FaTruck />, c: '#3b82f6' },
                    { label: 'Subscribers', value: analyticsData?.subscriberCount || 0, icon: <FaBell />, c: '#10b981' },
                  ].map(m => (
                    <div key={m.label} className="db-mini-kpi">
                      <span className="db-mk-icon" style={{ color: m.c }}>{m.icon}</span>
                      <div>
                        <div className="db-mk-value">{m.value}</div>
                        <div className="db-mk-label">{m.label}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Abandoned Checkouts Alerts */}
                <motion.div
                  className="db-panel"
                  style={{ marginTop: '1.5rem', borderLeft: '4px solid #ef4444' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="db-panel-head">
                    <div>
                      <h3 style={{ color: '#ef4444' }}>Payment Failures</h3>
                      <span className="db-panel-sub">Recent drop-offs during checkout</span>
                    </div>
                  </div>
                  {abandonedData?.length > 0 ? (
                    <div className="db-stock-list">
                      {abandonedData.slice(0, 3).map((ab, i) => (
                        <div key={ab._id} className="db-stock-row" style={{ padding: '0.75rem 0' }}>
                          <div className="db-stock-info">
                            <span className="db-stock-name" style={{ fontWeight: 600 }}>{ab.user?.firstName} {ab.user?.lastName}</span>
                            <span className="db-stock-count" style={{ fontSize: '0.7rem', color: '#ef4444' }}>
                              KES {ab.totalAmount?.toLocaleString()} · {ab.failureReason?.split('.')[0]}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(ab.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No recent failures</p>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════
            REPORTS TAB
         ══════════════════════════════════ */}
        {activeTab === 'reports' && (
          <motion.div key="reports" className="db-reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="db-kpi-grid">
              {[
                { label: 'Avg. Order Value', value: fmtKES(analyticsData?.averageOrderValue), icon: <FaDollarSign />, accent: '#D4AF37', trend: '0%' },
                { label: 'Conversion Rate', value: `${analyticsData?.conversionRate || 0}%`, icon: <FaChartLine />, accent: '#3b82f6', trend: '0%' },
                { label: 'Retention Rate', value: `${analyticsData?.retentionRate || 0}%`, icon: <FaUsers />, accent: '#8b5cf6', trend: '0%' },
                { label: 'Products Sold', value: (analyticsData?.productsSold || 0).toLocaleString(), icon: <FaBox />, accent: '#10b981', trend: '0%' },
              ].map((k, i) => (
                <motion.div key={k.label} className="db-kpi-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={{ '--kpi-accent': k.accent }}>
                  <div className="db-kpi-top">
                    <div className="db-kpi-icon" style={{ background: `${k.accent}1A`, color: k.accent }}>{k.icon}</div>
                    <div className="db-kpi-change up"><FaArrowUp /> {k.trend}</div>
                  </div>
                  <div className="db-kpi-value">{k.value}</div>
                  <div className="db-kpi-label">{k.label}</div>
                  <div className="db-kpi-bar" />
                </motion.div>
              ))}
            </div>

            <div className="db-charts-row">
              <motion.div className="db-chart-card db-chart-main" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="db-chart-head"><h3>Detailed Revenue Performance</h3></div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tc.primary} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={tc.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tc.grid} />
                    <XAxis dataKey="name" stroke={tc.text} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={tc.text} fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v / 1000}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke={tc.primary} strokeWidth={3} fill="url(#gRep)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="db-chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <div className="db-chart-head"><h3>Orders per Day</h3></div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tc.grid} />
                    <XAxis dataKey="name" stroke={tc.text} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={tc.text} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════
            LOGS TAB (SUPER ADMIN ONLY)
         ══════════════════════════════════ */}
        {activeTab === 'logs' && isSuperAdmin && (
          <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ActivityLogs />
          </motion.div>
        )}

        {/* ══════════════════════════════════
            TELEMETRY TAB
         ══════════════════════════════════ */}
        {activeTab === 'telemetry' && (
          <motion.div key="telemetry" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SystemTelemetry />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default Dashboard;