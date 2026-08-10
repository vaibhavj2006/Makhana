const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const { orderConfirmationEmail } = require('../utils/emailTemplates');

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

// ----- Admin only -----

// @route GET /api/orders
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// @route PUT /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id).populate('user', 'name email preferences');
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }
  order.status = status;
  if (status === 'delivered') order.deliveredAt = new Date();

  // Audit trail — who changed it, when.
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status, changedBy: req.user._id, changedAt: new Date() });

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

module.exports = { createOrder, getMyOrders, getOrderById, getAllOrders, updateOrderStatus };