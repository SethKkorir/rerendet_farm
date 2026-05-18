import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { getStatementReport, getAdminUsers } from '../../api/api';
import API from '../../api/api';
import { 
  FaFileInvoiceDollar, FaSearch, FaRegCalendarAlt, FaSync, 
  FaFilePdf, FaDownload, FaEye, FaSpinner, FaChevronLeft, 
  FaChevronRight, FaUser, FaBuilding, FaCoins, FaArrowUp, FaArrowDown, FaTimes
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './ReportsManagement.css';

const ReportsManagement = () => {
  const { showNotification } = useContext(AppContext);

  // Filter States
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('store'); // 'store' or 'customer'
  const [selectedUser, setSelectedUser] = useState('');
  
  // Data States
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // PDF Viewer Modal States
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Load Registered Users if reportType is customer
  useEffect(() => {
    if (reportType === 'customer' && users.length === 0) {
      const fetchUsers = async () => {
        try {
          setUsersLoading(true);
          const res = await getAdminUsers({ limit: 100 });
          if (res.data && res.data.users) {
            setUsers(res.data.users);
          } else if (res.users) {
            setUsers(res.users);
          }
        } catch (err) {
          console.error('Fetch admin users failed:', err);
          showNotification('Failed to fetch customer list', 'error');
        } finally {
          setUsersLoading(false);
        }
      };
      fetchUsers();
    }
  }, [reportType]);

  // Fetch statement JSON for interactive dashboard preview
  const fetchReportData = async () => {
    if (reportType === 'customer' && !selectedUser) {
      showNotification('Please select a customer to generate statement', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      const params = {
        startDate,
        endDate,
        format: 'json'
      };
      if (reportType === 'customer') {
        params.userId = selectedUser;
      }

      const res = await getStatementReport(params);
      if (res.data.success) {
        setSummary(res.data.summary);
        setLedger(res.data.ledger || []);
        setPage(1);
      }
    } catch (err) {
      console.error('Fetch statement error:', err);
      showNotification('Failed to retrieve statement data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate, reportType, selectedUser]);

  // Apply Presets
  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const applyMonthPreset = (type) => {
    const end = new Date();
    const start = new Date();
    if (type === 'this-month') {
      start.setDate(1);
    } else if (type === 'last-month') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      
      const lastDayOfPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      setEndDate(lastDayOfPrevMonth.toISOString().split('T')[0]);
    }
    setStartDate(start.toISOString().split('T')[0]);
    if (type === 'this-month') {
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // Generate and embed PDF inline in Iframe securely
  const viewPdfInline = async () => {
    if (reportType === 'customer' && !selectedUser) {
      showNotification('Please select a customer first', 'warning');
      return;
    }

    try {
      setPdfLoading(true);
      
      // Fetch PDF as Blob directly via Axios (passing token authorization)
      const res = await API.get('/admin/reports/statement', {
        params: {
          startDate,
          endDate,
          userId: reportType === 'customer' ? selectedUser : undefined,
          format: 'pdf'
        },
        responseType: 'blob'
      });

      const file = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      setPdfUrl(fileURL);
      setShowPdfModal(true);
      showNotification('Statement compiled successfully!', 'success');
    } catch (err) {
      console.error('PDF Generation failed:', err);
      showNotification('Failed to compile statement PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  // Direct Download PDF trigger
  const downloadPdf = async () => {
    if (reportType === 'customer' && !selectedUser) {
      showNotification('Please select a customer first', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await API.get('/admin/reports/statement', {
        params: {
          startDate,
          endDate,
          userId: reportType === 'customer' ? selectedUser : undefined,
          format: 'pdf'
        },
        responseType: 'blob'
      });

      const file = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      
      // Create a temporary hidden anchor to trigger clean browser download
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Rerendet-Statement-${startDate}-to-${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Statement downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF Download failed:', err);
      showNotification('Failed to download PDF statement', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Format Currency
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Search Filter
  const filteredLedger = ledger.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.transactionId?.toLowerCase().includes(q) ||
      item.orderNumber?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.paymentMethod?.toLowerCase().includes(q)
    );
  });

  // Pagination bounds
  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);
  const paginatedLedger = filteredLedger.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="reports-management">
      
      {/* ─── Control Header ─────────────────────────────────────── */}
      <div className="rm-header">
        <div className="rm-title-section">
          <h2>
            <FaFileInvoiceDollar className="header-icon" /> Reports & Statements
          </h2>
          <p>
            Audit detailed financial ledgers and compile official Safaricom M-Pesa style statements.
          </p>
        </div>
        
        {/* Export / Visual Actions */}
        <div className="rm-header-actions">
          <button 
            className="rm-btn rm-secondary" 
            onClick={viewPdfInline}
            disabled={pdfLoading || loading}
          >
            {pdfLoading ? <FaSpinner className="spinning" /> : <FaEye />} View PDF Statement
          </button>
          <button 
            className="rm-btn rm-primary" 
            onClick={downloadPdf}
            disabled={loading}
          >
            <FaDownload /> Export PDF
          </button>
        </div>
      </div>

      {/* ─── Config Panel Card (Deck Controls) ─────────────────────── */}
      <div className="rm-card rm-deck-card">
        <div className="deck-column">
          <label className="rm-label">Statement Focus</label>
          <div className="rm-focus-switch">
            <button 
              className={`switch-btn ${reportType === 'store' ? 'active' : ''}`}
              onClick={() => { setReportType('store'); setSelectedUser(''); }}
            >
              <FaBuilding /> Store Revenue (Master)
            </button>
            <button 
              className={`switch-btn ${reportType === 'customer' ? 'active' : ''}`}
              onClick={() => setReportType('customer')}
            >
              <FaUser /> Customer Account
            </button>
          </div>
        </div>

        {reportType === 'customer' && (
          <div className="deck-column select-customer-col">
            <label className="rm-label">Select Customer Account</label>
            <div className="customer-select-wrap">
              {usersLoading ? (
                <div className="inline-loader"><FaSpinner className="spinning" /> Loading users...</div>
              ) : (
                <select 
                  className="rm-input select"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">-- Choose Wholesale/Loyalty Client --</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        <div className="deck-column date-picker-col">
          <label className="rm-label"><FaRegCalendarAlt /> Custom Date Bounds</label>
          <div className="rm-date-inputs">
            <input 
              type="date" 
              className="rm-input date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="date-to-lbl">to</span>
            <input 
              type="date" 
              className="rm-input date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Date Presets Button Panel */}
        <div className="deck-column presets-col">
          <label className="rm-label">Quick Bounds Presets</label>
          <div className="presets-grid">
            <button onClick={() => applyPreset(7)} className="preset-btn">Last 7d</button>
            <button onClick={() => applyPreset(30)} className="preset-btn">Last 30d</button>
            <button onClick={() => applyMonthPreset('this-month')} className="preset-btn">This Month</button>
            <button onClick={() => applyMonthPreset('last-month')} className="preset-btn">Last Month</button>
          </div>
        </div>
      </div>

      {/* ─── Financial Summary Cards Box (Safaricom replica cards) ───── */}
      {summary && (
        <div className="rm-summary-deck">
          <div className="rm-summary-card">
            <div className="summary-icon-chip grey">
              <FaCoins />
            </div>
            <div className="summary-info">
              <span className="summary-lbl">Starting Balance</span>
              <h3 className="summary-val">{formatAmount(summary.startingBalance)}</h3>
              <span className="summary-sub">Balance before {startDate}</span>
            </div>
          </div>

          <div className="rm-summary-card">
            <div className="summary-icon-chip green">
              <FaArrowUp />
            </div>
            <div className="summary-info">
              <span className="summary-lbl">{reportType === 'store' ? 'Total Money In (+)' : 'Total Inflow (+)'}</span>
              <h3 className="summary-val text-green">{formatAmount(summary.totalMoneyIn)}</h3>
              <span className="summary-sub">Gross cash inflows</span>
            </div>
          </div>

          <div className="rm-summary-card">
            <div className="summary-icon-chip red">
              <FaArrowDown />
            </div>
            <div className="summary-info">
              <span className="summary-lbl">{reportType === 'store' ? 'Total Money Out (-)' : 'Total Outlays (-)'}</span>
              <h3 className="summary-val text-red">{formatAmount(summary.totalMoneyOut)}</h3>
              <span className="summary-sub">Gross outflows & taxes</span>
            </div>
          </div>

          <div className="rm-summary-card ending-bal-card">
            <div className="summary-icon-chip gold">
              <FaFileInvoiceDollar />
            </div>
            <div className="summary-info">
              <span className="summary-lbl">Ending Account Balance</span>
              <h3 className="summary-val text-gold">{formatAmount(summary.endingBalance)}</h3>
              <span className="summary-sub">Current reconciled ledger</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Transaction Table Ledger View ───────────────────────── */}
      <div className="rm-card rm-table-card">
        <div className="table-filter-bar">
          <h3>
            📊 Live Preview Grid {summary && `(${summary.ownerName})`}
          </h3>
          
          <div className="table-search-wrap">
            <FaSearch className="table-search-icon" />
            <input 
              type="text" 
              placeholder="Search ledger (Tx Ref, Order #, Description)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rm-input search"
            />
            <button onClick={fetchReportData} className="rm-btn-sync" title="Refresh Live Data">
              <FaSync className={loading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        <div className="rm-table-wrap">
          {loading ? (
            <div className="table-loading-state">
              <div className="rm-table-spinner"></div>
              <p>Reconciling transaction ledger and compiling balance matrix...</p>
            </div>
          ) : (
            <table className="rm-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Transaction ID</th>
                  <th>Order Reference</th>
                  <th>Ledger Details / product grouping</th>
                  <th>Method</th>
                  <th>Money In</th>
                  <th>Money Out</th>
                  <th>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLedger.map((tx) => (
                  <tr key={tx.id} className="rm-row">
                    <td>{new Date(tx.date).toLocaleString()}</td>
                    <td className="tx-ref-font">{tx.transactionId}</td>
                    <td>
                      <span className="rm-order-badge">#{tx.orderNumber}</span>
                    </td>
                    <td className="desc-cell-wrap">{tx.description}</td>
                    <td className="method-cell-wrap">{tx.paymentMethod?.toUpperCase()}</td>
                    <td className="text-green-weight">
                      {tx.moneyIn > 0 ? `+${formatAmount(tx.moneyIn)}` : '—'}
                    </td>
                    <td className="text-red-weight">
                      {tx.moneyOut > 0 ? `-${formatAmount(tx.moneyOut)}` : '—'}
                    </td>
                    <td className="balance-cell">
                      <strong>{formatAmount(tx.runningBalance)}</strong>
                    </td>
                  </tr>
                ))}

                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan="8" className="rm-empty-state-cell">
                      <div className="empty-box">
                        <span>📊</span>
                        <h4>No Transaction History Found</h4>
                        <p>No settled orders match the selected date bounds or custom account search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Console */}
        {totalPages > 1 && (
          <div className="table-pagination">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="pagination-btn"
            >
              <FaChevronLeft /> Previous
            </button>
            <span className="pagination-text">Page {page} of {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="pagination-btn"
            >
              Next <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* ─── Premium Glassmorphic Embedded PDF Modal ( Backdrop Blur ) ─── */}
      <AnimatePresence>
        {showPdfModal && (
          <motion.div 
            className="rm-pdf-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="rm-pdf-modal-content"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
            >
              <div className="pdf-modal-header">
                <div className="pdf-modal-title">
                  <FaFilePdf className="pdf-modal-icon" />
                  <div>
                    <h3>Official Paper Statement Preview</h3>
                    <p>{summary?.ownerName} • {startDate} to {endDate}</p>
                  </div>
                </div>
                <button 
                  className="pdf-close-btn" 
                  onClick={() => {
                    setShowPdfModal(false);
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl('');
                  }}
                  title="Close Preview"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="pdf-modal-body">
                {pdfUrl ? (
                  <iframe 
                    src={pdfUrl} 
                    className="pdf-modal-iframe" 
                    title="Official Compiled PDF Document"
                  />
                ) : (
                  <div className="pdf-modal-loader">
                    <FaSpinner className="spinning" />
                    <p>Loading document viewer...</p>
                  </div>
                )}
              </div>

              <div className="pdf-modal-footer">
                <button 
                  className="rm-btn rm-secondary"
                  onClick={() => {
                    setShowPdfModal(false);
                    URL.revokeObjectURL(pdfUrl);
                    setPdfUrl('');
                  }}
                >
                  Close Reader
                </button>
                <button className="rm-btn rm-primary" onClick={downloadPdf}>
                  <FaDownload /> Download PDF Copy
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ReportsManagement;
