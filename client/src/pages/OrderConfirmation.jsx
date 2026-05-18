// pages/OrderConfirmation.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaPrint, FaWhatsapp, FaEnvelope } from 'react-icons/fa';

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!location.state) {
      navigate('/');
      return;
    }

    // In a real app, you'd fetch the order details from the API
    setOrder({
      _id: location.state.orderId,
      orderNumber: `RCD${Date.now().toString().slice(-6)}`,
      totalPrice: location.state.paymentData?.amount || 0,
      paymentMethod: location.state.paymentMethod,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    });
  }, [location.state, navigate]);

  if (!order) {
    return <div>Loading...</div>;
  }

  const shareOrder = (platform) => {
    const message = `I just ordered from Rerendet Coffee! Order #${order.orderNumber}`;
    const url = window.location.href;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message + ' ' + url)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=My Rerendet Coffee Order&body=${encodeURIComponent(message + '\n\n' + url)}`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="order-confirmation">
      <div className="container">
        <div className="confirmation-header">
          <div className="success-icon">
            <FaCheckCircle />
          </div>
          <h1>Order Confirmed!</h1>
          <p>Thank you for your order. We're preparing your coffee with care.</p>
        </div>

        <div className="confirmation-details">
          <div className="order-info">
            <h3>Order Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span>Order Number:</span>
                <strong>{order.orderNumber}</strong>
              </div>
              <div className="info-item">
                <span>Total Amount:</span>
                <strong>KES {order.totalPrice.toLocaleString()}</strong>
              </div>
              <div className="info-item">
                <span>Payment Method:</span>
                <strong>
                  {order.paymentMethod === 'mpesa' ? 'M-Pesa' : 
                   order.paymentMethod === 'airtel_money' ? 'Airtel Money' : 
                   'Cash on Delivery'}
                </strong>
              </div>
              <div className="info-item">
                <span>Estimated Delivery:</span>
                <strong>{order.estimatedDelivery.toLocaleDateString()}</strong>
              </div>
            </div>
          </div>

          <div className="next-steps">
            <h3>What's Next?</h3>
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Order Confirmation</h4>
                  <p>You'll receive an email confirmation shortly</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Order Processing</h4>
                  <p>We're preparing your coffee beans and equipment</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Shipping</h4>
                  <p>Your order will be shipped within 24 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="confirmation-actions">
          <button className="btn-primary" onClick={() => window.print()}>
            <FaPrint /> Print Receipt
          </button>
          <button className="btn-secondary" onClick={() => shareOrder('whatsapp')}>
            <FaWhatsapp /> Share via WhatsApp
          </button>
          <button className="btn-secondary" onClick={() => shareOrder('email')}>
            <FaEnvelope /> Email Receipt
          </button>
          <Link to="/" className="btn-outline">
            Continue Shopping
          </Link>
        </div>

        <div className="support-section">
          <h3>Need Help?</h3>
          <p>Contact our customer support team:</p>
          <div className="support-contacts">
            <div className="contact-method">
              <strong>Phone:</strong> +254 700 123 456
            </div>
            <div className="contact-method">
              <strong>Email:</strong> support@rerendetcoffee.com
            </div>
            <div className="contact-method">
              <strong>WhatsApp:</strong> +254 700 123 456
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;