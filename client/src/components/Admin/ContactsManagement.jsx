// src/components/Admin/ContactsManagement.jsx — Premium Inbox Rewrite
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaSearch, FaEnvelope, FaPhone, FaCalendar, FaSync,
    FaTimes, FaReply, FaTrash, FaCheckCircle, FaTimesCircle,
    FaInbox, FaRegClock, FaTag, FaUser, FaChevronRight,
    FaPaperPlane, FaArchive, FaExclamationTriangle, FaBell
} from 'react-icons/fa';
import './ContactsManagement.css';

// ─── Helpers ────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <FaRegClock />, dot: '#f59e0b' },
    replied: { label: 'Replied', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <FaCheckCircle />, dot: '#10b981' },
    closed: { label: 'Closed', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: <FaArchive />, dot: '#6b7280' },
};

const formatDate = (d) => !d ? '—' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDateTime = (d) => !d ? '—' : new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const timeAgo = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const getInitials = (name) =>
    (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

const AVATAR_COLORS = [
    'linear-gradient(135deg,#6F4E37,#4a3425)',
    'linear-gradient(135deg,#3b82f6,#2563eb)',
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
];

const getAvatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Status Badge ────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className="ci-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.icon} {cfg.label}
        </span>
    );
};

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const ContactsManagement = () => {
    const { showAlert, token } = useContext(AppContext);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [filters, setFilters] = useState({ status: 'all', search: '', page: 1, limit: 20 });
    const [pagination, setPagination] = useState({ total: 0, pages: 0 });
    const [selectedContact, setSelectedContact] = useState(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, replied: 0, closed: 0 });

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => setFilters(p => ({ ...p, search: searchTerm, page: 1 })), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        setFilters(p => ({ ...p, status: statusFilter, page: 1 }));
    }, [statusFilter]);

    useEffect(() => { fetchContacts(); }, [filters]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams(filters).toString();
            const res = await fetch(`/api/admin/contacts?${params}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                const list = data.data.contacts || [];
                setContacts(list);
                setPagination(data.data.pagination || {});
                setStats({
                    total: data.data.pagination?.total || list.length,
                    pending: list.filter(c => c.status === 'pending').length,
                    replied: list.filter(c => c.status === 'replied').length,
                    closed: list.filter(c => c.status === 'closed').length,
                });
            }
        } catch {
            showAlert('Failed to load inquiries', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status, adminResponse = '') => {
        try {
            const res = await fetch(`/api/admin/contacts/${id}/status`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, adminResponse })
            });
            const data = await res.json();
            if (data.success) {
                showAlert(status === 'replied' ? 'Reply sent successfully!' : 'Status updated', 'success');
                fetchContacts();
                if (selectedContact?._id === id) {
                    setSelectedContact(prev => ({ ...prev, status, adminResponse, respondedAt: new Date().toISOString() }));
                }
            }
        } catch { showAlert('Failed to update status', 'error'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this inquiry permanently?')) return;
        try {
            const res = await fetch(`/api/admin/contacts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setContacts(p => p.filter(c => c._id !== id));
                if (selectedContact?._id === id) setSelectedContact(null);
                showAlert('Inquiry deleted', 'success');
                fetchContacts();
            }
        } catch { showAlert('Failed to delete inquiry', 'error'); }
    };

    const STATUS_TABS = [
        { value: 'all', label: 'All', count: stats.total },
        { value: 'pending', label: 'Pending', count: stats.pending },
        { value: 'replied', label: 'Replied', count: stats.replied },
        { value: 'closed', label: 'Closed', count: stats.closed },
    ];

    return (
        <div className="contacts-management">
            {/* ── Stats Row ── */}
            <div className="ci-stats-row">
                {[
                    { icon: <FaInbox />, label: 'Total Inquiries', value: pagination.total || stats.total, color: '#3b82f6' },
                    { icon: <FaBell />, label: 'Needs Reply', value: stats.pending, color: '#f59e0b' },
                    { icon: <FaCheckCircle />, label: 'Replied', value: stats.replied, color: '#10b981' },
                    { icon: <FaArchive />, label: 'Closed', value: stats.closed, color: '#6b7280' },
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        className="ci-stat-card"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                    >
                        <div className="ci-stat-icon" style={{ background: `${s.color}1a`, color: s.color }}>{s.icon}</div>
                        <div>
                            <p className="ci-stat-value">{s.value}</p>
                            <p className="ci-stat-label">{s.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Inbox Grid ── */}
            <div className="ci-inbox-layout">
                {/* ── LEFT: List Panel ── */}
                <div className="ci-list-panel">
                    {/* Search */}
                    <div className="ci-search-bar">
                        <FaSearch className="ci-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by Ticket #, name, email, order #…"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="ci-clear-btn" onClick={() => setSearchTerm('')}><FaTimes /></button>
                        )}
                    </div>

                    {/* Status Tabs */}
                    <div className="ci-status-tabs">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.value}
                                className={`ci-tab ${statusFilter === tab.value ? 'active' : ''}`}
                                onClick={() => setStatusFilter(tab.value)}
                            >
                                {tab.label}
                                {tab.count > 0 && <span className="ci-tab-count">{tab.count}</span>}
                            </button>
                        ))}
                        <button className="ci-refresh-btn" onClick={fetchContacts} disabled={loading} title="Refresh">
                            <FaSync className={loading ? 'ci-spin' : ''} />
                        </button>
                    </div>

                    {/* Contact List */}
                    <div className="ci-contact-list">
                        {loading ? (
                            <div className="ci-loading">
                                <div className="ci-spinner" />
                                <p>Loading inquiries…</p>
                            </div>
                        ) : contacts.length === 0 ? (
                            <div className="ci-empty-list">
                                <FaInbox />
                                <p>{searchTerm ? `No results for "${searchTerm}"` : 'No inquiries found'}</p>
                            </div>
                        ) : (
                            contacts.map((contact, i) => (
                                <motion.div
                                    key={contact._id}
                                    className={`ci-contact-card ${selectedContact?._id === contact._id ? 'active' : ''} ${contact.status === 'pending' ? 'unread' : ''}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => setSelectedContact(contact)}
                                >
                                    <div
                                        className="ci-contact-avatar"
                                        style={{ background: getAvatarColor(contact.name) }}
                                    >
                                        {getInitials(contact.name)}
                                    </div>

                                    <div className="ci-contact-content">
                                        <div className="ci-contact-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                <strong className="ci-contact-name">{contact.name}</strong>
                                                <span style={{ fontSize: '0.66rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary, #6F4E37)', background: 'rgba(111,78,55,0.08)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                                                    #{contact.ticketNumber || contact.ticketReference || ('TKT-' + contact._id.slice(-6).toUpperCase())}
                                                </span>
                                            </div>
                                            <span className="ci-contact-time">{timeAgo(contact.createdAt)}</span>
                                        </div>
                                        <p className="ci-contact-subject">{contact.subject}</p>
                                        <p className="ci-contact-preview">{contact.message?.slice(0, 75)}…</p>
                                        <StatusBadge status={contact.status} />
                                    </div>

                                    {contact.status === 'pending' && <span className="ci-unread-dot" />}
                                    <FaChevronRight className="ci-card-arrow" />
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="ci-list-pagination">
                            <button
                                disabled={filters.page === 1}
                                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                            >← Prev</button>
                            <span>{filters.page} / {pagination.pages}</span>
                            <button
                                disabled={filters.page === pagination.pages}
                                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                            >Next →</button>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Detail + Reply Panel ── */}
                <div className="ci-detail-panel">
                    <AnimatePresence mode="wait">
                        {selectedContact ? (
                            <motion.div
                                key={selectedContact._id}
                                className="ci-thread"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                            >
                                <InquiryThread
                                    contact={selectedContact}
                                    onUpdate={handleStatusUpdate}
                                    onDelete={handleDelete}
                                    onClose={() => setSelectedContact(null)}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                className="ci-detail-empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <div className="ci-empty-inbox-art">
                                    <FaEnvelope className="ci-empty-icon" />
                                    <div className="ci-empty-ring ci-ring-1" />
                                    <div className="ci-empty-ring ci-ring-2" />
                                </div>
                                <h3>Select an inquiry</h3>
                                <p>Click any message from the list to read and reply</p>
                                {stats.pending > 0 && (
                                    <div className="ci-pending-notice">
                                        <FaBell /> {stats.pending} pending {stats.pending === 1 ? 'inquiry' : 'inquiries'} need your attention
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
//  INQUIRY THREAD COMPONENT
// ═══════════════════════════════════════════════════════════════
const InquiryThread = ({ contact, onUpdate, onDelete, onClose }) => {
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const textareaRef = useRef(null);

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setSending(true);
        await onUpdate(contact._id, 'replied', replyText.trim());
        setReplyText('');
        setSending(false);
    };

    const handleClose = async () => {
        await onUpdate(contact._id, 'closed', contact.adminResponse || '');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSendReply();
        }
    };

    const isClosed = contact.status === 'closed';
    const initials = getInitials(contact.name);
    const avatarColor = getAvatarColor(contact.name);

    return (
        <div className="ci-thread-inner">
            {/* Thread Header */}
            <div className="ci-thread-header">
                <div className="ci-thread-subject-block">
                    <h2 className="ci-thread-subject">{contact.subject}</h2>
                    <div className="ci-thread-meta">
                        <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary, #6F4E37)', background: 'rgba(111,78,55,0.08)', padding: '2px 8px', borderRadius: '5px', letterSpacing: '0.5px' }}>
                            Ref: #{contact.ticketNumber || contact.ticketReference || ('TKT-' + contact._id.slice(-6).toUpperCase())}
                        </span>
                        <StatusBadge status={contact.status} />
                        <span className="ci-thread-date"><FaCalendar /> {formatDate(contact.createdAt)}</span>
                    </div>
                </div>
                <div className="ci-thread-header-actions">
                    {!isClosed && (
                        <button className="ci-close-btn-action" onClick={handleClose} title="Close inquiry">
                            <FaArchive /> Close
                        </button>
                    )}
                    <button
                        className="ci-delete-btn-action"
                        onClick={() => onDelete(contact._id)}
                        title="Delete inquiry"
                    >
                        <FaTrash />
                    </button>
                </div>
            </div>

            {/* Scroll area */}
            <div className="ci-thread-scroll">
                {/* Sender Bubble */}
                <div className="ci-message-bubble customer">
                    <div className="ci-bubble-avatar" style={{ background: avatarColor }}>
                        {initials}
                    </div>
                    <div className="ci-bubble-body">
                        <div className="ci-bubble-header">
                            <div className="ci-bubble-sender">
                                <strong>{contact.name}</strong>
                                <span className="ci-bubble-email"><FaEnvelope /> {contact.email}</span>
                                {contact.phone && <span className="ci-bubble-phone"><FaPhone /> {contact.phone}</span>}
                            </div>
                            <span className="ci-bubble-time">{formatDateTime(contact.createdAt)}</span>
                        </div>
                        <div className="ci-bubble-text">{contact.message}</div>
                    </div>
                </div>

                {/* Previous Admin Reply */}
                {contact.adminResponse && (
                    <motion.div
                        className="ci-message-bubble admin"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="ci-bubble-avatar admin-avatar">
                            <FaUser />
                        </div>
                        <div className="ci-bubble-body">
                            <div className="ci-bubble-header">
                                <strong>Rerendet Support Team</strong>
                                <span className="ci-bubble-time">{formatDateTime(contact.respondedAt)}</span>
                            </div>
                            <div className="ci-bubble-text">{contact.adminResponse}</div>
                            <div className="ci-reply-sent-tag"><FaCheckCircle /> Reply sent via email</div>
                        </div>
                    </motion.div>
                )}

                {/* Closed Banner */}
                {isClosed && (
                    <div className="ci-closed-banner">
                        <FaArchive /> This inquiry has been closed
                    </div>
                )}
            </div>

            {/* Reply Box */}
            {!isClosed && (
                <div className="ci-reply-box">
                    <div className="ci-reply-to-bar">
                        <FaReply /> Replying to <strong>{contact.email}</strong>
                    </div>
                    <textarea
                        ref={textareaRef}
                        className="ci-reply-textarea"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Type your reply to ${contact.name}… (Ctrl+Enter to send)`}
                        rows={5}
                    />
                    <div className="ci-reply-footer">
                        <span className="ci-reply-hint">
                            <FaEnvelope /> Will be emailed to <strong>{contact.email}</strong>
                        </span>
                        <button
                            className="ci-send-btn"
                            onClick={handleSendReply}
                            disabled={!replyText.trim() || sending}
                        >
                            {sending ? (
                                <span>Sending…</span>
                            ) : (
                                <><FaPaperPlane /> Send Reply</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactsManagement;
