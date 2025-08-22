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
  getAllRestaurants,
  getDashboardOverview,
  getPendingVendors,
  getPendingRestaurants,
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
  flagListingValidation,
  vendorDeactivationValidation,
  settingsValidation,
  analyticsValidation,
  dateRangeValidation,
  // Enhanced listing validations
  adminListingStatusValidation,
  adminListingFlagValidation,
  adminListingBulkValidation,
  // Enhanced category validations
  categoryAvailabilityValidation
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

// ================================
// VENDOR MANAGEMENT  
// ================================

// Vendor routes
router.route("/vendors").get(getAllVendors);
router.route("/vendors/pending").get(getPendingVendors);

// Vendor deactivation
router.put("/vendors/:id/deactivate",
  mongoIdValidation("id"),
  vendorDeactivationValidation,
  captureOriginalData(Vendor),
  auditSecurity('vendor_deactivated', 'Deactivated vendor account', { severity: 'high', impactLevel: 'major' }),
  deactivateVendor
);

// ================================
// RESTAURANT MANAGEMENT
// ================================

// Restaurant routes
router.route("/restaurants").get(getAllRestaurants);
router.route("/restaurants/pending").get(getPendingRestaurants);

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
    captureOriginalData(Product),
    auditLog('product_updated', 'Product', 'Updated product: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateProduct
  );

// Safe delete product route
router.delete("/products/:id/safe-delete",
  mongoIdValidation("id"),
  captureOriginalData(Product),
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
    captureOriginalData(ProductCategory),
    auditLog('category_updated', 'ProductCategory', 'Updated category: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateCategory
  );

// Safe delete category route
router.delete("/categories/:id/safe-delete",
  mongoIdValidation("id"),
  captureOriginalData(ProductCategory),
  auditLog('category_deleted', 'ProductCategory', 'Safely deleted category: {name}', { severity: 'high', impactLevel: 'significant' }),
  safeDeleteCategory
);

// Toggle category availability (flag system)
router.put("/categories/:id/availability",
  mongoIdValidation("id"),
  categoryAvailabilityValidation,
  captureOriginalData(ProductCategory),
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
  adminListingStatusValidation,
  captureOriginalData(Listing),
  auditLog('listing_status_updated', 'Listing', 'Updated listing status: {status}', { severity: 'medium', impactLevel: 'moderate' }),
  updateListingStatus
);

// Toggle listing featured status
router.put("/listings/:id/featured",
  mongoIdValidation("id"),
  captureOriginalData(Listing),
  auditLog('listing_featured_toggled', 'Listing', 'Toggled listing featured status', { severity: 'medium', impactLevel: 'moderate' }),
  toggleListingFeatured
);

// Update listing flag status (flag/unflag with reason)
router.put("/listings/:id/flag",
  mongoIdValidation("id"),
  adminListingFlagValidation,
  captureOriginalData(Listing),
  auditLog('listing_flag_updated', 'Listing', 'Updated listing flag status', { severity: 'medium', impactLevel: 'moderate' }),
  updateListingFlag
);

// Soft delete listing
router.delete("/listings/:id",
  mongoIdValidation("id"),
  captureOriginalData(Listing),
  auditSecurity('listing_deleted', 'Soft deleted listing', { severity: 'high', impactLevel: 'major' }),
  softDeleteListing
);

// Bulk operations on multiple listings
router.post("/listings/bulk",
  adminListingBulkValidation,
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
    body('isVerified').isBoolean().withMessage('isVerified must be a boolean'),
    body('reason').optional().isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5-500 characters')
  ],
  auditSecurity('vendor_verification_toggle', 'Toggled vendor verification status', { severity: 'high', impactLevel: 'significant' }),
  toggleVendorVerification
);

// Direct restaurant verification toggle
router.put("/restaurants/:id/verification",
  mongoIdValidation("id"),
  [
    body('isVerified').isBoolean().withMessage('isVerified must be a boolean'),
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

module.exports = router;
