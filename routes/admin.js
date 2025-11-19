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
  // Market Management
  createMarket,
  getMarkets,
  getMarket,
  updateMarket,
  toggleMarketAvailability,
  getMarketUsageStats,
  safeDeleteMarket,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllVendors,
  getVendor,
  updateVendor,
  createPlatformVendor,
  safeDeleteVendor,
  getAllBuyers,
  getBuyer,
  getBuyerStats,
  updateBuyer,
  deactivateBuyer,
  safeDeleteBuyer,
  transferBuyerOwnership,
  requestBuyerDocuments,
  getDashboardOverview,
  createBuyerOwner,
  createBuyerManager,
  // Business Entity Verification Management
  toggleVendorVerification,
  toggleBuyerVerification,
  // Safe Deletion Protection
  safeDeleteProduct,
  safeDeleteCategory,
  deactivateVendor,
  // Product Statistics and Bulk Operations
  getProductStats,
  bulkUpdateProducts,
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
  uploadMarketImage,
  uploadBuyerLogo,
  uploadVendorLogo,
  uploadProductImages
} = require("../middleware/upload");
const {
  auditLog,
  auditSecurity
} = require("../middleware/auditLog");
const {
  handleValidationErrors,
  productValidation,
  categoryValidation,
  userUpdateValidation,
  mongoIdValidation,
  adminBuyerOwnerValidation,
  adminBuyerManagerValidation,
  settingsValidation,
  analyticsValidation,
  dateRangeValidation,
  // Enhanced listing validations
  adminListingFlagValidation,
  // Enhanced category validations
  categoryAvailabilityValidation,
  // Market validations
  marketValidation,
  marketAvailabilityValidation
} = require("../middleware/validation");

const router = express.Router();

// Apply admin authorization to all routes
router.use(protect, authorize("admin"));

// ================================
// DASHBOARD & ANALYTICS MANAGEMENT
// ================================

// Dashboard routes
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

