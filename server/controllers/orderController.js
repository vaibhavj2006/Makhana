const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const { orderConfirmationEmail } = require('../utils/emailTemplates');
const shiprocket = require('../services/shiprocketService');

const FLAT_SHIPPING = 49; // INR flat rate; free above threshold
const FREE_SHIPPING_THRESHOLD = 699;
const PAYMENT_WINDOW_MINUTES = 15; // how long stock stays reserved for an unpaid online order

// @route POST /api/orders  (auth required)
// Requires an "Idempotency-Key" header — the frontend generates one UUID per checkout
// attempt (crypto.randomUUID()) and resends the SAME key on retries.
const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod, saveAddress } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    res.status(400);
    throw new Error('Idempotency-Key header is required.');
  }
  if (!items || !items.length) {
    res.status(400);
    throw new Error('Your cart is empty.');
  }
  if (!shippingAddress) {
    res.status(400);
    throw new Error('Shipping address is required.');
  }

  // If this exact checkout attempt already went through (retry, double-click,
  // flaky network), just return the order that was already created.
  const existing = await Order.findOne({ idempotencyKey });
  if (existing) {
    return res.status(200).json({ success: true, order: existing, duplicate: true });
  }

  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      // Re-price server-side from the DB — never trust client-sent prices.
      const orderItems = [];
      let itemsPrice = 0;

      for (const line of items) {
        const product = await Product.findById(line.productId).session(session);
        if (!product || !product.isActive) {
          throw Object.assign(new Error('Product no longer available.'), { statusCode: 400 });
        }
        const variant = product.variants.id(line.variantId);
        if (!variant) {
          throw Object.assign(
            new Error(`Selected size for "${product.name}" is no longer available.`),
            { statusCode: 400 }
          );
        }
        if (variant.stock < line.quantity) {
          throw Object.assign(
            new Error(`Only ${variant.stock} left in stock for ${product.name} (${variant.label}).`),
            { statusCode: 409 } // 409 Conflict — frontend can special-case this for a "sold out" message
          );
        }

        orderItems.push({
          product: product._id,
          name: product.name,
          variantLabel: variant.label,
          sku: variant.sku,
          image: product.images[0],
          price: variant.price,
          quantity: line.quantity
        });
        itemsPrice += variant.price * line.quantity;

        variant.stock -= line.quantity;
        await product.save({ session });
      }

      const shippingPrice = itemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
      const totalPrice = itemsPrice + shippingPrice;
      const method = paymentMethod || 'cod';

      // Online-payment orders get a deadline — stock is already decremented
      // above, so if payment doesn't complete in time, releaseExpiredOrders.js
      // will cancel this order and put the stock back.
      const paymentDeadline =
        method === 'upi' || method === 'card'
          ? new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000)
          : undefined;

      const created = await Order.create(
        [
          {
            user: req.user._id,
            items: orderItems,
            shippingAddress,
            paymentMethod: method,
            paymentDeadline,
            itemsPrice,
            shippingPrice,
            totalPrice,
            idempotencyKey,
            statusHistory: [{ status: 'pending', changedBy: req.user._id }]
          }
        ],
        { session }
      );
      order = created[0];

      // Optional: shopper checked "save this address" at checkout.
      // Never overwrites/removes existing addresses; just appends.
      if (saveAddress) {
        const user = await User.findById(req.user._id).session(session);
        const alreadySaved = user.addresses.some(
          (a) =>
            a.line1 === shippingAddress.line1 &&
            a.pincode === shippingAddress.pincode &&
            a.phone === shippingAddress.phone
        );
        if (!alreadySaved) {
          user.addresses.push({
            label: shippingAddress.label || 'Home',
            line1: shippingAddress.line1,
            line2: shippingAddress.line2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode,
            country: shippingAddress.country || 'India',
            phone: shippingAddress.phone,
            isDefault: user.addresses.length === 0
          });
          await user.save({ session });
        }
      }
    });
  } catch (err) {
    // Two concurrent requests with the same key both passed the findOne check above,
    // then raced on the unique index — the loser lands here. Return the winner's order.
    if (err.code === 11000 && err.keyPattern?.idempotencyKey) {
      const winner = await Order.findOne({ idempotencyKey });
      if (winner) {
        return res.status(200).json({ success: true, order: winner, duplicate: true });
      }
    }
    res.status(err.statusCode || 500);
    throw err;
  } finally {
    session.endSession();
  }

  // Fire-and-forget: don't make checkout wait on (or fail because of) email delivery.
  if (req.user.preferences?.emailOptIn?.orderUpdates !== false) {
    sendEmail({
      to: req.user.email,
      subject: `Order confirmed — #${order._id.toString().slice(-6).toUpperCase()}`,
      html: orderConfirmationEmail(order)
    });
  }

  res.status(201).json({ success: true, order });
});

