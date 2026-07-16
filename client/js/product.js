let currentProduct = null;
let selectedQty = 1;

function getSlugFromUrl() {
  return new URLSearchParams(window.location.search).get('slug');
}

function renderStarsHTML(avg) {
  const full = Math.round(avg);
  return '★★★★★☆☆☆☆☆'.slice(5 - full, 10 - full);
}

async function loadProductDetail() {
  const root = document.getElementById('productDetailRoot');
  const slug = getSlugFromUrl();
  if (!slug) {
    root.innerHTML = '<p>No product specified. <a href="shop.html">Back to shop</a></p>';
    return;
  }

  try {
    const { product } = await api.get(`/products/${slug}`);
    currentProduct = product;
    document.getElementById('pageTitle').textContent = `${product.name} — Pond & Puff`;
    renderProductDetail(product);
    loadRecommendations(product);
  } catch (err) {
    root.innerHTML = `<p>Couldn't load this product (${err.message}). <a href="shop.html">Back to shop</a></p>`;
  }
}

function renderProductDetail(p) {
  const root = document.getElementById('productDetailRoot');
  const variantOptions = p.variants
    .map((v) => `<option value="${v._id}">${v.label} — ₹${v.price}${v.stock < 1 ? ' (out of stock)' : ''}</option>`)
    .join('');

  const nutritionHTML = p.nutrition
    ? `
    <div class="nutrition-grid">
      <div><b>${p.nutrition.caloriesPer30g ?? '—'}</b><span>Calories /30g</span></div>
      <div><b>${p.nutrition.protein ?? '—'}g</b><span>Protein</span></div>
      <div><b>${p.nutrition.carbs ?? '—'}g</b><span>Carbs</span></div>
      <div><b>${p.nutrition.fat ?? '—'}g</b><span>Fat</span></div>
      <div><b>${p.nutrition.fiber ?? '—'}g</b><span>Fiber</span></div>
    </div>`
    : '<p>Nutrition info not available for this product yet.</p>';

  root.innerHTML = `
    <div class="pd-layout">
      <div>
        <div class="pd-gallery-main"><img id="pdMainImage" src="${p.images[0]}" alt="${p.name}" /></div>
        ${
          p.images.length > 1
            ? `<div class="pd-gallery-thumbs">${p.images
                .map((img, i) => `<img src="${img}" class="${i === 0 ? 'active' : ''}" onclick="switchPdImage(this, '${img}')" />`)
                .join('')}</div>`
            : ''
        }
      </div>
      <div>
        <span class="product-flavor">${p.flavor}</span>
        <h1 style="font-size:2rem; margin:8px 0 6px;">${p.name}</h1>
        <div class="rating-row" style="margin-bottom:10px;">
          <span class="stars">${renderStarsHTML(p.ratingAvg)}</span>
          <span>${p.ratingAvg || 0} (${p.ratingCount} review${p.ratingCount === 1 ? '' : 's'})</span>
        </div>
        <p style="font-size:1.02rem;">${p.tagline || ''}</p>
        <p>${p.description}</p>

        <div class="form-group">
          <label for="pdVariant">Choose size</label>
          <select id="pdVariant" class="variant-select" onchange="updatePdPrice()">${variantOptions}</select>
        </div>

        <div class="pd-price-row">
          <span class="price" id="pdPrice"></span>
        </div>

        <div style="display:flex; align-items:center; gap:16px; margin-top:10px;">
          <div class="qty-stepper">
            <button type="button" onclick="changePdQty(-1)">–</button>
            <span id="pdQty">1</span>
            <button type="button" onclick="changePdQty(1)">+</button>
          </div>
          <button class="btn btn-primary" style="flex:1;" onclick="addPdToCart()">Add to bag</button>
        </div>

        ${p.tags?.length ? `<div style="margin-top:18px; display:flex; gap:8px; flex-wrap:wrap;">${p.tags.map((t) => `<span class="pill" style="font-size:0.76rem; padding:5px 12px;">${t}</span>`).join('')}</div>` : ''}
      </div>
    </div>

    <div class="pd-tabs">
      <button class="pd-tab-btn active" data-tab="nutrition">Nutrition</button>
      <button class="pd-tab-btn" data-tab="reviews">Reviews (${p.ratingCount})</button>
    </div>

    <div id="pd-tab-nutrition">${nutritionHTML}</div>

    <div id="pd-tab-reviews" style="display:none; max-width:640px;">
      <div class="review-summary">
        <span class="big-rating">${p.ratingAvg || 0}</span>
        <div>
          <div class="stars" style="font-size:1.1rem;">${renderStarsHTML(p.ratingAvg)}</div>
          <span style="font-size:0.85rem; color:var(--ink-soft);">${p.ratingCount} review${p.ratingCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div id="reviewFormWrap"></div>

      <div id="reviewsList">
        ${
          p.reviews.length
            ? p.reviews
                .slice()
                .reverse()
                .map(
                  (r) => `
          <div class="review-card">
            <div class="review-head">
              <span class="reviewer-name">${r.name}</span>
              <span class="review-date">${new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="stars" style="font-size:0.9rem;">${renderStarsHTML(r.rating)}</div>
            ${r.comment ? `<p style="margin-top:6px;">${r.comment}</p>` : ''}
          </div>`
                )
                .join('')
            : '<p style="color:var(--ink-soft);">No reviews yet — be the first to try it and share your thoughts.</p>'
        }
      </div>
    </div>
  `;

  updatePdPrice();
  renderReviewForm();

  document.querySelectorAll('.pd-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pd-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('pd-tab-nutrition').style.display = btn.dataset.tab === 'nutrition' ? 'block' : 'none';
      document.getElementById('pd-tab-reviews').style.display = btn.dataset.tab === 'reviews' ? 'block' : 'none';
    });
  });
}

