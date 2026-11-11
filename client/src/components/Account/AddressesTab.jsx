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
      .catch(() => { });
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
    <div className="ord-luxury-canvas" style={{ padding: 0 }}>
      {/* ══ Editorial Header (Matching Image 1) ══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <span className="rc-dash-eyebrow">— YOUR ACCOUNT</span>
          <h2 className="rc-dash-title">Delivery addresses</h2>
          <p className="rc-dash-sub">Choose where your coffee should arrive.</p>
          <p className="rc-dash-subnote">Your saved delivery details are only visible to you.</p>
        </div>
        {!isEditing && (
          <button
            type="button"
            className="rc-btn-gold"
            onClick={handleOpenAdd}
          >
            <FaPlus style={{ fontSize: '0.8rem' }} /> Add address
          </button>
        )}
      </div>

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
                  value={formData.country || 'Kenya'}
                  onChange={handleChange}
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.65rem 1rem' }}
                >
                  {allCountries.map((c, idx) => {
                    const cName = typeof c === 'string' ? c : c.name;
                    const cCode = typeof c === 'object' ? (c.code || c.name) : c;
                    const cFlag = typeof c === 'object' && c.flag ? `${c.flag} ` : '';
                    const cDial = typeof c === 'object' && c.dialCode ? ` (${c.dialCode})` : '';
                    return (
                      <option key={`${cCode}-${idx}`} value={cName}>
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
        /* ══ Address Cards Grid (Matching Image 1) ══ */
        <div>
          {addresses.length === 0 ? (
            <div className="rc-card-white" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(202, 160, 88, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#CAA058', fontSize: '1.4rem' }}>
                <FaMapMarkerAlt />
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading, "Playfair Display", serif)', fontSize: '1.4rem', color: 'var(--cust-text, #1E140E)', margin: '0 0 0.5rem' }}>No saved addresses yet</h3>
              <p style={{ color: 'var(--cust-text-muted, #665548)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                Add your delivery destination for seamless order fulfillment and swift checkout.
              </p>
              <button
                type="button"
                className="rc-btn-gold"
                onClick={handleOpenAdd}
              >
                <FaPlus style={{ fontSize: '0.8rem' }} /> Add address
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {addresses.map((addr) => (
                <div
                  key={addr._id}
                  className="rc-card-white"
                  style={{
                    padding: '2rem 2.25rem',
                    marginBottom: 0
                  }}
                >
                  {/* Card Header: Icon + Title + Default Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(202, 160, 88, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#B58838',
                        fontSize: '0.85rem'
                      }}>
                        <FaMapMarkerAlt />
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--cust-text, #1E140E)' }}>
                        {addr.isDefault ? 'Primary delivery address' : `${addr.label || 'Saved'} delivery address`}
                      </span>
                    </div>

                    {addr.isDefault && (
                      <span className="rc-badge-default">
                        <FaCheck style={{ fontSize: '0.65rem' }} /> DEFAULT
                      </span>
                    )}
                  </div>

                  {/* Recipient Name in Serif */}
                  <h3 style={{
                    fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)',
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: 'var(--cust-text, #1E140E)',
                    margin: '0 0 0.65rem 0'
                  }}>
                    {addr.recipientName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Valued Customer'}
                  </h3>

                  {/* Address Lines */}
                  <div style={{ color: '#665548', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0 }}>{addr.address}</p>
                    <p style={{ margin: 0 }}>
                      {addr.country === 'Kenya'
                        ? `${addr.town ? addr.town + ', ' : ''}${addr.county ? addr.county : ''}`
                        : `${addr.city ? addr.city + ', ' : ''}${addr.county ? addr.county + ' ' : ''}${addr.zip ? '(' + addr.zip + ')' : ''}`}
                    </p>
                    <p style={{ margin: 0 }}>{addr.country || 'Kenya'}</p>
                    {addr.landmark && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#8E7D70' }}>
                        📍 Near: {addr.landmark}
                      </p>
                    )}
                  </div>

                  {/* Phone & Bottom Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F2ECE3' }}>
                    <span style={{ fontSize: '0.9rem', color: '#665548', fontWeight: 500 }}>
                      {addr.phone || user?.phone || '+254 712 345 678'}
                    </span>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: 'auto' }}>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#B58838',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0.4rem 0.6rem'
                          }}
                        >
                          Set as Default
                        </button>
                      )}
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDelete(addr._id, addr.label)}
                          disabled={deletingId === addr._id}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9C8A7C',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            padding: '0.4rem 0.6rem'
                          }}
                        >
                          {deletingId === addr._id ? 'Removing…' : 'Delete'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rc-btn-white"
                        onClick={() => handleOpenEdit(addr)}
                      >
                        Edit address →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ Delivery Preferences Section (Matching Image 1) ══ */}
          <div style={{ marginTop: '2.5rem' }}>
            <h3 style={{
              fontFamily: 'var(--font-heading, "Playfair Display", Georgia, serif)',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--cust-text, #1E140E)',
              margin: '0 0 0.25rem 0'
            }}>
              Delivery preferences
            </h3>
            <p style={{ color: 'var(--cust-text-muted, #665548)', fontSize: '0.88rem', margin: '0 0 1.25rem 0' }}>
              Small details help every delivery go smoothly.
            </p>

            <div className="rc-card-white" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem 1.5rem', marginBottom: 0 }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(202, 160, 88, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B58838',
                fontSize: '0.9rem',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <FaCheck />
              </div>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--cust-text, #1E140E)', margin: '0 0 0.25rem 0' }}>
                  Private and protected
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--cust-text-muted, #665548)', margin: 0, lineHeight: 1.45 }}>
                  Your address is used only to deliver your Rerendet Coffee orders. You can update it at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressesTab;
