// Simple inline-styled HTML templates — email clients don't support external CSS reliably,
// so styles are kept inline and layout kept simple on purpose.

const wrapper = (bodyHtml) => `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#fbf3e7; padding:32px 16px;">
    <div style="max-width:520px; margin:0 auto; background:#fffdf9; border-radius:16px; overflow:hidden; border:1px solid #e7ddcc;">
      <div style="background:#1f4741; padding:24px 28px;">
        <span style="font-size:20px; font-weight:bold; color:#fffdf9;">🪷 Pond &amp; Puff</span>
      </div>
      <div style="padding:28px;">
        ${bodyHtml}
      </div>
      <div style="padding:18px 28px; background:#fbf3e7; font-size:12px; color:#8a8378;">
        Pond &amp; Puff · Small-batch roasted makhana from Bihar, India
      </div>
    </div>
  </div>
`;

const welcomeEmail = (name) =>
  wrapper(`
    <h2 style="color:#1c1712; margin:0 0 12px;">Welcome, ${name} 👋</h2>
    <p style="color:#55504a; line-height:1.6;">Your account is ready. Time to go find your new favorite flavor of makhana.</p>
    <a href="#" style="display:inline-block; margin-top:16px; background:#e8543f; color:#fffdf9; text-decoration:none; padding:12px 24px; border-radius:999px; font-weight:bold;">Start shopping</a>
  `);

const orderConfirmationEmail = (order) => {
  const itemsHtml = order.items
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 0; color:#1c1712;">${i.name} <span style="color:#8a8378;">(${i.variantLabel})</span></td>
      <td style="padding:8px 0; text-align:center; color:#55504a;">x${i.quantity}</td>
      <td style="padding:8px 0; text-align:right; color:#1c1712;">₹${i.price * i.quantity}</td>
    </tr>`
    )
    .join('');

  return wrapper(`
    <h2 style="color:#1c1712; margin:0 0 4px;">Order confirmed 🎉</h2>
    <p style="color:#55504a; margin:0 0 20px;">Order #${order._id.toString().slice(-6).toUpperCase()} is being roasted, packed, and shipped.</p>
    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
      ${itemsHtml}
    </table>
    <div style="border-top:1px solid #e7ddcc; padding-top:12px; text-align:right;">
      <p style="margin:2px 0; color:#55504a; font-size:14px;">Shipping: ${order.shippingPrice === 0 ? 'Free' : '₹' + order.shippingPrice}</p>
      <p style="margin:4px 0; color:#1c1712; font-weight:bold; font-size:16px;">Total: ₹${order.totalPrice}</p>
    </div>
    <p style="color:#55504a; margin-top:20px; font-size:14px;">Shipping to: ${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}</p>
  `);
};

module.exports = { welcomeEmail, orderConfirmationEmail };
