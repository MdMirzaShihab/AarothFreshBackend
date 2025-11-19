const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Buyer = require("../models/Buyer");
const Order = require("../models/Order");
const Listing = require("../models/Listing");
const AuditLog = require("../models/AuditLog");
const { ErrorResponse } = require("../middleware/error");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const { cloudinary } = require("../middleware/upload");

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
            totalBuyers: [
              { $match: { role: { $in: ['buyerOwner', 'buyerManager'] }, isDeleted: { $ne: true } } },
              { $group: { _id: '$buyerId' } },
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
        totalBuyers: userStats[0]?.totalBuyers?.[0]?.count || 0,
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
      .populate("buyerId", "name verificationStatus")
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
      .populate("buyerId");

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
        updates.buyerId = undefined; // Unset buyerId
      } else if (
        updates.role === "buyerOwner" ||
        updates.role === "buyerManager"
      ) {
        if (!updates.buyerId) {
          return next(
            new ErrorResponse(
              "buyerId is required when changing role to buyerOwner or buyerManager",
              400
            )
          );
        }
        updates.vendorId = undefined; // Unset vendorId
      } else if (updates.role === "admin") {
        updates.vendorId = undefined;
        updates.buyerId = undefined;
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
      .populate("buyerId");

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
    .populate('buyerId', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(req.params.id) } },
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
      { $match: { vendorId: new mongoose.Types.ObjectId(req.params.id) } },
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
      tradeLicenseNo: vendor.tradeLicenseNo,
      logo: vendor.logo
    };

    // Handle logo upload if provided
    if (req.file) {
      // If vendor has an existing logo, delete it from Cloudinary
      if (vendor.logo) {
        try {
          const publicId = vendor.logo.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`aaroth-fresh/vendor-logos/${publicId}`);
        } catch (deleteError) {
          console.error('Error deleting old vendor logo:', deleteError);
        }
      }
    }

    // Validate markets if they are being updated
    if (req.body.markets) {
      const { markets } = req.body;

      if (!Array.isArray(markets) || markets.length === 0) {
        return next(new ErrorResponse('Vendors must operate in at least one market', 400));
      }

      // Validate that all markets exist and are active
      const Market = require('../models/Market');
      const validMarkets = await Market.find({
        _id: { $in: markets },
        isActive: true,
        isAvailable: true,
        isDeleted: { $ne: true }
      });

      if (validMarkets.length !== markets.length) {
        return next(new ErrorResponse('One or more selected markets are invalid or unavailable', 400));
      }
    }

    // Update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    // Add logo URL if file was uploaded
    if (req.file) {
      updateData.logo = req.file.path;
    }

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
    if (oldValues.logo !== vendor.logo) changes.push('logo updated');

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
 * @desc    Create platform vendor (Aaroth Mall, etc.)
 * @route   POST /api/v1/admin/vendors/platform
 * @access  Private/Admin
 */
