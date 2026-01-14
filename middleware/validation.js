const { body, validationResult, check } = require("express-validator");
const { ErrorResponse } = require("./error");

/**
 * Handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new ErrorResponse(errorMessages.join(", "), 400));
  }
  next();
};

/**
 * BD Address validation rules (hierarchical validation)
 */
const bdAddressValidation = [
  body('address.division')
    .isMongoId()
    .withMessage('Valid division is required')
    .custom(async (divisionId) => {
      const Division = require('../models/Division');
      const division = await Division.findById(divisionId);
      if (!division || !division.isActive) {
        throw new Error('Invalid or inactive division');
      }
      return true;
    }),

  body('address.district')
    .isMongoId()
    .withMessage('Valid district is required')
    .custom(async (districtId, { req }) => {
      const District = require('../models/District');
      const district = await District.findById(districtId);

      if (!district || !district.isActive) {
        throw new Error('Invalid or inactive district');
      }

      // Validate district belongs to division
      if (req.body.address?.division &&
          district.division.toString() !== req.body.address.division) {
        throw new Error('District does not belong to selected division');
      }

      return true;
    }),

  body('address.upazila')
    .isMongoId()
    .withMessage('Valid upazila is required')
    .custom(async (upazilaId, { req }) => {
      const Upazila = require('../models/Upazila');
      const upazila = await Upazila.findById(upazilaId);

      if (!upazila || !upazila.isActive) {
        throw new Error('Invalid or inactive upazila');
      }

      // Validate upazila belongs to district
      if (req.body.address?.district &&
          upazila.district.toString() !== req.body.address.district) {
        throw new Error('Upazila does not belong to selected district');
      }

      // Validate upazila belongs to division
      if (req.body.address?.division &&
          upazila.division.toString() !== req.body.address.division) {
        throw new Error('Upazila does not belong to selected division');
      }

      return true;
    }),

  body('address.union')
    .optional()
    .isMongoId()
    .withMessage('Valid union is required if provided')
    .custom(async (unionId, { req }) => {
      if (!unionId) return true;

      const Union = require('../models/Union');
      const union = await Union.findById(unionId);

      if (!union || !union.isActive) {
        throw new Error('Invalid or inactive union');
      }

      // Validate union belongs to upazila
      if (req.body.address?.upazila &&
          union.upazila.toString() !== req.body.address.upazila) {
        throw new Error('Union does not belong to selected upazila');
      }

      return true;
    }),

  body('address.street')
    .notEmpty()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address is required and cannot exceed 200 characters'),

  body('address.landmark')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Landmark cannot exceed 100 characters'),

  body('address.postalCode')
    .notEmpty()
    .trim()
    .matches(/^\d{4}$/)
    .withMessage('Postal code must be 4 digits')
    .custom(async (postalCode, { req }) => {
      // Validate postal code exists in upazila or union
      const Upazila = require('../models/Upazila');
      const Union = require('../models/Union');

      if (req.body.address?.union) {
        const union = await Union.findById(req.body.address.union);
        if (union && union.postalCode && union.postalCode !== postalCode) {
          throw new Error(`Postal code does not match selected union. Expected: ${union.postalCode}`);
        }
      } else if (req.body.address?.upazila) {
        const upazila = await Upazila.findById(req.body.address.upazila);
        if (upazila && upazila.postalCodes && upazila.postalCodes.length > 0) {
          if (!upazila.postalCodes.includes(postalCode)) {
            throw new Error(`Postal code not valid for selected upazila. Valid codes: ${upazila.postalCodes.join(', ')}`);
          }
        }
      }

      return true;
    }),

  body('address.coordinates')
    .optional()
    .isArray()
    .custom((coords) => {
      if (!coords || coords.length === 0) return true;
      if (coords.length !== 2) {
        throw new Error('Coordinates must be [longitude, latitude]');
      }
      if (coords[0] < -180 || coords[0] > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (coords[1] < -90 || coords[1] > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Registration validation rules
 */
const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("phone")
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid phone number"),
  body("role")
    .isIn(["vendor", "buyerOwner"])
    .withMessage("Role must be either vendor or buyerOwner"),
  body("businessName")
    .if(body("role").equals("vendor"))
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage(
      "Business name is required for vendors and must be between 2 and 100 characters"
    ),
  body("businessName")
    .if(body("role").equals("buyerOwner"))
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage(
      "Business name is required for owners and must be between 2 and 100 characters"
    ),
  body("buyerType")
    .if(body("role").equals("buyerOwner"))
    .notEmpty()
    .isIn(["restaurant", "corporate", "supershop", "catering"])
    .withMessage(
      "Buyer type is required for buyer owners and must be one of: restaurant, corporate, supershop, catering"
    ),
  // Use BD Address validation for hierarchical address structure
  ...bdAddressValidation.slice(0, -1), // Include all bd address validators except the final handler
  body("tradeLicenseNo")
    .notEmpty()
    .trim()
    .withMessage("Trade license number is required"),
  handleValidationErrors,
];

/**
 * Login validation rules
 */
const loginValidation = [
  body("phone").notEmpty().withMessage("Phone number is required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

/**
 * Update profile validation rules
 */
const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  handleValidationErrors,
];

/**
 * Change password validation rules
 */
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),
  handleValidationErrors,
];

/**
 * Manager creation validation rules
 */
const managerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("phone")
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid phone number"),
  handleValidationErrors,
];

/**
 * User update validation rules (for admins)
 */
const userUpdateValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("phone")
    .optional()
    .matches(/^\+880\d{10}$|^\+\d{1,3}\d{10}$/)
    .withMessage(
      "Please provide a valid phone number with country code (e.g., +8801234567890)"
    ),
  body("role")
    .optional()
    .isIn(["admin", "vendor", "buyerOwner", "buyerManager"])
    .withMessage("Invalid role"),
  body("buyerId")
    .if(body("role").isIn(["buyerOwner", "buyerManager"]))
    .isMongoId()
    .withMessage("A valid buyerId is required for this role"),
  body("vendorId")
    .if(body("role").equals("vendor"))
    .isMongoId()
    .withMessage("A valid vendorId is required for this role"),
  handleValidationErrors,
];

/**
 * Product validation rules
 */
const productValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Product name must be between 2 and 100 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Product description is required")
    .isLength({ min: 10, max: 500 })
    .withMessage("Product description must be between 10 and 500 characters"),

  body("category").isMongoId().withMessage("Valid category ID is required"),

  // Note: Image validation is handled in controller middleware as files are processed there
  handleValidationErrors,
];

