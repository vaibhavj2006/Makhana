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

const shiprocketShippingSchema = new mongoose.Schema(
  {
    shiprocketOrderId: { type: String },   // Shiprocket's internal order id
    shipmentId: { type: String },          // used for AWB assignment / pickup / label
    awbCode: { type: String },             // tracking number, set once courier assigned
    courierName: { type: String },
    trackingStatus: { type: String },      // last status string from webhook
    labelUrl: { type: String },
    invoiceUrl: { type: String },
    pickupScheduledDate: { type: Date },
    lastError: { type: String }            // if createOrder/assignAWB failed, stored here for admin visibility
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    shippingAddress: { type: shippingAddressSchema, required: true },
    paymentMethod: { type: String, enum: ['cod', 'card', 'upi', 'netbanking', 'wallet'], default: 'cod' },

    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },

    paymentGateway: { type: String, enum: ['razorpay', null], default: null },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'expired'],
      default: 'pending'
    },

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
    deliveredAt: { type: Date },

    shipping: { type: shiprocketShippingSchema, default: () => ({}) }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);