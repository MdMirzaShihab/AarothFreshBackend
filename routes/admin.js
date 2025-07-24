const express = require('express');
const {
  createProduct,
  updateProduct,
  createCategory,
  updateCategory,
  getProducts,
  getProduct,
  deleteProduct,
  getCategories,
  getCategory,
  deleteCategory,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllVendors,
  getAllRestaurants,
  verifyVendor,
  verifyRestaurant,
  getDashboardStats
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const {
  productValidation,
  categoryValidation,
  userUpdateValidation,
  mongoIdValidation
} = require('../middleware/validation');

const router = express.Router();

// Apply admin authorization to all routes
router.use(protect, authorize('admin'));

// Product routes
router.route('/products')
  .get(getProducts)
  .post(productValidation, createProduct);

router.route('/products/:id')
  .get(mongoIdValidation('id'), getProduct)
  .put(mongoIdValidation('id'), productValidation, updateProduct)
  .delete(mongoIdValidation('id'), deleteProduct);

// Category routes
router.route('/categories')
  .get(getCategories)
  .post(categoryValidation, createCategory);

router.route('/categories/:id')
  .get(mongoIdValidation('id'), getCategory)
  .put(mongoIdValidation('id'), categoryValidation, updateCategory)
  .delete(mongoIdValidation('id'), deleteCategory);

// User management routes
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .get(mongoIdValidation('id'), getUser)
  .put(mongoIdValidation('id'), userUpdateValidation, updateUser)
  .delete(mongoIdValidation('id'), deleteUser);

// Vendor management routes
router.route('/vendors')
  .get(getAllVendors);

router.route('/vendors/:id/verify')
  .put(mongoIdValidation('id'), verifyVendor);

// Restaurant management routes
router.route('/restaurants')
  .get(getAllRestaurants);

router.route('/restaurants/:id/verify')
  .put(mongoIdValidation('id'), verifyRestaurant);

// Dashboard stats
router.get('/dashboard', getDashboardStats);

module.exports = router;