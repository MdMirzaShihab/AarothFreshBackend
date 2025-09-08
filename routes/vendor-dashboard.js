/**
 * @fileoverview Vendor Dashboard Routes
 * @description Complete vendor management interface including analytics, listings, and operations
 * @version 2.0
 * @features 
 *   - Dashboard analytics and metrics
 *   - Order management and tracking
 *   - Product performance analysis
 *   - Inventory status and alerts
 *   - Complete listing CRUD operations
 * @since 2024
 */

const express = require('express');
const {
  getDashboardOverview,
  getRevenueAnalytics,
  getOrderAnalytics,
  getProductPerformance,
  getCustomerInsights,
  getInventoryStatus,
  getOrderManagement,
  getTopProducts,
  getSalesReports,
  getSeasonalTrends,
  getFinancialSummary,
  getNotifications
} = require('../controllers/vendorDashboardController');

// Import listing controllers for vendor-specific operations
const {
  createListing,
  getVendorListings,
  updateListing,
  deleteListing,
  getListing,
} = require("../controllers/listingsController");

const { protect, authorize } = require('../middleware/auth');
const { requireVendorApproval } = require('../middleware/approval');
const { uploadListingImages } = require('../middleware/upload');
const { query, body } = require('express-validator');

const router = express.Router();

// Comprehensive validation rules for vendor listing operations
const listingValidation = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  body("title")
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
  body("description")
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),
  
  // Listing type validation
  body("listingType")
    .optional()
    .isIn(["inventory_based", "non_inventory"])
    .withMessage("Listing type must be either 'inventory_based' or 'non_inventory'"),
  body("inventoryId")
    .optional()
    .isMongoId()
    .withMessage("Inventory ID must be a valid MongoDB ObjectId"),
  
  // Pricing validation
  body("pricing")
    .isArray({ min: 1 })
    .withMessage("At least one pricing option is required"),
  body("pricing.*.pricePerUnit")
    .isFloat({ min: 0.01 })
    .withMessage("Price per unit must be a positive number"),
  body("pricing.*.unit")
    .not()
    .isEmpty()
    .withMessage("Unit is required for pricing"),
  body("pricing.*.minQuantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Minimum quantity must be a positive integer"),

  // Availability validation
  body("availability.quantityAvailable")
    .isInt({ min: 0 })
    .withMessage("Quantity available must be a non-negative integer"),
  body("availability.unit")
    .not()
    .isEmpty()
    .withMessage("Availability unit is required"),
  
  // Quality and harvest info
  body("qualityGrade")
    .optional()
    .isIn(["Premium", "Grade A", "Grade B", "Standard"])
    .withMessage("Invalid quality grade"),
  body("harvestDate")
    .optional()
    .isISO8601()
    .withMessage("Harvest date must be a valid date"),
];

// Update listing validation (similar but all optional)
const updateListingValidation = [
  body("pricing.*.pricePerUnit")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Price per unit must be a positive number"),
  body("pricing.*.unit")
    .optional()
    .not()
    .isEmpty()
    .withMessage("Unit is required for pricing"),
  body("availability.quantityAvailable")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantity available must be a non-negative integer"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "out_of_stock"])
    .withMessage("Invalid status"),
  body("title")
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),
  body("description")
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),
];

// Apply authentication and vendor authorization to all routes
router.use(protect);
router.use(authorize('vendor'));

// Date range validation middleware
const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'quarter', 'year'])
    .withMessage('Period must be one of: today, week, month, quarter, year')
];

/**
 * @route   GET /api/v1/vendor-dashboard/overview
 * @desc    Get vendor dashboard overview with key metrics
 * @access  Private (Vendor only)
 */
router.get('/overview', dateRangeValidation, getDashboardOverview);

/**
 * @route   GET /api/v1/vendor-dashboard/revenue
 * @desc    Get revenue analytics and trends
 * @access  Private (Vendor only)
 */
router.get('/revenue', dateRangeValidation, getRevenueAnalytics);

/**
 * @route   GET /api/v1/vendor-dashboard/orders
 * @desc    Get order analytics (volume, status distribution, trends)
 * @access  Private (Vendor only)
 */
router.get('/orders', dateRangeValidation, getOrderAnalytics);

