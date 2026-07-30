const express = require('express');
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getAddresses);
router.post('/', protect, addAddress);
router.put('/:addressId', protect, updateAddress);
router.delete('/:addressId', protect, deleteAddress);
router.put('/:addressId/default', protect, setDefaultAddress);

module.exports = router;
