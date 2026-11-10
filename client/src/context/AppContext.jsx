// context/AppContext.js - COMPLETE REWRITTEN VERSION
import React, { createContext, useCallback, useEffect, useState, useMemo, useRef } from 'react';
import API, {
  tokenStore,
  login as apiLogin,
  loginAdmin as apiLoginAdmin,
  googleLogin,
  getCurrentUser,
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword,
  deleteAccount as apiDeleteAccount,
  getMyOrders,
  getDashboardStats,
  getSalesAnalytics,
  getAdminUsers,
  updateUserRole as apiUpdateUserRole,
  deleteUser as apiDeleteUser,
  getAdminOrders,
  getAdminProducts,
  getPublicSettings,
  getCart as apiGetCart,
  syncCart as apiSyncCart,
  verifyPassword as apiVerifyPassword,
  logAbandonedCheckout as apiLogAbandoned,
  getAbandonedCheckouts as apiGetAbandoned,
  unlockUserAccount as apiUnlockUser,
  resetUserSecurity as apiResetUserSecurity,
  generateUserPasswordReset as apiGenerateUserPasswordReset,
  unlockCustomerPassword as apiUnlockCustomerPassword,
  validateCart as apiValidateCart
} from '../api/api';
import { isProductOutOfStock, getAvailableStockCount } from '../utils/stockValidator';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      const saved = localStorage.getItem(isAdminRoute ? 'admin_auth' : 'customer_auth') || localStorage.getItem('admin_auth') || localStorage.getItem('customer_auth') || localStorage.getItem('auth');
      return saved ? JSON.parse(saved).user : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    try {
      const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      const saved = localStorage.getItem(isAdminRoute ? 'admin_auth' : 'customer_auth') || localStorage.getItem('admin_auth') || localStorage.getItem('customer_auth') || localStorage.getItem('auth');
      const t = saved ? JSON.parse(saved).token : null;
      if (t) tokenStore.set(t);
      return t;
    } catch { return null; }
  });
  const [userType, setUserType] = useState(() => {
    try {
      const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      const saved = localStorage.getItem(isAdminRoute ? 'admin_auth' : 'customer_auth') || localStorage.getItem('admin_auth') || localStorage.getItem('customer_auth') || localStorage.getItem('auth');
      return saved ? JSON.parse(saved).userType : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [orderRefreshTrigger, setOrderRefreshTrigger] = useState(0); // Trigger for dashboard refresh

  // Notification system
  const [notifications, setNotifications] = useState([]);

  // Alert system (for backward compatibility)
  const [alert, setAlert] = useState({
    isVisible: false,
    message: '',
    type: 'info'
  });

  // Initialize cart from localStorage or empty array, purging any out-of-stock items immediately
  const [cart, setCartState] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (!savedCart) return [];
      const parsedCart = JSON.parse(savedCart);
      return Array.isArray(parsedCart) ? parsedCart.filter(item => !isProductOutOfStock(item)) : [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState('login');

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cart]);

  const [publicSettings, setPublicSettings] = useState(() => {
    try {
      const cached = sessionStorage.getItem('rerendet_cached_settings');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [settingsLoading, setSettingsLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('rerendet_cached_settings');
    } catch {
      return true;
    }
  });
  const [globalMaintenance, setGlobalMaintenance] = useState(false);

  // Response interceptor to handle auth errors and maintenance
  // Interceptor removed: It was redundant with the one in src/api/api.js 
  // and causing double-redirect/loop issues during session expiration.
  // ==================== IDLE SESSION MANAGEMENT ====================
  const [isLocked, setIsLocked] = useState(false);

  // Inactivity timeout threshold: use security settings if set (converted from hours), default to 30 mins
  const IDLE_TIMEOUT = (publicSettings?.security?.sessionTimeout && Number(publicSettings.security.sessionTimeout) > 0)
    ? Number(publicSettings.security.sessionTimeout) * 60 * 60 * 1000
    : 30 * 60 * 1000;

  const checkForInactivity = useCallback(() => {
    // Skip if already showing timeout modal or not logged in
    if (!user || !token || isLocked) return;

    // ONLY monitor administrators for automatic security timeout. Regular customers driving traffic shouldn't be locked out of their carts.
    const isAdminUser = user.userType === 'admin' || user.role === 'super-admin' || user.role === 'admin';
    if (!isAdminUser) return;

    const lastActivityStr = localStorage.getItem('lastActivity');
    if (!lastActivityStr) {
      localStorage.setItem('lastActivity', Date.now().toString());
      return;
    }

    const lastActivity = parseInt(lastActivityStr, 10);
    const now = Date.now();

    if (now - lastActivity > IDLE_TIMEOUT) {
      console.log('🔒 Session countdown triggered due to inactivity');
      setIsLocked(true);
    }
  }, [user, token, isLocked, IDLE_TIMEOUT]);

  const updateActivity = useCallback(() => {
    // Only update if countdown is not active
    if (!isLocked) {
      localStorage.setItem('lastActivity', Date.now().toString());
    }
  }, [isLocked]);

  // Unlock session (extend session & dismiss countdown modal)
  const unlockSession = useCallback(() => {
    setIsLocked(false);
    updateActivity();
    localStorage.setItem('lastActivity', Date.now().toString());
  }, [updateActivity]);

  // Expose manual test trigger for verification
  useEffect(() => {
    window.__triggerSessionTimeout = () => {
      console.log('🧪 Manual trigger: Session timeout countdown modal');
      setIsLocked(true);
    };
    return () => {
      delete window.__triggerSessionTimeout;
    };
  }, []);

  // Effect to track activity
  useEffect(() => {
    // Events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    // Throttle the updateActivity call to avoid performance hit
    let timeoutId;
    const handleActivity = () => {
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          updateActivity();
          timeoutId = null;
        }, 1000); // Update max once per second
      }
    };

    if (user && !isLocked) {
      events.forEach(event => window.addEventListener(event, handleActivity));

      // Initialize if not set
      if (!localStorage.getItem('lastActivity')) {
        updateActivity();
      }
    }

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, isLocked, updateActivity]);

  // Effect to check for inactivity periodically (every 10 seconds)
  useEffect(() => {
    if (!user || isLocked) return;

    const interval = setInterval(checkForInactivity, 10000); // Check every 10 seconds

    // Initial check on mount/user change
    checkForInactivity();

    return () => clearInterval(interval);
  }, [user, isLocked, checkForInactivity]);

  // ==================== NOTIFICATION SYSTEM ====================
  const lastNotifRef = useRef({ key: '', time: 0 });

  // Remove a specific notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Add a new notification with deduplication and queue bounding
  const addNotification = useCallback((message, type = 'info', duration = 4500, title = null) => {
    if (!message) return null;

    // Deduplication check: suppress identical toasts firing within 1200ms
    const notifKey = `${type}:${typeof message === 'string' ? message : JSON.stringify(message)}`;
    const now = Date.now();
    if (lastNotifRef.current.key === notifKey && now - lastNotifRef.current.time < 1200) {
      return null;
    }
    lastNotifRef.current = { key: notifKey, time: now };

    const id = `${now}-${Math.random().toString(36).substring(2, 7)}`;
    const newNotification = {
      id,
      title,
      message,
      type,
      duration,
      createdAt: now
    };

    // Keep at most 4 active notifications simultaneously to avoid clutter
    setNotifications(prev => [...prev.slice(-3), newNotification]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  }, []);

  // Success notification
  const showSuccess = useCallback((message, duration = 4500, title = null) => {
    return addNotification(message, 'success', duration, title);
  }, [addNotification]);

  // Error notification
  const showError = useCallback((message, duration = 5000, title = null) => {
    return addNotification(message, 'error', duration, title);
  }, [addNotification]);

  // Warning notification
  const showWarning = useCallback((message, duration = 5000, title = null) => {
    return addNotification(message, 'warning', duration, title);
  }, [addNotification]);

  // Info notification
  const showInfo = useCallback((message, duration = 4500, title = null) => {
    return addNotification(message, 'info', duration, title);
  }, [addNotification]);

  // ==================== ALERT SYSTEM (Backward Compatibility) ====================

  const showAlert = useCallback((message, type = 'info') => {
    addNotification(message, type);
    setAlert({ isVisible: true, message, type });
  }, [addNotification]);

  const hideAlert = useCallback(() => {
    setAlert({ isVisible: false, message: '', type: 'info' });
  }, []);

  // Alias for backward compatibility
  const showNotification = showAlert;

  // ==================== AUTHENTICATION METHODS ====================

  const clearAuth = useCallback((role = null, skipBroadcast = false) => {
    const shouldSkipBroadcast = typeof role === 'boolean' ? role : skipBroadcast;
    const targetRole = typeof role === 'string' ? role : null;

    if (!targetRole || targetRole === 'admin') {
      localStorage.removeItem('admin_auth');
    }
    if (!targetRole || targetRole === 'customer') {
      localStorage.removeItem('customer_auth');
      setCartState([]);
    }
    localStorage.removeItem('auth');
    localStorage.removeItem('lastActivity');

    const currentIsAdmin = userType === 'admin' || user?.role === 'super-admin' || user?.role === 'admin';
    const shouldClearMemory = !targetRole || (targetRole === 'admin' && currentIsAdmin) || (targetRole === 'customer' && !currentIsAdmin);

    if (shouldClearMemory) {
      setUser(null);
      setToken(null);
      setUserType(null);
      setIsLocked(false);
      tokenStore.clear();
      console.log('🔓 Auth cleared from memory for:', targetRole || 'all');
    }

    // Synchronize across tabs via BroadcastChannel with role payload
    if (!shouldSkipBroadcast) {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('rerendet_auth_sync');
          bc.postMessage({ type: 'LOGOUT', role: targetRole });
          bc.close();
        }
      } catch (_) { }
    }
  }, [userType, user]);

  // Map server-side cart to frontend structure
  const formatServerCart = useCallback((serverCart) => {
    if (!serverCart || !Array.isArray(serverCart)) return [];

    return serverCart.map(item => {
      const p = item.product || {};
      let itemPrice = item.price || p.price || 0;

      // Ensure we get the correct price for the saved size if possible
      if (p.sizes && p.sizes.length > 0) {
        const sizeData = p.sizes.find(s => s.size === item.size);
        if (sizeData) {
          itemPrice = sizeData.price;
        }
      }

      return {
        _id: p._id || item.product,
        productId: p._id || item.product,
        name: p.name || 'Unknown Product',
        price: itemPrice,
        quantity: item.quantity || 1,
        size: item.size || '250g',
        itemTotal: itemPrice * (item.quantity || 1),
        images: p.images || [],
        category: p.category,
        roastLevel: p.roastLevel,
        origin: p.origin,
        flavorNotes: p.flavorNotes,
        badge: p.badge
      };
    });
  }, []);

  // Set authentication
  const setAuth = useCallback((userData, authToken, type, skipBroadcast = false) => {
    if (!userData) {
      console.error('❌ Invalid auth data provided');
      return;
    }

    const isAdmin = type === 'admin' || userData.userType === 'admin' || userData.role === 'admin' || userData.role === 'super-admin';
    const effectiveType = isAdmin ? 'admin' : 'customer';

    setUser(userData);
    if (authToken) {
      setToken(authToken);
      tokenStore.set(authToken);
    }
    setUserType(effectiveType);
    setIsLocked(false);

    // Isolated storage: admin uses admin_auth, customer uses customer_auth
    try {
      const storageKey = effectiveType === 'admin' ? 'admin_auth' : 'customer_auth';
      localStorage.setItem(storageKey, JSON.stringify({ user: userData, userType: effectiveType, token: authToken }));
      localStorage.removeItem('auth'); // Purge legacy shared key
      localStorage.setItem('lastActivity', Date.now().toString());
    } catch (_) { }

    console.log('🔐 Persistent Auth active for:', userData.email, 'Type:', effectiveType);

    // Multi-tab broadcast
    if (!skipBroadcast) {
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('rerendet_auth_sync');
          bc.postMessage({ type: 'LOGIN', user: userData, token: authToken, role: effectiveType });
          bc.close();
        }
      } catch (_) { }
    }

    // Restore and Merge cart ONLY for customers (administrators do not have a customer cart)
    if (effectiveType === 'customer') {
      setCartState(prevLocalCart => {
        const serverCart = (userData.cart && Array.isArray(userData.cart)) ? formatServerCart(userData.cart) : [];

        // If no server cart, stick with local
        if (serverCart.length === 0) return prevLocalCart;

        // If no local cart, use server cart
        if (prevLocalCart.length === 0) return serverCart;

        // Merge: Combine both, prioritising server items but adding unique local items
        const mergedCart = [...serverCart];

        prevLocalCart.forEach(localItem => {
          const existingIndex = mergedCart.findIndex(si =>
            (si.productId === localItem.productId || si._id === localItem._id) &&
            si.size === localItem.size
          );

          if (existingIndex > -1) {
            // If exists in both, sum quantities
            mergedCart[existingIndex].quantity += localItem.quantity;
            mergedCart[existingIndex].itemTotal = mergedCart[existingIndex].quantity * mergedCart[existingIndex].price;
          } else {
            // New guest item not on server yet
            mergedCart.push(localItem);
          }
        });

        // Sync merged cart BACK to server immediately
        apiSyncCart({ cart: mergedCart }).catch(err => console.error('Initial merged cart sync failed:', err));

        return mergedCart;
      });
    }
  }, [formatServerCart]);



  // Validate JWT token
  const validateToken = useCallback((token) => {
    if (!token) {
      console.error('❌ No token provided for validation');
      return false;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('❌ Invalid token structure');
        return false;
      }

      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;

      if (payload.exp && payload.exp < currentTime) {
        console.error('❌ Token expired');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Token validation failed:', error.message);
      return false;
    }
  }, []);

  // ==================== CART METHODS ====================

  const addToCart = useCallback((product, quantity = 1, selectedSize = null, selectedGrind = null) => {
    if (!product || !product._id) {
      console.error('❌ Cannot add product to cart: Missing _id');
      return;
    }

    const productId = product._id;
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(productId.toString())) {
      console.error('❌ Invalid product ID format:', productId);
      return;
    }

    // STRICT OUT-OF-STOCK CHECK: Never allow adding an out-of-stock product to cart!
    if (isProductOutOfStock(product)) {
      showError(`"${product.name || 'This coffee'}" is currently out of stock and cannot be added to your cart.`);
      // Auto-remove any existing occurrence of this product from cart
      setCartState(prevCart => prevCart.filter(item => item._id !== productId.toString() && item.productId !== productId.toString()));
      // Alert the admin immediately
      import('../api/api').then(m => m.reportOutOfStock(productId.toString())).catch(() => { });
      return;
    }

    const availableLimit = getAvailableStockCount(product);
    if (availableLimit <= 0) {
      showError(`"${product.name || 'This coffee'}" has 0 available units and cannot be added to cart.`);
      setCartState(prevCart => prevCart.filter(item => item._id !== productId.toString() && item.productId !== productId.toString()));
      return;
    }

    let addedSuccessfully = false;

    setCartState(prevCart => {
      let itemPrice = product.price;
      let finalSize = selectedSize || product.size || product.selectedSize || '250g';
      const finalGrind = selectedGrind || product.selectedGrind || product.grind || (product.roastLevel ? (product.defaultGrind || 'Whole Beans') : undefined);

      if (product.sizes && product.sizes.length > 0) {
        const selectedSizeData = product.sizes.find(size => size.size === finalSize);
        if (selectedSizeData) {
          itemPrice = selectedSizeData.price;
        } else {
          itemPrice = product.sizes[0].price;
          finalSize = product.sizes[0].size;
        }
      }

      if (!itemPrice || itemPrice <= 0) {
        console.warn('⚠️ No valid price found for product, using default');
        itemPrice = 1000;
      }

      const existingItemIndex = prevCart.findIndex(item =>
        item._id === productId.toString() &&
        item.size === finalSize &&
        (!finalGrind || item.grind === finalGrind)
      );

      if (existingItemIndex > -1) {
        const existingItem = prevCart[existingItemIndex];
        const newTotalQty = existingItem.quantity + quantity;
        const maxAvail = getAvailableStockCount(product);

        if (maxAvail > 0 && newTotalQty > maxAvail) {
          showError(`Only ${maxAvail} unit(s) available in stock for "${product.name}". Cannot add more.`);
          return prevCart;
        }

        addedSuccessfully = true;
        return prevCart.map((item, index) =>
          index === existingItemIndex
            ? {
              ...item,
              quantity: newTotalQty,
              itemTotal: (newTotalQty) * item.price
            }
            : item
        );
      } else {
        const maxAvail = getAvailableStockCount(product);
        if (maxAvail > 0 && quantity > maxAvail) {
          showError(`Only ${maxAvail} unit(s) available in stock for "${product.name}".`);
          return prevCart;
        }

        addedSuccessfully = true;
        const cartItem = {
          _id: productId.toString(),
          productId: productId.toString(),
          name: product.name,
          price: itemPrice,
          quantity: quantity,
          size: finalSize,
          grind: finalGrind,
          itemTotal: itemPrice * quantity,
          images: product.images || [],
          category: product.category,
          roastLevel: product.roastLevel,
          origin: product.origin,
          flavorNotes: product.flavorNotes,
          badge: product.badge,
          inStock: product.inStock,
          availableStock: product.availableStock,
          inventory: product.inventory
        };

        console.log('🛒 Adding to cart:', cartItem);
        return [...prevCart, cartItem];
      }
    });

    if (addedSuccessfully) {
      const sizeText = selectedSize ? ` (${selectedSize})` : '';
      const finalGrind = selectedGrind || product.selectedGrind || product.grind;
      const grindText = finalGrind ? ` [${finalGrind}]` : '';
      showSuccess(`Added ${quantity} ${product.name}${sizeText}${grindText} to cart`);

      // Sync with server if logged in
      if (token) {
        setCartState(currentCart => {
          apiSyncCart({ cart: currentCart }).catch(err => console.error('Cart sync failed:', err));
          return currentCart;
        });
      }
    }
  }, [showSuccess, showError, token]);

  const removeFromCart = useCallback((productId, size = null, grind = null) => {
    setCartState(prevCart => {
      const updatedCart = prevCart.filter(item => {
        if (size && grind) {
          return !(item._id === productId && item.size === size && item.grind === grind);
        } else if (size) {
          return !(item._id === productId && item.size === size);
        } else {
          return item._id !== productId;
        }
      });

      console.log('🗑️ Removed from cart:', productId, size, grind);
      return updatedCart;
    });
    showInfo('Product removed from cart');

    // Sync with server if logged in
    if (token) {
      setCartState(currentCart => {
        apiSyncCart({ cart: currentCart }).catch(err => console.error('Cart sync failed:', err));
        return currentCart;
      });
    }
  }, [showInfo, token]);

  const updateCartQuantity = useCallback((productId, quantity, size = null, grind = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, grind);
      return;
    }

    setCartState(prevCart => {
      const target = prevCart.find(item => item._id === productId && (!size || item.size === size) && (!grind || item.grind === grind));
      if (target && isProductOutOfStock(target)) {
        showError(`"${target.name}" is out of stock and was removed from your cart.`);
        return prevCart.filter(item => item._id !== productId);
      }

      return prevCart.map(item => {
        const match = size
          ? (item._id === productId && item.size === size && (!grind || item.grind === grind))
          : (item._id === productId);
        if (match) {
          const maxAvail = getAvailableStockCount(item);
          if (maxAvail > 0 && quantity > maxAvail) {
            showInfo(`Only ${maxAvail} unit(s) available in stock for ${item.name}`);
            return { ...item, quantity: maxAvail, itemTotal: item.price * maxAvail };
          }
          return { ...item, quantity, itemTotal: item.price * quantity };
        }
        return item;
      });
    });

    // Sync with server if logged in
    if (token) {
      setCartState(currentCart => {
        apiSyncCart({ cart: currentCart }).catch(err => console.error('Cart sync failed:', err));
        return currentCart;
      });
    }
  }, [removeFromCart, token, showError, showInfo]);

  const clearCart = useCallback(() => {
    setCartState([]);
    console.log('🛒 Cart cleared');
    showInfo('Cart cleared');

    // Sync with server if logged in
    if (token) {
      apiSyncCart({ cart: [] }).catch(err => console.error('Cart sync failed:', err));
    }
  }, [showInfo, token]);

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const getCartItemCount = useCallback(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  const cartCount = getCartItemCount();

  const validateCartWithServer = useCallback(async (cartItems = cart) => {
    if (!cartItems || cartItems.length === 0) {
      return { isValid: true, hasIssues: false, items: [], subtotal: 0 };
    }

    try {
      const payload = cartItems.map(item => ({
        product: item.product || item.productId || item._id,
        size: item.size || 'Standard',
        price: item.price,
        quantity: item.quantity,
        name: item.name
      }));

      const res = await apiValidateCart(payload);
      if (res.data && res.data.success) {
        const validatedItems = res.data.items || [];

        // STRICT PURGE: Auto-remove any items that are out of stock or unavailable
        const outOfStockItems = validatedItems.filter(item => item.isOutOfStock || item.isUnavailable || item.availableStock <= 0);

        if (outOfStockItems.length > 0) {
          const removedIds = new Set(outOfStockItems.map(i => (i.product || i._id).toString()));

          setCartState(prevCart => {
            const cleanCart = prevCart.filter(item => !removedIds.has(item._id.toString()));
            if (token) {
              apiSyncCart({ cart: cleanCart }).catch(err => console.error('Cart sync failed:', err));
            }
            return cleanCart;
          });

          outOfStockItems.forEach(oos => {
            showError(`"${oos.name}" is currently out of stock and has been automatically removed from your cart.`);
            // Alert admin of the out of stock occurrence
            import('../api/api').then(m => m.reportOutOfStock((oos.product || oos._id).toString())).catch(() => { });
          });
        }

        return res.data;
      }
      return { isValid: true, hasIssues: false, items: cartItems, subtotal: getCartTotal() };
    } catch (err) {
      console.warn('⚠️ Server cart validation non-blocking warning:', err.message);
      return { isValid: true, hasIssues: false, items: cartItems, subtotal: getCartTotal() };
    }
  }, [cart, getCartTotal, showError, token]);

  // ==================== UI METHODS ====================

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen(prev => !prev), []);

  const setMobileMenuOpenState = useCallback((isOpen) => {
    setMobileMenuOpen(isOpen);
    if (isOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }, []);

  // ==================== AUTH API METHODS ====================

  // Customer login
  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const response = await apiLogin(credentials);
      if (response.data.requires2FA) {
        setLoading(false);
        return response.data; // Return early without setting auth
      }

      const { user: userData, token: authToken } = response.data.data;

      if (!validateToken(authToken)) {
        throw new Error('Invalid token received from server');
      }

      const isPrivilegedAdmin = userData.userType === 'admin' || ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(userData.role);
      setAuth(userData, authToken, isPrivilegedAdmin ? 'admin' : 'customer');
      showSuccess('Login successful! Welcome back!');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setAuth, validateToken, showSuccess, showError]);

  // Verify 2FA Login
  const verify2FA = useCallback(async (email, code) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/customer/verify-2fa', { email, code });
      const { user: userData, token: authToken } = response.data.data;

      if (!validateToken(authToken)) throw new Error('Invalid token received');

      const isPrivilegedAdmin = userData.userType === 'admin' || ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(userData.role);
      setAuth(userData, authToken, isPrivilegedAdmin ? 'admin' : 'customer');
      showSuccess('Login successful!');
      return response.data;
    } catch (error) {
      showError(error.response?.data?.message || 'Verification failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setAuth, validateToken, showSuccess, showError]);

  // Verify Admin 2FA Login
  const verifyAdmin2FA = useCallback(async (email, code) => {
    setLoading(true);
    try {
      const response = await API.post(`/auth/${import.meta.env.VITE_ADMIN_PATH_SEGMENT || 'admin'}/verify-2fa`, { email, code });
      const { user: userData, token: authToken } = response.data.data;

      if (!validateToken(authToken)) throw new Error('Invalid token received');

      setAuth(userData, authToken, 'admin');
      showSuccess(`Admin login successful! Welcome ${userData.role === 'super-admin' ? 'Super Admin' : 'Admin'}!`);
      return response.data;
    } catch (error) {
      showError(error.response?.data?.message || 'Verification failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setAuth, validateToken, showSuccess, showError]);

  // Confirm Password
  const confirmPassword = useCallback(async (password) => {
    try {
      const response = await apiVerifyPassword({ password });
      return response.data.success;
    } catch (error) {
      const msg = error.response?.data?.message || 'Incorrect password';
      showError(msg);
      return false;
    }
  }, [showError]);

  // Admin login
  const loginAdmin = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const response = await apiLoginAdmin(credentials);

      // Handle 2FA
      if (response.data.requires2FA) {
        setLoading(false);
        return response.data; // Return early for UI to show code input
      }

      const { user: userData, token: authToken } = response.data.data;

      if (!validateToken(authToken)) {
        throw new Error('Invalid token received from server');
      }

      setAuth(userData, authToken, 'admin');
      showSuccess(`Admin login successful! Welcome ${userData.role === 'super-admin' ? 'Super Admin' : 'Admin'}!`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Admin login failed';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setAuth, validateToken, showSuccess, showError]);

  // Google login
  const loginWithGoogle = useCallback(async (googleData) => {
    setLoading(true);
    try {
      // Handle both standard credential (idToken) or custom accessToken
      const payload = googleData.credential
        ? { credential: googleData.credential }
        : { accessToken: googleData.access_token || googleData.accessToken };

      const response = await googleLogin(payload);

      // Handle 2FA (No token yet)
      if (response.data.requires2FA) {
        showInfo('Please check your email for the verification code.');
        return response.data;
      }

      const { user: userData, token: authToken } = response.data.data;

      if (!validateToken(authToken)) {
        throw new Error('Invalid token received from server');
      }

      const isPrivilegedAdmin = userData.userType === 'admin' || ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(userData.role);
      setAuth(userData, authToken, isPrivilegedAdmin ? 'admin' : 'customer');
      showSuccess(`Welcome ${userData.firstName}! Google login successful.`);
      return response.data;
    } catch (error) {
      console.error('❌ Google Login API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.response?.data
      });

      let errorMessage = error.response?.data?.message || 'Google login failed';

      // Check if the error is a HTML string (likely a 403 Forbidden from the server/WAF)
      if (typeof error.response?.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
        errorMessage = 'Security Block: Your current domain might not be whitelisted. Please check CORS settings.';
      }

      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setAuth, validateToken, showSuccess, showError, showInfo]);

  // Customer registration
  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const customerData = { ...userData, userType: 'customer' };
      const response = await API.post('/auth/customer/register', customerData);
      showSuccess('Registration successful! Please check your email for verification.');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // Verify email (Registration)
  const verifyEmail = useCallback(async (email, code) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/verify-email', { 
        email: email ? String(email).trim().toLowerCase() : '', 
        code: String(code || '').trim() 
      });
      const rawData = response.data?.data || {};
      const userData = rawData.user || rawData;
      const authToken = rawData.token || response.data?.token;

      if (!validateToken(authToken)) throw new Error('Invalid token received');

      const isPrivilegedAdmin = (userData.userType === 'admin') || ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(userData.role);
      setAuth(userData, authToken, isPrivilegedAdmin ? 'admin' : 'customer');
      showSuccess('Email verified! You are now logged in.');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Verification failed';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setAuth, validateToken, showSuccess, showError]);

  // Alias for backward compatibility or specific use cases
  const loginCustomer = login;

  // Logout
  const logout = useCallback(async () => {
    try {
      await API.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearAuth();
      setCartState([]);
      showInfo('Logged out successfully');
    }
  }, [clearAuth, showInfo]);

  // ==================== USER DATA METHODS ====================

  // Update Profile
  const updateUserProfile = useCallback(async (profileData) => {
    setLoading(true);
    try {
      const response = await apiUpdateProfile(profileData);
      const updatedUser = response.data.data;

      setUser(prev => ({ ...prev, ...updatedUser }));

      // Update role-isolated local storage
      const storageKey = userType === 'admin' ? 'admin_auth' : 'customer_auth';
      const storedAuth = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (storedAuth.user) {
        localStorage.setItem(storageKey, JSON.stringify({
          ...storedAuth,
          user: { ...storedAuth.user, ...updatedUser }
        }));
      }

      showSuccess('Profile updated successfully!');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // Sync user addresses in memory and local storage
  const updateUserAddresses = useCallback((newAddresses) => {
    setUser(prev => {
      if (!prev) return prev;
      const def = (newAddresses || []).find(a => a.isDefault) || (newAddresses && newAddresses[0]);
      const newShipping = def ? {
        address: def.address || '',
        city: def.city || '',
        county: def.county || '',
        town: def.town || '',
        zip: def.zip || '',
        country: def.country || 'Kenya',
        landmark: def.landmark || '',
        phone: def.phone || prev.phone || ''
      } : prev.shippingInfo;
      const updated = { ...prev, addresses: newAddresses || [], shippingInfo: newShipping };
      try {
        const storageKey = userType === 'admin' ? 'admin_auth' : 'customer_auth';
        const storedAuth = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (storedAuth.user) {
          localStorage.setItem(storageKey, JSON.stringify({
            ...storedAuth,
            user: { ...storedAuth.user, ...updated }
          }));
        }
      } catch (_) { }
      return updated;
    });
  }, []);

  // Change Password
  const changeUserPassword = useCallback(async (passwordData) => {
    setLoading(true);
    try {
      const response = await apiChangePassword(passwordData);
      showSuccess('Password changed successfully!');
      setUser(prev => prev ? ({ ...prev, passwordChangedAt: new Date().toISOString(), allowPasswordChangeOverride: false }) : null);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // Delete Account
  const deleteAccount = useCallback(async (password) => {
    setLoading(true);
    try {
      const response = await apiDeleteAccount({ password });
      showSuccess('Account deleted successfully. We are sorry to see you go!');
      logout(); // Logout after deletion
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete account';
      showError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError, logout]);

  // ==================== ROLE CHECKS ====================

  const isAdmin = userType === 'admin' || ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(user?.role);
  const isSuperAdmin = user?.role === 'super-admin' || user?.role === 'super_admin' || user?.role === 'owner';
  const isCustomer = !!user; // Every authenticated user has customer store & purchasing capabilities
  const isAuthenticated = !!user && !!token;

  // Polling for Real-time Order Updates
  useEffect(() => {
    let interval;
    // We use a ref to store state without triggering re-renders loop
    // But we need to persist this across renders.
    // However, since this Effect depends on auth, it resets on login/logout which is fine.
    // Using a Ref to hold known statuses to compare against.
    const knownStatusRef = {};

    if (isAuthenticated && isCustomer) {
      const checkOrders = async () => {
        try {
          // Fetch latest 5 orders to check for updates
          const response = await getMyOrders({ page: 1, limit: 5 });
          const recentOrders = response.data?.orders || [];

          let hasUpdates = false;

          recentOrders.forEach(order => {
            // Create a composite hash to detect ANY change in status or fulfillment
            const orderStateHash = `${order.status}|${order.fulfillmentStatus}|${order.paymentStatus}`;
            const lastState = knownStatusRef[order._id];

            // If we have seen this order before AND state is different
            if (lastState && lastState !== orderStateHash) {
              console.log(`🔔 Order Update: ${order.orderNumber} changed states.`);

              // Play subtle notification sound
              const AudioContext = window.AudioContext || window.webkitAudioContext;
              if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
              }

              // Format display status
              const displayStatus = order.fulfillmentStatus !== 'unfulfilled'
                ? order.fulfillmentStatus.toUpperCase()
                : order.status.toUpperCase();

              showInfo(`Update: Order #${order.orderNumber} is now ${displayStatus}`);
              hasUpdates = true;
            }

            // Update known status with the hash
            knownStatusRef[order._id] = orderStateHash;
          });

          if (hasUpdates) {
            setOrderRefreshTrigger(prev => prev + 1);
          }

        } catch (error) {
          // Silent fail on polling
        }
      };

      checkOrders(); // Initial run
      interval = setInterval(checkOrders, 10000); // Poll every 10 seconds for real-time feel
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, isCustomer, showInfo]);

  // Fetch My Orders
  const fetchUserOrders = useCallback(async (page = 1, limit = 10) => {
    try {
      const response = await getMyOrders({ page, limit });
      return response.data;
    } catch (error) {
      console.error('Fetch orders error:', error);
      // Don't show error toast on fetch failure to avoid spamming
      throw error;
    }
  }, []);

  const refreshOrders = useCallback(() => {
    setOrderRefreshTrigger(prev => prev + 1);
  }, []);

  // ==================== ADMIN DATA FETCHING METHODS ====================

  const fetchDashboardStats = useCallback(async (timeframe = '30d') => {
    try {
      const response = await getDashboardStats({ timeframe });
      return response.data;
    } catch (error) {
      console.error('Dashboard stats error:', error);
      showError('Failed to fetch dashboard statistics');
      throw error;
    }
  }, [showError]);

  const fetchSalesAnalytics = useCallback(async (period = '30d') => {
    try {
      const response = await getSalesAnalytics({ period });
      return response.data;
    } catch (error) {
      console.error('Sales analytics error:', error);
      showError('Failed to fetch sales analytics');
      throw error;
    }
  }, [showError]);

  const fetchAdminUsers = useCallback(async (params = {}) => {
    try {
      const response = await getAdminUsers(params);
      return response.data;
    } catch (error) {
      console.error('Admin users fetch error:', error);
      showError('Failed to fetch users');
      throw error;
    }
  }, [showError]);

  const updateUserRole = useCallback(async (id, role) => {
    try {
      const response = await apiUpdateUserRole(id, role);
      showSuccess('User role updated successfully');
      return response.data;
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update user role');
      throw error;
    }
  }, [showSuccess, showError]);

  const deleteUser = useCallback(async (id) => {
    try {
      const response = await apiDeleteUser(id);
      showSuccess('User deleted successfully');
      return response.data;
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete user');
      throw error;
    }
  }, [showSuccess, showError]);

  const unlockAccount = useCallback(async (id) => {
    try {
      const response = await apiUnlockUser(id);
      showSuccess('Account unlocked successfully');
      return response.data;
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to unlock account');
      throw error;
    }
  }, [showSuccess, showError]);

  const resetUserSecurity = useCallback(async (userId, type) => {
    try {
      const response = await apiResetUserSecurity(userId, type);
      showSuccess(response.data?.message || 'Security reset successful');
      return response.data;
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to reset security');
      throw error;
    }
  }, [showSuccess, showError]);

  const generateAdminPasswordReset = useCallback(async (userId) => {
    try {
      const response = await apiGenerateUserPasswordReset(userId);
      showSuccess(response.data?.message || 'Password reset link & code generated');
      return response.data;
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to generate password reset');
      throw error;
    }
  }, [showSuccess, showError]);

  const togglePasswordUnlock = useCallback(async (userId, payload = {}) => {
    try {
      const response = await apiUnlockCustomerPassword(userId, payload);
      showSuccess(response.data?.message || 'Password policy updated');
      return response.data;
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update password policy');
      throw error;
    }
  }, [showSuccess, showError]);

  const fetchAdminOrders = useCallback(async (params = {}) => {
    try {
      const response = await getAdminOrders(params);
      return response.data;
    } catch (error) {
      console.error('Admin orders fetch error:', error);
      showError('Failed to fetch orders');
      throw error;
    }
  }, [showError]);

  const fetchAdminProducts = useCallback(async (params = {}) => {
    try {
      const response = await getAdminProducts(params);
      return response.data;
    } catch (error) {
      console.error('Admin products fetch error:', error);
      showError('Failed to fetch products');
      throw error;
    }
  }, [showError]);

  const fetchAbandonedCheckouts = useCallback(async () => {
    try {
      const response = await apiGetAbandoned();
      return response.data;
    } catch (error) {
      console.error('Fetch abandoned error:', error);
      throw error;
    }
  }, []);

  const logAbandonedCheckout = useCallback(async (data) => {
    try {
      await apiLogAbandoned(data);
    } catch (error) {
      console.error('Log abandoned error:', error);
    }
  }, []);

  // ==================== AUTH INITIALIZATION ====================

  // Fetch Public Settings
  const fetchPublicSettings = useCallback(async () => {
    try {
      console.log('🌍 Fetching public settings...');
      const response = await getPublicSettings();
      console.log('✅ Public settings fetched:', response.data.success);
      if (response.data.success) {
        setPublicSettings(response.data.data);
        try {
          sessionStorage.setItem('rerendet_cached_settings', JSON.stringify(response.data.data));
        } catch (e) {
          // ignore quota limits
        }
        // If settings say enabled, make sure global state matches
        if (response.data.data.maintenance?.enabled) {
          setGlobalMaintenance(true);
        } else {
          setGlobalMaintenance(false);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch public settings:', error.message);

      if (error.response?.status === 503) {
        setGlobalMaintenance(true);
        // We set dummy settings object to satisfy maintenance checks
        setPublicSettings({
          maintenance: { enabled: true, message: error.response.data?.message }
        });
      } else {
        // Fallback settings to avoid blocking app if server is just being weird
        setPublicSettings({
          maintenance: { enabled: false }
        });
      }
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Listen for session expiration events from API layer to cleanly log out
  useEffect(() => {
    const handleAuthExpired = (event) => {
      const expiredScope = event?.detail?.scope;
      const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

      if (expiredScope && ((isAdminRoute && expiredScope === 'customer') || (!isAdminRoute && expiredScope === 'admin'))) {
        console.log(`ℹ️ Ignoring auth-expired event for ${expiredScope} on ${isAdminRoute ? 'admin' : 'store'} route`);
        return;
      }

      console.warn('⚠️ Session expired event received. Clearing authentication for active scope...');
      const roleToClear = isAdminRoute ? 'admin' : 'customer';
      clearAuth(roleToClear, false);
      showWarning('Your session has expired. Please log in again.');
      if (!isAdminRoute) {
        setShowAuthModal(true);
        setAuthView('login');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-expired', handleAuthExpired);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-expired', handleAuthExpired);
      }
    };
  }, [clearAuth, showWarning]);

  // Ref to track if initialization has already run
  const hasInitialized = useRef(false);

  // Multi-tab synchronization across browser tabs/windows (role-isolated)
  useEffect(() => {
    let bc;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('rerendet_auth_sync');
        bc.onmessage = (event) => {
          if (!event.data) return;
          const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

          if (event.data.type === 'LOGOUT') {
            const logoutRole = event.data.role;
            if (!logoutRole || (isAdminRoute && logoutRole === 'admin') || (!isAdminRoute && logoutRole === 'customer')) {
              console.log('🔄 Logout synchronized across tabs for role:', logoutRole || 'all');
              clearAuth(logoutRole, true);
            }
          } else if (event.data.type === 'LOGIN' && event.data.user) {
            const loginRole = event.data.role;
            if ((isAdminRoute && loginRole === 'admin') || (!isAdminRoute && loginRole === 'customer')) {
              console.log('🔄 Login synchronized across tabs for:', event.data.user.email);
              setAuth(event.data.user, event.data.token, event.data.role, true);
            }
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    return () => {
      if (bc) bc.close();
    };
  }, [clearAuth, setAuth]);

  // Initialize auth — persistent session via HttpOnly cookies and silent refresh
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      const authScope = isAdminRoute ? 'admin' : 'customer';

      try {
        console.log('🚀 Initializing persistent auth & application state for scope:', authScope);
        setAuthLoading(true);

        // 1. Fetch public settings
        await fetchPublicSettings();

        // 2. Persistent Authentication check via direct silent refresh
        let sessionRestored = false;

        try {
          const { default: axios } = await import('axios');
          let apiBase = import.meta.env.VITE_API_URL || '/api';
          if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            if (apiBase.includes('localhost') || apiBase.includes('127.0.0.1')) {
              apiBase = '/api';
            }
          }
          const refreshEndpoint = apiBase.endsWith('/') ? `${apiBase}auth/refresh` : `${apiBase}/auth/refresh`;

          const refreshRes = await axios.post(
            refreshEndpoint,
            {},
            {
              withCredentials: true,
              headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-Auth-Scope': authScope
              }
            }
          );

          if (refreshRes.data?.success && refreshRes.data?.data?.token) {
            const userData = refreshRes.data.data.user;
            const newToken = refreshRes.data.data.token;
            if (isMounted) {
              setAuth(userData, newToken, userData.userType || userData.role, true);
              sessionRestored = true;
              console.log('✅ Persistent session restored for:', userData.email);
            }
          }
        } catch (refreshErr) {
          // Normal guest visitor or expired session — no noisy alerts
          console.log('ℹ️ No active persistent refresh session found (guest visitor or expired)');
          // Only clear if server explicitly told us the token was revoked/reused
          if (refreshErr.response?.data?.code === 'TOKEN_REUSE_DETECTED') {
            clearAuth(authScope, true);
          }
        }

        // If no session restored from silent refresh, only clear auth if there's no valid local session
        if (!sessionRestored && isMounted) {
          const currentToken = tokenStore.get();
          const targetKey = isAdminRoute ? 'admin_auth' : 'customer_auth';
          const currentLocalAuth = localStorage.getItem(targetKey) || localStorage.getItem('auth');
          if (!currentToken && !currentLocalAuth) {
            clearAuth(authScope, true);
          } else {
            console.log('ℹ️ Retaining local active session state');
          }
        }

        // 3. Initialize cart
        const storedCart = localStorage.getItem('cart');
        if (storedCart) {
          try {
            const parsedCart = JSON.parse(storedCart);
            if (Array.isArray(parsedCart) && isMounted) {
              setCartState(prev => {
                if (prev && prev.length > 0) return prev;
                return parsedCart.filter(item => !isProductOutOfStock(item));
              });
            }
          } catch (e) {
            if (isMounted) setCartState([]);
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setAuthLoading(false);
        setSettingsLoading(false);
        console.log('🏁 Auth and application initialization completed');
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [clearAuth, setAuth, fetchPublicSettings]);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);



  // ==================== CONTEXT VALUE ====================

  const contextValue = useMemo(() => ({
    // Auth state
    user,
    token,
    userType,
    loading,
    authLoading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    isCustomer,
    isLocked,
    unlockSession,

    // Notification system
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Alert system (backward compatibility)
    alert,
    showAlert,
    hideAlert,
    showNotification, // Alias for backward compatibility

    // Auth methods
    login,
    loginCustomer,
    verify2FA,
    verifyAdmin2FA,
    loginAdmin,
    loginWithGoogle,
    register,
    verifyEmail,
    logout,
    clearAuth,
    updateUserProfile,
    confirmPassword,
    changeUserPassword,
    updateUserAddresses,
    deleteAccount,
    fetchUserOrders,

    // Admin data methods
    fetchDashboardStats,
    fetchSalesAnalytics,
    fetchAdminUsers,
    updateUserRole,
    deleteUser,
    unlockAccount,
    resetUserSecurity,
    generateAdminPasswordReset,
    togglePasswordUnlock,
    fetchAdminOrders,
    fetchAdminProducts,

    // Cart state
    cart,
    isCartOpen,
    cartCount,
    mobileMenuOpen,

    // Cart methods
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
    validateCartWithServer,

    // UI methods
    openCart,
    closeCart,
    toggleCart,
    setIsCartOpen,
    setMobileMenuOpen: setMobileMenuOpenState,
    showAuthModal,
    setShowAuthModal,
    authView,
    setAuthView,
    publicSettings,
    settingsLoading,
    fetchPublicSettings,
    globalMaintenance,
    setGlobalMaintenance,
    orderRefreshTrigger,
    refreshOrders,
    fetchAbandonedCheckouts,
    logAbandonedCheckout
  }), [
    user, token, userType, loading, authLoading, isAuthenticated, isAdmin, isSuperAdmin, isCustomer, isLocked,
    notifications, alert,
    cart, isCartOpen, cartCount, mobileMenuOpen,
    showAuthModal, authView,
    addNotification, removeNotification, clearNotifications, showSuccess, showError, showWarning, showInfo,
    showAlert, hideAlert,
    login, loginWithGoogle, loginAdmin, verifyAdmin2FA, register, logout, clearAuth, unlockSession,
    updateUserProfile, updateUserAddresses, changeUserPassword, deleteAccount, fetchUserOrders,
    addToCart, removeFromCart, updateCartQuantity, clearCart, getCartTotal, getCartItemCount, validateCartWithServer,
    openCart, closeCart, toggleCart, setMobileMenuOpenState,
    fetchDashboardStats, fetchSalesAnalytics, fetchAdminUsers, updateUserRole, deleteUser, unlockAccount, resetUserSecurity, togglePasswordUnlock, fetchAdminOrders, fetchAdminProducts,
    publicSettings, settingsLoading, fetchPublicSettings, globalMaintenance,
    orderRefreshTrigger, refreshOrders,
    fetchAbandonedCheckouts,
    logAbandonedCheckout
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}