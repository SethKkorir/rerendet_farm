// src/components/Contact/Contact.jsx
import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaFacebookF, FaInstagram, FaTwitter, FaWhatsapp, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './Contact.css';

const Contact = () => {
  const { showNotification, publicSettings } = useContext(AppContext);
  const social = publicSettings?.seo?.social || {};

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
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
    } else if (formData.subject.trim().length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters';
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

    // Clear error when user starts typing
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
      // Submit contact form to backend
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
        showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      showNotification('Failed to send message. Please try again later.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
    setErrors({});
  };

  // Mock function for social media links (replace with actual URLs)
  const handleSocialClick = (platform) => {
    const urls = {
      facebook: 'https://facebook.com/rerendetcoffee',
      instagram: 'https://www.instagram.com/rerendetcoffee?igsh=amdyZDYzd2w1dndq',
      twitter: 'https://twitter.com/rerendetcoffee',
      whatsapp: 'https://whatsapp.com/channel/0029Vb9Ai2r9Gv7TB7Qpt73y'
    };

    // In a real app, you would redirect to the actual URLs
    showNotification(`Redirecting to our ${platform} page...`, 'info');
    console.log(`Would redirect to: ${urls[platform]}`);
  };

  if (isSubmitted) {
    return (
      <section id="contact" className="contact">
        <div className="container">
          <div className="success-message">
            <FaCheckCircle className="success-icon" />
            <h2>Thank You for Your Message!</h2>
            <p>
              We've received your message and will get back to you within 24 hours.
              In the meantime, feel free to explore more of our coffee offerings.
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
              We'd love to hear from you! Whether you have questions about our coffee,
              want to place a bulk order, or are interested in visiting our farm,
              our team is here to help.
            </p>

            <div className="contact-details">
              <div className="contact-item">
                <div className="contact-icon-container">
                  <FaMapMarkerAlt className="contact-icon" />
                </div>
                <div className="contact-text">
                  <h4>Visit Our Farm</h4>
                  <p>Rerendet Farm, Bomet County<br />Southern Rift, Kenya</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon-container">
                  <FaPhone className="contact-icon" />
                </div>
                <div className="contact-text">
                  <h4>Call Us</h4>
                  <p>+254 711 245 765<br />+254 726 388 591</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon-container">
                  <FaEnvelope className="contact-icon" />
                </div>
                <div className="contact-text">
                  <h4>Email Us</h4>
                  <p>info@rerendetcoffee.com<br />orders@rerendetcoffee.com</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon-container">
                  <FaWhatsapp className="contact-icon" />
                </div>
                <div className="contact-text">
                  <h4>Follow Us</h4>
                  <div className="social-links-inline">
                    <a href={social.facebook || 'https://facebook.com/rerendetcoffee'} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Facebook"><FaFacebookF /></a>
                    <a href={social.instagram || 'https://www.instagram.com/rerendetcoffee?igsh=amdyZDYzd2w1dndq'} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Instagram"><FaInstagram /></a>
                    <a href={social.twitter || 'https://twitter.com/rerendetcoffee'} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Twitter"><FaTwitter /></a>
                    <a href={social.whatsapp || 'https://whatsapp.com/channel/0029Vb9Ai2r9Gv7TB7Qpt73y'} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="WhatsApp"><FaWhatsapp /></a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            <form className="contact-form" onSubmit={handleSubmit} noValidate>
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
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className={`form-input ${errors.subject ? 'error' : ''}`}
                  placeholder="What is this regarding?"
                  disabled={isSubmitting}
                />
                {errors.subject && (
                  <div className="error-message">
                    <FaExclamationCircle className="error-icon" />
                    {errors.subject}
                  </div>
                )}
              </div>

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
                <p>* Required fields</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;