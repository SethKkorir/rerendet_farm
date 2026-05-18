import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initiateMpesaPayment, checkMpesaPaymentStatus } from '../actions/paymentActions';

const MpesaPayment = ({ order, onSuccess, onError }) => {
  const dispatch = useDispatch();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentId, setPaymentId] = useState(null);

  const user = useSelector(state => state.user.user);

  // Prefill phone number from user profile if available
  React.useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await dispatch(initiateMpesaPayment({
        orderId: order._id,
        phoneNumber: phoneNumber
      }));

      if (result.success) {
        setPaymentId(result.data.paymentId);
        // Start polling for payment status
        pollPaymentStatus(result.data.paymentId);
      } else {
        onError(result.message);
        setIsLoading(false);
      }
    } catch (error) {
      onError(error.message);
      setIsLoading(false);
    }
  };

  const pollPaymentStatus = (paymentId) => {
    const interval = setInterval(async () => {
      try {
        const result = await dispatch(checkMpesaPaymentStatus(paymentId));
        if (result.data.status === 'completed') {
          clearInterval(interval);
          onSuccess(result.data);
        } else if (result.data.status === 'failed') {
          clearInterval(interval);
          onError('Payment failed. Please try again.');
        }
        // If still pending, continue polling
      } catch (error) {
        clearInterval(interval);
        onError('Error checking payment status.');
      }
    }, 3000); // Check every 3 seconds
  };

  return (
    <div className="mpesa-payment">
      <h4>Pay with M-Pesa</h4>
      <p>Enter your M-Pesa registered phone number to receive a payment prompt.</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 07XX XXX XXX"
            required
          />
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Initiating Payment...' : 'Pay with M-Pesa'}
        </button>
      </form>

      {isLoading && paymentId && (
        <div className="payment-status-check">
          <p>Check your phone to complete the payment...</p>
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default MpesaPayment;