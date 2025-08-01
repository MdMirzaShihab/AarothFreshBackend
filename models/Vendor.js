const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: [true, 'Please add a business name'],
    trim: true,
    maxlength: [100, 'Business name cannot be more than 100 characters']
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
  tradeLicenseNo: {
    type: String,
    unique: true,
    trim: true,
    maxlength: [30, 'Trade license number cannot be more than 30 characters'],
    required: [true, 'Please add trade license number']
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    routingNumber: String,
    bankName: String
  },
  specialties: [{
    type: String,
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
  deliveryRadius: {
    type: Number,
    default: 10, // kilometers
    min: [1, 'Delivery radius must be at least 1 km'],
    max: [100, 'Delivery radius cannot exceed 100 km']
  },
  minimumOrderValue: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order value cannot be negative']
  },
  rating: {
    average: {
      type: Number,
      min: [0, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationDate: Date,
  totalOrders: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
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
VendorSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
});

// Virtual populate for listings
VendorSchema.virtual('listings', {
  ref: 'Listing',
  localField: '_id',
  foreignField: 'vendorId',
  justOne: false
});

// Indexes for better query performance
VendorSchema.index({ 'address.coordinates': '2dsphere' });
VendorSchema.index({ businessName: 'text', specialties: 'text' });
VendorSchema.index({ isActive: 1, isVerified: 1 });
VendorSchema.index({ email: 1 });

module.exports = mongoose.model('Vendor', VendorSchema);