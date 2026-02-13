const User = require("../../models/User");
const Order = require("../../models/Order");
const { ErrorResponse } = require("../../middleware/error");
const { validationResult } = require("express-validator");

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