exports.createPlatformVendor = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const {
      platformName,
      email,
      phone,
      name,
      password,
      address,
      tradeLicenseNo,
      markets
    } = req.body;

    // Validate markets - platform vendors must also operate in markets
    if (!markets || !Array.isArray(markets) || markets.length === 0) {
      await session.abortTransaction();
      return next(new ErrorResponse('Platform vendors must operate in at least one market', 400));
    }

    // Validate that all markets exist and are active
    const Market = require('../models/Market');
    const validMarkets = await Market.find({
      _id: { $in: markets },
      isActive: true,
      isAvailable: true,
      isDeleted: { $ne: true }
    });

    if (validMarkets.length !== markets.length) {
      await session.abortTransaction();
      return next(new ErrorResponse('One or more selected markets are invalid or unavailable', 400));
    }

    // Validate platform name
    const validPlatformNames = ['Aaroth Mall', 'Aaroth Organics', 'Aaroth Fresh Store'];
    if (!validPlatformNames.includes(platformName)) {
      await session.abortTransaction();
      return next(new ErrorResponse('Invalid platform name', 400));
    }

    // Check if platform vendor already exists
    const existingPlatformVendor = await Vendor.findOne({
      isPlatformOwned: true,
      platformName,
      isDeleted: { $ne: true }
    });

    if (existingPlatformVendor) {
      await session.abortTransaction();
      return next(new ErrorResponse(`${platformName} vendor already exists`, 400));
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email, isDeleted: { $ne: true } });
    if (existingEmail) {
      await session.abortTransaction();
      return next(new ErrorResponse('Email already in use', 400));
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone, isDeleted: { $ne: true } });
    if (existingPhone) {
      await session.abortTransaction();
      return next(new ErrorResponse('Phone number already in use', 400));
    }

    // Create User account within transaction
    const userResult = await User.create([{
      name,
      email,
      phone,
      password, // Will be hashed by pre-save hook
      role: 'vendor',
      isActive: true,
      approvalStatus: 'approved', // Auto-approve platform vendor users
      createdBy: req.user.id
    }], { session });

    const user = userResult[0];

    // Create Vendor account with platform flags within transaction
    const vendorResult = await Vendor.create([{
      businessName: platformName,
      ownerName: name,
      email,
      phone,
      address,
      tradeLicenseNo: tradeLicenseNo || `PLATFORM-${Date.now()}`,
      markets, // Assign markets to platform vendor
      isPlatformOwned: true,
      platformName,
      isEditable: false, // Admin-only editing
      verificationStatus: 'approved', // Auto-approve platform vendors
      isActive: true,
      specialPrivileges: {
        featuredListings: true,
        prioritySupport: true,
        customCommissionRate: 0.05, // 5% commission instead of standard
        unlimitedListings: true
      },
      createdBy: req.user.id,
      verificationDate: new Date()
    }], { session });

    const vendor = vendorResult[0];

    // Link user to vendor within transaction
    user.vendorId = vendor._id;
    await user.save({ session });

    // Create audit log within transaction
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'platform_vendor_created',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Created platform vendor: ${platformName}`,
      severity: 'high',
      impactLevel: 'significant',
      metadata: {
        platformName,
        managerName: name,
        managerEmail: email,
        autoApproved: true
      }
    }, session);

    // Commit transaction
    await session.commitTransaction();

    // Populate and return
    const populatedVendor = await Vendor.findById(vendor._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: `${platformName} vendor created successfully`,
      data: {
        vendor: populatedVendor,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      }
    });
  } catch (err) {
    await session.abortTransaction();

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new ErrorResponse(`Validation failed: ${messages.join(', ')}`, 400));
    }
    if (err.code === 11000) {
      return next(new ErrorResponse('Duplicate key error - email, phone, or trade license already exists', 409));
    }
    next(err);
  } finally {
    session.endSession();
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
 * @desc    Get all buyers with filtering
 * @route   GET /api/v1/admin/restaurants?status=pending|approved|rejected&page=1&limit=20&search=name
 * @access  Private/Admin
 */
exports.getAllBuyers = async (req, res, next) => {
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

    const restaurants = await Buyer.find(query)
      .populate("createdBy", "name email")
      .populate("managers", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Buyer.countDocuments(query);

    // Calculate statistics
    const stats = await Buyer.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalBuyers: { $sum: 1 },
          pendingBuyers: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'pending'] }, 1, 0] }
          },
          approvedBuyers: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'approved'] }, 1, 0] }
          },
          rejectedBuyers: {
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
        totalBuyers: 0,
        pendingBuyers: 0,
        approvedBuyers: 0,
        rejectedBuyers: 0
      },
      data: restaurants,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get restaurant statistics
 * @route   GET /api/v1/admin/restaurants/stats
 * @access  Private/Admin
 */
exports.getBuyerStats = async (req, res, next) => {
  try {
    // Calculate comprehensive statistics
    const stats = await Buyer.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalBuyers: { $sum: 1 },
          pendingBuyers: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'pending'] }, 1, 0] }
          },
          approvedBuyers: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'approved'] }, 1, 0] }
          },
          rejectedBuyers: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'rejected'] }, 1, 0] }
          },
          activeBuyers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveBuyers: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      }
    ]);

    // Get manager statistics
    const managerStats = await Buyer.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $project: {
          managerCount: { $size: { $ifNull: ['$managers', []] } }
        }
      },
      {
        $group: {
          _id: null,
          totalManagers: { $sum: '$managerCount' },
          avgManagersPerBuyer: { $avg: '$managerCount' }
        }
      }
    ]);

    // Get top cities/locations
    const topCities = await Buyer.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $match: { 'address.city': { $exists: true, $ne: null, $ne: '' } } },
      {
        $group: {
          _id: '$address.city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: 1
        }
      }
    ]);

    // Extract stats and remove _id field
    const restaurantStats = stats[0] || {};
    const managerStatsData = managerStats[0] || {};

    // Clean response without _id field
    res.status(200).json({
      success: true,
      data: {
        totalBuyers: restaurantStats.totalBuyers || 0,
        pendingBuyers: restaurantStats.pendingBuyers || 0,
        approvedBuyers: restaurantStats.approvedBuyers || 0,
        rejectedBuyers: restaurantStats.rejectedBuyers || 0,
        activeBuyers: restaurantStats.activeBuyers || 0,
        inactiveBuyers: restaurantStats.inactiveBuyers || 0,
        totalManagers: managerStatsData.totalManagers || 0,
        avgManagersPerBuyer: Number((managerStatsData.avgManagersPerBuyer || 0).toFixed(2)),
        topCities: topCities || []
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create buyer owner and restaurant (Admin only)
 * @route   POST /api/v1/admin/restaurant-owners
 * @access  Private/Admin
 */
exports.createBuyerOwner = async (req, res, next) => {
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
    const restaurant = await Buyer.create({
      name: restaurantName,
      ownerName: ownerName || name,
      email,
      phone,
      address,
      tradeLicenseNo,
      createdBy: req.user.id
    });

    // Create buyer owner user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'buyerOwner',
      buyerId: restaurant._id
    });

    // Update restaurant with user reference
    restaurant.createdBy = user._id;
    await restaurant.save();

    // Populate response
    const populatedUser = await User.findById(user._id)
      .populate('buyerId', 'name email phone address')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'Buyer owner created successfully',
      data: populatedUser
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create buyer manager (Admin only)
 * @route   POST /api/v1/admin/restaurant-managers
 * @access  Private/Admin
 */
exports.createBuyerManager = async (req, res, next) => {
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
      buyerId
    } = req.body;

    // Check if restaurant exists
    const restaurant = await Buyer.findById(buyerId);
    if (!restaurant) {
      return next(new ErrorResponse('Buyer not found', 404));
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

    // Create buyer manager user
    const manager = await User.create({
      name,
      email,
      password,
      phone,
      role: 'buyerManager',
      buyerId: restaurant._id
    });

    // Add manager to restaurant's managers array
    await Buyer.findByIdAndUpdate(
      restaurant._id,
      { $push: { managers: manager._id } }
    );

    // Populate response
    const populatedManager = await User.findById(manager._id)
      .populate('buyerId', 'name email phone address')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'Buyer manager created successfully',
      data: populatedManager
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single buyer with full details
 * @route   GET /api/v1/admin/restaurants/:id
 * @access  Private/Admin
 */
exports.getBuyer = async (req, res, next) => {
  try {
    const restaurant = await Buyer.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('managers', 'name email phone role')
      .populate('statusUpdatedBy', 'name email');

    if (!restaurant) {
      return next(
        new ErrorResponse(`Buyer not found with id of ${req.params.id}`, 404)
      );
    }

    // Get recent orders for this restaurant
    const recentOrders = await Order.find({
      buyerId: req.params.id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
    .select('status totalAmount createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { buyerId: new mongoose.Types.ObjectId(req.params.id) } },
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
 * @desc    Update buyer details
 * @route   PUT /api/v1/admin/restaurants/:id
 * @access  Private/Admin
 */
exports.updateBuyer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    let restaurant = await Buyer.findById(req.params.id);

    if (!restaurant) {
      return next(
        new ErrorResponse(`Buyer not found with id of ${req.params.id}`, 404)
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
      tradeLicenseNo: restaurant.tradeLicenseNo,
      logo: restaurant.logo
    };

    // Handle logo upload if provided
    if (req.file) {
      // If restaurant has an existing logo, delete it from Cloudinary
      if (restaurant.logo) {
        try {
          const publicId = restaurant.logo.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`aaroth-fresh/restaurant-logos/${publicId}`);
        } catch (deleteError) {
          console.error('Error deleting old restaurant logo:', deleteError);
        }
      }
    }

    // Update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    // Add logo URL if file was uploaded
    if (req.file) {
      updateData.logo = req.file.path;
    }

    // Check if email/phone is being changed and ensure uniqueness
    if (updateData.email && updateData.email !== restaurant.email) {
      const existingBuyer = await Buyer.findOne({ 
        email: updateData.email, 
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true }
      });
      if (existingBuyer) {
        return next(new ErrorResponse('Buyer with this email already exists', 400));
      }
    }

    if (updateData.phone && updateData.phone !== restaurant.phone) {
      const existingBuyer = await Buyer.findOne({ 
        phone: updateData.phone, 
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true }
      });
      if (existingBuyer) {
        return next(new ErrorResponse('Buyer with this phone number already exists', 400));
      }
    }

    restaurant = await Buyer.findByIdAndUpdate(
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
    if (oldValues.logo !== restaurant.logo) changes.push('logo updated');

    if (changes.length > 0) {
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'restaurant_updated',
        entityType: 'Buyer',
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
      message: 'Buyer updated successfully',
      data: restaurant,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Deactivate buyer with dependency check
 * @route   PUT /api/v1/admin/restaurants/:id/deactivate
 * @access  Private/Admin
 */
exports.deactivateBuyer = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const restaurant = await Buyer.findById(req.params.id);
    
    if (!restaurant) {
      return next(new ErrorResponse('Buyer not found', 404));
    }

    if (restaurant.isDeleted) {
      return next(new ErrorResponse('Cannot deactivate deleted restaurant', 400));
    }

    // Check for incomplete orders (only block for incomplete orders)
    const incompleteOrders = await Order.countDocuments({
      buyerId: req.params.id,
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
      { buyerId: restaurant._id },
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
      entityType: 'Buyer',
      entityId: restaurant._id,
      description: `Deactivated restaurant: ${restaurant.name}`,
      reason,
      severity: 'high',
      impactLevel: 'major',
      metadata: {
        adminId: req.user.id,
        affectedUsers: await User.countDocuments({ buyerId: restaurant._id })
      }
    });

    res.status(200).json({
      success: true,
      message: 'Buyer deactivated successfully',
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
exports.safeDeleteBuyer = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const restaurant = await Buyer.findById(req.params.id);
    
    if (!restaurant) {
      return next(new ErrorResponse('Buyer not found', 404));
    }

    if (restaurant.isDeleted) {
      return next(new ErrorResponse('Buyer is already deleted', 400));
    }

    // Check for incomplete orders (only block for incomplete orders, not completed ones)
    const incompleteOrders = await Order.countDocuments({
      buyerId: req.params.id,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    });

    // Check for associated users
    const associatedUsers = await User.countDocuments({
      buyerId: req.params.id,
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
      { buyerId: restaurant._id },
      { 
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        isActive: false,
        adminNotes: reason || 'Buyer deleted by admin'
      }
    );

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'restaurant_deleted',
      entityType: 'Buyer',
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
      message: 'Buyer deleted successfully',
      data: { deletedId: restaurant._id }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Transfer buyer ownership to another user
 * @route   POST /api/v1/admin/restaurants/:id/transfer-ownership
 * @access  Private/Admin
 */
exports.transferBuyerOwnership = async (req, res, next) => {
  try {
    const { newOwnerId, reason } = req.body;

    // Validate inputs
    if (!newOwnerId) {
      return next(new ErrorResponse('New owner ID is required', 400));
    }

    // Find restaurant
    const restaurant = await Buyer.findById(req.params.id);
    if (!restaurant || restaurant.isDeleted) {
      return next(new ErrorResponse('Buyer not found', 404));
    }

    // Find new owner
    const newOwner = await User.findById(newOwnerId);
    if (!newOwner || newOwner.isDeleted) {
      return next(new ErrorResponse('New owner user not found', 404));
    }

    // Validate new owner role
    if (!['buyerOwner', 'buyerManager'].includes(newOwner.role)) {
      return next(new ErrorResponse('New owner must have buyerOwner or buyerManager role', 400));
    }

    // Get old owner
    const oldOwner = await User.findById(restaurant.createdBy);

    // Start MongoDB transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update buyer ownership
      restaurant.createdBy = newOwnerId;
      restaurant.lastModifiedBy = req.user.id;
      restaurant.statusUpdatedAt = new Date();
      restaurant.adminNotes = reason || `Ownership transferred to ${newOwner.name}`;
      await restaurant.save({ session });

      // Update new owner's role and restaurant association
      if (newOwner.role === 'buyerManager') {
        newOwner.role = 'buyerOwner';
      }
      newOwner.buyerId = restaurant._id;
      newOwner.lastModifiedBy = req.user.id;
      await newOwner.save({ session });

      // If old owner exists, update their role to manager or deactivate
      if (oldOwner && !oldOwner.isDeleted) {
        // Remove from managers array if they were a manager
        restaurant.managers = restaurant.managers.filter(
          managerId => !managerId.equals(newOwnerId)
        );
        await restaurant.save({ session });

        // Optionally, you can convert old owner to manager or deactivate
        // For now, we'll just update their last modified info
        oldOwner.lastModifiedBy = req.user.id;
        await oldOwner.save({ session });
      }

      // Create audit log
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'restaurant_ownership_transferred',
        entityType: 'Buyer',
        entityId: restaurant._id,
        description: `Transferred buyer ownership from ${oldOwner?.name || 'Unknown'} to ${newOwner.name}`,
        reason,
        severity: 'high',
        impactLevel: 'major',
        metadata: {
          buyerId: restaurant._id,
          restaurantName: restaurant.name,
          oldOwnerId: oldOwner?._id,
          oldOwnerName: oldOwner?.name,
          newOwnerId: newOwner._id,
          newOwnerName: newOwner.name,
          adminId: req.user.id
        }
      });

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: 'Buyer ownership transferred successfully',
        data: {
          restaurant: await Buyer.findById(restaurant._id)
            .populate('createdBy', 'name email phone')
            .populate('managers', 'name email phone'),
          newOwner: {
            _id: newOwner._id,
            name: newOwner.name,
            email: newOwner.email,
            phone: newOwner.phone
          }
        }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Request additional documents from restaurant
 * @route   PUT /api/v1/admin/restaurants/:id/request-documents
 * @access  Private/Admin
 */
exports.requestBuyerDocuments = async (req, res, next) => {
  try {
    const { documentTypes, message, deadline } = req.body;

    // Validate inputs
    if (!documentTypes || !Array.isArray(documentTypes) || documentTypes.length === 0) {
      return next(new ErrorResponse('Document types array is required', 400));
    }

    // Find restaurant
    const restaurant = await Buyer.findById(req.params.id)
      .populate('createdBy', 'name email phone');

    if (!restaurant || restaurant.isDeleted) {
      return next(new ErrorResponse('Buyer not found', 404));
    }

    // Create document request record
    const documentRequest = {
      requestedBy: req.user.id,
      requestedAt: new Date(),
      documentTypes,
      message: message || 'Please submit the following documents for verification',
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      status: 'pending'
    };

    // Update restaurant with document request
    if (!restaurant.documentRequests) {
      restaurant.documentRequests = [];
    }
    restaurant.documentRequests.push(documentRequest);
    restaurant.lastModifiedBy = req.user.id;
    restaurant.statusUpdatedAt = new Date();

    // Add admin note
    const noteText = `Document request: ${documentTypes.join(', ')}`;
    restaurant.adminNotes = restaurant.adminNotes
      ? `${restaurant.adminNotes}\n${noteText}`
      : noteText;

    await restaurant.save();

    // Create audit log
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'restaurant_documents_requested',
      entityType: 'Buyer',
      entityId: restaurant._id,
      description: `Requested documents from restaurant: ${restaurant.name}`,
      severity: 'medium',
      impactLevel: 'moderate',
      metadata: {
        buyerId: restaurant._id,
        restaurantName: restaurant.name,
        documentTypes,
        deadline: documentRequest.deadline,
        adminId: req.user.id
      }
    });

    // TODO: Send email notification to buyer owner
    // This would integrate with your email service (Brevo)
    // await emailService.sendDocumentRequest({
    //   to: restaurant.createdBy.email,
    //   restaurantName: restaurant.name,
    //   documentTypes,
    //   message,
    //   deadline: documentRequest.deadline
    // });

    res.status(200).json({
      success: true,
      message: 'Document request sent successfully',
      data: {
        documentRequest,
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          email: restaurant.email
        }
      }
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
    const Product = require('../models/Product');
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

// ================================
// MARKET MANAGEMENT
// ================================

/**
 * @desc    Create a new market
 * @route   POST /api/v1/admin/markets
 * @access  Private/Admin
 */
exports.createMarket = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    // Check if image was uploaded
    if (!req.file) {
      return next(new ErrorResponse('Market image is required', 400));
    }

    // Create market data with image URL from Cloudinary
    const marketData = {
      ...req.body,
      location: {
        address: req.body.address || req.body['location.address'],
        city: req.body.city || req.body['location.city'],
        district: req.body.district || req.body['location.district'],
        coordinates: req.body.coordinates ?
          (typeof req.body.coordinates === 'string' ?
            JSON.parse(req.body.coordinates) : req.body.coordinates) :
          undefined
      },
      image: req.file.path, // Cloudinary URL
      createdBy: req.user.id
    };

    const Market = require('../models/Market');
    const market = await Market.create(marketData);

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'market_created',
      entityType: 'Market',
      entityId: market._id,
      description: `Created market: ${market.name}`,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    const populatedMarket = await Market.findById(market._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Market created successfully',
      data: populatedMarket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all markets with advanced filtering
 * @route   GET /api/v1/admin/markets
 * @access  Private/Admin
 */
exports.getMarkets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      city,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const Market = require('../models/Market');

    // Build query
    let query = { isDeleted: { $ne: true } };

    // Search by name, description, or city
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'flagged') {
        query.isAvailable = false;
      }
    }

    // Filter by city
    if (city && city !== 'all') {
      query['location.city'] = city;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const markets = await Market.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('flaggedBy', 'name email')
      .populate('deletedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add vendor count to each market
    const Vendor = require('../models/Vendor');
    for (let market of markets) {
      market.vendorCount = await Vendor.countDocuments({
        markets: market._id,
        isDeleted: { $ne: true }
      });
      market.activeVendorCount = await Vendor.countDocuments({
        markets: market._id,
        isActive: true,
        verificationStatus: 'approved',
        isDeleted: { $ne: true }
      });
    }

    // Get total count
    const total = await Market.countDocuments(query);

    // Calculate statistics
    const stats = await Market.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalMarkets: { $sum: 1 },
          activeMarkets: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          availableMarkets: {
            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] }
          },
          flaggedMarkets: {
            $sum: { $cond: [{ $eq: ['$isAvailable', false] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: markets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
        count: markets.length
      },
      stats: stats[0] || {
        totalMarkets: 0,
        activeMarkets: 0,
        availableMarkets: 0,
        flaggedMarkets: 0
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single market with usage statistics
 * @route   GET /api/v1/admin/markets/:id
 * @access  Private/Admin
 */
exports.getMarket = async (req, res, next) => {
  try {
    const Market = require('../models/Market');
    const market = await Market.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('flaggedBy', 'name email')
      .populate('deletedBy', 'name email');

    if (!market) {
      return next(new ErrorResponse(`Market not found with id of ${req.params.id}`, 404));
    }

    // Get usage statistics
    const usageStats = await market.canBeDeleted();

    res.status(200).json({
      success: true,
      data: {
        market,
        usageStats
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update market
 * @route   PUT /api/v1/admin/markets/:id
 * @access  Private/Admin
 */
exports.updateMarket = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const Market = require('../models/Market');
    let market = await Market.findById(req.params.id);

    if (!market) {
      return next(new ErrorResponse(`Market not found with id of ${req.params.id}`, 404));
    }

    if (market.isDeleted) {
      return next(new ErrorResponse('Cannot update deleted market', 400));
    }

    // Store old values for audit log
    const oldValues = {
      name: market.name,
      isActive: market.isActive,
      isAvailable: market.isAvailable
    };

    // Update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    // Handle location updates
    if (req.body.address || req.body['location.address'] || req.body.city || req.body['location.city']) {
      updateData.location = {
        address: req.body.address || req.body['location.address'] || market.location.address,
        city: req.body.city || req.body['location.city'] || market.location.city,
        district: req.body.district || req.body['location.district'] || market.location.district,
        coordinates: req.body.coordinates ?
          (typeof req.body.coordinates === 'string' ?
            JSON.parse(req.body.coordinates) : req.body.coordinates) :
          market.location.coordinates
      };
    }

    // If new image was uploaded, update the image URL
    if (req.file) {
      updateData.image = req.file.path; // Cloudinary URL
    }

    market = await Market.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

    // Log significant changes
    const changes = [];
    if (oldValues.name !== market.name) changes.push(`name changed from '${oldValues.name}' to '${market.name}'`);
    if (oldValues.isActive !== market.isActive) changes.push(`status changed to ${market.isActive ? 'active' : 'inactive'}`);
    if (oldValues.isAvailable !== market.isAvailable) changes.push(`availability changed to ${market.isAvailable ? 'available' : 'unavailable'}`);

    if (changes.length > 0) {
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'market_updated',
        entityType: 'Market',
        entityId: market._id,
        description: `Updated market: ${changes.join(', ')}`,
        severity: 'medium',
        impactLevel: 'moderate',
        metadata: { changes: oldValues }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Market updated successfully',
      data: market
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle market availability (flag system)
 * @route   PUT /api/v1/admin/markets/:id/availability
 * @access  Private/Admin
 */
exports.toggleMarketAvailability = async (req, res, next) => {
  try {
    const { isAvailable, flagReason } = req.body;

    if (isAvailable === undefined) {
      return next(new ErrorResponse('isAvailable field is required', 400));
    }

    if (!isAvailable && !flagReason) {
      return next(new ErrorResponse('Flag reason is required when disabling availability', 400));
    }

    const Market = require('../models/Market');
    const market = await Market.findById(req.params.id);
    if (!market) {
      return next(new ErrorResponse(`Market not found with id of ${req.params.id}`, 404));
    }

    if (market.isDeleted) {
      return next(new ErrorResponse('Cannot modify deleted market', 400));
    }

    const oldAvailability = market.isAvailable;

    // Use the model method to toggle availability
    market.toggleAvailability(isAvailable, flagReason, req.user.id);
    await market.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: isAvailable ? 'market_unflagged' : 'market_flagged',
      entityType: 'Market',
      entityId: market._id,
      description: `${isAvailable ? 'Enabled' : 'Disabled'} market availability: ${market.name}`,
      reason: flagReason,
      severity: 'medium',
      impactLevel: 'moderate',
      metadata: {
        oldAvailability,
        newAvailability: isAvailable
      }
    });

    const updatedMarket = await Market.findById(market._id)
      .populate('flaggedBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Market ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: updatedMarket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get market usage statistics
 * @route   GET /api/v1/admin/markets/:id/usage
 * @access  Private/Admin
 */
exports.getMarketUsageStats = async (req, res, next) => {
  try {
    const Market = require('../models/Market');
    const market = await Market.findById(req.params.id);

    if (!market) {
      return next(new ErrorResponse(`Market not found with id of ${req.params.id}`, 404));
    }

    const usageStats = await market.canBeDeleted();

    res.status(200).json({
      success: true,
      data: usageStats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Safe delete market with dependency check
 * @route   DELETE /api/v1/admin/markets/:id/safe-delete
 * @access  Private/Admin
 */
exports.safeDeleteMarket = async (req, res, next) => {
  try {
    const Market = require('../models/Market');
    const market = await Market.findById(req.params.id);
    if (!market) {
      return next(new ErrorResponse('Market not found', 404));
    }

    // Check for vendors in this market
    const Vendor = require('../models/Vendor');
    const vendorsInMarket = await Vendor.countDocuments({
      markets: req.params.id,
      isDeleted: { $ne: true }
    });

    if (vendorsInMarket > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete market with existing vendors',
        dependencies: {
          type: 'vendors',
          count: vendorsInMarket
        },
        suggestions: [
          'Move vendors to another market first',
          'Or deactivate this market instead of deleting'
        ]
      });
    }

    // Perform soft delete
    market.isDeleted = true;
    market.deletedAt = new Date();
    market.deletedBy = req.user.id;
    market.isActive = false;
    await market.save();

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'market_deleted',
      entityType: 'Market',
      entityId: market._id,
      description: `Deleted market: ${market.name}`,
      severity: 'high',
      impactLevel: 'significant'
    });

    res.status(200).json({
      success: true,
      message: 'Market deleted successfully',
      data: { deletedId: market._id }
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
        select: 'name description category images variety origin seasonality',
        populate: {
          path: 'category',
          select: 'name description'
        }
      })
      .populate('vendorId', 'businessName contactInfo email phone address tradeLicenseNo logo ownerName')
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
      .populate('vendorId', 'businessName contactInfo email phone address tradeLicenseNo logo ownerName')
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
    .populate('buyerId', 'name email phone')
    .populate('placedBy', 'name email')
    .select('orderNumber status totalAmount items createdAt deliveryInfo')
    .sort({ createdAt: -1 })
    .limit(10);

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
      await vendor.save({ session, validateModifiedOnly: true });

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
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new ErrorResponse(`Validation failed: ${messages.join(', ')}`, 400));
    }
    if (err.code === 11000) {
      return next(new ErrorResponse('Duplicate key error', 409));
    }
    next(err);
  } finally {
    session.endSession();
  }
}


/**
 * @desc    Toggle buyer verification status
 * @route   PUT /api/v1/admin/restaurants/:id/verification
 * @access  Private/Admin
 */
exports.toggleBuyerVerification = async (req, res, next) => {
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
    const affectedUsersCount = await User.countDocuments({ buyerId: req.params.id });

    const result = await session.withTransaction(async () => {
      const restaurant = await Buyer.findById(req.params.id).session(session);
      if (!restaurant) {
        throw new ErrorResponse(`Buyer not found with id of ${req.params.id}`, 404);
      }

      const oldVerificationStatus = restaurant.verificationStatus;
      
      // Update restaurant verification with three-state system
      restaurant.verificationStatus = verificationStatus;
      restaurant.verificationDate = (verificationStatus === 'approved') ? new Date() : null;
      restaurant.statusUpdatedBy = req.user.id;
      restaurant.statusUpdatedAt = new Date();
      restaurant.adminNotes = reason;
      await restaurant.save({ session, validateModifiedOnly: true });

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
        entityType: 'Buyer',
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
    const populatedBuyer = await Buyer.findById(result._id)
      .populate('statusUpdatedBy', 'name email')
      .populate('managers', 'name email');

    // Create appropriate response message based on verification status
    const messageMap = {
      'approved': 'Buyer verification approved successfully',
      'rejected': 'Buyer verification rejected successfully', 
      'pending': 'Buyer status reset to pending successfully'
    };
    
    const responseMessage = messageMap[result.verificationStatus] || 
      `Buyer verification status updated to ${result.verificationStatus} successfully`;

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: populatedBuyer
    });
  } catch (err) {
    // withTransaction handles abort automatically, only handle specific error cases
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return next(new ErrorResponse(`Validation failed: ${messages.join(', ')}`, 400));
    }
    if (err.code === 11000) {
      return next(new ErrorResponse('Duplicate key error', 409));
    }
    next(err);
  } finally {
    session.endSession();
  }
};
