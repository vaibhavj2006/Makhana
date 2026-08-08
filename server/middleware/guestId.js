const crypto = require('crypto');

const GUEST_COOKIE_NAME = 'mk_guest_id';
const GUEST_COOKIE_MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days

// Assigns a long-lived anonymous ID cookie if one doesn't exist yet.
// Mount this globally (before your routes) so req.guestId is always available.
function guestId(req, res, next) {
  if (req.cookies[GUEST_COOKIE_NAME]) {
    req.guestId = req.cookies[GUEST_COOKIE_NAME];
    return next();
  }
  const id = crypto.randomUUID();
  res.cookie(GUEST_COOKIE_NAME, id, {
    maxAge: GUEST_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SECURE_COOKIES === 'true'
  });
  req.guestId = id;
  next();
}

module.exports = { guestId, GUEST_COOKIE_NAME };
