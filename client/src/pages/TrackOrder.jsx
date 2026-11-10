// src/pages/TrackOrder.jsx — Editorial Modern Coffee Journey Tracker
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaSearch,
  FaArrowRight,
  FaArrowLeft
} from 'react-icons/fa';
import { AppContext } from '../context/AppContext';
import './TrackOrder.css';

const TrackOrder = () => {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useContext(AppContext);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanId = orderId.trim();
    if (!cleanId) {
      showNotification('Please enter a valid Tracking ID or Order Number', 'warning');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      navigate(`/order-tracking/${cleanId}`);
    }, 450);
  };

  return (
    <div className="track-order-page">
      {/* ── Top Navigation Bar ── */}
      <div className="track-top-bar">
        <Link to="/" className="track-back-home-btn" title="Return to store homepage">
          <FaArrowLeft className="track-back-arrow" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="track-hero">
        <div className="track-container">
          <motion.div
            className="track-card"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="track-card-header">
              <h1 className="track-title">Track Your Coffee Journey</h1>
              <p className="track-subtitle">
                Enter your Tracking ID or Order Number to view real-time fulfillment updates.
              </p>
            </div>

            {/* Tracking Form */}
            <form onSubmit={handleSubmit} className="track-form">
              <div className="track-input-group">
                <div className="track-input-wrapper">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Enter Tracking ID or Order #"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    required
                    autoFocus
                    spellCheck="false"
                    autoComplete="off"
                  />
                  {orderId && (
                    <button
                      type="button"
                      className="track-clear-btn"
                      onClick={() => setOrderId('')}
                      title="Clear field"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button type="submit" disabled={loading} className="track-btn">
                  {loading ? (
                    <div className="track-spinner" />
                  ) : (
                    <>
                      <span>Locate Order</span>
                      <FaArrowRight className="track-btn-arrow" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Decorative Warm Ambient Background Elements */}
      <div className="track-bg-glow track-glow-top" />
      <div className="track-bg-glow track-glow-bottom" />
    </div>
  );
};

export default TrackOrder;
