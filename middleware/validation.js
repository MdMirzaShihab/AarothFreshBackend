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
  body("address.state").notEmpty().trim().withMessage("State is required"),
  body("address.zipCode").notEmpty().trim().withMessage("Zip code is required"),
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
    .isLength({ max: 200 })
    .withMessage("Category description must not exceed 200 characters"),

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
  mongoIdValidation,
  paginationValidation,
};
