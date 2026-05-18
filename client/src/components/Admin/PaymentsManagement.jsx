import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { getPaymentTransactions, getReconciliationReport } from '../../api/api';
import { 
  FaCreditCard, FaSearch, FaFilter, FaDownload, 
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaSync, 
  FaFileInvoiceDollar, FaRegCalendarAlt, FaChevronRight, FaChevronLeft
} from 'react-icons/fa';
import './PaymentsManagement.css';

const PaymentsManagement = () => {
  const { showNotification } = useContext(AppContext);
  
  // State for logs
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    pending: 0,
    failed: 0,
    totalVolume: 0
  });

  // State for Reconciliation
  const [reconReport, setReconReport] = useState(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'reconciliation'

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        pageNumber: page,
        search,
        status: statusFilter,
        provider: providerFilter
      };
      
      const res = await getPaymentTransactions(params);
      if (res.data.success) {
        setTransactions(res.data.data.transactions || []);
        setTotalPages(res.data.data.pages || 1);
        
        // Calculate frontend metrics from response or set defaults
        const statsData = res.data.data.stats || {
          total: res.data.data.totalTransactions || 0,
          success: 0,
          pending: 0,
          failed: 0,
          totalVolume: 0
        };
        setStats(statsData);
      }
    } catch (error) {
      console.error('Fetch payments error:', error);
      showNotification('Failed to retrieve payment logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliation = async () => {
    try {
      setReconLoading(true);
      const res = await getReconciliationReport();
      if (res.data.success) {
        setReconReport(res.data.data);
      }
    } catch (error) {
      console.error('Reconciliation report error:', error);
      showNotification('Failed to run reconciliation audit', 'error');
    } finally {
      setReconLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchTransactions();
    } else {
      fetchReconciliation();
    }
  }, [page, statusFilter, providerFilter, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'PAID':
        return 'badge-success';
      case 'PENDING':
        return 'badge-pending';
      case 'FAILED':
        return 'badge-failed';
      default:
        return 'badge-secondary';
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="payments-management">
      {/* Header */}
      <div className="pm-header">
        <div className="pm-title-section">
          <h2><FaCreditCard className="header-icon" /> Payments & Settlement</h2>
          <p>Real-time gateway ledger, payment log audit trail, and automated reconciliation reports.</p>
        </div>
        <div className="pm-header-tabs">
          <button 
            className={`pm-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Transaction Logs
          </button>
          <button 
            className={`pm-tab-btn ${activeTab === 'reconciliation' ? 'active' : ''}`}
            onClick={() => setActiveTab('reconciliation')}
          >
            Reconciliation Audits
          </button>
        </div>
      </div>

      {activeTab === 'logs' ? (
        <>
          {/* Quick Stats Grid */}
          <div className="pm-stats-grid">
            <div className="pm-stat-card">
              <div className="pm-stat-icon-wrapper success">
                <FaCheckCircle />
              </div>
              <div className="pm-stat-info">
                <span className="pm-stat-label">Successful Revenue</span>
                <h3 className="pm-stat-val">{formatAmount(stats.totalVolume || 0)}</h3>
                <span className="pm-stat-sub">Settled funds in bank</span>
              </div>
            </div>

            <div className="pm-stat-card">
              <div className="pm-stat-icon-wrapper primary">
                <FaFileInvoiceDollar />
              </div>
              <div className="pm-stat-info">
                <span className="pm-stat-label">Total Transactions</span>
                <h3 className="pm-stat-val">{stats.total || 0}</h3>
                <span className="pm-stat-sub">Audited gateway logs</span>
              </div>
            </div>

            <div className="pm-stat-card">
              <div className="pm-stat-icon-wrapper pending">
                <FaHourglassHalf />
              </div>
              <div className="pm-stat-info">
                <span className="pm-stat-label">Pending Verifications</span>
                <h3 className="pm-stat-val">{stats.pending || 0}</h3>
                <span className="pm-stat-sub">Requires gateway verification</span>
              </div>
            </div>

            <div className="pm-stat-card">
              <div className="pm-stat-icon-wrapper failed">
                <FaTimesCircle />
              </div>
              <div className="pm-stat-info">
                <span className="pm-stat-label">Failed Audits</span>
                <h3 className="pm-stat-val">{stats.failed || 0}</h3>
                <span className="pm-stat-sub">Expired or bad checkouts</span>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="pm-filters-bar">
            <form onSubmit={handleSearchSubmit} className="pm-search-box">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Search transactions (Order ID, Receipt #, Phone, User ID)..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="pm-search-btn">Search</button>
            </form>

            <div className="pm-dropdown-filters">
              <div className="filter-select-group">
                <FaFilter className="filter-icon" />
                <select 
                  value={statusFilter} 
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div className="filter-select-group">
                <FaFilter className="filter-icon" />
                <select 
                  value={providerFilter} 
                  onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
                >
                  <option value="">All Providers</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <button 
                type="button" 
                className="pm-btn-icon pm-refresh" 
                onClick={fetchTransactions} 
                title="Refresh Logs"
              >
                <FaSync className={loading ? 'spinning' : ''} />
              </button>
            </div>
          </div>

          {/* Table Ledger */}
          <div className="pm-table-container">
            {loading ? (
              <div className="pm-loader-overlay">
                <div className="pm-spinner"></div>
                <p>Retrieving transaction ledger...</p>
              </div>
            ) : (
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>Transaction Reference</th>
                    <th>Associated Order</th>
                    <th>Customer details</th>
                    <th>Payment Provider</th>
                    <th>Transaction Amount</th>
                    <th>Gateway Status</th>
                    <th>Processed Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="pm-row">
                      <td className="pm-cell-ref">
                        <span className="ref-tx-id">{tx.transactionId || 'N/A'}</span>
                        <span className="ref-id-lbl">Ledger ID: {tx._id}</span>
                      </td>
                      <td className="pm-cell-order">
                        <span className="order-num-badge">
                          #{tx.order?.orderNumber || tx.order || 'Unknown'}
                        </span>
                      </td>
                      <td className="pm-cell-user">
                        <div className="user-info-stack">
                          <span className="stack-name">
                            {tx.user?.firstName} {tx.user?.lastName}
                          </span>
                          <span className="stack-email">{tx.user?.email || tx.user || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="pm-cell-provider">
                        <span className={`provider-tag ${tx.provider?.toLowerCase()}`}>
                          {tx.provider === 'MPESA' ? '📲 M-Pesa' : tx.provider === 'PAYPAL' ? '💳 PayPal' : '💳 Card'}
                        </span>
                      </td>
                      <td className="pm-cell-amount">
                        <strong>{formatAmount(tx.amount || 0)}</strong>
                      </td>
                      <td>
                        <span className={`pm-badge ${getStatusBadgeClass(tx.status)}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="pm-cell-time">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="7" className="pm-empty-state">
                        <div className="empty-box">
                          <span>💳</span>
                          <h4>No transaction logs found</h4>
                          <p>Try refining your search terms or expanding filter scopes.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="pm-pagination">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="pm-page-btn"
            >
              <FaChevronLeft /> Previous
            </button>
            <span className="pm-page-text">Page {page} of {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="pm-page-btn"
            >
              Next <FaChevronRight />
            </button>
          </div>
        </>
      ) : (
        /* Reconciliation Audits View */
        <div className="pm-reconciliation-view">
          <div className="recon-overview-banner">
            <div className="banner-text">
              <h3><FaRegCalendarAlt /> Gateway Reconciliation Auditing</h3>
              <p>Audit system comparing physical ledger database with sandbox and live network settlement logs.</p>
            </div>
            <button 
              className="recon-run-btn" 
              onClick={fetchReconciliation}
              disabled={reconLoading}
            >
              <FaSync className={reconLoading ? 'spinning' : ''} /> {reconLoading ? 'Auditing Gateway...' : 'Initiate Settlement Audit'}
            </button>
          </div>

          {reconLoading ? (
            <div className="recon-loading-state">
              <div className="pm-spinner"></div>
              <h4>Executing Multi-Gateway Cross-Audit...</h4>
              <p>Verifying ledger amounts against Stripe/Card providers, M-Pesa statements, and PayPal receipts...</p>
            </div>
          ) : reconReport ? (
            <div className="recon-report-grid">
              {/* Summary Cards */}
              <div className="recon-card full-width">
                <div className="recon-card-header">
                  <h4>Ledger Audit Summary</h4>
                  <span className={`status-pill ${reconReport.mismatchCount === 0 ? 'good' : 'warning'}`}>
                    {reconReport.mismatchCount === 0 ? '✅ Clean Ledger' : `⚠️ ${reconReport.mismatchCount} Discrepancies Spotted`}
                  </span>
                </div>
                
                <div className="recon-metrics-stack">
                  <div className="metric-box">
                    <span className="lbl">Audited Payments</span>
                    <span className="val">{reconReport.totalTransactions || 0}</span>
                  </div>
                  <div className="metric-box">
                    <span className="lbl">Successful Settled</span>
                    <span className="val text-success">{formatAmount(reconReport.settledAmount || 0)}</span>
                  </div>
                  <div className="metric-box">
                    <span className="lbl">Gateway Discrepancy Volume</span>
                    <span className="val text-danger">{formatAmount(reconReport.discrepancyVolume || 0)}</span>
                  </div>
                  <div className="metric-box">
                    <span className="lbl">Audit Precision</span>
                    <span className="val text-amber">{reconReport.auditAccuracy || '100%'}</span>
                  </div>
                </div>
              </div>

              {/* Mismatches and Discrepancies */}
              <div className="recon-card">
                <div className="recon-card-header">
                  <h4>Discrepancy Investigation Logs</h4>
                </div>
                <div className="investigation-content">
                  {reconReport.mismatchList && reconReport.mismatchList.length > 0 ? (
                    <div className="discrepancy-list">
                      {reconReport.mismatchList.map((item, idx) => (
                        <div key={idx} className="discrepancy-item">
                          <div className="disc-icon"><FaTimesCircle /></div>
                          <div className="disc-details">
                            <h5>Order ID: #{item.orderNumber}</h5>
                            <p>DB Amount: {formatAmount(item.dbAmount)} | Gateway: {formatAmount(item.gatewayAmount)}</p>
                            <span className="disc-reason">Reason: {item.mismatchReason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="clean-audit-state">
                      <div className="audit-ok-icon">🛡️</div>
                      <h5>Perfect Balance!</h5>
                      <p>All database records exactly match the payment gateway settlements. Zero leakages detected.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verified Settlements Breakdown */}
              <div className="recon-card">
                <div className="recon-card-header">
                  <h4>Settlements by Gateway</h4>
                </div>
                <div className="gateways-breakdown">
                  <div className="gw-row">
                    <span className="gw-lbl">📲 M-Pesa Till Statement</span>
                    <strong className="gw-val">{formatAmount(reconReport.mpesaTotal || 0)}</strong>
                  </div>
                  <div className="gw-row">
                    <span className="gw-lbl">💳 PayPal Secure Account</span>
                    <strong className="gw-val">{formatAmount(reconReport.paypalTotal || 0)}</strong>
                  </div>
                  <div className="gw-row">
                    <span className="gw-lbl">💳 Card Processing Vault</span>
                    <strong className="gw-val">{formatAmount(reconReport.cardTotal || 0)}</strong>
                  </div>
                  <div className="gw-divider"></div>
                  <div className="gw-row total">
                    <span className="gw-lbl">Total Reconciled Settlement</span>
                    <strong className="gw-val text-success">{formatAmount(reconReport.settledAmount || 0)}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="recon-empty-state">
              <div className="recon-empty-icon">📊</div>
              <h4>No Reconciliation Audit Conducted Yet</h4>
              <p>Click "Initiate Settlement Audit" above to cross-reference DB ledgers against sandbox payment APIs.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentsManagement;
