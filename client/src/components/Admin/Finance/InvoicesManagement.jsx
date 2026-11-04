// client/src/components/Admin/Finance/InvoicesManagement.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import { getInvoices, updateInvoiceStatus } from '../../../api/api';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import './InvoicesManagement.css';

const InvoicesManagement = () => {
  const { showAlert } = useContext(AppContext);
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [metrics, setMetrics] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    totalPending: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchInvoicesList = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const params = {
        page: pagination.page,
        status: statusFilter,
        search: search.trim() || undefined
      };

      const res = await getInvoices(params);
      if (res.data?.success) {
        setInvoices(res.data.data.invoices || []);
        setMetrics(res.data.data.metrics || {});
        setPagination(res.data.data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      showAlert('Failed to load invoices directory', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoicesList();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoicesList();
  };

  const handleMarkPaid = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await updateInvoiceStatus(id, { status: 'paid' });
      if (res.data?.success) {
        showAlert('Invoice marked as paid', 'success');
        fetchInvoicesList(true);
      }
    } catch (err) {
      showAlert('Failed to update invoice status', 'error');
    }
  };

  const formatCurrency = (val) => `KES ${(Number(val) || 0).toLocaleString()}`;

  return (
    <div className="invoices-mgmt-page">
      
      {/* ─── HEADER BAR ─── */}
      <div className="im-header">
        <div className="im-title-group">
          <h2>Invoices & Commercial Billing</h2>
          <p className="im-subtitle">
            Generate, track, and manage customer orders and B2B wholesale coffee invoices.
          </p>
        </div>

        <div className="im-header-actions">
          <button
            className="im-btn-refresh"
            onClick={() => fetchInvoicesList(true)}
            disabled={refreshing}
            title="Refresh invoices"
          >
            <RefreshCw size={14} className={refreshing ? 'im-spin' : ''} />
          </button>
          <button
            className="im-btn-create"
            onClick={() => navigate('/admin/invoices/new')}
          >
            <Plus size={15} />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* ─── EXECUTIVE KPI CARDS ─── */}
      <div className="im-kpi-grid">
        <div className="im-kpi-card">
          <div className="im-kpi-top">
            <span className="im-kpi-lbl">Total Invoiced</span>
            <div className="im-kpi-icon gold">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="im-kpi-val">{formatCurrency(metrics.totalInvoiced)}</div>
          <span className="im-kpi-sub">Across all wholesale & customer orders</span>
        </div>

        <div className="im-kpi-card">
          <div className="im-kpi-top">
            <span className="im-kpi-lbl">Paid & Settled</span>
            <div className="im-kpi-icon green">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="im-kpi-val">{formatCurrency(metrics.totalPaid)}</div>
          <span className="im-kpi-sub">Cleared through M-Pesa & Card</span>
        </div>

        <div className="im-kpi-card">
          <div className="im-kpi-top">
            <span className="im-kpi-lbl">Pending Receivables</span>
            <div className="im-kpi-icon amber">
              <Clock size={16} />
            </div>
          </div>
          <div className="im-kpi-val">{formatCurrency(metrics.totalPending)}</div>
          <span className="im-kpi-sub">Awaiting customer payment</span>
        </div>

        <div className="im-kpi-card">
          <div className="im-kpi-top">
            <span className="im-kpi-lbl">Overdue</span>
            <div className="im-kpi-icon red">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="im-kpi-val">{metrics.overdueCount || 0} Invoices</div>
          <span className="im-kpi-sub">Passed payment due date</span>
        </div>
      </div>

      {/* ─── SEARCH & FILTER STRIP ─── */}
      <div className="im-controls-card">
        <div className="im-filter-tabs">
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'paid', label: 'Paid' },
            { id: 'pending', label: 'Pending' },
            { id: 'overdue', label: 'Overdue' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`im-ft-btn ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="im-search-box">
          <Search size={15} className="im-search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice #, client, or company..."
          />
        </form>
      </div>

      {/* ─── INVOICES DIRECTORY TABLE ─── */}
      <div className="im-table-card">
        {loading ? (
          <div className="im-loading-state">
            <div className="im-spinner" />
            <p>Loading invoice records...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="im-empty-state">
            <div className="im-empty-icon">
              <FileText size={32} />
            </div>
            <h4>No Invoices Found</h4>
            <p>No invoices match the selected filter criteria or search query.</p>
            <button
              className="im-btn-create-subtle"
              onClick={() => navigate('/admin/invoices/new')}
            >
              <Plus size={14} /> Create New Invoice
            </button>
          </div>
        ) : (
          <div className="im-table-wrap">
            <table className="im-table">
              <thead>
                <tr>
                  <th className="col-doc">Invoice / Document</th>
                  <th className="col-client">Client & Organization</th>
                  <th className="col-date">Date</th>
                  <th className="col-amount">Amount</th>
                  <th className="col-status">Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="im-row"
                    onClick={() => navigate(`/admin/invoices/${inv._id}`)}
                  >
                    <td className="col-doc">
                      <div className="im-doc-cell">
                        <div className="im-pdf-badge">
                          <FileText size={16} />
                        </div>
                        <div>
                          <strong className="im-doc-num">{inv.invoiceNumber}</strong>
                          <span className="im-doc-method">
                            {inv.paymentMethod} {inv.paymentReference ? `· ${inv.paymentReference}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="col-client">
                      <div className="im-client-cell">
                        <span className="im-client-name">{inv.client?.name || 'Customer'}</span>
                        {inv.client?.company && (
                          <span className="im-client-co">{inv.client.company}</span>
                        )}
                      </div>
                    </td>

                    <td className="col-date">
                      <div className="im-date-cell">
                        <span>{new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}</span>
                        <span className="im-due-sub">Due: {new Date(inv.dueDate || inv.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="col-amount">
                      <strong className="im-amount">{formatCurrency(inv.total)}</strong>
                    </td>

                    <td className="col-status">
                      <span className={`im-status-pill ${inv.status}`}>
                        ● {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>

                    <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="im-action-btns">
                        <button
                          className="im-action-icon"
                          title="View Single Invoice"
                          onClick={() => navigate(`/admin/invoices/${inv._id}`)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="im-action-icon"
                          title="Print / PDF"
                          onClick={() => navigate(`/admin/invoices/${inv._id}?print=true`)}
                        >
                          <Printer size={15} />
                        </button>
                        {inv.status !== 'paid' && (
                          <button
                            className="im-action-mark-paid"
                            title="Mark as Paid"
                            onClick={(e) => handleMarkPaid(inv._id, e)}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default InvoicesManagement;
