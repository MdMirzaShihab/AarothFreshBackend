const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  createManager,
  getManagers,
  deactivateManager,
  logout
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  managerValidation
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfileValidation, updateProfile);
router.put('/change-password', protect, changePasswordValidation, changePassword);
router.post('/create-manager', protect, authorize('restaurantOwner'), managerValidation, createManager);
router.get('/managers', protect, authorize('restaurantOwner'), getManagers);
router.put('/managers/:id/deactivate', protect, authorize('restaurantOwner'), deactivateManager);

module.exports = router;