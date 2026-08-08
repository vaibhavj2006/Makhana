const mongoose = require('mongoose');

const recentlyViewedSchema = new mongoose.Schema({
  identifier: { type: String, required: true }, // userId (string) once logged in, or guestId (uuid) otherwise
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  viewedAt: { type: Date, default: Date.now }
});

// One row per (identifier, product) — re-viewing just bumps viewedAt via upsert.
recentlyViewedSchema.index({ identifier: 1, product: 1 }, { unique: true });
recentlyViewedSchema.index({ identifier: 1, viewedAt: -1 });

module.exports = mongoose.model('RecentlyViewed', recentlyViewedSchema);
