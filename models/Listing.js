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

// Sync with inventory when availability changes
ListingSchema.pre('save', async function(next) {
  if (this.isModified('availability.quantityAvailable') && this.inventoryId) {
    try {
      const VendorInventory = require('./VendorInventory');
      const inventory = await VendorInventory.findById(this.inventoryId);
      
      if (inventory) {
        // Check if we have enough stock in inventory
        if (this.availability.quantityAvailable > inventory.currentStock.totalQuantity) {
          const error = new Error(`Cannot list ${this.availability.quantityAvailable} ${this.availability.unit}. Only ${inventory.currentStock.totalQuantity} available in inventory.`);
          error.name = 'InsufficientInventoryError';
          return next(error);
        }
      }
    } catch (error) {
      return next(error);
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

// Method to record a sale and update inventory
ListingSchema.methods.recordSale = async function(quantitySold, salePrice, orderId) {
  try {
    const VendorInventory = require('./VendorInventory');
    const inventory = await VendorInventory.findById(this.inventoryId);
    
    if (!inventory) {
      throw new Error('Inventory record not found for this listing');
    }

    // Check if we have enough stock
    if (quantitySold > this.availability.quantityAvailable) {
      throw new Error('Cannot sell more than available quantity in listing');
    }

    // Update listing statistics
    this.totalQuantitySold += quantitySold;
    this.totalOrders += 1;
    this.availability.quantityAvailable -= quantitySold;

    // Update profit analytics
    const saleRevenue = salePrice * quantitySold;
    this.profitAnalytics.totalRevenue += saleRevenue;

    // Consume stock from inventory (this will update cost and profit calculations)
    await inventory.consumeStock(quantitySold, salePrice, orderId);

    // Update cost analytics from inventory
    this.profitAnalytics.totalCost = inventory.analytics.totalPurchaseValue - 
      (inventory.currentStock.totalQuantity * inventory.currentStock.averagePurchasePrice);

    // Save the listing
    await this.save();

    return {
      success: true,
      message: 'Sale recorded successfully',
      updatedListing: this,
      updatedInventory: inventory
    };
  } catch (error) {
    throw error;
  }
};

// Method to sync listing quantity with inventory
ListingSchema.methods.syncWithInventory = async function() {
  try {
    const VendorInventory = require('./VendorInventory');
    const inventory = await VendorInventory.findById(this.inventoryId);
    
    if (!inventory) {
      throw new Error('Inventory record not found for this listing');
    }

    // Update availability to match inventory (or keep current if less than inventory)
    const maxAvailable = inventory.currentStock.totalQuantity;
    if (this.availability.quantityAvailable > maxAvailable) {
      this.availability.quantityAvailable = maxAvailable;
    }

    // Update unit to match inventory
    this.availability.unit = inventory.currentStock.unit;

    await this.save();
    return this;
  } catch (error) {
    throw error;
  }
};

// Method to check if listing needs inventory attention
ListingSchema.methods.checkInventoryHealth = async function() {
  try {
    const VendorInventory = require('./VendorInventory');
    const inventory = await VendorInventory.findById(this.inventoryId);
    
    if (!inventory) {
      return { status: 'error', message: 'Inventory record not found' };
    }

    const alerts = [];

    // Check if listing quantity exceeds inventory
    if (this.availability.quantityAvailable > inventory.currentStock.totalQuantity) {
      alerts.push({
        type: 'overselling_risk',
        severity: 'high',
        message: `Listing quantity (${this.availability.quantityAvailable}) exceeds inventory stock (${inventory.currentStock.totalQuantity})`
      });
    }

    // Check if inventory is running low
    if (inventory.status === 'low_stock' || inventory.status === 'out_of_stock') {
      alerts.push({
        type: 'low_inventory',
        severity: inventory.status === 'out_of_stock' ? 'critical' : 'medium',
        message: `Inventory status: ${inventory.status}`
      });
    }

    // Check profit margins
    const currentPrice = this.pricing[0]?.pricePerUnit || 0;
    const averageCost = inventory.currentStock.averagePurchasePrice || 0;
    const profitMargin = averageCost > 0 ? ((currentPrice - averageCost) / currentPrice) * 100 : 0;

    if (profitMargin < 10) { // Less than 10% profit margin
      alerts.push({
        type: 'low_profit_margin',
        severity: profitMargin < 0 ? 'critical' : 'medium',
        message: `Low profit margin: ${profitMargin.toFixed(2)}%`
      });
    }

    return {
      status: alerts.length > 0 ? 'attention_needed' : 'healthy',
      alerts,
      inventoryStatus: inventory.status,
      profitMargin: profitMargin.toFixed(2),
      stockLevel: inventory.currentStock.totalQuantity
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
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