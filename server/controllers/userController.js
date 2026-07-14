const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @route PUT /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  await user.save();
  res.json({ success: true, user: user.toSafeObject() });
});

// @route PUT /api/users/me/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    res.status(400);
    throw new Error('New password must be at least 8 characters.');
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect.');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated.' });
});

// @route POST /api/users/me/addresses
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses.push(req.body);
  await user.save();
  res.status(201).json({ success: true, addresses: user.addresses });
});

// @route DELETE /api/users/me/addresses/:addressId
const removeAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.addressId);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// @route PUT /api/users/me/wishlist/:productId
const toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { productId } = req.params;
  const idx = user.wishlist.findIndex((id) => id.toString() === productId);
  if (idx > -1) {
    user.wishlist.splice(idx, 1);
  } else {
    user.wishlist.push(productId);
  }
  await user.save();
  res.json({ success: true, wishlist: user.wishlist });
});

module.exports = { updateProfile, changePassword, addAddress, removeAddress, toggleWishlist };
