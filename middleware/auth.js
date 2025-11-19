const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ErrorResponse } = require('./error');

/**
 * Protect routes - JWT verification middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Enhanced token extraction - check multiple possible header formats
    const authHeader = req.headers.authorization || req.headers['authorization'] || req.headers.Authorization;
    
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token - populate selectively to avoid N+1 queries
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new ErrorResponse('No user found with this token', 401));
      }

      // Check if user account is active
      if (!user.isActive) {
        return next(new ErrorResponse('Account has been deactivated. Contact admin for assistance.', 401));
      }

      // Check if user account is deleted
      if (user.isDeleted) {
        return next(new ErrorResponse('Account not found', 401));
      }

      // Only populate related data if needed (reduces database load)
      try {
        if (user.vendorId) {
          await user.populate('vendorId');
        }
        if (user.buyerId) {
          await user.populate('buyerId');
        }
      } catch (populationError) {
        console.warn('User population warning:', populationError.message);
        // Continue with user object even if population fails
        // This prevents authentication failure due to population issues
      }

      req.user = user;
      next();
    } catch (error) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Please login to access this route', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is not authorized to access this route. Allowed roles: ${roles.join(', ')}`,
          403
        )
      );
    }
    next();
  };
};

/**
 * Check if user owns the resource
 * @param {string} resourceModel - The model name to check ownership
 * @returns {Function} Express middleware function
 */
const checkOwnership = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const Model = require(`../models/${resourceModel}`);
      const resource = await Model.findById(req.params.id);

      if (!resource) {
        return next(new ErrorResponse(`${resourceModel} not found`, 404));
      }

      // Check ownership based on user role
      if (req.user.role === 'admin') {
        return next(); // Admin can access all resources
      }

      if (req.user.role === 'vendor' && resource.vendorId) {
        if (resource.vendorId.toString() !== req.user.vendorId._id.toString()) {
          return next(new ErrorResponse('Not authorized to access this resource', 403));
        }
      }

      if ((req.user.role === 'buyerOwner' || req.user.role === 'buyerManager') && resource.buyerId) {
        if (resource.buyerId.toString() !== req.user.buyerId._id.toString()) {
          return next(new ErrorResponse('Not authorized to access this resource', 403));
        }
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Enhanced authorization that considers approval status
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
const authorizeApproved = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Please login to access this route', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is not authorized to access this route. Allowed roles: ${roles.join(', ')}`,
          403
        )
      );
    }

    // Admin users bypass approval checks
    if (req.user.role === 'admin') {
      return next();
    }

    // Note: Approval status checking now handled at business entity level via approval middleware

    next();
  };
};

module.exports = { protect, authorize, authorizeApproved, checkOwnership };