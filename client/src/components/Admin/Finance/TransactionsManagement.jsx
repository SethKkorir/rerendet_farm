// client/src/components/Admin/Finance/TransactionsManagement.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import {
  getTransactions,
  getTransactionById,
  settlePaymentIssue,
  queryTransactionGateway,
  getUnsettledPayments
} from '../../../api/api';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Eye,
  X,
  Copy,
  Check,
  RotateCw,
  ArrowRight,
  Receipt,
  FileText
} from 'lucide-react';
import './TransactionsManagement.css';

const TransactionsManagement = () => {
  const { showAlert } = useContext(AppContext);
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState({
    totalProcessed: 0,
    successfulCount: 0,
    mpesaVolume: 0,
    stripeVolume: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Single detail modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Settlement Hub Modal
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTab, setSettleTab] = useState('manual'); // 'manual' | 'unsettled'
  const [unsettledData, setUnsettledData] = useState(null);
  const [unsettledLoading, setUnsettledLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [queryingGatewayId, setQueryingGatewayId] = useState(null);

  // Settle Form State
  const [settleForm, setSettleForm] = useState({
    orderIdentifier: '',
    receiptCode: '',
    amount: '',
    provider: 'MPESA',
    note: '',
    transactionId: ''
  });

  const fetchTxList = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const params = {
        provider: providerFilter !== 'all' ? providerFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search.trim() || undefined
      };

      const res = await getTransactions(params);
      if (res.data?.success) {
        setTransactions(res.data.data.transactions || []);
        setMetrics(res.data.data.metrics || {});
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      showAlert('Unable to load payment transactions', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnsettled = async () => {
    try {
      setUnsettledLoading(true);
      const res = await getUnsettledPayments();
      if (res.data?.success) {
        setUnsettledData(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load unsettled payments:', err);
    } finally {
      setUnsettledLoading(false);
    }
  };

  useEffect(() => {
    fetchTxList();
    fetchUnsettled();
  }, [providerFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTxList();
  };

  const handleOpenDetail = async (tx) => {
    setSelectedTx(tx);
    try {
      setModalLoading(true);
      const res = await getTransactionById(tx._id);
      if (res.data?.success) {
        setSelectedTx(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load transaction detail:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatCurrency = (val) => `KES ${(Number(val) || 0).toLocaleString()}`;

  // ─── QUERY SAFARICOM GATEWAY LIVE ───
  const handleQueryGateway = async (txId, e) => {
    if (e) e.stopPropagation();
    try {
      setQueryingGatewayId(txId);
      const res = await queryTransactionGateway(txId);
      if (res.data?.success) {
        showAlert(res.data.message || 'Gateway status updated!', 'success');
        fetchTxList(true);
        fetchUnsettled();
        if (selectedTx && selectedTx._id === txId) {
          setSelectedTx(res.data.data);
        }
      }
    } catch (err) {
      console.error('Gateway query failed:', err);
      showAlert(err.response?.data?.message || 'Gateway check failed', 'error');
    } finally {
      setQueryingGatewayId(null);
    }
  };

  // ─── OPEN SETTLE MODAL WITH PREFILL ───
  const openSettleForTx = (tx, e) => {
    if (e) e.stopPropagation();
    setSettleForm({
      orderIdentifier: tx.order?.orderNumber || tx.order?._id || '',
      receiptCode: tx.transactionId?.startsWith('ws_CO_') ? '' : tx.transactionId || '',
      amount: tx.amount || '',
      provider: tx.provider || 'MPESA',
      note: `Settling transaction ${tx.transactionId}`,
      transactionId: tx._id
    });
    setSettleTab('manual');
    setShowSettleModal(true);
  };

  const openSettleForOrder = (order) => {
    setSettleForm({
      orderIdentifier: order.orderNumber || order._id || '',
      receiptCode: '',
      amount: order.total || '',
      provider: order.paymentMethod?.toUpperCase() === 'STRIPE' ? 'STRIPE' : 'MPESA',
      note: `Unblocking pending Order #${order.orderNumber}`,
      transactionId: ''
    });
    setSettleTab('manual');
  };

  // ─── SUBMIT MANUAL SETTLEMENT ───
  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleForm.orderIdentifier && !settleForm.transactionId) {
      showAlert('Please enter an Order Number or select a Transaction', 'error');
      return;
    }

    try {
      setSettling(true);
      const res = await settlePaymentIssue(settleForm);
      if (res.data?.success) {
        showAlert(res.data.message || 'Payment settled successfully!', 'success');
        setShowSettleModal(false);
        setSettleForm({
          orderIdentifier: '',
          receiptCode: '',
          amount: '',
          provider: 'MPESA',
          note: '',
          transactionId: ''
        });
        fetchTxList(true);
        fetchUnsettled();
        if (selectedTx) {
          setSelectedTx(null);
        }
      }
    } catch (err) {
      console.error('Failed to settle payment:', err);
      showAlert(err.response?.data?.message || 'Failed to settle payment issue', 'error');
    } finally {
      setSettling(false);
    }
  };

  const unsettledCount = (unsettledData?.pendingOrders?.length || 0) + (unsettledData?.pendingTransactions?.length || 0);

  return (
    <div className="tx-mgmt-page">
      {/* ─── HEADER ─── */}
      <div className="tx-header">
        <div className="tx-title-group">
          <h2>Financial Transactions Ledger</h2>
          <p className="tx-subtitle">
            Real-time settlement stream across M-Pesa STK Push, credit cards, and bank payments.
          </p>
        </div>

        <div className="tx-header-actions">
          {/* Settle Payment Issues Button */}
          <button
            className="tx-btn-settle"
            onClick={() => {
              fetchUnsettled();
              setShowSettleModal(true);
            }}
          >
            <ShieldAlert size={15} />
            <span>Settle Payment Issue</span>
            {unsettledCount > 0 && (
              <span className="tx-settle-badge" title={`${unsettledCount} pending settlements`}>
                {unsettledCount}
              </span>
            )}
          </button>

          <button
            className="tx-btn-refresh"
            onClick={() => fetchTxList(true)}
            disabled={refreshing}
            title="Refresh transactions"
          >
            <RefreshCw size={14} className={refreshing ? 'tx-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ─── METRICS CARDS ─── */}
      <div className="tx-kpi-grid">
        <div className="tx-kpi-card">
          <div className="tx-kpi-top">
            <span className="tx-kpi-lbl">Total Volume Settled</span>
            <div className="tx-kpi-icon green">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="tx-kpi-val">{formatCurrency(metrics.totalProcessed)}</div>
          <span className="tx-kpi-sub">{metrics.successfulCount || 0} Successful settlements</span>
        </div>

        <div className="tx-kpi-card">
          <div className="tx-kpi-top">
            <span className="tx-kpi-lbl">M-Pesa Daraja Volume</span>
            <div className="tx-kpi-icon gold">
              <Smartphone size={16} />
            </div>
          </div>
          <div className="tx-kpi-val">{formatCurrency(metrics.mpesaVolume)}</div>
          <span className="tx-kpi-sub">Safaricom STK & Till payments</span>
        </div>

        <div className="tx-kpi-card">
          <div className="tx-kpi-top">
            <span className="tx-kpi-lbl">Card & Stripe Volume</span>
            <div className="tx-kpi-icon blue">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="tx-kpi-val">{formatCurrency(metrics.stripeVolume)}</div>
          <span className="tx-kpi-sub">International credit & debit cards</span>
        </div>

        <div className="tx-kpi-card">
          <div className="tx-kpi-top">
            <span className="tx-kpi-lbl">Payment Issues</span>
            <div className="tx-kpi-icon purple">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="tx-kpi-val">{unsettledCount}</div>
          <span className="tx-kpi-sub">
            {unsettledCount === 0 ? 'All transactions clean & reconciled' : 'Drop-offs / pending reconciliation'}
          </span>
        </div>
      </div>

      {/* ─── SEARCH & FILTER STRIP ─── */}
      <div className="tx-controls-card">
        <div className="tx-filter-group">
          <div className="tx-filter-tabs">
            {['all', 'SUCCESS', 'PENDING', 'FAILED'].map((st) => (
              <button
                key={st}
                className={`tx-ft-btn ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          <div className="tx-filter-tabs">
            {['all', 'MPESA', 'STRIPE'].map((prov) => (
              <button
                key={prov}
                className={`tx-ft-btn ${providerFilter === prov ? 'active' : ''}`}
                onClick={() => setProviderFilter(prov)}
              >
                {prov === 'all' ? 'All Providers' : prov}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="tx-search-box">
          <Search size={15} className="tx-search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt code, ID..."
          />
        </form>
      </div>

      {/* ─── TRANSACTIONS LEDGER TABLE ─── */}
      <div className="tx-table-card">
        {loading ? (
          <div className="tx-loading-state">
            <div className="tx-spinner" />
            <p>Syncing transactions ledger...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="tx-empty-state">
            <CreditCard size={32} />
            <h4>No Transactions Recorded</h4>
            <p>Transactions will appear here automatically when payments are processed.</p>
          </div>
        ) : (
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Receipt / Reference</th>
                  <th>Date & Time</th>
                  <th>Gateway</th>
                  <th>Order Link</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Settlement Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} className="tx-row" onClick={() => handleOpenDetail(tx)}>
                    <td>
                      <div className="tx-ref-cell">
                        <strong className="tx-ref-code">{tx.transactionId}</strong>
                        {tx.idempotencyKey && (
                          <span className="tx-ref-sub">Ref: {tx.idempotencyKey.slice(0, 16)}...</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="tx-time-cell">
                        {new Date(tx.createdAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </span>
                    </td>

                    <td>
                      <span className={`tx-gateway-badge ${tx.provider?.toLowerCase()}`}>
                        {tx.provider === 'MPESA' && <Smartphone size={12} />}
                        {tx.provider === 'STRIPE' && <CreditCard size={12} />}
                        {tx.provider}
                      </span>
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      {tx.order ? (
                        <a
                          href={`/admin/orders/${tx.order._id || tx.order}`}
                          className="tx-order-link"
                        >
                          <span>#{tx.order.orderNumber || 'Order'}</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="tx-order-none">—</span>
                      )}
                    </td>

                    <td>
                      <strong className="tx-amount">{formatCurrency(tx.amount)}</strong>
                    </td>

                    <td>
                      <span className={`tx-status-pill ${tx.status?.toLowerCase()}`}>
                        ● {tx.status}
                      </span>
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="tx-row-actions">
                        {tx.status !== 'SUCCESS' && (
                          <button
                            className="tx-btn-row-settle"
                            onClick={(e) => openSettleForTx(tx, e)}
                            title="Settle this payment issue"
                          >
                            <ShieldAlert size={12} />
                            <span>Settle</span>
                          </button>
                        )}

                        {tx.provider === 'MPESA' && tx.status !== 'SUCCESS' && (
                          <button
                            className="tx-btn-row-query"
                            onClick={(e) => handleQueryGateway(tx._id, e)}
                            disabled={queryingGatewayId === tx._id}
                            title="Query Safaricom gateway live"
                          >
                            <RotateCw size={12} className={queryingGatewayId === tx._id ? 'tx-spin' : ''} />
                            <span>{queryingGatewayId === tx._id ? 'Checking...' : 'Check'}</span>
                          </button>
                        )}

                        <button
                          className="tx-action-btn"
                          title="View audit metadata"
                          onClick={() => handleOpenDetail(tx)}
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── SINGLE TRANSACTION DETAIL MODAL ─── */}
      {selectedTx && (
        <>
          <div className="tx-modal-overlay" onClick={() => setSelectedTx(null)} />
          <div className="tx-modal" role="dialog" aria-modal="true">
            <div className="tx-modal-header">
              <div className="tx-mh-title">
                <CreditCard size={18} className="tx-mh-icon" />
                <div>
                  <h3>Transaction Audit Details</h3>
                  <p>Settlement verification record</p>
                </div>
              </div>
              <button className="tx-modal-close" onClick={() => setSelectedTx(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="tx-modal-body">
              {modalLoading ? (
                <div className="tx-modal-loading">
                  <div className="tx-spinner" />
                </div>
              ) : (
                <div className="tx-detail-content">
                  
                  {/* Issue Warning Banner if Pending/Failed */}
                  {selectedTx.status !== 'SUCCESS' && (
                    <div className="tx-issue-banner">
                      <div className="tx-ib-icon">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="tx-ib-text">
                        <strong>Payment Issue Detected ({selectedTx.status})</strong>
                        <p>This transaction has not reached a successful settlement state.</p>
                      </div>
                      <div className="tx-ib-actions">
                        {selectedTx.provider === 'MPESA' && (
                          <button
                            className="tx-btn-ib-query"
                            onClick={() => handleQueryGateway(selectedTx._id)}
                            disabled={queryingGatewayId === selectedTx._id}
                          >
                            <RotateCw size={13} className={queryingGatewayId === selectedTx._id ? 'tx-spin' : ''} />
                            <span>Query Safaricom</span>
                          </button>
                        )}
                        <button
                          className="tx-btn-ib-settle"
                          onClick={() => openSettleForTx(selectedTx)}
                        >
                          <ShieldAlert size={13} />
                          <span>Settle Manually</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary Strip */}
                  <div className="tx-summary-strip">
                    <div className="tx-ss-box">
                      <span className="tx-ss-lbl">Receipt Number</span>
                      <div className="tx-ss-copy-row">
                        <strong className="tx-ss-code">{selectedTx.transactionId}</strong>
                        <button
                          className="tx-btn-copy"
                          onClick={() => handleCopy(selectedTx.transactionId)}
                          title="Copy receipt code"
                        >
                          {copiedId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div className="tx-ss-box">
                      <span className="tx-ss-lbl">Settlement Status</span>
                      <span className={`tx-status-pill ${selectedTx.status?.toLowerCase()}`}>
                        ● {selectedTx.status}
                      </span>
                    </div>

                    <div className="tx-ss-box">
                      <span className="tx-ss-lbl">Gross Amount</span>
                      <strong className="tx-ss-amount">{formatCurrency(selectedTx.amount)}</strong>
                    </div>
                  </div>

                  {/* Attributes list */}
                  <div className="tx-attr-grid">
                    <div className="tx-attr-row">
                      <span className="tx-ar-lbl">Gateway Provider:</span>
                      <span className="tx-ar-val">{selectedTx.provider}</span>
                    </div>

                    <div className="tx-attr-row">
                      <span className="tx-ar-lbl">Processed Timestamp:</span>
                      <span className="tx-ar-val">
                        {new Date(selectedTx.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {selectedTx.idempotencyKey && (
                      <div className="tx-attr-row">
                        <span className="tx-ar-lbl">Checkout Request ID:</span>
                        <span className="tx-ar-val font-mono">{selectedTx.idempotencyKey}</span>
                      </div>
                    )}

                    {selectedTx.order && (
                      <div className="tx-attr-row">
                        <span className="tx-ar-lbl">Associated Order:</span>
                        <a
                          href={`/admin/orders/${selectedTx.order._id || selectedTx.order}`}
                          className="tx-order-link"
                        >
                          <span>#{selectedTx.order.orderNumber || 'View Order'}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}

                    {selectedTx.metadata?.settledManually && (
                      <div className="tx-attr-row settled-highlight">
                        <span className="tx-ar-lbl">Settled Manually:</span>
                        <span className="tx-ar-val">
                          By {selectedTx.metadata.settledBy || 'Admin'} on{' '}
                          {new Date(selectedTx.metadata.settledAt).toLocaleDateString()}
                          {selectedTx.metadata.auditNote && ` (${selectedTx.metadata.auditNote})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Raw Metadata Viewer if present */}
                  {selectedTx.rawResponse && (
                    <div className="tx-raw-box">
                      <span className="tx-raw-title">Gateway Payload / Audit Logs</span>
                      <pre className="tx-raw-pre">
                        {JSON.stringify(selectedTx.rawResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="tx-modal-footer">
              <button className="tx-btn-close-modal" onClick={() => setSelectedTx(null)}>
                Close Audit
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── PAYMENT SETTLEMENT & RECONCILIATION HUB MODAL ─── */}
      {showSettleModal && (
        <>
          <div className="tx-modal-overlay" onClick={() => setShowSettleModal(false)} />
          <div className="tx-modal tx-settle-dialog" role="dialog" aria-modal="true">
            <div className="tx-modal-header">
              <div className="tx-mh-title">
                <ShieldAlert size={20} className="tx-mh-icon alert-gold" />
                <div>
                  <h3>Settle Payment Issue</h3>
                  <p>Reconcile dropped checkout sessions, link M-Pesa codes, or unblock orders</p>
                </div>
              </div>
              <button className="tx-modal-close" onClick={() => setShowSettleModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs inside Settle Hub */}
            <div className="tx-settle-tabs">
              <button
                type="button"
                className={`tx-st-btn ${settleTab === 'manual' ? 'active' : ''}`}
                onClick={() => setSettleTab('manual')}
              >
                <Receipt size={14} />
                <span>Verify & Settle Form</span>
              </button>
              <button
                type="button"
                className={`tx-st-btn ${settleTab === 'unsettled' ? 'active' : ''}`}
                onClick={() => setSettleTab('unsettled')}
              >
                <AlertTriangle size={14} />
                <span>Pending Drop-offs & Issues ({unsettledCount})</span>
              </button>
            </div>

            <div className="tx-modal-body">
              {settleTab === 'manual' ? (
                /* TAB 1: MANUAL SETTLE FORM */
                <form onSubmit={handleSettleSubmit} className="tx-settle-form">
                  <div className="tx-form-row-2">
                    <div className="tx-field">
                      <label>Order Number or Order ID *</label>
                      <input
                        type="text"
                        value={settleForm.orderIdentifier}
                        onChange={(e) => setSettleForm({ ...settleForm, orderIdentifier: e.target.value })}
                        placeholder="e.g. 1042 or RND-1042"
                        required
                      />
                      <small className="tx-field-hint">The order to mark paid & unblock for dispatch</small>
                    </div>

                    <div className="tx-field">
                      <label>Payment Channel / Provider</label>
                      <select
                        value={settleForm.provider}
                        onChange={(e) => setSettleForm({ ...settleForm, provider: e.target.value })}
                      >
                        <option value="MPESA">M-Pesa (Till / Paybill / STK)</option>
                        <option value="BANK_TRANSFER">Bank Transfer (Equity Bank)</option>
                        <option value="CASH">Farm Gate Cash Settlement</option>
                        <option value="STRIPE">Stripe / Card Payment</option>
                      </select>
                    </div>
                  </div>

                  <div className="tx-form-row-2">
                    <div className="tx-field">
                      <label>Verified Receipt Code / Reference *</label>
                      <input
                        type="text"
                        value={settleForm.receiptCode}
                        onChange={(e) => setSettleForm({ ...settleForm, receiptCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. QDF8192HKL or TXN-REF"
                        required
                      />
                      <small className="tx-field-hint">M-Pesa code from SMS or bank confirmation number</small>
                    </div>

                    <div className="tx-field">
                      <label>Amount Received (KES)</label>
                      <input
                        type="number"
                        min="0"
                        value={settleForm.amount}
                        onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                        placeholder="e.g. 2500"
                      />
                      <small className="tx-field-hint">Leave blank to use full order total</small>
                    </div>
                  </div>

                  <div className="tx-field">
                    <label>Settlement Audit Note / Resolution Reason</label>
                    <textarea
                      rows="2"
                      value={settleForm.note}
                      onChange={(e) => setSettleForm({ ...settleForm, note: e.target.value })}
                      placeholder="e.g. Customer paid via Till #5412345 after checkout prompt timed out. Confirmed in Daraja portal."
                    />
                  </div>

                  <div className="tx-settle-notice">
                    <ShieldCheck size={16} />
                    <span>
                      Settling will update the order to <strong>PAID</strong>, mark payment in the ledger as <strong>SUCCESS</strong>, and log an auditable admin action.
                    </span>
                  </div>

                  <div className="tx-form-actions">
                    <button
                      type="button"
                      className="tx-btn-cancel"
                      onClick={() => setShowSettleModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="tx-btn-submit-settle"
                      disabled={settling}
                    >
                      <CheckCircle2 size={15} />
                      <span>{settling ? 'Settling Payment...' : 'Verify & Settle Payment'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* TAB 2: UNSETTLED / PENDING ISSUES LIST */
                <div className="tx-unsettled-pane">
                  {unsettledLoading ? (
                    <div className="tx-modal-loading">
                      <div className="tx-spinner" />
                      <p>Scanning for drop-offs & pending checkouts...</p>
                    </div>
                  ) : unsettledCount === 0 ? (
                    <div className="tx-empty-settled">
                      <CheckCircle2 size={36} color="#10b981" />
                      <h4>No Unsettled Payment Issues!</h4>
                      <p>All recent checkouts and transactions have been cleanly reconciled.</p>
                    </div>
                  ) : (
                    <div className="tx-unsettled-list">
                      {unsettledData?.pendingOrders?.map((ord) => (
                        <div key={ord._id} className="tx-unsettled-item">
                          <div className="tx-ui-left">
                            <div className="tx-ui-tag pending">PENDING ORDER</div>
                            <strong className="tx-ui-order">Order #{ord.orderNumber}</strong>
                            <span className="tx-ui-customer">
                              {ord.shippingAddress?.firstName || ord.customer?.name || 'Customer'} ·{' '}
                              {ord.shippingAddress?.phone || ord.shippingAddress?.email || 'No phone'}
                            </span>
                            <span className="tx-ui-time">
                              Placed {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ord.paymentMethod}
                            </span>
                          </div>

                          <div className="tx-ui-right">
                            <strong className="tx-ui-amount">{formatCurrency(ord.total)}</strong>
                            <button
                              type="button"
                              className="tx-btn-ui-action"
                              onClick={() => openSettleForOrder(ord)}
                            >
                              <span>Settle This</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {unsettledData?.pendingTransactions?.map((ptx) => (
                        <div key={ptx._id} className="tx-unsettled-item">
                          <div className="tx-ui-left">
                            <div className="tx-ui-tag warning">PENDING GATEWAY STK</div>
                            <strong className="tx-ui-order">{ptx.transactionId}</strong>
                            <span className="tx-ui-customer">
                              {ptx.provider} · {ptx.order ? `Order #${ptx.order.orderNumber}` : 'Unlinked Order'}
                            </span>
                            <span className="tx-ui-time">
                              Initiated {new Date(ptx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="tx-ui-right">
                            <strong className="tx-ui-amount">{formatCurrency(ptx.amount)}</strong>
                            <div className="tx-ui-btn-group">
                              {ptx.provider === 'MPESA' && (
                                <button
                                  type="button"
                                  className="tx-btn-ui-query"
                                  onClick={(e) => handleQueryGateway(ptx._id, e)}
                                  disabled={queryingGatewayId === ptx._id}
                                >
                                  <RotateCw size={11} className={queryingGatewayId === ptx._id ? 'tx-spin' : ''} />
                                  <span>Check</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="tx-btn-ui-action"
                                onClick={() => openSettleForTx(ptx)}
                              >
                                <span>Settle</span>
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="tx-modal-footer">
              <button className="tx-btn-close-modal" onClick={() => setShowSettleModal(false)}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionsManagement;
