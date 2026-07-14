const shopState = {
  category: new URLSearchParams(location.search).get('category') || '',
  search: '',
  sort: 'newest',
  page: 1
};

let searchDebounce;

async function loadShop() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '<p>Loading products…</p>';

  const params = new URLSearchParams();
  if (shopState.category) params.set('category', shopState.category);
  if (shopState.search) params.set('search', shopState.search);
  if (shopState.sort) params.set('sort', shopState.sort);
  params.set('page', shopState.page);
  params.set('limit', 9);

  try {
    const { products, pages, page } = await api.get(`/products?${params.toString()}`);
    products.forEach((p) => (window._productCache[p._id] = p));
    grid.innerHTML = products.length
      ? products.map(productCardHTML).join('')
      : '<p>No products match those filters. Try clearing search or picking a different category.</p>';
    renderPagination(pages, page);
  } catch (err) {
    grid.innerHTML = `<p>Couldn't load products (${err.message}). Is the API running at the configured URL?</p>`;
  }
}

function renderPagination(pages, current) {
  const el = document.getElementById('shopPagination');
  if (!el || pages <= 1) {
    if (el) el.innerHTML = '';
    return;
  }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="pill ${i === current ? 'active' : ''}" style="margin:0 4px;" onclick="goToPage(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}

function goToPage(n) {
  shopState.page = n;
  loadShop();
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  loadShop();

  document.getElementById('categoryPills').addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    document.querySelectorAll('#categoryPills .pill').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    shopState.category = btn.dataset.category;
    shopState.page = 1;
    loadShop();
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      shopState.search = e.target.value.trim();
      shopState.page = 1;
      loadShop();
    }, 400);
  });

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    shopState.sort = e.target.value;
    shopState.page = 1;
    loadShop();
  });

  if (shopState.category) {
    document.querySelectorAll('#categoryPills .pill').forEach((p) => {
      p.classList.toggle('active', p.dataset.category === shopState.category);
    });
  }
});
