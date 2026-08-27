// components/Cart/CartSidebar.jsx
import React, { useContext, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { FaTimes, FaArrowRight, FaTrash, FaPlus, FaMinus, FaShoppingBag, FaLeaf, FaExclamationTriangle } from 'react-icons/fa';
import './CartSidebar.css';

function CartSidebar() {
  const {
    user,
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    showNotification,
    setShowAuthModal,
    setAuthView,
    validateCartWithServer
  } = useContext(AppContext);

  const navigate = useNavigate();
  const [validationState, setValidationState] = useState({ isValid: true, hasIssues: false, itemsMap: {} });
  const [validating, setValidating] = useState(false);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, [setIsCartOpen]);

  // Validate cart against server database on open or item update
  useEffect(() => {
    if (!isCartOpen || !cart || cart.length === 0) {
      setValidationState({ isValid: true, hasIssues: false, itemsMap: {} });
      return;
    }

    let isMounted = true;
    const runValidation = async () => {
      setValidating(true);
      try {
        if (typeof validateCartWithServer === 'function') {
          const result = await validateCartWithServer(cart);
          if (isMounted && result) {
            const map = {};
            if (Array.isArray(result.items)) {
              result.items.forEach(valItem => {
                const key = `${valItem.product || valItem.id || valItem._id}-${valItem.size}`;
                map[key] = valItem;
              });
            }
            setValidationState({
              isValid: result.isValid !== false,
              hasIssues: !!result.hasIssues,
              itemsMap: map
            });
          }
        }
      } catch (err) {
        console.warn('Cart live validation warning:', err.message);
      } finally {
        if (isMounted) setValidating(false);
      }
    };

    runValidation();

    return () => {
      isMounted = false;
    };
  }, [isCartOpen, cart, validateCartWithServer]);

  const openShop = () => {
    closeCart();
    navigate('/', { state: { scrollTo: 'coffee-shop' } });
  };

  // Check if any cart item is currently out of stock
  const hasOutOfStockItems = cart?.some(item => {
    const key = `${item.productId || item.id || item._id}-${item.size}`;
    const validated = validationState.itemsMap[key];
    return validated?.isOutOfStock || validated?.isUnavailable;
  });

  const proceedToCheckout = () => {
    if (!cart || cart.length === 0) {
      showNotification('Your collection is empty', 'warning');
      return;
    }

    if (hasOutOfStockItems) {
      showNotification('Please remove out-of-stock items before proceeding to checkout', 'error');
      return;
    }

    if (user) {
      closeCart();
      navigate('/checkout');
    } else {
      // Save internal redirect target safely for Story 2
      sessionStorage.setItem('authRedirect', '/checkout');
      closeCart();
      setAuthView('login');
      setShowAuthModal(true);
      showNotification('Please log in or register to complete your order', 'info');
    }
  };

  const handleQuantityUpdate = (item, delta) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      removeFromCart(item.id || item._id, item.size);
    } else {
      updateCartQuantity(item.id || item._id, newQuantity, item.size);
    }
  };

  const itemCount = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const displayTotal = cart?.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;

  const getImg = (item) => {
    if (item.images && item.images.length > 0) return item.images[0].url || item.images[0];
    return item.image || item.imageUrl || '/images/placeholder-coffee.jpg';
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            className="premium-cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          {/* Sidebar */}
          <motion.div
            className="premium-cart-sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="p-cart-header">
              <div className="p-cart-title-row">
                <span className="p-cart-subtitle">Selection</span>
                <h2 className="p-cart-title">Your <span>Collection</span></h2>
              </div>
              <button className="p-cart-close" onClick={closeCart} aria-label="Close cart">
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div className="p-cart-content">
              {cart && cart.length > 0 && (
                <div className="p-cart-meta">
                  <span>{itemCount} Exceptional {itemCount === 1 ? 'Bean' : 'Beans'}</span>
                  <button className="p-cart-clear" onClick={clearCart}>
                    <FaTrash size={12} /> Clear Collection
                  </button>
                </div>
              )}

              <div className="p-cart-items-list">
                {!cart || cart.length === 0 ? (
                  <motion.div
                    className="p-cart-empty"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="empty-glow">
                      <FaLeaf className="leaf-icon" />
                    </div>
                    <h3>Start Your Journey</h3>
                    <p>Your treasure chest is currently empty. Explore our highland farms to find the perfect brew.</p>
                    <button className="btn-premium" onClick={openShop} style={{ padding: '1rem 2rem' }}>
                      Start Shopping
                    </button>
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {cart.map((item, index) => {
                      const itemKey = `${item.productId || item.id || item._id}-${item.size}`;
                      const validation = validationState.itemsMap[itemKey];

                      return (
                        <motion.div
                          key={itemKey}
                          className={`p-cart-item-card ${validation?.isOutOfStock ? 'out-of-stock-card' : ''}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                          layout
                        >
                          <div className="p-item-img">
                            <img src={getImg(item)} alt={item.name} />
                            <div className="p-item-img-overlay"></div>
                          </div>

                          <div className="p-item-info">
                            <div className="p-item-main">
                              <h4>{item.name}</h4>
                              <span className="p-item-size">{item.size} Edition</span>

                              {/* Real-Time Live Server Stock / Price Alerts */}
                              {validation && (
                                <div className="p-item-stock-warning">
                                  {validation.isOutOfStock && (
                                    <span className="stock-badge-out">
                                      <FaExclamationTriangle /> Out of Stock
                                    </span>
                                  )}
                                  {validation.isLowStock && !validation.isOutOfStock && (
                                    <span className="stock-badge-low">
                                      Only {validation.availableStock} left in stock
                                    </span>
                                  )}
                                  {validation.priceChanged && (
                                    <span className="stock-badge-low">
                                      Price updated to KES {validation.price?.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="p-item-footer">
                              <div className="p-item-price-row">
                                <span className="p-item-price">KES {item.price?.toLocaleString()}</span>
                              </div>

                              <div className="p-item-controls">
                                <div className="p-qty-stepper">
                                  <button onClick={() => handleQuantityUpdate(item, -1)} aria-label="Subtract"><FaMinus /></button>
                                  <span>{item.quantity}</span>
                                  <button onClick={() => handleQuantityUpdate(item, 1)} aria-label="Add"><FaPlus /></button>
                                </div>
                                <button
                                  className="p-item-remove"
                                  onClick={() => removeFromCart(item.id || item._id, item.size)}
                                  title="Remove item"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Footer */}
            {cart && cart.length > 0 && (
              <div className="p-cart-footer">
                {/* Out of Stock Blocker Warning */}
                {hasOutOfStockItems && (
                  <div className="cart-blocking-alert">
                    <FaExclamationTriangle /> Please remove out-of-stock items above to checkout.
                  </div>
                )}

                <div className="p-total-section">
                  <div className="p-total-row">
                    <span className="p-total-label">Subtotal</span>
                    <span className="p-total-value">KES {displayTotal.toLocaleString()}</span>
                  </div>
                  <p className="p-shipping-note">Shipping & destination options calculated at checkout.</p>
                </div>

                <div className="p-cart-actions">
                  <motion.button
                    className={`btn-premium p-checkout-btn ${hasOutOfStockItems ? 'blocked' : ''}`}
                    onClick={proceedToCheckout}
                    disabled={hasOutOfStockItems}
                    whileHover={!hasOutOfStockItems ? { scale: 1.02 } : {}}
                    whileTap={!hasOutOfStockItems ? { scale: 0.98 } : {}}
                  >
                    Proceed to Checkout
                    <FaArrowRight />
                  </motion.button>
                  <button className="btn-ghost-premium p-continue-btn" onClick={openShop}>
                    Keep Exploring
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CartSidebar;