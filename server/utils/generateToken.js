const jwt = require('jsonwebtoken');

const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

const sendTokenCookie = (res, userId, role) => {
  const token = generateToken(userId, role);
  const cookieName = process.env.COOKIE_NAME || 'mk_token';

  res.cookie(cookieName, token, {
    httpOnly: true, // not readable by JS in the browser -> mitigates XSS token theft
    secure: process.env.SECURE_COOKIES === 'true', // set true once served over HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return token;
};

module.exports = { generateToken, sendTokenCookie };
