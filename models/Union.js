const mongoose = require('mongoose');

const UnionSchema = new mongoose.Schema({
  name: {
    en: {
      type: String,
      required: [true, 'Union name in English is required'],
      trim: true,
      minlength: [2, 'Union name must be at least 2 characters'],
      maxlength: [50, 'Union name cannot exceed 50 characters']
    },
    bn: {
      type: String,
      required: [true, 'Union name in Bengali is required'],
      trim: true,
      minlength: [2, 'Union name must be at least 2 characters'],
      maxlength: [50, 'Union name cannot exceed 50 characters']
    }
  },
  code: {
    type: String,
    required: [true, 'Union code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^UN-\d{4}$/, 'Union code must follow format: UN-####']
  },
  type: {
    type: String,
    enum: {
      values: ['union', 'ward', 'pourashava'],
      message: 'Type must be one of: union, ward, pourashava'
    },
    required: [true, 'Union type is required']
  },
  upazila: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upazila',
    required: [true, 'Upazila reference is required'],
    index: true
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
  postalCode: {
    type: String,
    trim: true,
    match: [/^\d{4}$/, 'Postal code must be 4 digits']
  },
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

// Compound unique index - union name must be unique within upazila
UnionSchema.index({ 'name.en': 1, upazila: 1 }, { unique: true });
UnionSchema.index({ 'name.bn': 1, upazila: 1 }, { unique: true });

// Text index for search
UnionSchema.index({ 'name.en': 'text', 'name.bn': 'text' });

// Indexes for querying
UnionSchema.index({ upazila: 1, isActive: 1 });
UnionSchema.index({ district: 1 });
UnionSchema.index({ division: 1 });

// Method to get localized name
UnionSchema.methods.getLocalizedName = function(lang = 'en') {
  return lang === 'bn' ? this.name.bn : this.name.en;
};

// Method to get localized type
UnionSchema.methods.getLocalizedType = function(lang = 'en') {
  const typeMap = {
    en: { union: 'Union', ward: 'Ward', pourashava: 'Pourashava' },
    bn: { union: 'ইউনিয়ন', ward: 'ওয়ার্ড', pourashava: 'পৌরসভা' }
  };
  return typeMap[lang][this.type] || this.type;
};

// Static method to find unions by upazila
UnionSchema.statics.findByUpazila = function(upazilaId, activeOnly = true) {
  const query = { upazila: upazilaId };
  if (activeOnly) query.isActive = true;
  return this.find(query)
    .sort('name.en')
    .populate('upazila', 'name code')
    .populate('district', 'name code')
    .populate('division', 'name code');
};

// Static method to find unions by district
UnionSchema.statics.findByDistrict = function(districtId, activeOnly = true) {
  const query = { district: districtId };
  if (activeOnly) query.isActive = true;
  return this.find(query)
    .sort('name.en')
    .populate('upazila', 'name code')
    .populate('district', 'name code')
    .populate('division', 'name code');
};

// Static method to find unions by division
UnionSchema.statics.findByDivision = function(divisionId, activeOnly = true) {
  const query = { division: divisionId };
  if (activeOnly) query.isActive = true;
  return this.find(query)
    .sort('name.en')
    .populate('upazila', 'name code')
    .populate('district', 'name code')
    .populate('division', 'name code');
};

// Static method to find active unions
UnionSchema.statics.findActive = function() {
  return this.find({ isActive: true })
    .sort('name.en')
    .populate('upazila', 'name code')
    .populate('district', 'name code')
    .populate('division', 'name code');
};

module.exports = mongoose.model('Union', UnionSchema);
