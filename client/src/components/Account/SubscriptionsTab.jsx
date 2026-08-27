// components/Account/SubscriptionsTab.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaSync, FaPause, FaPlay, FaForward, FaCalendarAlt,
  FaTimes, FaTruck, FaLeaf, FaCoffee, FaCheck, FaExclamationTriangle,
  FaInfoCircle, FaShieldAlt
} from 'react-icons/fa';
import {
  getMySubscriptions,
  pauseSubscription,
  resumeSubscription,
  skipNextSubscriptionDelivery,
  updateSubscriptionFrequency,
  cancelSubscription
} from '../../api/api';

const SubscriptionsTab = () => {
  const { showNotification } = useContext(AppContext);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [frequencyModal, setFrequencyModal] = useState(null);
  const [selectedFreq, setSelectedFreq] = useState('monthly');

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await getMySubscriptions();
      if (res.data?.success) {
        setSubscriptions(res.data.data || []);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const handlePause = async (id) => {
    try {
      setActionLoading(`pause-${id}`);
      const res = await pauseSubscription(id);
      if (res.data?.success) {
        showNotification(res.data.message || 'Subscription paused', 'success');
        fetchSubs();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to pause subscription', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id) => {
    try {
      setActionLoading(`resume-${id}`);
      const res = await resumeSubscription(id);
      if (res.data?.success) {
        showNotification(res.data.message || 'Subscription resumed', 'success');
        fetchSubs();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to resume subscription', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkip = async (id) => {
    try {
      setActionLoading(`skip-${id}`);
      const res = await skipNextSubscriptionDelivery(id);
      if (res.data?.success) {
        showNotification(res.data.message || 'Next delivery skipped!', 'success');
        fetchSubs();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to skip delivery', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateFreq = async () => {
    if (!frequencyModal) return;
    try {
      setActionLoading(`freq-${frequencyModal._id}`);
      const res = await updateSubscriptionFrequency(frequencyModal._id, selectedFreq);
      if (res.data?.success) {
        showNotification(res.data.message || 'Schedule updated', 'success');
        setFrequencyModal(null);
        fetchSubs();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update schedule', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal) return;
    try {
      setActionLoading(`cancel-${cancelModal._id}`);
      const res = await cancelSubscription(cancelModal._id, cancelReason);
      if (res.data?.success) {
        showNotification(res.data.message || 'Subscription cancelled', 'info');
        setCancelModal(null);
        setCancelReason('');
        fetchSubs();
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to cancel subscription', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatSubDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="modern-dashboard-tab">
        <div className="tab-loading-spinner">
          <div className="noir-spinner" />
          <p>Loading recurring coffee schedules…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard-tab">
      <div className="tab-section-header">
        <div>
          <h2>Coffee Subscriptions</h2>
          <p>Self-service recurring deliveries roasted fresh before dispatch with subscriber benefits.</p>
        </div>
        <div className="tab-header-badge subscriber">
          <FaLeaf /> 5% Subscriber Discount Included
        </div>
      </div>

      {subscriptions.length === 0 ? (
        <div className="empty-state-luxury">
          <div className="empty-icon-wrap">
            <FaSync className="empty-icon" />
          </div>
          <h3>No Active Coffee Subscriptions</h3>
          <p>Never run out of highland coffee again. Choose your favorite roast and schedule automatic deliveries.</p>
          <button
            type="button"
            className="btn-order-primary"
            onClick={() => window.location.href = '/'}
          >
            Explore Specialty Roasts
          </button>
        </div>
      ) : (
        <div className="subscriptions-grid">
          {subscriptions.map(sub => {
            const isPaused = sub.status === 'paused';
            const isCancelled = sub.status === 'cancelled';
            const isActive = sub.status === 'active';

            return (
              <div key={sub._id} className={`subscription-card ${sub.status}`}>
                {/* Header Strip */}
                <div className="sub-card-top">
                  <div className="sub-status-indicator">
                    <span className={`status-pill ${sub.status}`}>
                      {sub.status === 'active' && <FaCheck size={10} />}
                      {sub.status === 'paused' && <FaPause size={10} />}
                      {sub.status === 'cancelled' && <FaTimes size={10} />}
                      {sub.status.toUpperCase()}
                    </span>
                    <span className="sub-frequency-tag">Every {sub.frequency.replace('-', ' ')}</span>
                  </div>
                  <span className="sub-discount-tag">5% Off applied</span>
                </div>

                {/* Products List */}
                <div className="sub-products-stack">
                  {sub.products?.map((item, idx) => {
                    const prod = item.product || {};
                    const img = prod.images?.[0]?.url || prod.image || '/default-product.jpg';
                    return (
                      <div key={idx} className="sub-product-row">
                        <div className="sub-prod-img">
                          <img src={img} alt={prod.name || 'Coffee'} />
                        </div>
                        <div className="sub-prod-info">
                          <h4>{prod.name || 'Specialty Blend'}</h4>
                          <span className="sub-prod-meta">{item.size || '250g'} · Qty: {item.quantity}</span>
                        </div>
                        <div className="sub-prod-price">
                          <strong>KES {item.price?.toLocaleString()}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery Notice */}
                <div className="sub-notice-banner">
                  <FaCalendarAlt className="notice-icon" />
                  <div>
                    <span className="notice-label">Next Scheduled Roast & Charge</span>
                    <strong className="notice-date">{formatSubDate(sub.nextBillingDate)}</strong>
                  </div>
                </div>

                {/* Destination */}
                <div className="sub-shipping-chip">
                  <FaTruck size={12} />
                  <span>Delivers to: <strong>{sub.shippingAddress?.address}, {sub.shippingAddress?.city}</strong></span>
                </div>

                {/* Self Service Actions */}
                <div className="sub-actions-footer">
                  {isActive && (
                    <>
                      <button
                        type="button"
                        className="sub-btn secondary"
                        disabled={actionLoading === `skip-${sub._id}`}
                        onClick={() => handleSkip(sub._id)}
                      >
                        <FaForward /> Skip Delivery
                      </button>

                      <button
                        type="button"
                        className="sub-btn secondary"
                        disabled={actionLoading === `pause-${sub._id}`}
                        onClick={() => handlePause(sub._id)}
                      >
                        <FaPause /> Pause
                      </button>

                      <button
                        type="button"
                        className="sub-btn secondary"
                        onClick={() => {
                          setSelectedFreq(sub.frequency);
                          setFrequencyModal(sub);
                        }}
                      >
                        <FaSync /> Frequency
                      </button>

                      <button
                        type="button"
                        className="sub-btn danger"
                        onClick={() => setCancelModal(sub)}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {isPaused && (
                    <>
                      <button
                        type="button"
                        className="sub-btn primary"
                        disabled={actionLoading === `resume-${sub._id}`}
                        onClick={() => handleResume(sub._id)}
                      >
                        <FaPlay /> Resume Deliveries
                      </button>

                      <button
                        type="button"
                        className="sub-btn danger"
                        onClick={() => setCancelModal(sub)}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {isCancelled && (
                    <div className="sub-cancelled-note">
                      <FaInfoCircle /> Cancelled. You won't be charged again.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModal && (
        <div className="dashboard-modal-backdrop">
          <div className="dashboard-modal-window">
            <div className="modal-header-danger">
              <FaExclamationTriangle />
              <h3>Cancel Subscription?</h3>
            </div>
            <p className="modal-subtext">
              You will lose your <strong>5% recurring subscriber discount</strong> and automatic fresh roast deliveries.
            </p>
            <div className="modal-field">
              <label>Cancellation Reason (Optional)</label>
              <textarea
                placeholder="Let us know why you are cancelling…"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => { setCancelModal(null); setCancelReason(''); }}
              >
                Keep Subscription
              </button>
              <button
                type="button"
                className="btn-modal-confirm-danger"
                disabled={actionLoading === `cancel-${cancelModal._id}`}
                onClick={handleConfirmCancel}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Frequency Change Modal */}
      {frequencyModal && (
        <div className="dashboard-modal-backdrop">
          <div className="dashboard-modal-window">
            <h3>Change Delivery Schedule</h3>
            <p className="modal-subtext">Choose how frequently you would like fresh roasted coffee dispatched.</p>
            <div className="freq-options-stack">
              {[
                { id: 'weekly', title: 'Weekly', desc: 'Dispatched every 7 days' },
                { id: 'bi-weekly', title: 'Bi-Weekly', desc: 'Dispatched every 14 days' },
                { id: 'monthly', title: 'Monthly', desc: 'Dispatched every 30 days (Recommended)' },
              ].map(opt => (
                <label key={opt.id} className={`freq-option-card ${selectedFreq === opt.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="freq"
                    value={opt.id}
                    checked={selectedFreq === opt.id}
                    onChange={() => setSelectedFreq(opt.id)}
                  />
                  <div>
                    <strong>{opt.title}</strong>
                    <p>{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setFrequencyModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-order-primary"
                disabled={actionLoading === `freq-${frequencyModal._id}`}
                onClick={handleUpdateFreq}
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsTab;
