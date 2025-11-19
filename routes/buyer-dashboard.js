const express = require('express');
const {
  getDashboardOverview,
  getSpendingAnalytics,
  getOrderAnalytics,
  getVendorInsights,
  getBudgetTracking,
  createBudget,
  updateBudget,
  getPriceAnalytics,
  getInventoryPlanning,
  getOrderHistory,
  getFavoriteVendors,
  getCostAnalysis,
  getPurchasePatterns,
  getDeliveryTracking,
  getTeamActivity,
  getNotifications,
  getReorderSuggestions
} = require('../controllers/buyerDashboardController');
const { protect, authorize } = require('../middleware/auth');
const { query, body } = require('express-validator');

const router = express.Router();

// Apply authentication and buyer authorization to all routes
router.use(protect);
router.use(authorize('buyerOwner', 'buyerManager'));

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
 * @route   GET /api/v1/buyer-dashboard/overview
 * @desc    Get buyer dashboard overview with key metrics
 * @access  Private (Buyer Owner/Manager only)
 */
router.get('/overview', dateRangeValidation, getDashboardOverview);

/**
 * @route   GET /api/v1/buyer-dashboard/spending
 * @desc    Get spending analytics and trends
 * @access  Private (Buyer Owner/Manager only)
 */
router.get('/spending', dateRangeValidation, getSpendingAnalytics);

/**
 * @route   GET /api/v1/buyer-dashboard/orders
 * @desc    Get order analytics (volume, frequency, patterns)
 * @access  Private (Buyer Owner/Manager only)
 */
router.get('/orders', dateRangeValidation, getOrderAnalytics);

/**
 * @route   GET /api/v1/buyer-dashboard/vendors
 * @desc    Get vendor insights and performance analytics
 * @access  Private (Buyer Owner/Manager only)
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
 * @route   GET /api/v1/buyer-dashboard/budget
 * @desc    Get budget tracking and spending limits
 * @access  Private (Buyer Owner/Manager only)
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
 * @route   POST /api/v1/buyer-dashboard/budget
 * @desc    Create a new monthly/quarterly budget
 * @access  Private (Buyer Owner only)
 */
router.post('/budget',
  authorize('buyerOwner'),
  [
    body('budgetPeriod')
      .isIn(['monthly', 'quarterly', 'yearly'])
      .withMessage('Budget period must be monthly, quarterly, or yearly'),
    body('year')
      .isInt({ min: 2020, max: 2050 })
      .withMessage('Year must be between 2020 and 2050'),
    body('month')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Month must be between 1 and 12'),
    body('quarter')
      .optional()
      .isInt({ min: 1, max: 4 })
      .withMessage('Quarter must be between 1 and 4'),
    body('totalBudgetLimit')
      .isFloat({ min: 0 })
      .withMessage('Total budget limit must be a positive number'),
    body('categoryLimits')
      .optional()
      .isArray()
      .withMessage('Category limits must be an array'),
    body('categoryLimits.*.categoryId')
      .optional()
      .isMongoId()
      .withMessage('Category ID must be valid'),
    body('categoryLimits.*.budgetLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Category budget limit must be positive')
  ],
  createBudget
);

/**
 * @route   PUT /api/v1/buyer-dashboard/budget/:budgetId
 * @desc    Update an existing budget
 * @access  Private (Buyer Owner only)
 */
router.put('/budget/:budgetId',
  authorize('buyerOwner'),
  [
    body('totalBudgetLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Total budget limit must be a positive number'),
    body('categoryLimits')
      .optional()
      .isArray()
      .withMessage('Category limits must be an array'),
    body('status')
      .optional()
      .isIn(['draft', 'active', 'expired', 'archived'])
      .withMessage('Status must be draft, active, expired, or archived')
  ],
  updateBudget
);

/**
 * @route   GET /api/v1/buyer-dashboard/inventory-planning
 * @desc    Get inventory planning and consumption insights
 * @access  Private (Buyer Owner/Manager only)
 */
router.get('/inventory-planning', dateRangeValidation, getInventoryPlanning);

/**
 * @route   GET /api/v1/buyer-dashboard/order-history
 * @desc    Get detailed order history with filters
 * @access  Private (Buyer Owner/Manager only)
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
 * @route   GET /api/v1/buyer-dashboard/favorite-vendors
 * @desc    Get favorite vendors and frequently purchased items
 * @access  Private (Buyer Owner/Manager only)
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
 * @route   GET /api/v1/buyer-dashboard/cost-analysis
 * @desc    Get detailed cost analysis and pricing trends
 * @access  Private (Buyer Owner/Manager only)
 */
router.get('/cost-analysis', dateRangeValidation, getCostAnalysis);

/**
 * @route   GET /api/v1/buyer-dashboard/price-analytics
 * @desc    Get average price tracking and price trends by product/category
 * @access  Private (Buyer Owner/Manager only)
 */
router.get('/price-analytics',
  [
    ...dateRangeValidation,
    query('groupBy')
      .optional()
      .isIn(['product', 'category'])
      .withMessage('GroupBy must be product or category'),
    query('productId')
      .optional()
      .isMongoId()
      .withMessage('Product ID must be valid'),
    query('categoryId')
      .optional()
      .isMongoId()
      .withMessage('Category ID must be valid')
  ],
  getPriceAnalytics
);

/**
 * @route   GET /api/v1/buyer-dashboard/purchase-patterns
 * @desc    Get purchase patterns and seasonal trends
 * @access  Private (Buyer Owner/Manager only)
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
 * @route   GET /api/v1/buyer-dashboard/delivery-tracking
 * @desc    Get delivery tracking and logistics analytics
 * @access  Private (Buyer Owner/Manager only)
 */
router.get('/delivery-tracking', dateRangeValidation, getDeliveryTracking);

/**
 * @route   GET /api/v1/buyer-dashboard/team-activity
 * @desc    Get team member activity and order management (Owner only)
 * @access  Private (Buyer Owner only)
 */
router.get('/team-activity', 
  authorize('buyerOwner'), // Only owners can see team activity
  dateRangeValidation, 
  getTeamActivity
);

/**
 * @route   GET /api/v1/buyer-dashboard/notifications
 * @desc    Get buyer notifications and alerts
 * @access  Private (Buyer Owner/Manager only)
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
 * @route   GET /api/v1/buyer-dashboard/reorder-suggestions
 * @desc    Get smart reorder suggestions based on consumption patterns
 * @access  Private (Buyer Owner/Manager only)
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