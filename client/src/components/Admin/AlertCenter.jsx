// client/src/components/Admin/AlertCenter.jsx — Prestige Admin Notification Center
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { getAdminAlerts, resolveAdminAlert, resolveAllAdminAlerts } from '../../api/api';
import {
  X,
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import moment from 'moment';
import './AlertCenter.css';

export const AlertCenter = ({ isOpen, onClose }) => {
  const { token, user, showAlert } = useContext(AppContext);
  const [alerts, setAlerts] = useState({ critical: [], warning: [], info: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'critical' | 'warning' | 'info'
  const [resolvingId, setResolvingId] = useState(null);
  const [resolvingAll, setResolvingAll] = useState(false);

  const fetchAlerts = async () => {
    if (!token || !user) return;
    const isAdmin = user.userType === 'admin' || ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(user.role);
    if (!isAdmin) return;

    try {
      const res = await getAdminAlerts();
      if (res.data?.success) {
        setAlerts(res.data.data || { critical: [], warning: [], info: [] });
      }
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error('Failed to load active system alerts:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, token, user]);

  // Periodic polling only when drawer is visibly open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleResolveAlert = async (id) => {
    try {
      setResolvingId(id);
      const res = await resolveAdminAlert(id);
      if (res.data?.success) {
        // Optimistic remove
        setAlerts((prev) => ({
          critical: prev.critical.filter((a) => a._id !== id),
          warning: prev.warning.filter((a) => a._id !== id),
          info: prev.info.filter((a) => a._id !== id)
        }));
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
      showAlert('Failed to resolve alert', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAllAlerts = async () => {
    try {
      setResolvingAll(true);
      const payload = activeTab === 'all' ? {} : { type: activeTab };
      const res = await resolveAllAdminAlerts(payload);
      if (res.data?.success) {
        showAlert(res.data.message || 'Alerts resolved successfully', 'success');
        if (activeTab === 'all') {
          setAlerts({ critical: [], warning: [], info: [] });
        } else {
          setAlerts((prev) => ({
            ...prev,
            [activeTab]: []
          }));
        }
      }
    } catch (err) {
      console.error('Error bulk resolving alerts:', err);
      showAlert('Failed to resolve alerts', 'error');
    } finally {
      setResolvingAll(false);
    }
  };

  const criticalCount = alerts.critical?.length || 0;
  const warningCount = alerts.warning?.length || 0;
  const infoCount = alerts.info?.length || 0;
  const totalCount = criticalCount + warningCount + infoCount;

  const filteredAlerts = useMemo(() => {
    if (activeTab === 'critical') return alerts.critical.map((a) => ({ ...a, tier: 'critical' }));
    if (activeTab === 'warning') return alerts.warning.map((a) => ({ ...a, tier: 'warning' }));
    if (activeTab === 'info') return alerts.info.map((a) => ({ ...a, tier: 'info' }));

    // All alerts sorted newest first
    const list = [
      ...alerts.critical.map((a) => ({ ...a, tier: 'critical' })),
      ...alerts.warning.map((a) => ({ ...a, tier: 'warning' })),
      ...alerts.info.map((a) => ({ ...a, tier: 'info' }))
    ];
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [alerts, activeTab]);

  if (!isOpen) return null;

  return (
    <>
      <div className="alert-center-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="alert-center-drawer" role="dialog" aria-modal="true" aria-label="Alerts & Notifications">
        
        {/* DRAWER HEADER */}
        <div className="ac-header">
          <div className="ac-title-wrap">
            <div className="ac-icon-badge">
              <Bell size={18} />
            </div>
            <div>
              <h3>Notifications & Alerts</h3>
              <p className="ac-subhead">
                {totalCount === 0 ? 'All systems nominal' : `${totalCount} active items require attention`}
              </p>
            </div>
          </div>
          <button className="ac-close-btn" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        {/* FILTER TABS */}
        <div className="ac-tabs-bar">
          <button
            className={`ac-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All <span className="ac-count-pill">{totalCount}</span>
          </button>
          <button
            className={`ac-tab ${activeTab === 'critical' ? 'active' : ''}`}
            onClick={() => setActiveTab('critical')}
          >
            Critical <span className="ac-count-pill crit">{criticalCount}</span>
          </button>
          <button
            className={`ac-tab ${activeTab === 'warning' ? 'active' : ''}`}
            onClick={() => setActiveTab('warning')}
          >
            Warnings <span className="ac-count-pill warn">{warningCount}</span>
          </button>
          <button
            className={`ac-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info <span className="ac-count-pill inf">{infoCount}</span>
          </button>
        </div>

        {/* BULK ACTIONS BAR */}
        {filteredAlerts.length > 0 && (
          <div className="ac-action-strip">
            <span className="ac-strip-info">
              Showing {filteredAlerts.length} {activeTab === 'all' ? 'active' : activeTab} alert{filteredAlerts.length === 1 ? '' : 's'}
            </span>
            <button
              className="ac-btn-resolve-all"
              onClick={handleResolveAllAlerts}
              disabled={resolvingAll}
            >
              <CheckCheck size={14} />
              <span>{resolvingAll ? 'Resolving...' : 'Resolve All'}</span>
            </button>
          </div>
        )}

        {/* ALERTS FEED CONTAINER */}
        <div className="ac-body">
          {loading ? (
            <div className="ac-loading-state">
              <div className="ac-spinner" />
              <p>Fetching active alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="ac-empty-state">
              <div className="ac-empty-icon-wrap">
                <ShieldCheck size={32} />
              </div>
              <h4>All Systems Clear</h4>
              <p>No unresolved {activeTab !== 'all' ? activeTab : ''} alerts found. Everything is operating smoothly.</p>
            </div>
          ) : (
            <div className="ac-list">
              {filteredAlerts.map((alert) => (
                <div key={alert._id} className={`ac-card ${alert.tier}`}>
                  <div className="ac-card-top">
                    <div className="ac-card-badge-row">
                      <span className={`ac-tier-tag ${alert.tier}`}>
                        {alert.tier === 'critical' && <AlertOctagon size={12} />}
                        {alert.tier === 'warning' && <AlertTriangle size={12} />}
                        {alert.tier === 'info' && <Info size={12} />}
                        {alert.tier}
                      </span>
                      <span className="ac-time">
                        {moment(alert.createdAt).fromNow()}
                      </span>
                    </div>

                    <button
                      className="ac-card-resolve-btn"
                      onClick={() => handleResolveAlert(alert._id)}
                      disabled={resolvingId === alert._id}
                      title="Mark as resolved"
                    >
                      <Check size={13} />
                      <span>{resolvingId === alert._id ? 'Resolving...' : 'Resolve'}</span>
                    </button>
                  </div>

                  <p className="ac-message">{alert.message}</p>

                  {(alert.orderId || alert.productId) && (
                    <div className="ac-card-links">
                      {alert.orderId && (
                        <a
                          href={`/admin/orders/${typeof alert.orderId === 'object' ? alert.orderId._id : alert.orderId}`}
                          className="ac-link-pill"
                        >
                          <span>View Order</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                      {alert.productId && (
                        <a href="/admin/products" className="ac-link-pill">
                          <span>Manage Stock</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </aside>
    </>
  );
};

export default AlertCenter;
