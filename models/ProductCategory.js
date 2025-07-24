const mongoose = require('mongoose');

const ProductCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  image: {
    type: String, // File path to category image
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: [0, 'Level cannot be negative'],
    max: [3, 'Maximum nesting level is 3']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  // SEO fields
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from name before saving
ProductCategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-');
  }
  next();
});

// Virtual populate for subcategories
ProductCategorySchema.virtual('subcategories', {
  ref: 'ProductCategory',
  localField: '_id',
  foreignField: 'parentCategory',
  justOne: false
});

// Virtual populate for products
ProductCategorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  justOne: false
});

// Method to get category hierarchy path
ProductCategorySchema.methods.getHierarchyPath = async function() {
  const path = [];
  let currentCategory = this;
  
  while (currentCategory) {
    path.unshift({
      _id: currentCategory._id,
      name: currentCategory.name,
      slug: currentCategory.slug
    });
    
    if (currentCategory.parentCategory) {
      currentCategory = await this.constructor.findById(currentCategory.parentCategory);
    } else {
      break;
    }
  }
  
  return path;
};

// Static method to get all categories with hierarchy
ProductCategorySchema.statics.getHierarchy = async function() {
  const categories = await this.find({ isActive: true })
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .populate('parentCategory', 'name slug');
    
  return categories;
};

// Indexes for better query performance
ProductCategorySchema.index({ slug: 1 });
ProductCategorySchema.index({ parentCategory: 1 });
ProductCategorySchema.index({ isActive: 1, level: 1 });
ProductCategorySchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('ProductCategory', ProductCategorySchema);