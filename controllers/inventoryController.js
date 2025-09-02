const VendorInventory = require('../models/VendorInventory');
const Product = require('../models/Product');
const Listing = require('../models/Listing');
const { ErrorResponse } = require('../middleware/error');
const { validationResult } = require('express-validator');

/**
 * @desc    Get vendor's inventory overview
 * @route   GET /api/v1/inventory
 * @access  Private/Vendor
 */
exports.getInventoryOverview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const { status, lowStock } = req.query;

    // Build query
    let query = { vendorId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get inventory items with product details
    let inventoryQuery = VendorInventory.find(query)
      .populate('productId', 'name category images')
      .populate({
        path: 'productId',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .sort({ lastStockUpdate: -1 });

    if (lowStock === 'true') {
      inventoryQuery = inventoryQuery.where('status').in(['low_stock', 'out_of_stock']);
    }

    const inventoryItems = await inventoryQuery;

    // Get summary statistics
    const analytics = await VendorInventory.getInventoryAnalytics(vendorId);
    const summary = analytics[0] || {
      totalProducts: 0,
      totalStockValue: 0,
      totalStockQuantity: 0,
      averageProfitMargin: 0,
      totalGrossProfit: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      overstockedItems: 0
    };

    // Format response
    const formattedInventory = inventoryItems.map(item => ({
      inventoryId: item._id,
      productId: item.productId._id,
      productName: item.productId.name,
      category: item.productId.category?.name || 'Uncategorized',
      currentStock: item.currentStock.totalQuantity,
      unit: item.currentStock.unit,
      averagePurchasePrice: item.currentStock.averagePurchasePrice,
      totalValue: item.currentStock.totalValue,
      status: item.status,
      reorderLevel: item.inventorySettings.reorderLevel,
      maxStockLevel: item.inventorySettings.maxStockLevel,
      grossProfit: item.analytics.grossProfit,
      profitMargin: item.analytics.profitMargin,
      lastStockUpdate: item.lastStockUpdate,
      alertsCount: item.alerts.filter(alert => !alert.isRead).length,
      totalPurchases: item.purchases.length,
      activeBatches: item.purchases.filter(p => p.status === 'active').length
    }));

    res.status(200).json({
      success: true,
      count: formattedInventory.length,
      data: {
        summary: {
          totalProducts: summary.totalProducts,
          totalStockValue: Math.round(summary.totalStockValue * 100) / 100,
          totalStockQuantity: summary.totalStockQuantity,
          averageProfitMargin: Math.round(summary.averageProfitMargin * 100) / 100,
          totalGrossProfit: Math.round(summary.totalGrossProfit * 100) / 100,
          lowStockItems: summary.lowStockItems,
          outOfStockItems: summary.outOfStockItems,
          overstockedItems: summary.overstockedItems
        },
        inventory: formattedInventory
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new inventory record or add purchase to existing
 * @route   POST /api/v1/inventory
 * @access  Private/Vendor
 */
exports.addPurchase = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const vendorId = req.user.vendorId;
    const {
      productId,
      purchasePrice,
      purchasedQuantity,
      unit,
      supplier,
      qualityGrade,
      harvestDate,
      expiryDate,
      transportationCost = 0,
      storageCost = 0,
      otherCosts = 0,
      notes,
      inventorySettings
    } = req.body;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Check if inventory record already exists for this vendor-product combination
    let inventory = await VendorInventory.findOne({ vendorId, productId });

    if (inventory) {
      // Add purchase to existing inventory
      const purchaseData = {
        purchaseDate: new Date(),
        supplier,
        purchasePrice,
        purchasedQuantity,
        unit,
        qualityGrade,
        harvestDate: harvestDate ? new Date(harvestDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        transportationCost,
        storageCost,
        otherCosts,
        notes
      };

      await inventory.addPurchase(purchaseData);
    } else {
      // Create new inventory record
      const purchaseData = {
        purchaseDate: new Date(),
        supplier,
        purchasePrice,
        purchasedQuantity,
        unit,
        qualityGrade,
        harvestDate: harvestDate ? new Date(harvestDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        transportationCost,
        storageCost,
        otherCosts,
        notes
      };

      inventory = new VendorInventory({
        vendorId,
        productId,
        purchases: [purchaseData],
        currentStock: {
          unit
        },
        inventorySettings: inventorySettings || {
          reorderLevel: 10,
          maxStockLevel: 100,
          autoReorderEnabled: false,
          reorderQuantity: 50
        },
        createdBy: req.user.id
      });

      // Set remaining quantity for the initial purchase
      inventory.purchases[0].remainingQuantity = purchasedQuantity;
      await inventory.save();
    }

    // Check for alerts
    const alerts = inventory.checkAndGenerateAlerts();

    res.status(201).json({
      success: true,
      message: 'Purchase added successfully',
      data: {
        inventoryId: inventory._id,
        currentStock: inventory.currentStock,
        status: inventory.status,
        newAlerts: alerts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory item details with purchase history
 * @route   GET /api/v1/inventory/:id
 * @access  Private/Vendor
 */
exports.getInventoryItem = async (req, res, next) => {
  try {
    const inventory = await VendorInventory.findById(req.params.id)
      .populate('productId', 'name description category images')
      .populate({
        path: 'productId',
        populate: {
          path: 'category',
          select: 'name description'
        }
      });

    if (!inventory) {
      return next(new ErrorResponse('Inventory item not found', 404));
    }

    // Verify vendor ownership
    if (inventory.vendorId.toString() !== req.user.vendorId.toString()) {
      return next(new ErrorResponse('Not authorized to access this inventory item', 403));
    }

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inventory settings
 * @route   PUT /api/v1/inventory/:id/settings
 * @access  Private/Vendor
 */
exports.updateInventorySettings = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const inventory = await VendorInventory.findById(req.params.id);
    
    if (!inventory) {
      return next(new ErrorResponse('Inventory item not found', 404));
    }

    // Verify vendor ownership
    if (inventory.vendorId.toString() !== req.user.vendorId.toString()) {
      return next(new ErrorResponse('Not authorized to update this inventory item', 403));
    }

    const { reorderLevel, maxStockLevel, autoReorderEnabled, reorderQuantity } = req.body;

    // Update settings
    if (reorderLevel !== undefined) inventory.inventorySettings.reorderLevel = reorderLevel;
    if (maxStockLevel !== undefined) inventory.inventorySettings.maxStockLevel = maxStockLevel;
    if (autoReorderEnabled !== undefined) inventory.inventorySettings.autoReorderEnabled = autoReorderEnabled;
    if (reorderQuantity !== undefined) inventory.inventorySettings.reorderQuantity = reorderQuantity;

    inventory.updatedBy = req.user.id;
    await inventory.save();

    // Check for new alerts based on updated settings
    const alerts = inventory.checkAndGenerateAlerts();

    res.status(200).json({
      success: true,
      message: 'Inventory settings updated successfully',
      data: {
        inventorySettings: inventory.inventorySettings,
        status: inventory.status,
        newAlerts: alerts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Adjust stock (wastage, damage, manual adjustments)
 * @route   POST /api/v1/inventory/:id/adjust
 * @access  Private/Vendor
 */
exports.adjustStock = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const inventory = await VendorInventory.findById(req.params.id);
    
    if (!inventory) {
      return next(new ErrorResponse('Inventory item not found', 404));
    }

    // Verify vendor ownership
    if (inventory.vendorId.toString() !== req.user.vendorId.toString()) {
      return next(new ErrorResponse('Not authorized to adjust this inventory item', 403));
    }

    const { type, quantity, reason, batchId } = req.body;

    // Validate adjustment type
    if (!['wastage', 'damage', 'return', 'adjustment'].includes(type)) {
      return next(new ErrorResponse('Invalid adjustment type', 400));
    }

    if (quantity <= 0) {
      return next(new ErrorResponse('Adjustment quantity must be positive', 400));
    }

    // Apply the adjustment
    await inventory.adjustStock({ type, quantity, reason, batchId });

    // Sync related listings
    const listings = await Listing.find({ inventoryId: inventory._id });
    for (let listing of listings) {
      await listing.syncWithInventory();
    }

    res.status(200).json({
      success: true,
      message: `Stock ${type} recorded successfully`,
      data: {
        currentStock: inventory.currentStock,
        status: inventory.status,
        adjustmentRecord: {
          type,
          quantity,
          reason,
          date: new Date()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get low stock alerts for vendor
 * @route   GET /api/v1/inventory/alerts
 * @access  Private/Vendor
 */
exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { severity = 'all' } = req.query;

    // Get low stock items
    const lowStockItems = await VendorInventory.getLowStockItems(vendorId, { severity });

    // Get items with unread alerts
    const itemsWithAlerts = await VendorInventory.find({
      vendorId,
      'alerts.isRead': false
    }).populate('productId', 'name category');

    // Format alerts
    const formattedAlerts = [];
    
    itemsWithAlerts.forEach(item => {
      const unreadAlerts = item.alerts.filter(alert => !alert.isRead && !alert.resolvedAt);
      unreadAlerts.forEach(alert => {
        formattedAlerts.push({
          inventoryId: item._id,
          productName: item.productId.name,
          category: item.productId.category,
          alertType: alert.type,
          message: alert.message,
          severity: alert.severity,
          createdAt: alert.createdAt,
          currentStock: item.currentStock.totalQuantity,
          reorderLevel: item.inventorySettings.reorderLevel
        });
      });
    });

    // Sort by severity and date
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    formattedAlerts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAlerts: formattedAlerts.length,
          criticalAlerts: formattedAlerts.filter(a => a.severity === 'critical').length,
          highPriorityAlerts: formattedAlerts.filter(a => a.severity === 'high').length,
          lowStockItems: lowStockItems.length
        },
        alerts: formattedAlerts,
        lowStockItems: lowStockItems.map(item => ({
          inventoryId: item._id,
          productName: item.productId.name,
          currentStock: item.currentStock.totalQuantity,
          unit: item.currentStock.unit,
          reorderLevel: item.inventorySettings.reorderLevel,
          status: item.status,
          lastStockUpdate: item.lastStockUpdate
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark inventory alerts as read
 * @route   PUT /api/v1/inventory/:id/alerts/read
 * @access  Private/Vendor
 */
exports.markAlertsAsRead = async (req, res, next) => {
  try {
    const inventory = await VendorInventory.findById(req.params.id);
    
    if (!inventory) {
      return next(new ErrorResponse('Inventory item not found', 404));
    }

    // Verify vendor ownership
    if (inventory.vendorId.toString() !== req.user.vendorId.toString()) {
      return next(new ErrorResponse('Not authorized to access this inventory item', 403));
    }

    const { alertIds } = req.body;

    // Mark specific alerts as read or all if no IDs provided
    if (alertIds && alertIds.length > 0) {
      inventory.alerts.forEach(alert => {
        if (alertIds.includes(alert._id.toString())) {
          alert.isRead = true;
        }
      });
    } else {
      // Mark all unread alerts as read
      inventory.alerts.forEach(alert => {
        if (!alert.isRead) {
          alert.isRead = true;
        }
      });
    }

    await inventory.save();

    res.status(200).json({
      success: true,
      message: 'Alerts marked as read',
      data: {
        unreadAlertsCount: inventory.alerts.filter(a => !a.isRead).length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory analytics for vendor
 * @route   GET /api/v1/inventory/analytics
 * @access  Private/Vendor
 */
exports.getInventoryAnalytics = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const { startDate, endDate, period = 'month' } = req.query;

    // Get inventory analytics
    const analytics = await VendorInventory.getInventoryAnalytics(vendorId, startDate, endDate);
    const summary = analytics[0] || {};

    // Get top performing products by profit
    const topPerformingProducts = await VendorInventory.find({ vendorId })
      .populate('productId', 'name category')
      .sort({ 'analytics.grossProfit': -1 })
      .limit(10)
      .select('productId analytics currentStock');

    // Get products needing attention
    const attentionNeeded = await VendorInventory.find({
      vendorId,
      $or: [
        { status: 'low_stock' },
        { status: 'out_of_stock' },
        { status: 'overstocked' },
        { 'alerts.isRead': false }
      ]
    }).populate('productId', 'name')
    .select('productId status currentStock inventorySettings alerts');

    // Get stock movement trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stockMovements = await VendorInventory.aggregate([
      { $match: { vendorId } },
      { $unwind: '$analytics.stockMovements' },
      {
        $match: {
          'analytics.stockMovements.date': { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$analytics.stockMovements.date'
              }
            },
            type: '$analytics.stockMovements.type'
          },
          totalQuantity: { $sum: '$analytics.stockMovements.quantity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts: summary.totalProducts || 0,
          totalStockValue: Math.round((summary.totalStockValue || 0) * 100) / 100,
          averageProfitMargin: Math.round((summary.averageProfitMargin || 0) * 100) / 100,
          totalGrossProfit: Math.round((summary.totalGrossProfit || 0) * 100) / 100,
          stockLevels: {
            lowStock: summary.lowStockItems || 0,
            outOfStock: summary.outOfStockItems || 0,
            overstocked: summary.overstockedItems || 0,
            healthy: (summary.totalProducts || 0) - (summary.lowStockItems || 0) - 
                    (summary.outOfStockItems || 0) - (summary.overstockedItems || 0)
          }
        },
        topPerformingProducts: topPerformingProducts.map(item => ({
          productId: item.productId._id,
          productName: item.productId.name,
          category: item.productId.category?.name,
          grossProfit: Math.round(item.analytics.grossProfit * 100) / 100,
          profitMargin: Math.round(item.analytics.profitMargin * 100) / 100,
          currentStock: item.currentStock.totalQuantity,
          turnoverRate: item.analytics.turnoverRate
        })),
        attentionNeeded: attentionNeeded.map(item => ({
          inventoryId: item._id,
          productName: item.productId.name,
          status: item.status,
          currentStock: item.currentStock.totalQuantity,
          reorderLevel: item.inventorySettings.reorderLevel,
          unreadAlerts: item.alerts.filter(a => !a.isRead).length
        })),
        stockMovementTrends: stockMovements
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get purchase history for inventory item
 * @route   GET /api/v1/inventory/:id/purchases
 * @access  Private/Vendor
 */
exports.getPurchaseHistory = async (req, res, next) => {
  try {
    const inventory = await VendorInventory.findById(req.params.id);
    
    if (!inventory) {
      return next(new ErrorResponse('Inventory item not found', 404));
    }

    // Verify vendor ownership
    if (inventory.vendorId.toString() !== req.user.vendorId.toString()) {
      return next(new ErrorResponse('Not authorized to access this inventory item', 403));
    }

    const { status, sortBy = 'purchaseDate', sortOrder = 'desc' } = req.query;

    let purchases = inventory.purchases;

    // Filter by status
    if (status && status !== 'all') {
      purchases = purchases.filter(p => p.status === status);
    }

    // Sort purchases
    purchases.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Format response
    const formattedPurchases = purchases.map(purchase => ({
      batchId: purchase.batchId,
      purchaseDate: purchase.purchaseDate,
      supplier: purchase.supplier,
      purchasePrice: purchase.purchasePrice,
      purchasedQuantity: purchase.purchasedQuantity,
      remainingQuantity: purchase.remainingQuantity,
      unit: purchase.unit,
      qualityGrade: purchase.qualityGrade,
      harvestDate: purchase.harvestDate,
      expiryDate: purchase.expiryDate,
      status: purchase.status,
      totalCost: purchase.purchasePrice + purchase.transportationCost + 
                purchase.storageCost + purchase.otherCosts,
      costBreakdown: {
        purchasePrice: purchase.purchasePrice,
        transportationCost: purchase.transportationCost,
        storageCost: purchase.storageCost,
        otherCosts: purchase.otherCosts
      },
      notes: purchase.notes
    }));

    res.status(200).json({
      success: true,
      count: formattedPurchases.length,
      data: {
        inventoryId: inventory._id,
        productName: inventory.productId?.name,
        purchases: formattedPurchases
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sync all listings with their inventory
 * @route   POST /api/v1/inventory/sync-listings
 * @access  Private/Vendor
 */
exports.syncListingsWithInventory = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;

    // Get all listings for this vendor that have inventory IDs
    const listings = await Listing.find({ 
      vendorId, 
      inventoryId: { $exists: true } 
    });

    const syncResults = [];
    
    for (let listing of listings) {
      try {
        const result = await listing.syncWithInventory();
        syncResults.push({
          listingId: listing._id,
          success: true,
          message: 'Synced successfully',
          newQuantity: result.availability.quantityAvailable
        });
      } catch (error) {
        syncResults.push({
          listingId: listing._id,
          success: false,
          message: error.message
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;

    res.status(200).json({
      success: true,
      message: `Synced ${successCount} out of ${listings.length} listings`,
      data: {
        totalListings: listings.length,
        successfulSyncs: successCount,
        failedSyncs: listings.length - successCount,
        results: syncResults
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually trigger inventory check and alert generation
 * @route   POST /api/v1/inventory/check-alerts
 * @access  Private/Vendor
 */
exports.triggerInventoryCheck = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId;
    const inventoryMonitoringService = require('../services/inventoryMonitoringService');

    // Get vendor's inventory items
    const inventoryItems = await VendorInventory.find({ vendorId })
      .populate('productId', 'name category')
      .populate('vendorId', 'businessName');

    const results = [];
    let alertsGenerated = 0;

    for (let inventory of inventoryItems) {
      try {
        // Generate alerts for this inventory item
        const alerts = inventory.checkAndGenerateAlerts();
        
        for (let alert of alerts) {
          // Check if we already sent a notification for this type recently
          const recentNotification = await inventoryMonitoringService.checkRecentNotification(
            inventory.vendorId._id,
            alert.type,
            inventory._id,
            1 // Check last 1 hour instead of 24 for manual trigger
          );

          if (!recentNotification) {
            await inventoryMonitoringService.createInventoryNotification(inventory, alert);
            alertsGenerated++;
          }
        }

        results.push({
          inventoryId: inventory._id,
          productName: inventory.productId.name,
          status: inventory.status,
          alertsGenerated: alerts.length,
          success: true
        });

        // Save updated alerts to inventory
        await inventory.save();
      } catch (error) {
        console.error(`Error checking inventory ${inventory._id}:`, error.message);
        results.push({
          inventoryId: inventory._id,
          productName: inventory.productId?.name || 'Unknown',
          error: error.message,
          success: false
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Inventory check completed. Generated ${alertsGenerated} new alerts.`,
      data: {
        totalInventoryItems: inventoryItems.length,
        alertsGenerated,
        results
      }
    });
  } catch (error) {
    next(error);
  }
};