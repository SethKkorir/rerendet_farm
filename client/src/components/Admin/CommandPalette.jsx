import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSearch, FaBox, FaUser, FaShoppingBag, FaCog, FaHistory, 
  FaTimes, FaShieldAlt, FaChartBar, FaCreditCard, FaBoxOpen, 
  FaEnvelope, FaBullhorn, FaTicketAlt, FaPenNib, FaBook
} from 'react-icons/fa';
import './CommandPalette.css';

const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const inputRef = useRef(null);

    // Toggle with Cmd+K or Ctrl+K or custom event
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleCustomToggle = () => setIsOpen(prev => !prev);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('toggle-command-palette', handleCustomToggle);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('toggle-command-palette', handleCustomToggle);
        };
    }, []);

    // Focus input on open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const actions = [
        { id: 'dashboard', label: 'Go to Dashboard', icon: <FaHistory />, path: '/admin' },
        { id: 'orders', label: 'Manage Orders', icon: <FaShoppingBag />, path: '/admin/orders' },
        { id: 'products', label: 'Manage Products', icon: <FaBox />, path: '/admin/products' },
        { id: 'inventory', label: 'Inventory Health', icon: <FaBoxOpen />, path: '/admin/inventory-health' },
        { id: 'payments', label: 'Payments & Transactions', icon: <FaCreditCard />, path: '/admin/payments' },
        { id: 'analytics', label: 'Sales Analytics & Reports', icon: <FaChartBar />, path: '/admin/analytics' },
        { id: 'customers', label: 'Manage Customers & Users', icon: <FaUser />, path: '/admin/users' },
        { id: 'contacts', label: 'Customer Inquiries & Contacts', icon: <FaEnvelope />, path: '/admin/contacts' },
        { id: 'marketing', label: 'Marketing Campaigns', icon: <FaBullhorn />, path: '/admin/marketing' },
        { id: 'coupons', label: 'Promotions & Coupons', icon: <FaTicketAlt />, path: '/admin/coupons' },
        { id: 'blogs', label: 'Blog & Articles', icon: <FaPenNib />, path: '/admin/blogs' },
        { id: 'controls', label: 'Operational Controls', icon: <FaCog />, path: '/admin/controls' },
        { id: 'sessions', label: 'Active Sessions & Security', icon: <FaShieldAlt />, path: '/admin/sessions' },
        { id: 'documentation', label: 'System Documentation', icon: <FaBook />, path: '/admin/documentation' },
        { id: 'logs', label: 'Security & Audit Logs', icon: <FaShieldAlt />, path: '/admin/logs' },
        { id: 'settings', label: 'System Settings', icon: <FaCog />, path: '/admin/settings' },
    ];

    const filteredActions = actions.filter(action =>
        action.label.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (path) => {
        navigate(path);
        setIsOpen(false);
        setQuery('');
    };

    if (!isOpen) return null;

    return (
        <div className="cmd-palette-backdrop" onClick={() => setIsOpen(false)}>
            <div className="cmd-palette-modal" onClick={e => e.stopPropagation()}>
                <div className="cmd-header">
                    <FaSearch className="cmd-search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search sections, orders, products, tools... (Esc to close)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="cmd-input"
                    />
                    <button className="cmd-close-btn" onClick={() => setIsOpen(false)} aria-label="Close command palette">
                        <FaTimes />
                    </button>
                </div>
                <div className="cmd-results">
                    {filteredActions.length === 0 ? (
                        <div className="cmd-empty">No results found for "{query}"</div>
                    ) : (
                        filteredActions.map(action => (
                            <button
                                key={action.id}
                                className="cmd-item"
                                onClick={() => handleSelect(action.path)}
                            >
                                <span className="cmd-item-icon">{action.icon}</span>
                                <span className="cmd-item-label">{action.label}</span>
                                <span className="cmd-item-arrow">↵</span>
                            </button>
                        ))
                    )}
                </div>
                <div className="cmd-footer">
                    <span>Navigation shortcut: <kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>↵</kbd> to select, <kbd>esc</kbd> to exit</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
