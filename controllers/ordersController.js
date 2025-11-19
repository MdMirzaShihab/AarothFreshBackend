const Order = require("../models/Order");
const Listing = require("../models/Listing");
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
      const restaurantName = req.user.buyerId?.name || 'your restaurant';
      const verificationStatus = req.user.buyerId?.verificationStatus || 'pending';
      const adminNotes = req.user.buyerId?.adminNotes;
      
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
    const buyerId = req.user.buyerId;

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

    // Validate and enrich order items with pack-based selling information
    const enrichedItems = [];
    for (const item of items) {
      const itemListing = await Listing.findById(item.listingId)
        .populate('productId', 'name');

      if (!itemListing) {
        return next(new ErrorResponse(`Listing with ID ${item.listingId} not found`, 404));
      }

      // Check if listing is active and available
      if (itemListing.status !== 'active') {
        return next(new ErrorResponse(`Listing "${itemListing.productId.name}" is not currently available`, 400));
      }

      const pricing = itemListing.pricing && itemListing.pricing[0];

      // Validate pack-based selling
      if (pricing && pricing.enablePackSelling) {
        const packSize = pricing.packSize;

        // Check if quantity is a multiple of packSize
        const numberOfPacks = item.quantity / packSize;
        if (!Number.isInteger(numberOfPacks)) {
          return next(new ErrorResponse(
            `${itemListing.productId.name}: Quantity must be in multiples of ${packSize} ${pricing.unit}. ` +
            `You can order ${Math.floor(numberOfPacks)} or ${Math.ceil(numberOfPacks)} pack(s).`,
            400
          ));
        }

        // Validate against minimum packs
        if (pricing.minimumPacks && numberOfPacks < pricing.minimumPacks) {
          return next(new ErrorResponse(
            `${itemListing.productId.name}: Minimum order is ${pricing.minimumPacks} pack(s) (${pricing.minimumPacks * packSize} ${pricing.unit})`,
            400
          ));
        }

        // Validate against maximum packs
        if (pricing.maximumPacks && numberOfPacks > pricing.maximumPacks) {
          return next(new ErrorResponse(
            `${itemListing.productId.name}: Maximum order is ${pricing.maximumPacks} pack(s) (${pricing.maximumPacks * packSize} ${pricing.unit})`,
            400
          ));
        }

        // Check inventory availability
        if (item.quantity > itemListing.availability.quantityAvailable) {
          return next(new ErrorResponse(
            `${itemListing.productId.name}: Only ${itemListing.availability.quantityAvailable} ${pricing.unit} available ` +
            `(${Math.floor(itemListing.availability.quantityAvailable / packSize)} packs)`,
            400
          ));
        }

        // Enrich item with pack-based information
        enrichedItems.push({
          ...item,
          productId: itemListing.productId._id,
          productName: itemListing.productId.name,
          isPackBased: true,
          numberOfPacks,
          packSize,
          pricePerPack: pricing.pricePerBaseUnit * packSize,
          unitPrice: pricing.pricePerBaseUnit,
          unit: pricing.unit,
          qualityGrade: itemListing.qualityGrade
        });
      } else {
        // Standard non-pack based item
        // Check inventory availability
        if (item.quantity > itemListing.availability.quantityAvailable) {
          return next(new ErrorResponse(
            `${itemListing.productId.name}: Only ${itemListing.availability.quantityAvailable} ${itemListing.availability.unit} available`,
            400
          ));
        }

        enrichedItems.push({
          ...item,
          productId: itemListing.productId._id,
          productName: itemListing.productId.name,
          isPackBased: false,
          unitPrice: pricing ? pricing.pricePerBaseUnit || pricing.pricePerUnit : item.unitPrice,
          unit: pricing ? pricing.unit : itemListing.availability.unit,
          qualityGrade: itemListing.qualityGrade
        });
      }
    }

    // Create the order with enriched items
    const order = await Order.create({
      buyerId,
      vendorId,
      placedBy: req.user.id,
      items: enrichedItems, // Use enriched items with pack-based information
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
        .populate("buyerId", "name")
        .populate("vendorId", "businessName");
    } else if (req.user.role === "vendor") {
      orders = await Order.getByVendor(req.user.vendorId, req.query);
    } else {
      orders = await Order.getByRestaurant(req.user.buyerId, req.query);
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
    if (order.buyerId.toString() !== req.user.buyerId.toString()) {
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
        select: "vendorId profitAnalytics availability"
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

    // If order is being marked as delivered, update listing analytics
    if (status === 'delivered' && previousStatus !== 'delivered') {
      const listingUpdates = [];

      for (let item of order.items) {
        try {
          // Get the listing
          const listing = await Listing.findById(item.listingId._id);
          if (listing) {
            // Update listing statistics directly (non-inventory based for MVP)
            listing.totalQuantitySold = (listing.totalQuantitySold || 0) + item.quantity;
            listing.totalOrders = (listing.totalOrders || 0) + 1;

            // Update availability quantity (reduce stock)
            if (listing.availability && listing.availability.quantityAvailable !== undefined) {
              listing.availability.quantityAvailable = Math.max(
                0,
                listing.availability.quantityAvailable - item.quantity
              );

              // Auto-mark as out of stock if quantity reaches 0
              if (listing.availability.quantityAvailable === 0) {
                listing.status = 'out_of_stock';
              }
            }

            await listing.save();

            listingUpdates.push({
              listingId: listing._id,
              productName: item.productName,
              quantitySold: item.quantity,
              newAvailableQuantity: listing.availability.quantityAvailable,
              success: true
            });
          }
        } catch (updateError) {
          console.error(`Failed to update listing for item ${item._id}:`, updateError.message);

          listingUpdates.push({
            itemId: item._id,
            productName: item.productName,
            error: updateError.message,
            success: false
          });

          // Continue processing other items even if one fails
        }
      }

      await order.save();

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          order,
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
      .populate("buyerId", "name phone address")
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
      req.user.role === "buyerOwner" ||
      req.user.role === "buyerManager"
    ) {
      authorized =
        order.buyerId._id.toString() === req.user.buyerId.toString();
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
