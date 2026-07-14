const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

// @route GET /api/products
// Supports: ?search=&category=&flavor=&sort=price_asc|price_desc|rating|newest&page=&limit=
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, flavor, sort, page = 1, limit = 12 } = req.query;

  const query = { isActive: true };
  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (flavor) query.flavor = flavor;

  let sortStage = { createdAt: -1 };
  if (sort === 'rating') sortStage = { ratingAvg: -1 };
  if (sort === 'newest') sortStage = { createdAt: -1 };
  // price sort handled client-side per-variant since price lives on variants,
  // but we approximate using the first variant's price for server-side sort.
  if (sort === 'price_asc') sortStage = { 'variants.0.price': 1 };
  if (sort === 'price_desc') sortStage = { 'variants.0.price': -1 };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 12, 50);

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort(sortStage)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(query)
  ]);

  res.json({
    success: true,
    products,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    total
  });
});

// @route GET /api/products/featured
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true }).limit(6);
  res.json({ success: true, products });
});

// @route GET /api/products/:slug
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate(
    'reviews.user',
    'name'
  );
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }
  res.json({ success: true, product });
});

// @route POST /api/products/:slug/reviews  (auth required)
const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5.');
  }

  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  const alreadyReviewed = product.reviews.some((r) => r.user.toString() === req.user._id.toString());
  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You already reviewed this product.');
  }

  product.reviews.push({ user: req.user._id, name: req.user.name, rating, comment });
  product.recomputeRating();
  await product.save();

  res.status(201).json({ success: true, message: 'Review added.', product });
});

// ----- Admin only -----

// @route GET /api/products/admin/all
// Returns every product (including inactive ones) for the admin dashboard.
const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json({ success: true, products });
});

// @route POST /api/products
const createProduct = asyncHandler(async (req, res) => {

  const product = await Product.create(req.body);
  res.status(201).json({ success: true, product });
});

// @route PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }
  res.json({ success: true, product });
});

// @route DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }
  res.json({ success: true, message: 'Product deleted.' });
});

module.exports = {
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
  addReview,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct
};
