// context/AppContext.js - COMPLETE REWRITTEN VERSION
import React, { createContext, useCallback, useEffect, useState, useMemo, useRef } from 'react';
import API, {
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
  resetUserSecurity as apiResetUserSecurity
} from '../api/api';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderRefreshTrigger, setOrderRefreshTrigger] = useState(0); // Trigger for dashboard refresh

  // Notification system
  const [notifications, setNotifications] = useState([]);

  // Alert system (for backward compatibility)
  const [alert, setAlert] = useState({
    isVisible: false,
    message: '',
    type: 'info'
  });

  // Initialize cart from localStorage or empty array
  const [cart, setCartState] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : [];
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

  const [publicSettings, setPublicSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [globalMaintenance, setGlobalMaintenance] = useState(false);

  // Response interceptor to handle auth errors and maintenance
  // Interceptor removed: It was redundant with the one in src/api/api.js 
  // and causing double-redirect/loop issues during session expiration.
  // ==================== IDLE SESSION MANAGEMENT ====================
  const [isLocked, setIsLocked] = useState(false);
  const IDLE_TIMEOUT = 8 * 60 * 1000; // 8 minutes in milliseconds

  const checkForInactivity = useCallback(() => {
    // Skip if already locked or not logged in
    if (!user || !token || isLocked) return;

    // ONLY lock out administrators for security. Regular customers driving traffic shouldn't be locked out of their carts.
    const isAdminUser = user.userType === 'admin' || user.role === 'super-admin' || user.role === 'admin';
    if (!isAdminUser) return;

    const lastActivityStr = localStorage.getItem('lastActivity');
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();
    const now = Date.now();

    if (now - lastActivity > IDLE_TIMEOUT) {
      console.log('🔒 Session timed out due to inactivity');
      setIsLocked(true);
      // Optional: Prepare UI for locked state
    }
  }, [user, token, isLocked]);

  const updateActivity = useCallback(() => {
    // Only update if not locked
    if (!isLocked) {
      localStorage.setItem('lastActivity', Date.now().toString());
    }
  }, [isLocked]);

  // Unlock session
  const unlockSession = useCallback(() => {
    setIsLocked(false);
    updateActivity();
    localStorage.setItem('lastActivity', Date.now().toString());
  }, [updateActivity]);

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

  // Effect to check for inactivity periodically
  useEffect(() => {
    if (!user || isLocked) return;

    const interval = setInterval(checkForInactivity, 60000); // Check every minute

    // Initial check on mount/user change
    checkForInactivity();

    return () => clearInterval(interval);
  }, [user, isLocked, checkForInactivity]);

  // ==================== NOTIFICATION SYSTEM ====================

  // Add a new notification
  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      message,
      type,
      duration,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Success notification
  const showSuccess = useCallback((message, duration = 5000) => {
    return addNotification(message, 'success', duration);
  }, [addNotification]);

  // Error notification
  const showError = useCallback((message, duration = 5000) => {
    return addNotification(message, 'error', duration);
  }, [addNotification]);

  // Warning notification
  const showWarning = useCallback((message, duration = 5000) => {
    return addNotification(message, 'warning', duration);
  }, [addNotification]);

  // Info notification
  const showInfo = useCallback((message, duration = 5000) => {
    return addNotification(message, 'info', duration);
  }, [addNotification]);

  // ==================== ALERT SYSTEM (Backward Compatibility) ====================

  const showAlert = useCallback((message, type = 'info') => {
    // Also add as notification for the new system
    addNotification(message, type);

    // Keep old alert system for components that still use it
    setAlert({ isVisible: true, message, type });
  }, [addNotification]);

  const hideAlert = useCallback(() => {
    setAlert({ isVisible: false, message: '', type: 'info' });
  }, []);

  // Alias for backward compatibility
  const showNotification = showAlert;

  // ==================== AUTHENTICATION METHODS ====================

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    setUserType(null);
    setCartState([]);
    setIsLocked(false);
    // Clear token from memory
    import('../api/api').then(m => m.tokenStore.clear());
    // Remove any stale legacy localStorage key
    localStorage.removeItem('auth');
    localStorage.removeItem('lastActivity');
    console.log('🔓 Auth cleared completely');
  }, []);

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
  const setAuth = useCallback((userData, authToken, type) => {
    if (!authToken || !userData) {
      console.error('❌ Invalid auth data provided');
      return;
    }

    setUser(userData);
    setToken(authToken);
    setUserType(type);

    // Store token in MEMORY only (never localStorage)
    import('../api/api').then(m => m.tokenStore.set(authToken));

    // Persist user profile (NOT the token) for page-reload UX
    // On reload, we use the HttpOnly cookie to silently get a fresh token
    localStorage.setItem('auth', JSON.stringify({ user: userData, userType: type }));

    // Reset the session lock timer for this new login
    localStorage.setItem('lastActivity', Date.now().toString());
    setIsLocked(false);

    console.log('🔐 Auth set for:', userData.email, 'Type:', type);

    // Restore and Merge cart if available in user data
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
          // If exists in both, we can either sum quantities or take server version
          // Let's sum for best UX
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

  const addToCart = useCallback((product, quantity = 1, selectedSize = null) => {
    setCartState(prevCart => {
      const productId = product._id;

      if (!productId) {
        console.error('❌ Cannot add product to cart: Missing _id');
        return prevCart;
      }

      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(productId.toString())) {
        console.error('❌ Invalid product ID format:', productId);
        return prevCart;
      }

      let itemPrice = product.price;
      let finalSize = selectedSize || product.size || product.selectedSize || '250g';

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
        item._id === productId.toString() && item.size === finalSize
      );

      if (existingItemIndex > -1) {
        return prevCart.map((item, index) =>
          index === existingItemIndex
            ? {
              ...item,
              quantity: item.quantity + quantity,
              itemTotal: (item.quantity + quantity) * item.price
            }
            : item
        );
      } else {
        const cartItem = {
          _id: productId.toString(),
          productId: productId.toString(),
          name: product.name,
          price: itemPrice,
          quantity: quantity,
          size: finalSize,
          itemTotal: itemPrice * quantity,
          images: product.images || [],
          category: product.category,
          roastLevel: product.roastLevel,
          origin: product.origin,
          flavorNotes: product.flavorNotes,
          badge: product.badge
        };

        console.log('🛒 Adding to cart:', cartItem);
        return [...prevCart, cartItem];
      }
    });

    const sizeText = selectedSize ? ` (${selectedSize})` : '';
    showSuccess(`Added ${quantity} ${product.name}${sizeText} to cart`);

    // Sync with server if logged in
    if (token) {
      setCartState(currentCart => {
        apiSyncCart({ cart: currentCart }).catch(err => console.error('Cart sync failed:', err));
        return currentCart;
      });
    }
  }, [showSuccess, token]);

  const removeFromCart = useCallback((productId, size = null) => {
    setCartState(prevCart => {
      const updatedCart = prevCart.filter(item => {
        if (size) {
          return !(item._id === productId && item.size === size);
        } else {
          return item._id !== productId;
        }
      });

      console.log('🗑️ Removed from cart:', productId, size);
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

  const updateCartQuantity = useCallback((productId, quantity, size = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    setCartState(prevCart =>
      prevCart.map(item => {
        if (size) {
          return (item._id === productId && item.size === size)
            ? { ...item, quantity }
            : item;
        } else {
          return (item._id === productId)
            ? { ...item, quantity }
            : item;
        }
      })
    );

    // Sync with server if logged in
    if (token) {
      setCartState(currentCart => {
        apiSyncCart({ cart: currentCart }).catch(err => console.error('Cart sync failed:', err));
        return currentCart;
      });
    }
  }, [removeFromCart, token]);

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

      // STRICT SEPARATION: Admins cannot login as customers
      if (userData.role === 'admin' || userData.role === 'super-admin') {
        throw new Error('Administrator accounts cannot log in to the customer shop. Please use the Admin Portal.');
      }

      setAuth(userData, authToken, 'customer');
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

      setAuth(userData, authToken, 'customer');
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

      // STRICT SEPARATION: Admins cannot login as customers via Google
      if (userData.role === 'admin' || userData.role === 'super-admin') {
        throw new Error('Administrator accounts cannot log in to the customer shop. Please use the Admin Portal.');
      }

      setAuth(userData, authToken, 'customer');
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
      const response = await API.post('/auth/verify-email', { email, code });
      const { user: userData, token: authToken } = response.data.data;

      if (!validateToken(authToken)) throw new Error('Invalid token received');

      setAuth(userData, authToken, 'customer');
      showSuccess('Email verified! You are now logged in.');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Verification failed';
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

      // Update local storage
      const storedAuth = JSON.parse(localStorage.getItem('auth') || '{}');
      if (storedAuth.user) {
        localStorage.setItem('auth', JSON.stringify({
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

  // Change Password
  const changeUserPassword = useCallback(async (passwordData) => {
    setLoading(true);
    try {
      const response = await apiChangePassword(passwordData);
      showSuccess('Password changed successfully!');
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

  const isAdmin = userType === 'admin';
  const isSuperAdmin = user?.role === 'super-admin';
  const isCustomer = userType === 'customer';
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
    }
  }, []);

  // Listen for session expiration events from API layer to cleanly log out
  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn('⚠️ Session expired event received. Clearing authentication...');
      clearAuth();
      showWarning('Your session has expired. Please log in again.');
      setShowAuthModal(true);
      setAuthView('login');
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

  // Initialize auth — use silent refresh via HttpOnly cookie (no token in localStorage)
  useEffect(() => {
    const initializeAuth = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;
      
      try {
        console.log('🚀 Initializing App State...');
        
        // 1. Fetch settings first
        await fetchPublicSettings();
        
        // 2. Check auth
        const storedAuth = localStorage.getItem('auth');
        if (storedAuth) {
          try {
            const { user: cachedUser, token: cachedToken, userType: cachedType } = JSON.parse(storedAuth);
            
            // Try silent refresh
            try {
              const { default: axios } = await import('axios');
              const refreshRes = await axios.post(
                `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
                {},
                { withCredentials: true }
              );

              if (refreshRes.data.success && refreshRes.data.data.token) {
                const userData = refreshRes.data.data.user;
                const actualUserType = (userData.userType === 'admin' || userData.role === 'admin' || userData.role === 'super-admin') ? 'admin' : 'customer';
                setAuth(userData, refreshRes.data.data.token, actualUserType);
                console.log('✅ Session refreshed successfully');
              }
            } catch (refreshErr) {
              console.log('ℹ️ Silent refresh unavailable:', refreshErr.message);
              // Clear cache if the backend explicitly rejected the session
              if (refreshErr.response?.status === 401) {
                console.warn('🚨 Server explicitly invalidated session. Clearing cached credentials.');
                clearAuth();
              } else if (cachedToken) {
                // Otherwise fall back to cached session for offline/network issues
                setAuth(cachedUser, cachedToken, cachedType);
              }
            }
          } catch (e) {
            console.error('Malformed auth data:', e);
            clearAuth();
          }
        }

        // 3. Initialize cart
        const storedCart = localStorage.getItem('cart');
        if (storedCart) {
          try {
            const parsedCart = JSON.parse(storedCart);
            if (Array.isArray(parsedCart)) setCartState(parsedCart);
          } catch (e) {
            setCartState([]);
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        console.log('🏁 Initialization complete');
        setSettingsLoading(false);
      }
    };

    console.log('🏁 Initialization check passed');
    initializeAuth();

    return () => {
      console.log('🧹 Cleaning up initialization effect');
    };
  }, [clearAuth, validateToken, fetchPublicSettings]);

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
    user, token, userType, loading, isAuthenticated, isAdmin, isSuperAdmin, isCustomer, isLocked,
    notifications, alert,
    cart, isCartOpen, cartCount, mobileMenuOpen,
    showAuthModal, authView,
    addNotification, removeNotification, clearNotifications, showSuccess, showError, showWarning, showInfo,
    showAlert, hideAlert,
    login, loginWithGoogle, loginAdmin, verifyAdmin2FA, register, logout, clearAuth, unlockSession,
    updateUserProfile, changeUserPassword, deleteAccount, fetchUserOrders,
    addToCart, removeFromCart, updateCartQuantity, clearCart, getCartTotal, getCartItemCount,
    openCart, closeCart, toggleCart, setMobileMenuOpenState,
    fetchDashboardStats, fetchSalesAnalytics, fetchAdminUsers, updateUserRole, deleteUser, fetchAdminOrders, fetchAdminProducts,
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