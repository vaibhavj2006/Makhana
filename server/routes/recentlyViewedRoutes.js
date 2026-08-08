const express = require('express');
const { recordView, getRecentlyViewed } = require('../controllers/recentlyViewedController');
const { attachUserIfPresent } = require('../middleware/auth');

const router = express.Router();

// NOTE: mount this BEFORE productRoutes in server.js — otherwise
// GET /api/products/recently-viewed will get swallowed by productRoutes'
// GET /:slug handler and 404/error as if "recently-viewed" were a slug.
router.use(attachUserIfPresent); // sets req.user for logged-in visitors, no-ops for guests
router.get('/recently-viewed', getRecentlyViewed);
router.post('/:id/view', recordView);

module.exports = router;