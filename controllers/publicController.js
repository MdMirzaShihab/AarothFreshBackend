const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');
const Listing = require('../models/Listing');
const { ErrorResponse } = require('../middleware/error');

/**
 * @desc    Get all products (public)
 * @route   GET /api/v1/public/products
 * @access  Public
 */
exports.getPublicProducts = async (req, res, next) => {
  try {
    let query = {};

    // Search by name
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate('category', 'name description')
      .select('name description category images')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: products
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single product (public)
 * @route   GET /api/v1/public/products/:id
 * @access  Public
 */
exports.getPublicProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name description')
      .select('name description category images');

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // Get active listings for this product
    const listings = await Listing.find({ 
      productId: req.params.id, 
      status: 'active' 
    })
    .populate('vendorId', 'businessName')
    .select('pricing qualityGrade availability vendorId')
    .sort({ 'pricing.pricePerUnit': 1 });

    res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        listings
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all categories (public)
 * @route   GET /api/v1/public/categories
 * @access  Public
 */
exports.getPublicCategories = async (req, res, next) => {
  try {
    const categories = await ProductCategory.find({ isActive: true, parentCategory: null })
      .select('name description slug image')
      .sort({ sortOrder: 1, name: 1 });

    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ category: category._id });
        return {
          ...category.toObject(),
          productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all active listings (public)
 * @route   GET /api/v1/public/listings
 * @access  Public
 */
exports.getPublicListings = async (req, res, next) => {
  try {
    let query = { status: 'active' };

    // Search by product name
    if (req.query.search) {
      const products = await Product.find({
        name: { $regex: req.query.search, $options: 'i' }
      }).select('_id');
      query.productId = { $in: products.map(p => p._id) };
    }

    // Filter by category
    if (req.query.category) {
      const products = await Product.find({ category: req.query.category }).select('_id');
      query.productId = { $in: products.map(p => p._id) };
    }

    // Filter by vendor
    if (req.query.vendor) {
      query.vendorId = req.query.vendor;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query['pricing.pricePerUnit'] = {};
      if (req.query.minPrice) query['pricing.pricePerUnit'].$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query['pricing.pricePerUnit'].$lte = parseFloat(req.query.maxPrice);
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Sort options
    let sortBy = {};
    if (req.query.sort) {
      const sortField = req.query.sort.replace('-', '');
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sortBy[sortField] = sortOrder;
    } else {
      sortBy.createdAt = -1; // Default: newest first
    }

    const listings = await Listing.find(query)
      .populate({
        path: 'productId',
        select: 'name description category images',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('vendorId', 'businessName rating')
      .select('productId vendorId pricing qualityGrade availability images createdAt rating')
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    const total = await Listing.countDocuments(query);

    res.status(200).json({
      success: true,
      count: listings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: listings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single listing (public)
 * @route   GET /api/v1/public/listings/:id
 * @access  Public
 */
exports.getPublicListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate({
        path: 'productId',
        select: 'name description category images',
        populate: {
          path: 'category',
          select: 'name description'
        }
      })
      .populate('vendorId', 'businessName phone address rating verificationStatus');

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Only show active listings to public
    if (listing.status !== 'active') {
      return next(new ErrorResponse('Listing is not available', 404));
    }

    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get featured listings (public)
 * @route   GET /api/v1/public/featured-listings
 * @access  Public
 */
exports.getFeaturedListings = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Query for active and featured listings
    const query = { 
      status: 'active', 
      featured: true 
    };

    const featuredListings = await Listing.find(query)
      .populate({
        path: 'productId',
        select: 'name description category images',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('vendorId', 'businessName rating verificationStatus')
      .select('productId vendorId pricing qualityGrade availability images createdAt rating featured')
      .sort({ createdAt: -1 }) // Newest featured first
      .skip(skip)
      .limit(limit);

    const total = await Listing.countDocuments(query);

    res.status(200).json({
      success: true,
      count: featuredListings.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: featuredListings
    });
  } catch (err) {
    next(err);
  }
};
