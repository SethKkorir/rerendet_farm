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
  FaBolt, FaKey, FaCopy, FaTag, FaArrowRight, FaArrowDown, FaChevronUp,
  FaFire, FaSnowflake, FaGift, FaMagic,
  FaExternalLinkAlt, FaUndoAlt, FaMugHot, FaShareAlt, FaPlus,
  FaGoogle, FaSearch, FaSitemap,
  FaBold, FaItalic, FaHeading, FaListUl, FaListOl, FaQuoteRight, FaExpand, FaCompress, FaColumns
} from 'react-icons/fa';
import {
  DEFAULT_BREW_METHODS,
  downloadBrewCard,
  getWhatsAppShareUrl,
  getSocialCaption
} from '../../utils/brewCardGenerator';
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
  <label
    className={`st-toggle st-toggle-${size}`}
    onClick={e => e.stopPropagation()}
  >
    <input
      type="checkbox"
      checked={!!checked}
      onChange={e => {
        e.stopPropagation();
        onChange(e.target.checked);
      }}
    />
    <span className="st-toggle-track">
      <span className="st-toggle-thumb" />
    </span>
  </label>
);

// Toggle row (label + description on left, toggle on right)
const ToggleRow = ({ label, description, checked, onChange, danger }) => (
  <div
    className={`st-toggle-row ${danger ? 'danger' : ''}`}
    onClick={(e) => {
      if (e.target.tagName === 'INPUT' || e.target.closest('.st-toggle')) return;
      onChange(!checked);
    }}
  >
    <div className="st-toggle-info">
      <strong>{label}</strong>
      {description && <span>{description}</span>}
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

// Payment method card
const PayCard = ({ icon, label, description, checked, onChange }) => {
  const isChecked = !!checked;
  return (
    <div
      className={`st-pay-card ${isChecked ? 'active' : ''}`}
      onClick={(e) => {
        if (e.target.tagName === 'INPUT' || e.target.closest('.st-toggle')) return;
        onChange(!isChecked);
      }}
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
    >
      <div className="st-pay-top">
        <span className="st-pay-icon">{icon}</span>
        <Toggle checked={isChecked} onChange={v => onChange(v)} size="sm" />
      </div>
      <strong>{label}</strong>
      <span>{description}</span>
    </div>
  );
};

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
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroImagePreview, setHeroImagePreview] = useState('');
  const [heroImageFile2, setHeroImageFile2] = useState(null);
  const [heroImagePreview2, setHeroImagePreview2] = useState('');
  const [heroImageFile3, setHeroImageFile3] = useState(null);
  const [heroImagePreview3, setHeroImagePreview3] = useState('');
  const [aboutImageFile, setAboutImageFile] = useState(null);
  const [aboutImagePreview, setAboutImagePreview] = useState('');
  const [aboutImageFile2, setAboutImageFile2] = useState(null);
  const [aboutImagePreview2, setAboutImagePreview2] = useState('');
  const [emailTestStatus, setEmailTestStatus] = useState(null); // null | 'testing' | 'ok' | 'fail'
  const [notifyCustomers, setNotifyCustomers] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [twoFactorForm, setTwoFactorForm] = useState({ password: '' });
  const [countySearch, setCountySearch] = useState('');

  // 🛡️ Upgraded Emergency Super Gate States
  const [magicLinkData, setMagicLinkData] = useState(null);
  const [showGenerateConfirmModal, setShowGenerateConfirmModal] = useState(false);
  const [generatingEmergencyLink, setGeneratingEmergencyLink] = useState(false);
  const [revokingEmergencyLink, setRevokingEmergencyLink] = useState(false);
  const [emergencyLinksHistory, setEmergencyLinksHistory] = useState([]);
  const [loadingEmergencyHistory, setLoadingEmergencyHistory] = useState(false);
  const [magicLinkTimeLeft, setMagicLinkTimeLeft] = useState(null);

  // ☕ Brewing Guides & Social Card State
  const [activeBrewMethodId, setActiveBrewMethodId] = useState('french-press');
  const [isExportingCard, setIsExportingCard] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // 🔍 Google Search Console States & Handlers
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const [copiedMetaTag, setCopiedMetaTag] = useState(false);
  const [showGscGuide, setShowGscGuide] = useState(false);

  const handleSiteVerificationChange = (val) => {
    let cleanVal = (val || '').trim();
    // If the user pastes full meta tag: <meta name="google-site-verification" content="XYZ" />
    const match = cleanVal.match(/content=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanVal = match[1];
    } else if (cleanVal.startsWith('<meta') || cleanVal.endsWith('/>')) {
      cleanVal = cleanVal.replace(/<[^>]*>/g, '').trim();
    }
    set('seo', 'googleSiteVerification', cleanVal);
  };

  const handleCopySitemap = (url) => {
    navigator.clipboard?.writeText(url);
    setCopiedSitemap(true);
    showAlert('XML Sitemap URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedSitemap(false), 2500);
  };

  const handleCopyMetaTag = (token) => {
    const tag = `<meta name="google-site-verification" content="${token || ''}" />`;
    navigator.clipboard?.writeText(tag);
    setCopiedMetaTag(true);
    showAlert('Google verification meta tag copied to clipboard!', 'success');
    setTimeout(() => setCopiedMetaTag(false), 2500);
  };

  // Documentation States & Logic
  const [docsList, setDocsList] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const fetchEmergencyLinks = async () => {
    if (!token) return;
    try {
      setLoadingEmergencyHistory(true);
      const res = await fetch('/api/admin/maintenance/emergency-links', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setEmergencyLinksHistory(data.data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch emergency links:', err);
    } finally {
      setLoadingEmergencyHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'maintenance' && isSuperAdmin) {
      fetchEmergencyLinks();
    }
  }, [activeTab, isSuperAdmin]);

  useEffect(() => {
    if (!magicLinkData?.expiresAt) {
      setMagicLinkTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const diff = new Date(magicLinkData.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setMagicLinkTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setMagicLinkTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [magicLinkData?.expiresAt]);

  const handleExecuteGenerateEmergencyLink = async () => {
    try {
      setGeneratingEmergencyLink(true);
      const res = await fetch('/api/admin/maintenance/emergency-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setMagicLinkData(data.data);
        setShowGenerateConfirmModal(false);
        showAlert(data.message || 'Emergency Super Gate link generated!', 'success');
        fetchEmergencyLinks();
      } else {
        showAlert(data.message || 'Failed to generate emergency link', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to generate emergency link', 'error');
    } finally {
      setGeneratingEmergencyLink(false);
    }
  };

  const handleRevokeEmergencyLink = async () => {
    if (!window.confirm('Are you sure you want to revoke the active Emergency Super Gate link?')) return;
    try {
      setRevokingEmergencyLink(true);
      const res = await fetch('/api/admin/maintenance/emergency-link/revoke', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Emergency link revoked successfully', 'success');
        setMagicLinkData(null);
        fetchEmergencyLinks();
      } else {
        showAlert(data.message || 'Revocation failed', 'error');
      }
    } catch (err) {
      showAlert('Error revoking emergency link', 'error');
    } finally {
      setRevokingEmergencyLink(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showAlert('Copied to clipboard!', 'success');
  };

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

  const POLICY_ADMIN_TABS = [
    { id: 'shippingPolicy', label: 'Shipping Policy', path: '/shipping-policy', icon: <FaTruck />, color: '#8b5cf6', desc: 'Fulfillment & Express Delivery' },
    { id: 'refundPolicy', label: 'Refund Policy', path: '/refund-policy', icon: <FaHistory />, color: '#f59e0b', desc: 'Satisfaction Guarantee & Returns' },
    { id: 'termsConditions', label: 'Terms & Conditions', path: '/terms-conditions', icon: <FaFileContract />, color: '#3b82f6', desc: 'Storefront Customer Agreement' },
    { id: 'privacyPolicy', label: 'Privacy Policy', path: '/privacy-policy', icon: <FaShieldAlt />, color: '#10b981', desc: 'Personal Data & Security' }
  ];

  const [activePolicySubTab, setActivePolicySubTab] = useState('termsConditions');
  const currentPolicyTabInfo = POLICY_ADMIN_TABS.find(t => t.id === activePolicySubTab) || POLICY_ADMIN_TABS[0];

  // 📜 Policy Writing Studio States & Refs
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyModalView, setPolicyModalView] = useState('split'); // 'split' | 'edit' | 'preview'
  const inlinePolicyRef = useRef(null);
  const modalPolicyRef = useRef(null);

  const applyPolicyFormat = (prefix, suffix = '', defaultText = '', target = 'inline') => {
    const ref = target === 'modal' ? modalPolicyRef.current : inlinePolicyRef.current;
    const currentVal = settings?.policies?.[activePolicySubTab] || '';

    if (!ref) {
      set('policies', activePolicySubTab, currentVal + (currentVal ? '\n' : '') + `${prefix}${defaultText}${suffix}`);
      return;
    }

    const start = ref.selectionStart ?? currentVal.length;
    const end = ref.selectionEnd ?? currentVal.length;
    const selected = currentVal.substring(start, end);

    const insertion = selected ? `${prefix}${selected}${suffix}` : `${prefix}${defaultText}${suffix}`;
    const newVal = currentVal.substring(0, start) + insertion + currentVal.substring(end);
    set('policies', activePolicySubTab, newVal);

    setTimeout(() => {
      ref.focus();
      if (selected) {
        ref.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      } else {
        ref.setSelectionRange(start + prefix.length, start + prefix.length + defaultText.length);
      }
    }, 40);
  };

  const handlePolicyKeyDown = (e, target = 'inline') => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyPolicyFormat('**', '**', 'bold text', target);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyPolicyFormat('*', '*', 'italic text', target);
      }
    }
  };

  const FULL_POLICY_DOC_TEMPLATES = {
    shippingPolicy: `# Full Shipping & Delivery Policy
Effective Date: May 6, 2026

We strive to deliver freshly roasted highland Kenyan coffee quickly, reliably, and sustainably directly to your doorstep.

## 1. Roasting & Dispatch Times
All beans are small-batch roasted upon order confirmation at high elevations in Kenya.
- **Standard Orders**: Hand-roasted and packed within 1–2 business days.
- **Same-Day Queue**: Orders placed before 12:00 PM are scheduled for roasting on the same calendar day.
- **Dispatch Tracking**: As soon as your order leaves our roastery, an automated SMS and email tracking link are dispatched.

## 2. Delivery Methods & Timelines
- **Nairobi Express Courier**: Delivered within 12–24 hours directly to your doorstep or office.
- **Countrywide Regional Hubs**: Delivered within 24–48 hours across all Kenyan counties (Mombasa, Kisumu, Nakuru, Eldoret, Nyeri, etc.).
- **Highland Farm Gate Collection**: Available during normal operating hours.

## 3. Shipping Costs & Free Delivery
Shipping fees are calculated transparently at checkout based on destination county.
- **Free Farm Delivery**: Enjoy 100% complimentary delivery on all coffee orders over **KES 3,500**.

[!] Freshness Guarantee: Whole bean coffee retains peak flavor up to 6 months. Pre-ground coffee should be brewed within 30 days of roast date for optimal crema and aromatics.

## 4. Lost or Damaged Packages
If your coffee package arrives damaged or unsealed, notify us within 48 hours at info@rerendetcoffee.com with a photo of the parcel. We will immediately dispatch a fresh replacement batch at zero extra cost.

## 5. Shipping Inquiries
For dispatch queries or bulk courier coordination, reach our logistics team at **support@rerendetcoffee.com** or WhatsApp **+254 711 245 765**.
`,
    refundPolicy: `# Satisfaction Guarantee & Refund Policy
Effective Date: May 6, 2026

At Rerendet Farm, we are dedicated to the quality and craftsmanship of our single-origin specialty Arabica.

## 1. 30-Day Freshness Guarantee
If your roast profile does not meet your flavor expectations or arrives damaged, we will replace or refund it.
- **Replacements**: We will happily ship an alternative roast profile or fresh replacement batch.
- **Refunds**: If you are unsatisfied with your first order, submit a request within 14 days of delivery.

## 2. Eligible Returns
- Unopened coffee bags with factory roast seals intact.
- Defective or damaged brewing gear and accessories (eligible within 30 days of receipt).

[!] Note: Roasted coffee is a perishable agricultural food product. Unsealed custom-ground beans cannot be restocked for food hygiene reasons, but full replacements or refunds are issued if quality issues occur.

## 3. How Refunds Are Processed
Email **support@rerendetcoffee.com** with your order number. M-Pesa refunds are credited within 24 hours, while card refunds reflect on your bank statement within 3–5 business days.
`,
    termsConditions: `# Storefront Terms & Conditions
Effective Date: May 6, 2026

Welcome to Rerendet Farm. By placing an order through our coffee shop, you agree to these terms.

## 1. Orders & Artisan Roasting
- All prices are quoted in **Kenya Shillings (KES)** inclusive of applicable statutory taxes.
- Because our beans are artisan roasted fresh to order, cancellations or modifications are welcomed within **1 hour** of placement before roasting begins.

## 2. Specialty Standards
- All beans are 100% authentic Kenyan single-origin Arabica, hand-picked and grown at elevations of 1,800m+ ASL.
- Graded and cup-scored according to Specialty Coffee Association (SCA) quality protocols.

[!] Notice: Coffee is a seasonal agricultural crop. Subtle variations in flavor notes (citrus, stone fruit, berries, honey) may naturally occur between seasonal lots.
`,
    privacyPolicy: `# Customer Privacy & Data Protection Policy
Effective Date: May 6, 2026

Rerendet Farm strictly respects your personal privacy and complies with the Kenya Data Protection Act (KDPA).

## 1. Information We Collect
- Customer details: Full name, delivery address, phone number, and email address.
- Order history: Purchased products, grind settings, and roast selections.

## 2. How We Use Your Information
- To safely fulfill and dispatch your orders with trusted couriers.
- To send real-time SMS delivery notifications.
- We **never** sell, rent, or trade your personal information to third-party advertisers.

[!] Security: Payment transactions are processed via PCI-DSS encrypted payment gateways and official Safaricom Daraja API. We never store credit card numbers or M-Pesa PINs on our servers.
`
  };

  const handleInsertFullDocTemplate = () => {
    const tmpl = FULL_POLICY_DOC_TEMPLATES[activePolicySubTab];
    if (!tmpl) return;
    const existing = settings?.policies?.[activePolicySubTab] || '';
    if (existing.trim() && !window.confirm('Replace current document text with the official coffee template?')) {
      return;
    }
    set('policies', activePolicySubTab, tmpl);
    showAlert(`Loaded standard ${currentPolicyTabInfo.label} template!`, 'success');
  };

  const renderInlineMarkdownHelper = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*|\*[^*]+?\*|_[^_]+?_)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const renderPolicyMarkdownPreview = (content) => {
    if (!content || !content.trim()) {
      return (
        <div className="st-preview-placeholder">
          <FaFileAlt style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '0.75rem' }} />
          <p>No custom policy text entered yet.</p>
          <span>Use the formatting toolbar or click "Insert Coffee Template" to start writing.</span>
        </div>
      );
    }

    const lines = content.split('\n');
    const elements = [];
    let listBuffer = [];

    const flushList = () => {
      if (listBuffer.length > 0) {
        elements.push(
          <div key={`list-${elements.length}`} className="st-pm-list-group">
            {listBuffer.map((item, idx) => (
              <div key={idx} className="st-pm-list-item">
                <FaCheckCircle className="st-pm-check-icon" />
                <span>{renderInlineMarkdownHelper(item)}</span>
              </div>
            ))}
          </div>
        );
        listBuffer = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }

      if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(<h2 key={idx} className="st-pm-h1">{trimmed.replace(/^#\s*/, '')}</h2>);
      } else if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(<h3 key={idx} className="st-pm-h2">{trimmed.replace(/^##\s*/, '')}</h3>);
      } else if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(<h4 key={idx} className="st-pm-h3">{trimmed.replace(/^###\s*/, '')}</h4>);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        listBuffer.push(trimmed.replace(/^[-*]\s*/, ''));
      } else if (trimmed.startsWith('[!]')) {
        flushList();
        elements.push(
          <div key={idx} className="st-pm-notice-box">
            <FaExclamationTriangle className="st-pm-notice-icon" />
            <div>
              <strong>Important Notice:</strong> {renderInlineMarkdownHelper(trimmed.replace(/^\[!\]\s*/, ''))}
            </div>
          </div>
        );
      } else if (trimmed.startsWith('>')) {
        flushList();
        elements.push(
          <blockquote key={idx} className="st-pm-blockquote">
            {renderInlineMarkdownHelper(trimmed.replace(/^>\s*/, ''))}
          </blockquote>
        );
      } else {
        flushList();
        elements.push(<p key={idx} className="st-pm-paragraph">{renderInlineMarkdownHelper(trimmed)}</p>);
      }
    });

    flushList();
    return elements;
  };

  const setPolicyDetail = (policyKey, field, value) => {
    setSettings(p => ({
      ...p,
      policies: {
        ...p?.policies,
        details: {
          ...p?.policies?.details,
          [policyKey]: {
            ...p?.policies?.details?.[policyKey],
            [field]: value
          }
        }
      }
    }));
  };

  const DEFAULT_POLICY_TEMPLATES = {
    termsConditions: {
      summary: "There's an update in our terms to ensure the highest standards of artisan roasting and ethical transparency for all customers.",
      faqAnswer: "You are guaranteed authentic 100% single-origin Arabica from high-altitude Kenyan volcanic soils. Orders may be cancelled within 1 hour before custom roasting commences.",
      card1Label: "Quality & Specialty Standards",
      card1Excerpt: "Every bag of Rerendet Coffee is specialty-grade Arabica, nurtured at elevations of 1,800m+ above sea level in Kenya. All beans are small-batch roasted to preserve optimal flavor nuance.",
      card2Label: "Orders, Pricing & Cancellations",
      card2Excerpt: "All prices are quoted in Kenya Shillings (KES). Cancellations are welcomed within 1 hour of order placement before artisan roasting commences."
    },
    shippingPolicy: {
      summary: "There's an update in our delivery terms to ensure your highland coffee arrives fresher and faster across all Kenyan counties.",
      faqAnswer: "Your coffee is custom-roasted and dispatched within 24 hours. Nairobi deliveries arrive within 12-24 hours; countrywide express hubs arrive within 24-48 hours with live SMS tracking.",
      card1Label: "Dispatch & Roasting Schedule",
      card1Excerpt: "All coffee is roasted in dedicated small batches upon order confirmation. Orders placed before 12:00 PM are queued for same-day roasting and handover to express couriers within 24 hours.",
      card2Label: "County Delivery & Live Tracking",
      card2Excerpt: "Direct doorstep and hub delivery across Nairobi and all major counties via vetted courier partners. Real-time tracking is assigned immediately upon parcel dispatch."
    },
    refundPolicy: {
      summary: "We stand behind the craftsmanship of every roast. Review our refund and replacement standards designed for your peace of mind.",
      faqAnswer: "If your coffee arrives damaged, with an incorrect roast profile, or with compromised packaging, let us know within 7 days. We will immediately replace it or refund you via M-Pesa or card.",
      card1Label: "Freshness & Damage Protection",
      card1Excerpt: "Because coffee is a freshly roasted perishable item, standard change-of-mind returns are not permitted once unsealed. However, all transit damages or roasting errors qualify for immediate replacement.",
      card2Label: "Reimbursement & Processing",
      card2Excerpt: "M-Pesa reimbursements are credited directly to your mobile number within 24 to 48 hours. Card refunds reflect on your statement within 3 to 5 business days."
    },
    privacyPolicy: {
      summary: "We treat your personal data with the same care and respect as our hand-picked coffee beans. Transparent, secure, and privacy-first.",
      faqAnswer: "We only collect essential details to fulfill and ship your orders. We never store payment PINs or full card numbers, and we never sell your data to advertisers.",
      card1Label: "Personal Data Collection",
      card1Excerpt: "We collect your delivery address, contact phone, and order preferences exclusively to route couriers and personalize roast profiles. Your data is encrypted and strictly protected.",
      card2Label: "Payment & Transaction Security",
      card2Excerpt: "All transactions are routed through PCI-DSS direct payment gateways and official Safaricom M-Pesa protocols. We never store or log payment credentials on our servers."
    }
  };

  const handleApplyPolicyTemplate = (key) => {
    const tmpl = DEFAULT_POLICY_TEMPLATES[key];
    if (!tmpl) return;
    setSettings(p => ({
      ...p,
      policies: {
        ...p?.policies,
        details: {
          ...p?.policies?.details,
          [key]: {
            ...p?.policies?.details?.[key],
            ...tmpl
          }
        }
      }
    }));
    showAlert('Loaded default coffee policy template!', 'success');
  };

  // ── Nav tabs ──
  const TABS = [
    { id: 'store', icon: <FaStore />, label: 'Store Info' },
    { id: 'hero', icon: <FaBolt />, label: 'Hero / Landing' },
    { id: 'hours', icon: <FaClock />, label: 'Business Hours' },
    { id: 'payment', icon: <FaCreditCard />, label: 'Payment' },
    { id: 'email', icon: <FaEnvelope />, label: 'Email / SMTP' },
    { id: 'notifications', icon: <FaBell />, label: 'Notifications' },
    { id: 'security', icon: <FaShieldAlt />, label: 'Security' },
    { id: 'seo', icon: <FaGlobe />, label: 'SEO' },
    { id: 'policies', icon: <FaFileAlt />, label: 'Policies' },
    { id: 'about', icon: <FaImage />, label: 'About Section' },
    { id: 'brewguides', icon: <FaMugHot />, label: 'Brewing Guides' },
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
        if (data.data.store?.signature) setSignaturePreview(data.data.store.signature);
        if (data.data.hero?.imageUrl) setHeroImagePreview(data.data.hero.imageUrl);
        if (data.data.hero?.imageUrl2) setHeroImagePreview2(data.data.hero.imageUrl2);
        if (data.data.hero?.imageUrl3) setHeroImagePreview3(data.data.hero.imageUrl3);
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
        const fd = new FormData(); fd.append('image', logoFile);
        const r = await fetch('/api/admin/upload/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.store.logo = d.data.url; }
      }
      if (signatureFile) {
        const fd = new FormData(); fd.append('image', signatureFile);
        const r = await fetch('/api/admin/upload/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.store.signature = d.data.url; }
      }
      if (heroImageFile) {
        const fd = new FormData(); fd.append('image', heroImageFile);
        const r = await fetch('/api/admin/upload/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.hero = { ...updatedSettings.hero, imageUrl: d.data.url }; }
      }
      if (heroImageFile2) {
        const fd = new FormData(); fd.append('image', heroImageFile2);
        const r = await fetch('/api/admin/upload/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.hero = { ...updatedSettings.hero, imageUrl2: d.data.url }; }
      }
      if (heroImageFile3) {
        const fd = new FormData(); fd.append('image', heroImageFile3);
        const r = await fetch('/api/admin/upload/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.hero = { ...updatedSettings.hero, imageUrl3: d.data.url }; }
      }
      // Keep images array in sync
      const heroImgs = [
        updatedSettings.hero?.imageUrl,
        updatedSettings.hero?.imageUrl2,
        updatedSettings.hero?.imageUrl3
      ].filter(Boolean);
      updatedSettings.hero = { ...updatedSettings.hero, images: heroImgs };

      if (aboutImageFile) {
        const fd = new FormData(); fd.append('image', aboutImageFile);
        const r = await fetch('/api/admin/upload/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (r.ok) { const d = await r.json(); updatedSettings.about = { ...updatedSettings.about, imageUrl: d.data.url }; }
      }
      if (aboutImageFile2) {
        const fd = new FormData(); fd.append('image', aboutImageFile2);
        const r = await fetch('/api/admin/upload/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
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
        setLogoFile(null); setHeroImageFile(null); setHeroImageFile2(null); setHeroImageFile3(null); setAboutImageFile(null); setAboutImageFile2(null); setNotifyCustomers(false);
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
  const handleHeroImageChange = e => {
    const f = e.target.files[0]; if (!f) return;
    setHeroImageFile(f);
    const r = new FileReader(); r.onload = e => setHeroImagePreview(e.target.result); r.readAsDataURL(f);
  };
  const handleHeroImageChange2 = e => {
    const f = e.target.files[0]; if (!f) return;
    setHeroImageFile2(f);
    const r = new FileReader(); r.onload = e => setHeroImagePreview2(e.target.result); r.readAsDataURL(f);
  };
  const handleHeroImageChange3 = e => {
    const f = e.target.files[0]; if (!f) return;
    setHeroImageFile3(f);
    const r = new FileReader(); r.onload = e => setHeroImagePreview3(e.target.result); r.readAsDataURL(f);
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

  // ── Brew Guide & Social Export Handlers ──
  const currentBrewGuides = (Array.isArray(settings?.about?.brewGuides) && settings.about.brewGuides.length > 0)
    ? settings.about.brewGuides
    : DEFAULT_BREW_METHODS;

  const activeBrewMethod = currentBrewGuides.find(m => m.id === activeBrewMethodId) || currentBrewGuides[0] || DEFAULT_BREW_METHODS[0];

  const updateBrewField = (field, val) => {
    const updated = currentBrewGuides.map(m => m.id === activeBrewMethod.id ? { ...m, [field]: val } : m);
    set('about', 'brewGuides', updated);
  };

  const updateBrewStep = (idx, stepField, val) => {
    const updated = currentBrewGuides.map(m => {
      if (m.id !== activeBrewMethod.id) return m;
      const newSteps = [...(m.steps || [])];
      newSteps[idx] = { ...newSteps[idx], [stepField]: val };
      return { ...m, steps: newSteps };
    });
    set('about', 'brewGuides', updated);
  };

  const addBrewStep = () => {
    const updated = currentBrewGuides.map(m => {
      if (m.id !== activeBrewMethod.id) return m;
      const newSteps = [...(m.steps || []), { title: 'New Step', text: '' }];
      return { ...m, steps: newSteps };
    });
    set('about', 'brewGuides', updated);
  };

  const removeBrewStep = (idx) => {
    const updated = currentBrewGuides.map(m => {
      if (m.id !== activeBrewMethod.id) return m;
      const newSteps = (m.steps || []).filter((_, i) => i !== idx);
      return { ...m, steps: newSteps };
    });
    set('about', 'brewGuides', updated);
  };

  const handleResetMethod = () => {
    const original = DEFAULT_BREW_METHODS.find(d => d.id === activeBrewMethod.id);
    if (!original) return;
    const updated = currentBrewGuides.map(m => m.id === activeBrewMethod.id ? { ...original } : m);
    set('about', 'brewGuides', updated);
    showAlert(`Reset ${original.name} to calibrated default!`, 'info');
  };

  const handleDownloadSocialCard = async () => {
    try {
      setIsExportingCard(true);
      await downloadBrewCard(activeBrewMethod, settings?.store?.name || 'Rerendet Coffee');
      showAlert(`Downloaded ${activeBrewMethod.name} Social Card (PNG)!`, 'success');
    } catch (e) {
      showAlert('Failed to download graphic card.', 'error');
    } finally {
      setIsExportingCard(false);
    }
  };

  const handleShareWhatsApp = () => {
    const url = getWhatsAppShareUrl(activeBrewMethod, settings?.store?.name || 'Rerendet Coffee');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopySocialCaption = async () => {
    try {
      const caption = getSocialCaption(activeBrewMethod, settings?.store?.name || 'Rerendet Coffee');
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      showAlert('Copied formatted Instagram/Facebook recipe caption!', 'success');
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch (e) {
      showAlert('Failed to copy to clipboard', 'error');
    }
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
                      <Input label="General Phone Number" value={s.store?.phone} onChange={v => set('store', 'phone', v)} placeholder="+254 711 245 765" />
                      <Input label="Physical Address" value={s.store?.address} onChange={v => set('store', 'address', v)} placeholder="Nandi & Bomet County, Kenya" />
                    </div>
                    <Field label="Store Description" hint="Shown in footers and meta tags">
                      <textarea className="st-textarea" rows={3} value={s.store?.description || ''} onChange={e => set('store', 'description', e.target.value)} placeholder="Premium coffee blends roasted to perfection…" />
                    </Field>
                  </Section>

                  <Section title="WhatsApp Support & Direct Inquiries" subtitle="Controls WhatsApp buttons, floating chat widget, order confirmation share, and catalog inquiries" icon={<FaWhatsapp />} accent="#25D366">
                    <div className="st-grid-2">
                      <Input 
                        label="WhatsApp Phone Number" 
                        hint="e.g. +254 711 245 765 or 0711245765 (Used across the entire store for customer WhatsApp chat)" 
                        value={s.whatsappSupport?.phoneNumber || s.seo?.social?.whatsapp || ''} 
                        onChange={v => {
                          setNested('whatsappSupport', 'phoneNumber', v);
                          setNested('seo', 'social', 'whatsapp', v);
                        }} 
                        placeholder="+254 711 245 765" 
                      />
                      <Input 
                        label="Default WhatsApp Greeting Message" 
                        hint="Pre-filled text when a visitor opens the floating chat widget" 
                        value={s.whatsappSupport?.message || ''} 
                        onChange={v => setNested('whatsappSupport', 'message', v)} 
                        placeholder="Hi Rerendet Coffee! I am browsing your online store and have a question." 
                      />
                    </div>
                    <div className="st-grid-2" style={{ marginTop: '1rem' }}>
                      <Input 
                        label="Instagram Profile Link" 
                        value={s.seo?.social?.instagram || ''} 
                        onChange={v => setNested('seo', 'social', 'instagram', v)} 
                        placeholder="https://www.instagram.com/rerendetcoffee" 
                      />
                      <Input 
                        label="Facebook Page Link" 
                        value={s.seo?.social?.facebook || ''} 
                        onChange={v => setNested('seo', 'social', 'facebook', v)} 
                        placeholder="https://facebook.com/rerendetcoffee" 
                      />
                      <Input 
                        label="Twitter / X Profile Link" 
                        value={s.seo?.social?.twitter || ''} 
                        onChange={v => setNested('seo', 'social', 'twitter', v)} 
                        placeholder="https://twitter.com/rerendetcoffee" 
                      />
                      <Input 
                        label="TikTok Profile Link" 
                        value={s.seo?.social?.tiktok || ''} 
                        onChange={v => setNested('seo', 'social', 'tiktok', v)} 
                        placeholder="https://tiktok.com/@rerendetcoffee" 
                      />
                    </div>
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

                  <Section title="Official Invoice Signature" subtitle="Signature & signatory name displayed on customer invoices" icon={<FaFileContract />} accent="#d4af37">
                    <div className="st-logo-row">
                      <div className="st-logo-box" style={{ background: '#1c1714', minHeight: '90px' }}>
                        {signaturePreview
                          ? <img src={signaturePreview} alt="Official Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          : <div className="st-logo-empty"><FaFileContract /><span>No signature uploaded</span></div>}
                      </div>
                      <div className="st-logo-actions">
                        <p className="st-hint">Upload a transparent PNG of your handwritten signature (approx 300×100px). It will appear on all customer invoices & receipts.</p>
                        <input
                          type="file"
                          id="signature-file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setSignatureFile(file);
                              setSignaturePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        <label htmlFor="signature-file" className="btn-outline"><FaUpload /> Choose Signature</label>
                        {signaturePreview && (
                          <button className="btn-outline danger" onClick={() => { setSignaturePreview(''); setSignatureFile(null); set('store', 'signature', ''); }}>
                            <FaTimes /> Remove Signature
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: '1.25rem' }}>
                      <Field
                        label="Signatory Name & Title"
                        value={s.store?.signatoryName || ''}
                        onChange={v => set('store', 'signatoryName', v)}
                        placeholder="e.g. Sacha Dubois, Master Roaster & Founder"
                      />
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
                  HERO / HOMEPAGE CONTENT
               ════════════════════════════════ */}
              {activeTab === 'hero' && (
                <>
                  <Section
                    title="Hero Product Showcase Images (Up to 3 Images)"
                    subtitle="Real coffee bag product packaging photos displayed in the storefront hero conveyor showcase"
                    icon={<FaImage />}
                    accent="#D4AF37"
                  >
                    <p className="st-hint" style={{ marginBottom: '1.25rem' }}>
                      Recommended: High-res transparent PNG of coffee bag package or lifestyle pouch (800×800+). You can upload up to 3 coffee bag images. The storefront hero automatically animates smoothly between all uploaded products on a conveyor carousel.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {/* Slot 1: Primary Coffee Bag */}
                      <div className="st-about-img-row" style={{ borderBottom: '1px dashed var(--border-main)', paddingBottom: '1.25rem' }}>
                        <div className="st-hero-preview-box" style={{ position: 'relative', width: '200px', height: '200px', background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.1) 0%, rgba(15, 10, 8, 0.95) 100%), #120c09', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'hidden' }}>
                          {heroImagePreview ? (
                            <img src={heroImagePreview} alt="Hero Product 1" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.7))' }} />
                          ) : (
                            <div className="st-logo-empty"><FaImage /><span>Slot 1 Empty</span></div>
                          )}
                          <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(212, 175, 55, 0.9)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>SLOT 1</span>
                          {/* Live circular promo badge preview on packaging */}
                          {s.hero?.promoBadge?.enabled && (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', width: '48px', height: '48px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #fff1b8 0%, #D4AF37 55%, #a6811f 100%)', boxShadow: '0 6px 18px rgba(212, 175, 55, 0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#120b02', lineHeight: 1, border: '1px dashed rgba(20, 12, 0, 0.4)' }}>
                              <strong style={{ fontSize: '0.8rem', fontWeight: 800 }}>{s.hero?.promoBadge?.percentage || 30}%</strong>
                              <span style={{ fontSize: '0.4rem', fontWeight: 900, letterSpacing: '0.05em' }}>OFF</span>
                            </div>
                          )}
                        </div>
                        <div className="st-logo-actions" style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-main)', fontWeight: 700 }}>Showcase Bag 1: Primary Product (1kg Barista Pack)</h4>
                          <p className="st-hint">Hero sequence primary lead packaging photo.</p>
                          <input
                            type="file"
                            id="hero-img-file-1"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleHeroImageChange}
                          />
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            <label htmlFor="hero-img-file-1" className="btn-outline">
                              <FaUpload /> Upload Real Coffee Bag Photo
                            </label>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                setHeroImagePreview('/images/coffee/rerendet-espresso-1kg.png');
                                setHeroImageFile(null);
                                set('hero', 'imageUrl', '/images/coffee/rerendet-espresso-1kg.png');
                              }}
                            >
                              Use Standard 1kg Pouch
                            </button>
                            {heroImagePreview && (
                              <button
                                type="button"
                                className="btn-outline danger"
                                onClick={() => {
                                  setHeroImagePreview('');
                                  setHeroImageFile(null);
                                  set('hero', 'imageUrl', '');
                                }}
                              >
                                <FaTimes /> Reset Image
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Slot 2: Secondary Coffee Bag */}
                      <div className="st-about-img-row" style={{ borderBottom: '1px dashed var(--border-main)', paddingBottom: '1.25rem' }}>
                        <div className="st-hero-preview-box" style={{ position: 'relative', width: '200px', height: '200px', background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.1) 0%, rgba(15, 10, 8, 0.95) 100%), #120c09', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'hidden' }}>
                          {heroImagePreview2 ? (
                            <img src={heroImagePreview2} alt="Hero Product 2" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.7))' }} />
                          ) : (
                            <div className="st-logo-empty"><FaImage /><span>Slot 2 Empty</span></div>
                          )}
                          <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(212, 175, 55, 0.9)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>SLOT 2</span>
                        </div>
                        <div className="st-logo-actions" style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-main)', fontWeight: 700 }}>Showcase Bag 2: Secondary Product (250g Artisan Bag)</h4>
                          <p className="st-hint">Hero sequence secondary pouch packaging photo.</p>
                          <input
                            type="file"
                            id="hero-img-file-2"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleHeroImageChange2}
                          />
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            <label htmlFor="hero-img-file-2" className="btn-outline">
                              <FaUpload /> Upload Real Coffee Bag Photo
                            </label>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                setHeroImagePreview2('/images/coffee/rerendet-espresso-250g.png');
                                setHeroImageFile2(null);
                                set('hero', 'imageUrl2', '/images/coffee/rerendet-espresso-250g.png');
                              }}
                            >
                              Use Standard 250g Bag
                            </button>
                            {heroImagePreview2 && (
                              <button
                                type="button"
                                className="btn-outline danger"
                                onClick={() => {
                                  setHeroImagePreview2('');
                                  setHeroImageFile2(null);
                                  set('hero', 'imageUrl2', '');
                                }}
                              >
                                <FaTimes /> Reset Image
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Slot 3: Tertiary Coffee Bag */}
                      <div className="st-about-img-row">
                        <div className="st-hero-preview-box" style={{ position: 'relative', width: '200px', height: '200px', background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.1) 0%, rgba(15, 10, 8, 0.95) 100%), #120c09', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'hidden' }}>
                          {heroImagePreview3 ? (
                            <img src={heroImagePreview3} alt="Hero Product 3" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.7))' }} />
                          ) : (
                            <div className="st-logo-empty"><FaImage /><span>Slot 3 (Optional)</span></div>
                          )}
                          <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(212, 175, 55, 0.9)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>SLOT 3</span>
                        </div>
                        <div className="st-logo-actions" style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-main)', fontWeight: 700 }}>Showcase Bag 3: Micro-lot / Reserve Pouch (Optional)</h4>
                          <p className="st-hint">When uploaded, activates the 3-item conveyor sequence in the storefront hero section.</p>
                          <input
                            type="file"
                            id="hero-img-file-3"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleHeroImageChange3}
                          />
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            <label htmlFor="hero-img-file-3" className="btn-outline">
                              <FaUpload /> Upload Real Coffee Bag Photo
                            </label>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                setHeroImagePreview3('/hero-product.png');
                                setHeroImageFile3(null);
                                set('hero', 'imageUrl3', '/hero-product.png');
                              }}
                            >
                              Use Standard Rerendet Pouch
                            </button>
                            {heroImagePreview3 && (
                              <button
                                type="button"
                                className="btn-outline danger"
                                onClick={() => {
                                  setHeroImagePreview3('');
                                  setHeroImageFile3(null);
                                  set('hero', 'imageUrl3', '');
                                }}
                              >
                                <FaTimes /> Reset Image
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section
                    title="Promo / Discount Tag Overlay"
                    subtitle="Conditional circular discount badge overlaid on the hero product packaging (e.g. 30% OFF, 50% OFF)"
                    icon={<FaTag />}
                    accent="#fbbf24"
                  >
                    <div className="st-grid-2">
                      <ToggleRow
                        label="Enable Promo / Discount Badge"
                        description="When enabled, a luxury gold circular badge is overlaid on the upper-right corner of the product package."
                        checked={s.hero?.promoBadge?.enabled ?? true}
                        onChange={v => setNested('hero', 'promoBadge', 'enabled', v)}
                      />
                      <Field label="Discount Percentage (%)" hint="Generates '{percentage}% OFF' automatically without typos">
                        <input
                          type="number"
                          className="st-input"
                          min="1"
                          max="99"
                          value={s.hero?.promoBadge?.percentage ?? 30}
                          onChange={e => setNested('hero', 'promoBadge', 'percentage', e.target.value === '' ? 0 : parseInt(e.target.value))}
                          placeholder="30"
                        />
                      </Field>
                    </div>
                    <div className="st-grid-2" style={{ marginTop: '1rem' }}>
                      <Field label="Optional Start Date (Auto-activation)" hint="Leave blank to activate immediately">
                        <input
                          type="datetime-local"
                          className="st-input"
                          value={s.hero?.promoBadge?.startDate ? new Date(s.hero.promoBadge.startDate).toISOString().slice(0, 16) : ''}
                          onChange={e => setNested('hero', 'promoBadge', 'startDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        />
                      </Field>
                      <Field label="Optional End Date (Auto-expiry)" hint="Leave blank to run indefinitely">
                        <input
                          type="datetime-local"
                          className="st-input"
                          value={s.hero?.promoBadge?.endDate ? new Date(s.hero.promoBadge.endDate).toISOString().slice(0, 16) : ''}
                          onChange={e => setNested('hero', 'promoBadge', 'endDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    title="Hero Copy & Typography"
                    subtitle="Customize the main headline, narrative description, and pre-title pill badge"
                    icon={<FaFileAlt />}
                    accent="#10b981"
                  >
                    <div className="st-grid-2">
                      <Input
                        label="Pre-Title Pill / Small Badge"
                        hint="Small badge above headline (e.g. 100% Organic Arabica)"
                        value={s.hero?.pillText ?? '100% Organic Arabica'}
                        onChange={v => set('hero', 'pillText', v)}
                        placeholder="100% Organic Arabica"
                      />
                      <Input
                        label="Hero Main Headline"
                        hint="Use comma to separate normal & gold italic lines"
                        value={s.hero?.headline ?? 'Highland Mist, Poured for Perfection.'}
                        onChange={v => set('hero', 'headline', v)}
                        placeholder="Highland Mist, Poured for Perfection."
                      />
                    </div>
                    <Field label="Hero Subtext Paragraph" hint="Description paragraph below the main headline">
                      <textarea
                        className="st-textarea"
                        rows={3}
                        value={s.hero?.subheadline ?? 'Experience the rich, bold soul of hand-picked Kenyan coffee beans, roasting secrets passed through generations, delivered fresh to your door.'}
                        onChange={e => set('hero', 'subheadline', e.target.value)}
                        placeholder="Hero subtext paragraph..."
                      />
                    </Field>
                  </Section>

                  <Section
                    title="Call-To-Action (CTA) Buttons"
                    subtitle="Customize primary & secondary button texts and destination links"
                    icon={<FaArrowRight />}
                    accent="#60a5fa"
                  >
                    <div className="st-grid-2">
                      <Input
                        label="Primary Button Text"
                        value={s.hero?.primaryCtaText ?? 'Shop Collection'}
                        onChange={v => set('hero', 'primaryCtaText', v)}
                        placeholder="Shop Collection"
                      />
                      <Input
                        label="Primary Button Link / Anchor"
                        value={s.hero?.primaryCtaLink ?? '#coffee-shop'}
                        onChange={v => set('hero', 'primaryCtaLink', v)}
                        placeholder="#coffee-shop"
                      />
                      <Input
                        label="Secondary Button Text"
                        value={s.hero?.secondaryCtaText ?? 'Our Heritage'}
                        onChange={v => set('hero', 'secondaryCtaText', v)}
                        placeholder="Our Heritage"
                      />
                      <Input
                        label="Secondary Button Link / Anchor"
                        value={s.hero?.secondaryCtaLink ?? '#about'}
                        onChange={v => set('hero', 'secondaryCtaLink', v)}
                        placeholder="#about"
                      />
                    </div>
                  </Section>

                  <Section
                    title="Floating Badges & Tags"
                    subtitle="Toggleable floating corner badge and roast specification tag"
                    icon={<FaAward />}
                    accent="#a78bfa"
                  >
                    <div className="st-grid-2">
                      <div>
                        <ToggleRow
                          label="Corner Heritage Badge"
                          description="Round floating badge on the coffee pouch"
                          checked={s.hero?.cornerBadgeEnabled ?? true}
                          onChange={v => set('hero', 'cornerBadgeEnabled', v)}
                        />
                        <Input
                          label="Corner Badge Text"
                          value={s.hero?.cornerBadgeText ?? 'Farm to Cup Since 1986'}
                          onChange={v => set('hero', 'cornerBadgeText', v)}
                          disabled={s.hero?.cornerBadgeEnabled === false}
                        />
                      </div>
                      <div>
                        <ToggleRow
                          label="Roast / Flavor Info Tag"
                          description="Small tag floating at bottom of package"
                          checked={s.hero?.roastTagEnabled ?? true}
                          onChange={v => set('hero', 'roastTagEnabled', v)}
                        />
                        <Input
                          label="Roast Tag Text"
                          value={s.hero?.roastTagText ?? 'Dark Roast · Medium Body'}
                          onChange={v => set('hero', 'roastTagText', v)}
                          disabled={s.hero?.roastTagEnabled === false}
                        />
                      </div>
                    </div>
                  </Section>

                  <Section
                    title="Feature Callouts Row (Speri Inspiration Pattern)"
                    subtitle="Feature callouts shown below hero subtext (Icon, Title, Subtitle)"
                    icon={<FaLeaf />}
                    accent="#34d399"
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {(s.hero?.features || [
                        { icon: '🌱', title: '100% Organic', subtitle: "Nature's finest, ethically sourced" },
                        { icon: '☕', title: 'Rich Flavour', subtitle: 'Crafted for an unique brew' },
                        { icon: '🚚', title: 'Farm to Door', subtitle: 'Freshly roasted & dispatched' }
                      ]).map((feat, fIdx) => (
                        <div key={fIdx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-main)', borderRadius: '12px', padding: '1.2rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>{feat.icon}</span>
                            <strong style={{ color: 'var(--color-primary)' }}>Feature #{fIdx + 1}</strong>
                          </div>
                          <div className="st-grid-2">
                            <Input
                              label="Icon (Emoji)"
                              value={feat.icon}
                              onChange={v => {
                                const base = (s.hero?.features && s.hero.features.length > 0) ? [...s.hero.features] : [
                                  { icon: '🌱', title: '100% Organic', subtitle: "Nature's finest, ethically sourced" },
                                  { icon: '☕', title: 'Rich Flavour', subtitle: 'Crafted for an unique brew' },
                                  { icon: '🚚', title: 'Farm to Door', subtitle: 'Freshly roasted & dispatched' }
                                ];
                                base[fIdx] = { ...base[fIdx], icon: v };
                                set('hero', 'features', base);
                              }}
                              placeholder="🌱"
                            />
                            <Input
                              label="Title"
                              value={feat.title}
                              onChange={v => {
                                const base = (s.hero?.features && s.hero.features.length > 0) ? [...s.hero.features] : [
                                  { icon: '🌱', title: '100% Organic', subtitle: "Nature's finest, ethically sourced" },
                                  { icon: '☕', title: 'Rich Flavour', subtitle: 'Crafted for an unique brew' },
                                  { icon: '🚚', title: 'Farm to Door', subtitle: 'Freshly roasted & dispatched' }
                                ];
                                base[fIdx] = { ...base[fIdx], title: v };
                                set('hero', 'features', base);
                              }}
                              placeholder="100% Organic"
                            />
                          </div>
                          <Input
                            label="Subtitle"
                            value={feat.subtitle}
                            onChange={v => {
                              const base = (s.hero?.features && s.hero.features.length > 0) ? [...s.hero.features] : [
                                { icon: '🌱', title: '100% Organic', subtitle: "Nature's finest, ethically sourced" },
                                { icon: '☕', title: 'Rich Flavour', subtitle: 'Crafted for an unique brew' },
                                { icon: '🚚', title: 'Farm to Door', subtitle: 'Freshly roasted & dispatched' }
                              ];
                              base[fIdx] = { ...base[fIdx], subtitle: v };
                              set('hero', 'features', base);
                            }}
                            placeholder="Nature's finest, ethically sourced"
                          />
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section
                    title="Celebratory & Seasonal Effects (Fireworks, Christmas Snow & Holiday Specials)"
                    subtitle="Turn on/off dynamic festive animations, falling snow, celebration fireworks/confetti, and holiday promo discount banners"
                    icon={<FaMagic />}
                    accent="#ec4899"
                  >
                    <div className="st-grid-2">
                      <ToggleRow
                        label="Enable Celebratory & Seasonal Atmosphere"
                        description="Master switch to display falling snow, celebration fireworks, celebratory confetti, and festive announcement banners on the storefront."
                        checked={s.features?.seasonalEffects?.enabled ?? false}
                        onChange={v => setNested('features', 'seasonalEffects', 'enabled', v)}
                      />
                      <Field label="Active Festive Theme" hint="Choose automatic date detection or force a specific celebration mode">
                        <select
                          className="st-input"
                          value={s.features?.seasonalEffects?.theme ?? 'auto'}
                          onChange={e => setNested('features', 'seasonalEffects', 'theme', e.target.value)}
                        >
                          <option value="auto">🌟 Automatic (Date-based: Christmas in Dec, New Year in Jan)</option>
                          <option value="christmas">❄️ Christmas Falling Snow & Holiday Banner (🎄 Active)</option>
                          <option value="newyear">✨ New Year Champagne Gold Confetti (🥂 Active)</option>
                          <option value="fireworks">🎆 Vibrant Celebration Fireworks & Confetti (🎉 Active)</option>
                        </select>
                      </Field>
                    </div>

                    <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-main)' }}>
                      <div className="st-grid-2">
                        <ToggleRow
                          label="Show Holiday Announcement Top Banner"
                          description="Display dismissible glassmorphism promo banner at top of screen with discount code."
                          checked={s.features?.seasonalEffects?.promoBanner ?? true}
                          onChange={v => setNested('features', 'seasonalEffects', 'promoBanner', v)}
                        />
                        <Input
                          label="Holiday Promo Discount Code"
                          hint="e.g. XMAS25, NEWYEAR26, FESTIVE15"
                          value={s.features?.seasonalEffects?.promoCode ?? ''}
                          onChange={v => setNested('features', 'seasonalEffects', 'promoCode', v)}
                          placeholder="XMAS25"
                        />
                      </div>
                      <Field label="Custom Holiday Headline / Message" hint="Leave empty to use automatic holiday greeting">
                        <textarea
                          className="st-textarea"
                          rows={2}
                          value={s.features?.seasonalEffects?.bannerText ?? ''}
                          onChange={e => setNested('features', 'seasonalEffects', 'bannerText', e.target.value)}
                          placeholder="Wishing you a warm holiday season! Roast your winter worries away with our highland specialty coffee. ☕️ Enjoy 15% OFF on all orders!"
                        />
                      </Field>
                    </div>

                    {/* Live Preview Links */}
                    <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quick Live Preview:</span>
                      <a
                        href="/?theme=christmas"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px' }}
                      >
                        <FaSnowflake style={{ color: '#60a5fa' }} /> Test Christmas Snow
                      </a>
                      <a
                        href="/?theme=fireworks"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px' }}
                      >
                        <FaFire style={{ color: '#f59e0b' }} /> Test Fireworks
                      </a>
                      <a
                        href="/?theme=newyear"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px' }}
                      >
                        <FaGift style={{ color: '#D4AF37' }} /> Test New Year Confetti
                      </a>
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

                  {/* Google Search Console Integration */}
                  <Section
                    title="Google Search Console"
                    subtitle="Monitor how your products and website appear in Google Search"
                    icon={<FaGoogle />}
                    accent="#4285F4"
                  >
                    <div className="st-gsc-hero-banner">
                      <div className="st-gsc-hero-content">
                        <div className="st-gsc-badge-row">
                          <span className="st-gsc-pill">
                            <FaGoogle /> Google Search Console
                          </span>
                          {s.seo?.googleSiteVerification ? (
                            <span className="st-gsc-status-pill verified">
                              <FaCheckCircle /> Verification Configured
                            </span>
                          ) : (
                            <span className="st-gsc-status-pill pending">
                              <FaInfoCircle /> Not Verified Yet
                            </span>
                          )}
                        </div>
                        <h4 className="st-gsc-headline">Monitor Search Appearances, Crawl Status & Keywords</h4>
                        <p className="st-gsc-desc">
                          Google Search Console monitors how your products and website appear in <strong>Google Search</strong> (organic search queries, impressions, ranking positions, sitemaps, and crawl indexing). This is different from <strong>Google Analytics</strong>, which monitors customer behavior, session duration, and checkout funnels once visitors arrive on your site.
                        </p>
                        <div className="st-gsc-actions-row">
                          <a
                            href="https://search.google.com/search-console"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="st-gsc-primary-btn"
                          >
                            <FaGoogle /> Set up Google Search Console <FaExternalLinkAlt style={{ fontSize: '0.75rem' }} />
                          </a>
                          <button
                            type="button"
                            className="st-gsc-ghost-btn"
                            onClick={() => setShowGscGuide(prev => !prev)}
                          >
                            {showGscGuide ? 'Hide Setup Walkthrough' : 'Show Setup Walkthrough'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {showGscGuide && (
                      <div className="st-gsc-guide-box">
                        <div className="st-gsc-guide-title">
                          <FaBolt /> 4-Step Google Search Console Setup Walkthrough
                        </div>
                        <ol className="st-gsc-guide-steps">
                          <li>
                            Click <strong>Set up Google Search Console</strong> above. When prompted, choose <strong>URL prefix</strong> and enter <code>{s.seo?.canonicalUrl || 'https://rerendetcoffee.com'}</code>.
                          </li>
                          <li>
                            Under <em>Other verification methods</em>, click on <strong>HTML tag</strong>.
                          </li>
                          <li>
                            Copy either the <code>content="..."</code> token or the full <code>&lt;meta&gt;</code> tag and paste it into the <strong>Google Site Verification Token</strong> field below.
                          </li>
                          <li>
                            Click <strong>Save Settings</strong> at the bottom of the page, then switch back to Google Search Console and click <strong>Verify</strong>!
                          </li>
                          <li>
                            Go to <strong>Sitemaps</strong> in Google Search Console and submit <code>sitemap.xml</code> to index all coffee products and pages automatically.
                          </li>
                        </ol>
                      </div>
                    )}

                    <div className="st-grid-2">
                      <Field
                        label="Google Site Verification Token / Tag"
                        hint="Paste either your token code or the full <meta name='google-site-verification' content='...' /> tag"
                      >
                        <div className="st-input-action-wrapper">
                          <input
                            className="st-input"
                            value={s.seo?.googleSiteVerification || ''}
                            onChange={e => handleSiteVerificationChange(e.target.value)}
                            placeholder="e.g. 4_zZ8X9kLmN_exampleVerificationToken123"
                          />
                          {s.seo?.googleSiteVerification && (
                            <button
                              type="button"
                              className="st-btn-copy-tag"
                              onClick={() => handleCopyMetaTag(s.seo?.googleSiteVerification)}
                              title="Copy HTML Meta Tag"
                            >
                              {copiedMetaTag ? <FaCheck style={{ color: '#10b981' }} /> : <FaCopy />}
                            </button>
                          )}
                        </div>
                      </Field>

                      <Field
                        label="XML Sitemap URL"
                        hint="Submit this link in Search Console > Sitemaps for automated product indexing"
                      >
                        {(() => {
                          const sitemapUrl = `${(s.seo?.canonicalUrl || 'https://rerendetcoffee.com').replace(/\/+$/, '')}/sitemap.xml`;
                          return (
                            <div className="st-input-action-wrapper">
                              <input
                                className="st-input"
                                value={sitemapUrl}
                                readOnly
                              />
                              <button
                                type="button"
                                className="st-btn-copy-tag"
                                onClick={() => handleCopySitemap(sitemapUrl)}
                                title="Copy Sitemap URL"
                              >
                                {copiedSitemap ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>Copied!</span> : <><FaCopy /> Copy</>}
                              </button>
                              <a
                                href={sitemapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="st-btn-copy-tag"
                                title="Open Live Sitemap"
                              >
                                <FaExternalLinkAlt />
                              </a>
                            </div>
                          );
                        })()}
                      </Field>
                    </div>

                    <div className="st-gsc-shortcuts">
                      <div className="st-gsc-shortcuts-title">Google Search Console Tools & Shortcuts:</div>
                      <div className="st-gsc-shortcuts-grid">
                        <a
                          href="https://search.google.com/search-console/performance"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="st-gsc-shortcut-card"
                        >
                          <span className="st-gsc-sc-icon"><FaChartLine /></span>
                          <div>
                            <strong>Search Performance</strong>
                            <span>Track queries, clicks & SERP ranking</span>
                          </div>
                          <FaChevronRight className="st-gsc-arrow" />
                        </a>

                        <a
                          href="https://search.google.com/search-console/sitemaps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="st-gsc-shortcut-card"
                        >
                          <span className="st-gsc-sc-icon"><FaSitemap /></span>
                          <div>
                            <strong>Sitemaps Submission</strong>
                            <span>Submit /sitemap.xml for indexing</span>
                          </div>
                          <FaChevronRight className="st-gsc-arrow" />
                        </a>

                        <a
                          href="https://search.google.com/search-console/inspect"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="st-gsc-shortcut-card"
                        >
                          <span className="st-gsc-sc-icon"><FaSearch /></span>
                          <div>
                            <strong>URL Inspection Tool</strong>
                            <span>Check live Google index status for any URL</span>
                          </div>
                          <FaChevronRight className="st-gsc-arrow" />
                        </a>

                        <a
                          href="https://search.google.com/test/rich-results"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="st-gsc-shortcut-card"
                        >
                          <span className="st-gsc-sc-icon"><FaGlobe /></span>
                          <div>
                            <strong>Rich Results Test</strong>
                            <span>Verify JSON-LD schema for products & store</span>
                          </div>
                          <FaChevronRight className="st-gsc-arrow" />
                        </a>
                      </div>
                    </div>
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
              {activeTab === 'policies' && (() => {
                const POLICY_ADMIN_TABS = [
                  { id: 'shippingPolicy', label: 'Shipping Policy', path: '/shipping-policy', icon: <FaTruck />, color: '#8b5cf6', desc: 'Fulfillment & Express Delivery' },
                  { id: 'refundPolicy', label: 'Refund Policy', path: '/refund-policy', icon: <FaHistory />, color: '#f59e0b', desc: 'Satisfaction Guarantee & Returns' },
                  { id: 'termsConditions', label: 'Terms & Conditions', path: '/terms-conditions', icon: <FaFileContract />, color: '#3b82f6', desc: 'Storefront Customer Agreement' },
                  { id: 'privacyPolicy', label: 'Privacy Policy', path: '/privacy-policy', icon: <FaShieldAlt />, color: '#10b981', desc: 'Personal Data & Security' }
                ];
                const currentTabInfo = POLICY_ADMIN_TABS.find(t => t.id === activePolicySubTab) || POLICY_ADMIN_TABS[0];

                return (
                  <>
                    {/* Policy Sub-Tab Navigation Bar */}
                    <div className="st-policy-toolbar">
                      <div className="st-policy-tabs">
                        {POLICY_ADMIN_TABS.map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            className={`st-policy-tab-btn ${activePolicySubTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActivePolicySubTab(tab.id)}
                            style={activePolicySubTab === tab.id ? { borderLeft: `3px solid ${tab.color}` } : {}}
                          >
                            <span className="st-policy-tab-icon" style={{ color: activePolicySubTab === tab.id ? 'var(--color-primary)' : tab.color }}>
                              {tab.icon}
                            </span>
                            <span>{tab.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="st-policy-toolbar-actions">
                        <a
                          href={currentTabInfo.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="st-policy-preview-link"
                          title="Open live policy page on website"
                        >
                          <FaExternalLinkAlt /> View Live Page
                        </a>
                        <button
                          type="button"
                          className="st-policy-template-btn"
                          onClick={() => handleApplyPolicyTemplate(activePolicySubTab)}
                          title="Populate with artisan coffee policy template defaults"
                        >
                          <FaMagic /> Load Default Template
                        </button>
                      </div>
                    </div>

                    {/* Section 1: Customer Card Highlights */}
                    <Section
                      title={`${currentTabInfo.label} — Split Card Highlights`}
                      subtitle="Control the announcement summary, the 'What does this mean for me?' answer, and excerpt quotes on the customer-facing card"
                      icon={currentTabInfo.icon}
                      accent={currentTabInfo.color}
                    >
                      <Field
                        label="Policy Headline / Announcement Summary"
                        hint="Displayed prominently under the title on the floating policy card"
                      >
                        <textarea
                          className="st-textarea"
                          rows={3}
                          value={s.policies?.details?.[activePolicySubTab]?.summary || ''}
                          onChange={e => setPolicyDetail(activePolicySubTab, 'summary', e.target.value)}
                          placeholder="e.g. There's an update in our terms to ensure the highest standards of artisan roasting and ethical transparency for all customers."
                        />
                      </Field>

                      <Field
                        label="What does this mean for me? (Customer Answer)"
                        hint='Direct, plain-language answer displayed when customers expand the "What does this mean for me?" accordion dropdown'
                      >
                        <textarea
                          className="st-textarea"
                          rows={3}
                          value={s.policies?.details?.[activePolicySubTab]?.faqAnswer || ''}
                          onChange={e => setPolicyDetail(activePolicySubTab, 'faqAnswer', e.target.value)}
                          placeholder="e.g. You are guaranteed authentic 100% single-origin Arabica from high-altitude Kenyan volcanic soils. Orders may be cancelled within 1 hour before custom roasting commences."
                        />
                      </Field>

                      <div className="st-policy-cards-grid">
                        <div className="st-policy-highlight-card">
                          <div className="st-highlight-card-header">
                            <span className="st-highlight-tag">Card 1 Highlight</span>
                          </div>
                          <Field label="Card 1 Heading" hint="e.g. 'Old terms' or 'Dispatch & Roasting Schedule'">
                            <input
                              type="text"
                              className="st-input"
                              value={s.policies?.details?.[activePolicySubTab]?.card1Label || ''}
                              onChange={e => setPolicyDetail(activePolicySubTab, 'card1Label', e.target.value)}
                              placeholder="e.g. Dispatch & Roasting Schedule"
                            />
                          </Field>
                          <Field label="Card 1 Excerpt / Quote" hint="Key excerpt text shown inside quotation marks">
                            <textarea
                              className="st-textarea"
                              rows={3}
                              value={s.policies?.details?.[activePolicySubTab]?.card1Excerpt || ''}
                              onChange={e => setPolicyDetail(activePolicySubTab, 'card1Excerpt', e.target.value)}
                              placeholder="Key excerpt quote shown on Card 1..."
                            />
                          </Field>
                        </div>

                        <div className="st-policy-highlight-card featured">
                          <div className="st-highlight-card-header">
                            <span className="st-highlight-tag gold">Card 2 Highlight (Active)</span>
                          </div>
                          <Field label="Card 2 Heading" hint="e.g. 'New terms' or 'County Delivery & Live Tracking'">
                            <input
                              type="text"
                              className="st-input"
                              value={s.policies?.details?.[activePolicySubTab]?.card2Label || ''}
                              onChange={e => setPolicyDetail(activePolicySubTab, 'card2Label', e.target.value)}
                              placeholder="e.g. County Delivery & Live Tracking"
                            />
                          </Field>
                          <Field label="Card 2 Excerpt / Quote" hint="Key excerpt text shown inside quotation marks">
                            <textarea
                              className="st-textarea"
                              rows={3}
                              value={s.policies?.details?.[activePolicySubTab]?.card2Excerpt || ''}
                              onChange={e => setPolicyDetail(activePolicySubTab, 'card2Excerpt', e.target.value)}
                              placeholder="Key excerpt quote shown on Card 2..."
                            />
                          </Field>
                        </div>
                      </div>
                    </Section>

                    {/* Section 2: Full Legal Policy Text */}
                    <Section
                      title={`Full ${currentTabInfo.label} Document`}
                      subtitle="Displayed when customers click 'Review full policy' or 'See more'. Leave blank to use our built-in coffee policy."
                      icon={<FaFileAlt />}
                      accent="#D4AF37"
                    >
                      <div className="st-policy-editor-card">
                        {/* Editor Action Toolbar */}
                        <div className="st-policy-toolbar-row">
                          <div className="st-policy-format-group">
                            <button
                              type="button"
                              className="st-pfmt-btn"
                              title="Bold (Ctrl+B)"
                              onClick={() => applyPolicyFormat('**', '**', 'bold text', 'inline')}
                            >
                              <FaBold />
                            </button>
                            <button
                              type="button"
                              className="st-pfmt-btn"
                              title="Italic (Ctrl+I)"
                              onClick={() => applyPolicyFormat('*', '*', 'italic text', 'inline')}
                            >
                              <FaItalic />
                            </button>
                            <div className="st-pfmt-sep" />
                            <button
                              type="button"
                              className="st-pfmt-btn"
                              title="Main Heading (H1)"
                              onClick={() => applyPolicyFormat('# ', '\n', 'Heading Title', 'inline')}
                            >
                              <span style={{ fontWeight: '800', fontSize: '0.8rem' }}>H1</span>
                            </button>
                            <button
                              type="button"
                              className="st-pfmt-btn"
                              title="Subheading (H2)"
                              onClick={() => applyPolicyFormat('## ', '\n', 'Section Subheading', 'inline')}
                            >
                              <span style={{ fontWeight: '800', fontSize: '0.75rem' }}>H2</span>
                            </button>
                            <button
                              type="button"
                              className="st-pfmt-btn"
                              title="Bullet List Item"
                              onClick={() => applyPolicyFormat('- ', '\n', 'List item', 'inline')}
                            >
                              <FaListUl />
                            </button>
                            <button
                              type="button"
                              className="st-pfmt-btn notice"
                              title="Important Notice Callout ([!])"
                              onClick={() => applyPolicyFormat('[!] ', '\n', 'Important Notice: Fresh roast details...', 'inline')}
                            >
                              <FaExclamationTriangle style={{ color: '#f59e0b' }} /> [!] Notice
                            </button>
                            <button
                              type="button"
                              className="st-pfmt-btn"
                              title="Blockquote"
                              onClick={() => applyPolicyFormat('> ', '\n', 'Quoted policy excerpt...', 'inline')}
                            >
                              <FaQuoteRight />
                            </button>
                          </div>

                          <div className="st-policy-action-group">
                            <button
                              type="button"
                              className="st-pfmt-btn template"
                              title="Insert Pre-written Coffee Policy"
                              onClick={handleInsertFullDocTemplate}
                            >
                              <FaMagic /> Insert Template
                            </button>
                            <button
                              type="button"
                              className="st-pfmt-btn popout"
                              title="Pop Out Fullscreen Studio"
                              onClick={() => setIsPolicyModalOpen(true)}
                            >
                              <FaExpand /> Pop Out Full Editor
                            </button>
                          </div>
                        </div>

                        {/* Inline Textarea */}
                        <div className="st-policy-textarea-box">
                          <textarea
                            ref={inlinePolicyRef}
                            className="st-textarea st-policy-textarea"
                            rows={12}
                            value={s.policies?.[activePolicySubTab] || ''}
                            onChange={e => set('policies', activePolicySubTab, e.target.value)}
                            onKeyDown={e => handlePolicyKeyDown(e, 'inline')}
                            placeholder={`Enter complete legal text for ${currentTabInfo.label} (leave empty to use default built-in policy)...`}
                          />
                        </div>

                        {/* Stats & popout shortcut row */}
                        <div className="st-policy-editor-foot">
                          <div className="st-policy-meta-stats">
                            <span><strong>{wc(s.policies?.[activePolicySubTab])}</strong> words</span>
                            <span className="dot-sep">·</span>
                            <span><strong>{(s.policies?.[activePolicySubTab] || '').length}</strong> chars</span>
                            <span className="dot-sep">·</span>
                            <span className="hint-label">Supports: <code># H1</code>, <code>## H2</code>, <code>- List</code>, <code>[!] Notice</code>, <code>**bold**</code>, <code>*italic*</code></span>
                          </div>
                          <button
                            type="button"
                            className="st-policy-open-modal-link"
                            onClick={() => setIsPolicyModalOpen(true)}
                          >
                            <FaExpand /> Open Fullscreen Studio ↗
                          </button>
                        </div>
                      </div>
                    </Section>

                    {/* Section 3: Policy Update Notifications */}
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
                    {/* Section 4: System Documentation & Reference Manuals */}
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
                );
              })()}


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

                  {/* Quick Shortcut to Brewing Guides & Social Media */}
                  <div className="st-brew-shortcut-card">
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                        ☕ Specialty Brewing Guides & Social Media Cards
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Manage live brewing recipes for your storefront and generate 1080×1350 px cards for WhatsApp, Instagram & Facebook.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setActiveTab('brewguides')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <FaMugHot /> Edit Brew Guides & Export Cards
                    </button>
                  </div>
                </>
              )}

              {/* ════════════════════════════════
                  BREWING GUIDES & SOCIAL EXPORT
               ════════════════════════════════ */}
              {activeTab === 'brewguides' && (
                <>
                  <Section
                    title="Specialty Brewing Guides & Social Media Exporter"
                    subtitle="Customize real-time coffee brewing methods shown on your website and generate 1080×1350 px cards for social media"
                    icon={<FaMugHot />}
                    accent="#D4AF37"
                  >
                    {/* Method Selector Pills */}
                    <div className="st-policy-tabs-bar" style={{ marginBottom: '1.25rem' }}>
                      <div className="st-policy-tabs">
                        {currentBrewGuides.map(method => (
                          <button
                            key={method.id}
                            type="button"
                            className={`st-policy-tab-btn ${activeBrewMethodId === method.id ? 'active' : ''}`}
                            onClick={() => setActiveBrewMethodId(method.id)}
                          >
                            <span className="st-policy-tab-icon">{method.icon || '☕'}</span>
                            <span>{method.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Social Card & Sharing Action Strip */}
                    <div className="st-brew-export-strip">
                      <div className="st-brew-export-left">
                        <div className="st-brew-badge">📱 1080×1350 SOCIAL GRAPHIC READY</div>
                        <p className="st-brew-export-hint">
                          Instant high-resolution export for <strong>{activeBrewMethod.name}</strong>. Calibrated for Instagram Post/Story, WhatsApp Status, and Facebook.
                        </p>
                      </div>
                      <div className="st-brew-export-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleDownloadSocialCard}
                          disabled={isExportingCard}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                        >
                          <FaDownload />
                          <span>{isExportingCard ? 'Generating Graphic...' : 'Download Card (PNG)'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={handleShareWhatsApp}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.4)' }}
                        >
                          <FaWhatsapp />
                          <span>Share WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={handleCopySocialCaption}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                        >
                          {copiedCaption ? <FaCheck style={{ color: '#00A859' }} /> : <FaCopy />}
                          <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn-outline danger"
                          onClick={handleResetMethod}
                          title="Reset recipe to factory calibrated highland defaults"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <FaUndoAlt />
                          <span>Reset Recipe</span>
                        </button>
                      </div>
                    </div>

                    {/* Recipe Core Parameters */}
                    <div className="st-grid-2">
                      <Input
                        label="Method Name"
                        value={activeBrewMethod.name || ''}
                        onChange={v => updateBrewField('name', v)}
                      />
                      <Input
                        label="Tagline / Flavor Promise"
                        value={activeBrewMethod.tagline || ''}
                        onChange={v => updateBrewField('tagline', v)}
                      />
                    </div>

                    <div className="st-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <Input
                        label="Brewing Ratio"
                        value={activeBrewMethod.ratio || ''}
                        onChange={v => updateBrewField('ratio', v)}
                        hint="e.g. 1:15, 1:16, 1:12"
                      />
                      <Input
                        label="Base Coffee (g)"
                        type="number"
                        value={activeBrewMethod.baseCoffee || 20}
                        onChange={v => updateBrewField('baseCoffee', parseInt(v) || 0)}
                        hint="Single cup dose"
                      />
                      <Input
                        label="Base Water (ml)"
                        type="number"
                        value={activeBrewMethod.baseWater || 300}
                        onChange={v => updateBrewField('baseWater', parseInt(v) || 0)}
                        hint="Single cup yield"
                      />
                      <Input
                        label="Target Brew Time"
                        value={activeBrewMethod.time || ''}
                        onChange={v => updateBrewField('time', v)}
                        hint="e.g. 4:00 mins"
                      />
                    </div>

                    <div className="st-grid-2">
                      <Input
                        label="Grind Size"
                        value={activeBrewMethod.grind || ''}
                        onChange={v => updateBrewField('grind', v)}
                        hint="e.g. Coarse, Medium-Fine"
                      />
                      <Input
                        label="Grind Description"
                        value={activeBrewMethod.grindDesc || ''}
                        onChange={v => updateBrewField('grindDesc', v)}
                        hint="e.g. Texture of coarse kosher sea salt"
                      />
                    </div>

                    <div className="st-grid-2">
                      <Input
                        label="Water Temperature"
                        value={activeBrewMethod.temp || ''}
                        onChange={v => updateBrewField('temp', v)}
                        hint="e.g. 94°C (201°F)"
                      />
                      <Input
                        label="Temperature Detail"
                        value={activeBrewMethod.tempDesc || ''}
                        onChange={v => updateBrewField('tempDesc', v)}
                        hint="e.g. 30s off rolling boil"
                      />
                    </div>

                    <Field label="Taste Profile Description" hint="Shown in the customer guide callout and on social card">
                      <textarea
                        className="st-textarea"
                        rows={2}
                        value={activeBrewMethod.profile || ''}
                        onChange={e => updateBrewField('profile', e.target.value)}
                        placeholder="Velvety mouthfeel, deep chocolate undertones..."
                      />
                    </Field>

                    <Field label="Barista Pro-Tip" hint="Insider tip for optimal extraction">
                      <textarea
                        className="st-textarea"
                        rows={2}
                        value={activeBrewMethod.proTip || ''}
                        onChange={e => updateBrewField('proTip', e.target.value)}
                        placeholder="Always plunge with gentle, even pressure..."
                      />
                    </Field>

                    {/* Step by Step Sequence */}
                    <div className="st-brew-steps-container">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            Step-by-Step Instructions ({activeBrewMethod.steps?.length || 0} Steps)
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Numbered sequence rendered in website modal and exported graphic card
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={addBrewStep}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                        >
                          <FaPlus /> Add Step
                        </button>
                      </div>

                      <div className="st-brew-steps-list">
                        {(activeBrewMethod.steps || []).map((step, sIdx) => (
                          <div key={sIdx} className="st-brew-step-card">
                            <div className="st-brew-step-head">
                              <span className="st-brew-step-pill">Step {sIdx + 1}</span>
                              <button
                                type="button"
                                className="btn-outline danger icon-only"
                                onClick={() => removeBrewStep(sIdx)}
                                title="Remove Step"
                              >
                                <FaTrash />
                              </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                              <input
                                type="text"
                                className="st-input"
                                placeholder="Step title (e.g. The 30-Second Bloom)"
                                value={step.title || ''}
                                onChange={e => updateBrewStep(sIdx, 'title', e.target.value)}
                              />
                              <textarea
                                className="st-textarea"
                                rows={2}
                                placeholder="Step details..."
                                value={step.text || ''}
                                onChange={e => updateBrewStep(sIdx, 'text', e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
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
                    <div className="st-super-gate-panel" style={{ marginTop: '2.5rem', padding: '30px', background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', gap: '20px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '3px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: '800', color: '#D4AF37', marginBottom: '8px', textTransform: 'uppercase' }}>
                            <FaShieldAlt /> Single-Use Out-of-Band Gate
                          </div>
                          <h4 style={{ color: '#D4AF37', margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaKey /> Super Gate Control
                          </h4>
                          <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: '#ADB5BD', maxWidth: '580px', lineHeight: '1.5' }}>
                            Generate an independent single-use emergency link. Use this out-of-band link to toggle storefront maintenance mode if the administrator dashboard or normal authentication fails.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => setShowGenerateConfirmModal(true)}
                          disabled={generatingEmergencyLink}
                          style={{ borderColor: '#D4AF37', color: '#D4AF37', padding: '12px 25px', borderRadius: '10px', height: 'fit-content', fontWeight: '700' }}
                        >
                          {generatingEmergencyLink ? <FaSync className="st-spin" /> : <FaBolt />} {magicLinkData ? 'Regenerate Emergency Link' : 'Generate Emergency Link'}
                        </button>
                      </div>

                      {/* Active Generated Emergency Link Card */}
                      {magicLinkData && (
                        <motion.div
                          className="st-magic-link-box"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            background: '#0B0F1A',
                            padding: '24px',
                            borderRadius: '14px',
                            border: '1px dashed rgba(212, 175, 55, 0.6)',
                            marginBottom: '30px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                background: magicLinkTimeLeft === 'Expired' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: magicLinkTimeLeft === 'Expired' ? '#ef4444' : '#10b981'
                              }}>
                                {magicLinkTimeLeft === 'Expired' ? 'EXPIRED' : 'ACTIVE EMERGENCY LINK'}
                              </span>
                              {magicLinkTimeLeft !== 'Expired' && (
                                <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <FaClock /> Expires in: {magicLinkTimeLeft || '10:00'}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={handleRevokeEmergencyLink}
                              disabled={revokingEmergencyLink}
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              {revokingEmergencyLink ? 'Revoking...' : '✕ Revoke Active Link'}
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.5)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px' }}>
                            <code style={{ flex: 1, color: '#D4AF37', fontSize: '0.88rem', wordBreak: 'break-all' }}>
                              {magicLinkData.emergencyUrl}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(magicLinkData.emergencyUrl)}
                              style={{
                                background: 'rgba(212, 175, 55, 0.15)',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                color: '#D4AF37',
                                cursor: 'pointer',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="Copy Link"
                            >
                              <FaCopy /> Copy Link
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '0.78rem' }}>
                            <span style={{ color: magicLinkData.emailDeliveryStatus === 'SENT' ? '#34d399' : '#fbbf24' }}>
                              {magicLinkData.emailDeliveryStatus === 'SENT'
                                ? `✓ Dispatched to verified SuperAdmin email: ${magicLinkData.recipientEmail}`
                                : `⚠️ Email dispatch failed. Please copy link above for emergency retention.`}
                            </span>
                            <span style={{ color: '#94a3b8' }}>
                              Single-use only · Atomic execution
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* Recent Emergency Links Log */}
                      <div className="st-audit-trail" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '25px', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                          <h5 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaShieldAlt style={{ color: '#D4AF37' }} /> Emergency Link History
                          </h5>
                          <button
                            type="button"
                            onClick={fetchEmergencyLinks}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FaSync className={loadingEmergencyHistory ? 'st-spin' : ''} /> Refresh
                          </button>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                                <th style={{ padding: '12px 14px', color: '#64748b' }}>Status</th>
                                <th style={{ padding: '12px 14px', color: '#64748b' }}>Recipient</th>
                                <th style={{ padding: '12px 14px', color: '#64748b' }}>Action Performed</th>
                                <th style={{ padding: '12px 14px', color: '#64748b' }}>Generated At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emergencyLinksHistory.map((item, idx) => (
                                <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '12px 14px' }}>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.68rem',
                                      fontWeight: '800',
                                      background: item.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : item.status === 'USED' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                      color: item.status === 'ACTIVE' ? '#34d399' : item.status === 'USED' ? '#60a5fa' : '#f87171'
                                    }}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>{item.recipientEmail}</td>
                                  <td style={{ padding: '12px 14px', color: item.actionPerformed === 'enable' ? '#ef4444' : item.actionPerformed === 'disable' ? '#10b981' : '#64748b', fontWeight: '700' }}>
                                    {item.actionPerformed === 'enable' ? 'Take Offline' : item.actionPerformed === 'disable' ? 'Restore Live' : 'None'}
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{new Date(item.createdAt).toLocaleString()}</td>
                                </tr>
                              ))}
                              {emergencyLinksHistory.length === 0 && (
                                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No emergency links generated recently.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Maintenance Audit Trail */}
                      <div className="st-audit-trail" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '25px' }}>
                        <h5 style={{ margin: '0 0 15px', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FaHistory style={{ color: '#94a3b8' }} /> Maintenance State Transitions
                        </h5>
                        <div style={{ maxHeight: '220px', overflowY: 'auto', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                                <th style={{ padding: '12px 14px', color: '#64748b' }}>State</th>
                                <th style={{ padding: '12px 14px', color: '#64748b' }}>Operator</th>
                                <th style={{ padding: '12px 14px', color: '#64748b' }}>Channel</th>
                                <th style={{ padding: '12px 14px', color: '#64748b' }}>Local Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.maintenance?.history?.slice().reverse().map((entry, idx) => (
                                <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '12px 14px' }}>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '0.68rem',
                                      fontWeight: '800',
                                      background: entry.action === 'enabled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                      color: entry.action === 'enabled' ? '#ef4444' : '#10b981',
                                      textTransform: 'uppercase'
                                    }}>
                                      {entry.action === 'enabled' ? 'OFFLINE' : 'LIVE'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#f1f5f9' }}>{entry.actorName || 'Unknown Admin'}</td>
                                  <td style={{ padding: '12px 14px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>
                                      {entry.source?.toUpperCase() === 'MAGIC-LINK' ? '⚡ EMERGENCY GATE' : 'DASHBOARD'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{new Date(entry.timestamp).toLocaleString()}</td>
                                </tr>
                              ))}
                              {(!s.maintenance?.history || s.maintenance.history.length === 0) && (
                                <tr><td colSpan="4" style={{ padding: '25px', textAlign: 'center', color: '#64748b' }}>No toggle history available yet.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pre-Generation Confirmation Modal */}
                  {showGenerateConfirmModal && (
                    <div className="esg-modal-backdrop">
                      <div className="esg-modal-card">
                        <div className="esg-modal-icon-badge danger" style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37' }}>
                          <FaKey />
                        </div>
                        <h3 className="esg-modal-title">Generate Emergency Super Gate Link</h3>
                        <p className="esg-modal-desc">
                          You are about to generate a single-use emergency access link for verified SuperAdmin: <strong>{user?.email}</strong>.
                          <br /><br />
                          • <strong>Single-Use Only:</strong> Link is atomically consumed upon maintenance action.<br />
                          • <strong>10-Minute Expiry:</strong> Valid for exactly 10 minutes from generation.<br />
                          • <strong>Replacement:</strong> Generating this link will automatically revoke any previous unused link.
                        </p>
                        <div className="esg-modal-btn-row">
                          <button
                            type="button"
                            className="esg-modal-cancel"
                            onClick={() => setShowGenerateConfirmModal(false)}
                            disabled={generatingEmergencyLink}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="esg-modal-confirm"
                            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B89628 100%)', color: '#0B0F1A' }}
                            onClick={handleExecuteGenerateEmergencyLink}
                            disabled={generatingEmergencyLink}
                          >
                            {generatingEmergencyLink ? <><FaSync className="st-spin" /> Generating...</> : 'Confirm & Generate'}
                          </button>
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

      {/* 📜 Policy Writing Studio Pop-Up Modal */}
      <AnimatePresence>
        {isPolicyModalOpen && (
          <motion.div
            className="st-pmodal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPolicyModalOpen(false)}
          >
            <motion.div
              className="st-pmodal-window"
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Top Studio Bar */}
              <div className="st-pmodal-topbar">
                <div className="st-pmodal-brand">
                  <div className="st-pmodal-tab-badge" style={{ color: currentPolicyTabInfo.color }}>
                    {currentPolicyTabInfo.icon}
                  </div>
                  <div>
                    <div className="st-pmodal-crumb">POLICY WRITING STUDIO</div>
                    <h3 className="st-pmodal-doc-title">Full {currentPolicyTabInfo.label} Document</h3>
                  </div>
                </div>

                {/* View switcher pills */}
                <div className="st-pmodal-view-pills">
                  <button
                    type="button"
                    className={`st-pmodal-pill ${policyModalView === 'split' ? 'active' : ''}`}
                    onClick={() => setPolicyModalView('split')}
                    title="Split Screen: Editor & Live Preview"
                  >
                    <FaColumns /> Split Screen
                  </button>
                  <button
                    type="button"
                    className={`st-pmodal-pill ${policyModalView === 'edit' ? 'active' : ''}`}
                    onClick={() => setPolicyModalView('edit')}
                    title="Wide Distraction-Free Editor"
                  >
                    <FaPencilAlt /> Editor Only
                  </button>
                  <button
                    type="button"
                    className={`st-pmodal-pill ${policyModalView === 'preview' ? 'active' : ''}`}
                    onClick={() => setPolicyModalView('preview')}
                    title="Storefront Customer Preview"
                  >
                    <FaEye /> Preview Only
                  </button>
                </div>

                {/* Top Action Buttons */}
                <div className="st-pmodal-actions">
                  <button
                    type="button"
                    className="st-pmodal-save-btn"
                    onClick={() => {
                      setIsPolicyModalOpen(false);
                      showAlert('Document updated in settings! Click Save Changes at the bottom of the page to publish.', 'success');
                    }}
                  >
                    <FaCheck /> Done & Keep Changes
                  </button>
                  <button
                    type="button"
                    className="st-pmodal-close-icon"
                    onClick={() => setIsPolicyModalOpen(false)}
                    title="Close Pop-Up"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="st-pmodal-toolbar-bar">
                <div className="st-pmodal-fmt-group">
                  <button
                    type="button"
                    className="st-pmodal-tool-btn"
                    title="Bold text (Ctrl+B)"
                    onClick={() => applyPolicyFormat('**', '**', 'bold text', 'modal')}
                  >
                    <FaBold /> Bold
                  </button>
                  <button
                    type="button"
                    className="st-pmodal-tool-btn"
                    title="Italic text (Ctrl+I)"
                    onClick={() => applyPolicyFormat('*', '*', 'italic text', 'modal')}
                  >
                    <FaItalic /> Italic
                  </button>
                  <div className="st-pmodal-tool-sep" />
                  <button
                    type="button"
                    className="st-pmodal-tool-btn"
                    title="Heading 1 (#)"
                    onClick={() => applyPolicyFormat('# ', '\n', 'Heading Title', 'modal')}
                  >
                    <span style={{ fontWeight: '800' }}>H1</span>
                  </button>
                  <button
                    type="button"
                    className="st-pmodal-tool-btn"
                    title="Heading 2 (##)"
                    onClick={() => applyPolicyFormat('## ', '\n', 'Section Subheading', 'modal')}
                  >
                    <span style={{ fontWeight: '800' }}>H2</span>
                  </button>
                  <button
                    type="button"
                    className="st-pmodal-tool-btn"
                    title="Bullet List Item (-)"
                    onClick={() => applyPolicyFormat('- ', '\n', 'List item', 'modal')}
                  >
                    <FaListUl /> Bullet
                  </button>
                  <button
                    type="button"
                    className="st-pmodal-tool-btn notice"
                    title="Important Notice Callout ([!])"
                    onClick={() => applyPolicyFormat('[!] ', '\n', 'Important notice: details here...', 'modal')}
                  >
                    <FaExclamationTriangle style={{ color: '#f59e0b' }} /> [!] Callout
                  </button>
                  <button
                    type="button"
                    className="st-pmodal-tool-btn"
                    title="Blockquote (>)"
                    onClick={() => applyPolicyFormat('> ', '\n', 'Quoted policy excerpt...', 'modal')}
                  >
                    <FaQuoteRight /> Quote
                  </button>
                </div>

                <div className="st-pmodal-template-group">
                  <button
                    type="button"
                    className="st-pmodal-tool-btn template"
                    onClick={handleInsertFullDocTemplate}
                    title="Load Pre-Written Coffee Policy"
                  >
                    <FaMagic /> Insert Coffee Template
                  </button>
                  <button
                    type="button"
                    className="st-pmodal-tool-btn clear"
                    onClick={() => {
                      if (window.confirm('Clear all policy document text?')) {
                        set('policies', activePolicySubTab, '');
                      }
                    }}
                    title="Clear Document"
                  >
                    <FaTrash /> Clear
                  </button>
                </div>
              </div>

              {/* Main Content Pane */}
              <div className={`st-pmodal-content-grid mode-${policyModalView}`}>
                {(policyModalView === 'split' || policyModalView === 'edit') && (
                  <div className="st-pmodal-editor-col">
                    <div className="st-col-title-bar">
                      <span>DOCUMENT WRITING CANVAS</span>
                      <span className="st-col-hint">Shortcuts: <code>Ctrl+B</code> (Bold), <code>Ctrl+I</code> (Italic)</span>
                    </div>
                    <textarea
                      ref={modalPolicyRef}
                      className="st-pmodal-editor-textarea"
                      value={s.policies?.[activePolicySubTab] || ''}
                      onChange={e => set('policies', activePolicySubTab, e.target.value)}
                      onKeyDown={e => handlePolicyKeyDown(e, 'modal')}
                      placeholder={`Write your full legal policy document for ${currentPolicyTabInfo.label} here...\n\nExample:\n# Delivery & Shipping Guidelines\n\n## 1. Freshness Guarantee\nAll coffee is hand-roasted in small batches...\n\n- Nairobi Orders: 12-24 hours\n- Countrywide Delivery: 24-48 hours\n\n[!] Important Notice: Pre-ground coffee is best enjoyed within 30 days.`}
                      autoFocus
                    />
                  </div>
                )}

                {(policyModalView === 'split' || policyModalView === 'preview') && (
                  <div className="st-pmodal-preview-col">
                    <div className="st-col-title-bar">
                      <span>CUSTOMER STOREFRONT PREVIEW</span>
                      <span className="st-live-badge"><span className="pulse-dot" /> Live Preview</span>
                    </div>
                    <div className="st-pmodal-preview-wrapper">
                      <div className="st-storefront-doc-card">
                        <div className="st-doc-brand-banner">
                          <span className="st-doc-tag" style={{ borderLeftColor: currentPolicyTabInfo.color }}>
                            {currentPolicyTabInfo.icon} {currentPolicyTabInfo.label}
                          </span>
                          <span className="st-doc-store-name">{s.store?.name || 'Rerendet Coffee'}</span>
                        </div>
                        <div className="st-doc-render-body">
                          {renderPolicyMarkdownPreview(s.policies?.[activePolicySubTab])}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Studio Bar */}
              <div className="st-pmodal-bottombar">
                <div className="st-pmodal-wordcount">
                  <span><strong>{wc(s.policies?.[activePolicySubTab])}</strong> words</span>
                  <span className="dot-sep">·</span>
                  <span><strong>{(s.policies?.[activePolicySubTab] || '').length}</strong> characters</span>
                  <span className="dot-sep">·</span>
                  <span>~<strong>{Math.max(1, Math.ceil(wc(s.policies?.[activePolicySubTab]) / 200))}</strong> min read</span>
                </div>
                <div className="st-pmodal-bottom-actions">
                  <button
                    type="button"
                    className="st-pmodal-cancel-button"
                    onClick={() => setIsPolicyModalOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="st-pmodal-apply-button"
                    onClick={() => {
                      setIsPolicyModalOpen(false);
                      showAlert('Document changes kept! Remember to click Save Settings at page bottom.', 'success');
                    }}
                  >
                    <FaCheck /> Done & Keep Changes
                  </button>
                </div>
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
          font-family: var(--font-body, 'Outfit', sans-serif);
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