const { ErrorResponse } = require('./error');

/**
 * Middleware to check if business entity is verified for specific actions
 * @param {Object} options - Configuration options
 * @param {Array} options.roles - Roles that require verification checking
 * @param {String} options.action - Action being performed (for error messages)
 * @param {Boolean} options.allowUnverified - Whether to allow unverified businesses
 * @returns {Function} Express middleware function
 */
const requireApproval = (options = {}) => {
  const { 
    roles = ['vendor', 'restaurantOwner', 'restaurantManager'], 
    action = 'perform this action',
    allowUnverified = false 
  } = options;

  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return next(new ErrorResponse('Authentication required', 401));
    }

    // Admin users bypass verification checks
    if (user.role === 'admin') {
      return next();
    }

    // Check if user role requires verification
    if (!roles.includes(user.role)) {
      return next();
    }

    // Check business entity verification status
    let verificationStatus = 'pending';
    let businessType = '';
    let businessName = '';
    let adminNotes = null;

    if (user.role === 'vendor') {
      if (!user.vendorId) {
        return next(new ErrorResponse('Vendor information not found', 400));
      }
      verificationStatus = user.vendorId.verificationStatus || 'pending';
      businessType = 'vendor';
      businessName = user.vendorId.businessName;
      adminNotes = user.vendorId.adminNotes;
    } else if (['restaurantOwner', 'restaurantManager'].includes(user.role)) {
      if (!user.restaurantId) {
        return next(new ErrorResponse('Restaurant information not found', 400));
      }
      verificationStatus = user.restaurantId.verificationStatus || 'pending';
      businessType = 'restaurant';
      businessName = user.restaurantId.name;
      adminNotes = user.restaurantId.adminNotes;
    }

    if (verificationStatus !== 'approved' && !allowUnverified) {
      const roleMessage = getBusinessVerificationMessage(user.role, businessType, verificationStatus, adminNotes);
      return next(new ErrorResponse(
        `Your ${businessType} "${businessName}" is ${verificationStatus}. ${roleMessage} You cannot ${action} until approved.`,
        403
      ));
    }

    next();
  };
};

/**
 * Middleware to check vendor approval specifically for listing operations
 */
const requireVendorApproval = (action = 'manage listings') => {
  return requireApproval({
    roles: ['vendor'],
    action,
    allowPending: false
  });
};

/**
 * Middleware to check restaurant approval specifically for order operations
 */
const requireRestaurantApproval = (action = 'place orders') => {
  return requireApproval({
    roles: ['restaurantOwner', 'restaurantManager'],
    action,
    allowPending: false
  });
};

/**
 * Middleware to add approval status information to response
 * Useful for frontend to understand user capabilities
 */
const addApprovalStatus = (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    return next();
  }

  // Add approval info to response locals for access in controllers
  res.locals.approvalInfo = {
    status: user.approvalStatus,
    canCreateListings: canUserCreateListings(user),
    canPlaceOrders: canUserPlaceOrders(user),
    canManageRestaurant: canUserManageRestaurant(user),
    approvalDate: user.approvalDate,
    rejectionReason: user.rejectionReason,
    nextSteps: getNextSteps(user)
  };

  next();
};

/**
 * Helper function to determine if user can create listings
 */
function canUserCreateListings(user) {
  if (user.role !== 'vendor') return false;
  if (!user.vendorId) return false;
  return user.vendorId.verificationStatus === 'approved';
}

/**
 * Helper function to determine if user can place orders
 */
function canUserPlaceOrders(user) {
  if (!['restaurantOwner', 'restaurantManager'].includes(user.role)) return false;
  if (!user.restaurantId) return false;
  return user.restaurantId.verificationStatus === 'approved';
}

/**
 * Helper function to determine if user can manage restaurant
 */
function canUserManageRestaurant(user) {
  if (!['restaurantOwner', 'restaurantManager'].includes(user.role)) return false;
  if (!user.restaurantId) return false;
  return user.restaurantId.verificationStatus === 'approved';
}

/**
 * Get role-specific messaging for business verification status
 */
function getBusinessVerificationMessage(role, businessType, verificationStatus, adminNotes) {
  if (verificationStatus === 'rejected') {
    const baseMessage = `Your ${businessType} verification was rejected by admin.`;
    const adminFeedback = adminNotes ? ` Admin feedback: "${adminNotes}"` : '';
    const actionSteps = ' Please address the issues mentioned and resubmit your application.';
    return baseMessage + adminFeedback + actionSteps;
  } else if (verificationStatus === 'pending') {
    const messages = {
      vendor: 'As a vendor, your business is pending admin verification before you can create listings or receive orders.',
      restaurantOwner: 'As a restaurant owner, your restaurant is pending admin verification before you can place orders.',
      restaurantManager: 'As a restaurant manager, this restaurant is pending admin verification before you can place orders or manage operations.'
    };
    
    return messages[role] || `Your ${businessType} is pending admin verification to access full platform features.`;
  }
  
  // This shouldn't happen for approved status, but fallback just in case
  return `Your ${businessType} needs admin verification to access full platform features.`;
}

/**
 * Get next steps based on business verification status
 */
function getNextSteps(user) {
  let verificationStatus = 'pending';
  let businessType = '';
  let adminNotes = null;

  if (user.role === 'vendor' && user.vendorId) {
    verificationStatus = user.vendorId.verificationStatus || 'pending';
    businessType = 'vendor business';
    adminNotes = user.vendorId.adminNotes;
  } else if (['restaurantOwner', 'restaurantManager'].includes(user.role) && user.restaurantId) {
    verificationStatus = user.restaurantId.verificationStatus || 'pending';
    businessType = 'restaurant';
    adminNotes = user.restaurantId.adminNotes;
  }

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
    return roleSpecificSteps[user.role] || ['You have full access to all platform features'];
  } else if (verificationStatus === 'rejected') {
    return [
      `Your ${businessType} verification was rejected`,
      adminNotes ? `Admin feedback: ${adminNotes}` : 'Please review the issues mentioned by admin',
      'Address all the issues mentioned in the feedback',
      'Update your business documents and information as required',
      'Contact admin for clarification if needed',
      'Resubmit your application after making required changes'
    ];
  } else { // pending
    return [
      `Wait for admin verification of your ${businessType}`,
      'Ensure all required business documents are uploaded',
      'Check your email for any additional requirements',
      'Contact admin if you have been waiting more than 3 business days',
      'Complete your business profile with accurate information'
    ];
  }
}

/**
 * Validation middleware to ensure approval-related fields are not tampered with
 */
const protectApprovalFields = (req, res, next) => {
  const protectedFields = [
    // Three-state verification fields
    'verificationStatus',
    'verificationDate',
    'statusUpdatedBy',
    'statusUpdatedAt',
    'adminNotes'
  ];

  // Remove protected fields from request body to prevent tampering
  protectedFields.forEach(field => {
    if (req.body.hasOwnProperty(field)) {
      delete req.body[field];
    }
  });

  next();
};

module.exports = {
  requireApproval,
  requireVendorApproval,
  requireRestaurantApproval,
  addApprovalStatus,
  protectApprovalFields,
  canUserCreateListings,
  canUserPlaceOrders,
  canUserManageRestaurant
};