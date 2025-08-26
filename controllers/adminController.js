const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const Listing = require("../models/Listing");
const AuditLog = require("../models/AuditLog");
const { ErrorResponse } = require("../middleware/error");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

// ================================
// DASHBOARD & ANALYTICS MANAGEMENT
// ================================

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


// ================================
// USER MANAGEMENT
// ================================

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
      .populate("vendorId", "businessName verificationStatus")
      .populate("restaurantId", "name verificationStatus")
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

    // Handle optional profile image upload
    if (req.file) {
      updates.profileImage = req.file.path; // Cloudinary URL
    }

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

// ================================
// VENDOR MANAGEMENT
// ================================

/**
 * @desc    Get all vendors with filtering
 * @route   GET /api/v1/admin/vendors?status=pending|approved|rejected&page=1&limit=20&search=businessName
 * @access  Private/Admin
 */
exports.getAllVendors = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isDeleted: { $ne: true } };

    // Filter by verification status (three-state system)
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.verificationStatus = status;
    }

    // Search by business name
    if (search) {
      query.businessName = { $regex: search, $options: "i" };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const vendors = await Vendor.find(query)
      .populate("createdBy", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vendor.countDocuments(query);

    // Calculate statistics
    const stats = await Vendor.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalVendors: { $sum: 1 },
          pendingVendors: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'pending'] }, 1, 0] }
          },
          approvedVendors: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'approved'] }, 1, 0] }
          },
          rejectedVendors: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: vendors.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats[0] || {
        totalVendors: 0,
        pendingVendors: 0,
        approvedVendors: 0,
        rejectedVendors: 0
      },
      data: vendors,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get individual vendor with detailed information and statistics
 * @route   GET /api/v1/admin/vendors/:id
 * @access  Private/Admin
 */
