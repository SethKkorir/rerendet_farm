// client/src/components/Account/ProfileTab.jsx — Minimalist Quiet Luxury Profile Suite
import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaLock, FaUser, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';

const ProfileTab = () => {
  const { user, updateUserProfile, loading, showSuccess, showError } = useContext(AppContext);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || ''
  });

  const maskPhone = (phone) => {
    if (!phone) return 'Not set';
    return phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 ••• $3');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(formData);
      showSuccess?.('Profile updated successfully');
    } catch (error) {
      showError?.(error.message || 'Failed to update profile');
    }
  };

  return (
    <div className="ord-luxury-canvas">
      {/* ══ Editorial Header ══ */}
      <div className="ord-luxury-header">
        <span className="ord-luxury-tag">PROFILE</span>
        <h2 className="ord-luxury-title">My Profile</h2>
        <p className="ord-luxury-sub">
          Update your name, contact phone number, and personal details.
        </p>
        <div className="ord-luxury-h-line" />
      </div>

      <div className="ord-clean-card">
        {/* Top Strip */}
        <div className="ord-clean-top">
          <div className="ord-clean-meta-left">
            <span className="ord-clean-number">
              {formData.firstName || user?.firstName} {formData.lastName || user?.lastName}
            </span>
            <span className="ord-clean-dot-sep" />
            <span className="ord-clean-date">{user?.email}</span>
          </div>

          <div className="ord-clean-badges-right">
            <span className="ord-clean-status-pill delivered">
              <FaCheckCircle style={{ marginRight: '4px', fontSize: '0.65rem' }} /> Verified Account
            </span>
          </div>
        </div>

        <div className="ord-clean-divider" />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section: Personal Info */}
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, color: 'var(--cust-text-dim)', display: 'block', marginBottom: '1rem' }}>
              Personal Information
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  placeholder="First name"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.7rem 1rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  placeholder="Last name"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.7rem 1rem' }}
                />
              </div>
            </div>
          </div>

          <div className="ord-clean-divider" />

          {/* Section: Contact Details */}
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, color: 'var(--cust-text-dim)', display: 'block', marginBottom: '1rem' }}>
              Contact & Security
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Email Address</label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--cust-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaLock size={9} /> Locked
                  </span>
                </div>
                <input
                  type="email"
                  defaultValue={user?.email}
                  disabled
                  className="ord-search-minimal-input"
                  style={{
                    borderRadius: '10px',
                    padding: '0.7rem 1rem',
                    opacity: 0.7,
                    cursor: 'not-allowed',
                    background: 'var(--cust-bg-home)'
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Phone Number (for Courier & M-Pesa)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 700 000 000"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.7rem 1rem' }}
                />
              </div>
            </div>
          </div>

          <div className="ord-clean-divider" />

          {/* Action Row */}
          <div className="ord-clean-bottom">
            <span style={{ fontSize: '0.78rem', color: 'var(--cust-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaShieldAlt style={{ color: 'var(--cust-gold)' }} /> End-to-end encrypted profile storage
            </span>

            <button
              type="submit"
              className="ord-action-btn solid"
              disabled={loading}
            >
              {loading ? 'Saving Changes…' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileTab;
