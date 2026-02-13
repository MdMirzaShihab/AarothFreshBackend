const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');
const Listing = require('../models/Listing');
const Market = require('../models/Market');
const { ErrorResponse } = require('../middleware/error');

/**
 * @desc    Get all products (public)
 * @route   GET /api/v1/public/products
 * @access  Public
 */
exports.getPublicProducts = async (req, res, next) => {
  try {
    // Base query - only show active products
    let query = {
      isActive: true,
      adminStatus: 'active',
      isDeleted: { $ne: true }
    };

    // Search by name or tags
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { tags: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Filter by category (optional)
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    // Fetch products with category population
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .select('name description category images isOrganic isSeasonal variety')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get active listing count for each product
    const productIds = products.map(p => p._id);
    const listingCounts = await Listing.aggregate([
      {
        $match: {
          productId: { $in: productIds },
          status: 'active',
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$productId',
          listingCount: { $sum: 1 }
        }
      }
    ]);

    // Map listing counts to products
    const listingCountMap = {};
    listingCounts.forEach(item => {
      listingCountMap[item._id.toString()] = item.listingCount;
    });

    // Add listing count to each product
    const productsWithListings = products.map(product => ({
      ...product,
      listingCount: listingCountMap[product._id.toString()] || 0,
      hasListings: (listingCountMap[product._id.toString()] || 0) > 0
    }));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: productsWithListings
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
    let listingQuery = {
      productId: req.params.id,
      status: 'active'
    };

    // Optional market filter
    if (req.query.marketId) {
      listingQuery.marketId = req.query.marketId;
    }

    const listings = await Listing.find(listingQuery)
    .populate('vendorId', 'businessName')
    .populate('marketId', 'name location.city')
    .select('pricing qualityGrade availability vendorId marketId')
    .sort({ 'pricing.pricePerBaseUnit': 1 });

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
    let query = { status: 'active', isDeleted: { $ne: true } };

    // Build product-based filters (search, category, etc.)
    const productFilters = [];

    // Search by product name
    if (req.query.search) {
      productFilters.push({ name: { $regex: req.query.search, $options: 'i' } });
    }

    // Filter by category (skip if 'all')
    if (req.query.category && req.query.category !== 'all') {
      productFilters.push({ category: req.query.category });
    }

    // If any product filters exist, combine them with $and
    if (productFilters.length > 0) {
      const products = await Product.find({ $and: productFilters }).select('_id');
      query.productId = { $in: products.map(p => p._id) };
    }

    // Filter by vendor
    if (req.query.vendor) {
      query.vendorId = req.query.vendor;
    }

    // Filter by market
    if (req.query.marketId) {
      query.marketId = req.query.marketId;
    }

    // Location hierarchy filters - find markets matching location, then filter listings
    if (req.query.division || req.query.district || req.query.upazila || req.query.union) {
      const marketQuery = { isDeleted: { $ne: true } };
      if (req.query.division) marketQuery['location.division'] = req.query.division;
      if (req.query.district) marketQuery['location.district'] = req.query.district;
      if (req.query.upazila) marketQuery['location.upazila'] = req.query.upazila;
      if (req.query.union) marketQuery['location.union'] = req.query.union;

      // If a specific marketId was also provided, validate it matches the location
      if (query.marketId) {
        marketQuery._id = query.marketId;
      }

      const matchingMarkets = await Market.find(marketQuery).select('_id').lean();
      query.marketId = { $in: matchingMarkets.map(m => m._id) };
    }

    // Filter by specific product
    if (req.query.productId && req.query.productId !== 'all') {
      query.productId = req.query.productId;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query['pricing.pricePerBaseUnit'] = {};
      if (req.query.minPrice) query['pricing.pricePerBaseUnit'].$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query['pricing.pricePerBaseUnit'].$lte = parseFloat(req.query.maxPrice);
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
      .populate('marketId', 'name location.city location.address')
      .select('productId vendorId marketId pricing qualityGrade availability images createdAt rating')
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
      .populate('vendorId', 'businessName phone address rating verificationStatus')
      .populate('marketId', 'name description location');

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

    // Optional market filter
    if (req.query.marketId) {
      query.marketId = req.query.marketId;
    }

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
      .populate('marketId', 'name location.city location.address')
      .select('productId vendorId marketId pricing qualityGrade availability images createdAt rating featured')
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

/**
 * @desc    Get all active markets (public)
 * @route   GET /api/v1/public/markets
 * @access  Public
 */
exports.getPublicMarkets = async (req, res, next) => {
  try {
    // Build query - only show active and available markets
    let query = { isActive: true, isAvailable: true };

    // Allow filtering by status for more control
    if (req.query.status === 'active') {
      query.isActive = true;
    }

    // Filter by city if provided
    if (req.query.city) {
      query['location.city'] = { $regex: req.query.city, $options: 'i' };
    }

    // Search by market name
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    // Sort options
    let sortBy = {};
    if (req.query.sortBy) {
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      sortBy[req.query.sortBy] = sortOrder;
    } else {
      sortBy.name = 1; // Default: alphabetical
    }

    const markets = await Market.find(query)
      .select('name description image location slug')
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    const total = await Market.countDocuments(query);

    res.status(200).json({
      success: true,
      count: markets.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: markets
    });
  } catch (err) {
    next(err);
  }
};
