const { validationResult } = require('express-validator');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Buyer = require('../models/Buyer');
const { ErrorResponse } = require('../middleware/error');
const sendEmail = require('../utils/email');
const { canUserCreateListings, canUserPlaceOrders, canUserManageBuyer } = require('../middleware/approval');

/**
 * @desc    Register a new vendor or buyer owner
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
      buyerType,
      typeSpecificData,
    } = req.body;

    // Security: Prevent public registration from setting platform vendor flags
    if (req.body.isPlatformOwned === true || req.body.platformName || req.body.isEditable === false) {
      return next(new ErrorResponse('Platform vendor accounts can only be created by administrators', 403));
    }

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
    let buyerId = null;

    if (role === 'vendor') {
      // Validate markets - vendors must operate in at least one market
      const { markets } = req.body;

      if (!markets || !Array.isArray(markets) || markets.length === 0) {
        return next(new ErrorResponse('Vendors must select at least one market to operate in', 400));
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

      // Create vendor
      const vendorData = {
        businessName,
        ownerName: ownerName || name,
        email,
        phone,
        address,
        tradeLicenseNo,
        markets // Assign markets to vendor
      };

      // Add logo if uploaded
      if (req.file) {
        vendorData.logo = req.file.path;
      }

      const vendor = await Vendor.create(vendorData);
      vendorId = vendor._id;
    } else if (role === 'buyerOwner') {
      // Validate buyerType
      if (!buyerType) {
        return next(new ErrorResponse('Buyer type is required for buyer registration', 400));
      }

      // Create buyer
      const buyerData = {
        name: businessName,
        ownerName: ownerName || name,
        email,
        phone,
        address,
        tradeLicenseNo,
        buyerType, // restaurant, corporate, supershop, or catering
        typeSpecificData: typeSpecificData || {}
      };

      // Add logo if uploaded
      if (req.file) {
        buyerData.logo = req.file.path;
      }

      const buyer = await Buyer.create(buyerData);
      buyerId = buyer._id;
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
      buyerId,
    });

    // Update the createdBy field in vendor/buyer
    if (vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, { createdBy: user._id });
    }
    if (buyerId) {
      await Buyer.findByIdAndUpdate(buyerId, { createdBy: user._id });
    }

    // Send welcome email (code omitted for brevity)

    // Generate JWT token
    const token = user.getSignedJwtToken();

    // Get user data without password for response
    const userData = await User.findById(user._id)
      .populate('vendorId')
      .populate('buyerId');

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
        .populate('buyerId');
  
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
      .populate('buyerId');

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
      } else if (['buyerOwner', 'buyerManager'].includes(user.role) && user.buyerId) {
        verificationStatus = user.buyerId.verificationStatus || 'pending';
        businessType = user.buyerId.displayType || 'buyer';
        businessName = user.buyerId.name;
        verificationDate = user.buyerId.verificationDate;
        adminNotes = user.buyerId.adminNotes;
      }

      let nextSteps = [];
      if (verificationStatus === 'approved') {
        const roleSpecificSteps = {
          vendor: [
            'Your vendor business is verified',
            'You can now create and manage product listings',
            'Start receiving orders from buyers',
            'Complete your business profile for better visibility'
          ],
          buyerOwner: [
            `Your ${businessType.toLowerCase()} is verified`,
            'You can now place orders from verified vendors',
            'Manage your business profile and settings',
            'Add managers to your account if needed'
          ],
          buyerManager: [
            `This ${businessType.toLowerCase()} is verified`,
            'You can now place orders for your business',
            'View order history and manage current orders',
            'Update business operational details'
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
        canManageBuyer: canUserManageBuyer(user),
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

    if (user.buyerId) {
      statusInfo.businessInfo.buyer = {
        id: user.buyerId._id,
        name: user.buyerId.name,
        buyerType: user.buyerId.buyerType,
        displayType: user.buyerId.displayType,
        tradeLicenseNo: user.buyerId.tradeLicenseNo,
        verificationStatus: user.buyerId.verificationStatus || 'pending',
        verificationDate: user.buyerId.verificationDate,
        adminNotes: user.buyerId.adminNotes,
        isActive: user.buyerId.isActive,
        address: user.buyerId.address,
        typeSpecificData: user.buyerId.typeSpecificData
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
    ).populate('vendorId').populate('buyerId');

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
      role: 'buyerManager',
      buyerId: req.user.buyerId._id
    });

    // Add manager to buyer's managers array
    await Buyer.findByIdAndUpdate(
      req.user.buyerId._id,
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
 * @desc    Get buyer managers (Owner only)
 * @route   GET /api/auth/managers
 * @access  Private (Owner only)
 */
exports.getManagers = async (req, res, next) => {
  try {
    const managers = await User.find({
      role: 'buyerManager',
      buyerId: req.user.buyerId._id,
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
      role: 'buyerManager',
      buyerId: req.user.buyerId._id
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
