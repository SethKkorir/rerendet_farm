import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaTicketAlt, FaPlus, FaSearch, FaSync,
    FaToggleOn, FaToggleOff, FaTrash, FaEdit,
    FaTimes, FaCalendarAlt, FaPercentage, FaTags, FaPiggyBank, FaChartLine
} from 'react-icons/fa';
import './CouponManagement.css';

const CouponManagement = () => {
    const { token, showNotification } = useContext(AppContext);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [currentCoupon, setCurrentCoupon] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        code: '',
        discountType: 'percentage',
        discountAmount: '',
        expiryDate: '',
        usageLimit: 100,
        minOrderAmount: ''
    });

    useEffect(() => {
        fetchCoupons();
    }, [token]);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/coupons', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCoupons(data.data);
            }
        } catch (error) {
            showNotification('Failed to fetch coupons', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            const res = await fetch(`/api/admin/coupons/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCoupons(prev => prev.map(c => c._id === id ? data.data : c));
                showNotification(data.message, 'success');
            }
        } catch (error) {
            showNotification('Failed to toggle coupon status', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/coupons/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCoupons(prev => prev.filter(c => c._id !== id));
                showNotification(data.message, 'success');
            }
        } catch (error) {
            showNotification('Failed to delete coupon', 'error');
        }
    };

    const openModal = (mode, coupon = null) => {
        setModalMode(mode);
        if (mode === 'edit' && coupon) {
            setCurrentCoupon(coupon);
            setFormData({
                code: coupon.code,
                discountType: coupon.discountType,
                discountAmount: coupon.discountAmount,
                expiryDate: new Date(coupon.expiryDate).toISOString().split('T')[0],
                usageLimit: coupon.usageLimit,
                minOrderAmount: coupon.minOrderAmount
            });
        } else {
            setFormData({
                code: '',
                discountType: 'percentage',
                discountAmount: '',
                expiryDate: '',
                usageLimit: 100,
                minOrderAmount: 0
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = modalMode === 'add' ? '/api/admin/coupons' : `/api/admin/coupons/${currentCoupon._id}`;
            const method = modalMode === 'add' ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                showNotification(data.message, 'success');
                fetchCoupons();
                setShowModal(false);
            } else {
                showNotification(data.message || 'Operation failed', 'error');
            }
        } catch (error) {
            showNotification('An error occurred while saving', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCouponsCount = coupons.filter(c => c.isActive && new Date(c.expiryDate) > new Date()).length;
    const totalUses = coupons.reduce((acc, c) => acc + (c.usedCount || 0), 0);

    return (
        <div className="cp-dashboard">
            {/* ── Stats ── */}
            <div className="cp-stats-row">
                <div className="cp-stat-card">
                    <div className="cp-stat-icon" style={{ background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' }}><FaTicketAlt /></div>
                    <div>
                        <div className="cp-stat-value">{coupons.length}</div>
                        <div className="cp-stat-label">Total Coupons</div>
                    </div>
                </div>
                <div className="cp-stat-card">
                    <div className="cp-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><FaToggleOn /></div>
                    <div>
                        <div className="cp-stat-value">{activeCouponsCount}</div>
                        <div className="cp-stat-label">Active & Valid</div>
                    </div>
                </div>
                <div className="cp-stat-card">
                    <div className="cp-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><FaChartLine /></div>
                    <div>
                        <div className="cp-stat-value">{totalUses}</div>
                        <div className="cp-stat-label">Total Redemptions</div>
                    </div>
                </div>
            </div>

            {/* ── Actions ── */}
            <div className="cp-actions-bar">
                <div className="cp-search-wrap">
                    <FaSearch className="cp-search-icon" />
                    <input
                        type="text"
                        placeholder="Search coupon code..."
                        className="cp-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="cp-action-btn" style={{ height: '42px', width: '42px' }} onClick={fetchCoupons} title="Refresh">
                        <FaSync className={loading ? 'fa-spin' : ''} />
                    </button>
                    <button className="cp-add-btn" onClick={() => openModal('add')}>
                        <FaPlus /> Create New Coupon
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="cp-table-panel">
                <table className="cp-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Discount</th>
                            <th>Limit / Used</th>
                            <th>Min Order</th>
                            <th>Exp. Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan="7" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                            ))
                        ) : filteredCoupons.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No coupons found matching your search.</td></tr>
                        ) : filteredCoupons.map((coupon) => (
                            <tr key={coupon._id}>
                                <td><span className="cp-code-cell">{coupon.code}</span></td>
                                <td>
                                    <span className={`cp-discount-badge ${coupon.discountType}`}>
                                        {coupon.discountType === 'percentage' ? `${coupon.discountAmount}%` : `KES ${coupon.discountAmount}`}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <FaChartLine style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }} />
                                        <strong>{coupon.usedCount || 0}</strong> / {coupon.usageLimit}
                                    </div>
                                </td>
                                <td>KES {coupon.minOrderAmount}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: new Date(coupon.expiryDate) < new Date() ? '#ef4444' : 'inherit' }}>
                                        <FaCalendarAlt style={{ opacity: 0.6 }} />
                                        {new Date(coupon.expiryDate).toLocaleDateString()}
                                    </div>
                                </td>
                                <td>
                                    <button
                                        className={`cp-status-toggle ${coupon.isActive ? 'active' : 'inactive'}`}
                                        onClick={() => handleToggleStatus(coupon._id)}
                                        title={coupon.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                        {coupon.isActive ? <FaToggleOn /> : <FaToggleOff />}
                                    </button>
                                </td>
                                <td>
                                    <div className="cp-table-actions">
                                        <button className="cp-action-btn edit" onClick={() => openModal('edit', coupon)} title="Edit"><FaEdit /></button>
                                        <button className="cp-action-btn delete" onClick={() => handleDelete(coupon._id)} title="Delete"><FaTrash /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Modal ── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="cp-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="cp-modal"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                        >
                            <div className="cp-modal-header">
                                <h2>{modalMode === 'add' ? 'Create New Coupon' : 'Edit Coupon'}</h2>
                                <button className="cp-close-btn" onClick={() => setShowModal(false)}><FaTimes /></button>
                            </div>
                            <form className="cp-modal-body cp-form" onSubmit={handleSubmit}>
                                <div className="cp-form-group full">
                                    <label>Coupon Code (e.g. SUMMER25)</label>
                                    <div style={{ position: 'relative' }}>
                                        <FaTags style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                        <input
                                            type="text"
                                            className="cp-input"
                                            style={{ paddingLeft: '2.5rem' }}
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="cp-form-group">
                                    <label>Discount Type</label>
                                    <select
                                        className="cp-input"
                                        value={formData.discountType}
                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (KES)</option>
                                    </select>
                                </div>

                                <div className="cp-form-group">
                                    <label>Amount</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                                            {formData.discountType === 'percentage' ? <FaPercentage /> : 'KES'}
                                        </div>
                                        <input
                                            type="number"
                                            className="cp-input"
                                            style={{ paddingLeft: '2.5rem' }}
                                            value={formData.discountAmount}
                                            onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="cp-form-group">
                                    <label>Usage Limit</label>
                                    <input
                                        type="number"
                                        className="cp-input"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="100"
                                        required
                                    />
                                </div>

                                <div className="cp-form-group">
                                    <label>Min. Order Amount (KES)</label>
                                    <div style={{ position: 'relative' }}>
                                        <FaPiggyBank style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                        <input
                                            type="number"
                                            className="cp-input"
                                            style={{ paddingLeft: '2.5rem' }}
                                            value={formData.minOrderAmount}
                                            onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="cp-form-group full">
                                    <label>Expiry Date</label>
                                    <div style={{ position: 'relative' }}>
                                        <FaCalendarAlt style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                        <input
                                            type="date"
                                            className="cp-input"
                                            style={{ paddingLeft: '2.5rem' }}
                                            value={formData.expiryDate}
                                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="cp-modal-footer full" style={{ margin: '1rem -1.5rem -1.5rem', width: 'calc(100% + 3rem)' }}>
                                    <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="submit-btn" disabled={saving}>
                                        {saving ? 'Processing...' : modalMode === 'add' ? 'Create Coupon' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CouponManagement;
