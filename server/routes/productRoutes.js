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

const router = express.Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/admin/all', protect, adminOnly, getAllProductsAdmin);
router.get('/:slug', getProductBySlug);
router.post('/:slug/reviews', protect, addReview);

router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
