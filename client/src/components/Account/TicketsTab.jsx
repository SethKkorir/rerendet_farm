// client/src/components/Account/TicketsTab.jsx — Minimalist Quiet Luxury Concierge Suite
import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  FaHeadset, FaPlus, FaClock, FaCheckCircle, FaExclamationCircle,
  FaPaperPlane, FaArchive, FaHistory, FaReply, FaTag
} from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const TicketsTab = () => {
  const { token, showNotification } = useContext(AppContext);
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tab View: 'active' (open or resolved < 30 days) vs 'archived' (resolved > 30 days)
  const [viewTab, setViewTab] = useState('active');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');

  useEffect(() => {
    fetchTicketsAndOrders();
  }, []);

  const fetchTicketsAndOrders = async () => {
    setLoading(true);
    try {
      const activeToken = token || (JSON.parse(localStorage.getItem('auth') || '{}').token);
      const [tRes, oRes] = await Promise.all([
        fetch('/api/dashboard/tickets', {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        }),
        fetch('/api/dashboard/orders?limit=100', {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        })
      ]);

      const tData = await tRes.json();
      if (tData.success) setTickets(tData.data || []);

      const oData = await oRes.json();
      if (oData.success && oData.data?.orders) setOrders(oData.data.orders);
    } catch (err) {
      console.error('Error fetching tickets/orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group tickets into Active (<30d resolved + open) and Archived (>30d resolved)
  const { activeTickets, archivedTickets } = useMemo(() => {
    const active = [];
    const archived = [];
    const now = Date.now();

    tickets.forEach(ticket => {
      const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
      const resolvedDate = new Date(ticket.respondedAt || ticket.updatedAt || ticket.createdAt).getTime();
      const ageMs = now - resolvedDate;
      const isOver30Days = ageMs > THIRTY_DAYS_MS;

      const refCode = ticket.ticketNumber || ticket.ticketReference || `TKT-${ticket._id.slice(-6).toUpperCase()}`;

      if (isResolved && isOver30Days) {
        archived.push({
          ...ticket,
          refCode,
          archivedDaysAgo: Math.floor(ageMs / (24 * 60 * 60 * 1000))
        });
      } else {
        const daysUntilArchive = isResolved ? Math.max(1, 30 - Math.floor(ageMs / (24 * 60 * 60 * 1000))) : null;
        active.push({
          ...ticket,
          refCode,
          daysUntilArchive
        });
      }
    });

    return { activeTickets: active, archivedTickets: archived };
  }, [tickets]);

  const displayedTickets = viewTab === 'active' ? activeTickets : archivedTickets;

  const handleStartFollowUp = (ticket) => {
    setSubject(`Follow-up on #${ticket.refCode}: ${ticket.subject}`);
    setSelectedOrderId(ticket.order?._id || ticket.order || ticket.linkedOrderId || '');
    setMessage(`Referencing ticket #${ticket.refCode} previously resolved on ${new Date(ticket.respondedAt || ticket.updatedAt).toLocaleDateString('en-GB')}:\n\n`);
    setShowForm(true);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const activeToken = token || (JSON.parse(localStorage.getItem('auth') || '{}').token);
      const res = await fetch('/api/dashboard/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          message,
          orderId: selectedOrderId || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        showNotification?.('Support inquiry opened successfully', 'success');
        setSubject('');
        setMessage('');
        setSelectedOrderId('');
        setShowForm(false);
        setViewTab('active');
        fetchTicketsAndOrders();
      } else {
        showNotification?.(data.message || 'Failed to open ticket', 'error');
      }
    } catch {
      showNotification?.('Network error occurred. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ord-luxury-canvas" style={{ padding: 0 }}>
      {/* ══ Editorial Header ══ */}
      <div style={{ marginBottom: '1.25rem' }}>
        <span className="rc-dash-eyebrow">— YOUR ACCOUNT</span>
        <h2 className="rc-dash-title">Help & support</h2>
        <p className="rc-dash-sub">
          Have questions about your order or need assistance? Reach out to our team below.
        </p>
      </div>

      {/* ── Top Controls Strip ── */}
      <div className="ord-luxury-controls">
        <div className="ord-filter-pills-row">
          <button
            type="button"
            className={`ord-pill-filter ${viewTab === 'active' ? 'active' : ''}`}
            onClick={() => setViewTab('active')}
          >
            Active Tickets ({activeTickets.length})
          </button>
          <button
            type="button"
            className={`ord-pill-filter ${viewTab === 'archived' ? 'active' : ''}`}
            onClick={() => setViewTab('archived')}
          >
            Past Tickets ({archivedTickets.length})
          </button>
        </div>

        {!showForm && (
          <button
            type="button"
            className="ord-action-btn solid"
            onClick={() => {
              setSubject('');
              setMessage('');
              setSelectedOrderId('');
              setShowForm(true);
            }}
          >
            <FaPlus /> New Support Ticket
          </button>
        )}
      </div>

      {/* ── Open Ticket Form Card ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="ord-clean-card"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="ord-clean-top">
              <span className="ord-clean-number">New Support Request</span>
              <button
                type="button"
                className="ord-clean-cancel-link"
                onClick={() => setShowForm(false)}
              >
                Close form
              </button>
            </div>

            <div className="ord-clean-divider" />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question about my order or delivery"
                    required
                    className="ord-search-minimal-input"
                    style={{ borderRadius: '10px', padding: '0.7rem 1rem' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Linked Order (Optional)</label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="ord-search-minimal-input"
                    style={{ borderRadius: '10px', padding: '0.7rem 1rem' }}
                  >
                    <option value="">General Inquiry (No specific order)</option>
                    {orders.map(o => (
                      <option key={o._id} value={o._id}>
                        Order #{o.orderNumber} · KES {Number(o.total || o.totalAmount || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry in detail. Our coffee specialists reply within 2 to 4 business hours."
                  required
                  className="ord-search-minimal-input"
                  style={{ borderRadius: '10px', padding: '0.75rem 1rem', width: '100%', resize: 'vertical' }}
                />
              </div>

              <div className="ord-clean-divider" />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="ord-action-btn outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ord-action-btn solid"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : <><FaPaperPlane /> Send Inquiry</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Archive Explanatory Notice (When viewing Past Archive) ── */}
      {viewTab === 'archived' && (
        <div style={{
          padding: '1.1rem 1.4rem',
          background: 'var(--cust-border-subtle)',
          borderRadius: '14px',
          border: '1px solid var(--cust-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <FaArchive style={{ color: 'var(--cust-gold)', fontSize: '1.25rem', flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--cust-text-muted)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--cust-text)', display: 'block', marginBottom: '2px' }}>
              Permanent Inquiry Archives (30+ Days Resolved)
            </strong>
            Tickets resolved for over 30 days are automatically archived here to keep your active workspace uncluttered. Your complete conversation history and Ticket Reference IDs are permanently preserved.
          </div>
        </div>
      )}

      {/* ── Ticket List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--cust-text-muted)' }}>
          <p>Loading support tickets…</p>
        </div>
      ) : displayedTickets.length > 0 ? (
        <div className="ord-luxury-list">
          {displayedTickets.map(ticket => {
            const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
            const isReplied = ticket.status === 'replied';

            return (
              <div key={ticket._id} className="ord-clean-card">
                {/* Top Meta Strip */}
                <div className="ord-clean-top">
                  <div className="ord-clean-meta-left">
                    <span style={{
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      color: 'var(--cust-gold)',
                      background: 'rgba(196, 151, 70, 0.12)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(196, 151, 70, 0.25)'
                    }}>
                      #{ticket.refCode}
                    </span>
                    <span className="ord-clean-number">{ticket.subject}</span>
                    <span className="ord-clean-dot-sep" />
                    <span className="ord-clean-date">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                    </span>
                  </div>

                  <div className="ord-clean-badges-right">
                    {ticket.daysUntilArchive && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--cust-text-dim)', fontStyle: 'italic' }}>
                        Archives in {ticket.daysUntilArchive}d
                      </span>
                    )}
                    <span className={`ord-clean-status-pill ${isResolved ? 'delivered' : isReplied ? 'shipped' : 'processing'}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>

                <div className="ord-clean-divider" />

                {/* Message Body */}
                <p style={{ fontSize: '0.88rem', color: 'var(--cust-text)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {ticket.message}
                </p>

                {/* Attached Order Reference */}
                {(ticket.order || ticket.orderNumber || ticket.linkedOrderSnapshot) && (
                  <div style={{
                    fontSize: '0.78rem',
                    color: 'var(--cust-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.5rem 0.85rem',
                    background: 'var(--cust-border-subtle)',
                    borderRadius: '8px',
                    width: 'fit-content'
                  }}>
                    <FaTag style={{ color: 'var(--cust-gold)', fontSize: '0.72rem' }} />
                    <span>
                      Linked Order: <strong>#{ticket.linkedOrderSnapshot?.orderNumber || ticket.orderNumber || ticket.order?.orderNumber || 'Attached'}</strong>
                    </span>
                  </div>
                )}

                {/* Official Response */}
                {(ticket.adminResponse || (ticket.replies && ticket.replies.length > 0)) && (
                  <div style={{ marginTop: '0.5rem', padding: '1rem 1.25rem', background: 'var(--cust-border-subtle)', borderRadius: '12px', border: '1px solid var(--cust-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, color: 'var(--cust-gold)' }}>
                        Rerendet Support Reply
                      </span>
                      {ticket.respondedAt && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--cust-text-dim)' }}>
                          {new Date(ticket.respondedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.86rem', color: 'var(--cust-text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {ticket.adminResponse || ticket.replies[ticket.replies.length - 1]?.message}
                    </p>
                  </div>
                )}

                {/* Reopen / Follow-up Action for Archived Inquiries */}
                {viewTab === 'archived' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--cust-border-subtle)', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="ord-action-btn outline"
                      onClick={() => handleStartFollowUp(ticket)}
                      style={{ fontSize: '0.76rem', padding: '0.45rem 1rem' }}
                    >
                      <FaReply style={{ fontSize: '0.7rem' }} /> Follow Up on #{ticket.refCode}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ord-clean-empty">
          <h3 className="ord-clean-empty-title">
            {viewTab === 'active' ? 'No active inquiries' : 'No archived inquiries'}
          </h3>
          <p className="ord-clean-empty-text">
            {viewTab === 'active'
              ? 'Have questions about your order or need assistance? Open a support ticket to reach our team.'
              : 'Resolved tickets older than 30 days will appear here for your reference.'}
          </p>
          {!showForm && viewTab === 'active' && (
            <button
              type="button"
              className="ord-action-btn solid"
              onClick={() => {
                setSubject('');
                setMessage('');
                setSelectedOrderId('');
                setShowForm(true);
              }}
            >
              <FaPlus /> New Support Ticket
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TicketsTab;
