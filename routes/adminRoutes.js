// routes/adminRoutes.js - COMPLETE WITH ALL ENDPOINTS
import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, admin } from '../middleware/authMiddleware.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { ipAllowlist } from '../middleware/ipAllowlistMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { assertActiveAdmin } from '../middleware/assertActiveAdmin.js';
import { requirePermission } from '../middleware/permissions.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import {
  getDashboardStats,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getUsers,
  getContacts,
  updateContactStatus,
  replyContact,
  deleteContact,
  getSettings,
  updateSettings,
  getSalesAnalytics,
  getActivityLogs,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  resetUserSecurity,
  testEmailConfig,
  checkNewOrders,
  getAdminOverview,
  getAbandonedCartsReport,
  getPaymentsReport,
  getCustomersReport,
  getInventoryReport,
  getCouponsReport,
  exportOrdersCSV,
  exportCustomersCSV,
  getPaymentTransactions,
  manualPaymentOverride,
  refundOrder,
  getReconciliationReport,
  getSystemHealth,
  invalidateCache
} from '../controllers/adminController.js';

import {
  getCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon
} from '../controllers/couponController.js';

import { getStatementReport } from '../controllers/statementController.js';

const router = express.Router();

// All routes require authentication, admin privileges, and passing IP allowlist
router.use(protect, admin, ipAllowlist);

// ==================== ADMIN OVERVIEW ====================
router.get('/overview', getAdminOverview);

// ==================== ADMIN DASHBOARD STATS ====================
router.get('/dashboard/stats', adminAuth(['dashboard:view']), getDashboardStats);
router.get('/dashboard', (req, res) => res.json({
  success: true,
  data: { welcome: 'Welcome to Rerendet Coffee Admin', version: '2.0.0' }
}));

// ==================== ORDER MANAGEMENT ====================
router.get('/orders/status', adminAuth(['orders:view']), checkNewOrders);
router.get('/orders', adminAuth(['orders:view']), getOrders);
router.get('/orders/:id', adminAuth(['orders:view']), getOrderDetail);
router.put('/orders/:id/status', adminAuth(['orders:update_status']), updateOrderStatus);
router.post('/orders/:id/manual-override', adminAuth(['orders:manage']), manualPaymentOverride);
router.post('/orders/:id/refund', adminAuth(['orders:manage']), refundOrder);

// ==================== PRODUCT MANAGEMENT ====================
router.get('/products', adminAuth(['products:manage']), getProducts);
router.post('/products', adminAuth(['products:manage']), upload.array('images', 5), createProduct);
router.put('/products/:id', adminAuth(['products:manage']), upload.array('images', 5), updateProduct);
router.patch('/products/:id/stock', adminAuth(['products:manage']), updateProductStock);
router.delete('/products/:id', adminAuth(['products:manage']), deleteProduct);

// ==================== CATEGORY MANAGEMENT ====================
router.get('/categories', protect, assertActiveAdmin, requirePermission('inventory.write'), getCategories);
router.post('/categories', protect, assertActiveAdmin, requirePermission('inventory.write'), createCategory);
router.put('/categories/:id', protect, assertActiveAdmin, requirePermission('inventory.write'), updateCategory);
router.delete('/categories/:id', protect, assertActiveAdmin, requirePermission('inventory.write'), deleteCategory);

// ==================== USER MANAGEMENT ====================
router.get('/users', adminAuth(['users:view']), getUsers);
router.put('/users/:id/role', adminAuth(['users:manage']), updateUserRole);
router.put('/users/:id/status', adminAuth(['users:manage']), toggleUserStatus);
router.delete('/users/:id', adminAuth(['users:manage']), deleteUser);
router.patch('/users/:id/security-reset', adminAuth(['users:manage']), resetUserSecurity);

// ==================== CONTACT MANAGEMENT ====================
router.get('/contacts', adminAuth(['contacts:manage']), getContacts);
router.put('/contacts/:id/status', adminAuth(['contacts:manage']), updateContactStatus);
router.post('/contacts/:id/reply', adminAuth(['contacts:manage']), replyContact);
router.delete('/contacts/:id', adminAuth(['contacts:manage']), deleteContact);

// ==================== SETTINGS MANAGEMENT ====================
router.get('/settings', adminAuth(['settings:manage']), getSettings);
router.put('/settings', adminAuth(['settings:manage']), updateSettings);
router.post('/settings/test-email', adminAuth(['settings:manage']), testEmailConfig);
router.post('/upload/logo', adminAuth(['settings:manage']), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('No logo file uploaded'); }
  res.json({ success: true, message: 'Logo uploaded successfully', data: { url: req.file.path } });
}));

