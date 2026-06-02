// client/src/components/Admin/ActivityLogsHardened.jsx - GRANULAR ACTIVITY FEED (GAP 3)
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import moment from 'moment';
import './ActivityLogs.css';

export const ActivityLogsHardened = () => {
  const { token } = useContext(AppContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    actionCategory: '',
    startDate: '',
    endDate: '',
    page: 1
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  const fetchLogs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const query = new URLSearchParams(filters).toString();
      const res = await fetch(`/api/admin/audit-log?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs || []);
        setPagination(data.data.pagination || { page: 1, pages: 1 });
      }
    } catch (err) {
      console.error('Failed to load activity feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, token]);

  const handlePageChange = (newPage) => {
    setFilters(p => ({ ...p, page: newPage }));
  };

  return (
    <div className="activity-logs-container" style={{ padding: '2rem', color: '#e4e4e7', background: '#09090b' }}>
      <h2>Operational Audit Logs Feed</h2>
      <p style={{ color: '#71717a', marginBottom: '2rem' }}>Comprehensive append-only audit trail and incident anomalies detection.</p>

      {/* Filter panel */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#18181b', padding: '1rem', borderRadius: '8px', border: '1px solid #27272a' }}>
        <select
          value={filters.actionCategory}
          onChange={e => setFilters(p => ({ ...p, actionCategory: e.target.value, page: 1 }))}
          style={{ background: '#09090b', color: '#e4e4e7', border: '1px solid #27272a', padding: '0.5rem', borderRadius: '6px' }}
        >
          <option value="">All Categories</option>
          <option value="order_mutation">Order Mutations</option>
          <option value="payment_mutation">Payment Overrides</option>
          <option value="user_mutation">User Configurations</option>
          <option value="inventory_mutation">Inventory Adjustments</option>
          <option value="security_event">Security Incidents</option>
          <option value="system_event">Operational Controls</option>
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={e => setFilters(p => ({ ...p, startDate: e.target.value, page: 1 }))}
          style={{ background: '#09090b', color: '#e4e4e7', border: '1px solid #27272a', padding: '0.5rem', borderRadius: '6px' }}
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={e => setFilters(p => ({ ...p, endDate: e.target.value, page: 1 }))}
          style={{ background: '#09090b', color: '#e4e4e7', border: '1px solid #27272a', padding: '0.5rem', borderRadius: '6px' }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#18181b', borderRadius: '8px' }}>
          Querying activity feed logs...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#18181b', borderRadius: '8px' }}>
          No audit records matched filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {logs.map(log => (
            <div key={log._id} style={{ background: '#18181b', border: '1px solid #27272a', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#d4af37' }}>{log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : 'System'}</strong>
                <span style={{ margin: '0 0.5rem', color: '#71717a' }}>•</span>
                <span>{log.action}</span>
                {log.entityId && (
                  <span style={{ fontSize: '0.8rem', color: '#71717a', marginLeft: '0.5rem' }}>
                    (Entity: <a href={`/admin/orders/${log.entityId}`} style={{ color: '#d4af37', textDecoration: 'none' }}>{log.entityId}</a>)
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#71717a' }}>
                <div>{log.ipAddress}</div>
                <div>{moment(log.createdAt).format('lll')}</div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1}
              style={{ background: '#27272a', border: 'none', color: '#e4e4e7', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center' }}>Page {pagination.page} of {pagination.pages}</span>
            <button
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= pagination.pages}
              style={{ background: '#27272a', border: 'none', color: '#e4e4e7', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogsHardened;
