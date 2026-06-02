// client/src/components/Admin/AlertCenter.jsx - REACT DRAWER AND INTEGRATIONS (GAP 1)
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaTimes, FaBell, FaInfoCircle, FaExclamationTriangle, FaTimesCircle, FaCheck } from 'react-icons/fa';
import moment from 'moment';
import './AlertCenter.css';

export const AlertCenter = ({ isOpen, onClose }) => {
  const { token } = useContext(AppContext);
  const [alerts, setAlerts] = useState({ critical: [], warning: [], info: [] });
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (err) {
      console.error('Failed to load active system alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const resolveAlert = async (id) => {
    try {
      const res = await fetch(`/api/admin/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchAlerts();
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="alert-center-overlay" onClick={onClose} />
      <div className="alert-center-drawer">
        <div className="drawer-header">
          <h2>Alert Center</h2>
          <button className="close-drawer-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="drawer-content">
          {loading ? (
            <div className="alert-empty-state">
              <span className="loading-spinner" />
              <p>Fetching active security alerts...</p>
            </div>
          ) : (
            <>
              {/* CRITICAL ALERTS */}
              <div className="alert-section critical">
                <div className="alert-section-title">Critical — Requires Immediate Action</div>
                {alerts.critical.length === 0 ? (
                  <div className="alert-empty-state">
                    <FaCheck className="alert-empty-icon" style={{ color: '#10b981' }} />
                    <p>No critical active alerts</p>
                  </div>
                ) : (
                  alerts.critical.map(alert => (
                    <div key={alert._id} className="alert-card critical-card">
                      <div className="alert-card-header">
                        <p className="alert-message">{alert.message}</p>
                        <div className="pulsing-dot" />
                      </div>
                      <span className="alert-timestamp">{moment(alert.createdAt).fromNow()}</span>
                      <div className="alert-card-actions">
                        {alert.orderId && (
                          <a href={`/admin/orders/${alert.orderId}`} className="alert-link">
                            View Order
                          </a>
                        )}
                        <button className="resolve-alert-btn" onClick={() => resolveAlert(alert._id)}>
                          Mark Resolved
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* WARNING ALERTS */}
              <div className="alert-section warning">
                <div className="alert-section-title">Warnings — Requires Attention</div>
                {alerts.warning.length === 0 ? (
                  <div className="alert-empty-state">
                    <FaCheck className="alert-empty-icon" style={{ color: '#10b981' }} />
                    <p>No active warnings</p>
                  </div>
                ) : (
                  alerts.warning.map(alert => (
                    <div key={alert._id} className="alert-card warning-card">
                      <div className="alert-card-header">
                        <p className="alert-message">{alert.message}</p>
                      </div>
                      <span className="alert-timestamp">{moment(alert.createdAt).fromNow()}</span>
                      <div className="alert-card-actions">
                        {alert.orderId && (
                          <a href={`/admin/orders/${alert.orderId}`} className="alert-link">
                            View Order
                          </a>
                        )}
                        {alert.productId && (
                          <a href={`/admin/products`} className="alert-link">
                            Manage Stock
                          </a>
                        )}
                        <button className="resolve-alert-btn" onClick={() => resolveAlert(alert._id)}>
                          Mark Resolved
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* INFO ALERTS */}
              <div className="alert-section info">
                <div className="alert-section-title">Info — New Activity</div>
                {alerts.info.length === 0 ? (
                  <div className="alert-empty-state">
                    <FaCheck className="alert-empty-icon" style={{ color: '#71717a' }} />
                    <p>No new activity logs</p>
                  </div>
                ) : (
                  alerts.info.map(alert => (
                    <div key={alert._id} className="alert-card info-card">
                      <div className="alert-card-header">
                        <p className="alert-message">{alert.message}</p>
                      </div>
                      <span className="alert-timestamp">{moment(alert.createdAt).fromNow()}</span>
                      <div className="alert-card-actions">
                        {alert.orderId && (
                          <a href={`/admin/orders/${alert.orderId}`} className="alert-link">
                            View Order
                          </a>
                        )}
                        <button className="resolve-alert-btn" onClick={() => resolveAlert(alert._id)}>
                          Mark Resolved
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AlertCenter;