// ==================== ANALYTICS & AUDIT TRAIL ====================
router.get('/analytics/sales', adminAuth(['analytics:view']), getSalesAnalytics);
router.get('/logs', adminAuth(['logs:view']), getActivityLogs);
router.get('/payments', adminAuth(['logs:view']), getPaymentTransactions);
router.get('/system-health', adminAuth(['logs:view']), getSystemHealth);
router.post('/cache/invalidate', adminAuth(['settings:manage']), invalidateCache);

// ==================== EXTENDED REPORTS ====================
router.get('/reports/abandoned-carts', adminAuth(['analytics:view']), getAbandonedCartsReport);
router.get('/reports/payments', adminAuth(['analytics:view']), getPaymentsReport);
router.get('/reports/customers', adminAuth(['analytics:view']), getCustomersReport);
router.get('/reports/inventory', adminAuth(['analytics:view']), getInventoryReport);
router.get('/reports/coupons', adminAuth(['analytics:view']), getCouponsReport);
router.get('/reports/reconciliation', adminAuth(['analytics:view']), getReconciliationReport);
router.get('/reports/statement', adminAuth(['analytics:view']), getStatementReport);

// ==================== COUPON MANAGEMENT ====================
router.get('/coupons', adminAuth(['marketing:manage']), getCoupons);
router.post('/coupons', adminAuth(['marketing:manage']), createCoupon);
router.put('/coupons/:id', adminAuth(['marketing:manage']), updateCoupon);
router.patch('/coupons/:id/toggle', adminAuth(['marketing:manage']), toggleCouponStatus);
router.delete('/coupons/:id', adminAuth(['marketing:manage']), deleteCoupon);

// ==================== CSV EXPORTS ====================
router.get('/export/orders', adminAuth(['analytics:view']), exportOrdersCSV);
router.get('/export/customers', adminAuth(['analytics:view']), exportCustomersCSV);

// ==================== DOCUMENTATION VIEWER ====================
router.get('/documentation', adminAuth(['settings:manage']), asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'ARCHITECTURE.md', label: 'Architecture Reference' },
      { name: 'API_REFERENCE.md', label: 'API Reference Manual' },
      { name: 'DATABASE.md', label: 'Database Schema & Design' },
      { name: 'DEPLOYMENT.md', label: 'Deployment Guide' },
      { name: 'MONITORING.md', label: 'Telemetry & Monitoring' },
      { name: 'RUNBOOK.md', label: 'Incident & Operations Runbook' },
      { name: 'SECURITY.md', label: 'Security Controls & Audit' },
      { name: 'ADMIN_MANUAL.md', label: 'Admin Manual (Training)' },
      { name: 'FULFILMENT_SOP.md', label: 'Fulfillment SOP (Checklist)' },
      { name: 'SOFTWARE_CONTRACT.md', label: 'Software License Contract' },
      { name: 'DATA_PROCESSING_AGREEMENT.md', label: 'Data Processing Agreement' },
      { name: 'THIRD_PARTY_SERVICES.md', label: 'Third Party Disclosures' },
      { name: 'PRIVACY_POLICY.md', label: 'Privacy Policy' },
      { name: 'TERMS_AND_CONDITIONS.md', label: 'Commercial Terms' },
      { name: 'CREDENTIALS_HANDOVER.md', label: 'Platform Credentials' }
    ]
  });
}));

router.get('/documentation/:filename', adminAuth(['settings:manage']), asyncHandler(async (req, res) => {
  const fs = await import('fs/promises');
  const path = await import('path');
  const { filename } = req.params;
  const safeFilename = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '');
  
  const searchDirs = [
    path.resolve(process.cwd(), 'docs'),
    path.resolve(process.cwd(), 'docs/training'),
    path.resolve(process.cwd(), 'docs/legal')
  ];
  
  let fileContent = null;
  for (const dir of searchDirs) {
    try {
      const filePath = path.join(dir, safeFilename);
      fileContent = await fs.readFile(filePath, 'utf-8');
      break;
    } catch {}
  }
  
  if (!fileContent) {
    res.status(404);
    throw new Error('Documentation file not found');
  }
  
  res.json({ success: true, filename: safeFilename, content: fileContent });
}));

export default router;