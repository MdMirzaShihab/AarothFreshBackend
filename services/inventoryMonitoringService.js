const VendorInventory = require('../models/VendorInventory');
const Notification = require('../models/Notification');
const User = require('../models/User');

class InventoryMonitoringService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 60 * 60 * 1000; // Check every hour (in milliseconds)
  }

  /**
   * Start the inventory monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log('Inventory monitoring service is already running');
      return;
    }

    console.log('Starting inventory monitoring service...');
    this.isRunning = true;

    // Run initial check
    this.performInventoryCheck();

    // Schedule regular checks
    this.intervalId = setInterval(() => {
      this.performInventoryCheck();
    }, this.checkInterval);

    console.log(`Inventory monitoring service started. Checking every ${this.checkInterval / 1000 / 60} minutes.`);
  }

  /**
   * Stop the inventory monitoring service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Inventory monitoring service is not running');
      return;
    }

    console.log('Stopping inventory monitoring service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('Inventory monitoring service stopped');
  }

  /**
   * Perform comprehensive inventory check for all vendors
   */
  async performInventoryCheck() {
    try {
      console.log('Starting inventory check at', new Date().toISOString());

      // Get all inventory items that need attention with optimized query
      const inventoryItems = await VendorInventory.find({
        $or: [
          { status: 'low_stock' },
          { status: 'out_of_stock' },
          { status: 'overstocked' },
          {
            purchases: {
              $elemMatch: {
                status: 'active',
                expiryDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // Expiring in 7 days
              }
            }
          }
        ]
      }).populate('vendorId', 'businessName')
        .populate('productId', 'name category')
        .maxTimeMS(30000); // Set explicit query timeout to 30 seconds

      console.log(`Found ${inventoryItems.length} inventory items needing attention`);

      const notificationPromises = [];

      for (let inventory of inventoryItems) {
        // Generate and check alerts for this inventory item
        const alerts = inventory.checkAndGenerateAlerts();
        
        // Process each new alert
        for (let alert of alerts) {
          // Check if we already sent a notification for this type of alert recently
          const recentNotification = await this.checkRecentNotification(
            inventory.vendorId,
            alert.type,
            inventory._id
          );

          if (!recentNotification) {
            const notificationPromise = this.createInventoryNotification(
              inventory,
              alert
            );
            notificationPromises.push(notificationPromise);
          }
        }

        // Check for items with no movement (low turnover)
        await this.checkLowTurnover(inventory);
      }

      // Send all notifications
      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      console.log(`Inventory check completed. Sent ${successCount} notifications, ${failCount} failed`);

      // Update inventory statuses
      await this.updateInventoryStatuses();

    } catch (error) {
      console.error('Error during inventory check:', error);
      
      // If it's a timeout error, log specific guidance
      if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
        console.error('MongoDB connection timeout detected. Check database connection and query performance.');
      }
      
      // Don't throw the error - let the service continue for next scheduled check
      return false;
    }
  }

  /**
   * Check if we've sent a similar notification recently to avoid spam
   */
  async checkRecentNotification(vendorId, alertType, inventoryId, hoursAgo = 24) {
    try {
      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      
      // Find vendor's user account
      const vendorUser = await User.findOne({ vendorId, role: 'vendor' });
      if (!vendorUser) return false;

      const existingNotification = await Notification.findOne({
        userId: vendorUser._id,
        type: 'inventory_alert',
        'metadata.alertType': alertType,
        'metadata.inventoryId': inventoryId.toString(),
        createdAt: { $gte: since }
      });

      return !!existingNotification;
    } catch (error) {
      console.error('Error checking recent notifications:', error);
      return false;
    }
  }

  /**
   * Create inventory notification for vendor
   */
  async createInventoryNotification(inventory, alert) {
    try {
      // Find the vendor's user account
      const vendorUser = await User.findOne({ vendorId: inventory.vendorId._id, role: 'vendor' });
      if (!vendorUser) {
        console.log(`No user found for vendor ${inventory.vendorId.businessName}`);
        return;
      }

      const productName = inventory.productId.name;
      const businessName = inventory.vendorId.businessName;

      // Create notification based on alert type
      let notificationData = {
        userId: vendorUser._id,
        type: 'inventory_alert',
        title: this.getAlertTitle(alert.type, productName),
        message: alert.message,
        priority: this.mapSeverityToPriority(alert.severity),
        isActionRequired: ['critical', 'high'].includes(alert.severity),
        actionUrl: `/inventory/${inventory._id}`,
        actionText: this.getActionText(alert.type),
        relatedEntity: {
          entityType: 'inventory',
          entityId: inventory._id
        },
        metadata: {
          alertType: alert.type,
          inventoryId: inventory._id.toString(),
          productId: inventory.productId._id.toString(),
          productName,
          vendorId: inventory.vendorId._id.toString(),
          businessName,
          currentStock: inventory.currentStock.totalQuantity,
          reorderLevel: inventory.inventorySettings.reorderLevel,
          severity: alert.severity
        }
      };

      const notification = new Notification(notificationData);
      await notification.save();

      console.log(`Created ${alert.type} notification for ${businessName} - ${productName}`);
      return notification;
    } catch (error) {
      console.error('Error creating inventory notification:', error);
      throw error;
    }
  }

  /**
   * Check for products with low turnover rates
   */
  async checkLowTurnover(inventory) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    if (inventory.currentStock.totalQuantity > 0 && 
        (!inventory.analytics.lastSoldDate || inventory.analytics.lastSoldDate < thirtyDaysAgo)) {
      
      // Check if we already have an unread no_movement alert
      const existingAlert = inventory.alerts.find(alert => 
        alert.type === 'no_movement' && !alert.isRead && !alert.resolvedAt
      );

      if (!existingAlert) {
        // Create a low turnover notification
        await this.createInventoryNotification(inventory, {
          type: 'no_movement',
          message: `${inventory.productId.name} has had no sales in 30+ days`,
          severity: 'medium'
        });
      }
    }
  }

  /**
   * Update inventory statuses based on current stock levels
   */
  async updateInventoryStatuses() {
    try {
      // Process inventory items in smaller batches to avoid timeouts
      const batchSize = 50;
      const totalCount = await VendorInventory.countDocuments({});
      console.log(`Updating statuses for ${totalCount} inventory items in batches of ${batchSize}`);
      
      for (let skip = 0; skip < totalCount; skip += batchSize) {
        const inventoryBatch = await VendorInventory.find({})
          .skip(skip)
          .limit(batchSize)
          .maxTimeMS(20000);
        
        // Process batch in parallel
        const savePromises = inventoryBatch.map(inventory => {
          return inventory.save().catch(error => {
            console.error(`Error saving inventory ${inventory._id}:`, error.message);
            return null; // Continue with other items
          });
        });
        
        await Promise.allSettled(savePromises);
        console.log(`Processed batch ${Math.floor(skip/batchSize) + 1}/${Math.ceil(totalCount/batchSize)}`);
      }
    } catch (error) {
      console.error('Error updating inventory statuses:', error);
    }
  }

  /**
   * Get notification title based on alert type
   */
  getAlertTitle(alertType, productName) {
    const titles = {
      low_stock: `🔔 Low Stock Alert: ${productName}`,
      out_of_stock: `🚨 Out of Stock: ${productName}`,
      expired_items: `⏰ Expired Items: ${productName}`,
      overstock: `📦 Overstock Alert: ${productName}`,
      no_movement: `📈 Low Sales Activity: ${productName}`
    };

    return titles[alertType] || `📋 Inventory Alert: ${productName}`;
  }

  /**
   * Map alert severity to notification priority
   */
  mapSeverityToPriority(severity) {
    const priorityMap = {
      critical: 'urgent',
      high: 'high',
      medium: 'normal',
      low: 'low'
    };

    return priorityMap[severity] || 'normal';
  }

  /**
   * Get action text based on alert type
   */
  getActionText(alertType) {
    const actionTexts = {
      low_stock: 'Restock Now',
      out_of_stock: 'Add Inventory',
      expired_items: 'Review Items',
      overstock: 'Adjust Pricing',
      no_movement: 'Review Strategy'
    };

    return actionTexts[alertType] || 'View Details';
  }

  /**
   * Generate inventory summary report for vendor
   */
  async generateVendorInventoryReport(vendorId) {
    try {
      const inventoryItems = await VendorInventory.find({ vendorId })
        .populate('productId', 'name category');

      const summary = {
        totalProducts: inventoryItems.length,
        lowStockItems: inventoryItems.filter(item => item.status === 'low_stock').length,
        outOfStockItems: inventoryItems.filter(item => item.status === 'out_of_stock').length,
        overstockedItems: inventoryItems.filter(item => item.status === 'overstocked').length,
        totalAlerts: inventoryItems.reduce((total, item) => {
          return total + item.alerts.filter(alert => !alert.isRead).length;
        }, 0),
        totalStockValue: inventoryItems.reduce((total, item) => {
          return total + item.currentStock.totalValue;
        }, 0),
        averageProfitMargin: inventoryItems.length > 0 
          ? inventoryItems.reduce((total, item) => total + item.analytics.profitMargin, 0) / inventoryItems.length 
          : 0
      };

      return summary;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkInterval) : null
    };
  }

  /**
   * Manual trigger for inventory check (for testing or admin use)
   */
  async triggerManualCheck() {
    console.log('Manual inventory check triggered');
    await this.performInventoryCheck();
  }

  /**
   * Set check interval
   */
  setCheckInterval(intervalMinutes) {
    const newInterval = intervalMinutes * 60 * 1000;
    
    if (newInterval !== this.checkInterval) {
      this.checkInterval = newInterval;
      
      // Restart if currently running to apply new interval
      if (this.isRunning) {
        this.stop();
        this.start();
      }
      
      console.log(`Check interval updated to ${intervalMinutes} minutes`);
    }
  }
}

// Create singleton instance
const inventoryMonitoringService = new InventoryMonitoringService();

module.exports = inventoryMonitoringService;