/**
 * @route   GET /api/v1/vendor-dashboard/products
 * @desc    Get product performance analytics
 * @access  Private (Vendor only)
 */
router.get('/products', 
  [
    ...dateRangeValidation,
    query('sort')
      .optional()
      .isIn(['revenue', 'quantity', 'orders', 'rating'])
      .withMessage('Sort must be one of: revenue, quantity, orders, rating'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ], 
  getProductPerformance
);

/**
 * @route   GET /api/v1/vendor-dashboard/customers
 * @desc    Get customer insights and analytics
 * @access  Private (Vendor only)
 */
router.get('/customers', dateRangeValidation, getCustomerInsights);

/**
 * @route   GET /api/v1/vendor-dashboard/inventory
 * @desc    Get inventory status and alerts
 * @access  Private (Vendor only)
 */
router.get('/inventory', getInventoryStatus);

/**
 * @route   GET /api/v1/vendor-dashboard/order-management
 * @desc    Get orders for management (pending, processing, etc.)
 * @access  Private (Vendor only)
 */
router.get('/order-management',
  [
    query('status')
      .optional()
      .isIn(['all', 'pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  getOrderManagement
);

/**
 * @route   GET /api/v1/vendor-dashboard/top-products
 * @desc    Get top performing products
 * @access  Private (Vendor only)
 */
router.get('/top-products',
  [
    ...dateRangeValidation,
    query('metric')
      .optional()
      .isIn(['revenue', 'quantity', 'orders'])
      .withMessage('Metric must be one of: revenue, quantity, orders'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ],
  getTopProducts
);

/**
 * @route   GET /api/v1/vendor-dashboard/sales-reports
 * @desc    Get detailed sales reports
 * @access  Private (Vendor only)
 */
router.get('/sales-reports', dateRangeValidation, getSalesReports);

/**
 * @route   GET /api/v1/vendor-dashboard/seasonal-trends
 * @desc    Get seasonal sales trends and patterns
 * @access  Private (Vendor only)
 */
router.get('/seasonal-trends',
  [
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Year must be between 2020 and 2030')
  ],
  getSeasonalTrends
);

/**
 * @route   GET /api/v1/vendor-dashboard/financial-summary
 * @desc    Get financial summary and payment tracking
 * @access  Private (Vendor only)
 */
router.get('/financial-summary', dateRangeValidation, getFinancialSummary);

/**
 * @route   GET /api/v1/vendor-dashboard/notifications
 * @desc    Get vendor notifications and alerts
 * @access  Private (Vendor only)
 */
router.get('/notifications',
  [
    query('type')
      .optional()
      .isIn(['order', 'inventory', 'payment', 'system'])
      .withMessage('Notification type must be one of: order, inventory, payment, system'),
    query('unreadOnly')
      .optional()
      .isBoolean()
      .withMessage('UnreadOnly must be a boolean')
  ],
  getNotifications
);

// ================================
// VENDOR LISTING MANAGEMENT ROUTES
// ================================

/**
 * @route   GET /api/v1/vendor-dashboard/listings
 * @desc    Get vendor's own listings with pagination and filtering
 * @access  Private (Vendor only)
 */
router.get('/listings',
  [
    query('status')
      .optional()
      .isIn(['all', 'active', 'inactive', 'out_of_stock'])
      .withMessage('Status must be one of: all, active, inactive, out_of_stock'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('search')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Search term must be between 2 and 50 characters')
  ],
  getVendorListings
);

/**
 * @route   POST /api/v1/vendor-dashboard/listings
 * @desc    Create a new listing
 * @access  Private (Vendor only)
 */
router.post('/listings',
  requireVendorApproval("create listings"),
  ...uploadListingImages("images", 5),
  listingValidation,
  createListing
);

/**
 * @route   GET /api/v1/vendor-dashboard/listings/:id
 * @desc    Get single listing details
 * @access  Private (Vendor only - own listings)
 */
router.get('/listings/:id', getListing);

/**
 * @route   PUT /api/v1/vendor-dashboard/listings/:id
 * @desc    Update a listing
 * @access  Private (Vendor only - own listings)
 */
router.put('/listings/:id',
  requireVendorApproval("update listings"),
  ...uploadListingImages("images", 5),
  updateListingValidation,
  updateListing
);

/**
 * @route   DELETE /api/v1/vendor-dashboard/listings/:id
 * @desc    Delete a listing
 * @access  Private (Vendor only - own listings)
 */
router.delete('/listings/:id',
  requireVendorApproval("delete listings"),
  deleteListing
);

// ================================
// ENHANCED ANALYTICS ENDPOINTS
// ================================

/**
 * @route   GET /api/v1/vendor-dashboard/listings/analytics
 * @desc    Get detailed listing performance analytics
 * @access  Private (Vendor only)
 */
router.get('/listings/analytics',
  [
    query('listingType')
      .optional()
      .isIn(['inventory_based', 'non_inventory', 'all'])
      .withMessage('Listing type must be one of: inventory_based, non_inventory, all'),
    query('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .withMessage('Period must be one of: daily, weekly, monthly, quarterly, yearly'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ],
  async (req, res, next) => {
    try {
      const ListingAnalytics = require('../models/ListingAnalytics');
      const vendorId = req.user.vendorId;
      
      const analytics = await ListingAnalytics.getVendorAnalytics(vendorId, req.query);
      
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/vendor-dashboard/listings/sales-history
 * @desc    Get sales history by listing type
 * @access  Private (Vendor only)
 */
router.get('/listings/sales-history',
  [
    query('listingId')
      .optional()
      .isMongoId()
      .withMessage('Listing ID must be a valid MongoDB ObjectId'),
    query('listingType')
      .optional()
      .isIn(['inventory_based', 'non_inventory'])
      .withMessage('Listing type must be either inventory_based or non_inventory'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  async (req, res, next) => {
    try {
      const ListingAnalytics = require('../models/ListingAnalytics');
      const { listingId, listingType, limit = 20 } = req.query;
      const vendorId = req.user.vendorId;
      
      let query = { vendorId };
      if (listingId) query.listingId = listingId;
      if (listingType) query.listingType = listingType;
      
      const salesHistory = await ListingAnalytics.find(query)
        .populate('listingId', 'title status')
        .populate('productId', 'name category')
        .sort({ lastOrderDate: -1 })
        .limit(parseInt(limit));
      
      res.status(200).json({
        success: true,
        data: salesHistory
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/vendor-dashboard/listings/revenue-breakdown
 * @desc    Get revenue breakdown by inventory vs non-inventory listings
 * @access  Private (Vendor only)
 */
router.get('/listings/revenue-breakdown',
  dateRangeValidation,
  async (req, res, next) => {
    try {
      const ListingAnalytics = require('../models/ListingAnalytics');
      const mongoose = require('mongoose');
      const vendorId = req.user.vendorId;
      
      const breakdown = await ListingAnalytics.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
        {
          $group: {
            _id: '$listingType',
            totalListings: { $sum: 1 },
            totalRevenue: { $sum: '$salesData.totalRevenue' },
            totalOrders: { $sum: '$salesData.totalOrders' },
            totalQuantitySold: { $sum: '$salesData.totalQuantitySold' },
            averageOrderValue: { $avg: '$salesData.averageSalePrice' },
            totalProfit: { $sum: '$profitability.grossProfit' },
            averageProfitMargin: { $avg: '$profitability.profitMargin' }
          }
        },
        {
          $project: {
            listingType: '$_id',
            totalListings: 1,
            totalRevenue: { $round: ['$totalRevenue', 2] },
            totalOrders: 1,
            totalQuantitySold: { $round: ['$totalQuantitySold', 2] },
            averageOrderValue: { $round: ['$averageOrderValue', 2] },
            totalProfit: { $round: ['$totalProfit', 2] },
            averageProfitMargin: { $round: ['$averageProfitMargin', 2] }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          breakdown,
          summary: {
            totalRevenue: breakdown.reduce((sum, item) => sum + item.totalRevenue, 0),
            totalOrders: breakdown.reduce((sum, item) => sum + item.totalOrders, 0),
            totalListings: breakdown.reduce((sum, item) => sum + item.totalListings, 0),
            inventoryBasedPercentage: breakdown.find(b => b.listingType === 'inventory_based')?.totalRevenue || 0,
            nonInventoryPercentage: breakdown.find(b => b.listingType === 'non_inventory')?.totalRevenue || 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;