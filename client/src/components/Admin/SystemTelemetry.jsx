// client/src/components/Admin/SystemTelemetry.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { getSystemHealth, invalidateCache } from '../../api/api';
import {
  Server,
  Activity,
  Cpu,
  Database,
  Layers,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Repeat,
  RotateCcw,
  Shield
} from 'lucide-react';
import './SystemTelemetry.css';

const SystemTelemetry = () => {
  const { showAlert } = useContext(AppContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingCache, setClearingCache] = useState(null); // 'catalog' | 'settings' | 'all' | null
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHealth = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await getSystemHealth();
      if (res.data?.success) {
        setData(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load system telemetry:', err);
      showAlert('Unable to retrieve system health telemetry', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClearCache = async (type) => {
    try {
      setClearingCache(type);
      const res = await invalidateCache({ type });
      if (res.data?.success) {
        showAlert(res.data.message || `${type.toUpperCase()} cache cleared successfully`, 'success');
        fetchHealth(true);
      }
    } catch (err) {
      console.error('Cache invalidation error:', err);
      showAlert(err.response?.data?.message || 'Failed to invalidate cache', 'error');
    } finally {
      setClearingCache(null);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Live polling every 30 seconds
    const interval = setInterval(() => fetchHealth(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return '0s';
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  if (loading) {
    return (
      <div className="telemetry-loading">
        <div className="tel-spinner" />
        <p className="tel-loading-text">Polling system observability metrics...</p>
      </div>
    );
  }

  const cache = data?.cache || {};
  const queues = data?.queues || {};
  const security = data?.security || {};
  const resources = data?.resources || {};
  const uptimeStats = data?.uptimeStats || {};

  const totalWaiting =
    (queues.emailQueue?.waiting || 0) +
    (queues.subscriptionQueue?.waiting || 0) +
    (queues.retryQueue?.waiting || 0);

  const totalActive =
    (queues.emailQueue?.active || 0) +
    (queues.subscriptionQueue?.active || 0) +
    (queues.retryQueue?.active || 0);

  const totalCompleted =
    (queues.emailQueue?.completed || 0) +
    (queues.subscriptionQueue?.completed || 0) +
    (queues.retryQueue?.completed || 0);

  const totalFailed =
    (queues.emailQueue?.failed || 0) +
    (queues.subscriptionQueue?.failed || 0) +
    (queues.retryQueue?.failed || 0);

  const isHealthy =
    cache.connected !== false &&
    (!uptimeStats.uptimePercent || uptimeStats.uptimePercent >= 99);

  return (
    <div className="system-telemetry">

      {/* ─── HEADER BAR ─── */}
      <div className="tel-header">
        <div className="tel-title-group">
          <div className="tel-title-row">
            <h3 className="tel-heading">System Observability</h3>
            <span className={`tel-status-pill ${isHealthy ? 'healthy' : 'degraded'}`}>
              <span className="tel-pulse-dot" />
              {isHealthy ? 'All Systems Operational' : 'Degraded Performance'}
            </span>
          </div>
          <p className="tel-subheading">
            Live telemetry for Redis caching, BullMQ queues, MongoDB latency, and host resources.
          </p>
        </div>

        <div className="tel-actions">
          {lastUpdated && (
            <span className="tel-last-synced">
              <Clock size={13} />
              Synced {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            className="tel-btn-refresh"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            title="Poll live telemetry now"
          >
            <RefreshCw size={14} className={refreshing ? 'tel-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ─── TOP EXECUTIVE HEALTH GAUGES ─── */}
      <div className="tel-kpi-grid">

        {/* KPI 1: Uptime & Database */}
        <div className="tel-kpi-card">
          <div className="tel-kpi-top">
            <div className="tel-kpi-icon-wrap primary">
              <Database size={18} />
            </div>
            <span className="tel-badge-pill success">
              <CheckCircle2 size={12} /> Operational
            </span>
          </div>
          <div className="tel-kpi-metric">
            {uptimeStats.uptimePercent ?? 100}%
          </div>
          <div className="tel-kpi-title">24h Service Uptime</div>
          <div className="tel-kpi-foot">
            Avg DB latency: {uptimeStats.last24hAvgLatency?.mongodb ?? '< 5'}ms
          </div>
        </div>

        {/* KPI 2: Redis Distributed Cache */}
        <div className="tel-kpi-card">
          <div className="tel-kpi-top">
            <div className="tel-kpi-icon-wrap accent">
              <Layers size={18} />
            </div>
            <span className={`tel-badge-pill ${cache.connected ? 'success' : 'warning'}`}>
              {cache.connected ? 'Connected' : 'Fallback'}
            </span>
          </div>
          <div className="tel-kpi-metric">
            {cache.totalKeys ?? 0}
          </div>
          <div className="tel-kpi-title">Redis Cache Keys</div>
          <div className="tel-kpi-foot">
            {cache.catalogKeys ?? 0} catalog pools · {cache.settingsCached ? 'Settings cached' : 'Direct DB'}
          </div>
        </div>

        {/* KPI 3: Background BullMQ Workers */}
        <div className="tel-kpi-card">
          <div className="tel-kpi-top">
            <div className="tel-kpi-icon-wrap gold">
              <Zap size={18} />
            </div>
            <span className={`tel-badge-pill ${totalFailed > 0 ? 'warning' : 'success'}`}>
              {totalFailed > 0 ? `${totalFailed} Failed` : 'Healthy'}
            </span>
          </div>
          <div className="tel-kpi-metric">
            {totalWaiting + totalActive}
          </div>
          <div className="tel-kpi-title">In-Flight Queue Jobs</div>
          <div className="tel-kpi-foot">
            {totalCompleted} completed · {totalActive} running
          </div>
        </div>

        {/* KPI 4: Node Memory & Uptime */}
        <div className="tel-kpi-card">
          <div className="tel-kpi-top">
            <div className="tel-kpi-icon-wrap muted">
              <Cpu size={18} />
            </div>
            <span className="tel-badge-pill neutral">
              {resources.nodeVersion || 'Node.js'}
            </span>
          </div>
          <div className="tel-kpi-metric">
            {resources.memoryHeapUsedMb ?? 0} MB
          </div>
          <div className="tel-kpi-title">Heap Memory Used</div>
          <div className="tel-kpi-foot">
            RSS: {resources.memoryRssMb ?? 0} MB · Uptime: {formatUptime(resources.uptimeSeconds)}
          </div>
        </div>

      </div>

      {/* ─── ROW 2: QUEUE WORKERS & CACHE MANAGEMENT ─── */}
      <div className="tel-split-grid">

        {/* LEFT COLUMN: BULLMQ QUEUE WORKERS */}
        <div className="tel-panel">
          <div className="tel-panel-head">
            <div className="tel-panel-title">
              <Activity size={18} className="tel-icon-accent" />
              <div>
                <h4>BullMQ Background Queues</h4>
                <p>Distributed asynchronous background workers</p>
              </div>
            </div>
            <span className="tel-panel-badge">3 Workers Active</span>
          </div>

          <div className="tel-queues-list">

            {/* Queue 1: Email Queue */}
            <div className="tel-queue-item">
              <div className="tel-qi-header">
                <div className="tel-qi-info">
                  <div className="tel-qi-title">
                    <Mail size={15} />
                    <span>Email Dispatcher</span>
                    <code>emailQueue</code>
                  </div>
                  <p className="tel-qi-sub">Order confirmations, receipts & customer communications</p>
                </div>
              </div>
              <div className="tel-qi-stats">
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Active</span>
                  <span className="tel-sp-val active">{queues.emailQueue?.active ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Waiting</span>
                  <span className="tel-sp-val waiting">{queues.emailQueue?.waiting ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Completed</span>
                  <span className="tel-sp-val completed">{queues.emailQueue?.completed ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Failed</span>
                  <span className={`tel-sp-val ${queues.emailQueue?.failed > 0 ? 'failed' : 'neutral'}`}>
                    {queues.emailQueue?.failed ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Queue 2: Subscription Queue */}
            <div className="tel-queue-item">
              <div className="tel-qi-header">
                <div className="tel-qi-info">
                  <div className="tel-qi-title">
                    <Repeat size={15} />
                    <span>Subscription Scheduler</span>
                    <code>subscriptionQueue</code>
                  </div>
                  <p className="tel-qi-sub">Automated recurring coffee deliveries & renewal invoicing</p>
                </div>
              </div>
              <div className="tel-qi-stats">
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Active</span>
                  <span className="tel-sp-val active">{queues.subscriptionQueue?.active ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Waiting</span>
                  <span className="tel-sp-val waiting">{queues.subscriptionQueue?.waiting ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Completed</span>
                  <span className="tel-sp-val completed">{queues.subscriptionQueue?.completed ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Failed</span>
                  <span className={`tel-sp-val ${queues.subscriptionQueue?.failed > 0 ? 'failed' : 'neutral'}`}>
                    {queues.subscriptionQueue?.failed ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Queue 3: STK Retry Queue */}
            <div className="tel-queue-item">
              <div className="tel-qi-header">
                <div className="tel-qi-info">
                  <div className="tel-qi-title">
                    <RotateCcw size={15} />
                    <span>M-Pesa STK Retry Loop</span>
                    <code>retryQueue</code>
                  </div>
                  <p className="tel-qi-sub">Progressive exponential retries for checkout payment authorizations</p>
                </div>
              </div>
              <div className="tel-qi-stats">
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Active</span>
                  <span className="tel-sp-val active">{queues.retryQueue?.active ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Waiting</span>
                  <span className="tel-sp-val waiting">{queues.retryQueue?.waiting ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Completed</span>
                  <span className="tel-sp-val completed">{queues.retryQueue?.completed ?? 0}</span>
                </div>
                <div className="tel-stat-pill">
                  <span className="tel-sp-label">Failed</span>
                  <span className={`tel-sp-val ${queues.retryQueue?.failed > 0 ? 'failed' : 'neutral'}`}>
                    {queues.retryQueue?.failed ?? 0}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: REDIS CACHE MANAGEMENT */}
        <div className="tel-panel">
          <div className="tel-panel-head">
            <div className="tel-panel-title">
              <Layers size={18} className="tel-icon-accent" />
              <div>
                <h4>Redis Distributed Cache</h4>
                <p>In-memory data store & high-speed TTL pools</p>
              </div>
            </div>
            <span className={`tel-status-tag ${cache.connected ? 'active' : 'warn'}`}>
              {cache.connected ? 'Redis Connected' : 'Memory Fallback'}
            </span>
          </div>

          <div className="tel-cache-content">
            <div className="tel-detail-list">
              <div className="tel-detail-row">
                <div className="tel-detail-meta">
                  <span className="tel-dm-title">Product Catalog Store</span>
                  <span className="tel-dm-sub">Cached product pages and category trees (120s TTL)</span>
                </div>
                <div className="tel-detail-val">
                  <code>{cache.catalogKeys ?? 0} Keys Active</code>
                </div>
              </div>

              <div className="tel-detail-row">
                <div className="tel-detail-meta">
                  <span className="tel-dm-title">Application Settings Document</span>
                  <span className="tel-dm-sub">Global configuration & delivery parameters</span>
                </div>
                <div className="tel-detail-val">
                  <span className={`tel-tag ${cache.settingsCached ? 'success' : 'neutral'}`}>
                    {cache.settingsCached ? 'Cached (Redis)' : 'MongoDB Direct'}
                  </span>
                </div>
              </div>

              <div className="tel-detail-row">
                <div className="tel-detail-meta">
                  <span className="tel-dm-title">Checkout Rate Limiter</span>
                  <span className="tel-dm-sub">Protection against automated brute-force attempts</span>
                </div>
                <div className="tel-detail-val">
                  <code>{cache.connected ? 'RedisStore' : 'MemoryStore Fallback'}</code>
                </div>
              </div>
            </div>

            {/* Cache Flush Controls */}
            <div className="tel-cache-actions-box">
              <div className="tel-cab-header">
                <div>
                  <h5>Cache Invalidation Controls</h5>
                  <p>Immediately purges key stores to refresh live storefront data.</p>
                </div>
              </div>

              <div className="tel-flush-btn-group">
                <button
                  className="tel-flush-btn"
                  onClick={() => handleClearCache('catalog')}
                  disabled={clearingCache !== null || !cache.connected}
                >
                  <Trash2 size={13} />
                  <span>{clearingCache === 'catalog' ? 'Flushing...' : 'Flush Catalog Cache'}</span>
                </button>

                <button
                  className="tel-flush-btn"
                  onClick={() => handleClearCache('settings')}
                  disabled={clearingCache !== null || !cache.connected}
                >
                  <Trash2 size={13} />
                  <span>{clearingCache === 'settings' ? 'Flushing...' : 'Flush Settings Cache'}</span>
                </button>

                <button
                  className="tel-flush-btn secondary"
                  onClick={() => handleClearCache('all')}
                  disabled={clearingCache !== null || !cache.connected}
                >
                  <RefreshCw size={13} className={clearingCache === 'all' ? 'tel-spin' : ''} />
                  <span>{clearingCache === 'all' ? 'Purging All...' : 'Purge All Caches'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ─── ROW 3: SECURITY PERIMETER & AUDIT FEED ─── */}
      <div className="tel-split-grid">

        {/* SECURITY PERIMETER */}
        <div className="tel-panel">
          <div className="tel-panel-head">
            <div className="tel-panel-title">
              <ShieldCheck size={18} className="tel-icon-accent" />
              <div>
                <h4>Security & Perimeter Firewall</h4>
                <p>Webhook cryptographic signatures and IP boundary rules</p>
              </div>
            </div>
            <span className="tel-badge-pill success">Protected</span>
          </div>

          <div className="tel-security-list">
            <div className="tel-sec-row">
              <div className="tel-sec-icon">
                <Shield size={16} />
              </div>
              <div className="tel-sec-info">
                <span className="tel-sec-name">Safaricom Daraja IP Whitelisting</span>
                <span className="tel-sec-desc">
                  Strict boundary validation on <code>196.201.212.0/24 - 196.201.214.0/24</code>
                </span>
              </div>
              <span className="tel-badge-pill success">Active Whitelist</span>
            </div>

            <div className="tel-sec-row">
              <div className="tel-sec-icon">
                <ShieldCheck size={16} />
              </div>
              <div className="tel-sec-info">
                <span className="tel-sec-name">Stripe Webhook Verification</span>
                <span className="tel-sec-desc">Cryptographic HMAC-SHA256 signature checking</span>
              </div>
              <span className={`tel-badge-pill ${security.stripeWebhookUrl === 'CONFIGURED' ? 'success' : 'neutral'}`}>
                {security.stripeWebhookUrl === 'CONFIGURED' ? 'Verified' : 'Inactive'}
              </span>
            </div>

            <div className="tel-sec-row">
              <div className="tel-sec-icon">
                <Server size={16} />
              </div>
              <div className="tel-sec-info">
                <span className="tel-sec-name">Reverse Proxy Trust Headers</span>
                <span className="tel-sec-desc">Configured for SSL termination and genuine client IP routing</span>
              </div>
              <span className="tel-badge-pill neutral">trust proxy: 1</span>
            </div>
          </div>
        </div>

        {/* SECURITY & ACTIVITY AUDIT STREAM */}
        <div className="tel-panel">
          <div className="tel-panel-head">
            <div className="tel-panel-title">
              <Activity size={18} className="tel-icon-accent" />
              <div>
                <h4>Live Administrative Audit Stream</h4>
                <p>Recent authentication, settings adjustments, and security triggers</p>
              </div>
            </div>
            <span className="tel-panel-badge">{security.recentAudits?.length || 0} Entries</span>
          </div>

          <div className="tel-audit-stream">
            {security.recentAudits && security.recentAudits.length > 0 ? (
              <div className="tel-audit-list">
                {security.recentAudits.map((log) => (
                  <div key={log._id} className="tel-audit-item">
                    <div className="tel-ai-left">
                      <span className="tel-ai-time">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className={`tel-ai-action ${getActionClass(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="tel-ai-center">
                      <span className="tel-ai-details">{log.entityName || log.details || 'Admin action'}</span>
                    </div>
                    <div className="tel-ai-right">
                      <code className="tel-ai-ip">{log.ipAddress || '127.0.0.1'}</code>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tel-audit-empty">
                <CheckCircle2 size={24} />
                <p>No anomalous security audits or policy violations detected.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

// Helper for audit badges
const getActionClass = (action) => {
  if (!action) return 'neutral';
  if (action.includes('BLOCKED') || action.includes('ERROR') || action.includes('FAILED')) return 'danger';
  if (action.includes('LOGIN') || action.includes('AUTH')) return 'primary';
  if (action.includes('UPDATE') || action.includes('SETTINGS')) return 'warning';
  return 'neutral';
};

export default SystemTelemetry;
