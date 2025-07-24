const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add restaurant name'],
    trim: true,
    maxlength: [100, 'Restaurant name cannot be more than 100 characters']
  },
  ownerName: {
    type: String,
    required: [true, 'Please add owner name'],
    trim: true,
    maxlength: [50, 'Owner name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ],
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [
      /^\+?[1-9]\d{1,14}$/,
      'Please add a valid phone number'
    ]
  },
  address: {
    street: {
      type: String,
      required: [true, 'Please add street address']
    },
    city: {
      type: String,
      required: [true, 'Please add city']
    },
    state: {
      type: String,
      required: [true, 'Please add state']
    },
    zipCode: {
      type: String,
      required: [true, 'Please add zip code']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  businessLicense: {
    number: String,
    expiryDate: Date,
    document: String // File path to uploaded document
  },
  taxId: {
    type: String,
    required: [true, 'Please add tax ID']
  },
  cuisineType: [{
    type: String,
    required: [true, 'Please add at least one cuisine type'],
    trim: true
  }],
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false }},
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false }},
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false }},
    thursday: { open: String, close: String, closed: { type: Boolean, default: false }},
    friday: { open: String, close: String, closed: { type: Boolean, default: false }},
    saturday: { open: String, close: String, closed: { type: Boolean, default: false }},
    sunday: { open: String, close: String, closed: { type: Boolean, default: false }}
  },
  seatingCapacity: {
    type: Number,
    min: [1, 'Seating capacity must be at least 1']
  },
  // Approval system for orders
  requiresOrderApproval: {
    type: Boolean,
    default: false
  },
  // Payment preferences
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net7', 'net15', 'net30'],
    default: 'immediate'
  },
  preferredPaymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'digital_wallet'],
    default: 'bank_transfer'
  },
  // Business metrics
  averageOrderValue: {
    type: Number,
    default: 0
  },
  totalOrders: {
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
  // Status flags
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationDate: Date,
  // Managers associated with this restaurant
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Virtual for getting full address
RestaurantSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
});

// Virtual populate for orders
RestaurantSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'restaurantId',
  justOne: false
});

// Indexes for better query performance
RestaurantSchema.index({ 'address.coordinates': '2dsphere' });
RestaurantSchema.index({ name: 'text', cuisineType: 'text' });
RestaurantSchema.index({ isActive: 1, isVerified: 1 });
RestaurantSchema.index({ email: 1 });

module.exports = mongoose.model('Restaurant', RestaurantSchema);