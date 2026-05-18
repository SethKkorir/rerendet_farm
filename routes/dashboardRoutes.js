// routes/dashboardRoutes.js
import express from 'express';
import {
  getDashboardData,
  updateProfile,
  updatePreferences,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  updatePassword,
  getSecuritySettings,
  enable2FA,
  verify2FA,
  disable2FA,
  getLoginHistory,
  getOrders,
  deleteAccount,
  getTickets,
  createTicket
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard data
router.get('/data', getDashboardData);

// Profile management
router.put('/profile', updateProfile);
router.put('/preferences', updatePreferences);

// Address management
router.route('/addresses')
  .get(getAddresses)
  .post(addAddress);

router.route('/addresses/:id')
  .put(updateAddress)
  .delete(deleteAddress);

// Payment methods
router.route('/payment-methods')
  .get(getPaymentMethods)
  .post(addPaymentMethod);

router.route('/payment-methods/:id')
  .put(updatePaymentMethod)
  .delete(deletePaymentMethod);

// Orders
router.get('/orders', getOrders);

// Support tickets
router.route('/tickets')
  .get(getTickets)
  .post(createTicket);

// Security
router.put('/security/password', updatePassword);
router.get('/security/settings', getSecuritySettings);
router.post('/security/2fa/enable', enable2FA);
router.post('/security/2fa/verify', verify2FA);
router.post('/security/2fa/disable', disable2FA);
router.get('/security/login-history', getLoginHistory);

// Account management
router.delete('/account', deleteAccount);

export default router;