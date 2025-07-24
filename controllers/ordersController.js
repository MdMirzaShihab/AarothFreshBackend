const Order = require('../models/Order');
const Listing = require('../models/Listing');
const { ErrorResponse } = require('../middleware/error');
const { validationResult } = require('express-validator');

/**
 * @desc    Place a new order
 * @route   POST /api/v1/orders
 * @access  Private/Restaurant Users (Owner/Manager)
 */
exports.placeOrder = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const { items, deliveryInfo, paymentInfo, notes } = req.body;
    const restaurantId = req.user.restaurantId;

    // Create the order
    const order = await Order.create({
      restaurantId,
      placedBy: req.user.id,
      items,
      deliveryInfo,
      paymentInfo,
      notes
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get orders based on user role
 * @route   GET /api/v1/orders
 * @access  Private
 */
exports.getOrders = async (req, res, next) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = await Order.find().populate('restaurantId', 'name').populate('vendorId', 'businessName');
    } else if (req.user.role === 'vendor') {
      orders = await Order.getByVendor(req.user.vendorId, req.query);
    } else {
      orders = await Order.getByRestaurant(req.user.restaurantId, req.query);
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Approve a pending order
 * @route   POST /api/v1/orders/:id/approve
 * @access  Private/Owner
 */
exports.approveOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Check if user owns this restaurant
    if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return next(new ErrorResponse('Not authorized to approve this order', 403));
    }

    // Check if order is in pending_approval status
    if (order.status !== 'pending_approval') {
      return next(new ErrorResponse('Order is not pending approval', 400));
    }

    order.status = 'confirmed';
    order.approvedBy = req.user.id;
    order.approvalDate = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/v1/orders/:id/status
 * @access  Private/Vendor
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Check if vendor has items in this order
    const hasVendorItems = order.items.some(item => 
      item.listingId.vendorId.toString() === req.user.vendorId.toString()
    );

    if (!hasVendorItems) {
      return next(new ErrorResponse('Not authorized to update this order', 403));
    }

    order.status = status;
    order.updatedBy = req.user.id;
    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single order
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name phone address')
      .populate('vendorId', 'businessName phone address')
      .populate('placedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('items.listingId', 'productId')
      .populate('items.productId', 'name');

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Authorization check
    let authorized = false;
    
    if (req.user.role === 'admin') {
      authorized = true;
    } else if (req.user.role === 'owner' || req.user.role === 'manager') {
      authorized = order.restaurantId._id.toString() === req.user.restaurantId.toString();
    } else if (req.user.role === 'vendor') {
      authorized = order.vendorId._id.toString() === req.user.vendorId.toString();
    }

    if (!authorized) {
      return next(new ErrorResponse('Not authorized to view this order', 403));
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};
