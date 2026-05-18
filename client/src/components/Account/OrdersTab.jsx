import React, { useState, useContext } from 'react';
import { 
  FaBox, FaShoppingBag, FaCheckCircle, FaClock, FaTruck, 
  FaBoxOpen, FaEye, FaRedo, FaDownload, FaBan, FaSearch 
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const OrdersTab = ({ orders = [], loading, onRefresh }) => {
    const navigate = useNavigate();
    const { addToCart, token, showNotification } = useContext(AppContext);
    
    // Search and Pagination States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [cancellingId, setCancellingId] = useState(null);
    
    const ordersPerPage = 5;

    // Helper to determine active step based on fulfillment and order status
    const getStepStatus = (order, step) => {
        const { fulfillmentStatus, orderStatus } = order;

        if (orderStatus === 'cancelled' || order.status === 'cancelled') return 'cancelled';

        // 1. Confirmed (Active until packed)
        if (step === 'confirmed') {
            if (['packed', 'shipped', 'delivered'].includes(fulfillmentStatus)) return 'completed';
            return 'active';
        }

        // 2. Processing (Active only when packed)
        if (step === 'processing') {
            if (['shipped', 'delivered'].includes(fulfillmentStatus)) return 'completed';
            if (fulfillmentStatus === 'packed') return 'active';
            return 'pending';
        }

        // 3. Shipped
        if (step === 'shipped') {
            if (fulfillmentStatus === 'delivered') return 'completed';
            if (fulfillmentStatus === 'shipped') return 'active';
            return 'pending';
        }

        // 4. Delivered
        if (step === 'delivered') {
            if (fulfillmentStatus === 'delivered') return 'active';
            return 'pending';
        }

        return 'pending';
    };

    // Filter orders based on search term
    const filteredOrders = orders.filter(order => {
        const orderNumMatch = order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        const itemMatch = order.items?.some(item => 
            (item.product?.name || item.name)?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const statusMatch = order.status?.toLowerCase().includes(searchTerm.toLowerCase());
        return orderNumMatch || itemMatch || statusMatch;
    });

    // Pagination slice
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // reset to first page on new search
    };

    return (
        <div className="modern-dashboard-tab">
            {/* Search Tool */}
            <div className="orders-search-bar-wrap">
                <FaSearch className="search-bar-icon" />
                <input 
                    type="text" 
                    placeholder="Search past orders by #ID, coffee profile or shipping status..." 
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="orders-search-input"
                />
                {searchTerm && (
                    <button className="clear-search-btn" onClick={() => { setSearchTerm(''); setCurrentPage(1); }}>
                        Clear
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading-spinner-container">
                    <div className="loading-spinner"></div>
                </div>
            ) : paginatedOrders.length > 0 ? (
                <div className="orders-grid">
                    {paginatedOrders.map(order => {
                        const isCancelled = order.status === 'cancelled' || order.orderStatus === 'cancelled';
                        const isCancelable = !isCancelled && order.fulfillmentStatus === 'unfulfilled';

                        return (
                            <div key={order._id} className={`modern-order-card ${isCancelled ? 'cancelled-order-card' : ''}`}>
                                <div className="order-header">
                                    <div className="order-meta">
                                        <h4>Order #{order.orderNumber}</h4>
                                        <p className="order-date">{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="order-amount">
                                        <span className="amount">KES {order.total?.toLocaleString()}</span>
                                        <div className="status-badges">
                                            <span className={`status-badge ${order.status}`}>
                                                {order.status}
                                            </span>
                                            <span className={`status-badge payment ${order.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
                                                {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Granular Tracking Stepper */}
                                <div className="order-tracking-preview">
                                    <div className={`track-step ${getStepStatus(order, 'confirmed')}`}>
                                        <div className="step-dot">
                                            {getStepStatus(order, 'confirmed') === 'cancelled' ? <FaBan /> : <FaCheckCircle />}
                                        </div>
                                        <span className="step-label">Confirmed</span>
                                    </div>
                                    <div className={`track-line ${getStepStatus(order, 'processing') === 'completed' || getStepStatus(order, 'processing') === 'active' ? 'active' : ''}`}></div>

                                    <div className={`track-step ${getStepStatus(order, 'processing')}`}>
                                        <div className="step-dot"><FaBoxOpen /></div>
                                        <span className="step-label">Processing</span>
                                    </div>
                                    <div className={`track-line ${getStepStatus(order, 'shipped') === 'completed' || getStepStatus(order, 'shipped') === 'active' ? 'active' : ''}`}></div>

                                    <div className={`track-step ${getStepStatus(order, 'shipped')}`}>
                                        <div className="step-dot"><FaTruck /></div>
                                        <span className="step-label">Shipped</span>
                                    </div>
                                    <div className={`track-line ${getStepStatus(order, 'delivered') === 'completed' ? 'active' : ''}`}></div>

                                    <div className={`track-step ${getStepStatus(order, 'delivered')}`}>
                                        <div className="step-dot"><FaBox /></div>
                                        <span className="step-label">Delivered</span>
                                    </div>
                                </div>

                                <div className="order-items-preview">
                                    {order.items?.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="item-mini-tag">
                                            <span className="item-name">{item.product?.name || item.name}</span>
                                            <span className="item-qty">x{item.quantity}</span>
                                        </div>
                                    ))}
                                    {order.items?.length > 3 && <span className="more-items">+{order.items.length - 3} more</span>}
                                </div>

                                <div className="order-actions-modern">
                                    <button className="btn-order-outline" onClick={() => navigate(`/order-tracking/${order._id}`)}>
                                        <FaEye /> View Details
                                    </button>

                                    {/* PDF Invoice Download */}
                                    {order.paymentStatus === 'paid' && (
                                        <a 
                                            href={`/api/orders/${order._id}/invoice`}
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn-order-outline"
                                            title="Download PDF invoice receipt"
                                        >
                                            <FaDownload /> Invoice
                                        </a>
                                    )}

                                    {/* Reorder Button */}
                                    <button
                                        className="btn-order-primary"
                                        onClick={() => {
                                            order.items.forEach(item => {
                                                if (item.product) {
                                                    addToCart(item.product, item.quantity, item.size);
                                                }
                                            });
                                            showNotification('Previous items duplicated into your cart!', 'success');
                                            navigate('/cart');
                                        }}
                                    >
                                        <FaRedo /> Reorder
                                    </button>

                                    {/* Self-Service Cancellation */}
                                    {isCancelable && (
                                        <button 
                                            className="btn-order-cancel"
                                            disabled={cancellingId === order._id}
                                            onClick={async () => {
                                                if (!window.confirm(`Are you absolutely sure you want to cancel order #${order.orderNumber}? This action will instantly restore inventory levels.`)) return;
                                                setCancellingId(order._id);
                                                try {
                                                    const res = await fetch(`/api/orders/${order._id}/cancel`, {
                                                        method: 'POST',
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        showNotification('Order cancelled successfully', 'success');
                                                        if (onRefresh) onRefresh();
                                                    } else {
                                                        showNotification(data.message || 'Cancellation failed', 'error');
                                                    }
                                                } catch (err) {
                                                    showNotification('Network issue during cancellation', 'error');
                                                } finally {
                                                    setCancellingId(null);
                                                }
                                            }}
                                        >
                                            {cancellingId === order._id ? 'Cancelling...' : <><FaBan /> Cancel Order</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="orders-tab-pagination">
                            <button 
                                className="pagination-arrow" 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            >
                                Prev
                            </button>
                            <span className="pagination-text">Page {currentPage} of {totalPages}</span>
                            <button 
                                className="pagination-arrow" 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-icon-wrap">
                        <FaShoppingBag className="empty-icon" />
                    </div>
                    <h3>Start your journey</h3>
                    <p>{searchTerm ? 'No orders match your current search query.' : 'Experience the finest Kenyan single-origin coffee. Your future acquisitions will appear here.'}</p>
                    <button className="btn-order-primary" onClick={() => (window.location.href = '#coffee-shop')}>
                        Explore Collection
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrdersTab;
