const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // Who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userRole: {
    type: String,
    enum: ['admin', 'vendor', 'restaurantOwner', 'restaurantManager'],
    required: [true, 'User role is required']
  },
  
  // What action was performed
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      // User management
      'user_created', 'user_updated', 'user_deleted', 'user_approved', 'user_rejected',
      // Vendor management
      'vendor_created', 'vendor_updated', 'vendor_verified', 'vendor_deactivated',
      'vendor_verification_toggle', 'vendor_verification_revoked', 'vendor_status_reset',
      // Restaurant management
      'restaurant_created', 'restaurant_updated', 'restaurant_verified', 'restaurant_deactivated',
      'restaurant_verification_toggle', 'restaurant_verification_revoked', 'restaurant_status_reset',
      // Product management
      'product_created', 'product_updated', 'product_deleted', 'product_status_changed',
      // Category management
      'category_created', 'category_updated', 'category_deleted', 'category_viewed', 'categories_viewed', 'category_usage_viewed',
      // Listing management
      'listing_flagged', 'listing_unflagged', 'listing_featured', 'listing_status_changed',
      'listings_viewed', 'featured_listings_viewed', 'flagged_listings_viewed', 'listing_viewed',
      // Order management
      'order_approved', 'order_cancelled', 'order_status_changed',
      // System management
      'settings_updated', 'bulk_operation', 'system_backup', 'system_maintenance', 'analytics_viewed'
    ]
  },
  
  // What entity was affected
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['User', 'Vendor', 'Restaurant', 'Product', 'ProductCategory', 'Listing', 'Order', 'Settings']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required']
  },
  
  // Details of the change
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  
  // Additional context
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  reason: {
    type: String,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  
  // Request metadata
  ipAddress: String,
  userAgent: String,
  requestId: String,
  
  // Impact and severity
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  impactLevel: {
    type: String,
    enum: ['none', 'minor', 'moderate', 'significant', 'major'],
    default: 'minor'
  },
  
  // Status and resolution
  status: {
    type: String,
    enum: ['success', 'failed', 'partial'],
    default: 'success'
  },
  errorMessage: String,
  
  // Compliance and legal
  isCompliant: {
    type: Boolean,
    default: true
  },
  retentionPeriod: {
    type: Number,
    default: 2555 // 7 years in days
  },
  
  // Additional metadata
  metadata: {
    bulkOperationId: String,
    batchSize: Number,
    processingTime: Number,
    additionalData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for human-readable timestamp
AuditLogSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toISOString().split('T')[0] + ' ' + 
         this.createdAt.toTimeString().split(' ')[0];
});

// Static method to log an action
AuditLogSchema.statics.logAction = async function(actionData, session = null) {
  const {
    userId,
    userRole,
    action,
    entityType,
    entityId,
    changes = {},
    description,
    reason = null,
    ipAddress = null,
    userAgent = null,
    requestId = null,
    severity = 'medium',
    impactLevel = 'minor',
    status = 'success',
    errorMessage = null,
    metadata = {}
  } = actionData;

  const auditLog = new this({
    userId,
    userRole,
    action,
    entityType,
    entityId,
    changes,
    description,
    reason,
    ipAddress,
    userAgent,
    requestId,
    severity,
    impactLevel,
    status,
    errorMessage,
    metadata
  });

  return await auditLog.save({ session });
};

// Static method to get logs by user
AuditLogSchema.statics.getByUser = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 50,
    action = null,
    entityType = null,
    startDate = null,
    endDate = null
  } = options;

  let query = { userId };
  
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  
  return await this.find(query)
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get logs by entity
AuditLogSchema.statics.getByEntity = async function(entityType, entityId, options = {}) {
  const { limit = 20 } = options;
  
  return await this.find({ entityType, entityId })
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get security-related logs
AuditLogSchema.statics.getSecurityLogs = async function(options = {}) {
  const {
    page = 1,
    limit = 100,
    severity = ['high', 'critical'],
    hours = 24
  } = options;

  const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  const query = {
    severity: { $in: severity },
    createdAt: { $gte: since }
  };

  const skip = (page - 1) * limit;
  
  return await this.find(query)
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Method to check if log should be archived
AuditLogSchema.methods.shouldArchive = function() {
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - this.retentionPeriod);
  return this.createdAt < retentionDate;
};

// Indexes for better query performance
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
AuditLogSchema.index({ userRole: 1, action: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ 'metadata.bulkOperationId': 1 });

// TTL index for automatic cleanup based on retention period
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 220752000 }); // 7 years

module.exports = mongoose.model('AuditLog', AuditLogSchema);