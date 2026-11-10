// client/src/components/Admin/AdsManagement.jsx — Luxury Marketing & Promotions Studio
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaTrash, FaEdit, FaPause, FaPlay, FaImage,
  FaChartLine, FaEye, FaMousePointer, FaCalendarAlt,
  FaTag, FaExternalLinkAlt, FaTimes, FaSearch, FaFilter,
  FaBullhorn, FaCheck, FaFire, FaLayerGroup, FaBolt,
  FaDesktop, FaMobileAlt, FaPercent, FaSync, FaLink
} from 'react-icons/fa';
import './AdsManagement.css';

/* ─── Presets & Configurations ──────────────────────────────── */
const CAMPAIGN_PRESETS = [
  {
    name: 'Harvest Flash Sale (20% Off)',
    icon: '⚡',
    type: 'flash_deal',
    placements: ['homepage-hero', 'products_list'],
    title: 'Seasonal Harvest Drop — 20% Off AA Reserve',
    mediaUrl: '/hero-coffee-pour.png',
    targetUrl: '/coffee-shop',
    content: {
      headline: 'Fresh Arabica Harvest is In',
      subText: 'Enjoy 20% off all single-origin whole bean roasts this week only.',
      ctaText: 'Claim 20% Off'
    },
    priority: 10,
    status: 'Active'
  },
  {
    name: 'Free Farm Delivery Banner',
    icon: '🚚',
    type: 'banner',
    placements: ['cart', 'checkout-banner'],
    title: 'Complimentary Express Delivery on Orders > KES 3,000',
    mediaUrl: '',
    targetUrl: '/checkout',
    content: {
      headline: 'Free Express Farm Delivery',
      subText: 'Add KES 500 more to your cart to unlock free doorstep shipping.',
      ctaText: 'View Cart'
    },
    priority: 5,
    status: 'Active'
  },
  {
    name: 'Raw Forest Honey Spotlight',
    icon: '🍯',
    type: 'featured_product',
    placements: ['homepage', 'products_list'],
    title: 'Pure Forest Raw Honey Harvest Spotlight',
    mediaUrl: '/rerendet-emblem.png',
    targetUrl: '/product/pure-raw-honey',
    content: {
      headline: '100% Raw Forest Acacia Honey',
      subText: 'Naturally harvested from our highland apiaries with enzymes preserved.',
      ctaText: 'Shop Honey'
    },
    priority: 8,
    status: 'Active'
  },
  {
    name: 'Barista Equipment Special',
    icon: '⚙️',
    type: 'sponsored_listing',
    placements: ['search_sidebar', 'category-page'],
    title: 'Artisan Glass Brewers & Micro-Filters',
    mediaUrl: '',
    targetUrl: '/coffee-shop',
    content: {
      headline: 'Elevate Your Morning Ritual',
      subText: 'Premium borosilicate glass brewers designed for single-origin extraction.',
      ctaText: 'Explore Gear'
    },
    priority: 3,
    status: 'Active'
  }
];

const PLACEMENT_OPTIONS = [
  { id: 'homepage-hero', label: 'Homepage Hero', icon: '🌟', hint: 'Top prominent billboard banner' },
  { id: 'homepage', label: 'Homepage Banner', icon: '🏠', hint: 'Secondary mid-page banner' },
  { id: 'products_list', label: 'Products List', icon: '📦', hint: 'In-feed banner between coffee cards' },
  { id: 'cart', label: 'Cart Upsell', icon: '🛒', hint: 'Appears inside checkout drawer' },
  { id: 'checkout-banner', label: 'Checkout Banner', icon: '💳', hint: 'Notice on checkout page' },
  { id: 'dashboard', label: 'Customer Dashboard', icon: '👤', hint: 'Account overview banner' },
  { id: 'search_sidebar', label: 'Search Sidebar', icon: '🔎', hint: 'Shop sidebar spotlight' },
  { id: 'category-page', label: 'Category Page', icon: '🏷️', hint: 'Top of category collection' },
  { id: 'popup-modal', label: 'Popup Modal', icon: '🪟', hint: 'Greeting promotional lightbox' },
];

