// routes/settingsRoutes.js - NEW FILE
import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  getSettings,
  updateSettings,
  uploadLogo,
  uploadImage,
  getPublicSettings,
  generateMaintenanceMagicLink,
  triggerSuperGate
} from '../controllers/settingsController.js';

const router = express.Router();

// Public routes
router.get('/public', getPublicSettings);
router.get('/super-gate/:token', triggerSuperGate); // Emergency Out-of-band Entrance

// Protected Admin routes
router.use(protect, admin);

// Settings management
router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/upload/logo', upload.single('logo'), uploadLogo);
router.post('/upload/image', upload.single('image'), uploadImage);

// Super Gate Control
router.post('/maintenance/magic-link', generateMaintenanceMagicLink);

export default router;