// routes/publicRoutes.js
import express from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';

const router = express.Router();

// @desc    Lightweight heartbeat endpoint for external dead man's switch
// @route   GET /api/public/heartbeat
// @access  Public
router.get('/heartbeat', asyncHandler(async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  if (dbStatus !== 'connected') {
    return res.status(500).json({
      status: 'unhealthy',
      database: dbStatus,
      timestamp: Date.now()
    });
  }

  res.json({
    status: 'healthy',
    database: dbStatus,
    timestamp: Date.now()
  });
}));

export default router;
