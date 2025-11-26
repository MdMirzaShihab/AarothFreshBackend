const Listing = require('../models/Listing');
const Product = require('../models/Product');
const { ErrorResponse } = require('../middleware/error');
const { validationResult } = require('express-validator');

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

    const { productId, marketId, pricing, qualityGrade, availability, description, deliveryOptions, minimumOrderValue, leadTime, discount, certifications, minimumOrderQuantity, maximumOrderQuantity } = req.body;

    // Verify the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Verify the market exists and is available
    const Market = require('../models/Market');
    const market = await Market.findOne({
      _id: marketId,
      isDeleted: { $ne: true },
      isAvailable: true
    });

    if (!market) {
      return next(new ErrorResponse('Market not found or is not available', 404));
    }

    // Verify vendor operates in this market
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(req.user.vendorId);
    const hasMarket = vendor.markets.some(m => m.toString() === marketId.toString());

    if (!hasMarket) {
      return next(new ErrorResponse(
        `You cannot create listings in ${market.name}. Your vendor account does not operate in this market.`,
        403
      ));
    }

    // Build listing data
    const listingData = {
      vendorId: req.user.vendorId,
      productId,
      marketId,
      pricing,
      qualityGrade,
      availability,
      description,
      deliveryOptions,
      minimumOrderValue,
      leadTime,
      minimumOrderQuantity,
      maximumOrderQuantity,
      discount,
      certifications,
      createdBy: req.user.id
    };

    // Image upload with validation
    if (req.files && req.files.length > 0) {
      const images = req.files.map(file => {
        if (!file.path || typeof file.path !== 'string') {
          throw new ErrorResponse('Invalid image upload: missing or invalid file path', 400);
        }
        return { url: file.path };
      });
      listingData.images = images;
    }

    // Create listing
    const listing = await Listing.create(listingData);

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
    const { status = 'all', limit, page = 1, sort = '-createdAt', marketId } = req.query;

    // Build query for vendor's own listings
    let query = { vendorId: req.user.vendorId };

    // Add status filter if specified and not 'all'
    if (status && status !== 'all') {
      query.status = status;
    }

    // Add market filter if specified and not 'all'
    if (marketId && marketId !== 'all') {
      query.marketId = marketId;
    }

    // Build the listing query
    let listingQuery = Listing.find(query)
      .populate('productId', 'name description category images')
      .populate('marketId', 'name location.city location.address')
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

    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Make sure vendor owns the listing
    if (listing.vendorId.toString() !== req.user.vendorId.toString()) {
      return next(new ErrorResponse('Not authorized to update this listing', 403));
    }

    // If marketId is being updated, validate the new market
    if (req.body.marketId && req.body.marketId !== listing.marketId.toString()) {
      const Market = require('../models/Market');
      const Vendor = require('../models/Vendor');

      const market = await Market.findOne({
        _id: req.body.marketId,
        isDeleted: { $ne: true },
        isAvailable: true,
        isActive: true
      });

      if (!market) {
        return next(new ErrorResponse('Selected market not found or is not available', 404));
      }

      const vendor = await Vendor.findById(req.user.vendorId);
      const hasMarket = vendor.markets.some(m => m.toString() === req.body.marketId.toString());

      if (!hasMarket) {
        return next(new ErrorResponse(
          `Cannot move listing to ${market.name}. Your vendor account does not operate in this market.`,
          403
        ));
      }
    }

    // Add updated by field
    req.body.updatedBy = req.user.id;

    // Image handling with explicit control
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => {
        if (!file.path || typeof file.path !== 'string') {
          throw new ErrorResponse('Invalid image upload: missing or invalid file path', 400);
        }
        return { url: file.path };
      });

      if (req.body.replaceImages === true) {
        req.body.images = newImages;  // REPLACE
      } else {
        req.body.images = [...(listing.images || []), ...newImages];  // APPEND (default)
      }
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .populate('productId', 'name description category')
    .populate('marketId', 'name location.city');

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
      .populate('vendorId', 'businessName phone address')
      .populate('marketId', 'name description location');

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
