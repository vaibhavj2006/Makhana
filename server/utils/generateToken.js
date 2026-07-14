const jwt = require('jsonwebtoken');

const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

const sendTokenCookie = (res, userId, role) => {
  const token = generateToken(userId, role);
  const cookieName = process.env.COOKIE_NAME || 'mk_token';
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(cookieName, token, {
    httpOnly: true, 
    secure: isProduction, 
    sameSite: isProduction ? 'none' : 'lax', 
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });

  return token;
};

module.exports = { generateToken, sendTokenCookie };