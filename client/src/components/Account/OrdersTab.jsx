// components/Account/OrdersTab.jsx
import React, { useState, useContext, useMemo } from 'react';
import {
  FaBox, FaShoppingBag, FaCheckCircle, FaClock, FaTruck,
  FaBoxOpen, FaEye, FaRedo, FaDownload, FaBan, FaSearch,
  FaFilter, FaChevronDown, FaChevronUp, FaMapMarkerAlt,
  FaFileInvoice, FaUndoAlt, FaTimes, FaSpinner, FaCoffee, FaShieldAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const OrdersTab = ({ orders = [], loading, onRefresh }) => {
  const navigate = useNavigate();
  const { addToCart, token, showNotification, validateCartWithServer, openCart } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [cancellingId, setCancellingId] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [cancelReasonModal, setCancelReasonModal] = useState(null);
  const [cancelWarningInfo, setCancelWarningInfo] = useState(null);
  const [cancellationReasonText, setCancellationReasonText] = useState('');
  const [warningLoading, setWarningLoading] = useState(false);

  const ordersPerPage = 5;

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
      const term = searchTerm.toLowerCase();
      const matchSearch = !term ||
        order.orderNumber?.toLowerCase().includes(term) ||
        order.items?.some(item => (item.product?.name || item.name)?.toLowerCase().includes(term)) ||
        order.status?.toLowerCase().includes(term);
      if (!matchSearch) return false;

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

  // Live-Validated Reorder (Story 2)
  const handleReorder = async (order) => {
    if (!order?.items || order.items.length === 0) return;
    try {
      setReorderingId(order._id);
      showNotification('Re-validating coffee roast availability and live prices…', 'info');

      const itemsToValidate = order.items.map(item => ({
        product: item.product?._id || item.product || item._id,
        size: item.size || 'Standard 250g',
        quantity: item.quantity || 1,
        price: item.price || 0,
        name: item.name || item.product?.name
      }));

      const validation = typeof validateCartWithServer === 'function'
        ? await validateCartWithServer(itemsToValidate)
        : { isValid: true, items: itemsToValidate };

      let addedCount = 0;
      let outOfStockCount = 0;
      let priceChangedCount = 0;

      for (const valItem of (validation?.items || itemsToValidate)) {
        if (valItem.isOutOfStock || valItem.isUnavailable) {
          outOfStockCount++;
        } else {
          if (valItem.priceChanged) priceChangedCount++;
          const original = order.items.find(i => (i.product?._id || i.product || i._id) === valItem.product);
          const productObj = {
            _id: valItem.product,
            id: valItem.product,
            name: valItem.name || original?.name || 'Highland Coffee',
            price: valItem.price,
            image: original?.image || original?.product?.image || '/default-product.jpg',
            availableStock: valItem.availableStock
          };
          addToCart(productObj, valItem.quantity, valItem.size);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        if (outOfStockCount > 0) {
          showNotification(`${addedCount} item(s) re-added. (${outOfStockCount} seasonal item(s) currently out of stock).`, 'warning');
        } else if (priceChangedCount > 0) {
          showNotification('Items re-added with current harvest pricing.', 'info');
        } else {
          showNotification('All items verified and re-added to collection!', 'success');
        }
        if (typeof openCart === 'function') openCart();
      } else {
        showNotification('The items from this previous order are currently out of stock or seasonal.', 'error');
      }
    } catch (err) {
      showNotification('Failed to re-validate order items. Please check product catalog.', 'error');
    } finally {
      setReorderingId(null);
    }
  };

  const handleCancelClick = async (order) => {
    setCancelReasonModal(order);
    setWarningLoading(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/cancel-warning`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCancelWarningInfo(data.data);
      }
    } catch (e) {
      // non-fatal
    } finally {
      setWarningLoading(false);
    }
  };

  const submitCancellation = async () => {
    if (!cancelReasonModal) return;
    setCancellingId(cancelReasonModal._id);
    try {
      const res = await fetch(`/api/orders/${cancelReasonModal._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: cancellationReasonText })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Order cancelled successfully', 'info');
        setCancelReasonModal(null);
        setCancellationReasonText('');
        if (typeof onRefresh === 'function') onRefresh();
      } else {
        showNotification(data.message || 'Failed to cancel order', 'error');
      }
    } catch (err) {
      showNotification('Error cancelling order', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="modern-dashboard-tab">
      {/* Search + Filter Bar */}
      <div className="orders-toolbar">
        <div className="orders-search-bar-wrap">
          <FaSearch className="search-bar-icon" />
          <input
            type="text"
            placeholder="Search by #ID, product, or status…"
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
                    if (opt.value === 'active') return !['cancelled', 'delivered'].includes(o.status?.toLowerCase()) && o.fulfillmentStatus !== 'delivered';
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
          <div className="noir-spinner"></div>
          <p style={{ marginTop: '1rem', color: '#a08a75' }}>Loading order history…</p>
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
                    {(order.shippingAddress || order.shippingInfo) && (
                      <div className="detail-section">
                        <h5 className="detail-section-title"><FaMapMarkerAlt /> Shipping Address</h5>
                        <div className="detail-address">
                          {(() => {
                            const addr = order.shippingAddress || order.shippingInfo || {};
                            return (
                              <>
                                <p>{addr.firstName} {addr.lastName}</p>
                                <p>{addr.address}</p>
                                <p>
                                  {addr.town && `${addr.town}, `}
                                  {addr.county && `${addr.county} County, `}
                                  {addr.city && `${addr.city}, `}
                                  {addr.country || 'Kenya'}
                                </p>
                                {addr.phone && <p>Phone: {addr.phone}</p>}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Payment Info */}
                    <div className="detail-section">
                      <h5 className="detail-section-title">Payment</h5>
                      <div className="detail-payment-row">
                        <span>Method: {order.paymentMethod === 'mpesa' ? 'M-Pesa Express' : order.paymentMethod?.toUpperCase() || 'M-Pesa'}</span>
                        <span className={`status-badge payment ${order.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
                          {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                      {order.transactionId && (
                        <p className="mpesa-receipt">Receipt Ref: <code>{order.transactionId}</code></p>
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

                  {/* Story 2: Live-Validated Reorder Button */}
                  <button
                    type="button"
                    className="btn-order-primary"
                    disabled={reorderingId === order._id}
                    onClick={() => handleReorder(order)}
                  >
                    {reorderingId === order._id ? (
                      <><FaSpinner className="fa-spin" /> Verifying…</>
                    ) : (
                      <><FaRedo /> Reorder</>
                    )}
                  </button>

                  {isCancelable && (
                    <button
                      type="button"
                      className="btn-order-cancel"
                      disabled={cancellingId === order._id || warningLoading}
                      onClick={() => handleCancelClick(order)}
                    >
                      {cancellingId === order._id ? '…' : <><FaBan /> Cancel</>}
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
                type="button"
                className="pagination-arrow"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Prev
              </button>
              <span className="pagination-text">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
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
        <div className="empty-state-luxury">
          <div className="empty-icon-wrap">
            <FaShoppingBag className="empty-icon" />
          </div>
          <h3>No Orders Found</h3>
          <p>{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Your orders will appear here after your first specialty roast purchase.'}</p>
          <button
            type="button"
            className="btn-order-primary"
            onClick={() => window.location.href = '/'}
          >
            Explore Coffee Shop
          </button>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancelReasonModal && (
        <div className="dashboard-modal-backdrop">
          <div className="dashboard-modal-window">
            <h3 style={{ marginTop: 0 }}>Cancel Order #{cancelReasonModal.orderNumber}</h3>

            {warningLoading ? (
              <p style={{ color: '#a08a75' }}>Loading cancellation policy…</p>
            ) : cancelWarningInfo ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', margin: '15px 0', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#f87171' }}>⚠️ Notice:</p>
                <p style={{ margin: 0 }}>{cancelWarningInfo.message}</p>
              </div>
            ) : null}

            <div className="modal-field">
              <label>Reason for Cancellation (Required)</label>
              <textarea
                placeholder="Please let us know why you are cancelling…"
                value={cancellationReasonText}
                onChange={(e) => setCancellationReasonText(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => {
                  setCancelReasonModal(null);
                  setCancelWarningInfo(null);
                  setCancellationReasonText('');
                }}
              >
                Abort
              </button>
              <button
                type="button"
                className="btn-modal-confirm-danger"
                disabled={cancellingId === cancelReasonModal._id || !cancellationReasonText.trim()}
                onClick={submitCancellation}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
