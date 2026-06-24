const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.renderLoginPage);
router.post('/login', authController.login);

router.get('/forgot-password', authController.renderForgotPasswordPage);
router.post('/forgot-password', authController.forgotPassword);

router.get('/reset-password', authController.renderResetPasswordPage);
router.post('/reset-password', authController.resetPassword);

router.get('/logout', authController.logout);

module.exports = router;