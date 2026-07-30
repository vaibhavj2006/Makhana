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

// Get all user addresses & Add a new address
router.get('/', protect, getAddresses);
router.post('/', protect, addAddress);

// Update address details (supports PUT and PATCH)
router.put('/:addressId', protect, updateAddress);
router.patch('/:addressId', protect, updateAddress);

// Delete an address
router.delete('/:addressId', protect, deleteAddress);

// Set default address (supports PUT and PATCH)
router.put('/:addressId/default', protect, setDefaultAddress);
router.patch('/:addressId/default', protect, setDefaultAddress);

module.exports = router;