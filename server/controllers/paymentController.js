const Order = require('../models/Order');
const razorpayService = require('../services/razorpayService');

// POST /api/payments/create-order   { orderId }
// Protected — req.user must own the order.
const createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this order.' });
    }
    if (order.isPaid) {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }

    // Razorpay's widget shows UPI, cards, netbanking, and wallets together —
    // no separate flow needed per payment method.
    const rzpOrder = await razorpayService.createOrder(order);

    order.paymentGateway = 'razorpay';
    order.gatewayOrderId = rzpOrder.id;
    order.paymentStatus = 'pending';
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/verify  (client-side confirmation after Razorpay Checkout succeeds)
// Protected. This is a fast-path UX confirmation — the webhook below is
// the actual source of truth and will also mark the order paid.
const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentMethod } = req.body;

    const isValid = razorpayService.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentStatus = 'paid';
    order.gatewayPaymentId = razorpay_payment_id;
    if (paymentMethod === 'upi' || paymentMethod === 'card') order.paymentMethod = paymentMethod;
    await order.save();

    res.json({ success: true, message: 'Payment verified.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/webhook/razorpay  (public, raw body, signature-checked)
const razorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const isValid = razorpayService.verifyWebhookSignature(req.body, signature);

  if (!isValid) {
    console.error('[razorpayWebhook] Signature verification failed.');
    return res.status(400).json({ success: false, message: 'Invalid signature.' });
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const order = await Order.findOne({ gatewayOrderId: payment.order_id });

    if (order && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'paid';
      order.gatewayPaymentId = payment.id;
      order.paymentMethod = payment.method === 'upi' ? 'upi' : 'card';
      await order.save();
    }
  }

  res.json({ success: true });
};

module.exports = { createPaymentOrder, verifyPayment, razorpayWebhook };