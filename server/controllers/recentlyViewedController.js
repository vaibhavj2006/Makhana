const asyncHandler = require('express-async-handler');
const RecentlyViewed = require('../models/RecentlyViewed');

const MAX_ITEMS = 20;

function getIdentifier(req) {
  // TODO once middleware/auth.js is confirmed: if you have an optional-auth
  // middleware that sets req.user without requiring a token, prefer that here:
  // return req.user ? req.user._id.toString() : req.guestId;
  return (req.user && req.user._id.toString()) || req.guestId;
}

// @route POST /api/products/:id/view
const recordView = asyncHandler(async (req, res) => {
  const identifier = getIdentifier(req);
  if (!identifier) return res.json({ success: true });

  await RecentlyViewed.findOneAndUpdate(
    { identifier, product: req.params.id },
    { viewedAt: new Date() },
    { upsert: true }
  );

  // Keep only the most recent MAX_ITEMS per identifier.
  const excess = await RecentlyViewed.find({ identifier })
    .sort({ viewedAt: -1 })
    .skip(MAX_ITEMS)
    .select('_id');
  if (excess.length) {
    await RecentlyViewed.deleteMany({ _id: { $in: excess.map((d) => d._id) } });
  }

  res.json({ success: true });
});

// @route GET /api/products/recently-viewed
const getRecentlyViewed = asyncHandler(async (req, res) => {
  const identifier = getIdentifier(req);
  if (!identifier) return res.json({ success: true, products: [] });

  const views = await RecentlyViewed.find({ identifier })
    .sort({ viewedAt: -1 })
    .limit(MAX_ITEMS)
    .populate('product');

  const products = views.filter((v) => v.product && v.product.isActive).map((v) => v.product);
  res.json({ success: true, products });
});

// Called from authController on login/google-login to merge guest history into the user.
async function mergeGuestHistory(guestIdValue, userId) {
  if (!guestIdValue) return;
  // Move each guest row onto the user's identifier; if the user already has
  // a row for that product, the guest row would collide with the unique
  // index, so those are just dropped instead of erroring the login.
  const guestRows = await RecentlyViewed.find({ identifier: guestIdValue });
  for (const row of guestRows) {
    await RecentlyViewed.updateOne(
      { identifier: guestIdValue, product: row.product },
      { identifier: userId.toString() }
    ).catch(() => {
      // duplicate for this user — just remove the stray guest row
      return RecentlyViewed.deleteOne({ _id: row._id });
    });
  }
}

module.exports = { recordView, getRecentlyViewed, mergeGuestHistory };
