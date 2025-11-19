const Listing = require('../models/Listing');
const Product = require('../models/Product');
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

    const { productId, pricing, qualityGrade, availability, description, deliveryOptions, minimumOrderValue, leadTime, discount, certifications } = req.body;

    // Verify the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Validate pack-based selling configuration
    if (pricing && pricing.length > 0) {
      const priceConfig = pricing[0];

      if (priceConfig.enablePackSelling) {
        // Validate packSize is provided and valid
        if (!priceConfig.packSize || priceConfig.packSize <= 0) {
          return next(new ErrorResponse('Pack size must be greater than 0 when pack selling is enabled', 400));
        }

        // Validate minimumPacks is a whole number
        if (priceConfig.minimumPacks && !Number.isInteger(priceConfig.minimumPacks)) {
          return next(new ErrorResponse('Minimum packs must be a whole number', 400));
        }

        // Validate maximumPacks is a whole number and >= minimumPacks
        if (priceConfig.maximumPacks) {
          if (!Number.isInteger(priceConfig.maximumPacks)) {
            return next(new ErrorResponse('Maximum packs must be a whole number', 400));
          }
          if (priceConfig.maximumPacks < (priceConfig.minimumPacks || 1)) {
            return next(new ErrorResponse('Maximum packs must be greater than or equal to minimum packs', 400));
          }
        }

        // Validate inventory is sufficient for minimum packs
        const minRequiredInventory = priceConfig.packSize * (priceConfig.minimumPacks || 1);
        if (availability.quantityAvailable < minRequiredInventory) {
          return next(new ErrorResponse(
            `Insufficient inventory for pack-based selling. Need at least ${minRequiredInventory} ${availability.unit} ` +
            `for ${priceConfig.minimumPacks || 1} pack(s) of ${priceConfig.packSize} ${availability.unit} each`,
            400
          ));
        }

        // Validate inventory is a multiple of packSize (or at least 1 full pack)
        if (availability.quantityAvailable < priceConfig.packSize) {
          return next(new ErrorResponse(
            `Inventory must be at least ${priceConfig.packSize} ${availability.unit} to enable pack-based selling`,
            400
          ));
        }
      }
    }

    // Create listing (non-inventory based for MVP)
    const listing = await Listing.create({
      vendorId: req.user.vendorId,
      listingType: 'non_inventory', // All listings are non-inventory for MVP
      productId,
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
 * @desc    Get vendor's own listings with filtering and pagination
 * @route   GET /api/v1/listings/vendor
 * @access  Private/Vendor
 */
exports.getVendorListings = async (req, res, next) => {
  try {
    const { status = 'all', limit, page = 1, sort = '-createdAt' } = req.query;
    
    // Build query for vendor's own listings
    let query = { vendorId: req.user.vendorId };
    
    // Add status filter if specified and not 'all'
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Build the listing query
    let listingQuery = Listing.find(query)
      .populate('productId', 'name description category images')
      .sort(sort);
    
    // Add pagination if limit is specified
    if (limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      listingQuery = listingQuery.skip(skip).limit(parseInt(limit));
    }
    
    // Execute query
    const listings = await listingQuery;
    
    // Get total count for pagination info
    const totalCount = await Listing.countDocuments(query);

    res.status(200).json({
      success: true,
      count: listings.length,
      total: totalCount,
      pagination: limit ? {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < totalCount,
        hasPrev: parseInt(page) > 1
      } : undefined,
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
