// src/components/Newsletter/Newsletter.jsx
import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import './Newsletter.css';

const Newsletter = () => {
  const { showNotification } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/subscribers/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification(data.message || 'Successfully subscribed!', 'success');
        setEmail('');
      } else {
        showNotification(data.message || 'Subscription failed', 'error');
      }
    } catch (error) {
      console.error('Newsletter error:', error);
      showNotification('Something went wrong. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="newsletter" className="newsletter">
      <div className="container">
        <div className="newsletter-content">
          <h2>Join Our Coffee Journey</h2>
          <p>Subscribe to receive updates, special offers, and brewing tips straight to your inbox.</p>
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <button type="submit" className="btn primary" disabled={isLoading}>
              {isLoading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;