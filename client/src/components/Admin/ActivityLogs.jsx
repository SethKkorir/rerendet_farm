import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { 
  getActivityLogs, 
  getAdminSessions, 
  revokeAdminSession, 
  revokeAllOtherAdminSessions 
} from '../../api/api';
import moment from 'moment';
import { 
  FaHistory, 
  FaUserShield, 
  FaDesktop, 
  FaMobileAlt, 
  FaShieldAlt, 
  FaSync, 
  FaSearch, 
  FaFilter, 
  FaTimes, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaCalendarAlt,
  FaChevronDown,
  FaChevronUp,
  FaLock,
  FaSignOutAlt,
  FaGlobe
} from 'react-icons/fa';
import './ActivityLogs.css';

const ActivityLogs = () => {
  const { user, token, showAlert, showNotification } = useContext(AppContext);
  const notify = showAlert || showNotification;

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'sessions' ? 'sessions' : 'activity';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'sessions' && activeTab !== 'sessions') {
      setActiveTab('sessions');
    } else if (tabFromUrl === 'activity' && activeTab !== 'activity') {
      setActiveTab('activity');
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'sessions' ? { tab: 'sessions' } : { tab: 'activity' });
  };

  // ══════════════════════════════════════════════════════════════════════
  // TAB 1: AUDIT & ACTIVITY LOGS STATE
  // ══════════════════════════════════════════════════════════════════════
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionCategory, setActionCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const params = {
        pageNumber: page,
        limit,
        search: searchQuery,
        actionCategory,
        startDate,
        endDate
      };

      const res = await getActivityLogs(params);
      if (res.data?.success) {
        setLogs(res.data.data || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total ?? (res.data.data ? res.data.data.length : 0));
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
      if (notify) notify('Failed to fetch activity logs', 'error');
    } finally {
      setLogsLoading(false);
    }
  }, [page, limit, searchQuery, actionCategory, startDate, endDate, notify]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Search input submit / debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setActionCategory('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery || actionCategory || startDate || endDate);

  // ══════════════════════════════════════════════════════════════════════
  // TAB 2: ACTIVE SESSIONS STATE
  // ══════════════════════════════════════════════════════════════════════
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingJti, setRevokingJti] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    try {
      setSessionsLoading(true);
      const res = await getAdminSessions();
      if (res.data?.success) {
        setSessions(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load active sessions:', err);
      if (notify) notify('Failed to load active sessions', 'error');
    } finally {
      setSessionsLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  const handleRevokeSession = async (jti) => {
    if (!window.confirm('Are you sure you want to terminate this session remotely?')) return;
    try {
      setRevokingJti(jti);
      const res = await revokeAdminSession(jti);
      if (res.data?.success) {
        if (notify) notify('Session terminated successfully', 'success');
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to terminate session:', err);
      if (notify) notify(err.response?.data?.message || 'Failed to terminate session', 'error');
    } finally {
      setRevokingJti(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!window.confirm('Are you sure you want to terminate all other active devices logged into your admin account?')) return;
    try {
      setRevokingAll(true);
      const res = await revokeAllOtherAdminSessions();
      if (res.data?.success) {
        if (notify) notify(res.data.message || 'Successfully terminated other active sessions.', 'success');
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to terminate other sessions:', err);
      if (notify) notify(err.response?.data?.message || 'Failed to terminate other sessions', 'error');
    } finally {
      setRevokingAll(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  // HELPER FORMATTERS
  // ══════════════════════════════════════════════════════════════════════
  const getActionBadgeClass = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('REVOKE') || act.includes('REMOVE') || act.includes('ALERT') || act.includes('FAIL')) {
      return 'badge-danger';
    }
    if (act.includes('UPDATE') || act.includes('MUTATION') || act.includes('OVERRIDE') || act.includes('EDIT')) {
      return 'badge-warning';
    }
    if (act.includes('CREATE') || act.includes('LOGIN') || act.includes('SUCCESS') || act.includes('ADD')) {
      return 'badge-success';
    }
    return 'badge-info';
  };

  const getDeviceIcon = (deviceInfo = '') => {
    const dev = (deviceInfo || '').toLowerCase();
    if (dev.includes('mobile') || dev.includes('iphone') || dev.includes('android')) {
      return <FaMobileAlt className="device-icon" />;
    }
    return <FaDesktop className="device-icon" />;
  };

  // Quick stats computed from current logs
  const securityAlertCount = useMemo(() => {
    return logs.filter(l => 
      l.details?.actionCategory === 'security_event' || 
      (l.action || '').toLowerCase().includes('revoke') ||
      (l.action || '').toLowerCase().includes('delete')
    ).length;
  }, [logs]);

  return (
    <div className="security-activity-hub">
      {/* ─── Top Page Header ───────────────────────────────────── */}
      <div className="hub-header">
        <div className="hub-title-area">
          <div className="hub-icon-badge">
            <FaShieldAlt />
          </div>
          <div>
            <h1 className="hub-title">Security & Activity Logs</h1>
            <p className="hub-subtitle">
              Unified control center for operational audit trails, incident detection, and active admin sessions.
            </p>
          </div>
        </div>

        <div className="hub-actions">
          <button 
            className="btn-hub-refresh" 
            onClick={activeTab === 'sessions' ? fetchSessions : fetchLogs}
            disabled={logsLoading || sessionsLoading}
            title="Refresh current view"
          >
            <FaSync className={(logsLoading || sessionsLoading) ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Navigation Tabs ───────────────────────────────────── */}
      <div className="hub-tabs-container">
        <div className="hub-tabs">
          <button
            className={`hub-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => handleTabChange('activity')}
          >
            <FaHistory />
            <span>Activity & Audit Trail</span>
            {totalCount > 0 && <span className="tab-counter">{totalCount}</span>}
          </button>

          <button
            className={`hub-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => handleTabChange('sessions')}
          >
            <FaUserShield />
            <span>Active Sessions & Devices</span>
            {sessions.length > 0 && <span className="tab-counter highlight">{sessions.length}</span>}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: ACTIVITY & AUDIT TRAIL
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div className="hub-tab-content">
          {/* Quick Metrics Cards */}
          <div className="hub-metric-cards">
            <div className="hub-metric-card">
              <span className="metric-label">Total Logged Events</span>
              <strong className="metric-value">{totalCount.toLocaleString()}</strong>
              <span className="metric-caption">Immutable audit stream</span>
            </div>
            <div className="hub-metric-card">
              <span className="metric-label">Security & Sensitive Actions</span>
              <strong className="metric-value alert">{securityAlertCount}</strong>
              <span className="metric-caption">In current viewport</span>
            </div>
            <div className="hub-metric-card">
              <span className="metric-label">Active View Mode</span>
              <strong className="metric-value">
                {hasActiveFilters ? 'Filtered' : 'All Events'}
              </strong>
              <span className="metric-caption">Page {page} of {totalPages}</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="hub-filter-bar">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <div className="search-input-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search actions, entities, or IP address..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="search-input"
                />
                {searchInput && (
                  <button 
                    type="button" 
                    className="clear-search-btn"
                    onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <button type="submit" className="btn-search-submit">Search</button>
            </form>

            <div className="filter-dropdowns">
              <div className="filter-item">
                <FaFilter className="filter-icon" />
                <select
                  value={actionCategory}
                  onChange={(e) => { setActionCategory(e.target.value); setPage(1); }}
                  className="hub-select"
                >
                  <option value="">All Categories</option>
                  <option value="order_mutation">Order Mutations</option>
                  <option value="payment_mutation">Payment Overrides</option>
                  <option value="user_mutation">User Configurations</option>
                  <option value="inventory_mutation">Inventory Adjustments</option>
                  <option value="security_event">Security Events</option>
                  <option value="system_event">Operational Controls</option>
                </select>
              </div>

              <div className="date-filter-group">
                <div className="date-input-wrap">
                  <span className="date-label">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    className="hub-date-input"
                  />
                </div>
                <div className="date-input-wrap">
                  <span className="date-label">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    className="hub-date-input"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <button className="btn-clear-filters" onClick={handleClearFilters}>
                  <FaTimes /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Logs Table Area */}
          <div className="hub-table-wrapper">
            {logsLoading ? (
              <div className="hub-loading-state">
                <div className="hub-spinner" />
                <p>Loading security audit records...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="hub-empty-state">
                <FaExclamationTriangle className="empty-icon" />
                <h3>No Audit Records Found</h3>
                <p>
                  {hasActiveFilters 
                    ? 'No events match the current filter criteria. Try adjusting your dates or search term.' 
                    : 'No security activities or operational logs recorded yet.'}
                </p>
                {hasActiveFilters && (
                  <button className="btn-empty-action" onClick={handleClearFilters}>
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="hub-table">
                  <thead>
                    <tr>
                      <th>Admin User</th>
                      <th>Action & Category</th>
                      <th>Entity Target</th>
                      <th>Audit Details</th>
                      <th>IP & Origin</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const isExpanded = expandedLogId === log._id;
                      const badgeClass = getActionBadgeClass(log.action);
                      const category = log.details?.actionCategory;

                      return (
                        <tr key={log._id} className={isExpanded ? 'row-expanded' : ''}>
                          {/* Admin */}
                          <td className="col-admin">
                            <div className="admin-profile">
                              <div className="admin-avatar">
                                {log.admin?.firstName ? log.admin.firstName[0].toUpperCase() : 'S'}
                              </div>
                              <div className="admin-meta">
                                <span className="admin-fullname">
                                  {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : 'System Agent'}
                                </span>
                                <span className="admin-subtext">
                                  {log.admin?.email || (log.admin?.role ? log.admin.role.toUpperCase() : 'AUTOMATED')}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="col-action">
                            <div className="action-stack">
                              <span className={`hub-badge ${badgeClass}`}>
                                {log.action}
                              </span>
                              {category && (
                                <span className="category-pill">
                                  {category.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Entity Target */}
                          <td className="col-entity">
                            {log.entityName || log.entityId ? (
                              <div className="entity-info">
                                <span className="entity-title">{log.entityName || 'Entity ID'}</span>
                                {log.entityId && (
                                  <span className="entity-id-code">
                                    {log.entityId.startsWith('ord_') || log.entityId.length === 24 ? (
                                      <Link to={`/admin/orders/${log.entityId}`} className="entity-link" title="View associated record">
                                        #{log.entityId.slice(-8)}
                                      </Link>
                                    ) : (
                                      `#${log.entityId}`
                                    )}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>

                          {/* Details */}
                          <td className="col-details">
                            {log.details && Object.keys(log.details).length > 0 ? (
                              <div className="details-accordion">
                                <div 
                                  className="details-preview" 
                                  onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                                  title="Click to toggle JSON payload inspection"
                                >
                                  <span>{JSON.stringify(log.details).slice(0, 50)}…</span>
                                  {isExpanded ? <FaChevronUp className="chev" /> : <FaChevronDown className="chev" />}
                                </div>
                                {isExpanded && (
                                  <pre className="details-full-json">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">Standard event</span>
                            )}
                          </td>

                          {/* IP & Origin */}
                          <td className="col-network">
                            <div className="network-info">
                              <span className="network-ip">
                                <FaDesktop className="net-icon" />
                                {log.ipAddress || 'Internal'}
                              </span>
                              {log.userAgent && (
                                <span className="network-ua" title={log.userAgent}>
                                  {log.userAgent.slice(0, 30)}…
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="col-time">
                            <div className="time-info">
                              <span className="time-relative">{moment(log.createdAt).fromNow()}</span>
                              <span className="time-full">{moment(log.createdAt).format('MMM D, YYYY HH:mm:ss')}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {!logsLoading && logs.length > 0 && (
              <div className="hub-pagination">
                <div className="pagination-info">
                  Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </div>

                <div className="pagination-buttons">
                  <button
                    className="btn-page"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="page-indicator">{page} / {totalPages}</span>
                  <button
                    className="btn-page"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>

                <div className="pagination-limit">
                  <span>Per page:</span>
                  <select 
                    value={limit} 
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="hub-select-mini"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: ACTIVE SESSIONS & DEVICES
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <div className="hub-tab-content">
          {/* Security Alert Header Banner */}
          <div className="sessions-alert-banner">
            <div className="banner-text">
              <div className="banner-icon"><FaLock /></div>
              <div>
                <h4>Concurrent Session Control & Device Fingerprinting</h4>
                <p>
                  Every administrator login is cryptographically fingerprinted with automatic TTL indexation.
                  If you spot an unfamiliar IP or device, terminate it immediately or revoke all other devices.
                </p>
              </div>
            </div>

            <button
              className="btn-revoke-all"
              onClick={handleRevokeAllOthers}
              disabled={revokingAll}
            >
              <FaSignOutAlt className={revokingAll ? 'spin' : ''} />
              <span>{revokingAll ? 'Terminating Devices…' : 'Revoke All Other Sessions'}</span>
            </button>
          </div>

          {/* Sessions Table Area */}
          <div className="hub-table-wrapper">
            {sessionsLoading ? (
              <div className="hub-loading-state">
                <div className="hub-spinner" />
                <p>Querying active concurrent sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="hub-empty-state">
                <FaCheckCircle className="empty-icon success" />
                <h3>No Other Active Sessions</h3>
                <p>All admin sessions are synchronized. Only your current authenticated device is active.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="hub-table">
                  <thead>
                    <tr>
                      <th>Admin User</th>
                      <th>Device & Browser</th>
                      <th>IP & Location</th>
                      <th>Last Active</th>
                      <th>Session Established</th>
                      <th>Security Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => {
                      const isCurrent = sess.jti === user?.jti;
                      const isTerminating = revokingJti === sess.jti;

                      return (
                        <tr key={sess._id} className={isCurrent ? 'row-current-session' : ''}>
                          {/* Admin */}
                          <td className="col-admin">
                            <div className="admin-profile">
                              <div className="admin-avatar session-avatar">
                                {sess.adminId?.firstName ? sess.adminId.firstName[0].toUpperCase() : 'A'}
                              </div>
                              <div className="admin-meta">
                                <span className="admin-fullname">
                                  {sess.adminId ? `${sess.adminId.firstName} ${sess.adminId.lastName}` : 'Administrator'}
                                </span>
                                <span className="admin-subtext">
                                  {sess.adminId?.email || 'Admin Account'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Device Fingerprint */}
                          <td className="col-device">
                            <div className="device-fingerprint">
                              {getDeviceIcon(sess.deviceInfo)}
                              <span className="device-string" title={sess.deviceInfo}>
                                {sess.deviceInfo || 'Standard Web Browser'}
                              </span>
                            </div>
                          </td>

                          {/* IP & Location */}
                          <td className="col-ip">
                            <div className="ip-location">
                              <span className="ip-code">
                                <FaGlobe className="globe-icon" />
                                {sess.ipAddress}
                              </span>
                              {sess.country && (
                                <span className="country-tag">{sess.country}</span>
                              )}
                            </div>
                          </td>

                          {/* Last Active */}
                          <td className="col-active">
                            <div className="time-info">
                              <span className="time-relative">{moment(sess.lastActivityAt).fromNow()}</span>
                              <span className="time-full">{moment(sess.lastActivityAt).format('HH:mm:ss')}</span>
                            </div>
                          </td>

                          {/* Created */}
                          <td className="col-created">
                            <div className="time-info">
                              <span className="time-relative">{moment(sess.createdAt).format('MMM D, YYYY')}</span>
                              <span className="time-full">{moment(sess.createdAt).format('h:mm A')}</span>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="col-action-btn">
                            {isCurrent ? (
                              <span className="current-device-badge">
                                <FaCheckCircle /> This Device
                              </span>
                            ) : (
                              <button
                                className="btn-revoke-single"
                                onClick={() => handleRevokeSession(sess.jti)}
                                disabled={isTerminating}
                              >
                                {isTerminating ? 'Revoking…' : 'Revoke Session'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
