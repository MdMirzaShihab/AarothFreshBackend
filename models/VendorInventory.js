const mongoose = require('mongoose');

const VendorInventorySchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor ID is required'],
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    index: true
  },

  // Purchase Information
  purchases: [{
    batchId: {
      type: String,
      required: true,
      default: function() {
        return `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now
    },
    supplier: {
      name: String,
      contact: String,
      address: String
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative']
    },
    purchasedQuantity: {
      type: Number,
      required: [true, 'Purchased quantity is required'],
      min: [1, 'Purchased quantity must be at least 1']
    },
    unit: {
      type: String,
      required: [true, 'Unit is required']
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: [0, 'Remaining quantity cannot be negative']
    },
    // Quality and expiry tracking
    qualityGrade: {
      type: String,
      required: [true, 'Quality grade is required']
    },
    harvestDate: Date,
    expiryDate: Date,
    notes: String,
    
    // Cost breakdown
    transportationCost: {
      type: Number,
      default: 0,
      min: [0, 'Transportation cost cannot be negative']
    },
    storageCost: {
      type: Number,
      default: 0,
      min: [0, 'Storage cost cannot be negative']
    },
    otherCosts: {
      type: Number,
      default: 0,
      min: [0, 'Other costs cannot be negative']
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ['active', 'sold_out', 'expired', 'damaged'],
      default: 'active'
    }
  }],

  // Current Stock Summary
  currentStock: {
    totalQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Current stock cannot be negative']
    },
    unit: {
      type: String,
      required: [true, 'Stock unit is required']
    },
    averagePurchasePrice: {
      type: Number,
      default: 0,
      min: [0, 'Average purchase price cannot be negative']
    },
    totalValue: {
      type: Number,
      default: 0,
      min: [0, 'Total value cannot be negative']
    }
  },

  // Inventory Management Settings
  inventorySettings: {
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level is required'],
      default: 10,
      min: [0, 'Reorder level cannot be negative']
    },
    maxStockLevel: {
      type: Number,
      required: [true, 'Maximum stock level is required'],
      default: 100,
      min: [1, 'Maximum stock level must be at least 1']
    },
    autoReorderEnabled: {
      type: Boolean,
      default: false
    },
    reorderQuantity: {
      type: Number,
      default: 50,
      min: [1, 'Reorder quantity must be at least 1']
    }
  },

  // Analytics and Performance
  analytics: {
    totalPurchaseValue: {
      type: Number,
      default: 0
    },
    totalSoldValue: {
      type: Number,
      default: 0
    },
    totalSoldQuantity: {
      type: Number,
      default: 0
    },
    averageSalePrice: {
      type: Number,
      default: 0
    },
    grossProfit: {
      type: Number,
      default: 0
    },
    profitMargin: {
      type: Number,
      default: 0
    },
    turnoverRate: {
      type: Number,
      default: 0
    },
    lastSoldDate: Date,
    stockMovements: [{
      type: {
        type: String,
        enum: ['purchase', 'sale', 'adjustment', 'wastage', 'return'],
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      reason: String,
      date: {
        type: Date,
        default: Date.now
      },
      referenceId: String // Order ID, Purchase ID, etc.
    }]
  },

  // Status and alerts
  status: {
    type: String,
    enum: ['active', 'low_stock', 'out_of_stock', 'overstocked', 'inactive'],
    default: 'active'
  },
  lastStockUpdate: {
    type: Date,
    default: Date.now
  },
  alerts: [{
    type: {
      type: String,
      enum: ['low_stock', 'expired_items', 'overstock', 'no_movement'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: Date
  }],

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

// Compound index to ensure one inventory record per vendor-product combination
VendorInventorySchema.index({ vendorId: 1, productId: 1 }, { unique: true });

// Pre-save middleware to update stock calculations
VendorInventorySchema.pre('save', function(next) {
  // Calculate current stock from active purchases
  const activePurchases = this.purchases.filter(p => p.status === 'active');
  
  this.currentStock.totalQuantity = activePurchases.reduce((total, purchase) => {
    return total + purchase.remainingQuantity;
  }, 0);

  // Calculate average purchase price (weighted average)
  if (activePurchases.length > 0) {
    let totalCost = 0;
    let totalQuantity = 0;

    activePurchases.forEach(purchase => {
      const purchaseCost = purchase.purchasePrice + purchase.transportationCost + 
                          purchase.storageCost + purchase.otherCosts;
      totalCost += purchaseCost * purchase.remainingQuantity;
      totalQuantity += purchase.remainingQuantity;
    });

    this.currentStock.averagePurchasePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
    this.currentStock.totalValue = this.currentStock.averagePurchasePrice * this.currentStock.totalQuantity;
  } else {
    this.currentStock.averagePurchasePrice = 0;
    this.currentStock.totalValue = 0;
  }

  // Update status based on stock levels
  if (this.currentStock.totalQuantity === 0) {
    this.status = 'out_of_stock';
  } else if (this.currentStock.totalQuantity <= this.inventorySettings.reorderLevel) {
    this.status = 'low_stock';
  } else if (this.currentStock.totalQuantity >= this.inventorySettings.maxStockLevel) {
    this.status = 'overstocked';
  } else {
    this.status = 'active';
  }

  this.lastStockUpdate = new Date();
  next();
});

// Method to add new purchase
VendorInventorySchema.methods.addPurchase = function(purchaseData) {
  // Set remaining quantity equal to purchased quantity initially
  purchaseData.remainingQuantity = purchaseData.purchasedQuantity;
  
  this.purchases.push(purchaseData);
  
  // Add to analytics
  this.analytics.totalPurchaseValue += purchaseData.purchasePrice * purchaseData.purchasedQuantity;
  
  // Add stock movement record
  this.analytics.stockMovements.push({
    type: 'purchase',
    quantity: purchaseData.purchasedQuantity,
    reason: 'New stock purchase',
    referenceId: purchaseData.batchId
  });

  return this.save();
};

// Method to consume stock (when items are sold)
VendorInventorySchema.methods.consumeStock = function(quantityToConsume, salePrice, orderId) {
  if (quantityToConsume > this.currentStock.totalQuantity) {
    throw new Error('Insufficient stock available');
  }

  let remainingToConsume = quantityToConsume;
  const consumedBatches = [];

  // Use FIFO (First In, First Out) approach
  this.purchases.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

  for (let purchase of this.purchases) {
    if (remainingToConsume <= 0) break;
    if (purchase.status !== 'active' || purchase.remainingQuantity <= 0) continue;

    const quantityFromThisBatch = Math.min(remainingToConsume, purchase.remainingQuantity);
    
    purchase.remainingQuantity -= quantityFromThisBatch;
    remainingToConsume -= quantityFromThisBatch;

    if (purchase.remainingQuantity === 0) {
      purchase.status = 'sold_out';
    }

    consumedBatches.push({
      batchId: purchase.batchId,
      quantity: quantityFromThisBatch,
      purchasePrice: purchase.purchasePrice
    });
  }

  // Update analytics
  this.analytics.totalSoldQuantity += quantityToConsume;
  this.analytics.totalSoldValue += salePrice * quantityToConsume;
  this.analytics.lastSoldDate = new Date();
  
  // Calculate gross profit from this sale
  const totalPurchaseCost = consumedBatches.reduce((total, batch) => {
    return total + (batch.purchasePrice * batch.quantity);
  }, 0);
  
  const grossProfitFromSale = (salePrice * quantityToConsume) - totalPurchaseCost;
  this.analytics.grossProfit += grossProfitFromSale;

  // Update average sale price
  this.analytics.averageSalePrice = this.analytics.totalSoldQuantity > 0 
    ? this.analytics.totalSoldValue / this.analytics.totalSoldQuantity 
    : 0;

  // Update profit margin
  this.analytics.profitMargin = this.analytics.totalSoldValue > 0 
    ? (this.analytics.grossProfit / this.analytics.totalSoldValue) * 100 
    : 0;

  // Add stock movement record
  this.analytics.stockMovements.push({
    type: 'sale',
    quantity: -quantityToConsume,
    reason: 'Stock sold',
    referenceId: orderId
  });

  return this.save();
};

// Method to adjust stock (for wastage, damage, etc.)
VendorInventorySchema.methods.adjustStock = function(adjustment) {
  const { type, quantity, reason, batchId } = adjustment;

  if (type === 'wastage' || type === 'damage') {
    if (quantity > this.currentStock.totalQuantity) {
      throw new Error('Cannot adjust more stock than available');
    }

    // If specific batch mentioned, adjust from that batch
    if (batchId) {
      const purchase = this.purchases.find(p => p.batchId === batchId);
      if (purchase && purchase.remainingQuantity >= quantity) {
        purchase.remainingQuantity -= quantity;
        if (purchase.remainingQuantity === 0) {
          purchase.status = type === 'damage' ? 'damaged' : 'sold_out';
        }
      }
    } else {
      // Adjust from oldest batches first (FIFO)
      let remainingToAdjust = quantity;
      this.purchases.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

      for (let purchase of this.purchases) {
        if (remainingToAdjust <= 0) break;
        if (purchase.status !== 'active' || purchase.remainingQuantity <= 0) continue;

        const adjustFromThisBatch = Math.min(remainingToAdjust, purchase.remainingQuantity);
        purchase.remainingQuantity -= adjustFromThisBatch;
        remainingToAdjust -= adjustFromThisBatch;

        if (purchase.remainingQuantity === 0) {
          purchase.status = type === 'damage' ? 'damaged' : 'sold_out';
        }
      }
    }

    // Add stock movement record
    this.analytics.stockMovements.push({
      type,
      quantity: -quantity,
      reason,
      referenceId: batchId
    });
  }

  return this.save();
};

// Method to check for alerts
VendorInventorySchema.methods.checkAndGenerateAlerts = function() {
  const alerts = [];

  // Low stock alert
  if (this.currentStock.totalQuantity <= this.inventorySettings.reorderLevel) {
    alerts.push({
      type: 'low_stock',
      message: `Stock is running low. Current: ${this.currentStock.totalQuantity}, Reorder level: ${this.inventorySettings.reorderLevel}`,
      severity: this.currentStock.totalQuantity === 0 ? 'critical' : 'high'
    });
  }

  // Overstock alert
  if (this.currentStock.totalQuantity >= this.inventorySettings.maxStockLevel) {
    alerts.push({
      type: 'overstock',
      message: `Stock is above maximum level. Current: ${this.currentStock.totalQuantity}, Max: ${this.inventorySettings.maxStockLevel}`,
      severity: 'medium'
    });
  }

  // Expired items alert
  const expiredBatches = this.purchases.filter(p => 
    p.status === 'active' && p.expiryDate && p.expiryDate <= new Date()
  );

  if (expiredBatches.length > 0) {
    const expiredQuantity = expiredBatches.reduce((total, batch) => total + batch.remainingQuantity, 0);
    alerts.push({
      type: 'expired_items',
      message: `${expiredQuantity} ${this.currentStock.unit} of stock has expired`,
      severity: 'high'
    });
  }

  // No movement alert (items not sold in 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (!this.analytics.lastSoldDate || this.analytics.lastSoldDate < thirtyDaysAgo) {
    if (this.currentStock.totalQuantity > 0) {
      alerts.push({
        type: 'no_movement',
        message: 'No stock movement in the last 30 days',
        severity: 'medium'
      });
    }
  }

  // Add new alerts that don't already exist
  alerts.forEach(newAlert => {
    const existingAlert = this.alerts.find(a => 
      a.type === newAlert.type && !a.resolvedAt && !a.isRead
    );
    
    if (!existingAlert) {
      this.alerts.push(newAlert);
    }
  });

  return alerts;
};

// Static method to get low stock items for vendor
VendorInventorySchema.statics.getLowStockItems = async function(vendorId, options = {}) {
  const { severity = 'all', limit = 50 } = options;
  
  let matchQuery = { vendorId };
  
  if (severity === 'critical') {
    matchQuery.status = 'out_of_stock';
  } else if (severity === 'high') {
    matchQuery.status = { $in: ['low_stock', 'out_of_stock'] };
  } else {
    matchQuery.status = { $in: ['low_stock', 'out_of_stock', 'overstocked'] };
  }

  return await this.find(matchQuery)
    .populate('productId', 'name category images')
    .populate('vendorId', 'businessName')
    .limit(limit)
    .sort({ 'currentStock.totalQuantity': 1 });
};

// Static method to get inventory analytics for vendor
VendorInventorySchema.statics.getInventoryAnalytics = async function(vendorId, startDate, endDate) {
  return await this.aggregate([
    { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStockValue: { $sum: '$currentStock.totalValue' },
        totalStockQuantity: { $sum: '$currentStock.totalQuantity' },
        averageProfitMargin: { $avg: '$analytics.profitMargin' },
        totalGrossProfit: { $sum: '$analytics.grossProfit' },
        lowStockItems: {
          $sum: { $cond: [{ $eq: ['$status', 'low_stock'] }, 1, 0] }
        },
        outOfStockItems: {
          $sum: { $cond: [{ $eq: ['$status', 'out_of_stock'] }, 1, 0] }
        },
        overstockedItems: {
          $sum: { $cond: [{ $eq: ['$status', 'overstocked'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Indexes for better performance
VendorInventorySchema.index({ vendorId: 1, status: 1 });
VendorInventorySchema.index({ status: 1, 'currentStock.totalQuantity': 1 });
VendorInventorySchema.index({ 'purchases.expiryDate': 1, 'purchases.status': 1 });
VendorInventorySchema.index({ lastStockUpdate: -1 });

module.exports = mongoose.model('VendorInventory', VendorInventorySchema);