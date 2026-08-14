const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    variantLabel: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    phone: { type: String, required: true }
  },
  { _id: false }
);

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentMethod: { type: String, enum: ['cod', 'card', 'upi', 'netbanking', 'wallet'], default: 'cod' },

    // --- Idempotency & audit (was silently missing — orderController.js
    // referenced these fields but they were never declared, so they were
    // silently dropped on every save; retries were NOT actually deduped) ---
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },

    // --- Payment gateway tracking (Phase 2) ---
    paymentGateway: { type: String, enum: ['razorpay', null], default: null },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'expired'],
      default: 'pending'
    },

    // --- Stock reservation cleanup (Phase 3, item 7) ---
    // Only set for online-payment orders (upi/card). Stock is decremented at
    // order-creation time (see orderController.js), so if payment isn't
    // completed by this deadline, releaseExpiredOrders.js cancels the order
    // and restores stock.
    paymentDeadline: { type: Date },

    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    deliveredAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);