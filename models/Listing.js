const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor ID is required']
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },

  // Pricing information
  pricing: [{
    unit: {
      type: String,
      required: [true, 'Unit is required']
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Price per unit is required'],
      min: [0, 'Price cannot be negative']
    },
    minimumQuantity: {
      type: Number,
      default: 1,
      min: [1, 'Minimum quantity must be at least 1']
    },
    maximumQuantity: {
      type: Number,
      validate: {
        validator: function(value) {
          return !value || value >= this.minimumQuantity;
        },
        message: 'Maximum quantity must be greater than minimum quantity'
      }
    }
  }],

  // Quality and grade
  qualityGrade: {
    type: String,
    required: [true, 'Quality grade is required']
  },

  // Availability
  availability: {
    quantityAvailable: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Available quantity cannot be negative']
    },
    unit: {
      type: String,
      required: [true, 'Availability unit is required']
    },
    harvestDate: Date,
    expiryDate: Date,
    isInSeason: {
      type: Boolean,
      default: true
    }
  },

  // Listing specific details
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Delivery and logistics
  deliveryOptions: {
    selfPickup: {
      enabled: {
        type: Boolean,
        default: true
      },
      address: String,
      instructions: String
    },
    delivery: {
      enabled: {
        type: Boolean,
        default: false
      },
      radius: Number, // in kilometers
      fee: Number,
      freeDeliveryMinimum: Number,
      estimatedTime: String // e.g., "2-4 hours"
    }
  },

  // Order requirements
  minimumOrderValue: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order value cannot be negative']
  },
  leadTime: {
    type: Number,
    default: 0,
    min: [0, 'Lead time cannot be negative']
  }, // hours needed before delivery/pickup


  // Special offers
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
    },
    value: {
      type: Number,
      min: [0, 'Discount value cannot be negative']
    },
    validUntil: Date,
    minimumQuantity: Number
  },


  // Certifications
  certifications: [{
    name: String, // e.g., 'Organic', 'Fair Trade', 'Non-GMO'
    issuedBy: String,
    validUntil: Date,
    certificateNumber: String
  }],


  // Status and visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock', 'discontinued'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },


  // Statistics
  views: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalQuantitySold: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ensure only one primary image
ListingSchema.pre('save', function(next) {
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

// Auto-update status based on availability
ListingSchema.pre('save', function(next) {
  if (this.availability.quantityAvailable === 0 && this.status === 'active') {
    this.status = 'out_of_stock';
  } else if (this.availability.quantityAvailable > 0 && this.status === 'out_of_stock') {
    this.status = 'active';
  }
  next();
});

// Virtual for primary image
ListingSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    const primary = this.images.find(img => img.isPrimary);
    return primary || this.images[0];
  }
  return null;
});

// Virtual for effective price (considering discounts)
ListingSchema.virtual('effectivePrice').get(function() {
  if (!this.pricing || this.pricing.length === 0) return null;
  
  const basePrice = this.pricing[0].pricePerUnit;
  
  if (this.discount && this.discount.validUntil > new Date()) {
    if (this.discount.type === 'percentage') {
      return basePrice * (1 - this.discount.value / 100);
    } else if (this.discount.type === 'fixed') {
      return Math.max(0, basePrice - this.discount.value);
    }
  }
  
  return basePrice;
});

// Method to check if listing is available for order
ListingSchema.methods.isAvailableForOrder = function(quantity = 1) {
  return (
    this.status === 'active' &&
    this.availability.quantityAvailable >= quantity &&
    (!this.availability.expiryDate || this.availability.expiryDate > new Date())
  );
};

// Static method for advanced search
ListingSchema.statics.searchListings = async function(filters = {}) {
  const {
    keyword,
    category,
    vendorId,
    minPrice,
    maxPrice,
    location,
    radius = 10,
    inSeason,
    organic,
    grade,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20
  } = filters;

  let query = { status: 'active' };
  let sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Text search
  if (keyword) {
    query.$text = { $search: keyword };
    sort = { score: { $meta: 'textScore' }, ...sort };
  }

  // Category filter
  if (category) {
    query['productId.category'] = category;
  }

  // Vendor filter
  if (vendorId) {
    query.vendorId = vendorId;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query['pricing.pricePerUnit'] = {};
    if (minPrice) query['pricing.pricePerUnit'].$gte = minPrice;
    if (maxPrice) query['pricing.pricePerUnit'].$lte = maxPrice;
  }

  // Quality grade filter
  if (grade) {
    query.qualityGrade = grade;
  }

  // Seasonal filter
  if (inSeason !== undefined) {
    query['availability.isInSeason'] = inSeason;
  }

  const skip = (page - 1) * limit;

  let aggregationPipeline = [
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $lookup: {
        from: 'vendors',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $unwind: '$product' },
    { $unwind: '$vendor' },
    { $match: query }
  ];

  // Location-based filtering
  if (location && location.coordinates) {
    aggregationPipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: location.coordinates
        },
        distanceField: 'distance',
        maxDistance: radius * 1000, // Convert km to meters
        spherical: true
      }
    });
  }

  aggregationPipeline.push(
    { $sort: sort },
    { $skip: skip },
    { $limit: limit }
  );

  return await this.aggregate(aggregationPipeline);
};

// Indexes for better query performance
ListingSchema.index({ vendorId: 1, status: 1 });
ListingSchema.index({ productId: 1, status: 1 });
ListingSchema.index({ status: 1, featured: 1, createdAt: -1 });
ListingSchema.index({ 'pricing.pricePerUnit': 1 });
ListingSchema.index({ qualityGrade: 1 });
ListingSchema.index({ description: 'text' });

module.exports = mongoose.model('Listing', ListingSchema);