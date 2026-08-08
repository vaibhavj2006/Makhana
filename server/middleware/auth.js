const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Verifies the JWT (from httpOnly cookie or Authorization header) and attaches req.user
const protect = asyncHandler(async (req, res, next) => {
  const cookieName = process.env.COOKIE_NAME || 'mk_token';
  let token = req.cookies?.[cookieName];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authenticated. Please log in.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error('Account not found or disabled.');
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Session expired or invalid. Please log in again.');
  }
});

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    res.status(403);
    throw new Error('Admin access required.');
  }
  next();
};

// Like protect, but never blocks the request. If a valid token is present,
// req.user gets set; if not (guest, expired, missing, malformed) the request
// just continues with req.user left undefined. Use this on routes that need
// to work for both guests and logged-in users — e.g. recently-viewed tracking.
const attachUserIfPresent = asyncHandler(async (req, res, next) => {
  const cookieName = process.env.COOKIE_NAME || 'mk_token';
  let token = req.cookies?.[cookieName];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // invalid/expired token — just proceed as a guest, don't error
  }
  next();
});

module.exports = { protect, adminOnly, attachUserIfPresent };