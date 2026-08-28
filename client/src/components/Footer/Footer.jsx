import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaCcVisa,
  FaCcMastercard,
  FaCcPaypal,
  FaCreditCard,
  FaArrowRight,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaWhatsapp
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const { publicSettings } = useContext(AppContext);
  const store = publicSettings?.store || {};
  const social = publicSettings?.seo?.social || {};

  return (
    <footer className="footer-premium fade-in">
      {/* Premium Tracking Callout Banner */}
      <div className="footer-tracking-callout">
        <div className="container tracking-cta-container">
          <div className="tracking-cta-content">
            <h3 className="tracking-cta-title">Waiting for your coffee?</h3>
            <p className="tracking-cta-sub">Follow your freshly roasted Kenyan beans locally from our store to your door.</p>
          </div>
          <Link to="/track-order" className="btn-premium tracking-big-btn">
            Track Your Order <FaArrowRight style={{ fontSize: '0.9rem' }} />
          </Link>
        </div>
      </div>

      {/* Decorative Gradient Background */}
      <div className="footer-glow" />

      <div className="container">
        <div className="footer-main-grid">

          {/* Brand & Story Section */}
          <div className="footer-section brand-section">
            <Link to="/" className="footer-logo">
              <img
                src="/rerendet-logo.png"
                alt="Rerendet Coffee"
                className="footer-logo-img"
              />
            </Link>
            <p className="footer-tagline" style={{ fontWeight: '600', color: '#d4af37', fontSize: '0.9rem', margin: '6px 0 10px 0' }}>
              Farm-fresh Kenyan coffee, roasted to order.
            </p>
            <p className="footer-mission">
              {store.description || 'Crafting excellence from the Kenyan highlands to your cup. We are a legacy of quality roasting, direct farm origin, and sustainable agriculture.'}
            </p>
            <div className="social-orchestra">
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Facebook"><FaFacebookF /></a>}
              <a href={social.instagram || 'https://www.instagram.com/rerendetcoffee?igsh=amdyZDYzd2w1dndq'} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Instagram"><FaInstagram /></a>
              <a href={social.whatsapp || 'https://whatsapp.com/channel/0029Vb9Ai2r9Gv7TB7Qpt73y'} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="WhatsApp"><FaWhatsapp /></a>
              {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Twitter"><FaTwitter /></a>}
            </div>
          </div>

          {/* Navigation Orchestra */}
          <div className="footer-section">
            <h4 className="section-title">Shop & Learn</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/#coffee-shop">Coffee Catalog</Link></li>
              <li><Link to="/track-order">Track Order</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="section-title">Support & Legal</h4>
            <ul className="footer-links">
              <li><Link to="/shipping-policy">Shipping & Delivery</Link></li>
              <li><Link to="/refund-policy">Refund & Return Policy</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions">Terms & Conditions</Link></li>
            </ul>
          </div>

          <div className="footer-section contact-section">
            <h4 className="section-title">Roastery & Contact</h4>
            <div className="contact-details">
              <div className="contact-bit">
                <FaMapMarkerAlt className="bit-icon" />
                <span>Handcrafted & Shipped Nationwide from Nandi County, Kenya</span>
              </div>
              <div className="contact-bit">
                <FaEnvelope className="bit-icon" />
                <span>{store.email || 'support@rerendetcoffee.com'}</span>
              </div>
              <div className="contact-bit">
                <FaPhone className="bit-icon" />
                <span>{store.phone || '+254 711 245 765'} (Mon - Sat 8am - 6pm EAT)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Closing Movement */}
        <div className="footer-closing">
          <div className="closing-left">
            <span className="copyright-text">
              © {new Date().getFullYear()} Rerendet Coffee Co. All rights reserved.
            </span>
          </div>

          <div className="closing-right">
            <div className="payment-curation">
              <span className="curation-label">Secure Checkout</span>
              <div className="curation-icons">
                <FaCcVisa className="payment-icon" title="Visa" />
                <FaCcMastercard className="payment-icon" title="Mastercard" />
                <FaCreditCard className="payment-icon" title="Credit Card" />
                <div className="payment-pill-special mpesa-gold" title="Pay with M-Pesa">
                  <span className="mpesa-text">M-PESA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Rerendet Watermark */}
      <div className="footer-watermark">RERENDET</div>
    </footer>
  );
};

export default Footer;