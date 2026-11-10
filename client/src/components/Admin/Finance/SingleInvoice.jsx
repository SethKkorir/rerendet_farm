// client/src/components/Admin/Finance/SingleInvoice.jsx — Luxury Editorial Invoice View
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import { getInvoiceById, updateInvoiceStatus, deleteInvoice } from '../../../api/api';
import {
  ArrowLeft,
  Printer,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Building,
  Mail,
  Phone,
  Calendar,
  CreditCard
} from 'lucide-react';
import '../../Checkout/OrderReceipt.css';
import './CreateInvoice.css';
import './SingleInvoice.css';

// 4x4 gold dot grid matching exact email & storefront Liceria design
const DotGrid = ({ className = '' }) => (
  <div className={`or-dot-grid ${className}`} aria-hidden="true">
    {Array.from({ length: 16 }).map((_, i) => (
      <span key={i} />
    ))}
  </div>
);

const SingleInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert, publicSettings } = useContext(AppContext);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await getInvoiceById(id);
      if (res.data?.success) {
        setInvoice(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load invoice:', err);
      showAlert('Unable to load invoice details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (!loading && invoice && location.search.includes('print=true')) {
      setTimeout(() => window.print(), 400);
    }
  }, [loading, invoice, location.search]);

  const handleMarkPaid = async () => {
    try {
      setUpdating(true);
      const res = await updateInvoiceStatus(id, { status: 'paid' });
      if (res.data?.success) {
        showAlert('Invoice marked as paid!', 'success');
        setInvoice((prev) => ({ ...prev, status: 'paid', paidAt: new Date() }));
      }
    } catch (err) {
      showAlert('Failed to update invoice status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete invoice ${invoice?.invoiceNumber || ''}?`)) return;
    try {
      const res = await deleteInvoice(id);
      if (res.data?.success) {
        showAlert('Invoice deleted successfully', 'success');
        navigate('/admin/invoices');
      }
    } catch (err) {
      showAlert('Failed to delete invoice', 'error');
    }
  };

  if (loading) {
    return (
      <div className="si-loading">
        <div className="si-spinner" />
        <p>Loading invoice document...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="si-not-found">
        <AlertTriangle size={32} />
        <h3>Invoice Not Found</h3>
        <p>The requested invoice could not be located in the database.</p>
        <button onClick={() => navigate('/admin/invoices')}>Return to Invoices</button>
      </div>
    );
  }

  const client = invoice.client || {};
  const items = invoice.items || [];
  const subtotal = invoice.subtotal || 0;
  const taxAmount = invoice.taxAmount || 0;
  const shippingCost = invoice.shippingCost || 0;
  const discount = invoice.discount || 0;
  const total = invoice.total || 0;
  const isPaid = invoice.status === 'paid';
  const store = publicSettings?.store || {};
  const signatureUrl = invoice.signatureImage || store.signature || '';
  const signatoryName = invoice.signatoryName || store.signatoryName || 'Authorized Farm Signatory';

  return (
    <div className="single-invoice-page">
      {/* ─── TOP ACTION BAR ─── */}
      <div className="si-topbar no-print">
        <div className="si-topbar-left">
          <button className="si-btn-back" onClick={() => navigate('/admin/invoices')}>
            <ArrowLeft size={16} />
            <span>Invoices</span>
          </button>
          <div className="si-title-group">
            <h2>{invoice.invoiceNumber}</h2>
            <span className={`si-status-tag ${invoice.status}`}>
              ● {invoice.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="si-topbar-actions">
          {!isPaid && (
            <button
              className="si-btn-mark-paid"
              onClick={handleMarkPaid}
              disabled={updating}
            >
              <CheckCircle2 size={14} />
              <span>{updating ? 'Updating...' : 'Mark as Paid'}</span>
            </button>
          )}
          <button className="si-btn-print" onClick={() => window.print()} title="Download PDF / Print">
            <Download size={15} />
            <span>Download PDF</span>
          </button>
          <button className="si-btn-print" onClick={() => window.print()} title="Print Document">
            <Printer size={15} />
            <span>Print</span>
          </button>
          <button
            className="si-btn-print"
            onClick={handleDelete}
            title="Delete Invoice"
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* ─── EXACT LICERIA EDITORIAL INVOICE SHEET (MATCHES EMAIL & STOREFRONT) ─── */}
      <div className="si-sheet-container">
        <div className="or-sheet" style={{ maxWidth: '820px', margin: '0 auto', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
          {/* Decorative curves in upper corner */}
          <svg className="or-sheet-curves" viewBox="0 0 480 240" fill="none">
            <path
              d="M50 0C160 80 320 60 480 180"
              stroke="#D4AF37"
              strokeWidth="1"
              strokeDasharray="4 6"
              opacity="0.4"
            />
            <path
              d="M120 0C220 120 360 90 480 220"
              stroke="#171311"
              strokeWidth="0.8"
              opacity="0.25"
            />
            <circle cx="430" cy="50" r="140" stroke="#E2DDD5" strokeWidth="1" />
          </svg>

          {/* Top Centered Brand Logo & Title */}
          <div className="or-center-logo-header">
            <img
              src={store.logo || '/rerendet-logo.png'}
              alt={store.name || 'Rerendet Coffee'}
              className="or-center-brand-logo"
              onError={(e) => { e.target.src = '/rerendet-logo.png'; }}
            />
            <h2 className="or-center-brand-name">{store.name || 'RERENDET COFFEE ROASTERS'}</h2>
            <p className="or-center-brand-sub">Great Rift Valley Highlands · Bomet, Kenya</p>
          </div>

          {/* ══ Upper Body Grid ══ */}
          <div className="or-body-grid">
            {/* ── Left Column: Giant Vertical Title + Client Info ── */}
            <div className="or-left-col">
              <div className="or-title-wrapper">
                <h1 className="or-vertical-title">{isPaid ? 'Receipt.' : 'Invoice.'}</h1>
                <div className="or-vertical-accent-line">
                  <div className="or-accent-dot" />
                </div>
              </div>

              <div className="or-client-box">
                <span className="or-label-sm">Invoice To :</span>
                <h2 className="or-client-name">{client.name || 'Valued Client'}</h2>
                {client.company && <p className="or-client-text" style={{ fontWeight: 700, color: '#1E150F' }}>{client.company}</p>}
                {client.phone && <p className="or-client-text">{client.phone}</p>}
                {client.email && <p className="or-client-text">{client.email}</p>}
                <p className="or-client-text">
                  {client.address ? `${client.address}, ` : ''}
                  {client.city ? `${client.city}, ` : ''}
                  {client.country || 'Kenya'}
                </p>
                {client.kraPin && (
                  <p className="or-client-text" style={{ fontSize: '11px', color: '#8A7C70' }}>
                    KRA PIN: {client.kraPin}
                  </p>
                )}

                <div className="or-three-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            {/* ── Right Column: Metadata & Items Table ── */}
            <div className="or-right-col">
              {/* Header Meta */}
              <div className="or-header-meta">
                <div className="or-meta-item">
                  <span className="or-meta-title">Invoice No :</span>
                  <span className="or-meta-val" style={{ fontWeight: 800 }}>{invoice.invoiceNumber}</span>
                </div>

                <div className="or-meta-item">
                  <span className="or-meta-title">{isPaid ? 'Receipt Date:' : 'Issue Date:'}</span>
                  <span className="or-meta-val">{new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="or-meta-item">
                  <span className="or-meta-title">Due Date:</span>
                  <span className="or-meta-val">{new Date(invoice.dueDate || invoice.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="or-meta-item">
                  <span className="or-meta-title">Status:</span>
                  <span className="or-meta-val" style={{ color: isPaid ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                    {isPaid ? 'PAID IN FULL (Settled)' : 'PAYMENT PENDING'}
                  </span>
                </div>

                <div className="or-three-dots" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              {/* Editorial Table */}
              <div className="or-table-container">
                <table className="or-table">
                  <thead>
                    <tr>
                      <th className="col-no">No</th>
                      <th className="col-desc">Description</th>
                      <th className="col-amt">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="col-no">{idx + 1}.</td>
                        <td className="col-desc">
                          <div className="or-desc-name">{item.name}</div>
                          {item.description && (
                            <div className="or-desc-meta">{item.description}</div>
                          )}
                          <div className="or-desc-meta">
                            Qty: {item.quantity || 1} {item.unitPrice ? `@ KES ${(Number(item.unitPrice) || 0).toLocaleString()}` : ''}
                          </div>
                        </td>
                        <td className="col-amt">
                          KES {(Number(item.total) || (Number(item.unitPrice || 0) * (item.quantity || 1))).toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {/* Shipping Fee if applicable */}
                    {shippingCost > 0 && (
                      <tr>
                        <td className="col-no">{items.length + 1}.</td>
                        <td className="col-desc">
                          <div className="or-desc-name">Delivery / Logistics Handling</div>
                          <div className="or-desc-meta">Freight Dispatch to {client.city || 'Client Destination'}</div>
                        </td>
                        <td className="col-amt">
                          KES {Number(shippingCost).toLocaleString()}
                        </td>
                      </tr>
                    )}

                    {/* Tax Amount if applicable */}
                    {taxAmount > 0 && (
                      <tr>
                        <td className="col-no">{items.length + (shippingCost > 0 ? 2 : 1)}.</td>
                        <td className="col-desc">
                          <div className="or-desc-name">Value Added Tax (VAT {invoice.taxRate || 16}%)</div>
                          <div className="or-desc-meta">Registered Statutory Tax</div>
                        </td>
                        <td className="col-amt">
                          KES {Number(taxAmount).toLocaleString()}
                        </td>
                      </tr>
                    )}

                    {/* Discount row if applicable */}
                    {discount > 0 && (
                      <tr>
                        <td className="col-no">—</td>
                        <td className="col-desc">
                          <div className="or-desc-name" style={{ color: '#10B981' }}>Special Commercial Discount</div>
                          <div className="or-desc-meta">Client Partnership Concession</div>
                        </td>
                        <td className="col-amt" style={{ color: '#10B981' }}>
                          − KES {Number(discount).toLocaleString()}
                        </td>
                      </tr>
                    )}

                    {/* Total Row */}
                    <tr className="or-table-total-row">
                      <td colSpan="2" style={{ fontWeight: 800 }}>Total</td>
                      <td className="col-amt">
                        KES {Number(total).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Clean Minimalist Single-Page Roastery Footer */}
          <div className="or-minimal-footer">
            <div className="or-footer-divider" />
            <div className="or-footer-row">
              <span>🌱 100% Shade-Grown Arabica</span>
              <span className="or-footer-dot">•</span>
              <span>Single-Origin Highland Harvest</span>
              <span className="or-footer-dot">•</span>
              <span>Official Commercial Document</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleInvoice;
