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
    type: String, // Cloudinary URL to category image
    required: [true, 'Category image is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Category image cannot be empty'
    }
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
  
  // Flag system - prevents new references while preserving existing ones
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  adminStatus: {
    type: String,
    enum: ['active', 'disabled', 'deprecated'],
    default: 'active'
  },
  flagReason: {
    type: String,
    maxlength: [500, 'Flag reason cannot exceed 500 characters']
  },
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  flaggedAt: {
    type: Date
  },
  
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  const categories = await this.find({ 
    isActive: true,
    isDeleted: { $ne: true }
  })
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .populate('parentCategory', 'name slug');
    
  return categories;
};

// Method to check if category can be deleted
ProductCategorySchema.methods.canBeDeleted = async function() {
  const Product = require('./Product');
  const Listing = require('./Listing');
  
  const dependencies = {
    products: 0,
    activeListings: 0,
    subcategories: 0,
    canDelete: true,
    blockers: []
  };
  
  // Check for products
  dependencies.products = await Product.countDocuments({
    category: this._id,
    isDeleted: { $ne: true }
  });
  
  // Check for active listings
  const productsInCategory = await Product.find({
    category: this._id,
    isDeleted: { $ne: true }
  }).select('_id');
  
  if (productsInCategory.length > 0) {
    dependencies.activeListings = await Listing.countDocuments({
      productId: { $in: productsInCategory.map(p => p._id) },
      status: { $in: ['active', 'inactive'] },
      isDeleted: { $ne: true }
    });
  }
  
  // Check for subcategories
  dependencies.subcategories = await this.constructor.countDocuments({
    parentCategory: this._id,
    isDeleted: { $ne: true }
  });
  
  // Determine if can delete
  if (dependencies.products > 0) {
    dependencies.canDelete = false;
    dependencies.blockers.push(`${dependencies.products} products are assigned to this category`);
  }
  
  if (dependencies.activeListings > 0) {
    dependencies.canDelete = false;
    dependencies.blockers.push(`${dependencies.activeListings} active listings use products from this category`);
  }
  
  if (dependencies.subcategories > 0) {
    dependencies.canDelete = false;
    dependencies.blockers.push(`${dependencies.subcategories} subcategories exist under this category`);
  }
  
  return dependencies;
};

// Method to toggle availability (flag system)
ProductCategorySchema.methods.toggleAvailability = function(isAvailable, reason, flaggedByUserId) {
  this.isAvailable = isAvailable;
  this.adminStatus = isAvailable ? 'active' : 'disabled';
  
  if (!isAvailable) {
    this.flagReason = reason;
    this.flaggedBy = flaggedByUserId;
    this.flaggedAt = new Date();
  } else {
    this.flagReason = undefined;
    this.flaggedBy = undefined;
    this.flaggedAt = undefined;
  }
  
  this.updatedBy = flaggedByUserId;
};

// Indexes for better query performance
ProductCategorySchema.index({ slug: 1 });
ProductCategorySchema.index({ parentCategory: 1 });
ProductCategorySchema.index({ isActive: 1, level: 1 });
ProductCategorySchema.index({ isAvailable: 1, isDeleted: 1 });
ProductCategorySchema.index({ adminStatus: 1 });
ProductCategorySchema.index({ flaggedBy: 1, flaggedAt: -1 });
ProductCategorySchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('ProductCategory', ProductCategorySchema);