const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  recipientType: {
    type: String,
    enum: ['vendor', 'buyerOwner', 'buyerManager', 'admin'],
    required: [true, 'Recipient type is required']
  },
  type: {
    type: String,
    enum: ['order', 'inventory', 'budget', 'vendor', 'payment', 'system', 'promotion'],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isActionRequired: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String,
    maxlength: [200, 'Action URL cannot be more than 200 characters']
  },
  actionText: {
    type: String,
    maxlength: [50, 'Action text cannot be more than 50 characters']
  },
  // Related entity information
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['order', 'listing', 'product', 'vendor', 'buyer', 'payment']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityData: mongoose.Schema.Types.Mixed // Store relevant entity data snapshot
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Delivery tracking
  deliveryChannel: [{
    type: String,
    enum: ['in-app', 'email', 'sms', 'push'],
    default: ['in-app']
  }],
  deliveryStatus: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'read'],
    default: 'pending'
  },
  deliveredAt: Date,
  readAt: Date,
  // Expiration
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientType: 1, type: 1, priority: 1 });
NotificationSchema.index({ deliveryStatus: 1, createdAt: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for notification age
NotificationSchema.virtual('age').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60)); // Hours
});

// Virtual for time until expiration
NotificationSchema.virtual('timeUntilExpiry').get(function() {
  if (!this.expiresAt) return null;
  const diff = this.expiresAt - new Date();
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60)) : 0; // Hours
});

// Method to mark as read
NotificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    this.deliveryStatus = 'read';
    await this.save();
  }
  return this;
};

// Static method to create notification
NotificationSchema.statics.createNotification = async function(notificationData) {
  const notification = new this(notificationData);
  
  // Auto-set expiration if not provided
  if (!notification.expiresAt) {
    const expiration = new Date();
    switch (notification.priority) {
      case 'urgent':
        expiration.setDate(expiration.getDate() + 7); // 1 week
        break;
      case 'high':
        expiration.setDate(expiration.getDate() + 14); // 2 weeks
        break;
      case 'medium':
        expiration.setMonth(expiration.getMonth() + 1); // 1 month
        break;
      case 'low':
        expiration.setMonth(expiration.getMonth() + 3); // 3 months
        break;
    }
    notification.expiresAt = expiration;
  }
  
  return await notification.save();
};

// Static method to get user notifications with pagination
NotificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    type,
    isRead,
    priority,
    page = 1,
    limit = 20,
    sort = { createdAt: -1 }
  } = options;
  
  const match = { recipient: userId };
  
  if (type) match.type = type;
  if (isRead !== undefined) match.isRead = isRead;
  if (priority) match.priority = priority;
  
  const skip = (page - 1) * limit;
  
  const [notifications, total] = await Promise.all([
    this.find(match)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name'),
    this.countDocuments(match)
  ]);
  
  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    }
  };
};

// Static method to mark multiple notifications as read
NotificationSchema.statics.markMultipleAsRead = async function(userId, notificationIds) {
  const result = await this.updateMany(
    { 
      recipient: userId, 
      _id: { $in: notificationIds },
      isRead: false 
    },
    { 
      isRead: true, 
      readAt: new Date(),
      deliveryStatus: 'read'
    }
  );
  
  return result;
};

// Static method to get notification statistics
NotificationSchema.statics.getNotificationStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { recipient: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        actionRequired: { $sum: { $cond: [{ $eq: ['$isActionRequired', true] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || { total: 0, unread: 0, urgent: 0, actionRequired: 0 };
};

// Pre-save hook to set delivery status
NotificationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.deliveryStatus = 'delivered';
    this.deliveredAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);