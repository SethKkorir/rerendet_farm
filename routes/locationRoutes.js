// routes/locationRoutes.js — Global Location and Country Routes
import express from 'express';
import {
  getCountries,
  getCountryByCode,
  getSubdivisions,
  getKenyaLocations
} from '../controllers/locationController.js';

const router = express.Router();

router.get('/countries', getCountries);
router.get('/countries/:code', getCountryByCode);
router.get('/subdivisions/:code', getSubdivisions);
router.get('/kenya', getKenyaLocations);

export default router;

