require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const User = require('../models/User');

const products = [
  {
    name: 'Roasted & Salted Makhana',
    slug: 'roasted-salted-makhana',
    tagline: 'The one that started it all',
    description:
      'Hand-picked fox nuts, slow-roasted in small batches with a light hand of rock salt. Nothing hiding in the ingredient list — just makhana, a whisper of ghee, and salt.',
    flavor: 'Roasted & Salted',
    category: 'classic',
    images: ['https://images.unsplash.com/photo-1599490659213-e0b3ecc63e37?w=800'],
    variants: [
      { label: '100g Pouch', weightGrams: 100, price: 199, compareAtPrice: 249, stock: 120, sku: 'MK-RS-100' },
      { label: '250g Pouch', weightGrams: 250, price: 449, compareAtPrice: 549, stock: 80, sku: 'MK-RS-250' }
    ],
    tags: ['bestseller', 'gluten-free', 'vegan'],
    nutrition: { caloriesPer30g: 105, protein: 3, carbs: 19, fat: 1.5, fiber: 2 },
    isFeatured: true
  },
  {
    name: 'Peri Peri Makhana',
    slug: 'peri-peri-makhana',
    tagline: 'For the ones who like it loud',
    description:
      'Our roasted base gets tossed in a peri peri seasoning with a real kick. Tangy, spicy, and dangerously snackable during a movie.',
    flavor: 'Peri Peri',
    category: 'flavored',
    images: ['https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800'],
    variants: [
      { label: '100g Pouch', weightGrams: 100, price: 219, compareAtPrice: 269, stock: 90, sku: 'MK-PP-100' }
    ],
    tags: ['spicy', 'gluten-free'],
    nutrition: { caloriesPer30g: 110, protein: 3, carbs: 19, fat: 2, fiber: 2 },
    isFeatured: true
  },
  {
    name: 'Cheese & Herb Makhana',
    slug: 'cheese-herb-makhana',
    tagline: 'Snack drawer, meet upgrade',
    description:
      'A savory, herby, cheesy coating over our classic roast. The one that disappears first at parties.',
    flavor: 'Cheese & Herb',
    category: 'flavored',
    images: ['https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800'],
    variants: [
      { label: '100g Pouch', weightGrams: 100, price: 219, stock: 75, sku: 'MK-CH-100' }
    ],
    tags: ['gluten-free'],
    nutrition: { caloriesPer30g: 112, protein: 3.2, carbs: 18, fat: 2.5, fiber: 2 },
    isFeatured: true
  },
  {
    name: 'Chocolate Coated Makhana',
    slug: 'chocolate-coated-makhana',
    tagline: 'Crunch meets cocoa',
    description:
      'Roasted fox nuts dipped in real dark chocolate. A dessert-aisle snack with a snack-aisle calorie count.',
    flavor: 'Dark Chocolate',
    category: 'flavored',
    images: ['https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800'],
    variants: [
      { label: '100g Pouch', weightGrams: 100, price: 249, stock: 60, sku: 'MK-CC-100' }
    ],
    tags: ['sweet', 'gluten-free'],
    nutrition: { caloriesPer30g: 130, protein: 3, carbs: 21, fat: 4, fiber: 2 },
    isFeatured: false
  },
  {
    name: 'The Pond Box — Gift Set',
    slug: 'pond-box-gift-set',
    tagline: 'Four flavors, one box, zero guesswork',
    description:
      'Our four signature flavors in a gift-ready box: Roasted & Salted, Peri Peri, Cheese & Herb, and Dark Chocolate. Comes with a card explaining where every seed comes from.',
    flavor: 'Assorted',
    category: 'gift-box',
    images: ['https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=800'],
    variants: [
      { label: 'Gift Box (4 x 100g)', weightGrams: 400, price: 799, compareAtPrice: 899, stock: 40, sku: 'MK-GIFT-400' }
    ],
    tags: ['gift', 'bestseller'],
    nutrition: { caloriesPer30g: 115, protein: 3, carbs: 19, fat: 2, fiber: 2 },
    isFeatured: true
  },
  {
    name: 'Bulk Roasted Makhana (Unsalted)',
    slug: 'bulk-roasted-makhana-unsalted',
    tagline: 'For the meal-preppers and the smoothie-bowl toppers',
    description:
      'Plain roasted, no salt, no oil — just the puff. Great for home cooking, kheer, or your own flavor experiments.',
    flavor: 'Plain Roasted',
    category: 'bulk',
    images: ['https://images.unsplash.com/photo-1615486511340-08f5f6d4b9a7?w=800'],
    variants: [
      { label: '1kg Bag', weightGrams: 1000, price: 899, stock: 30, sku: 'MK-BULK-1000' }
    ],
    tags: ['unsalted', 'bulk', 'gluten-free'],
    nutrition: { caloriesPer30g: 95, protein: 3, carbs: 18, fat: 0.5, fiber: 2 },
    isFeatured: false
  }
];

const run = async () => {
  await connectDB();

  const destroy = process.argv.includes('-d');

  if (destroy) {
    await Product.deleteMany();
    console.log('All products removed.');
    process.exit(0);
  }

  await Product.deleteMany();
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products.`);

  const adminEmail = 'admin@makhanashop.test';
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: 'Shop Admin',
      email: adminEmail,
      password: 'ChangeMe123!',
      role: 'admin'
    });
    console.log(`Admin user created: ${adminEmail} / ChangeMe123!  (change this password immediately)`);
  }

  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
