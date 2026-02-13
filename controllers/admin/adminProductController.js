const Product = require("../../models/Product");
const ProductCategory = require("../../models/ProductCategory");
const Listing = require("../../models/Listing");
const AuditLog = require("../../models/AuditLog");
const { ErrorResponse } = require("../../middleware/error");
const { validationResult } = require("express-validator");

// ================================
// PRODUCT MANAGEMENT
// ================================

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

    // Check if at least one image was uploaded
    if (!req.files || !req.files.length) {
      return next(new ErrorResponse('At least one product image is required', 400));
    }

    // Process uploaded images
    const images = req.files.map((file, index) => ({
      url: file.path, // Cloudinary URL
      alt: req.body.imageAlts ? req.body.imageAlts[index] || '' : '',
      isPrimary: index === 0 // First image is primary by default
    }));

    // Create product data with images
    const productData = {
      ...req.body,
      images,
      createdBy: req.user.id
    };

    const product = await Product.create(productData);

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

    // Filter by category (skip if 'all')
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    // Filter by status (isActive field)
    if (req.query.status && req.query.status !== 'all') {
      if (req.query.status === 'active') {
        query.isActive = true;
      } else if (req.query.status === 'inactive') {
        query.isActive = false;
      } else if (req.query.status === 'flagged') {
        query.isFlagged = true;
      }
    }

    // Filter by stock level
    if (req.query.stockLevel && req.query.stockLevel !== 'all') {
      if (req.query.stockLevel === 'in_stock') {
        query.stockQuantity = { $gt: 10 };
      } else if (req.query.stockLevel === 'low_stock') {
        query.stockQuantity = { $gt: 0, $lte: 10 };
      } else if (req.query.stockLevel === 'out_of_stock') {
        query.stockQuantity = { $lte: 0 };
      }
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Dynamic sorting
    let sortBy = {};
    const sortField = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    sortBy[sortField] = sortOrder;

    const products = await Product.find(query)
      .populate("category", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort(sortBy)
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

    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
      );
    }

    // Update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    // Handle image updates
    let finalImages = [];

    // If existingImages is provided, use it as the base (allows user to remove/reorder images)
    if (req.body.existingImages) {
      try {
        const parsedExistingImages = JSON.parse(req.body.existingImages);
        finalImages = parsedExistingImages;
      } catch (err) {
        // If parsing fails, keep original images
        finalImages = product.images;
      }
    } else {
      // No existingImages provided, keep original images
      finalImages = product.images;
    }

    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: file.path, // Cloudinary URL
        alt: req.body.imageAlts ? req.body.imageAlts[index] || '' : '',
        isPrimary: false // Don't automatically set as primary
      }));

      // If no existing images, make first new image primary
      if (finalImages.length === 0 && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }

      finalImages = [...finalImages, ...newImages];
    }

    // Update images if there were changes
    if (req.files?.length > 0 || req.body.existingImages) {
      updateData.images = finalImages;
    }

    // Ensure at least one image exists (validation will be handled by model)
    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
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
 * @desc    Get product statistics
 * @route   GET /api/v1/admin/products/stats
 * @access  Private/Admin
 */
exports.getProductStats = async (req, res, next) => {
  try {
    // Total products
    const totalProducts = await Product.countDocuments({ isDeleted: { $ne: true } });

    // Active products
    const activeProducts = await Product.countDocuments({
      isActive: true,
      isDeleted: { $ne: true }
    });

    // Flagged products
    const flaggedProducts = await Product.countDocuments({
      isFlagged: true,
      isDeleted: { $ne: true }
    });

    // Low stock products (stock quantity <= 10)
    const lowStockProducts = await Product.countDocuments({
      stockQuantity: { $lte: 10 },
      isDeleted: { $ne: true }
    });

    // Average performance score
    const performanceAgg = await Product.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$performanceScore' }
        }
      }
    ]);

    const averagePerformanceScore = performanceAgg.length > 0
      ? Math.round(performanceAgg[0].avgScore || 0)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        flaggedProducts,
        lowStockProducts,
        averagePerformanceScore
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Bulk update products
 * @route   PUT /api/v1/admin/products/bulk
 * @access  Private/Admin
 */
