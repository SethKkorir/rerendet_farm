// src/components/Admin/Settings.jsx — Premium Full Rewrite
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSave, FaStore, FaCreditCard, FaEnvelope,
  FaShieldAlt, FaBell, FaGlobe, FaTools,
  FaTimes, FaUpload, FaImage, FaFileAlt, FaDownload,
  FaLock, FaUserShield, FaCheck, FaExclamationTriangle,
  FaMoneyBillWave, FaShippingFast, FaTruck,
  FaFacebook, FaInstagram, FaTwitter, FaWhatsapp,
  FaClock, FaInfoCircle, FaEye, FaPencilAlt,
  FaMobileAlt, FaPlug, FaSync, FaTrash,
  FaAward, FaLeaf, FaHistory, FaCalendarAlt,
  FaChevronDown, FaChevronRight,
  FaFileContract, FaChartLine, FaBullhorn,
  FaUser, FaShoppingBag, FaBox, FaUsers, FaChartBar, FaCog, FaSignOutAlt,
  FaArrowLeft, FaTimesCircle, FaCheckCircle,
  FaBolt, FaKey, FaCopy
} from 'react-icons/fa';
import './Settings.css';

// ─── Helpers ────────────────────────────────────────────────────
const wc = (str) => (str || '').trim().split(/\s+/).filter(Boolean).length;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

// ─── Reusable Components ─────────────────────────────────────────

// Section card wrapper
const Section = ({ title, subtitle, icon, children, accent }) => (
  <div className="st-section">
    <div className="st-section-head" style={accent ? { borderLeftColor: accent } : {}}>
      {icon && <span className="st-section-icon" style={accent ? { color: accent } : {}}>{icon}</span>}
      <div>
        <h3 className="st-section-title">{title}</h3>
        {subtitle && <p className="st-section-sub">{subtitle}</p>}
      </div>
    </div>
    <div className="st-section-body">{children}</div>
  </div>
);

// Premium input
const Field = ({ label, hint, required, children }) => (
  <div className="st-field">
    <label className="st-label">{label}{required && <span className="st-req">*</span>}</label>
    {children}
    {hint && <span className="st-hint">{hint}</span>}
  </div>
);

// Premium text input
const Input = ({ label, hint, required, value, onChange, type = 'text', placeholder, ...rest }) => (
  <Field label={label} hint={hint} required={required}>
    <input
      className="st-input"
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  </Field>
);

// iOS-style toggle
const Toggle = ({ checked, onChange, size = 'md' }) => (
  <label className={`st-toggle st-toggle-${size}`}>
    <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
    <span className="st-toggle-track">
      <span className="st-toggle-thumb" />
    </span>
  </label>
);

// Toggle row (label + description on left, toggle on right)
const ToggleRow = ({ label, description, checked, onChange, danger }) => (
  <div className={`st-toggle-row ${danger ? 'danger' : ''}`}>
    <div className="st-toggle-info">
      <strong>{label}</strong>
      {description && <span>{description}</span>}
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

// Payment method card
const PayCard = ({ icon, label, description, checked, onChange }) => (
  <div className={`st-pay-card ${checked ? 'active' : ''}`} onClick={() => onChange(!checked)}>
    <div className="st-pay-top">
      <span className="st-pay-icon">{icon}</span>
      <Toggle checked={checked} onChange={onChange} size="sm" />
    </div>
    <strong>{label}</strong>
    <span>{description}</span>
  </div>
);

// Password strength meter
const PasswordStrength = ({ password }) => {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  if (!password) return null;
  return (
    <div className="st-pw-strength">
      <div className="st-pw-bars">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="st-pw-bar" style={{ background: i <= score ? colors[score] : 'var(--border-main)' }} />
        ))}
      </div>
      <span style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  MAIN SETTINGS
