const express = require('express');
const router = express.Router();

// Add your routes here
router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));
router.use('/listings', require('./listings'));
router.use('/orders', require('./orders'));
router.use('/public', require('./public'));

module.exports = router;
