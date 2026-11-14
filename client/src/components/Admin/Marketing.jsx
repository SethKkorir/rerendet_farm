// src/components/Admin/Marketing.jsx — Premium Marketing Dashboard
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaPaperPlane, FaUsers, FaEnvelope, FaSync,
    FaSearch, FaTimes, FaChevronLeft, FaChevronRight,
    FaChartLine, FaEdit, FaEye, FaTrash,
    FaToggleOn, FaToggleOff, FaStar, FaMagic,
    FaBullhorn, FaCheckCircle, FaRegClock, FaHeading, FaParagraph, FaLink, FaImage, FaPlus
} from 'react-icons/fa';
import './Marketing.css';

// ─── Helpers ────────────────────────────────────────────────────
const formatDate = (d) => !d ? '—' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const EMAIL_TEMPLATES = [
    {
        id: 'survey',
        label: '📣 Got a Minute? (Survey)',
        subject: 'Got a minute? We would love to hear from you!',
        content: `<h2 style="color:#0F2444; font-size:28px; font-weight:800; margin:0 0 14px 0; text-align:center; letter-spacing:-0.5px;">Got a minute?</h2>
<p style="color:#64748B; font-size:14.5px; line-height:1.65; text-align:center; margin:0 auto 20px auto; max-width:440px;">Thanks for being a Rerendet subscriber! We would appreciate if you take just a few minutes of your time to share your thoughts, so we can craft the best coffee experience for you.</p>
<div style="text-align:center; margin:22px auto 26px auto;">
  <svg width="68" height="12" viewBox="0 0 68 12" fill="none" style="display:inline-block;"><path d="M2 6C12 2 18 10 28 6C38 2 44 10 54 6C59 4 64 7 66 6" stroke="#FF5A36" stroke-width="2.2" stroke-linecap="round"/></svg>
</div>
<div style="text-align:center; margin:22px 0 26px 0;">
  <h3 style="color:#0F2444; font-size:18px; font-weight:800; margin:0 0 12px 0; letter-spacing:-0.3px;">We're curious</h3>
  <p style="color:#64748B; font-size:14.5px; line-height:1.8; margin:0;">
    <strong style="color:#FF5A36;">1 -</strong> Why do you like what we do?<br>
    <strong style="color:#FF5A36;">2 -</strong> How can we make it better?
  </p>
</div>
<div style="text-align:center; margin:28px 0;"><a href="https://rerendet-farm.vercel.app/#coffee-shop" style="background:#FF5A36; color:#FFFFFF !important; padding:15px 38px; border-radius:9999px; text-decoration:none; font-weight:700; font-size:14.5px; display:inline-block; box-shadow:0 10px 24px rgba(255,90,54,0.28);">Take Rerendet Survey! →</a></div>`,
    },
    {
        id: 'new_arrival',
        label: '☕ New Arrival',
        subject: '✨ New Single-Origin Roast Just Landed — Try It First!',
        content: `<h2 style="color:#0F2444; font-size:28px; font-weight:800; margin:0 0 14px 0; text-align:center; letter-spacing:-0.5px;">Something Special Just Arrived ☕</h2>
<p style="color:#64748B; font-size:14.5px; line-height:1.65; text-align:center; margin:0 auto 20px auto; max-width:440px;">We are thrilled to unveil our latest harvest lot — hand-picked in the highlands of Bomet County, Kenya and freshly roasted in micro-batches for peak cup aroma.</p>
<div style="text-align:center; margin:22px auto 26px auto;">
  <svg width="68" height="12" viewBox="0 0 68 12" fill="none" style="display:inline-block;"><path d="M2 6C12 2 18 10 28 6C38 2 44 10 54 6C59 4 64 7 66 6" stroke="#FF5A36" stroke-width="2.2" stroke-linecap="round"/></svg>
</div>
<div style="text-align:center; margin:28px 0;"><a href="https://rerendet-farm.vercel.app/#coffee-shop" style="background:#FF5A36; color:#FFFFFF !important; padding:15px 38px; border-radius:9999px; text-decoration:none; font-weight:700; font-size:14.5px; display:inline-block; box-shadow:0 10px 24px rgba(255,90,54,0.28);">Explore New Roast →</a></div>
<p style="color:#94A3B8; font-size:13px; text-align:center; margin-top:20px;">Roasted fresh to order • Estate direct from Kenya</p>`,
    },
    {
        id: 'promotion',
        label: '🏷️ Special Offer',
        subject: '🎁 Exclusive Member Savings — Limited Time Only!',
        content: `<h2 style="color:#0F2444; font-size:28px; font-weight:800; margin:0 0 14px 0; text-align:center; letter-spacing:-0.5px;">A Private Reward Just For You 🎁</h2>
<p style="color:#64748B; font-size:14.5px; line-height:1.65; text-align:center; margin:0 auto 20px auto; max-width:440px;">As a valued subscriber of the Rerendet coffee family, we would love to treat you to special savings on our reserve single-origin roasts this week.</p>
<div style="text-align:center; margin:22px auto 26px auto;">
  <svg width="68" height="12" viewBox="0 0 68 12" fill="none" style="display:inline-block;"><path d="M2 6C12 2 18 10 28 6C38 2 44 10 54 6C59 4 64 7 66 6" stroke="#FF5A36" stroke-width="2.2" stroke-linecap="round"/></svg>
</div>
<div style="text-align:center; margin:28px 0;"><a href="https://rerendet-farm.vercel.app/#coffee-shop" style="background:#FF5A36; color:#FFFFFF !important; padding:15px 38px; border-radius:9999px; text-decoration:none; font-weight:700; font-size:14.5px; display:inline-block; box-shadow:0 10px 24px rgba(255,90,54,0.28);">Claim Your Offer →</a></div>
<p style="color:#94A3B8; font-size:13px; text-align:center; margin-top:20px;">Valid while small batch reserve supplies last.</p>`,
    },
    {
        id: 'story',
        label: '📖 Estate Story',
        subject: '🌱 From High Altitude to Your Morning Cup',
        content: `<h2 style="color:#0F2444; font-size:28px; font-weight:800; margin:0 0 14px 0; text-align:center; letter-spacing:-0.5px;">The Journey to Peak Cup 🌱</h2>
<p style="color:#64748B; font-size:14.5px; line-height:1.65; text-align:center; margin:0 auto 20px auto; max-width:440px;">Every bag of Rerendet carries a story — rich volcanic soils, gentle mountain rains, and generations of harvesting mastery in the heart of Kenya's Great Rift Valley.</p>
<div style="text-align:center; margin:22px auto 26px auto;">
  <svg width="68" height="12" viewBox="0 0 68 12" fill="none" style="display:inline-block;"><path d="M2 6C12 2 18 10 28 6C38 2 44 10 54 6C59 4 64 7 66 6" stroke="#FF5A36" stroke-width="2.2" stroke-linecap="round"/></svg>
</div>
<div style="text-align:center; margin:28px 0;"><a href="https://rerendet-farm.vercel.app/about" style="background:#FF5A36; color:#FFFFFF !important; padding:15px 38px; border-radius:9999px; text-decoration:none; font-weight:700; font-size:14.5px; display:inline-block; box-shadow:0 10px 24px rgba(255,90,54,0.28);">Discover Our Story →</a></div>
<p style="color:#94A3B8; font-size:13px; text-align:center; margin-top:20px;">Thank you for brewing with us.</p>`,
    },
    {
        id: 'blank',
        label: '📝 Blank Slate',
        subject: '',
        content: '',
    },
];

