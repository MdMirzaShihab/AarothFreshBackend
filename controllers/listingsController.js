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

    const { productId, pricing, qualityGrade, availability, description, deliveryOptions, minimumOrderValue, leadTime, discount, certifications } = req.body;

    // Verify the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Create listing
    const listing = await Listing.create({
      vendorId: req.user.vendorId,
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
