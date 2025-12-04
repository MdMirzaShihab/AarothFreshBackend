/**
 * @fileoverview Vendor Dashboard Routes
 * @description Complete vendor management interface including analytics, listings, and operations
 * @version 2.1
 * @features
 *   - Dashboard analytics and metrics
 *   - Order management and tracking
 *   - Product performance analysis
 *   - Complete listing CRUD operations
 * @note Inventory management moved to /api/v1/inventory (use ?summary=true for dashboard widgets)
 * @since 2024
 */

const express = require('express');
const {
  getDashboardOverview,
  getRevenueAnalytics,
  getOrderAnalytics,
  getProductPerformance,
  getCustomerInsights,
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
const { uploadListingImages, uploadListingMediaFiles } = require('../middleware/upload');
const { query, body } = require('express-validator');

const router = express.Router();

// Comprehensive validation rules for vendor listing operations
const listingValidation = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  body("marketId")
    .notEmpty()
    .withMessage("Market ID is required")
    .isMongoId()
    .withMessage("Valid market ID is required")
    .custom(async (marketId, { req }) => {
      const Market = require('../models/Market');
      const Vendor = require('../models/Vendor');

      // Check market exists and is available
      const market = await Market.findOne({
        _id: marketId,
        isDeleted: { $ne: true },
        isAvailable: true,
        isActive: true
      });

      if (!market) {
        throw new Error('Selected market does not exist or is not available');
      }

      // Check vendor operates in this market
      const vendor = await Vendor.findById(req.user.vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const hasMarket = vendor.markets.some(
        m => m.toString() === marketId.toString()
      );

      if (!hasMarket) {
        throw new Error('You cannot create listings in this market. Your vendor account does not operate in the selected market.');
      }

      return true;
    }),
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
  body("pricing.*.pricePerBaseUnit")
    .isFloat({ min: 0.01 })
    .withMessage("Price per base unit must be a positive number"),
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
    .notEmpty()
    .withMessage("Quality grade is required")
    .isIn(["Premium", "Grade A", "Grade B", "Standard"])
    .withMessage("Quality grade must be one of: Premium, Grade A, Grade B, Standard"),
  body("harvestDate")
    .optional()
    .isISO8601()
    .withMessage("Harvest date must be a valid date"),

  // Discount validation
  body("discount.type")
    .optional()
    .isIn(['percentage', 'fixed'])
    .withMessage("Discount type must be either 'percentage' or 'fixed'"),
  body("discount.value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount value must be a non-negative number"),
  body("discount")
    .optional()
    .custom((discount) => {
      if (discount && Object.keys(discount).length > 0) {
        if (!discount.type || !discount.value) {
          throw new Error('Both discount type and value are required when providing a discount');
        }
        if (discount.type === 'percentage' && (discount.value < 0 || discount.value > 100)) {
          throw new Error('Percentage discount must be between 0 and 100');
        }
      }
      return true;
    }),
  body("discount.validUntil")
    .optional()
    .isISO8601()
    .withMessage("Discount valid until date must be a valid date"),
  body("discount.minimumQuantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Discount minimum quantity must be a positive integer"),

  // Image replacement control
  body("replaceImages")
    .optional()
    .isBoolean()
    .withMessage("Replace images flag must be boolean"),

  // Video replacement control
  body("replaceVideos")
    .optional()
    .isBoolean()
    .withMessage("Replace videos flag must be boolean"),

  // Order quantity limits (REQUIRED when pack-based selling is disabled)
  body("minimumOrderQuantity")
    .custom((value, { req }) => {
      const pricing = req.body.pricing && req.body.pricing[0];
      const isPackBased = pricing && pricing.enablePackSelling === true;

      // Required when NOT using pack-based selling
      if (!isPackBased) {
        if (value === null || value === undefined || value === '') {
          throw new Error('Minimum order quantity is required when not using pack-based selling');
        }
      }
      return true;
    })
    .isFloat({ min: 0 })
    .withMessage("Minimum order quantity must be a non-negative number")
    .custom((value, { req }) => {
      if (value && req.body.availability?.quantityAvailable) {
        if (value > req.body.availability.quantityAvailable) {
          throw new Error('Minimum order quantity cannot exceed available quantity');
        }
      }
      return true;
    }),
  body("maximumOrderQuantity")
    .custom((value, { req }) => {
      const pricing = req.body.pricing && req.body.pricing[0];
      const isPackBased = pricing && pricing.enablePackSelling === true;

      // Required when NOT using pack-based selling
      if (!isPackBased) {
        if (value === null || value === undefined || value === '') {
          throw new Error('Maximum order quantity is required when not using pack-based selling');
        }
      }
      return true;
    })
    .isFloat({ min: 0 })
    .withMessage("Maximum order quantity must be a non-negative number")
    .custom((value, { req }) => {
      const minQty = req.body.minimumOrderQuantity || 0;

      if (value && value < minQty) {
        throw new Error('Maximum order quantity must be greater than or equal to minimum');
      }

      if (value && req.body.availability?.quantityAvailable) {
        if (value > req.body.availability.quantityAvailable) {
          throw new Error('Maximum order quantity cannot exceed available quantity');
        }
      }

      return true;
    }),
];

// Update listing validation (similar but all optional)
const updateListingValidation = [
  body("marketId")
    .optional()
    .isMongoId()
    .withMessage("Valid market ID is required")
    .custom(async (marketId, { req }) => {
      const Market = require('../models/Market');
      const Vendor = require('../models/Vendor');

      // Check market exists and is available
      const market = await Market.findOne({
        _id: marketId,
        isDeleted: { $ne: true },
        isAvailable: true,
        isActive: true
      });

      if (!market) {
        throw new Error('Selected market does not exist or is not available');
      }

      // Check vendor operates in this market
      const vendor = await Vendor.findById(req.user.vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const hasMarket = vendor.markets.some(
        m => m.toString() === marketId.toString()
      );

      if (!hasMarket) {
        throw new Error('Cannot move listing to this market. Your vendor account does not operate in the selected market.');
      }

      return true;
    }),
  body("pricing.*.pricePerBaseUnit")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Price per base unit must be a positive number"),
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

  // Order quantity limits (REQUIRED when pack-based selling is disabled)
  body("minimumOrderQuantity")
    .custom((value, { req }) => {
      const pricing = req.body.pricing && req.body.pricing[0];
      const isPackBased = pricing && pricing.enablePackSelling === true;

      // Required when NOT using pack-based selling
      if (!isPackBased && pricing) {
        if (value === null || value === undefined || value === '') {
          throw new Error('Minimum order quantity is required when not using pack-based selling');
        }
      }
      return true;
    })
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order quantity must be a non-negative number"),
  body("maximumOrderQuantity")
    .custom((value, { req }) => {
      const pricing = req.body.pricing && req.body.pricing[0];
      const isPackBased = pricing && pricing.enablePackSelling === true;

      // Required when NOT using pack-based selling
      if (!isPackBased && pricing) {
        if (value === null || value === undefined || value === '') {
          throw new Error('Maximum order quantity is required when not using pack-based selling');
        }
      }
      return true;
    })
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum order quantity must be a non-negative number")
    .custom((value, { req }) => {
      if (value && req.body.minimumOrderQuantity) {
        if (value < req.body.minimumOrderQuantity) {
          throw new Error('Maximum must be >= minimum order quantity');
        }
      }
      return true;
    }),
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
 * @note    Inventory endpoint removed - use /api/v1/inventory directly
 *          For dashboard widgets: GET /inventory?summary=true
 *          For full inventory management: GET /inventory
 */

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
    query('marketId')
      .optional()
      .custom((value) => {
        if (value === 'all') return true;
        const mongoose = require('mongoose');
        return mongoose.Types.ObjectId.isValid(value);
      })
      .withMessage('Market ID must be "all" or a valid MongoDB ObjectId'),
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
 * @desc    Create a new listing (supports both images and videos)
 * @access  Private (Vendor only)
 */
router.post('/listings',
  requireVendorApproval("create listings"),
  ...uploadListingMediaFiles(),
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
 * @desc    Update a listing (supports both images and videos)
 * @access  Private (Vendor only - own listings)
 */
router.put('/listings/:id',
  requireVendorApproval("update listings"),
  ...uploadListingMediaFiles(),
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