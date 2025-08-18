const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Setting key is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Setting value is required']
  },
  category: {
    type: String,
    enum: ['general', 'business', 'notifications', 'security', 'payment'],
    required: [true, 'Setting category is required']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: [true, 'Data type is required']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  validation: {
    required: Boolean,
    min: Number,
    max: Number,
    pattern: String,
    options: [String]
  },
  // Audit fields
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  previousValue: mongoose.Schema.Types.Mixed,
  changeReason: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Static method to get settings by category
SettingsSchema.statics.getByCategory = async function(category, includePrivate = false) {
  const query = { category };
  if (!includePrivate) {
    query.isPublic = true;
  }
  
  const settings = await this.find(query).sort({ key: 1 });
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
};

// Static method to get a single setting
SettingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to update a setting
SettingsSchema.statics.updateSetting = async function(key, value, updatedBy, changeReason = null) {
  const setting = await this.findOne({ key });
  
  if (!setting) {
    throw new Error(`Setting with key '${key}' not found`);
  }
  
  if (!setting.isEditable) {
    throw new Error(`Setting '${key}' is not editable`);
  }
  
  const previousValue = setting.value;
  setting.value = value;
  setting.previousValue = previousValue;
  setting.updatedBy = updatedBy;
  setting.changeReason = changeReason;
  
  await setting.save();
  return setting;
};

// Pre-save validation
SettingsSchema.pre('save', function(next) {
  // Validate data type
  const expectedType = this.dataType;
  const actualType = Array.isArray(this.value) ? 'array' : typeof this.value;
  
  if (expectedType === 'object' && actualType !== 'object') {
    return next(new Error(`Value must be of type ${expectedType}`));
  }
  
  if (expectedType !== 'object' && expectedType !== actualType) {
    return next(new Error(`Value must be of type ${expectedType}`));
  }
  
  // Custom validation
  if (this.validation) {
    if (this.validation.required && (this.value === null || this.value === undefined)) {
      return next(new Error('Value is required'));
    }
    
    if (this.validation.min !== undefined && this.value < this.validation.min) {
      return next(new Error(`Value must be at least ${this.validation.min}`));
    }
    
    if (this.validation.max !== undefined && this.value > this.validation.max) {
      return next(new Error(`Value must not exceed ${this.validation.max}`));
    }
    
    if (this.validation.pattern && typeof this.value === 'string') {
      const regex = new RegExp(this.validation.pattern);
      if (!regex.test(this.value)) {
        return next(new Error('Value does not match required pattern'));
      }
    }
    
    if (this.validation.options && this.validation.options.length > 0) {
      if (!this.validation.options.includes(this.value)) {
        return next(new Error(`Value must be one of: ${this.validation.options.join(', ')}`));
      }
    }
  }
  
  next();
});

// Indexes for better query performance
SettingsSchema.index({ key: 1 });
SettingsSchema.index({ category: 1, isPublic: 1 });
SettingsSchema.index({ updatedBy: 1, updatedAt: -1 });

module.exports = mongoose.model('Settings', SettingsSchema);