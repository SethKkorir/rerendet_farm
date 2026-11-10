// components/Cart/CartSidebar.jsx
import React, { useContext, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';
import { FaTimes, FaArrowRight, FaTrash, FaPlus, FaMinus, FaWhatsapp, FaShoppingBag } from 'react-icons/fa';
import { isProductOutOfStock } from '../../utils/stockValidator';
import { generateSpecialtyBagSvg, generateEquipmentSvg } from '../CoffeeShop/CoffeeShop';
import './CartSidebar.css';

function CartSidebar() {
  const {
    user,
    isCustomer,
    isAdmin,
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    showNotification,
    setAuthView,
    validateCartWithServer,
    publicSettings
  } = useContext(AppContext);

  const navigate = useNavigate();

  useEffect(() => {
    if (isCartOpen && cart && cart.length > 0) {
      validateCartWithServer();
    }
  }, [isCartOpen, validateCartWithServer]);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, [setIsCartOpen]);

  const openShop = () => {
    closeCart();
    navigate('/');
    setTimeout(() => {
      const shopSection = document.getElementById('coffee-shop');
      if (shopSection) {
        shopSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const currencySymbol = publicSettings?.payment?.currencySymbol || 'KSh';

  const itemCount = useMemo(() => {
    return cart?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
  }, [cart]);

  const displayTotal = useMemo(() => {
    return cart?.reduce((total, item) => total + ((Number(item.price) || 0) * (item.quantity || 1)), 0) || 0;
  }, [cart]);

  const proceedToCheckout = async () => {
    if (!cart || cart.length === 0) return;

    const hasLocalOos = cart.some(item => isProductOutOfStock(item));
    if (hasLocalOos) {
      showNotification('Out of stock items cannot be checked out.', 'error');
      await validateCartWithServer();
      return;
    }

    const valResult = await validateCartWithServer();
    if (valResult?.hasIssues) {
      const hasOutOfStock = valResult.items?.some(i => i.isOutOfStock || i.isUnavailable);
      if (hasOutOfStock) {
        showNotification('Out of stock items were removed from your cart.', 'warning');
        return;
      }
    }

    if (user || isCustomer) {
      closeCart();
      navigate('/checkout');
    } else {
      closeCart();
      setAuthView('signup');
      navigate('/signup?redirect=checkout');
    }
  };

  const handleQuantityUpdate = (item, delta) => {
    if (isProductOutOfStock(item)) {
      showNotification(`"${item.name}" is out of stock.`, 'error');
      removeFromCart(item.id || item._id, item.size, item.grind);
      return;
    }
    const newQuantity = (item.quantity || 1) + delta;
    if (newQuantity <= 0) {
      removeFromCart(item.id || item._id, item.size, item.grind);
    } else {
      updateCartQuantity(item.id || item._id, newQuantity, item.size, item.grind);
    }
  };

  const handleWhatsAppCartOrder = () => {
    if (!cart || cart.length === 0) return;
    const phone = (publicSettings?.support?.whatsapp || '+254700000000').replace(/[^0-9]/g, '');
    let msg = `Hi Rerendet Farm! ☕\nI would like to order:\n\n`;
    cart.forEach((item, idx) => {
      const sizeStr = item.size && item.size !== 'Standard' ? ` (${item.size})` : '';
      const lineTotal = (Number(item.price) || 0) * (item.quantity || 1);
      msg += `${idx + 1}. *${item.name}*${sizeStr} × ${item.quantity} = ${currencySymbol} ${Number(lineTotal).toLocaleString()}\n`;
    });
    msg += `\n*Total: ${currencySymbol} ${Number(displayTotal).toLocaleString()}*`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const getItemImage = (item) => {
    if (item.images && item.images.length > 0) {
      const first = item.images[0];
      return typeof first === 'string' ? first : first.url;
    }
    if (item.image) return item.image;
    if (item.imageUrl) return item.imageUrl;

    const isCoffee = Boolean(
      item.roastLevel ||
      (Array.isArray(item.flavorNotes) && item.flavorNotes.length > 0) ||
      (item.category || '').toLowerCase().includes('coffee') ||
      (item.name || '').toLowerCase().includes('coffee')
    );

    if (isCoffee) {
      return generateSpecialtyBagSvg(
        item,
        {
          body: '#2A1F18',
          bodyShade: '#1C140F',
          highlight: '#3D2C22',
          topFold: '#241913',
          sideGusset: '#150E0A',
          accent: '#D4AF37',
          text: '#FAF6F0',
          subText: '#D4AF37',
          barcodeColor: '#FFFFFF'
        },
        item.size || '250g'
      );
    }

    return generateEquipmentSvg(item);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            className="premium-cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          <motion.div
            className="premium-cart-sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          >
            {/* Header */}
            <div className="p-cart-header">
              <h2 className="p-cart-title">
                Cart {itemCount > 0 && <span className="p-cart-count">({itemCount})</span>}
              </h2>
              <button
                type="button"
                className="p-cart-close"
                onClick={closeCart}
                aria-label="Close cart"
              >
                <FaTimes />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-cart-content">
              {!cart || cart.length === 0 ? (
                <div className="p-cart-empty">
                  <FaShoppingBag className="empty-icon" />
                  <h3>Your cart is empty</h3>
                  <button
                    type="button"
                    className="p-shop-btn"
                    onClick={openShop}
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="p-cart-items-list">
                  <AnimatePresence mode="popLayout">
                    {cart.map((item, index) => {
                      const isOos = isProductOutOfStock(item);
                      const unitPrice = Number(item.price) || 0;
                      const lineTotal = unitPrice * (item.quantity || 1);
                      const imgSrc = getItemImage(item);

                      return (
                        <motion.div
                          key={`${item._id || item.id || index}-${item.size || 'std'}-${item.grind || 'wb'}`}
                          className={`p-cart-item ${isOos ? 'p-item-oos' : ''}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                        >
                          <div className="p-item-thumb">
                            <img src={imgSrc} alt={item.name} loading="lazy" />
                          </div>

                          <div className="p-item-body">
                            <div className="p-item-header">
                              <h4 className="p-item-title">{item.name}</h4>
                              <button
                                type="button"
                                className="p-item-del"
                                onClick={() => removeFromCart(item.id || item._id, item.size, item.grind)}
                                aria-label="Remove item"
                              >
                                <FaTrash size={11} />
                              </button>
                            </div>

                            <div className="p-item-specs-row" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.2rem' }}>
                              {item.size && item.size !== 'Standard' && (
                                <span className="p-item-weight">{item.size}</span>
                              )}
                              {item.grind && (
                                <span className="p-item-weight" style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
                                  ⚙️ {item.grind}
                                </span>
                              )}
                            </div>

                            {isOos && (
                              <span className="p-item-oos-badge">Out of Stock</span>
                            )}

                            <div className="p-item-bottom">
                              <span className="p-item-price">
                                {currencySymbol} {Number(lineTotal).toLocaleString()}
                              </span>

                              <div className="p-item-stepper">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityUpdate(item, -1)}
                                  disabled={item.quantity <= 1}
                                  aria-label="Decrease"
                                >
                                  <FaMinus size={9} />
                                </button>
                                <span className="p-item-qty">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityUpdate(item, 1)}
                                  disabled={isOos}
                                  aria-label="Increase"
                                >
                                  <FaPlus size={9} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Clean Footer */}
            {cart && cart.length > 0 && (
              <div className="p-cart-footer">
                <div className="p-shipping-row">
                  <span className="p-shipping-label">Shipping</span>
                  <span className="p-shipping-val">Calculated at checkout</span>
                </div>

                <div className="p-total-row">
                  <span className="p-total-title">Total</span>
                  <span className="p-total-amount">
                    {currencySymbol} {Number(displayTotal).toLocaleString()}
                  </span>
                </div>

                <div className="p-cart-actions">
                  <button
                    type="button"
                    className="p-checkout-btn"
                    onClick={proceedToCheckout}
                  >
                    <span>Checkout</span>
                    <FaArrowRight size={12} />
                  </button>

                  <button
                    type="button"
                    className="p-whatsapp-btn"
                    onClick={handleWhatsAppCartOrder}
                  >
                    <FaWhatsapp size={15} />
                    <span>WhatsApp</span>
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
