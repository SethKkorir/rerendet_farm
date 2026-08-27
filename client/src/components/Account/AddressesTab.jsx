import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaMapMarkerAlt, FaPlus, FaEdit, FaCheck, FaPhone, FaGlobe, FaUserAlt, FaInfoCircle, FaTrash } from 'react-icons/fa';
import { KENYA_LOCATIONS } from '../../utils/kenyaLocations';
import { COUNTRY_LIST } from '../../utils/countryList';
import { motion, AnimatePresence } from 'framer-motion';

const AddressesTab = () => {
    const { user, updateUserProfile, loading, showNotification } = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);

    // Backwards compatibility: Get addresses list from user profile
    const savedAddresses = user?.shippingInfo?.additionalAddresses || [];

    // Auto-migrate standard single shippingInfo to additionalAddresses if needed
    const getMigratedAddresses = () => {
        const list = [...savedAddresses];
        if (user?.shippingInfo?.address && list.length === 0) {
            list.push({
                id: 'primary-default',
                firstName: user?.shippingInfo?.firstName || user?.firstName || '',
                lastName: user?.shippingInfo?.lastName || user?.lastName || '',
                phone: user?.shippingInfo?.phone || user?.phone || '',
                address: user?.shippingInfo?.address || '',
                county: user?.shippingInfo?.county || 'Nairobi',
                town: user?.shippingInfo?.town || '',
                country: user?.shippingInfo?.country || 'Kenya',
                zip: user?.shippingInfo?.zip || '',
                isDefault: true
            });
        }
        return list;
    };

    const activeAddresses = getMigratedAddresses();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        county: 'Nairobi',
        town: '',
        country: 'Kenya',
        zip: '',
        isDefault: false
    });

    const [availableTowns, setAvailableTowns] = useState([]);
    const [allCountries] = useState(COUNTRY_LIST);

    // Update available towns when county changes
    useEffect(() => {
        if (formData.country === 'Kenya' && formData.county) {
            setAvailableTowns(KENYA_LOCATIONS[formData.county] || []);
        } else {
            setAvailableTowns([]);
        }
    }, [formData.county, formData.country]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
            // Reset town if county changes
            if (name === 'county') newData.town = '';
            return newData;
        });
    };

    const saveAddressesList = async (newList) => {
        // Ensure there is at least one default address if the list is not empty
        let defaultAddress = newList.find(a => a.isDefault);
        if (!defaultAddress && newList.length > 0) {
            newList[0].isDefault = true;
            defaultAddress = newList[0];
        }

        const updatedShippingInfo = {
            additionalAddresses: newList,
            // Sync default address to standard root shippingInfo fields for backwards compatibility / checkout
            firstName: defaultAddress ? defaultAddress.firstName : '',
            lastName: defaultAddress ? defaultAddress.lastName : '',
            address: defaultAddress ? defaultAddress.address : '',
            city: defaultAddress ? (defaultAddress.country === 'Kenya' ? defaultAddress.county : defaultAddress.city) : '',
            county: defaultAddress ? defaultAddress.county : '',
            town: defaultAddress ? defaultAddress.town : '',
            zip: defaultAddress ? defaultAddress.zip : '',
            country: defaultAddress ? defaultAddress.country : 'Kenya'
        };

        try {
            await updateUserProfile({
                shippingInfo: updatedShippingInfo
            });
            showNotification(
                editingAddressId ? 'Delivery address refined' : 'New delivery point pinned',
                'success'
            );
            setIsEditing(false);
            setEditingAddressId(null);
        } catch (error) {
            showNotification(error.message || 'Failed to sync address data', 'error');
        }
    };

    const handleOpenAddForm = () => {
        setFormData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            address: '',
            city: '',
            county: '',
            town: '',
            country: 'Kenya',
            zip: '',
            isDefault: activeAddresses.length === 0
        });
        setEditingAddressId(null);
        setIsEditing(true);
    };

    const handleOpenEditForm = (address) => {
        setFormData({
            firstName: address.firstName || user?.firstName || '',
            lastName: address.lastName || user?.lastName || '',
            address: address.address || '',
            city: address.city || '',
            county: address.county || '',
            town: address.town || '',
            country: address.country || 'Kenya',
            zip: address.zip || '',
            isDefault: address.isDefault || false
        });
        setEditingAddressId(address.id);
        setIsEditing(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newAddress = {
            id: editingAddressId || 'addr-' + Date.now(),
            firstName: formData.firstName || user?.firstName || '',
            lastName: formData.lastName || user?.lastName || '',
            address: formData.address,
            city: formData.country === 'Kenya' ? formData.county : formData.city,
            county: formData.county || '',
            town: formData.town || '',
            zip: formData.zip || '',
            country: formData.country,
            isDefault: formData.isDefault
        };

        let updatedList = [...activeAddresses];

        if (editingAddressId) {
            updatedList = updatedList.map(a => a.id === editingAddressId ? newAddress : a);
        } else {
            updatedList.push(newAddress);
        }

        // Handle default reset for others if current is default
        if (newAddress.isDefault) {
            updatedList = updatedList.map(a => a.id === newAddress.id ? { ...a, isDefault: true } : { ...a, isDefault: false });
        }

        await saveAddressesList(updatedList);
    };

    const handleDeleteAddress = async (id, wasDefault) => {
        if (window.confirm('Are you sure you want to permanently remove this delivery address?')) {
            let updatedList = activeAddresses.filter(a => a.id !== id);

            if (wasDefault && updatedList.length > 0) {
                updatedList[0].isDefault = true;
            }

            await saveAddressesList(updatedList);
        }
    };

    const handleSetDefault = async (id) => {
        const updatedList = activeAddresses.map(a => ({
            ...a,
            isDefault: a.id === id
        }));
        await saveAddressesList(updatedList);
    };

    return (
        <div className="modern-dashboard-tab">
            {!isEditing ? (
                <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <p style={{ color: 'var(--text-3)', fontSize: '0.88rem', margin: 0 }}>
                                Save multiple shipping nodes for home, office, or relatives.
                            </p>
                        </div>
                        {activeAddresses.length > 0 && (
                            <button className="btn-open-ticket" onClick={handleOpenAddForm}>
                                <FaPlus /> Add New Address
                            </button>
                        )}
                    </div>

                    {activeAddresses.length > 0 ? (
                        <div className="addresses-grid">
                            {activeAddresses.map(address => (
                                <div key={address.id} className={`modern-address-card ${address.isDefault ? 'active' : ''}`}>
                                    <div className="address-card-header">
                                        <div className="header-labels">
                                            <span className="type-badge">
                                                {address.isDefault ? 'Primary Delivery Address' : 'Secondary Address'}
                                            </span>
                                            {address.isDefault && (
                                                <span className="badge-default">
                                                    <FaCheck /> Active Session
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="edit-trigger" 
                                                onClick={() => handleOpenEditForm(address)} 
                                                title="Edit Address"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button 
                                                className="edit-trigger" 
                                                style={{ color: 'var(--accent-red)' }} 
                                                onClick={() => handleDeleteAddress(address.id, address.isDefault)} 
                                                title="Delete Address"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="address-card-body">
                                        <div className="info-row name-row">
                                            <div className="info-icon"><FaUserAlt /></div>
                                            <div className="info-content">
                                                <p className="label">Receiver</p>
                                                <p className="value">{address.firstName} {address.lastName}</p>
                                            </div>
                                        </div>

                                        <div className="info-row address-row">
                                            <div className="info-icon"><FaMapMarkerAlt /></div>
                                            <div className="info-content">
                                                <p className="label">Delivery Area</p>
                                                <p className="value">
                                                    {address.country === 'Kenya'
                                                        ? `${address.town}, ${address.county} County`
                                                        : address.city
                                                    }
                                                </p>
                                                <p className="value-sub">{address.address}</p>
                                                {address.zip && <p className="value-sub">P.O Box / Zip: {address.zip}</p>}
                                            </div>
                                        </div>

                                        <div className="info-row contact-row">
                                            <div className="info-icon"><FaPhone /></div>
                                            <div className="info-content">
                                                <p className="label">Primary Phone (from Profile)</p>
                                                <p className="value">
                                                    {address.phone || user?.phone
                                                        ? (address.phone || user.phone).replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 ••• $3')
                                                        : 'No phone configured'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="address-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--noir-border)' }}>
                                        <span className="location-tag"><FaGlobe /> {address.country}</span>
                                        {!address.isDefault ? (
                                            <button 
                                                className="btn-modern-outline btn-sm" 
                                                onClick={() => handleSetDefault(address.id)}
                                            >
                                                Make Default
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: '700' }}>Active Node</span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Standard Add Card inside grid */}
                            <div className="add-address-card-btn" onClick={handleOpenAddForm}>
                                <FaPlus />
                                <span>Add New Address</span>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ width: '100%' }}>
                            <div className="empty-icon-wrap">
                                <FaMapMarkerAlt className="empty-icon" />
                            </div>
                            <h3>Map your deliveries</h3>
                            <p>Tell us where to deliver your Rerendet acquisitions for seamless logistics.</p>
                            <button className="btn-open-ticket" onClick={handleOpenAddForm}>
                                <FaPlus /> Add Pin Location
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="content-card address-editor" style={{ width: '100%' }}>
                    <div className="card-header">
                        <div className="header-title">
                            <h3>{editingAddressId ? 'Refine Delivery Info' : 'New Delivery Address'}</h3>
                            <p>Tailored for precise location tracking and faster shipping.</p>
                        </div>
                        <button className="close-editor" onClick={() => { setIsEditing(false); setEditingAddressId(null); }}>×</button>
                    </div>

                    <form className="modern-form" onSubmit={handleSubmit}>
                        <div className="form-section">
                            <div className="section-title">
                                <FaMapMarkerAlt /> <span>1. Delivery Coordinates</span>
                            </div>

                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="Receiver's First Name"
                                        required
                                        className="premium-input-modern"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Receiver's Last Name"
                                        required
                                        className="premium-input-modern"
                                    />
                                </div>
                            </div>

                            <div className="form-grid-2 mt-3">
                                <div className="form-group">
                                    <label>Country</label>
                                    <select
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className="premium-select-modern"
                                    >
                                        {allCountries.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                {formData.country === 'Kenya' ? (
                                    <div className="form-group">
                                        <label>County</label>
                                        <select
                                            name="county"
                                            value={formData.county}
                                            onChange={handleChange}
                                            className="premium-select-modern"
                                            required
                                        >
                                            <option value="">Select County</option>
                                            {Object.keys(KENYA_LOCATIONS).sort().map(county => (
                                                <option key={county} value={county}>{county}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label>State / Region</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                            placeholder="Region name"
                                            className="premium-input-modern"
                                        />
                                    </div>
                                )}
                            </div>

                            {formData.country === 'Kenya' && formData.county && (
                                <div className="form-group mt-3">
                                    <label>Area / Town / Center</label>
                                    <select
                                        name="town"
                                        value={formData.town}
                                        onChange={handleChange}
                                        className="premium-select-modern"
                                        required
                                    >
                                        <option value="">Select Nearest Town/Center</option>
                                        {availableTowns.sort().map(town => (
                                            <option key={town} value={town}>{town}</option>
                                        ))}
                                        <option value="Other">Other (Type below)</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group mt-3">
                                <label>Street / Building / Landmark</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="e.g. Near Bomet Stadium, Green Building, 2nd Floor"
                                    required
                                    rows="2"
                                    className="premium-input-modern"
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="form-grid-2 mt-3">
                                <div className="form-group">
                                    <div className="label-with-hint">
                                        <label>Zip Code / P.O Box</label>
                                        <span className="hint-text" style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>(Optional in KE)</span>
                                    </div>
                                    <input
                                        type="text"
                                        name="zip"
                                        value={formData.zip}
                                        onChange={handleChange}
                                        placeholder="e.g. 00100"
                                        className="premium-input-modern"
                                    />
                                </div>

                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <label className="premium-switch" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: 'auto', width: 'auto', position: 'static', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            name="isDefault"
                                            checked={formData.isDefault}
                                            onChange={handleChange}
                                            style={{ opacity: 1, width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-warm)' }}
                                        />
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', textTransform: 'none', letterSpacing: 'normal', fontWeight: '600' }}>
                                            Set as primary delivery address
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="zip-info-box mt-3" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--noir-surface)', border: '1px solid var(--noir-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-3)', fontSize: '0.75rem' }}>
                                <FaInfoCircle style={{ color: 'var(--accent-warm)', flexShrink: 0 }} />
                                <span>If you don't know your zip, use <strong>00100</strong> for Nairobi or leave blank.</span>
                            </div>
                        </div>

                        <div className="form-actions mt-4" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="btn-text-only"
                                onClick={() => { setIsEditing(false); setEditingAddressId(null); }}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-premium-solid"
                                disabled={loading}
                            >
                                {loading ? 'Securing Coordinates...' : 'Save Delivery Point'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AddressesTab;
