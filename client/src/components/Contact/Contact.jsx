import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaFacebookF, FaInstagram, FaTwitter, FaWhatsapp, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { getWhatsAppLink } from '../../utils/whatsappHelper';
import './Contact.css';

const Contact = () => {
  const { showNotification, publicSettings, settings } = useContext(AppContext);
  const social = publicSettings?.seo?.social || {};

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    orderNumber: '',
    message: '',
    hp_website: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification('Please fix the errors in the form', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsSubmitted(true);
        setFormData({
          name: '',
          email: '',
          subject: 'General Inquiry',
          orderNumber: '',
          message: '',
          hp_website: ''
        });
        showNotification(result.message || "Message sent! We'll respond within 2-4 business hours.", 'success');
      } else {
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      showNotification(error.message || 'Failed to send message. Please try again later.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setFormData({
      name: '',
      email: '',
      subject: 'General Inquiry',
      orderNumber: '',
      message: '',
      hp_website: ''
    });
    setErrors({});
  };

  const handleWhatsAppClick = () => {
    const url = getWhatsAppLink(publicSettings, 'Hi Rerendet Coffee! I have an inquiry.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isSubmitted) {
    return (
      <section id="contact" className="contact">
        <div className="container">
          <div className="success-message">
            <FaCheckCircle className="success-icon" />
            <h2>Thank You for Your Message!</h2>
            <p>
              We've received your message and will get back to you within 2 to 4 business hours.
              In the meantime, feel free to explore more of our freshly roasted coffee offerings.
            </p>
            <button
              onClick={handleResetForm}
              className="btn primary"
            >
              Send Another Message
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="contact">
      <div className="container">
        <div className="contact-wrapper">
          <div className="contact-info">
            <h2 className="section-title">Get In Touch</h2>
            <p className="contact-description">
              We'd love to hear from you! Whether you have questions about our roasts,
              need help with an order, or are interested in bulk wholesale,
              our team is ready to help.
            </p>

            {/* Fast WhatsApp CTA Card */}
            <div className="whatsapp-card" onClick={handleWhatsAppClick} style={{ cursor: 'pointer', background: '#25D366', color: '#ffffff', padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', boxShadow: '0 8px 20px rgba(37,211,102,0.25)' }}>
              <FaWhatsapp style={{ fontSize: '32px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '1rem' }}>Instant WhatsApp Support</strong>
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Chat directly with our roasting team (Fastest response)</span>
              </div>
            </div>

            <div className="contact-details">
              <div className="contact-item">
                <div className="contact-icon-container">
                  <FaMapMarkerAlt className="contact-icon" />
                </div>
                <div className="contact-text">
                  <h4>Roastery & Farm Location</h4>
                  <p>Rerendet Farm, Nandi County<br />Highland Ridge, Kenya — Delivery Nationwide</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon-container">
                  <FaPhone className="contact-icon" />
                </div>
                <div className="contact-text">
                  <h4>Call Us</h4>
                  <p>+254 711 245 765<br />Mon - Sat: 8:00 AM - 6:00 PM EAT</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon-container">
                  <FaEnvelope className="contact-icon" />
                </div>
                <div className="contact-text">
                  <h4>Email Us</h4>
                  <p>support@rerendetcoffee.com<br />orders@rerendetcoffee.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              {/* Honeypot Anti-Spam Hidden Field */}
              <input
                type="text"
                name="hp_website"
                value={formData.hp_website}
                onChange={handleInputChange}
                style={{ display: 'none' }}
                tabIndex="-1"
                autoComplete="off"
              />

              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Enter your full name"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <div className="error-message">
                    <FaExclamationCircle className="error-icon" />
                    {errors.name}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <div className="error-message">
                    <FaExclamationCircle className="error-icon" />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="subject" className="form-label">
                  Inquiry Topic / Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="form-input"
                  disabled={isSubmitting}
                  style={{ width: '100%', height: '48px', padding: '0 14px', borderRadius: '8px' }}
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Order Issue">Order Issue</option>
                  <option value="Bulk & Wholesale">Bulk & Wholesale</option>
                  <option value="Feedback / Suggestion">Feedback / Suggestion</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {formData.subject === 'Order Issue' && (
                <div className="form-group">
                  <label htmlFor="orderNumber" className="form-label">
                    Order Number (Optional)
                  </label>
                  <input
                    type="text"
                    id="orderNumber"
                    name="orderNumber"
                    value={formData.orderNumber}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="e.g. ORD-2026-8492"
                    disabled={isSubmitting}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#777', marginTop: '4px', display: 'block' }}>
                    Providing your order number helps us resolve your inquiry much faster.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleInputChange}
                  className={`form-textarea ${errors.message ? 'error' : ''}`}
                  placeholder="Tell us how we can help you..."
                  disabled={isSubmitting}
                />
                {errors.message && (
                  <div className="error-message">
                    <FaExclamationCircle className="error-icon" />
                    {errors.message}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`btn primary btn-block ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner"></div>
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>

              <div className="form-note">
                <p>* Required fields. Your inquiry will be routed directly to customer care.</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;