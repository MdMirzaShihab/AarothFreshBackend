const express = require('express');
const router = express.Router();

// Add your routes here
router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));
router.use('/listings', require('./listings'));
router.use('/orders', require('./orders'));
router.use('/public', require('./public'));
router.use('/vendor-dashboard', require('./vendor-dashboard'));
router.use('/restaurant-dashboard', require('./restaurant-dashboard'));

module.exports = router;
