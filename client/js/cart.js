// Cart lives in localStorage as a simple line-item list.
const CART_KEY = 'makhana_cart_v1';

const Cart = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  },
  write(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    Cart.renderAll();
  },
  add({ productId, variantId, name, variantLabel, price, image, maxStock }) {
    const items = Cart.read();
    const existing = items.find((i) => i.productId === productId && i.variantId === variantId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + 1, maxStock || 99);
    } else {
      items.push({ productId, variantId, name, variantLabel, price, image, quantity: 1, maxStock: maxStock || 99 });
    }
    Cart.write(items);
    Toast.show(`Added ${name} to your bag`);
    Cart.open();
  },
  updateQty(productId, variantId, delta) {
    const items = Cart.read();
    const line = items.find((i) => i.productId === productId && i.variantId === variantId);
    if (!line) return;
    line.quantity = Math.max(0, Math.min(line.quantity + delta, line.maxStock || 99));
    const filtered = items.filter((i) => i.quantity > 0);
    Cart.write(filtered);
  },
  remove(productId, variantId) {
    Cart.write(Cart.read().filter((i) => !(i.productId === productId && i.variantId === variantId)));
  },
  clear() {
    Cart.write([]);
  },
  count() {
    return Cart.read().reduce((sum, i) => sum + i.quantity, 0);
  },
  subtotal() {
    return Cart.read().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
  open() {
    document.getElementById('cartDrawer')?.classList.add('open');
    document.getElementById('cartOverlay')?.classList.add('open');
  },
  close() {
    document.getElementById('cartDrawer')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('open');
  },
  renderAll() {
    Cart.renderBadge();
    Cart.renderDrawer();
  },
  renderBadge() {
    const el = document.getElementById('cartCount');
    if (!el) return;
    const count = Cart.count();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  },
  renderDrawer() {
    const itemsEl = document.getElementById('cartItems');
    const footEl = document.getElementById('cartFoot');
    if (!itemsEl) return;

    const items = Cart.read();
    if (!items.length) {
      itemsEl.innerHTML = `<div class="empty-state"><p>Your bag is empty.</p><a href="shop.html" class="btn btn-primary btn-sm">Shop now</a></div>`;
      if (footEl) footEl.style.display = 'none';
      return;
    }
    if (footEl) footEl.style.display = 'block';

    itemsEl.innerHTML = items
      .map(
        (i) => `
      <div class="cart-item">
        <img src="${i.image}" alt="${i.name}" />
        <div class="cart-item-info">
          <h4>${i.name}</h4>
          <div class="meta">${i.variantLabel} · ₹${i.price}</div>
          <div class="qty-control">
            <button aria-label="Decrease quantity" onclick="Cart.updateQty('${i.productId}','${i.variantId}',-1)">–</button>
            <span>${i.quantity}</span>
            <button aria-label="Increase quantity" onclick="Cart.updateQty('${i.productId}','${i.variantId}',1)">+</button>
            <button aria-label="Remove item" style="margin-left:auto;border:none;background:none;color:var(--coral);font-weight:600;font-size:0.78rem;" onclick="Cart.remove('${i.productId}','${i.variantId}')">Remove</button>
          </div>
        </div>
      </div>`
      )
      .join('');

    const subtotal = Cart.subtotal();
    const shipping = subtotal >= 699 || subtotal === 0 ? 0 : 49;
    const total = subtotal + shipping;

    if (footEl) {
      footEl.innerHTML = `
        <div class="cart-summary-row"><span>Subtotal</span><span>₹${subtotal}</span></div>
        <div class="cart-summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : '₹' + shipping}</span></div>
        <div class="cart-summary-row total"><span>Total</span><span>₹${total}</span></div>
        <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="Checkout.open()">Checkout</button>
      `;
    }
  }
};

