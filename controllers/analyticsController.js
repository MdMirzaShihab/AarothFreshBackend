const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Restaurant = require("../models/Restaurant");
const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const Listing = require("../models/Listing");
const Order = require("../models/Order");
const AuditLog = require("../models/AuditLog");
const { ErrorResponse } = require("../middleware/error");

// Simple in-memory cache implementation
const cache = new Map();
const CACHE_TTL = {
  overview: 5 * 60 * 1000,    // 5 minutes
  sales: 60 * 60 * 1000,      // 1 hour
  users: 30 * 60 * 1000,      // 30 minutes
  products: 60 * 60 * 1000,   // 1 hour
};

/**
 * Cache helper functions
 */
const getCacheKey = (prefix, params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
};

const getFromCache = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data, ttl) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  // Clean up expired entries periodically
  if (cache.size > 1000) {
    const now = Date.now();
    for (const [cacheKey, value] of cache.entries()) {
      if (now - value.timestamp >= value.ttl) {
        cache.delete(cacheKey);
      }
    }
  }
};

/**
 * @desc    Get analytics overview
 * @route   GET /api/v1/admin/analytics/overview
 * @access  Private/Admin
 */
exports.getAnalyticsOverview = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;
    const cacheKey = getCacheKey('overview', { startDate, endDate, period });
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Date range setup
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Parallel analytics queries
    const [
      userGrowth,
      orderTrends,
      revenueTrends,
      topCategories,
      platformHealth
    ] = await Promise.all([
      // User Growth Analytics
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: {
              period: {
                $dateToString: {
                  format: period === 'day' ? '%Y-%m-%d' : 
                         period === 'week' ? '%Y-%U' : '%Y-%m',
                  date: '$createdAt'
                }
              },
              role: '$role'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.period': 1 } }
      ]),

      // Order Trends
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              period: {
                $dateToString: {
                  format: period === 'day' ? '%Y-%m-%d' : 
                         period === 'week' ? '%Y-%U' : '%Y-%m',
                  date: '$createdAt'
                }
              },
              status: '$status'
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        { $sort: { '_id.period': 1 } }
      ]),

      // Revenue Trends
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: { $in: ['completed', 'delivered'] }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: period === 'day' ? '%Y-%m-%d' : 
                       period === 'week' ? '%Y-%U' : '%Y-%m',
                date: '$createdAt'
              }
            },
            revenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Top Categories by Order Volume
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'listings',
            localField: 'items.listingId',
            foreignField: '_id',
            as: 'listing'
          }
        },
        { $unwind: '$listing' },
        {
          $lookup: {
            from: 'products',
            localField: 'listing.productId',
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
            orderCount: { $sum: 1 },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.pricePerUnit'] } }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ]),

      // Platform Health Metrics
      Promise.all([
        User.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
        Vendor.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
        Restaurant.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
        Listing.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
        Order.countDocuments({ 
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      ])
    ]);

    // Format response data
    const analytics = {
      userGrowth: userGrowth.reduce((acc, item) => {
        const period = item._id.period;
        if (!acc[period]) acc[period] = {};
        acc[period][item._id.role] = item.count;
        return acc;
      }, {}),
      
      orderTrends: orderTrends.reduce((acc, item) => {
        const period = item._id.period;
        if (!acc[period]) acc[period] = {};
        acc[period][item._id.status] = {
          count: item.count,
          totalAmount: item.totalAmount
        };
        return acc;
      }, {}),
      
      revenueTrends: revenueTrends.map(item => ({
        period: item._id,
        revenue: item.revenue,
        orderCount: item.orderCount,
        avgOrderValue: item.avgOrderValue
      })),
      
      topCategories: topCategories.map(item => ({
        categoryId: item._id,
        categoryName: item.categoryName,
        orderCount: item.orderCount,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue
      })),
      
      platformHealth: {
        activeUsers: platformHealth[0],
        activeVendors: platformHealth[1],
        activeRestaurants: platformHealth[2],
        activeListings: platformHealth[3],
        ordersLast24h: platformHealth[4]
      },
      
      metadata: {
        dateRange: { start, end },
        period,
        generatedAt: new Date().toISOString()
      }
    };

    // Cache the results
    setCache(cacheKey, analytics, CACHE_TTL.overview);

    res.status(200).json({
      success: true,
      data: analytics,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get sales analytics
 * @route   GET /api/v1/admin/analytics/sales
 * @access  Private/Admin
 */
exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day', limit = 100 } = req.query;
    const cacheKey = getCacheKey('sales', { startDate, endDate, groupBy, limit });
    
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;

    const [salesByPeriod, topVendors, topProducts, salesByStatus] = await Promise.all([
      // Sales by time period
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: groupBy === 'day' ? '%Y-%m-%d' : 
                       groupBy === 'week' ? '%Y-%U' : 
                       groupBy === 'month' ? '%Y-%m' : '%Y',
                date: '$createdAt'
              }
            },
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id': 1 } },
        { $limit: parseInt(limit) }
      ]),

      // Top performing vendors
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: { $in: ['completed', 'delivered'] }
          }
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'listings',
            localField: 'items.listingId',
            foreignField: '_id',
            as: 'listing'
          }
        },
        { $unwind: '$listing' },
        {
          $lookup: {
            from: 'vendors',
            localField: 'listing.vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: '$vendor' },
        {
          $group: {
            _id: '$vendor._id',
            vendorName: { $first: '$vendor.businessName' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.pricePerUnit'] } },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: { $multiply: ['$items.quantity', '$items.pricePerUnit'] } }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ]),

      // Top selling products
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'listings',
            localField: 'items.listingId',
            foreignField: '_id',
            as: 'listing'
          }
        },
        { $unwind: '$listing' },
        {
          $lookup: {
            from: 'products',
            localField: 'listing.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product._id',
            productName: { $first: '$product.name' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.pricePerUnit'] } },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]),

      // Sales by order status
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            percentage: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalOrders = salesByStatus.reduce((sum, item) => sum + item.count, 0);
    const formattedSalesByStatus = salesByStatus.map(item => ({
      ...item,
      percentage: ((item.count / totalOrders) * 100).toFixed(2)
    }));

    const analytics = {
      salesByPeriod: salesByPeriod.map(item => ({
        period: item._id,
        totalRevenue: item.totalRevenue,
        orderCount: item.orderCount,
        avgOrderValue: item.avgOrderValue,
        completedOrders: item.completedOrders,
        conversionRate: ((item.completedOrders / item.orderCount) * 100).toFixed(2)
      })),
      topVendors,
      topProducts,
      salesByStatus: formattedSalesByStatus,
      summary: {
        totalRevenue: salesByPeriod.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalOrders: salesByPeriod.reduce((sum, item) => sum + item.orderCount, 0),
        avgOrderValue: salesByPeriod.reduce((sum, item) => sum + item.avgOrderValue, 0) / salesByPeriod.length || 0
      }
    };

    setCache(cacheKey, analytics, CACHE_TTL.sales);

    res.status(200).json({
      success: true,
      data: analytics,
      cached: false
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user analytics
 * @route   GET /api/v1/admin/analytics/users
 * @access  Private/Admin
 */
exports.getUserAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, role } = req.query;
    const cacheKey = getCacheKey('users', { startDate, endDate, role });
    
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;
    
    let matchQuery = {
      createdAt: { $gte: start, $lte: end },
      isDeleted: { $ne: true }
    };
    
    if (role) {
      matchQuery.role = role;
    }

    const [userRegistrations, userActivity, approvalStats] = await Promise.all([
      // User registration trends
      User.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              role: '$role'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),

      // User activity (based on last login)
      User.aggregate([
        {
          $match: {
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: '$role',
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [
                  {
                    $gte: ['$lastLogin', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
                  },
                  1,
                  0
                ]
              }
            },
            inactiveUsers: {
              $sum: {
                $cond: [
                  {
                    $lt: ['$lastLogin', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Approval statistics
      User.aggregate([
        {
          $match: {
            role: { $in: ['vendor', 'buyerOwner', 'buyerManager'] },
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: {
              role: '$role',
              status: '$approvalStatus'
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const analytics = {
      registrationTrends: userRegistrations.reduce((acc, item) => {
        const date = item._id.date;
        if (!acc[date]) acc[date] = {};
        acc[date][item._id.role] = item.count;
        return acc;
      }, {}),
      
      userActivity: userActivity.reduce((acc, item) => {
        acc[item._id] = {
          total: item.totalUsers,
          active: item.activeUsers,
          inactive: item.inactiveUsers,
          activityRate: ((item.activeUsers / item.totalUsers) * 100).toFixed(2)
        };
        return acc;
      }, {}),
      
      approvalStats: approvalStats.reduce((acc, item) => {
        const role = item._id.role;
        if (!acc[role]) acc[role] = {};
        acc[role][item._id.status] = item.count;
        return acc;
      }, {})
    };

    setCache(cacheKey, analytics, CACHE_TTL.users);

    res.status(200).json({
      success: true,
      data: analytics,
      cached: false
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get product analytics
 * @route   GET /api/v1/admin/analytics/products
 * @access  Private/Admin
 */
exports.getProductAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, category } = req.query;
    const cacheKey = getCacheKey('products', { startDate, endDate, category });
    
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;

    let productMatch = {
      createdAt: { $gte: start, $lte: end },
      isDeleted: { $ne: true }
    };
    
    if (category) {
      productMatch.category = category;
    }

    const [productCreation, categoryStats, listingStats, popularProducts] = await Promise.all([
      // Product creation trends
      Product.aggregate([
        { $match: productMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Category distribution
      Product.aggregate([
        {
          $match: {
            isDeleted: { $ne: true }
          }
        },
        {
          $lookup: {
            from: 'productcategories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$category',
            categoryName: { $first: '$categoryInfo.name' },
            productCount: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            }
          }
        },
        { $sort: { productCount: -1 } }
      ]),

      // Listing statistics per product
      Listing.aggregate([
        {
          $match: {
            isDeleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Most popular products (by listing count and views)
      Listing.aggregate([
        {
          $match: {
            isDeleted: { $ne: true }
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
          $group: {
            _id: '$productId',
            productName: { $first: '$product.name' },
            listingCount: { $sum: 1 },
            totalViews: { $sum: '$views' },
            totalOrders: { $sum: '$totalOrders' }
          }
        },
        { $sort: { totalViews: -1 } },
        { $limit: 10 }
      ])
    ]);

    const analytics = {
      productCreationTrends: productCreation.map(item => ({
        date: item._id,
        count: item.count
      })),
      
      categoryDistribution: categoryStats.map(item => ({
        categoryId: item._id,
        categoryName: item.categoryName,
        productCount: item.productCount,
        activeProducts: item.activeProducts,
        activeRate: ((item.activeProducts / item.productCount) * 100).toFixed(2)
      })),
      
      listingStats: listingStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      
      popularProducts: popularProducts.map(item => ({
        productId: item._id,
        productName: item.productName,
        listingCount: item.listingCount,
        totalViews: item.totalViews,
        totalOrders: item.totalOrders,
        engagementRate: item.totalViews > 0 ? ((item.totalOrders / item.totalViews) * 100).toFixed(2) : 0
      }))
    };

    setCache(cacheKey, analytics, CACHE_TTL.products);

    res.status(200).json({
      success: true,
      data: analytics,
      cached: false
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Clear analytics cache
 * @route   DELETE /api/v1/admin/analytics/cache
 * @access  Private/Admin
 */
exports.clearAnalyticsCache = async (req, res, next) => {
  try {
    const { type } = req.query;
    
    if (type) {
      // Clear specific cache type
      for (const key of cache.keys()) {
        if (key.startsWith(type)) {
          cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      cache.clear();
    }

    // Log the cache clear action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'cache_cleared',
      entityType: 'Settings',
      entityId: null,
      description: `Cleared analytics cache${type ? ` for type: ${type}` : ' (all types)'}`,
      severity: 'medium',
      impactLevel: 'minor'
    });

    res.status(200).json({
      success: true,
      message: `Analytics cache ${type ? `for ${type}` : ''} cleared successfully`
    });
  } catch (err) {
    next(err);
  }
};