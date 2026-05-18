// components/Payment/PaymentMethodSelect.js
import React, { useState } from 'react';
import { FaMobileAlt, FaMoneyBillWave, FaCreditCard, FaCheck } from 'react-icons/fa';

const PaymentMethodSelect = ({ selectedMethod, onMethodSelect, orderTotal }) => {
  const paymentMethods = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      description: 'Pay instantly with M-Pesa',
      icon: FaMobileAlt,
      color: '#00A650',
      supported: true
    },
    {
      id: 'airtel_money',
      name: 'Airtel Money',
      description: 'Pay with Airtel Money',
      icon: FaMobileAlt,
      color: '#E30045',
      supported: true
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Pay with Visa, MasterCard',
      icon: FaCreditCard,
      color: '#0066CC',
      supported: false
    },
    {
      id: 'cash_on_delivery',
      name: 'Cash on Delivery',
      description: 'Pay when you receive your order',
      icon: FaMoneyBillWave,
      color: '#FF6B00',
      supported: true
    }
  ];

  return (
    <div className="payment-method-select">
      <h3>Select Payment Method</h3>
      <p className="order-total">Order Total: <strong>KES {orderTotal.toLocaleString()}</strong></p>
      
      <div className="payment-options">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`payment-option ${selectedMethod === method.id ? 'selected' : ''} ${
              !method.supported ? 'disabled' : ''
            }`}
            onClick={() => method.supported && onMethodSelect(method.id)}
          >
            <div className="option-header">
              <div className="option-icon" style={{ color: method.color }}>
                <method.icon />
              </div>
              <div className="option-info">
                <h4>{method.name}</h4>
                <p>{method.description}</p>
              </div>
              <div className="option-selector">
                {selectedMethod === method.id ? (
                  <FaCheck className="selected-check" />
                ) : (
                  <div className="radio-circle"></div>
                )}
              </div>
            </div>
            
            {!method.supported && (
              <div className="coming-soon-badge">Coming Soon</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodSelect;