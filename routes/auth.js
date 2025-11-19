const express = require('express');
const {
  register,
  login,
  getMe,
  getUserStatus,
  updateProfile,
  changePassword,
  createManager,
  getManagers,
  deactivateManager,
  logout
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { uploadRegistrationLogo } = require('../middleware/upload');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  managerValidation
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', uploadRegistrationLogo('logo'), registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/status', protect, getUserStatus);
router.put('/me', protect, updateProfileValidation, updateProfile);
router.put('/change-password', protect, changePasswordValidation, changePassword);
router.post('/create-manager', protect, authorize('buyerOwner', 'admin'), managerValidation, createManager);
router.get('/managers', protect, authorize('buyerOwner', 'admin'), getManagers);
router.put('/managers/:id/deactivate', protect, authorize('buyerOwner', 'admin'), deactivateManager);

module.exports = router;