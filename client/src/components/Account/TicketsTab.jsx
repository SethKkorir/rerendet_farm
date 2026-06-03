import React, { useState, useEffect, useContext } from 'react';
import { FaLifeRing, FaTag, FaPlus, FaPaperPlane, FaClock, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const TicketsTab = () => {
  const { token } = useContext(AppContext);
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchTicketsAndOrders();
  }, []);

  const fetchTicketsAndOrders = async () => {
    setLoading(true);
    try {
      // Fetch Tickets
      const tRes = await fetch('/api/dashboard/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tData = await tRes.json();
      if (tData.success) {
        setTickets(tData.data);
      }

      // Fetch past orders to attach to support tickets
      const oRes = await fetch('/api/dashboard/orders?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const oData = await oRes.json();
      if (oData.success && oData.data?.orders) {
        setOrders(oData.data.orders);
      }
    } catch (err) {
      console.error('Error fetching tickets/orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/dashboard/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        setNotification({ type: 'success', text: 'Support ticket created successfully!' });
        setSubject('');
        setMessage('');
        setSelectedOrderId('');
        setShowForm(false);
        // Refresh list
        const updatedRes = await fetch('/api/dashboard/tickets', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const updatedData = await updatedRes.json();
        if (updatedData.success) setTickets(updatedData.data);
      } else {
        setNotification({ type: 'error', text: data.message || 'Failed to create ticket' });
      }
    } catch (err) {
      setNotification({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <span className="ticket-status-badge new"><FaClock /> New</span>;
      case 'pending':
      case 'in_progress':
        return <span className="ticket-status-badge processing"><FaClock /> In Progress</span>;
      case 'replied':
        return <span className="ticket-status-badge replied"><FaExclamationCircle /> Replied</span>;
      case 'resolved':
      case 'closed':
        return <span className="ticket-status-badge resolved"><FaCheckCircle /> Resolved</span>;
      default:
        return <span className="ticket-status-badge">{status}</span>;
    }
  };

  return (
    <div className="modern-dashboard-tab">
      <div className="tickets-tab-header">
        <div className="tab-intro">
          <p>Need assistance? Attach tickets directly to your orders for lightning-fast resolution.</p>
        </div>
        {!showForm && (
          <button className="btn-open-ticket" onClick={() => setShowForm(true)}>
            <FaPlus /> Open Support Ticket
          </button>
        )}
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div 
            className={`ticket-alert ${notification.type}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            onSubmit={handleSubmit}
            className="premium-ticket-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3 className="form-title"><FaLifeRing /> Initiate Support Inquiry</h3>
            
            <div className="form-row-2">
              <div className="ticket-form-field">
                <label>Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summarize your issue (e.g., Shipping Delay)"
                  required
                />
              </div>

              <div className="ticket-form-field">
                <label>Related Order (Optional)</label>
                <select 
                  value={selectedOrderId} 
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                >
                  <option value="">-- No Related Order --</option>
                  {orders.map(order => (
                    <option key={order._id} value={order._id}>
                      Order #{order.orderNumber} (KES {order.total?.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ticket-form-field">
              <label>Message Detail</label>
              <textarea 
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue with as much detail as possible. If relevant, mention bean types, grinds, or delivery problems."
                required
              />
            </div>

            <div className="form-actions-row">
              <button 
                type="submit" 
                className="btn-ticket-submit" 
                disabled={submitting}
              >
                {submitting ? 'Sending...' : <><FaPaperPlane /> Submit Support Ticket</>}
              </button>
              <button 
                type="button" 
                className="btn-ticket-cancel" 
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
        </div>
      ) : tickets.length > 0 ? (
        <div className="tickets-timeline-list">
          {tickets.map(ticket => (
            <div key={ticket._id} className="premium-ticket-card">
              <div className="ticket-card-header">
                <div className="ticket-meta-left">
                  <h4>{ticket.subject}</h4>
                  <div className="ticket-tags-row">
                    <span className="ticket-date-tag">
                      Opened on {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    {(ticket.order || ticket.linkedOrderId || ticket.orderSnapshot) && (
                      <span className="ticket-order-tag">
                        <FaTag /> Order #{(ticket.order?.orderNumber || ticket.linkedOrderId?.orderNumber || ticket.orderSnapshot?.orderNumber || 'Attached')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ticket-meta-right">
                  {getStatusBadge(ticket.status)}
                </div>
              </div>

              <div className="ticket-card-body">
                <p className="ticket-customer-msg">{ticket.message}</p>

                {ticket.adminResponse && (
                  <div className="ticket-admin-reply">
                    <div className="reply-header">
                      <span className="replier-name">Rerendet Support Response</span>
                      {ticket.respondedAt && (
                        <span className="reply-date">
                          {new Date(ticket.respondedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="reply-text">{ticket.adminResponse}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <FaLifeRing className="empty-icon" />
          </div>
          <h3>Zero support tickets</h3>
          <p>Everything is running smoothly! If you ever experience issues with coffee preparation, orders, or delivery, open a ticket right here.</p>
        </div>
      )}
    </div>
  );
};

export default TicketsTab;
