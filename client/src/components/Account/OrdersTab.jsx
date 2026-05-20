import React, { useState, useContext, useMemo } from 'react';
import { 
  FaBox, FaShoppingBag, FaCheckCircle, FaClock, FaTruck, 
  FaBoxOpen, FaEye, FaRedo, FaDownload, FaBan, FaSearch,
  FaFilter, FaChevronDown, FaChevronUp, FaMapMarkerAlt,
  FaFileInvoice, FaUndoAlt, FaTimes
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const OrdersTab = ({ orders = [], loading, onRefresh }) => {
    const navigate = useNavigate();
    const { addToCart, token, showNotification } = useContext(AppContext);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [cancellingId, setCancellingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedOrder, setExpandedOrder] = useState(null);
    
    const ordersPerPage = 5;

    // Status filter options
    const filterOptions = [
        { value: 'all', label: 'All Orders' },
        { value: 'active', label: 'Active' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'paid', label: 'Paid' },
        { value: 'unpaid', label: 'Unpaid' },
    ];

    const getStepStatus = (order, step) => {
        const { fulfillmentStatus, orderStatus } = order;
        if (orderStatus === 'cancelled' || order.status === 'cancelled') return 'cancelled';
        if (step === 'confirmed') {
            if (['packed', 'shipped', 'delivered'].includes(fulfillmentStatus)) return 'completed';
            return 'active';
        }
        if (step === 'processing') {
            if (['shipped', 'delivered'].includes(fulfillmentStatus)) return 'completed';
            if (fulfillmentStatus === 'packed') return 'active';
            return 'pending';
        }
        if (step === 'shipped') {
            if (fulfillmentStatus === 'delivered') return 'completed';
            if (fulfillmentStatus === 'shipped') return 'active';
            return 'pending';
        }
        if (step === 'delivered') {
            if (fulfillmentStatus === 'delivered') return 'active';
            return 'pending';
        }
        return 'pending';
    };

    // Filter + Search
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Search filter
            const term = searchTerm.toLowerCase();
            const matchSearch = !term || 
                order.orderNumber?.toLowerCase().includes(term) ||
                order.items?.some(item => (item.product?.name || item.name)?.toLowerCase().includes(term)) ||
                order.status?.toLowerCase().includes(term);
            if (!matchSearch) return false;

            // Status filter
            if (statusFilter === 'all') return true;
            if (statusFilter === 'active') {
                return !['cancelled', 'delivered'].includes(order.status?.toLowerCase()) &&
                       order.fulfillmentStatus !== 'delivered';
            }
            if (statusFilter === 'delivered') return order.fulfillmentStatus === 'delivered';
            if (statusFilter === 'cancelled') return order.status === 'cancelled' || order.orderStatus === 'cancelled';
            if (statusFilter === 'paid') return order.paymentStatus === 'paid';
            if (statusFilter === 'unpaid') return order.paymentStatus !== 'paid';
            return true;
        });
    }, [orders, searchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const toggleExpanded = (orderId) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    return (
        <div className="modern-dashboard-tab">
            {/* Search + Filter Bar */}
            <div className="orders-toolbar">
                <div className="orders-search-bar-wrap">
                    <FaSearch className="search-bar-icon" />
                    <input 
                        type="text" 
                        placeholder="Search by #ID, product, or status..." 
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="orders-search-input"
                    />
                    {searchTerm && (
                        <button className="clear-search-btn" onClick={() => { setSearchTerm(''); setCurrentPage(1); }}>
                            <FaTimes />
                        </button>
                    )}
                </div>
                <div className="orders-filter-row">
                    {filterOptions.map(opt => (
                        <button
                            key={opt.value}
                            className={`filter-chip ${statusFilter === opt.value ? 'active' : ''}`}
                            onClick={() => { setStatusFilter(opt.value); setCurrentPage(1); }}
                        >
                            {opt.label}
                            {opt.value !== 'all' && (
                                <span className="filter-count">
                                    {orders.filter(o => {
                                        if (opt.value === 'active') return !['cancelled','delivered'].includes(o.status?.toLowerCase()) && o.fulfillmentStatus !== 'delivered';
                                        if (opt.value === 'delivered') return o.fulfillmentStatus === 'delivered';
                                        if (opt.value === 'cancelled') return o.status === 'cancelled';
                                        if (opt.value === 'paid') return o.paymentStatus === 'paid';
                                        if (opt.value === 'unpaid') return o.paymentStatus !== 'paid';
                                        return false;
                                    }).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <div className="orders-result-count">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
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
                        const isExpanded = expandedOrder === order._id;
                        const isDelivered = order.fulfillmentStatus === 'delivered';

                        return (
                            <div key={order._id} className={`modern-order-card ${isCancelled ? 'cancelled-order-card' : ''}`}>
                                <div className="order-header">
                                    <div className="order-meta">
                                        <h4>Order #{order.orderNumber}</h4>
                                        <p className="order-date">
                                            {new Date(order.createdAt).toLocaleDateString('en-US', { 
                                                year: 'numeric', month: 'short', day: 'numeric' 
                                            })}
                                        </p>
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

                                {/* Tracking Stepper */}
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

                                {/* Items Preview */}
                                <div className="order-items-preview">
                                    {order.items?.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="item-mini-tag">
                                            <span className="item-name">{item.product?.name || item.name}</span>
                                            <span className="item-qty">x{item.quantity}</span>
                                        </div>
                                    ))}
                                    {order.items?.length > 3 && <span className="more-items">+{order.items.length - 3} more</span>}
                                </div>

                                {/* Expandable Details */}
                                <button className="expand-details-btn" onClick={() => toggleExpanded(order._id)}>
                                    {isExpanded ? <><FaChevronUp /> Hide Details</> : <><FaChevronDown /> View Full Details</>}
                                </button>

                                {isExpanded && (
                                    <div className="order-expanded-details">
                                        {/* Itemized List */}
                                        <div className="detail-section">
                                            <h5 className="detail-section-title">Items Ordered</h5>
                                            <div className="detail-items-list">
                                                {order.items?.map((item, idx) => (
                                                    <div key={idx} className="detail-item-row">
                                                        <div className="detail-item-thumb">
                                                            {(item.product?.images?.[0] || item.image)
                                                                ? <img src={item.product?.images?.[0] || item.image} alt={item.product?.name || item.name} />
                                                                : <FaBox />}
                                                        </div>
                                                        <div className="detail-item-info">
                                                            <span className="detail-item-name">{item.product?.name || item.name}</span>
                                                            {item.size && <span className="detail-item-size">{item.size}</span>}
                                                        </div>
                                                        <div className="detail-item-qty">×{item.quantity}</div>
                                                        <div className="detail-item-price">
                                                            KES {((item.price || item.product?.price || 0) * (item.quantity || 1)).toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="detail-total-row">
                                                <span>Total</span>
                                                <strong>KES {order.total?.toLocaleString()}</strong>
                                            </div>
                                        </div>

                                        {/* Shipping Address */}
                                        {order.shippingInfo && (
                                            <div className="detail-section">
                                                <h5 className="detail-section-title"><FaMapMarkerAlt /> Shipping Address</h5>
                                                <div className="detail-address">
                                                    <p>{order.shippingInfo.firstName} {order.shippingInfo.lastName}</p>
                                                    <p>{order.shippingInfo.address}</p>
                                                    <p>
                                                        {order.shippingInfo.town && `${order.shippingInfo.town}, `}
                                                        {order.shippingInfo.county && `${order.shippingInfo.county} County, `}
                                                        {order.shippingInfo.city && `${order.shippingInfo.city}, `}
                                                        {order.shippingInfo.country || 'Kenya'}
                                                    </p>
                                                    {order.shippingInfo.phone && <p>Phone: {order.shippingInfo.phone}</p>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Info */}
                                        <div className="detail-section">
                                            <h5 className="detail-section-title">Payment</h5>
                                            <div className="detail-payment-row">
                                                <span>Method: {order.paymentMethod || 'M-Pesa'}</span>
                                                <span className={`status-badge payment ${order.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
                                                    {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                                                </span>
                                            </div>
                                            {order.mpesaReceiptNumber && (
                                                <p className="mpesa-receipt">M-Pesa Receipt: {order.mpesaReceiptNumber}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="order-actions-modern">
                                    <button className="btn-order-outline" onClick={() => navigate(`/order-tracking/${order._id}`)}>
                                        <FaEye /> Track
                                    </button>

                                    {order.paymentStatus === 'paid' && (
                                        <a 
                                            href={`/api/orders/${order._id}/invoice`}
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn-order-outline"
                                            title="Download PDF invoice"
                                        >
                                            <FaFileInvoice /> Invoice
                                        </a>
                                    )}

                                    <button
                                        className="btn-order-primary"
                                        onClick={() => {
                                            order.items.forEach(item => {
                                                if (item.product) addToCart(item.product, item.quantity, item.size);
                                            });
                                            showNotification('Items added to cart!', 'success');
                                            navigate('/cart');
                                        }}
                                    >
                                        <FaRedo /> Reorder
                                    </button>

                                    {/* Self-service return for delivered + paid */}
                                    {isDelivered && order.paymentStatus === 'paid' && (
                                        <button 
                                            className="btn-order-outline"
                                            onClick={() => {
                                                showNotification('Return request submitted. We will contact you within 24 hours.', 'success');
                                            }}
                                        >
                                            <FaUndoAlt /> Return
                                        </button>
                                    )}

                                    {isCancelable && (
                                        <button 
                                            className="btn-order-cancel"
                                            disabled={cancellingId === order._id}
                                            onClick={async () => {
                                                if (!window.confirm(`Cancel order #${order.orderNumber}?`)) return;
                                                setCancellingId(order._id);
                                                try {
                                                    const res = await fetch(`/api/orders/${order._id}/cancel`, {
                                                        method: 'POST',
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        showNotification('Order cancelled', 'success');
                                                        if (onRefresh) onRefresh();
                                                    } else {
                                                        showNotification(data.message || 'Failed', 'error');
                                                    }
                                                } catch (err) {
                                                    showNotification('Network error', 'error');
                                                } finally {
                                                    setCancellingId(null);
                                                }
                                            }}
                                        >
                                            {cancellingId === order._id ? '...' : <><FaBan /> Cancel</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination */}
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
                    <h3>No orders found</h3>
                    <p>{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Your orders will appear here after your first purchase.'}</p>
                    <button className="btn-order-primary" onClick={() => navigate('/', { state: { scrollTo: 'coffee-shop' } })}>
                        Shop Now
                    </button>
                </div>
            )}
        </div>
    );
};

export default OrdersTab;
