const express = require('express');
const {
  getDashboardOverview,
  getSpendingAnalytics,
  getOrderAnalytics,
  getVendorInsights,
  getBudgetTracking,
  getInventoryPlanning,
  getOrderHistory,
  getFavoriteVendors,
  getCostAnalysis,
  getPurchasePatterns,
  getDeliveryTracking,
  getTeamActivity,
  getNotifications,
  getReorderSuggestions
} = require('../controllers/restaurantDashboardController');
const { protect, authorize } = require('../middleware/auth');
const { query } = require('express-validator');

const router = express.Router();

// Apply authentication and restaurant authorization to all routes
router.use(protect);
router.use(authorize('restaurantOwner', 'restaurantManager'));

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
 * @route   GET /api/v1/restaurant-dashboard/overview
 * @desc    Get restaurant dashboard overview with key metrics
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/overview', dateRangeValidation, getDashboardOverview);

/**
 * @route   GET /api/v1/restaurant-dashboard/spending
 * @desc    Get spending analytics and trends
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/spending', dateRangeValidation, getSpendingAnalytics);

/**
 * @route   GET /api/v1/restaurant-dashboard/orders
 * @desc    Get order analytics (volume, frequency, patterns)
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/orders', dateRangeValidation, getOrderAnalytics);

/**
 * @route   GET /api/v1/restaurant-dashboard/vendors
 * @desc    Get vendor insights and performance analytics
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/vendors', 
  [
    ...dateRangeValidation,
    query('sort')
      .optional()
      .isIn(['spending', 'orders', 'rating', 'reliability'])
      .withMessage('Sort must be one of: spending, orders, rating, reliability'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ], 
  getVendorInsights
);

/**
 * @route   GET /api/v1/restaurant-dashboard/budget
 * @desc    Get budget tracking and spending limits
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/budget', 
  [
    ...dateRangeValidation,
    query('category')
      .optional()
      .isMongoId()
      .withMessage('Category must be a valid MongoDB ID')
  ], 
  getBudgetTracking
);

/**
 * @route   GET /api/v1/restaurant-dashboard/inventory-planning
 * @desc    Get inventory planning and consumption insights
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/inventory-planning', dateRangeValidation, getInventoryPlanning);

/**
 * @route   GET /api/v1/restaurant-dashboard/order-history
 * @desc    Get detailed order history with filters
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/order-history',
  [
    ...dateRangeValidation,
    query('vendor')
      .optional()
      .isMongoId()
      .withMessage('Vendor must be a valid MongoDB ID'),
    query('status')
      .optional()
      .isIn(['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'])
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
  getOrderHistory
);

/**
 * @route   GET /api/v1/restaurant-dashboard/favorite-vendors
 * @desc    Get favorite vendors and frequently purchased items
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/favorite-vendors',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ],
  getFavoriteVendors
);

/**
 * @route   GET /api/v1/restaurant-dashboard/cost-analysis
 * @desc    Get detailed cost analysis and pricing trends
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/cost-analysis', dateRangeValidation, getCostAnalysis);

/**
 * @route   GET /api/v1/restaurant-dashboard/purchase-patterns
 * @desc    Get purchase patterns and seasonal trends
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/purchase-patterns',
  [
    ...dateRangeValidation,
    query('groupBy')
      .optional()
      .isIn(['category', 'vendor', 'product'])
      .withMessage('GroupBy must be one of: category, vendor, product')
  ],
  getPurchasePatterns
);

/**
 * @route   GET /api/v1/restaurant-dashboard/delivery-tracking
 * @desc    Get delivery tracking and logistics analytics
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/delivery-tracking', dateRangeValidation, getDeliveryTracking);

/**
 * @route   GET /api/v1/restaurant-dashboard/team-activity
 * @desc    Get team member activity and order management (Owner only)
 * @access  Private (Restaurant Owner only)
 */
router.get('/team-activity', 
  authorize('restaurantOwner'), // Only owners can see team activity
  dateRangeValidation, 
  getTeamActivity
);

/**
 * @route   GET /api/v1/restaurant-dashboard/notifications
 * @desc    Get restaurant notifications and alerts
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/notifications',
  [
    query('type')
      .optional()
      .isIn(['order', 'budget', 'vendor', 'system'])
      .withMessage('Notification type must be one of: order, budget, vendor, system'),
    query('unreadOnly')
      .optional()
      .isBoolean()
      .withMessage('UnreadOnly must be a boolean')
  ],
  getNotifications
);

/**
 * @route   GET /api/v1/restaurant-dashboard/reorder-suggestions
 * @desc    Get smart reorder suggestions based on consumption patterns
 * @access  Private (Restaurant Owner/Manager only)
 */
router.get('/reorder-suggestions',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('category')
      .optional()
      .isMongoId()
      .withMessage('Category must be a valid MongoDB ID')
  ],
  getReorderSuggestions
);

module.exports = router;