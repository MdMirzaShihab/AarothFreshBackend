const User = require("../../models/User");
const Buyer = require("../../models/Buyer");
const Order = require("../../models/Order");
const AuditLog = require("../../models/AuditLog");
const { ErrorResponse } = require("../../middleware/error");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const { cloudinary } = require("../../middleware/upload");
const NotificationService = require("../../services/notificationService");

// ================================
// BUYER MANAGEMENT
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

    // Get top locations (by division)
    const topLocations = await Buyer.aggregate([
      { $match: { isDeleted: { $ne: true }, 'address.division': { $exists: true } } },
      {
        $lookup: {
          from: 'divisions',
          localField: 'address.division',
          foreignField: '_id',
          as: 'divisionData'
        }
      },
      { $unwind: '$divisionData' },
      {
        $group: {
          _id: '$address.division',
          name: { $first: '$divisionData.name.en' },
          nameBn: { $first: '$divisionData.name.bn' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
      {
        $project: {
          _id: 0,
          name: 1,
          nameBn: 1,
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
        topLocations: topLocations || [] // Updated from topCities to topLocations (divisions)
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

    // Send approval notification to buyer user(s)
    const buyerUsers = await User.find({ buyerId: req.params.id, isActive: true });
    for (const buyerUser of buyerUsers) {
      await NotificationService.createApprovalNotification(
        buyerUser._id,
        'Buyer',
        result.name,
        result.verificationStatus,
        reason
      );
    }

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
