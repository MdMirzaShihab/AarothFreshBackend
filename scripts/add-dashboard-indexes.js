const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Script to add database indexes for optimal dashboard performance
 */
async function addDashboardIndexes() {
  try {
    // Connect to MongoDB
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to database successfully');

    const db = mongoose.connection.db;

    // Orders collection indexes for dashboard analytics
    console.log('Adding indexes for Orders collection...');
    
    // Vendor dashboard queries
    await db.collection('orders').createIndex({ 
      vendorId: 1, 
      createdAt: -1 
    }, { name: 'vendor_orders_by_date' });

    await db.collection('orders').createIndex({ 
      vendorId: 1, 
      status: 1, 
      createdAt: -1 
    }, { name: 'vendor_orders_by_status_date' });

    // Restaurant dashboard queries
    await db.collection('orders').createIndex({ 
      restaurantId: 1, 
      createdAt: -1 
    }, { name: 'restaurant_orders_by_date' });

    await db.collection('orders').createIndex({ 
      restaurantId: 1, 
      status: 1, 
      createdAt: -1 
    }, { name: 'restaurant_orders_by_status_date' });

    // Date range analytics
    await db.collection('orders').createIndex({ 
      createdAt: 1, 
      vendorId: 1, 
      totalAmount: 1 
    }, { name: 'orders_analytics_vendor' });

    await db.collection('orders').createIndex({ 
      createdAt: 1, 
      restaurantId: 1, 
      totalAmount: 1 
    }, { name: 'orders_analytics_restaurant' });

    // Order items analytics
    await db.collection('orders').createIndex({ 
      'items.productId': 1, 
      vendorId: 1, 
      createdAt: -1 
    }, { name: 'product_performance_vendor' });

    await db.collection('orders').createIndex({ 
      'items.productId': 1, 
      restaurantId: 1, 
      createdAt: -1 
    }, { name: 'product_consumption_restaurant' });

    // Payment and delivery tracking
    await db.collection('orders').createIndex({ 
      vendorId: 1, 
      paymentStatus: 1, 
      createdAt: -1 
    }, { name: 'payment_tracking_vendor' });

    await db.collection('orders').createIndex({ 
      deliveryDate: 1, 
      expectedDeliveryDate: 1, 
      status: 1 
    }, { name: 'delivery_performance' });

    console.log('Orders indexes added successfully');

    // Listings collection indexes
    console.log('Adding indexes for Listings collection...');
    
    // Vendor inventory management
    await db.collection('listings').createIndex({ 
      vendorId: 1, 
      status: 1, 
      'availability.quantityAvailable': 1 
    }, { name: 'vendor_inventory_status' });

    // Product performance
    await db.collection('listings').createIndex({ 
      vendorId: 1, 
      productId: 1, 
      status: 1 
    }, { name: 'vendor_product_listings' });

    await db.collection('listings').createIndex({ 
      productId: 1, 
      status: 1, 
      'pricing.pricePerUnit': 1 
    }, { name: 'product_pricing_comparison' });

    // Rating and review analytics
    await db.collection('listings').createIndex({ 
      vendorId: 1, 
      'rating.average': -1, 
      'rating.count': -1 
    }, { name: 'vendor_rating_analytics' });

    // Low stock alerts
    await db.collection('listings').createIndex({ 
      vendorId: 1, 
      'availability.quantityAvailable': 1, 
      status: 1 
    }, { name: 'low_stock_alerts' });

    console.log('Listings indexes added successfully');

    // Users collection indexes for dashboard queries
    console.log('Adding indexes for Users collection...');
    
    // Role-based queries
    await db.collection('users').createIndex({ 
      role: 1, 
      isActive: 1, 
      lastLogin: -1 
    }, { name: 'user_role_activity' });

    // Vendor and restaurant relationships
    await db.collection('users').createIndex({ 
      vendorId: 1, 
      role: 1, 
      isActive: 1 
    }, { name: 'vendor_users' });

    await db.collection('users').createIndex({ 
      restaurantId: 1, 
      role: 1, 
      isActive: 1 
    }, { name: 'restaurant_users' });

    console.log('Users indexes added successfully');

    // Notifications collection indexes
    console.log('Adding indexes for Notifications collection...');
    
    // Primary notification queries
    await db.collection('notifications').createIndex({ 
      recipient: 1, 
      isRead: 1, 
      createdAt: -1 
    }, { name: 'user_notifications_by_read_date' });

    await db.collection('notifications').createIndex({ 
      recipient: 1, 
      type: 1, 
      priority: 1, 
      createdAt: -1 
    }, { name: 'user_notifications_by_type_priority' });

    // Notification management
    await db.collection('notifications').createIndex({ 
      recipientType: 1, 
      type: 1, 
      createdAt: -1 
    }, { name: 'bulk_notification_queries' });

    await db.collection('notifications').createIndex({ 
      deliveryStatus: 1, 
      createdAt: 1 
    }, { name: 'notification_delivery_tracking' });

    // Related entity tracking
    await db.collection('notifications').createIndex({ 
      'relatedEntity.entityType': 1, 
      'relatedEntity.entityId': 1, 
      createdAt: -1 
    }, { name: 'entity_notifications' });

    console.log('Notifications indexes added successfully');

    // Products collection indexes for analytics
    console.log('Adding indexes for Products collection...');
    
    // Category-based analytics (skip if exists)
    try {
      await db.collection('products').createIndex({ 
        category: 1, 
        isActive: 1 
      }, { name: 'product_category_analytics' });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  - product_category_analytics index already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Product search and filtering
    await db.collection('products').createIndex({ 
      name: 'text', 
      description: 'text', 
      tags: 'text' 
    }, { name: 'product_text_search' });

    await db.collection('products').createIndex({ 
      isActive: 1, 
      isSeasonal: 1, 
      isOrganic: 1 
    }, { name: 'product_filtering' });

    console.log('Products indexes added successfully');

    // Product Categories collection indexes
    console.log('Adding indexes for Product Categories collection...');
    
    await db.collection('productcategories').createIndex({ 
      parentCategory: 1, 
      level: 1, 
      isActive: 1 
    }, { name: 'category_hierarchy' });

    await db.collection('productcategories').createIndex({ 
      isActive: 1, 
      sortOrder: 1, 
      name: 1 
    }, { name: 'category_listing' });

    console.log('Product Categories indexes added successfully');

    // Vendors collection indexes
    console.log('Adding indexes for Vendors collection...');
    
    await db.collection('vendors').createIndex({ 
      isVerified: 1, 
      isActive: 1, 
      createdAt: -1 
    }, { name: 'vendor_status_analytics' });

    await db.collection('vendors').createIndex({ 
      'address.city': 1, 
      'address.state': 1, 
      isActive: 1 
    }, { name: 'vendor_location_search' });

    console.log('Vendors indexes added successfully');

    // Restaurants collection indexes
    console.log('Adding indexes for Restaurants collection...');
    
    await db.collection('restaurants').createIndex({ 
      isVerified: 1, 
      isActive: 1, 
      createdAt: -1 
    }, { name: 'restaurant_status_analytics' });

    await db.collection('restaurants').createIndex({ 
      'address.city': 1, 
      'address.state': 1, 
      isActive: 1 
    }, { name: 'restaurant_location_search' });

    // Manager relationships
    await db.collection('restaurants').createIndex({ 
      managers: 1 
    }, { name: 'restaurant_managers' });

    console.log('Restaurants indexes added successfully');

    // Compound indexes for complex dashboard queries
    console.log('Adding compound indexes for complex queries...');
    
    // Revenue analytics by time periods
    await db.collection('orders').createIndex({ 
      vendorId: 1, 
      status: 1, 
      createdAt: 1, 
      totalAmount: 1 
    }, { name: 'revenue_analytics_vendor_compound' });

    await db.collection('orders').createIndex({ 
      restaurantId: 1, 
      status: 1, 
      createdAt: 1, 
      totalAmount: 1 
    }, { name: 'spending_analytics_restaurant_compound' });

    // Product performance compound index
    await db.collection('orders').createIndex({ 
      'items.productId': 1, 
      vendorId: 1, 
      status: 1, 
      createdAt: 1 
    }, { name: 'product_vendor_performance_compound' });

    // Customer analytics compound index
    await db.collection('orders').createIndex({ 
      vendorId: 1, 
      restaurantId: 1, 
      status: 1, 
      createdAt: 1, 
      totalAmount: 1 
    }, { name: 'customer_analytics_compound' });

    console.log('Compound indexes added successfully');

    // Sparse indexes for optional fields
    console.log('Adding sparse indexes for optional fields...');
    
    await db.collection('orders').createIndex({ 
      deliveryDate: 1 
    }, { name: 'delivery_date_sparse', sparse: true });

    await db.collection('orders').createIndex({ 
      expectedDeliveryDate: 1 
    }, { name: 'expected_delivery_sparse', sparse: true });

    await db.collection('listings').createIndex({ 
      'availability.expiryDate': 1 
    }, { name: 'product_expiry_sparse', sparse: true });

    await db.collection('notifications').createIndex({ 
      expiresAt: 1 
    }, { name: 'notification_expiry_sparse', sparse: true });

    console.log('Sparse indexes added successfully');

    // Aggregation pipeline optimization indexes
    console.log('Adding aggregation optimization indexes...');
    
    // For monthly/yearly revenue trends
    await db.collection('orders').createIndex({ 
      createdAt: 1, 
      vendorId: 1 
    }, { name: 'time_series_vendor_revenue' });

    await db.collection('orders').createIndex({ 
      createdAt: 1, 
      restaurantId: 1 
    }, { name: 'time_series_restaurant_spending' });

    // For product category analytics
    await db.collection('orders').createIndex({ 
      'items.productId': 1, 
      createdAt: 1 
    }, { name: 'product_time_series' });

    console.log('Aggregation optimization indexes added successfully');

    console.log('\n✅ All dashboard performance indexes have been added successfully!');
    console.log('\nIndex Summary:');
    console.log('- Orders: 15+ indexes for revenue, analytics, and performance tracking');
    console.log('- Listings: 6+ indexes for inventory and product management');
    console.log('- Users: 4+ indexes for role-based queries');
    console.log('- Notifications: 6+ indexes for notification management');
    console.log('- Products: 4+ indexes for search and analytics');
    console.log('- Categories: 2+ indexes for hierarchy management');
    console.log('- Vendors & Restaurants: 4+ indexes each for location and status');
    console.log('- Compound & Sparse: 10+ specialized indexes for complex queries');

    console.log('\nThese indexes will significantly improve dashboard query performance.');
    console.log('Monitor index usage with db.collection.getIndexes() and explain() methods.');

  } catch (error) {
    console.error('❌ Error adding dashboard indexes:', error.message);
    console.error(error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the index creation
if (require.main === module) {
  addDashboardIndexes();
}

module.exports = addDashboardIndexes;