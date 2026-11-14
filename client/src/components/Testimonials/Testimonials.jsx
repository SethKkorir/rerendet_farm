// src/components/Testimonials/Testimonials.jsx
import React, { useState, useEffect, useContext } from 'react';
import { FaChevronLeft, FaChevronRight, FaPen, FaTimes, FaStar } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { getTopReviews, createSiteReview } from '../../api/api';
import './Testimonials.css';

/* ── Default Curated Testimonials for Highland Coffee ── */
const DEFAULT_TESTIMONIALS = [
  {
    id: '1',
    author: 'Josephine Chebet',
    role: 'Verified Buyer',
    rating: 5,
    text: 'The floral aroma when opening the bag is remarkable. Brewing this via V60 brings out crisp citrus notes and a lingering honey sweetness.'
  },
  {
    id: '2',
    author: 'David Mwangi',
    role: 'Highland Espresso Lover',
    rating: 5,
    text: 'The medium roast from the Bomet Highlands has completely elevated my morning ritual. Fresh, aromatic, and delightfully balanced.'
  },
  {
    id: '3',
    author: 'Sarah Jenkins',
    role: 'Specialty Coffee Club',
    rating: 5,
    text: 'Exceptional bean density and rich golden crema. Hands down the purest single-origin Arabica available in Kenya.'
  },
  {
    id: '4',
    author: 'Brian Kipkorir',
    role: 'Home Barista',
    rating: 5,
    text: 'Direct trade from local highlands makes all the difference. Smooth sweet finish without bitterness. I order a fresh batch every fortnight.'
  }
];