exports.bulkUpdateProducts = async (req, res, next) => {
  try {
    const { productIds, action } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return next(new ErrorResponse('Product IDs array is required', 400));
    }

    if (!action) {
      return next(new ErrorResponse('Action is required', 400));
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'activate':
        updateData = { isActive: true, updatedBy: req.user.id };
        message = `${productIds.length} products activated successfully`;
        break;

      case 'deactivate':
        updateData = { isActive: false, updatedBy: req.user.id };
        message = `${productIds.length} products deactivated successfully`;
        break;

      case 'delete':
        updateData = {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user.id,
          updatedBy: req.user.id
        };
        message = `${productIds.length} products deleted successfully`;
        break;

      default:
        return next(new ErrorResponse(`Invalid action: ${action}`, 400));
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updateData }
    );

    // Log bulk action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: `products_bulk_${action}`,
      entityType: 'Product',
      description: `Bulk ${action} on ${productIds.length} products`,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    res.status(200).json({
      success: true,
      message,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (err) {
    next(err);
  }
};

// ================================
// PRODUCT CATEGORY MANAGEMENT
// ================================

/**
 * @desc    Create a new product category
 * @route   POST /api/v1/admin/categories
 * @access  Private/Admin
 */
exports.createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    // Check if image was uploaded
    if (!req.file) {
      return next(new ErrorResponse('Category image is required', 400));
    }

    // Create category data with image URL from Cloudinary
    const categoryData = {
      ...req.body,
      image: req.file.path, // Cloudinary URL
      createdBy: req.user.id
    };

    const category = await ProductCategory.create(categoryData);

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'category_created',
      entityType: 'ProductCategory',
      entityId: category._id,
      description: `Created category: ${category.name}`,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    const populatedCategory = await ProductCategory.findById(category._id)
      .populate('createdBy', 'name email')
      .populate('parentCategory', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: populatedCategory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all product categories with advanced filtering
 * @route   GET /api/v1/admin/categories
 * @access  Private/Admin
 */
exports.getCategories = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      level,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    let query = { isDeleted: { $ne: true } };

    // Search by name and description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status (similar to products)
    if (status && status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }
    }

    // Filter by level
    if (level && level !== 'all') {
      if (level === 'top') {
        query.parentCategory = { $exists: false };
      } else if (level === 'sub') {
        query.parentCategory = { $exists: true };
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const categories = await ProductCategory.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('flaggedBy', 'name email')
      .populate('deletedBy', 'name email')
      .populate('parentCategory', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add product count to each category
    const Product = require('../../models/Product');
    for (let category of categories) {
      category.productCount = await Product.countDocuments({
        category: category._id,
        isDeleted: { $ne: true }
      });
    }

    // Get total count
    const total = await ProductCategory.countDocuments(query);

    // Calculate statistics
    const stats = await ProductCategory.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          activeCategories: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          availableCategories: {
            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] }
          },
          flaggedCategories: {
            $sum: { $cond: [{ $eq: ['$isAvailable', false] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: categories,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
        count: categories.length
      },
      stats: stats[0] || {
        totalCategories: 0,
        activeCategories: 0,
        availableCategories: 0,
        flaggedCategories: 0
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single product category with usage statistics
 * @route   GET /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
exports.getCategory = async (req, res, next) => {
  try {
    const category = await ProductCategory.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('flaggedBy', 'name email')
      .populate('deletedBy', 'name email')
      .populate('parentCategory', 'name slug')
      .populate('subcategories');

    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    // Get usage statistics
    const usageStats = await category.canBeDeleted();

    res.status(200).json({
      success: true,
      data: {
        category,
        usageStats
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update product category
 * @route   PUT /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    let category = await ProductCategory.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    if (category.isDeleted) {
      return next(new ErrorResponse('Cannot update deleted category', 400));
    }

    // Store old values for audit log
    const oldValues = {
      name: category.name,
      isActive: category.isActive,
      isAvailable: category.isAvailable
    };

    // Update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    // If new image was uploaded, update the image URL
    if (req.file) {
      updateData.image = req.file.path; // Cloudinary URL
    }

    category = await ProductCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('parentCategory', 'name slug');

    // Log significant changes
    const changes = [];
    if (oldValues.name !== category.name) changes.push(`name changed from '${oldValues.name}' to '${category.name}'`);
    if (oldValues.isActive !== category.isActive) changes.push(`status changed to ${category.isActive ? 'active' : 'inactive'}`);
    if (oldValues.isAvailable !== category.isAvailable) changes.push(`availability changed to ${category.isAvailable ? 'available' : 'unavailable'}`);

    if (changes.length > 0) {
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'category_updated',
        entityType: 'ProductCategory',
        entityId: category._id,
        description: `Updated category: ${changes.join(', ')}`,
        severity: 'medium',
        impactLevel: 'moderate',
        metadata: { changes: oldValues }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle category availability (flag system)
 * @route   PUT /api/v1/admin/categories/:id/availability
 * @access  Private/Admin
 */
exports.toggleCategoryAvailability = async (req, res, next) => {
  try {
    const { isAvailable, flagReason } = req.body;

    if (isAvailable === undefined) {
      return next(new ErrorResponse('isAvailable field is required', 400));
    }

    if (!isAvailable && !flagReason) {
      return next(new ErrorResponse('Flag reason is required when disabling availability', 400));
    }

    const category = await ProductCategory.findById(req.params.id);
    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    if (category.isDeleted) {
      return next(new ErrorResponse('Cannot modify deleted category', 400));
    }

    const oldAvailability = category.isAvailable;

    // Use the model method to toggle availability
    category.toggleAvailability(isAvailable, flagReason, req.user.id);
    await category.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: isAvailable ? 'category_unflagged' : 'category_flagged',
      entityType: 'ProductCategory',
      entityId: category._id,
      description: `${isAvailable ? 'Enabled' : 'Disabled'} category availability: ${category.name}`,
      reason: flagReason,
      severity: 'medium',
      impactLevel: 'moderate',
      metadata: {
        oldAvailability,
        newAvailability: isAvailable
      }
    });

    const updatedCategory = await ProductCategory.findById(category._id)
      .populate('flaggedBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Category ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: updatedCategory
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get category usage statistics
 * @route   GET /api/v1/admin/categories/:id/usage
 * @access  Private/Admin
 */
exports.getCategoryUsageStats = async (req, res, next) => {
  try {
    const category = await ProductCategory.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }

    const usageStats = await category.canBeDeleted();

    res.status(200).json({
      success: true,
      data: usageStats
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
