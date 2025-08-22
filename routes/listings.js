const express = require("express");
const {
  createListing,
  getListings,
  getVendorListings,
  updateListing,
  deleteListing,
  getListing,
} = require("../controllers/listingsController");
const { protect, authorize } = require("../middleware/auth");
const { requireVendorApproval } = require("../middleware/approval");
const upload = require("../middleware/upload");
const { uploadListingImages } = require("../middleware/upload");
const { body } = require("express-validator");

const router = express.Router();

// Validation rules for creating/updating listings
const listingValidation = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  // Use 'pricing.*.pricePerUnit' to validate each price in the pricing array
  body("pricing.*.pricePerUnit")
    .isFloat({ min: 0.01 })
    .withMessage("Price per unit must be a positive number"),

  // Use 'pricing.*.unit' to validate each unit in the pricing array
  body("pricing.*.unit")
    .not()
    .isEmpty()
    .withMessage("Unit is required for pricing"),

  // Use 'availability.quantityAvailable' to target the nested field
  body("availability.quantityAvailable")
    .isInt({ min: 0 })
    .withMessage("Quantity available must be a non-negative integer"),
];

// Apply authentication to all routes
router.use(protect);

/**
 * @route   GET /api/v1/listings
 * @desc    Get all active listings (for restaurants)
 * @access  Private (Restaurant users)
 */
router.get("/", authorize("restaurantOwner", "restaurantManager"), getListings);

/**
 * @route   POST /api/v1/listings
 * @desc    Create a new listing
 * @access  Private (Vendors only)
 */
router.post(
  "/",
  authorize("vendor"),
  requireVendorApproval("create listings"),
  ...uploadListingImages("images", 5), // <-- Use the new function
  listingValidation,
  createListing
);

/**
 * @route   GET /api/v1/listings/vendor
 * @desc    Get vendor's own listings
 * @access  Private (Vendors only)
 */
router.get("/vendor", authorize("vendor"), getVendorListings);

/**
 * @route   GET /api/v1/listings/:id
 * @desc    Get single listing
 * @access  Private
 */
router.get("/:id", getListing);

/**
 * @route   PUT /api/v1/listings/:id
 * @desc    Update a listing
 * @access  Private (Vendor who owns the listing)
 */
router.put(
  "/:id",
  authorize("vendor"),
  requireVendorApproval("update listings"),
  ...uploadListingImages("images", 5),
  [
    body("pricePerUnit")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Price per unit must be a positive number"),
    body("unit").optional().not().isEmpty().withMessage("Unit cannot be empty"),
    body("quantityAvailable")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Quantity available must be a non-negative integer"),
    body("status")
      .optional()
      .isIn(["active", "inactive", "out_of_stock"])
      .withMessage("Invalid status"),
  ],
  updateListing
);

/**
 * @route   DELETE /api/v1/listings/:id
 * @desc    Delete a listing
 * @access  Private (Vendor who owns the listing)
 */
router.delete("/:id", authorize("vendor"), requireVendorApproval("delete listings"), deleteListing);

module.exports = router;
