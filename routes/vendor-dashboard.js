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
const { protect, authorize } = require('../middleware/auth');
const { query } = require('express-validator');

const router = express.Router();

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

module.exports = router;