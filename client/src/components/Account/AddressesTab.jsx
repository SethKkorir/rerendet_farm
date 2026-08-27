// components/Account/AddressesTab.jsx
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  FaMapMarkerAlt, FaPlus, FaEdit, FaCheck, FaPhone, FaGlobe,
  FaUserAlt, FaInfoCircle, FaTrash, FaExclamationTriangle, FaTimes
} from 'react-icons/fa';
import { KENYA_LOCATIONS } from '../../utils/kenyaLocations';
import { COUNTRY_LIST } from '../../utils/countryList';
import {
  getMyAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
} from '../../api/api';

const AddressesTab = () => {
  const { user, showNotification } = useContext(AppContext);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [conflictModal, setConflictModal] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    street: '',
    city: 'Nairobi',
    postalCode: '00100',
    country: 'Kenya',
    type: 'home',
    isDefault: false,
    instructions: ''
  });

  const [availableTowns, setAvailableTowns] = useState([]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await getMyAddresses();
      if (res.data?.success) {
        setAddresses(res.data.data || []);
      }
    } catch (err) {
      showNotification('Failed to load saved addresses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Update towns when city/county changes
  useEffect(() => {
    if (formData.country === 'Kenya' && formData.city) {
      setAvailableTowns(KENYA_LOCATIONS[formData.city] || []);
    } else {
      setAvailableTowns([]);
    }
  }, [formData.city, formData.country]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = (addr) => {
    setFormData({
      name: addr.name || '',
      street: addr.street || '',
      city: addr.city || 'Nairobi',
      postalCode: addr.postalCode || '00100',
      country: addr.country || 'Kenya',
      type: addr.type || 'home',
      isDefault: addr.isDefault || false,
      instructions: addr.instructions || ''
    });
    setEditingAddressId(addr._id);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setFormData({
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'My Home',
      street: '',
      city: 'Nairobi',
      postalCode: '00100',
      country: 'Kenya',
      type: 'home',
      isDefault: addresses.length === 0,
      instructions: ''
    });
    setEditingAddressId(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingAddressId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.street.trim()) {
      showNotification('Please fill in recipient name and street address', 'warning');
      return;
    }

    try {
      if (editingAddressId) {
        const res = await updateAddress(editingAddressId, formData);
        if (res.data?.success) {
          showNotification('Address updated successfully', 'success');
        }
      } else {
        const res = await createAddress(formData);
        if (res.data?.success) {
          showNotification('Address saved to your address book', 'success');
        }
      }
      setIsEditing(false);
      setEditingAddressId(null);
      fetchAddresses();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save address', 'error');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await setDefaultAddress(id);
      if (res.data?.success) {
        showNotification('Default delivery address updated', 'success');
        fetchAddresses();
      }
    } catch (err) {
      showNotification('Failed to set default address', 'error');
    }
  };

  const handleDelete = async (addr, force = false) => {
    try {
      const res = await deleteAddress(addr._id, force);
      if (res.data?.success) {
        showNotification('Address deleted', 'info');
        setConflictModal(null);
        fetchAddresses();
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.conflict) {
        // Active subscription conflict warning (Story 4 Acceptance Criteria)
        setConflictModal({
          address: addr,
          message: err.response.data.message
        });
      } else {
        showNotification(err.response?.data?.message || 'Failed to delete address', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="modern-dashboard-tab">
        <div className="tab-loading-spinner">
          <div className="noir-spinner" />
          <p>Loading address book…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard-tab">
      <div className="tab-section-header">
        <div>
          <h2>Delivery Addresses</h2>
          <p>Manage multiple destination addresses for express checkout and coffee subscription shipments.</p>
        </div>
        {!isEditing && (
          <button
            type="button"
            className="btn-order-primary"
            onClick={handleAddNew}
          >
            <FaPlus /> Add New Address
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="address-form-wrapper">
          <div className="address-form-header">
            <h3>{editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}</h3>
            <button type="button" className="close-form-btn" onClick={handleCancel}>
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modern-address-form">
            <div className="form-grid-2">
              <div className="modal-field">
                <label>Address Name / Label *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Home, Office, Farm Cottage"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="modal-field">
                <label>Address Type</label>
                <select name="type" value={formData.type} onChange={handleChange}>
                  <option value="home">Home</option>
                  <option value="work">Work / Office</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="modal-field">
              <label>Street Address / Apartment / Estate *</label>
              <input
                type="text"
                name="street"
                placeholder="e.g. House 4B, Acacia Estate, Karen Road"
                value={formData.street}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-grid-3">
              <div className="modal-field">
                <label>Country *</label>
                <select name="country" value={formData.country} onChange={handleChange}>
                  <option value="Kenya">Kenya</option>
                  {COUNTRY_LIST?.filter(c => c !== 'Kenya').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label>County / City *</label>
                {formData.country === 'Kenya' ? (
                  <select name="city" value={formData.city} onChange={handleChange}>
                    {Object.keys(KENYA_LOCATIONS).map(county => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="city"
                    placeholder="City / Region"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                )}
              </div>

              <div className="modal-field">
                <label>Postal Code / ZIP</label>
                <input
                  type="text"
                  name="postalCode"
                  placeholder="00100"
                  value={formData.postalCode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="modal-field">
              <label>Delivery Instructions (Gate code, landmarks, etc.)</label>
              <textarea
                name="instructions"
                rows={2}
                placeholder="e.g. Leave with security guard at Gate 2"
                value={formData.instructions}
                onChange={handleChange}
              />
            </div>

            <label className="checkbox-custom-label">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
              />
              <span>Set as primary default shipping address</span>
            </label>

            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-order-primary"
              >
                {editingAddressId ? 'Update Address' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      ) : addresses.length === 0 ? (
        <div className="empty-state-luxury">
          <div className="empty-icon-wrap">
            <FaMapMarkerAlt className="empty-icon" />
          </div>
          <h3>No Addresses Saved</h3>
          <p>Add your home or office address to speed up checkout on your future coffee orders.</p>
          <button
            type="button"
            className="btn-order-primary"
            onClick={handleAddNew}
          >
            <FaPlus /> Add Delivery Address
          </button>
        </div>
      ) : (
        <div className="addresses-grid">
          {addresses.map(addr => (
            <div key={addr._id} className={`address-card ${addr.isDefault ? 'default' : ''}`}>
              <div className="address-card-top">
                <div className="address-type-tag">
                  <FaMapMarkerAlt size={12} />
                  <span>{addr.name}</span>
                </div>
                {addr.isDefault && (
                  <span className="default-pill">
                    <FaCheck size={10} /> Default
                  </span>
                )}
              </div>

              <div className="address-card-body">
                <p className="street-text">{addr.street}</p>
                <p className="city-text">{addr.city}, {addr.postalCode}</p>
                <p className="country-text">{addr.country}</p>
                {addr.instructions && (
                  <p className="instructions-text">
                    <FaInfoCircle size={10} /> {addr.instructions}
                  </p>
                )}
              </div>

              <div className="address-card-footer">
                <div className="footer-left">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      className="addr-btn-text"
                      onClick={() => handleSetDefault(addr._id)}
                    >
                      Make Default
                    </button>
                  )}
                </div>
                <div className="footer-right">
                  <button
                    type="button"
                    className="addr-icon-btn"
                    onClick={() => handleEdit(addr)}
                    title="Edit Address"
                  >
                    <FaEdit />
                  </button>
                  <button
                    type="button"
                    className="addr-icon-btn delete"
                    onClick={() => handleDelete(addr)}
                    title="Delete Address"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscription Conflict Modal (Story 4) */}
      {conflictModal && (
        <div className="dashboard-modal-backdrop">
          <div className="dashboard-modal-window">
            <div className="modal-header-danger">
              <FaExclamationTriangle />
              <h3>Address Linked to Active Subscription</h3>
            </div>
            <p className="modal-subtext">
              {conflictModal.message}
            </p>
            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setConflictModal(null)}
              >
                Keep Address
              </button>
              <button
                type="button"
                className="btn-modal-confirm-danger"
                onClick={() => handleDelete(conflictModal.address, true)}
              >
                Force Delete Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressesTab;
