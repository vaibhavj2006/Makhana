const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "100g Pouch", "500g Tin"
    weightGrams: { type: Number, required: true },
    price: { type: Number, required: true }, // in INR
    compareAtPrice: { type: Number }, // optional strike-through price
    stock: { type: Number, required: true, default: 0 },
    sku: { type: String, required: true, unique: true }
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    tagline: { type: String, trim: true, maxlength: 140 },
    description: { type: String, required: true },
    flavor: { type: String, required: true }, // e.g. "Roasted & Salted", "Peri Peri"
    category: { type: String, enum: ['classic', 'flavored', 'gift-box', 'bulk'], default: 'classic' },
    images: [{ type: String, required: true }], // URLs
    variants: { type: [variantSchema], validate: (v) => v.length > 0 },
    tags: [{ type: String }],
    nutrition: {
      caloriesPer30g: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number
    },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    reviews: [reviewSchema]
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', tagline: 'text', description: 'text', tags: 'text' });

productSchema.methods.recomputeRating = function recomputeRating() {
  if (!this.reviews.length) {
    this.ratingAvg = 0;
    this.ratingCount = 0;
    return;
  }
  const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
  this.ratingAvg = Math.round((total / this.reviews.length) * 10) / 10;
  this.ratingCount = this.reviews.length;
};

module.exports = mongoose.model('Product', productSchema);
