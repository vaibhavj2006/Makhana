const express = require('express');
const { razorpayWebhook } = require('../controllers/paymentController');

const router = express.Router();

// req.body is the raw Buffer — express.raw() for this whole router is
// applied in server.js, BEFORE express.json() is applied globally.
router.post('/razorpay', razorpayWebhook);

module.exports = router;