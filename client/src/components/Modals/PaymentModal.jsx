// src/components/Modals/PaymentModal.jsx
import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaTimes, FaMobileAlt, FaCreditCard } from 'react-icons/fa';
import './PaymentModal.css';

export const MpesaModal = () => {
  const { isMpesaModalOpen, setIsMpesaModalOpen, cartTotal, showNotification } = useContext(AppContext);
  const [phone, setPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsMpesaModalOpen(false);
      showNotification('Payment successful! Check your phone for M-Pesa confirmation');
    }, 2000);
  };

  if (!isMpesaModalOpen) return null;

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h2><FaMobileAlt /> M-Pesa Payment</h2>
          <button className="close-modal" onClick={() => setIsMpesaModalOpen(false)}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="phone-number">Phone Number</label>
              <input
                type="tel"
                id="phone-number"
                placeholder="e.g., 07XXXXXXXX"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <p className="modal-info">
              You will receive an M-Pesa prompt on your phone to complete the payment.
            </p>
            <div className="total-amount">
              <span>Total Amount:</span>
              <span>KSh {cartTotal.toLocaleString()}</span>
            </div>
            <button
              type="submit"
              className="btn primary btn-block"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const CardModal = () => {
  const { isCardModalOpen, setIsCardModalOpen, cartTotal, showNotification } = useContext(AppContext);
  const [cardDetails, setCardDetails] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    const digitsOnly = cardDetails.number.replace(/\s/g, '');
    if (digitsOnly.length !== 16) {
      showNotification('Please enter a valid 16-digit card number', 'error');
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsCardModalOpen(false);
      showNotification('Payment successful! Your order is confirmed.');
    }, 2000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({ ...prev, [name]: value }));
  };

  if (!isCardModalOpen) return null;

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h2><FaCreditCard /> Card Payment</h2>
          <button className="close-modal" onClick={() => setIsCardModalOpen(false)}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="card-name">Name on Card</label>
              <input
                type="text"
                id="card-name"
                name="name"
                required
                value={cardDetails.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="card-number">Card Number</label>
              <input
                type="text"
                id="card-number"
                name="number"
                placeholder="XXXX XXXX XXXX XXXX"
                required
                maxLength="19"
                value={cardDetails.number}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
                  setCardDetails(prev => ({ ...prev, number: formatted }));
                }}
              />
            </div>
            <div className="security-note" style={{ fontSize: '0.7rem', color: '#888', marginBottom: '1rem' }}>
              Rerendet does not store full CVV codes. Your data is encrypted for your protection.
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiry-date">Expiry Date</label>
                <input
                  type="text"
                  id="expiry-date"
                  name="expiry"
                  placeholder="MM/YY"
                  required
                  maxLength="5"
                  value={cardDetails.expiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    if (val.length >= 3) {
                      val = val.slice(0, 2) + '/' + val.slice(2);
                    }
                    setCardDetails(prev => ({ ...prev, expiry: val }));
                  }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="cvv">CVV</label>
                <input
                  type="text"
                  id="cvv"
                  name="cvv"
                  placeholder="123"
                  required
                  value={cardDetails.cvv}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="total-amount">
              <span>Total Amount:</span>
              <span>KSh {cartTotal.toLocaleString()}</span>
            </div>
            <button
              type="submit"
              className="btn primary btn-block"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Pay Now'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const PaymentModals = (props) => (
  <>
    <MpesaModal {...props} />
    <CardModal {...props} />
  </>
);

export default PaymentModals;
