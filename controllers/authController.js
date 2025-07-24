const { validationResult } = require('express-validator');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Restaurant = require('../models/Restaurant');
const { ErrorResponse } = require('../middleware/error');

/**
 * @desc    Register a new vendor or restaurant owner
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const {
      name,
      email,
      password,
      phone,
      role,
      // Vendor specific fields
      businessName,
      ownerName,
      address,
      // Restaurant specific fields
      restaurantName,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('User with this email already exists', 400));
    }

    let vendorId = null;
    let restaurantId = null;

    // Create vendor or restaurant based on role
    if (role === 'vendor') {
      // Create vendor
      const vendor = await Vendor.create({
        businessName,
        ownerName: ownerName || name,
        email,
        phone,
        address,
      });

      vendorId = vendor._id;
    } else if (role === 'owner') {
      // Create restaurant
      const restaurant = await Restaurant.create({
        name: restaurantName,
        ownerName: ownerName || name,
        email,
        phone,
        address,
      });

      restaurantId = restaurant._id;
    } else {
      return next(new ErrorResponse('Invalid role for registration', 400));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      vendorId,
      restaurantId
    });

    // Update the createdBy field in vendor/restaurant
    if (vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, { createdBy: user._id });
    }
    if (restaurantId) {
      await Restaurant.findByIdAndUpdate(restaurantId, { createdBy: user._id });
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new ErrorResponse('Account has been deactivated', 401));
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('vendorId')
      .populate('restaurantId');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const { name, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone },
      { new: true, runValidators: true }
    ).populate('vendorId').populate('restaurantId');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Current password is incorrect', 400));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create manager account (Owner only)
 * @route   POST /api/auth/create-manager
 * @access  Private (Owner only)
 */
exports.createManager = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('User with this email already exists', 400));
    }

    // Create manager user
    const manager = await User.create({
      name,
      email,
      password,
      phone,
      role: 'manager',
      restaurantId: req.user.restaurantId._id
    });

    // Add manager to restaurant's managers array
    await Restaurant.findByIdAndUpdate(
      req.user.restaurantId._id,
      { $push: { managers: manager._id } }
    );

    res.status(201).json({
      success: true,
      data: manager
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get restaurant managers (Owner only)
 * @route   GET /api/auth/managers
 * @access  Private (Owner only)
 */
exports.getManagers = async (req, res, next) => {
  try {
    const managers = await User.find({
      role: 'manager',
      restaurantId: req.user.restaurantId._id,
      isActive: true
    }).select('-password');

    res.status(200).json({
      success: true,
      count: managers.length,
      data: managers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate manager account (Owner only)
 * @route   PUT /api/auth/managers/:id/deactivate
 * @access  Private (Owner only)
 */
exports.deactivateManager = async (req, res, next) => {
  try {
    const manager = await User.findOne({
      _id: req.params.id,
      role: 'manager',
      restaurantId: req.user.restaurantId._id
    });

    if (!manager) {
      return next(new ErrorResponse('Manager not found', 404));
    }

    manager.isActive = false;
    await manager.save();

    res.status(200).json({
      success: true,
      message: 'Manager account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
