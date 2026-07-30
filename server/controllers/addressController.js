const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// All routes here are mounted behind `protect`, so req.user is always set.

// @route GET /api/addresses  (auth required)
const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses');
  res.json({ success: true, addresses: user.addresses });
});

// @route POST /api/addresses  (auth required)
const addAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, city, state, pincode, country, phone, isDefault } = req.body;

  if (!line1 || !city || !state || !pincode || !phone) {
    res.status(400);
    throw new Error('line1, city, state, pincode and phone are required.');
  }

  const user = await User.findById(req.user._id);

  // First address a user ever adds should always be the default, regardless of what was sent.
  const makeDefault = isDefault || user.addresses.length === 0;

  if (makeDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  user.addresses.push({
    label: label || 'Home',
    line1,
    line2,
    city,
    state,
    pincode,
    country: country || 'India',
    phone,
    isDefault: makeDefault
  });

  await user.save();
  res.status(201).json({ success: true, addresses: user.addresses });
});

// @route PUT /api/addresses/:addressId  (auth required, owner only)
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error('Address not found.');
  }

  const { label, line1, line2, city, state, pincode, country, phone, isDefault } = req.body;

  if (label !== undefined) address.label = label;
  if (line1 !== undefined) address.line1 = line1;
  if (line2 !== undefined) address.line2 = line2;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (pincode !== undefined) address.pincode = pincode;
  if (country !== undefined) address.country = country;
  if (phone !== undefined) address.phone = phone;

  if (isDefault === true) {
    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.equals(address._id);
    });
  }

  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// @route DELETE /api/addresses/:addressId  (auth required, owner only)
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error('Address not found.');
  }

  const wasDefault = address.isDefault;
  address.deleteOne();

  // If the deleted address was the default and others remain, promote the most recently added one.
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[user.addresses.length - 1].isDefault = true;
  }

  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// @route PUT /api/addresses/:addressId/default  (auth required, owner only)
const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);

  if (!address) {
    res.status(404);
    throw new Error('Address not found.');
  }

  user.addresses.forEach((addr) => {
    addr.isDefault = addr._id.equals(address._id);
  });

  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress };
