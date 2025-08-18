const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const Listing = require("../models/Listing");
const Settings = require("../models/Settings");
const AuditLog = require("../models/AuditLog");
const { ErrorResponse } = require("../middleware/error");
const { validationResult } = require("express-validator");

// ======================
// PRODUCT MANAGEMENT
// ======================

/**
 * @desc    Create a new product
 * @route   POST /api/v1/admin/products
 * @access  Private/Admin
 */
exports.createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    req.body.createdBy = req.user.id;
    const product = await Product.create(req.body);

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name")
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      data: populatedProduct,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all products
 * @route   GET /api/v1/admin/products
 * @access  Private/Admin
 */
exports.getProducts = async (req, res, next) => {
  try {
    let query = {};

    // Search by name
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
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
      .populate("category", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single product
 * @route   GET /api/v1/admin/products/:id
 * @access  Private/Admin
 */
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name description")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!product) {
      return next(
        new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/v1/admin/products/:id
 * @access  Private/Admin
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    req.body.updatedBy = req.user.id;
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
      );
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("category", "name")
      .populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/v1/admin/products/:id
 * @access  Private/Admin
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if product has active listings
    const activeListings = await Listing.countDocuments({
      productId: req.params.id,
      status: "active",
    });

    if (activeListings > 0) {
      return next(
        new ErrorResponse("Cannot delete product with active listings", 400)
      );
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// CATEGORY MANAGEMENT
// ======================

/**
 * @desc    Create a new category
 * @route   POST /api/v1/admin/categories
 * @access  Private/Admin
 */
exports.createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    req.body.createdBy = req.user.id;
    const category = await ProductCategory.create(req.body);

    const populatedCategory = await ProductCategory.findById(
      category._id
    ).populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      data: populatedCategory,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all categories
 * @route   GET /api/v1/admin/categories
 * @access  Private/Admin
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ProductCategory.find()
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single category
 * @route   GET /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
exports.getCategory = async (req, res, next) => {
  try {
    const category = await ProductCategory.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
      );
    }

    // Get products count in this category
    const productsCount = await Product.countDocuments({
      category: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        productsCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    req.body.updatedBy = req.user.id;
    let category = await ProductCategory.findById(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
      );
    }

    category = await ProductCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await ProductCategory.findById(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if category has products
    const productsCount = await Product.countDocuments({
      category: req.params.id,
    });

    if (productsCount > 0) {
      return next(
        new ErrorResponse("Cannot delete category with existing products", 400)
      );
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// USER MANAGEMENT
// ======================

/**
 * @desc    Get all users
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    let query = {};

    // Filter by role
    if (req.query.role) {
      query.role = req.query.role;
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true";
    }

    // Search by name or email
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .populate("vendorId", "businessName isVerified")
      .populate("restaurantId", "name isVerified")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/v1/admin/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("vendorId")
      .populate("restaurantId");

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/v1/admin/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    let user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Don't allow password updates through this endpoint
    delete req.body.password;

    const updates = { ...req.body };

    // If role is being changed, role-specific rules
    if (updates.role && updates.role !== user.role) {
      if (updates.role === "vendor") {
        if (!updates.vendorId) {
          return next(
            new ErrorResponse(
              "vendorId is required when changing role to vendor",
              400
            )
          );
        }
        updates.restaurantId = undefined; // Unset restaurantId
      } else if (
        updates.role === "restaurantOwner" ||
        updates.role === "restaurantManager"
      ) {
        if (!updates.restaurantId) {
          return next(
            new ErrorResponse(
              "restaurantId is required when changing role to restaurantOwner or restaurantManager",
              400
            )
          );
        }
        updates.vendorId = undefined; // Unset vendorId
      } else if (updates.role === "admin") {
        updates.vendorId = undefined;
        updates.restaurantId = undefined;
      }
    }

    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("vendorId")
      .populate("restaurantId");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user has active orders
    const activeOrders = await Order.countDocuments({
      $or: [{ placedBy: req.params.id }, { approvedBy: req.params.id }],
      status: { $in: ["pending_approval", "confirmed"] },
    });

    if (activeOrders > 0) {
      return next(
        new ErrorResponse("Cannot delete user with active orders", 400)
      );
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// VENDOR MANAGEMENT
// ======================

/**
 * @desc    Get all vendors
 * @route   GET /api/v1/admin/vendors
 * @access  Private/Admin
 */
exports.getAllVendors = async (req, res, next) => {
  try {
    let query = {};

    // Filter by verification status
    if (req.query.isVerified !== undefined) {
      query.isVerified = req.query.isVerified === "true";
    }

    // Search by business name
    if (req.query.search) {
      query.businessName = { $regex: req.query.search, $options: "i" };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const vendors = await Vendor.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Vendor.countDocuments(query);

    res.status(200).json({
      success: true,
      count: vendors.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: vendors,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// RESTAURANT MANAGEMENT
// ======================

/**
 * @desc    Get all restaurants
 * @route   GET /api/v1/admin/restaurants
 * @access  Private/Admin
 */
exports.getAllRestaurants = async (req, res, next) => {
  try {
    let query = {};

    // Filter by verification status
    if (req.query.isVerified !== undefined) {
      query.isVerified = req.query.isVerified === "true";
    }

    // Search by restaurant name
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const restaurants = await Restaurant.find(query)
      .populate("createdBy", "name email")
      .populate("managers", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Restaurant.countDocuments(query);

    res.status(200).json({
      success: true,
      count: restaurants.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: restaurants,
    });
  } catch (err) {
    next(err);
  }
};


// ======================
// DASHBOARD STATS
// ======================

/**
 * @desc    Get comprehensive dashboard overview with real-time analytics
 * @route   GET /api/v1/admin/dashboard/overview
 * @access  Private/Admin
 */
exports.getDashboardOverview = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Parallel execution for better performance
    const [
      userStats,
      productStats,
      orderStats,
      recentActivity
    ] = await Promise.all([
      // User Analytics
      User.aggregate([
        {
          $facet: {
            totalVendors: [
              { $match: { role: 'vendor', isDeleted: { $ne: true } } },
              { $count: 'count' }
            ],
            totalRestaurants: [
              { $match: { role: { $in: ['restaurantOwner', 'restaurantManager'] }, isDeleted: { $ne: true } } },
              { $group: { _id: '$restaurantId' } },
              { $count: 'count' }
            ],
            pendingApprovals: [
              { $match: { approvalStatus: 'pending', isDeleted: { $ne: true } } },
              { $count: 'count' }
            ],
            activeUsers: [
              { $match: { isActive: true, isDeleted: { $ne: true } } },
              { $count: 'count' }
            ],
            newUsersToday: [
              { $match: { createdAt: { $gte: startOfDay }, isDeleted: { $ne: true } } },
              { $count: 'count' }
            ]
          }
        }
      ]),

      // Product Analytics
      Product.aggregate([
        {
          $facet: {
            totalProducts: [
              { $match: { isDeleted: { $ne: true } } },
              { $count: 'count' }
            ],
            totalCategories: [
              { $lookup: { from: 'productcategories', localField: 'category', foreignField: '_id', as: 'category' } },
              { $group: { _id: '$category._id' } },
              { $count: 'count' }
            ],
            activeListings: [
              { $lookup: { from: 'listings', localField: '_id', foreignField: 'productId', as: 'listings' } },
              { $unwind: '$listings' },
              { $match: { 'listings.status': 'active', 'listings.isDeleted': { $ne: true } } },
              { $count: 'count' }
            ],
            featuredListings: [
              { $lookup: { from: 'listings', localField: '_id', foreignField: 'productId', as: 'listings' } },
              { $unwind: '$listings' },
              { $match: { 'listings.featured': true, 'listings.isDeleted': { $ne: true } } },
              { $count: 'count' }
            ]
          }
        }
      ]),

      // Order Analytics
      Order.aggregate([
        {
          $facet: {
            todayOrders: [
              { $match: { createdAt: { $gte: startOfDay } } },
              { $count: 'count' }
            ],
            weeklyOrders: [
              { $match: { createdAt: { $gte: startOfWeek } } },
              { $count: 'count' }
            ],
            monthlyOrders: [
              { $match: { createdAt: { $gte: startOfMonth } } },
              { $count: 'count' }
            ],
            totalRevenue: [
              { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ],
            revenueToday: [
              { $match: { createdAt: { $gte: startOfDay } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]
          }
        }
      ]),

      // Recent Activity
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            type: {
              $switch: {
                branches: [
                  { case: { $in: ['$action', ['user_created', 'user_approved', 'user_rejected']] }, then: 'user_registration' },
                  { case: { $in: ['$entityType', ['Order']] }, then: 'order_placed' },
                  { case: { $in: ['$entityType', ['Listing']] }, then: 'listing_created' }
                ],
                default: 'system_activity'
              }
            },
            description: 1,
            timestamp: '$createdAt',
            userId: '$user._id',
            userName: '$user.name'
          }
        },
        { $sort: { timestamp: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Format response data
    const response = {
      users: {
        totalVendors: userStats[0]?.totalVendors?.[0]?.count || 0,
        totalRestaurants: userStats[0]?.totalRestaurants?.[0]?.count || 0,
        pendingApprovals: userStats[0]?.pendingApprovals?.[0]?.count || 0,
        activeUsers: userStats[0]?.activeUsers?.[0]?.count || 0,
        newUsersToday: userStats[0]?.newUsersToday?.[0]?.count || 0
      },
      products: {
        totalProducts: productStats[0]?.totalProducts?.[0]?.count || 0,
        totalCategories: productStats[0]?.totalCategories?.[0]?.count || 0,
        activeListings: productStats[0]?.activeListings?.[0]?.count || 0,
        featuredListings: productStats[0]?.featuredListings?.[0]?.count || 0
      },
      orders: {
        todayOrders: orderStats[0]?.todayOrders?.[0]?.count || 0,
        weeklyOrders: orderStats[0]?.weeklyOrders?.[0]?.count || 0,
        monthlyOrders: orderStats[0]?.monthlyOrders?.[0]?.count || 0,
        totalRevenue: orderStats[0]?.totalRevenue?.[0]?.total || 0,
        revenueToday: orderStats[0]?.revenueToday?.[0]?.total || 0
      },
      recentActivity: recentActivity || []
    };

    res.status(200).json({
      success: true,
      data: response,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get dashboard statistics (legacy endpoint)
 * @route   GET /api/v1/admin/dashboard
 * @access  Private/Admin
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalVendors,
      totalRestaurants,
      totalProducts,
      totalCategories,
      totalListings,
      totalOrders,
      recentOrders,
      orderStats,
      verificationStats,
    ] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments(),
      Restaurant.countDocuments(),
      Product.countDocuments(),
      ProductCategory.countDocuments(),
      Listing.countDocuments(),
      Order.countDocuments(),
      Order.find()
        .populate("restaurantId", "name")
        .populate("placedBy", "name")
        .sort({ createdAt: -1 })
        .limit(5),
      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
      ]),
      Promise.all([
        Vendor.countDocuments({ isVerified: false }),
        Restaurant.countDocuments({ isVerified: false }),
      ]),
    ]);

    const stats = {
      totalUsers,
      totalVendors,
      totalRestaurants,
      totalProducts,
      totalCategories,
      totalListings,
      totalOrders,
      recentOrders,
      ordersByStatus: orderStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount,
        };
        return acc;
      }, {}),
      pendingVerifications: {
        vendors: verificationStats[0],
        restaurants: verificationStats[1],
      },
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};


/**
 * @desc    Get all vendors pending verification
 * @route   GET /api/v1/admin/vendors/pending
 * @access  Private/Admin
 */
exports.getPendingVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({ isVerified: false })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all restaurants pending verification
 * @route   GET /api/v1/admin/restaurants/pending
 * @access  Private/Admin
 */
exports.getPendingRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find({ isVerified: false })
      .populate('createdBy', 'name email')
      .populate('managers', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// FEATURED LISTINGS MANAGEMENT
// ======================

/**
 * @desc    Toggle featured status for a listing
 * @route   PUT /api/v1/admin/listings/:id/featured
 * @access  Private/Admin
 */
exports.toggleFeaturedListing = async (req, res, next) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Only allow featuring of active listings
    if (listing.status !== 'active') {
      return next(new ErrorResponse('Only active listings can be featured', 400));
    }

    // Toggle the featured status
    listing.featured = !listing.featured;
    listing.updatedBy = req.user.id;

    await listing.save();

    // Populate for response
    listing = await Listing.findById(listing._id)
      .populate({
        path: 'productId',
        select: 'name description category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('vendorId', 'businessName')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Listing ${listing.featured ? 'featured' : 'unfeatured'} successfully`,
      data: listing
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// RESTAURANT MANAGEMENT
// ======================

/**
 * @desc    Create restaurant owner and restaurant (Admin only)
 * @route   POST /api/v1/admin/restaurant-owners
 * @access  Private/Admin
 */
exports.createRestaurantOwner = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const {
      name,
      email,
      phone,
      password,
      restaurantName,
      ownerName,
      address,
      tradeLicenseNo
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: String(email) },
        { phone: String(phone) }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return next(new ErrorResponse('User with this email already exists', 400));
      }
      if (existingUser.phone === phone) {
        return next(new ErrorResponse('User with this phone number already exists', 400));
      }
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      name: restaurantName,
      ownerName: ownerName || name,
      email,
      phone,
      address,
      tradeLicenseNo,
      createdBy: req.user.id
    });

    // Create restaurant owner user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'restaurantOwner',
      restaurantId: restaurant._id
    });

    // Update restaurant with user reference
    restaurant.createdBy = user._id;
    await restaurant.save();

    // Populate response
    const populatedUser = await User.findById(user._id)
      .populate('restaurantId', 'name email phone address')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'Restaurant owner created successfully',
      data: populatedUser
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create restaurant manager (Admin only)
 * @route   POST /api/v1/admin/restaurant-managers
 * @access  Private/Admin
 */
exports.createRestaurantManager = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const {
      name,
      email,
      phone,
      password,
      restaurantId
    } = req.body;

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return next(new ErrorResponse('Restaurant not found', 404));
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: String(email) },
        { phone: String(phone) }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return next(new ErrorResponse('User with this email already exists', 400));
      }
      if (existingUser.phone === phone) {
        return next(new ErrorResponse('User with this phone number already exists', 400));
      }
    }

    // Create restaurant manager user
    const manager = await User.create({
      name,
      email,
      password,
      phone,
      role: 'restaurantManager',
      restaurantId: restaurant._id
    });

    // Add manager to restaurant's managers array
    await Restaurant.findByIdAndUpdate(
      restaurant._id,
      { $push: { managers: manager._id } }
    );

    // Populate response
    const populatedManager = await User.findById(manager._id)
      .populate('restaurantId', 'name email phone address')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'Restaurant manager created successfully',
      data: populatedManager
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// UNIFIED APPROVAL MANAGEMENT
// ======================

/**
 * @desc    Get all pending approvals
 * @route   GET /api/v1/admin/approvals
 * @access  Private/Admin
 */
exports.getAllApprovals = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let approvals = [];

    if (!type || type === 'vendors') {
      const pendingVendors = await User.find({
        role: 'vendor',
        approvalStatus: 'pending',
        isDeleted: { $ne: true }
      })
      .populate('vendorId', 'businessName tradeLicenseNo address')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      approvals = approvals.concat(pendingVendors.map(user => ({
        ...user.toObject(),
        type: 'vendor'
      })));
    }

    if (!type || type === 'restaurants') {
      const pendingRestaurants = await User.find({
        role: { $in: ['restaurantOwner', 'restaurantManager'] },
        approvalStatus: 'pending',
        isDeleted: { $ne: true }
      })
      .populate('restaurantId', 'name tradeLicenseNo address')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      approvals = approvals.concat(pendingRestaurants.map(user => ({
        ...user.toObject(),
        type: 'restaurant'
      })));
    }

    res.status(200).json({
      success: true,
      count: approvals.length,
      data: approvals
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Approve vendor
 * @route   PUT /api/v1/admin/approvals/vendor/:id/approve
 * @access  Private/Admin
 */
exports.approveVendor = async (req, res, next) => {
  try {
    const { approvalNotes } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'vendor') {
      return next(new ErrorResponse('Vendor not found', 404));
    }

    // Update user approval status
    user.approvalStatus = 'approved';
    user.approvalDate = new Date();
    user.approvedBy = req.user.id;
    user.approvalNotes = approvalNotes;
    user.lastModifiedBy = req.user.id;
    await user.save();

    // Update vendor verification status
    if (user.vendorId) {
      await Vendor.findByIdAndUpdate(user.vendorId, {
        isVerified: true,
        verificationDate: new Date(),
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date()
      });
    }

    // Log the approval action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'user_approved',
      entityType: 'User',
      entityId: user._id,
      description: `Approved vendor: ${user.name}`,
      reason: approvalNotes,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    const populatedUser = await User.findById(user._id)
      .populate('vendorId')
      .select('-password');

    res.status(200).json({
      success: true,
      message: 'Vendor approved successfully',
      data: populatedUser
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reject vendor
 * @route   PUT /api/v1/admin/approvals/vendor/:id/reject
 * @access  Private/Admin
 */
exports.rejectVendor = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return next(new ErrorResponse('Rejection reason is required', 400));
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'vendor') {
      return next(new ErrorResponse('Vendor not found', 404));
    }

    user.approvalStatus = 'rejected';
    user.approvalDate = new Date();
    user.approvedBy = req.user.id;
    user.rejectionReason = rejectionReason;
    user.lastModifiedBy = req.user.id;
    await user.save();

    // Log the rejection action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'user_rejected',
      entityType: 'User',
      entityId: user._id,
      description: `Rejected vendor: ${user.name}`,
      reason: rejectionReason,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    res.status(200).json({
      success: true,
      message: 'Vendor rejected successfully',
      data: { rejectionReason }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Approve restaurant
 * @route   PUT /api/v1/admin/approvals/restaurant/:id/approve
 * @access  Private/Admin
 */
exports.approveRestaurant = async (req, res, next) => {
  try {
    const { approvalNotes } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user || !['restaurantOwner', 'restaurantManager'].includes(user.role)) {
      return next(new ErrorResponse('Restaurant user not found', 404));
    }

    user.approvalStatus = 'approved';
    user.approvalDate = new Date();
    user.approvedBy = req.user.id;
    user.approvalNotes = approvalNotes;
    user.lastModifiedBy = req.user.id;
    await user.save();

    // Update restaurant verification status
    if (user.restaurantId) {
      await Restaurant.findByIdAndUpdate(user.restaurantId, {
        isVerified: true,
        verificationDate: new Date(),
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date()
      });
    }

    // Log the approval action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'user_approved',
      entityType: 'User',
      entityId: user._id,
      description: `Approved restaurant user: ${user.name}`,
      reason: approvalNotes,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    const populatedUser = await User.findById(user._id)
      .populate('restaurantId')
      .select('-password');

    res.status(200).json({
      success: true,
      message: 'Restaurant user approved successfully',
      data: populatedUser
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reject restaurant
 * @route   PUT /api/v1/admin/approvals/restaurant/:id/reject
 * @access  Private/Admin
 */
exports.rejectRestaurant = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return next(new ErrorResponse('Rejection reason is required', 400));
    }

    const user = await User.findById(req.params.id);
    if (!user || !['restaurantOwner', 'restaurantManager'].includes(user.role)) {
      return next(new ErrorResponse('Restaurant user not found', 404));
    }

    user.approvalStatus = 'rejected';
    user.approvalDate = new Date();
    user.approvedBy = req.user.id;
    user.rejectionReason = rejectionReason;
    user.lastModifiedBy = req.user.id;
    await user.save();

    // Log the rejection action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'user_rejected',
      entityType: 'User',
      entityId: user._id,
      description: `Rejected restaurant user: ${user.name}`,
      reason: rejectionReason,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant user rejected successfully',
      data: { rejectionReason }
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// ENHANCED DELETION PROTECTION
// ======================

/**
 * @desc    Safe delete product with dependency check
 * @route   DELETE /api/v1/admin/products/:id/safe-delete
 * @access  Private/Admin
 */
exports.safeDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Check for active listings
    const activeListings = await Listing.countDocuments({
      productId: req.params.id,
      status: { $ne: 'discontinued' },
      isDeleted: { $ne: true }
    });

    if (activeListings > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete product with active listings',
        dependencies: {
          type: 'listings',
          count: activeListings
        },
        suggestions: [
          'Discontinue all active listings first',
          'Or use soft delete to preserve data integrity'
        ]
      });
    }

    // Perform soft delete
    product.isDeleted = true;
    product.deletedAt = new Date();
    product.deletedBy = req.user.id;
    product.adminStatus = 'discontinued';
    await product.save();

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'product_deleted',
      entityType: 'Product',
      entityId: product._id,
      description: `Soft deleted product: ${product.name}`,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: { deletedId: product._id }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Safe delete category with dependency check
 * @route   DELETE /api/v1/admin/categories/:id/safe-delete
 * @access  Private/Admin
 */
exports.safeDeleteCategory = async (req, res, next) => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    if (!category) {
      return next(new ErrorResponse('Category not found', 404));
    }

    // Check for products in this category
    const productsInCategory = await Product.countDocuments({
      category: req.params.id,
      isDeleted: { $ne: true }
    });

    if (productsInCategory > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with existing products',
        dependencies: {
          type: 'products',
          count: productsInCategory
        },
        suggestions: [
          'Move products to another category first',
          'Or delete all products in this category'
        ]
      });
    }

    await category.deleteOne();

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'category_deleted',
      entityType: 'ProductCategory',
      entityId: category._id,
      description: `Deleted category: ${category.name}`,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: { deletedId: category._id }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Safe delete vendor with dependency check
 * @route   PUT /api/v1/admin/vendors/:id/deactivate
 * @access  Private/Admin
 */
exports.deactivateVendor = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return next(new ErrorResponse('Vendor not found', 404));
    }

    // Check for active listings
    const activeListings = await Listing.countDocuments({
      vendorId: req.params.id,
      status: 'active',
      isDeleted: { $ne: true }
    });

    // Check for pending orders
    const pendingOrders = await Order.countDocuments({
      vendorId: req.params.id,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    });

    if (activeListings > 0 || pendingOrders > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate vendor with active operations',
        dependencies: {
          activeListings,
          pendingOrders
        },
        suggestions: [
          'Complete all pending orders first',
          'Deactivate all active listings',
          'Contact vendor to resolve ongoing operations'
        ]
      });
    }

    // Deactivate vendor
    vendor.isActive = false;
    vendor.statusUpdatedBy = req.user.id;
    vendor.statusUpdatedAt = new Date();
    vendor.adminNotes = reason;
    await vendor.save();

    // Deactivate associated user
    await User.findOneAndUpdate(
      { vendorId: vendor._id },
      { 
        isActive: false, 
        lastModifiedBy: req.user.id,
        adminNotes: reason
      }
    );

    // Log the deactivation
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'vendor_deactivated',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Deactivated vendor: ${vendor.businessName}`,
      reason,
      severity: 'high',
      impactLevel: 'major'
    });

    res.status(200).json({
      success: true,
      message: 'Vendor deactivated successfully',
      data: vendor
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// LISTING MANAGEMENT
// ======================

/**
 * @desc    Flag a listing
 * @route   PUT /api/v1/admin/listings/:id/flag
 * @access  Private/Admin
 */
exports.flagListing = async (req, res, next) => {
  try {
    const { flagReason, moderationNotes } = req.body;
    
    if (!flagReason) {
      return next(new ErrorResponse('Flag reason is required', 400));
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(new ErrorResponse('Listing not found', 404));
    }

    listing.isFlagged = true;
    listing.flagReason = flagReason;
    listing.moderatedBy = req.user.id;
    listing.moderationNotes = moderationNotes;
    listing.lastStatusUpdate = new Date();
    await listing.save();

    // Log the flagging action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'listing_flagged',
      entityType: 'Listing',
      entityId: listing._id,
      description: `Flagged listing for: ${flagReason}`,
      reason: moderationNotes,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    res.status(200).json({
      success: true,
      message: 'Listing flagged successfully',
      data: listing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all flagged listings
 * @route   GET /api/v1/admin/listings/flagged
 * @access  Private/Admin
 */
exports.getFlaggedListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const listings = await Listing.find({ 
      isFlagged: true,
      isDeleted: { $ne: true }
    })
    .populate('productId', 'name')
    .populate('vendorId', 'businessName')
    .populate('moderatedBy', 'name')
    .sort({ lastStatusUpdate: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Listing.countDocuments({ 
      isFlagged: true,
      isDeleted: { $ne: true }
    });

    res.status(200).json({
      success: true,
      count: listings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: listings
    });
  } catch (err) {
    next(err);
  }
};
