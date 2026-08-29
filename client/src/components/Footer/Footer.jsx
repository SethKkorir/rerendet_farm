import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaTiktok,
  FaYoutube,
  FaCcVisa,
  FaCcMastercard,
  FaCcPaypal,
  FaCreditCard,
  FaMoneyBillWave,
  FaArrowRight,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaWhatsapp,
  FaClock
} from 'react-icons/fa';
import { getWhatsAppLink } from '../../utils/whatsappHelper';
import './Footer.css';

const Footer = () => {
  const { publicSettings } = useContext(AppContext);
  const store = publicSettings?.store || {};
  const hero = publicSettings?.hero || {};
  const social = publicSettings?.seo?.social || {};
  const paymentMethods = publicSettings?.payment?.paymentMethods || { mpesa: true, card: true, cashOnDelivery: true };
  const businessHours = publicSettings?.businessHours || {};

  // Formatted hours snippet
  const getHoursSummary = () => {
    if (!businessHours || Object.keys(businessHours).length === 0) {
      return 'Mon – Sat: 8:00 AM – 6:00 PM EAT';
    }
    const mon = businessHours.monday;
    if (mon && mon.open && mon.close) {
      return `Mon – Fri: ${mon.open} – ${mon.close} EAT`;
    }
    return 'Mon – Sat: 8:00 AM – 6:00 PM EAT';
  };

  const storeName = store.name || 'Rerendet Coffee';

  return (
    <footer className="footer-premium fade-in">
      {/* Premium Tracking Callout Banner */}
      <div className="footer-tracking-callout">
        <div className="container tracking-cta-container">
          <div className="tracking-cta-content">
            <h3 className="tracking-cta-title">Waiting for your coffee?</h3>
            <p className="tracking-cta-sub">Follow your freshly roasted Kenyan beans locally from our roastery to your door.</p>
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
            <Link to="/" className="footer-logo" title={storeName}>
              <img
                src={store.logo || '/rerendet-logo.png'}
                alt={storeName}
                className="footer-logo-img"
                onError={(e) => { e.target.src = '/rerendet-logo.png'; }}
              />
            </Link>
            <p className="footer-tagline" style={{ fontWeight: '600', color: '#d4af37', fontSize: '0.9rem', margin: '6px 0 10px 0' }}>
              {hero.pillText ? `${hero.pillText} • ` : ''}{store.tagline || hero.headline?.split(',')[0] || 'Farm-fresh Kenyan coffee, roasted to order.'}
            </p>
            <p className="footer-mission">
              {store.description || 'Crafting excellence from the Kenyan highlands to your cup. We are a legacy of quality roasting, direct farm origin, and sustainable agriculture.'}
            </p>
            
            {/* Social Media Orchestra from Admin Settings */}
            <div className="social-orchestra">
              <a 
                href={social.whatsapp ? (social.whatsapp.startsWith('http') ? social.whatsapp : `https://wa.me/${social.whatsapp.replace(/\D/g, '')}`) : getWhatsAppLink(publicSettings)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="orchestra-link" 
                aria-label="WhatsApp"
              >
                <FaWhatsapp />
              </a>
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Instagram">
                  <FaInstagram />
                </a>
              )}
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Facebook">
                  <FaFacebookF />
                </a>
              )}
              {social.twitter && (
                <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Twitter">
                  <FaTwitter />
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="TikTok">
                  <FaTiktok />
                </a>
              )}
              {social.youtube && (
                <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="YouTube">
                  <FaYoutube />
                </a>
              )}
              {!social.instagram && !social.facebook && !social.twitter && !social.tiktok && !social.youtube && (
                <a href="https://www.instagram.com/rerendetcoffee?igsh=amdyZDYzd2w1dndq" target="_blank" rel="noopener noreferrer" className="orchestra-link" aria-label="Instagram">
                  <FaInstagram />
                </a>
              )}
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
              <li><Link to="/#about">Our Farm Heritage</Link></li>
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
                <span>{store.address || 'Handcrafted & Shipped Nationwide from Nandi & Bomet County, Kenya'}</span>
              </div>
              <div className="contact-bit">
                <FaEnvelope className="bit-icon" />
                <a href={`mailto:${store.email || 'info@rerendetcoffee.com'}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {store.email || 'info@rerendetcoffee.com'}
                </a>
              </div>
              <div className="contact-bit">
                <FaPhone className="bit-icon" />
                <a href={`tel:${(store.phone || '+254 700 000 000').replace(/\s+/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {store.phone || '+254 700 000 000'}
                </a>
              </div>
              <div className="contact-bit">
                <FaClock className="bit-icon" />
                <span>{getHoursSummary()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Closing Movement */}
        <div className="footer-closing">
          <div className="closing-left">
            <span className="copyright-text">
              © {new Date().getFullYear()} {storeName}. All rights reserved.
            </span>
          </div>

          <div className="closing-right">
            <div className="payment-curation">
              <span className="curation-label">Secure Checkout</span>
              <div className="curation-icons">
                {paymentMethods.card !== false && (
                  <>
                    <FaCcVisa className="payment-icon" title="Visa" />
                    <FaCcMastercard className="payment-icon" title="Mastercard" />
                    <FaCreditCard className="payment-icon" title="Debit & Credit Card" />
                  </>
                )}
                {paymentMethods.mpesa !== false && (
                  <div className="payment-pill-special mpesa-gold" title="Pay with M-Pesa">
                    <span className="mpesa-text">M-PESA</span>
                  </div>
                )}
                {paymentMethods.paypal && (
                  <FaCcPaypal className="payment-icon" title="PayPal" />
                )}
                {paymentMethods.cashOnDelivery && (
                  <div className="payment-pill-special cod-pill" title="Cash on Delivery Available">
                    <FaMoneyBillWave style={{ fontSize: '0.75rem' }} />
                    <span className="mpesa-text">COD</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Brand Watermark */}
      <div className="footer-watermark">{storeName.toUpperCase()}</div>
    </footer>
  );
};

export default Footer;