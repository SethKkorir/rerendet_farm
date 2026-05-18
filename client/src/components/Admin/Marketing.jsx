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
        id: 'new_arrival',
        label: '☕ New Arrival',
        subject: '✨ New Coffee Just Landed — Try It First!',
        content: `<h2 style="color:#D4AF37">Something New Just Arrived ☕</h2>
<p>Hello Coffee Lovers,</p>
<p>We're thrilled to announce the arrival of our latest coffee — hand-picked, expertly roasted, and ready to transform your morning ritual.</p>
<p>Visit our shop today and be among the first to experience this exceptional brew.</p>
<p style="text-align:center"><a href="https://rerendet.com/shop" style="background:#D4AF37;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Shop Now →</a></p>
<p>With love & great coffee,<br/><strong>The Rerendet Team</strong></p>`,
    },
    {
        id: 'promotion',
        label: '🏷️ Promotion',
        subject: '🔥 Exclusive Offer — Limited Time Only!',
        content: `<h2 style="color:#D4AF37">A Special Offer Just For You 🎁</h2>
<p>Hi there,</p>
<p>As a valued member of the Rerendet family, we want to treat you to something special. For a limited time, enjoy an exclusive discount on our premium blends.</p>
<p>Don't miss out — this offer expires soon!</p>
<p style="text-align:center"><a href="https://rerendet.com/shop" style="background:#D4AF37;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Claim Offer →</a></p>
<p>Thank you for being part of our story,<br/><strong>The Rerendet Team</strong></p>`,
    },
    {
        id: 'story',
        label: '📖 Brand Story',
        subject: '🌱 The Story Behind Your Cup',
        content: `<h2 style="color:#D4AF37">From Farm to Your Cup 🌱</h2>
<p>Dear Coffee Enthusiast,</p>
<p>Every cup of Rerendet coffee carries a story — of dedicated farmers, volcanic soils, and a passion for perfection. Today, we want to share a little of that story with you.</p>
<p>Our beans are sourced directly from the highlands of Kenya, where generations of expertise produce some of the world's most celebrated coffees.</p>
<p style="text-align:center"><a href="https://rerendet.com/about" style="background:#D4AF37;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Read Our Story →</a></p>
<p>With gratitude,<br/><strong>The Rerendet Team</strong></p>`,
    },
    {
        id: 'blank',
        label: '📝 Blank',
        subject: '',
        content: '',
    },
];

