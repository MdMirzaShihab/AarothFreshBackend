const { validationResult } = require('express-validator');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Restaurant = require('../models/Restaurant');
const { ErrorResponse } = require('../middleware/error');
const sendEmail = require('../utils/email');
const { canUserCreateListings, canUserPlaceOrders, canUserManageRestaurant } = require('../middleware/approval');

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

    // Check if user already exists - sanitize inputs to prevent NoSQL injection
    const existingUser = await User.findOne({
      $or: [
        { email: String(email) },
        { phone: String(phone) }
      ]
    });
    
    if (existingUser) {
      // Provide specific error messages
      if (existingUser.email === email) {
        return next(new ErrorResponse('User with this email already exists', 400));
      }
      if (existingUser.phone === phone) {
        return next(new ErrorResponse('User with this phone number already exists', 400));
      }
    }

    let vendorId = null;
    let restaurantId = null;

    if (role === 'vendor') {
      // Create vendor
      const vendorData = {
        businessName,
        ownerName: ownerName || name,
        email,
        phone,
        address,
        tradeLicenseNo
      };

      // Add logo if uploaded
      if (req.file) {
        vendorData.logo = req.file.path;
      }

      const vendor = await Vendor.create(vendorData);
      vendorId = vendor._id;
    } else if (role === 'restaurantOwner') {
      // Create restaurant
      const restaurantData = {
        name: restaurantName,
        ownerName: ownerName || name,
        email,
        phone,
        address,
        tradeLicenseNo
      };

      // Add logo if uploaded
      if (req.file) {
        restaurantData.logo = req.file.path;
      }

      const restaurant = await Restaurant.create(restaurantData);
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

    // Get user data without password for response
    const userData = await User.findById(user._id)
      .populate('vendorId')
      .populate('restaurantId');

    res.status(201).json({
      success: true,
      token,
      user: userData
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

      // Find user by phone and include password field - sanitize input
      const user = await User.findOne({ phone: String(phone) }).select('+password');

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

      // Get user data without password for response
      const userData = await User.findById(user._id)
        .populate('vendorId')
        .populate('restaurantId');
  
      res.status(200).json({
        success: true,
        token,
        user: userData
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
 * @desc    Get user approval status and capabilities
 * @route   GET /api/auth/status
 * @access  Private
 */
exports.getUserStatus = async (req, res, next) => {
  try {
    const user = req.user;

    // Get business verification status and next steps
    const getBusinessStatusAndSteps = (user) => {
      let verificationStatus = 'pending';
      let businessType = '';
      let businessName = '';
      let verificationDate = null;
      let adminNotes = null;

      if (user.role === 'vendor' && user.vendorId) {
        verificationStatus = user.vendorId.verificationStatus || 'pending';
        businessType = 'vendor business';
        businessName = user.vendorId.businessName;
        verificationDate = user.vendorId.verificationDate;
        adminNotes = user.vendorId.adminNotes;
      } else if (['restaurantOwner', 'restaurantManager'].includes(user.role) && user.restaurantId) {
        verificationStatus = user.restaurantId.verificationStatus || 'pending';
        businessType = 'restaurant';
        businessName = user.restaurantId.name;
        verificationDate = user.restaurantId.verificationDate;
        adminNotes = user.restaurantId.adminNotes;
      }

      let nextSteps = [];
      if (verificationStatus === 'approved') {
        const roleSpecificSteps = {
          vendor: [
            'Your vendor business is verified',
            'You can now create and manage product listings',
            'Start receiving orders from restaurants',
            'Complete your business profile for better visibility'
          ],
          restaurantOwner: [
            'Your restaurant is verified',
            'You can now place orders from verified vendors',
            'Manage your restaurant profile and settings',
            'Add restaurant managers if needed'
          ],
          restaurantManager: [
            'This restaurant is verified',
            'You can now place orders for your restaurant',
            'View order history and manage current orders',
            'Update restaurant operational details'
          ]
        };
        nextSteps = roleSpecificSteps[user.role] || ['You have full access to all platform features'];
      } else if (verificationStatus === 'rejected') {
        nextSteps = [
          `Your ${businessType} verification was rejected`,
          adminNotes ? `Admin feedback: ${adminNotes}` : 'Please review the issues mentioned by admin',
          'Address all the issues mentioned in the feedback',
          'Contact admin for clarification if needed',
          'Resubmit your application after making required changes'
        ];
      } else { // pending
        nextSteps = [
          `Wait for admin verification of your ${businessType}`,
          'Ensure all required business documents are uploaded',
          'Check your email for any additional requirements',
          'Contact admin if you have been waiting more than 3 business days',
          'Complete your business profile with accurate information'
        ];
      }

      return {
        verificationStatus,
        businessType,
        businessName,
        verificationDate,
        adminNotes,
        nextSteps
      };
    };

    // Get business status information
    const businessStatus = getBusinessStatusAndSteps(user);

    // Build response with user capabilities and status
    const statusInfo = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      },
      businessVerification: {
        verificationStatus: businessStatus.verificationStatus,
        businessType: businessStatus.businessType,
        businessName: businessStatus.businessName,
        verificationDate: businessStatus.verificationDate,
        adminNotes: businessStatus.adminNotes
      },
      capabilities: {
        canCreateListings: canUserCreateListings(user),
        canPlaceOrders: canUserPlaceOrders(user),
        canManageRestaurant: canUserManageRestaurant(user),
        canAccessDashboard: businessStatus.verificationStatus === 'approved' || user.role === 'admin',
        canUpdateProfile: true // Everyone can update basic profile
      },
      restrictions: {
        hasRestrictions: businessStatus.verificationStatus !== 'approved' && user.role !== 'admin',
        reason: businessStatus.verificationStatus === 'approved' 
          ? null
          : `${businessStatus.businessType} "${businessStatus.businessName}" is ${businessStatus.verificationStatus}`
      },
      nextSteps: businessStatus.nextSteps,
      businessInfo: {}
    };

    // Add detailed business-specific information
    if (user.vendorId) {
      statusInfo.businessInfo.vendor = {
        id: user.vendorId._id,
        businessName: user.vendorId.businessName,
        tradeLicenseNo: user.vendorId.tradeLicenseNo,
        verificationStatus: user.vendorId.verificationStatus || 'pending',
        verificationDate: user.vendorId.verificationDate,
        adminNotes: user.vendorId.adminNotes,
        isActive: user.vendorId.isActive,
        address: user.vendorId.address
      };
    }

    if (user.restaurantId) {
      statusInfo.businessInfo.restaurant = {
        id: user.restaurantId._id,
        name: user.restaurantId.name,
        tradeLicenseNo: user.restaurantId.tradeLicenseNo,
        verificationStatus: user.restaurantId.verificationStatus || 'pending',
        verificationDate: user.restaurantId.verificationDate,
        adminNotes: user.restaurantId.adminNotes,
        isActive: user.restaurantId.isActive,
        address: user.restaurantId.address
      };
    }

    res.status(200).json({
      success: true,
      data: statusInfo
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

    // Handle optional profile image upload
    if (req.file) {
      updatedFields.profileImage = req.file.path; // Cloudinary URL
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
