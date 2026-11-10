// api/api.js — SECURE VERSION
// Access token is stored in MEMORY only (never localStorage).
// Refresh token lives in an HttpOnly Secure cookie (invisible to JS).
// On 401, we auto-call /auth/refresh to silently get a new access token.
import axios from 'axios';

let apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

// Self-healing fallback: If hosted on Vercel/production but baseURL points to localhost, force relative routing
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  if (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1')) {
    apiBaseUrl = '/api';
  }
}

const API = axios.create({
  baseURL: apiBaseUrl,
  headers: { 
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true  // Needed so the HttpOnly refresh cookie is sent
});

// ── In-Memory Token Store ─────────────────────────────────────────────────────
// Token lives in memory with secure sessionStorage fallback during navigation
let _accessToken = null;

export const tokenStore = {
  get: () => _accessToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('__at') : null),
  set: (t) => {
    _accessToken = t || null;
    if (typeof sessionStorage !== 'undefined') {
      if (t) {
        try { sessionStorage.setItem('__at', t); } catch (_) {}
      } else {
        try { sessionStorage.removeItem('__at'); } catch (_) {}
      }
    }
  },
  clear: () => {
    _accessToken = null;
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.removeItem('__at'); } catch (_) {}
    }
  },
};

// ── Request Interceptor — attach access token from memory & declare scope ─────────────────
API.interceptors.request.use(
  (config) => {
    const token = tokenStore.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Zero-trust scope header: explicitly declare role-isolated session scope
    if (typeof window !== 'undefined') {
      const isAdminRoute = window.location.pathname.startsWith('/admin') || (config.url && config.url.includes('/admin'));
      config.headers['X-Auth-Scope'] = isAdminRoute ? 'admin' : 'customer';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (resolve, reject) => {
  refreshSubscribers.push({ resolve, reject });
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
};

const onTokenRefreshFailed = (error) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Reject immediately if no request config exists
    if (!original) return Promise.reject(error);

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      console.warn('🛑 API Rate limit hit. Cooling down...');
      return Promise.reject(error);
    }

    // Avoid silent token refresh for standard login/auth paths where a 401 indicates invalid credentials
    const isLoginOrAuth = original.url?.includes('/login') || 
                          original.url?.includes('/auth/customer/login') || 
                          original.url?.includes('/auth/customer/register') ||
                          original.url?.includes('/auth/customer/verify-2fa') ||
                          original.url?.includes('/verify-2fa') ||
                          original.url?.includes('/verify-email') ||
                          original.url?.includes('/verify-reset-code') ||
                          original.url?.includes('/resend-verification') ||
                          original.url?.includes('/resend-reset-code') ||
                          original.url?.includes('/2fa/verify') ||
                          original.url?.includes('/auth/google') ||
                          original.url?.includes('/auth/forgot-password') ||
                          original.url?.includes('/auth/reset-password') ||
                          original.url?.includes('/auth/admin/challenge') ||
                          original.url?.includes('/auth/refresh') ||
                          original.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !original._retried && !isLoginOrAuth) {
      original._retried = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            original.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(API(original));
          }, reject);
        });
      }

      isRefreshing = true;

      try {
        console.log('🔄 Attempting silent token refresh...');
        const refreshEndpoint = apiBaseUrl.endsWith('/') ? `${apiBaseUrl}auth/refresh` : `${apiBaseUrl}/auth/refresh`;
        const isAdminRoute = typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || (original.url && original.url.includes('/admin')));
        const authScope = isAdminRoute ? 'admin' : 'customer';

        const res = await axios.post(refreshEndpoint, {}, { 
          withCredentials: true,
          headers: { 
            'X-Requested-With': 'XMLHttpRequest',
            'X-Auth-Scope': authScope
          }
        });

        if (res.data?.success && res.data?.data?.token) {
          const newToken = res.data.data.token;
          tokenStore.set(newToken);
          
          // Update original request with the fresh token
          original.headers['Authorization'] = `Bearer ${newToken}`;
          
          isRefreshing = false;
          onTokenRefreshed(newToken);
          
          return API(original);
        } else {
          throw new Error('Refresh response missing token');
        }
      } catch (refreshError) {
        isRefreshing = false;
        const isDefinitiveAuthFailure = refreshError.response?.status === 401 || refreshError.response?.status === 403;
        const hadActiveSession = Boolean(tokenStore.get());
        const isAdminRoute = typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || (original.url && original.url.includes('/admin')));
        const authScope = isAdminRoute ? 'admin' : 'customer';

        if (isDefinitiveAuthFailure) {
          tokenStore.clear();
          onTokenRefreshFailed(refreshError);

          // Dispatch session expired only if server confirmed session is invalid/expired
          if (hadActiveSession && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-expired', { detail: { error: refreshError, scope: authScope } }));
          }
        } else {
          onTokenRefreshFailed(refreshError);
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ---- Auth ----
export const login = (payload) => API.post('/auth/customer/login', payload);
export const loginAdmin = (payload) => API.post(`/auth/${import.meta.env.VITE_ADMIN_PATH_SEGMENT || 'admin'}/login`, payload);
export const googleLogin = (payload) => API.post('/auth/google', payload);
export const register = (payload) => API.post('/auth/customer/register', payload);
export const logout = () => API.post('/auth/logout');
export const verifyEmail = (payload) => {
  const body = typeof payload === 'string' ? { code: payload } : payload;
  return API.post('/auth/verify-email', body);
};
export const resendVerification = (payload) => {
  const body = typeof payload === 'string' ? { email: payload } : payload;
  return API.post('/auth/resend-verification', body);
};
export const checkEmail = (params) => {
  const emailParam = typeof params === 'string' ? params : params?.email;
  return API.get('/auth/check-email', { params: { email: emailParam } });
};
export const forgotPassword = (payload) => API.post('/auth/forgot-password', payload);
export const verifyResetCode = (payload) => API.post('/auth/verify-reset-code', payload);
export const resetPassword = (payload) => API.post('/auth/reset-password', payload);
export const resendResetCode = (payload) => API.post('/auth/resend-reset-code', payload);
export const getResetStatus = () => API.get('/auth/reset-status');
export const verifyPassword = (payload) => API.post('/auth/verify-password', payload);

// ---- Customer Sessions ----
export const getCustomerSessions = () => API.get('/auth/sessions');
export const revokeCustomerSession = (jti) => API.delete(`/auth/sessions/${jti}`);
export const revokeAllOtherSessions = () => API.delete('/auth/sessions/mine/all');

// ---- User Profile & Orders ----
export const getCurrentUser = () => API.get('/auth/me');
export const updateProfile = (payload) => API.put('/auth/profile', payload);
export const getUserAddresses = () => API.get('/auth/addresses');
export const addAddress = (payload) => API.post('/auth/addresses', payload);
export const updateAddress = (id, payload) => API.put(`/auth/addresses/${id}`, payload);
export const deleteAddress = (id) => API.delete(`/auth/addresses/${id}`);
export const setDefaultAddress = (id) => API.put(`/auth/addresses/${id}/default`);
export const changePassword = (payload) => API.put('/auth/change-password', payload);
export const deleteAccount = (payload) => API.delete('/auth/profile', { data: payload });
export const getMyOrders = (params) => API.get('/orders/my', { params });
export const getCart = () => API.get('/auth/cart');
export const syncCart = (payload) => API.post('/auth/cart', payload);

// ---- Admin Routes ----
export const getDashboardStats = (params) => API.get('/admin/dashboard/stats', { params });
export const getSalesAnalytics = (params) => API.get('/admin/analytics/sales', { params });
export const getActivityLogs = (params) => API.get('/admin/logs', { params });
export const getAdminSessions = () => API.get('/admin/sessions');
export const revokeAdminSession = (jti) => API.delete(`/admin/sessions/${jti}`);
export const revokeAllOtherAdminSessions = () => API.delete('/admin/sessions/mine/all');
export const getAdminUsers = (params) => API.get('/admin/users', { params });
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const resetUserSecurity = (id, type) => API.patch(`/admin/users/${id}/security-reset`, { type });
export const generateUserPasswordReset = (id) => API.post(`/admin/users/${id}/generate-password-reset`);
export const unlockCustomerPassword = (id, payload) => API.put(`/admin/users/${id}/unlock-password`, payload);
export const getAdminOrders = (params) => API.get('/admin/orders', { params });
export const getAdminProducts = (params) => API.get('/admin/products', { params });
export const getAdminOrderDetail = (id) => API.get(`/admin/orders/${id}`);
export const updateOrderStatus = (id, payload) => API.put(`/admin/orders/${id}/status`, payload);
export const createProduct = (payload) => API.post('/admin/products', payload);
export const updateProduct = (id, payload) => API.put(`/admin/products/${id}`, payload);
export const deleteProduct = (id) => API.delete(`/admin/products/${id}`);
export const updateProductStock = (id, payload) => API.patch(`/admin/products/${id}/stock`, payload);
export const unlockUserAccount = (id) => API.put(`/auth/${import.meta.env.VITE_ADMIN_PATH_SEGMENT || 'admin'}/unlock/${id}`);
export const getSystemHealth = () => API.get('/admin/system-health');
export const invalidateCache = (payload) => API.post('/admin/cache/invalidate', payload);
export const getAdminAlerts = () => API.get('/admin/alerts');
export const resolveAdminAlert = (id) => API.patch(`/admin/alerts/${id}/resolve`);
export const resolveAllAdminAlerts = (payload) => API.patch('/admin/alerts/resolve-all', payload);

// ---- Finance & Invoicing ----
export const getInvoices = (params) => API.get('/admin/invoices', { params });
export const getInvoiceById = (id) => API.get(`/admin/invoices/${id}`);
export const createInvoice = (payload) => API.post('/admin/invoices', payload);
export const updateInvoiceStatus = (id, payload) => API.patch(`/admin/invoices/${id}/status`, payload);
export const deleteInvoice = (id) => API.delete(`/admin/invoices/${id}`);
export const getTransactions = (params) => API.get('/admin/transactions', { params });
export const getTransactionById = (id) => API.get(`/admin/transactions/${id}`);
export const settlePaymentIssue = (payload) => API.post('/admin/transactions/settle', payload);
export const queryTransactionGateway = (id) => API.post(`/admin/transactions/${id}/query-gateway`);
export const getUnsettledPayments = () => API.get('/admin/transactions/unsettled');

// ---- Profile ----
export const getProfile = () => API.get('/auth/me');

// ---- Orders / Checkout ----
export const createOrder = (payload) => API.post('/orders', payload);
export const getOrderById = (orderId) => API.get(`/orders/${orderId}`);
export const logAbandonedCheckout = (payload) => API.post('/orders/abandoned', payload);
export const getAbandonedCheckouts = () => API.get('/orders/abandoned');

// ---- Payments ----
export const processMpesaPayment = (payload) => API.post('/payments/mpesa', payload);
export const processCardPayment = (payload) => API.post('/payments/card', payload);
export const processCashOnDelivery = (payload) => API.post('/payments/cash-on-delivery', payload);
export const validateCart = (items) => API.post('/orders/validate-cart', { items });
export const reportOutOfStock = (productId) => API.post(`/products/${productId}/out-of-stock-attempt`);

// ---- Subscriptions ----
export const getMySubscriptions = () => API.get('/subscriptions/mine');
export const createSubscription = (payload) => API.post('/subscriptions', payload);
export const pauseSubscription = (id) => API.put(`/subscriptions/${id}/pause`);
export const resumeSubscription = (id) => API.put(`/subscriptions/${id}/resume`);
export const skipNextSubscriptionDelivery = (id) => API.put(`/subscriptions/${id}/skip`);
export const updateSubscriptionFrequency = (id, frequency) => API.put(`/subscriptions/${id}/frequency`, { frequency });
export const cancelSubscription = (id, reason) => API.put(`/subscriptions/${id}/cancel`, { reason });

// ---- Addresses ----
export const getMyAddresses = getUserAddresses;
export const createAddress = addAddress;

// ---- Payment Methods ----
export const getMyPaymentMethods = () => API.get('/payment-methods');
export const addPaymentMethod = (payload) => API.post('/payment-methods', payload);
export const setDefaultPaymentMethod = (id) => API.put(`/payment-methods/${id}/default`);
export const deletePaymentMethod = (id) => API.delete(`/payment-methods/${id}`);

// ---- Settings ----
export const getPublicSettings = () => API.get('/settings/public');
export const getSettings = () => API.get('/admin/settings');
export const updateSettings = (payload) => API.put('/admin/settings', payload);
export const uploadLogo = (formData) => API.post('/admin/settings/upload/logo', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// ---- Products ----
export const fetchProducts = (params) => API.get('/products', { params });
export const getProductById = (id) => API.get(`/products/${id}`);

// ---- Extended Reports ----
export const getAbandonedCartsReport = () => API.get('/admin/reports/abandoned-carts');
export const getPaymentsReport = () => API.get('/admin/reports/payments');
export const getCustomersReport = () => API.get('/admin/reports/customers');
export const getInventoryReport = () => API.get('/admin/reports/inventory');
export const getCouponsReport = () => API.get('/admin/reports/coupons');
export const getPaymentTransactions = (params) => API.get('/admin/payments', { params });
export const getReconciliationReport = () => API.get('/admin/reports/reconciliation');
export const getStatementReport = (params) => API.get('/admin/reports/statement', { params });

// ---- CSV Exports ----
export const exportOrdersCSV = (params) => API.get('/admin/export/orders', { params, responseType: 'blob' });
export const exportCustomersCSV = () => API.get('/admin/export/customers', { responseType: 'blob' });

// ---- Reviews ----
export const getTopReviews = () => API.get('/reviews/top');
export const createSiteReview = (payload) => API.post('/reviews', payload);

export default API;
