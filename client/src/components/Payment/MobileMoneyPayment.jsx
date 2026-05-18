// components/Payment/MobileMoneyPayment.js
import React, { useState, useEffect } from 'react';
import { usePayment } from '../../context/Paymentcontext';
import { FaMobileAlt, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

const MobileMoneyPayment = ({ 
  order, 
  paymentMethod, 
  onPaymentSuccess, 
  onPaymentError 
}) => {
  const { 
    paymentLoading, 
    paymentError, 
    paymentStatus, 
    initiateMpesaPayment, 
    initiateAirtelPayment,
    checkPaymentStatus 
  } = usePayment();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Prefill phone number from user profile if available
  useEffect(() => {
    if (order?.user?.phone) {
      setPhoneNumber(order.user.phone);
    }
  }, [order]);

  // Countdown for status checking
  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      onPaymentError('Please enter your phone number');
      return;
    }

    try {
      if (paymentMethod === 'mpesa') {
        await initiateMpesaPayment(order._id, phoneNumber);
      } else if (paymentMethod === 'airtel_money') {
        await initiateAirtelPayment(order._id, phoneNumber);
      }
      
      // Start checking payment status
      setCountdown(30); // 30 seconds countdown
      startStatusChecking();
    } catch (error) {
      onPaymentError(error.message);
    }
  };

  const startStatusChecking = async () => {
    if (!paymentStatus?.paymentId) return;

    setIsChecking(true);
    const interval = setInterval(async () => {
      try {
        const status = await checkPaymentStatus(paymentStatus.paymentId, paymentMethod);
        
        if (status === 'completed') {
          clearInterval(interval);
          setIsChecking(false);
          onPaymentSuccess(status);
        } else if (status === 'failed') {
          clearInterval(interval);
          setIsChecking(false);
          onPaymentError('Payment failed. Please try again.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000); // Check every 3 seconds

    // Stop checking after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      setIsChecking(false);
      if (paymentStatus?.status !== 'completed') {
        onPaymentError('Payment timeout. Please check your phone and try again.');
      }
    }, 300000);
  };

  const getPaymentInstructions = () => {
    if (paymentMethod === 'mpesa') {
      return {
        title: 'M-Pesa Payment',
        steps: [
          'Enter your M-Pesa registered phone number',
          'Click "Pay with M-Pesa"',
          'Check your phone for STK push prompt',
          'Enter your M-Pesa PIN to complete payment'
        ],
        icon: FaMobileAlt,
        color: '#00A650'
      };
    } else {
      return {
        title: 'Airtel Money Payment',
        steps: [
          'Enter your Airtel Money registered phone number',
          'Click "Pay with Airtel Money"',
          'Check your phone for payment request',
          'Confirm the payment on your phone'
        ],
        icon: FaMobileAlt,
        color: '#E30045'
      };
    }
  };

  const instructions = getPaymentInstructions();

  if (paymentStatus?.status === 'initiated') {
    return (
      <div className="payment-pending">
        <div className="payment-status">
          <FaSpinner className="spinner" />
          <h3>Payment Initiated</h3>
          <p>Check your phone to complete the payment...</p>
          
          <div className="countdown">
            Checking status in: {countdown}s
          </div>

          <div className="payment-steps">
            <div className="step active">
              <span>1</span>
              <p>Payment initiated</p>
            </div>
            <div className="step">
              <span>2</span>
              <p>Complete on your phone</p>
            </div>
            <div className="step">
              <span>3</span>
              <p>Payment confirmed</p>
            </div>
          </div>

          {isChecking && (
            <div className="checking-status">
              <FaSpinner className="spinner-small" />
              Checking payment status...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-money-payment">
      <div className="payment-header">
        <div className="payment-icon" style={{ color: instructions.color }}>
          <instructions.icon />
        </div>
        <div>
          <h3>{instructions.title}</h3>
          <p>KES {order.totalPrice.toLocaleString()}</p>
        </div>
      </div>

      <div className="payment-instructions">
        <h4>How to pay:</h4>
        <ul>
          {instructions.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 0712 345 678"
            required
          />
          <small>Enter your {paymentMethod === 'mpesa' ? 'M-Pesa' : 'Airtel Money'} registered number</small>
        </div>

        <button 
          type="submit" 
          className="pay-button"
          disabled={paymentLoading}
          style={{ backgroundColor: instructions.color }}
        >
          {paymentLoading ? (
            <>
              <FaSpinner className="spinner" />
              Initiating Payment...
            </>
          ) : (
            `Pay with ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'Airtel Money'}`
          )}
        </button>
      </form>

      {paymentError && (
        <div className="payment-error">
          <FaTimesCircle />
          <span>{paymentError}</span>
        </div>
      )}
    </div>
  );
};

export default MobileMoneyPayment;