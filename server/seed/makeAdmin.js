// Usage: node seed/makeAdmin.js youremail@example.com
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: node seed/makeAdmin.js youremail@example.com');
    process.exit(1);
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: 'admin' },
    { new: true }
  );

  if (!user) {
    console.log(`No account found with email: ${email}`);
    console.log('Sign up on the site first with that email, then run this script again.');
  } else {
    console.log(`${user.email} is now an admin. Log out and back in on the site to see the Admin link.`);
  }

  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
