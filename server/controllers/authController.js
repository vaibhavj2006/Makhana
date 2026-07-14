const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendTokenCookie } = require('../utils/generateToken');
const { sendEmail } = require('../utils/sendEmail');
const { welcomeEmail } = require('../utils/emailTemplates');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are all required.');
  }
  if (password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters.');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('An account with that email already exists.');
  }

  const user = await User.create({ name, email, password, phone, authProvider: 'local' });
  sendTokenCookie(res, user._id, user.role);

  // Fire-and-forget: don't make signup wait on (or fail because of) email delivery.
  sendEmail({ to: user.email, subject: 'Welcome to Pond & Puff 🪷', html: welcomeEmail(user.name) });

  res.status(201).json({ success: true, user: user.toSafeObject() });
});

// @route POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (user && user.authProvider === 'google' && !user.password) {
    res.status(400);
    throw new Error('This account uses Google Sign-In. Please log in with the "Continue with Google" button.');
  }

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Incorrect email or password.');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been disabled.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenCookie(res, user._id, user.role);
  res.json({ success: true, user: user.toSafeObject() });
});

// @route POST /api/auth/google
// Body: { credential } — the ID token string from Google Identity Services on the frontend.
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400);
    throw new Error('Missing Google credential.');
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(500);
    throw new Error('Google Sign-In is not configured on this server yet.');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch {
    res.status(401);
    throw new Error('Could not verify Google sign-in. Please try again.');
  }

  const { sub: googleId, email, name, picture, email_verified: emailVerified } = payload;
  if (!emailVerified) {
    res.status(401);
    throw new Error('Your Google email is not verified.');
  }

  // Match an existing account by googleId first, then by email (so an existing
  // email/password user who signs in with the same Google email gets linked, not duplicated).
  let user = await User.findOne({ googleId });
  if (!user) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.googleId = googleId;
      user.authProvider = user.authProvider === 'local' ? user.authProvider : 'google';
      if (!user.avatarUrl) user.avatarUrl = picture;
      await user.save({ validateBeforeSave: false });
    }
  }

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      authProvider: 'google',
      avatarUrl: picture,
      phone: undefined
    });
    sendEmail({ to: user.email, subject: 'Welcome to Pond & Puff 🪷', html: welcomeEmail(user.name) });
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been disabled.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenCookie(res, user._id, user.role);
  res.json({ success: true, user: user.toSafeObject() });
});

// @route POST /api/auth/logout
const logoutUser = asyncHandler(async (req, res) => {
  const cookieName = process.env.COOKIE_NAME || 'mk_token';
  res.clearCookie(cookieName);
  res.json({ success: true, message: 'Logged out.' });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

module.exports = { registerUser, loginUser, googleLogin, logoutUser, getMe };
