function renderStars(avg) {
  const full = Math.round(avg);
  return '★★★★★☆☆☆☆☆'.slice(5 - full, 10 - full);
}

function productCardHTML(p) {
  const v = p.variants[0];
  const discount = v.compareAtPrice && v.compareAtPrice > v.price;
  const variantOptions = p.variants
    .map((variant) => `<option value="${variant._id}">${variant.label} — ₹${variant.price}</option>`)
    .join('');

  return `
    <div class="product-card pop-in">
      <a href="shop.html#${p.slug}" class="product-media">
        ${p.isFeatured ? '<span class="product-badge">Fan favorite</span>' : ''}
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy" />
      </a>
      <div class="product-body">
        <span class="product-flavor">${p.flavor}</span>
        <h3>${p.name}</h3>
        <p class="tagline">${p.tagline || ''}</p>
        <div class="rating-row"><span class="stars">${renderStars(p.ratingAvg)}</span><span>(${p.ratingCount})</span></div>
        <select class="variant-select" id="variant-${p._id}">${variantOptions}</select>
        <div class="product-foot">
          <span class="price" id="price-${p._id}">
            ${discount ? `<span class="strike">₹${v.compareAtPrice}</span>` : ''}₹${v.price}
          </span>
          <button class="btn btn-primary btn-sm" onclick="addProductToCart('${p._id}')">Add to bag</button>
        </div>
      </div>
    </div>`;
}

window._productCache = {};

function addProductToCart(productId) {
  const product = window._productCache[productId];
  if (!product) return;
  const select = document.getElementById(`variant-${productId}`);
  const variant = product.variants.find((v) => v._id === select.value);
  if (!variant) return;
  if (variant.stock < 1) {
    Toast.show('That size is out of stock right now.');
    return;
  }
  Cart.add({
    productId: product._id,
    variantId: variant._id,
    name: product.name,
    variantLabel: variant.label,
    price: variant.price,
    image: product.images[0],
    maxStock: variant.stock
  });
}

async function loadFeatured() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  try {
    const { products } = await api.get('/products/featured');
    products.forEach((p) => (window._productCache[p._id] = p));
    grid.innerHTML = products.length
      ? products.map(productCardHTML).join('')
      : '<p>No featured products yet — check back soon.</p>';
  } catch (err) {
    grid.innerHTML = `<p>Couldn't load products right now (${err.message}). Is the API running?</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadFeatured);
