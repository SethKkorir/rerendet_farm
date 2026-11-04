// routes/financeRoutes.js — Routes for Invoices & Financial Ledger
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { assertActiveAdmin } from '../middleware/assertActiveAdmin.js';
import { requirePermission } from '../middleware/permissions.js';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getTransactions,
  getTransactionById,
  settlePaymentIssue,
  queryTransactionGateway,
  getUnsettledPayments
} from '../controllers/financeController.js';

const router = express.Router();

// Base middleware for admin finance access
router.use(protect, assertActiveAdmin, requirePermission('orders.read'));

// Invoices routes
router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.get('/invoices/:id', getInvoiceById);
router.patch('/invoices/:id/status', updateInvoiceStatus);
router.delete('/invoices/:id', deleteInvoice);

// Transactions routes
router.get('/transactions', getTransactions);
router.get('/transactions/unsettled', getUnsettledPayments);
router.post('/transactions/settle', settlePaymentIssue);
router.post('/transactions/:id/query-gateway', queryTransactionGateway);
router.get('/transactions/:id', getTransactionById);

export default router;
