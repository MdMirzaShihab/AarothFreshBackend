const express = require('express');
const {
  getPublicProducts,
  getPublicProduct,
  getPublicCategories,
  getPublicListings,
  getPublicListing,
  getFeaturedListings
} = require('../controllers/publicController');

const router = express.Router();

/**
 * @route   GET /api/v1/public/products
 * @desc    Get all products (public)
 * @access  Public
 */
router.get('/products', getPublicProducts);

/**
 * @route   GET /api/v1/public/products/:id
 * @desc    Get single product (public)
 * @access  Public
 */
router.get('/products/:id', getPublicProduct);

/**
 * @route   GET /api/v1/public/categories
 * @desc    Get all categories (public)
 * @access  Public
 */
router.get('/categories', getPublicCategories);

/**
 * @route   GET /api/v1/public/listings
 * @desc    Get all active listings (public)
 * @access  Public
 */
router.get('/listings', getPublicListings);

/**
 * @route   GET /api/v1/public/listings/:id
 * @desc    Get single listing (public)
 * @access  Public
 */
router.get('/listings/:id', getPublicListing);

/**
 * @route   GET /api/v1/public/featured-listings
 * @desc    Get featured listings (public)
 * @access  Public
 */
router.get('/featured-listings', getFeaturedListings);

module.exports = router;