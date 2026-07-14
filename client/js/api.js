// Central place to point the frontend at your backend.
// Change this if your API runs somewhere other than localhost:5000.
const API_BASE = window.MAKHANA_API_BASE || 'http://localhost:5000/api';

async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include', // sends the httpOnly auth cookie
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'Unexpected server response.' };
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }
  return data;
}

const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' })
};
