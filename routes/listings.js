/**
 * @fileoverview Public Listings Routes
 * @description Handles listing access for restaurant users and general viewing
 * @note Vendor listing CRUD operations are handled in /vendor-dashboard/listings/*
 * @version 2.0
 * @since 2024
 */

const express = require("express");
const {
  getListings,
  getListing,
} = require("../controllers/listingsController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @route   GET /api/v1/listings
 * @desc    Get all active listings (for restaurants)
 * @access  Private (Restaurant users)
 */
router.get("/", authorize("restaurantOwner", "restaurantManager"), getListings);

// ================================
// NOTE: Vendor-specific listing CRUD operations have been moved to:
// /api/v1/vendor-dashboard/listings/*
// This route file now handles only public/restaurant access to listings
// ================================

/**
 * @route   GET /api/v1/listings/:id
 * @desc    Get single listing details (all authenticated users can view)
 * @access  Private (Any authenticated user)
 */
router.get("/:id", getListing);

// ================================
// Vendor listing CRUD operations moved to /api/v1/vendor-dashboard/listings/*
// Only public/restaurant read access remains in this file
// ================================

module.exports = router;
