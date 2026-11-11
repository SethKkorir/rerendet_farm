// client/src/components/Account/ProfileTab.jsx — Quiet Luxury Profile (Matching Image 4)
import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaEdit, FaMapMarkerAlt, FaLock, FaCheck } from 'react-icons/fa';

const ProfileTab = ({ onNavigate }) => {
  const { user, updateUserProfile, loading, showSuccess, showError } = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || ''
  });

  const fullName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Seth Kipchumba';
  const email = user?.email || 'seth.kipchumba@email.com';
  const phone = user?.phone || '+254 712 483 906';

  const defaultAddr = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0] || user?.shippingInfo;
  const deliveryArea = defaultAddr
    ? `${defaultAddr.town || defaultAddr.city || 'Nairobi'}, ${defaultAddr.country || 'Kenya'}`
    : 'Nairobi, Kenya';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '14 August 1992';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(formData);
      showSuccess?.('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      showError?.(error.message || 'Failed to update profile');
    }
  };

  return (
    <div className="ord-luxury-canvas" style={{ padding: 0 }}>
      {/* ══ Header Row (Matching Image 4) ══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <span className="rc-dash-eyebrow">— YOUR ACCOUNT</span>
          <h2 className="rc-dash-title">Your profile</h2>
          <p className="rc-dash-sub">The personal details we use to make every delivery feel like yours.</p>
          <p className="rc-dash-subnote">Keep your contact details up to date for orders and delivery notes.</p>
        </div>

        {!isEditing && (
          <button
            type="button"
            className="rc-btn-gold"
            onClick={() => setIsEditing(true)}
          >
            <FaEdit style={{ fontSize: '0.82rem' }} /> Edit details
          </button>
        )}
      </div>

      {/* ══ Personal Information Card (Matching Image 4) ══ */}
      <div className="rc-card-white" style={{ padding: '2rem 2.25rem' }}>
        {/* Card Top: Icon + Title + Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(202, 160, 88, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#B58838',
            fontSize: '0.95rem',
            flexShrink: 0
          }}>
            <FaUser />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--cust-text, #1E140E)', margin: '0 0 2px 0' }}>
              Personal information
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--cust-text-muted, #665548)', margin: 0 }}>
              Your details are only shared when needed to fulfil an order.
            </p>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  placeholder="First name"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.75rem 1rem', width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  placeholder="Last name"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.75rem 1rem', width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                  Email Address (Locked)
                </label>
                <input
                  type="email"
                  defaultValue={email}
                  disabled
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.75rem 1rem', width: '100%', opacity: 0.7, background: '#FAF7F2', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 712 483 906"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.75rem 1rem', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F2ECE3' }}>
              <button
                type="button"
                className="rc-btn-white"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rc-btn-gold"
                disabled={loading}
              >
                {loading ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </form>
        ) : (
          /* 2x2 Grid matching Image 4 */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem 1.5rem', marginBottom: '2rem' }}>
            {/* FULL NAME */}
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                FULL NAME
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--cust-text, #1E140E)' }}>
                <FaUser style={{ color: '#B58838', fontSize: '0.8rem' }} />
                <span>{fullName}</span>
              </div>
            </div>

            {/* EMAIL ADDRESS */}
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                EMAIL ADDRESS
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 500, color: 'var(--cust-text, #1E140E)' }}>
                <FaEnvelope style={{ color: '#B58838', fontSize: '0.8rem' }} />
                <span>{email}</span>
              </div>
            </div>

            {/* PHONE NUMBER */}
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                PHONE NUMBER
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 500, color: 'var(--cust-text, #1E140E)' }}>
                <FaPhone style={{ color: '#B58838', fontSize: '0.8rem' }} />
                <span>{phone}</span>
              </div>
            </div>

            {/* DATE OF BIRTH / MEMBER SINCE */}
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E7D70', marginBottom: '0.45rem' }}>
                DATE OF BIRTH
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--cust-text, #1E140E)' }}>
                — {memberSince}
              </div>
            </div>
          </div>
        )}

        {/* Card Footer: Last updated & Account holder */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--cust-border-subtle, #F2ECE3)', fontSize: '0.78rem', color: '#8E7D70' }}>
          <span>Last updated just now</span>
          <span style={{ fontWeight: 600, color: '#B58838' }}>Account holder</span>
        </div>
      </div>

      {/* ══ Default Delivery Area Card (Matching Image 4) ══ */}
      <div className="rc-card-white" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.4rem 1.75rem' }}>
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
            <FaMapMarkerAlt />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--cust-text, #1E140E)', margin: '0 0 2px 0' }}>
              Default delivery area
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--cust-text-muted, #665548)', margin: 0 }}>
              {deliveryArea} - Address details saved with your orders
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate?.('addresses')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--cust-gold, #CAA058)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.4rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          Manage addresses →
        </button>
      </div>
    </div>
  );
};

export default ProfileTab;
