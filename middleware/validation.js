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
    .isIn(["vendor", "restaurantOwner"])
    .withMessage("Role must be either vendor or restaurantOwner"),
  body("businessName")
    .if(body("role").equals("vendor"))
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage(
      "Business name is required for vendors and must be between 2 and 100 characters"
    ),
  body("restaurantName")
    .if(body("role").equals("restaurantOwner"))
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage(
      "Restaurant name is required for owners and must be between 2 and 100 characters"
    ),
  body("address.street")
    .notEmpty()
    .trim()
    .withMessage("Street address is required"),
  body("address.city").notEmpty().trim().withMessage("City is required"),
  body("address.area").notEmpty().trim().withMessage("Area is required"),
  body("address.postalCode").notEmpty().trim().withMessage("Postal code is required"),
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
    .isIn(["admin", "vendor", "restaurantOwner", "restaurantManager"])
    .withMessage("Invalid role"),
  body("restaurantId")
    .if(body("role").isIn(["restaurantOwner", "restaurantManager"]))
    .isMongoId()
    .withMessage("A valid restaurantId is required for this role"),
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
 * Admin restaurant owner creation validation rules
 */
const adminRestaurantOwnerValidation = [
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
  body("restaurantName")
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Restaurant name is required and must be between 2 and 100 characters"),
  body("ownerName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Owner name must be between 2 and 50 characters"),
  body("address.street")
    .notEmpty()
    .trim()
    .withMessage("Street address is required"),
  body("address.city")
    .notEmpty()
    .trim()
    .withMessage("City is required"),
  body("address.area")
    .notEmpty()
    .trim()
    .withMessage("Area is required"),
  body("tradeLicenseNo")
    .optional()
    .trim(),
  handleValidationErrors,
];

/**
 * Admin restaurant manager creation validation rules
 */
const adminRestaurantManagerValidation = [
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
  body("restaurantId")
    .isMongoId()
    .withMessage("A valid restaurantId is required"),
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
 * Approval action validation rules - Legacy support
 */
const approvalValidation = [
  body("approvalNotes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Approval notes cannot exceed 500 characters"),

  handleValidationErrors,
];

/**
 * Rejection action validation rules - Legacy support
 */
const rejectionValidation = [
  body("rejectionReason")
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Rejection reason is required and must be between 10 and 500 characters"),

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
 * Vendor deactivation validation rules
 */
const vendorDeactivationValidation = [
  body("reason")
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Deactivation reason is required and must be between 10 and 500 characters"),

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
    .isIn(['day', 'week', 'month', 'category', 'vendor', 'restaurant'])
    .withMessage("Group by must be one of: day, week, month, category, vendor, restaurant"),

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
 * Admin bulk listing operations validation
 */
const adminListingBulkValidation = [
  body("listingIds")
    .isArray({ min: 1, max: 50 })
    .withMessage("Listing IDs array is required and must contain 1-50 items"),

  body("listingIds.*")
    .isMongoId()
    .withMessage("Each listing ID must be a valid MongoDB ObjectId"),

  body("operation")
    .notEmpty()
    .isIn(['updateStatus', 'toggleFeatured', 'updateFlag', 'softDelete'])
    .withMessage("Operation must be one of: updateStatus, toggleFeatured, updateFlag, softDelete"),

  // Conditional validation for different operations
  body("operationData.status")
    .if(body("operation").equals("updateStatus"))
    .notEmpty()
    .isIn(['active', 'inactive', 'out_of_stock', 'discontinued'])
    .withMessage("Status is required for updateStatus operation"),

  body("operationData.isFlagged")
    .if(body("operation").equals("updateFlag"))
    .isBoolean()
    .withMessage("isFlagged is required for updateFlag operation"),

  body("operationData.flagReason")
    .if(body("operation").equals("updateFlag"))
    .if(body("operationData.isFlagged").equals(true))
    .notEmpty()
    .isIn(['inappropriate_content', 'misleading_information', 'quality_issues', 'pricing_violation', 'spam', 'other'])
    .withMessage("Flag reason is required when flagging listings"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Reason cannot exceed 1000 characters"),

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
  adminRestaurantOwnerValidation,
  adminRestaurantManagerValidation,
  mongoIdValidation,
  paginationValidation,
  // New admin feature validations
  approvalValidation,
  rejectionValidation,
  flagListingValidation,
  vendorDeactivationValidation,
  settingsValidation,
  bulkOperationValidation,
  dateRangeValidation,
  analyticsValidation,
  // Enhanced listing management validations
  adminListingStatusValidation,
  adminListingFlagValidation,
  adminListingBulkValidation,
  // Enhanced category management validations
  categoryAvailabilityValidation,
};
