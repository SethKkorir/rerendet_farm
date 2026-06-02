// client/src/components/Admin/ActiveSessionsHardened.jsx - CONCURRENT SESSION CONTROL PANEL (GAP 7)
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import moment from 'moment';
import './Settings.css';

export const ActiveSessionsHardened = () => {
  const { token, showAlert, user } = useContext(AppContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load active sessions feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [token]);

  const revokeSession = async (jti) => {
    if (!window.confirm('Are you sure you want to terminate this session remotely?')) return;
    try {
      const res = await fetch(`/api/admin/sessions/${jti}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Session terminated successfully', 'success');
        fetchSessions();
      }
    } catch (err) {
      showAlert('Failed to terminate session', 'error');
    }
  };

  const revokeAllOthers = async () => {
    if (!window.confirm('Are you sure you want to terminate all other devices logged in to your account?')) return;
    try {
      const res = await fetch('/api/admin/sessions/mine/all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Successfully terminated all other active devices.', 'success');
        fetchSessions();
      }
    } catch (err) {
      showAlert('Failed to terminate other sessions', 'error');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#e4e4e7' }}>Querying active device sessions...</div>;

  return (
    <div className="active-sessions-page" style={{ padding: '2rem', color: '#e4e4e7', background: '#09090b', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Concurrent Active Sessions</h2>
          <p style={{ color: '#71717a', margin: '0' }}>Enforce concurrent security controls and view real-time login fingerprints.</p>
        </div>
        <button onClick={revokeAllOthers} style={{ background: '#ef4444', border: 'none', color: '#ffffff', padding: '0.6rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Revoke All My Other Sessions
        </button>
      </div>

      <div className="ih-table-wrapper">
        <table className="ih-table">
          <thead>
            <tr>
              <th>Admin Name</th>
              <th>Device Fingerprint</th>
              <th>IP Address</th>
              <th>Last Activity</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(sess => {
              const isAdminSelf = sess.adminId?._id === user?.id;
              
              // Standard parse human readable device strings
              const isCurrent = sess.jti === user?.jti;

              return (
                <tr key={sess._id}>
                  <td>
                    <strong>{sess.adminId ? `${sess.adminId.firstName} ${sess.adminId.lastName}` : 'System'}</strong>
                    {sess.adminId && <div style={{ fontSize: '0.75rem', color: '#71717a' }}>{sess.adminId.email}</div>}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#a1a1aa', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sess.deviceInfo}
                  </td>
                  <td>{sess.ipAddress}</td>
                  <td>{moment(sess.lastActivityAt).fromNow()}</td>
                  <td>{moment(sess.createdAt).format('lll')}</td>
                  <td>
                    {isCurrent ? (
                      <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.85rem' }}>This session</span>
                    ) : (
                      <button
                        onClick={() => revokeSession(sess.jti)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActiveSessionsHardened;
