// Public, non-secret config. The Google Client ID is meant to be visible in frontend code —
// it identifies your app to Google, it doesn't grant access to anything by itself.

// Replace with your own API URL once deployed (see README).
window.MAKHANA_API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://makhana-c4wv.onrender.com/api';

// Replace with your own OAuth Client ID from Google Cloud Console.
// Leave as-is (empty) to keep the "Continue with Google" button hidden.
window.GOOGLE_CLIENT_ID = '980104051755-uf3c2oj59c6l99jpstkdovuvo9q911bt.apps.googleusercontent.com';
