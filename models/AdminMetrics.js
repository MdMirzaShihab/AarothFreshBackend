const mongoose = require('mongoose');

const SLAViolationSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['vendor', 'restaurant', 'product', 'category', 'listing', 'order']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  submittedAt: {
    type: Date,
    required: true
  },
  actionTakenAt: {
    type: Date,
    required: true
  },
  responseTime: {
    type: Number, // in hours
    required: true
  },
  slaTarget: {
    type: Number, // in hours  
    required: true
  },
  violationType: {
    type: String,
    required: true,
    enum: ['late_approval', 'missed_deadline', 'escalation_triggered', 'weekend_delay']
  },
  severityLevel: {
    type: String,
    default: 'medium',
    enum: ['low', 'medium', 'high', 'critical']
  },
  businessImpact: {
    type: String,
    enum: ['minor', 'moderate', 'significant', 'critical']
  }
}, { _id: false });

const AdminMetricsSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    type: String, // "2024-01" for monthly, "2024-01-15" for daily
    required: true
  },
  periodType: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'monthly'
  },
  
  // Core Performance Metrics
  metrics: {
    totalActions: {
      type: Number,
      default: 0
    },
    approvals: {
      type: Number,
      default: 0
    },
    rejections: {
      type: Number,
      default: 0
    },
    avgResponseTime: {
      type: Number, // in hours
      default: 0
    },
    medianResponseTime: {
      type: Number, // in hours
      default: 0
    },
    lateActions: {
      type: Number,
      default: 0
    },
    approvalRate: {
      type: Number, // percentage (0-100)
      default: 0
    },
    
    // Detailed Action Breakdown
    actionBreakdown: {
      vendorApprovals: { type: Number, default: 0 },
      vendorRejections: { type: Number, default: 0 },
      restaurantApprovals: { type: Number, default: 0 },
      restaurantRejections: { type: Number, default: 0 },
      productActions: { type: Number, default: 0 },
      categoryActions: { type: Number, default: 0 },
      listingActions: { type: Number, default: 0 },
      userManagement: { type: Number, default: 0 }
    },
    
    // Quality Metrics
    qualityMetrics: {
      reprocessingRate: { type: Number, default: 0 }, // Actions requiring revision
      complaintsReceived: { type: Number, default: 0 },
      positiveStarRatings: { type: Number, default: 0 },
      escalationsReceived: { type: Number, default: 0 }
    }
  },
  
  // SLA Performance
  slaPerformance: {
    totalSLATargets: {
      type: Number,
      default: 0
    },
    metSLATargets: {
      type: Number,
      default: 0
    },
    slaComplianceRate: {
      type: Number, // percentage (0-100)
      default: 0
    },
    avgExceedanceTime: {
      type: Number, // hours over SLA on violations
      default: 0
    }
  },
  
  // SLA Violations Detail
  slaViolations: [SLAViolationSchema],
  
  // Workload Analysis
  workloadAnalysis: {
    peakHours: [{
      hour: { type: Number, min: 0, max: 23 },
      actionCount: { type: Number, default: 0 }
    }],
    dailyDistribution: [{
      dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
      actionCount: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 }
    }]
  },
  
  // Performance Trends
  trends: {
    responseTimeImprovement: {
      type: Number, // percentage change from previous period
      default: 0
    },
    approvalRateChange: {
      type: Number, // percentage change from previous period
      default: 0
    },
    workloadChange: {
      type: Number, // percentage change in total actions
      default: 0
    }
  },
  
  // Metadata
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  calculationVersion: {
    type: String,
    default: '1.0' // For tracking calculation method changes
  },
  
  // Performance Grade (A, B, C, D, F)
  performanceGrade: {
    overall: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
      default: 'C'
    },
    responseTime: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
      default: 'C'
    },
    slaCompliance: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
      default: 'C'
    },
    qualityScore: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
      default: 'C'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
AdminMetricsSchema.index({ adminId: 1, period: 1, periodType: 1 }, { unique: true });
AdminMetricsSchema.index({ period: 1, periodType: 1 });
AdminMetricsSchema.index({ 'metrics.approvalRate': -1 });
AdminMetricsSchema.index({ 'slaPerformance.slaComplianceRate': -1 });
AdminMetricsSchema.index({ calculatedAt: -1 });

