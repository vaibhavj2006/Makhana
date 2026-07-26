// Lightweight translation system for the site's shared chrome (nav, footer, cart, buttons).
// Scope note: product names/descriptions and page body copy stay in English for now —
// translating those would mean translating every product in the database, which is a
// separate, bigger project. This covers the parts of the UI that appear on every page.

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.shop': 'Shop',
    'nav.about': 'About',
    'nav.sourcing': 'Sourcing',
    'nav.profile': 'Profile',
    'nav.admin': 'Admin',
    'nav.login': 'Log in',
    'cart.title': 'Your bag',
    'cart.checkout': 'Checkout',
    'cart.subtotal': 'Subtotal',
    'cart.shipping': 'Shipping',
    'cart.total': 'Total',
    'cart.free': 'Free',
    'cart.empty': 'Your bag is empty. Go find your new favorite crunch.',
    'cart.shopNow': 'Shop makhana',
    'footer.shop': 'Shop',
    'footer.company': 'Company',
    'footer.contact': 'Get in touch',
    'btn.addToBag': 'Add to bag',
    'btn.shopRange': 'Shop the range'
  },
  hi: {
    'nav.home': 'होम',
    'nav.shop': 'खरीदें',
    'nav.about': 'परिचय',
    'nav.sourcing': 'स्रोत',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.admin': 'एडमिन',
    'nav.login': 'लॉग इन करें',
    'cart.title': 'आपका बैग',
    'cart.checkout': 'चेकआउट',
    'cart.subtotal': 'सबटोटल',
    'cart.shipping': 'शिपिंग',
    'cart.total': 'कुल',
    'cart.free': 'मुफ़्त',
    'cart.empty': 'आपका बैग खाली है। अपना नया पसंदीदा स्नैक ढूंढें।',
    'cart.shopNow': 'मखाना खरीदें',
    'footer.shop': 'खरीदें',
    'footer.company': 'कंपनी',
    'footer.contact': 'संपर्क करें',
    'btn.addToBag': 'बैग में डालें',
    'btn.shopRange': 'पूरी रेंज देखें'
  }
};

function t(key) {
  const lang = getLanguage();
  return translations[lang]?.[key] || translations.en[key] || key;
}

function getLanguage() {
  try {
    return localStorage.getItem('mk_lang') || 'en';
  } catch {
    return 'en';
  }
}

function setLanguage(lang) {
  try {
    localStorage.setItem('mk_lang', lang);
  } catch {
    /* ignore */
  }
  applyTranslations();
}

// Swaps text content for every element tagged with data-i18n="some.key"
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

document.addEventListener('DOMContentLoaded', applyTranslations);
