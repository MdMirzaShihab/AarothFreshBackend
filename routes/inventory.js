const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getInventoryOverview,
  addPurchase,
  getInventoryItem,
  updateInventorySettings,
  adjustStock,
  getLowStockAlerts,
  markAlertsAsRead,
  getInventoryAnalytics,
  getPurchaseHistory,
  syncListingsWithInventory
} = require('../controllers/inventoryController');

const { protect, authorize } = require('../middleware/auth');

// All inventory routes require authentication and vendor authorization
router.use(protect);
router.use(authorize('vendor'));

// Validation middleware
const validatePurchase = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('purchasePrice')
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a positive number'),
  body('purchasedQuantity')
    .isFloat({ min: 0.1 })
    .withMessage('Purchased quantity must be greater than 0'),
  body('unit')
    .notEmpty()
    .withMessage('Unit is required'),
  body('qualityGrade')
    .notEmpty()
    .withMessage('Quality grade is required'),
  body('supplier.name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Supplier name must be between 2 and 100 characters'),
  body('harvestDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Harvest date must be a valid date'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Expiry date must be a valid date'),
  body('transportationCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Transportation cost must be a positive number'),
  body('storageCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Storage cost must be a positive number'),
  body('otherCosts')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Other costs must be a positive number')
];

const validateInventorySettings = [
  body('reorderLevel')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Reorder level must be a positive number'),
  body('maxStockLevel')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Maximum stock level must be at least 1'),
  body('autoReorderEnabled')
    .optional()
    .isBoolean()
    .withMessage('Auto reorder enabled must be a boolean'),
  body('reorderQuantity')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Reorder quantity must be at least 1')
];

const validateStockAdjustment = [
  body('type')
    .isIn(['wastage', 'damage', 'return', 'adjustment'])
    .withMessage('Invalid adjustment type'),
  body('quantity')
    .isFloat({ min: 0.1 })
    .withMessage('Quantity must be greater than 0'),
  body('reason')
    .notEmpty()
    .isLength({ min: 5, max: 200 })
    .withMessage('Reason must be between 5 and 200 characters'),
  body('batchId')
    .optional()
    .isLength({ min: 5 })
    .withMessage('Batch ID must be at least 5 characters long')
];

// Routes

/**
 * @route   GET /api/v1/inventory
 * @desc    Get vendor's inventory overview
 * @access  Private/Vendor
 * @query   status - filter by status (active, low_stock, out_of_stock, overstocked, inactive)
 * @query   lowStock - true to show only low stock items
 */
router.get('/', getInventoryOverview);

/**
 * @route   POST /api/v1/inventory
 * @desc    Add new purchase to inventory
 * @access  Private/Vendor
 * @body    productId, purchasePrice, purchasedQuantity, unit, qualityGrade, etc.
 */
router.post('/', validatePurchase, addPurchase);

/**
 * @route   GET /api/v1/inventory/analytics
 * @desc    Get inventory analytics for vendor
 * @access  Private/Vendor
 * @query   startDate, endDate, period
 */
router.get('/analytics', getInventoryAnalytics);

/**
 * @route   GET /api/v1/inventory/alerts
 * @desc    Get low stock and other inventory alerts
 * @access  Private/Vendor
 * @query   severity - filter by severity (all, critical, high, medium, low)
 */
router.get('/alerts', getLowStockAlerts);

/**
 * @route   POST /api/v1/inventory/sync-listings
 * @desc    Sync all listings with their inventory levels
 * @access  Private/Vendor
 */
router.post('/sync-listings', syncListingsWithInventory);

/**
 * @route   POST /api/v1/inventory/check-alerts
 * @desc    Manually trigger inventory check and generate alerts
 * @access  Private/Vendor
 */
router.post('/check-alerts', require('../controllers/inventoryController').triggerInventoryCheck);

/**
 * @route   GET /api/v1/inventory/:id
 * @desc    Get inventory item details with purchase history
 * @access  Private/Vendor
 * @param   id - Inventory ID
 */
router.get('/:id', getInventoryItem);

/**
 * @route   PUT /api/v1/inventory/:id/settings
 * @desc    Update inventory settings (reorder levels, etc.)
 * @access  Private/Vendor
 * @param   id - Inventory ID
 * @body    reorderLevel, maxStockLevel, autoReorderEnabled, reorderQuantity
 */
router.put('/:id/settings', validateInventorySettings, updateInventorySettings);

/**
 * @route   POST /api/v1/inventory/:id/adjust
 * @desc    Adjust stock for wastage, damage, etc.
 * @access  Private/Vendor
 * @param   id - Inventory ID
 * @body    type, quantity, reason, batchId (optional)
 */
router.post('/:id/adjust', validateStockAdjustment, adjustStock);

/**
 * @route   PUT /api/v1/inventory/:id/alerts/read
 * @desc    Mark inventory alerts as read
 * @access  Private/Vendor
 * @param   id - Inventory ID
 * @body    alertIds - array of alert IDs to mark as read (optional - marks all if not provided)
 */
router.put('/:id/alerts/read', markAlertsAsRead);

/**
 * @route   GET /api/v1/inventory/:id/purchases
 * @desc    Get purchase history for inventory item
 * @access  Private/Vendor
 * @param   id - Inventory ID
 * @query   status - filter by status (active, sold_out, expired, damaged)
 * @query   sortBy - sort field (purchaseDate, purchasePrice, etc.)
 * @query   sortOrder - sort order (asc, desc)
 */
router.get('/:id/purchases', getPurchaseHistory);

module.exports = router;