// ─── Tab Nav ─────────────────────────────────────────────────────
const TABS = [
    { id: 'compose', label: 'Compose', icon: <FaEdit /> },
    { id: 'subscribers', label: 'Subscribers', icon: <FaUsers /> },
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

    const [formData, setFormData] = useState({ subject: '', content: '' });
    const [blocks, setBlocks] = useState([
        { id: Date.now().toString(), type: 'h2', content: 'Hello Coffee Lovers ☕' },
        { id: (Date.now() + 1).toString(), type: 'p', content: 'Write your message here...' },
    ]);
    const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'html'

    // Sync HTML content from blocks when they change
    useEffect(() => {
        if (editorMode === 'visual') {
            const html = blocks.map(b => {
                if (b.type === 'h2') return `<h2 style="color:#D4AF37; margin-bottom: 15px;">${b.content}</h2>`;
                if (b.type === 'p') return `<p style="margin-bottom: 15px; line-height: 1.6;">${b.content}</p>`;
                if (b.type === 'image') return `<div style="text-align:center; margin: 20px 0;"><img src="${b.url}" alt="Marketing" style="max-width:100%; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/></div>`;
                if (b.type === 'button') return `<p style="text-align:center; margin: 25px 0;"><a href="${b.url}" style="background:#D4AF37; color:white; padding:14px 32px; border-radius:10px; text-decoration:none; font-weight:bold; display:inline-block; box-shadow: 0 4px 10px rgba(212,175,55,0.3);">${b.label} →</a></p>`;
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

    const STATS = [
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
                                <div className="mk-panel-title">
                                    <FaEdit /> Compose Newsletter
                                </div>
                                <button
                                    type="button"
                                    className={`mk-preview-toggle ${showPreview ? 'active' : ''}`}
                                    onClick={() => setShowPreview(p => !p)}
                                >
                                    <FaEye /> {showPreview ? 'Hide Preview' : 'Preview'}
                                </button>
                            </div>

                            {/* Templates */}
                            <div className="mk-templates-section">
                                <p className="mk-templates-label"><FaMagic /> Quick Templates</p>
                                <div className="mk-template-pills">
                                    {EMAIL_TEMPLATES.map(t => (
                                        <button key={t.id} className="mk-template-pill" onClick={() => applyTemplate(t)}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleSend} className="mk-form">
                                {/* Audience Banner */}
                                <div className="mk-audience-banner">
                                    <FaUsers />
                                    <span>Sending to <strong>{activeCount} active subscribers</strong></span>
                                    {activeCount === 0 && <span className="mk-no-sub-warning">⚠️ No active subscribers</span>}
                                </div>

                                <div className="mk-field">
                                    <label>Subject Line <span className="mk-req">*</span></label>
                                    <div className="mk-subject-input-wrap">
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                                            placeholder="e.g. ✨ New Single Origin from the Nyeri Highlands!"
                                            maxLength={120}
                                            required
                                        />
                                        <span className="mk-char-count">{formData.subject.length}/120</span>
                                    </div>
                                    <span className="mk-field-hint">Keep it under 50 characters for best open rates</span>
                                </div>

                                <div className="mk-field">
                                    <div className="mk-field-header-row">
                                        <label>Email Content <span className="mk-req">*</span></label>
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
                                                                    placeholder="Enter heading..."
                                                                />
                                                            )}
                                                            {block.type === 'p' && (
                                                                <textarea
                                                                    className="mk-input-p"
                                                                    value={block.content}
                                                                    onChange={e => updateBlock(block.id, 'content', e.target.value)}
                                                                    placeholder="Enter paragraph text..."
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
                                                                        placeholder="Link URL"
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
                                                        <button type="button" className="mk-block-delete" onClick={() => removeBlock(block.id)}>
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mk-add-block-toolbar">
                                                <span>Add Block:</span>
                                                <button type="button" onClick={() => addBlock('h2')}><FaHeading /> Heading</button>
                                                <button type="button" onClick={() => addBlock('p')}><FaParagraph /> Text</button>
                                                <button type="button" onClick={() => addBlock('button')}><FaLink /> Button</button>
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
                                            ? "Easily build your newsletter using content blocks. The system generates clean HTML for you."
                                            : "Advanced: Edit the HTML structure directly. Use inline styles for compatibility."}
                                    </span>
                                </div>

                                <div className="mk-form-footer">
                                    <button
                                        type="button"
                                        className="mk-clear-btn"
                                        onClick={() => setFormData({ subject: '', content: '' })}
                                        disabled={sending || (!formData.subject && !formData.content)}
                                    >
                                        <FaTimes /> Clear
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
                                            <><FaPaperPlane /> Send Broadcast</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* ── Right: Live Preview ── */}
                        <AnimatePresence>
                            {showPreview && (
                                <motion.div
                                    className="mk-preview-panel"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <div className="mk-panel-header">
                                        <div className="mk-panel-title"><FaEye /> Email Preview</div>
                                        <button className="mk-preview-close-btn" onClick={() => setShowPreview(false)}>
                                            <FaTimes />
                                        </button>
                                    </div>

                                    <div className="mk-email-mockup">
                                        {/* Email Client Header */}
                                        <div className="mk-email-client-bar">
                                            <span className="mk-client-dot red" />
                                            <span className="mk-client-dot yellow" />
                                            <span className="mk-client-dot green" />
                                            <span className="mk-client-url">rerendet.com newsletter</span>
                                        </div>

                                        {/* Email Header */}
                                        <div className="mk-email-header">
                                            <div className="mk-email-from">
                                                <div className="mk-email-avatar">R</div>
                                                <div>
                                                    <strong>Rerendet Coffee</strong>
                                                    <span>newsletter@rerendet.com</span>
                                                </div>
                                            </div>
                                            <div className="mk-email-subject-preview">
                                                <strong>Subject: </strong>{formData.subject || <em>No subject yet…</em>}
                                            </div>
                                        </div>

                                        {/* Email Body */}
                                        <div className="mk-email-body-preview">
                                            {formData.content ? (
                                                <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                                            ) : (
                                                <div className="mk-preview-empty">
                                                    <FaEnvelope />
                                                    <p>Start typing your email content to see the preview</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Email Footer */}
                                        <div className="mk-email-footer-preview">
                                            <p>© {new Date().getFullYear()} Rerendet Coffee. All rights reserved.</p>
                                            <p><a href="#">Unsubscribe</a> · <a href="#">View in Browser</a></p>
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
            </AnimatePresence>
        </div>
    );
};

export default Marketing;
