// routes/addressRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getMyAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
} from '../controllers/addressController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMyAddresses)
  .post(createAddress);

router.route('/:id')
  .put(updateAddress)
  .delete(deleteAddress);

router.put('/:id/default', setDefaultAddress);

export default router;
