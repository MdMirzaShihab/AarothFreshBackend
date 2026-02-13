const Product = require("../../models/Product");
const User = require("../../models/User");
const Order = require("../../models/Order");
const Listing = require("../../models/Listing");
const AuditLog = require("../../models/AuditLog");

// ================================
// DASHBOARD & ANALYTICS MANAGEMENT
// ================================

/**
 * @desc    Get comprehensive dashboard overview with real-time analytics
 * @route   GET /api/v1/admin/dashboard/overview
 * @access  Private/Admin
 */
exports.getDashboardOverview = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Parallel execution for better performance
    const [
      userStats,
      productStats,
      orderStats,
      recentActivity
    ] = await Promise.all([
      // User Analytics
      User.aggregate([
        {
          $facet: {
            totalVendors: [
              { $match: { role: 'vendor', isDeleted: { $ne: true } } },
              { $count: 'count' }
            ],
            totalBuyers: [
              { $match: { role: { $in: ['buyerOwner', 'buyerManager'] }, isDeleted: { $ne: true } } },
              { $group: { _id: '$buyerId' } },
              { $count: 'count' }
            ],
            pendingApprovals: [
              { $match: { approvalStatus: 'pending', isDeleted: { $ne: true } } },
              { $count: 'count' }
            ],
            activeUsers: [
              { $match: { isActive: true, isDeleted: { $ne: true } } },
              { $count: 'count' }
            ],
            newUsersToday: [
              { $match: { createdAt: { $gte: startOfDay }, isDeleted: { $ne: true } } },
              { $count: 'count' }
            ]
          }
        }
      ]),

      // Product Analytics
      Product.aggregate([
        {
          $facet: {
            totalProducts: [
              { $match: { isDeleted: { $ne: true } } },
              { $count: 'count' }
            ],
            totalCategories: [
              { $lookup: { from: 'productcategories', localField: 'category', foreignField: '_id', as: 'category' } },
              { $group: { _id: '$category._id' } },
              { $count: 'count' }
            ],
            activeListings: [
              { $lookup: { from: 'listings', localField: '_id', foreignField: 'productId', as: 'listings' } },
              { $unwind: '$listings' },
              { $match: { 'listings.status': 'active', 'listings.isDeleted': { $ne: true } } },
              { $count: 'count' }
            ],
            featuredListings: [
              { $lookup: { from: 'listings', localField: '_id', foreignField: 'productId', as: 'listings' } },
              { $unwind: '$listings' },
              { $match: { 'listings.featured': true, 'listings.isDeleted': { $ne: true } } },
              { $count: 'count' }
            ]
          }
        }
      ]),

      // Order Analytics
      Order.aggregate([
        {
          $facet: {
            todayOrders: [
              { $match: { createdAt: { $gte: startOfDay } } },
              { $count: 'count' }
            ],
            weeklyOrders: [
              { $match: { createdAt: { $gte: startOfWeek } } },
              { $count: 'count' }
            ],
            monthlyOrders: [
              { $match: { createdAt: { $gte: startOfMonth } } },
              { $count: 'count' }
            ],
            totalRevenue: [
              { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ],
            revenueToday: [
              { $match: { createdAt: { $gte: startOfDay } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]
          }
        }
      ]),

      // Recent Activity
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            type: {
              $switch: {
                branches: [
                  { case: { $in: ['$action', ['user_created', 'user_approved', 'user_rejected']] }, then: 'user_registration' },
                  { case: { $in: ['$entityType', ['Order']] }, then: 'order_placed' },
                  { case: { $in: ['$entityType', ['Listing']] }, then: 'listing_created' }
                ],
                default: 'system_activity'
              }
            },
            description: 1,
            timestamp: '$createdAt',
            userId: '$user._id',
            userName: '$user.name'
          }
        },
        { $sort: { timestamp: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Format response data
    const response = {
      users: {
        totalVendors: userStats[0]?.totalVendors?.[0]?.count || 0,
        totalBuyers: userStats[0]?.totalBuyers?.[0]?.count || 0,
        pendingApprovals: userStats[0]?.pendingApprovals?.[0]?.count || 0,
        activeUsers: userStats[0]?.activeUsers?.[0]?.count || 0,
        newUsersToday: userStats[0]?.newUsersToday?.[0]?.count || 0
      },
      products: {
        totalProducts: productStats[0]?.totalProducts?.[0]?.count || 0,
        totalCategories: productStats[0]?.totalCategories?.[0]?.count || 0,
        activeListings: productStats[0]?.activeListings?.[0]?.count || 0,
        featuredListings: productStats[0]?.featuredListings?.[0]?.count || 0
      },
      orders: {
        todayOrders: orderStats[0]?.todayOrders?.[0]?.count || 0,
        weeklyOrders: orderStats[0]?.weeklyOrders?.[0]?.count || 0,
        monthlyOrders: orderStats[0]?.monthlyOrders?.[0]?.count || 0,
        totalRevenue: orderStats[0]?.totalRevenue?.[0]?.total || 0,
        revenueToday: orderStats[0]?.revenueToday?.[0]?.total || 0
      },
      recentActivity: recentActivity || []
    };

    res.status(200).json({
      success: true,
      data: response,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};
