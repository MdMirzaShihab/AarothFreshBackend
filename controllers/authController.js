const { validationResult } = require('express-validator');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Restaurant = require('../models/Restaurant');
const { ErrorResponse } = require('../middleware/error');
const sendEmail = require('../utils/email');

/**
 * @desc    Register a new vendor or restaurant owner
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    // Destructure request body
    let {
      name,
      email,
      password,
      phone,
      role,
      businessName,
      ownerName,
      address,
      tradeLicenseNo, 
      restaurantName,
    } = req.body;

    if (phone && !phone.startsWith('+')) {
      phone = `+880${phone}`;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone, email });
    if (existingUser) {
      return next(new ErrorResponse('User with this email already exists', 400));
    }

    let vendorId = null;
    let restaurantId = null;

    if (role === 'vendor') {
      // Create vendor
      const vendor = await Vendor.create({
        businessName,
        ownerName: ownerName || name,
        email,
        phone,
        address,
        tradeLicenseNo, 
      });

      vendorId = vendor._id;
    } else if (role === 'restaurantOwner') {
      // Create restaurant
      const restaurant = await Restaurant.create({
        name: restaurantName,
        ownerName: ownerName || name,
        email,
        phone,
        address,
        tradeLicenseNo,
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
      restaurantId,
    });

    // Update the createdBy field in vendor/restaurant
    if (vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, { createdBy: user._id });
    }
    if (restaurantId) {
      await Restaurant.findByIdAndUpdate(restaurantId, { createdBy: user._id });
    }

    // Send welcome email (code omitted for brevity)

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
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

    let { phone, password } = req.body;

    // Add default country code if missing
    if (phone && !phone.startsWith('+')) {
      phone = `+880${phone}`;
    }

      // Find user by phone and include password field
      const user = await User.findOne({ phone }).select('+password');

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

    const { name } = req.body;
    const updatedFields = {};
    if (name) {
      updatedFields.name = name;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updatedFields,
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

    let { name, email, password, phone } = req.body;

    if (phone && !phone.startsWith('+')) {
      phone = `+880${phone.slice(-10)}`; // Ensures correct length
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

    if (existingUser) {
      // Check which field was the duplicate for a more specific error message
      if (existingUser.email === email) {
        return next(new ErrorResponse('A user with this email already exists', 400));
      }
      if (existingUser.phone === phone) {
        return next(new ErrorResponse('A user with this phone number already exists', 400));
      }
    }

    // Create manager user
    const manager = await User.create({
      name,
      email,
      password,
      phone,
      role: 'restaurantManager',
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
      role: 'restaurantManager', // Change this line
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
      role: 'restaurantManager',
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
