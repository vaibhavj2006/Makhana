const cron = require('node-cron');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');

/**
 * Finds online-payment orders whose paymentDeadline has passed and payment
 * never came through, restores the stock that was reserved for them at
 * order-creation time, and marks them cancelled/expired.
 *
 * Runs standalone (not via Render's paid Cron Jobs feature) so it works on
 * the free tier — scheduled with node-cron inside the same process as the
 * main Express server.
 */
const releaseExpiredOrders = async () => {
  const now = new Date();

  const expiredOrders = await Order.find({
    paymentStatus: 'pending',
    status: 'pending',
    paymentMethod: { $in: ['upi', 'card'] },
    paymentDeadline: { $lte: now }
  });

  if (!expiredOrders.length) return;

  console.log(`[releaseExpiredOrders] Found ${expiredOrders.length} expired unpaid order(s). Releasing stock…`);

  for (const order of expiredOrders) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) continue; // product may have been deleted since — nothing to restore
          const variant = product.variants.find((v) => v.sku === item.sku);
          if (variant) {
            variant.stock += item.quantity;
            await product.save({ session });
          }
        }

        order.status = 'cancelled';
        order.paymentStatus = 'expired';
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({ status: 'cancelled', changedAt: new Date() });
        await order.save({ session });
      });

      console.log(`[releaseExpiredOrders] Released stock and cancelled order ${order._id}`);
    } catch (err) {
      console.error(`[releaseExpiredOrders] Failed to release order ${order._id}:`, err.message);
    } finally {
      session.endSession();
    }
  }
};

/**
 * Call this once from server.js after connectDB() to schedule the job.
 * Runs every minute — cheap query (indexed fields), and orders only ever
 * sit in "expired-but-unprocessed" state for at most ~1 minute.
 */
const scheduleReleaseExpiredOrders = () => {
  cron.schedule('* * * * *', () => {
    releaseExpiredOrders().catch((err) => {
      console.error('[releaseExpiredOrders] Unexpected error:', err);
    });
  });
  console.log('[releaseExpiredOrders] Scheduled — running every minute.');
};

module.exports = { releaseExpiredOrders, scheduleReleaseExpiredOrders };
