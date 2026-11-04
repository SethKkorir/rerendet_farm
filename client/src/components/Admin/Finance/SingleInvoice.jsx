// client/src/components/Admin/Finance/SingleInvoice.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import { getInvoiceById, updateInvoiceStatus } from '../../../api/api';
import {
  ArrowLeft,
  Printer,
  Download,
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
import './CreateInvoice.css';
import './SingleInvoice.css';

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

  return (
    <div className="single-invoice-page">
      {/* ─── TOP ACTION BAR ─── */}
      <div className="si-topbar">
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
          {invoice.status !== 'paid' && (
            <button
              className="si-btn-mark-paid"
              onClick={handleMarkPaid}
              disabled={updating}
            >
              <CheckCircle2 size={14} />
              <span>{updating ? 'Updating...' : 'Mark as Paid'}</span>
            </button>
          )}
          <button className="si-btn-print" onClick={() => window.print()}>
            <Printer size={15} />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* ─── LUXURY A4 INVOICE SHEET ─── */}
      <div className="si-sheet-container">
        <div className="si-sheet">
          {/* Header */}
          <div className="sheet-header">
            <div className="sheet-brand">
              <div className="sheet-logo-row">
                <img src="/rerendet-logo.png" alt="Rerendet Farm" className="sheet-logo" />
                <div>
                  <h1 className="sheet-company-name">Rerendet Coffee Farm</h1>
                  <p className="sheet-company-sub">Single-Origin Arabica Roastery · Bomet, Kenya</p>
                </div>
              </div>
              <div className="sheet-meta-farm">
                <span>Highland Estate, Chepalungu Hills</span>
                <span>KRA PIN: P051982744T · VAT Registered</span>
                <span>orders@rerendetcoffee.com · +254 700 000 000</span>
              </div>
            </div>

            <div className="sheet-invoice-meta">
              <span className="sheet-doc-type">COMMERCIAL TAX INVOICE</span>
              <div className="sheet-doc-number">{invoice.invoiceNumber}</div>
              <div className="sheet-meta-row">
                <span className="sm-lbl">Issue Date:</span>
                <span className="sm-val">{new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="sheet-meta-row">
                <span className="sm-lbl">Due Date:</span>
                <span className="sm-val">{new Date(invoice.dueDate || invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="sheet-meta-row">
                <span className="sm-lbl">Payment Status:</span>
                <span className="sm-val font-bold">{invoice.status.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Bill To Bar */}
          <div className="sheet-bill-to-strip">
            <div className="sheet-bill-box">
              <span className="sheet-strip-label">INVOICED TO</span>
              <strong className="sheet-client-name">{client.name || 'Valued Client'}</strong>
              {client.company && <span className="sheet-client-co">{client.company}</span>}
              {client.address && <span>{client.address}</span>}
              <span>{client.city ? `${client.city}, ${client.country || 'Kenya'}` : client.country || 'Kenya'}</span>
              {client.email && <span>Email: {client.email}</span>}
              {client.phone && <span>Phone: {client.phone}</span>}
              {client.kraPin && <span className="sheet-pin">KRA PIN: {client.kraPin}</span>}
            </div>

            <div className="sheet-payment-box">
              <span className="sheet-strip-label">PAYMENT CHANNEL</span>
              <strong>Method: {invoice.paymentMethod || 'MPESA'}</strong>
              {invoice.paymentReference && (
                <span>Reference: <code>{invoice.paymentReference}</code></span>
              )}
              <p className="sheet-pay-instruct">
                {invoice.paymentInstructions || 'M-Pesa Till: 5412345 | Bank: Equity Bank Kenya'}
              </p>
            </div>
          </div>

          {/* Line items table */}
          <table className="sheet-table">
            <thead>
              <tr>
                <th className="th-desc">Product / Service Description</th>
                <th className="th-qty">Qty</th>
                <th className="th-unit">Unit Price</th>
                <th className="th-total">Total (KES)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <strong className="it-name">{it.name}</strong>
                    {it.description && <p className="it-desc">{it.description}</p>}
                  </td>
                  <td className="td-qty">{it.quantity}</td>
                  <td className="td-unit">KES {(Number(it.unitPrice) || 0).toLocaleString()}</td>
                  <td className="td-total">KES {(Number(it.total) || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bottom Totals */}
          <div className="sheet-summary-row">
            <div className="sheet-notes-block">
              <span className="sheet-strip-label">TERMS & SPECIAL INSTRUCTIONS</span>
              <p>{invoice.notes || 'Thank you for choosing Rerendet Specialty Coffee.'}</p>
            </div>

            <div className="sheet-totals-block">
              <div className="st-row">
                <span>Subtotal:</span>
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
              {taxAmount > 0 && (
                <div className="st-row">
                  <span>VAT ({invoice.taxRate || 16}%):</span>
                  <span>KES {taxAmount.toLocaleString()}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="st-row">
                  <span>Delivery Logistics:</span>
                  <span>KES {shippingCost.toLocaleString()}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="st-row discount">
                  <span>Discount:</span>
                  <span>- KES {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="st-row grand-total">
                <span>Total Amount:</span>
                <span>KES {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer signature */}
          <div className="sheet-footer">
            <div className="sheet-sign-box">
              {(invoice.signatureImage || publicSettings?.store?.signature) ? (
                <div className="sheet-signature-wrap">
                  <img
                    src={invoice.signatureImage || publicSettings?.store?.signature}
                    alt="Authorized Signature"
                    className="sheet-signature-img"
                  />
                </div>
              ) : (
                <div className="sheet-sign-line-placeholder" />
              )}
              <div className="sheet-sign-rule" />
              <span className="sheet-signatory-name">
                {invoice.signatoryName || publicSettings?.store?.signatoryName || 'Rerendet Farm Authorized Signatory'}
              </span>
              <span className="sheet-signatory-title">Rerendet Coffee Farm Management</span>
            </div>
            <div className="sheet-thanks">
              <span>{publicSettings?.store?.farmLocation || 'Rerendet Coffee Farm · Bomet, Kenya'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleInvoice;
