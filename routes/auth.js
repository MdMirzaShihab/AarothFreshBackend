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
  logout,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { uploadRegistrationLogo } = require('../middleware/upload');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  managerValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../middleware/validation');
const { authLimiter, sensitiveOpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, uploadRegistrationLogo('logo'), registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/status', protect, getUserStatus);
router.put('/me', protect, updateProfileValidation, updateProfile);
router.put('/change-password', protect, changePasswordValidation, changePassword);
router.post('/create-manager', protect, authorize('buyerOwner', 'admin'), managerValidation, createManager);
router.get('/managers', protect, authorize('buyerOwner', 'admin'), getManagers);
router.put('/managers/:id/deactivate', protect, authorize('buyerOwner', 'admin'), deactivateManager);

router.post('/forgot-password', authLimiter, forgotPasswordValidation, forgotPassword);
router.put('/reset-password/:resetToken', sensitiveOpLimiter, resetPasswordValidation, resetPassword);

router.post('/send-verification-email', sensitiveOpLimiter, protect, sendVerificationEmail);
router.get('/verify-email/:token', verifyEmail);

module.exports = router;