function switchPdImage(el, src) {
  document.getElementById('pdMainImage').src = src;
  document.querySelectorAll('.pd-gallery-thumbs img').forEach((i) => i.classList.remove('active'));
  el.classList.add('active');
}

function updatePdPrice() {
  const variantId = document.getElementById('pdVariant').value;
  const variant = currentProduct.variants.find((v) => v._id === variantId);
  const discount = variant.compareAtPrice && variant.compareAtPrice > variant.price;
  document.getElementById('pdPrice').innerHTML = `${discount ? `<span class="strike">₹${variant.compareAtPrice}</span>` : ''}₹${variant.price}`;
}

function changePdQty(delta) {
  selectedQty = Math.max(1, selectedQty + delta);
  document.getElementById('pdQty').textContent = selectedQty;
}

function addPdToCart() {
  const variantId = document.getElementById('pdVariant').value;
  const variant = currentProduct.variants.find((v) => v._id === variantId);
  if (variant.stock < 1) {
    Toast.show('That size is out of stock right now.');
    return;
  }
  for (let i = 0; i < selectedQty; i++) {
    Cart.add({
      productId: currentProduct._id,
      variantId: variant._id,
      name: currentProduct.name,
      variantLabel: variant.label,
      price: variant.price,
      image: currentProduct.images[0],
      maxStock: variant.stock
    });
  }
  selectedQty = 1;
  document.getElementById('pdQty').textContent = 1;
}

async function renderReviewForm() {
  const wrap = document.getElementById('reviewFormWrap');
  let user = null;
  try {
    const res = await api.get('/auth/me');
    user = res.user;
  } catch {
    wrap.innerHTML = `<p style="margin-bottom:20px;"><a href="profile.html">Log in</a> to leave a review.</p>`;
    return;
  }

  const alreadyReviewed = currentProduct.reviews.some((r) => (r.user?._id || r.user) === user._id);
  if (alreadyReviewed) {
    wrap.innerHTML = `<p style="margin-bottom:20px; color:var(--ink-soft);">You've already reviewed this product — thanks!</p>`;
    return;
  }

  wrap.innerHTML = `
    <form id="reviewForm" style="margin-bottom:26px; padding:18px; background:var(--cream); border-radius:var(--radius-md);">
      <div class="form-msg error" id="reviewMsg"></div>
      <div class="form-group">
        <label for="reviewRating">Your rating</label>
        <select id="reviewRating" required>
          <option value="5">★★★★★ — Excellent</option>
          <option value="4">★★★★☆ — Good</option>
          <option value="3">★★★☆☆ — Okay</option>
          <option value="2">★★☆☆☆ — Not great</option>
          <option value="1">★☆☆☆☆ — Poor</option>
        </select>
      </div>
      <div class="form-group">
        <label for="reviewComment">Your review (optional)</label>
        <textarea id="reviewComment" rows="3" maxlength="1000" placeholder="How was the crunch?"></textarea>
      </div>
      <button class="btn btn-secondary btn-sm" type="submit">Submit review</button>
    </form>
  `;

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('reviewMsg');
    msg.classList.remove('show');
    try {
      const { product } = await api.post(`/products/${currentProduct.slug}/reviews`, {
        rating: Number(document.getElementById('reviewRating').value),
        comment: document.getElementById('reviewComment').value
      });
      Toast.show('Thanks for your review!');
      currentProduct = product;
      renderProductDetail(product);
      document.querySelector('.pd-tab-btn[data-tab="reviews"]').click();
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add('show');
    }
  });
}

async function loadRecommendations(product) {
  const grid = document.getElementById('recommendationsGrid');
  try {
    const { products } = await api.get(`/products?category=${product.category}&limit=4`);
    const filtered = products.filter((p) => p._id !== product._id);
    const list = filtered.length ? filtered : (await api.get('/products/featured')).products.filter((p) => p._id !== product._id);

    list.forEach((p) => (window._productCache[p._id] = p));
    grid.innerHTML = list.length ? list.slice(0, 4).map(productCardHTML).join('') : '<p>No other products to show yet.</p>';
  } catch {
    grid.innerHTML = "<p>Couldn't load recommendations right now.</p>";
  }
}

document.addEventListener('DOMContentLoaded', loadProductDetail);