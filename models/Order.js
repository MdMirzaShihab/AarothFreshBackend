const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer',
    required: [true, 'Buyer ID is required']
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor ID is required']
  },
  // Order items
  items: [{
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true
    },

    // Pack-based selling support
    isPackBased: {
      type: Boolean,
      default: false
    },

    // If pack-based, number of packs ordered
    numberOfPacks: {
      type: Number,
      min: [1, 'Number of packs must be at least 1']
    },

    // Pack size (how many base units per pack)
    packSize: {
      type: Number,
      min: [0.01, 'Pack size must be greater than 0']
    },

    // Price per pack (when pack-based selling)
    pricePerPack: {
      type: Number,
      min: [0, 'Price per pack cannot be negative']
    },

    // Quantity in base units (e.g., kg, pieces)
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than 0']
    },

    unit: {
      type: String,
      required: true
    },

    // Price per base unit (e.g., price per kg)
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },

    totalPrice: {
      type: Number,
      min: [0, 'Total price cannot be negative']
    },

    qualityGrade: String,
    specialInstructions: String
  }],
  // Order totals
  subtotal: {
    type: Number,
    min: [0, 'Subtotal cannot be negative']
  },
  deliveryFee: {
    type: Number,
    default: 0,
    min: [0, 'Delivery fee cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  totalAmount: {
    type: Number,
    min: [0, 'Total amount cannot be negative']
  },
  // Order status workflow
  status: {
    type: String,
    enum: [
      'pending_approval',
      'confirmed',
      'processing',
      'ready_for_pickup',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'refunded'
    ],
    default: 'pending_approval'
  },
  // User interactions
  placedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Placed by user ID is required']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Delivery information
  deliveryInfo: {
    type: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: [Number]
    },
    contactPerson: {
      name: String,
      phone: String,
      email: String
    },
    instructions: String,
    preferredTimeSlot: {
      date: Date,
      startTime: String,
      endTime: String
    }
  },
  // Important dates
  orderDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: Date,
  confirmedDate: Date,
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  // Payment information
  paymentInfo: {
    method: {
      type: String,
      enum: ['cash', 'check', 'bank_transfer', 'digital_wallet', 'credit'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    paymentDate: Date,
    dueDate: Date
  },
  // Notes and communication
  notes: {
    buyer: String,   // Notes from buyer (restaurant/corporate/etc)
    vendor: String,  // Notes from vendor
    internal: String // Internal notes
  },
  // Status history for tracking
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String,
    notes: String
  }],
  // Rating and feedback
  rating: {
    buyerRating: {
      score: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5']
      },
      comment: String,
      ratedAt: Date
    },
    vendorRating: {
      score: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5']
      },
      comment: String,
      ratedAt: Date
    }
  },
  // Cancellation information
  cancellation: {
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate unique order number before saving
OrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Count orders for today to generate sequence
    const startOfDay = new Date(year, date.getMonth(), date.getDate());
    const endOfDay = new Date(year, date.getMonth(), date.getDate() + 1);
    
    const todayOrderCount = await this.constructor.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const sequence = String(todayOrderCount + 1).padStart(4, '0');
    this.orderNumber = `ORD-${year}${month}${day}-${sequence}`;
  }
  next();
});

// Update status history when status changes
OrderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.updatedBy || this.placedBy,
      changedAt: new Date(),
      reason: this.statusChangeReason || 'Status updated',
      notes: this.statusChangeNotes
    });
    
    // Set specific date fields based on status
    switch (this.status) {
      case 'confirmed':
        this.confirmedDate = new Date();
        break;
      case 'delivered':
        this.actualDeliveryDate = new Date();
        break;
    }
  }
  next();
});

// Calculate totals before saving (with pack-based pricing support)
OrderSchema.pre('save', function(next) {
  if (this.isModified('items') || this.isModified('deliveryFee') || this.isModified('tax') || this.isModified('discount')) {
    // Calculate subtotal
    this.subtotal = this.items.reduce((total, item) => {
      // For pack-based items, calculate using pack price
      if (item.isPackBased && item.numberOfPacks && item.pricePerPack) {
        item.totalPrice = item.numberOfPacks * item.pricePerPack;
      } else {
        // Standard calculation: quantity * unitPrice
        item.totalPrice = item.quantity * item.unitPrice;
      }
      return total + item.totalPrice;
    }, 0);

    // Calculate total amount
    this.totalAmount = this.subtotal + this.deliveryFee + this.tax - this.discount;
  }
  next();
});

// Virtual for order age in hours
OrderSchema.virtual('ageInHours').get(function() {
  return Math.floor((new Date() - this.orderDate) / (1000 * 60 * 60));
});

// Virtual for delivery status
OrderSchema.virtual('deliveryStatus').get(function() {
  const now = new Date();
  if (this.actualDeliveryDate) {
    return 'delivered';
  } else if (this.estimatedDeliveryDate && now > this.estimatedDeliveryDate) {
    return 'overdue';
  } else if (['out_for_delivery', 'ready_for_pickup'].includes(this.status)) {
    return 'in_transit';
  }
  return 'pending';
});

// Method to check if order can be cancelled
OrderSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = ['pending_approval', 'confirmed', 'processing'];
  return cancellableStatuses.includes(this.status);
};

// Method to check if order can be modified
OrderSchema.methods.canBeModified = function() {
  return this.status === 'pending_approval';
};

// Static method to get orders by buyer
OrderSchema.statics.getByBuyer = async function(buyerId, options = {}) {
  const {
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'orderDate',
    sortOrder = 'desc'
  } = options;

  let query = { buyerId };

  if (status) query.status = status;
  if (startDate || endDate) {
    query.orderDate = {};
    if (startDate) query.orderDate.$gte = new Date(startDate);
    if (endDate) query.orderDate.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  return await this.find(query)
    .populate('vendorId', 'businessName')
    .populate('placedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('items.productId', 'name')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Static method to get orders by vendor
OrderSchema.statics.getByVendor = async function(vendorId, options = {}) {
  const {
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'orderDate',
    sortOrder = 'desc'
  } = options;

  let query = { vendorId };
  
  if (status) query.status = status;
  if (startDate || endDate) {
    query.orderDate = {};
    if (startDate) query.orderDate.$gte = new Date(startDate);
    if (endDate) query.orderDate.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  return await this.find(query)
    .populate('buyerId', 'name')
    .populate('placedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('items.productId', 'name')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Indexes for better query performance
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ buyerId: 1, status: 1, orderDate: -1 });
OrderSchema.index({ vendorId: 1, status: 1, orderDate: -1 });
OrderSchema.index({ status: 1, orderDate: -1 });
OrderSchema.index({ placedBy: 1 });
OrderSchema.index({ 'paymentInfo.status': 1 });

module.exports = mongoose.model('Order', OrderSchema);