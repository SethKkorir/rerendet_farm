// client/src/components/Account/AddressesTab.jsx — Multi-Address Delivery Manager
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { 
  FaMapMarkerAlt, 
  FaPlus, 
  FaCheck, 
  FaPhone, 
  FaGlobe, 
  FaUserAlt, 
  FaEdit, 
  FaTrash, 
  FaHome, 
  FaBuilding, 
  FaStar 
} from 'react-icons/fa';
import { KENYA_LOCATIONS } from '../../utils/kenyaLocations';
import { COUNTRY_OBJECTS, fetchGlobalCountries, getDialCode, getFlag } from '../../utils/countryList';
import { 
  getUserAddresses, 
  addAddress, 
  updateAddress, 
  deleteAddress, 
  setDefaultAddress 
} from '../../api/api';

const QUICK_LABELS = ['Home', 'Office', 'Apartment', 'Farm', 'Other'];

const emptyForm = (user) => ({
  label: 'Home',
  recipientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
  phone: user?.phone || '',
  address: '',
  city: '',
  county: '',
  town: '',
  country: 'Kenya',
  landmark: '',
  zip: '',
  isDefault: false
});

const AddressesTab = () => {
  const { user, updateUserAddresses, showSuccess, showError } = useContext(AppContext);
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null); // null = creating new
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState(() => emptyForm(user));
  const [availableTowns, setAvailableTowns] = useState([]);
  const [allCountries, setAllCountries] = useState(COUNTRY_OBJECTS);
  const [subdivisions, setSubdivisions] = useState(Object.keys(KENYA_LOCATIONS).sort());
  const [subdivisionType, setSubdivisionType] = useState('County');

  // Keep addresses in sync with context user
  useEffect(() => {
    if (user?.addresses) {
      setAddresses(user.addresses);
    }
  }, [user?.addresses]);

  // Initial fetch from backend on mount (ensures fresh data & any lazy migration)
  useEffect(() => {
    let isMounted = true;
    getUserAddresses()
      .then(res => {
        if (isMounted && res.data?.data) {
          setAddresses(res.data.data);
          updateUserAddresses?.(res.data.data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [updateUserAddresses]);

  // Fetch verified countries from location API
  useEffect(() => {
    let isMounted = true;
    fetchGlobalCountries().then(list => {
      if (isMounted && Array.isArray(list) && list.length > 0) {
        setAllCountries(list);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Sync subdivisions (counties/states/provinces) based on country
  useEffect(() => {
    const countryName = formData.country || 'Kenya';
    if (countryName.toLowerCase() === 'kenya') {
      setSubdivisions(Object.keys(KENYA_LOCATIONS).sort());
      setSubdivisionType('County');
    } else {
      const match = allCountries.find(c => {
        const name = typeof c === 'string' ? c : c.name;
        return name.toLowerCase() === countryName.toLowerCase();
      });
      const countryCode = typeof match === 'object' ? match?.code : null;

      if (countryCode) {
        fetch(`/api/locations/subdivisions/${countryCode}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.hasSubdivisions) {
              setSubdivisions(data.divisions || []);
              setSubdivisionType(data.type || 'State / Province / County');
            } else {
              setSubdivisions([]);
              setSubdivisionType('State / Province / County');
            }
          })
          .catch(() => {
            setSubdivisions([]);
            setSubdivisionType('State / Province / County');
          });
      } else {
        setSubdivisions([]);
        setSubdivisionType('State / Province / County');
      }
    }
  }, [formData.country, allCountries]);

  // Sync available towns based on county
  useEffect(() => {
    if (formData.country === 'Kenya' && formData.county) {
      setAvailableTowns(KENYA_LOCATIONS[formData.county] || []);
    } else {
      setAvailableTowns([]);
    }
  }, [formData.county, formData.country]);

  const handleOpenAdd = () => {
    setEditingAddressId(null);
    setFormData({
      ...emptyForm(user),
      isDefault: addresses.length === 0
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddressId(addr._id);
    setFormData({
      label: addr.label || 'Home',
      recipientName: addr.recipientName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      phone: addr.phone || user?.phone || '',
      address: addr.address || '',
      city: addr.city || '',
      county: addr.county || '',
      town: addr.town || '',
      country: addr.country || 'Kenya',
      landmark: addr.landmark || '',
      zip: addr.zip || '',
      isDefault: Boolean(addr.isDefault)
    });
    setIsEditing(true);
  };

  const handleCloseForm = () => {
    setIsEditing(false);
    setEditingAddressId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const val = type === 'checkbox' ? checked : value;
      const updated = { ...prev, [name]: val };
      if (name === 'country') {
        updated.county = '';
        updated.town = '';
        updated.city = '';
        const dial = getDialCode(value);
        if (!prev.phone || /^\+\d{1,4}\s*$/.test(prev.phone.trim()) || prev.phone.trim() === '+254' || prev.phone.trim() === '+254 ') {
          updated.phone = `${dial} `;
        }
      } else if (name === 'county') {
        updated.town = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.address.trim()) {
      showError?.('Please enter your street / building address');
      return;
    }
    if (formData.country === 'Kenya' && (!formData.county || !formData.town)) {
      showError?.('Please select your County and Area / Town');
      return;
    }
    if (formData.country !== 'Kenya' && !formData.city?.trim()) {
      showError?.('Please enter your City / Town');
      return;
    }

    setSaving(true);
    try {
      let res;
      if (editingAddressId) {
        res = await updateAddress(editingAddressId, formData);
        showSuccess?.('Address updated successfully');
      } else {
        res = await addAddress(formData);
        showSuccess?.('New address added');
      }

      const updatedList = res.data?.data || [];
      setAddresses(updatedList);
      updateUserAddresses?.(updatedList);
      setIsEditing(false);
      setEditingAddressId(null);
    } catch (err) {
      showError?.(err.response?.data?.message || err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Are you sure you want to remove "${label || 'this address'}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteAddress(id);
      const updatedList = res.data?.data || [];
      setAddresses(updatedList);
      updateUserAddresses?.(updatedList);
      showSuccess?.('Address removed');
    } catch (err) {
      showError?.(err.response?.data?.message || 'Failed to delete address');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await setDefaultAddress(id);
      const updatedList = res.data?.data || [];
      setAddresses(updatedList);
      updateUserAddresses?.(updatedList);
      showSuccess?.('Default address updated');
    } catch (err) {
      showError?.(err.response?.data?.message || 'Failed to set default address');
    }
  };

  const getLabelIcon = (label) => {
    const l = (label || '').toLowerCase();
    if (l.includes('office') || l.includes('work')) return <FaBuilding style={{ marginRight: '6px' }} />;
    return <FaHome style={{ marginRight: '6px' }} />;
  };

  return (
    <div className="ord-luxury-canvas">
      {/* ══ Editorial Header ══ */}
      <div className="ord-luxury-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="ord-luxury-tag">DELIVERY LOCATIONS</span>
          <h2 className="ord-luxury-title">Saved Addresses</h2>
          <p className="ord-luxury-sub">
            Manage your delivery destinations. You can save multiple addresses and set a default for seamless checkout.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            className="ord-action-btn solid"
            onClick={handleOpenAdd}
            style={{ alignSelf: 'center' }}
          >
            <FaPlus style={{ marginRight: '6px' }} /> Add New Address
          </button>
        )}
      </div>
      <div className="ord-luxury-h-line" />

      {/* ══ Form View (Add / Edit) ══ */}
      {isEditing ? (
        <div className="ord-clean-card" style={{ marginTop: '1rem' }}>
          <div className="ord-clean-top">
            <div className="ord-clean-meta-left">
              <span className="ord-clean-number">
                {editingAddressId ? 'Edit Address' : 'Add New Address'}
              </span>
            </div>
            <button
              type="button"
              className="ord-clean-cancel-link"
              onClick={handleCloseForm}
            >
              Cancel
            </button>
          </div>

          <div className="ord-clean-divider" />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Quick Label Pills & Custom Label */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.5rem' }}>
                Address Label
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                {QUICK_LABELS.map(lbl => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, label: lbl }))}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: formData.label === lbl ? '1.5px solid #842A1C' : '1px solid #D5D0C8',
                      background: formData.label === lbl ? '#842A1C' : 'transparent',
                      color: formData.label === lbl ? '#FFF' : 'var(--cust-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleChange}
                placeholder="e.g. Home, Nairobi Office, Mom's House"
                className="ord-search-minimal-input"
                style={{ borderRadius: '10px', padding: '0.65rem 1rem', width: '100%', maxWidth: '320px' }}
                required
              />
            </div>

            {/* Recipient Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleChange}
                  placeholder="e.g. Kipchumba Langat"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +254 712 345 678"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                  required
                />
              </div>
            </div>

            {/* Country & Locations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                  Country *
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                >
                  {allCountries.map(c => {
                    const cName = typeof c === 'string' ? c : c.name;
                    const cFlag = typeof c === 'object' && c.flag ? `${c.flag} ` : '';
                    const cDial = typeof c === 'object' && c.dialCode ? ` (${c.dialCode})` : '';
                    return (
                      <option key={cName} value={cName}>
                        {cFlag}{cName}{cDial}
                      </option>
                    );
                  })}
                </select>
              </div>

              {formData.country === 'Kenya' ? (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                      County *
                    </label>
                    <select
                      name="county"
                      value={formData.county}
                      onChange={handleChange}
                      className="ord-search-minimal-input"
                      style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                      required
                    >
                      <option value="">Select County</option>
                      {Object.keys(KENYA_LOCATIONS).sort().map(county => (
                        <option key={county} value={county}>{county}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                      Area / Town *
                    </label>
                    <select
                      name="town"
                      value={formData.town}
                      onChange={handleChange}
                      className="ord-search-minimal-input"
                      style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                      required
                      disabled={!formData.county}
                    >
                      <option value="">{formData.county ? 'Select Area / Town' : 'Select County First'}</option>
                      {availableTowns.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                      {subdivisionType} {subdivisions.length > 0 ? '*' : '(Optional)'}
                    </label>
                    {subdivisions.length > 0 ? (
                      <select
                        name="county"
                        value={formData.county}
                        onChange={handleChange}
                        className="ord-search-minimal-input"
                        style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                      >
                        <option value="">Select {subdivisionType}</option>
                        {subdivisions.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        <option value="Other">Other / Not Listed</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="county"
                        value={formData.county}
                        onChange={handleChange}
                        placeholder={`e.g. State, Province, or County`}
                        className="ord-search-minimal-input"
                        style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                      />
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                      City / Town *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. London, Toronto, Dubai, New York"
                      className="ord-search-minimal-input"
                      style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            {/* Street Address & Postal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                  Specific Address (Building, Flat, Road) *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. Highland Court, Flat 4B, Karen Road"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                  Nearest Landmark (Optional)
                </label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  placeholder="e.g. Near Total Petrol Station / Karen Hospital"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cust-text)', marginBottom: '0.35rem' }}>
                  Postal Code / P.O. Box (Optional)
                </label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="e.g. 00100"
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                />
              </div>
            </div>

            {/* Default Address Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                disabled={addresses.length === 0}
                style={{ width: '18px', height: '18px', accentColor: '#842A1C', cursor: 'pointer' }}
              />
              <label htmlFor="isDefault" style={{ fontSize: '0.85rem', color: 'var(--cust-text)', cursor: 'pointer', margin: 0 }}>
                Set as my default delivery address
              </label>
            </div>

            <div className="ord-clean-divider" />

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="ord-action-btn outline"
                onClick={handleCloseForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ord-action-btn solid"
                disabled={saving}
              >
                {saving ? 'Saving…' : (editingAddressId ? 'Save Changes' : 'Save Address')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ══ Address Cards Grid ══ */
        <div>
          {addresses.length === 0 ? (
            <div className="ord-clean-empty" style={{ marginTop: '1.5rem' }}>
              <h3 className="ord-clean-empty-title">No saved addresses</h3>
              <p className="ord-clean-empty-text">
                Add your delivery locations in Kenya or abroad for quick and hassle-free checkout.
              </p>
              <button
                type="button"
                className="ord-action-btn solid"
                onClick={handleOpenAdd}
              >
                <FaPlus style={{ marginRight: '6px' }} /> Add Your First Address
              </button>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '1.25rem', 
              marginTop: '1.5rem' 
            }}>
              {addresses.map((addr) => (
                <div
                  key={addr._id}
                  className="ord-clean-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: addr.isDefault ? '1.5px solid #842A1C' : '1px solid var(--cust-border, #E5E0D8)',
                    borderRadius: '12px',
                    position: 'relative',
                    transition: 'box-shadow 0.2s ease'
                  }}
                >
                  <div>
                    {/* Card Top: Label & Badges */}
                    <div className="ord-clean-top" style={{ alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div className="ord-clean-meta-left" style={{ alignItems: 'center' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          fontWeight: 700, 
                          fontSize: '0.9rem', 
                          color: 'var(--cust-text)' 
                        }}>
                          {getLabelIcon(addr.label)}
                          {addr.label || 'Home'}
                        </span>
                      </div>

                      <div className="ord-clean-badges-right">
                        {addr.isDefault ? (
                          <span className="ord-clean-status-pill delivered" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FaCheck style={{ fontSize: '0.65rem' }} /> Default
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="ord-clean-divider" style={{ margin: '0.5rem 0 0.85rem' }} />

                    {/* Recipient Details */}
                    <div style={{ marginBottom: '0.85rem' }}>
                      <p style={{ 
                        fontFamily: 'var(--font-body)', 
                        fontSize: '1.05rem', 
                        fontWeight: 600, 
                        color: 'var(--cust-text)', 
                        margin: 0 
                      }}>
                        {addr.recipientName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                      </p>
                      {addr.phone && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--cust-text-muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FaPhone style={{ fontSize: '0.7rem' }} /> {addr.phone}
                        </p>
                      )}
                    </div>

                    {/* Delivery Destination */}
                    <div style={{ fontSize: '0.85rem', color: 'var(--cust-text)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 500 }}>
                        {addr.address}
                      </p>
                      <p style={{ margin: '0 0 4px', color: 'var(--cust-text-muted)' }}>
                        {addr.country === 'Kenya'
                          ? `${addr.town ? addr.town + ', ' : ''}${addr.county ? addr.county + ' County' : ''}`
                          : `${addr.city ? addr.city + ', ' : ''}${addr.county ? addr.county + ' ' : ''}${addr.zip ? '(' + addr.zip + ')' : ''}`}
                      </p>
                      {addr.landmark && (
                        <p style={{ margin: '0 0 4px', fontSize: '0.78rem', color: 'var(--cust-text-dim)' }}>
                          📍 Near: {addr.landmark}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{getFlag(addr.country)}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cust-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {addr.country || 'Kenya'}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: addr.country === 'Kenya' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                          color: addr.country === 'Kenya' ? '#10b981' : '#60a5fa',
                          letterSpacing: '0.5px'
                        }}>
                          {addr.country === 'Kenya' ? 'DOMESTIC' : 'INTERNATIONAL'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Actions */}
                  <div>
                    <div className="ord-clean-divider" style={{ margin: '0.85rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr._id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--cust-text-muted)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline'
                            }}
                          >
                            Set as Default
                          </button>
                        )}
                        {addr.isDefault && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--cust-text-dim)' }}>
                            Primary destination
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="ord-action-btn outline"
                          onClick={() => handleOpenEdit(addr)}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                        >
                          <FaEdit style={{ marginRight: '4px' }} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(addr._id, addr.label)}
                          disabled={deletingId === addr._id}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#B3261E',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.35rem 0.5rem'
                          }}
                        >
                          <FaTrash style={{ fontSize: '0.7rem' }} /> {deletingId === addr._id ? 'Removing…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressesTab;
