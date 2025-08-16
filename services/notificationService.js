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
          message: `New order #${order.orderNumber} from ${additionalData.restaurantName || 'restaurant'}`,
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
        const restaurant = await User.findOne({ restaurantId: order.restaurantId });
        if (restaurant) {
          notifications.push({
            recipientId: restaurant._id,
            recipientType: restaurant.role,
            type: 'order',
            title: 'Order Confirmed',
            message: `Order #${order.orderNumber} has been confirmed by the vendor`,
            priority: 'medium',
            actionUrl: `/restaurant-dashboard/order-history?orderId=${order._id}`,
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
        const restaurantUser = await User.findOne({ restaurantId: order.restaurantId });
        if (restaurantUser) {
          notifications.push({
            recipientId: restaurantUser._id,
            recipientType: restaurantUser.role,
            type: 'order',
            title: 'Order Delivered',
            message: `Order #${order.orderNumber} has been delivered successfully`,
            priority: 'low',
            actionUrl: `/restaurant-dashboard/order-history?orderId=${order._id}`,
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
        const restaurantOwner = await User.findOne({ restaurantId: order.restaurantId });

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

        if (restaurantOwner) {
          notifications.push({
            recipientId: restaurantOwner._id,
            recipientType: restaurantOwner.role,
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
          actionUrl: `/vendor-dashboard/inventory?listingId=${listing._id}`,
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
          actionUrl: `/vendor-dashboard/inventory?listingId=${listing._id}`,
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
   * Create budget-related notifications for restaurants
   */
  static async createBudgetNotification(restaurantId, event, data) {
    const restaurantOwner = await User.findOne({ restaurantId, role: 'restaurantOwner' });
    if (!restaurantOwner) return;

    let notificationData = {
      recipientId: restaurantOwner._id,
      recipientType: 'restaurantOwner',
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
          actionUrl: '/restaurant-dashboard/budget',
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
          actionUrl: '/restaurant-dashboard/budget',
          actionText: 'Review Spending'
        };
        break;

      case 'category_budget_warning':
        notificationData = {
          ...notificationData,
          title: 'Category Budget Warning',
          message: `${data.categoryName} spending is at ${data.percentageUsed}% of budget`,
          priority: 'medium',
          actionUrl: `/restaurant-dashboard/budget?category=${data.categoryId}`,
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

    const restaurants = await User.find({ role: 'restaurantOwner' });

    for (const restaurant of restaurants) {
      const monthlySpending = await Order.aggregate([
        {
          $match: {
            restaurantId: restaurant.restaurantId,
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
          await this.createBudgetNotification(restaurant.restaurantId, event, {
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
    }).populate('vendorId restaurantId');

    for (const order of overdueOrders) {
      // Notify restaurant owner about overdue order
      const restaurantOwner = await User.findOne({ restaurantId: order.restaurantId });
      if (restaurantOwner) {
        await this.createNotification({
          recipientId: restaurantOwner._id,
          recipientType: 'restaurantOwner',
          type: 'order',
          title: 'Order Overdue',
          message: `Order #${order.orderNumber} is overdue and needs attention`,
          priority: 'high',
          isActionRequired: true,
          actionUrl: `/restaurant-dashboard/order-history?orderId=${order._id}`,
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
}

module.exports = NotificationService;