// Create platform vendor (Aaroth Mall, etc.) - Admin only
router.post("/vendors/platform",
  [
    body('platformName')
      .notEmpty().withMessage('Platform name is required')
      .isIn(['Aaroth Mall', 'Aaroth Organics', 'Aaroth Fresh Store']).withMessage('Invalid platform name'),
    body('name').notEmpty().isLength({ min: 2, max: 50 }).withMessage('Manager name must be 2-50 characters'),
    body('email').notEmpty().isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid phone number is required'),
    body('password').notEmpty().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('address.street').notEmpty().withMessage('Street address is required'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('address.area').notEmpty().withMessage('Area is required'),
    body('address.postalCode').notEmpty().withMessage('Postal code is required'),
  ],
  auditSecurity('platform_vendor_created', 'Created platform vendor account', { severity: 'critical', impactLevel: 'significant' }),
  createPlatformVendor
);

// Individual vendor management
router.route("/vendors/:id")
  .get(
    mongoIdValidation("id"),
    auditLog('vendor_viewed', 'Vendor', 'Viewed vendor details: {businessName}', { severity: 'low', impactLevel: 'minor' }),
    getVendor
  )
  .put(
    mongoIdValidation("id"),
    uploadVendorLogo('logo'),
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
// BUYER MANAGEMENT
// ================================

// Buyer statistics
router.get("/buyers/stats", getBuyerStats);

// Unified buyer route with query parameter filtering
// Query params: ?status=pending|approved|rejected&page=1&limit=20&search=name
router.route("/buyers").get(getAllBuyers);

// Individual buyer management
router.route("/buyers/:id")
  .get(
    mongoIdValidation("id"),
    auditLog('buyer_viewed', 'Buyer', 'Viewed buyer details: {name}', { severity: 'low', impactLevel: 'minor' }),
    getBuyer
  )
  .put(
    mongoIdValidation("id"),
    uploadBuyerLogo('logo'),
    [
      body('name').optional().isLength({ min: 2 }).withMessage('Buyer name must be at least 2 characters'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
      body('tradeLicenseNo').optional().isLength({ min: 3 }).withMessage('Trade license number is required'),
    ],
    auditSecurity('buyer_updated', 'Updated buyer details', { severity: 'medium', impactLevel: 'moderate' }),
    updateBuyer
  );

// Buyer deactivation
router.put("/buyers/:id/deactivate",
  mongoIdValidation("id"),
  [
    body('reason').notEmpty().withMessage('Deactivation reason is required'),
  ],
  auditSecurity('buyer_deactivated', 'Deactivated buyer account', { severity: 'high', impactLevel: 'major' }),
  deactivateBuyer
);

// Buyer safe deletion
router.delete("/buyers/:id/safe-delete",
  mongoIdValidation("id"),
  [
    body('reason').optional().isLength({ min: 3 }).withMessage('Deletion reason must be at least 3 characters'),
  ],
  auditSecurity('buyer_deleted', 'Deleted buyer account', { severity: 'critical', impactLevel: 'major' }),
  safeDeleteBuyer
);

// Transfer buyer ownership
router.post("/buyers/:id/transfer-ownership",
  mongoIdValidation("id"),
  [
    body('newOwnerId').isMongoId().withMessage('Valid new owner ID is required'),
    body('reason').optional().isLength({ min: 3, max: 500 }).withMessage('Reason must be between 3-500 characters'),
  ],
  auditSecurity('buyer_ownership_transferred', 'Transferred buyer ownership', { severity: 'critical', impactLevel: 'major' }),
  transferBuyerOwnership
);

// Request additional documents from buyer
router.put("/buyers/:id/request-documents",
  mongoIdValidation("id"),
  [
    body('documentTypes').isArray({ min: 1 }).withMessage('Document types array is required'),
    body('message').optional().isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),
    body('deadline').optional().isISO8601().withMessage('Deadline must be a valid date'),
  ],
  auditLog('buyer_documents_requested', 'Buyer', 'Requested documents from buyer', { severity: 'medium', impactLevel: 'moderate' }),
  requestBuyerDocuments
);

// Buyer owner and manager creation
router.post("/buyer-owners", 
  adminBuyerOwnerValidation,
  auditLog('buyer_owner_created', 'User', 'Created buyer owner: {name}', { severity: 'medium', impactLevel: 'moderate' }),
  createBuyerOwner
);
router.post("/buyer-managers", 
  adminBuyerManagerValidation,
  auditLog('buyer_manager_created', 'User', 'Created buyer manager: {name}', { severity: 'medium', impactLevel: 'moderate' }),
  createBuyerManager
);

// ================================
// PRODUCT MANAGEMENT
// ================================

// Product CRUD routes
router
  .route("/products")
  .get(getProducts)
  .post(
    ...uploadProductImages('images', 5),
    productValidation,
    auditLog('product_created', 'Product', 'Created product: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createProduct
  );

// Product statistics - MUST be before /products/:id to avoid route collision
router.get("/products/stats", getProductStats);

router
  .route("/products/:id")
  .get(mongoIdValidation("id"), getProduct)
  .put(
    mongoIdValidation("id"),
    ...uploadProductImages('images', 5),
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

// Bulk product operations
router.put("/products/bulk",
  [
    body('productIds').isArray({ min: 1, max: 100 }).withMessage('Product IDs array required (1-100 items)'),
    body('action').isIn(['activate', 'deactivate', 'delete']).withMessage('Action must be activate, deactivate, or delete'),
    handleValidationErrors
  ],
  auditLog('products_bulk_updated', 'Product', 'Bulk action on products', { severity: 'medium', impactLevel: 'moderate' }),
  bulkUpdateProducts
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
// MARKET MANAGEMENT
// ================================

// Market CRUD routes
router
  .route("/markets")
  .get(getMarkets)
  .post(
    ...uploadMarketImage('image'),
    marketValidation,
    auditLog('market_created', 'Market', 'Created market: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createMarket
  );

router
  .route("/markets/:id")
  .get(
    mongoIdValidation("id"),
    getMarket
  )
  .put(
    mongoIdValidation("id"),
    ...uploadMarketImage('image'),
    marketValidation,
    auditLog('market_updated', 'Market', 'Updated market: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateMarket
  );

// Safe delete market route
router.delete("/markets/:id/safe-delete",
  mongoIdValidation("id"),
  auditLog('market_deleted', 'Market', 'Safely deleted market: {name}', { severity: 'high', impactLevel: 'significant' }),
  safeDeleteMarket
);

// Toggle market availability (flag system)
router.put("/markets/:id/availability",
  mongoIdValidation("id"),
  marketAvailabilityValidation,
  auditLog('market_availability_toggled', 'Market', 'Toggled market availability', { severity: 'medium', impactLevel: 'moderate' }),
  toggleMarketAvailability
);

// Get market usage statistics
router.get("/markets/:id/usage",
  mongoIdValidation("id"),
  getMarketUsageStats
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
    body('reason')
      .if(body('status').equals('rejected'))
      .notEmpty().withMessage('Reason is required when rejecting verification')
      .isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters'),
    handleValidationErrors
  ],
  auditSecurity('vendor_verification_toggle', 'Toggled vendor verification status', { severity: 'high', impactLevel: 'significant' }),
  toggleVendorVerification
);

// Direct buyer verification toggle
router.put("/buyers/:id/verification",
  mongoIdValidation("id"),
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('status must be one of: pending, approved, rejected'),
    body('reason')
      .if(body('status').equals('rejected'))
      .notEmpty().withMessage('Reason is required when rejecting verification')
      .isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters'),
    handleValidationErrors
  ],
  auditSecurity('buyer_verification_toggle', 'Toggled buyer verification status', { severity: 'high', impactLevel: 'significant' }),
  toggleBuyerVerification
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

// Manual inventory check for MVP (simplified)
router.post("/inventory/manual-check",
  auditLog('manual_inventory_check', 'Inventory', 'Manual inventory check triggered', { severity: 'low', impactLevel: 'minor' }),
  async (req, res) => {
    try {
      // Simple response for MVP - just indicate the check would happen
      res.json({
        success: true,
        message: 'Manual inventory check would be performed here in full version',
        timestamp: new Date().toISOString(),
        note: 'This is a simplified MVP response. Enable ENABLE_INVENTORY_MONITORING=true for full functionality.'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to trigger inventory check',
        error: error.message
      });
    }
  }
);

module.exports = router;
