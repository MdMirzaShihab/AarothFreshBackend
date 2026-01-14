/**
 * @fileoverview API Routes Index
 * @description Central routing configuration for Aaroth Fresh API v1
 * @version 2.0
 */

const express = require('express');
const router = express.Router();

// ================================
// API ROUTE ORGANIZATION
// ================================

// Authentication & Authorization
router.use('/auth', require('./auth'));

// Administrative Operations
router.use('/admin', require('./admin'));

// Public & Restaurant Listing Access
router.use('/listings', require('./listings')); // Buyer users browsing listings

// Order Management
router.use('/orders', require('./orders'));

// Public Information (no auth required)
router.use('/public', require('./public'));

// Location Data (Bangladesh administrative divisions, districts, upazilas, unions)
router.use('/locations', require('./locations'));

// Dashboard Interfaces
router.use('/vendor-dashboard', require('./vendor-dashboard')); // Complete vendor operations + listings CRUD
router.use('/buyer-dashboard', require('./buyer-dashboard'));

module.exports = router;
