// src/components/Admin/Analytics.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChartLine, FaShoppingCart, FaUsers, FaBox, FaSync,
  FaArrowUp, FaArrowDown, FaMinus, FaMoneyBillWave, FaFire,
  FaTrophy, FaStar, FaCoffee, FaBoxOpen, FaCheckCircle,
  FaDownload, FaExclamationTriangle, FaTag, FaCreditCard,
  FaTimesCircle, FaUndo, FaUserPlus, FaUserCheck, FaWarehouse
} from 'react-icons/fa';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  getSalesAnalytics,
  getAbandonedCartsReport,
  getPaymentsReport,
  getCustomersReport,
  getInventoryReport,
  getCouponsReport,
  exportOrdersCSV,
  exportCustomersCSV
} from '../../api/api';
import ReportsManagement from './ReportsManagement';
import './Analytics.css';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString();
const fmtKes = (n) => `KES ${fmt(Math.round(n || 0))}`;
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

const COLORS = ['#D4AF37', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
const FULFILL_COLORS = {
  Delivered: '#10b981', Shipped: '#8b5cf6',
  Processing: '#3b82f6', Confirmed: '#6b7280', Returned: '#ef4444'
};

const TIMEFRAMES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'sales', label: '💰 Sales' },
  { id: 'products', label: '☕ Products' },
  { id: 'customers', label: '👥 Customers' },
  { id: 'payments', label: '💳 Payments' },
  { id: 'inventory', label: '📦 Inventory' },
  { id: 'abandoned', label: '🛒 Abandoned' },
  { id: 'coupons', label: '🏷️ Coupons' },
  { id: 'statements', label: '🧾 Statements' },
];

const TTP = {
  contentStyle: {
    background: '#1e1b18',
    border: '1px solid #3a3530',
    borderRadius: '10px',
    padding: '10px 14px',
  },
  itemStyle: { color: '#f5f0e8', fontWeight: 700, fontSize: '13px' },
  labelStyle: { color: '#9ca3af', fontWeight: 600, fontSize: '12px' },
};

/* ─── Download helper ─────────────────────────────────────────── */
const downloadBlob = (data, fn) => {
  const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fn;
  a.click();
  URL.revokeObjectURL(url);
};

/* ─── ChartBox ────────────────────────────────────────────────── */
// CRITICAL: Recharts needs a parent with an explicit pixel height.
// We set it on the wrapper div directly — NOT via flex-stretch.
const ChartBox = ({ height = 300, children }) => (
  <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
);

/* ─── StatCard ────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, trend, color = '#D4AF37', sub, delay = 0 }) => (
  <motion.div
    className="an-stat-card"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{ '--accent': color }}
  >
    <div className="an-stat-icon" style={{ background: `${color}22`, color }}>
      {icon}
    </div>
    <div className="an-stat-body">
      <p className="an-stat-value">{value}</p>
      <p className="an-stat-label">{label}</p>
      <div className="an-stat-footer">
        {trend !== undefined && (
          <span className={`an-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}`}>
            {trend > 0 ? <FaArrowUp /> : trend < 0 ? <FaArrowDown /> : <FaMinus />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span className="an-stat-sub">{sub}</span>}
      </div>
    </div>
  </motion.div>
);

/* ─── ChartCard ───────────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, children, wide = false, action }) => (
  <div className={`an-chart-card${wide ? ' an-chart-lg' : ''}`}>
    <div className="an-chart-header">
      <div>
        <h3 className="an-chart-title">{title}</h3>
        {subtitle && <div className="an-chart-subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
    <div className="an-chart-body">
      {children}
    </div>
  </div>
);

/* ─── Empty ───────────────────────────────────────────────────── */
const Empty = ({ icon = '📊', msg }) => (
  <div className="an-empty-state">
    <span className="an-empty-icon">{icon}</span>
    <p>{msg}</p>
  </div>
);

