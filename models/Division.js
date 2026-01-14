const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
  name: {
    en: {
      type: String,
      required: [true, 'Division name in English is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Division name must be at least 2 characters'],
      maxlength: [50, 'Division name cannot exceed 50 characters']
    },
    bn: {
      type: String,
      required: [true, 'Division name in Bengali is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Division name must be at least 2 characters'],
      maxlength: [50, 'Division name cannot exceed 50 characters']
    }
  },
  code: {
    type: String,
    required: [true, 'Division code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^DIV-\d{2}$/, 'Division code must follow format: DIV-##']
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

// Indexes for performance
DivisionSchema.index({ 'name.en': 'text', 'name.bn': 'text' });
DivisionSchema.index({ code: 1 });
DivisionSchema.index({ isActive: 1 });

// Virtual populate for districts in this division
DivisionSchema.virtual('districts', {
  ref: 'District',
  localField: '_id',
  foreignField: 'division',
  justOne: false
});

// Method to get localized name based on language preference
DivisionSchema.methods.getLocalizedName = function(lang = 'en') {
  return lang === 'bn' ? this.name.bn : this.name.en;
};

// Static method to find active divisions
DivisionSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort('name.en');
};

module.exports = mongoose.model('Division', DivisionSchema);