const Checkout = {
  // Set in open(), cleared in close() and on successful submit.
  // Kept alive across a failed submitOrder() so a retry reuses the same key.
  idempotencyKey: null,

  async open() {
    Cart.close();

    // One key per checkout attempt. If submitOrder fails (network blip, etc.)
    // and the user hits "Place Order" again without closing the modal, we want
    // the SAME key resent — that's what makes retries safe against duplicate orders.
    if (!Checkout.idempotencyKey) {
      Checkout.idempotencyKey = crypto.randomUUID();
    }

    let modal = document.getElementById('checkoutModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'checkoutModal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;font-size:1.2rem;">Shipping & Checkout</h3>
          <button onclick="Checkout.close()" style="border:none;background:none;font-size:1.2rem;cursor:pointer;">✕</button>
        </div>

        <div id="checkoutSavedAddrContainer" style="margin-bottom:16px;display:none;">
          <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Select Saved Address</label>
          <select id="checkoutAddrSelect" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--line);font-size:0.9rem;">
            <option value="">-- Use a new address --</option>
          </select>
        </div>

        <form id="checkoutForm">
          <div class="form-group"><label>Address Line 1</label><input id="co_line1" required /></div>
          <div class="form-group"><label>Address Line 2</label><input id="co_line2" /></div>
          <div class="form-row" style="display:flex;gap:12px;">
            <div class="form-group" style="flex:1;"><label>City</label><input id="co_city" required /></div>
            <div class="form-group" style="flex:1;"><label>State</label><input id="co_state" required /></div>
          </div>
          <div class="form-row" style="display:flex;gap:12px;">
            <div class="form-group" style="flex:1;"><label>Pincode</label><input id="co_pincode" required /></div>
            <div class="form-group" style="flex:1;"><label>Phone</label><input id="co_phone" required /></div>
          </div>

          <div style="margin:16px 0;">
            <label style="display:flex;align-items:center;gap:8px;font-size:0.88rem;cursor:pointer;">
              <input type="checkbox" id="co_saveAddress" checked /> Save address to profile for future checkouts
            </label>
          </div>

          <div style="margin:16px 0;">
            <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:8px;">Payment Method</label>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;cursor:pointer;border:1px solid var(--line);border-radius:8px;padding:10px;">
                <input type="radio" name="co_paymentMethod" value="upi" checked /> Pay Online (UPI, Card, Netbanking)
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;cursor:pointer;border:1px solid var(--line);border-radius:8px;padding:10px;">
                <input type="radio" name="co_paymentMethod" value="cod" /> Cash on Delivery
              </label>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="checkoutSubmitBtn">Place Order (₹${Cart.subtotal() >= 699 ? Cart.subtotal() : Cart.subtotal() + 49})</button>
        </form>
      </div>
    `;

    modal.style.display = 'flex';
    Checkout.loadSavedAddresses();

    document.getElementById('checkoutForm').onsubmit = Checkout.submitOrder;
  },

  close() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.style.display = 'none';
    // Closing the modal = abandoning this attempt. Next open() gets a fresh key.
    Checkout.idempotencyKey = null;
  },

  async loadSavedAddresses() {
    try {
      const { addresses } = await api.get('/addresses');
      if (addresses && addresses.length > 0) {
        const container = document.getElementById('checkoutSavedAddrContainer');
        const select = document.getElementById('checkoutAddrSelect');
        container.style.display = 'block';

        addresses.forEach((addr) => {
          const opt = document.createElement('option');
          opt.value = addr._id;
          opt.textContent = `${addr.label || 'Saved'}: ${addr.line1}, ${addr.city} (${addr.pincode})`;
          if (addr.isDefault) opt.selected = true;
          select.appendChild(opt);
        });

        const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
        if (defaultAddr) Checkout.fillForm(defaultAddr);

        select.addEventListener('change', (e) => {
          const selected = addresses.find((a) => a._id === e.target.value);
          if (selected) {
            Checkout.fillForm(selected);
          } else {
            document.getElementById('checkoutForm').reset();
          }
        });
      }
    } catch {
      // User is likely guest — hide saved address section
    }
  },

  fillForm(addr) {
    document.getElementById('co_line1').value = addr.line1 || '';
    document.getElementById('co_line2').value = addr.line2 || '';
    document.getElementById('co_city').value = addr.city || '';
    document.getElementById('co_state').value = addr.state || '';
    document.getElementById('co_pincode').value = addr.pincode || '';
    document.getElementById('co_phone').value = addr.phone || '';
  },

  async submitOrder(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('checkoutSubmitBtn');
    const paymentMethod = document.querySelector('input[name="co_paymentMethod"]:checked')?.value || 'cod';

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Placing order…';
      }

      const orderData = {
        items: Cart.read().map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingAddress: {
          line1: document.getElementById('co_line1').value,
          line2: document.getElementById('co_line2').value,
          city: document.getElementById('co_city').value,
          state: document.getElementById('co_state').value,
          pincode: document.getElementById('co_pincode').value,
          phone: document.getElementById('co_phone').value
        },
        saveAddress: document.getElementById('co_saveAddress').checked,
        paymentMethod
      };

      const { order } = await api.post('/orders', orderData, { 'Idempotency-Key': Checkout.idempotencyKey });
      Checkout.idempotencyKey = null; // order created — next attempt (if any) needs a fresh key
      Cart.clear();
      Checkout.close();

      if (paymentMethod === 'cod') {
        Toast.show('🎉 Order placed successfully!');
        setTimeout(() => (window.location.href = 'profile.html'), 1500);
        return;
      }

      // Both "card" and "upi" go through Razorpay — its widget shows both anyway.
      await Checkout.startPayment(order._id);
    } catch (err) {
      // Don't clear the key here — if this was a network failure before the
      // order was created, retrying with the SAME key is what makes it safe
      // against duplicate orders.
      Toast.show(err.message || 'Failed to place order.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `Place Order (₹${Cart.subtotal() >= 699 ? Cart.subtotal() : Cart.subtotal() + 49})`;
      }
    }
  },

  // --- Payment handoff (Phase 2) ---

  async startPayment(orderId) {
    try {
      const data = await api.post('/payments/create-order', { orderId });
      Checkout.openRazorpayWidget(data, orderId);
    } catch (err) {
      Toast.show(err.message || 'Could not start payment. Your order is saved — try paying again from your profile.');
      setTimeout(() => (window.location.href = 'profile.html'), 1800);
    }
  },

  openRazorpayWidget(data, orderId) {
    if (typeof Razorpay === 'undefined') {
      Toast.show('Payment widget failed to load. Check your connection and try again.');
      return;
    }

    const rzp = new Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: 'Makhana Shop',
      description: 'Order Payment',
      order_id: data.razorpayOrderId,
      handler: async function (response) {
        try {
          await api.post('/payments/verify', {
            orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          // Verify already confirmed it server-side, but route through the
          // processing page anyway — keeps one consistent "confirming…"
          // experience whether verify was instant or the webhook has to
          // catch up (e.g. verify request itself dropped after payment).
          window.location.href = `order-processing.html?orderId=${orderId}`;
        } catch (err) {
          // verify() failed client-side (network blip, tab closing, etc.) —
          // the webhook may still confirm it server-side shortly after.
          // Send them to the polling page instead of just showing an error;
          // it'll pick up the confirmation once the webhook lands.
          window.location.href = `order-processing.html?orderId=${orderId}`;
        }
      },
      theme: { color: '#2e7d32' },
      modal: {
        ondismiss: function () {
          Toast.show('Payment cancelled. Your order is saved — pay anytime from your profile.');
        }
      }
    });

    rzp.open();
  }
};

const Toast = {
  show(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2600);
  }
};

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  Cart.renderAll();

  // Close cart when clicking overlay
  document.getElementById('cartOverlay')?.addEventListener('click', Cart.close);

  // Global delegate click handler to open cart on any cart button/icon click
  document.addEventListener('click', (e) => {
    const cartTrigger = e.target.closest('#cartOpenBtn, #cartBtn, #cartIcon, .cart-icon, .cart-btn, [data-open-cart]');
    if (cartTrigger) {
      e.preventDefault();
      Cart.open();
    }
  });
});