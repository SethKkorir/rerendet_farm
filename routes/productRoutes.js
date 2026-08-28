import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getProductBySlug,
  updateProductStock,
  uploadProductImages,
  deleteProductImage,
  getBestSellers,
  subscribeRestockNotification
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in 15 minutes.'
  }
});

// Named public routes (MUST be before /:id)
router.get('/bestsellers', getBestSellers);
router.get('/featured/products', getFeaturedProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/slug/:slug', getProductBySlug);
router.post('/:id/restock-subscribe', subscribeRestockNotification);

router.route('/')
  .get(apiLimiter, getProducts)
  .post(protect, admin, upload.array('images', 5), createProduct);

router.route('/:id')
  .get(apiLimiter, getProductById)
  .put(protect, admin, upload.array('images', 5), updateProduct)
  .delete(protect, admin, deleteProduct);

router.route('/:id/images')
  .post(protect, admin, upload.array('images', 5), uploadProductImages)
  .delete(protect, admin, deleteProductImage);

router.patch('/:id/stock', protect, admin, updateProductStock);

export default router;