// Virtuals
AdminMetricsSchema.virtual('overallPerformanceScore').get(function() {
  const weights = {
    approvalRate: 0.3,
    slaCompliance: 0.4,
    responseTime: 0.2,
    qualityMetrics: 0.1
  };
  
  const scores = {
    approvalRate: this.metrics.approvalRate || 0,
    slaCompliance: this.slaPerformance.slaComplianceRate || 0,
    responseTime: Math.max(0, 100 - (this.metrics.avgResponseTime * 2)), // Lower is better
    qualityMetrics: Math.max(0, 100 - (this.metrics.qualityMetrics.complaintsReceived * 10))
  };
  
  return Object.keys(weights).reduce((total, key) => {
    return total + (scores[key] * weights[key]);
  }, 0);
});

AdminMetricsSchema.virtual('isHighPerformer').get(function() {
  return this.overallPerformanceScore >= 85 && 
         this.slaPerformance.slaComplianceRate >= 90 &&
         this.metrics.approvalRate >= 80;
});

AdminMetricsSchema.virtual('needsImprovement').get(function() {
  return this.overallPerformanceScore < 70 || 
         this.slaPerformance.slaComplianceRate < 75 ||
         this.metrics.avgResponseTime > 24; // More than 24 hours
});

// Static methods
AdminMetricsSchema.statics.findByAdminAndPeriod = function(adminId, period, periodType = 'monthly') {
  return this.findOne({ adminId, period, periodType });
};

AdminMetricsSchema.statics.getTopPerformers = function(periodType = 'monthly', limit = 10) {
  return this.find({ periodType })
    .populate('adminId', 'name email')
    .sort({ 'metrics.approvalRate': -1, 'slaPerformance.slaComplianceRate': -1 })
    .limit(limit);
};

AdminMetricsSchema.statics.getPerformanceTrends = function(adminId, periods = 6) {
  return this.find({ adminId })
    .sort({ period: -1 })
    .limit(periods)
    .select('period metrics.approvalRate slaPerformance.slaComplianceRate metrics.avgResponseTime overallPerformanceScore');
};

// Instance methods
AdminMetricsSchema.methods.calculatePerformanceGrade = function() {
  const scoreToGrade = (score) => {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'B+';
    if (score >= 87) return 'B';
    if (score >= 83) return 'C+';
    if (score >= 80) return 'C';
    if (score >= 70) return 'D';
    return 'F';
  };
  
  this.performanceGrade.overall = scoreToGrade(this.overallPerformanceScore);
  this.performanceGrade.responseTime = scoreToGrade(Math.max(0, 100 - (this.metrics.avgResponseTime * 2)));
  this.performanceGrade.slaCompliance = scoreToGrade(this.slaPerformance.slaComplianceRate);
  this.performanceGrade.qualityScore = scoreToGrade(
    Math.max(0, 100 - (this.metrics.qualityMetrics.complaintsReceived * 10))
  );
  
  return this.performanceGrade;
};

AdminMetricsSchema.methods.addSLAViolation = function(violation) {
  this.slaViolations.push(violation);
  this.metrics.lateActions = this.slaViolations.length;
  this.slaPerformance.totalSLATargets++;
  
  // Recalculate SLA compliance rate
  if (this.slaPerformance.totalSLATargets > 0) {
    this.slaPerformance.slaComplianceRate = 
      ((this.slaPerformance.totalSLATargets - this.metrics.lateActions) / this.slaPerformance.totalSLATargets) * 100;
  }
  
  return this.save();
};

AdminMetricsSchema.methods.updateMetrics = function(newActionData) {
  // Update core metrics
  this.metrics.totalActions++;
  
  if (newActionData.actionType === 'approval') {
    this.metrics.approvals++;
  } else if (newActionData.actionType === 'rejection') {
    this.metrics.rejections++;
  }
  
  // Update approval rate
  const totalDecisions = this.metrics.approvals + this.metrics.rejections;
  if (totalDecisions > 0) {
    this.metrics.approvalRate = (this.metrics.approvals / totalDecisions) * 100;
  }
  
  // Update average response time
  const currentTotal = (this.metrics.avgResponseTime * (this.metrics.totalActions - 1));
  this.metrics.avgResponseTime = (currentTotal + newActionData.responseTime) / this.metrics.totalActions;
  
  // Update SLA performance
  this.slaPerformance.totalSLATargets++;
  if (newActionData.responseTime <= newActionData.slaTarget) {
    this.slaPerformance.metSLATargets++;
  }
  
  this.slaPerformance.slaComplianceRate = 
    (this.slaPerformance.metSLATargets / this.slaPerformance.totalSLATargets) * 100;
    
  this.lastUpdated = new Date();
  
  return this.save();
};

// Pre-save middleware
AdminMetricsSchema.pre('save', function(next) {
  // Calculate performance grades before saving
  this.calculatePerformanceGrade();
  next();
});

module.exports = mongoose.model('AdminMetrics', AdminMetricsSchema);