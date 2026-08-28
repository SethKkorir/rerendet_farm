// services/analyticsService.js
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

class AnalyticsService {
  
  // Comprehensive dashboard analytics
  async getDashboardAnalytics(timeframe = '30d') {
    const dateRange = this.getDateRange(timeframe);
    
    const [
      salesData,
      topProducts,
      customerStats,
      revenueAnalytics,
      orderMetrics,
      geographicData
    ] = await Promise.all([
      this.getSalesData(dateRange),
      this.getTopProducts(dateRange),
      this.getCustomerStats(dateRange),
      this.getRevenueAnalytics(dateRange),
      this.getOrderMetrics(dateRange),
      this.getGeographicData(dateRange)
    ]);

    return {
      salesData,
      topProducts,
      customerStats,
      revenueAnalytics,
      orderMetrics,
      geographicData,
      timeframe
    };
  }

  // Sales data for charts
  async getSalesData(dateRange) {
    const salesByDay = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
          averageOrderValue: { $avg: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const salesByCategory = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
          status: 'delivered'
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          unitsSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    return {
      daily: salesByDay,
      byCategory: salesByCategory
    };
  }

  // Top performing products
  async getTopProducts(dateRange, limit = 10) {
    return await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
          status: 'delivered'
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          totalSold: { $sum: "$items.quantity" },
          averagePrice: { $avg: "$items.price" }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          category: "$product.category",
          totalRevenue: 1,
          totalSold: 1,
          averagePrice: 1,
          stock: "$product.stock"
        }
      }
    ]);
  }

  // Customer analytics
  async getCustomerStats(dateRange) {
    const customerData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
          firstOrder: { $min: "$createdAt" },
          lastOrder: { $max: "$createdAt" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: "$user" }
    ]);

    const newCustomers = await User.countDocuments({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      role: 'user'
    });

    return {
      totalCustomers: customerData.length,
      newCustomers,
      averageOrderValue: customerData.reduce((sum, cust) => sum + cust.totalSpent, 0) / customerData.length,
      repeatCustomers: customerData.filter(cust => cust.orderCount > 1).length,
      topCustomers: customerData.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5)
    };
  }

  // Revenue analytics
  async getRevenueAnalytics(dateRange) {
    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: "$totalAmount" },
          taxCollected: { $sum: "$taxPrice" },
          shippingRevenue: { $sum: "$shippingPrice" }
        }
      }
    ]);

    const previousPeriod = this.getDateRange('previous');
    const previousRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" }
        }
      }
    ]);

    const currentRevenue = revenueData[0]?.totalRevenue || 0;
    const previousRevenueAmount = previousRevenue[0]?.totalRevenue || 0;
    const growth = previousRevenueAmount > 0 ? 
      ((currentRevenue - previousRevenueAmount) / previousRevenueAmount) * 100 : 0;

    return {
      current: revenueData[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        taxCollected: 0,
        shippingRevenue: 0
      },
      growth: Math.round(growth * 100) / 100,
      comparison: {
        current: currentRevenue,
        previous: previousRevenueAmount
      }
    };
  }

  // Order metrics
  async getOrderMetrics(dateRange) {
    const orderStatusCounts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const conversionData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      statusDistribution: orderStatusCounts,
      conversionRate: conversionData,
      totalOrders: orderStatusCounts.reduce((sum, status) => sum + status.count, 0)
    };
  }

  // Geographic data
  async getGeographicData(dateRange) {
    return await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: "$shippingAddress.city",
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
          customers: { $addToSet: "$user" }
        }
      },
      {
        $project: {
          city: "$_id",
          revenue: 1,
          orders: 1,
          customerCount: { $size: "$customers" }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
  }

  // Utility function to get date ranges
  getDateRange(timeframe) {
    const now = new Date();
    const start = new Date();

    switch (timeframe) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'previous':
        start.setDate(now.getDate() - 60);
        return {
          start,
          end: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
      default:
        start.setDate(now.getDate() - 30);
    }

    return { start, end: now };
  }
}

export default new AnalyticsService();