// ═══════════════════════════════════════════════════════════════
const Settings = () => {
  const { showNotification, token, fetchPublicSettings, user, changeUserPassword, deleteAccount, showSuccess, showError, isSuperAdmin } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [settings, setSettings] = useState({});
  const [savedSettings, setSavedSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('store');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [aboutImageFile, setAboutImageFile] = useState(null);
  const [aboutImagePreview, setAboutImagePreview] = useState('');
  const [aboutImageFile2, setAboutImageFile2] = useState(null);
  const [aboutImagePreview2, setAboutImagePreview2] = useState('');
  const [emailTestStatus, setEmailTestStatus] = useState(null); // null | 'testing' | 'ok' | 'fail'
  const [notifyCustomers, setNotifyCustomers] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [twoFactorForm, setTwoFactorForm] = useState({ password: '' });
  const [countySearch, setCountySearch] = useState('');

  // 🛡️ Super Gate States
  const [magicLink, setMagicLink] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Documentation States & Logic
  const [docsList, setDocsList] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (activeTab === 'policies') {
      fetchDocsList();
    }
  }, [activeTab]);

  const fetchDocsList = async () => {
    try {
      setLoadingDocs(true);
      const res = await fetch('/api/admin/documentation', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDocsList(data.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDownloadDoc = async (docName, docLabel) => {
    try {
      const res = await fetch(`/api/admin/documentation/${docName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const blob = new Blob([data.content], { type: 'text/markdown' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = docName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          showNotification(`Downloaded ${docLabel}`, 'success');
          return true;
        }
      }
    } catch (err) {
      showNotification('Failed to download document', 'error');
    }
    return false;
  };

  const handleDownloadAllDocs = async () => {
    if (docsList.length === 0) return;
    showNotification('Starting download of all documents...', 'info');
    for (let i = 0; i < docsList.length; i++) {
      const doc = docsList[i];
      await handleDownloadDoc(doc.name, doc.label);
      await new Promise(r => setTimeout(r, 450));
    }
    showNotification('All documents downloaded successfully!', 'success');
  };

  const handlePreviewDoc = async (doc) => {
    setPreviewDoc(doc);
    setLoadingPreview(true);
    setPreviewContent('');
    try {
      const res = await fetch(`/api/admin/documentation/${doc.name}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPreviewContent(data.content);
        }
      }
    } catch (err) {
      showNotification('Failed to load document content', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const renderMarkdown = (md) => {
    if (!md) return { __html: '' };
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
    html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="md-li">$1</li>');
    html = html.replace(/\n/g, '<br />');

    return { __html: html };
  };

  // 🛡️ Super Gate Logic
  const handleGenerateMagicLink = async () => {
    setGeneratingLink(true);
    try {
      const { default: axios } = await import('axios');
      const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/settings/maintenance/magic-link`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setMagicLink(res.data.data.link);
        showSuccess('Magic Link Generated!');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess('Copied to clipboard!');
  };

  // ── Helpers ──
  const set = (section, field, value) => {
    setSettings(p => ({
      ...p,
      [section]: { ...p[section], [field]: value }
    }));
  };

  const setNested = (section, sub, field, value) => {
    setSettings(p => ({
      ...p,
      [section]: {
        ...p[section],
        [sub]: { ...p[section]?.[sub], [field]: value }
      }
    }));
  };

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  // ── Nav tabs ──
  const TABS = [
    { id: 'store', icon: <FaStore />, label: 'Store Info' },
    { id: 'hours', icon: <FaClock />, label: 'Business Hours' },
    { id: 'payment', icon: <FaCreditCard />, label: 'Payment' },
    { id: 'email', icon: <FaEnvelope />, label: 'Email / SMTP' },
    { id: 'notifications', icon: <FaBell />, label: 'Notifications' },
    { id: 'security', icon: <FaShieldAlt />, label: 'Security' },
    { id: 'seo', icon: <FaGlobe />, label: 'SEO' },
    { id: 'policies', icon: <FaFileAlt />, label: 'Policies' },
    { id: 'about', icon: <FaImage />, label: 'About Section' },
    { id: 'maintenance', icon: <FaTools />, label: 'Maintenance' },
  ];

  const hasUnsaved = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // ── Data fetch ──
  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setSavedSettings(data.data);
        if (data.data.store?.logo) setLogoPreview(data.data.store.logo);
        if (data.data.about?.imageUrl) setAboutImagePreview(data.data.about.imageUrl);
        if (data.data.about?.imageUrl2) setAboutImagePreview2(data.data.about.imageUrl2);
      }
    } catch { showNotification('Failed to load settings', 'error'); }
    finally { setLoading(false); }
  };



  // ── Save ──
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      let updatedSettings = { ...settings };

      if (logoFile) {
        const fd = new FormData(); fd.append('logo', logoFile);
        const r = await fetch('/api/admin/upload/logo', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.store.logo = d.data.url; }
      }
      if (aboutImageFile) {
        const fd = new FormData(); fd.append('logo', aboutImageFile);
        const r = await fetch('/api/admin/upload/logo', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.about = { ...updatedSettings.about, imageUrl: d.data.url }; }
      }
      if (aboutImageFile2) {
        const fd = new FormData(); fd.append('logo', aboutImageFile2);
        const r = await fetch('/api/admin/upload/logo', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.about = { ...updatedSettings.about, imageUrl2: d.data.url }; }
      }
      if (notifyCustomers) updatedSettings.notifyCustomers = true;

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success) {
        showNotification('Settings saved successfully!', 'success');
        setSettings(data.data); setSavedSettings(data.data);
        await fetchPublicSettings();
        setLogoFile(null); setAboutImageFile(null); setAboutImageFile2(null); setNotifyCustomers(false);
      }
    } catch { showNotification('Failed to save settings', 'error'); }
    finally { setSaving(false); }
  };

  // ── File handlers ──
  const handleLogoChange = e => {
    const f = e.target.files[0]; if (!f) return;
    setLogoFile(f);
    const r = new FileReader(); r.onload = e => setLogoPreview(e.target.result); r.readAsDataURL(f);
  };
  const handleAboutImageChange = e => {
    const f = e.target.files[0]; if (!f) return;
    setAboutImageFile(f);
    const r = new FileReader(); r.onload = e => setAboutImagePreview(e.target.result); r.readAsDataURL(f);
  };
  const handleAboutImageChange2 = e => {
    const f = e.target.files[0]; if (!f) return;
    setAboutImageFile2(f);
    const r = new FileReader(); r.onload = e => setAboutImagePreview2(e.target.result); r.readAsDataURL(f);
  };

  // ── Email test ──
  const handleTestEmail = async () => {
    setEmailTestStatus('testing');
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.email)
      });
      const data = await res.json();
      if (res.ok && data.success) { setEmailTestStatus('ok'); showNotification('✅ SMTP connection successful!', 'success'); }
      else throw new Error(data.message);
    } catch (e) { setEmailTestStatus('fail'); showNotification(e.message || 'Connection failed', 'error'); }
    setTimeout(() => setEmailTestStatus(null), 4000);
  };


  // ── Security ──
  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) { showNotification('Passwords do not match', 'error'); return; }
    if (passwordForm.new.length < 8) { showNotification('Minimum 8 characters', 'error'); return; }
    try {
      await changeUserPassword({ currentPassword: passwordForm.current, newPassword: passwordForm.new });
      setActiveModal(null); setPasswordForm({ current: '', new: '', confirm: '' });
      showNotification('Password updated!', 'success');
    } catch { }
  };

  const handleToggle2FA = async () => {
    try {
      const res = await fetch('/api/auth/toggle-2fa', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !user?.twoFactorEnabled, password: twoFactorForm.password })
      });
      const data = await res.json();
      if (data.success) { showNotification(data.message, 'success'); window.location.reload(); }
      else showNotification(data.message || 'Failed', 'error');
    } catch { showNotification('Failed to toggle 2FA', 'error'); }
    setActiveModal(null); setTwoFactorForm({ password: '' });
  };

  const handleDeleteAccount = async () => {
    try { await deleteAccount(); } catch { }
  };

  if (loading) return (
    <div className="settings-loading">
      <div className="loading-spinner" />
      <p>Loading settings…</p>
    </div>
  );

  const s = settings;

  return (
    <div className="settings">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1>System Settings</h1>
          <p className="st-header-sub">Configure your store, email, policies, and more</p>
        </div>
        <div className="st-header-right">
          {hasUnsaved && <span className="st-unsaved-badge">● Unsaved changes</span>}
          <button className="btn-primary" onClick={handleSaveSettings} disabled={saving}>
            {saving ? <><FaSync className="st-spin" /> Saving…</> : <><FaSave /> Save All Settings</>}
          </button>
        </div>
      </div>

      <div className="settings-container">
        {/* ── Sidebar ── */}
        <nav className="settings-sidebar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'maintenance' && s.maintenance?.enabled && (
                <span className="st-tab-badge warning" title="Maintenance mode is ON">!</span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <div className="settings-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="tab-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >

              {/* ════════════════════════════════
                  STORE INFO
               ════════════════════════════════ */}
              {activeTab === 'store' && (
                <>
                  <Section title="Store Details" subtitle="Public-facing store information" icon={<FaStore />} accent="#D4AF37">
                    <div className="st-grid-2">
                      <Input label="Store Name" required value={s.store?.name} onChange={v => set('store', 'name', v)} placeholder="Rerendet Coffee" />
                      <Input label="Store Email" type="email" value={s.store?.email} onChange={v => set('store', 'email', v)} placeholder="info@rerendetcoffee.com" />
                      <Input label="Phone Number" value={s.store?.phone} onChange={v => set('store', 'phone', v)} placeholder="+254700000000" />
                      <Input label="Physical Address" value={s.store?.address} onChange={v => set('store', 'address', v)} placeholder="Nairobi, Kenya" />
                    </div>
                    <Field label="Store Description" hint="Shown in footers and meta tags">
                      <textarea className="st-textarea" rows={3} value={s.store?.description || ''} onChange={e => set('store', 'description', e.target.value)} placeholder="Premium coffee blends roasted to perfection…" />
                    </Field>
                  </Section>

                  <Section title="Store Logo" subtitle="Displayed in the navigation and emails" icon={<FaImage />} accent="#3b82f6">
                    <div className="st-logo-row">
                      <div className="st-logo-box">
                        {logoPreview
                          ? <img src={logoPreview} alt="Logo" />
                          : <div className="st-logo-empty"><FaImage /><span>No logo</span></div>}
                      </div>
                      <div className="st-logo-actions">
                        <p className="st-hint">Recommended: 200×200 PNG with transparent background</p>
                        <input type="file" id="logo-file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                        <label htmlFor="logo-file" className="btn-outline"><FaUpload /> Choose Logo</label>
                        {logoPreview && (
                          <button className="btn-outline danger" onClick={() => { setLogoPreview(''); setLogoFile(null); set('store', 'logo', ''); }}>
                            <FaTimes /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </Section>

                  <Section title="Academy Control" subtitle="Enable or disable the public Coffee Academy page" icon={<FaAward />} accent="#ec4899">
                    <ToggleRow
                      label="Coffee Academy Enabled"
                      description="When enabled, the Coffee Academy link is visible in the navigation and public pages are accessible."
                      checked={s.features?.coffeeAcademy ?? true}
                      onChange={v => set('features', 'coffeeAcademy', v)}
                    />
                  </Section>

                  <Section title="Social Media Links" subtitle="Your official social profiles" icon={<FaGlobe />} accent="#8b5cf6">
                    <div className="st-grid-2">
                      <div className="st-field">
                        <label className="st-label"><FaFacebook style={{ color: '#1877f2' }} /> Facebook</label>
                        <input className="st-input" value={s.seo?.social?.facebook || ''} onChange={e => setNested('seo', 'social', 'facebook', e.target.value)} placeholder="https://facebook.com/rerendetcoffee" />
                      </div>
                      <div className="st-field">
                        <label className="st-label"><FaInstagram style={{ color: '#e1306c' }} /> Instagram</label>
                        <input className="st-input" value={s.seo?.social?.instagram || ''} onChange={e => setNested('seo', 'social', 'instagram', e.target.value)} placeholder="https://instagram.com/rerendetcoffee" />
                      </div>
                      <div className="st-field">
                        <label className="st-label"><FaTwitter style={{ color: '#1da1f2' }} /> Twitter / X</label>
                        <input className="st-input" value={s.seo?.social?.twitter || ''} onChange={e => setNested('seo', 'social', 'twitter', e.target.value)} placeholder="https://twitter.com/rerendetcoffee" />
                      </div>
                      <div className="st-field">
                        <label className="st-label"><FaWhatsapp style={{ color: '#25d366' }} /> WhatsApp</label>
                        <input className="st-input" value={s.seo?.social?.whatsapp || ''} onChange={e => setNested('seo', 'social', 'whatsapp', e.target.value)} placeholder="https://wa.me/254700000000" />
                      </div>
                    </div>
                  </Section>
                </>
              )}

              {/* ════════════════════════════════
                  BUSINESS HOURS
               ════════════════════════════════ */}
              {activeTab === 'hours' && (
                <Section title="Business Hours" subtitle="Set your opening and closing times for each day" icon={<FaClock />} accent="#f59e0b">
                  <div className="st-hours-grid">
                    {DAYS.map(day => {
                      const dayData = s.businessHours?.[day] || {};
                      const closed = dayData.closed ?? (day === 'sunday');
                      return (
                        <div key={day} className={`st-hours-row ${closed ? 'closed' : ''}`}>
                          <div className="st-hours-day">
                            <strong>{DAY_LABELS[day]}</strong>
                            <span className={`st-hours-status ${closed ? 'closed' : 'open'}`}>{closed ? 'Closed' : 'Open'}</span>
                          </div>
                          <div className="st-hours-times">
                            {!closed && (
                              <>
                                <div className="st-time-pair">
                                  <label>Opens</label>
                                  <input type="time" className="st-input st-time-input" value={dayData.open || '08:00'} onChange={e => setNested('businessHours', day, 'open', e.target.value)} />
                                </div>
                                <span className="st-hours-dash">—</span>
                                <div className="st-time-pair">
                                  <label>Closes</label>
                                  <input type="time" className="st-input st-time-input" value={dayData.close || '18:00'} onChange={e => setNested('businessHours', day, 'close', e.target.value)} />
                                </div>
                              </>
                            )}
                            {closed && <span className="st-closed-label">Store closed this day</span>}
                          </div>
                          <Toggle checked={!closed} onChange={val => setNested('businessHours', day, 'closed', !val)} />
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ════════════════════════════════
                  PAYMENT
               ════════════════════════════════ */}
              {activeTab === 'payment' && (
                <>
                  <Section title="Currency & Pricing" subtitle="Configure how prices and taxes are displayed" icon={<FaMoneyBillWave />} accent="#10b981">
                    <div className="st-grid-2">
                      <Field label="Currency">
                        <select className="st-input" value={s.payment?.currency || 'KES'} onChange={e => set('payment', 'currency', e.target.value)}>
                          <option value="KES">🇰🇪 Kenyan Shilling (KES)</option>
                          <option value="USD">🇺🇸 US Dollar (USD)</option>
                          <option value="EUR">🇪🇺 Euro (EUR)</option>
                          <option value="GBP">🇬🇧 British Pound (GBP)</option>
                        </select>
                      </Field>
                      <Input type="number" label="VAT / Tax Rate (%)" hint="e.g. 16 for 16% VAT" value={s.payment?.taxRate !== undefined && s.payment?.taxRate !== null ? (s.payment.taxRate * 100).toFixed(0) : '0'} onChange={v => set('payment', 'taxRate', v === '' ? 0 : parseFloat(v) / 100)} min="0" max="100" />
                      <Input type="number" label="Standard Shipping Fee (KES)" value={s.payment?.shippingPrice !== undefined && s.payment?.shippingPrice !== null ? s.payment.shippingPrice : 500} onChange={v => set('payment', 'shippingPrice', v === '' ? 0 : parseInt(v))} />
                      <Input type="number" label="Free Shipping Above (KES)" hint="Orders above this amount get free shipping" value={s.payment?.freeShippingThreshold !== undefined && s.payment?.freeShippingThreshold !== null ? s.payment.freeShippingThreshold : 5000} onChange={v => set('payment', 'freeShippingThreshold', v === '' ? 0 : parseInt(v))} />
                    </div>
                  </Section>
                  
                  <Section title="County-Level Shipping Rates (Kenya)" subtitle="Configure custom delivery pricing per county. Set to 0 for free delivery." icon={<FaTruck />} accent="#10b981">
                    <div style={{ marginBottom: '1rem' }}>
                      <input 
                        type="text" 
                        className="st-input" 
                        placeholder="🔍 Search counties..." 
                        value={countySearch} 
                        onChange={e => setCountySearch(e.target.value)} 
                        style={{ maxWidth: '400px' }}
                      />
                    </div>
                    
                    <div className="st-county-scroll-grid" style={{ maxHeight: '380px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', paddingRight: '0.5rem', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
                      {(s.countyShipping || [])
                        .filter(item => item.county.toLowerCase().includes(countySearch.toLowerCase()))
                        .map(item => (
                          <div key={item.county} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>{item.county}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="number"
                                className="st-input"
                                style={{ height: '32px', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                value={item.price !== undefined ? item.price : 500}
                                onChange={e => {
                                  const val = e.target.value;
                                  setSettings(prev => {
                                    const updatedList = (prev.countyShipping || []).map(c => 
                                      c.county === item.county ? { ...c, price: val === '' ? 0 : parseInt(val) } : c
                                    );
                                    return { ...prev, countyShipping: updatedList };
                                  });
                                }}
                                min="0"
                              />
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>KES</span>
                            </div>
                          </div>
                        ))
                      }
                      {(s.countyShipping || []).filter(item => item.county.toLowerCase().includes(countySearch.toLowerCase())).length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No matching counties found.
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section title="Payment Methods" subtitle="Enable the payment options customers can use at checkout" icon={<FaCreditCard />} accent="#D4AF37">
                    <div className="st-pay-grid">
                      <PayCard
                        icon={<FaMobileAlt color="#4caf50" />}
                        label="M-Pesa"
                        description="Mobile money via Safaricom"
                        checked={s.payment?.paymentMethods?.mpesa}
                        onChange={v => setNested('payment', 'paymentMethods', 'mpesa', v)}
                      />
                      <PayCard
                        icon={<FaCreditCard color="#1877f2" />}
                        label="Card (Online)"
                        description="Visa, Mastercard, Amex"
                        checked={s.payment?.paymentMethods?.card}
                        onChange={v => setNested('payment', 'paymentMethods', 'card', v)}
                      />
                      <PayCard
                        icon={<FaTruck color="#f59e0b" />}
                        label="Cash on Delivery"
                        description="Pay when order arrives"
                        checked={s.payment?.paymentMethods?.cashOnDelivery}
                        onChange={v => setNested('payment', 'paymentMethods', 'cashOnDelivery', v)}
                      />
                    </div>
                  </Section>
                </>
              )}

              {/* ════════════════════════════════
                  EMAIL / SMTP
               ════════════════════════════════ */}
              {activeTab === 'email' && (
                <>
                  <Section title="SMTP Configuration" subtitle="Configure your outgoing mail server for transactional emails" icon={<FaEnvelope />} accent="#3b82f6">
                    <div className="st-email-status-bar">
                      <ToggleRow
                        label="Email System Enabled"
                        description="All order confirmations and notifications depend on this"
                        checked={s.email?.enabled}
                        onChange={v => set('email', 'enabled', v)}
                      />
                    </div>
                    <div className="st-grid-2" style={{ marginTop: '1.25rem' }}>
                      <Input label="SMTP Host" value={s.email?.host} onChange={v => set('email', 'host', v)} placeholder="smtp.gmail.com" />
                      <Input label="SMTP Port" type="number" value={s.email?.port} onChange={v => set('email', 'port', parseInt(v))} placeholder="587" />
                      <Input label="SMTP Username" type="email" value={s.email?.auth?.user} onChange={v => setNested('email', 'auth', 'user', v)} placeholder="you@gmail.com" />
                      <Input label="SMTP Password" type="password" value={s.email?.auth?.pass} onChange={v => setNested('email', 'auth', 'pass', v)} placeholder="App password" />
                      <Input label="From Address" value={s.email?.from} onChange={v => set('email', 'from', v)} placeholder="Rerendet Coffee <noreply@rerendetcoffee.com>" />
                      <Field label="Encryption">
                        <select className="st-input" value={s.email?.secure ? 'ssl' : 'tls'} onChange={e => set('email', 'secure', e.target.value === 'ssl')}>
                          <option value="tls">STARTTLS (Port 587)</option>
                          <option value="ssl">SSL/TLS (Port 465)</option>
                        </select>
                      </Field>
                    </div>

                    <div className="st-test-row">
                      <button
                        className={`st-test-btn ${emailTestStatus}`}
                        onClick={handleTestEmail}
                        disabled={!s.email?.host || emailTestStatus === 'testing'}
                      >
                        {emailTestStatus === 'testing' ? <><FaSync className="st-spin" /> Testing…</>
                          : emailTestStatus === 'ok' ? <><FaCheck /> Connection OK</>
                            : emailTestStatus === 'fail' ? <><FaTimes /> Connection Failed</>
                              : <><FaPlug /> Test SMTP Connection</>}
                      </button>
                      {!s.email?.host && <span className="st-hint">Enter SMTP Host first</span>}
                    </div>
                  </Section>

                  <Section title="Email Notifications" subtitle="Choose which system events trigger an email to admin" icon={<FaBell />} accent="#8b5cf6">
                    <div className="st-toggle-list">
                      <ToggleRow label="New Order" description="Get an email whenever a new order is placed" checked={s.email?.notifications?.newOrder} onChange={v => setNested('email', 'notifications', 'newOrder', v)} />
                      <ToggleRow label="Order Status Changes" description="When an order status is updated by admin" checked={s.email?.notifications?.orderStatus} onChange={v => setNested('email', 'notifications', 'orderStatus', v)} />
                      <ToggleRow label="Low Stock Alerts" description="Alert when a product goes below stock threshold" checked={s.email?.notifications?.lowStock} onChange={v => setNested('email', 'notifications', 'lowStock', v)} />
                      <ToggleRow label="New User Registration" description="Notify when a new customer creates an account" checked={s.email?.notifications?.newUser} onChange={v => setNested('email', 'notifications', 'newUser', v)} />
                    </div>
                  </Section>
                </>
              )}

              {/* ════════════════════════════════
                  NOTIFICATIONS
               ════════════════════════════════ */}
              {activeTab === 'notifications' && (
                <>
                  <Section title="Admin Notifications" subtitle="In-app and email alerts sent to the admin team" icon={<FaBell />} accent="#f59e0b">
                    <div className="st-toggle-list">
                      <ToggleRow label="New Order" description="Alert when a new order is placed" checked={s.notifications?.admin?.newOrder} onChange={v => setNested('notifications', 'admin', 'newOrder', v)} />
                      <ToggleRow label="Low Stock" description="Alert when product inventory is critically low" checked={s.notifications?.admin?.lowStock} onChange={v => setNested('notifications', 'admin', 'lowStock', v)} />
                      <ToggleRow label="New User Registration" description="Alert when a new customer signs up" checked={s.notifications?.admin?.newUser} onChange={v => setNested('notifications', 'admin', 'newUser', v)} />
                      <ToggleRow label="Contact Form Submission" description="Alert when a customer sends an inquiry" checked={s.notifications?.admin?.contactForm} onChange={v => setNested('notifications', 'admin', 'contactForm', v)} />
                    </div>
                  </Section>

                  <Section title="Customer Notifications" subtitle="Automated emails sent to customers after key events" icon={<FaEnvelope />} accent="#10b981">
                    <div className="st-toggle-list">
                      <ToggleRow label="Order Confirmation" description="Email after placing a new order" checked={s.notifications?.customer?.orderConfirmation} onChange={v => setNested('notifications', 'customer', 'orderConfirmation', v)} />
                      <ToggleRow label="Order Status Updates" description="Email when order is packed, shipped, or delivered" checked={s.notifications?.customer?.orderStatus} onChange={v => setNested('notifications', 'customer', 'orderStatus', v)} />
                      <ToggleRow label="Shipping Notifications" description="Email when tracking number is added" checked={s.notifications?.customer?.shipping} onChange={v => setNested('notifications', 'customer', 'shipping', v)} />
                      <ToggleRow label="Promotional Emails" description="Marketing campaigns and special offers" checked={s.notifications?.customer?.promotions} onChange={v => setNested('notifications', 'customer', 'promotions', v)} />
                    </div>
                  </Section>
                </>
              )}

              {/* ════════════════════════════════
                  SECURITY
               ════════════════════════════════ */}
              {activeTab === 'security' && (
                <>
                  <Section title="My Account Security" subtitle="Manage your personal admin account credentials" icon={<FaShieldAlt />} accent="#ef4444">
                    <div className="st-security-cards">
                      {/* Password */}
                      <div className="st-sec-card">
                        <div className="st-sec-icon" style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--color-primary)' }}>
                          <FaLock />
                        </div>
                        <div className="st-sec-body">
                          <strong>Password</strong>
                          <span>Last changed: {user?.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : 'Never'}</span>
                        </div>
                        <button className="btn-outline" onClick={() => setActiveModal('password')}>
                          <FaPencilAlt /> Change
                        </button>
                      </div>

                      {/* 2FA */}
                      <div className="st-sec-card">
                        <div className="st-sec-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                          <FaUserShield />
                        </div>
                        <div className="st-sec-body">
                          <strong>Two-Factor Authentication</strong>
                          <span>{user?.twoFactorEnabled ? '✅ Your account is protected with 2FA' : 'Add an extra layer of security to your account'}</span>
                        </div>
                        <Toggle checked={user?.twoFactorEnabled || false} onChange={() => setActiveModal('twoFactor')} />
                      </div>

                      {/* Delete */}
                      <div className="st-sec-card danger">
                        <div className="st-sec-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          <FaTrash />
                        </div>
                        <div className="st-sec-body">
                          <strong>Delete Admin Account</strong>
                          <span>Permanently delete this account and all associated data</span>
                        </div>
                        <button className="btn-outline danger" onClick={() => setActiveModal('deleteAccount')}>
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  </Section>

                  <Section title="System Security Policies" subtitle="Enforce security rules for all admin accounts" icon={<FaShieldAlt />} accent="#6b7280">
                    <div className="st-toggle-list">
                      <ToggleRow label="Require 2FA for All Admins" description="All admin users must set up 2FA before logging in" checked={s.security?.require2FA} onChange={v => set('security', 'require2FA', v)} />
                      <ToggleRow label="Require Special Characters in Passwords" description="Passwords must contain at least one special character (!@#$…)" checked={s.security?.passwordRequireSpecial} onChange={v => set('security', 'passwordRequireSpecial', v)} />
                    </div>
                    <div className="st-grid-2" style={{ marginTop: '1.25rem' }}>
                      <Input type="number" label="Session Timeout (hours)" hint="Admins are logged out after this many inactive hours" value={s.security?.sessionTimeout} onChange={v => set('security', 'sessionTimeout', parseInt(v))} min="1" max="168" />
                      <Input type="number" label="Max Login Attempts" hint="Account locks after this many failed attempts" value={s.security?.maxLoginAttempts} onChange={v => set('security', 'maxLoginAttempts', parseInt(v))} min="1" max="10" />
                      <Input type="number" label="Minimum Password Length" hint="Recommended: 10+" value={s.security?.passwordMinLength} onChange={v => set('security', 'passwordMinLength', parseInt(v))} min="6" max="32" />
                    </div>
                  </Section>
                </>
              )}

              {/* ════════════════════════════════
                  SEO
               ════════════════════════════════ */}
              {activeTab === 'seo' && (
                <>
                  {/* Live SERP preview */}
                  <Section title="Live Search Preview" subtitle="How your site appears in Google results" icon={<FaEye />} accent="#3b82f6">
                    <div className="st-serp-card">
                      <div className="st-serp-header">
                        <div className="st-serp-favicon"><FaGlobe /></div>
                        <div>
                          <div className="st-serp-sitename">{s.store?.name || 'Rerendet Coffee'}</div>
                          <div className="st-serp-url">{s.seo?.canonicalUrl || 'https://rerendetcoffee.com'}</div>
                        </div>
                      </div>
                      <div className="st-serp-title">{s.seo?.metaTitle || 'Rerendet Coffee - Premium Coffee Blends'}</div>
                      <div className="st-serp-desc">{s.seo?.metaDescription || 'Enter a meta description below…'}</div>
                      <div className="st-serp-chars">
                        <span style={{ color: (s.seo?.metaTitle?.length || 0) > 60 ? '#ef4444' : '#10b981' }}>
                          Title: {s.seo?.metaTitle?.length || 0}/60
                        </span>
                        <span style={{ color: (s.seo?.metaDescription?.length || 0) > 160 ? '#ef4444' : '#10b981' }}>
                          Description: {s.seo?.metaDescription?.length || 0}/160
                        </span>
                      </div>
                    </div>
                  </Section>

                  <Section title="Basic SEO" subtitle="Meta tags used by search engines" icon={<FaGlobe />} accent="#D4AF37">
                    <div className="st-grid-2">
                      <Input label="Meta Title" hint="Ideal: 50–60 characters" value={s.seo?.metaTitle} onChange={v => set('seo', 'metaTitle', v)} placeholder="Rerendet Coffee - Premium Coffee Blends" maxLength={70} />
                      <Input label="Canonical URL" value={s.seo?.canonicalUrl} onChange={v => set('seo', 'canonicalUrl', v)} placeholder="https://rerendetcoffee.com" />
                    </div>
                    <Field label="Meta Description" hint="Ideal: 150–160 characters">
                      <textarea className="st-textarea" rows={3} value={s.seo?.metaDescription || ''} onChange={e => set('seo', 'metaDescription', e.target.value)} placeholder="Discover our premium coffee blends roasted to perfection…" maxLength={170} />
                    </Field>
                    <Field label="Keywords" hint="Comma-separated — used by some search engines">
                      <input className="st-input" value={s.seo?.keywords || ''} onChange={e => set('seo', 'keywords', e.target.value)} placeholder="coffee, kenya, arabica, beans" />
                    </Field>
                  </Section>

                  <Section title="Analytics & Tracking" subtitle="Connect Google services" icon={<FaChartLine />} accent="#8b5cf6">
                    <div className="st-grid-2">
                      <Input label="Google Analytics ID" value={s.seo?.googleAnalyticsId} onChange={v => set('seo', 'googleAnalyticsId', v)} placeholder="G-XXXXXXXXXX" />
                      <Input label="Google Tag Manager ID" value={s.seo?.googleTagManagerId} onChange={v => set('seo', 'googleTagManagerId', v)} placeholder="GTM-XXXXXX" />
                    </div>
                    <ToggleRow label="Enable Structured Data (JSON-LD)" description="Automatically generates Schema.org Organization + Product markup to help Google understand your content" checked={s.seo?.enableStructuredData} onChange={v => set('seo', 'enableStructuredData', v)} />
                  </Section>
                </>
              )}

              {/* ════════════════════════════════
                  POLICIES
               ════════════════════════════════ */}
              {activeTab === 'policies' && (
                <>
                  <Section title="Privacy Policy" subtitle="Manage how you handle customer data" icon={<FaLock />} accent="#10b981">
                    <Field label="Privacy Policy Content" hint="HTML is supported">
                      <textarea
                        className="st-textarea"
                        rows={10}
                        value={s.policies?.privacyPolicy || ''}
                        onChange={e => set('policies', 'privacyPolicy', e.target.value)}
                        placeholder="Enter your privacy policy HTML..."
                      />
                    </Field>
                  </Section>

                  <Section title="Terms & Conditions" subtitle="The legal agreement between you and your customers" icon={<FaFileContract />} accent="#3b82f6">
                    <Field label="Terms Content" hint="HTML is supported">
                      <textarea
                        className="st-textarea"
                        rows={10}
                        value={s.policies?.termsConditions || ''}
                        onChange={e => set('policies', 'termsConditions', e.target.value)}
                        placeholder="Enter your terms and conditions HTML..."
                      />
                    </Field>
                  </Section>

                  <Section title="Refund Policy" subtitle="Details about returns and exchanges" icon={<FaHistory />} accent="#f59e0b">
                    <Field label="Refund Policy Content" hint="HTML is supported">
                      <textarea
                        className="st-textarea"
                        rows={10}
                        value={s.policies?.refundPolicy || ''}
                        onChange={e => set('policies', 'refundPolicy', e.target.value)}
                        placeholder="Enter your refund policy HTML..."
                      />
                    </Field>
                  </Section>

                  <Section title="Shipping Policy" subtitle="Information about delivery times and methods" icon={<FaStore />} accent="#8b5cf6">
                    <Field label="Shipping Policy Content" hint="HTML is supported">
                      <textarea
                        className="st-textarea"
                        rows={10}
                        value={s.policies?.shippingPolicy || ''}
                        onChange={e => set('policies', 'shippingPolicy', e.target.value)}
                        placeholder="Enter your shipping policy HTML..."
                      />
                    </Field>
                  </Section>

                  <Section title="Policy Update Notifications" subtitle="Alert your customers when policies change" icon={<FaBullhorn />} accent="#ec4899">
                    <div className="st-notify-banner">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={notifyCustomers} onChange={e => setNotifyCustomers(e.target.checked)} />
                        <strong style={{ fontSize: '0.9rem' }}>📢 Notify all customers about policy changes via email</strong>
                      </label>
                      <p className="st-hint" style={{ marginTop: '0.5rem', marginLeft: '1.75rem' }}>
                        When enabled, an update notification will be sent to all registered customers the next time you save settings.
                      </p>
                    </div>
                  </Section>

                  <Section title="System Documentation & Reference Manuals" subtitle="View and download all developer guidelines, legal agreements, and training checklists stored in the database" icon={<FaFileAlt />} accent="#10b981">
                    {docsList.length > 0 && (
                      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleDownloadAllDocs}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}
                        >
                          <FaDownload /> Download All Documents
                        </button>
                      </div>
                    )}
                    <div className="st-docs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                      {loadingDocs ? (
                        <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
                          <FaSync className="st-spin" /> Loading documentation list...
                        </div>
                      ) : docsList.length > 0 ? (
                        docsList.map(doc => (
                          <div key={doc.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <FaFileAlt style={{ color: '#D4AF37', fontSize: '1.1rem' }} />
                              <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}>{doc.label}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.name}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handlePreviewDoc(doc)}
                                style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: '1.1rem', padding: '0.5rem' }}
                                title="Preview Document Inline"
                              >
                                <FaEye />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(doc.name, doc.label)}
                                style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: '1.1rem', padding: '0.5rem' }}
                                title="Download Markdown Document"
                              >
                                <FaDownload />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
                          No documentation files synced to database.
                        </div>
                      )}
                    </div>
                  </Section>
                </>
              )}


              {/* ════════════════════════════════
                  ABOUT SECTION
               ════════════════════════════════ */}
              {activeTab === 'about' && (
                <>
                  <Section title="Brand Story" subtitle="Shown on the About page — tell your story" icon={<FaInfoCircle />} accent="#D4AF37">
                    <Field label="Main Story" hint="2–4 sentences about your origin and mission">
                      <textarea className="st-textarea" rows={4} value={s.about?.story || ''} onChange={e => set('about', 'story', e.target.value)} placeholder="Founded in the highlands of Kenya, Rerendet Farm has been cultivating exceptional coffee for generations…" />
                    </Field>
                    <Field label="Process / Sub-story" hint="Describe your growing and roasting process">
                      <textarea className="st-textarea" rows={4} value={s.about?.subStory || ''} onChange={e => set('about', 'subStory', e.target.value)} placeholder="At elevations of 1,800 meters above sea level, our beans develop slowly…" />
                    </Field>
                  </Section>

                  <Section title="Brand Stats" subtitle="Numbers displayed on the About page hero" icon={<FaAward />} accent="#f59e0b">
                    <div className="st-grid-3">
                      <div className="st-stat-editor">
                        <div className="st-stat-icon-wrap"><FaHistory /></div>
                        <Input type="number" label="Years in Business" value={s.about?.yearsInBusiness || 0} onChange={v => set('about', 'yearsInBusiness', parseInt(v))} min="0" />
                      </div>
                      <div className="st-stat-editor">
                        <div className="st-stat-icon-wrap"><FaLeaf /></div>
                        <Input type="number" label="Organic Percentage (%)" value={s.about?.organicPercentage || 0} onChange={v => set('about', 'organicPercentage', parseInt(v))} min="0" max="100" />
                      </div>
                      <div className="st-stat-editor">
                        <div className="st-stat-icon-wrap"><FaAward /></div>
                        <Input type="number" label="Awards Won" value={s.about?.awardsWon || 0} onChange={v => set('about', 'awardsWon', parseInt(v))} min="0" />
                      </div>
                    </div>
                  </Section>

                  <Section title="Primary About Image" subtitle="Large parallax image shown on the About page" icon={<FaImage />} accent="#3b82f6">
                    <div className="st-about-img-row">
                      <div className="st-about-img-preview">
                        {aboutImagePreview
                          ? <img src={aboutImagePreview} alt="About Primary" />
                          : <div className="st-logo-empty"><FaImage /><span>No image</span></div>}
                      </div>
                      <div className="st-logo-actions">
                        <p className="st-hint">Recommended: 1200×800 landscape JPG/WebP</p>
                        <input type="file" id="about-img-file" accept="image/*" style={{ display: 'none' }} onChange={handleAboutImageChange} />
                        <label htmlFor="about-img-file" className="btn-outline"><FaUpload /> Choose Primary Image</label>
                        {aboutImagePreview && (
                          <button className="btn-outline danger" onClick={() => { setAboutImagePreview(''); setAboutImageFile(null); set('about', 'imageUrl', ''); }}>
                            <FaTimes /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </Section>

                  <Section title="Secondary About Image" subtitle="Overlay image shown in the heritage section" icon={<FaImage />} accent="#8b5cf6">
                    <div className="st-about-img-row">
                      <div className="st-about-img-preview">
                        {aboutImagePreview2
                          ? <img src={aboutImagePreview2} alt="About Secondary" />
                          : <div className="st-logo-empty"><FaImage /><span>No image</span></div>}
                      </div>
                      <div className="st-logo-actions">
                        <p className="st-hint">Recommended: 800×600 landscape/portrait JPG/WebP</p>
                        <input type="file" id="about-img-file-2" accept="image/*" style={{ display: 'none' }} onChange={handleAboutImageChange2} />
                        <label htmlFor="about-img-file-2" className="btn-outline"><FaUpload /> Choose Secondary Image</label>
                        {aboutImagePreview2 && (
                          <button className="btn-outline danger" onClick={() => { setAboutImagePreview2(''); setAboutImageFile2(null); set('about', 'imageUrl2', ''); }}>
                            <FaTimes /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </Section>
                </>
              )}

              {/* ════════════════════════════════
                  MAINTENANCE
               ════════════════════════════════ */}
              {activeTab === 'maintenance' && (
                <Section title="Maintenance Mode" subtitle="Temporarily take your storefront offline for visitors" icon={<FaTools />} accent="#ef4444">
                  <div className="st-maintenance-toggle-row">
                    <div className="st-maintenance-toggle-info">
                      <strong className={s.maintenance?.enabled ? 'red' : ''}>
                        {s.maintenance?.enabled ? '⚠️ Maintenance Mode is ON' : 'Maintenance Mode is OFF'}
                      </strong>
                      <span>
                        {s.maintenance?.enabled
                          ? 'Visitors are currently seeing the maintenance page. Admins can still log in.'
                          : 'Your store is live and accessible to all customers.'}
                      </span>
                    </div>
                    <Toggle checked={s.maintenance?.enabled || false} onChange={v => set('maintenance', 'enabled', v)} />
                  </div>

                  <AnimatePresence>
                    {s.maintenance?.enabled && (
                      <motion.div
                        className="st-maintenance-warning"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <FaExclamationTriangle />
                        <div>
                          <strong>Store is offline</strong>
                          <p>All public pages are showing the maintenance message below. Only logged-in admins can access the dashboard. Make sure to turn this off before announcing the site is live again.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Field label="Custom Maintenance Message" hint="Shown to visitors while maintenance mode is on">
                    <textarea
                      className="st-textarea"
                      rows={5}
                      value={s.maintenance?.message || ''}
                      onChange={e => set('maintenance', 'message', e.target.value)}
                      placeholder="We're brewing something exciting! Our store is temporarily offline for improvements. We'll be back shortly. Thank you for your patience."
                      disabled={!s.maintenance?.enabled}
                    />
                  </Field>

                  {isSuperAdmin && (
                    <div className="st-super-gate-panel" style={{ marginTop: '2.5rem', padding: '30px', background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', gap: '20px' }}>
                        <div>
                          <h4 style={{ color: '#D4AF37', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}><FaKey /> Super Gate Control</h4>
                          <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: '#ADB5BD', maxWidth: '500px' }}>Generate a single-use emergency magic link. Use this to toggle maintenance mode from outside the panel if the dashboard or auth system fails.</p>
                        </div>
                        <button
                          className="btn-outline"
                          onClick={handleGenerateMagicLink}
                          disabled={generatingLink}
                          style={{ borderColor: '#D4AF37', color: '#D4AF37', padding: '12px 25px', borderRadius: '10px', height: 'fit-content' }}
                        >
                          {generatingLink ? <FaSync className="st-spin" /> : <FaBolt />} {magicLink ? 'Regenerate' : 'Generate Link'}
                        </button>
                      </div>

                      {magicLink && (
                        <motion.div
                          className="st-magic-link-box"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px dashed rgba(212, 175, 55, 0.5)', marginBottom: '30px' }}
                        >
                          <code style={{ flex: 1, color: '#D4AF37', fontSize: '0.9rem', wordBreak: 'break-all' }}>{magicLink}</code>
                          <button onClick={() => copyToClipboard(magicLink)} style={{ background: 'rgba(212, 175, 55, 0.1)', border: 'none', color: '#D4AF37', cursor: 'pointer', padding: '10px', borderRadius: '8px' }} title="Copy Link">
                            <FaCopy />
                          </button>
                        </motion.div>
                      )}

                      <div className="st-audit-trail" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '25px' }}>
                        <h5 style={{ margin: '0 0 20px', fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FaHistory style={{ color: '#94a3b8' }} /> Maintenance Audit Trail
                        </h5>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                                <th style={{ padding: '15px', color: '#64748b' }}>Status</th>
                                <th style={{ padding: '15px', color: '#64748b' }}>By Who</th>
                                <th style={{ padding: '15px', color: '#64748b' }}>Source</th>
                                <th style={{ padding: '15px', color: '#64748b' }}>Time (Local)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.maintenance?.history?.slice().reverse().map((entry, idx) => (
                                <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '15px' }}>
                                    <span style={{
                                      padding: '4px 10px',
                                      borderRadius: '99px',
                                      fontSize: '0.7rem',
                                      fontWeight: '800',
                                      background: entry.action === 'enabled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                      color: entry.action === 'enabled' ? '#ef4444' : '#10b981',
                                      textTransform: 'uppercase'
                                    }}>
                                      {entry.action}
                                    </span>
                                  </td>
                                  <td style={{ padding: '15px', color: '#f1f5f9' }}>{entry.actorName || 'Unknown Admin'}</td>
                                  <td style={{ padding: '15px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{entry.source?.toUpperCase() || 'SYSTEM'}</span>
                                  </td>
                                  <td style={{ padding: '15px', color: '#475569' }}>{new Date(entry.timestamp).toLocaleString()}</td>
                                </tr>
                              ))}
                              {(!s.maintenance?.history || s.maintenance.history.length === 0) && (
                                <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#475569' }}>No toggle history available yet.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </Section>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Change Password */}
      <AnimatePresence>
        {activeModal === 'password' && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="modal-header">
                <h3><FaLock /> Change Password</h3>
                <button className="close-btn" onClick={() => setActiveModal(null)}><FaTimes /></button>
              </div>
              <div className="modal-body">
                <Field label="Current Password">
                  <input className="st-input" type="password" value={passwordForm.current} onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} placeholder="Your current password" />
                </Field>
                <Field label="New Password">
                  <input className="st-input" type="password" value={passwordForm.new} onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))} placeholder="At least 8 characters" />
                  <PasswordStrength password={passwordForm.new} />
                </Field>
                <Field label="Confirm New Password">
                  <input
                    className="st-input"
                    type="password"
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                    style={{ borderColor: passwordForm.confirm && passwordForm.new !== passwordForm.confirm ? '#ef4444' : '' }}
                  />
                  {passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
                    <span className="st-hint" style={{ color: '#ef4444' }}>Passwords do not match</span>
                  )}
                </Field>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleChangePassword} disabled={passwordForm.new !== passwordForm.confirm || !passwordForm.current}>
                  <FaSave /> Update Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2FA */}
      <AnimatePresence>
        {activeModal === 'twoFactor' && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="modal-header">
                <h3><FaUserShield /> {user?.twoFactorEnabled ? 'Disable' : 'Enable'} Two-Factor Auth</h3>
                <button className="close-btn" onClick={() => setActiveModal(null)}><FaTimes /></button>
              </div>
              <div className="modal-body">
                <p>{user?.twoFactorEnabled ? 'Disabling 2FA will remove the extra security layer from your account.' : 'Enabling 2FA will require a verification code each time you log in.'} Enter your password to confirm.</p>
                <Field label="Current Password">
                  <input className="st-input" type="password" value={twoFactorForm.password} onChange={e => setTwoFactorForm(p => ({ ...p, password: e.target.value }))} placeholder="Your current password" />
                </Field>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleToggle2FA}>
                  {user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account */}
      <AnimatePresence>
        {activeModal === 'deleteAccount' && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content danger-modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="modal-header">
                <h3 className="text-danger"><FaTrash /> Delete Admin Account</h3>
                <button className="close-btn" onClick={() => setActiveModal(null)}><FaTimes /></button>
              </div>
              <div className="modal-body">
                <div className="st-delete-warning">
                  <FaExclamationTriangle />
                  <div>
                    <strong>This action cannot be undone.</strong>
                    <p>Your admin account, all stored preferences, and access credentials will be permanently deleted. Your store data (orders, products, customers) will not be affected.</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setActiveModal(null)}>Cancel, keep my account</button>
                <button className="btn-danger" onClick={handleDeleteAccount}><FaTrash /> Yes, Delete My Account</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 1100 }}>
            <motion.div className="modal-content doc-preview-modal" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ maxWidth: '850px', width: '95%' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--border-glass, rgba(255,255,255,0.08))', paddingBottom: '15px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaFileAlt /> {previewDoc.label}</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    className="btn-outline"
                    onClick={() => handleDownloadDoc(previewDoc.name, previewDoc.label)}
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                  >
                    <FaDownload /> Download
                  </button>
                  <button className="close-btn" onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#fff' }}><FaTimes /></button>
                </div>
              </div>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '30px 20px', background: '#090d16' }}>
                {loadingPreview ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <div className="loading-spinner" />
                  </div>
                ) : (
                  <div className="document-premium-page">
                    <div className="document-header-logo">
                      <img src={s.store?.logo || "/rerendet-logo.png"} alt="Rerendet Logo" className="doc-logo-large" />
                      <h2 className="doc-logo-title">{s.store?.name || "Rerendet Coffee"}</h2>
                      <div className="doc-logo-subtitle">Official Reference Documentation</div>
                      <div className="doc-divider"></div>
                    </div>
                    <div
                      className="markdown-content"
                      style={{
                        lineHeight: '1.8',
                        fontSize: '15px',
                        color: 'var(--text-1, #E2E8F0)'
                      }}
                      dangerouslySetInnerHTML={renderMarkdown(previewContent)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .document-premium-page {
          background: #ffffff !important;
          color: #1e293b !important;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          font-family: 'Inter', system-ui, sans-serif;
          max-width: 800px;
          margin: 0 auto;
        }
        .document-header-logo {
          text-align: center;
          margin-bottom: 35px;
        }
        .doc-logo-large {
          max-width: 120px;
          height: auto;
          margin: 0 auto 15px;
          display: block;
        }
        .doc-logo-title {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: #5c3e35 !important;
          margin: 0 0 5px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .doc-logo-subtitle {
          font-size: 13px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 600;
        }
        .doc-divider {
          height: 3px;
          background: #D4AF37;
          width: 80px;
          margin: 15px auto 0;
          border-radius: 2px;
        }
        .document-premium-page .markdown-content {
          color: #334155 !important;
        }
        .document-premium-page .markdown-content .code-block {
          background: #f8fafc;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-family: monospace;
          white-space: pre-wrap;
          margin: 15px 0;
          color: #0f172a;
        }
        .document-premium-page .markdown-content code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #dc2626;
        }
        .document-premium-page .markdown-content .md-h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; margin-bottom: 20px; font-size: 24px; color: #0f172a !important; }
        .document-premium-page .markdown-content .md-h2 { margin-top: 25px; margin-bottom: 15px; font-size: 20px; color: #1e293b !important; }
        .document-premium-page .markdown-content .md-h3 { margin-top: 20px; margin-bottom: 10px; font-size: 18px; color: #1e293b !important; }
        .document-premium-page .markdown-content .md-li { margin-left: 20px; list-style-type: square; color: #334155; }
      `}</style>
    </div>
  );
};



export default Settings;