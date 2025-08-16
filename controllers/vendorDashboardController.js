const { validationResult } = require('express-validator');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const Product = require('../models/Product');
const { ErrorResponse } = require('../middleware/error');

/**
 * Helper function to get date range based on period or custom dates
 */
const getDateRange = (period, startDate, endDate) => {
  const now = new Date();
  let start, end = now;

  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate)
    };
  }

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1); // Default to current month
  }

  return { start, end };
};

/**
 * @desc    Get vendor dashboard overview with key metrics
 * @route   GET /api/v1/vendor-dashboard/overview
 * @access  Private (Vendor only)
 */
exports.getDashboardOverview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { period = 'month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    // Previous period for comparison
    const periodDiff = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodDiff);
    const prevEnd = start;

    const [
      currentStats,
      previousStats,
      totalListings,
      activeListings,
      totalProducts,
      averageRating,
      recentOrders
    ] = await Promise.all([
      // Current period stats
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            totalQuantity: { $sum: { $sum: '$items.quantity' } },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),
      // Previous period stats for comparison
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: prevStart, $lte: prevEnd }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 }
          }
        }
      ]),
      // Total listings
      Listing.countDocuments({ vendorId }),
      // Active listings
      Listing.countDocuments({ vendorId, status: 'active' }),
      // Total products offered
      Listing.distinct('productId', { vendorId }).then(products => products.length),
      // Average rating
      Listing.aggregate([
        { $match: { vendorId } },
        { $group: { _id: null, avgRating: { $avg: '$rating.average' } } }
      ]),
      // Recent orders
      Order.find({ vendorId })
        .populate('restaurantId', 'name')
        .populate('items.productId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const current = currentStats[0] || { totalRevenue: 0, totalOrders: 0, totalQuantity: 0, averageOrderValue: 0 };
    const previous = previousStats[0] || { totalRevenue: 0, totalOrders: 0 };

    // Calculate growth percentages
    const revenueGrowth = previous.totalRevenue ? 
      ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue * 100) : 0;
    const orderGrowth = previous.totalOrders ? 
      ((current.totalOrders - previous.totalOrders) / previous.totalOrders * 100) : 0;

    const overview = {
      period: {
        start,
        end,
        label: period
      },
      keyMetrics: {
        revenue: {
          current: current.totalRevenue,
          growth: Math.round(revenueGrowth * 100) / 100
        },
        orders: {
          current: current.totalOrders,
          growth: Math.round(orderGrowth * 100) / 100
        },
        averageOrderValue: Math.round(current.averageOrderValue * 100) / 100,
        totalQuantitySold: current.totalQuantity
      },
      businessMetrics: {
        totalListings,
        activeListings,
        totalProducts,
        averageRating: averageRating[0]?.avgRating || 0,
        listingActivationRate: totalListings ? Math.round((activeListings / totalListings) * 100) : 0
      },
      recentActivity: {
        recentOrders: recentOrders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          restaurant: order.restaurantId.name,
          amount: order.totalAmount,
          status: order.status,
          items: order.items.length,
          createdAt: order.createdAt
        }))
      }
    };

    res.status(200).json({
      success: true,
      data: overview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get revenue analytics and trends
 * @route   GET /api/v1/vendor-dashboard/revenue
 * @access  Private (Vendor only)
 */
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { period = 'month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [dailyRevenue, revenueByStatus, revenueByProduct, monthlyTrends] = await Promise.all([
      // Daily revenue breakdown
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      // Revenue by order status
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$status',
            revenue: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Revenue by product category
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $lookup: {
            from: 'productcategories',
            localField: 'product.category',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: '$category' },
        {
          $group: {
            _id: '$category.name',
            revenue: { $sum: '$items.totalPrice' },
            quantity: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      // Monthly trends (last 12 months)
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    const analytics = {
      summary: {
        totalRevenue: dailyRevenue.reduce((sum, day) => sum + day.revenue, 0),
        totalOrders: dailyRevenue.reduce((sum, day) => sum + day.orders, 0),
        averageDailyRevenue: dailyRevenue.length ? 
          dailyRevenue.reduce((sum, day) => sum + day.revenue, 0) / dailyRevenue.length : 0
      },
      dailyTrends: dailyRevenue.map(day => ({
        date: day._id,
        revenue: Math.round(day.revenue * 100) / 100,
        orders: day.orders
      })),
      revenueByStatus: revenueByStatus.reduce((acc, item) => {
        acc[item._id] = {
          revenue: Math.round(item.revenue * 100) / 100,
          count: item.count,
          percentage: 0 // Will be calculated below
        };
        return acc;
      }, {}),
      revenueByCategory: revenueByProduct.map(item => ({
        category: item._id,
        revenue: Math.round(item.revenue * 100) / 100,
        quantity: item.quantity
      })),
      monthlyTrends: monthlyTrends.map(month => ({
        month: `${month._id.year}-${month._id.month.toString().padStart(2, '0')}`,
        revenue: Math.round(month.revenue * 100) / 100,
        orders: month.orders
      }))
    };

    // Calculate percentages for revenue by status
    const totalRevenueByStatus = Object.values(analytics.revenueByStatus)
      .reduce((sum, status) => sum + status.revenue, 0);
    
    Object.keys(analytics.revenueByStatus).forEach(status => {
      analytics.revenueByStatus[status].percentage = totalRevenueByStatus ? 
        Math.round((analytics.revenueByStatus[status].revenue / totalRevenueByStatus) * 100) : 0;
    });

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order analytics (volume, status distribution, trends)
 * @route   GET /api/v1/vendor-dashboard/orders
 * @access  Private (Vendor only)
 */
exports.getOrderAnalytics = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { period = 'month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [orderStats, statusDistribution, hourlyDistribution, customerStats] = await Promise.all([
      // Order volume trends
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            orders: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' },
            avgValue: { $avg: '$totalAmount' }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      // Order status distribution
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' }
          }
        }
      ]),
      // Hourly order distribution
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      // Customer statistics
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$restaurantId',
            orders: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' },
            avgOrderValue: { $avg: '$totalAmount' },
            lastOrder: { $max: '$createdAt' }
          }
        },
        {
          $lookup: {
            from: 'restaurants',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurant'
          }
        },
        { $unwind: '$restaurant' },
        { $sort: { totalValue: -1 } },
        { $limit: 10 }
      ])
    ]);

    const totalOrders = statusDistribution.reduce((sum, status) => sum + status.count, 0);

    const analytics = {
      summary: {
        totalOrders,
        completedOrders: statusDistribution.find(s => s._id === 'delivered')?.count || 0,
        pendingOrders: statusDistribution.find(s => s._id === 'pending')?.count || 0,
        cancelledOrders: statusDistribution.find(s => s._id === 'cancelled')?.count || 0,
        completionRate: totalOrders ? 
          Math.round(((statusDistribution.find(s => s._id === 'delivered')?.count || 0) / totalOrders) * 100) : 0
      },
      dailyTrends: orderStats.map(day => ({
        date: day._id,
        orders: day.orders,
        totalValue: Math.round(day.totalValue * 100) / 100,
        averageValue: Math.round(day.avgValue * 100) / 100
      })),
      statusDistribution: statusDistribution.map(status => ({
        status: status._id,
        count: status.count,
        totalValue: Math.round(status.totalValue * 100) / 100,
        percentage: totalOrders ? Math.round((status.count / totalOrders) * 100) : 0
      })),
      hourlyDistribution: Array.from({ length: 24 }, (_, hour) => {
        const hourData = hourlyDistribution.find(h => h._id === hour);
        return {
          hour,
          orders: hourData ? hourData.orders : 0
        };
      }),
      topCustomers: customerStats.map(customer => ({
        id: customer._id,
        name: customer.restaurant.name,
        orders: customer.orders,
        totalValue: Math.round(customer.totalValue * 100) / 100,
        averageOrderValue: Math.round(customer.avgOrderValue * 100) / 100,
        lastOrder: customer.lastOrder
      }))
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get product performance analytics
 * @route   GET /api/v1/vendor-dashboard/products
 * @access  Private (Vendor only)
 */
exports.getProductPerformance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { period = 'month', startDate, endDate, sort = 'revenue', limit = 20 } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    const sortMapping = {
      revenue: { revenue: -1 },
      quantity: { totalQuantity: -1 },
      orders: { totalOrders: -1 },
      rating: { averageRating: -1 }
    };

    const [productPerformance, categoryPerformance] = await Promise.all([
      // Individual product performance
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalOrders: { $sum: 1 },
            totalQuantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' },
            avgUnitPrice: { $avg: '$items.unitPrice' }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $lookup: {
            from: 'listings',
            let: { productId: '$_id', vendorId: vendorId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$productId', '$$productId'] },
                      { $eq: ['$vendorId', '$$vendorId'] }
                    ]
                  }
                }
              }
            ],
            as: 'listing'
          }
        },
        { $unwind: '$listing' },
        {
          $project: {
            productId: '$_id',
            productName: '$product.name',
            category: '$product.category',
            totalOrders: 1,
            totalQuantity: 1,
            revenue: 1,
            avgUnitPrice: 1,
            averageRating: '$listing.rating.average',
            views: '$listing.views',
            status: '$listing.status'
          }
        },
        { $sort: sortMapping[sort] || { revenue: -1 } },
        { $limit: parseInt(limit) }
      ]),
      // Category performance
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $lookup: {
            from: 'productcategories',
            localField: 'product.category',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: '$category' },
        {
          $group: {
            _id: '$category._id',
            categoryName: { $first: '$category.name' },
            totalOrders: { $sum: 1 },
            totalQuantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' },
            uniqueProducts: { $addToSet: '$items.productId' }
          }
        },
        {
          $project: {
            categoryId: '$_id',
            categoryName: 1,
            totalOrders: 1,
            totalQuantity: 1,
            revenue: 1,
            uniqueProducts: { $size: '$uniqueProducts' }
          }
        },
        { $sort: { revenue: -1 } }
      ])
    ]);

    const analytics = {
      topProducts: productPerformance.map(product => ({
        productId: product.productId,
        name: product.productName,
        category: product.category,
        orders: product.totalOrders,
        quantitySold: product.totalQuantity,
        revenue: Math.round(product.revenue * 100) / 100,
        averageUnitPrice: Math.round(product.avgUnitPrice * 100) / 100,
        rating: product.averageRating || 0,
        views: product.views || 0,
        status: product.status
      })),
      categoryPerformance: categoryPerformance.map(category => ({
        categoryId: category.categoryId,
        name: category.categoryName,
        orders: category.totalOrders,
        quantitySold: category.totalQuantity,
        revenue: Math.round(category.revenue * 100) / 100,
        uniqueProducts: category.uniqueProducts
      })),
      summary: {
        totalProducts: productPerformance.length,
        totalRevenue: productPerformance.reduce((sum, p) => sum + p.revenue, 0),
        totalQuantitySold: productPerformance.reduce((sum, p) => sum + p.totalQuantity, 0),
        averageRating: productPerformance.reduce((sum, p, _, arr) => 
          sum + (p.averageRating || 0) / arr.length, 0)
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get customer insights and analytics
 * @route   GET /api/v1/vendor-dashboard/customers
 * @access  Private (Vendor only)
 */
exports.getCustomerInsights = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { period = 'month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [customerStats, loyaltyMetrics, acquisitionTrends] = await Promise.all([
      // Customer performance metrics
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$restaurantId',
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            firstOrder: { $min: '$createdAt' },
            lastOrder: { $max: '$createdAt' },
            uniqueProducts: { $addToSet: { $map: { input: '$items', as: 'item', in: '$$item.productId' } } }
          }
        },
        {
          $lookup: {
            from: 'restaurants',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurant'
          }
        },
        { $unwind: '$restaurant' },
        {
          $project: {
            restaurantId: '$_id',
            name: '$restaurant.name',
            email: '$restaurant.email',
            totalOrders: 1,
            totalSpent: 1,
            averageOrderValue: 1,
            firstOrder: 1,
            lastOrder: 1,
            uniqueProductsCount: {
              $size: {
                $reduce: {
                  input: '$uniqueProducts',
                  initialValue: [],
                  in: { $setUnion: ['$$value', '$$this'] }
                }
              }
            },
            daysSinceLastOrder: {
              $divide: [{ $subtract: [new Date(), '$lastOrder'] }, 86400000]
            }
          }
        },
        { $sort: { totalSpent: -1 } }
      ]),
      // Customer loyalty analysis
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId
          }
        },
        {
          $group: {
            _id: '$restaurantId',
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            firstOrder: { $min: '$createdAt' },
            lastOrder: { $max: '$createdAt' }
          }
        },
        {
          $project: {
            totalOrders: 1,
            totalSpent: 1,
            customerLifetimeDays: {
              $divide: [{ $subtract: ['$lastOrder', '$firstOrder'] }, 86400000]
            },
            segment: {
              $switch: {
                branches: [
                  { case: { $gte: ['$totalOrders', 10] }, then: 'VIP' },
                  { case: { $gte: ['$totalOrders', 5] }, then: 'Loyal' },
                  { case: { $gte: ['$totalOrders', 2] }, then: 'Regular' }
                ],
                default: 'New'
              }
            }
          }
        },
        {
          $group: {
            _id: '$segment',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$totalSpent' },
            avgLifetime: { $avg: '$customerLifetimeDays' }
          }
        }
      ]),
      // Customer acquisition trends
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
          }
        },
        {
          $group: {
            _id: {
              restaurantId: '$restaurantId',
              month: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              }
            },
            firstOrderInMonth: { $min: '$createdAt' }
          }
        },
        {
          $group: {
            _id: {
              restaurantId: '$_id.restaurantId'
            },
            firstOrderOverall: { $min: '$firstOrderInMonth' }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$firstOrderOverall' },
              month: { $month: '$firstOrderOverall' }
            },
            newCustomers: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    const insights = {
      topCustomers: customerStats.slice(0, 10).map(customer => ({
        id: customer.restaurantId,
        name: customer.name,
        email: customer.email,
        totalOrders: customer.totalOrders,
        totalSpent: Math.round(customer.totalSpent * 100) / 100,
        averageOrderValue: Math.round(customer.averageOrderValue * 100) / 100,
        firstOrder: customer.firstOrder,
        lastOrder: customer.lastOrder,
        uniqueProducts: customer.uniqueProductsCount,
        daysSinceLastOrder: Math.floor(customer.daysSinceLastOrder || 0),
        status: customer.daysSinceLastOrder > 30 ? 'At Risk' : 
                customer.daysSinceLastOrder > 14 ? 'Needs Attention' : 'Active'
      })),
      loyaltySegments: loyaltyMetrics.reduce((acc, segment) => {
        acc[segment._id] = {
          count: segment.count,
          totalRevenue: Math.round(segment.totalRevenue * 100) / 100,
          averageLifetime: Math.floor(segment.avgLifetime || 0)
        };
        return acc;
      }, {}),
      acquisitionTrends: acquisitionTrends.map(trend => ({
        month: `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}`,
        newCustomers: trend.newCustomers
      })),
      summary: {
        totalCustomers: customerStats.length,
        activeCustomers: customerStats.filter(c => c.daysSinceLastOrder <= 30).length,
        atRiskCustomers: customerStats.filter(c => c.daysSinceLastOrder > 30).length,
        averageOrderValue: customerStats.length ? 
          Math.round(customerStats.reduce((sum, c) => sum + c.averageOrderValue, 0) / customerStats.length * 100) / 100 : 0,
        customerLifetimeValue: customerStats.length ?
          Math.round(customerStats.reduce((sum, c) => sum + c.totalSpent, 0) / customerStats.length * 100) / 100 : 0
      }
    };

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    next(error);
  }
};

