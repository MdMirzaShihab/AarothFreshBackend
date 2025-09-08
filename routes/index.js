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
router.use('/listings', require('./listings')); // Restaurant users browsing listings

// Order Management
router.use('/orders', require('./orders'));

// Public Information (no auth required)
router.use('/public', require('./public'));

// Inventory Management
router.use('/inventory', require('./inventory'));

// Dashboard Interfaces
router.use('/vendor-dashboard', require('./vendor-dashboard')); // Complete vendor operations + listings CRUD
router.use('/restaurant-dashboard', require('./restaurant-dashboard'));

module.exports = router;
