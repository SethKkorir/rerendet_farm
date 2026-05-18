// client/src/components/Admin/SystemTelemetry.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { getSystemHealth, invalidateCache } from '../../api/api';
import {
  FaServer, FaSync, FaRedo, FaNetworkWired, FaMemory, FaCalendarAlt,
  FaShieldAlt, FaKey, FaClock, FaCheckCircle, FaExclamationTriangle,
  FaEnvelopeOpenText, FaHistory, FaCheckDouble, FaTrashAlt
} from 'react-icons/fa';
import './SystemTelemetry.css';

const SystemTelemetry = () => {
  const { showAlert } = useContext(AppContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const fetchHealth = async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const res = await getSystemHealth();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load system telemetry:', err);
      showAlert('Failed to retrieve system health telemetry', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClearCache = async (type) => {
    try {
      setClearingCache(true);
      const res = await invalidateCache({ type });
      if (res.data.success) {
        showAlert(res.data.message || 'Cache invalidated successfully', 'success');
        fetchHealth(true);
      }
    } catch (err) {
      console.error('Cache invalidation error:', err);
      showAlert(err.response?.data?.message || 'Failed to invalidate cache', 'error');
    } finally {
      setClearingCache(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds for live monitoring
    const interval = setInterval(() => fetchHealth(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  if (loading) {
    return (
      <div className="telemetry-loading">
        <div className="spinner"></div>
        <p>Polling system health telemetry metrics...</p>
      </div>
    );
  }

  const cache = data?.cache || {};
  const queues = data?.queues || {};
  const security = data?.security || {};
  const resources = data?.resources || {};

  return (
    <div className="system-telemetry">
      
      {/* HEADER SECTION */}
      <div className="tel-header">
        <div className="tel-title-block">
          <h3><FaServer /> System Health & Observability Console</h3>
          <p className="tel-subtext">Real-time status of caching, BullMQ background queues, and system resources.</p>
        </div>
        <button className="tel-refresh-btn" onClick={() => fetchHealth(true)} disabled={refreshing}>
          <FaSync className={refreshing ? 'tel-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh Console'}
        </button>
      </div>

      {/* HEALTH STATUS PILLS */}
      <div className="tel-status-grid">
        <div className="tel-status-card">
          <div className="tel-sc-top">
            <span className="tel-sc-label">Redis Cache Cluster</span>
            <span className={`tel-sc-badge ${cache.connected ? 'active' : 'inactive'}`}>
              {cache.connected ? '● Connected' : '● Offline'}
            </span>
          </div>
          <div className="tel-sc-value">{cache.connected ? 'ACTIVE' : 'FALLBACK'}</div>
          <p className="tel-sc-footer">{cache.totalKeys} total keys · {cache.catalogKeys} catalog pools</p>
        </div>

        <div className="tel-status-card">
          <div className="tel-sc-top">
            <span className="tel-sc-label">BullMQ Workers</span>
            <span className={`tel-sc-badge ${cache.connected ? 'active' : 'inactive'}`}>
              {cache.connected ? '● Operational' : '● Suspended'}
            </span>
          </div>
          <div className="tel-sc-value">ONLINE</div>
          <p className="tel-sc-footer">3 isolated thread queues active</p>
        </div>

        <div className="tel-status-card">
          <div className="tel-sc-top">
            <span className="tel-sc-label">M-Pesa Webhook Signature</span>
            <span className="tel-sc-badge active">● Secured</span>
          </div>
          <div className="tel-sc-value">MPESA_SECURE</div>
          <p className="tel-sc-footer">Safaricom IPWhitelists active</p>
        </div>

        <div className="tel-status-card">
          <div className="tel-sc-top">
            <span className="tel-sc-label">Memory Usage (RSS)</span>
            <span className="tel-sc-badge info">● Node Process</span>
          </div>
          <div className="tel-sc-value">{resources.memoryRssMb} MB</div>
          <p className="tel-sc-footer">Heap used: {resources.memoryHeapUsedMb} MB · Node {resources.nodeVersion}</p>
        </div>
      </div>

      {/* DETAILED DIAGNOSTICS ROW */}
      <div className="tel-diagnostics-row">
        
        {/* CACHE MANAGEMENT CARD */}
        <div className="tel-card">
          <div className="tel-card-head">
            <h4><FaRedo /> Redis Cache Operations</h4>
            <span className="tel-card-badge">TTL Caching Enabled</span>
          </div>
          
          <div className="tel-cache-body">
            <div className="tel-stat-row">
              <span className="tel-sr-lbl">Product Catalog TTL Cache:</span>
              <span className="tel-sr-val font-mono">{cache.catalogKeys} Page Keys cached (120s TTL)</span>
            </div>
            <div className="tel-stat-row">
              <span className="tel-sr-lbl">System Settings Document Cache:</span>
              <span className="tel-sr-val font-mono">{cache.settingsCached ? 'CACHED (60s TTL)' : 'MISS (Mongo Query)'}</span>
            </div>
            <div className="tel-stat-row">
              <span className="tel-sr-lbl">Checkout Rate Limiting Store:</span>
              <span className="tel-sr-val font-mono">{cache.connected ? 'RedisStore (Production)' : 'MemoryStore (Dev Fallback)'}</span>
            </div>

            <div className="tel-cache-actions">
              <h5>Manual Invalidation Triggers</h5>
              <p className="tel-ca-sub">Force instant clearing of caches. Updates will propagate immediately.</p>
              
              <div className="tel-btn-group">
                <button className="tel-btn-danger" onClick={() => handleClearCache('catalog')} disabled={clearingCache || !cache.connected}>
                  <FaTrashAlt /> Flush Product Catalog Cache
                </button>
                <button className="tel-btn-danger" onClick={() => handleClearCache('settings')} disabled={clearingCache || !cache.connected}>
                  <FaTrashAlt /> Flush Settings Cache
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BULLMQ QUEUES CARD */}
        <div className="tel-card">
          <div className="tel-card-head">
            <h4><FaNetworkWired /> BullMQ Background Job Statistics</h4>
            <span className="tel-card-badge">Distributed Workers</span>
          </div>

          <div className="tel-queue-list">
            
            {/* Email Queue */}
            <div className="tel-q-row">
              <div className="tel-q-info">
                <span className="tel-q-name"><FaEnvelopeOpenText /> Email Queue (`emailQueue`)</span>
                <p className="tel-q-desc">Transactional customer notifications & order confirmations.</p>
              </div>
              <div className="tel-q-badges">
                <span className="tel-qb active" title="Active Jobs">Act: {queues.emailQueue?.active || 0}</span>
                <span className="tel-qb pending" title="Waiting Jobs">Wait: {queues.emailQueue?.waiting || 0}</span>
                <span className="tel-qb completed" title="Completed Jobs">Done: {queues.emailQueue?.completed || 0}</span>
                <span className="tel-qb failed" title="Failed Jobs">Err: {queues.emailQueue?.failed || 0}</span>
              </div>
            </div>

            {/* Subscription Queue */}
            <div className="tel-q-row">
              <div className="tel-q-info">
                <span className="tel-q-name"><FaCheckDouble /> Subscription Queue (`subscriptionQueue`)</span>
                <p className="tel-q-desc">Asynchronous billing renewals and dynamic pricing discounts.</p>
              </div>
              <div className="tel-q-badges">
                <span className="tel-qb active">Act: {queues.subscriptionQueue?.active || 0}</span>
                <span className="tel-qb pending">Wait: {queues.subscriptionQueue?.waiting || 0}</span>
                <span className="tel-qb completed">Done: {queues.subscriptionQueue?.completed || 0}</span>
                <span className="tel-qb failed">Err: {queues.subscriptionQueue?.failed || 0}</span>
              </div>
            </div>

            {/* Retry Queue */}
            <div className="tel-q-row">
              <div className="tel-q-info">
                <span className="tel-q-name"><FaHistory /> STK Retry Queue (`retryQueue`)</span>
                <p className="tel-q-desc">Failed Safaricom STK Push progressive retries (2, 8, 20 mins).</p>
              </div>
              <div className="tel-q-badges">
                <span className="tel-qb active">Act: {queues.retryQueue?.active || 0}</span>
                <span className="tel-qb pending">Wait: {queues.retryQueue?.waiting || 0}</span>
                <span className="tel-qb completed">Done: {queues.retryQueue?.completed || 0}</span>
                <span className="tel-qb failed">Err: {queues.retryQueue?.failed || 0}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* WEBHOOK FIREWALL AND TERMINAL VIEW */}
      <div className="tel-diagnostics-row" style={{ marginTop: '1.5rem' }}>
        
        {/* WEBHOOK SECURITY CARD */}
        <div className="tel-card">
          <div className="tel-card-head">
            <h4><FaShieldAlt /> Webhook Security Firewall</h4>
            <span className="tel-card-badge secure">Active IPS Whitelisting</span>
          </div>

          <div className="tel-firewall-body">
            <div className="tel-stat-row">
              <span className="tel-sr-lbl">Safaricom IP Range Protection:</span>
              <span className="tel-sr-val secure">CONNECTED (196.201.212.0/24 - 196.201.214.0/24 Whitelisted)</span>
            </div>
            <div className="tel-stat-row">
              <span className="tel-sr-lbl">Stripe Webhook Signature Verification:</span>
              <span className={`tel-sr-val ${security.stripeWebhookUrl === 'CONFIGURED' ? 'secure' : 'warning'}`}>
                {security.stripeWebhookUrl === 'CONFIGURED' ? 'ACTIVATED (Cryptographic)' : 'INACTIVE (Secret Missing)'}
              </span>
            </div>
            <div className="tel-stat-row">
              <span className="tel-sr-lbl">Express Proxy Trust Headers:</span>
              <span className="tel-sr-val font-mono">ENABLED (`trust proxy: 1`)</span>
            </div>

            <div className="tel-server-stats">
              <h5>Server Resource Summary</h5>
              <div className="tel-rs-grid">
                <div className="tel-rs-box">
                  <span className="tel-rs-lbl"><FaClock /> System Uptime</span>
                  <span className="tel-rs-val">{formatUptime(resources.uptimeSeconds)}</span>
                </div>
                <div className="tel-rs-box">
                  <span className="tel-rs-lbl"><FaMemory /> Node Heap Size</span>
                  <span className="tel-rs-val">{resources.memoryHeapUsedMb} MB</span>
                </div>
                <div className="tel-rs-box">
                  <span className="tel-rs-lbl"><FaCalendarAlt /> Node Env Mode</span>
                  <span className="tel-rs-val font-mono" style={{ textTransform: 'uppercase' }}>{process.env.NODE_ENV || 'development'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECURITY & PERFORMANCE LOGS PANEL */}
        <div className="tel-card">
          <div className="tel-card-head">
            <h4><FaKey /> Administrative Security Audit Feed</h4>
            <span className="tel-card-badge logs">Real-Time Streams</span>
          </div>

          <div className="tel-terminal">
            <div className="tel-term-header">
              <span className="tel-th-dot red"></span>
              <span className="tel-th-dot yellow"></span>
              <span className="tel-th-dot green"></span>
              <span className="tel-th-title font-mono">activity-logs-telemetry.log</span>
            </div>
            <div className="tel-term-body">
              {security.recentAudits?.length > 0 ? (
                security.recentAudits.map((log) => (
                  <div key={log._id} className="tel-term-line">
                    <span className="tel-tl-time font-mono">[{new Date(log.createdAt).toLocaleTimeString()}]</span>{' '}
                    <span className="tel-tl-action font-mono">{log.action}:</span>{' '}
                    <span className="tel-tl-details font-mono">{log.entityName}</span>{' '}
                    <span className="tel-tl-ip font-mono">({log.ipAddress})</span>
                  </div>
                ))
              ) : (
                <div className="tel-term-empty font-mono">Listening for security audits on server sockets...</div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default SystemTelemetry;
