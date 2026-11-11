import React, { useState } from 'react';
import { FaWhatsapp, FaRedo, FaLock, FaCoffee } from 'react-icons/fa';
import { getWhatsAppLink } from '../../utils/whatsappHelper';
import './MaintenanceMode.css';

export default function MaintenanceMode({ publicSettings }) {
  const [checking, setChecking] = useState(false);

  const customMessage = publicSettings?.maintenance?.message;
  const storePhone = publicSettings?.contact?.phone || '+254717475461';
  const logo = publicSettings?.store?.logo || '/rerendet-logo.png';
  const whatsappUrl = getWhatsAppLink(
    storePhone,
    'Hello Rerendet Coffee! I am reaching out while your online storefront is undergoing maintenance.'
  );

  const handleCheckStatus = () => {
    setChecking(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="mm-fullscreen-wrap" role="dialog" aria-modal="true" aria-label="Store Maintenance">
      {/* Ambient Roastery Glows */}
      <div className="mm-ambient-glow mm-glow-top" />
      <div className="mm-ambient-glow mm-glow-bottom" />
      <div className="mm-ambient-grid" />

      <div className="mm-modal-container">
        {/* Pulsing Status Pill */}
        <div className="mm-pill-badge">
          <span className="mm-pulse-dot" />
          <span className="mm-pill-text">Roastery Upgrades In Progress</span>
        </div>

        {/* Brand Emblem */}
        <div className="mm-brand-wrap">
          <div className="mm-logo-halo">
            <img
              src={logo}
              alt="Rerendet Coffee"
              className="mm-brand-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <span className="mm-brand-sub">High-Altitude Single-Origin Arabica · Bomet</span>
        </div>

        {/* Headline */}
        <h1 className="mm-main-heading">
          Refining The <span className="mm-gold-gradient">Experience</span>
        </h1>

        {/* Body Message */}
        <p className="mm-description">
          {customMessage ||
            'We are currently curating seasonal micro-lot harvests and enhancing our digital roasting suite. Our doors will reopen shortly.'}
        </p>

        {/* Quick Contact & Check Buttons */}
        <div className="mm-actions-row">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mm-btn-whatsapp"
          >
            <FaWhatsapp className="mm-btn-icon" />
            <span>Order via WhatsApp</span>
          </a>

          <button
            type="button"
            className={`mm-btn-check ${checking ? 'loading' : ''}`}
            onClick={handleCheckStatus}
            disabled={checking}
          >
            <FaRedo className={`mm-btn-icon ${checking ? 'spin' : ''}`} />
            <span>{checking ? 'Checking…' : 'Check Status'}</span>
          </button>
        </div>

        {/* Footer Meta */}
        <div className="mm-footer-meta">
          <div className="mm-roast-note">
            <FaCoffee className="mm-note-icon" />
            <span>Fresh beans roasted to order · Shipments processing normally</span>
          </div>

          <div className="mm-admin-link-wrap">
            <a href="/admin" className="mm-admin-portal-link">
              <FaLock className="mm-admin-icon" />
              <span>Staff & Admin Sign In</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

