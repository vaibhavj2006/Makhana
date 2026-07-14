// Injects the cart drawer + checkout modal once per page, wires up the nav.

function injectCartDrawer() {
  if (document.getElementById('cartDrawer')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="cart-overlay" id="cartOverlay"></div>
    <aside class="cart-drawer" id="cartDrawer" aria-label="Shopping bag">
      <div class="cart-head">
        <h3 class="display" style="font-size:1.3rem;">Your bag</h3>
        <button class="icon-btn" onclick="Cart.close()" aria-label="Close bag">✕</button>
      </div>
      <div class="cart-items" id="cartItems"></div>
      <div class="cart-foot" id="cartFoot"></div>
    </aside>

    <div class="cart-overlay" id="checkoutOverlay"></div>
    <aside class="cart-drawer" id="checkoutDrawer" aria-label="Checkout">
      <div class="cart-head">
        <h3 class="display" style="font-size:1.3rem;">Checkout</h3>
        <button class="icon-btn" onclick="Checkout.close()" aria-label="Close checkout">✕</button>
      </div>
      <div class="cart-items" id="checkoutBody"></div>
    </aside>
  `;
  document.body.appendChild(wrap);
  document.getElementById('checkoutOverlay').addEventListener('click', () => Checkout.close());
}

const Checkout = {
  async open() {
    injectCartDrawer();
    Cart.close();
    document.getElementById('checkoutDrawer').classList.add('open');
    document.getElementById('checkoutOverlay').classList.add('open');

    const body = document.getElementById('checkoutBody');
    let user = null;
    try {
      const res = await api.get('/auth/me');
      user = res.user;
    } catch {
      user = null;
    }

    if (!user) {
      body.innerHTML = `
        <div class="empty-state">
          <p>You'll need an account to check out — it's how we track your orders and delivery.</p>
          <a href="profile.html" class="btn btn-primary btn-sm">Log in or sign up</a>
        </div>`;
      return;
    }

    const items = Cart.read();
    const subtotal = Cart.subtotal();
    const shipping = subtotal >= 699 ? 0 : 49;

    body.innerHTML = `
      <form id="checkoutForm" style="padding:4px 0;">
        <div class="form-group">
          <label for="co_line1">Address line 1</label>
          <input id="co_line1" required placeholder="House no, street" />
        </div>
        <div class="form-group">
          <label for="co_line2">Address line 2 (optional)</label>
          <input id="co_line2" placeholder="Landmark, area" />
        </div>
        <div class="form-row">
          <div class="form-group"><label for="co_city">City</label><input id="co_city" required /></div>
          <div class="form-group"><label for="co_state">State</label><input id="co_state" required /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="co_pincode">Pincode</label><input id="co_pincode" required /></div>
          <div class="form-group"><label for="co_phone">Phone</label><input id="co_phone" required value="${user.phone || ''}" /></div>
        </div>
        <div class="form-group">
          <label for="co_payment">Payment method</label>
          <select id="co_payment">
            <option value="cod">Cash on delivery</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </select>
        </div>
        <div class="form-msg error" id="checkoutMsg"></div>
        <div class="cart-summary-row"><span>Subtotal</span><span>₹${subtotal}</span></div>
        <div class="cart-summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : '₹' + shipping}</span></div>
        <div class="cart-summary-row total"><span>Total</span><span>₹${subtotal + shipping}</span></div>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:14px;">Place order</button>
      </form>
    `;

    document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('checkoutMsg');
      msg.classList.remove('show');
      const payload = {
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingAddress: {
          line1: document.getElementById('co_line1').value,
          line2: document.getElementById('co_line2').value,
          city: document.getElementById('co_city').value,
          state: document.getElementById('co_state').value,
          pincode: document.getElementById('co_pincode').value,
          phone: document.getElementById('co_phone').value
        },
        paymentMethod: document.getElementById('co_payment').value
      };
      try {
        const res = await api.post('/orders', payload);
        Cart.clear();
        body.innerHTML = `<div class="empty-state">
          <p><strong>Order placed!</strong> Order #${res.order._id.slice(-6).toUpperCase()} is on its way to being roasted, packed and shipped.</p>
          <a href="profile.html#orders" class="btn btn-primary btn-sm">View my orders</a>
        </div>`;
      } catch (err) {
        msg.textContent = err.message;
        msg.classList.add('show');
      }
    });
  },
  close() {
    document.getElementById('checkoutDrawer')?.classList.remove('open');
    document.getElementById('checkoutOverlay')?.classList.remove('open');
  }
};

async function refreshNavAuthState() {
  const authSlot = document.getElementById('navAuthSlot');
  const navLinks = document.getElementById('navLinks');
  document.getElementById('adminNavLink')?.remove();

  if (!authSlot) return;
  try {
    const res = await api.get('/auth/me');
    authSlot.innerHTML = `<a href="profile.html" class="btn btn-outline btn-sm">Hi, ${res.user.name.split(' ')[0]}</a>`;
    if (res.user.role === 'admin' && navLinks) {
      const link = document.createElement('a');
      link.href = 'admin.html';
      link.id = 'adminNavLink';
      link.textContent = 'Admin';
      if (location.pathname.endsWith('admin.html')) link.classList.add('active');
      navLinks.appendChild(link);
    }
  } catch {
    authSlot.innerHTML = `<a href="profile.html" class="btn btn-outline btn-sm">Log in</a>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  injectCartDrawer();
  Cart.renderAll();
  refreshNavAuthState();

  document.getElementById('navToggle')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('open');
  });
  document.getElementById('cartOpenBtn')?.addEventListener('click', () => Cart.open());
});
