// client/src/components/Account/WalletTab.jsx — Minimalist Quiet Luxury Wallet Suite
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCreditCard, FaLock, FaTimes, FaShieldAlt, FaCheckCircle,
  FaEdit, FaEye, FaEyeSlash, FaCheck
} from 'react-icons/fa';

const PasswordPromptModal = ({ isOpen, onClose, onVerified }) => {
  const [password, setPassword] = useState('');
  const { confirmPassword } = useContext(AppContext);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    const success = await confirmPassword(password);
    setIsVerifying(false);
    if (success) {
      onVerified();
      setPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ord-modal-backdrop" onClick={onClose}>
      <motion.div
        className="ord-clean-card"
        style={{ maxWidth: '440px', width: '100%', margin: 'auto' }}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ord-clean-top">
          <span className="ord-clean-number">Verify Identity</span>
          <button type="button" className="ord-modal-close-btn" onClick={onClose} style={{ position: 'static' }}>
            <FaTimes />
          </button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--cust-text-muted)', margin: '0 0 1rem' }}>
          Enter your account password to view your full phone number.
        </p>
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            placeholder="Account Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            className="ord-search-minimal-input"
            style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button type="button" className="ord-action-btn outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ord-action-btn solid" disabled={isVerifying}>
              {isVerifying ? 'Verifying…' : 'Confirm'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const WalletTab = () => {
  const { user, updateUserProfile, showNotification } = useContext(AppContext);

  const [isEditingMpesa, setIsEditingMpesa] = useState(false);
  const [unmaskedMpesa, setUnmaskedMpesa] = useState(false);
  const [showSecurityPrompt, setShowSecurityPrompt] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState(user?.wallet?.mpesaPhone || user?.phone || '');

  useEffect(() => {
    if (user?.wallet?.mpesaPhone || user?.phone) {
      setMpesaPhone(user.wallet?.mpesaPhone || user.phone);
    }
  }, [user]);

  const maskPhone = (phone) => {
    if (!phone) return '0700 ••• •••';
    return phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 ••• $3');
  };

  const handleSaveMpesa = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile({
        wallet: {
          ...user?.wallet,
          mpesaPhone: mpesaPhone.trim()
        }
      });
      showNotification?.('M-Pesa details updated', 'success');
      setIsEditingMpesa(false);
    } catch (err) {
      showNotification?.(err.message || 'Failed to update M-Pesa details', 'error');
    }
  };

  const currentDisplayPhone = unmaskedMpesa ? (mpesaPhone || user?.phone || 'Not set') : maskPhone(mpesaPhone || user?.phone);

  return (
    <div className="ord-luxury-canvas">
      {/* ══ Editorial Header ══ */}
      <div className="ord-luxury-header">
        <span className="ord-luxury-tag">PAYMENT</span>
        <h2 className="ord-luxury-title">M-Pesa Payment</h2>
        <p className="ord-luxury-sub">
          Manage your Lipa na M-Pesa phone number for fast and easy checkout.
        </p>
        <div className="ord-luxury-h-line" />
      </div>

      {/* ── Card 1: Lipa na M-Pesa Express ── */}
      <div className="ord-clean-card">
        <div className="ord-clean-top">
          <div className="ord-clean-meta-left">
            <span className="ord-clean-number">Lipa na M-Pesa Express</span>
            <span className="ord-clean-dot-sep" />
            <span className="ord-clean-date">Instant STK Push Billing</span>
          </div>

          <div className="ord-clean-badges-right">
            <span className="ord-clean-status-pill delivered">
              <FaCheck style={{ marginRight: '4px', fontSize: '0.65rem' }} /> Primary Method
            </span>
          </div>
        </div>

        <div className="ord-clean-divider" />

        {!isEditingMpesa ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '56px', height: '42px', borderRadius: '8px', background: '#00A859', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 900, fontSize: '0.85rem' }}>
                M-PESA
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, color: 'var(--cust-text-dim)', display: 'block', marginBottom: '2px' }}>
                  Registered Telephone
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--cust-text)', letterSpacing: '0.5px' }}>
                  {currentDisplayPhone}
                </span>
              </div>
            </div>

            <div className="ord-clean-actions">
              <button
                type="button"
                className="ord-action-btn outline"
                onClick={() => {
                  if (!unmaskedMpesa) {
                    setShowSecurityPrompt(true);
                  } else {
                    setUnmaskedMpesa(false);
                  }
                }}
              >
                {unmaskedMpesa ? <FaEyeSlash /> : <FaEye />} {unmaskedMpesa ? 'Hide Number' : 'Reveal Number'}
              </button>

              <button
                type="button"
                className="ord-action-btn solid"
                onClick={() => setIsEditingMpesa(true)}
              >
                <FaEdit /> Update Number
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveMpesa} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>M-Pesa Mobile Number (Safaricom)</label>
              <input
                type="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XX XXX XXX or 2547XXXXXXXX"
                required
                className="ord-search-minimal-input"
                style={{ borderRadius: '10px', padding: '0.7rem 1rem', maxWidth: '380px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start' }}>
              <button type="submit" className="ord-action-btn solid">
                Save M-Pesa Number
              </button>
              <button type="button" className="ord-action-btn outline" onClick={() => setIsEditingMpesa(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="ord-clean-divider" />

        <div className="ord-clean-bottom">
          <span style={{ fontSize: '0.78rem', color: 'var(--cust-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaShieldAlt style={{ color: 'var(--cust-gold)' }} /> Safaricom Daraja API 2.0 encrypted STK push
          </span>
        </div>
      </div>

      {/* ── Card 2: Credit / Debit Card ── */}
      <div className="ord-clean-card">
        <div className="ord-clean-top">
          <div className="ord-clean-meta-left">
            <span className="ord-clean-number">Card Payment Gateway</span>
            <span className="ord-clean-dot-sep" />
            <span className="ord-clean-date">Visa & Mastercard</span>
          </div>

          <div className="ord-clean-badges-right">
            <span className="ord-clean-status-pill processing">
              Secured Checkout
            </span>
          </div>
        </div>

        <div className="ord-clean-divider" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--cust-text)', margin: '0 0 4px' }}>
              PCI-DSS Compliant Gateway
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--cust-text-muted)', margin: 0, maxWidth: '520px', lineHeight: 1.5 }}>
              Credit and debit cards are tokenized securely through our banking gateway during checkout. No raw card numbers are stored on Rerendet servers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ padding: '6px 12px', border: '1px solid var(--cust-border)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              VISA
            </span>
            <span style={{ padding: '6px 12px', border: '1px solid var(--cust-border)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
              MASTERCARD
            </span>
          </div>
        </div>
      </div>

      {/* Security Modal */}
      <PasswordPromptModal
        isOpen={showSecurityPrompt}
        onClose={() => setShowSecurityPrompt(false)}
        onVerified={() => {
          setShowSecurityPrompt(false);
          setUnmaskedMpesa(true);
        }}
      />
    </div>
  );
};

export default WalletTab;
