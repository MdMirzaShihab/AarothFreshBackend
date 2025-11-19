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
  
  // Listing type classification
  listingType: {
    type: String,
    enum: ['inventory_based', 'non_inventory'],
    required: [true, 'Listing type is required'],
    default: 'inventory_based'
  },

  // Inventory relationship - optional for non-inventory listings
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorInventory',
    required: false // Made optional to support non-inventory listings
  },

  // Flag to clearly indicate if this listing affects inventory tracking
  isInventoryTracked: {
    type: Boolean,
    required: [true, 'Inventory tracking flag is required'],
    default: function() {
      return this.listingType === 'inventory_based';
    }
  },

  // Pricing information - Pack-based selling support
  pricing: [{
    // Base unit (what the product is measured in)
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: ['kg', 'g', 'piece', 'bunch', 'liter', 'ml']
    },

    // Price per base unit (e.g., price per kg)
    pricePerBaseUnit: {
      type: Number,
      required: [true, 'Price per base unit is required'],
      min: [0.01, 'Price must be greater than 0']
    },

    // Pack-based selling configuration
    enablePackSelling: {
      type: Boolean,
      default: false
    },

    // How many base units in one pack (e.g., 60 kg per pack)
    packSize: {
      type: Number,
      min: [0.01, 'Pack size must be greater than 0'],
      validate: {
        validator: function(value) {
          // packSize required when pack selling is enabled
          if (this.enablePackSelling && !value) {
            return false;
          }
          return true;
        },
        message: 'Pack size is required when pack selling is enabled'
      }
    },

    // Pack unit display name (optional)
    packUnit: {
      type: String,
      enum: ['pack', 'bundle', 'box', 'crate', 'bag'],
      default: 'pack'
    },

    // Minimum order in number of packs (when pack selling enabled)
    minimumPacks: {
      type: Number,
      default: 1,
      min: [1, 'Minimum packs must be at least 1'],
      validate: {
        validator: function(value) {
          // Must be whole number
          return Number.isInteger(value);
        },
        message: 'Minimum packs must be a whole number'
      }
    },

    // Maximum order in number of packs (when pack selling enabled)
    maximumPacks: {
      type: Number,
      validate: {
        validator: function(value) {
          if (!value) return true; // Optional field
          // Must be greater than minimum
          if (value < this.minimumPacks) return false;
          // Must be whole number
          return Number.isInteger(value);
        },
        message: 'Maximum packs must be a whole number and greater than minimum packs'
      }
    },

    // Legacy fields for backward compatibility (deprecated)
    pricePerUnit: {
      type: Number,
      // Will be removed in future version
    },
    minimumQuantity: {
      type: Number,
      // Will be removed in future version
    },
    maximumQuantity: {
      type: Number,
      // Will be removed in future version
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
  
  // Admin moderation fields
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderationNotes: String,
  lastStatusUpdate: Date,
  
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
  
  // Profit and performance tracking
  profitAnalytics: {
    totalRevenue: {
      type: Number,
      default: 0,
      min: [0, 'Total revenue cannot be negative']
    },
    totalCost: {
      type: Number,
      default: 0,
      min: [0, 'Total cost cannot be negative']
    },
    grossProfit: {
      type: Number,
      default: 0
    },
    profitMargin: {
      type: Number,
      default: 0,
      min: [0, 'Profit margin cannot be negative']
    },
    averageProfitPerUnit: {
      type: Number,
      default: 0
    }
  },
  rating: {
    average: {
      type: Number,
      min: [0, 'Rating must be at least 0'],
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

// Validate listing type consistency
ListingSchema.pre('save', function(next) {
  // Ensure inventory_based listings have inventoryId
  if (this.listingType === 'inventory_based' && !this.inventoryId) {
    return next(new Error('Inventory-based listings must have an inventoryId'));
  }

  // Set isInventoryTracked based on listingType
  this.isInventoryTracked = this.listingType === 'inventory_based';

  next();
});

// Validate pack-based selling configuration
ListingSchema.pre('save', function(next) {
  const pricing = this.pricing && this.pricing[0];

  if (!pricing) {
    return next();
  }

  // If pack selling is enabled, validate required fields
  if (pricing.enablePackSelling) {
    if (!pricing.packSize || pricing.packSize <= 0) {
      return next(new Error('Pack size must be greater than 0 when pack selling is enabled'));
    }

    // Ensure minimum packs is a whole number
    if (!Number.isInteger(pricing.minimumPacks)) {
      return next(new Error('Minimum packs must be a whole number'));
    }

    // Ensure maximum packs (if set) is a whole number and >= minimum
    if (pricing.maximumPacks) {
      if (!Number.isInteger(pricing.maximumPacks)) {
        return next(new Error('Maximum packs must be a whole number'));
      }
      if (pricing.maximumPacks < pricing.minimumPacks) {
        return next(new Error('Maximum packs must be greater than or equal to minimum packs'));
      }
    }

    // Validate inventory has enough for at least minimum packs
    const minRequiredInventory = pricing.packSize * pricing.minimumPacks;
    if (this.availability.quantityAvailable < minRequiredInventory) {
      return next(new Error(
        `Insufficient inventory. Need at least ${minRequiredInventory} ${pricing.unit} ` +
        `for ${pricing.minimumPacks} pack(s) of ${pricing.packSize} ${pricing.unit} each`
      ));
    }
  }

  next();
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

// Auto-update status based on availability (including pack-based selling)
ListingSchema.pre('save', function(next) {
  const pricing = this.pricing && this.pricing[0];

  // For pack-based selling, check if inventory is sufficient for at least 1 pack
  if (pricing && pricing.enablePackSelling && pricing.packSize) {
    if (this.availability.quantityAvailable < pricing.packSize && this.status === 'active') {
      this.status = 'out_of_stock';
    } else if (this.availability.quantityAvailable >= pricing.packSize && this.status === 'out_of_stock') {
      this.status = 'active';
    }
  } else {
    // Standard behavior for non-pack listings
    if (this.availability.quantityAvailable === 0 && this.status === 'active') {
      this.status = 'out_of_stock';
    } else if (this.availability.quantityAvailable > 0 && this.status === 'out_of_stock') {
      this.status = 'active';
    }
  }

  next();
});

// Update profit analytics when sales occur
ListingSchema.pre('save', function(next) {
  if (this.isModified('totalQuantitySold') || this.isModified('profitAnalytics.totalRevenue')) {
    // Calculate gross profit
    this.profitAnalytics.grossProfit = this.profitAnalytics.totalRevenue - this.profitAnalytics.totalCost;
    
    // Calculate profit margin percentage
    if (this.profitAnalytics.totalRevenue > 0) {
      this.profitAnalytics.profitMargin = (this.profitAnalytics.grossProfit / this.profitAnalytics.totalRevenue) * 100;
    }
    
    // Calculate average profit per unit
    if (this.totalQuantitySold > 0) {
      this.profitAnalytics.averageProfitPerUnit = this.profitAnalytics.grossProfit / this.totalQuantitySold;
    }
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

// Virtual for price per pack (calculated from base unit price * pack size)
ListingSchema.virtual('pricePerPack').get(function() {
  if (!this.pricing || this.pricing.length === 0) return null;

  const pricing = this.pricing[0];
  if (!pricing.enablePackSelling || !pricing.packSize) {
    return null; // Not using pack-based selling
  }

  return pricing.pricePerBaseUnit * pricing.packSize;
});

// Virtual for effective price (considering discounts)
ListingSchema.virtual('effectivePrice').get(function() {
  if (!this.pricing || this.pricing.length === 0) return null;

  const pricing = this.pricing[0];
  const basePrice = pricing.pricePerBaseUnit || pricing.pricePerUnit; // Support legacy field

  if (this.discount && this.discount.validUntil > new Date()) {
    if (this.discount.type === 'percentage') {
      return basePrice * (1 - this.discount.value / 100);
    } else if (this.discount.type === 'fixed') {
      return Math.max(0, basePrice - this.discount.value);
    }
  }

  return basePrice;
});

// Virtual for effective pack price (considering discounts)
ListingSchema.virtual('effectivePackPrice').get(function() {
  if (!this.pricing || this.pricing.length === 0) return null;

  const pricing = this.pricing[0];
  if (!pricing.enablePackSelling || !pricing.packSize) {
    return null;
  }

  const effectiveBasePrice = this.effectivePrice;
  return effectiveBasePrice * pricing.packSize;
});

// Method to check if listing is available for order
ListingSchema.methods.isAvailableForOrder = function(quantity = 1, isPacks = false) {
  const pricing = this.pricing && this.pricing[0];

  // Convert packs to base units if pack-based selling
  let requiredQuantity = quantity;
  if (pricing && pricing.enablePackSelling && isPacks) {
    requiredQuantity = quantity * pricing.packSize;
  }

  // For pack-based selling, validate quantity is in pack multiples
  if (pricing && pricing.enablePackSelling && !isPacks) {
    const packs = quantity / pricing.packSize;
    if (!Number.isInteger(packs)) {
      return false; // Quantity must be a multiple of pack size
    }

    // Check min/max pack constraints
    if (pricing.minimumPacks && packs < pricing.minimumPacks) {
      return false;
    }
    if (pricing.maximumPacks && packs > pricing.maximumPacks) {
      return false;
    }
  }

  return (
    this.status === 'active' &&
    this.availability.quantityAvailable >= requiredQuantity &&
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

  // Convert string parameters to numbers
  const numericPage = parseInt(page) || 1;
  const numericLimit = parseInt(limit) || 20;
  const numericRadius = parseInt(radius) || 10;

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

  const skip = (numericPage - 1) * numericLimit;

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
        maxDistance: numericRadius * 1000, // Convert km to meters
        spherical: true
      }
    });
  }

  aggregationPipeline.push(
    { $sort: sort },
    { $skip: skip },
    { $limit: numericLimit }
  );

  return await this.aggregate(aggregationPipeline);
};

// Indexes for better query performance
ListingSchema.index({ vendorId: 1, status: 1 });
ListingSchema.index({ productId: 1, status: 1 });
ListingSchema.index({ inventoryId: 1 });
ListingSchema.index({ status: 1, featured: 1, createdAt: -1 });
ListingSchema.index({ 'pricing.pricePerUnit': 1 });
ListingSchema.index({ qualityGrade: 1 });
ListingSchema.index({ description: 'text' });
ListingSchema.index({ isFlagged: 1, status: 1 });
ListingSchema.index({ 'profitAnalytics.profitMargin': -1 }); // For profit analytics queries
ListingSchema.index({ isDeleted: 1, status: 1 });
ListingSchema.index({ moderatedBy: 1, lastStatusUpdate: -1 });

module.exports = mongoose.model('Listing', ListingSchema);