// Additional controller methods will be implemented next...
/**
 * @desc    Get inventory status and alerts
 * @route   GET /api/v1/vendor-dashboard/inventory
 * @access  Private (Vendor only)
 */
exports.getInventoryStatus = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;

    const [listings, lowStockItems, outOfStockItems] = await Promise.all([
      // All vendor listings with stock info
      Listing.find({ vendorId })
        .populate('productId', 'name category')
        .populate({
          path: 'productId',
          populate: {
            path: 'category',
            select: 'name'
          }
        })
        .select('productId availability status pricing createdAt updatedAt'),
      
      // Low stock items (less than 10% of initial stock or less than 10 units)
      Listing.find({
        vendorId,
        status: 'active',
        'availability.quantityAvailable': { $lt: 10, $gt: 0 }
      })
        .populate('productId', 'name')
        .select('productId availability'),
      
      // Out of stock items
      Listing.find({
        vendorId,
        $or: [
          { 'availability.quantityAvailable': 0 },
          { status: 'out_of_stock' }
        ]
      })
        .populate('productId', 'name')
        .select('productId availability status')
    ]);

    const inventory = {
      summary: {
        totalListings: listings.length,
        activeListings: listings.filter(l => l.status === 'active').length,
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        totalValue: listings.reduce((sum, listing) => {
          const price = listing.pricing[0]?.pricePerUnit || 0;
          const quantity = listing.availability.quantityAvailable || 0;
          return sum + (price * quantity);
        }, 0)
      },
      stockAlerts: {
        lowStock: lowStockItems.map(item => ({
          listingId: item._id,
          productName: item.productId.name,
          currentStock: item.availability.quantityAvailable,
          unit: item.availability.unit,
          status: 'low_stock'
        })),
        outOfStock: outOfStockItems.map(item => ({
          listingId: item._id,
          productName: item.productId.name,
          currentStock: item.availability.quantityAvailable,
          unit: item.availability.unit,
          status: 'out_of_stock'
        }))
      },
      inventoryList: listings.map(listing => ({
        listingId: listing._id,
        productName: listing.productId.name,
        category: listing.productId.category?.name || 'Uncategorized',
        currentStock: listing.availability.quantityAvailable,
        unit: listing.availability.unit,
        pricePerUnit: listing.pricing[0]?.pricePerUnit || 0,
        status: listing.status,
        stockValue: (listing.pricing[0]?.pricePerUnit || 0) * (listing.availability.quantityAvailable || 0),
        lastUpdated: listing.updatedAt
      }))
    };

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get orders for management (pending, processing, etc.)
 * @route   GET /api/v1/vendor-dashboard/order-management
 * @access  Private (Vendor only)
 */
