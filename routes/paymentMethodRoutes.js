// routes/paymentMethodRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getMyPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod
} from '../controllers/paymentMethodController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMyPaymentMethods)
  .post(addPaymentMethod);

router.delete('/:id', deletePaymentMethod);
router.put('/:id/default', setDefaultPaymentMethod);

export default router;
