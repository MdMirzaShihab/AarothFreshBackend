const express = require('express');
const {
  placeOrder,
  getOrders,
  approveOrder,
  updateOrderStatus,
  getOrder
} = require('../controllers/ordersController');
const { protect, authorize } = require('../middleware/auth');
const { requireBuyerApproval } = require('../middleware/approval');
const { body } = require('express-validator');

const router = express.Router();

// Validation rules for placing orders
const placeOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items array is required and cannot be empty'),
  body('items.*.listingId').isMongoId().withMessage('Valid listing ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
];

// Validation rules for status updates
const statusValidation = [
  body('status').isIn(['confirmed', 'delivered', 'cancelled']).withMessage('Invalid status')
];

// Apply authentication to all routes
router.use(protect);

/**
 * @route   GET /api/v1/orders
 * @desc    Get orders based on user role
 * @access  Private
 */
router.get('/', getOrders);

/**
 * @route   POST /api/v1/orders
 * @desc    Place a new order
 * @access  Private (Buyer users - Owner/Manager)
 */
router.post('/',
  authorize('buyerOwner', 'buyerManager'),
  requireBuyerApproval('place orders'),
  placeOrderValidation,
  placeOrder
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get single order
 * @access  Private
 */
router.get('/:id', getOrder);

/**
 * @route   POST /api/v1/orders/:id/approve
 * @desc    Approve a pending order
 * @access  Private (Buyer Owner only)
 */
router.post('/:id/approve', authorize('buyerOwner'), requireBuyerApproval('approve orders'), approveOrder);

/**
 * @route   PUT /api/v1/orders/:id/status
 * @desc    Update order status
 * @access  Private (Vendor only)
 */
router.put('/:id/status', 
  authorize('vendor'), 
  statusValidation,
  updateOrderStatus
);

module.exports = router;