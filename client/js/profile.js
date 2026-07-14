function showMsg(id, message, type = 'error') {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `form-msg ${type} show`;
}
function hideMsg(id) {
  document.getElementById(id).classList.remove('show');
}

async function checkAuthAndRender() {
  try {
    const { user } = await api.get('/auth/me');
    renderDashboard(user);
  } catch {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashSection').style.display = 'none';
  }
}

function renderDashboard(user) {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('dashSection').style.display = 'block';
  document.getElementById('welcomeName').textContent = `Welcome back, ${user.name.split(' ')[0]}`;
  document.getElementById('acc_name').value = user.name;
  document.getElementById('acc_phone').value = user.phone || '';
  renderAddresses(user.addresses || []);
  loadOrders();
}

function renderAddresses(addresses) {
  const el = document.getElementById('addressesList');
  if (!addresses.length) {
    el.innerHTML = '<p style="color:var(--ink-soft);">No saved addresses yet.</p>';
    return;
  }
  el.innerHTML = addresses
    .map(
      (a) => `
    <div class="order-row">
      <div>
        <strong>${a.label || 'Address'}</strong>
        <p style="margin:4px 0 0; font-size:0.88rem;">${a.line1}, ${a.line2 ? a.line2 + ', ' : ''}${a.city}, ${a.state} ${a.pincode} · ${a.phone}</p>
      </div>
      <button class="btn btn-outline btn-sm" onclick="deleteAddress('${a._id}')">Remove</button>
    </div>`
    )
    .join('');
}

async function deleteAddress(id) {
  try {
    const { addresses } = await api.delete(`/users/me/addresses/${id}`);
    renderAddresses(addresses);
    Toast.show('Address removed.');
  } catch (err) {
    Toast.show(err.message);
  }
}

async function loadOrders() {
  const el = document.getElementById('ordersList');
  try {
    const { orders } = await api.get('/orders/mine');
    if (!orders.length) {
      el.innerHTML = `<div class="empty-state"><p>No orders yet. Your first bag of makhana is one click away.</p><a href="shop.html" class="btn btn-primary btn-sm">Shop now</a></div>`;
      return;
    }
    el.innerHTML = orders
      .map(
        (o) => `
      <div class="order-row">
        <div>
          <strong>Order #${o._id.slice(-6).toUpperCase()}</strong>
          <p style="margin:4px 0 0; font-size:0.85rem;">${new Date(o.createdAt).toLocaleDateString()} · ${o.items.length} item(s) · ₹${o.totalPrice}</p>
        </div>
        <span class="status-chip ${o.status}">${o.status}</span>
      </div>`
      )
      .join('');
  } catch (err) {
    el.innerHTML = `<p>Couldn't load orders (${err.message}).</p>`;
  }
}

function initGoogleSignIn(attemptsLeft = 10) {
  if (!window.GOOGLE_CLIENT_ID) return; // Google Sign-In not configured — skip silently

  if (!window.google?.accounts?.id) {
    if (attemptsLeft > 0) setTimeout(() => initGoogleSignIn(attemptsLeft - 1), 300);
    return;
  }

  google.accounts.id.initialize({
    client_id: window.GOOGLE_CLIENT_ID,
    callback: handleGoogleCredentialResponse
  });
  google.accounts.id.renderButton(document.getElementById('googleSignInDiv'), {
    theme: 'outline',
    size: 'large',
    width: 340,
    text: 'continue_with'
  });
  document.getElementById('googleDivider').style.display = 'flex';
}

async function handleGoogleCredentialResponse(response) {
  try {
    const { user } = await api.post('/auth/google', { credential: response.credential });
    refreshNavAuthState();
    renderDashboard(user);
    Toast.show(`Welcome, ${user.name.split(' ')[0]}!`);
  } catch (err) {
    showMsg('loginMsg', err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuthAndRender();
  initGoogleSignIn();

  // ---- Login/Register tab switching ----
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg('loginMsg');
    try {
      const { user } = await api.post('/auth/login', {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      });
      refreshNavAuthState();
      renderDashboard(user);
    } catch (err) {
      showMsg('loginMsg', err.message);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg('registerMsg');
    try {
      const { user } = await api.post('/auth/register', {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        password: document.getElementById('regPassword').value
      });
      refreshNavAuthState();
      renderDashboard(user);
    } catch (err) {
      showMsg('registerMsg', err.message);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api.post('/auth/logout');
    refreshNavAuthState();
    location.reload();
  });

  // ---- Dashboard tabs ----
  document.querySelectorAll('.dash-nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.dash-nav-item').forEach((i) => i.classList.remove('active'));
      document.querySelectorAll('.dash-tab').forEach((t) => (t.style.display = 'none'));
      item.classList.add('active');
      document.getElementById(`tab-${item.dataset.tab}`).style.display = 'block';
    });
  });

  // ---- Address form ----
  document.getElementById('addressForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { addresses } = await api.post('/users/me/addresses', {
        label: document.getElementById('addr_label').value,
        line1: document.getElementById('addr_line1').value,
        line2: document.getElementById('addr_line2').value,
        city: document.getElementById('addr_city').value,
        state: document.getElementById('addr_state').value,
        pincode: document.getElementById('addr_pincode').value,
        phone: document.getElementById('addr_phone').value
      });
      renderAddresses(addresses);
      e.target.reset();
      Toast.show('Address saved.');
    } catch (err) {
      Toast.show(err.message);
    }
  });

  // ---- Account details form ----
  document.getElementById('accountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg('accountMsg');
    try {
      await api.put('/users/me', {
        name: document.getElementById('acc_name').value,
        phone: document.getElementById('acc_phone').value
      });
      showMsg('accountMsg', 'Profile updated.', 'success');
      refreshNavAuthState();
    } catch (err) {
      showMsg('accountMsg', err.message);
    }
  });

  // ---- Password form ----
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg('passwordMsg');
    try {
      await api.put('/users/me/password', {
        currentPassword: document.getElementById('pw_current').value,
        newPassword: document.getElementById('pw_new').value
      });
      showMsg('passwordMsg', 'Password updated.', 'success');
      e.target.reset();
    } catch (err) {
      showMsg('passwordMsg', err.message);
    }
  });
});
