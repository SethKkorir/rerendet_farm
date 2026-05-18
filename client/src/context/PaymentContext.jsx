// context/PaymentContext.js
import React, { createContext, useState, useContext } from 'react';
import API from '../api/api'; // Uses in-memory token via interceptors

const PaymentContext = createContext();

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

export const PaymentProvider = ({ children }) => {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Initiate M-Pesa payment
  const initiateMpesaPayment = async (orderId, phoneNumber) => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const { data } = await API.post('/payments/mpesa/stk-push', { orderId, phoneNumber });
      setPaymentStatus({
        type: 'mpesa',
        status: 'initiated',
        data: data.data,
        paymentId: data.data.paymentId
      });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Payment initiation failed';
      setPaymentError(message);
      throw new Error(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Initiate Airtel Money payment
  const initiateAirtelPayment = async (orderId, phoneNumber) => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const { data } = await API.post('/payments/airtel/request', { orderId, phoneNumber });
      setPaymentStatus({
        type: 'airtel',
        status: 'initiated',
        data: data.data,
        paymentId: data.data.paymentId
      });
      return data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Payment initiation failed';
      setPaymentError(message);
      throw new Error(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Check payment status
  const checkPaymentStatus = async (paymentId, paymentType) => {
    try {
      const endpoint = paymentType === 'mpesa'
        ? `/payments/mpesa/status/${paymentId}`
        : `/payments/airtel/status/${paymentId}`;
      const { data } = await API.get(endpoint);
      setPaymentStatus(prev => ({ ...prev, status: data.data.status, data: data.data }));
      return data.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to check payment status';
      setPaymentError(message);
      throw new Error(message);
    }
  };

  // Clear payment state
  const clearPayment = () => {
    setPaymentLoading(false);
    setPaymentError(null);
    setPaymentStatus(null);
  };

  const value = {
    paymentLoading,
    paymentError,
    paymentStatus,
    initiateMpesaPayment,
    initiateAirtelPayment,
    checkPaymentStatus,
    clearPayment
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};