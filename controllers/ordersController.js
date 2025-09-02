const Order = require("../models/Order");
const Listing = require("../models/Listing");
const VendorInventory = require("../models/VendorInventory");
const { ErrorResponse } = require("../middleware/error");
const { validationResult } = require("express-validator");
const { canUserPlaceOrders } = require("../middleware/approval");

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

    // Check if restaurant business is verified to place orders
    if (!canUserPlaceOrders(req.user)) {
      const restaurantName = req.user.restaurantId?.name || 'your restaurant';
      const verificationStatus = req.user.restaurantId?.verificationStatus || 'pending';
      const adminNotes = req.user.restaurantId?.adminNotes;
      
      let statusMessage = `Your restaurant "${restaurantName}" is ${verificationStatus}.`;
      
      if (verificationStatus === 'rejected') {
        statusMessage += adminNotes 
          ? ` Admin feedback: "${adminNotes}". Please address the issues mentioned and resubmit your application.`
          : ' Please review the issues mentioned by admin and resubmit your application.';
      } else if (verificationStatus === 'pending') {
        statusMessage += ' You cannot place orders until your restaurant is verified by admin. Please wait for admin approval.';
      }
      
      statusMessage += ' You cannot place orders until approved.';
      
      return next(new ErrorResponse(statusMessage, 403));
    }

    const { items, deliveryInfo, paymentInfo, notes } = req.body;
    const restaurantId = req.user.restaurantId;

    // --- Start of new logic ---
    // Find the listing from the first item to get the vendorId
    if (!items || items.length === 0) {
      return next(
        new ErrorResponse("Order must contain at least one item", 400)
      );
    }

    const firstListingId = items[0].listingId;
    const listing = await Listing.findById(firstListingId);

    if (!listing) {
      return next(
        new ErrorResponse(`Listing with ID ${firstListingId} not found`, 404)
      );
    }
    const vendorId = listing.vendorId;
    // --- End of new logic ---

    // Create the order
    const order = await Order.create({
      restaurantId,
      vendorId, // <-- Add the vendorId here
      placedBy: req.user.id,
      items,
      deliveryInfo,
      paymentInfo,
      notes,
    });

    res.status(201).json({
      success: true,
      data: order,
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
    if (req.user.role === "admin") {
      orders = await Order.find()
        .populate("restaurantId", "name")
        .populate("vendorId", "businessName");
    } else if (req.user.role === "vendor") {
      orders = await Order.getByVendor(req.user.vendorId, req.query);
    } else {
      orders = await Order.getByRestaurant(req.user.restaurantId, req.query);
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
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
      return next(
        new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user owns this restaurant
    if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return next(
        new ErrorResponse("Not authorized to approve this order", 403)
      );
    }

    // Check if order is in pending_approval status
    if (order.status !== "pending_approval") {
      return next(new ErrorResponse("Order is not pending approval", 400));
    }

    order.status = "confirmed";
    order.approvedBy = req.user.id;
    order.approvalDate = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      data: order,
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

    const order = await Order.findById(req.params.id)
      .populate({
        path: "items.listingId",
        select: "vendorId inventoryId profitAnalytics",
        populate: {
          path: 'inventoryId',
          select: 'currentStock analytics'
        }
      })
      .populate('items.productId', 'name');

    if (!order) {
      return next(
        new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if vendor has items in this order
    const hasVendorItems = order.items.some(
      (item) =>
        item.listingId.vendorId.toString() === req.user.vendorId._id.toString()
    );

    if (!hasVendorItems) {
      return next(
        new ErrorResponse("Not authorized to update this order", 403)
      );
    }

    const previousStatus = order.status;
    order.status = status;
    order.updatedBy = req.user.id;

    // If order is being marked as delivered, update inventory and listing analytics
    if (status === 'delivered' && previousStatus !== 'delivered') {
      const inventoryUpdates = [];
      const listingUpdates = [];

      for (let item of order.items) {
        try {
          // Get the listing
          const listing = await Listing.findById(item.listingId._id);
          if (listing && listing.inventoryId) {
            // Record the sale in the listing (this will also update inventory)
            const saleResult = await listing.recordSale(
              item.quantity,
              item.unitPrice,
              order._id.toString()
            );

            inventoryUpdates.push({
              itemId: item._id,
              productName: item.productName,
              quantitySold: item.quantity,
              salePrice: item.unitPrice,
              success: true
            });

            listingUpdates.push({
              listingId: listing._id,
              newAvailableQuantity: saleResult.updatedListing.availability.quantityAvailable,
              success: true
            });
          }
        } catch (inventoryError) {
          console.error(`Failed to update inventory for item ${item._id}:`, inventoryError.message);
          
          inventoryUpdates.push({
            itemId: item._id,
            productName: item.productName,
            error: inventoryError.message,
            success: false
          });

          // Continue processing other items even if one fails
        }
      }

      await order.save();

      res.status(200).json({
        success: true,
        message: 'Order status updated and inventory synchronized',
        data: {
          order,
          inventoryUpdates,
          listingUpdates
        }
      });
    } else {
      await order.save();

      res.status(200).json({
        success: true,
        data: order,
      });
    }
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
      .populate("restaurantId", "name phone address")
      .populate("vendorId", "businessName phone address")
      .populate("placedBy", "name email")
      .populate("approvedBy", "name email")
      .populate("items.listingId", "productId")
      .populate("items.productId", "name");

    if (!order) {
      return next(
        new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
      );
    }

    // Authorization check
    let authorized = false;

    if (req.user.role === "admin") {
      authorized = true;
    } else if (
      req.user.role === "restaurantOwner" ||
      req.user.role === "restaurantManager"
    ) {
      authorized =
        order.restaurantId._id.toString() === req.user.restaurantId.toString();
    } else if (req.user.role === "vendor") {
      authorized =
        order.vendorId._id.toString() === req.user.vendorId.toString();
    }

    if (!authorized) {
      return next(new ErrorResponse("Not authorized to view this order", 403));
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
};
