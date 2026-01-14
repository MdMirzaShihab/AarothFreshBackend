const mongoose = require('mongoose');

const UpazilaSchema = new mongoose.Schema({
  name: {
    en: {
      type: String,
      required: [true, 'Upazila name in English is required'],
      trim: true,
      minlength: [2, 'Upazila name must be at least 2 characters'],
      maxlength: [50, 'Upazila name cannot exceed 50 characters']
    },
    bn: {
      type: String,
      required: [true, 'Upazila name in Bengali is required'],
      trim: true,
      minlength: [2, 'Upazila name must be at least 2 characters'],
      maxlength: [50, 'Upazila name cannot exceed 50 characters']
    }
  },
  code: {
    type: String,
    required: [true, 'Upazila code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^UPZ-\d{3}$/, 'Upazila code must follow format: UPZ-###']
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: [true, 'District reference is required'],
    index: true
  },
  division: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Division',
    required: [true, 'Division reference is required'],
    index: true
  },
  postalCodes: [{
    type: String,
    trim: true,
    match: [/^\d{4}$/, 'Postal code must be 4 digits']
  }],
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: '2dsphere',
    validate: {
      validator: function(v) {
        // Optional field, but if provided must be valid
        if (!v || v.length === 0) return true;
        return v.length === 2 &&
               v[0] >= -180 && v[0] <= 180 && // longitude
               v[1] >= -90 && v[1] <= 90;      // latitude
      },
      message: 'Coordinates must be [longitude, latitude] with valid ranges'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
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

// Compound unique index - upazila name must be unique within district
UpazilaSchema.index({ 'name.en': 1, district: 1 }, { unique: true });
UpazilaSchema.index({ 'name.bn': 1, district: 1 }, { unique: true });

// Text index for search
UpazilaSchema.index({ 'name.en': 'text', 'name.bn': 'text' });

// Indexes for querying
UpazilaSchema.index({ district: 1, isActive: 1 });
UpazilaSchema.index({ division: 1 });

// Virtual populate for unions in this upazila
UpazilaSchema.virtual('unions', {
  ref: 'Union',
  localField: '_id',
  foreignField: 'upazila',
  justOne: false
});

// Method to get localized name
UpazilaSchema.methods.getLocalizedName = function(lang = 'en') {
  return lang === 'bn' ? this.name.bn : this.name.en;
};

// Method to check if postal code is valid for this upazila
UpazilaSchema.methods.hasPostalCode = function(postalCode) {
  return this.postalCodes && this.postalCodes.includes(postalCode);
};

// Static method to find upazilas by district
UpazilaSchema.statics.findByDistrict = function(districtId, activeOnly = true) {
  const query = { district: districtId };
  if (activeOnly) query.isActive = true;
  return this.find(query)
    .sort('name.en')
    .populate('district', 'name code')
    .populate('division', 'name code');
};

// Static method to find upazilas by division
UpazilaSchema.statics.findByDivision = function(divisionId, activeOnly = true) {
  const query = { division: divisionId };
  if (activeOnly) query.isActive = true;
  return this.find(query)
    .sort('name.en')
    .populate('district', 'name code')
    .populate('division', 'name code');
};

// Static method to find active upazilas
UpazilaSchema.statics.findActive = function() {
  return this.find({ isActive: true })
    .sort('name.en')
    .populate('district', 'name code')
    .populate('division', 'name code');
};

module.exports = mongoose.model('Upazila', UpazilaSchema);