const Testimonials = () => {
  const { token, showAlert } = useContext(AppContext);
  const [current, setCurrent] = useState(0);
  const [apiReviews, setApiReviews] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await getTopReviews();
        if (res.data.success && res.data.data && res.data.data.length > 0) {
          const formatted = res.data.data.map(r => ({
            text: r.text || r.comment,
            author: r.author || r.name,
            role: r.role || (r.isVerifiedPurchase ? "Verified Buyer" : "Coffee Club"),
            rating: r.rating || 5,
            id: r._id
          }));
          setApiReviews(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      }
    };
    fetchReviews();
  }, []);

  const list = apiReviews.length > 0 ? apiReviews : DEFAULT_TESTIMONIALS;
  const count = list.length;

  // Auto-play / Moving motion ("let it move yees")
  useEffect(() => {
    if (isPaused || showReviewModal || count <= 1) return;
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % count);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, showReviewModal, count]);

  const handleNext = () => {
    if (count <= 1) return;
    setCurrent(prev => (prev + 1) % count);
  };

  const handlePrev = () => {
    if (count <= 1) return;
    setCurrent(prev => (prev - 1 + count) % count);
  };

  // Indices for 3 visible cards
  const prevIdx = count > 0 ? (current - 1 + count) % count : 0;
  const nextIdx = count > 0 ? (current + 1) % count : 0;

  const currentItem = list[current] || {};
  const prevItem = list[prevIdx] || {};
  const nextItem = list[nextIdx] || {};

  const handleSubmitReview = async () => {
    if (!token) {
      showAlert('Please login to leave a review', 'error');
      return;
    }
    if (!reviewForm.comment.trim()) {
      showAlert('Please write a comment', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createSiteReview(reviewForm);
      if (res.data.success) {
        showAlert('Review submitted successfully!', 'success');
        setShowReviewModal(false);
        setReviewForm({ rating: 5, comment: '' });
        // Refresh reviews
        try {
          const freshRes = await getTopReviews();
          if (freshRes.data.success && freshRes.data.data && freshRes.data.data.length > 0) {
            setApiReviews(freshRes.data.data.map(r => ({
              text: r.comment,
              author: r.name,
              role: r.isVerifiedPurchase ? "Verified Buyer" : "Coffee Club",
              rating: r.rating || 5,
              id: r._id
            })));
            setCurrent(0);
          }
        } catch { }
      } else {
        showAlert(res.data.message || 'Error submitting review', 'error');
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Server error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="testimonials"
      id="testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="testimonials-container">
        {/* Header */}
        <div className="testimonials-header">
          <span className="testimonials-tag">Customer Stories</span>
          <h2 className="testimonials-title">Testimonials</h2>
        </div>

        {/* ══ 3-Card Carousel Stage ══ */}
        <div className="testimonials-stage">
          {/* Left Navigation Arrow */}
          <button
            type="button"
            className="tm-nav-btn prev"
            onClick={handlePrev}
            aria-label="Previous Testimonial"
          >
            <FaChevronLeft />
          </button>

          {/* Cards Track: Left, Center (Active), Right */}
          <div className="tm-cards-track">

            {/* Left Card */}
            {count > 1 && (
              <div
                className="tm-card side"
                onClick={handlePrev}
                title="View previous review"
              >
                <span className="tm-quote-mark open">“</span>
                <div className="tm-card-content">
                  <h3 className="tm-card-author">{prevItem?.author || 'Coffee Enthusiast'}</h3>
                  <p className="tm-card-body">{prevItem?.text || ''}</p>
                </div>
                <span className="tm-quote-mark close">”</span>
              </div>
            )}

            {/* Center Active Card (Elevated & Prominent) */}
            <motion.div
              key={currentItem?.id || current}
              className="tm-card active"
              initial={{ opacity: 0.8, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1.08 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <span className="tm-quote-mark open">“</span>
              <div className="tm-card-content">
                <h3 className="tm-card-author">{currentItem?.author || 'Coffee Enthusiast'}</h3>
                <p className="tm-card-body">{currentItem?.text || ''}</p>
              </div>
              <span className="tm-quote-mark close">”</span>
            </motion.div>

            {/* Right Card */}
            {count > 2 && (
              <div
                className="tm-card side"
                onClick={handleNext}
                title="View next review"
              >
                <span className="tm-quote-mark open">“</span>
                <div className="tm-card-content">
                  <h3 className="tm-card-author">{nextItem?.author || 'Coffee Enthusiast'}</h3>
                  <p className="tm-card-body">{nextItem?.text || ''}</p>
                </div>
                <span className="tm-quote-mark close">”</span>
              </div>
            )}

          </div>

          {/* Right Navigation Arrow */}
          <button
            type="button"
            className="tm-nav-btn next"
            onClick={handleNext}
            aria-label="Next Testimonial"
          >
            <FaChevronRight />
          </button>
        </div>

        {/* ══ Bottom Dots & Share Action ══ */}
        <div className="tm-bottom-controls">
          <div className="tm-dots-list">
            {list.map((_, idx) => (
              <span
                key={idx}
                className={`tm-dot ${idx === current ? 'active' : ''}`}
                onClick={() => setCurrent(idx)}
              />
            ))}
          </div>

          <button
            type="button"
            className="tm-share-btn"
            onClick={() => setShowReviewModal(true)}
          >
            <FaPen style={{ fontSize: '0.75rem' }} /> Share Your Story
          </button>
        </div>
      </div>

      {/* ══ Review Submission Modal ══ */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            className="review-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              className="review-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-modal-btn dark"
                onClick={() => setShowReviewModal(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem' }}>Share Your Experience</h3>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--tm-text-body)' }}>
                Tell us about your single-origin roast experience!
              </p>

              <div className="mock-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    Your Rating
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <FaStar
                        key={s}
                        style={{ cursor: 'pointer', fontSize: '1.25rem' }}
                        color={s <= reviewForm.rating ? '#F59E0B' : '#D1D5DB'}
                        onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    Your Review
                  </label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Tell us what you loved about our roast..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid var(--tm-card-border)',
                      background: 'var(--tm-bg)',
                      color: 'var(--tm-text-title)',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--tm-quote)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Testimonials;
