const { stripe } = require('../config/payment');

/**
 * Creates a Stripe Checkout Session for a given order.
 * @param {Object} order - Mongoose Order document
 * @param {String} successUrl
 * @param {String} cancelUrl
 */
const createCheckoutSession = async (order, successUrl, cancelUrl) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: order.items.map((item) => ({
      price_data: {
        currency: 'inr',
        product_data: { name: `${item.name} — ${item.variantLabel}` },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.quantity
    })),
    shipping_options: order.shippingPrice
      ? [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: { amount: Math.round(order.shippingPrice * 100), currency: 'inr' },
              display_name: 'Shipping'
            }
          }
        ]
      : undefined,
    metadata: { orderId: order._id.toString() },
    success_url: successUrl,
    cancel_url: cancelUrl
  });

  return session;
};

/**
 * Verifies a Stripe webhook signature and constructs the event.
 * `rawBody` MUST be the unparsed request body (Buffer), not JSON-parsed.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
};

module.exports = { createCheckoutSession, verifyWebhookSignature };
