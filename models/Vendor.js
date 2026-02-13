const mongoose = require('mongoose');
const softDelete = require('../middleware/softDelete');

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
    sparse: true, // Allows multiple null values, enforces uniqueness only on non-null values
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
  logo: {
    type: String, // Cloudinary URL to vendor logo
    default: null,
    validate: {
      validator: function(v) {
        // If logo is provided, it should be a valid string
        return !v || (typeof v === 'string' && v.length > 0);
      },
      message: 'Logo must be a valid URL'
    }
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
  // Markets where vendor operates (multi-market support)
  markets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Market',
    required: [true, 'Vendor must operate in at least one market']
  }],
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
  totalOrders: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  // Admin tracking fields
  statusUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusUpdatedAt: Date,
  adminNotes: String,
  // Performance metrics
  performanceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Platform vendor fields
  isPlatformOwned: {
    type: Boolean,
    default: false,
    index: true
  },
  platformName: {
    type: String,
    enum: ['Aaroth Mall', 'Aaroth Organics', 'Aaroth Fresh Store'],
    required: function() {
      return this.isPlatformOwned === true;
    },
    trim: true
  },
  isEditable: {
    type: Boolean,
    default: true // false for platform vendors (admin-only editing)
  },
  specialPrivileges: {
    type: {
      featuredListings: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      customCommissionRate: { type: Number, default: null },
      unlimitedListings: { type: Boolean, default: false }
    },
    default: {}
  },
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
VendorSchema.virtual('fullAddress').get(function() {
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
VendorSchema.virtual('fullAddressBn').get(function() {
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

// Virtual populate for listings
VendorSchema.virtual('listings', {
  ref: 'Listing',
  localField: '_id',
  foreignField: 'vendorId',
  justOne: false
});


// Custom validation for markets array
VendorSchema.path('markets').validate(function(markets) {
  return markets && markets.length > 0;
}, 'Vendor must operate in at least one market');

// Auto-deactivate listings when markets are removed
VendorSchema.post('save', async function(doc, next) {
  if (this.isModified('markets')) {
    const Listing = require('./Listing');

    const allListings = await Listing.find({
      vendorId: doc._id,
      status: { $in: ['active', 'out_of_stock'] }
    });

    const validMarketIds = doc.markets.map(m => m.toString());

    const listingsToDeactivate = allListings.filter(
      listing => !validMarketIds.includes(listing.marketId.toString())
    );

    if (listingsToDeactivate.length > 0) {
      console.log(`Auto-deactivating ${listingsToDeactivate.length} listings due to market removal`);

      for (const listing of listingsToDeactivate) {
        listing.status = 'inactive';
        listing.isFlagged = true;
        listing.flagReason = 'Automatically deactivated: Vendor no longer operates in market';
        listing.lastStatusUpdate = new Date();
        await listing.save({ validateBeforeSave: false });
      }
    }
  }
  next();
});

// Indexes for better query performance
VendorSchema.index({ 'address.coordinates': '2dsphere' });
VendorSchema.index({ businessName: 'text', specialties: 'text' });
VendorSchema.index({ isActive: 1, verificationStatus: 1 });
VendorSchema.index({ verificationStatus: 1, statusUpdatedAt: -1 });
VendorSchema.index({ email: 1 });
VendorSchema.index({ isDeleted: 1, isActive: 1 });
VendorSchema.index({ performanceScore: -1 });
VendorSchema.index({ statusUpdatedBy: 1, statusUpdatedAt: -1 });
VendorSchema.index({ isPlatformOwned: 1, platformName: 1 });
VendorSchema.index({ markets: 1 });

VendorSchema.plugin(softDelete);

module.exports = mongoose.model('Vendor', VendorSchema);