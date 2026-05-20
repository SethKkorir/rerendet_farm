import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaCheckCircle, FaHome, FaShoppingBag, FaWhatsapp,
  FaLock, FaShareAlt, FaRegClock, FaShippingFast
} from 'react-icons/fa';
import './Confirmation.css';

function Confirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { orderDetails, paymentMethod, orderTotal } = state || {};

  // State for interactive elements
  const [upgradeExpired, setUpgradeExpired] = useState(false);
  const [sharedCount, setSharedCount] = useState(0);

  // Sample order progress (replace with real data)
  const orderProgress = {
    prepared: true,
    shipped: false,
    delivered: false,
    estimatedDelivery: 'July 29-30, 2024'
  };

  // Recommended products
  const recommendations = [
    { id: 1, name: 'Aeropress', price: 'KES 1,990', tag: 'Bestseller' },
    { id: 2, name: 'Hario Scale', price: 'KES 3,500', tag: '12% OFF' }
  ];

  return (
    <div className="confirmation-page">
      {/* Header remains the same */}
      <header className="confirmation-header">
        <div className="confirmation-logo">
          <a href="/">☕ Rerendet Coffee</a>
        </div>
      </header>

      <div className="confirmation-container">
        <div className="confirmation-card">
          {/* Animated checkmark */}
          <div className="confirmation-icon animate-check">
            <FaCheckCircle />
            {/* <div className="confetti"></div> */}
          </div>

          <h1>Order Confirmed! 🎉</h1>
          <p className="confirmation-message">
            {orderDetails?.firstName || 'Dear customer'}, your fresh coffee is being
            hand-packed now! Expected dispatch: <strong>Tomorrow by 3PM EAT</strong>
          </p>

          {/* Progress tracker */}
          <div className="progress-tracker">
            <div className={`progress-step ${orderProgress.prepared ? 'completed' : ''}`}>
              <div className="step-icon">
                {orderProgress.prepared ? '✓' : '1'}
              </div>
              <div className="step-label">Preparing</div>
            </div>

            <div className={`progress-step ${orderProgress.shipped ? 'completed' : ''}`}>
              <div className="step-icon">
                {orderProgress.shipped ? '✓' : '2'}
              </div>
              <div className="step-label">Shipped</div>
            </div>

            <div className={`progress-step ${orderProgress.delivered ? 'completed' : ''}`}>
              <div className="step-icon">
                {orderProgress.delivered ? '✓' : '3'}
              </div>
              <div className="step-label">Delivered</div>
            </div>
          </div>

          {/* Upgrade offer (time-sensitive) */}
          {!upgradeExpired && (
            <div className="upgrade-offer">
              <div className="offer-header">
                <FaShippingFast />
                <h3>Want it faster?</h3>
                <div className="countdown">15:00</div>
              </div>
              <p>Upgrade to <strong>Express Delivery</strong> for KES 300 and get it by tomorrow</p>
              <button className="btn-upgrade">Upgrade Now</button>
            </div>
          )}

          {/* Order details (your existing structure) */}
          <div className="confirmation-details">
            <p>Name: {orderDetails?.firstName} {orderDetails?.lastName}</p>
            <p>Email: {orderDetails?.email}</p>
            <p>Phone: {orderDetails?.phone}</p>
            <p>Address: {orderDetails?.address}, {orderDetails?.city}</p>
          </div>

          {/* WhatsApp notification opt-in */}
          <div className="whatsapp-optin">
            <FaWhatsapp className="whatsapp-icon" />
            <div>
              <h3>Get real-time updates</h3>
              <p>Receive brewing, shipping, and delivery notifications</p>
            </div>
            <button className="btn-whatsapp">Connect</button>
          </div>

          {/* Product recommendations */}
          <div className="product-recommendations">
            <h3>Complete Your Brew Kit</h3>
            <div className="recommendation-grid">
              {recommendations.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-tag">{product.tag}</div>
                  <h4>{product.name}</h4>
                  <p className="price">{product.price}</p>
                  <button className="btn-add">Add to Cart</button>
                </div>
              ))}
            </div>
          </div>

          {/* Social sharing rewards */}
          <div className="social-rewards">
            <h3>Share & Earn Rewards</h3>
            <p>Post your order and get 50 bonus points + free samples</p>
            <div className="share-buttons">
              <button onClick={() => setSharedCount(sharedCount + 1)}>
                <FaShareAlt /> Twitter ({sharedCount}/2)
              </button>
              <button onClick={() => setSharedCount(sharedCount + 1)}>
                <FaShareAlt /> Instagram ({sharedCount}/2)
              </button>
            </div>
            {sharedCount >= 2 && (
              <div className="reward-unlocked">
                🎉 Bonus unlocked! Free samples added to your account
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="trust-badges">
            <div className="badge">
              <FaLock /> Secure M-Pesa Payment
            </div>
            <div className="badge">
              <FaRegClock /> 30-Day Freshness Guarantee
            </div>
          </div>

          {/* Your existing action buttons */}
          <div className="confirmation-actions">
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              <FaHome /> Back to Home
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/', { state: { scrollTo: 'coffee-shop' } })}>
              <FaShoppingBag /> Continue Shopping
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Confirmation;