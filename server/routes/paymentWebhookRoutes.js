const express = require('express');
const { stripeWebhook, razorpayWebhook } = require('../controllers/paymentController');

const router = express.Router();

// Both handlers expect req.body to be the raw Buffer — the express.raw()
// middleware for this whole router is applied in server.js, BEFORE
// express.json() is applied globally.
router.post('/stripe', stripeWebhook);
router.post('/razorpay', razorpayWebhook);

module.exports = router;