exports.getOrderManagement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { 
      status = 'all', 
      page = 1, 
      limit = 20 
    } = req.query;

    const skip = (page - 1) * limit;
    let matchConditions = { vendorId };

    if (status !== 'all') {
      matchConditions.status = status;
    }

    const [orders, totalCount, statusCounts] = await Promise.all([
      Order.find(matchConditions)
        .populate('restaurantId', 'name email phone address')
        .populate('items.productId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      
      Order.countDocuments(matchConditions),
      
      Order.aggregate([
        { $match: { vendorId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const orderManagement = {
      orders: orders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        restaurant: {
          id: order.restaurantId._id,
          name: order.restaurantId.name,
          email: order.restaurantId.email,
          phone: order.restaurantId.phone,
          address: order.restaurantId.address
        },
        items: order.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        totalAmount: order.totalAmount,
        status: order.status,
        orderDate: order.createdAt,
        deliveryDate: order.deliveryDate,
        notes: order.notes
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalOrders: totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      },
      statusSummary: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {
        all: totalCount
      })
    };

    res.status(200).json({
      success: true,
      data: orderManagement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get top performing products
 * @route   GET /api/v1/vendor-dashboard/top-products
 * @access  Private (Vendor only)
 */
exports.getTopProducts = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { 
      period = 'month', 
      startDate, 
      endDate, 
      metric = 'revenue', 
      limit = 10 
    } = req.query;
    
    const { start, end } = getDateRange(period, startDate, endDate);

    const sortField = {
      revenue: 'revenue',
      quantity: 'totalQuantity', 
      orders: 'totalOrders'
    }[metric] || 'revenue';

    const topProducts = await Order.aggregate([
      {
        $match: {
          vendorId: vendorId,
          createdAt: { $gte: start, $lte: end }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' },
          avgUnitPrice: { $avg: '$items.unitPrice' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'listings',
          let: { productId: '$_id', vendorId: vendorId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$productId', '$$productId'] },
                    { $eq: ['$vendorId', '$$vendorId'] }
                  ]
                }
              }
            }
          ],
          as: 'listing'
        }
      },
      { $unwind: '$listing' },
      {
        $project: {
          productId: '$_id',
          productName: '$product.name',
          totalOrders: 1,
          totalQuantity: 1,
          revenue: 1,
          avgUnitPrice: 1,
          currentStock: '$listing.availability.quantityAvailable',
          rating: '$listing.rating.average',
          views: '$listing.views'
        }
      },
      { $sort: { [sortField]: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const result = {
      period: { start, end },
      metric,
      products: topProducts.map((product, index) => ({
        rank: index + 1,
        productId: product.productId,
        name: product.productName,
        orders: product.totalOrders,
        quantitySold: product.totalQuantity,
        revenue: Math.round(product.revenue * 100) / 100,
        averagePrice: Math.round(product.avgUnitPrice * 100) / 100,
        currentStock: product.currentStock,
        rating: product.rating || 0,
        views: product.views || 0
      }))
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed sales reports
 * @route   GET /api/v1/vendor-dashboard/sales-reports
 * @access  Private (Vendor only)
 */
exports.getSalesReports = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { period = 'month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [salesSummary, productSales, customerSales, dailySales] = await Promise.all([
      // Overall sales summary
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: '$totalAmount' },
            totalItems: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]),
      // Product-wise sales
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            productName: { $first: '$items.productName' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.totalPrice' },
            totalOrders: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]),
      // Customer-wise sales
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$restaurantId',
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' }
          }
        },
        {
          $lookup: {
            from: 'restaurants',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurant'
          }
        },
        { $unwind: '$restaurant' },
        { $sort: { totalRevenue: -1 } }
      ]),
      // Daily sales breakdown
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            dailyRevenue: { $sum: '$totalAmount' },
            dailyOrders: { $sum: 1 },
            dailyItems: { $sum: { $sum: '$items.quantity' } }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    const summary = salesSummary[0] || {
      totalRevenue: 0,
      totalOrders: 0, 
      averageOrderValue: 0,
      totalItems: 0
    };

    const report = {
      period: { start, end },
      summary: {
        totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
        totalOrders: summary.totalOrders,
        averageOrderValue: Math.round(summary.averageOrderValue * 100) / 100,
        totalItemsSold: summary.totalItems
      },
      dailyBreakdown: dailySales.map(day => ({
        date: day._id,
        revenue: Math.round(day.dailyRevenue * 100) / 100,
        orders: day.dailyOrders,
        items: day.dailyItems
      })),
      productPerformance: productSales.map(product => ({
        productId: product._id,
        name: product.productName,
        quantitySold: product.totalQuantity,
        revenue: Math.round(product.totalRevenue * 100) / 100,
        orders: product.totalOrders
      })),
      customerPerformance: customerSales.map(customer => ({
        customerId: customer._id,
        name: customer.restaurant.name,
        orders: customer.totalOrders,
        revenue: Math.round(customer.totalRevenue * 100) / 100
      }))
    };

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get seasonal sales trends and patterns
 * @route   GET /api/v1/vendor-dashboard/seasonal-trends
 * @access  Private (Vendor only)
 */
exports.getSeasonalTrends = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { year = new Date().getFullYear() } = req.query;
    
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const [monthlyTrends, seasonalBreakdown, productSeasonality] = await Promise.all([
      // Monthly trends
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: startOfYear, $lte: endOfYear }
          }
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            items: { $sum: { $sum: '$items.quantity' } }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      // Seasonal breakdown (quarters)
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: startOfYear, $lte: endOfYear }
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $in: [{ $month: '$createdAt' }, [12, 1, 2]] }, then: 'Winter' },
                  { case: { $in: [{ $month: '$createdAt' }, [3, 4, 5]] }, then: 'Spring' },
                  { case: { $in: [{ $month: '$createdAt' }, [6, 7, 8]] }, then: 'Summer' },
                  { case: { $in: [{ $month: '$createdAt' }, [9, 10, 11]] }, then: 'Fall' }
                ]
              }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            items: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]),
      // Product seasonality patterns
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: startOfYear, $lte: endOfYear }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              productId: '$items.productId',
              productName: '$items.productName',
              month: { $month: '$createdAt' }
            },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' }
          }
        },
        {
          $group: {
            _id: {
              productId: '$_id.productId',
              productName: '$_id.productName'
            },
            monthlyData: {
              $push: {
                month: '$_id.month',
                quantity: '$quantity',
                revenue: '$revenue'
              }
            },
            totalRevenue: { $sum: '$revenue' }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ])
    ]);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const trends = {
      year: parseInt(year),
      monthlyTrends: Array.from({ length: 12 }, (_, index) => {
        const monthData = monthlyTrends.find(m => m._id === index + 1);
        return {
          month: index + 1,
          name: monthNames[index],
          revenue: monthData ? Math.round(monthData.revenue * 100) / 100 : 0,
          orders: monthData ? monthData.orders : 0,
          items: monthData ? monthData.items : 0
        };
      }),
      seasonalBreakdown: seasonalBreakdown.reduce((acc, season) => {
        acc[season._id] = {
          revenue: Math.round(season.revenue * 100) / 100,
          orders: season.orders,
          items: season.items
        };
        return acc;
      }, {
        Winter: { revenue: 0, orders: 0, items: 0 },
        Spring: { revenue: 0, orders: 0, items: 0 },
        Summer: { revenue: 0, orders: 0, items: 0 },
        Fall: { revenue: 0, orders: 0, items: 0 }
      }),
      topProductSeasonality: productSeasonality.map(product => ({
        productId: product._id.productId,
        name: product._id.productName,
        totalRevenue: Math.round(product.totalRevenue * 100) / 100,
        monthlyPattern: Array.from({ length: 12 }, (_, month) => {
          const monthData = product.monthlyData.find(m => m.month === month + 1);
          return {
            month: month + 1,
            quantity: monthData ? monthData.quantity : 0,
            revenue: monthData ? Math.round(monthData.revenue * 100) / 100 : 0
          };
        })
      }))
    };

    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get financial summary and payment tracking
 * @route   GET /api/v1/vendor-dashboard/financial-summary
 * @access  Private (Vendor only)
 */
