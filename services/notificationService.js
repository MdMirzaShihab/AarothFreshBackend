const Notification = require('../models/Notification');
const User = require('../models/User');
const Order = require('../models/Order');
const Listing = require('../models/Listing');

class NotificationService {
  /**
   * Create and send a notification
   */
  static async createNotification({
    recipientId,
    recipientType,
    type,
    title,
    message,
    priority = 'medium',
    isActionRequired = false,
    actionUrl,
    actionText,
    relatedEntity,
    metadata = {},
    deliveryChannel = ['in-app'],
    createdBy
  }) {
    try {
      const notification = await Notification.createNotification({
        recipient: recipientId,
        recipientType,
        type,
        title,
        message,
        priority,
        isActionRequired,
        actionUrl,
        actionText,
        relatedEntity,
        metadata,
        deliveryChannel,
        createdBy
      });

      // Here you could integrate with external services for email/SMS/push notifications
      // await this.sendExternalNotifications(notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create order-related notifications
   */
  static async createOrderNotification(order, event, additionalData = {}) {
    const notifications = [];

    switch (event) {
      case 'order_placed':
        // Notify vendor
        notifications.push({
          recipientId: order.vendorId,
          recipientType: 'vendor',
          type: 'order',
          title: 'New Order Received',
          message: `New order #${order.orderNumber} from ${additionalData.buyerName || 'buyer'}`,
          priority: 'high',
          isActionRequired: true,
          actionUrl: `/vendor-dashboard/order-management?orderId=${order._id}`,
          actionText: 'View Order',
          relatedEntity: {
            entityType: 'order',
            entityId: order._id,
            entityData: {
              orderNumber: order.orderNumber,
              amount: order.totalAmount,
              status: order.status
            }
          }
        });
        break;

      case 'order_confirmed':
        // Notify restaurant
        const restaurant = await User.findOne({ buyerId: order.buyerId });
        if (restaurant) {
          notifications.push({
            recipientId: restaurant._id,
            recipientType: restaurant.role,
            type: 'order',
            title: 'Order Confirmed',
            message: `Order #${order.orderNumber} has been confirmed by the vendor`,
            priority: 'medium',
            actionUrl: `/buyer-dashboard/order-history?orderId=${order._id}`,
            actionText: 'View Order',
            relatedEntity: {
              entityType: 'order',
              entityId: order._id,
              entityData: {
                orderNumber: order.orderNumber,
                amount: order.totalAmount,
                status: order.status
              }
            }
          });
        }
        break;

      case 'order_delivered':
        // Notify restaurant
        const buyerUser = await User.findOne({ buyerId: order.buyerId });
        if (buyerUser) {
          notifications.push({
            recipientId: buyerUser._id,
            recipientType: buyerUser.role,
            type: 'order',
            title: 'Order Delivered',
            message: `Order #${order.orderNumber} has been delivered successfully`,
            priority: 'low',
            actionUrl: `/buyer-dashboard/order-history?orderId=${order._id}`,
            actionText: 'View Order',
            relatedEntity: {
              entityType: 'order',
              entityId: order._id,
              entityData: {
                orderNumber: order.orderNumber,
                amount: order.totalAmount,
                status: order.status
              }
            }
          });
        }
        break;

      case 'order_cancelled':
        // Notify both parties
        const vendorUser = await User.findOne({ vendorId: order.vendorId });
        const buyerOwner = await User.findOne({ buyerId: order.buyerId });

        if (vendorUser) {
          notifications.push({
            recipientId: vendorUser._id,
            recipientType: 'vendor',
            type: 'order',
            title: 'Order Cancelled',
            message: `Order #${order.orderNumber} has been cancelled`,
            priority: 'medium',
            relatedEntity: {
              entityType: 'order',
              entityId: order._id,
              entityData: {
                orderNumber: order.orderNumber,
                amount: order.totalAmount,
                status: order.status,
                cancelReason: additionalData.cancelReason
              }
            }
          });
        }

        if (buyerOwner) {
          notifications.push({
            recipientId: buyerOwner._id,
            recipientType: buyerOwner.role,
            type: 'order',
            title: 'Order Cancelled',
            message: `Order #${order.orderNumber} has been cancelled`,
            priority: 'medium',
            relatedEntity: {
              entityType: 'order',
              entityId: order._id,
              entityData: {
                orderNumber: order.orderNumber,
                amount: order.totalAmount,
                status: order.status,
                cancelReason: additionalData.cancelReason
              }
            }
          });
        }
        break;
    }

    // Create all notifications
    for (const notificationData of notifications) {
      await this.createNotification(notificationData);
    }

    return notifications;
  }

  /**
   * Create inventory-related notifications
   */
  static async createInventoryNotification(listing, event, additionalData = {}) {
    const vendorUser = await User.findOne({ vendorId: listing.vendorId });
    if (!vendorUser) return;

    let notificationData = {
      recipientId: vendorUser._id,
      recipientType: 'vendor',
      type: 'inventory',
      relatedEntity: {
        entityType: 'listing',
        entityId: listing._id,
        entityData: {
          productName: additionalData.productName || 'Product',
          currentStock: listing.availability.quantityAvailable,
          unit: listing.availability.unit
        }
      }
    };

    switch (event) {
      case 'low_stock':
        notificationData = {
          ...notificationData,
          title: 'Low Stock Alert',
          message: `${additionalData.productName || 'Product'} is running low (${listing.availability.quantityAvailable} ${listing.availability.unit} remaining)`,
          priority: 'high',
          isActionRequired: true,
          actionUrl: `/inventory?listingId=${listing._id}`,
          actionText: 'Update Stock'
        };
        break;

      case 'out_of_stock':
        notificationData = {
          ...notificationData,
          title: 'Out of Stock Alert',
          message: `${additionalData.productName || 'Product'} is out of stock`,
          priority: 'urgent',
          isActionRequired: true,
          actionUrl: `/inventory?listingId=${listing._id}`,
          actionText: 'Restock Item'
        };
        break;

      case 'stock_updated':
        notificationData = {
          ...notificationData,
          title: 'Stock Updated',
          message: `${additionalData.productName || 'Product'} stock has been updated to ${listing.availability.quantityAvailable} ${listing.availability.unit}`,
          priority: 'low'
        };
        break;
    }

    return await this.createNotification(notificationData);
  }

  /**
   * Create budget-related notifications for buyers
   */
  static async createBudgetNotification(buyerId, event, data) {
    const buyerOwner = await User.findOne({ buyerId, role: 'buyerOwner' });
    if (!buyerOwner) return;

    let notificationData = {
      recipientId: buyerOwner._id,
      recipientType: 'buyerOwner',
      type: 'budget',
      metadata: data
    };

    switch (event) {
      case 'budget_warning':
        notificationData = {
          ...notificationData,
          title: 'Budget Warning',
          message: `You've used ${data.percentageUsed}% of your ${data.period} budget`,
          priority: data.percentageUsed > 90 ? 'high' : 'medium',
          isActionRequired: data.percentageUsed > 90,
          actionUrl: '/buyer-dashboard/budget',
          actionText: 'View Budget'
        };
        break;

      case 'budget_exceeded':
        notificationData = {
          ...notificationData,
          title: 'Budget Exceeded',
          message: `You've exceeded your ${data.period} budget by ${data.overageAmount}`,
          priority: 'urgent',
          isActionRequired: true,
          actionUrl: '/buyer-dashboard/budget',
          actionText: 'Review Spending'
        };
        break;

      case 'category_budget_warning':
        notificationData = {
          ...notificationData,
          title: 'Category Budget Warning',
          message: `${data.categoryName} spending is at ${data.percentageUsed}% of budget`,
          priority: 'medium',
          actionUrl: `/buyer-dashboard/budget?category=${data.categoryId}`,
          actionText: 'View Category'
        };
        break;
    }

    return await this.createNotification(notificationData);
  }

  /**
   * Create system notifications
   */
  static async createSystemNotification(recipients, message, options = {}) {
    const notifications = [];

    for (const recipient of recipients) {
      const notificationData = {
        recipientId: recipient.userId,
        recipientType: recipient.userType,
        type: 'system',
        title: options.title || 'System Notification',
        message,
        priority: options.priority || 'medium',
        isActionRequired: options.isActionRequired || false,
        actionUrl: options.actionUrl,
        actionText: options.actionText,
        metadata: options.metadata || {}
      };

      notifications.push(await this.createNotification(notificationData));
    }

    return notifications;
  }

  /**
   * Send promotional notifications
   */
  static async createPromotionalNotification(recipients, promotion) {
    const notifications = [];

    for (const recipient of recipients) {
      const notificationData = {
        recipientId: recipient.userId,
        recipientType: recipient.userType,
        type: 'promotion',
        title: promotion.title,
        message: promotion.message,
        priority: 'low',
        actionUrl: promotion.actionUrl,
        actionText: promotion.actionText || 'Learn More',
        metadata: {
          promotionId: promotion.id,
          validUntil: promotion.validUntil
        },
        expiresAt: promotion.validUntil
      };

      notifications.push(await this.createNotification(notificationData));
    }

    return notifications;
  }

  /**
   * Auto-generate notifications based on system events
   */
  static async checkAndCreateAutomaticNotifications() {
    try {
      // Check for low stock items
      await this.checkLowStockNotifications();
      
      // Check for budget warnings
      await this.checkBudgetWarnings();
      
      // Check for overdue orders
      await this.checkOverdueOrders();
      
      console.log('Automatic notifications check completed');
    } catch (error) {
      console.error('Error in automatic notifications check:', error);
    }
  }

  /**
   * Check for low stock and create notifications
   */
  static async checkLowStockNotifications() {
    const lowStockListings = await Listing.find({
      status: 'active',
      'availability.quantityAvailable': { $lt: 10, $gt: 0 }
    }).populate('productId vendorId');

    for (const listing of lowStockListings) {
      // Check if we already sent a notification recently (within 24 hours)
      const recentNotification = await Notification.findOne({
        'relatedEntity.entityId': listing._id,
        type: 'inventory',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!recentNotification) {
        await this.createInventoryNotification(listing, 'low_stock', {
          productName: listing.productId.name
        });
      }
    }

    // Check for out of stock items
    const outOfStockListings = await Listing.find({
      $or: [
        { 'availability.quantityAvailable': 0 },
        { status: 'out_of_stock' }
      ]
    }).populate('productId vendorId');

    for (const listing of outOfStockListings) {
      const recentNotification = await Notification.findOne({
        'relatedEntity.entityId': listing._id,
        type: 'inventory',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!recentNotification) {
        await this.createInventoryNotification(listing, 'out_of_stock', {
          productName: listing.productId.name
        });
      }
    }
  }

  /**
   * Check for budget warnings
   */
  static async checkBudgetWarnings() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Mock budget limits - in real implementation, these would be configurable per restaurant
    const monthlyBudget = 10000;

    const buyers = await User.find({ role: 'buyerOwner' });

    for (const restaurant of buyers) {
      const monthlySpending = await Order.aggregate([
        {
          $match: {
            buyerId: buyer.buyerId,
            createdAt: { $gte: monthStart, $lte: now }
          }
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$totalAmount' }
          }
        }
      ]);

      const spent = monthlySpending[0]?.totalSpent || 0;
      const percentageUsed = (spent / monthlyBudget) * 100;

      if (percentageUsed >= 80) {
        // Check if we already sent a warning this month
        const existingWarning = await Notification.findOne({
          recipient: restaurant._id,
          type: 'budget',
          createdAt: { $gte: monthStart }
        });

        if (!existingWarning) {
          const event = percentageUsed > 100 ? 'budget_exceeded' : 'budget_warning';
          await this.createBudgetNotification(buyer.buyerId, event, {
            period: 'monthly',
            percentageUsed: Math.round(percentageUsed),
            spent,
            budget: monthlyBudget,
            overageAmount: spent > monthlyBudget ? spent - monthlyBudget : 0
          });
        }
      }
    }
  }

  /**
   * Check for overdue orders
   */
  static async checkOverdueOrders() {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    const overdueOrders = await Order.find({
      status: { $in: ['pending', 'confirmed'] },
      createdAt: { $lt: twoDaysAgo }
    }).populate('vendorId buyerId');

    for (const order of overdueOrders) {
      // Notify restaurant owner about overdue order
      const buyerOwner = await User.findOne({ buyerId: order.buyerId });
      if (buyerOwner) {
        await this.createNotification({
          recipientId: buyerOwner._id,
          recipientType: 'buyerOwner',
          type: 'order',
          title: 'Order Overdue',
          message: `Order #${order.orderNumber} is overdue and needs attention`,
          priority: 'high',
          isActionRequired: true,
          actionUrl: `/buyer-dashboard/order-history?orderId=${order._id}`,
          actionText: 'Contact Vendor',
          relatedEntity: {
            entityType: 'order',
            entityId: order._id,
            entityData: {
              orderNumber: order.orderNumber,
              status: order.status,
              daysSinceOrdered: Math.floor((Date.now() - order.createdAt) / (24 * 60 * 60 * 1000))
            }
          }
        });
      }
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getUserNotificationStats(userId) {
    return await Notification.getNotificationStats(userId);
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(userId, notificationIds) {
    return await Notification.markMultipleAsRead(userId, notificationIds);
  }

  /**
   * Get user notifications with filtering and pagination
   */
  static async getUserNotifications(userId, options) {
    return await Notification.getUserNotifications(userId, options);
  }

  /**
   * Send SLA notification email
   */
  static async sendSLANotificationEmail(recipient, data) {
    try {
      const emailService = require('../utils/email');
      
      const subject = data.type === 'warning' 
        ? `⚠️ SLA Warning: ${data.entityType} ${data.actionType}` 
        : `🚨 SLA Violation: ${data.entityType} ${data.actionType}`;
      
      const message = `
        <h3>${subject}</h3>
        <p><strong>Entity:</strong> ${data.entityName} (${data.entityType})</p>
        <p><strong>Action Required:</strong> ${data.actionType}</p>
        <p><strong>Priority:</strong> ${data.priority}</p>
        <p><strong>Response Time:</strong> ${data.responseTime} hours</p>
        <p><strong>Target Time:</strong> ${data.targetTime} hours</p>
        ${data.exceedanceHours ? `<p><strong>Exceeded by:</strong> ${data.exceedanceHours} hours</p>` : ''}
        <p><strong>Action Required:</strong> Please review and take appropriate action immediately.</p>
        <p><a href="${process.env.FRONTEND_URL}/admin/approvals/${data.entityId}" style="background-color: #006A4E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Take Action</a></p>
      `;

      await emailService.sendEmail({
        email: recipient,
        subject,
        message
      });

      console.log(`SLA notification email sent to ${recipient}`);
    } catch (error) {
      console.error('Error sending SLA notification email:', error);
    }
  }

  /**
   * Create system notification for SLA events
   */
  static async createSystemNotification(recipient, data) {
    try {
      // Find admin user by email or create system notification
      const adminUser = await User.findOne({ email: recipient, role: 'admin' });
      
      if (adminUser) {
        const title = data.type === 'warning' 
          ? `SLA Warning: ${data.entityType}` 
          : `SLA Violation: ${data.entityType}`;
          
        const message = data.type === 'warning'
          ? `${data.entityName} is approaching SLA deadline (${data.responseTime}/${data.targetTime} hours)`
          : `${data.entityName} has exceeded SLA target by ${data.exceedanceHours} hours`;

        await this.createNotification({
          recipientId: adminUser._id,
          recipientType: 'admin',
          type: 'sla_alert',
          title,
          message,
          priority: data.type === 'violation' ? 'high' : 'medium',
          isActionRequired: true,
          actionUrl: `/admin/${data.entityType}s/${data.entityId}`,
          actionText: 'Review Now',
          relatedEntity: {
            entityType: data.entityType,
            entityId: data.entityId,
            entityData: {
              name: data.entityName,
              responseTime: data.responseTime,
              targetTime: data.targetTime,
              violationType: data.type
            }
          },
          metadata: {
            slaViolation: true,
            violationType: data.type,
            exceedanceHours: data.exceedanceHours,
            priority: data.priority
          },
          deliveryChannel: ['in-app', 'email']
        });
      }
    } catch (error) {
      console.error('Error creating SLA system notification:', error);
    }
  }

  /**
   * Send admin performance report notification
   */
  static async sendPerformanceReportNotification(adminId, reportData) {
    try {
      const admin = await User.findById(adminId);
      if (!admin) return;

      const title = `Monthly Performance Report - ${reportData.period}`;
      const message = `Your admin performance report is ready. Approval Rate: ${reportData.approvalRate.toFixed(1)}%, SLA Compliance: ${reportData.slaCompliance.toFixed(1)}%`;

      await this.createNotification({
        recipientId: adminId,
        recipientType: 'admin',
        type: 'performance_report',
        title,
        message,
        priority: 'medium',
        isActionRequired: false,
        actionUrl: `/admin/performance/trends/${adminId}`,
        actionText: 'View Report',
        relatedEntity: {
          entityType: 'performance_report',
          entityId: reportData.reportId,
          entityData: reportData
        },
        metadata: {
          reportType: 'monthly_performance',
          period: reportData.period,
          metrics: {
            approvalRate: reportData.approvalRate,
            slaCompliance: reportData.slaCompliance,
            responseTime: reportData.avgResponseTime
          }
        }
      });

    } catch (error) {
      console.error('Error sending performance report notification:', error);
    }
  }

  /**
   * Send escalation notification
   */
  static async sendEscalationNotification(escalationData) {
    try {
      // Find users with the required role
      const targetUsers = await User.find({ role: escalationData.roleRequired });

      for (const user of targetUsers) {
        const title = `🚨 Escalation Required: ${escalationData.entityType}`;
        const message = `${escalationData.entityName} requires Level ${escalationData.escalationLevel} escalation due to SLA violation`;

        await this.createNotification({
          recipientId: user._id,
          recipientType: user.role,
          type: 'escalation',
          title,
          message,
          priority: 'critical',
          isActionRequired: true,
          actionUrl: `/admin/${escalationData.entityType}s/${escalationData.entityId}`,
          actionText: 'Handle Escalation',
          relatedEntity: {
            entityType: escalationData.entityType,
            entityId: escalationData.entityId,
            entityData: {
              name: escalationData.entityName,
              escalationLevel: escalationData.escalationLevel,
              roleRequired: escalationData.roleRequired
            }
          },
          metadata: {
            escalation: true,
            level: escalationData.escalationLevel,
            roleRequired: escalationData.roleRequired,
            priority: escalationData.priority
          },
          deliveryChannel: ['in-app', 'email', 'sms']
        });
      }

    } catch (error) {
      console.error('Error sending escalation notification:', error);
    }
  }
}

module.exports = NotificationService;