/**
 * Category validation rules
 */
const categoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Category description must not exceed 500 characters"),

  // Note: Image validation is handled in controller middleware as files are processed there
  handleValidationErrors,
];

/**
 * Listing validation rules
 */
const listingValidation = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),

  body("pricePerUnit")
    .isFloat({ min: 0.01 })
    .withMessage("Price per unit must be a positive number"),

  body("unit")
    .trim()
    .notEmpty()
    .withMessage("Unit is required")
    .isLength({ min: 1, max: 20 })
    .withMessage("Unit must be between 1 and 20 characters"),

  body("quantityAvailable")
    .isInt({ min: 0 })
    .withMessage("Quantity available must be a non-negative integer"),

  handleValidationErrors,
];

/**
 * Order validation rules
 */
const orderValidation = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Items array is required and cannot be empty"),

  body("items.*.listingId")
    .isMongoId()
    .withMessage("Valid listing ID is required for each item"),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),

  handleValidationErrors,
];

/**
 * Order status update validation
 */
const orderStatusValidation = [
  body("status")
    .isIn(["confirmed", "delivered", "cancelled"])
    .withMessage("Invalid status. Must be confirmed, delivered, or cancelled"),

  handleValidationErrors,
];

/**
 * Admin buyer owner creation validation rules
 */
const adminBuyerOwnerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("phone")
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid phone number"),
  body("businessName")
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Business name is required and must be between 2 and 100 characters"),
  body("ownerName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Owner name must be between 2 and 50 characters"),
  // Use BD Address validation for hierarchical address structure
  ...bdAddressValidation.slice(0, -1), // Include all bd address validators except the final handler
  body("tradeLicenseNo")
    .optional()
    .trim(),
  handleValidationErrors,
];

/**
 * Admin buyer manager creation validation rules
 */
const adminBuyerManagerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("phone")
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid phone number"),
  body("buyerId")
    .isMongoId()
    .withMessage("A valid buyerId is required"),
  handleValidationErrors,
];

/**
 * MongoDB ObjectId validation
 */
const mongoIdValidation = (fieldName = "id") => [
  check(fieldName).isMongoId().withMessage(`Valid ${fieldName} is required`),

  handleValidationErrors,
];

/**
 * Pagination validation
 */
const paginationValidation = [
  check("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  check("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  handleValidationErrors,
];


/**
 * Listing flagging validation rules
 */
const flagListingValidation = [
  body("flagReason")
    .notEmpty()
    .trim()
    .isIn(['inappropriate_content', 'misleading_information', 'quality_issues', 'pricing_violation', 'spam', 'other'])
    .withMessage("Flag reason must be one of: inappropriate_content, misleading_information, quality_issues, pricing_violation, spam, other"),

  body("moderationNotes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Moderation notes cannot exceed 1000 characters"),

  handleValidationErrors,
];

/**
 * Settings validation rules
 */
const settingsValidation = [
  body("key")
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-z][a-z0-9_]*$/)
    .withMessage("Key must be lowercase alphanumeric with underscores, starting with a letter"),

  body("value")
    .notEmpty()
    .withMessage("Value is required"),

  body("category")
    .isIn(['general', 'business', 'notifications', 'security', 'payment'])
    .withMessage("Category must be one of: general, business, notifications, security, payment"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("dataType")
    .isIn(['string', 'number', 'boolean', 'object', 'array'])
    .withMessage("Data type must be one of: string, number, boolean, object, array"),

  handleValidationErrors,
];

/**
 * Bulk operation validation rules
 */
const bulkOperationValidation = [
  body("ids")
    .isArray({ min: 1, max: 100 })
    .withMessage("IDs array is required and must contain 1-100 items"),

  body("ids.*")
    .isMongoId()
    .withMessage("Each ID must be a valid MongoDB ObjectId"),

  body("action")
    .isIn(['activate', 'deactivate', 'delete', 'approve', 'reject'])
    .withMessage("Action must be one of: activate, deactivate, delete, approve, reject"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),

  handleValidationErrors,
];

/**
 * Date range validation for analytics
 */
