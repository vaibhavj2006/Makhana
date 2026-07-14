// Cart lives in localStorage as a simple line-item list.
// Prices are always re-verified server-side at checkout, so nothing here is trusted blindly.
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
      itemsEl.innerHTML = `<div class="empty-state"><p>Your bag is empty. Go find your new favorite crunch.</p><a href="shop.html" class="btn btn-primary btn-sm">Shop makhana</a></div>`;
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
        <div class="cart-summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : '₹' + shipping}</span></div>
        <div class="cart-summary-row total"><span>Total</span><span>₹${total}</span></div>
        <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="Checkout.open()">Checkout</button>
      `;
    }
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

document.addEventListener('DOMContentLoaded', () => {
  Cart.renderAll();
  document.getElementById('cartOverlay')?.addEventListener('click', Cart.close);
});
