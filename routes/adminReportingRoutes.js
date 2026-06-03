// routes/adminReportingRoutes.js - HIGH PERFORMANCE BUSINESS AGGREGATIONS (GAP 5)
import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect } from '../middleware/authMiddleware.js';
import { assertActiveAdmin } from '../middleware/assertActiveAdmin.js';
import { requirePermission } from '../middleware/permissions.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';
import moment from 'moment';

const router = express.Router();

router.use(protect, assertActiveAdmin, requirePermission('reports.read'));

// 1. Fulfillment Speed: average hours from creation to Shipped grouped by week
router.get('/fulfilment-time', asyncHandler(async (req, res) => {
  const eightWeeksAgo = moment().subtract(8, 'weeks').toDate();

  const data = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: eightWeeksAgo },
        fulfillmentStatus: { $in: ['shipped', 'delivered'] }
      }
    },
    {
      $project: {
        week: { $week: '$createdAt' },
        year: { $year: '$createdAt' },
        timeDiff: {
          $divide: [
            { $subtract: [ '$updatedAt', '$createdAt' ] },
            3600000 // converts ms to hours
          ]
        }
      }
    },
    {
      $group: {
        _id: { year: '$year', week: '$week' },
        averageHours: { $avg: '$timeDiff' }
      }
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } }
  ]);

  const formatted = data.map(item => ({
    week: `Wk ${item._id.week}, ${item._id.year}`,
    averageHours: parseFloat(item.averageHours.toFixed(1))
  }));

  res.json({ success: true, data: formatted });
}));

// 2. Customer Retention Aggregation
router.get('/customer-retention', asyncHandler(async (req, res) => {
  const customerStats = await Order.aggregate([
    { $group: { _id: '$user', orderCount: { $sum: 1 } } }
  ]);

  let returningCustomers = 0;
  let oneTimeCustomers = 0;

  customerStats.forEach(stat => {
    if (stat.orderCount > 1) returningCustomers++;
    else if (stat.orderCount === 1) oneTimeCustomers++;
  });

  const total = returningCustomers + oneTimeCustomers;
  const retentionRate = total > 0 ? parseFloat(((returningCustomers / total) * 100).toFixed(1)) : 0;

  res.json({
    success: true,
    data: {
      returningCustomers,
      oneTimeCustomers,
      retentionRate
    }
  });
}));

// 3. M-Pesa Failure Reason breakdown compared with last week
router.get('/mpesa-failure-reasons', asyncHandler(async (req, res) => {
  const startOfThisWeek = moment().startOf('week').toDate();
  const startOfLastWeek = moment().subtract(1, 'week').startOf('week').toDate();

  const thisWeekFailures = await PaymentTransaction.aggregate([
    {
      $match: {
        status: 'failed',
        createdAt: { $gte: startOfThisWeek }
      }
    },
    { $group: { _id: '$failureReason', count: { $sum: 1 } } }
  ]);

  const lastWeekFailures = await PaymentTransaction.aggregate([
    {
      $match: {
        status: 'failed',
        createdAt: { $gte: startOfLastWeek, $lt: startOfThisWeek }
      }
    },
    { $group: { _id: '$failureReason', count: { $sum: 1 } } }
  ]);

  const failureMap = {};

  thisWeekFailures.forEach(f => {
    const reason = f._id || 'Unknown Error';
    failureMap[reason] = { reason, thisWeek: f.count, lastWeek: 0, delta: f.count };
  });

  lastWeekFailures.forEach(f => {
    const reason = f._id || 'Unknown Error';
    if (failureMap[reason]) {
      failureMap[reason].lastWeek = f.count;
      failureMap[reason].delta = failureMap[reason].thisWeek - f.count;
    } else {
      failureMap[reason] = { reason, thisWeek: 0, lastWeek: f.count, delta: -f.count };
    }
  });

  res.json({ success: true, data: Object.values(failureMap) });
}));

// 4. Product Burn Rate and Forecast Stockout Days
router.get('/inventory-burn-rate', asyncHandler(async (req, res) => {
  const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

  const salesData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
        paymentStatus: 'paid'
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalQty: { $sum: '$items.quantity' }
      }
    }
  ]);

  const products = await Product.find({ isActive: true });
  const forecast = products.map(prod => {
    const sale = salesData.find(s => s._id.toString() === prod._id.toString());
    const totalQtySold = sale ? sale.totalQty : 0;
    const dailyBurnRate = parseFloat((totalQtySold / 30).toFixed(2));
    const availableStock = prod.inventory.physicalStock - prod.inventory.reservedStock;

    let daysUntilStockout = 999; // Represents functionally infinite runway
    if (dailyBurnRate > 0) {
      daysUntilStockout = Math.max(0, Math.round(availableStock / dailyBurnRate));
    }

    return {
      productName: prod.name,
      productId: prod._id,
      dailyBurnRate,
      availableStock,
      daysUntilStockout
    };
  });

  res.json({ success: true, data: forecast });
}));

// 5. Cart Abandonment Top 10 Ranked List
router.get('/cart-abandonment', asyncHandler(async (req, res) => {
  const data = await AbandonedCheckout.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        abandonmentCount: { $sum: 1 }
      }
    },
    { $sort: { abandonmentCount: -1 } },
    { $limit: 10 }
  ]);

  // Populate names
  const populated = await Promise.all(data.map(async item => {
    const prod = await Product.findById(item._id).select('name');
    return {
      productName: prod ? prod.name : 'Unknown Product',
      abandonmentCount: item.abandonmentCount
    };
  }));

  res.json({ success: true, data: populated });
}));

// 6. Extended Revenue Trend with 7-Day Rolling Average
router.get('/revenue-trend', asyncHandler(async (req, res) => {
  const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

  const dailyRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Construct dates for the last 30 days to fill in gaps
  const trend = [];
  for (let i = 29; i >= 0; i--) {
    const dateStr = moment().subtract(i, 'days').format('YYYY-MM-DD');
    const dayData = dailyRevenue.find(d => d._id === dateStr);
    trend.push({
      date: dateStr,
      revenue: dayData ? dayData.revenue : 0,
      rollingAverage: 0
    });
  }

  // Calculate 7-day rolling average
  for (let i = 0; i < trend.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - 6); j <= i; j++) {
      sum += trend[j].revenue;
      count++;
    }
    trend[i].rollingAverage = parseFloat((sum / count).toFixed(2));
  }

  res.json({ success: true, data: trend });
}));

// 7. Cancellation Reasons breakdown
router.get('/cancellation-reasons', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const sinceDate = moment().subtract(days, 'days').toDate();

  const reasons = await Order.aggregate([
    {
      $match: {
        orderStatus: 'cancelled',
        createdAt: { $gte: sinceDate }
      }
    },
    {
      $group: {
        _id: '$cancellationReason',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        reason: { $ifNull: ['$_id', 'not_specified'] },
        count: 1,
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({ success: true, data: reasons });
}));

export default router;