// ─── Tab Nav ─────────────────────────────────────────────────────
const TABS = [
    { id: 'compose', label: 'Campaign Studio', icon: <FaEdit /> },
    { id: 'subscribers', label: 'Audience & Subscribers', icon: <FaUsers /> },
    { id: 'testimonials', label: 'Storefront Testimonials', icon: <FaStar /> },
];

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const Marketing = () => {
    const { token, showNotification } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('compose');
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [subFilter, setSubFilter] = useState('all');
    const [subPage, setSubPage] = useState(1);
    const SUB_PER_PAGE = 12;

    // Testimonials State
    const [testimonials, setTestimonials] = useState([]);
    const [testimonialsLoading, setTestimonialsLoading] = useState(false);
    const [testimonialSearch, setTestimonialSearch] = useState('');
    const [testimonialFilter, setTestimonialFilter] = useState('all');
    const [editingTestimonial, setEditingTestimonial] = useState(null);
    const [testimonialModalOpen, setTestimonialModalOpen] = useState(false);
    const [savingTestimonial, setSavingTestimonial] = useState(false);

    const [formData, setFormData] = useState({ subject: '', content: '' });
    const [blocks, setBlocks] = useState([
        { id: Date.now().toString(), type: 'h2', content: 'Hello Coffee Lovers ☕' },
        { id: (Date.now() + 1).toString(), type: 'p', content: 'We have exciting harvest news to share with you from the estate...' },
    ]);
    const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'html'

    // Sync HTML content from blocks when they change (matches new clean email standard)
    useEffect(() => {
        if (editorMode === 'visual') {
            const html = blocks.map(b => {
                if (b.type === 'h2') return `<h2 style="color:#0F2444; font-size:28px; font-weight:800; margin:0 0 14px 0; text-align:center; letter-spacing:-0.5px;">${b.content}</h2>`;
                if (b.type === 'p') return `<p style="margin:0 0 16px 0; line-height:1.7; color:#64748B; font-size:14.5px; text-align:center;">${b.content}</p>`;
                if (b.type === 'image') return `<div style="text-align:center; margin:20px 0;"><img src="${b.url}" alt="Marketing" style="max-width:100%; border-radius:18px; box-shadow:0 10px 30px rgba(15,23,42,0.06);"/></div>`;
                if (b.type === 'button') return `<div style="text-align:center; margin:26px 0;"><a href="${b.url}" style="background:#FF5A36; color:#FFFFFF !important; padding:15px 38px; border-radius:9999px; text-decoration:none; font-weight:700; font-size:14.5px; display:inline-block; box-shadow:0 10px 24px rgba(255,90,54,0.28);">${b.label || 'Explore Now'} →</a></div>`;
                return '';
            }).join('\n');
            setFormData(prev => ({ ...prev, content: html }));
        }
    }, [blocks, editorMode]);

    useEffect(() => { fetchSubscribers(); }, [token]);

    const fetchSubscribers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/subscribers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setSubscribers(data.data || []);
        } catch {
            showNotification('Failed to load subscribers', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── Testimonials Fetch & Actions ──
    const fetchTestimonials = async () => {
        try {
            setTestimonialsLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/marketing/testimonials`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setTestimonials(data.data || []);
        } catch {
            showNotification('Failed to load testimonials', 'error');
        } finally {
            setTestimonialsLoading(false);
        }
    };

    useEffect(() => {
        if (token && (activeTab === 'testimonials' || testimonials.length === 0)) {
            fetchTestimonials();
        }
    }, [token, activeTab]);

    const handleSaveTestimonial = async (e) => {
        e.preventDefault();
        if (!editingTestimonial?.author?.trim() || !editingTestimonial?.text?.trim()) {
            showNotification('Author name and testimonial text are required', 'warning');
            return;
        }

        try {
            setSavingTestimonial(true);
            const isNew = !editingTestimonial._id;
            const url = isNew
                ? `${import.meta.env.VITE_API_URL || '/api'}/marketing/testimonials`
                : `${import.meta.env.VITE_API_URL || '/api'}/marketing/testimonials/${editingTestimonial._id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editingTestimonial)
            });

            const data = await res.json();
            if (data.success) {
                showNotification(isNew ? 'Testimonial added to storefront!' : 'Testimonial updated!', 'success');
                setTestimonialModalOpen(false);
                setEditingTestimonial(null);
                fetchTestimonials();
            } else {
                showNotification(data.message || 'Failed to save testimonial', 'error');
            }
        } catch (err) {
            showNotification(err.message || 'Error saving testimonial', 'error');
        } finally {
            setSavingTestimonial(false);
        }
    };

    const handleToggleTestimonial = async (id) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/marketing/testimonials/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showNotification(data.message, 'success');
                setTestimonials(prev => prev.map(t => t._id === id ? { ...t, isActive: !t.isActive } : t));
            } else {
                showNotification(data.message || 'Failed to toggle status', 'error');
            }
        } catch {
            showNotification('Failed to update testimonial status', 'error');
        }
    };

    const handleDeleteTestimonial = async (id, author) => {
        if (!window.confirm(`Are you sure you want to permanently delete the testimonial from "${author}"?`)) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/marketing/testimonials/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showNotification('Testimonial removed', 'success');
                setTestimonials(prev => prev.filter(t => t._id !== id));
            } else {
                showNotification(data.message || 'Failed to delete', 'error');
            }
        } catch {
            showNotification('Failed to delete testimonial', 'error');
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!formData.subject.trim() || !formData.content.trim()) {
            showNotification('Please fill in both subject and content', 'error');
            return;
        }
        const activeCount = subscribers.filter(s => s.isSubscribed !== false).length;
        if (!window.confirm(`Send this newsletter to ${activeCount} active subscribers?`)) return;

        setSending(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/subscribers/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                showNotification(data.message || 'Newsletter sent!', 'success');
                setFormData({ subject: '', content: '' });
            } else {
                showNotification(data.message || 'Failed to send', 'error');
            }
        } catch {
            showNotification('Failed to send newsletter', 'error');
        } finally {
            setSending(false);
        }
    };

    const applyTemplate = (template) => {
        setFormData({ subject: template.subject, content: template.content });
        // Attempt to parse blocks from template if it's a simple one, otherwise switch to HTML mode
        setEditorMode('html');
        showNotification(`Template "${template.label}" applied (HTML mode)`, 'success');
    };

    const addBlock = (type) => {
        const newBlock = {
            id: Date.now().toString(),
            type,
            content: type === 'h2' ? 'New Heading' : type === 'p' ? 'New Paragraph' : '',
            url: type === 'image' ? 'https://res.cloudinary.com/dln2pifwf/image/upload/v1740697960/coffee-placeholder.jpg' : type === 'button' ? 'https://rerendet.com/shop' : '',
            label: type === 'button' ? 'Click Here' : ''
        };
        setBlocks(prev => [...prev, newBlock]);
        setEditorMode('visual');
    };

    const updateBlock = (id, field, value) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const removeBlock = (id) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    };

    const moveBlock = (index, direction) => {
        const newBlocks = [...blocks];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newBlocks.length) return;
        [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
        setBlocks(newBlocks);
    };

    // ── Subscriber list ──
    const activeCount = subscribers.filter(s => s.isSubscribed !== false).length;
    const inactiveCount = subscribers.filter(s => s.isSubscribed === false).length;

    const filtered = subscribers.filter(s => {
        const matchSearch = !searchTerm ||
            s.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilter =
            subFilter === 'all' ? true :
                subFilter === 'active' ? s.isSubscribed !== false :
                    s.isSubscribed === false;
        return matchSearch && matchFilter;
    });

    const totalPages = Math.ceil(filtered.length / SUB_PER_PAGE);
    const paginated = filtered.slice((subPage - 1) * SUB_PER_PAGE, subPage * SUB_PER_PAGE);

    // ── Testimonials list ──
    const filteredTestimonials = testimonials.filter(t => {
        const matchSearch = !testimonialSearch ||
            t.author?.toLowerCase().includes(testimonialSearch.toLowerCase()) ||
            t.role?.toLowerCase().includes(testimonialSearch.toLowerCase()) ||
            t.text?.toLowerCase().includes(testimonialSearch.toLowerCase());
        const matchFilter =
            testimonialFilter === 'all' ? true :
                testimonialFilter === 'active' ? t.isActive :
                    !t.isActive;
        return matchSearch && matchFilter;
    });

    const liveTestimonialsCount = testimonials.filter(t => t.isActive).length;
    const fiveStarCount = testimonials.filter(t => (t.rating || 5) === 5).length;
    const draftCount = testimonials.filter(t => !t.isActive).length;

    const STATS = activeTab === 'testimonials' ? [
        { icon: <FaStar />, label: 'Total Quotes', value: testimonials.length, color: '#D4AF37' },
        { icon: <FaCheckCircle />, label: 'Live on Storefront', value: liveTestimonialsCount, color: '#10b981' },
        { icon: <FaStar />, label: '5-Star Reviews', value: fiveStarCount, color: '#f59e0b' },
        { icon: <FaToggleOff />, label: 'Hidden / Drafts', value: draftCount, color: '#6b7280' },
    ] : [
        { icon: <FaUsers />, label: 'Total Subscribers', value: subscribers.length, color: '#3b82f6' },
        { icon: <FaToggleOn />, label: 'Active', value: activeCount, color: '#10b981' },
        { icon: <FaToggleOff />, label: 'Unsubscribed', value: inactiveCount, color: '#6b7280' },
        { icon: <FaBullhorn />, label: 'Ready to Broadcast', value: activeCount, color: '#D4AF37' },
    ];

    return (
        <div className="mk-dashboard">
            {/* ── Stats Row ── */}
            <div className="mk-stats-row">
                {STATS.map((s, i) => (
                    <motion.div
                        key={i}
                        className="mk-stat-card"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                    >
                        <div className="mk-stat-icon" style={{ background: `${s.color}1a`, color: s.color }}>{s.icon}</div>
                        <div>
                            <p className="mk-stat-value">{loading ? '—' : s.value}</p>
                            <p className="mk-stat-label">{s.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Tab Nav ── */}
            <div className="mk-tab-nav">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`mk-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">

                {/* ═══ COMPOSE TAB ═══ */}
                {activeTab === 'compose' && (
                    <motion.div
                        key="compose"
                        className="mk-compose-layout"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* ── Left: Compose Form ── */}
                        <div className="mk-compose-form-panel">
                            <div className="mk-panel-header">
                                <div>
                                    <div className="mk-audience-pill">
                                        <span className="mk-live-dot" />
                                        <span>Live Audience: <strong>{activeCount} Subscribers</strong></span>
                                    </div>
                                    <h2 className="mk-panel-title">
                                        <FaEdit /> Broadcast Studio
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    className={`mk-preview-toggle ${showPreview ? 'active' : ''}`}
                                    onClick={() => setShowPreview(p => !p)}
                                >
                                    <FaEye /> {showPreview ? 'Hide Preview' : 'Live Email Preview'}
                                </button>
                            </div>

                            {/* Templates */}
                            <div className="mk-templates-section">
                                <p className="mk-templates-label"><FaMagic /> Quick Campaign Starters</p>
                                <div className="mk-template-pills">
                                    {EMAIL_TEMPLATES.map(t => (
                                        <button key={t.id} type="button" className="mk-template-pill" onClick={() => applyTemplate(t)}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleSend} className="mk-form">
                                <div className="mk-field">
                                    <label>Campaign Subject Line <span className="mk-req">*</span></label>
                                    <div className="mk-subject-input-wrap">
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                                            placeholder="e.g. ✨ New Single Origin Harvest Just Landed!"
                                            maxLength={120}
                                            required
                                        />
                                        <span className="mk-char-count">{formData.subject.length}/120</span>
                                    </div>
                                    <span className="mk-field-hint">Engaging subjects under 50 characters achieve the highest open rates.</span>
                                </div>

                                <div className="mk-field">
                                    <div className="mk-field-header-row">
                                        <label>Email Message Content <span className="mk-req">*</span></label>
                                        <div className="mk-editor-toggle">
                                            <button type="button" className={editorMode === 'visual' ? 'active' : ''} onClick={() => setEditorMode('visual')}>Visual Builder</button>
                                            <button type="button" className={editorMode === 'html' ? 'active' : ''} onClick={() => setEditorMode('html')}>HTML Source</button>
                                        </div>
                                    </div>

                                    {editorMode === 'visual' ? (
                                        <div className="mk-visual-editor">
                                            <div className="mk-blocks-list">
                                                {blocks.map((block, index) => (
                                                    <div key={block.id} className="mk-block-item">
                                                        <div className="mk-block-sidebar">
                                                            <div className="mk-block-type-icon">
                                                                {block.type === 'h2' && <FaHeading />}
                                                                {block.type === 'p' && <FaParagraph />}
                                                                {block.type === 'button' && <FaLink />}
                                                                {block.type === 'image' && <FaImage />}
                                                            </div>
                                                            <div className="mk-block-movers">
                                                                <button type="button" onClick={() => moveBlock(index, 'up')} disabled={index === 0}>▲</button>
                                                                <button type="button" onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1}>▼</button>
                                                            </div>
                                                        </div>
                                                        <div className="mk-block-main">
                                                            {block.type === 'h2' && (
                                                                <input
                                                                    className="mk-input-h2"
                                                                    value={block.content}
                                                                    onChange={e => updateBlock(block.id, 'content', e.target.value)}
                                                                    placeholder="Enter headline..."
                                                                />
                                                            )}
                                                            {block.type === 'p' && (
                                                                <textarea
                                                                    className="mk-input-p"
                                                                    value={block.content}
                                                                    onChange={e => updateBlock(block.id, 'content', e.target.value)}
                                                                    placeholder="Enter paragraph message..."
                                                                    rows={3}
                                                                />
                                                            )}
                                                            {block.type === 'button' && (
                                                                <div className="mk-input-group">
                                                                    <input
                                                                        value={block.label}
                                                                        onChange={e => updateBlock(block.id, 'label', e.target.value)}
                                                                        placeholder="Button Label (e.g. Shop Now)"
                                                                    />
                                                                    <input
                                                                        value={block.url}
                                                                        onChange={e => updateBlock(block.id, 'url', e.target.value)}
                                                                        placeholder="Link URL (e.g. https://...)"
                                                                    />
                                                                </div>
                                                            )}
                                                            {block.type === 'image' && (
                                                                <div className="mk-input-group">
                                                                    <input
                                                                        value={block.url}
                                                                        onChange={e => updateBlock(block.id, 'url', e.target.value)}
                                                                        placeholder="Image URL"
                                                                    />
                                                                    {block.url && <img src={block.url} alt="preview" className="mk-block-img-preview" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button type="button" className="mk-block-delete" title="Delete Block" onClick={() => removeBlock(block.id)}>
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mk-add-block-toolbar">
                                                <span className="mk-add-tag"><FaPlus /> Add Element:</span>
                                                <button type="button" onClick={() => addBlock('h2')}><FaHeading /> Heading</button>
                                                <button type="button" onClick={() => addBlock('p')}><FaParagraph /> Text</button>
                                                <button type="button" onClick={() => addBlock('button')}><FaLink /> Pill Button</button>
                                                <button type="button" onClick={() => addBlock('image')}><FaImage /> Image</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <textarea
                                            className="mk-content-textarea"
                                            value={formData.content}
                                            onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
                                            placeholder={`<h2>Hello Coffee Lovers ☕</h2>\n<p>Write your message here...</p>`}
                                            rows={14}
                                            required
                                        />
                                    )}
                                    <span className="mk-field-hint">
                                        {editorMode === 'visual'
                                            ? "Visual Builder creates clean, centered quiet-luxury email blocks automatically."
                                            : "Direct HTML editor. Formatted with inline styles for cross-client compatibility."}
                                    </span>
                                </div>

                                <div className="mk-form-footer">
                                    <button
                                        type="button"
                                        className="mk-clear-btn"
                                        onClick={() => setFormData({ subject: '', content: '' })}
                                        disabled={sending || (!formData.subject && !formData.content)}
                                    >
                                        <FaTimes /> Clear Draft
                                    </button>
                                    <button
                                        type="submit"
                                        className="mk-send-btn"
                                        disabled={sending || activeCount === 0}
                                    >
                                        {sending ? (
                                            <span className="mk-sending">
                                                <span className="mk-dot-ring" /> Sending to {activeCount} subscribers…
                                            </span>
                                        ) : (
                                            <><FaPaperPlane /> Send Broadcast ({activeCount})</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* ── Right: Modern Live Email Preview ── */}
                        <AnimatePresence>
                            {showPreview && (
                                <motion.div
                                    className="mk-preview-panel"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <div className="mk-panel-header">
                                        <div className="mk-panel-title"><FaEye /> Live Subscriber Preview</div>
                                        <button className="mk-preview-close-btn" onClick={() => setShowPreview(false)}>
                                            <FaTimes />
                                        </button>
                                    </div>

                                    <div className="mk-email-mockup">
                                        {/* Browser/Client Header */}
                                        <div className="mk-email-client-bar">
                                            <div className="mk-client-dots">
                                                <span className="mk-client-dot red" />
                                                <span className="mk-client-dot yellow" />
                                                <span className="mk-client-dot green" />
                                            </div>
                                            <span className="mk-client-url">mail.rerendetcoffee.com</span>
                                        </div>

                                        {/* Email Envelope Meta */}
                                        <div className="mk-email-header">
                                            <div className="mk-email-from">
                                                <div className="mk-email-avatar">☕</div>
                                                <div>
                                                    <strong>Rerendet Coffee</strong>
                                                    <span>newsletter@rerendetcoffee.com</span>
                                                </div>
                                            </div>
                                            <div className="mk-email-subject-preview">
                                                <span className="mk-sub-label">Subject:</span>
                                                <strong>{formData.subject || '✨ Your newsletter subject appears here…'}</strong>
                                            </div>
                                        </div>

                                        {/* Modern Card Body Preview */}
                                        <div className="mk-email-card-outer">
                                            <div className="mk-email-card-inner">
                                                <div className="mk-email-brand-top">
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                            <circle cx="7" cy="7" r="3.8" fill="#FF5A36"/>
                                                            <circle cx="17" cy="7" r="3.8" fill="#0F2444"/>
                                                            <circle cx="7" cy="17" r="3.8" fill="#3B82F6"/>
                                                            <circle cx="17" cy="17" r="3.8" fill="#FF5A36"/>
                                                        </svg>
                                                        <span className="mk-email-logo-text" style={{ fontSize: '18px', fontWeight: 800, color: '#0F2444', letterSpacing: '-0.3px' }}>
                                                            Rerendet<span style={{ color: '#FF5A36' }}>.</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hero Illustration Area matching User Reference */}
                                                <div style={{ textAlign: 'center', margin: '6px 0 16px' }}>
                                                    <svg width="190" height="110" viewBox="0 0 220 130" fill="none" style={{ maxWidth: '100%' }}>
                                                        <path d="M40 75C26 75 16 64 18 51C20 38 36 32 47 34C54 19 75 15 93 18C109 10 135 12 147 23C161 21 180 27 185 40C192 47 194 58 187 67C194 73 190 86 176 90C164 97 150 93 143 88C131 99 105 102 88 95C74 101 53 97 44 88C41 85 40 80 40 75Z" fill="#EEF3FA"/>
                                                        <path d="M125 40C146 33 166 45 186 38" stroke="#FF5A36" strokeWidth="2" strokeLinecap="round"/>
                                                        <path d="M128 56C148 51 168 62 188 55" stroke="#FF5A36" strokeWidth="2" strokeLinecap="round"/>
                                                        <circle cx="168" cy="28" r="2.5" fill="#FF5A36"/>
                                                        <circle cx="186" cy="46" r="2" fill="#3B82F6"/>
                                                        <g transform="translate(56, 24)">
                                                            <path d="M44 18L18 34H8C5.8 34 4 35.8 4 38V44C4 46.2 5.8 48 8 48H18L44 64V18Z" fill="#FFFFFF" stroke="#0F2444" strokeWidth="2.5" strokeLinejoin="round"/>
                                                            <ellipse cx="44" cy="41" rx="6" ry="22" fill="#FFF1EE" stroke="#0F2444" strokeWidth="2.5"/>
                                                            <path d="M14 48L17 66C17.5 69 20 71 23 70.5L27 69.8C29.8 69.3 31.5 66.5 30.8 63.7L28 48" fill="#FFFFFF" stroke="#0F2444" strokeWidth="2.5" strokeLinejoin="round"/>
                                                        </g>
                                                    </svg>
                                                </div>

                                                <div className="mk-email-body-content">
                                                    {formData.content ? (
                                                        <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                                                    ) : (
                                                        <div className="mk-preview-empty">
                                                            <FaEnvelope />
                                                            <p>Type your message or pick a starter template to preview</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mk-email-flourish-wrap">
                                                    <svg width="68" height="12" viewBox="0 0 68 12" fill="none">
                                                        <path d="M2 6C12 2 18 10 28 6C38 2 44 10 54 6C59 4 64 7 66 6" stroke="#FF5A36" strokeWidth="2.2" strokeLinecap="round"/>
                                                    </svg>
                                                </div>

                                                {/* Email Footer Preview matching reference image */}
                                                <div className="mk-email-footer-preview">
                                                    <div className="mk-social-preview-pills">
                                                        <span className="mk-social-circ fb">f</span>
                                                        <span className="mk-social-circ tw">𝕏</span>
                                                        <span className="mk-social-circ ig">📷</span>
                                                        <span className="mk-social-circ in">in</span>
                                                    </div>
                                                    <p className="mk-footer-links">
                                                        <a href="#">Track Order</a> • <a href="#">Privacy</a> • <a href="#">Unsubscribe</a>
                                                    </p>
                                                    <p className="mk-footer-copy">
                                                        &copy; {new Date().getFullYear()} Rerendet Coffee Estate • Bomet County, Kenya
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ═══ SUBSCRIBERS TAB ═══ */}
                {activeTab === 'subscribers' && (
                    <motion.div
                        key="subscribers"
                        className="mk-subscribers-panel"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Toolbar */}
                        <div className="mk-sub-toolbar">
                            <div className="mk-sub-search">
                                <FaSearch className="mk-sub-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search email…"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setSubPage(1); }}
                                />
                                {searchTerm && (
                                    <button className="mk-sub-clear" onClick={() => setSearchTerm('')}><FaTimes /></button>
                                )}
                            </div>

                            <div className="mk-sub-filter-pills">
                                {[
                                    { value: 'all', label: 'All', count: subscribers.length },
                                    { value: 'active', label: 'Active', count: activeCount },
                                    { value: 'inactive', label: 'Unsubscribed', count: inactiveCount },
                                ].map(f => (
                                    <button
                                        key={f.value}
                                        className={`mk-sub-pill ${subFilter === f.value ? 'active' : ''}`}
                                        onClick={() => { setSubFilter(f.value); setSubPage(1); }}
                                    >
                                        {f.label}
                                        {f.count > 0 && <span className="mk-sub-count">{f.count}</span>}
                                    </button>
                                ))}
                            </div>

                            <button className="mk-sub-refresh" onClick={fetchSubscribers} disabled={loading}>
                                <FaSync className={loading ? 'mk-spin' : ''} />
                            </button>
                        </div>

                        {/* Table */}
                        <div className="mk-sub-table-wrap">
                            {loading ? (
                                <div className="mk-loading">
                                    <div className="mk-spinner" />
                                    <p>Loading subscribers…</p>
                                </div>
                            ) : (
                                <table className="mk-sub-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Email Address</th>
                                            <th>Status</th>
                                            <th>Subscribed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="mk-empty-row">
                                                    <div className="mk-empty">
                                                        <FaUsers />
                                                        <p>{searchTerm ? `No results for "${searchTerm}"` : 'No subscribers yet'}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : paginated.map((sub, i) => (
                                            <motion.tr
                                                key={sub._id}
                                                className="mk-sub-row"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: i * 0.02 }}
                                            >
                                                <td className="mk-sub-num">{(subPage - 1) * SUB_PER_PAGE + i + 1}</td>
                                                <td>
                                                    <div className="mk-sub-email-cell">
                                                        <div className="mk-sub-avatar">{(sub.email?.[0] || '?').toUpperCase()}</div>
                                                        <span>{sub.email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`mk-sub-status ${sub.isSubscribed !== false ? 'active' : 'inactive'}`}>
                                                        {sub.isSubscribed !== false
                                                            ? <><FaCheckCircle /> Active</>
                                                            : <><FaTimes /> Unsubscribed</>}
                                                    </span>
                                                </td>
                                                <td className="mk-sub-date">{formatDate(sub.subscribedAt || sub.createdAt)}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mk-sub-pagination">
                                <button disabled={subPage === 1} onClick={() => setSubPage(p => p - 1)}>
                                    <FaChevronLeft />
                                </button>
                                <span>Page {subPage} of {totalPages} · {filtered.length} subscribers</span>
                                <button disabled={subPage === totalPages} onClick={() => setSubPage(p => p + 1)}>
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ═══ TESTIMONIALS TAB ═══ */}
                {activeTab === 'testimonials' && (
                    <motion.div
                        key="testimonials"
                        className="mk-testimonials-view"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Toolbar */}
                        <div className="mk-sub-toolbar" style={{ borderRadius: 'var(--radius-xl)' }}>
                            <div className="mk-sub-search">
                                <FaSearch className="mk-sub-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search testimonials by customer name, role, or text…"
                                    value={testimonialSearch}
                                    onChange={(e) => setTestimonialSearch(e.target.value)}
                                />
                                {testimonialSearch && (
                                    <button className="mk-sub-clear" onClick={() => setTestimonialSearch('')}>
                                        <FaTimes />
                                    </button>
                                )}
                            </div>

                            <div className="mk-sub-filter-pills">
                                {[
                                    { value: 'all', label: 'All Quotes', count: testimonials.length },
                                    { value: 'active', label: 'Live on Storefront', count: liveTestimonialsCount },
                                    { value: 'inactive', label: 'Hidden / Drafts', count: draftCount },
                                ].map(f => (
                                    <button
                                        key={f.value}
                                        className={`mk-sub-pill ${testimonialFilter === f.value ? 'active' : ''}`}
                                        onClick={() => setTestimonialFilter(f.value)}
                                    >
                                        {f.label}
                                        {f.count > 0 && <span className="mk-sub-count">{f.count}</span>}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginLeft: 'auto' }}>
                                <button
                                    className="mk-sub-refresh"
                                    onClick={fetchTestimonials}
                                    disabled={testimonialsLoading}
                                    title="Refresh testimonials"
                                >
                                    <FaSync className={testimonialsLoading ? 'mk-spin' : ''} />
                                </button>

                                <button
                                    className="mk-btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem' }}
                                    onClick={() => {
                                        setEditingTestimonial({
                                            author: '',
                                            role: 'Verified Buyer',
                                            rating: 5,
                                            text: '',
                                            isActive: true,
                                        });
                                        setTestimonialModalOpen(true);
                                    }}
                                >
                                    <FaPlus /> Add Testimonial
                                </button>
                            </div>
                        </div>

                        {/* Testimonials Grid or Empty */}
                        {testimonialsLoading ? (
                            <div className="mk-loading" style={{ padding: '3.5rem 1rem' }}>
                                <div className="mk-spinner" />
                                <p>Loading storefront testimonials…</p>
                            </div>
                        ) : filteredTestimonials.length === 0 ? (
                            <div className="mk-empty-testimonials">
                                <FaStar className="mk-empty-icon" />
                                <h3>No testimonials found</h3>
                                <p>
                                    {testimonialSearch
                                        ? `No testimonials match "${testimonialSearch}". Try adjusting your query.`
                                        : 'No storefront testimonials configured yet. Click "+ Add Testimonial" to create your first one!'}
                                </p>
                                <button
                                    className="mk-btn-primary"
                                    style={{ marginTop: '0.5rem' }}
                                    onClick={() => {
                                        setEditingTestimonial({
                                            author: '',
                                            role: 'Verified Buyer',
                                            rating: 5,
                                            text: '',
                                            isActive: true,
                                        });
                                        setTestimonialModalOpen(true);
                                    }}
                                >
                                    <FaPlus /> Add Testimonial
                                </button>
                            </div>
                        ) : (
                            <div className="mk-testimonials-grid">
                                {filteredTestimonials.map(t => (
                                    <motion.div
                                        key={t._id}
                                        className={`mk-testimonial-card ${!t.isActive ? 'inactive' : ''}`}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        layout
                                    >
                                        {/* Header: Stars & Status */}
                                        <div className="mk-tm-header">
                                            <div className="mk-tm-stars">
                                                {[...Array(5)].map((_, i) => (
                                                    <FaStar
                                                        key={i}
                                                        className={i < (t.rating || 5) ? 'star-filled' : 'star-empty'}
                                                    />
                                                ))}
                                                <span className="mk-tm-rating-num">{(t.rating || 5).toFixed(1)}</span>
                                            </div>

                                            <div className="mk-tm-status-wrap">
                                                <span className={`mk-tm-status-pill ${t.isActive ? 'live' : 'draft'}`}>
                                                    {t.isActive ? 'Live' : 'Hidden'}
                                                </span>
                                                <button
                                                    className={`mk-tm-toggle-btn ${t.isActive ? 'on' : 'off'}`}
                                                    onClick={() => handleToggleTestimonial(t._id)}
                                                    title={t.isActive ? 'Click to hide from storefront' : 'Click to display on storefront'}
                                                >
                                                    {t.isActive ? <FaToggleOn /> : <FaToggleOff />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Body / Quote */}
                                        <p className="mk-tm-body">"{t.text}"</p>

                                        {/* Footer: Author & Actions */}
                                        <div className="mk-tm-footer">
                                            <div className="mk-tm-author-info">
                                                <div className="mk-tm-avatar">
                                                    {(t.author?.[0] || 'C').toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="mk-tm-author-name">{t.author}</span>
                                                    <span className="mk-tm-author-role">{t.role || 'Verified Buyer'}</span>
                                                </div>
                                            </div>

                                            <div className="mk-tm-actions">
                                                <button
                                                    className="mk-tm-action-btn edit"
                                                    onClick={() => {
                                                        setEditingTestimonial({ ...t });
                                                        setTestimonialModalOpen(true);
                                                    }}
                                                    title="Edit Testimonial"
                                                >
                                                    <FaEdit /> Edit
                                                </button>
                                                <button
                                                    className="mk-tm-action-btn delete"
                                                    onClick={() => handleDeleteTestimonial(t._id, t.author)}
                                                    title="Delete Testimonial"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ ADD / EDIT TESTIMONIAL MODAL ═══ */}
            {testimonialModalOpen && (
                <div className="mk-modal-backdrop" onClick={() => !savingTestimonial && setTestimonialModalOpen(false)}>
                    <motion.div
                        className="mk-modal-dialog"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mk-modal-header">
                            <div>
                                <h3 className="mk-modal-title">
                                    {editingTestimonial?._id ? 'Edit Testimonial' : 'Add Storefront Testimonial'}
                                </h3>
                                <p className="mk-modal-subtitle">
                                    This quote appears in the interactive customer reviews carousel on the storefront.
                                </p>
                            </div>
                            <button
                                className="mk-modal-close"
                                onClick={() => !savingTestimonial && setTestimonialModalOpen(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTestimonial} className="mk-modal-form">
                            <div className="mk-form-grid">
                                <div className="mk-field">
                                    <label>Customer Name <span className="req">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. David Mwangi"
                                        value={editingTestimonial?.author || ''}
                                        onChange={(e) => setEditingTestimonial(prev => ({ ...prev, author: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="mk-field">
                                    <label>Customer Title / Role</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Specialty Roaster, Verified Buyer"
                                        value={editingTestimonial?.role || ''}
                                        onChange={(e) => setEditingTestimonial(prev => ({ ...prev, role: e.target.value }))}
                                    />
                                    <div className="mk-role-chips">
                                        {['Verified Buyer', 'Coffee Enthusiast', 'Specialty Roaster', 'Cafe Owner', 'Barista', 'Club Member'].map(chip => (
                                            <button
                                                type="button"
                                                key={chip}
                                                className={`mk-role-chip ${editingTestimonial?.role === chip ? 'active' : ''}`}
                                                onClick={() => setEditingTestimonial(prev => ({ ...prev, role: chip }))}
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mk-form-grid" style={{ alignItems: 'center' }}>
                                <div className="mk-field">
                                    <label>Star Rating</label>
                                    <div className="mk-star-selector">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                type="button"
                                                key={star}
                                                className={`mk-star-btn ${(editingTestimonial?.rating || 5) >= star ? 'active' : ''}`}
                                                onClick={() => setEditingTestimonial(prev => ({ ...prev, rating: star }))}
                                            >
                                                <FaStar />
                                            </button>
                                        ))}
                                        <span className="mk-star-count-label">
                                            {editingTestimonial?.rating || 5} / 5 Stars
                                        </span>
                                    </div>
                                </div>

                                <div className="mk-field">
                                    <label>Storefront Display</label>
                                    <label className="mk-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={editingTestimonial?.isActive !== false}
                                            onChange={(e) => setEditingTestimonial(prev => ({ ...prev, isActive: e.target.checked }))}
                                        />
                                        <span>Live & Visible to Website Visitors</span>
                                    </label>
                                </div>
                            </div>

                            <div className="mk-field">
                                <label>Testimonial Quote <span className="req">*</span></label>
                                <textarea
                                    rows={3}
                                    placeholder="Share what the customer loved about Rerendet coffee, delivery, or service…"
                                    value={editingTestimonial?.text || ''}
                                    onChange={(e) => setEditingTestimonial(prev => ({ ...prev, text: e.target.value }))}
                                    required
                                />
                            </div>

                            {/* Live Preview Card */}
                            <div className="mk-preview-box">
                                <span className="mk-preview-badge">Live Storefront Card Preview</span>
                                <div className="mk-live-tm-preview">
                                    <div className="mk-preview-stars">
                                        {[...Array(5)].map((_, i) => (
                                            <FaStar
                                                key={i}
                                                className={i < (editingTestimonial?.rating || 5) ? 'star-filled' : 'star-empty'}
                                            />
                                        ))}
                                    </div>
                                    <p className="mk-preview-quote">
                                        "{editingTestimonial?.text?.trim() || 'Your customer review quote will display here...'}"
                                    </p>
                                    <div className="mk-preview-author">
                                        <strong>{editingTestimonial?.author?.trim() || 'Customer Name'}</strong>
                                        <span>{editingTestimonial?.role?.trim() || 'Verified Buyer'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mk-modal-footer">
                                <button
                                    type="button"
                                    className="mk-btn-secondary"
                                    onClick={() => setTestimonialModalOpen(false)}
                                    disabled={savingTestimonial}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="mk-btn-primary"
                                    disabled={savingTestimonial}
                                >
                                    {savingTestimonial ? 'Saving…' : (editingTestimonial?._id ? 'Update Testimonial' : 'Publish to Storefront')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Marketing;
