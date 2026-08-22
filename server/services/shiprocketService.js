/**
 * shiprocketService.js
 *
 * Thin wrapper around Shiprocket's REST API (apiv2.shiprocket.in).
 *
 * ENV VARS REQUIRED:
 *   SHIPROCKET_EMAIL
 *   SHIPROCKET_PASSWORD
 *   SHIPROCKET_PICKUP_LOCATION   <- exact nickname from Settings > Pickup Addresses
 */

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

// Rough per-unit weight for a makhana pouch, in kg — adjust once you have
// real product weights. Used only if the order doesn't carry its own weight.
const DEFAULT_UNIT_WEIGHT_KG = 0.15;
const DEFAULT_BOX_DIMENSIONS_CM = { length: 15, breadth: 12, height: 8 };

let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shiprocket auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000; // refresh a day early
  return cachedToken;
}

async function srRequest(path, { method = "GET", body } = {}, _retried = false) {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !_retried) {
    cachedToken = null;
    return srRequest(path, { method, body }, true);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.message || data?.errors || `Shiprocket API error (${res.status})`;
    const err = new Error(typeof message === "string" ? message : JSON.stringify(message));
    err.status = res.status;
    err.response = data;
    throw err;
  }

  return data;
}

/** Checked before checkout — shows delivery estimate / COD availability. */
async function checkServiceability({ pickupPincode, deliveryPincode, weightKg, cod = false }) {
  const params = new URLSearchParams({
    pickup_postcode: String(pickupPincode),
    delivery_postcode: String(deliveryPincode),
    weight: String(weightKg),
    cod: cod ? "1" : "0",
  });
  return srRequest(`/courier/serviceability/?${params.toString()}`);
}

/**
 * Create an order in Shiprocket from a Mongoose Order document.
 *
 * IMPORTANT: `order.user` must be populated with at least `name` and `email`
 * (your shippingAddress schema has no `name` field, so the customer's name
 * comes from the User document, not the address).
 *
 * e.g. const order = await Order.findById(id).populate('user', 'name email');
 */
async function createOrder(order) {
  if (!order.user || typeof order.user === "string" || !order.user.name) {
    throw new Error(
      "createOrder(order) requires order.user to be populated with at least 'name email' — got an unpopulated ref."
    );
  }

  const addr = order.shippingAddress;
  const totalUnits = order.items.reduce((sum, i) => sum + i.quantity, 0);

  const payload = {
    order_id: order._id.toString(),
    order_date: new Date(order.createdAt || Date.now())
      .toISOString()
      .slice(0, 19)
      .replace("T", " "),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION,
    comment: "Pond & Puff order",

    billing_customer_name: order.user.name,
    billing_last_name: "",
    billing_address: addr.line1,
    billing_address_2: addr.line2 || "",
    billing_city: addr.city,
    billing_pincode: addr.pincode,
    billing_state: addr.state,
    billing_country: addr.country || "India",
    billing_email: order.user.email,
    billing_phone: addr.phone,
    shipping_is_billing: true,

    order_items: order.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      units: item.quantity,
      selling_price: item.price,
    })),

    // cod = Cash on Delivery; everything else (card/upi/netbanking/wallet)
    // is already paid, so it goes to Shiprocket as Prepaid.
    payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
    sub_total: order.totalPrice,

    ...DEFAULT_BOX_DIMENSIONS_CM,
    weight: order.totalWeightKg || totalUnits * DEFAULT_UNIT_WEIGHT_KG,
  };

  return srRequest("/orders/create/adhoc", { method: "POST", body: payload });
}

async function assignAWB({ shipmentId, courierId }) {
  const body = { shipment_id: shipmentId };
  if (courierId) body.courier_id = courierId;
  return srRequest("/courier/assign/awb", { method: "POST", body });
}

async function generatePickup(shipmentIds) {
  return srRequest("/courier/generate/pickup", { method: "POST", body: { shipment_id: shipmentIds } });
}

async function generateLabel(shipmentIds) {
  return srRequest("/courier/generate/label", { method: "POST", body: { shipment_id: shipmentIds } });
}

async function generateInvoice(orderIds) {
  return srRequest("/orders/print/invoice", { method: "POST", body: { ids: orderIds } });
}

async function trackByAWB(awbCode) {
  return srRequest(`/courier/track/awb/${awbCode}`);
}

async function cancelOrder(shiprocketOrderIds) {
  return srRequest("/orders/cancel", { method: "POST", body: { ids: shiprocketOrderIds } });
}

module.exports = {
  checkServiceability,
  createOrder,
  assignAWB,
  generatePickup,
  generateLabel,
  generateInvoice,
  trackByAWB,
  cancelOrder,
};