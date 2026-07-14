const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, googleLogin, logoutUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Slow down brute-force attempts on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/google', authLimiter, googleLogin);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

module.exports = router;
