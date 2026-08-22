const express = require('express');
const Order = require('../models/Order');

const router = express.Router();

// Shiprocket calls this whenever a shipment's tracking status changes.
// Unlike the Razorpay webhook, Shiprocket doesn't sign the body with HMAC —
// it just sends the security token you set in Settings > API > Webhooks
// back in the `x-api-key` header, so a normal express.json() body is fine
// here (no need for express.raw() the way paymentWebhookRoutes needs it).
router.post('/', async (req, res) => {
  if (req.headers['x-api-key'] !== process.env.SHIPROCKET_WEBHOOK_TOKEN) {
    return res.sendStatus(401);
  }

  const { awb, current_status } = req.body || {};
  if (!awb) return res.sendStatus(200); // nothing to match on, ack and move on

  const order = await Order.findOne({ 'shipping.awbCode': awb });
  if (!order) return res.sendStatus(200);

  order.shipping.trackingStatus = current_status;

  const statusMap = {
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    'IN TRANSIT': 'shipped',
    'OUT FOR DELIVERY': 'shipped',
    'PICKED UP': 'shipped'
  };
  const mapped = statusMap[current_status];
  if (mapped && mapped !== order.status) {
    order.status = mapped;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status: mapped, changedAt: new Date() }); // no changedBy — system-triggered
    if (mapped === 'delivered') order.deliveredAt = new Date();
  }

  await order.save();

  // Optional: reuse the same order-status email logic from orderController
  // (shipped/delivered/cancelled) here if you want customers notified on
  // webhook-driven transitions too, respecting their emailOptIn preference.

  res.sendStatus(200);
});

module.exports = router;
