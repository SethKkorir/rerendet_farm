// client/src/components/Admin/Finance/CreateInvoice.jsx — Streamlined Farm Commercial Invoice Creator
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import { createInvoice } from '../../../api/api';
import {
  Plus,
  Trash2,
  Printer,
  Send,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Upload,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import '../../Checkout/OrderReceipt.css';
import './CreateInvoice.css';

// 4x4 gold dot grid matching exact email & storefront Liceria design
const DotGrid = ({ className = '' }) => (
  <div className={`or-dot-grid ${className}`} aria-hidden="true">
    {Array.from({ length: 16 }).map((_, i) => (
      <span key={i} />
    ))}
  </div>
);

// Versatile farm presets spanning coffee, harvest produce, honey, macadamia, and nursery seedlings
const FARM_PRODUCT_PRESETS = [
  { name: 'Rerendet AA Medium Roast (500g)', unitPrice: 1800, category: 'Coffee' },
  { name: 'Highland Peaberry Roast (250g)', unitPrice: 1400, category: 'Coffee' },
  { name: 'Bulk Roasted Beans (1kg Bag)', unitPrice: 3200, category: 'Coffee' },
  { name: 'Hass Avocados (Per Crate / 15kg)', unitPrice: 2200, category: 'Produce' },
  { name: 'Raw Organic Farm Honey (1kg Jar)', unitPrice: 1500, category: 'Farm Produce' },
  { name: 'Premium Macadamia Nuts (1kg Pack)', unitPrice: 1800, category: 'Farm Produce' },
  { name: 'Ruptured Parchment Coffee (Bulk kg)', unitPrice: 900, category: 'Raw Coffee' },
  { name: 'Grafted Coffee Seedlings (Batch of 50)', unitPrice: 5000, category: 'Nursery' },
  { name: 'Farm Roastery Tour & Tasting (Per Person)', unitPrice: 2500, category: 'Agro-Tourism' }
];

const CreateInvoice = () => {
  const { showAlert, publicSettings } = useContext(AppContext);
  const navigate = useNavigate();
  const invoicePrintRef = useRef(null);
  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [showExtraClientDetails, setShowExtraClientDetails] = useState(false);

  // Auto-fetch signature from Settings
  const defaultSettingsSignature = publicSettings?.store?.signature || '';
  const defaultSignatoryName = publicSettings?.store?.signatoryName || 'Authorized Farm Signatory';

  const [signatureImage, setSignatureImage] = useState(defaultSettingsSignature);
  const [signatoryName, setSignatoryName] = useState(defaultSignatoryName);

  // Keep synced if publicSettings load asynchronously
  useEffect(() => {
    if (publicSettings?.store?.signature && !signatureImage) {
      setSignatureImage(publicSettings.store.signature);
    }
    if (publicSettings?.store?.signatoryName && signatoryName === 'Authorized Farm Signatory') {
      setSignatoryName(publicSettings.store.signatoryName);
    }
  }, [publicSettings]);

  // Invoice Number & Dates
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // Client Details (Simple by default)
  const [client, setClient] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    kraPin: '',
    address: '',
    city: 'Nairobi',
    country: 'Kenya'
  });

  // Line items state
  const [items, setItems] = useState([
    {
      id: 1,
      name: 'Rerendet AA Medium Roast (500g)',
      quantity: 5,
      unitPrice: 1800
    }
  ]);

  // Financials & Payment
  const [taxRate, setTaxRate] = useState(0); // Default to 0% for simple farm sales, can toggle to 16%
  const [shippingCost, setShippingCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('MPESA');
  const [paymentInstructions, setPaymentInstructions] = useState(
    'M-Pesa Till: 5412345 (Rerendet Coffee Farm) | Bank: Equity Bank, Acc: 01402938471'
  );
  const [notes, setNotes] = useState(
    'Harvested & processed fresh at Rerendet Farm, Bomet. Thank you for your partnership!'
  );

  // Calculations
  const subtotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const taxAmount = taxRate > 0 ? Math.round((subtotal * Number(taxRate)) / 100) : 0;
  const grandTotal = Math.max(0, subtotal + taxAmount + Number(shippingCost || 0) - Number(discount || 0));

  const handleAddItem = (preset = null) => {
    const newItem = preset
      ? { id: Date.now(), name: preset.name, quantity: 1, unitPrice: preset.unitPrice }
      : { id: Date.now(), name: '', quantity: 1, unitPrice: 0 };
    setItems((prev) => [...prev, newItem]);
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      showAlert('At least one item is required on the invoice', 'warning');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setSignatureImage(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!client.name.trim()) {
      showAlert('Please enter the customer / client name', 'error');
      return;
    }
    if (items.some((it) => !it.name.trim() || Number(it.unitPrice) <= 0)) {
      showAlert('Please make sure all items have a name and price', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        invoiceNumber,
        client,
        items: items.map((it) => ({
          name: it.name,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0
        })),
        taxRate: Number(taxRate) || 0,
        shippingCost: Number(shippingCost) || 0,
        discount: Number(discount) || 0,
        issueDate,
        dueDate,
        paymentTerms: 'due_on_receipt',
        paymentMethod,
        notes,
        paymentInstructions,
        signatureImage,
        signatoryName
      };

      const res = await createInvoice(payload);
      if (res.data?.success) {
        showAlert(`Invoice ${invoiceNumber} created successfully!`, 'success');
        navigate(`/admin/invoices/${res.data.data._id}`);
      }
    } catch (err) {
      console.error('Invoice creation failed:', err);
      showAlert(err.response?.data?.message || 'Failed to create invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-invoice-page">
      {/* ─── TOP ACTION BAR ─── */}
      <div className="ci-topbar">
        <div className="ci-topbar-left">
          <button className="ci-btn-back" onClick={() => navigate('/admin/invoices')}>
            <ArrowLeft size={16} />
            <span>Invoices</span>
          </button>
          <div className="ci-title-group">
            <h2>Create Farm Invoice</h2>
            <span className="ci-badge-draft">Live Preview</span>
          </div>
        </div>

        <div className="ci-topbar-actions">
          <button className="ci-btn-secondary" onClick={handlePrint} type="button">
            <Printer size={15} />
            <span>Print</span>
          </button>
          <button
            className="ci-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            type="button"
          >
            <Send size={15} />
            <span>{submitting ? 'Creating...' : 'Save & Issue Invoice'}</span>
          </button>
        </div>
      </div>

      {/* ─── SPLIT LAYOUT ─── */}
      <div className="ci-split-layout">
        
        {/* ─── LEFT: SIMPLIFIED FORM ─── */}
        <div className="ci-form-pane">
          
          {/* 1. Recipient Information */}
          <div className="ci-card">
            <div className="ci-card-header">
              <h3>1. Who is this invoice for?</h3>
            </div>
            
            <div className="ci-grid-2">
              <div className="ci-field full-col">
                <label>Customer / Client Name *</label>
                <input
                  type="text"
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                  placeholder="e.g. John Koech / Serena Hotel Cafe"
                  required
                />
              </div>

              <div className="ci-field">
                <label>Phone / M-Pesa Number</label>
                <input
                  type="tel"
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                  placeholder="e.g. 0712 345 678"
                />
              </div>

              <div className="ci-field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                  placeholder="e.g. client@gmail.com"
                />
              </div>
            </div>

            {/* Optional Collapsible for KRA / Company Tax Info */}
            <div className="ci-accordion-toggle">
              <button
                type="button"
                className="ci-btn-text"
                onClick={() => setShowExtraClientDetails(!showExtraClientDetails)}
              >
                {showExtraClientDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{showExtraClientDetails ? 'Hide' : '+ Add'} Company, KRA PIN or Delivery Address</span>
              </button>
            </div>

            {showExtraClientDetails && (
              <div className="ci-grid-2 ci-extra-fields">
                <div className="ci-field">
                  <label>Company / Business Name</label>
                  <input
                    type="text"
                    value={client.company}
                    onChange={(e) => setClient({ ...client, company: e.target.value })}
                    placeholder="e.g. Nairobi Specialty Roasters Ltd"
                  />
                </div>

                <div className="ci-field">
                  <label>KRA PIN (Tax Assessment)</label>
                  <input
                    type="text"
                    value={client.kraPin}
                    onChange={(e) => setClient({ ...client, kraPin: e.target.value.toUpperCase() })}
                    placeholder="e.g. P051234567Z"
                  />
                </div>

                <div className="ci-field full-col">
                  <label>Physical Address / Location</label>
                  <input
                    type="text"
                    value={client.address}
                    onChange={(e) => setClient({ ...client, address: e.target.value })}
                    placeholder="e.g. Corner House, 4th Floor, Nairobi"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Farm Items & Products */}
          <div className="ci-card">
            <div className="ci-card-header-between">
              <div>
                <h3>2. Items & Farm Products</h3>
                <p className="ci-card-sub">Add coffee, avocados, honey, seedlings, or custom farm goods.</p>
              </div>
              <button
                type="button"
                className="ci-btn-add-item"
                onClick={() => handleAddItem()}
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>

            {/* Farm Presets */}
            <div className="ci-presets-bar">
              <span className="ci-pb-label">Quick Add:</span>
              <div className="ci-pb-chips">
                {FARM_PRODUCT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ci-chip"
                    onClick={() => handleAddItem(preset)}
                  >
                    + {preset.name.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Table */}
            <div className="ci-items-table">
              <div className="ci-it-head">
                <span className="ci-col-desc">Item Description</span>
                <span className="ci-col-qty">Qty</span>
                <span className="ci-col-price">Price (KES)</span>
                <span className="ci-col-total">Total</span>
                <span className="ci-col-del"></span>
              </div>

              {items.map((it) => (
                <div key={it.id} className="ci-it-row">
                  <div className="ci-it-desc-col">
                    <input
                      type="text"
                      className="ci-input-title"
                      value={it.name}
                      onChange={(e) => handleItemChange(it.id, 'name', e.target.value)}
                      placeholder="e.g. 50kg Green Coffee or 2 Crated Avocados"
                      required
                    />
                  </div>

                  <div className="ci-it-qty-col">
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(it.id, 'quantity', e.target.value)}
                    />
                  </div>

                  <div className="ci-it-price-col">
                    <input
                      type="number"
                      min="0"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(it.id, 'unitPrice', e.target.value)}
                    />
                  </div>

                  <div className="ci-it-total-col">
                    KES {((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toLocaleString()}
                  </div>

                  <div className="ci-it-del-col">
                    <button
                      type="button"
                      className="ci-btn-del"
                      onClick={() => handleRemoveItem(it.id)}
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Payment & Totals */}
          <div className="ci-card">
            <div className="ci-card-header">
              <h3>3. Payment & Final Adjustments</h3>
            </div>

            <div className="ci-grid-2">
              <div className="ci-field">
                <label>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="ci-field">
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="MPESA">M-Pesa Till / Paybill</option>
                  <option value="BANK_TRANSFER">Bank Transfer (Equity Bank)</option>
                  <option value="CASH">Farm Gate Cash Settlement</option>
                  <option value="STRIPE">Card / Online</option>
                </select>
              </div>

              <div className="ci-field">
                <label>Delivery / Transport (KES)</label>
                <input
                  type="number"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div className="ci-field">
                <label>Tax / VAT</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                >
                  <option value={0}>0% (Zero-Rated / Agricultural Produce)</option>
                  <option value={16}>16% Standard VAT</option>
                </select>
              </div>

              <div className="ci-field full-col">
                <label>Payment Instructions</label>
                <input
                  type="text"
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 4. Official Signature & Stamp (Auto-fetched from Settings) */}
          <div className="ci-card">
            <div className="ci-card-header-between">
              <div>
                <h3>4. Official Signature & Stamp</h3>
                <p className="ci-card-sub">
                  {signatureImage ? 'Signature fetched from Settings' : 'No default signature set in Settings.'}
                </p>
              </div>
              <button
                type="button"
                className="ci-btn-text"
                onClick={() => navigate('/admin/settings')}
              >
                Manage in Settings
              </button>
            </div>

            <div className="ci-signature-box">
              <div className="ci-sig-preview-card">
                {signatureImage ? (
                  <div className="ci-sig-img-wrap">
                    <img src={signatureImage} alt="Farm Authorized Signature" />
                  </div>
                ) : (
                  <div className="ci-sig-placeholder">
                    <FileCheck size={28} />
                    <span>No signature picture found</span>
                  </div>
                )}
              </div>

              <div className="ci-sig-actions">
                <div className="ci-field">
                  <label>Signatory Name & Title</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. Authorized Farm Manager"
                  />
                </div>

                <div className="ci-sig-file-row">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="ci-btn-upload-sig"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={13} />
                    <span>{signatureImage ? 'Change Signature Pic' : 'Upload Signature Pic'}</span>
                  </button>

                  {signatureImage && (
                    <button
                      type="button"
                      className="ci-btn-remove-sig"
                      onClick={() => setSignatureImage('')}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ─── RIGHT: LIVE LUXURY EDITORIAL INVOICE PREVIEW ─── */}
        <div className="ci-preview-pane">
          <div className="ci-preview-sticky">
            <div className="ci-preview-head-banner">
              <div className="ci-ph-title">
                <Sparkles size={14} className="ci-sparkle" />
                <span>Live Liceria Editorial Preview</span>
              </div>
              <span className="ci-ph-pill">Instant Sync</span>
            </div>

            {/* PRINTABLE LUXURY COFFEEHOUSE & FARM INVOICE (Matching Email & Storefront Receipts) */}
            <div className="or-sheet" id="admin-create-preview-sheet" ref={invoicePrintRef} style={{ maxWidth: '100%' }}>
              {/* Subtle curved background lines */}
              <svg className="or-sheet-curves" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M0 80C140 180 280 40 420 160"
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
                  src={publicSettings?.store?.logo || '/rerendet-logo.png'}
                  alt={publicSettings?.store?.name || 'Rerendet Coffee'}
                  className="or-center-brand-logo"
                  onError={(e) => { e.target.src = '/rerendet-logo.png'; }}
                />
                <h2 className="or-center-brand-name">{publicSettings?.store?.name || 'RERENDET COFFEE ROASTERS'}</h2>
                <p className="or-center-brand-sub">Great Rift Valley Highlands · Bomet, Kenya</p>
              </div>

              {/* ══ Upper Body Grid ══ */}
              <div className="or-body-grid">
                {/* ── Left Column: Giant Vertical Title + Client Info ── */}
                <div className="or-left-col">
                  <div className="or-title-wrapper">
                    <h1 className="or-vertical-title">Invoice.</h1>
                    <div className="or-vertical-accent-line">
                      <div className="or-accent-dot" />
                    </div>
                  </div>

                  <div className="or-client-box">
                    <span className="or-label-sm">Invoice To :</span>
                    <h2 className="or-client-name">{client.name || 'Valued Client'}</h2>
                    {client.company && (
                      <p className="or-client-text" style={{ fontWeight: 700, color: '#1E150F' }}>
                        {client.company}
                      </p>
                    )}
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

                {/* ── Right Column: Brand Capsule & Items Table ── */}
                <div className="or-right-col">
                  {/* Header Meta */}
                  <div className="or-header-meta">
                    <div className="or-meta-item">
                      <span className="or-meta-title">Invoice No :</span>
                      <span className="or-meta-val" style={{ fontWeight: 800 }}>{invoiceNumber}</span>
                    </div>

                    <div className="or-meta-item">
                      <span className="or-meta-title">Issue Date:</span>
                      <span className="or-meta-val">{issueDate}</span>
                    </div>

                    <div className="or-meta-item">
                      <span className="or-meta-title">Due Date:</span>
                      <span className="or-meta-val">{dueDate}</span>
                    </div>

                    <div className="or-meta-item">
                      <span className="or-meta-title">Status:</span>
                      <span className="or-meta-val" style={{ color: '#D97706', fontWeight: 700 }}>
                        PAYMENT PENDING
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
                        {items.map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td className="col-no">{idx + 1}.</td>
                            <td className="col-desc">
                              <div className="or-desc-name">{it.name || 'Produce Item'}</div>
                              {it.description && (
                                <div className="or-desc-meta">{it.description}</div>
                              )}
                              <div className="or-desc-meta">
                                Qty: {it.quantity || 1} {it.unitPrice ? `@ KES ${(Number(it.unitPrice) || 0).toLocaleString()}` : ''}
                              </div>
                            </td>
                            <td className="col-amt">
                              KES {((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toLocaleString()}
                            </td>
                          </tr>
                        ))}

                        {/* Shipping Cost if entered */}
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

                        {/* Tax Row if calculated */}
                        {taxAmount > 0 && (
                          <tr>
                            <td className="col-no">{items.length + (shippingCost > 0 ? 2 : 1)}.</td>
                            <td className="col-desc">
                              <div className="or-desc-name">Value Added Tax (VAT {taxRate}%)</div>
                              <div className="or-desc-meta">Registered Statutory Tax</div>
                            </td>
                            <td className="col-amt">
                              KES {Number(taxAmount).toLocaleString()}
                            </td>
                          </tr>
                        )}

                        {/* Discount row if entered */}
                        {discount > 0 && (
                          <tr>
                            <td className="col-no">—</td>
                            <td className="col-desc">
                              <div className="or-desc-name" style={{ color: '#10B981' }}>Special Commercial Concession</div>
                              <div className="or-desc-meta">Entity Partnership Discount</div>
                            </td>
                            <td className="col-amt" style={{ color: '#10B981' }}>
                              − KES {Number(discount).toLocaleString()}
                            </td>
                          </tr>
                        )}

                        {/* Total Row */}
                        <tr className="or-table-total-row">
                          <td colSpan="2" style={{ fontWeight: 800 }}>Total Due</td>
                          <td className="col-amt">
                            KES {grandTotal.toLocaleString()}
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

      </div>
    </div>
  );
};

export default CreateInvoice;
