/**
 * Database Migration Script: Restaurant to Buyer
 *
 * This script migrates the database from the old Restaurant model to the new unified Buyer model.
 *
 * Migration Steps:
 * 1. Create Buyer collection from Restaurant data (all as buyerType='restaurant')
 * 2. Update User collection: restaurantId → buyerId, roles restaurantOwner/Manager → buyerOwner/Manager
 * 3. Update Order collection: restaurantId → buyerId
 * 4. Update Budget collection: restaurantId → buyerId
 * 5. Update Notification collection: recipientType values
 * 6. Create indexes on new fields
 * 7. Rename old Restaurant collection to Restaurant_backup
 *
 * Usage:
 *   node scripts/migrate-restaurant-to-buyer.js
 *
 * Rollback:
 *   node scripts/migrate-restaurant-to-buyer.js --rollback
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Import models (note: using dynamic requires to avoid validation issues)
const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));
const Buyer = mongoose.model('Buyer', new mongoose.Schema({}, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
const Budget = mongoose.model('Budget', new mongoose.Schema({}, { strict: false }));
const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));

// Migration statistics
const stats = {
  buyers: { created: 0, failed: 0 },
  users: { updated: 0, failed: 0 },
  orders: { updated: 0, failed: 0 },
  budgets: { updated: 0, failed: 0 },
  notifications: { updated: 0, failed: 0 }
};

/**
 * Main migration function
 */
