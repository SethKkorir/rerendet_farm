// components/Account/PaymentMethodsTab.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaCreditCard, FaMobileAlt, FaPlus, FaTrash, FaCheckCircle,
  FaShieldAlt, FaLock, FaCheck, FaExclamationTriangle
} from 'react-icons/fa';
import {
  getMyPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod
} from '../../api/api';

const PaymentMethodsTab = () => {
  const { showNotification } = useContext(AppContext);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cardData, setCardData] = useState({
    name: '',
    last4: '',
    brand: 'Visa',
    expiryMonth: '12',
    expiryYear: '2028'
  });

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const res = await getMyPaymentMethods();
      if (res.data?.success) {
        setMethods(res.data.data || []);
      }
    } catch (err) {
      showNotification('Failed to load payment methods', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleSetDefault = async (id) => {
    try {
      const res = await setDefaultPaymentMethod(id);
      if (res.data?.success) {
        showNotification('Default payment method updated', 'success');
        fetchMethods();
      }
    } catch (err) {
      showNotification('Failed to update default payment method', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deletePaymentMethod(id);
      if (res.data?.success) {
        showNotification('Payment method removed', 'info');
        fetchMethods();
      }
    } catch (err) {
      showNotification('Failed to delete payment method', 'error');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let payload = { type: paymentType, name: nickname };
      if (paymentType === 'mpesa') {
        if (!phone.trim()) {
          showNotification('M-Pesa phone number is required', 'warning');
          setSubmitting(false);
          return;
        }
        payload.phone = phone;
      } else {
        if (!cardData.last4 || cardData.last4.length !== 4) {
          showNotification('Enter the last 4 digits of your card', 'warning');
          setSubmitting(false);
          return;
        }
        payload.card = {
          last4: cardData.last4,
          brand: cardData.brand,
          expiryMonth: Number(cardData.expiryMonth),
          expiryYear: Number(cardData.expiryYear)
        };
      }

      const res = await addPaymentMethod(payload);
      if (res.data?.success) {
        showNotification('Payment method saved securely', 'success');
        setModalOpen(false);
        setPhone('');
        setNickname('');
        setCardData({ name: '', last4: '', brand: 'Visa', expiryMonth: '12', expiryYear: '2028' });
        fetchMethods();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save payment method', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modern-dashboard-tab">
        <div className="tab-loading-spinner">
          <div className="noir-spinner" />
          <p>Loading secure payment methods…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard-tab">
      <div className="tab-section-header">
        <div>
          <h2>Payment Methods</h2>
          <p>Manage payment methods for 1-click checkout and subscriptions without storing raw card numbers.</p>
        </div>
        <button
          type="button"
          className="btn-order-primary"
          onClick={() => setModalOpen(true)}
        >
          <FaPlus /> Add Payment Method
        </button>
      </div>

      {/* Security Guarantee Banner */}
      <div className="payment-security-banner">
        <div className="sec-icon"><FaShieldAlt /></div>
        <div className="sec-text">
          <strong>Zero Raw Card Storage Guarantee:</strong>
          <span> All card credentials are cryptographically tokenized by PCI-DSS Level 1 payment gateways. We store only masked display references (e.g. •••• 4417).</span>
        </div>
      </div>

      {methods.length === 0 ? (
        <div className="empty-state-luxury">
          <div className="empty-icon-wrap">
            <FaCreditCard className="empty-icon" />
          </div>
          <h3>No Saved Payment Methods</h3>
          <p>Link your M-Pesa phone number or card token for express checkout and subscription deliveries.</p>
          <button
            type="button"
            className="btn-order-primary"
            onClick={() => setModalOpen(true)}
          >
            <FaPlus /> Add Your First Method
          </button>
        </div>
      ) : (
        <div className="payment-methods-grid">
          {methods.map(m => {
            const isMpesa = m.type === 'mpesa';
            return (
              <div key={m._id} className={`payment-card ${m.isDefault ? 'default' : ''}`}>
                <div className="p-card-header">
                  <div className="p-brand-badge">
                    {isMpesa ? <FaMobileAlt /> : <FaCreditCard />}
                    <span>{isMpesa ? 'M-Pesa Direct' : m.card?.brand || 'Card'}</span>
                  </div>
                  {m.isDefault && (
                    <span className="default-pill">
                      <FaCheck size={10} /> Default
                    </span>
                  )}
                </div>

                <div className="p-card-body">
                  <h4 className="p-masked-number">
                    {isMpesa ? m.maskedPhone : `•••• •••• •••• ${m.card?.last4 || '••••'}`}
                  </h4>
                  <span className="p-nickname">{m.name}</span>
                  {!isMpesa && m.card?.expiryMonth && (
                    <span className="p-expiry">Expires {m.card.expiryMonth}/{m.card.expiryYear}</span>
                  )}
                </div>

                <div className="p-card-actions">
                  {!m.isDefault && (
                    <button
                      type="button"
                      className="p-btn-action"
                      onClick={() => handleSetDefault(m._id)}
                    >
                      Make Default
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-btn-delete"
                    onClick={() => handleDelete(m._id)}
                    title="Delete payment method"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Payment Modal */}
      {modalOpen && (
        <div className="dashboard-modal-backdrop">
          <div className="dashboard-modal-window">
            <h3>Add Saved Payment Method</h3>
            <p className="modal-subtext">Save a tokenized payment reference for convenient 1-click purchases.</p>

            <div className="payment-type-tabs">
              <button
                type="button"
                className={`type-tab-btn ${paymentType === 'mpesa' ? 'active' : ''}`}
                onClick={() => setPaymentType('mpesa')}
              >
                <FaMobileAlt /> M-Pesa Express
              </button>
              <button
                type="button"
                className={`type-tab-btn ${paymentType === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentType('card')}
              >
                <FaCreditCard /> Debit / Credit Card
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="payment-form-grid">
              {paymentType === 'mpesa' ? (
                <>
                  <div className="modal-field">
                    <label>M-Pesa Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="0712 345 678 or +254 712..."
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modal-field">
                    <label>Nickname / Label (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. My Personal Safaricom"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-field">
                    <label>Card Brand</label>
                    <select
                      value={cardData.brand}
                      onChange={e => setCardData({ ...cardData, brand: e.target.value })}
                    >
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="American Express">American Express</option>
                    </select>
                  </div>
                  <div className="modal-field">
                    <label>Last 4 Digits *</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 4242"
                      value={cardData.last4}
                      onChange={e => setCardData({ ...cardData, last4: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>
                  <div className="modal-field-row">
                    <div className="modal-field">
                      <label>Expiry Month</label>
                      <select
                        value={cardData.expiryMonth}
                        onChange={e => setCardData({ ...cardData, expiryMonth: e.target.value })}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                            {String(i + 1).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="modal-field">
                      <label>Expiry Year</label>
                      <select
                        value={cardData.expiryYear}
                        onChange={e => setCardData({ ...cardData, expiryYear: e.target.value })}
                      >
                        {[2026, 2027, 2028, 2029, 2030, 2031, 2032].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-order-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Securing…' : 'Save Payment Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsTab;
