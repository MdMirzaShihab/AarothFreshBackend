const express = require("express");
const {
  createProduct,
  updateProduct,
  createCategory,
  updateCategory,
  getProducts,
  getProduct,
  deleteProduct,
  getCategories,
  getCategory,
  deleteCategory,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllVendors,
  getAllRestaurants,
  getDashboardStats,
  getDashboardOverview,
  getPendingVendors,
  getPendingRestaurants,
  toggleFeaturedListing,
  createRestaurantOwner,
  createRestaurantManager,
  // Approval Management
  getAllApprovals,
  approveVendor,
  rejectVendor,
  approveRestaurant,
  rejectRestaurant,
  // Enhanced Deletion Protection
  safeDeleteProduct,
  safeDeleteCategory,
  deactivateVendor,
  // Listing Management
  flagListing,
  getFlaggedListings,
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
  auditLog,
  captureOriginalData,
  auditSecurity,
  auditRateLimit
} = require("../middleware/auditLog");
const {
  productValidation,
  categoryValidation,
  userUpdateValidation,
  mongoIdValidation,
  adminRestaurantOwnerValidation,
  adminRestaurantManagerValidation,
  approvalValidation,
  rejectionValidation,
  flagListingValidation,
  vendorDeactivationValidation,
  settingsValidation,
  analyticsValidation,
  dateRangeValidation
} = require("../middleware/validation");

// Import models for audit logging
const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Restaurant = require("../models/Restaurant");
const Listing = require("../models/Listing");

const router = express.Router();

// Apply admin authorization and audit logging to all routes
router.use(protect, authorize("admin"));
router.use(auditRateLimit());

// Dashboard stats
router.get("/dashboard", getDashboardStats);
router.get("/dashboard/overview", getDashboardOverview);

// Restaurant management
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

// ======================
// APPROVAL MANAGEMENT ROUTES
// ======================

// Get all pending approvals
router.get("/approvals", getAllApprovals);


// ======================
// ENHANCED DELETION PROTECTION ROUTES
// ======================

// Safe deletion routes with dependency checking
router.delete("/products/:id/safe-delete",
  mongoIdValidation("id"),
  captureOriginalData(Product),
  auditLog('product_deleted', 'Product', 'Safely deleted product: {name}', { severity: 'medium', impactLevel: 'moderate' }),
  safeDeleteProduct
);

router.delete("/categories/:id/safe-delete",
  mongoIdValidation("id"),
  captureOriginalData(ProductCategory),
  auditLog('category_deleted', 'ProductCategory', 'Safely deleted category: {name}', { severity: 'medium', impactLevel: 'moderate' }),
  safeDeleteCategory
);


// ======================
// LISTING MANAGEMENT ROUTES
// ======================

// Get all flagged listings
router.get("/listings/flagged", getFlaggedListings);

// ======================
// ENHANCED ENTITY MANAGEMENT WITH AUDIT
// ======================

