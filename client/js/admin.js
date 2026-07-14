let adminProducts = [];
let variantRowCount = 0;

async function guardAdminAccess() {
  try {
    const { user } = await api.get('/auth/me');
    if (user.role !== 'admin') throw new Error('Not admin');
    document.getElementById('adminView').style.display = 'block';
    loadAdminProducts();
    loadAdminOrders();
  } catch {
    document.getElementById('guardView').style.display = 'block';
  }
}

// ---------- Products ----------
async function loadAdminProducts() {
  const body = document.getElementById('productsTableBody');
  try {
    const { products } = await api.get('/products/admin/all');
    adminProducts = products;
    body.innerHTML = products.length
      ? products
          .map(
            (p) => `
      <tr>
        <td><img src="${p.images[0]}" alt="${p.name}" /></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.flavor}</td>
        <td>${p.variants.length} size${p.variants.length > 1 ? 's' : ''}</td>
        <td>${p.ratingAvg || 0} (${p.ratingCount})</td>
        <td>${p.isActive ? 'Active' : 'Hidden'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="openProductModal('${p._id}')">Edit</button>
          <button class="btn btn-sm" style="background:var(--coral); color:#fff;" onclick="deleteProduct('${p._id}')">Delete</button>
        </td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="8">No products yet. Click "New product" to add your first one.</td></tr>';
  } catch (err) {
    body.innerHTML = `<tr><td colspan="8">Couldn't load products (${err.message})</td></tr>`;
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product permanently? This cannot be undone.')) return;
  try {
    await api.delete(`/products/${id}`);
    Toast.show('Product deleted.');
    loadAdminProducts();
  } catch (err) {
    Toast.show(err.message);
  }
}

function addVariantRow(data = {}) {
  variantRowCount++;
  const id = `variant-${variantRowCount}`;
  const wrap = document.createElement('div');
  wrap.className = 'variant-row';
  wrap.id = id;
  wrap.innerHTML = `
    <input placeholder="Label (100g Pouch)" class="v-label" value="${data.label || ''}" required />
    <input placeholder="Weight (g)" class="v-weight" type="number" value="${data.weightGrams || ''}" required />
    <input placeholder="Price ₹" class="v-price" type="number" value="${data.price || ''}" required />
    <input placeholder="Compare ₹" class="v-compare" type="number" value="${data.compareAtPrice || ''}" />
    <input placeholder="Stock" class="v-stock" type="number" value="${data.stock ?? ''}" required />
    <input placeholder="SKU" class="v-sku" value="${data.sku || ''}" required />
    <button type="button" class="variant-remove" onclick="document.getElementById('${id}').remove()">✕</button>
  `;
  document.getElementById('variantRows').appendChild(wrap);
}

function readVariantRows() {
  return [...document.querySelectorAll('.variant-row')].map((row) => ({
    label: row.querySelector('.v-label').value,
    weightGrams: Number(row.querySelector('.v-weight').value),
    price: Number(row.querySelector('.v-price').value),
    compareAtPrice: row.querySelector('.v-compare').value ? Number(row.querySelector('.v-compare').value) : undefined,
    stock: Number(row.querySelector('.v-stock').value),
    sku: row.querySelector('.v-sku').value
  }));
}

function openProductModal(productId) {
  document.getElementById('productFormMsg').classList.remove('show');
  document.getElementById('variantRows').innerHTML = '';
  const modal = document.getElementById('productModal');
  const form = document.getElementById('productForm');
  form.reset();

  const product = productId ? adminProducts.find((p) => p._id === productId) : null;
  document.getElementById('productModalTitle').textContent = product ? 'Edit product' : 'New product';
  document.getElementById('p_id').value = product?._id || '';
  document.getElementById('p_name').value = product?.name || '';
  document.getElementById('p_slug').value = product?.slug || '';
  document.getElementById('p_tagline').value = product?.tagline || '';
  document.getElementById('p_description').value = product?.description || '';
  document.getElementById('p_flavor').value = product?.flavor || '';
  document.getElementById('p_category').value = product?.category || 'classic';
  document.getElementById('p_images').value = product?.images?.join(', ') || '';
  document.getElementById('p_tags').value = product?.tags?.join(', ') || '';
  document.getElementById('p_featured').checked = !!product?.isFeatured;

  if (product?.variants?.length) {
    product.variants.forEach((v) => addVariantRow(v));
  } else {
    addVariantRow();
  }

  modal.classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

async function submitProductForm(e) {
  e.preventDefault();
  const msg = document.getElementById('productFormMsg');
  msg.classList.remove('show');

  const id = document.getElementById('p_id').value;
  const payload = {
    name: document.getElementById('p_name').value,
    slug: document.getElementById('p_slug').value.trim().toLowerCase().replace(/\s+/g, '-'),
    tagline: document.getElementById('p_tagline').value,
    description: document.getElementById('p_description').value,
    flavor: document.getElementById('p_flavor').value,
    category: document.getElementById('p_category').value,
    images: document.getElementById('p_images').value.split(',').map((s) => s.trim()).filter(Boolean),
    tags: document.getElementById('p_tags').value.split(',').map((s) => s.trim()).filter(Boolean),
    isFeatured: document.getElementById('p_featured').checked,
    variants: readVariantRows()
  };

  if (!payload.variants.length) {
    msg.textContent = 'Add at least one size/variant.';
    msg.classList.add('show');
    return;
  }

  try {
    if (id) {
      await api.put(`/products/${id}`, payload);
      Toast.show('Product updated.');
    } else {
      await api.post('/products', payload);
      Toast.show('Product created.');
    }
    closeProductModal();
    loadAdminProducts();
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('show');
  }
}

// ---------- Orders ----------
async function loadAdminOrders() {
  const body = document.getElementById('ordersTableBody');
  try {
    const { orders } = await api.get('/orders');
    body.innerHTML = orders.length
      ? orders
          .map(
            (o) => `
      <tr>
        <td>#${o._id.slice(-6).toUpperCase()}</td>
        <td>${o.user?.name || 'N/A'}<br><span style="color:var(--ink-soft); font-size:0.78rem;">${o.user?.email || ''}</span></td>
        <td>${o.items.length}</td>
        <td>₹${o.totalPrice}</td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td>
          <select class="sort-select" onchange="updateOrderStatus('${o._id}', this.value)">
            ${['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
              .map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`)
              .join('')}
          </select>
        </td>
      </tr>`
          )
          .join('')
      : '<tr><td colspan="6">No orders yet.</td></tr>';
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6">Couldn't load orders (${err.message})</td></tr>`;
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await api.put(`/orders/${orderId}/status`, { status });
    Toast.show('Order status updated.');
  } catch (err) {
    Toast.show(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  guardAdminAccess();

  document.getElementById('newProductBtn').addEventListener('click', () => openProductModal());
  document.getElementById('productForm').addEventListener('submit', submitProductForm);
  document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target.id === 'productModal') closeProductModal();
  });

  document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('admin-tab-products').style.display = btn.dataset.tab === 'products' ? 'block' : 'none';
      document.getElementById('admin-tab-orders').style.display = btn.dataset.tab === 'orders' ? 'block' : 'none';
    });
  });
});
