const mongoose = require('mongoose');

const ListingAnalyticsSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: [true, 'Listing ID is required'],
    index: true
  },
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

  // Sales performance metrics
  salesData: {
    totalOrders: {
      type: Number,
      default: 0,
      min: [0, 'Total orders cannot be negative']
    },
    totalQuantitySold: {
      type: Number,
      default: 0,
      min: [0, 'Total quantity sold cannot be negative']
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: [0, 'Total revenue cannot be negative']
    },
    averageOrderSize: {
      type: Number,
      default: 0,
      min: [0, 'Average order size cannot be negative']
    },
    averageSalePrice: {
      type: Number,
      default: 0,
      min: [0, 'Average sale price cannot be negative']
    }
  },

  // Performance tracking by listing type
  performanceMetrics: {
    conversionRate: {
      type: Number,
      default: 0,
      min: [0, 'Conversion rate cannot be negative'],
      max: [100, 'Conversion rate cannot exceed 100%']
    },
    viewsToOrderRatio: {
      type: Number,
      default: 0,
      min: [0, 'Views to order ratio cannot be negative']
    },
    repeatCustomerRate: {
      type: Number,
      default: 0,
      min: [0, 'Repeat customer rate cannot be negative'],
      max: [100, 'Repeat customer rate cannot exceed 100%']
    }
  },

  // Time-based analytics
  periodData: [{
    period: {
      type: String,
      required: [true, 'Period is required'], // e.g., '2024-01', '2024-Q1', '2024-W01'
    },
    periodType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: [true, 'Period type is required']
    },
    orders: {
      type: Number,
      default: 0,
      min: [0, 'Orders cannot be negative']
    },
    quantitySold: {
      type: Number,
      default: 0,
      min: [0, 'Quantity sold cannot be negative']
    },
    revenue: {
      type: Number,
      default: 0,
      min: [0, 'Revenue cannot be negative']
    },
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative']
    }
  }],

  // Customer analytics
  customerInsights: {
    uniqueCustomers: {
      type: Number,
      default: 0,
      min: [0, 'Unique customers cannot be negative']
    },
    topCustomers: [{
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      orderCount: {
        type: Number,
        default: 0,
        min: [0, 'Order count cannot be negative']
      },
      totalRevenue: {
        type: Number,
        default: 0,
        min: [0, 'Customer revenue cannot be negative']
      }
    }]
  },

  // Inventory impact (for inventory-based listings)
  inventoryImpact: {
    stockMovements: [{
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      },
      quantityReduced: {
        type: Number,
        required: true,
        min: [0, 'Quantity reduced cannot be negative']
      },
      date: {
        type: Date,
        default: Date.now
      }
    }],
    totalStockReduced: {
      type: Number,
      default: 0,
      min: [0, 'Total stock reduced cannot be negative']
    }
  },

  // Profitability analysis (for inventory-based listings)
  profitability: {
    grossProfit: {
      type: Number,
      default: 0
    },
    profitMargin: {
      type: Number,
      default: 0
    },
    costOfGoodsSold: {
      type: Number,
      default: 0,
      min: [0, 'COGS cannot be negative']
    }
  },

  // Last updated tracking
  lastOrderDate: {
    type: Date
  },
  lastAnalyticsUpdate: {
    type: Date,
    default: Date.now
  },

  // Listing classification
  listingType: {
    type: String,
    enum: ['inventory_based', 'non_inventory'],
    required: [true, 'Listing type is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for efficient querying
ListingAnalyticsSchema.index({ vendorId: 1, listingId: 1 }, { unique: true });
ListingAnalyticsSchema.index({ vendorId: 1, listingType: 1 });
ListingAnalyticsSchema.index({ vendorId: 1, lastOrderDate: -1 });

// Method to record a new sale
ListingAnalyticsSchema.methods.recordSale = function(orderData) {
  const { quantity, revenue, customerId, orderId } = orderData;
  
  // Update sales data
  this.salesData.totalOrders += 1;
  this.salesData.totalQuantitySold += quantity;
  this.salesData.totalRevenue += revenue;
  this.salesData.averageOrderSize = this.salesData.totalQuantitySold / this.salesData.totalOrders;
  this.salesData.averageSalePrice = this.salesData.totalRevenue / this.salesData.totalQuantitySold;
  
  // Update last order date
  this.lastOrderDate = new Date();
  this.lastAnalyticsUpdate = new Date();
  
  // Add period data
  const now = new Date();
  const monthPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  let monthlyData = this.periodData.find(p => p.period === monthPeriod && p.periodType === 'monthly');
  if (!monthlyData) {
    monthlyData = {
      period: monthPeriod,
      periodType: 'monthly',
      orders: 0,
      quantitySold: 0,
      revenue: 0,
      views: 0
    };
    this.periodData.push(monthlyData);
  }
  
  monthlyData.orders += 1;
  monthlyData.quantitySold += quantity;
  monthlyData.revenue += revenue;
  
  // Update customer insights
  if (customerId) {
    let customerData = this.customerInsights.topCustomers.find(c => c.customerId.toString() === customerId.toString());
    if (!customerData) {
      customerData = {
        customerId,
        orderCount: 0,
        totalRevenue: 0
      };
      this.customerInsights.topCustomers.push(customerData);
    }
    customerData.orderCount += 1;
    customerData.totalRevenue += revenue;
    
    // Update unique customers count
    this.customerInsights.uniqueCustomers = this.customerInsights.topCustomers.length;
  }
  
  // Record inventory impact for inventory-based listings
  if (this.listingType === 'inventory_based') {
    this.inventoryImpact.stockMovements.push({
      orderId,
      quantityReduced: quantity,
      date: now
    });
    this.inventoryImpact.totalStockReduced += quantity;
  }
  
  return this.save();
};

// Method to update profitability for inventory-based listings
ListingAnalyticsSchema.methods.updateProfitability = function(costData) {
  if (this.listingType === 'inventory_based') {
    const { costPerUnit } = costData;
    this.profitability.costOfGoodsSold = this.salesData.totalQuantitySold * costPerUnit;
    this.profitability.grossProfit = this.salesData.totalRevenue - this.profitability.costOfGoodsSold;
    this.profitability.profitMargin = this.salesData.totalRevenue > 0 
      ? (this.profitability.grossProfit / this.salesData.totalRevenue) * 100 
      : 0;
  }
  return this.save();
};

// Static method to get analytics for vendor
ListingAnalyticsSchema.statics.getVendorAnalytics = async function(vendorId, options = {}) {
  const { startDate, endDate, listingType, period = 'monthly' } = options;
  
  let matchQuery = { vendorId };
  if (listingType) {
    matchQuery.listingType = listingType;
  }
  
  const pipeline = [
    { $match: matchQuery },
    {
      $lookup: {
        from: 'listings',
        localField: 'listingId',
        foreignField: '_id',
        as: 'listing'
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $group: {
        _id: '$listingType',
        totalListings: { $sum: 1 },
        totalOrders: { $sum: '$salesData.totalOrders' },
        totalRevenue: { $sum: '$salesData.totalRevenue' },
        totalQuantitySold: { $sum: '$salesData.totalQuantitySold' },
        averageRevenue: { $avg: '$salesData.totalRevenue' },
        totalGrossProfit: { $sum: '$profitability.grossProfit' }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

module.exports = mongoose.model('ListingAnalytics', ListingAnalyticsSchema);