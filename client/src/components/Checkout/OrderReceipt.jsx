// components/Checkout/OrderReceipt.jsx — Premium Digital Invoice
import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion } from 'framer-motion';
import {
  FaCheckCircle, FaPrint, FaArrowLeft, FaTruck,
  FaDownload, FaHome, FaCoffee, FaMapMarkerAlt,
  FaEnvelope, FaPhone, FaCreditCard, FaCalendarAlt,
  FaReceipt, FaShieldAlt
} from 'react-icons/fa';
import './OrderReceipt.css';

const PMLabel = { mpesa: 'M-Pesa', card: 'Card', cod: 'Cash on Delivery' };

const OrderReceipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, showNotification } = useContext(AppContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) setOrder(result.data);
        else throw new Error(result.message);
      } catch (err) {
        console.error(err);
        showNotification?.('Could not load receipt', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    try {
      showNotification?.('Opening digital invoice…', 'info');
      const res = await fetch(`/api/orders/${id}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      showNotification?.('Failed to open invoice', 'error');
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="or-loading">
      <div className="or-spinner" />
      <p>Preparing your receipt…</p>
    </div>
  );

  if (!order) return (
    <div className="or-error">
      <FaCoffee className="or-error-icon" />
      <h2>Receipt not found</h2>
      <Link to="/account" className="or-btn primary">Go to My Orders</Link>
    </div>
  );

  const addr = order.shippingAddress || {};
  const isPaid = order.paymentStatus === 'paid';
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="or-page">
      {/* ── Print/Download toolbar (hides on print) ── */}
      <div className="or-toolbar no-print">
        <button className="or-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <div className="or-toolbar-actions">
          <button className="or-btn outline" onClick={handlePrint}>
            <FaPrint /> Print
          </button>
          <button className="or-btn primary" onClick={handleDownload}>
            <FaReceipt /> View Digital Invoice
          </button>
        </div>
      </div>

      {/* ── Invoice document ── */}
      <motion.div
        className="or-invoice"
        ref={printRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >

        {/* ══ HEADER ══ */}
        <div className="or-inv-header">
          <div className="or-inv-header-glow" />
          <div className="or-inv-brand">
            <img src="/rerendet-logo.png" alt="Rerendet" className="or-inv-logo" />
            <div>
              <h1 className="or-inv-brand-name">Rerendet Coffee</h1>
              <p className="or-inv-brand-sub">Premium Fresh Coffee · Nairobi, Kenya</p>
            </div>
          </div>
          <div className="or-inv-header-right">
            <span className="or-inv-label">DIGITAL INVOICE</span>
            <div className={`or-inv-status ${isPaid ? 'paid' : 'pending'}`}>
              {isPaid ? <><FaCheckCircle /> Paid</> : '⏳ Pending'}
            </div>
          </div>
        </div>

        <div className="or-gold-stripe" />

        {/* ══ META ROW ══ */}
        <div className="or-inv-meta">
          <div className="or-meta-cell">
            <span className="or-meta-label"><FaReceipt /> Invoice Number</span>
            <span className="or-meta-value mono">#{order.orderNumber}</span>
          </div>
          <div className="or-meta-cell">
            <span className="or-meta-label"><FaCalendarAlt /> Date Issued</span>
            <span className="or-meta-value">{orderDate}</span>
          </div>
          <div className="or-meta-cell">
            <span className="or-meta-label"><FaCreditCard /> Payment Method</span>
            <span className="or-meta-value">
              {PMLabel[order.paymentMethod?.toLowerCase()] || order.paymentMethod?.toUpperCase() || '—'}
            </span>
          </div>
          <div className="or-meta-cell">
            <span className="or-meta-label"><FaTruck /> Tracking ID</span>
            <span className="or-meta-value gold">{order.trackingNumber || 'Awaiting Prep'}</span>
          </div>
          <div className="or-meta-cell highlight">
            <span className="or-meta-label">Total Amount</span>
            <span className="or-meta-value gold-amt">KSh {order.total?.toLocaleString()}</span>
          </div>
        </div>

        {/* ══ ADDRESSES ══ */}
        <div className="or-inv-addresses">
          <div className="or-addr-block">
            <h3 className="or-addr-title"><FaEnvelope /> Billed To</h3>
            <div className="or-addr-line name">{addr.firstName} {addr.lastName}</div>
            <div className="or-addr-line">{addr.email}</div>
            <div className="or-addr-line">{addr.phone}</div>
          </div>
          <div className="or-addr-divider" />
          <div className="or-addr-block">
            <h3 className="or-addr-title"><FaMapMarkerAlt /> Shipped To</h3>
            <div className="or-addr-line name">{addr.firstName} {addr.lastName}</div>
            <div className="or-addr-line">{addr.address}</div>
            <div className="or-addr-line">{addr.city}, {addr.county}</div>
            <div className="or-addr-line">{addr.country || 'Kenya'}</div>
          </div>
        </div>

        {/* ══ ITEMS TABLE ══ */}
        <div className="or-inv-table-wrap">
          <table className="or-inv-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Size</th>
                <th className="center">Qty</th>
                <th className="right">Unit Price</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, i) => (
                <tr key={i}>
                  <td>
                    <div className="or-item-name">{item.name}</div>
                    {item.category === 'coffee-beans' ? (
                      <div className="or-item-sub">Freshly roasted selection</div>
                    ) : (
                      <div className="or-item-sub">Premium selection</div>
                    )}
                  </td>
                  <td><span className="or-tag">{item.size}</span></td>
                  <td className="center">{item.quantity}</td>
                  <td className="right">KSh {item.price?.toLocaleString()}</td>
                  <td className="right bold">KSh {(item.price * item.quantity)?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══ TOTALS ══ */}
        <div className="or-inv-totals">
          <div className="or-tot-row">
            <span>Subtotal</span>
            <span>KSh {order.subtotal?.toLocaleString()}</span>
          </div>
          {(order.shippingCost || 0) > 0 && (
            <div className="or-tot-row">
              <span>Shipping & Handling</span>
              <span>KSh {order.shippingCost?.toLocaleString()}</span>
            </div>
          )}
          {(order.discountAmount || 0) > 0 && (
            <div className="or-tot-row discount">
              <span>Discount Applied</span>
              <span>− KSh {order.discountAmount?.toLocaleString()}</span>
            </div>
          )}
          <div className="or-tot-row grand">
            <span>Grand Total</span>
            <strong>KSh {order.total?.toLocaleString()}</strong>
          </div>
        </div>

        {/* ══ TRUST STRIP ══ */}
        <div className="or-inv-trust">
          <div className="or-trust-item">
            <FaShieldAlt /> Secure Transaction
          </div>
          <div className="or-trust-item">
            <FaCoffee /> {order.items?.some(item => item.category === 'coffee-beans') ? 'Freshly Roasted' : 'Premium Quality'}
          </div>
          <div className="or-trust-item">
            <FaTruck /> Premium Delivery
          </div>
        </div>

        {/* ══ FOOTER ══ */}
        <div className="or-inv-footer">
          <p className="or-footer-thanks">Thank you for choosing Rerendet Coffee</p>
          <p className="or-footer-note">
            This is a computer-generated document. No signature is required.<br />
            For queries: <strong>orders@rerendetcoffee.com</strong> · +254 700 123 456
          </p>
        </div>

      </motion.div>{/* /or-invoice */}

      {/* ── Bottom action row (no-print) ── */}
      <div className="or-bottom-actions no-print">
        <button className="or-btn ghost" onClick={() => navigate('/')}>
          <FaHome /> Back to Shop
        </button>
        <button className="or-btn ghost" onClick={() => navigate('/account/orders')}>
          <FaTruck /> My Orders
        </button>
      </div>
    </div>
  );
};

export default OrderReceipt;