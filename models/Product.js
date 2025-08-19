const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add product name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add product description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory',
    required: [true, 'Please select a category']
  },
  // Product specifications
  variety: {
    type: String,
    trim: true
  },
  origin: {
    type: String,
    trim: true
  },
  seasonality: [{
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter', 'year-round']
  }],
  shelfLife: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks', 'months']
    }
  },
  storageRequirements: {
    temperature: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    humidity: {
      min: Number,
      max: Number
    },
    conditions: [String] // e.g., 'refrigerated', 'dry', 'ventilated'
  },
  // Nutritional information
  nutritionalInfo: {
    calories: Number, // per 100g
    protein: Number,  // grams per 100g
    carbs: Number,    // grams per 100g
    fat: Number,      // grams per 100g
    fiber: Number,    // grams per 100g
    vitamins: [{
      name: String,
      amount: String
    }],
    minerals: [{
      name: String,
      amount: String
    }]
  },
  // Standard units and packaging
  standardUnits: [{
    name: {
      type: String,
      required: true
    }, // e.g., 'kg', 'piece', 'bunch', 'box'
    abbreviation: String, // e.g., 'kg', 'pc', 'bch'
    baseUnit: {
      type: Boolean,
      default: false
    },
    conversionRate: {
      type: Number,
      default: 1
    } // conversion to base unit
  }],
  // Quality grades
  qualityGrades: [{
    name: {
      type: String,
      required: true
    }, // e.g., 'Premium', 'Grade A', 'Standard'
    description: String,
    priceMultiplier: {
      type: Number,
      default: 1,
      min: [0.1, 'Price multiplier must be at least 0.1']
    }
  }],
  // Images
  images: {
    type: [{
      url: {
        type: String,
        required: [true, 'Image URL is required']
      },
      alt: {
        type: String,
        default: ''
      },
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one product image is required'
    },
    required: [true, 'Product images are required']
  },
  // SEO and search
  tags: [String],
  searchKeywords: [String],
  metaTitle: String,
  metaDescription: String,
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isSeasonal: {
    type: Boolean,
    default: false
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  isLocallySourced: {
    type: Boolean,
    default: false
  },
  // Admin status
  adminStatus: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNotes: String,
  statusUpdatedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from name before saving
ProductSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-');
  }
  next();
});

// Ensure only one primary image
ProductSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length > 1) {
      // Keep only the first primary image
      this.images.forEach((img, index) => {
        if (index > 0 && img.isPrimary) {
          img.isPrimary = false;
        }
      });
    } else if (primaryImages.length === 0 && this.images.length > 0) {
      // Set first image as primary if none is set
      this.images[0].isPrimary = true;
    }
  }
  next();
});

// Virtual populate for listings
ProductSchema.virtual('listings', {
  ref: 'Listing',
  localField: '_id',
  foreignField: 'productId',
  justOne: false
});

// Virtual for primary image
ProductSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    const primary = this.images.find(img => img.isPrimary);
    return primary || this.images[0];
  }
  return null;
});

// Static method to get products by category
ProductSchema.statics.getByCategory = async function(categoryId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc',
    isActive = true
  } = options;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  return await this.find({ category: categoryId, isActive })
    .populate('category', 'name slug')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Indexes for better query performance
ProductSchema.index({ slug: 1 });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ isActive: 1, isSeasonal: 1, isOrganic: 1 });
ProductSchema.index({ adminStatus: 1, isDeleted: 1 });
ProductSchema.index({ createdBy: 1, adminStatus: 1 });

module.exports = mongoose.model('Product', ProductSchema);