async function migrate() {
  try {
    console.log('\n========================================');
    console.log('Starting Restaurant → Buyer Migration');
    console.log('========================================\n');

    // Step 1: Migrate Restaurant → Buyer
    console.log('Step 1: Migrating Restaurant data to Buyer collection...');
    await migrateRestaurantsToBuyers();

    // Step 2: Update User collection
    console.log('\nStep 2: Updating User collection...');
    await updateUsers();

    // Step 3: Update Order collection
    console.log('\nStep 3: Updating Order collection...');
    await updateOrders();

    // Step 4: Update Budget collection
    console.log('\nStep 4: Updating Budget collection...');
    await updateBudgets();

    // Step 5: Update Notification collection
    console.log('\nStep 5: Updating Notification collection...');
    await updateNotifications();

    // Step 6: Create indexes
    console.log('\nStep 6: Creating indexes on Buyer collection...');
    await createIndexes();

    // Step 7: Backup old Restaurant collection
    console.log('\nStep 7: Backing up Restaurant collection...');
    await backupRestaurantCollection();

    // Print summary
    printMigrationSummary();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: Please verify the data before removing the Restaurant_backup collection.');
    console.log('    To rollback: node scripts/migrate-restaurant-to-buyer.js --rollback\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

/**
 * Step 1: Migrate restaurants to buyers
 */
async function migrateRestaurantsToBuyers() {
  try {
    const restaurants = await Restaurant.find({});
    console.log(`Found ${restaurants.length} restaurants to migrate`);

    for (const restaurant of restaurants) {
      try {
        // Map restaurant fields to buyer fields
        const buyerData = {
          _id: restaurant._id,
          name: restaurant.name,
          ownerName: restaurant.ownerName,
          email: restaurant.email,
          phone: restaurant.phone,
          address: restaurant.address,
          logo: restaurant.logo,
          tradeLicenseNo: restaurant.tradeLicenseNo,
          buyerType: 'restaurant', // All existing restaurants become buyer type 'restaurant'
          typeSpecificData: {
            // Extract restaurant-specific fields
            cuisineType: restaurant.cuisineType || [],
            seatingCapacity: restaurant.seatingCapacity,
            operatingHours: restaurant.operatingHours || {}
          },
          // Verification fields
          verificationStatus: restaurant.verificationStatus || 'pending',
          verificationDate: restaurant.verificationDate,
          statusUpdatedBy: restaurant.statusUpdatedBy,
          statusUpdatedAt: restaurant.statusUpdatedAt,
          adminNotes: restaurant.adminNotes,
          // Management
          managers: restaurant.managers || [],
          createdBy: restaurant.createdBy,
          isActive: restaurant.isActive !== undefined ? restaurant.isActive : true,
          isDeleted: restaurant.isDeleted || false,
          deletedAt: restaurant.deletedAt,
          deletedBy: restaurant.deletedBy,
          deletionReason: restaurant.deletionReason,
          // Timestamps
          createdAt: restaurant.createdAt || new Date(),
          updatedAt: new Date()
        };

        // Create buyer (using insertOne to preserve _id)
        await Buyer.collection.insertOne(buyerData);
        stats.buyers.created++;
        console.log(`  ✓ Migrated: ${restaurant.name} (ID: ${restaurant._id})`);

      } catch (error) {
        stats.buyers.failed++;
        console.error(`  ✗ Failed to migrate restaurant ${restaurant.name}:`, error.message);
      }
    }

    console.log(`Migrated ${stats.buyers.created} buyers successfully, ${stats.buyers.failed} failed`);
  } catch (error) {
    console.error('Error in migrateRestaurantsToBuyers:', error);
    throw error;
  }
}

/**
 * Step 2: Update users
 */
async function updateUsers() {
  try {
    // Update users with restaurantOwner role
    const ownerResult = await User.updateMany(
      { role: 'restaurantOwner' },
      {
        $set: { role: 'buyerOwner' },
        $rename: { restaurantId: 'buyerId' }
      }
    );
    console.log(`  ✓ Updated ${ownerResult.modifiedCount} restaurant owners to buyer owners`);
    stats.users.updated += ownerResult.modifiedCount;

    // Update users with restaurantManager role
    const managerResult = await User.updateMany(
      { role: 'restaurantManager' },
      {
        $set: { role: 'buyerManager' },
        $rename: { restaurantId: 'buyerId' }
      }
    );
    console.log(`  ✓ Updated ${managerResult.modifiedCount} restaurant managers to buyer managers`);
    stats.users.updated += managerResult.modifiedCount;

  } catch (error) {
    console.error('Error in updateUsers:', error);
    throw error;
  }
}

/**
 * Step 3: Update orders
 */
async function updateOrders() {
  try {
    const result = await Order.updateMany(
      { restaurantId: { $exists: true } },
      { $rename: { restaurantId: 'buyerId' } }
    );
    console.log(`  ✓ Updated ${result.modifiedCount} orders`);
    stats.orders.updated = result.modifiedCount;

  } catch (error) {
    console.error('Error in updateOrders:', error);
    throw error;
  }
}

/**
 * Step 4: Update budgets
 */
async function updateBudgets() {
  try {
    const result = await Budget.updateMany(
      { restaurantId: { $exists: true } },
      { $rename: { restaurantId: 'buyerId' } }
    );
    console.log(`  ✓ Updated ${result.modifiedCount} budgets`);
    stats.budgets.updated = result.modifiedCount;

  } catch (error) {
    console.error('Error in updateBudgets:', error);
    throw error;
  }
}

/**
 * Step 5: Update notifications
 */
async function updateNotifications() {
  try {
    // Update recipientType from restaurantOwner to buyerOwner
    const ownerResult = await Notification.updateMany(
      { recipientType: 'restaurantOwner' },
      { $set: { recipientType: 'buyerOwner' } }
    );
    console.log(`  ✓ Updated ${ownerResult.modifiedCount} notifications (restaurantOwner → buyerOwner)`);
    stats.notifications.updated += ownerResult.modifiedCount;

    // Update recipientType from restaurantManager to buyerManager
    const managerResult = await Notification.updateMany(
      { recipientType: 'restaurantManager' },
      { $set: { recipientType: 'buyerManager' } }
    );
    console.log(`  ✓ Updated ${managerResult.modifiedCount} notifications (restaurantManager → buyerManager)`);
    stats.notifications.updated += managerResult.modifiedCount;

    // Update relatedEntity.entityType from 'restaurant' to 'buyer'
    const entityResult = await Notification.updateMany(
      { 'relatedEntity.entityType': 'restaurant' },
      { $set: { 'relatedEntity.entityType': 'buyer' } }
    );
    console.log(`  ✓ Updated ${entityResult.modifiedCount} notifications (entity type)`);

  } catch (error) {
    console.error('Error in updateNotifications:', error);
    throw error;
  }
}

/**
 * Step 6: Create indexes
 */
async function createIndexes() {
  try {
    const db = mongoose.connection.db;
    const buyersCollection = db.collection('buyers');

    // Try to create unique email index
    try {
      await buyersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
      console.log('  ✓ Created unique email index');
    } catch (emailError) {
      if (emailError.code === 11000) {
        console.log('  ⚠️  Duplicate emails found, creating non-unique email index instead');
        await buyersCollection.createIndex({ email: 1 }, { sparse: true });

        // Find duplicates
        const duplicates = await buyersCollection.aggregate([
          { $match: { email: { $ne: null } } },
          { $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$_id' } } },
          { $match: { count: { $gt: 1 } } }
        ]).toArray();

        if (duplicates.length > 0) {
          console.log('  📋 Duplicate emails found:');
          duplicates.forEach(dup => {
            console.log(`     - ${dup._id} (${dup.count} times)`);
          });
        }
      } else {
        throw emailError;
      }
    }

    // Try to create unique phone index
    try {
      await buyersCollection.createIndex({ phone: 1 }, { unique: true, sparse: true });
      console.log('  ✓ Created unique phone index');
    } catch (phoneError) {
      if (phoneError.code === 11000) {
        console.log('  ⚠️  Duplicate phone numbers found, creating non-unique phone index instead');
        await buyersCollection.createIndex({ phone: 1 }, { sparse: true });

        // Find duplicates
        const duplicates = await buyersCollection.aggregate([
          { $match: { phone: { $ne: null } } },
          { $group: { _id: '$phone', count: { $sum: 1 }, ids: { $push: '$_id' }, names: { $push: '$name' } } },
          { $match: { count: { $gt: 1 } } }
        ]).toArray();

        if (duplicates.length > 0) {
          console.log('  📋 Duplicate phone numbers found:');
          duplicates.forEach(dup => {
            console.log(`     - ${dup._id}: ${dup.names.join(', ')} (${dup.count} buyers)`);
          });
        }
      } else {
        throw phoneError;
      }
    }

    // Create other indexes
    await buyersCollection.createIndex({ buyerType: 1 });
    await buyersCollection.createIndex({ verificationStatus: 1 });
    await buyersCollection.createIndex({ isActive: 1, isDeleted: 1 });
    await buyersCollection.createIndex({ createdAt: -1 });

    console.log('  ✓ Created remaining indexes on Buyer collection');
  } catch (error) {
    console.error('Error in createIndexes:', error);
    throw error;
  }
}

/**
 * Step 7: Backup restaurant collection
 */
async function backupRestaurantCollection() {
  try {
    const db = mongoose.connection.db;

    // Check if Restaurant_backup already exists
    const collections = await db.listCollections({ name: 'restaurants_backup' }).toArray();
    if (collections.length > 0) {
      console.log('  ⚠️  restaurants_backup already exists, skipping backup');
      return;
    }

    // Rename restaurants collection to restaurants_backup
    await db.collection('restaurants').rename('restaurants_backup');
    console.log('  ✓ Renamed restaurants → restaurants_backup');

  } catch (error) {
    // If collection doesn't exist, that's okay
    if (error.code === 26) {
      console.log('  ⚠️  restaurants collection does not exist, skipping backup');
    } else {
      console.error('Error in backupRestaurantCollection:', error);
      throw error;
    }
  }
}

/**
 * Print migration summary
 */
function printMigrationSummary() {
  console.log('\n========================================');
  console.log('Migration Summary');
  console.log('========================================');
  console.log(`Buyers created:         ${stats.buyers.created} (${stats.buyers.failed} failed)`);
  console.log(`Users updated:          ${stats.users.updated}`);
  console.log(`Orders updated:         ${stats.orders.updated}`);
  console.log(`Budgets updated:        ${stats.budgets.updated}`);
  console.log(`Notifications updated:  ${stats.notifications.updated}`);
  console.log('========================================\n');
}

/**
 * Rollback migration
 */
async function rollback() {
  try {
    console.log('\n========================================');
    console.log('Starting Migration Rollback');
    console.log('========================================\n');

    const db = mongoose.connection.db;

    // Check if backup exists
    const collections = await db.listCollections({ name: 'restaurants_backup' }).toArray();
    if (collections.length === 0) {
      console.log('❌ No backup found (restaurants_backup). Cannot rollback.');
      return;
    }

    console.log('Step 1: Restoring Restaurant collection from backup...');
    await db.collection('restaurants_backup').rename('restaurants');
    console.log('  ✓ Restored restaurants collection');

    console.log('\nStep 2: Reverting User roles and fields...');
    await User.updateMany(
      { role: 'buyerOwner' },
      {
        $set: { role: 'restaurantOwner' },
        $rename: { buyerId: 'restaurantId' }
      }
    );
    await User.updateMany(
      { role: 'buyerManager' },
      {
        $set: { role: 'restaurantManager' },
        $rename: { buyerId: 'restaurantId' }
      }
    );
    console.log('  ✓ Reverted user roles and fields');

    console.log('\nStep 3: Reverting Order fields...');
    await Order.updateMany(
      { buyerId: { $exists: true } },
      { $rename: { buyerId: 'restaurantId' } }
    );
    console.log('  ✓ Reverted order fields');

    console.log('\nStep 4: Reverting Budget fields...');
    await Budget.updateMany(
      { buyerId: { $exists: true } },
      { $rename: { buyerId: 'restaurantId' } }
    );
    console.log('  ✓ Reverted budget fields');

    console.log('\nStep 5: Reverting Notification types...');
    await Notification.updateMany(
      { recipientType: 'buyerOwner' },
      { $set: { recipientType: 'restaurantOwner' } }
    );
    await Notification.updateMany(
      { recipientType: 'buyerManager' },
      { $set: { recipientType: 'restaurantManager' } }
    );
    await Notification.updateMany(
      { 'relatedEntity.entityType': 'buyer' },
      { $set: { 'relatedEntity.entityType': 'restaurant' } }
    );
    console.log('  ✓ Reverted notification types');

    console.log('\nStep 6: Removing Buyer collection...');
    await db.collection('buyers').drop();
    console.log('  ✓ Dropped buyers collection');

    console.log('\n✅ Rollback completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB');

    // Check if rollback flag is present
    const isRollback = process.argv.includes('--rollback');

    if (isRollback) {
      await rollback();
    } else {
      await migrate();
    }

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run migration
main();
