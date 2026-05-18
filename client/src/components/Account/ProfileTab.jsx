import React, { useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaLock, FaUser } from 'react-icons/fa';

const ProfileTab = () => {
    const { user, updateUserProfile, loading, showSuccess, showError } = useContext(AppContext);
    
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
        gender: user?.gender || '',
        dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
    });

    const [isPhoneFocused, setIsPhoneFocused] = useState(false);

    const maskPhone = (phone) => {
        if (!phone) return 'Not set';
        return phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 ••• $3');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUserProfile(formData);
            showSuccess('Profile updated successfully');
        } catch (error) {
            showError(error.message || 'Failed to update profile');
        }
    };

    return (
        <div className="modern-dashboard-tab">
            <div className="content-card">
                <form className="modern-form" onSubmit={handleSubmit}>
                    <div className="profile-form-section">
                        <h4>Personal Information</h4>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                    placeholder="Enter your first name"
                                    className="premium-input-modern"
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    required
                                    placeholder="Enter your last name"
                                    className="premium-input-modern"
                                />
                            </div>
                        </div>

                        <div className="form-grid-2 mt-3" style={{ marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    className="premium-input-modern"
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-main)'
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Gender</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="premium-select-modern"
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        borderRadius: '8px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-main)'
                                    }}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                    <option value="prefer-not-to-say">Prefer not to say</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="profile-form-section mt-4" style={{ marginTop: '1.5rem' }}>
                        <h4>Contact Details</h4>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" defaultValue={user?.email} disabled className="disabled-input" />
                                <small className="form-text-small">
                                    <FaLock size={10} style={{ marginRight: '4px' }} />
                                    Email is locked for account security
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <div className="masked-input-container" style={{ position: 'relative' }}>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+254..."
                                        className="premium-input-modern"
                                        onFocus={() => setIsPhoneFocused(true)}
                                        onBlur={() => setIsPhoneFocused(false)}
                                    />
                                    {!isPhoneFocused && (
                                        <div className="input-mask-overlay" style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            background: 'var(--bg-card)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0 1rem',
                                            pointerEvents: 'none',
                                            borderRadius: 'inherit',
                                            color: 'var(--text-main)'
                                        }}>
                                            {maskPhone(formData.phone)}
                                        </div>
                                    )}
                                </div>
                                <small className="form-text-small">Visible only while editing</small>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions mt-4" style={{ marginTop: '1.5rem' }}>
                        <button className="btn-primary" disabled={loading}>
                            {loading ? 'Saving Changes...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileTab;
