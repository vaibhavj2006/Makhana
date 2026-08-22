const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getAllOrders,
  updateOrderStatus,
  schedulePickup,
  getShippingLabel,
  cancelShipment
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/mine', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelMyOrder);

// Admin: GET /?status=pending  and/or  ?paymentStatus=failed  to filter
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);

// Admin: Shiprocket actions
router.post('/:id/schedule-pickup', protect, adminOnly, schedulePickup);
router.get('/:id/label', protect, adminOnly, getShippingLabel);
router.put('/:id/cancel-shipment', protect, adminOnly, cancelShipment);

module.exports = router;