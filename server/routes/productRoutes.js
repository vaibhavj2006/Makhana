const express = require('express');
const {
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
  addReview,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

const router = express.Router();

// 60s TTL on read-heavy public listing routes. Cheap win: these get hit on
// every shop-page load/filter change but rarely change themselves.
router.get('/', cache(60), getProducts);
router.get('/featured', cache(60), getFeaturedProducts);
router.get('/admin/all', protect, adminOnly, getAllProductsAdmin);
router.get('/:slug', cache(60), getProductBySlug);
router.post('/:slug/reviews', protect, addReview);

router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;