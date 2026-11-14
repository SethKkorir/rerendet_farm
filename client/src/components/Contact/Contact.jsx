import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaMapMarkerAlt, FaPhone, FaEnvelope, FaWhatsapp,
  FaCheckCircle, FaExclamationCircle, FaArrowRight, FaClock, FaShieldAlt
} from 'react-icons/fa';
import { getWhatsAppLink } from '../../utils/whatsappHelper';
import './Contact.css';

const Contact = () => {
  const { showNotification, publicSettings } = useContext(AppContext);

  const supportPhone = publicSettings?.support?.phone || '+254 711 245 765';
  const supportEmail = publicSettings?.support?.email || 'support@rerendetcoffee.com';
  const ordersEmail = 'orders@rerendetcoffee.com';
  const farmAddress = publicSettings?.store?.address || 'Rerendet Farm, Bomet County, Kenya';

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
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Please select a topic';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please share your message';
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
      showNotification('Please fill in the required fields correctly.', 'error');
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
        showNotification(result.message || "Message sent! We'll reply within 2-4 business hours.", 'success');
      } else {
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      showNotification(error.message || 'Failed to send message. Please reach us via WhatsApp or phone.', 'error');
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
    const url = getWhatsAppLink(publicSettings, 'Hi Rerendet Coffee! I would like to inquire about your specialty roasts.');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="contact" className="contact-section">
      <div className="contact-container">
        <div className="contact-grid">
          {/* ── Left Column: Contact Info ── */}
          <div className="contact-info-col">
            <h2 className="contact-heading">Get In Touch</h2>
            <p className="contact-lead">
              We would love to hear from you. Whether you have questions about our highland volcanic roasts, need assistance with your order, or are planning bulk wholesale, our team is ready to help.
            </p>

            {/* Instant WhatsApp Support Card */}
            <div className="contact-wa-card" onClick={handleWhatsAppClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleWhatsAppClick()}>
              <div className="wa-card-icon-wrap">
                <FaWhatsapp className="wa-card-icon" />
              </div>
              <div className="wa-card-body">
                <div className="wa-card-top">
                  <span className="wa-card-title">Instant WhatsApp Support</span>
                  <span className="wa-card-pill">Fastest Response</span>
                </div>
                <p className="wa-card-desc">Chat directly with our roasting team & farm concierge</p>
              </div>
            </div>

            {/* Contact Details List */}
            <div className="contact-cards-list">
              <div className="contact-detail-card">
                <div className="detail-icon-wrap">
                  <FaMapMarkerAlt />
                </div>
                <div className="detail-content">
                  <h4>Roastery & Farm Location</h4>
                  <p>Rerendet Farm, Bomet County<br />Highland Ridge, Kenya — Delivery Nationwide</p>
                </div>
              </div>

              <div className="contact-detail-card">
                <div className="detail-icon-wrap">
                  <FaPhone />
                </div>
                <div className="detail-content">
                  <h4>Call Us</h4>
                  <p>
                    <a href={`tel:${supportPhone.replace(/\s+/g, '')}`} className="detail-link">{supportPhone}</a>
                    <span className="detail-sub"><FaClock size={10} /> Mon – Sat: 8:00 AM – 6:00 PM EAT</span>
                  </p>
                </div>
              </div>

              <div className="contact-detail-card">
                <div className="detail-icon-wrap">
                  <FaEnvelope />
                </div>
                <div className="detail-content">
                  <h4>Email Us</h4>
                  <p>
                    <a href={`mailto:${supportEmail}`} className="detail-link">{supportEmail}</a>
                    <a href={`mailto:${ordersEmail}`} className="detail-link">{ordersEmail}</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Interactive Form ── */}
          <div className="contact-form-col">
            <div className="contact-form-box">
              {isSubmitted ? (
                <div className="contact-success-state">
                  <FaCheckCircle className="success-check-icon" />
                  <h3 className="success-title">Message Received</h3>
                  <p className="success-desc">
                    Thank you for reaching out. Your inquiry has been routed to our roasting team and we will respond within 2 to 4 business hours.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="contact-submit-btn"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                  {/* Honeypot Spam Prevention */}
                  <input
                    type="text"
                    name="hp_website"
                    value={formData.hp_website}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                    tabIndex="-1"
                    autoComplete="off"
                  />

                  <div className="contact-field-group">
                    <label htmlFor="name" className="contact-label">
                      Full Name <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`contact-input ${errors.name ? 'has-error' : ''}`}
                      placeholder="Enter your full name"
                      disabled={isSubmitting}
                      autoComplete="name"
                    />
                    {errors.name && (
                      <span className="field-error">
                        <FaExclamationCircle /> {errors.name}
                      </span>
                    )}
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="email" className="contact-label">
                      Email Address <span className="req-star">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`contact-input ${errors.email ? 'has-error' : ''}`}
                      placeholder="Enter your email address"
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <span className="field-error">
                        <FaExclamationCircle /> {errors.email}
                      </span>
                    )}
                  </div>

                  <div className="contact-field-group">
                    <label htmlFor="subject" className="contact-label">
                      Inquiry Topic / Subject <span className="req-star">*</span>
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="contact-select"
                      disabled={isSubmitting}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Order Issue">Order Issue</option>
                      <option value="Bulk & Wholesale">Bulk & Wholesale</option>
                      <option value="Feedback / Suggestion">Feedback / Suggestion</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {formData.subject === 'Order Issue' && (
                    <div className="contact-field-group">
                      <label htmlFor="orderNumber" className="contact-label">
                        Order Number (Optional)
                      </label>
                      <input
                        type="text"
                        id="orderNumber"
                        name="orderNumber"
                        value={formData.orderNumber}
                        onChange={handleInputChange}
                        className="contact-input"
                        placeholder="e.g. ORD-2026-8492"
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  <div className="contact-field-group">
                    <label htmlFor="message" className="contact-label">
                      Message <span className="req-star">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows="4"
                      value={formData.message}
                      onChange={handleInputChange}
                      className={`contact-textarea ${errors.message ? 'has-error' : ''}`}
                      placeholder="Tell us how we can help you..."
                      disabled={isSubmitting}
                    />
                    {errors.message && (
                      <span className="field-error">
                        <FaExclamationCircle /> {errors.message}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="contact-submit-btn"
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? 'Sending Message...' : 'Send Message'}</span>
                    {!isSubmitting && <FaArrowRight size={12} />}
                  </button>

                  <div className="contact-privacy-note">
                    <FaShieldAlt size={11} />
                    <span>Your inquiry is transmitted securely and routed to our roasting team.</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
