// controllers/reportController.js
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import moment from 'moment';

// @desc    Generate order receipt PDF
// @route   GET /api/reports/orders/:id/receipt
// @access  Private/Admin
const generateOrderReceipt = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email phone');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  try {
    // Simple text receipt for now - you can implement PDF generation later
    const receiptText = `
      RERENDET COFFEE RECEIPT
      Order: ${order.orderNumber}
      Date: ${moment(order.createdAt).format('DD/MM/YYYY HH:mm')}
      Customer: ${order.user.firstName} ${order.user.lastName}
      Email: ${order.user.email}
      Phone: ${order.user.phone}
      
      ITEMS:
      ${order.items.map(item => `
        ${item.name} x${item.quantity} - KES ${item.price} = KES ${item.itemTotal}
      `).join('')}
      
      SUBTOTAL: KES ${order.subtotal}
      SHIPPING: KES ${order.shippingCost}
      TOTAL: KES ${order.total}
      
      Status: ${order.status}
      Payment: ${order.paymentMethod} (${order.paymentStatus})
    `;

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename=receipt-${order.orderNumber}.txt`
    });
    
    res.send(receiptText);
  } catch (error) {
    console.error('Receipt generation error:', error);
    res.status(500);
    throw new Error('Failed to generate receipt');
  }
});

// @desc    Generate monthly sales report
// @route   GET /api/reports/sales/monthly
// @access  Private/Admin
const generateMonthlyReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const targetMonth = month || moment().month() + 1;
  const targetYear = year || moment().year();

  const startDate = moment(`${targetYear}-${targetMonth}-01`).startOf('month');
  const endDate = moment(startDate).endOf('month');

  const orders = await Order.find({
    createdAt: {
      $gte: startDate.toDate(),
      $lte: endDate.toDate()
    },
    paymentStatus: 'paid'
  }).populate('user', 'firstName lastName');

  if (orders.length === 0) {
    res.status(404);
    throw new Error('No orders found for the specified period');
  }

  try {
    // Simple CSV report for now
    const csvContent = [
      'Order Number,Customer,Amount,Status,Date',
      ...orders.map(order => 
        `"${order.orderNumber}","${order.user.firstName} ${order.user.lastName}","${order.total}","${order.status}","${moment(order.createdAt).format('DD/MM/YYYY')}"`
      )
    ].join('\n');

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=sales-report-${targetMonth}-${targetYear}.csv`
    });
    
    res.send(csvContent);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500);
    throw new Error('Failed to generate sales report');
  }
});

// Optimization: Cache for analytics data
let analyticsCache = {
  data: null,
  lastUpdated: 0,
  ttl: 15 * 60 * 1000 // 15 minutes
};

// @desc    Get sales analytics data
// @route   GET /api/reports/analytics
// @access  Private/Admin
const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', force = false } = req.query;

  // Check cache
  if (!force && analyticsCache.data?.[period] && (Date.now() - analyticsCache.lastUpdated < analyticsCache.ttl)) {
    return res.json({
      success: true,
      data: analyticsCache.data[period],
      cached: true
    });
  }
  
  let startDate;
  const endDate = new Date();

  switch (period) {
    case '7d': startDate = moment().subtract(7, 'days').toDate(); break;
    case '30d': startDate = moment().subtract(30, 'days').toDate(); break;
    case '90d': startDate = moment().subtract(90, 'days').toDate(); break;
    case '1y': startDate = moment().subtract(1, 'year').toDate(); break;
    default: startDate = moment().subtract(30, 'days').toDate();
  }

  // 1. Aggregate Core Stats (Revenue, Count, Avg)
  const statsTask = Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, paymentStatus: 'paid' } },
    { 
      $group: { 
        _id: null, 
        totalRevenue: { $sum: '$total' }, 
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: '$total' }
      } 
    }
  ]);

  // 2. Aggregate Daily Revenue
  const dailyRevenueTask = Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, paymentStatus: 'paid' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' }
      }
    },
    { $sort: { '_id': 1 } },
    { $project: { date: '$_id', revenue: 1, _id: 0 } }
  ]);

  // 3. Aggregate Top Products
  const topProductsTask = Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate }, paymentStatus: 'paid' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.itemTotal' }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    { $project: { name: '$_id', quantity: 1, revenue: 1, _id: 0 } }
  ]);

  // 4. Aggregate Order Status
  const statusTask = Order.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Run all aggregations in parallel
  const [stats, dailyRevenue, topProducts, orderStatus] = await Promise.all([
    statsTask,
    dailyRevenueTask,
    topProductsTask,
    statusTask
  ]);

  const summary = stats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

  const resultData = {
    summary: {
      ...summary,
      period: { start: startDate, end: endDate }
    },
    dailyRevenue,
    topProducts,
    orderStatus
  };

  // Update global cache
  if (!analyticsCache.data) analyticsCache.data = {};
  analyticsCache.data[period] = resultData;
  analyticsCache.lastUpdated = Date.now();

  res.json({
    success: true,
    data: resultData
  });
});

// @desc    Export orders to CSV
// @route   GET /api/reports/orders/export
// @access  Private/Admin
const exportOrdersToCSV = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;
  
  let filter = {};
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  if (status && status !== 'all') {
    filter.status = status;
  }

  const orders = await Order.find(filter)
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 });

  // Generate CSV
  const headers = [
    'Order Number',
    'Customer',
    'Email',
    'Items',
    'Subtotal',
    'Shipping',
    'Total',
    'Status',
    'Payment Status',
    'Order Date'
  ];

  const csvData = orders.map(order => [
    order.orderNumber,
    `${order.user.firstName} ${order.user.lastName}`,
    order.user.email,
    order.items.map(item => `${item.name} (x${item.quantity})`).join('; '),
    order.subtotal,
    order.shippingCost,
    order.total,
    order.status,
    order.paymentStatus,
    moment(order.createdAt).format('DD/MM/YYYY HH:mm')
  ]);

  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n');

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename=orders-export-${moment().format('YYYY-MM-DD')}.csv`
  });

  res.send(csvContent);
});

export {
  generateOrderReceipt,
  generateMonthlyReport,
  getSalesAnalytics,
  exportOrdersToCSV
};