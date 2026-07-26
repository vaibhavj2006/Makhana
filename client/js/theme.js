// Applies theme (light/dark) immediately on load to avoid a flash of the wrong theme,
// then keeps localStorage and the logged-in user's saved server-side preference in sync.

(function applyStoredThemeImmediately() {
  try {
    const stored = localStorage.getItem('mk_theme');
    if (stored === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch {
    /* localStorage unavailable — just fall back to light theme */
  }
})();

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  try {
    localStorage.setItem('mk_theme', theme);
  } catch {
    /* ignore — not critical if this fails */
  }
}

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

// If the person is logged in, their saved preference (from any device) wins over
// whatever's in this browser's localStorage — keeps things consistent across devices.
async function syncThemeAndLanguageFromAccount() {
  try {
    const { user } = await api.get('/auth/me');
    if (user.preferences?.theme) setTheme(user.preferences.theme);
    if (user.preferences?.language) setLanguage(user.preferences.language);
  } catch {
    /* not logged in — keep using whatever's in localStorage */
  }
}

document.addEventListener('DOMContentLoaded', syncThemeAndLanguageFromAccount);
