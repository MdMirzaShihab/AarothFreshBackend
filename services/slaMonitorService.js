const AdminMetrics = require('../models/AdminMetrics');
const SLAConfig = require('../models/SLAConfig');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Restaurant = require('../models/Restaurant');
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const notificationService = require('./notificationService');
const { ErrorResponse } = require('../middleware/error');

class SLAMonitorService {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.pendingTasks = new Map(); // Track pending tasks for SLA monitoring
  }

  /**
   * Start the SLA monitoring service
   * Runs continuous monitoring of pending admin tasks
   */
  async start(intervalMinutes = 30) {
    if (this.isRunning) {
      console.log('SLA Monitor Service is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting SLA Monitor Service (checking every ${intervalMinutes} minutes)`);

    // Initial run
    await this.performMonitoringCycle();

    // Set up recurring monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCycle();
      } catch (error) {
        console.error('Error in SLA monitoring cycle:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the SLA monitoring service
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('SLA Monitor Service stopped');
  }

  /**
   * Perform a complete monitoring cycle
   * Check all pending tasks for SLA compliance
   */
  async performMonitoringCycle() {
    console.log('Starting SLA monitoring cycle at', new Date().toISOString());
    
    try {
      await Promise.all([
        this.checkPendingVerifications(),
        this.checkPendingApprovals(),
        this.checkPendingProductReviews(),
        this.checkPendingListingReviews(),
        this.checkPendingOrderIssues(),
        this.updateAdminMetrics(),
        this.sendSLANotifications()
      ]);

      console.log('SLA monitoring cycle completed successfully');
    } catch (error) {
      console.error('Error in SLA monitoring cycle:', error);
      
      // Log the error to audit log
      await AuditLog.logAction({
        userId: null,
        userRole: 'system',
        action: 'sla_monitoring_error',
        entityType: 'System',
        description: `SLA monitoring cycle failed: ${error.message}`,
        severity: 'high',
        impactLevel: 'significant',
        metadata: {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Check pending vendor and restaurant verifications
   */
  async checkPendingVerifications() {
    const pendingVendors = await Vendor.find({
      verificationStatus: 'pending',
      isDeleted: { $ne: true }
    }).populate('createdBy', 'name email');

    const pendingRestaurants = await Restaurant.find({
      verificationStatus: 'pending',
      isDeleted: { $ne: true }
    }).populate('createdBy', 'name email');

    // Check SLA compliance for each pending item
    await Promise.all([
      ...pendingVendors.map(vendor => this.checkEntitySLA(vendor, 'vendor', 'verification')),
      ...pendingRestaurants.map(restaurant => this.checkEntitySLA(restaurant, 'restaurant', 'verification'))
    ]);
  }

  /**
   * Check pending product and category approvals
   */
  async checkPendingApprovals() {
    const pendingProducts = await Product.find({
      adminStatus: { $in: ['pending', 'flagged'] },
      isDeleted: { $ne: true }
    });

    const pendingCategories = await ProductCategory.find({
      adminStatus: { $in: ['pending', 'flagged'] },
      isDeleted: { $ne: true }
    });

    await Promise.all([
      ...pendingProducts.map(product => this.checkEntitySLA(product, 'product', 'approval')),
      ...pendingCategories.map(category => this.checkEntitySLA(category, 'category', 'approval'))
    ]);
  }

  /**
   * Check pending product reviews
   */
  async checkPendingProductReviews() {
    const productsNeedingReview = await Product.find({
      $or: [
        { lastReviewDate: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        { lastReviewDate: null }
      ],
      isDeleted: { $ne: true }
    });

    await Promise.all(
      productsNeedingReview.map(product => 
        this.checkEntitySLA(product, 'product', 'review', 'medium')
      )
    );
  }

  /**
   * Check pending listing reviews
   */
  async checkPendingListingReviews() {
    const flaggedListings = await Listing.find({
      isFlagged: true,
      isDeleted: { $ne: true }
    });

    await Promise.all(
      flaggedListings.map(listing => 
        this.checkEntitySLA(listing, 'listing', 'review', 'high')
      )
    );
  }

  /**
   * Check pending order-related issues
   */
  async checkPendingOrderIssues() {
    const disputedOrders = await Order.find({
      status: 'disputed',
      disputeDate: { $exists: true }
    });

    await Promise.all(
      disputedOrders.map(order => 
        this.checkEntitySLA(order, 'order', 'dispute_resolution', 'high')
      )
    );
  }

  /**
   * Check SLA compliance for a specific entity
   */
  async checkEntitySLA(entity, entityType, actionType, priority = 'medium') {
    try {
      // Get SLA configuration
      const slaConfig = await SLAConfig.findActiveConfig(entityType, actionType, priority);
      if (!slaConfig) {
        // Use default SLA if no config found
        const defaultTime = SLAConfig.getDefaultSLATime(entityType, actionType, priority);
        return this.createDefaultSLACheck(entity, entityType, actionType, defaultTime);
      }

      // Determine submission date
      let submittedAt = entity.createdAt;
      if (actionType === 'review') {
        submittedAt = entity.lastReviewDate || entity.createdAt;
      } else if (entityType === 'order' && actionType === 'dispute_resolution') {
        submittedAt = entity.disputeDate || entity.createdAt;
      }

      const now = new Date();
      const responseTimeHours = (now - submittedAt) / (1000 * 60 * 60);
      const violationSeverity = slaConfig.getViolationSeverity(submittedAt, now);

      // Handle based on violation severity
      switch (violationSeverity) {
        case 'warning':
          await this.handleSLAWarning(entity, entityType, slaConfig, responseTimeHours);
          break;
        
        case 'violation':
        case 'critical_violation':
          await this.handleSLAViolation(entity, entityType, slaConfig, responseTimeHours, violationSeverity);
          break;
        
        case 'compliant':
          // No action needed, but track for metrics
          break;
      }

      // Update pending tasks tracking
      const taskKey = `${entityType}_${entity._id}_${actionType}`;
      this.pendingTasks.set(taskKey, {
        entity,
        entityType,
        actionType,
        submittedAt,
        slaConfig,
        lastChecked: now,
        violationSeverity
      });

    } catch (error) {
      console.error(`Error checking SLA for ${entityType} ${entity._id}:`, error);
    }
  }

  /**
   * Create a default SLA check when no configuration exists
   */
  async createDefaultSLACheck(entity, entityType, actionType, defaultTimeHours) {
    const submittedAt = entity.createdAt;
    const now = new Date();
    const responseTimeHours = (now - submittedAt) / (1000 * 60 * 60);

    if (responseTimeHours > defaultTimeHours) {
      await this.recordSLAViolation(entity, entityType, actionType, responseTimeHours, defaultTimeHours, 'violation');
    }
  }

  /**
   * Handle SLA warning notifications
   */
  async handleSLAWarning(entity, entityType, slaConfig, responseTimeHours) {
    const taskKey = `${entityType}_${entity._id}_warning`;
    
    // Check if warning already sent (to avoid spam)
    if (this.pendingTasks.has(taskKey + '_sent')) {
      return;
    }

    // Send warning notification
    await this.sendSLANotification('warning', entity, entityType, slaConfig, responseTimeHours);
    
    // Mark warning as sent
    this.pendingTasks.set(taskKey + '_sent', true);
    
    console.log(`SLA Warning sent for ${entityType} ${entity._id}`);
  }

  /**
   * Handle SLA violations
   */
  async handleSLAViolation(entity, entityType, slaConfig, responseTimeHours, severity) {
    // Record the violation
    await this.recordSLAViolation(
      entity, 
      entityType, 
      slaConfig.actionType, 
      responseTimeHours, 
      slaConfig.timeTargets.targetTime,
      severity === 'critical_violation' ? 'critical_violation' : 'late_approval'
    );

    // Send violation notification
    await this.sendSLANotification('violation', entity, entityType, slaConfig, responseTimeHours);

    // Trigger escalation if configured
    if (slaConfig.escalation.enabled && severity === 'critical_violation') {
      await this.triggerEscalation(entity, entityType, slaConfig);
    }

    console.log(`SLA Violation recorded for ${entityType} ${entity._id} - Severity: ${severity}`);
  }

  /**
   * Record SLA violation in admin metrics
   */
  async recordSLAViolation(entity, entityType, actionType, responseTime, slaTarget, violationType) {
    // Find the current period's metrics for system tracking
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Create violation record
    const violation = {
      entityType,
      entityId: entity._id,
      submittedAt: entity.createdAt,
      actionTakenAt: new Date(),
      responseTime,
      slaTarget,
      violationType,
      severityLevel: responseTime > (slaTarget * 2) ? 'high' : 'medium',
      businessImpact: this.calculateBusinessImpact(entityType, responseTime, slaTarget)
    };

    // Log to audit system
    await AuditLog.logAction({
      userId: null,
      userRole: 'system',
      action: 'sla_violation_detected',
      entityType: entityType.charAt(0).toUpperCase() + entityType.slice(1),
      entityId: entity._id,
      description: `SLA violation detected: ${entityType} ${actionType} exceeded target by ${(responseTime - slaTarget).toFixed(1)} hours`,
      severity: violation.severityLevel,
      impactLevel: violation.businessImpact,
      metadata: {
        violation,
        entityName: entity.name || entity.businessName || entity._id,
        exceedanceHours: responseTime - slaTarget
      }
    });

    // Update system-wide violation tracking (we can create a system admin metrics entry)
    // In a production system, you'd want to track this per responsible admin
    return violation;
  }

  /**
   * Calculate business impact based on entity type and delay
   */
  calculateBusinessImpact(entityType, responseTime, slaTarget) {
    const exceedanceRatio = responseTime / slaTarget;
    
    const impactMap = {
      vendor: {
        minor: 1.2,
        moderate: 2.0,
        significant: 3.0
      },
      restaurant: {
        minor: 1.2,
        moderate: 2.0,
        significant: 3.0
      },
      order: {
        minor: 1.1,
        moderate: 1.5,
        significant: 2.0
      },
      listing: {
        minor: 1.5,
        moderate: 2.5,
        significant: 4.0
      }
    };

    const thresholds = impactMap[entityType] || impactMap.listing;
    
    if (exceedanceRatio < thresholds.minor) return 'minor';
    if (exceedanceRatio < thresholds.moderate) return 'moderate';
    if (exceedanceRatio < thresholds.significant) return 'significant';
    return 'critical';
  }

  /**
   * Send SLA notifications
   */
  async sendSLANotification(notificationType, entity, entityType, slaConfig, responseTimeHours) {
    try {
      const recipients = this.determineNotificationRecipients(slaConfig, notificationType);
      const notificationConfig = slaConfig.notifications[notificationType];

      if (!notificationConfig.enabled || recipients.length === 0) {
        return;
      }

      const entityName = entity.name || entity.businessName || `${entityType} ${entity._id}`;
      const exceedanceHours = responseTimeHours - slaConfig.timeTargets.targetTime;

      const notificationData = {
        type: notificationType,
        entityType,
        entityName,
        entityId: entity._id,
        responseTime: responseTimeHours.toFixed(1),
        targetTime: slaConfig.timeTargets.targetTime,
        exceedanceHours: exceedanceHours.toFixed(1),
        priority: slaConfig.priority,
        actionType: slaConfig.actionType
      };

      // Send notifications through configured channels
      for (const channel of notificationConfig.channels) {
        for (const recipient of recipients) {
          await this.sendNotificationViaChannel(channel, recipient, notificationData);
        }
      }

    } catch (error) {
      console.error('Error sending SLA notification:', error);
    }
  }

  /**
   * Determine notification recipients based on configuration
   */
  determineNotificationRecipients(slaConfig, notificationType) {
    const config = slaConfig.notifications[notificationType];
    const recipients = [];

    for (const recipientType of config.recipients) {
      if (recipientType === 'admin' || recipientType === 'assignee') {
        // In a production system, you'd determine the specific assigned admin
        recipients.push('admin@aarothfresh.com');
      } else if (recipientType === 'manager') {
        recipients.push('manager@aarothfresh.com');
      } else if (recipientType.includes('@')) {
        // Direct email address
        recipients.push(recipientType);
      }
    }

    return recipients;
  }

  /**
   * Send notification via specific channel
   */
  async sendNotificationViaChannel(channel, recipient, data) {
    try {
      switch (channel) {
        case 'email':
          await notificationService.sendSLANotificationEmail(recipient, data);
          break;
        
        case 'system':
          await notificationService.createSystemNotification(recipient, data);
          break;
        
        case 'sms':
          // Implement SMS notification if service is available
          console.log('SMS notification not implemented yet');
          break;
        
        case 'slack':
          // Implement Slack notification if service is configured
          console.log('Slack notification not implemented yet');
          break;
        
        default:
          console.log(`Unsupported notification channel: ${channel}`);
      }
    } catch (error) {
      console.error(`Error sending notification via ${channel}:`, error);
    }
  }

  /**
   * Trigger escalation process
   */
  async triggerEscalation(entity, entityType, slaConfig) {
    try {
      const escalationChain = slaConfig.escalation.escalationChain;
      if (!escalationChain || escalationChain.length === 0) {
        return;
      }

      // Find the next escalation level
      const currentLevel = 1; // Start with first escalation level
      const escalationLevel = escalationChain.find(level => level.level === currentLevel);

      if (escalationLevel) {
        console.log(`Triggering escalation level ${currentLevel} for ${entityType} ${entity._id}`);

        // Log escalation
        await AuditLog.logAction({
          userId: null,
          userRole: 'system',
          action: 'sla_escalation_triggered',
          entityType: entityType.charAt(0).toUpperCase() + entityType.slice(1),
          entityId: entity._id,
          description: `SLA escalation triggered to ${escalationLevel.roleRequired}`,
          severity: 'high',
          impactLevel: 'significant',
          metadata: {
            escalationLevel: currentLevel,
            roleRequired: escalationLevel.roleRequired,
            entityName: entity.name || entity.businessName,
            autoEscalated: slaConfig.escalation.autoEscalate
          }
        });

        // Send escalation notifications
        const escalationData = {
          type: 'escalation',
          entityType,
          entityName: entity.name || entity.businessName,
          entityId: entity._id,
          escalationLevel: currentLevel,
          roleRequired: escalationLevel.roleRequired,
          priority: slaConfig.priority
        };

        for (const channel of escalationLevel.notificationChannels) {
          await this.sendNotificationViaChannel(channel, escalationLevel.roleRequired, escalationData);
        }
      }

    } catch (error) {
      console.error('Error triggering escalation:', error);
    }
  }

  /**
   * Update admin metrics with current period data
   */
  async updateAdminMetrics() {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Get all admins who have taken actions in the current period
      const adminActions = await AuditLog.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(currentPeriod + '-01'),
              $lt: new Date(new Date(currentPeriod + '-01').getFullYear(), new Date(currentPeriod + '-01').getMonth() + 1, 1)
            },
            userId: { $exists: true, $ne: null },
            userRole: 'admin'
          }
        },
        {
          $group: {
            _id: '$userId',
            totalActions: { $sum: 1 },
            approvals: {
              $sum: {
                $cond: [
                  { $in: ['$action', ['vendor_verified', 'restaurant_verified', 'product_approved', 'listing_approved']] },
                  1, 0
                ]
              }
            },
            rejections: {
              $sum: {
                $cond: [
                  { $in: ['$action', ['vendor_verification_revoked', 'restaurant_verification_revoked', 'product_rejected']] },
                  1, 0
                ]
              }
            }
          }
        }
      ]);

      // Update or create metrics for each admin
      for (const adminAction of adminActions) {
        await this.updateAdminMetricsRecord(adminAction._id, adminAction, currentPeriod);
      }

      console.log(`Updated metrics for ${adminActions.length} admins`);
    } catch (error) {
      console.error('Error updating admin metrics:', error);
    }
  }

  /**
   * Update or create admin metrics record
   */
  async updateAdminMetricsRecord(adminId, actionData, period) {
    try {
      let metrics = await AdminMetrics.findByAdminAndPeriod(adminId, period, 'monthly');

      if (!metrics) {
        // Create new metrics record
        metrics = new AdminMetrics({
          adminId,
          period,
          periodType: 'monthly'
        });
      }

      // Update core metrics
      metrics.metrics.totalActions = actionData.totalActions;
      metrics.metrics.approvals = actionData.approvals;
      metrics.metrics.rejections = actionData.rejections;

      // Calculate approval rate
      const totalDecisions = actionData.approvals + actionData.rejections;
      if (totalDecisions > 0) {
        metrics.metrics.approvalRate = (actionData.approvals / totalDecisions) * 100;
      }

      // Calculate average response time from recent audit logs
      const recentActions = await AuditLog.find({
        userId: adminId,
        createdAt: { $gte: new Date(period + '-01') }
      }).sort({ createdAt: 1 }).limit(50);

      if (recentActions.length > 1) {
        const responseTimes = [];
        for (let i = 1; i < recentActions.length; i++) {
          const timeDiff = (recentActions[i].createdAt - recentActions[i-1].createdAt) / (1000 * 60 * 60);
          if (timeDiff > 0 && timeDiff < 168) { // Less than a week
            responseTimes.push(timeDiff);
          }
        }
        
        if (responseTimes.length > 0) {
          metrics.metrics.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }
      }

      // Update SLA compliance (would need more sophisticated tracking in production)
      metrics.slaPerformance.totalSLATargets = actionData.totalActions;
      metrics.slaPerformance.metSLATargets = Math.floor(actionData.totalActions * 0.85); // Simplified assumption
      metrics.slaPerformance.slaComplianceRate = (metrics.slaPerformance.metSLATargets / metrics.slaPerformance.totalSLATargets) * 100;

      metrics.lastUpdated = new Date();
      await metrics.save();

    } catch (error) {
      console.error(`Error updating metrics for admin ${adminId}:`, error);
    }
  }

  /**
   * Send periodic SLA notifications summary
   */
  async sendSLANotifications() {
    try {
      // This could send daily/weekly summary reports
      // Implementation would depend on notification service capabilities
      console.log('SLA notifications summary would be sent here');
    } catch (error) {
      console.error('Error sending SLA notifications:', error);
    }
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pendingTasks: this.pendingTasks.size,
      lastCycle: this.lastCycle,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Initialize default SLA configurations if none exist
   */
  async initializeDefaultConfigs(adminId) {
    try {
      const configCount = await SLAConfig.countDocuments({ isActive: true });
      
      if (configCount === 0) {
        console.log('No SLA configurations found, creating defaults...');
        await SLAConfig.bulkCreateDefaults(adminId);
        console.log('Default SLA configurations created');
      }
    } catch (error) {
      console.error('Error initializing default SLA configs:', error);
    }
  }
}

// Create and export singleton instance
const slaMonitorService = new SLAMonitorService();

module.exports = slaMonitorService;