const dateRangeValidation = [
  check("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  check("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Analytics query validation
 */
const analyticsValidation = [
  check("period")
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage("Period must be one of: day, week, month, quarter, year"),

  check("groupBy")
    .optional()
    .isIn(['day', 'week', 'month', 'category', 'vendor', 'buyer'])
    .withMessage("Group by must be one of: day, week, month, category, vendor, buyer"),

  check("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000"),

  ...dateRangeValidation.slice(0, -1), // Include date validation without final handler

  handleValidationErrors,
];

/**
 * Admin listing status validation
 */
const adminListingStatusValidation = [
  body("status")
    .notEmpty()
    .isIn(['active', 'inactive', 'out_of_stock', 'discontinued'])
    .withMessage("Status must be one of: active, inactive, out_of_stock, discontinued"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),

  handleValidationErrors,
];

/**
 * Admin listing flag validation
 */
const adminListingFlagValidation = [
  body("action")
    .notEmpty()
    .isIn(['flag', 'unflag'])
    .withMessage("Action must be either 'flag' or 'unflag'"),

  body("flagReason")
    .if(body("action").equals('flag'))
    .notEmpty()
    .isIn(['inappropriate_content', 'misleading_information', 'quality_issues', 'pricing_violation', 'spam', 'other'])
    .withMessage("Flag reason is required when flagging and must be one of the valid options"),

  body("moderationNotes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Moderation notes cannot exceed 1000 characters"),

  handleValidationErrors,
];

/**
 * Category availability validation (flag system)
 */
const categoryAvailabilityValidation = [
  body("isAvailable")
    .isBoolean()
    .withMessage("isAvailable must be a boolean value"),

  body("flagReason")
    .if(body("isAvailable").equals(false))
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Flag reason is required when disabling availability and must be between 10-500 characters"),

  body("flagReason")
    .if(body("isAvailable").equals(true))
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Flag reason cannot exceed 500 characters"),

  handleValidationErrors,
];

/**
 * Market validation rules
 */
const marketValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Market name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Market name must be between 2 and 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Market description must not exceed 500 characters"),

  // Use BD Location validation for hierarchical address structure
  // Note: Market uses 'location' prefix instead of 'address'
  body('location.division')
    .isMongoId()
    .withMessage('Valid division is required')
    .custom(async (divisionId) => {
      const Division = require('../models/Division');
      const division = await Division.findById(divisionId);
      if (!division || !division.isActive) {
        throw new Error('Invalid or inactive division');
      }
      return true;
    }),

  body('location.district')
    .isMongoId()
    .withMessage('Valid district is required')
    .custom(async (districtId, { req }) => {
      const District = require('../models/District');
      const district = await District.findById(districtId);
      if (!district || !district.isActive) {
        throw new Error('Invalid or inactive district');
      }
      if (req.body.location?.division &&
          district.division.toString() !== req.body.location.division) {
        throw new Error('District does not belong to selected division');
      }
      return true;
    }),

  body('location.upazila')
    .isMongoId()
    .withMessage('Valid upazila is required')
    .custom(async (upazilaId, { req }) => {
      const Upazila = require('../models/Upazila');
      const upazila = await Upazila.findById(upazilaId);
      if (!upazila || !upazila.isActive) {
        throw new Error('Invalid or inactive upazila');
      }
      if (req.body.location?.district &&
          upazila.district.toString() !== req.body.location.district) {
        throw new Error('Upazila does not belong to selected district');
      }
      if (req.body.location?.division &&
          upazila.division.toString() !== req.body.location.division) {
        throw new Error('Upazila does not belong to selected division');
      }
      return true;
    }),

  body('location.union')
    .optional()
    .isMongoId()
    .withMessage('Valid union is required if provided'),

  body('location.address')
    .notEmpty()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address is required and must not exceed 200 characters'),

  body('location.postalCode')
    .notEmpty()
    .trim()
    .matches(/^\d{4}$/)
    .withMessage('Postal code must be 4 digits'),

  // Note: Image validation is handled in controller middleware as files are processed there
  handleValidationErrors,
];

/**
 * Market availability validation (flag system)
 */
const marketAvailabilityValidation = [
  body("isAvailable")
    .isBoolean()
    .withMessage("isAvailable must be a boolean value"),

  body("flagReason")
    .if(body("isAvailable").equals(false))
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Flag reason is required when disabling availability and must be between 10-500 characters"),

  body("flagReason")
    .if(body("isAvailable").equals(true))
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Flag reason cannot exceed 500 characters"),

  handleValidationErrors,
];

/**
 * Vendor market validation (for registration and updates)
 */
const vendorMarketValidation = [
  body("markets")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Vendor must operate in at least one market"),

  body("markets.*")
    .isMongoId()
    .withMessage("Each market must be a valid market ID"),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  managerValidation,
  userUpdateValidation,
  productValidation,
  categoryValidation,
  listingValidation,
  orderValidation,
  orderStatusValidation,
  adminBuyerOwnerValidation,
  adminBuyerManagerValidation,
  mongoIdValidation,
  paginationValidation,
  // Admin feature validations
  settingsValidation,
  bulkOperationValidation,
  dateRangeValidation,
  analyticsValidation,
  // Enhanced listing management validations
  adminListingFlagValidation,
  // Enhanced category management validations
  categoryAvailabilityValidation,
  // Market management validations
  marketValidation,
  marketAvailabilityValidation,
  vendorMarketValidation,
  // BD Address validation
  bdAddressValidation,
};
