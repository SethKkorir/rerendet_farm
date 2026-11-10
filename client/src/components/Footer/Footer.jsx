// components/Footer/Footer.jsx — Editorial Minimalist Luxury Footer
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import {
  FaTwitter,
  FaInstagram,
  FaFacebookF,
  FaWhatsapp,
  FaYoutube,
  FaCcVisa,
  FaCcMastercard,
  FaMoneyBillWave,
  FaTruck,
  FaArrowRight
} from 'react-icons/fa';
import { getWhatsAppLink } from '../../utils/whatsappHelper';
import './Footer.css';

const Footer = () => {
  const { publicSettings } = useContext(AppContext);
  const store = publicSettings?.store || {};
  const social = publicSettings?.seo?.social || {};
  const storeName = store.name || 'Rerendet Coffee Farm';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-minimal">
      <div className="footer-minimal-container">

        {/* ══ Symmetrical 3-Column Top Grid ══ */}
        <div className="footer-minimal-top-grid">

          {/* ── Left Wing: Navigation Links (About Farm & Contact removed) ── */}
          <div className="footer-wing left">
            <div className="footer-h-line" />
            <nav className="footer-wing-nav">
              <Link to="/#coffee-shop" className="footer-wing-link">
                Coffee Shop
              </Link>
              <Link to="/shipping-policy" className="footer-wing-link">
                Shipping Info
              </Link>
              <Link to="/refund-policy" className="footer-wing-link">
                Returns / Exchanges
              </Link>
              <Link to="/privacy-policy" className="footer-wing-link">
                Privacy Policy
              </Link>
              <Link to="/terms-conditions" className="footer-wing-link">
                Terms & Conditions
              </Link>
            </nav>
          </div>

          {/* ── Center Anchor: Prominent Emblem Logo & Social ── */}
          <div className="footer-center-anchor">
            <Link to="/" className="footer-logo-link" title={storeName} aria-label={storeName}>
              <img
                src={store.logo || '/rerendet-logo.png'}
                alt={storeName}
                className="footer-logo-image"
                onError={(e) => {
                  e.target.src = '/rerendet-logo.png';
                }}
              />
              <span className="footer-brand-title">Rerendet</span>
              <span className="footer-brand-sub">Coffee Farm</span>
            </Link>

            {/* Social Icons Row */}
            <div className="footer-minimal-social">
              {social.twitter ? (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-icon"
                  aria-label="Twitter / X"
                >
                  <FaTwitter />
                </a>
              ) : (
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-icon"
                  aria-label="Twitter / X"
                >
                  <FaTwitter />
                </a>
              )}

              <a
                href={social.instagram || "https://instagram.com/rerendetcoffee"}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-icon"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>

              {social.facebook && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-icon"
                  aria-label="Facebook"
                >
                  <FaFacebookF />
                </a>
              )}

              <a
                href={
                  social.whatsapp
                    ? (social.whatsapp.startsWith('http')
                      ? social.whatsapp
                      : `https://wa.me/${social.whatsapp.replace(/\D/g, '')}`)
                    : getWhatsAppLink(publicSettings)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-icon"
                aria-label="WhatsApp"
              >
                <FaWhatsapp />
              </a>

              {social.youtube && (
                <a
                  href={social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social-icon"
                  aria-label="YouTube"
                >
                  <FaYoutube />
                </a>
              )}
            </div>
          </div>

          {/* ── Right Wing: Integrated Live Order Tracking (Small info + Button) ── */}
          <div className="footer-wing right">
            <div className="footer-h-line" />
            <div className="footer-track-block">
              <p className="footer-track-caption">
                Follow your fresh roast delivery in real-time without login.
              </p>
              <Link to="/track-order" className="footer-track-btn" title="Track your order without login">
                <FaTruck className="footer-track-btn-icon" />
                <span>Track Live Order</span>
                <FaArrowRight className="footer-track-btn-arrow" />
              </Link>
            </div>
          </div>

        </div>

        {/* ══ Sleek Compact Payments Row (Ultra-Small Profile) ══ */}
        <div className="footer-compact-payments">
          <span className="compact-payments-tag">ACCEPTED PAYMENT METHODS</span>
          <div className="compact-payments-pills">
            <span className="pay-pill mpesa" title="M-Pesa">
              <img
                src="/M-PESA_LOGO-01.svg.png"
                alt="M-Pesa"
                className="mpesa-logo-img"
              />
            </span>
            {/* <span className="pay-pill" title="Visa">
              <FaCcVisa className="pay-icon" /> VISA
            </span> */}
            {/* <span className="pay-pill" title="Mastercard">
              <FaCcMastercard className="pay-icon" /> MASTERCARD
            </span> */}
            {/* {publicSettings?.payment?.paymentMethods?.cashOnDelivery === true && (
              <span className="pay-pill" title="Cash on Delivery">
                <FaMoneyBillWave className="pay-icon" /> CASH ON DELIVERY
              </span>
            )} */}
          </div>
        </div>

        {/* ══ Bottom Minimalist Copyright ══ */}
        <div className="footer-minimal-copyright">
          © {currentYear} {storeName.toUpperCase()} | ALL RIGHTS RESERVED
        </div>

      </div>
    </footer>
  );
};

export default Footer;
