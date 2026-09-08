const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/otp/send', authController.sendOtp);
router.post('/otp/verify', authController.verifyOtp);

router.post('/login/email', authController.emailLogin);
router.post('/register/email', authController.emailRegister);
router.post('/password/reset', authController.forgotPassword);
router.post('/password/verify-reset', authController.verifyAndResetPassword);
router.post('/password/update', authController.updatePasswordDirect);

router.post('/register', authController.register);
router.get('/me', auth, authController.getMe);

module.exports = router;
