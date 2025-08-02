const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const Listing = require("../models/Listing");
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

/**
 * @desc    Verify vendor
 * @route   PUT /api/v1/admin/vendors/:id/verify
 * @access  Private/Admin
 */
exports.verifyVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return next(
        new ErrorResponse(`Vendor not found with id of ${req.params.id}`, 404)
      );
    }

    vendor.isVerified = true;
    vendor.updatedBy = req.user.id;
    await vendor.save();

    res.status(200).json({
      success: true,
      data: vendor,
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

/**
 * @desc    Verify restaurant
 * @route   PUT /api/v1/admin/restaurants/:id/verify
 * @access  Private/Admin
 */
exports.verifyRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return next(
        new ErrorResponse(
          `Restaurant not found with id of ${req.params.id}`,
          404
        )
      );
    }

    restaurant.isVerified = true;
    restaurant.updatedBy = req.user.id;
    await restaurant.save();

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (err) {
    next(err);
  }
};

// ======================
// DASHBOARD STATS
// ======================

/**
 * @desc    Get dashboard statistics
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
