const mongoose = require('mongoose');

const BuyerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add business name'],
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
    // Hierarchical location references (required)
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'Division is required'],
      index: true
    },
    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'District',
      required: [true, 'District is required'],
      index: true
    },
    upazila: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Upazila',
      required: [true, 'Upazila is required'],
      index: true
    },
    union: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Union',
      required: false // Optional - not all areas have unions
    },
    // Detailed street address (free text)
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    // Additional landmark or building info (optional)
    landmark: {
      type: String,
      trim: true,
      maxlength: [100, 'Landmark cannot exceed 100 characters']
    },
    // 4-digit postal code (validated against upazila/union)
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
      match: [/^\d{4}$/, 'Postal code must be 4 digits']
    },
    // GPS coordinates for map integration (optional)
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
      validate: {
        validator: function(v) {
          if (!v || v.length === 0) return true;
          return v.length === 2 &&
                 v[0] >= -180 && v[0] <= 180 && // longitude
                 v[1] >= -90 && v[1] <= 90;      // latitude
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
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
  // Buyer type discriminator
  buyerType: {
    type: String,
    enum: {
      values: ['restaurant', 'corporate', 'supershop', 'catering'],
      message: 'Buyer type must be one of: restaurant, corporate, supershop, catering'
    },
    required: [true, 'Please specify buyer type'],
    index: true
  },
  logo: {
    type: String, // Cloudinary URL to business logo
    default: null,
    validate: {
      validator: function(v) {
        // If logo is provided, it should be a valid string
        return !v || (typeof v === 'string' && v.length > 0);
      },
      message: 'Logo must be a valid URL'
    }
  },
  // Type-specific data stored in subdocument
  typeSpecificData: {
    // Restaurant-specific fields
    cuisineType: [{
      type: String,
      trim: true
    }],
    seatingCapacity: {
      type: Number,
      min: [1, 'Seating capacity must be at least 1']
    },
    operatingHours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false }},
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false }},
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false }},
      thursday: { open: String, close: String, closed: { type: Boolean, default: false }},
      friday: { open: String, close: String, closed: { type: Boolean, default: false }},
      saturday: { open: String, close: String, closed: { type: Boolean, default: false }},
      sunday: { open: String, close: String, closed: { type: Boolean, default: false }}
    },

    // Corporate-specific fields
    industry: {
      type: String,
      trim: true
    },
    employeeCount: {
      type: Number,
      min: [1, 'Employee count must be at least 1']
    },
    departmentBudgets: [{
      department: {
        type: String,
        trim: true
      },
      budgetLimit: {
        type: Number,
        min: [0, 'Budget limit must be positive']
      }
    }],

    // Supershop-specific fields
    chainName: {
      type: String,
      trim: true
    },
    branchCount: {
      type: Number,
      min: [1, 'Branch count must be at least 1']
    },
    retailCategory: [{
      type: String,
      trim: true
    }],

    // Catering-specific fields
    eventTypes: [{
      type: String,
      trim: true
    }],
    averageGuestCount: {
      type: Number,
      min: [1, 'Average guest count must be at least 1']
    },
    serviceRadius: {
      type: Number,
      min: [1, 'Service radius must be at least 1 km']
    }
  },
  // Approval system for orders (universal)
  requiresOrderApproval: {
    type: Boolean,
    default: false
  },
  // Payment preferences (universal)
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
  // Business metrics (universal)
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
      min: [0, 'Rating must be positive'],
      max: [5, 'Rating cannot be more than 5'],
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  // Three-state verification system
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationDate: Date,
  // Managers associated with this buyer
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Admin tracking fields
  statusUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusUpdatedAt: Date,
  adminNotes: String,
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
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting full address in English
BuyerSchema.virtual('fullAddress').get(function() {
  if (this.populated('address.division') && this.populated('address.district') && this.populated('address.upazila')) {
    const parts = [this.address.street];
    if (this.address.landmark) parts.push(this.address.landmark);
    if (this.address.union) parts.push(this.address.union.name.en);
    parts.push(this.address.upazila.name.en);
    parts.push(this.address.district.name.en);
    parts.push(this.address.division.name.en);
    parts.push(this.address.postalCode);
    return parts.join(', ');
  }
  // Fallback for unpopulated
  return `${this.address.street}, ${this.address.postalCode}`;
});

// Virtual for getting full address in Bengali
BuyerSchema.virtual('fullAddressBn').get(function() {
  if (this.populated('address.division') && this.populated('address.district') && this.populated('address.upazila')) {
    const parts = [this.address.street];
    if (this.address.landmark) parts.push(this.address.landmark);
    if (this.address.union) parts.push(this.address.union.name.bn);
    parts.push(this.address.upazila.name.bn);
    parts.push(this.address.district.name.bn);
    parts.push(this.address.division.name.bn);
    parts.push(this.address.postalCode);
    return parts.join(', ');
  }
  // Fallback for unpopulated
  return `${this.address.street}, ${this.address.postalCode}`;
});

// Virtual for display type name
BuyerSchema.virtual('displayType').get(function() {
  const typeMap = {
    restaurant: 'Restaurant',
    corporate: 'Corporate Company',
    supershop: 'Supershop',
    catering: 'Catering Service'
  };
  return typeMap[this.buyerType] || this.buyerType;
});

// Virtual populate for orders
BuyerSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'buyerId',
  justOne: false
});

// Indexes for better query performance
BuyerSchema.index({ 'address.coordinates': '2dsphere' });
BuyerSchema.index({ name: 'text', 'typeSpecificData.cuisineType': 'text' });
BuyerSchema.index({ isActive: 1, verificationStatus: 1 });
BuyerSchema.index({ verificationStatus: 1, statusUpdatedAt: -1 });
BuyerSchema.index({ email: 1 });
BuyerSchema.index({ isDeleted: 1, isActive: 1 });
BuyerSchema.index({ statusUpdatedBy: 1, statusUpdatedAt: -1 });
BuyerSchema.index({ buyerType: 1, isActive: 1 });

module.exports = mongoose.model('Buyer', BuyerSchema);