exports.getFinancialSummary = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { period = 'month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    const [financialStats, paymentStatusBreakdown] = await Promise.all([
      // Financial statistics
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            grossRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: '$totalAmount' },
            deliveredRevenue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'delivered'] }, '$totalAmount', 0]
              }
            },
            deliveredOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
              }
            }
          }
        }
      ]),
      // Payment status breakdown
      Order.aggregate([
        {
          $match: {
            vendorId: vendorId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);

    const stats = financialStats[0] || {
      grossRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      deliveredRevenue: 0,
      deliveredOrders: 0
    };

    // Calculate commission (assuming 5% platform fee)
    const platformCommissionRate = 0.05;
    const estimatedCommission = stats.deliveredRevenue * platformCommissionRate;
    const netRevenue = stats.deliveredRevenue - estimatedCommission;

    const financialSummary = {
      period: { start, end },
      revenue: {
        gross: Math.round(stats.grossRevenue * 100) / 100,
        delivered: Math.round(stats.deliveredRevenue * 100) / 100,
        net: Math.round(netRevenue * 100) / 100,
        pendingPayment: Math.round((stats.grossRevenue - stats.deliveredRevenue) * 100) / 100
      },
      orders: {
        total: stats.totalOrders,
        delivered: stats.deliveredOrders,
        pending: stats.totalOrders - stats.deliveredOrders
      },
      metrics: {
        averageOrderValue: Math.round(stats.averageOrderValue * 100) / 100,
        fulfillmentRate: stats.totalOrders ? 
          Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0,
        estimatedCommission: Math.round(estimatedCommission * 100) / 100,
        commissionRate: platformCommissionRate * 100
      },
      paymentBreakdown: paymentStatusBreakdown.reduce((acc, payment) => {
        acc[payment._id || 'pending'] = {
          count: payment.count,
          amount: Math.round(payment.amount * 100) / 100
        };
        return acc;
      }, {})
    };

    res.status(200).json({
      success: true,
      data: financialSummary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor notifications and alerts
 * @route   GET /api/v1/vendor-dashboard/notifications
 * @access  Private (Vendor only)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const userId = req.user.id;
    const { type, unreadOnly, page = 1, limit = 20 } = req.query;

    const NotificationService = require('../services/notificationService');
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    if (type && type !== 'all') {
      options.type = type;
    }

    if (unreadOnly === 'true') {
      options.isRead = false;
    }

    const [notificationsData, stats] = await Promise.all([
      NotificationService.getUserNotifications(userId, options),
      NotificationService.getUserNotificationStats(userId)
    ]);

    const response = {
      notifications: notificationsData.notifications.map(notification => ({
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        isRead: notification.isRead,
        isActionRequired: notification.isActionRequired,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        relatedEntity: notification.relatedEntity,
        metadata: notification.metadata,
        age: notification.age,
        createdAt: notification.createdAt,
        readAt: notification.readAt
      })),
      pagination: notificationsData.pagination,
      summary: {
        total: stats.total,
        unread: stats.unread,
        urgent: stats.urgent,
        actionRequired: stats.actionRequired
      }
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};