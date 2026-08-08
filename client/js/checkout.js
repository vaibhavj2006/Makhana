// checkout.js — wire this up to your "Pay Now" button.
// Assumes an `orderId` is already created (via your existing /api/orders flow)
// before payment starts, and that auth uses a cookie (credentials: 'include').

const API_BASE = '/api'; // adjust if your API lives on a different origin

async function startPayment(orderId, gateway) {
  // gateway: 'stripe' | 'razorpay'
  const res = await fetch(`${API_BASE}/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ orderId, gateway })
  });
  const data = await res.json();

  if (!data.success) {
    alert(data.message || 'Could not start payment.');
    return;
  }

  if (gateway === 'stripe') {
    // Redirect straight to Stripe's hosted Checkout page
    window.location.href = data.url;
    return;
  }

  // Razorpay — opens the widget in-page, shows UPI + cards + wallets by default
  openRazorpayWidget(data, orderId);
}

function openRazorpayWidget(data, orderId) {
  const options = {
    key: data.keyId,
    amount: data.amount,
    currency: data.currency,
    name: 'Makhana Shop',
    description: 'Order Payment',
    order_id: data.razorpayOrderId,
    handler: async function (response) {
      // response = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
      const verifyRes = await fetch(`${API_BASE}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        window.location.href = `/order-success.html?orderId=${orderId}`;
      } else {
        alert('Payment verification failed. If money was deducted, contact support.');
      }
    },
    theme: { color: '#2e7d32' },
    // UPI shows automatically alongside cards/netbanking — no extra flag needed,
    // but you can force UPI-only checkout with: method: { upi: true, card: false, ... }
    modal: {
      ondismiss: function () {
        console.log('Checkout closed without completing payment.');
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}
