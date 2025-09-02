const Listing = require('../models/Listing');
const Product = require('../models/Product');
const VendorInventory = require('../models/VendorInventory');
const { ErrorResponse } = require('../middleware/error');
const { validationResult } = require('express-validator');
const { canUserCreateListings } = require('../middleware/approval');

/**
 * @desc    Create a new listing
 * @route   POST /api/v1/listings
 * @access  Private/Vendor
 */
exports.createListing = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    // Check if vendor business is verified to create listings
    if (!canUserCreateListings(req.user)) {
      const businessName = req.user.vendorId?.businessName || 'your vendor business';
      const verificationStatus = req.user.vendorId?.verificationStatus || 'pending';
      const adminNotes = req.user.vendorId?.adminNotes;
      
      let statusMessage = `Your vendor business "${businessName}" is ${verificationStatus}.`;
      
      if (verificationStatus === 'rejected') {
        statusMessage += adminNotes 
          ? ` Admin feedback: "${adminNotes}". Please address the issues mentioned and resubmit your application.`
          : ' Please review the issues mentioned by admin and resubmit your application.';
      } else if (verificationStatus === 'pending') {
        statusMessage += ' You cannot create listings until your business is verified by admin. Please wait for admin approval.';
      }
      
      statusMessage += ' You cannot create listings until approved.';
      
      return next(new ErrorResponse(statusMessage, 403));
    }

    const { productId, pricing, qualityGrade, availability, description, deliveryOptions, minimumOrderValue, leadTime, discount, certifications, inventoryId } = req.body;

    // Verify the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Verify inventory exists and vendor owns it
    let inventory = null;
    if (inventoryId) {
      inventory = await VendorInventory.findById(inventoryId);
      if (!inventory) {
        return next(new ErrorResponse('Inventory record not found', 404));
      }
      
      if (inventory.vendorId.toString() !== req.user.vendorId.toString()) {
        return next(new ErrorResponse('Not authorized to access this inventory record', 403));
      }
      
      if (inventory.productId.toString() !== productId.toString()) {
        return next(new ErrorResponse('Inventory product does not match listing product', 400));
      }
    } else {
      // Try to find inventory automatically
      inventory = await VendorInventory.findOne({ 
        vendorId: req.user.vendorId, 
        productId 
      });
      
      if (!inventory) {
        return next(new ErrorResponse('No inventory found for this product. Please add inventory first before creating a listing.', 400));
      }
    }

    // Validate that we have enough inventory for the listing
    if (availability.quantityAvailable > inventory.currentStock.totalQuantity) {
      return next(new ErrorResponse(
        `Cannot list ${availability.quantityAvailable} ${availability.unit}. Only ${inventory.currentStock.totalQuantity} available in inventory.`,
        400
      ));
    }

    // Check if units match
    if (availability.unit !== inventory.currentStock.unit) {
      return next(new ErrorResponse(
        `Listing unit (${availability.unit}) must match inventory unit (${inventory.currentStock.unit})`,
        400
      ));
    }

    // Create listing with inventory reference
    const listing = await Listing.create({
      vendorId: req.user.vendorId,
      productId,
      inventoryId: inventory._id,
      pricing,
      qualityGrade,
      availability,
      description,
      images: req.files ? req.files.map(file => ({ url: file.path })) : [],
      deliveryOptions,
      minimumOrderValue,
      leadTime,
      discount,
      certifications,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: listing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all active listings with filtering and search
 * @route   GET /api/v1/listings
 * @access  Private/Restaurant Users
 */
exports.getListings = async (req, res, next) => {
  try {
    const listings = await Listing.searchListings(req.query);

    res.status(200).json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get vendor's own listings
 * @route   GET /api/v1/listings/vendor
 * @access  Private/Vendor
 */
exports.getVendorListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ vendorId: req.user.vendorId })
      .populate('productId', 'name description category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a listing
 * @route   PUT /api/v1/listings/:id
 * @access  Private/Vendor
 */
exports.updateListing = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    // Check if vendor business is verified to modify listings
    if (!canUserCreateListings(req.user)) {
      const businessName = req.user.vendorId?.businessName || 'your vendor business';
      const verificationStatus = req.user.vendorId?.verificationStatus || 'pending';
      const adminNotes = req.user.vendorId?.adminNotes;
      
      let statusMessage = `Your vendor business "${businessName}" is ${verificationStatus}.`;
      
      if (verificationStatus === 'rejected') {
        statusMessage += adminNotes 
          ? ` Admin feedback: "${adminNotes}". Please address the issues mentioned and resubmit your application.`
          : ' Please review the issues mentioned by admin and resubmit your application.';
      } else if (verificationStatus === 'pending') {
        statusMessage += ' You cannot modify listings until your business is verified by admin. Please wait for admin approval.';
      }
      
      statusMessage += ' You cannot modify listings until approved.';
      
      return next(new ErrorResponse(statusMessage, 403));
    }

    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Make sure vendor owns the listing
    if (listing.vendorId.toString() !== req.user.vendorId.toString()) {
      return next(new ErrorResponse('Not authorized to update this listing', 403));
    }

    // Add updated by field
    req.body.updatedBy = req.user.id;

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({ url: file.path }));
      req.body.images = [...(listing.images || []), ...newImages];
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('productId', 'name description category');

    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a listing
 * @route   DELETE /api/v1/listings/:id
 * @access  Private/Vendor
 */
exports.deleteListing = async (req, res, next) => {
  try {
    // Check if vendor business is verified to delete listings
    if (!canUserCreateListings(req.user)) {
      const businessName = req.user.vendorId?.businessName || 'your vendor business';
      const verificationStatus = req.user.vendorId?.verificationStatus || 'pending';
      const adminNotes = req.user.vendorId?.adminNotes;
      
      let statusMessage = `Your vendor business "${businessName}" is ${verificationStatus}.`;
      
      if (verificationStatus === 'rejected') {
        statusMessage += adminNotes 
          ? ` Admin feedback: "${adminNotes}". Please address the issues mentioned and resubmit your application.`
          : ' Please review the issues mentioned by admin and resubmit your application.';
      } else if (verificationStatus === 'pending') {
        statusMessage += ' You cannot delete listings until your business is verified by admin. Please wait for admin approval.';
      }
      
      statusMessage += ' You cannot delete listings until approved.';
      
      return next(new ErrorResponse(statusMessage, 403));
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Make sure vendor owns the listing
    if (listing.vendorId.toString() !== req.user.vendorId.toString()) {
      return next(new ErrorResponse('Not authorized to delete this listing', 403));
    }

    await listing.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single listing
 * @route   GET /api/v1/listings/:id
 * @access  Private
 */
exports.getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('productId', 'name description category images')
      .populate('vendorId', 'businessName phone address');

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (err) {
    next(err);
  }
};
