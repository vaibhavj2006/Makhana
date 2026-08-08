const express = require('express');
const { protect } = require('../middleware/auth');
const { createPaymentOrder, verifyPayment } = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPayment);

module.exports = router;
