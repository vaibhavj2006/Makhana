const express = require('express');
const {
  updateProfile,
  changePassword,
  addAddress,
  removeAddress,
  toggleWishlist
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.put('/me', updateProfile);
router.put('/me/password', changePassword);
router.post('/me/addresses', addAddress);
router.delete('/me/addresses/:addressId', removeAddress);
router.put('/me/wishlist/:productId', toggleWishlist);

module.exports = router;