const AD_FORMATS = [
  { id: 'banner', label: 'Hero Banner', icon: '🖼️', desc: 'Full-width banner with background image' },
  { id: 'flash_deal', label: 'Flash Deal', icon: '⚡', desc: 'Urgent countdown card with discount callout' },
  { id: 'featured_product', label: 'Featured Product', icon: '☕', desc: 'Highlight a specific roast or produce' },
  { id: 'sponsored_listing', label: 'Sponsored Listing', icon: '📌', desc: 'Native product card with sponsored tag' },
  { id: 'popup', label: 'Popup Lightbox', icon: '✨', desc: 'High-converting interactive overlay' },
];

const QUICK_URL_SUGGESTIONS = [
  { label: 'Coffee Shop', url: '/coffee-shop' },
  { label: 'Checkout', url: '/checkout' },
  { label: 'Track Order', url: '/track-order' },
  { label: 'Single-Origin AA', url: '/product/rerendet-aa-arabica' },
];

const AdsManagement = () => {
  const { token, showNotification, showAlert } = useContext(AppContext);
  const notify = (msg, type = 'success') => {
    if (showNotification) showNotification(msg, type);
    else if (showAlert) showAlert(msg, type);
  };

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Paused' | 'Draft'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  const [formData, setFormData] = useState({
    title: '',
    type: 'banner',
    placements: ['homepage-hero'],
    mediaUrl: '',
    targetUrl: '/coffee-shop',
    content: {
      headline: '',
      subText: '',
      ctaText: 'Shop Now'
    },
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 days
    noExpiry: false,
    priority: 5,
    status: 'Active'
  });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const response = await fetch('/api/promotions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAds(data.data || []);
      }
    } catch (error) {
      notify('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'banner',
      placements: ['homepage-hero'],
      mediaUrl: '',
      targetUrl: '/coffee-shop',
      content: { headline: '', subText: '', ctaText: 'Shop Now' },
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      noExpiry: false,
      priority: 5,
      status: 'Active'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      ...preset,
      startDate: prev.startDate,
      endDate: prev.endDate
    }));
    notify(`Applied "${preset.name}" preset!`, 'info');
  };

  const togglePlacement = (placementId) => {
    setFormData(prev => {
      const exists = prev.placements.includes(placementId);
      const next = exists
        ? prev.placements.filter(p => p !== placementId)
        : [...prev.placements, placementId];
      // Ensure at least one placement
      return { ...prev, placements: next.length > 0 ? next : [placementId] };
    });
  };

  const handleEdit = (ad) => {
    setFormData({
      title: ad.title || '',
      type: ad.type || 'banner',
      placements: ad.placements || ['homepage-hero'],
      mediaUrl: ad.mediaUrl || '',
      targetUrl: ad.targetUrl || '',
      content: {
        headline: ad.content?.headline || '',
        subText: ad.content?.subText || '',
        ctaText: ad.content?.ctaText || 'Shop Now'
      },
      startDate: ad.startDate ? new Date(ad.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: ad.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : '',
      noExpiry: Boolean(ad.noExpiry),
      priority: ad.priority ?? 5,
      status: ad.status || 'Active'
    });
    setEditingId(ad._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/promotions/${editingId}` : '/api/promotions';
      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        endDate: formData.noExpiry ? undefined : formData.endDate
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        notify(`Campaign ${editingId ? 'updated' : 'created'} successfully!`, 'success');
        fetchAds(true);
        resetForm();
      } else {
        notify(data.message || 'Error saving campaign', 'error');
      }
    } catch (error) {
      notify('Server Error saving campaign', 'error');
    }
  };

  const handleToggleStatus = async (ad) => {
    const newStatus = ad.status === 'Active' ? 'Paused' : 'Active';
    try {
      const response = await fetch(`/api/promotions/${ad._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        notify(`Campaign ${newStatus.toLowerCase()}!`, 'info');
        setAds(prev => prev.map(a => a._id === ad._id ? { ...a, status: newStatus } : a));
      }
    } catch (error) {
      notify('Error toggling status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this promotion permanently?')) {
      try {
        const response = await fetch(`/api/promotions/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          notify('Campaign deleted', 'success');
          setAds(prev => prev.filter(a => a._id !== id));
        }
      } catch (error) {
        notify('Error deleting campaign', 'error');
      }
    }
  };

  // Safe CTR calculation
  const calculateCTR = (clicks = 0, impressions = 0) => {
    if (!impressions) return '0.00%';
    return ((clicks / impressions) * 100).toFixed(2) + '%';
  };

  // Filtered ads
  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      const matchesSearch = !search.trim() ||
        (ad.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (ad.content?.headline || '').toLowerCase().includes(search.toLowerCase()) ||
        (ad.targetUrl || '').toLowerCase().includes(search.toLowerCase()) ||
        (ad.placements || []).some(p => p.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ads, search, statusFilter]);

  // Aggregate KPI metrics
  const stats = useMemo(() => {
    const total = ads.length;
    const active = ads.filter(a => a.status === 'Active').length;
    const paused = ads.filter(a => a.status === 'Paused').length;
    const draft = ads.filter(a => a.status === 'Draft' || !a.status).length;
    const impressions = ads.reduce((sum, a) => sum + (a.metrics?.impressions || 0), 0);
    const clicks = ads.reduce((sum, a) => sum + (a.metrics?.clicks || 0), 0);
    const avgCtr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
    return { total, active, paused, draft, impressions, clicks, avgCtr };
  }, [ads]);

  return (
    <div className="ads-management-root">
      {/* ── Studio Header ── */}
      <div className="adm-header">
        <div className="adm-header-left">
          <h1 className="adm-title">Promotions &amp; Ads Studio</h1>
          <p className="adm-subtitle">
            Deploy native billboard hero banners, flash sale cards, cart upsells, and discount popups.
          </p>
        </div>
        <div className="adm-header-actions">
          <button
            type="button"
            className="adm-btn-refresh"
            title="Refresh campaigns"
            onClick={() => fetchAds(true)}
            disabled={refreshing}
          >
            <FaSync className={refreshing ? 'spin' : ''} />
          </button>
          <button
            type="button"
            className={`adm-btn-primary ${showForm ? 'cancel' : ''}`}
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
          >
            {showForm ? <><FaTimes /> Close Studio</> : <><FaPlus /> Create Campaign</>}
          </button>
        </div>
      </div>

      {/* ── KPI Executive Metric Cards ── */}
      <div className="adm-kpi-grid">
        <div className="adm-kpi-card">
          <div className="adm-kpi-header">
            <span className="adm-kpi-label">Active Campaigns</span>
            <span className="adm-kpi-pulse-dot" />
          </div>
          <div className="adm-kpi-value gold">{stats.active} <span className="adm-kpi-sub">/ {stats.total} total</span></div>
          <div className="adm-kpi-footer">
            <span>{stats.paused} Paused</span>
            <span>•</span>
            <span>{stats.draft} Draft</span>
          </div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-header">
            <span className="adm-kpi-label">Total Impressions</span>
            <FaEye className="adm-kpi-icon" />
          </div>
          <div className="adm-kpi-value">{stats.impressions.toLocaleString()}</div>
          <div className="adm-kpi-footer text-muted">Views delivered across all zones</div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-header">
            <span className="adm-kpi-label">Customer Clicks</span>
            <FaMousePointer className="adm-kpi-icon" />
          </div>
          <div className="adm-kpi-value">{stats.clicks.toLocaleString()}</div>
          <div className="adm-kpi-footer text-muted">Direct traffic to targeted pages</div>
        </div>

        <div className="adm-kpi-card">
          <div className="adm-kpi-header">
            <span className="adm-kpi-label">Average CTR</span>
            <FaChartLine className="adm-kpi-icon" />
          </div>
          <div className="adm-kpi-value green">{stats.avgCtr}%</div>
          <div className="adm-kpi-footer">
            <span className="adm-kpi-badge-pill">
              {parseFloat(stats.avgCtr) >= 2.0 ? '⚡ Strong Conversion' : '• Industry Avg: 1.8%'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Campaign Creation & Split Live Preview Studio ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="adm-studio-card"
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            {/* Studio Top Strip: 1-Click Starter Presets */}
            <div className="adm-presets-bar">
              <span className="adm-presets-label">⚡ 1-Click Campaign Presets:</span>
              <div className="adm-presets-chips">
                {CAMPAIGN_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="adm-preset-btn"
                    onClick={() => applyPreset(preset)}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Split Screen Container */}
            <div className="adm-studio-grid">
              {/* LEFT: Builder Form */}
              <form className="adm-form" onSubmit={handleSubmit}>
                <div className="adm-form-header">
                  <h3>{editingId ? 'Edit Campaign Configuration' : 'Create New Campaign'}</h3>
                  <span className="adm-form-id">{editingId ? `ID: ${editingId}` : 'Drafting'}</span>
                </div>

                {/* Internal Title */}
                <div className="adm-form-group">
                  <label>Campaign Title (Internal)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Q4 Black Friday Harvest Drop"
                    required
                  />
                  <span className="adm-input-hint">For your admin reference; not shown to customers.</span>
                </div>

                {/* Ad Format Selector */}
                <div className="adm-form-group">
                  <label>Ad Format</label>
                  <div className="adm-format-grid">
                    {AD_FORMATS.map(fmt => (
                      <button
                        key={fmt.id}
                        type="button"
                        className={`adm-format-card ${formData.type === fmt.id ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, type: fmt.id })}
                      >
                        <span className="adm-format-icon">{fmt.icon}</span>
                        <div className="adm-format-info">
                          <strong>{fmt.label}</strong>
                          <small>{fmt.desc}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Placement Chip Multi-Picker */}
                <div className="adm-form-group">
                  <label>Target Placements (Click to toggle zones)</label>
                  <div className="adm-placements-wrap">
                    {PLACEMENT_OPTIONS.map(pl => {
                      const isSelected = formData.placements.includes(pl.id);
                      return (
                        <button
                          key={pl.id}
                          type="button"
                          className={`adm-placement-chip ${isSelected ? 'active' : ''}`}
                          onClick={() => togglePlacement(pl.id)}
                          title={pl.hint}
                        >
                          <span className="adm-pl-icon">{pl.icon}</span>
                          <span>{pl.label}</span>
                          {isSelected && <FaCheck className="adm-pl-check" />}
                        </button>
                      );
                    })}
                  </div>
                  <span className="adm-input-hint">Active in: {formData.placements.join(', ')}</span>
                </div>

                {/* Creative Copy: Headline, Subtext, CTA */}
                <div className="adm-form-row-2">
                  <div className="adm-form-group">
                    <label>Display Headline</label>
                    <input
                      type="text"
                      value={formData.content.headline}
                      onChange={e => setFormData({
                        ...formData,
                        content: { ...formData.content, headline: e.target.value }
                      })}
                      placeholder="e.g. 20% Off AA Arabica Reserve"
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label>CTA Button Text</label>
                    <input
                      type="text"
                      value={formData.content.ctaText}
                      onChange={e => setFormData({
                        ...formData,
                        content: { ...formData.content, ctaText: e.target.value }
                      })}
                      placeholder="e.g. Shop Now, Claim Offer"
                      required
                    />
                  </div>
                </div>

                <div className="adm-form-group">
                  <label>Display Subtext / Offer Terms</label>
                  <textarea
                    rows={2}
                    value={formData.content.subText}
                    onChange={e => setFormData({
                      ...formData,
                      content: { ...formData.content, subText: e.target.value }
                    })}
                    placeholder="Short description, discount code, or eligibility notes..."
                  />
                </div>

                {/* Media Image URL */}
                <div className="adm-form-group">
                  <label>Media / Background Image URL</label>
                  <div className="adm-input-icon-wrap">
                    <FaImage className="adm-input-left-icon" />
                    <input
                      type="text"
                      value={formData.mediaUrl}
                      onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })}
                      placeholder="https://... or /hero-coffee-pour.png"
                    />
                  </div>
                  <div className="adm-image-preset-chips">
                    <span className="adm-presets-label">Quick Images:</span>
                    <button type="button" onClick={() => setFormData({ ...formData, mediaUrl: '/hero-coffee-pour.png' })}>
                      ☕ Coffee Pour
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, mediaUrl: '/hero-product.png' })}>
                      📦 Product Bag
                    </button>
                    <button type="button" onClick={() => setFormData({ ...formData, mediaUrl: '/rerendet-emblem.png' })}>
                      🛡️ Farm Emblem
                    </button>
                    {formData.mediaUrl && (
                      <button type="button" className="clear" onClick={() => setFormData({ ...formData, mediaUrl: '' })}>
                        ✕ Clear Image
                      </button>
                    )}
                  </div>
                </div>

                {/* Target URL Destination */}
                <div className="adm-form-group">
                  <label>Destination Target URL (Where clicks lead)</label>
                  <div className="adm-input-icon-wrap">
                    <FaLink className="adm-input-left-icon" />
                    <input
                      type="text"
                      value={formData.targetUrl}
                      onChange={e => setFormData({ ...formData, targetUrl: e.target.value })}
                      placeholder="/coffee-shop or /checkout"
                      required
                    />
                  </div>
                  <div className="adm-image-preset-chips">
                    <span className="adm-presets-label">Quick Links:</span>
                    {QUICK_URL_SUGGESTIONS.map(s => (
                      <button key={s.url} type="button" onClick={() => setFormData({ ...formData, targetUrl: s.url })}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates & Schedule */}
                <div className="adm-form-row-2">
                  <div className="adm-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="adm-form-group">
                    <label>
                      End Date
                      <span className="adm-checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.noExpiry}
                          onChange={e => setFormData({ ...formData, noExpiry: e.target.checked })}
                        />
                        Never Expire
                      </span>
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      disabled={formData.noExpiry}
                      required={!formData.noExpiry}
                    />
                  </div>
                </div>

                {/* Priority Weight & Status */}
                <div className="adm-form-row-2">
                  <div className="adm-form-group">
                    <label>Priority Rank (1-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    />
                    <span className="adm-input-hint">Higher priority wins placement over lower rank.</span>
                  </div>
                  <div className="adm-form-group">
                    <label>Initial Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">🟢 Active (Live Immediately)</option>
                      <option value="Paused">🟡 Paused (On Hold)</option>
                      <option value="Draft">⚪ Draft (Hidden)</option>
                    </select>
                  </div>
                </div>

                {/* Form Footer */}
                <div className="adm-form-actions">
                  <button type="button" className="adm-btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="adm-btn-primary">
                    <FaCheck /> {editingId ? 'Update Campaign' : 'Publish Campaign'}
                  </button>
                </div>
              </form>

              {/* RIGHT: Live Interactive Preview */}
              <div className="adm-preview-column">
                <div className="adm-preview-header">
                  <div className="adm-preview-title">
                    <FaEye /> Live Storefront Preview
                  </div>
                  <div className="adm-device-toggle">
                    <button
                      type="button"
                      className={previewDevice === 'desktop' ? 'active' : ''}
                      onClick={() => setPreviewDevice('desktop')}
                      title="Desktop Preview"
                    >
                      <FaDesktop />
                    </button>
                    <button
                      type="button"
                      className={previewDevice === 'mobile' ? 'active' : ''}
                      onClick={() => setPreviewDevice('mobile')}
                      title="Mobile Preview"
                    >
                      <FaMobileAlt />
                    </button>
                  </div>
                </div>

                <div className={`adm-preview-stage ${previewDevice}`}>
                  <div className="adm-preview-viewport">
                    {/* Rendered Live Banner */}
                    <div
                      className={`adm-live-banner format-${formData.type}`}
                      style={{
                        backgroundImage: formData.mediaUrl
                          ? `linear-gradient(rgba(18, 14, 11, 0.72), rgba(18, 14, 11, 0.88)), url(${formData.mediaUrl})`
                          : 'linear-gradient(135deg, #2b1a10 0%, #150d08 100%)'
                      }}
                    >
                      <div className="adm-live-badge-row">
                        <span className="adm-live-sponsored-tag">
                          {formData.type === 'flash_deal' ? '⚡ FLASH DEAL' : 'SPONSORED PROMO'}
                        </span>
                        <span className="adm-live-zones-pill">
                          {formData.placements[0] || 'Storefront'}
                        </span>
                      </div>

                      <div className="adm-live-content">
                        <h4 className="adm-live-headline">
                          {formData.content.headline || formData.title || 'Your Eye-Catching Headline Here'}
                        </h4>
                        <p className="adm-live-subtext">
                          {formData.content.subText || 'Enter a persuasive offer, discount, or promotional announcement.'}
                        </p>
                        <div className="adm-live-btn-wrap">
                          <button type="button" className="adm-live-cta-btn">
                            {formData.content.ctaText || 'Shop Now'} &rarr;
                          </button>
                          <span className="adm-live-dest-hint">
                            Dest: <code>{formData.targetUrl || '/'}</code>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Card Style Preview */}
                    <div className="adm-card-preview-mini">
                      <span className="adm-preview-label-tag">Grid In-Feed Card Preview:</span>
                      <div className="adm-live-card-widget">
                        {formData.mediaUrl && (
                          <div className="adm-live-card-thumb">
                            <img src={formData.mediaUrl} alt="Promo" onError={e => e.target.style.display = 'none'} />
                          </div>
                        )}
                        <div className="adm-live-card-details">
                          <div className="adm-live-card-headline">{formData.content.headline || formData.title || 'Headline'}</div>
                          <div className="adm-live-card-sub">{formData.content.subText || 'Promotional text snippet...'}</div>
                          <span className="adm-live-card-cta">{formData.content.ctaText || 'Learn More'} &rarr;</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="adm-preview-footer-note">
                  <span>💡 Displays automatically in real-time across customer sessions in selected zones.</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toolbar: Status Filters, Search & View Mode ── */}
      <div className="adm-toolbar">
        <div className="adm-status-tabs">
          {[
            { id: 'all', label: 'All Campaigns', count: stats.total },
            { id: 'Active', label: '🟢 Active', count: stats.active },
            { id: 'Paused', label: '🟡 Paused', count: stats.paused },
            { id: 'Draft', label: '⚪ Draft', count: stats.draft }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`adm-tab-pill ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="adm-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="adm-toolbar-right">
          <div className="adm-search-wrap">
            <FaSearch className="adm-search-icon" />
            <input
              type="text"
              placeholder="Search campaigns, zones, links..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="adm-search-clear" onClick={() => setSearch('')}>
                <FaTimes />
              </button>
            )}
          </div>

          <div className="adm-view-toggle">
            <button
              type="button"
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              ⊞
            </button>
            <button
              type="button"
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* ── Content View: Grid or Table ── */}
      {loading ? (
        <div className="adm-loading-state">
          <FaSync className="spin" />
          <span>Loading marketing campaigns &amp; analytics…</span>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="adm-empty-state">
          <div className="adm-empty-icon">
            <FaBullhorn />
          </div>
          <h3>{search || statusFilter !== 'all' ? 'No matching campaigns found' : 'No promotional campaigns created yet'}</h3>
          <p>
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search query or status filter.'
              : 'Launch your first seasonal banner, flash deal, or cart upsell to drive storefront sales.'}
          </p>
          {!showForm && (
            <button type="button" className="adm-btn-primary" onClick={() => setShowForm(true)}>
              <FaPlus /> Create Your First Campaign
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ════ GRID CARDS VIEW ════ */
        <div className="adm-cards-grid">
          {filteredAds.map(ad => {
            const impressions = ad.metrics?.impressions || 0;
            const clicks = ad.metrics?.clicks || 0;
            const ctr = calculateCTR(clicks, impressions);
            const isRunning = ad.status === 'Active';

            return (
              <motion.div
                key={ad._id}
                className={`adm-card status-${(ad.status || 'draft').toLowerCase()}`}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {/* Card Banner Image or Pattern */}
                <div
                  className="adm-card-media"
                  style={{
                    backgroundImage: ad.mediaUrl
                      ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url(${ad.mediaUrl})`
                      : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(26,16,10,0.95) 100%)'
                  }}
                >
                  <div className="adm-card-media-top">
                    <span className={`adm-status-pill ${ad.status?.toLowerCase()}`}>
                      <span className="dot" /> {ad.status || 'Draft'}
                    </span>
                    <span className="adm-format-pill">
                      {ad.type?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="adm-card-media-title">
                    <h4>{ad.content?.headline || ad.title}</h4>
                  </div>
                </div>

                {/* Card Body */}
                <div className="adm-card-body">
                  <div className="adm-card-internal-name">
                    <strong>{ad.title}</strong>
                  </div>

                  {ad.content?.subText && (
                    <p className="adm-card-subtext">{ad.content.subText}</p>
                  )}

                  {/* Placements */}
                  <div className="adm-card-placements">
                    {(ad.placements || []).map(p => (
                      <span key={p} className="adm-card-pl-chip">
                        {p}
                      </span>
                    ))}
                  </div>

                  {/* Destination Link */}
                  <div className="adm-card-link-row">
                    <span className="label">Destination:</span>
                    <a
                      href={ad.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adm-card-link"
                    >
                      {ad.targetUrl} <FaExternalLinkAlt />
                    </a>
                  </div>

                  {/* Schedule */}
                  <div className="adm-card-date-row">
                    <FaCalendarAlt className="date-icon" />
                    <span>
                      {new Date(ad.startDate).toLocaleDateString()} — {ad.noExpiry ? 'Forever' : (ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Ongoing')}
                    </span>
                    <span className="priority-tag">P: {ad.priority ?? 0}</span>
                  </div>

                  {/* Metrics Bar */}
                  <div className="adm-card-metrics">
                    <div className="adm-metric-item">
                      <span className="m-label">Views</span>
                      <span className="m-val">{impressions.toLocaleString()}</span>
                    </div>
                    <div className="adm-metric-item">
                      <span className="m-label">Clicks</span>
                      <span className="m-val">{clicks.toLocaleString()}</span>
                    </div>
                    <div className="adm-metric-item">
                      <span className="m-label">CTR</span>
                      <span className="m-val gold">{ctr}</span>
                    </div>
                  </div>

                  {/* Mini CTR Gauge Bar */}
                  <div className="adm-ctr-bar-bg">
                    <div
                      className="adm-ctr-bar-fill"
                      style={{ width: `${Math.min(parseFloat(ctr) * 15, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="adm-card-footer">
                  <button
                    type="button"
                    className={`adm-card-btn toggle ${isRunning ? 'active' : ''}`}
                    onClick={() => handleToggleStatus(ad)}
                    title={isRunning ? 'Pause Campaign' : 'Activate Campaign'}
                  >
                    {isRunning ? <><FaPause /> Pause</> : <><FaPlay /> Activate</>}
                  </button>

                  <div className="adm-card-actions-right">
                    <button
                      type="button"
                      className="adm-card-icon-btn edit"
                      title="Edit Campaign"
                      onClick={() => handleEdit(ad)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      className="adm-card-icon-btn delete"
                      title="Delete Campaign"
                      onClick={() => handleDelete(ad._id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* ════ TABLE VIEW ════ */
        <div className="adm-table-container">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Format &amp; Zones</th>
                <th>Status</th>
                <th>Schedule</th>
                <th>Views &amp; Clicks</th>
                <th>CTR %</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAds.map(ad => {
                const impressions = ad.metrics?.impressions || 0;
                const clicks = ad.metrics?.clicks || 0;
                const ctr = calculateCTR(clicks, impressions);
                const isRunning = ad.status === 'Active';

                return (
                  <tr key={ad._id}>
                    <td>
                      <div className="adm-tbl-campaign">
                        {ad.mediaUrl ? (
                          <img src={ad.mediaUrl} alt={ad.title} className="adm-tbl-thumb" onError={e => e.target.style.display = 'none'} />
                        ) : (
                          <div className="adm-tbl-thumb placeholder">
                            <FaBullhorn />
                          </div>
                        )}
                        <div>
                          <strong>{ad.title}</strong>
                          <div className="adm-tbl-subheadline">{ad.content?.headline || '—'}</div>
                          <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className="adm-tbl-link">
                            {ad.targetUrl} <FaExternalLinkAlt />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="adm-tbl-format-pill">{ad.type?.replace('_', ' ')}</span>
                      <div className="adm-tbl-placements">
                        {(ad.placements || []).slice(0, 2).join(', ')}
                        {(ad.placements?.length || 0) > 2 && ` +${ad.placements.length - 2}`}
                      </div>
                    </td>
                    <td>
                      <span className={`adm-status-pill ${ad.status?.toLowerCase()}`}>
                        <span className="dot" /> {ad.status || 'Draft'}
                      </span>
                    </td>
                    <td className="adm-tbl-dates">
                      <div>{new Date(ad.startDate).toLocaleDateString()}</div>
                      <small className="text-muted">
                        to {ad.noExpiry ? 'Ongoing' : (ad.endDate ? new Date(ad.endDate).toLocaleDateString() : '—')}
                      </small>
                    </td>
                    <td>
                      <div className="adm-tbl-metrics">
                        <span>👁️ {impressions.toLocaleString()}</span>
                        <span>👆 {clicks.toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <strong className="adm-tbl-ctr">{ctr}</strong>
                    </td>
                    <td className="text-right">
                      <div className="adm-tbl-actions">
                        <button
                          type="button"
                          className={`adm-tbl-btn-action toggle ${isRunning ? 'active' : ''}`}
                          onClick={() => handleToggleStatus(ad)}
                          title={isRunning ? 'Pause' : 'Activate'}
                        >
                          {isRunning ? <FaPause /> : <FaPlay />}
                        </button>
                        <button
                          type="button"
                          className="adm-tbl-btn-action edit"
                          onClick={() => handleEdit(ad)}
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="adm-tbl-btn-action delete"
                          onClick={() => handleDelete(ad._id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdsManagement;
