const Stripe = require('stripe');
const Razorpay = require('razorpay');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[payment.config] STRIPE_SECRET_KEY is not set — Stripe payments will fail.');
}
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('[payment.config] Razorpay keys are not set — Razorpay/UPI payments will fail.');
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

module.exports = { stripe, razorpayInstance };
