// client/src/components/Account/WalletTab.jsx — M-Pesa Payment Suite (Matching Image 5)
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMobileAlt, FaLock, FaShieldAlt, FaPhone, FaCheck,
  FaChevronRight, FaTimes, FaQuestionCircle
} from 'react-icons/fa';

const WalletTab = ({ onNavigate }) => {
  const { user, updateUserProfile, showNotification, showSuccess, showError } = useContext(AppContext);

  const [isEditingMpesa, setIsEditingMpesa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState(user?.wallet?.mpesaPhone || user?.phone || '+254 712 345 821');

  useEffect(() => {
    if (user?.wallet?.mpesaPhone || user?.phone) {
      setMpesaPhone(user.wallet?.mpesaPhone || user.phone);
    }
  }, [user]);

  const fullName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Seth Kipchumba';

  // Format mask: +254 7•• ••• 821
  const formatMaskedPhone = (phone) => {
    if (!phone) return '+254 7•• ••• 821';
    const clean = String(phone).replace(/\s+/g, '');
    if (clean.length < 8) return clean;
    const prefix = clean.startsWith('+') ? clean.slice(0, 6) : '+254 7';
    const lastThree = clean.slice(-3);
    return `${prefix}•• ••• ${lastThree}`;
  };

  const handleSaveMpesa = async (e) => {
    e.preventDefault();
    if (!mpesaPhone.trim()) {
      showError?.('Please enter your M-Pesa mobile number');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({
        wallet: {
          ...user?.wallet,
          mpesaPhone: mpesaPhone.trim()
        }
      });
      showSuccess?.('M-Pesa number updated successfully');
      setIsEditingMpesa(false);
    } catch (err) {
      showError?.(err.message || 'Failed to update M-Pesa number');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ord-luxury-canvas" style={{ padding: 0 }}>
      {/* ══ Header Row (Matching Image 5) ══ */}
      <div style={{ marginBottom: '1.25rem' }}>
        <span className="rc-dash-eyebrow">— YOUR ACCOUNT</span>
        <h2 className="rc-dash-title">M-Pesa payment</h2>
        <p className="rc-dash-sub">A simple, secure way to pay for your coffee.</p>
        <p className="rc-dash-subnote">
          Manage the M-Pesa number you use at checkout. You'll confirm each payment securely on your phone.
        </p>
      </div>

      {/* ══ Hero M-Pesa Card (Matching Image 5) ══ */}
      <div className="rc-mpesa-hero-card">
        {/* Top: Icon + M-PESA + PREFERRED METHOD */}
        <div className="rc-mpesa-hero-top">
          <div className="rc-mpesa-brand-tag">
            <FaMobileAlt style={{ fontSize: '1.1rem' }} />
            <span>M-PESA</span>
          </div>

          <span className="rc-badge-preferred">
            <FaCheck style={{ fontSize: '0.65rem' }} /> PREFERRED METHOD
          </span>
        </div>

        {/* Middle: Linked Phone Number */}
        <div>
          <span className="rc-mpesa-holder-label" style={{ color: '#C5A065' }}>
            LINKED PHONE NUMBER
          </span>
          <div className="rc-mpesa-number-display">
            {formatMaskedPhone(mpesaPhone)}
          </div>
        </div>

        {/* Bottom: Account Holder + Secure Checkout */}
        <div className="rc-mpesa-hero-bottom">
          <div>
            <span className="rc-mpesa-holder-label">
              ACCOUNT HOLDER
            </span>
            <div className="rc-mpesa-holder-name">
              {fullName}
            </div>
          </div>

          <div className="rc-mpesa-secure-badge">
            <FaLock style={{ fontSize: '0.72rem' }} />
            <span>Secure checkout</span>
          </div>
        </div>
      </div>

      {/* ══ Action Buttons Row (Matching Image 5) ══ */}
      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        <button
          type="button"
          className="rc-btn-gold"
          onClick={() => setIsEditingMpesa(true)}
        >
          <FaPhone style={{ fontSize: '0.78rem' }} /> Update phone number
        </button>

        <button
          type="button"
          className="rc-btn-white"
          onClick={() => setIsEditingMpesa(true)}
        >
          Add or update number →
        </button>
      </div>

      {/* ══ Inline Edit Form (when active) ══ */}
      {isEditingMpesa && (
        <div className="rc-card-white" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--cust-text, #1E140E)', margin: '0 0 0.5rem' }}>
            Update Lipa na M-Pesa Line
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--cust-text-muted, #665548)', margin: '0 0 1.25rem' }}>
            Enter your Safaricom mobile line. You will receive an STK Push PIN prompt on this phone whenever checking out.
          </p>

          <form onSubmit={handleSaveMpesa} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '420px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                M-Pesa Mobile Number *
              </label>
              <input
                type="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="e.g. +254 712 345 821 or 0712345821"
                required
                className="ord-search-minimal-input"
                style={{ borderRadius: '10px', padding: '0.75rem 1rem', width: '100%' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="rc-btn-white"
                onClick={() => setIsEditingMpesa(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rc-btn-gold"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save number'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══ Payment Details Card (Matching Image 5) ══ */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{
          fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)',
          fontSize: '1.35rem',
          fontWeight: 700,
          color: 'var(--cust-text, #1E140E)',
          margin: '0 0 1rem 0'
        }}>
          Payment details
        </h3>

        <div className="rc-card-white" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.35rem 1.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(202, 160, 88, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B58838',
              fontSize: '0.9rem',
              flexShrink: 0
            }}>
              <FaPhone />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--cust-text, #1E140E)', margin: '0 0 2px 0' }}>
                Mobile money
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--cust-text-muted, #665548)', margin: 0 }}>
                Use your registered M-Pesa line at checkout
              </p>
            </div>
          </div>

          <FaChevronRight style={{ color: '#B58838', fontSize: '0.85rem' }} />
        </div>

        {/* Security Callout Banner */}
        <div className="rc-card-white" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1.15rem 1.5rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(202, 160, 88, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#B58838',
            fontSize: '0.85rem',
            flexShrink: 0
          }}>
            <FaCheck />
          </div>
          <p style={{ fontSize: '0.84rem', color: '#665548', margin: 0, lineHeight: 1.45 }}>
            We never store your M-Pesa PIN. Payment requests are approved directly on your device through Safaricom.
          </p>
        </div>

        {/* Need Help Link */}
        <div>
          <button
            type="button"
            onClick={() => onNavigate?.('tickets')}
            style={{
              background: 'none',
              border: 'none',
              color: '#B58838',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Need help with M-Pesa? →
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletTab;
