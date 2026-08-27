// src/components/Testimonials/Testimonials.jsx
import React, { useState, useEffect, useContext } from 'react';
import { FaQuoteLeft, FaChevronLeft, FaChevronRight, FaPen, FaTimes, FaStar } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { getTopReviews, createSiteReview } from '../../api/api';
import './Testimonials.css';

const Testimonials = () => {
  const { user, token, showAlert } = useContext(AppContext);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [apiReviews, setApiReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await getTopReviews();
        if (res.data.success && res.data.data && res.data.data.length > 0) {
          const formatted = res.data.data.map(r => ({
            text: r.comment,
            author: r.name,
            role: r.isVerifiedPurchase ? "Verified Buyer" : "Customer",
            rating: r.rating,
            id: r._id,
            avatar: r.user?.profilePicture // Assuming populated
          }));
          setApiReviews(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      }
    };
    fetchReviews();
  }, []);

  const displayTestimonials = apiReviews;

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev === displayTestimonials.length - 1 ? 0 : prev + 1));
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev === 0 ? displayTestimonials.length - 1 : prev - 1));
  };

  const goToTestimonial = (index) => {
    setCurrentTestimonial(index);
  };

  useEffect(() => {
    if (!showReviewModal) {
      const interval = setInterval(nextTestimonial, 7000);
      return () => clearInterval(interval);
    }
  }, [showReviewModal, displayTestimonials.length]); // Added dependency

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
        // Re-fetch reviews to instantly update the list
        try {
          const freshRes = await getTopReviews();
          if (freshRes.data.success && freshRes.data.data && freshRes.data.data.length > 0) {
            const formatted = freshRes.data.data.map(r => ({
              text: r.comment,
              author: r.name,
              role: r.isVerifiedPurchase ? "Verified Buyer" : "Customer",
              rating: r.rating,
              id: r._id,
              avatar: r.user?.profilePicture
            }));
            setApiReviews(formatted);
            setCurrentTestimonial(0);
          }
        } catch (fetchErr) {
          console.error("Failed to re-fetch reviews", fetchErr);
        }
      } else {
        showAlert(res.data.message || 'Error submitting review', 'error');
      }
    } catch (err) {
      console.error("Submit review error:", err);
      showAlert(err.response?.data?.message || 'Server error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe checks for rendering
  const currentItem = displayTestimonials[currentTestimonial];

  return (
    <section className="testimonials">
      <div className="container">
        <div className="testimonials-header">
          <h2 className="section-title">The Rerendet Experience</h2>
          <button className="btn-write-review" onClick={() => setShowReviewModal(true)}>
            <FaPen /> Share Your Story
          </button>
        </div>

        {displayTestimonials.length > 0 && currentItem ? (
          <>
            <div className="testimonial-slider">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonial}
                  className="testimonial-slide-modern"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="quote-icon"><FaQuoteLeft /></div>
                  <div className="rating-stars">
                    {[...Array(currentItem.rating || 5)].map((_, i) => (
                      <FaStar key={i} />
                    ))}
                  </div>
                  <p className="testimonial-text">{currentItem.text}</p>
                  <div className="testimonial-author">
                    <div className="author-avatar-placeholder">
                      {currentItem.author ? currentItem.author.charAt(0) : 'A'}
                    </div>
                    <div className="author-info">
                      <h4>{currentItem.author}</h4>
                      <p>{currentItem.role}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="testimonial-controls">
              <button className="testimonial-prev" onClick={prevTestimonial}>
                <FaChevronLeft />
              </button>
              <div className="testimonial-dots">
                {displayTestimonials.map((_, index) => (
                  <span
                    key={index}
                    className={`dot ${index === currentTestimonial ? 'active' : ''}`}
                    onClick={() => goToTestimonial(index)}
                  />
                ))}
              </div>
              <button className="testimonial-next" onClick={nextTestimonial}>
                <FaChevronRight />
              </button>
            </div>
          </>
        ) : (
          <div className="no-reviews-placeholder">
            <div className="no-reviews-content">
              <FaStar className="placeholder-star" />
              <h3>Be the first to review!</h3>
              <p>Share your experience with our coffee and help others choose.</p>
              <button className="btn-write-review-large" onClick={() => setShowReviewModal(true)}>
                Write a Review
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
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
              <button className="close-modal-btn dark" onClick={() => setShowReviewModal(false)}>
                <FaTimes />
              </button>
              <h3>Share Your Experience</h3>
              <p>We'd love to hear your thoughts!</p>

              <div className="mock-form">
                <div className="form-group">
                  <label>Your Rating</label>
                  <div className="star-select">
                    {[1, 2, 3, 4, 5].map(s => (
                      <FaStar
                        key={s}
                        className={`star-input ${s <= reviewForm.rating ? 'active' : ''}`}
                        color={s <= reviewForm.rating ? '#fbbf24' : '#ddd'}
                        onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                      />
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Your Review</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Tell us what you liked..."
                  ></textarea>
                </div>
                <button
                  className="submit-review-btn"
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
                {!token && (
                  <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'red' }}>
                    * You must be logged in to review.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Testimonials;