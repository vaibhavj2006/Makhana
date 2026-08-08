const crypto = require('crypto');
const { razorpayInstance } = require('../config/payment');

/**
 * Creates a Razorpay Order. UPI, cards, netbanking, wallets are all
 * handled by the Razorpay Checkout widget on the frontend automatically —
 * no separate UPI-specific API call is needed.
 */
const createOrder = async (order) => {
  const rzpOrder = await razorpayInstance.orders.create({
    amount: Math.round(order.totalPrice * 100), // paise
    currency: 'INR',
    receipt: order._id.toString(),
    notes: { orderId: order._id.toString() }
  });

  return rzpOrder;
};

/**
 * Verifies the signature Razorpay Checkout sends back to the client
 * after a successful payment (client-side confirmation — NOT the
 * source of truth on its own, always confirm again via webhook).
 */
const verifyPaymentSignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  return expected === razorpay_signature;
};

/**
 * Verifies the Razorpay webhook signature.
 * `rawBody` MUST be the unparsed request body (Buffer or string).
 */
const verifyWebhookSignature = (rawBody, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return expected === signature;
};

module.exports = { createOrder, verifyPaymentSignature, verifyWebhookSignature };