// Enhanced product routes with audit logging
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
    captureOriginalData(Product),
    auditLog('product_updated', 'Product', 'Updated product: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateProduct
  )
  .delete(
    mongoIdValidation("id"),
    captureOriginalData(Product),
    auditLog('product_deleted', 'Product', 'Deleted product: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    deleteProduct
  );

// Enhanced category routes with audit logging
router
  .route("/categories")
  .get(getCategories)
  .post(
    categoryValidation,
    auditLog('category_created', 'ProductCategory', 'Created category: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createCategory
  );

router
  .route("/categories/:id")
  .get(mongoIdValidation("id"), getCategory)
  .put(
    mongoIdValidation("id"),
    categoryValidation,
    captureOriginalData(ProductCategory),
    auditLog('category_updated', 'ProductCategory', 'Updated category: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateCategory
  )
  .delete(
    mongoIdValidation("id"),
    captureOriginalData(ProductCategory),
    auditLog('category_deleted', 'ProductCategory', 'Deleted category: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    deleteCategory
  );

// Enhanced user management routes with audit logging
router.route("/users").get(getAllUsers);

router
  .route("/users/:id")
  .get(mongoIdValidation("id"), getUser)
  .put(
    mongoIdValidation("id"),
    userUpdateValidation,
    captureOriginalData(User),
    auditSecurity('user_updated', 'Updated user account', { severity: 'high', impactLevel: 'major' }),
    updateUser
  )
  .delete(
    mongoIdValidation("id"),
    captureOriginalData(User),
    auditSecurity('user_deleted', 'Deleted user account', { severity: 'critical', impactLevel: 'major' }),
    deleteUser
  );

// Enhanced vendor management routes with audit logging
router.route("/vendors").get(getAllVendors);
router.route("/vendors/pending").get(getPendingVendors);

// Enhanced restaurant management routes with audit logging
router.route("/restaurants").get(getAllRestaurants);
router.route("/restaurants/pending").get(getPendingRestaurants);

// ======================
// ANALYTICS ROUTES
// ======================

// Analytics overview
router.get("/analytics/overview", 
  analyticsValidation,
  getAnalyticsOverview
);

// Sales analytics
router.get("/analytics/sales",
  analyticsValidation,
  auditLog('analytics_viewed', 'Settings', 'Viewed sales analytics', { severity: 'low', impactLevel: 'minor' }),
  getSalesAnalytics
);

// User analytics
router.get("/analytics/users",
  analyticsValidation,
  auditLog('analytics_viewed', 'Settings', 'Viewed user analytics', { severity: 'low', impactLevel: 'minor' }),
  getUserAnalytics
);

// Product analytics
router.get("/analytics/products",
  analyticsValidation,
  auditLog('analytics_viewed', 'Settings', 'Viewed product analytics', { severity: 'low', impactLevel: 'minor' }),
  getProductAnalytics
);

// Clear analytics cache
router.delete("/analytics/cache",
  auditSecurity('cache_cleared', 'Cleared analytics cache', { severity: 'medium', impactLevel: 'minor' }),
  clearAnalyticsCache
);

// ======================
// SYSTEM SETTINGS ROUTES
// ======================

// Get all settings
router.get("/settings", getAllSettings);

// Get settings by category
router.get("/settings/:category",
  getSettingsByCategory
);

// Get single setting
router.get("/settings/key/:key", getSetting);

// Get setting history
router.get("/settings/key/:key/history", getSettingHistory);

// Create new setting
router.post("/settings",
  settingsValidation,
  auditSecurity('settings_created', 'Created system setting', { severity: 'high', impactLevel: 'major' }),
  createSetting
);

// Update setting
router.put("/settings/key/:key",
  auditSecurity('settings_updated', 'Updated system setting', { severity: 'high', impactLevel: 'major' }),
  updateSetting
);

// Delete setting
router.delete("/settings/key/:key",
  auditSecurity('settings_deleted', 'Deleted system setting', { severity: 'high', impactLevel: 'major' }),
  deleteSetting
);

// Bulk update settings
router.put("/settings/bulk",
  auditSecurity('settings_bulk_updated', 'Bulk updated system settings', { severity: 'high', impactLevel: 'major' }),
  bulkUpdateSettings
);

// Reset settings to default
router.post("/settings/reset",
  auditSecurity('settings_reset', 'Reset settings to default', { severity: 'critical', impactLevel: 'major' }),
  resetSettingsToDefault
);

// ======================
// ENHANCED ROUTES WITH VALIDATION
// ======================

// Update approval routes with validation
router.put("/approvals/vendor/:id/approve", 
  mongoIdValidation("id"),
  approvalValidation,
  auditSecurity('vendor_approved', 'Approved vendor account', { severity: 'high', impactLevel: 'major' }),
  approveVendor
);

router.put("/approvals/vendor/:id/reject",
  mongoIdValidation("id"),
  rejectionValidation,
  auditSecurity('vendor_rejected', 'Rejected vendor account', { severity: 'high', impactLevel: 'major' }),
  rejectVendor
);

router.put("/approvals/restaurant/:id/approve",
  mongoIdValidation("id"),
  approvalValidation,
  auditSecurity('restaurant_approved', 'Approved restaurant account', { severity: 'high', impactLevel: 'major' }),
  approveRestaurant
);

router.put("/approvals/restaurant/:id/reject",
  mongoIdValidation("id"),
  rejectionValidation,
  auditSecurity('restaurant_rejected', 'Rejected restaurant account', { severity: 'high', impactLevel: 'major' }),
  rejectRestaurant
);

// Update listing flagging with validation
router.put("/listings/:id/flag",
  mongoIdValidation("id"),
  flagListingValidation,
  captureOriginalData(Listing),
  auditLog('listing_flagged', 'Listing', 'Flagged listing for moderation', { severity: 'medium', impactLevel: 'moderate' }),
  flagListing
);

// Update vendor deactivation with validation
router.put("/vendors/:id/deactivate",
  mongoIdValidation("id"),
  vendorDeactivationValidation,
  captureOriginalData(Vendor),
  auditSecurity('vendor_deactivated', 'Deactivated vendor account', { severity: 'high', impactLevel: 'major' }),
  deactivateVendor
);

module.exports = router;
