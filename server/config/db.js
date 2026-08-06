const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

// Reusable helper for anything that needs multi-step atomicity
// (e.g. order creation: check stock -> decrement -> create order).
//
// Usage:
//   const result = await withTransaction(async (session) => {
//     const product = await Product.findById(id).session(session);
//     product.stock -= 1;
//     await product.save({ session });
//     const order = await Order.create([{ ... }], { session });
//     return order[0];
//   });
//
// If the callback throws at any point, all writes made inside it are rolled back.
// Requires a replica set (MongoDB Atlas gives you this by default, even on free tier).
const withTransaction = async (callback) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    session.endSession();
  }
};

module.exports = { connectDB, withTransaction };