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
    let isVerified = false;
    let businessType = '';
    let businessName = '';

    if (user.role === 'vendor') {
      if (!user.vendorId) {
        return next(new ErrorResponse('Vendor information not found', 400));
      }
      isVerified = user.vendorId.isVerified;
      businessType = 'vendor';
      businessName = user.vendorId.businessName;
    } else if (['restaurantOwner', 'restaurantManager'].includes(user.role)) {
      if (!user.restaurantId) {
        return next(new ErrorResponse('Restaurant information not found', 400));
      }
      isVerified = user.restaurantId.isVerified;
      businessType = 'restaurant';
      businessName = user.restaurantId.name;
    }

    if (!isVerified && !allowUnverified) {
      const roleMessage = getBusinessVerificationMessage(user.role, businessType);
      return next(new ErrorResponse(
        `Your ${businessType} "${businessName}" is not verified. ${roleMessage} You cannot ${action} until verified.`,
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
  return user.vendorId.isVerified === true;
}

/**
 * Helper function to determine if user can place orders
 */
function canUserPlaceOrders(user) {
  if (!['restaurantOwner', 'restaurantManager'].includes(user.role)) return false;
  if (!user.restaurantId) return false;
  return user.restaurantId.isVerified === true;
}

/**
 * Helper function to determine if user can manage restaurant
 */
function canUserManageRestaurant(user) {
  if (!['restaurantOwner', 'restaurantManager'].includes(user.role)) return false;
  if (!user.restaurantId) return false;
  return user.restaurantId.isVerified === true;
}

/**
 * Get role-specific messaging for business verification status
 */
function getBusinessVerificationMessage(role, businessType) {
  const messages = {
    vendor: 'As a vendor, your business needs admin verification before you can create listings or receive orders.',
    restaurantOwner: 'As a restaurant owner, your restaurant needs admin verification before you can place orders.',
    restaurantManager: 'As a restaurant manager, this restaurant needs admin verification before you can place orders or manage operations.'
  };
  
  return messages[role] || `Your ${businessType} needs admin verification to access full platform features.`;
}

/**
 * Get next steps based on business verification status
 */
function getNextSteps(user) {
  let isVerified = false;
  let businessType = '';

  if (user.role === 'vendor' && user.vendorId) {
    isVerified = user.vendorId.isVerified;
    businessType = 'vendor business';
  } else if (['restaurantOwner', 'restaurantManager'].includes(user.role) && user.restaurantId) {
    isVerified = user.restaurantId.isVerified;
    businessType = 'restaurant';
  }

  if (isVerified) {
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
  } else {
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
    'approvalStatus',
    'approvalDate', 
    'approvedBy',
    'rejectionReason',
    'approvalNotes'
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