// @route GET /api/orders/mine  (auth required)
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// @route GET /api/orders/:id  (auth required, owner or admin)
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }
  const isOwner = order.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this order.');
  }
  res.json({ success: true, order });
});

// @route PUT /api/orders/:id/cancel  (auth required, owner only)
// Self-service cancellation — customer cancels their OWN pending order.
// Restricted to orders that haven't shipped and haven't been paid for yet,
// since there's no refund flow built — cancelling a paid order here would
// leave money collected with no way to return it automatically. Paid orders
// must go through support instead.
const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to cancel this order.');
  }
  if (order.status !== 'pending') {
    res.status(400);
    throw new Error(`Order can't be cancelled — it's already ${order.status}.`);
  }
  if (order.isPaid) {
    res.status(400);
    throw new Error('This order has already been paid. Please contact support to cancel and get a refund.');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) continue;
        const variant = product.variants.find((v) => v.sku === item.sku);
        if (variant) {
          variant.stock += item.quantity;
          await product.save({ session });
        }
      }

      order.status = 'cancelled';
      order.paymentStatus = order.paymentStatus === 'pending' ? 'expired' : order.paymentStatus;
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status: 'cancelled', changedBy: req.user._id, changedAt: new Date() });
      await order.save({ session });
    });
  } finally {
    session.endSession();
  }

  res.json({ success: true, order, message: 'Order cancelled and stock released.' });
});

// ----- Admin only -----

// @route GET /api/orders
// Supports optional filtering: ?status=pending  ?paymentStatus=failed
// Useful for spotting stuck/failed payments that need manual follow-up.
const getAllOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

  const orders = await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// @route PUT /api/orders/:id/status