exports.getVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('statusUpdatedBy', 'name email');

    if (!vendor) {
      return next(
        new ErrorResponse(`Vendor not found with id of ${req.params.id}`, 404)
      );
    }

    // Get recent orders for this vendor
    const recentOrders = await Order.find({
      vendorId: req.params.id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
    .select('status totalAmount createdAt')
    .populate('restaurantId', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { vendorId: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          activeOrders: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed', 'preparing']] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get listing statistics
    const listingStats = await Listing.aggregate([
      { $match: { vendorId: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          activeListings: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          featuredListings: {
            $sum: { $cond: [{ $eq: ['$featured', true] }, 1, 0] }
          },
          inactiveListings: {
            $sum: { $cond: [{ $ne: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        vendor,
        recentOrders,
        orderStats: orderStats[0] || {
          totalOrders: 0,
          totalAmount: 0,
          activeOrders: 0,
          completedOrders: 0
        },
        listingStats: listingStats[0] || {
          totalListings: 0,
          activeListings: 0,
          featuredListings: 0,
          inactiveListings: 0
        }
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update vendor details
 * @route   PUT /api/v1/admin/vendors/:id
 * @access  Private/Admin
 */
exports.updateVendor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    let vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return next(
        new ErrorResponse(`Vendor not found with id of ${req.params.id}`, 404)
      );
    }

    if (vendor.isDeleted) {
      return next(new ErrorResponse('Cannot update deleted vendor', 400));
    }

    // Store old values for audit log
    const oldValues = {
      businessName: vendor.businessName,
      email: vendor.email,
      phone: vendor.phone,
      businessAddress: vendor.businessAddress,
      tradeLicenseNo: vendor.tradeLicenseNo
    };

    // Update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    // Check if email/phone is being changed and ensure uniqueness
    if (updateData.email && updateData.email !== vendor.email) {
      const existingVendor = await Vendor.findOne({ 
        email: updateData.email, 
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true }
      });
      if (existingVendor) {
        return next(new ErrorResponse('Vendor with this email already exists', 400));
      }
    }

    if (updateData.phone && updateData.phone !== vendor.phone) {
      const existingVendor = await Vendor.findOne({ 
        phone: updateData.phone, 
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true }
      });
      if (existingVendor) {
        return next(new ErrorResponse('Vendor with this phone number already exists', 400));
      }
    }

    vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    // Log significant changes
    const changes = [];
    if (oldValues.businessName !== vendor.businessName) changes.push(`business name changed from '${oldValues.businessName}' to '${vendor.businessName}'`);
    if (oldValues.email !== vendor.email) changes.push(`email changed from '${oldValues.email}' to '${vendor.email}'`);
    if (oldValues.phone !== vendor.phone) changes.push(`phone changed from '${oldValues.phone}' to '${vendor.phone}'`);
    if (oldValues.tradeLicenseNo !== vendor.tradeLicenseNo) changes.push('trade license updated');

    if (changes.length > 0) {
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'vendor_updated',
        entityType: 'Vendor',
        entityId: vendor._id,
        description: `Updated vendor: ${changes.join(', ')}`,
        severity: 'medium',
        impactLevel: 'moderate',
        metadata: { 
          changes: oldValues,
          adminId: req.user.id
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      data: vendor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Safe delete vendor with dependency check
 * @route   DELETE /api/v1/admin/vendors/:id/safe-delete
 * @access  Private/Admin
 */
exports.safeDeleteVendor = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return next(new ErrorResponse('Vendor not found', 404));
    }

    if (vendor.isDeleted) {
      return next(new ErrorResponse('Vendor is already deleted', 400));
    }

    // Check for incomplete orders (never allow deletion if incomplete orders exist)
    const incompleteOrders = await Order.countDocuments({
      vendorId: req.params.id,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    });

    // Check for active listings
    const activeListings = await Listing.countDocuments({
      vendorId: req.params.id,
      status: 'active',
      isDeleted: { $ne: true }
    });

    if (incompleteOrders > 0 || activeListings > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete vendor with incomplete orders or active listings',
        dependencies: {
          incompleteOrders,
          activeListings
        },
        suggestions: [
          'Complete all pending orders first',
          'Deactivate all active listings',
          'Contact vendor to resolve ongoing operations'
        ]
      });
    }

    // Check for associated users
    const associatedUsers = await User.countDocuments({
      vendorId: req.params.id,
      isDeleted: { $ne: true }
    });

    // Perform soft delete
    vendor.isDeleted = true;
    vendor.deletedAt = new Date();
    vendor.deletedBy = req.user.id;
    vendor.adminNotes = reason || 'Deleted by admin';
    vendor.isActive = false;
    await vendor.save();

    // Soft delete associated users
    await User.updateMany(
      { vendorId: vendor._id },
      { 
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        isActive: false,
        adminNotes: reason || 'Vendor deleted by admin'
      }
    );

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'vendor_deleted',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Soft deleted vendor: ${vendor.businessName}`,
      reason,
      severity: 'high',
      impactLevel: 'significant',
      metadata: {
        deletionReason: reason,
        affectedUsers: associatedUsers,
        adminId: req.user.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully',
      data: { deletedId: vendor._id }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Deactivate vendor with dependency check
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

// ================================
// RESTAURANT MANAGEMENT
// ================================

/**
 * @desc    Get all restaurants with filtering
 * @route   GET /api/v1/admin/restaurants?status=pending|approved|rejected&page=1&limit=20&search=name
 * @access  Private/Admin
 */
exports.getAllRestaurants = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isDeleted: { $ne: true } };

    // Filter by verification status (three-state system)
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.verificationStatus = status;
    }

    // Search by restaurant name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const restaurants = await Restaurant.find(query)
      .populate("createdBy", "name email")
      .populate("managers", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Restaurant.countDocuments(query);

    // Calculate statistics
    const stats = await Restaurant.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalRestaurants: { $sum: 1 },
          pendingRestaurants: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'pending'] }, 1, 0] }
          },
          approvedRestaurants: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'approved'] }, 1, 0] }
          },
          rejectedRestaurants: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: restaurants.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats[0] || {
        totalRestaurants: 0,
        pendingRestaurants: 0,
        approvedRestaurants: 0,
        rejectedRestaurants: 0
      },
      data: restaurants,
    });
  } catch (err) {
    next(err);
  }
};

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

/**
 * @desc    Get single restaurant with full details
 * @route   GET /api/v1/admin/restaurants/:id
 * @access  Private/Admin
 */
exports.getRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('managers', 'name email phone role')
      .populate('statusUpdatedBy', 'name email');

    if (!restaurant) {
      return next(
        new ErrorResponse(`Restaurant not found with id of ${req.params.id}`, 404)
      );
    }

    // Get recent orders for this restaurant
    const recentOrders = await Order.find({
      restaurantId: req.params.id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
    .select('status totalAmount createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { restaurantId: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          activeOrders: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed', 'preparing']] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        restaurant,
        recentOrders,
        orderStats: orderStats[0] || {
          totalOrders: 0,
          totalAmount: 0,
          activeOrders: 0,
          completedOrders: 0
        }
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update restaurant details
 * @route   PUT /api/v1/admin/restaurants/:id
 * @access  Private/Admin
 */
exports.updateRestaurant = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    let restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return next(
        new ErrorResponse(`Restaurant not found with id of ${req.params.id}`, 404)
      );
    }

    if (restaurant.isDeleted) {
      return next(new ErrorResponse('Cannot update deleted restaurant', 400));
    }

    // Store old values for audit log
    const oldValues = {
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      address: restaurant.address,
      tradeLicenseNo: restaurant.tradeLicenseNo
    };

    // Update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    // Check if email/phone is being changed and ensure uniqueness
    if (updateData.email && updateData.email !== restaurant.email) {
      const existingRestaurant = await Restaurant.findOne({ 
        email: updateData.email, 
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true }
      });
      if (existingRestaurant) {
        return next(new ErrorResponse('Restaurant with this email already exists', 400));
      }
    }

    if (updateData.phone && updateData.phone !== restaurant.phone) {
      const existingRestaurant = await Restaurant.findOne({ 
        phone: updateData.phone, 
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true }
      });
      if (existingRestaurant) {
        return next(new ErrorResponse('Restaurant with this phone number already exists', 400));
      }
    }

    restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('managers', 'name email');

    // Log significant changes
    const changes = [];
    if (oldValues.name !== restaurant.name) changes.push(`name changed from '${oldValues.name}' to '${restaurant.name}'`);
    if (oldValues.email !== restaurant.email) changes.push(`email changed from '${oldValues.email}' to '${restaurant.email}'`);
    if (oldValues.phone !== restaurant.phone) changes.push(`phone changed from '${oldValues.phone}' to '${restaurant.phone}'`);
    if (oldValues.tradeLicenseNo !== restaurant.tradeLicenseNo) changes.push('trade license updated');

    if (changes.length > 0) {
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'restaurant_updated',
        entityType: 'Restaurant',
        entityId: restaurant._id,
        description: `Updated restaurant: ${changes.join(', ')}`,
        severity: 'medium',
        impactLevel: 'moderate',
        metadata: { 
          changes: oldValues,
          adminId: req.user.id
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      data: restaurant,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Deactivate restaurant with dependency check
 * @route   PUT /api/v1/admin/restaurants/:id/deactivate
 * @access  Private/Admin
 */
exports.deactivateRestaurant = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return next(new ErrorResponse('Restaurant not found', 404));
    }

    if (restaurant.isDeleted) {
      return next(new ErrorResponse('Cannot deactivate deleted restaurant', 400));
    }

    // Check for incomplete orders (only block for incomplete orders)
    const incompleteOrders = await Order.countDocuments({
      restaurantId: req.params.id,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    });

    if (incompleteOrders > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate restaurant with incomplete orders',
        dependencies: {
          incompleteOrders
        },
        suggestions: [
          'Complete all pending orders first',
          'Contact restaurant to resolve ongoing orders',
          'Use force deactivation if emergency (contact support)'
        ]
      });
    }

    // Deactivate restaurant
    restaurant.isActive = false;
    restaurant.statusUpdatedBy = req.user.id;
    restaurant.statusUpdatedAt = new Date();
    restaurant.adminNotes = reason;
    await restaurant.save();

    // Deactivate associated users
    await User.updateMany(
      { restaurantId: restaurant._id },
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
      action: 'restaurant_deactivated',
      entityType: 'Restaurant',
      entityId: restaurant._id,
      description: `Deactivated restaurant: ${restaurant.name}`,
      reason,
      severity: 'high',
      impactLevel: 'major',
      metadata: {
        adminId: req.user.id,
        affectedUsers: await User.countDocuments({ restaurantId: restaurant._id })
      }
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant deactivated successfully',
      data: restaurant
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Safe delete restaurant with dependency check
 * @route   DELETE /api/v1/admin/restaurants/:id/safe-delete
 * @access  Private/Admin
 */
exports.safeDeleteRestaurant = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return next(new ErrorResponse('Restaurant not found', 404));
    }

    if (restaurant.isDeleted) {
      return next(new ErrorResponse('Restaurant is already deleted', 400));
    }

    // Check for incomplete orders (only block for incomplete orders, not completed ones)
    const incompleteOrders = await Order.countDocuments({
      restaurantId: req.params.id,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    });

    // Check for associated users
    const associatedUsers = await User.countDocuments({
      restaurantId: req.params.id,
      isDeleted: { $ne: true }
    });

    if (incompleteOrders > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete restaurant with incomplete orders',
        dependencies: {
          type: 'incomplete_orders',
          count: incompleteOrders,
          associatedUsers
        },
        suggestions: [
          'Complete all pending orders first',
          'Contact restaurant to resolve ongoing orders',
          'Use deactivation if you need to preserve incomplete order data'
        ]
      });
    }

    // Perform soft delete
    restaurant.isDeleted = true;
    restaurant.deletedAt = new Date();
    restaurant.deletedBy = req.user.id;
    restaurant.adminNotes = reason || 'Deleted by admin';
    restaurant.isActive = false;
    await restaurant.save();

    // Soft delete associated users
    await User.updateMany(
      { restaurantId: restaurant._id },
      { 
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        isActive: false,
        adminNotes: reason || 'Restaurant deleted by admin'
      }
    );

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'restaurant_deleted',
      entityType: 'Restaurant',
      entityId: restaurant._id,
      description: `Soft deleted restaurant: ${restaurant.name}`,
      reason,
      severity: 'high',
      impactLevel: 'significant',
      metadata: {
        deletionReason: reason,
        affectedUsers: associatedUsers,
        adminId: req.user.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully',
      data: { deletedId: restaurant._id }
    });
  } catch (err) {
    next(err);
  }
};

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

    // Handle image updates if new images were uploaded
    if (req.files && req.files.length > 0) {
      // Process new images
      const newImages = req.files.map((file, index) => ({
        url: file.path, // Cloudinary URL
        alt: req.body.imageAlts ? req.body.imageAlts[index] || '' : '',
        isPrimary: index === 0 && product.images.length === 0 // First image is primary if no existing images
      }));

      // If replacing all images
      if (req.body.replaceAllImages === 'true') {
        updateData.images = newImages;
        if (newImages.length > 0) {
          newImages[0].isPrimary = true; // Ensure first image is primary
        }
      } else {
        // Add to existing images
        updateData.images = [...product.images, ...newImages];
      }
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
      isActive,
      isAvailable,
      adminStatus,
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

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Filter by availability (flag system)
    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === 'true';
    }

    // Filter by admin status
    if (adminStatus) {
      query.adminStatus = adminStatus;
    }

    // Filter by level
    if (level !== undefined) {
      query.level = parseInt(level);
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
      .limit(parseInt(limit));

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
      count: categories.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats[0] || {
        totalCategories: 0,
        activeCategories: 0,
        availableCategories: 0,
        flaggedCategories: 0
      },
      data: categories
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

// ================================
// LISTING MANAGEMENT
// ================================

/**
 * @desc    Get all listings with advanced filtering
 * @route   GET /api/v1/admin/listings
 * @access  Private/Admin
 */
exports.getAdminListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      featured,
      flagged,
      vendor,
      product,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query object
    let query = { isDeleted: { $ne: true } };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by featured
    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    // Filter by flagged
    if (flagged !== undefined) {
      query.isFlagged = flagged === 'true';
    }

    // Filter by vendor
    if (vendor) {
      query.vendorId = vendor;
    }

    // Filter by product
    if (product) {
      query.productId = product;
    }

    // Text search
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { 'qualityGrade': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with population
    const listings = await Listing.find(query)
      .populate({
        path: 'productId',
        select: 'name description category images',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('vendorId', 'businessName contactInfo')
      .populate('moderatedBy', 'name email')
      .populate('deletedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Listing.countDocuments(query);

    // Calculate statistics
    const stats = await Listing.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          activeListings: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          featuredListings: {
            $sum: { $cond: [{ $eq: ['$featured', true] }, 1, 0] }
          },
          flaggedListings: {
            $sum: { $cond: [{ $eq: ['$isFlagged', true] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: listings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats[0] || {
        totalListings: 0,
        activeListings: 0,
        featuredListings: 0,
        flaggedListings: 0
      },
      data: listings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single listing with full details
 * @route   GET /api/v1/admin/listings/:id
 * @access  Private/Admin
 */
exports.getAdminListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate({
        path: 'productId',
        select: 'name description category images nutritionalInfo',
        populate: {
          path: 'category',
          select: 'name description'
        }
      })
      .populate('vendorId', 'businessName contactInfo address tradeLicenseNo')
      .populate('moderatedBy', 'name email role')
      .populate('deletedBy', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Get recent order activity for this listing
    const recentOrders = await Order.find({
      'items.listingId': req.params.id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
    .populate('restaurantId', 'name')
    .select('status totalAmount createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    res.status(200).json({
      success: true,
      data: {
        listing,
        recentOrders
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update listing status
 * @route   PUT /api/v1/admin/listings/:id/status
 * @access  Private/Admin
 */
exports.updateListingStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'out_of_stock', 'discontinued'];
    if (!validStatuses.includes(status)) {
      return next(new ErrorResponse('Invalid status provided', 400));
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    const oldStatus = listing.status;
    
    // Update listing
    listing.status = status;
    listing.lastStatusUpdate = new Date();
    listing.updatedBy = req.user.id;
    
    await listing.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'listing_status_updated',
      entityType: 'Listing',
      entityId: listing._id,
      description: `Status updated from ${oldStatus} to ${status}`,
      reason,
      severity: 'medium',
      impactLevel: 'moderate',
      metadata: {
        oldStatus,
        newStatus: status
      }
    });

    // Populate for response
    const updatedListing = await Listing.findById(listing._id)
      .populate('productId', 'name')
      .populate('vendorId', 'businessName')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Listing status updated to ${status}`,
      data: updatedListing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle listing featured status
 * @route   PUT /api/v1/admin/listings/:id/featured
 * @access  Private/Admin
 */
exports.toggleListingFeatured = async (req, res, next) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Only allow featuring of active listings
    if (!listing.featured && listing.status !== 'active') {
      return next(new ErrorResponse('Only active listings can be featured', 400));
    }

    const oldFeaturedStatus = listing.featured;
    
    // Toggle the featured status
    listing.featured = !listing.featured;
    listing.updatedBy = req.user.id;
    listing.lastStatusUpdate = new Date();

    await listing.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: listing.featured ? 'listing_featured' : 'listing_unfeatured',
      entityType: 'Listing',
      entityId: listing._id,
      description: `Listing ${listing.featured ? 'marked as featured' : 'removed from featured'}`,
      severity: 'low',
      impactLevel: 'minor',
      metadata: {
        oldFeaturedStatus,
        newFeaturedStatus: listing.featured
      }
    });

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

/**
 * @desc    Flag/unflag a listing
 * @route   PUT /api/v1/admin/listings/:id/flag
 * @access  Private/Admin
 */
exports.updateListingFlag = async (req, res, next) => {
  try {
    const { action, flagReason, moderationNotes } = req.body;
    
    // Validate action
    if (!['flag', 'unflag'].includes(action)) {
      return next(new ErrorResponse('Action must be either "flag" or "unflag"', 400));
    }

    if (action === 'flag' && !flagReason) {
      return next(new ErrorResponse('Flag reason is required when flagging', 400));
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(new ErrorResponse('Listing not found', 404));
    }

    const oldFlaggedStatus = listing.isFlagged;

    if (action === 'flag') {
      listing.isFlagged = true;
      listing.flagReason = flagReason;
      listing.moderatedBy = req.user.id;
      listing.moderationNotes = moderationNotes;
    } else {
      listing.isFlagged = false;
      listing.flagReason = undefined;
      listing.moderatedBy = req.user.id;
      listing.moderationNotes = moderationNotes || 'Flag removed by admin';
    }
    
    listing.lastStatusUpdate = new Date();
    await listing.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: action === 'flag' ? 'listing_flagged' : 'listing_unflagged',
      entityType: 'Listing',
      entityId: listing._id,
      description: action === 'flag' ? `Flagged listing for: ${flagReason}` : 'Removed flag from listing',
      reason: moderationNotes,
      severity: action === 'flag' ? 'medium' : 'low',
      impactLevel: action === 'flag' ? 'moderate' : 'minor',
      metadata: {
        oldFlaggedStatus,
        newFlaggedStatus: listing.isFlagged,
        flagReason: action === 'flag' ? flagReason : null
      }
    });

    // Populate for response
    const updatedListing = await Listing.findById(listing._id)
      .populate('productId', 'name')
      .populate('vendorId', 'businessName')
      .populate('moderatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Listing ${action}ged successfully`,
      data: updatedListing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Soft delete a listing
 * @route   DELETE /api/v1/admin/listings/:id
 * @access  Private/Admin
 */
exports.softDeleteListing = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    if (listing.isDeleted) {
      return next(new ErrorResponse('Listing is already deleted', 400));
    }

    // Check for active orders
    const activeOrders = await Order.countDocuments({
      'items.listingId': req.params.id,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeOrders > 0) {
      return next(new ErrorResponse(
        `Cannot delete listing with ${activeOrders} active orders. Complete or cancel orders first.`,
        400
      ));
    }

    // Soft delete
    listing.isDeleted = true;
    listing.deletedAt = new Date();
    listing.deletedBy = req.user.id;
    listing.status = 'discontinued';
    await listing.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'listing_deleted',
      entityType: 'Listing',
      entityId: listing._id,
      description: 'Soft deleted listing',
      reason,
      severity: 'high',
      impactLevel: 'significant',
      metadata: {
        deletionReason: reason,
        activeOrdersChecked: activeOrders
      }
    });

    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully',
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Bulk update listings
 * @route   POST /api/v1/admin/listings/bulk
 * @access  Private/Admin
 */
exports.bulkUpdateListings = async (req, res, next) => {
  try {
    const { listingIds, action, data } = req.body;

    // Validate input
    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return next(new ErrorResponse('Listing IDs array is required', 400));
    }

    if (listingIds.length > 50) {
      return next(new ErrorResponse('Cannot process more than 50 listings at once', 400));
    }

    const validActions = ['updateStatus', 'toggleFeatured', 'flag', 'unflag', 'delete'];
    if (!validActions.includes(action)) {
      return next(new ErrorResponse('Invalid bulk action', 400));
    }

    // Find all listings
    const listings = await Listing.find({
      _id: { $in: listingIds },
      isDeleted: { $ne: true }
    });

    if (listings.length === 0) {
      return next(new ErrorResponse('No valid listings found', 404));
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each listing
    for (const listing of listings) {
      try {
        switch (action) {
          case 'updateStatus':
            if (data.status) {
              listing.status = data.status;
              listing.lastStatusUpdate = new Date();
              listing.updatedBy = req.user.id;
            }
            break;

          case 'toggleFeatured':
            if (listing.status === 'active' || listing.featured) {
              listing.featured = !listing.featured;
              listing.lastStatusUpdate = new Date();
              listing.updatedBy = req.user.id;
            } else {
              throw new Error('Only active listings can be featured');
            }
            break;

          case 'flag':
            if (data.flagReason) {
              listing.isFlagged = true;
              listing.flagReason = data.flagReason;
              listing.moderatedBy = req.user.id;
              listing.moderationNotes = data.moderationNotes;
              listing.lastStatusUpdate = new Date();
            }
            break;

          case 'unflag':
            listing.isFlagged = false;
            listing.flagReason = undefined;
            listing.moderatedBy = req.user.id;
            listing.moderationNotes = data.moderationNotes || 'Bulk unflag operation';
            listing.lastStatusUpdate = new Date();
            break;

          case 'delete':
            // Check for active orders
            const activeOrders = await Order.countDocuments({
              'items.listingId': listing._id,
              status: { $in: ['pending', 'confirmed'] }
            });

            if (activeOrders > 0) {
              throw new Error(`Has ${activeOrders} active orders`);
            }

            listing.isDeleted = true;
            listing.deletedAt = new Date();
            listing.deletedBy = req.user.id;
            listing.status = 'discontinued';
            break;
        }

        await listing.save();
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          listingId: listing._id,
          error: error.message
        });
      }
    }

    // Log bulk action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: `bulk_listing_${action}`,
      entityType: 'Listing',
      description: `Bulk ${action} operation on ${listingIds.length} listings`,
      severity: 'medium',
      impactLevel: 'moderate',
      metadata: {
        totalListings: listingIds.length,
        successful: results.success,
        failed: results.failed,
        actionData: data
      }
    });

    res.status(200).json({
      success: true,
      message: `Bulk operation completed. ${results.success} successful, ${results.failed} failed.`,
      data: results
    });
  } catch (err) {
    next(err);
  }
};

// ================================
// BUSINESS ENTITY VERIFICATION MANAGEMENT
// ================================


// ================================
// ENHANCED VERIFICATION MANAGEMENT
// ================================

/**
 * @desc    Toggle vendor verification status
 * @route   PUT /api/v1/admin/vendors/:id/verification
 * @access  Private/Admin
 */
exports.toggleVendorVerification = async (req, res, next) => {
  const session = await mongoose.startSession();
  
  try {
    const { reason, status } = req.body;

    // Validate status parameter
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return next(new ErrorResponse('Status must be one of: pending, approved, rejected', 400));
    }
    
    const verificationStatus = status;
    const finalIsVerified = (status === 'approved');

    if ((verificationStatus === 'rejected' || !finalIsVerified) && !reason) {
      return next(new ErrorResponse('Reason is required when rejecting or revoking verification', 400));
    }

    // Pre-calculate affected users count outside transaction for better performance
    const affectedUsersCount = await User.countDocuments({ vendorId: req.params.id });

    const result = await session.withTransaction(async () => {
      const vendor = await Vendor.findById(req.params.id).session(session);
      if (!vendor) {
        throw new ErrorResponse(`Vendor not found with id of ${req.params.id}`, 404);
      }

      const oldVerificationStatus = vendor.verificationStatus;
      
      // Update vendor verification with three-state system
      vendor.verificationStatus = verificationStatus;
      vendor.verificationDate = (verificationStatus === 'approved') ? new Date() : null;
      vendor.statusUpdatedBy = req.user.id;
      vendor.statusUpdatedAt = new Date();
      vendor.adminNotes = reason;
      await vendor.save({ session });

      // Log the action with session
      const actionMap = {
        'approved': 'vendor_verified',
        'rejected': 'vendor_verification_revoked',
        'pending': 'vendor_status_reset'
      };
      
      const descriptionMap = {
        'approved': `Verified vendor: ${vendor.businessName}`,
        'rejected': `Rejected vendor verification: ${vendor.businessName}`,
        'pending': `Reset vendor to pending: ${vendor.businessName}`
      };
      
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: actionMap[verificationStatus],
        entityType: 'Vendor',
        entityId: vendor._id,
        description: descriptionMap[verificationStatus],
        reason,
        severity: 'high',
        impactLevel: 'significant',
        metadata: {
          oldVerificationStatus,
          newVerificationStatus: verificationStatus,
          affectedUsers: affectedUsersCount
        }
      }, session);

      return vendor;
    });

    // Move population query outside transaction for better performance
    const populatedVendor = await Vendor.findById(result._id)
      .populate('statusUpdatedBy', 'name email');

    const messageMap = {
      'approved': 'Vendor verified successfully',
      'rejected': 'Vendor verification rejected',
      'pending': 'Vendor status set to pending'
    };

    res.status(200).json({
      success: true,
      message: messageMap[verificationStatus],
      data: populatedVendor
    });
  } catch (err) {
    // withTransaction handles abort automatically, only handle specific error cases
    if (err.name === 'ValidationError') {
      return next(new ErrorResponse('Validation failed', 400));
    }
    if (err.code === 11000) {
      return next(new ErrorResponse('Duplicate key error', 409));
    }
    next(err);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Toggle restaurant verification status
 * @route   PUT /api/v1/admin/restaurants/:id/verification
 * @access  Private/Admin
 */
exports.toggleRestaurantVerification = async (req, res, next) => {
  const session = await mongoose.startSession();
  
  try {
    const { reason, status } = req.body;

    // Validate status parameter
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return next(new ErrorResponse('Status must be one of: pending, approved, rejected', 400));
    }
    
    const verificationStatus = status;
    const finalIsVerified = (status === 'approved');

    if ((verificationStatus === 'rejected' || !finalIsVerified) && !reason) {
      return next(new ErrorResponse('Reason is required when rejecting or revoking verification', 400));
    }

    // Pre-calculate affected users count outside transaction for better performance
    const affectedUsersCount = await User.countDocuments({ restaurantId: req.params.id });

    const result = await session.withTransaction(async () => {
      const restaurant = await Restaurant.findById(req.params.id).session(session);
      if (!restaurant) {
        throw new ErrorResponse(`Restaurant not found with id of ${req.params.id}`, 404);
      }

      const oldVerificationStatus = restaurant.verificationStatus;
      
      // Update restaurant verification with three-state system
      restaurant.verificationStatus = verificationStatus;
      restaurant.verificationDate = (verificationStatus === 'approved') ? new Date() : null;
      restaurant.statusUpdatedBy = req.user.id;
      restaurant.statusUpdatedAt = new Date();
      restaurant.adminNotes = reason;
      await restaurant.save({ session });

      // Log the action with session
      const actionMap = {
        'approved': 'restaurant_verified',
        'rejected': 'restaurant_verification_revoked',
        'pending': 'restaurant_status_reset'
      };
      
      const descriptionMap = {
        'approved': `Verified restaurant: ${restaurant.name}`,
        'rejected': `Rejected restaurant verification: ${restaurant.name}`,
        'pending': `Reset restaurant to pending: ${restaurant.name}`
      };
      
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: actionMap[verificationStatus],
        entityType: 'Restaurant',
        entityId: restaurant._id,
        description: descriptionMap[verificationStatus],
        reason,
        severity: 'high',
        impactLevel: 'significant',
        metadata: {
          oldVerificationStatus,
          newVerificationStatus: verificationStatus,
          affectedUsers: affectedUsersCount
        }
      }, session);

      return restaurant;
    });

    // Move population queries outside transaction for better performance
    const populatedRestaurant = await Restaurant.findById(result._id)
      .populate('statusUpdatedBy', 'name email')
      .populate('managers', 'name email');

    // Create appropriate response message based on verification status
    const messageMap = {
      'approved': 'Restaurant verification approved successfully',
      'rejected': 'Restaurant verification rejected successfully', 
      'pending': 'Restaurant status reset to pending successfully'
    };
    
    const responseMessage = messageMap[result.verificationStatus] || 
      `Restaurant verification status updated to ${result.verificationStatus} successfully`;

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: populatedRestaurant
    });
  } catch (err) {
    // withTransaction handles abort automatically, only handle specific error cases
    if (err.name === 'ValidationError') {
      return next(new ErrorResponse('Validation failed', 400));
    }
    if (err.code === 11000) {
      return next(new ErrorResponse('Duplicate key error', 409));
    }
    next(err);
  } finally {
    session.endSession();
  }
};

