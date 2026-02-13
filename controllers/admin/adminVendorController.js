const User = require("../../models/User");
const Vendor = require("../../models/Vendor");
const Order = require("../../models/Order");
const Listing = require("../../models/Listing");
const AuditLog = require("../../models/AuditLog");
const { ErrorResponse } = require("../../middleware/error");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const { cloudinary } = require("../../middleware/upload");
const NotificationService = require("../../services/notificationService");

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
      const Market = require('../../models/Market');
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
    const Market = require('../../models/Market');
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

    // Send approval notification to vendor user(s)
    const vendorUsers = await User.find({ vendorId: req.params.id, isActive: true });
    for (const vendorUser of vendorUsers) {
      await NotificationService.createApprovalNotification(
        vendorUser._id,
        'Vendor',
        result.businessName,
        verificationStatus,
        reason
      );
    }

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
