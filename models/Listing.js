const mongoose = require('mongoose');
const softDelete = require('../middleware/softDelete');

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
  marketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Market',
    required: [true, 'Market ID is required'],
    validate: {
      validator: async function(marketId) {
        const Market = mongoose.model('Market');
        const market = await Market.findOne({
          _id: marketId,
          isDeleted: { $ne: true }
        });
        return !!market;
      },
      message: 'Selected market does not exist or is unavailable'
    }
  },

  // Listing type classification
  listingType: {
    type: String,
    enum: ['inventory_based', 'non_inventory'],
    required: [true, 'Listing type is required'],
    default: 'non_inventory'  // MVP: simplified non-inventory approach
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
    harvestDate: {
      type: Date,
      required: false
    },
    expiryDate: {
      type: Date,
      required: false
    },
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
  videos: [{
    url: {
      type: String,
      required: [true, 'Video URL is required']
    },
    thumbnail: {
      type: String,
      required: false
    },
    duration: {
      type: Number,
      required: false,
      max: [10, 'Video duration cannot exceed 10 seconds']
    },
    format: {
      type: String,
      enum: ['mp4', 'webm', 'mov'],
      required: false
    },
    publicId: {
      type: String,
      required: false
    }
  }],

  // Delivery and logistics
  deliveryOptions: {
    delivery: {
      enabled: {
        type: Boolean,
        default: true
      },
      fee: {
        type: Number,
        default: 0,
        min: [0, 'Delivery fee cannot be negative']
      },
      // Quantity-based free delivery (not money-based)
      freeDeliveryMinimumQuantity: {
        type: Number,
        min: [0, 'Free delivery minimum quantity cannot be negative']
      },
      freeDeliveryMinimumUnit: {
        type: String,
        enum: ['kg', 'g', 'piece', 'bunch', 'liter', 'ml']
      },
      estimatedDeliveryTime: {
        type: Number, // hours: 3 for "2-4 hours", 12 for "same day", 24 for "next day"
        required: [true, 'Estimated delivery time is required'],
        min: [0, 'Estimated delivery time cannot be negative']
      }
    }
  },

  // Order quantity limits (in base units from pricing array)
  // REQUIRED when pack-based selling is disabled
  minimumOrderQuantity: {
    type: Number,
    min: [0, 'Minimum order quantity cannot be negative'],
    validate: {
      validator: function(value) {
        const pricing = this.pricing && this.pricing[0];

        // Required when pack-based selling is NOT enabled
        if (!pricing || !pricing.enablePackSelling) {
          if (value === null || value === undefined) {
            return false;
          }
        }

        // If set, must be less than or equal to available quantity
        if (value > 0 && this.availability?.quantityAvailable) {
          return value <= this.availability.quantityAvailable;
        }
        return true;
      },
      message: 'Minimum order quantity is required when not using pack-based selling, and cannot exceed available quantity'
    }
  },
  maximumOrderQuantity: {
    type: Number,
    min: [0, 'Maximum order quantity cannot be negative'],
    validate: {
      validator: function(value) {
        const pricing = this.pricing && this.pricing[0];

        // Required when pack-based selling is NOT enabled
        if (!pricing || !pricing.enablePackSelling) {
          if (value === null || value === undefined) {
            return false;
          }
        }

        // Must be greater than minimum
        if (this.minimumOrderQuantity && value < this.minimumOrderQuantity) {
          return false;
        }

        // Cannot exceed available quantity
        if (this.availability?.quantityAvailable && value > this.availability.quantityAvailable) {
          return false;
        }

        return true;
      },
      message: 'Maximum order quantity is required when not using pack-based selling, must be >= minimum, and <= available quantity'
    }
  },

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

// Validate marketId belongs to vendor's markets array
ListingSchema.pre('save', async function(next) {
  if (this.isModified('marketId') || this.isModified('vendorId')) {
    const Vendor = mongoose.model('Vendor');
    const vendor = await Vendor.findById(this.vendorId);

    if (!vendor) {
      return next(new Error('Vendor not found'));
    }

    const hasMarket = vendor.markets.some(
      m => m.toString() === this.marketId.toString()
    );

    if (!hasMarket) {
      return next(new Error(
        'Market validation failed: Vendor does not operate in the selected market'
      ));
    }
  }
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

// Validate video constraints
ListingSchema.pre('save', function(next) {
  if (this.videos && this.videos.length > 0) {
    // Check maximum 2 videos
    if (this.videos.length > 2) {
      return next(new Error('Maximum 2 videos allowed per listing'));
    }

    // Check duration constraint (10 seconds max)
    const longVideos = this.videos.filter(v => v.duration && v.duration > 10);
    if (longVideos.length > 0) {
      return next(new Error('Videos must be 10 seconds or less'));
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
  const basePrice = pricing.pricePerBaseUnit;

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

// Virtual for market population
ListingSchema.virtual('market', {
  ref: 'Market',
  localField: 'marketId',
  foreignField: '_id',
  justOne: true
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

  // Check simple quantity limits (when NOT using pack-based selling)
  if (!pricing || !pricing.enablePackSelling) {
    // Check minimum order quantity
    if (this.minimumOrderQuantity && requiredQuantity < this.minimumOrderQuantity) {
      return false;
    }

    // Check maximum order quantity
    if (this.maximumOrderQuantity && requiredQuantity > this.maximumOrderQuantity) {
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
    marketId,
    minPrice,
    maxPrice,
    location,
    radius = 10,
    inSeason,
    organic,
    grade,
    division,
    district,
    upazila,
    union,
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

  // Market filter
  if (marketId) {
    query.marketId = marketId;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query['pricing.pricePerBaseUnit'] = {};
    if (minPrice) query['pricing.pricePerBaseUnit'].$gte = minPrice;
    if (maxPrice) query['pricing.pricePerBaseUnit'].$lte = maxPrice;
  }

  // Quality grade filter
  if (grade) {
    query.qualityGrade = grade;
  }

  // Seasonal filter
  if (inSeason !== undefined) {
    query['availability.isInSeason'] = inSeason;
  }

  // Location hierarchy filters (applied after market $lookup/$unwind)
  const locationMatch = {};
  if (division) {
    locationMatch['market.location.division'] = new mongoose.Types.ObjectId(division);
  }
  if (district) {
    locationMatch['market.location.district'] = new mongoose.Types.ObjectId(district);
  }
  if (upazila) {
    locationMatch['market.location.upazila'] = new mongoose.Types.ObjectId(upazila);
  }
  if (union) {
    locationMatch['market.location.union'] = new mongoose.Types.ObjectId(union);
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
    {
      $lookup: {
        from: 'markets',
        localField: 'marketId',
        foreignField: '_id',
        as: 'market'
      }
    },
    { $unwind: '$product' },
    { $unwind: '$vendor' },
    { $unwind: { path: '$market', preserveNullAndEmptyArrays: true } },
    { $match: query },
    // Location hierarchy filter (requires market to be unwound)
    ...(Object.keys(locationMatch).length > 0 ? [{ $match: locationMatch }] : [])
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
ListingSchema.index({ 'pricing.pricePerBaseUnit': 1 });
ListingSchema.index({ qualityGrade: 1 });
ListingSchema.index({ description: 'text' });
ListingSchema.index({ isFlagged: 1, status: 1 });
ListingSchema.index({ isDeleted: 1, status: 1 });
ListingSchema.index({ moderatedBy: 1, lastStatusUpdate: -1 });
ListingSchema.index({ marketId: 1, status: 1 }); // For market-based queries
ListingSchema.index({ marketId: 1, status: 1, isDeleted: 1 }); // For location-filtered queries
ListingSchema.index({ vendorId: 1, marketId: 1, status: 1 }); // For vendor-market listing queries

ListingSchema.plugin(softDelete);

module.exports = mongoose.model('Listing', ListingSchema);