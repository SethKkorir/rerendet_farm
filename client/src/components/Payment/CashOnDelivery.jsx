// components/Payment/CashOnDelivery.js
import React from 'react';
import { FaMoneyBillWave, FaTruck } from 'react-icons/fa';

const CashOnDelivery = ({ order, onPaymentSuccess }) => {
  const handleConfirm = () => {
    // For COD, we consider payment as "successful" immediately
    onPaymentSuccess({
      method: 'cash_on_delivery',
      status: 'pending',
      message: 'Pay when you receive your order'
    });
  };

  return (
    <div className="cash-on-delivery">
      <div className="cod-header">
        <div className="cod-icon">
          <FaMoneyBillWave />
        </div>
        <div>
          <h3>Cash on Delivery</h3>
          <p>Pay when you receive your order</p>
        </div>
      </div>

      <div className="cod-instructions">
        <div className="instruction-step">
          <FaTruck />
          <div>
            <h4>Delivery & Payment</h4>
            <p>Our delivery agent will bring your order to your specified address</p>
          </div>
        </div>
        
        <div className="instruction-step">
          <FaMoneyBillWave />
          <div>
            <h4>Pay on Delivery</h4>
            <p>Pay the exact amount of <strong>KES {order.totalPrice.toLocaleString()}</strong> in cash</p>
          </div>
        </div>
      </div>

      <div className="cod-notes">
        <h4>Important Notes:</h4>
        <ul>
          <li>Please have exact change ready</li>
          <li>Inspect your order before payment</li>
          <li>Delivery within 2-3 business days</li>
          <li>Free delivery for orders over KES 2,000</li>
        </ul>
      </div>

      <button 
        className="confirm-cod-btn"
        onClick={handleConfirm}
      >
        Confirm Cash on Delivery
      </button>
    </div>
  );
};

export default CashOnDelivery;