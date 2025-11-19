const mongoose = require('mongoose');

const MarketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add market name'],
    unique: true,
    trim: true,
    minlength: [2, 'Market name must be at least 2 characters'],
    maxlength: [50, 'Market name cannot be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  image: {
    type: String, // Cloudinary URL to market image
    required: [true, 'Market image is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Market image cannot be empty'
    }
  },

  // Location details
  location: {
    address: {
      type: String,
      required: [true, 'Market address is required'],
      trim: true,
      maxlength: [200, 'Address cannot be more than 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City name cannot be more than 50 characters'],
      index: true
    },
    district: {
      type: String,
      trim: true,
      maxlength: [50, 'District name cannot be more than 50 characters']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
      validate: {
        validator: function(v) {
          // Optional, but if provided must be valid [longitude, latitude]
          if (!v || v.length === 0) return true;
          return v.length === 2 &&
                 v[0] >= -180 && v[0] <= 180 && // longitude
                 v[1] >= -90 && v[1] <= 90;      // latitude
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    }
  },

  // Status fields
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Flag system - prevents new references while preserving existing ones
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  adminStatus: {
    type: String,
    enum: ['active', 'disabled', 'deprecated'],
    default: 'active',
    index: true
  },
  flagReason: {
    type: String,
    maxlength: [500, 'Flag reason cannot exceed 500 characters']
  },
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  flaggedAt: {
    type: Date
  },

  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Create slug from name before saving
MarketSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-');
  }
  next();
});

// Virtual populate for vendors in this market
MarketSchema.virtual('vendors', {
  ref: 'Vendor',
  localField: '_id',
  foreignField: 'markets',
  justOne: false
});

// Method to check if market can be deleted
MarketSchema.methods.canBeDeleted = async function() {
  const Vendor = require('./Vendor');

  const dependencies = {
    vendors: 0,
    activeVendors: 0,
    canDelete: true,
    blockers: []
  };

  // Check for vendors operating in this market
  dependencies.vendors = await Vendor.countDocuments({
    markets: this._id,
    isDeleted: { $ne: true }
  });

  // Check for active vendors
  dependencies.activeVendors = await Vendor.countDocuments({
    markets: this._id,
    isActive: true,
    verificationStatus: 'approved',
    isDeleted: { $ne: true }
  });

  // Determine if can delete
  if (dependencies.vendors > 0) {
    dependencies.canDelete = false;
    dependencies.blockers.push(`${dependencies.vendors} vendors are operating in this market`);
  }

  if (dependencies.activeVendors > 0) {
    dependencies.canDelete = false;
    dependencies.blockers.push(`${dependencies.activeVendors} active vendors are operating in this market`);
  }

  return dependencies;
};

// Method to toggle availability (flag system)
MarketSchema.methods.toggleAvailability = function(isAvailable, reason, flaggedByUserId) {
  this.isAvailable = isAvailable;
  this.adminStatus = isAvailable ? 'active' : 'disabled';

  if (!isAvailable) {
    this.flagReason = reason;
    this.flaggedBy = flaggedByUserId;
    this.flaggedAt = new Date();
  } else {
    this.flagReason = undefined;
    this.flaggedBy = undefined;
    this.flaggedAt = undefined;
  }

  this.updatedBy = flaggedByUserId;
};

// Indexes for better query performance
MarketSchema.index({ slug: 1 });
MarketSchema.index({ 'location.city': 1 });
MarketSchema.index({ 'location.coordinates': '2dsphere' });
MarketSchema.index({ isActive: 1, isAvailable: 1 });
MarketSchema.index({ isAvailable: 1, isDeleted: 1 });
MarketSchema.index({ adminStatus: 1 });
MarketSchema.index({ flaggedBy: 1, flaggedAt: -1 });
MarketSchema.index({ name: 'text', description: 'text', 'location.city': 'text' });

module.exports = mongoose.model('Market', MarketSchema);
