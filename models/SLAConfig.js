const mongoose = require('mongoose');

const SLAConfigSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['vendor', 'restaurant', 'product', 'category', 'listing', 'order', 'user_query']
  },
  actionType: {
    type: String,
    required: true,
    enum: [
      'verification', 'approval', 'rejection', 'review', 'update',
      'deletion', 'suspension', 'reactivation', 'escalation',
      'dispute_resolution', 'compliance_check'
    ]
  },
  priority: {
    type: String,
    required: true,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  
  // SLA Time Targets (in hours)
  timeTargets: {
    targetTime: {
      type: Number,
      required: true,
      min: 0.25 // 15 minutes minimum
    },
    warningTime: {
      type: Number, // Time before target to send warning
      required: true,
      validate: {
        validator: function(value) {
          return value < this.timeTargets.targetTime;
        },
        message: 'Warning time must be less than target time'
      }
    },
    escalationTime: {
      type: Number, // Time after target to escalate
      required: true,
      validate: {
        validator: function(value) {
          return value > this.timeTargets.targetTime;
        },
        message: 'Escalation time must be greater than target time'
      }
    },
    criticalTime: {
      type: Number, // Time when it becomes critical
      required: true,
      validate: {
        validator: function(value) {
          return value > this.timeTargets.escalationTime;
        },
        message: 'Critical time must be greater than escalation time'
      }
    }
  },
  
  // Business Hours Configuration
  businessHours: {
    enabled: {
      type: Boolean,
      default: true
    },
    timezone: {
      type: String,
      default: 'Asia/Dhaka'
    },
    workingDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    startTime: {
      type: String, // "09:00"
      default: '09:00'
    },
    endTime: {
      type: String, // "18:00"
      default: '18:00'
    },
    holidayMultiplier: {
      type: Number, // Multiply SLA times by this factor on holidays
      default: 1.5,
      min: 1
    }
  },
  
  // Escalation Configuration
  escalation: {
    enabled: {
      type: Boolean,
      default: true
    },
    autoEscalate: {
      type: Boolean,
      default: false
    },
    escalationChain: [{
      level: {
        type: Number,
        required: true,
        min: 1
      },
      roleRequired: {
        type: String,
        required: true,
        enum: ['admin', 'senior_admin', 'manager', 'director', 'system_admin']
      },
      notificationChannels: [{
        type: String,
        enum: ['email', 'sms', 'push', 'slack', 'system']
      }],
      timeToEscalateToNext: {
        type: Number, // hours
        default: 4
      }
    }],
    maxEscalationLevel: {
      type: Number,
      default: 3,
      min: 1
    }
  },
  
  // Auto-resolution Rules
  autoResolution: {
    enabled: {
      type: Boolean,
      default: false
    },
    conditions: [{
      conditionType: {
        type: String,
        enum: ['timeout', 'no_response', 'dependency_resolved', 'system_trigger']
      },
      timeToResolve: {
        type: Number, // hours
        required: true
      },
      resolutionAction: {
        type: String,
        enum: ['approve', 'reject', 'escalate', 'postpone', 'archive']
      },
      requiresConfirmation: {
        type: Boolean,
        default: true
      }
    }]
  },
  
  // Performance Tracking
  performance: {
    trackResponseTime: {
      type: Boolean,
      default: true
    },
    trackQuality: {
      type: Boolean,
      default: true
    },
    qualityMetrics: [{
      metricName: {
        type: String,
        required: true
      },
      weight: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.1
      },
      targetValue: {
        type: Number,
        required: true
      }
    }],
    complianceTarget: {
      type: Number, // percentage
      default: 95,
      min: 50,
      max: 100
    }
  },
  
  // Notification Configuration
  notifications: {
    warning: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['email', 'sms', 'push', 'slack', 'system']
      }],
      recipients: [{
        type: String, // 'assignee', 'manager', 'admin', or specific email
        required: true
      }],
      template: {
        type: String,
        default: 'sla_warning_default'
      }
    },
    violation: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: [{
        type: String,
        enum: ['email', 'sms', 'push', 'slack', 'system']
      }],
      recipients: [{
        type: String,
        required: true
      }],
      template: {
        type: String,
        default: 'sla_violation_default'
      }
    }
  },
  
  // Configuration Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: String,
    default: '1.0'
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null // null means no expiry
  },
  
  // Audit Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  
  // Change History
  changeHistory: [{
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changeDate: {
      type: Date,
      default: Date.now
    },
    changeType: {
      type: String,
      enum: ['created', 'updated', 'activated', 'deactivated', 'approved'],
      required: true
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed
    },
    changeReason: {
      type: String
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SLAConfigSchema.index({ entityType: 1, actionType: 1, priority: 1 }, { unique: true });
SLAConfigSchema.index({ isActive: 1, effectiveDate: 1 });
SLAConfigSchema.index({ 'timeTargets.targetTime': 1 });
SLAConfigSchema.index({ priority: 1 });

// Virtuals
SLAConfigSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

SLAConfigSchema.virtual('isEffective').get(function() {
  const now = new Date();
  return this.isActive && 
         this.effectiveDate <= now && 
         (!this.expiryDate || this.expiryDate > now);
});

SLAConfigSchema.virtual('configurationId').get(function() {
  return `${this.entityType}_${this.actionType}_${this.priority}`;
});

// Static methods
SLAConfigSchema.statics.findActiveConfig = function(entityType, actionType, priority = 'medium') {
  return this.findOne({
    entityType,
    actionType,
    priority,
    isActive: true,
    effectiveDate: { $lte: new Date() },
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  });
};

SLAConfigSchema.statics.getDefaultSLATime = function(entityType, actionType, priority = 'medium') {
  // Default SLA times in hours based on entity type and priority
  const defaults = {
    vendor: {
      verification: { critical: 2, high: 8, medium: 24, low: 72 },
      approval: { critical: 1, high: 4, medium: 12, low: 48 }
    },
    restaurant: {
      verification: { critical: 2, high: 8, medium: 24, low: 72 },
      approval: { critical: 1, high: 4, medium: 12, low: 48 }
    },
    product: {
      review: { critical: 4, high: 12, medium: 48, low: 168 },
      approval: { critical: 2, high: 8, medium: 24, low: 72 }
    },
    listing: {
      review: { critical: 2, high: 4, medium: 12, low: 24 },
      approval: { critical: 1, high: 2, medium: 8, low: 24 }
    }
  };
  
  return defaults[entityType]?.[actionType]?.[priority] || 24;
};

SLAConfigSchema.statics.bulkCreateDefaults = async function(createdBy) {
  const defaultConfigs = [
    // Vendor configurations
    {
      entityType: 'vendor',
      actionType: 'verification',
      priority: 'high',
      timeTargets: { targetTime: 8, warningTime: 6, escalationTime: 12, criticalTime: 24 }
    },
    {
      entityType: 'vendor',
      actionType: 'verification',
      priority: 'medium',
      timeTargets: { targetTime: 24, warningTime: 18, escalationTime: 36, criticalTime: 72 }
    },
    // Restaurant configurations  
    {
      entityType: 'restaurant',
      actionType: 'verification',
      priority: 'high',
      timeTargets: { targetTime: 8, warningTime: 6, escalationTime: 12, criticalTime: 24 }
    },
    {
      entityType: 'restaurant',
      actionType: 'verification',
      priority: 'medium',
      timeTargets: { targetTime: 24, warningTime: 18, escalationTime: 36, criticalTime: 72 }
    }
  ];
  
  const configs = defaultConfigs.map(config => ({
    ...config,
    createdBy,
    escalation: {
      enabled: true,
      escalationChain: [
        {
          level: 1,
          roleRequired: 'admin',
          notificationChannels: ['email', 'system'],
          timeToEscalateToNext: 4
        },
        {
          level: 2,
          roleRequired: 'senior_admin',
          notificationChannels: ['email', 'sms', 'system'],
          timeToEscalateToNext: 8
        }
      ]
    },
    notifications: {
      warning: {
        enabled: true,
        channels: ['email', 'system'],
        recipients: ['assignee', 'manager']
      },
      violation: {
        enabled: true,
        channels: ['email', 'system'],
        recipients: ['assignee', 'manager', 'admin']
      }
    }
  }));
  
  return this.insertMany(configs, { ordered: false });
};

// Instance methods
SLAConfigSchema.methods.calculateSLATarget = function(submittedAt = new Date(), considerBusinessHours = true) {
  let targetTime = this.timeTargets.targetTime;
  
  if (considerBusinessHours && this.businessHours.enabled) {
    // Adjust for business hours calculation
    // This is a simplified version - in production, you'd want a more sophisticated business hours calculator
    const businessDaysOnly = this.businessHours.workingDays.length < 7;
    if (businessDaysOnly) {
      const weekendDays = 7 - this.businessHours.workingDays.length;
      const weekendAdjustment = (weekendDays / 7) * targetTime;
      targetTime += weekendAdjustment;
    }
  }
  
  const targetDate = new Date(submittedAt.getTime() + (targetTime * 60 * 60 * 1000));
  return targetDate;
};

SLAConfigSchema.methods.isViolation = function(submittedAt, actionTakenAt = new Date()) {
  const targetDate = this.calculateSLATarget(submittedAt);
  return actionTakenAt > targetDate;
};

SLAConfigSchema.methods.getViolationSeverity = function(submittedAt, actionTakenAt = new Date()) {
  const responseTimeHours = (actionTakenAt - submittedAt) / (1000 * 60 * 60);
  
  if (responseTimeHours <= this.timeTargets.targetTime) {
    return 'compliant';
  } else if (responseTimeHours <= this.timeTargets.escalationTime) {
    return 'warning';
  } else if (responseTimeHours <= this.timeTargets.criticalTime) {
    return 'violation';
  } else {
    return 'critical_violation';
  }
};

SLAConfigSchema.methods.addToHistory = function(changeType, changedBy, changeReason, previousValues) {
  this.changeHistory.push({
    changedBy,
    changeType,
    changeReason,
    previousValues
  });
  
  this.updatedBy = changedBy;
  return this;
};

// Pre-save middleware
SLAConfigSchema.pre('save', function(next) {
  // Validate time targets logic
  const { targetTime, warningTime, escalationTime, criticalTime } = this.timeTargets;
  
  if (warningTime >= targetTime) {
    return next(new Error('Warning time must be less than target time'));
  }
  if (escalationTime <= targetTime) {
    return next(new Error('Escalation time must be greater than target time'));
  }
  if (criticalTime <= escalationTime) {
    return next(new Error('Critical time must be greater than escalation time'));
  }
  
  next();
});

module.exports = mongoose.model('SLAConfig', SLAConfigSchema);