// NOTE: when status transitions to 'confirmed', this now creates the
// Shiprocket order (getting a shipment_id). When it transitions to
// 'shipped', it assigns a courier + AWB. If either Shiprocket call fails,
// the status change to your DB still succeeds — the failure is recorded on
// order.shipping.lastError so it's visible to admins, rather than blocking
// order management because a third-party API hiccuped.
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id).populate('user', 'name email preferences');
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }

  const previousStatus = order.status;
  order.status = status;
  if (status === 'delivered') order.deliveredAt = new Date();

  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status, changedBy: req.user._id, changedAt: new Date() });

  // --- Shiprocket: create order on confirmation ---
  if (status === 'confirmed' && previousStatus !== 'confirmed' && !order.shipping?.shiprocketOrderId) {
    try {
      const srResponse = await shiprocket.createOrder(order);
      order.shipping.shiprocketOrderId = srResponse.order_id;
      order.shipping.shipmentId = srResponse.shipment_id;
      order.shipping.lastError = undefined;
    } catch (err) {
      console.error(`Shiprocket createOrder failed for order ${order._id}:`, err.message);
      order.shipping.lastError = `createOrder: ${err.message}`;
    }
  }

  // --- Shiprocket: assign courier + AWB when marked shipped ---
  if (status === 'shipped' && !order.shipping?.awbCode) {
    if (!order.shipping?.shipmentId) {
      // Order was never confirmed through the flow above (e.g. jumped
      // straight from pending to shipped) — create it now first.
      try {
        const srResponse = await shiprocket.createOrder(order);
        order.shipping.shiprocketOrderId = srResponse.order_id;
        order.shipping.shipmentId = srResponse.shipment_id;
      } catch (err) {
        console.error(`Shiprocket createOrder (late) failed for order ${order._id}:`, err.message);
        order.shipping.lastError = `createOrder: ${err.message}`;
      }
    }

    if (order.shipping?.shipmentId) {
      try {
        const awbResponse = await shiprocket.assignAWB({ shipmentId: order.shipping.shipmentId });
        const data = awbResponse?.response?.data;
        order.shipping.awbCode = data?.awb_code;
        order.shipping.courierName = data?.courier_name;
        order.shipping.lastError = undefined;
      } catch (err) {
        console.error(`Shiprocket assignAWB failed for order ${order._id}:`, err.message);
        order.shipping.lastError = `assignAWB: ${err.message}`;
      }
    }
  }

  await order.save();

  const wantsOrderEmails = order.user?.preferences?.emailOptIn?.orderUpdates !== false;
  if (['shipped', 'delivered', 'cancelled'].includes(status) && order.user?.email && wantsOrderEmails) {
    const statusCopy = {
      shipped: { subject: 'Your order has shipped 📦', line: "Your order's on its way." },
      delivered: { subject: 'Your order was delivered ✅', line: 'Your order has been delivered. Enjoy the crunch!' },
      cancelled: { subject: 'Your order was cancelled', line: 'This order has been cancelled. Reach out if that was unexpected.' }
    }[status];

    sendEmail({
      to: order.user.email,
      subject: statusCopy.subject,
      html: `<div style="font-family:Arial, sans-serif; padding:24px; color:#1c1712;">
        <h2>${statusCopy.subject}</h2>
        <p>${statusCopy.line}</p>
        <p style="color:#55504a; font-size:14px;">Order #${order._id.toString().slice(-6).toUpperCase()}</p>
      </div>`
    });
  }

  res.json({ success: true, order });
});

// @route POST /api/orders/:id/schedule-pickup  (admin only)
const schedulePickup = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }
  if (!order.shipping?.shipmentId) {
    res.status(400);
    throw new Error('This order has no Shiprocket shipment yet — confirm/ship it first.');
  }

  const result = await shiprocket.generatePickup([order.shipping.shipmentId]);
  order.shipping.pickupScheduledDate = new Date();
  await order.save();

  res.json({ success: true, result, order });
});

// @route GET /api/orders/:id/label  (admin only)
const getShippingLabel = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }
  if (!order.shipping?.shipmentId) {
    res.status(400);
    throw new Error('This order has no Shiprocket shipment yet.');
  }

  const result = await shiprocket.generateLabel([order.shipping.shipmentId]);
  const labelUrl = result?.label_url;
  if (labelUrl) {
    order.shipping.labelUrl = labelUrl;
    await order.save();
  }

  res.json({ success: true, labelUrl, result });
});

// @route PUT /api/orders/:id/cancel-shipment  (admin only)
// Cancels the Shiprocket shipment (only works before pickup) — distinct from
// cancelMyOrder above, which is the customer-facing self-service version.
const cancelShipment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }
  if (!order.shipping?.shiprocketOrderId) {
    res.status(400);
    throw new Error('This order has no Shiprocket shipment to cancel.');
  }

  const result = await shiprocket.cancelOrder([order.shipping.shiprocketOrderId]);

  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', changedBy: req.user._id, changedAt: new Date() });
  await order.save();

  res.json({ success: true, result, order });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getAllOrders,
  updateOrderStatus,
  schedulePickup,
  getShippingLabel,
  cancelShipment
};