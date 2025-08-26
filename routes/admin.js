const express = require("express");
const { body } = require('express-validator');
const {
  createProduct,
  updateProduct,
  createCategory,
  updateCategory,
  getProducts,
  getProduct,
  getCategories,
  getCategory,
  toggleCategoryAvailability,
  getCategoryUsageStats,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllVendors,
  getVendor,
  updateVendor,
  safeDeleteVendor,
  getAllRestaurants,
  getRestaurant,
  updateRestaurant,
  deactivateRestaurant,
  safeDeleteRestaurant,
  getDashboardOverview,
  createRestaurantOwner,
  createRestaurantManager,
  // Business Entity Verification Management
  toggleVendorVerification,
  toggleRestaurantVerification,
  // Safe Deletion Protection
  safeDeleteProduct,
  safeDeleteCategory,
  deactivateVendor,
  // Comprehensive Listing Management
  getAdminListings,
  getAdminListing,
  updateListingStatus,
  toggleListingFeatured,
  updateListingFlag,
  softDeleteListing,
  bulkUpdateListings,
} = require("../controllers/adminController");

// Import analytics and settings controllers
const {
  getAnalyticsOverview,
  getSalesAnalytics,
  getUserAnalytics,
  getProductAnalytics,
  clearAnalyticsCache
} = require("../controllers/analyticsController");

const {
  getPerformanceDashboard,
  getPerformanceMetrics,
  getSLAViolations,
  getTeamComparison,
  getAdminTrends,
  getSLAConfiguration,
  generatePerformanceReport
} = require("../controllers/adminPerformanceController");

const {
  getSettingsByCategory,
  getAllSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
  bulkUpdateSettings,
  resetSettingsToDefault,
  getSettingHistory
} = require("../controllers/settingsController");
const { protect, authorize } = require("../middleware/auth");
const { 
  uploadCategoryImage, 
  uploadProductImages 
} = require("../middleware/upload");
const {
  auditLog,
  auditSecurity
} = require("../middleware/auditLog");
const {
  productValidation,
  categoryValidation,
  userUpdateValidation,
  mongoIdValidation,
  adminRestaurantOwnerValidation,
  adminRestaurantManagerValidation,
  settingsValidation,
  analyticsValidation,
  dateRangeValidation,
  // Enhanced listing validations
  adminListingFlagValidation,
  // Enhanced category validations
  categoryAvailabilityValidation
} = require("../middleware/validation");

const router = express.Router();

// Apply admin authorization to all routes
router.use(protect, authorize("admin"));

// ================================
// DASHBOARD & ANALYTICS MANAGEMENT
// ================================

// Dashboard routes
router.get("/dashboard", getDashboardOverview);
router.get("/dashboard/overview", getDashboardOverview);

// ================================  
// USER MANAGEMENT
// ================================

// User CRUD routes
router.route("/users").get(getAllUsers);

router
  .route("/users/:id")
  .get(mongoIdValidation("id"), getUser)
  .put(
    mongoIdValidation("id"),
    userUpdateValidation,
    auditSecurity('user_updated', 'Updated user account', { severity: 'high', impactLevel: 'major' }),
    updateUser
  )
  .delete(
    mongoIdValidation("id"),
    auditSecurity('user_deleted', 'Deleted user account', { severity: 'critical', impactLevel: 'major' }),
    deleteUser
  );

// ================================
// VENDOR MANAGEMENT  
// ================================

// Unified vendor route with query parameter filtering
// Query params: ?status=pending|approved|rejected&page=1&limit=20&search=businessName
router.route("/vendors").get(getAllVendors);

