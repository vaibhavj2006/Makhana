const express = require('express');
const { recordView, getRecentlyViewed } = require('../controllers/recentlyViewedController');

const router = express.Router();

// NOTE: mount this BEFORE productRoutes in server.js — otherwise
// GET /api/products/recently-viewed will get swallowed by productRoutes'
// GET /:slug handler and 404/error as if "recently-viewed" were a slug.
router.get('/recently-viewed', getRecentlyViewed);
router.post('/:id/view', recordView);

module.exports = router;