/* ─── TabLoader ───────────────────────────────────────────────── */
const TabLoader = () => (
  <div className="an-loading-screen" style={{ height: '40vh' }}>
    <div className="an-spinner" />
    <p>Loading…</p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const Analytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('30d');

  // Separate loading states: initial (full-page spinner) vs refreshing (subtle)
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [abandoned, setAbandoned] = useState(null);
  const [payments, setPayments] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [coupons, setCoupons] = useState(null);

  // Track which tabs have already been fetched so we don't re-fetch on every tab switch
  const fetchedTabs = useRef(new Set());

  /* ── Load overview ── */
  const loadOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setInitialLoading(true);
    setError(null);

    try {
      console.log('📊 Analytics: Fetching sales data for period:', timeframe);
      const res = await getSalesAnalytics({ period: timeframe });
      console.log('📊 Analytics: API response:', res?.data?.success, res?.data?.data ? 'has data' : 'no data');
      
      if (res?.data?.success && res?.data?.data) {
        setOverview(res.data.data);
      } else if (res?.data?.success === false) {
        setOverview({});
        console.warn('Analytics API returned success:false', res?.data);
        setError('Analytics returned no data. Please try a different timeframe.');
      } else {
        // Unexpected response shape — try to use whatever we got
        setOverview(res?.data?.data || res?.data || {});
      }
    } catch (e) {
      console.error('Analytics loadOverview error:', e);
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e.message;
      
      if (status === 403) {
        setError('Access denied. You may not have analytics permissions.');
      } else if (status === 401) {
        setError('Session expired. Please log out and log in again.');
      } else if (status === 500) {
        setError('Server error loading analytics. Check server logs.');
      } else {
        setError(`Failed to load analytics: ${msg || 'Unknown error'}`);
      }
      // Still set overview so we don't get stuck on the spinner
      setOverview(prev => prev || {});
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [timeframe]);

  // Initial load + reload whenever timeframe changes
  useEffect(() => {
    loadOverview(false);
  }, [loadOverview]);

  /* ── Lazy-load per-tab data ── */
  useEffect(() => {
    if (fetchedTabs.current.has(activeTab)) return;

    const load = async () => {
      fetchedTabs.current.add(activeTab);
      try {
        if (activeTab === 'abandoned') {
          const r = await getAbandonedCartsReport();
          if (r?.data?.success) setAbandoned(r.data.data);
          else setAbandoned({});
        }
        if (activeTab === 'payments') {
          const r = await getPaymentsReport();
          if (r?.data?.success) setPayments(r.data.data);
          else setPayments({});
        }
        if (activeTab === 'customers') {
          const r = await getCustomersReport();
          if (r?.data?.success) setCustomers(r.data.data);
          else setCustomers({});
        }
        if (activeTab === 'inventory') {
          const r = await getInventoryReport();
          if (r?.data?.success) setInventory(r.data.data);
          else setInventory({});
        }
        if (activeTab === 'coupons') {
          const r = await getCouponsReport();
          if (r?.data?.success) setCoupons(r.data.data);
          else setCoupons({});
        }
      } catch (e) {
        console.error('Tab load error for', activeTab, e);
        // Set empty objects so tabs render instead of spinning forever
        if (activeTab === 'abandoned' && !abandoned) setAbandoned({});
        if (activeTab === 'payments' && !payments) setPayments({});
        if (activeTab === 'customers' && !customers) setCustomers({});
        if (activeTab === 'inventory' && !inventory) setInventory({});
        if (activeTab === 'coupons' && !coupons) setCoupons({});
      }
    };

    load();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── When timeframe changes, invalidate overview cache ── */
  useEffect(() => {
    fetchedTabs.current.delete('overview');
  }, [timeframe]);

  /* ── Exports ── */
  const exportOrders = async () => {
    try {
      setExporting(true);
      const r = await exportOrdersCSV();
      downloadBlob(r.data, `orders-${Date.now()}.csv`);
    } catch (e) {
      console.error('Export orders error:', e);
    } finally {
      setExporting(false);
    }
  };

  const exportCusts = async () => {
    try {
      setExporting(true);
      const r = await exportCustomersCSV();
      downloadBlob(r.data, `customers-${Date.now()}.csv`);
    } catch (e) {
      console.error('Export customers error:', e);
    } finally {
      setExporting(false);
    }
  };

  /* ── Derived data (safe — overview is always at least {}) ── */
  const a = overview || {};

  const lastOrderDate = a.lastOrderDate ? new Date(a.lastOrderDate) : null;

  const salesData = (a.salesData || []).map(d => ({
    date: d._id
      ? new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '',
    revenue: Number(d.total || 0),
    orders: Number(d.orders || 0),
  }));

  const hasSalesData = salesData.some(d => d.revenue > 0 || d.orders > 0);

  const catData = (a.categoryDistribution || []).map(d => ({ name: d.name, value: Number(d.value || 0) }));
  const fulData = (a.fulfillmentBreakdown || []).map(d => ({ name: d.name, value: Number(d.value || 0) }));
  const topProds = (a.topProducts || []).slice(0, 8);
  const maxSales = Math.max(...topProds.map(p => p.sales), 1);

  const trendLabel = (trend) =>
    trend !== undefined ? (
      <span className={`an-trend-badge ${trend >= 0 ? 'up' : 'down'}`}>
        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs last period
      </span>
    ) : null;

  /* ── Full-page initial spinner ── */
  if (initialLoading) {
    return (
      <div className="an-loading-screen">
        <div className="an-spinner" />
        <p>Loading analytics…</p>
      </div>
    );
  }

  /* ── Error banner (non-fatal — still renders the rest of the UI) ── */
  const ErrorBanner = () =>
    error ? (
      <div className="an-error-banner">
        <FaExclamationTriangle /> {error}
        <button onClick={() => loadOverview(true)}>Retry</button>
      </div>
    ) : null;

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="analytics-dashboard">

      {/* ── Header ── */}
      <div className="an-header">
        <div>
          <h1 className="an-title">Analytics &amp; Reports</h1>
          <p className="an-subtitle">Business intelligence for Rerendet Coffee</p>
        </div>
        <div className="an-header-controls">
          <div className="an-timeframe-pills">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                className={`an-tf-pill${timeframe === tf.value ? ' active' : ''}`}
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div className="an-export-btns">
            <button className="an-export-btn" onClick={exportOrders} disabled={exporting}>
              <FaDownload /> Orders CSV
            </button>
            <button className="an-export-btn an-export-btn--alt" onClick={exportCusts} disabled={exporting}>
              <FaDownload /> Customers CSV
            </button>
          </div>
          <button
            className="an-refresh-btn"
            onClick={() => loadOverview(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <FaSync className={refreshing ? 'an-spin' : ''} />
          </button>
        </div>
      </div>

      <ErrorBanner />

      {/* ── Tabs ── */}
      <div className="an-tab-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`an-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══ OVERVIEW ══ */}
        {activeTab === 'overview' && (
          <motion.div
            key="ov"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="an-kpi-grid">
              <StatCard delay={0} icon={<FaMoneyBillWave />} color="#D4AF37" label="Total Revenue" value={fmtKes(a.totalRevenue)} trend={a.revenueTrend} />
              <StatCard delay={0.06} icon={<FaShoppingCart />} color="#3b82f6" label="Total Orders" value={fmt(a.totalOrders)} trend={a.ordersTrend} />
              <StatCard delay={0.12} icon={<FaUsers />} color="#8b5cf6" label="Active Customers" value={fmt(a.activeCustomers)} />
              <StatCard delay={0.18} icon={<FaBox />} color="#10b981" label="Products Sold" value={fmt(a.productsSold)} />
            </div>

            <div className="an-secondary-kpis">
              {[
                ['Avg. Order Value', fmtKes(a.averageOrderValue)],
                ['Conversion Rate', fmtPct(a.conversionRate)],
                ['Retention Rate', fmtPct(a.retentionRate)],
                ['Rev / Customer', fmtKes(a.activeCustomers > 0 ? (a.totalRevenue || 0) / a.activeCustomers : 0)],
              ].map(([label, value]) => (
                <div key={label} className="an-secondary-card">
                  <span className="an-sk-label">{label}</span>
                  <span className="an-sk-value">{value}</span>
                </div>
              ))}
            </div>

            <div className="an-charts-row">
              <ChartCard
                wide
                title="Revenue Trajectory"
                subtitle={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {TIMEFRAMES.find(t => t.value === timeframe)?.label}
                    {trendLabel(a.revenueTrend)}
                  </span>
                }
              >
                {hasSalesData ? (
                  <ChartBox height={280}>
                    <LineChart data={salesData} margin={{ top: 10, right: 30, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...TTP} formatter={(v, name) => name === 'revenue' ? [fmtKes(v), 'Revenue'] : [v, 'Orders']} />
                      <Legend iconType="circle" iconSize={9} formatter={n => n === 'revenue' ? 'Revenue' : 'Orders'} wrapperStyle={{ fontSize: '0.76rem', color: '#9ca3af', paddingTop: 8 }} />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" name="revenue" stroke="#D4AF37" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#D4AF37' }} />
                      <Line yAxisId="right" type="monotone" dataKey="orders" name="orders" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} strokeDasharray="5 3" />
                    </LineChart>
                  </ChartBox>
                ) : (
                  <Empty
                    icon="📈"
                    msg={
                      lastOrderDate
                        ? `No sales in this period. Last order: ${lastOrderDate.toLocaleDateString()}. Try "All Time" or "90 Days".`
                        : 'No sales data found for this period.'
                    }
                  />
                )}
              </ChartCard>

              <ChartCard title="Fulfillment Status" subtitle="Order distribution">
                {fulData.length > 0 ? (
                  <ChartBox height={280}>
                    <PieChart>
                      <Pie data={fulData} cx="50%" cy="45%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value">
                        {fulData.map((e, i) => (
                          <Cell key={i} fill={FULFILL_COLORS[e.name] || COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip {...TTP} formatter={v => [`${v}%`, 'Share']} />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.76rem', color: '#9ca3af', paddingTop: 8 }} />
                    </PieChart>
                  </ChartBox>
                ) : (
                  <Empty icon="🥧" msg="No fulfillment data" />
                )}
              </ChartCard>
            </div>
          </motion.div>
        )}

        {/* ══ SALES ══ */}
        {activeTab === 'sales' && (
          <motion.div
            key="sa"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="an-kpi-grid">
              <StatCard delay={0} icon={<FaMoneyBillWave />} color="#D4AF37" label="Revenue" value={fmtKes(a.totalRevenue)} trend={a.revenueTrend} />
              <StatCard delay={0.06} icon={<FaShoppingCart />} color="#3b82f6" label="Orders" value={fmt(a.totalOrders)} trend={a.ordersTrend} />
              <StatCard delay={0.12} icon={<FaChartLine />} color="#10b981" label="Avg Order" value={fmtKes(a.averageOrderValue)} />
              <StatCard delay={0.18} icon={<FaFire />} color="#f59e0b" label="Peak Day" value={fmtKes(hasSalesData ? Math.max(...salesData.map(d => d.revenue)) : 0)} />
            </div>

            <div className="an-charts-row">
              <ChartCard
                wide
                title="Revenue Trajectory"
                subtitle={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Revenue &amp; Orders — {TIMEFRAMES.find(t => t.value === timeframe)?.label}
                    {trendLabel(a.revenueTrend)}
                  </span>
                }
              >
                {hasSalesData ? (
                  <ChartBox height={300}>
                    <LineChart data={salesData} margin={{ top: 10, right: 30, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...TTP} formatter={(v, name) => name === 'revenue' ? [fmtKes(v), 'Revenue'] : [v, 'Orders']} />
                      <Legend iconType="circle" iconSize={9} formatter={n => n === 'revenue' ? 'Revenue' : 'Orders'} wrapperStyle={{ fontSize: '0.76rem', color: '#9ca3af', paddingTop: 8 }} />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" name="revenue" stroke="#D4AF37" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#D4AF37' }} />
                      <Line yAxisId="right" type="monotone" dataKey="orders" name="orders" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} strokeDasharray="5 3" />
                    </LineChart>
                  </ChartBox>
                ) : (
                  <Empty msg="No revenue data for this period" />
                )}
              </ChartCard>

              <ChartCard title="Orders Per Day" subtitle="Volume trend">
                {hasSalesData ? (
                  <ChartBox height={300}>
                    <BarChart data={salesData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...TTP} formatter={v => [v, 'Orders']} />
                      <Bar dataKey="orders" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ChartBox>
                ) : (
                  <Empty msg="No order data" />
                )}
              </ChartCard>
            </div>

            {catData.length > 0 && (
              <ChartCard wide title="Category Split" subtitle="Units sold share per category">
                <div className="an-category-row">
                  <div style={{ width: 260, height: 260, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={catData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value">
                          {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...TTP} formatter={v => [`${v}%`, 'Share']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="an-category-legend">
                    {catData.map((cat, i) => (
                      <div key={i} className="an-cat-row">
                        <div className="an-cat-dot" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="an-cat-name">{cat.name}</span>
                        <div className="an-progress-bg">
                          <div className="an-progress-fill" style={{ width: `${cat.value}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="an-cat-pct">{cat.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            )}
          </motion.div>
        )}

        {/* ══ PRODUCTS ══ */}
        {activeTab === 'products' && (
          <motion.div
            key="pr"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="an-kpi-grid">
              <StatCard delay={0} icon={<FaCoffee />} color="#D4AF37" label="Products Sold" value={fmt(a.productsSold)} />
              <StatCard delay={0.06} icon={<FaTrophy />} color="#f59e0b" label="Top Category" value={catData[0]?.name || '—'} />
              <StatCard delay={0.12} icon={<FaStar />} color="#10b981" label="Best Seller" value={(topProds[0]?.name || '—').split(' ').slice(0, 2).join(' ')} />
              <StatCard delay={0.18} icon={<FaBoxOpen />} color="#6b7280" label="Avg per Order" value={a.totalOrders > 0 ? Number((a.productsSold || 0) / (a.totalOrders || 1)).toFixed(1) : '0'} />
            </div>

            <ChartCard wide title="🏆 Top Products by Sales" subtitle="Ranked by units sold">
              {topProds.length > 0 ? (
                <div className="an-leaderboard">
                  {topProds.map((p, i) => (
                    <motion.div
                      key={i}
                      className={`an-leader-row${i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : ''}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <div className="an-leader-rank">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                          <span className="an-rank-num">{i + 1}</span>
                        )}
                      </div>
                      <div className="an-leader-name"><strong>{p.name}</strong></div>
                      <div className="an-leader-bar">
                        <div className="an-progress-bg">
                          <div className="an-progress-fill" style={{ width: `${(p.sales / maxSales) * 100}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                      <div className="an-leader-sales">{p.sales} sold</div>
                      <div className="an-leader-revenue">{fmtKes(p.revenue)}</div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Empty icon="☕" msg="No product sales in this period" />
              )}
            </ChartCard>

            {catData.length > 0 && (
              <ChartCard wide title="Sales by Category">
                <ChartBox height={260}>
                  <BarChart data={catData} margin={{ top: 10, right: 20, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip {...TTP} formatter={v => [`${v}%`, 'Share']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ChartBox>
              </ChartCard>
            )}
          </motion.div>
        )}

        {/* ══ CUSTOMERS ══ */}
        {activeTab === 'customers' && (
          <motion.div
            key="cu"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {customers === null ? <TabLoader /> : (
              <>
                <div className="an-kpi-grid">
                  <StatCard delay={0} icon={<FaUsers />} color="#8b5cf6" label="Total" value={fmt(customers.summary?.total)} />
                  <StatCard delay={0.06} icon={<FaUserPlus />} color="#3b82f6" label="New" value={fmt(customers.summary?.new)} sub={fmtPct(customers.summary?.newRate)} />
                  <StatCard delay={0.12} icon={<FaUserCheck />} color="#10b981" label="Returning" value={fmt(customers.summary?.returning)} sub={fmtPct(customers.summary?.returningRate)} />
                  <StatCard delay={0.18} icon={<FaMoneyBillWave />} color="#D4AF37" label="CLV" value={fmtKes(customers.summary?.clv)} />
                </div>

                <div className="an-charts-row">
                  <ChartCard title="New vs Returning" subtitle="Customer type split">
                    <ChartBox height={280}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'New', value: customers.summary?.new || 0 },
                            { name: 'Returning', value: customers.summary?.returning || 0 },
                          ]}
                          cx="50%" cy="45%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip {...TTP} />
                        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.76rem', color: '#9ca3af', paddingTop: 8 }} />
                      </PieChart>
                    </ChartBox>
                  </ChartCard>

                  <ChartCard wide title="New Customer Signups" subtitle="Monthly trend">
                    {customers.newCustomerTrend?.length > 0 ? (
                      <ChartBox height={280}>
                        <BarChart data={customers.newCustomerTrend} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" vertical={false} />
                          <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip {...TTP} formatter={v => [v, 'New Customers']} />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ChartBox>
                    ) : (
                      <Empty msg="No trend data yet" />
                    )}
                  </ChartCard>
                </div>

                {customers.topReturning?.length > 0 && (
                  <ChartCard
                    wide
                    title="Top Returning Customers"
                    action={
                      <button className="an-export-btn" onClick={exportCusts} disabled={exporting}>
                        <FaDownload /> CSV
                      </button>
                    }
                  >
                    <div className="an-table-wrap">
                      <table className="an-table">
                        <thead>
                          <tr><th>#</th><th>Name</th><th>Email</th><th>Orders</th><th>Spent</th></tr>
                        </thead>
                        <tbody>
                          {customers.topReturning.map((c, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td><strong>{c.name}</strong></td>
                              <td className="an-muted">{c.email}</td>
                              <td>
                                <span className="an-badge" style={{ background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644' }}>
                                  {c.orders}
                                </span>
                              </td>
                              <td><strong>{fmtKes(c.spent)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ══ PAYMENTS ══ */}
        {activeTab === 'payments' && (
          <motion.div
            key="pa"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {payments === null ? <TabLoader /> : (
              <>
                <div className="an-kpi-grid">
                  <StatCard delay={0} icon={<FaCheckCircle />} color="#10b981" label="Successful" value={fmt(payments.summary?.paid)} sub={fmtKes(payments.summary?.totalRevenue)} />
                  <StatCard delay={0.06} icon={<FaTimesCircle />} color="#ef4444" label="Failed" value={fmt(payments.summary?.failed)} sub={fmtPct(payments.summary?.failureRate) + ' rate'} />
                  <StatCard delay={0.12} icon={<FaUndo />} color="#f59e0b" label="Refunded" value={fmt(payments.summary?.refunded)} sub={fmtKes(payments.summary?.refundedAmount)} />
                  <StatCard delay={0.18} icon={<FaShoppingCart />} color="#6b7280" label="Pending" value={fmt(payments.summary?.pending)} />
                </div>

                <div className="an-charts-row">
                  <ChartCard title="Revenue by Method" subtitle="Payment channel breakdown">
                    {payments.paymentMethods?.length > 0 ? (
                      <ChartBox height={280}>
                        <PieChart>
                          <Pie data={payments.paymentMethods} cx="50%" cy="45%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="revenue" nameKey="name">
                            {payments.paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip {...TTP} formatter={v => [fmtKes(v), 'Revenue']} />
                          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.76rem', color: '#9ca3af', paddingTop: 8 }} />
                        </PieChart>
                      </ChartBox>
                    ) : (
                      <Empty icon="💳" msg="No payment method data" />
                    )}
                  </ChartCard>

                  <ChartCard wide title="Monthly Payment Trend" subtitle="Paid vs Failed vs Refunded">
                    {payments.monthlyTrend?.length > 0 ? (
                      <ChartBox height={280}>
                        <BarChart data={payments.monthlyTrend} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" vertical={false} />
                          <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip {...TTP} />
                          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.76rem', color: '#9ca3af' }} />
                          <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="refunded" name="Refunded" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartBox>
                    ) : (
                      <Empty msg="No trend data" />
                    )}
                  </ChartCard>
                </div>

                {payments.recentRefunds?.length > 0 && (
                  <ChartCard wide title="Recent Refunds">
                    <div className="an-table-wrap">
                      <table className="an-table">
                        <thead>
                          <tr><th>Order</th><th>Customer</th><th>Amount</th><th>Method</th><th>Date</th></tr>
                        </thead>
                        <tbody>
                          {payments.recentRefunds.map((r, i) => (
                            <tr key={i}>
                              <td><code style={{ color: '#D4AF37' }}>#{r.orderNumber}</code></td>
                              <td>{r.customer}</td>
                              <td style={{ color: '#ef4444' }}>- {fmtKes(r.amount)}</td>
                              <td className="an-muted">{r.method}</td>
                              <td className="an-muted">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ══ INVENTORY ══ */}
        {activeTab === 'inventory' && (
          <motion.div
            key="iv"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {inventory === null ? <TabLoader /> : (
              <>
                <div className="an-kpi-grid">
                  <StatCard delay={0} icon={<FaBox />} color="#3b82f6" label="Total Products" value={fmt(inventory.summary?.total)} />
                  <StatCard delay={0.06} icon={<FaCheckCircle />} color="#10b981" label="In Stock" value={fmt(inventory.summary?.inStock)} />
                  <StatCard delay={0.12} icon={<FaExclamationTriangle />} color="#f59e0b" label="Low Stock" value={fmt(inventory.summary?.lowStock)} sub="≤ 10 units" />
                  <StatCard delay={0.18} icon={<FaTimesCircle />} color="#ef4444" label="Out of Stock" value={fmt(inventory.summary?.outOfStock)} />
                </div>

                <div className="an-secondary-kpis">
                  <div className="an-secondary-card" style={{ gridColumn: 'span 4' }}>
                    <span className="an-sk-label">Total Inventory Value</span>
                    <span className="an-sk-value" style={{ fontSize: '1.8rem' }}>
                      {fmtKes(inventory.summary?.totalInventoryValue)}
                    </span>
                  </div>
                </div>

                <ChartCard wide title="Stock Levels" subtitle="Top 15 products by current stock">
                  {inventory.stockList?.length > 0 ? (
                    <ChartBox height={Math.max(300, Math.min(inventory.stockList.length, 15) * 38 + 80)}>
                      <BarChart
                        data={inventory.stockList.slice(0, 15)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 130, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                        <Tooltip {...TTP} formatter={v => [v, 'Units']} />
                        <Bar dataKey="stock" radius={[0, 6, 6, 0]}>
                          {inventory.stockList.slice(0, 15).map((p, i) => (
                            <Cell key={i} fill={p.status === 'out' ? '#ef4444' : p.status === 'low' ? '#f59e0b' : '#10b981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartBox>
                  ) : (
                    <Empty icon="📦" msg="No products found" />
                  )}
                </ChartCard>

                {inventory.lowStockItems?.length > 0 && (
                  <ChartCard wide title="⚠️ Low Stock Alerts" subtitle="Products that need restocking">
                    <div className="an-table-wrap">
                      <table className="an-table">
                        <thead>
                          <tr><th>Product</th><th>Category</th><th>Stock</th></tr>
                        </thead>
                        <tbody>
                          {inventory.lowStockItems.map((p, i) => (
                            <tr key={i}>
                              <td><strong>{p.name}</strong></td>
                              <td className="an-muted">{p.category || '—'}</td>
                              <td><strong style={{ color: '#f59e0b' }}>{p.stock} units</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ══ ABANDONED ══ */}
        {activeTab === 'abandoned' && (
          <motion.div
            key="ab"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {abandoned === null ? <TabLoader /> : (
              <>
                <div className="an-kpi-grid">
                  <StatCard delay={0} icon={<FaShoppingCart />} color="#ef4444" label="Abandoned Carts" value={fmt(abandoned.abandonedCount)} />
                  <StatCard delay={0.06} icon={<FaMoneyBillWave />} color="#f59e0b" label="Lost Revenue" value={fmtKes(abandoned.abandonedRevenue)} />
                  <StatCard delay={0.12} icon={<FaTimesCircle />} color="#8b5cf6" label="Abandonment Rate" value={fmtPct(abandoned.cartAbandonmentRate)} />
                  <StatCard delay={0.18} icon={<FaCheckCircle />} color="#10b981" label="Checkout Completion" value={fmtPct(abandoned.checkoutCompletionRate)} />
                </div>

                <ChartCard wide title="Daily Abandoned Carts" subtitle="Volume over time">
                  {abandoned.dailyAbandoned?.length > 0 ? (
                    <ChartBox height={280}>
                      <BarChart data={abandoned.dailyAbandoned} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip {...TTP} formatter={v => [v, 'Abandoned']} />
                        <Bar dataKey="count" fill="#ef4444" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ChartBox>
                  ) : (
                    <Empty icon="🛒" msg="No abandoned cart data" />
                  )}
                </ChartCard>

                {abandoned.recentAbandoned?.length > 0 && (
                  <ChartCard wide title="Recent Abandoned Orders">
                    <div className="an-table-wrap">
                      <table className="an-table">
                        <thead>
                          <tr><th>Order</th><th>Customer</th><th>Items</th><th>Value</th><th>Date</th></tr>
                        </thead>
                        <tbody>
                          {abandoned.recentAbandoned.map((o, i) => (
                            <tr key={i}>
                              <td><code style={{ color: '#D4AF37' }}>#{o.orderNumber}</code></td>
                              <td>
                                <strong>{o.customerName}</strong>
                                <div className="an-muted">{o.email}</div>
                              </td>
                              <td>{o.items} items</td>
                              <td><strong style={{ color: '#f59e0b' }}>{fmtKes(o.total)}</strong></td>
                              <td className="an-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ══ COUPONS ══ */}
        {activeTab === 'coupons' && (
          <motion.div
            key="co"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {coupons === null ? <TabLoader /> : (
              <>
                <div className="an-kpi-grid">
                  <StatCard delay={0} icon={<FaTag />} color="#D4AF37" label="Coupons Used" value={fmt(coupons.summary?.totalCouponsUsed)} />
                  <StatCard delay={0.06} icon={<FaTag />} color="#3b82f6" label="Unique Codes" value={fmt(coupons.summary?.uniqueCodes)} />
                  <StatCard delay={0.12} icon={<FaMoneyBillWave />} color="#ef4444" label="Discount Given" value={fmtKes(coupons.summary?.totalDiscountGiven)} />
                  <StatCard delay={0.18} icon={<FaCheckCircle />} color="#10b981" label="Coupon Revenue" value={fmtKes(coupons.summary?.totalCouponRevenue)} />
                </div>

                {coupons.coupons?.length > 0 ? (
                  <>
                    <ChartCard wide title="Coupon Performance" subtitle="Code usage &amp; revenue impact">
                      <div className="an-table-wrap">
                        <table className="an-table">
                          <thead>
                            <tr><th>Code</th><th>Uses</th><th>Discount Given</th><th>Revenue</th></tr>
                          </thead>
                          <tbody>
                            {coupons.coupons.map((c, i) => (
                              <tr key={i}>
                                <td><code style={{ color: '#D4AF37', fontWeight: 700 }}>{c.code}</code></td>
                                <td>{c.uses}×</td>
                                <td style={{ color: '#ef4444' }}>- {fmtKes(c.totalDiscount)}</td>
                                <td><strong>{fmtKes(c.totalRevenue)}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ChartCard>

                    <ChartCard wide title="Top Coupons by Usage">
                      <ChartBox height={280}>
                        <BarChart data={coupons.coupons.slice(0, 10)} margin={{ top: 10, right: 20, left: 5, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d2926" vertical={false} />
                          <XAxis dataKey="code" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip {...TTP} formatter={v => [v, 'Uses']} />
                          <Bar dataKey="uses" fill="#D4AF37" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ChartBox>
                    </ChartCard>
                  </>
                ) : (
                  <Empty icon="🏷️" msg="No coupons have been used yet" />
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ══ STATEMENTS ══ */}
        {activeTab === 'statements' && (
          <motion.div
            key="st"
            className="an-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ReportsManagement />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default Analytics;