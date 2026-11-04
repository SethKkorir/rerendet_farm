import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaMugHot,
  FaTint,
  FaThermometerHalf,
  FaClock,
  FaBalanceScale,
  FaCheck,
  FaInfoCircle,
  FaDownload,
  FaWhatsapp,
  FaCopy,
  FaShareAlt,
  FaLeaf
} from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import {
  DEFAULT_BREW_METHODS,
  downloadBrewCard,
  getWhatsAppShareUrl,
  getSocialCaption
} from '../../utils/brewCardGenerator';
import './BrewGuideModal.css';

const BrewGuideModal = ({ isOpen, onClose }) => {
  const { publicSettings, showNotification } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('french-press');
  const [cupCount, setCupCount] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const customGuides = publicSettings?.about?.brewGuides;
  const methods = (Array.isArray(customGuides) && customGuides.length > 0)
    ? customGuides
    : DEFAULT_BREW_METHODS;

  const current = methods.find((m) => m.id === activeTab) || methods[0] || DEFAULT_BREW_METHODS[0];

  const storeName = publicSettings?.store?.name || 'Rerendet Coffee';

  // Dynamic ratio calculator
  const calculatedCoffee = Math.round((current.baseCoffee || 20) * cupCount);
  const calculatedWater = Math.round((current.baseWater || 300) * cupCount);

  // Handle Download Social Card
  const handleDownloadCard = async () => {
    try {
      setIsDownloading(true);
      await downloadBrewCard(current, storeName);
      if (showNotification) {
        showNotification(`Downloaded ${current.name} Social Card (PNG)!`, 'success');
      }
    } catch (err) {
      if (showNotification) {
        showNotification('Failed to generate image. Please try again.', 'error');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle WhatsApp Share
  const handleWhatsAppShare = () => {
    const url = getWhatsAppShareUrl(current, storeName);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle Copy Social Caption
  const handleCopyCaption = async () => {
    try {
      const caption = getSocialCaption(current, storeName);
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      if (showNotification) {
        showNotification('Copied Instagram/Facebook caption to clipboard!', 'success');
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      if (showNotification) {
        showNotification('Could not copy to clipboard', 'error');
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="bg-modal-overlay" onClick={onClose}>
        <motion.div
          className="bg-modal-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="bg-modal-header">
            <div className="bg-modal-header-text">
              <span className="bg-modal-badge">
                <FaLeaf className="bg-badge-icon" /> RERENDET HIGHLAND BREW GUIDE
              </span>
              <h2 className="bg-modal-title">Master the Perfect Pour</h2>
              <p className="bg-modal-subtitle">
                Calibrated instructions to extract optimal flavor notes from Kenyan single-origin beans.
              </p>
            </div>
            <button
              className="bg-modal-close"
              onClick={onClose}
              aria-label="Close Brew Guide"
            >
              <FaTimes />
            </button>
          </div>

          {/* Method Nav Tabs */}
          <div className="bg-tabs-strip">
            {methods.map((method) => (
              <button
                key={method.id}
                className={`bg-tab-btn ${activeTab === method.id ? 'active' : ''}`}
                onClick={() => setActiveTab(method.id)}
              >
                <span className="bg-tab-icon">{method.icon || '☕'}</span>
                <span className="bg-tab-name">{method.name}</span>
              </button>
            ))}
          </div>

          {/* Social Share & Export Quick Bar */}
          <div className="bg-share-quickbar">
            <div className="bg-quickbar-label">
              <FaShareAlt className="bg-quickbar-icon" />
              <span>Share & Export Recipe:</span>
            </div>
            <div className="bg-quickbar-actions">
              <button
                className="bg-action-pill bg-download-pill"
                onClick={handleDownloadCard}
                disabled={isDownloading}
                title="Download high-resolution Instagram/WhatsApp 4:5 card"
              >
                <FaDownload />
                <span>{isDownloading ? 'Generating...' : 'Download Card (PNG)'}</span>
              </button>

              <button
                className="bg-action-pill bg-whatsapp-pill"
                onClick={handleWhatsAppShare}
                title="Share formatted recipe on WhatsApp"
              >
                <FaWhatsapp />
                <span>WhatsApp</span>
              </button>

              <button
                className={`bg-action-pill bg-copy-pill ${copied ? 'copied' : ''}`}
                onClick={handleCopyCaption}
                title="Copy caption with hashtags for Instagram or Facebook"
              >
                {copied ? <FaCheck /> : <FaCopy />}
                <span>{copied ? 'Copied!' : 'Copy Caption'}</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="bg-modal-body">
            {/* Quick Metrics Bar */}
            <div className="bg-metrics-grid">
              <div className="bg-metric-item">
                <div className="bg-metric-icon-wrap">
                  <FaBalanceScale />
                </div>
                <div>
                  <span className="bg-metric-label">Brew Ratio</span>
                  <span className="bg-metric-val">{current.ratio}</span>
                </div>
              </div>

              <div className="bg-metric-item">
                <div className="bg-metric-icon-wrap">
                  <FaTint />
                </div>
                <div>
                  <span className="bg-metric-label">Grind Size</span>
                  <span className="bg-metric-val">{current.grind}</span>
                  <span className="bg-metric-sub">{current.grindDesc}</span>
                </div>
              </div>

              <div className="bg-metric-item">
                <div className="bg-metric-icon-wrap">
                  <FaThermometerHalf />
                </div>
                <div>
                  <span className="bg-metric-label">Water Temp</span>
                  <span className="bg-metric-val">{current.temp}</span>
                  <span className="bg-metric-sub">{current.tempDesc}</span>
                </div>
              </div>

              <div className="bg-metric-item">
                <div className="bg-metric-icon-wrap">
                  <FaClock />
                </div>
                <div>
                  <span className="bg-metric-label">Target Time</span>
                  <span className="bg-metric-val">{current.time}</span>
                </div>
              </div>
            </div>

            {/* Interactive Batch Size Scaler */}
            <div className="bg-scaler-card">
              <div className="bg-scaler-left">
                <span className="bg-scaler-title">Batch Scaler</span>
                <span className="bg-scaler-desc">Select how many servings you are brewing</span>
              </div>
              <div className="bg-scaler-actions">
                <div className="bg-cup-pills">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      className={`bg-cup-pill ${cupCount === n ? 'active' : ''}`}
                      onClick={() => setCupCount(n)}
                    >
                      {n} {n === 1 ? 'Cup' : 'Cups'}
                    </button>
                  ))}
                </div>
                <div className="bg-recipe-yield">
                  <span className="bg-yield-coffee">☕ {calculatedCoffee}g Coffee</span>
                  <span className="bg-yield-div">+</span>
                  <span className="bg-yield-water">💧 {calculatedWater}ml Water</span>
                </div>
              </div>
            </div>

            {/* Flavor Profile Callout */}
            <div className="bg-profile-callout">
              <FaMugHot className="bg-profile-icon" />
              <div>
                <strong>Taste Profile:</strong> {current.profile}
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="bg-steps-section">
              <h3 className="bg-steps-heading">Step-by-Step Instructions</h3>
              <div className="bg-steps-list">
                {(current.steps || []).map((step, idx) => (
                  <div key={idx} className="bg-step-card">
                    <div className="bg-step-number">{idx + 1}</div>
                    <div className="bg-step-content">
                      <h4 className="bg-step-title">{step.title}</h4>
                      <p className="bg-step-desc">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip Box */}
            <div className="bg-protip-box">
              <div className="bg-protip-icon">
                <FaInfoCircle />
              </div>
              <div className="bg-protip-text">
                <strong>Barista Pro-Tip:</strong> {current.proTip}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-modal-footer">
            <span className="bg-footer-origin">
              Single-origin Arabica from Rerendet Highlands (1,800m ASL)
            </span>
            <div className="bg-footer-right-actions">
              <button
                className="bg-footer-secondary-btn"
                onClick={handleDownloadCard}
                disabled={isDownloading}
              >
                <FaDownload /> {isDownloading ? 'Saving...' : 'Download Card'}
              </button>
              <button className="bg-footer-close-btn" onClick={onClose}>
                Got It, Let's Brew
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BrewGuideModal;
