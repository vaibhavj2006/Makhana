const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendEmail } = require('../utils/sendEmail');
const { orderConfirmationEmail } = require('../utils/emailTemplates');

const FLAT_SHIPPING = 49; // INR flat rate; free above threshold
const FREE_SHIPPING_THRESHOLD = 699;

// @route POST /api/orders  (auth required)
const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;

  if (!items || !items.length) {
    res.status(400);
    throw new Error('Your cart is empty.');
  }
  if (!shippingAddress) {
    res.status(400);
    throw new Error('Shipping address is required.');
  }

  // Re-price server-side from the DB — never trust client-sent prices.
  const orderItems = [];
  let itemsPrice = 0;

  for (const line of items) {
    const product = await Product.findById(line.productId);
    if (!product || !product.isActive) {
      res.status(400);
      throw new Error(`Product no longer available.`);
    }
    const variant = product.variants.id(line.variantId);
    if (!variant) {
      res.status(400);
      throw new Error(`Selected size for "${product.name}" is no longer available.`);
    }
    if (variant.stock < line.quantity) {
      res.status(400);
      throw new Error(`Only ${variant.stock} left in stock for ${product.name} (${variant.label}).`);
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
    await product.save();
  }

  const shippingPrice = itemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const totalPrice = itemsPrice + shippingPrice;

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod: paymentMethod || 'cod',
    itemsPrice,
    shippingPrice,
    totalPrice
  });

  // Fire-and-forget: don't make checkout wait on (or fail because of) email delivery.
  sendEmail({
    to: req.user.email,
    subject: `Order confirmed — #${order._id.toString().slice(-6).toUpperCase()}`,
    html: orderConfirmationEmail(order)
  });

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
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found.');
  }
  order.status = status;
  if (status === 'delivered') order.deliveredAt = new Date();
  await order.save();

  if (['shipped', 'delivered', 'cancelled'].includes(status) && order.user?.email) {
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
