const mongoose = require('mongoose');

const DistrictSchema = new mongoose.Schema({
  name: {
    en: {
      type: String,
      required: [true, 'District name in English is required'],
      trim: true,
      minlength: [2, 'District name must be at least 2 characters'],
      maxlength: [50, 'District name cannot exceed 50 characters']
    },
    bn: {
      type: String,
      required: [true, 'District name in Bengali is required'],
      trim: true,
      minlength: [2, 'District name must be at least 2 characters'],
      maxlength: [50, 'District name cannot exceed 50 characters']
    }
  },
  code: {
    type: String,
    required: [true, 'District code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^DIST-\d{2}$/, 'District code must follow format: DIST-##']
  },
  division: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Division',
    required: [true, 'Division reference is required'],
    index: true
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

// Compound unique index - district name must be unique within division
DistrictSchema.index({ 'name.en': 1, division: 1 }, { unique: true });
DistrictSchema.index({ 'name.bn': 1, division: 1 }, { unique: true });

// Text index for search
DistrictSchema.index({ 'name.en': 'text', 'name.bn': 'text' });

// Index for querying by division and active status
DistrictSchema.index({ division: 1, isActive: 1 });

// Virtual populate for upazilas in this district
DistrictSchema.virtual('upazilas', {
  ref: 'Upazila',
  localField: '_id',
  foreignField: 'district',
  justOne: false
});

// Method to get localized name
DistrictSchema.methods.getLocalizedName = function(lang = 'en') {
  return lang === 'bn' ? this.name.bn : this.name.en;
};

// Static method to find districts by division
DistrictSchema.statics.findByDivision = function(divisionId, activeOnly = true) {
  const query = { division: divisionId };
  if (activeOnly) query.isActive = true;
  return this.find(query).sort('name.en').populate('division', 'name code');
};

// Static method to find active districts
DistrictSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort('name.en').populate('division', 'name code');
};

module.exports = mongoose.model('District', DistrictSchema);