// Individual vendor management
router.route("/vendors/:id")
  .get(
    mongoIdValidation("id"),
    auditLog('vendor_viewed', 'Vendor', 'Viewed vendor details: {businessName}', { severity: 'low', impactLevel: 'minor' }),
    getVendor
  )
  .put(
    mongoIdValidation("id"),
    [
      body('businessName').optional().isLength({ min: 2 }).withMessage('Business name must be at least 2 characters'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
      body('tradeLicenseNo').optional().isLength({ min: 3 }).withMessage('Trade license number is required'),
    ],
    auditSecurity('vendor_updated', 'Updated vendor details', { severity: 'medium', impactLevel: 'moderate' }),
    updateVendor
  );

// Vendor deactivation
router.put("/vendors/:id/deactivate",
  mongoIdValidation("id"),
  [
    body('reason').notEmpty().withMessage('Deactivation reason is required'),
  ],
  auditSecurity('vendor_deactivated', 'Deactivated vendor account', { severity: 'high', impactLevel: 'major' }),
  deactivateVendor
);

// Vendor safe deletion
router.delete("/vendors/:id/safe-delete",
  mongoIdValidation("id"),
  [
    body('reason').optional().isLength({ min: 3 }).withMessage('Deletion reason must be at least 3 characters'),
  ],
  auditSecurity('vendor_deleted', 'Deleted vendor account', { severity: 'critical', impactLevel: 'major' }),
  safeDeleteVendor
);

// ================================
// RESTAURANT MANAGEMENT
// ================================

// Unified restaurant route with query parameter filtering
// Query params: ?status=pending|approved|rejected&page=1&limit=20&search=name
router.route("/restaurants").get(getAllRestaurants);

// Individual restaurant management
router.route("/restaurants/:id")
  .get(
    mongoIdValidation("id"),
    auditLog('restaurant_viewed', 'Restaurant', 'Viewed restaurant details: {name}', { severity: 'low', impactLevel: 'minor' }),
    getRestaurant
  )
  .put(
    mongoIdValidation("id"),
    [
      body('name').optional().isLength({ min: 2 }).withMessage('Restaurant name must be at least 2 characters'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
      body('tradeLicenseNo').optional().isLength({ min: 3 }).withMessage('Trade license number is required'),
    ],
    auditSecurity('restaurant_updated', 'Updated restaurant details', { severity: 'medium', impactLevel: 'moderate' }),
    updateRestaurant
  );

// Restaurant deactivation
router.put("/restaurants/:id/deactivate",
  mongoIdValidation("id"),
  [
    body('reason').notEmpty().withMessage('Deactivation reason is required'),
  ],
  auditSecurity('restaurant_deactivated', 'Deactivated restaurant account', { severity: 'high', impactLevel: 'major' }),
  deactivateRestaurant
);

// Restaurant safe deletion
router.delete("/restaurants/:id/safe-delete",
  mongoIdValidation("id"),
  [
    body('reason').optional().isLength({ min: 3 }).withMessage('Deletion reason must be at least 3 characters'),
  ],
  auditSecurity('restaurant_deleted', 'Deleted restaurant account', { severity: 'critical', impactLevel: 'major' }),
  safeDeleteRestaurant
);

// Restaurant owner and manager creation
router.post("/restaurant-owners", 
  adminRestaurantOwnerValidation,
  auditLog('restaurant_owner_created', 'User', 'Created restaurant owner: {name}', { severity: 'medium', impactLevel: 'moderate' }),
  createRestaurantOwner
);
router.post("/restaurant-managers", 
  adminRestaurantManagerValidation,
  auditLog('restaurant_manager_created', 'User', 'Created restaurant manager: {name}', { severity: 'medium', impactLevel: 'moderate' }),
  createRestaurantManager
);

// ================================
// PRODUCT MANAGEMENT
// ================================

// Product CRUD routes
router
  .route("/products")
  .get(getProducts)
  .post(
    productValidation,
    auditLog('product_created', 'Product', 'Created product: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createProduct
  );

router
  .route("/products/:id")
  .get(mongoIdValidation("id"), getProduct)
  .put(
    mongoIdValidation("id"),
    productValidation,
    auditLog('product_updated', 'Product', 'Updated product: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateProduct
  );

// Safe delete product route
router.delete("/products/:id/safe-delete",
  mongoIdValidation("id"),
  auditLog('product_deleted', 'Product', 'Safely deleted product: {name}', { severity: 'medium', impactLevel: 'moderate' }),
  safeDeleteProduct
);

// ================================
// PRODUCT CATEGORY MANAGEMENT
// ================================

// Category CRUD routes
router
  .route("/categories")
  .get(getCategories)
  .post(
    ...uploadCategoryImage('image'),
    categoryValidation,
    auditLog('category_created', 'ProductCategory', 'Created category: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createCategory
  );

router
  .route("/categories/:id")
  .get(
    mongoIdValidation("id"),
    getCategory
  )
  .put(
    mongoIdValidation("id"),
    ...uploadCategoryImage('image'),
    categoryValidation,
    auditLog('category_updated', 'ProductCategory', 'Updated category: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateCategory
  );

// Safe delete category route
router.delete("/categories/:id/safe-delete",
  mongoIdValidation("id"),
  auditLog('category_deleted', 'ProductCategory', 'Safely deleted category: {name}', { severity: 'high', impactLevel: 'significant' }),
  safeDeleteCategory
);

// Toggle category availability (flag system)
router.put("/categories/:id/availability",
  mongoIdValidation("id"),
  categoryAvailabilityValidation,
  auditLog('category_availability_toggled', 'ProductCategory', 'Toggled category availability', { severity: 'medium', impactLevel: 'moderate' }),
  toggleCategoryAvailability
);

// Get category usage statistics
router.get("/categories/:id/usage",
  mongoIdValidation("id"),
  getCategoryUsageStats
);

// ================================
// LISTING MANAGEMENT
// ================================

// Get all admin listings with advanced filtering
router.get("/listings",
  getAdminListings
);

// Get featured listings only
router.get("/listings/featured",
  getAdminListings // Will filter for featured=true
);

// Get flagged listings only
router.get("/listings/flagged",
  getAdminListings // Will filter for isFlagged=true
);

// Get single listing with full admin details
router.get("/listings/:id",
  mongoIdValidation("id"),
  getAdminListing
);

// Update listing status (active, inactive, out_of_stock, discontinued)
router.put("/listings/:id/status",
  mongoIdValidation("id"),
  [
    body('status').isIn(['active', 'inactive', 'out_of_stock', 'discontinued']).withMessage('Invalid status'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
  ],
  auditLog('listing_status_updated', 'Listing', 'Updated listing status: {status}', { severity: 'medium', impactLevel: 'moderate' }),
  updateListingStatus
);

// Toggle listing featured status
router.put("/listings/:id/featured",
  mongoIdValidation("id"),
  auditLog('listing_featured_toggled', 'Listing', 'Toggled listing featured status', { severity: 'medium', impactLevel: 'moderate' }),
  toggleListingFeatured
);

// Update listing flag status (flag/unflag with reason)
router.put("/listings/:id/flag",
  mongoIdValidation("id"),
  adminListingFlagValidation,
  auditLog('listing_flag_updated', 'Listing', 'Updated listing flag status', { severity: 'medium', impactLevel: 'moderate' }),
  updateListingFlag
);

// Soft delete listing
router.delete("/listings/:id",
  mongoIdValidation("id"),
  auditSecurity('listing_deleted', 'Soft deleted listing', { severity: 'high', impactLevel: 'major' }),
  softDeleteListing
);

// Bulk operations on multiple listings
router.post("/listings/bulk",
  [
    body('ids').isArray({ min: 1, max: 100 }).withMessage('IDs array required (1-100 items)'),
    body('ids.*').isMongoId().withMessage('Each ID must be valid'),
    body('action').isIn(['activate', 'deactivate', 'delete', 'approve', 'reject']).withMessage('Invalid action'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
  ],
  auditSecurity('listings_bulk_updated', 'Performed bulk operations on listings', { severity: 'high', impactLevel: 'major' }),
  bulkUpdateListings
);

// ================================
// BUSINESS ENTITY VERIFICATION MANAGEMENT
// ================================

// Direct vendor verification toggle
router.put("/vendors/:id/verification",
  mongoIdValidation("id"),
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('status must be one of: pending, approved, rejected'),
    body('reason').optional().isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5-500 characters')
  ],
  auditSecurity('vendor_verification_toggle', 'Toggled vendor verification status', { severity: 'high', impactLevel: 'significant' }),
  toggleVendorVerification
);

// Direct restaurant verification toggle
router.put("/restaurants/:id/verification",
  mongoIdValidation("id"),
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('status must be one of: pending, approved, rejected'),
    body('reason').optional().isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5-500 characters')
  ],
  auditSecurity('restaurant_verification_toggle', 'Toggled restaurant verification status', { severity: 'high', impactLevel: 'significant' }),
  toggleRestaurantVerification
);

// ================================
// SYSTEM SETTINGS & ANALYTICS
// ================================

// Analytics overview
router.get("/analytics/overview", 
  analyticsValidation,
  getAnalyticsOverview
);

// Sales analytics
router.get("/analytics/sales",
  analyticsValidation,
  getSalesAnalytics
);

// User analytics
router.get("/analytics/users",
  analyticsValidation,
  getUserAnalytics
);

// Product analytics
router.get("/analytics/products",
  analyticsValidation,
  getProductAnalytics
);

// Clear analytics cache
router.delete("/analytics/cache",
  auditSecurity('cache_cleared', 'Cleared analytics cache', { severity: 'medium', impactLevel: 'minor' }),
  clearAnalyticsCache
);

// System settings routes
router.get("/settings", getAllSettings);

router.get("/settings/:category", getSettingsByCategory);

router.get("/settings/key/:key", getSetting);

router.get("/settings/key/:key/history", getSettingHistory);

router.post("/settings",
  settingsValidation,
  auditSecurity('settings_created', 'Created system setting', { severity: 'high', impactLevel: 'major' }),
  createSetting
);

router.put("/settings/key/:key",
  auditSecurity('settings_updated', 'Updated system setting', { severity: 'high', impactLevel: 'major' }),
  updateSetting
);

router.delete("/settings/key/:key",
  auditSecurity('settings_deleted', 'Deleted system setting', { severity: 'high', impactLevel: 'major' }),
  deleteSetting
);

router.put("/settings/bulk",
  auditSecurity('settings_bulk_updated', 'Bulk updated system settings', { severity: 'high', impactLevel: 'major' }),
  bulkUpdateSettings
);

router.post("/settings/reset",
  auditSecurity('settings_reset', 'Reset settings to default', { severity: 'critical', impactLevel: 'major' }),
  resetSettingsToDefault
);

// ================================
// ADMIN PERFORMANCE MONITORING
// ================================

// Performance dashboard
router.get("/performance/dashboard",
  auditLog('performance_dashboard_accessed', 'AdminMetrics', 'Accessed performance dashboard', { severity: 'low', impactLevel: 'minor' }),
  getPerformanceDashboard
);

// Detailed performance metrics
router.get("/performance/metrics",
  auditLog('performance_metrics_accessed', 'AdminMetrics', 'Accessed detailed performance metrics', { severity: 'low', impactLevel: 'minor' }),
  getPerformanceMetrics
);

// SLA violations analysis
router.get("/performance/sla-violations",
  auditLog('sla_violations_accessed', 'AdminMetrics', 'Accessed SLA violations report', { severity: 'medium', impactLevel: 'moderate' }),
  getSLAViolations
);

// Team performance comparison
router.get("/performance/team-comparison",
  auditLog('team_comparison_accessed', 'AdminMetrics', 'Accessed team performance comparison', { severity: 'low', impactLevel: 'minor' }),
  getTeamComparison
);

// Individual admin performance trends
router.get("/performance/trends/:adminId",
  mongoIdValidation("adminId"),
  auditLog('admin_trends_accessed', 'AdminMetrics', 'Accessed individual admin performance trends', { severity: 'medium', impactLevel: 'moderate' }),
  getAdminTrends
);

// SLA configuration overview
router.get("/performance/sla-config",
  auditLog('sla_config_accessed', 'SLAConfig', 'Accessed SLA configuration', { severity: 'low', impactLevel: 'minor' }),
  getSLAConfiguration
);

// Generate performance reports
router.post("/performance/generate-report",
  [
    body('reportType').optional().isIn(['comprehensive', 'summary', 'violations']).withMessage('Invalid report type'),
    body('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid period type'),
    body('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    body('adminIds').optional().isArray().withMessage('Admin IDs must be an array'),
  ],
  auditSecurity('performance_report_generated', 'Generated admin performance report', { severity: 'medium', impactLevel: 'moderate' }),
  generatePerformanceReport
);

module.exports = router;
