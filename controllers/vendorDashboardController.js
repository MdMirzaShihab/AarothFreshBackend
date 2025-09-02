const { validationResult } = require('express-validator');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const Product = require('../models/Product');
const { ErrorResponse } = require('../middleware/error');

/**
 * Helper function to calculate profit margin distribution
 */
const calculateProfitMarginDistribution = (profitByProduct) => {
  if (!profitByProduct || profitByProduct.length === 0) {
    return {
      highMargin: { count: 0, percentage: 0, range: '> 30%' },
      mediumMargin: { count: 0, percentage: 0, range: '10-30%' },
      lowMargin: { count: 0, percentage: 0, range: '0-10%' },
      negative: { count: 0, percentage: 0, range: '< 0%' }
    };
  }

  const total = profitByProduct.length;
  const distribution = profitByProduct.reduce((acc, product) => {
    const margin = product.averageProfitMargin || 0;
    if (margin > 30) acc.highMargin++;
    else if (margin >= 10) acc.mediumMargin++;
    else if (margin >= 0) acc.lowMargin++;
    else acc.negative++;
    return acc;
  }, { highMargin: 0, mediumMargin: 0, lowMargin: 0, negative: 0 });

  return {
    highMargin: { 
      count: distribution.highMargin, 
      percentage: Math.round((distribution.highMargin / total) * 100), 
      range: '> 30%' 
    },
    mediumMargin: { 
      count: distribution.mediumMargin, 
      percentage: Math.round((distribution.mediumMargin / total) * 100), 
      range: '10-30%' 
    },
    lowMargin: { 
      count: distribution.lowMargin, 
      percentage: Math.round((distribution.lowMargin / total) * 100), 
      range: '0-10%' 
    },
    negative: { 
      count: distribution.negative, 
      percentage: Math.round((distribution.negative / total) * 100), 
      range: '< 0%' 
    }
  };
};

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
      currentProfitStats,
      previousProfitStats,
      totalListings,
      activeListings,
      totalProducts,
      averageRating,
      inventoryHealth,
      inventoryAlerts,
      recentOrders
    ] = await Promise.all([
      // Current period order stats
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
      // Previous period order stats for comparison
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
      // Current period profit analytics from listings
      Listing.aggregate([
        { $match: { vendorId, 'profitAnalytics.totalRevenue': { $gt: 0 } } },
        {
          $addFields: {
            periodRevenue: {
              $reduce: {
                input: '$profitAnalytics.salesHistory',
                initialValue: 0,
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $gte: ['$$this.date', start] },
                        { $lte: ['$$this.date', end] }
                      ]
                    },
                    then: { $add: ['$$value', '$$this.revenue'] },
                    else: '$$value'
                  }
                }
              }
            },
            periodCost: {
              $reduce: {
                input: '$profitAnalytics.salesHistory',
                initialValue: 0,
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $gte: ['$$this.date', start] },
                        { $lte: ['$$this.date', end] }
                      ]
                    },
                    then: { $add: ['$$value', '$$this.totalCost'] },
                    else: '$$value'
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$periodRevenue' },
            totalCost: { $sum: '$periodCost' },
            grossProfit: { $sum: { $subtract: ['$periodRevenue', '$periodCost'] } },
            profitableListings: { $sum: { $cond: [{ $gt: ['$profitAnalytics.profitMargin', 0] }, 1, 0] } }
          }
        }
      ]),
      // Previous period profit analytics
      Listing.aggregate([
        { $match: { vendorId, 'profitAnalytics.totalRevenue': { $gt: 0 } } },
        {
          $addFields: {
            prevPeriodRevenue: {
              $reduce: {
                input: '$profitAnalytics.salesHistory',
                initialValue: 0,
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $gte: ['$$this.date', prevStart] },
                        { $lte: ['$$this.date', prevEnd] }
                      ]
                    },
                    then: { $add: ['$$value', '$$this.revenue'] },
                    else: '$$value'
                  }
                }
              }
            },
            prevPeriodCost: {
              $reduce: {
                input: '$profitAnalytics.salesHistory',
                initialValue: 0,
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $gte: ['$$this.date', prevStart] },
                        { $lte: ['$$this.date', prevEnd] }
                      ]
                    },
                    then: { $add: ['$$value', '$$this.totalCost'] },
                    else: '$$value'
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$prevPeriodRevenue' },
            totalCost: { $sum: '$prevPeriodCost' },
            grossProfit: { $sum: { $subtract: ['$prevPeriodRevenue', '$prevPeriodCost'] } }
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
      // Inventory health summary
      VendorInventory.aggregate([
        { $match: { vendorId } },
        {
          $group: {
            _id: null,
            totalInventoryItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$availableQuantity', '$averagePurchasePrice'] } },
            activeItems: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            lowStockItems: { $sum: { $cond: [{ $eq: ['$status', 'low_stock'] }, 1, 0] } },
            outOfStockItems: { $sum: { $cond: [{ $eq: ['$status', 'out_of_stock'] }, 1, 0] } },
            overstockedItems: { $sum: { $cond: [{ $eq: ['$status', 'overstocked'] }, 1, 0] } }
          }
        }
      ]),
      // Critical inventory alerts count
      VendorInventory.countDocuments({
        vendorId,
        $or: [
          { 'alerts.severity': 'critical' },
          { 'alerts.severity': 'high' }
        ],
        'alerts.isRead': false
      }),
      // Recent orders
      Order.find({ vendorId })
        .populate('restaurantId', 'name')
        .populate('items.productId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const current = currentStats[0] || { totalRevenue: 0, totalOrders: 0, totalQuantity: 0, averageOrderValue: 0 };
    const previous = previousStats[0] || { totalRevenue: 0, totalOrders: 0 };
    
    const currentProfit = currentProfitStats[0] || { totalRevenue: 0, totalCost: 0, grossProfit: 0, profitableListings: 0 };
    const previousProfit = previousProfitStats[0] || { totalRevenue: 0, totalCost: 0, grossProfit: 0 };
    
    const inventoryStats = inventoryHealth[0] || {
      totalInventoryItems: 0,
      totalValue: 0,
      activeItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      overstockedItems: 0
    };

    // Calculate growth percentages
    const revenueGrowth = previous.totalRevenue ? 
      ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue * 100) : 0;
    const orderGrowth = previous.totalOrders ? 
      ((current.totalOrders - previous.totalOrders) / previous.totalOrders * 100) : 0;
    const profitGrowth = previousProfit.grossProfit ? 
      ((currentProfit.grossProfit - previousProfit.grossProfit) / previousProfit.grossProfit * 100) : 0;

    // Calculate profit margin
    const overallProfitMargin = currentProfit.totalRevenue ? 
      ((currentProfit.grossProfit / currentProfit.totalRevenue) * 100) : 0;

    // Calculate inventory health score (0-100)
    const totalItems = inventoryStats.totalInventoryItems;
    const healthyItems = inventoryStats.activeItems;
    const inventoryHealthScore = totalItems ? Math.round((healthyItems / totalItems) * 100) : 100;

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
        profit: {
          current: currentProfit.grossProfit,
          growth: Math.round(profitGrowth * 100) / 100,
          margin: Math.round(overallProfitMargin * 100) / 100
        },
        averageOrderValue: Math.round(current.averageOrderValue * 100) / 100,
        totalQuantitySold: current.totalQuantity
      },
      businessMetrics: {
        totalListings,
        activeListings,
        totalProducts,
        profitableListings: currentProfit.profitableListings,
        averageRating: averageRating[0]?.avgRating || 0,
        listingActivationRate: totalListings ? Math.round((activeListings / totalListings) * 100) : 0,
        profitabilityRate: totalListings ? Math.round((currentProfit.profitableListings / totalListings) * 100) : 0
      },
      inventoryHealth: {
        totalItems: inventoryStats.totalInventoryItems,
        totalValue: Math.round(inventoryStats.totalValue * 100) / 100,
        healthScore: inventoryHealthScore,
        activeItems: inventoryStats.activeItems,
        lowStockItems: inventoryStats.lowStockItems,
        outOfStockItems: inventoryStats.outOfStockItems,
        overstockedItems: inventoryStats.overstockedItems,
        criticalAlerts: inventoryAlerts,
        statusDistribution: {
          active: inventoryStats.activeItems,
          lowStock: inventoryStats.lowStockItems,
          outOfStock: inventoryStats.outOfStockItems,
          overstocked: inventoryStats.overstockedItems
        }
      },
      financialSummary: {
        totalRevenue: currentProfit.totalRevenue,
        totalCosts: currentProfit.totalCost,
        grossProfit: currentProfit.grossProfit,
        profitMargin: overallProfitMargin,
        inventoryValue: inventoryStats.totalValue,
        returnOnInventory: inventoryStats.totalValue ? 
          Math.round((currentProfit.grossProfit / inventoryStats.totalValue) * 100 * 100) / 100 : 0
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
 * @desc    Get comprehensive revenue and profit analytics with inventory cost integration
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
    
    // Get inventory analytics for cost calculations
    const VendorInventory = require('../models/VendorInventory');

    const [dailyRevenue, revenueByStatus, revenueByProduct, monthlyTrends, inventoryAnalytics, profitByProduct] = await Promise.all([
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
      ]),
      
      // Get comprehensive inventory analytics for profit calculations
      VendorInventory.getInventoryAnalytics(vendorId, start, end),
      
      // Get profit by product using listings profit analytics
      Listing.aggregate([
        {
          $match: {
            vendorId: vendorId,
            inventoryId: { $exists: true }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
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
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              productId: '$productId',
              productName: '$product.name',
              categoryName: '$category.name'
            },
            totalRevenue: { $sum: '$profitAnalytics.totalRevenue' },
            totalCost: { $sum: '$profitAnalytics.totalCost' },
            grossProfit: { $sum: '$profitAnalytics.grossProfit' },
            averageProfitMargin: { $avg: '$profitAnalytics.profitMargin' },
            totalQuantitySold: { $sum: '$totalQuantitySold' }
          }
        },
        { $sort: { grossProfit: -1 } },
        { $limit: 20 }
      ])
    ]);

    // Calculate profit metrics from inventory analytics and profit by product
    const inventoryData = inventoryAnalytics[0] || {
      totalGrossProfit: 0,
      totalStockValue: 0,
      averageProfitMargin: 0
    };

    const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
    const totalCost = profitByProduct.reduce((sum, product) => sum + product.totalCost, 0);
    const totalGrossProfit = profitByProduct.reduce((sum, product) => sum + product.grossProfit, 0);
    const overallProfitMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    const analytics = {
      summary: {
        totalRevenue,
        totalOrders: dailyRevenue.reduce((sum, day) => sum + day.orders, 0),
        totalCost: Math.round(totalCost * 100) / 100,
        totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
        profitMargin: Math.round(overallProfitMargin * 100) / 100,
        netProfitMargin: Math.round(overallProfitMargin * 100) / 100, // Same as gross for now, could subtract operational costs
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
      })),
      // New profit analytics sections
      profitAnalytics: {
        topProfitableProducts: profitByProduct.slice(0, 10).map(product => ({
          productId: product._id.productId,
          productName: product._id.productName,
          category: product._id.categoryName || 'Uncategorized',
          totalRevenue: Math.round(product.totalRevenue * 100) / 100,
          totalCost: Math.round(product.totalCost * 100) / 100,
          grossProfit: Math.round(product.grossProfit * 100) / 100,
          profitMargin: Math.round(product.averageProfitMargin * 100) / 100,
          quantitySold: product.totalQuantitySold,
          profitPerUnit: product.totalQuantitySold > 0 ? 
            Math.round((product.grossProfit / product.totalQuantitySold) * 100) / 100 : 0
        })),
        profitMarginDistribution: calculateProfitMarginDistribution(profitByProduct),
        costBreakdown: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          grossProfit: Math.round(totalGrossProfit * 100) / 100,
          costOfGoodsSold: Math.round(totalCost * 100) / 100,
          profitMargin: Math.round(overallProfitMargin * 100) / 100
        }
      },
      inventoryImpact: {
        totalStockValue: Math.round(inventoryData.totalStockValue * 100) / 100,
        averageInventoryProfitMargin: Math.round(inventoryData.averageProfitMargin * 100) / 100,
        totalInventoryProfit: Math.round(inventoryData.totalGrossProfit * 100) / 100,
        inventoryTurnoverInsight: profitByProduct.length > 0 ? 
          'Based on current sales and inventory levels' : 'No inventory data available'
      }
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
 * @desc    Get enhanced product performance analytics with profit metrics
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
    const { period = 'month', startDate, endDate, sort = 'profit', limit = 20 } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);
    
    const VendorInventory = require('../models/VendorInventory');

    // Enhanced sort mapping to include profit-based metrics
    const sortMapping = {
      revenue: { totalRevenue: -1 },
      profit: { grossProfit: -1 },
      profitMargin: { profitMargin: -1 },
      quantity: { totalQuantitySold: -1 },
      orders: { totalOrders: -1 },
      rating: { rating: -1 },
      roi: { roi: -1 }
    };

    // Get comprehensive product performance with profit integration
    const [listingPerformance, categoryPerformance, inventoryData] = await Promise.all([
      // Enhanced product performance with profit analytics from listings
      Listing.aggregate([
        {
          $match: {
            vendorId: vendorId,
            inventoryId: { $exists: true }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
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
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'vendorinventories',
            localField: 'inventoryId',
            foreignField: '_id',
            as: 'inventory'
          }
        },
        { $unwind: { path: '$inventory', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            productId: '$productId',
            productName: '$product.name',
            category: '$category.name',
            // Revenue & Sales data
            totalRevenue: '$profitAnalytics.totalRevenue',
            totalCost: '$profitAnalytics.totalCost', 
            grossProfit: '$profitAnalytics.grossProfit',
            profitMargin: '$profitAnalytics.profitMargin',
            averageProfitPerUnit: '$profitAnalytics.averageProfitPerUnit',
            totalQuantitySold: '$totalQuantitySold',
            totalOrders: '$totalOrders',
            // Inventory data
            currentStock: '$inventory.currentStock.totalQuantity',
            averagePurchasePrice: '$inventory.currentStock.averagePurchasePrice',
            inventoryValue: '$inventory.currentStock.totalValue',
            // Calculated metrics
            roi: {
              $cond: {
                if: { $gt: ['$profitAnalytics.totalCost', 0] },
                then: { $multiply: [{ $divide: ['$profitAnalytics.grossProfit', '$profitAnalytics.totalCost'] }, 100] },
                else: 0
              }
            },
            turnoverRate: '$inventory.analytics.turnoverRate',
            // Listing performance
            rating: '$rating.average',
            views: '$views',
            status: '$status',
            // Pricing info
            currentPrice: { $arrayElemAt: ['$pricing.pricePerUnit', 0] },
            lastUpdated: '$updatedAt'
          }
        },
        { $sort: sortMapping[sort] || sortMapping.profit },
        { $limit: parseInt(limit) }
      ]),
      
      // Category performance with profit integration
      Listing.aggregate([
        {
          $match: {
            vendorId: vendorId,
            inventoryId: { $exists: true }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId', 
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
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$category._id',
            categoryName: { $first: '$category.name' },
            totalProducts: { $sum: 1 },
            totalRevenue: { $sum: '$profitAnalytics.totalRevenue' },
            totalCost: { $sum: '$profitAnalytics.totalCost' },
            grossProfit: { $sum: '$profitAnalytics.grossProfit' },
            totalQuantitySold: { $sum: '$totalQuantitySold' },
            totalOrders: { $sum: '$totalOrders' },
            averageRating: { $avg: '$rating.average' }
          }
        },
        {
          $project: {
            categoryId: '$_id',
            categoryName: 1,
            totalProducts: 1,
            totalRevenue: 1,
            totalCost: 1,
            grossProfit: 1,
            profitMargin: {
              $cond: {
                if: { $gt: ['$totalRevenue', 0] },
                then: { $multiply: [{ $divide: ['$grossProfit', '$totalRevenue'] }, 100] },
                else: 0
              }
            },
            totalQuantitySold: 1,
            totalOrders: 1,
            averageRating: 1,
            roi: {
              $cond: {
                if: { $gt: ['$totalCost', 0] },
                then: { $multiply: [{ $divide: ['$grossProfit', '$totalCost'] }, 100] },
                else: 0
              }
            }
          }
        },
        { $sort: { grossProfit: -1 } }
      ]),
      
      // Get overall inventory analytics
      VendorInventory.getInventoryAnalytics(vendorId)
    ]);

    const inventoryAnalytics = inventoryData[0] || {};

    const analytics = {
      topProducts: listingPerformance.map(product => ({
        productId: product.productId,
        name: product.productName,
        category: product.category || 'Uncategorized',
        // Financial metrics
        revenue: Math.round((product.totalRevenue || 0) * 100) / 100,
        cost: Math.round((product.totalCost || 0) * 100) / 100,
        grossProfit: Math.round((product.grossProfit || 0) * 100) / 100,
        profitMargin: Math.round((product.profitMargin || 0) * 100) / 100,
        profitPerUnit: Math.round((product.averageProfitPerUnit || 0) * 100) / 100,
        roi: Math.round((product.roi || 0) * 100) / 100,
        // Sales metrics
        orders: product.totalOrders || 0,
        quantitySold: product.totalQuantitySold || 0,
        currentPrice: Math.round((product.currentPrice || 0) * 100) / 100,
        averagePurchasePrice: Math.round((product.averagePurchasePrice || 0) * 100) / 100,
        // Inventory metrics
        currentStock: product.currentStock || 0,
        inventoryValue: Math.round((product.inventoryValue || 0) * 100) / 100,
        turnoverRate: product.turnoverRate || 0,
        // Performance metrics
        rating: product.rating || 0,
        views: product.views || 0,
        status: product.status || 'inactive',
        lastUpdated: product.lastUpdated,
        // Health indicators
        stockHealth: product.currentStock > 0 ? 'in_stock' : 'out_of_stock',
        profitHealth: product.profitMargin > 10 ? 'healthy' : product.profitMargin > 0 ? 'low' : 'negative'
      })),
      categoryPerformance: categoryPerformance.map(category => ({
        categoryId: category.categoryId,
        name: category.categoryName || 'Uncategorized',
        totalProducts: category.totalProducts,
        // Financial metrics
        revenue: Math.round((category.totalRevenue || 0) * 100) / 100,
        cost: Math.round((category.totalCost || 0) * 100) / 100,
        grossProfit: Math.round((category.grossProfit || 0) * 100) / 100,
        profitMargin: Math.round((category.profitMargin || 0) * 100) / 100,
        roi: Math.round((category.roi || 0) * 100) / 100,
        // Sales metrics
        orders: category.totalOrders,
        quantitySold: category.totalQuantitySold,
        averageRating: Math.round((category.averageRating || 0) * 100) / 100
      })),
      summary: {
        totalProducts: listingPerformance.length,
        totalRevenue: Math.round(listingPerformance.reduce((sum, p) => sum + (p.totalRevenue || 0), 0) * 100) / 100,
        totalCost: Math.round(listingPerformance.reduce((sum, p) => sum + (p.totalCost || 0), 0) * 100) / 100,
        totalGrossProfit: Math.round(listingPerformance.reduce((sum, p) => sum + (p.grossProfit || 0), 0) * 100) / 100,
        averageProfitMargin: listingPerformance.length > 0 
          ? Math.round((listingPerformance.reduce((sum, p) => sum + (p.profitMargin || 0), 0) / listingPerformance.length) * 100) / 100
          : 0,
        totalQuantitySold: listingPerformance.reduce((sum, p) => sum + (p.totalQuantitySold || 0), 0),
        averageRating: listingPerformance.length > 0
          ? Math.round((listingPerformance.reduce((sum, p) => sum + (p.rating || 0), 0) / listingPerformance.length) * 100) / 100
          : 0,
        // Performance indicators
        profitableProducts: listingPerformance.filter(p => (p.grossProfit || 0) > 0).length,
        highMarginProducts: listingPerformance.filter(p => (p.profitMargin || 0) > 20).length,
        totalInventoryValue: Math.round((inventoryAnalytics.totalStockValue || 0) * 100) / 100
      },
      profitInsights: {
        topProfitMakers: listingPerformance
          .filter(p => (p.grossProfit || 0) > 0)
          .slice(0, 5)
          .map(p => ({
            name: p.productName,
            profit: Math.round((p.grossProfit || 0) * 100) / 100,
            margin: Math.round((p.profitMargin || 0) * 100) / 100
          })),
        lowMarginAlert: listingPerformance
          .filter(p => (p.profitMargin || 0) < 10 && (p.profitMargin || 0) > 0)
          .slice(0, 5)
          .map(p => ({
            name: p.productName,
            margin: Math.round((p.profitMargin || 0) * 100) / 100,
            suggestion: 'Consider adjusting pricing or reducing costs'
          })),
        lossmakers: listingPerformance
          .filter(p => (p.grossProfit || 0) < 0)
          .slice(0, 3)
          .map(p => ({
            name: p.productName,
            loss: Math.abs(Math.round((p.grossProfit || 0) * 100) / 100),
            suggestion: 'Review pricing strategy or discontinue'
          }))
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
 * @desc    Get comprehensive inventory status and analytics
 * @route   GET /api/v1/vendor-dashboard/inventory
 * @access  Private (Vendor only)
 */
exports.getInventoryStatus = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const VendorInventory = require('../models/VendorInventory');

    const [inventoryItems, listings, inventoryAnalytics] = await Promise.all([
      // Get all inventory items with complete data
      VendorInventory.find({ vendorId })
        .populate('productId', 'name category images')
        .populate({
          path: 'productId',
          populate: {
            path: 'category',
            select: 'name'
          }
        }),
      
      // Get listings with inventory references
      Listing.find({ vendorId })
        .populate('inventoryId')
        .populate('productId', 'name category')
        .select('productId inventoryId availability status pricing profitAnalytics createdAt updatedAt'),
      
      // Get comprehensive inventory analytics
      VendorInventory.getInventoryAnalytics(vendorId)
    ]);

    const analytics = inventoryAnalytics[0] || {
      totalProducts: 0,
      totalStockValue: 0,
      totalStockQuantity: 0,
      averageProfitMargin: 0,
      totalGrossProfit: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      overstockedItems: 0
    };

    // Categorize inventory items
    const categorizedItems = {
      healthy: inventoryItems.filter(item => item.status === 'active'),
      lowStock: inventoryItems.filter(item => item.status === 'low_stock'),
      outOfStock: inventoryItems.filter(item => item.status === 'out_of_stock'),
      overstocked: inventoryItems.filter(item => item.status === 'overstocked'),
      inactive: inventoryItems.filter(item => item.status === 'inactive')
    };

    // Get items with unread alerts
    const alertsCount = inventoryItems.reduce((total, item) => {
      return total + item.alerts.filter(alert => !alert.isRead).length;
    }, 0);

    // Calculate total purchase and sale values
    const purchaseAnalytics = inventoryItems.reduce((acc, item) => {
      acc.totalPurchaseValue += item.analytics.totalPurchaseValue;
      acc.totalSoldValue += item.analytics.totalSoldValue;
      acc.totalGrossProfit += item.analytics.grossProfit;
      return acc;
    }, { totalPurchaseValue: 0, totalSoldValue: 0, totalGrossProfit: 0 });

    // Get recent stock movements (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMovements = inventoryItems.reduce((movements, item) => {
      const recentItemMovements = item.analytics.stockMovements.filter(
        movement => new Date(movement.date) >= sevenDaysAgo
      );
      return movements.concat(recentItemMovements.map(movement => ({
        ...movement.toObject(),
        productName: item.productId.name,
        inventoryId: item._id
      })));
    }, []).sort((a, b) => new Date(b.date) - new Date(a.date));

    const inventory = {
      summary: {
        totalProducts: analytics.totalProducts,
        totalStockValue: Math.round(analytics.totalStockValue * 100) / 100,
        totalStockQuantity: analytics.totalStockQuantity,
        averageProfitMargin: Math.round(analytics.averageProfitMargin * 100) / 100,
        totalGrossProfit: Math.round(analytics.totalGrossProfit * 100) / 100,
        stockDistribution: {
          healthy: categorizedItems.healthy.length,
          lowStock: categorizedItems.lowStock.length,
          outOfStock: categorizedItems.outOfStock.length,
          overstocked: categorizedItems.overstocked.length,
          inactive: categorizedItems.inactive.length
        },
        alertsCount,
        totalPurchaseValue: Math.round(purchaseAnalytics.totalPurchaseValue * 100) / 100,
        totalSoldValue: Math.round(purchaseAnalytics.totalSoldValue * 100) / 100,
        overallProfitMargin: purchaseAnalytics.totalSoldValue > 0 
          ? Math.round((purchaseAnalytics.totalGrossProfit / purchaseAnalytics.totalSoldValue) * 100 * 100) / 100 
          : 0
      },
      inventoryItems: inventoryItems.map(item => ({
        inventoryId: item._id,
        productId: item.productId._id,
        productName: item.productId.name,
        category: item.productId.category?.name || 'Uncategorized',
        currentStock: item.currentStock.totalQuantity,
        unit: item.currentStock.unit,
        averagePurchasePrice: Math.round(item.currentStock.averagePurchasePrice * 100) / 100,
        totalValue: Math.round(item.currentStock.totalValue * 100) / 100,
        status: item.status,
        reorderLevel: item.inventorySettings.reorderLevel,
        maxStockLevel: item.inventorySettings.maxStockLevel,
        grossProfit: Math.round(item.analytics.grossProfit * 100) / 100,
        profitMargin: Math.round(item.analytics.profitMargin * 100) / 100,
        lastStockUpdate: item.lastStockUpdate,
        alertsCount: item.alerts.filter(alert => !alert.isRead).length,
        activeBatches: item.purchases.filter(p => p.status === 'active').length,
        totalPurchases: item.purchases.length
      })),
      stockAlerts: inventoryItems.filter(item => 
        item.status === 'low_stock' || 
        item.status === 'out_of_stock' || 
        item.alerts.some(alert => !alert.isRead)
      ).map(item => ({
        inventoryId: item._id,
        productName: item.productId.name,
        status: item.status,
        currentStock: item.currentStock.totalQuantity,
        reorderLevel: item.inventorySettings.reorderLevel,
        unreadAlerts: item.alerts.filter(alert => !alert.isRead).map(alert => ({
          type: alert.type,
          message: alert.message,
          severity: alert.severity,
          createdAt: alert.createdAt
        }))
      })),
      recentMovements: recentMovements.slice(0, 20), // Last 20 movements
      listings: listings.map(listing => ({
        listingId: listing._id,
        inventoryId: listing.inventoryId,
        productName: listing.productId.name,
        category: listing.productId.category?.name || 'Uncategorized',
        availableQuantity: listing.availability.quantityAvailable,
        unit: listing.availability.unit,
        pricePerUnit: listing.pricing[0]?.pricePerUnit || 0,
        status: listing.status,
        profitAnalytics: {
          totalRevenue: Math.round((listing.profitAnalytics?.totalRevenue || 0) * 100) / 100,
          grossProfit: Math.round((listing.profitAnalytics?.grossProfit || 0) * 100) / 100,
          profitMargin: Math.round((listing.profitAnalytics?.profitMargin || 0) * 100) / 100
        },
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
 * @desc    Get comprehensive financial summary with COGS, inventory valuation, and true P&L
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

    const [
      orderStats,
      paymentStatusBreakdown,
      cogsData,
      inventoryValuation,
      operationalCosts,
      profitAnalytics,
      cashFlowData
    ] = await Promise.all([
      // Order and revenue statistics
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
      ]),

      // Cost of Goods Sold (COGS) from inventory consumption
      VendorInventory.aggregate([
        { 
          $match: { 
            vendorId,
            'stockConsumption.date': { $gte: start, $lte: end }
          } 
        },
        {
          $unwind: '$stockConsumption'
        },
        {
          $match: {
            'stockConsumption.date': { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalCOGS: { $sum: '$stockConsumption.costOfGoods' },
            totalQuantitySold: { $sum: '$stockConsumption.quantity' },
            totalTransactions: { $sum: 1 }
          }
        }
      ]),

      // Current inventory valuation
      VendorInventory.aggregate([
        { $match: { vendorId, status: { $in: ['active', 'low_stock', 'overstocked'] } } },
        {
          $group: {
            _id: null,
            currentInventoryValue: { 
              $sum: { $multiply: ['$availableQuantity', '$averagePurchasePrice'] } 
            },
            totalItems: { $sum: 1 },
            totalQuantity: { $sum: '$availableQuantity' },
            averageCostPerUnit: { $avg: '$averagePurchasePrice' }
          }
        }
      ]),

      // Operational costs from inventory purchases in period
      VendorInventory.aggregate([
        { 
          $match: { 
            vendorId,
            'purchaseHistory.purchaseDate': { $gte: start, $lte: end }
          } 
        },
        {
          $unwind: '$purchaseHistory'
        },
        {
          $match: {
            'purchaseHistory.purchaseDate': { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalPurchases: { $sum: '$purchaseHistory.totalCost' },
            transportationCosts: { $sum: '$purchaseHistory.transportationCost' },
            storageCosts: { $sum: '$purchaseHistory.storageCost' },
            otherCosts: { $sum: '$purchaseHistory.otherCosts' },
            purchaseVolume: { $sum: '$purchaseHistory.purchasedQuantity' }
          }
        }
      ]),

      // Profit analytics from listings
      Listing.aggregate([
        { 
          $match: { 
            vendorId,
            'profitAnalytics.totalRevenue': { $gt: 0 }
          } 
        },
        {
          $addFields: {
            periodProfitData: {
              $filter: {
                input: '$profitAnalytics.salesHistory',
                cond: {
                  $and: [
                    { $gte: ['$$this.date', start] },
                    { $lte: ['$$this.date', end] }
                  ]
                }
              }
            }
          }
        },
        {
          $addFields: {
            periodRevenue: { $sum: '$periodProfitData.revenue' },
            periodCost: { $sum: '$periodProfitData.totalCost' },
            periodProfit: { $subtract: [{ $sum: '$periodProfitData.revenue' }, { $sum: '$periodProfitData.totalCost' }] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$periodRevenue' },
            totalCost: { $sum: '$periodCost' },
            grossProfit: { $sum: '$periodProfit' },
            profitableProducts: { 
              $sum: { $cond: [{ $gt: ['$periodProfit', 0] }, 1, 0] } 
            },
            avgProfitMargin: { 
              $avg: { 
                $cond: [
                  { $gt: ['$periodRevenue', 0] },
                  { $multiply: [{ $divide: ['$periodProfit', '$periodRevenue'] }, 100] },
                  0
                ]
              }
            }
          }
        }
      ]),

      // Cash flow analysis (delivered orders vs purchases)
      Promise.all([
        Order.aggregate([
          {
            $match: {
              vendorId: vendorId,
              status: 'delivered',
              paymentStatus: 'paid',
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              dailyInflow: { $sum: '$totalAmount' }
            }
          }
        ]),
        VendorInventory.aggregate([
          { 
            $match: { 
              vendorId,
              'purchaseHistory.purchaseDate': { $gte: start, $lte: end }
            } 
          },
          {
            $unwind: '$purchaseHistory'
          },
          {
            $match: {
              'purchaseHistory.purchaseDate': { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseHistory.purchaseDate' } },
              dailyOutflow: { $sum: '$purchaseHistory.totalCost' }
            }
          }
        ])
      ])
    ]);

    // Process results with null checks
    const orderMetrics = orderStats[0] || {
      grossRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      deliveredRevenue: 0,
      deliveredOrders: 0
    };

    const cogs = cogsData[0] || {
      totalCOGS: 0,
      totalQuantitySold: 0,
      totalTransactions: 0
    };

    const inventory = inventoryValuation[0] || {
      currentInventoryValue: 0,
      totalItems: 0,
      totalQuantity: 0,
      averageCostPerUnit: 0
    };

    const opCosts = operationalCosts[0] || {
      totalPurchases: 0,
      transportationCosts: 0,
      storageCosts: 0,
      otherCosts: 0,
      purchaseVolume: 0
    };

    const profitData = profitAnalytics[0] || {
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      profitableProducts: 0,
      avgProfitMargin: 0
    };

    const [cashInflows, cashOutflows] = cashFlowData;

    // Financial calculations
    const platformCommissionRate = 0.05;
    const estimatedCommission = orderMetrics.deliveredRevenue * platformCommissionRate;
    const netRevenue = orderMetrics.deliveredRevenue - estimatedCommission;
    
    // True P&L calculation
    const grossProfit = profitData.grossProfit || (orderMetrics.deliveredRevenue - cogs.totalCOGS);
    const operatingExpenses = opCosts.transportationCosts + opCosts.storageCosts + opCosts.otherCosts;
    const netProfit = grossProfit - operatingExpenses - estimatedCommission;
    
    // Margin calculations
    const grossMargin = orderMetrics.deliveredRevenue ? (grossProfit / orderMetrics.deliveredRevenue * 100) : 0;
    const netMargin = orderMetrics.deliveredRevenue ? (netProfit / orderMetrics.deliveredRevenue * 100) : 0;
    
    // Inventory metrics
    const inventoryTurnover = inventory.currentInventoryValue ? (cogs.totalCOGS / inventory.currentInventoryValue) : 0;
    const daysInPeriod = (end - start) / (1000 * 60 * 60 * 24);
    const daysSalesInInventory = inventoryTurnover ? (daysInPeriod / inventoryTurnover) : 0;

    // Build comprehensive financial summary
    const financialSummary = {
      period: { 
        start, 
        end, 
        label: period,
        daysInPeriod: Math.round(daysInPeriod)
      },
      
      // Revenue breakdown
      revenue: {
        gross: Math.round(orderMetrics.grossRevenue * 100) / 100,
        delivered: Math.round(orderMetrics.deliveredRevenue * 100) / 100,
        net: Math.round(netRevenue * 100) / 100,
        pendingPayment: Math.round((orderMetrics.grossRevenue - orderMetrics.deliveredRevenue) * 100) / 100
      },

      // True P&L Statement
      profitAndLoss: {
        revenue: Math.round(orderMetrics.deliveredRevenue * 100) / 100,
        costOfGoodsSold: Math.round(cogs.totalCOGS * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMargin: Math.round(grossMargin * 100) / 100,
        
        operatingExpenses: {
          transportation: Math.round(opCosts.transportationCosts * 100) / 100,
          storage: Math.round(opCosts.storageCosts * 100) / 100,
          other: Math.round(opCosts.otherCosts * 100) / 100,
          total: Math.round(operatingExpenses * 100) / 100
        },
        
        platformFees: Math.round(estimatedCommission * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        netMargin: Math.round(netMargin * 100) / 100
      },

      // Inventory valuation and metrics
      inventory: {
        currentValue: Math.round(inventory.currentInventoryValue * 100) / 100,
        totalItems: inventory.totalItems,
        totalQuantity: inventory.totalQuantity,
        averageCostPerUnit: Math.round(inventory.averageCostPerUnit * 100) / 100,
        turnoverRate: Math.round(inventoryTurnover * 100) / 100,
        daysSalesInInventory: Math.round(daysSalesInInventory),
        purchaseVolume: opCosts.purchaseVolume,
        totalPurchaseValue: Math.round(opCosts.totalPurchases * 100) / 100
      },

      // Operational metrics
      operations: {
        totalOrders: orderMetrics.totalOrders,
        deliveredOrders: orderMetrics.deliveredOrders,
        fulfillmentRate: orderMetrics.totalOrders ? 
          Math.round((orderMetrics.deliveredOrders / orderMetrics.totalOrders) * 100) : 0,
        averageOrderValue: Math.round(orderMetrics.averageOrderValue * 100) / 100,
        quantitySold: cogs.totalQuantitySold,
        averageCostPerSale: cogs.totalQuantitySold ? 
          Math.round((cogs.totalCOGS / cogs.totalQuantitySold) * 100) / 100 : 0
      },

      // Financial health indicators
      financialHealth: {
        profitabilityScore: Math.max(0, Math.min(100, netMargin + 50)), // 0-100 scale
        inventoryHealth: inventoryTurnover > 0 ? Math.min(100, inventoryTurnover * 50) : 0,
        cashFlowHealth: netProfit > 0 ? 'Positive' : netProfit < 0 ? 'Negative' : 'Break-even',
        returnOnInventory: inventory.currentInventoryValue ? 
          Math.round((netProfit / inventory.currentInventoryValue * 100) * 100) / 100 : 0,
        profitableProductsRatio: profitData.profitableProducts && orderMetrics.totalOrders ? 
          Math.round((profitData.profitableProducts / orderMetrics.totalOrders) * 100) : 0
      },

      // Payment breakdown
      paymentBreakdown: paymentStatusBreakdown.reduce((acc, payment) => {
        acc[payment._id || 'pending'] = {
          count: payment.count,
          amount: Math.round(payment.amount * 100) / 100
        };
        return acc;
      }, {}),

      // Cash flow summary
      cashFlow: {
        inflows: cashInflows.map(flow => ({
          date: flow._id,
          amount: Math.round(flow.dailyInflow * 100) / 100
        })),
        outflows: cashOutflows.map(flow => ({
          date: flow._id,
          amount: Math.round(flow.dailyOutflow * 100) / 100
        })),
        netCashFlow: Math.round(netProfit * 100) / 100
      }
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
 * @desc    Get unified vendor notifications and inventory alerts
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
    const vendorId = req.user.vendorId;
    const { type, unreadOnly, page = 1, limit = 20 } = req.query;

    const NotificationService = require('../services/notificationService');
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    // Build inventory alerts query
    let inventoryQuery = { vendorId };
    if (unreadOnly === 'true') {
      inventoryQuery['alerts.isRead'] = false;
    }
    if (type && type === 'inventory') {
      // Only inventory alerts
    } else if (type && type !== 'all' && type !== 'inventory') {
      options.type = type;
    }

    const [notificationsData, stats, inventoryAlerts] = await Promise.all([
      // Regular notifications (excluding inventory type if specifically filtering)
      type === 'inventory' ? 
        { notifications: [], pagination: { total: 0, pages: 0, page: 1, limit } } :
        NotificationService.getUserNotifications(userId, options),
      
      // Regular notification stats
      type === 'inventory' ? 
        { total: 0, unread: 0, urgent: 0, actionRequired: 0 } :
        NotificationService.getUserNotificationStats(userId),
      
      // Inventory alerts from VendorInventory
      type && type !== 'inventory' && type !== 'all' ? 
        [] : // Skip inventory alerts if filtering for non-inventory types
        VendorInventory.aggregate([
          { $match: inventoryQuery },
          { $unwind: '$alerts' },
          { $match: unreadOnly === 'true' ? { 'alerts.isRead': false } : {} },
          { $sort: { 'alerts.createdAt': -1 } },
          {
            $project: {
              _id: '$alerts._id',
              type: 'inventory',
              title: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$alerts.type', 'low_stock'] }, then: 'Low Stock Alert' },
                    { case: { $eq: ['$alerts.type', 'out_of_stock'] }, then: 'Out of Stock Alert' },
                    { case: { $eq: ['$alerts.type', 'expiry_warning'] }, then: 'Product Expiry Warning' },
                    { case: { $eq: ['$alerts.type', 'quality_decline'] }, then: 'Quality Decline Alert' },
                    { case: { $eq: ['$alerts.type', 'overstock'] }, then: 'Overstock Alert' }
                  ],
                  default: 'Inventory Alert'
                }
              },
              message: '$alerts.message',
              priority: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$alerts.severity', 'critical'] }, then: 'urgent' },
                    { case: { $eq: ['$alerts.severity', 'high'] }, then: 'high' },
                    { case: { $eq: ['$alerts.severity', 'medium'] }, then: 'normal' },
                    { case: { $eq: ['$alerts.severity', 'low'] }, then: 'low' }
                  ],
                  default: 'normal'
                }
              },
              isRead: '$alerts.isRead',
              isActionRequired: {
                $in: ['$alerts.type', ['low_stock', 'out_of_stock', 'expiry_warning']]
              },
              actionUrl: {
                $concat: ['/vendor/inventory/', { $toString: '$_id' }]
              },
              actionText: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$alerts.type', 'low_stock'] }, then: 'Restock Now' },
                    { case: { $eq: ['$alerts.type', 'out_of_stock'] }, then: 'Add Stock' },
                    { case: { $eq: ['$alerts.type', 'expiry_warning'] }, then: 'Check Expiry' },
                    { case: { $eq: ['$alerts.type', 'quality_decline'] }, then: 'Review Quality' },
                    { case: { $eq: ['$alerts.type', 'overstock'] }, then: 'Review Stock Levels' }
                  ],
                  default: 'View Details'
                }
              },
              relatedEntity: {
                type: 'inventory',
                id: '$_id'
              },
              metadata: {
                productName: '$productId',
                currentStock: '$availableQuantity',
                reorderLevel: '$reorderLevel',
                alertType: '$alerts.type',
                severity: '$alerts.severity'
              },
              createdAt: '$alerts.createdAt',
              readAt: '$alerts.readAt',
              age: {
                $divide: [
                  { $subtract: [new Date(), '$alerts.createdAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              }
            }
          },
          ...(page && limit ? [
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
          ] : [])
        ])
    ]);

    // Combine and sort all notifications
    let allNotifications = [
      ...notificationsData.notifications.map(notification => ({
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
        readAt: notification.readAt,
        source: 'notification'
      })),
      ...inventoryAlerts.map(alert => ({
        id: alert._id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        isRead: alert.isRead,
        isActionRequired: alert.isActionRequired,
        actionUrl: alert.actionUrl,
        actionText: alert.actionText,
        relatedEntity: alert.relatedEntity,
        metadata: alert.metadata,
        age: Math.round(alert.age * 100) / 100,
        createdAt: alert.createdAt,
        readAt: alert.readAt,
        source: 'inventory'
      }))
    ];

    // Sort by priority and recency
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    allNotifications.sort((a, b) => {
      // First by read status (unread first)
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      // Then by priority
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      // Finally by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Calculate pagination for combined results
    const totalNotifications = notificationsData.pagination.total + inventoryAlerts.length;
    const totalPages = Math.ceil(totalNotifications / parseInt(limit));

    // Apply pagination to combined results if not already applied
    if (!type || type === 'all') {
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      allNotifications = allNotifications.slice(startIndex, startIndex + parseInt(limit));
    }

    // Get inventory alert stats
    const inventoryStats = await VendorInventory.aggregate([
      { $match: { vendorId } },
      { $unwind: '$alerts' },
      {
        $group: {
          _id: null,
          totalInventoryAlerts: { $sum: 1 },
          unreadInventoryAlerts: { $sum: { $cond: [{ $eq: ['$alerts.isRead', false] }, 1, 0] } },
          urgentInventoryAlerts: { 
            $sum: { 
              $cond: [
                { $in: ['$alerts.severity', ['critical', 'high']] }, 
                1, 
                0
              ] 
            } 
          },
          actionRequiredAlerts: {
            $sum: {
              $cond: [
                { $in: ['$alerts.type', ['low_stock', 'out_of_stock', 'expiry_warning']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const inventoryStatsData = inventoryStats[0] || {
      totalInventoryAlerts: 0,
      unreadInventoryAlerts: 0,
      urgentInventoryAlerts: 0,
      actionRequiredAlerts: 0
    };

    const response = {
      notifications: allNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalNotifications,
        pages: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      summary: {
        total: stats.total + inventoryStatsData.totalInventoryAlerts,
        unread: stats.unread + inventoryStatsData.unreadInventoryAlerts,
        urgent: stats.urgent + inventoryStatsData.urgentInventoryAlerts,
        actionRequired: stats.actionRequired + inventoryStatsData.actionRequiredAlerts,
        byType: {
          system: stats.total,
          inventory: inventoryStatsData.totalInventoryAlerts,
          order: 0, // This could be calculated from system notifications if needed
          payment: 0 // This could be calculated from system notifications if needed
        }
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