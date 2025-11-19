/**
 * Cleanup existing buyers collection and re-run migration
 *
 * Usage: node scripts/cleanup-and-migrate.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function cleanup() {
  try {
    console.log('\n========================================');
    console.log('Cleanup and Migration Script');
    console.log('========================================\n');

    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Step 1: Check if buyers collection exists
    const collections = await db.listCollections({ name: 'buyers' }).toArray();

    if (collections.length > 0) {
      console.log('Step 1: Found existing buyers collection');

      // Count documents
      const buyerCount = await db.collection('buyers').countDocuments();
      console.log(`  - Contains ${buyerCount} documents`);

      // Drop the collection
      console.log('  - Dropping buyers collection...');
      await db.collection('buyers').drop();
      console.log('  ✓ Buyers collection dropped\n');
    } else {
      console.log('Step 1: No existing buyers collection found\n');
    }

    // Step 2: Check for restaurants collection
    const restaurantCollections = await db.listCollections({ name: 'restaurants' }).toArray();

    if (restaurantCollections.length === 0) {
      console.log('Step 2: Checking for restaurants_backup...');
      const backupCollections = await db.listCollections({ name: 'restaurants_backup' }).toArray();

      if (backupCollections.length > 0) {
        console.log('  - Found restaurants_backup, restoring to restaurants...');
        await db.collection('restaurants_backup').rename('restaurants');
        console.log('  ✓ Restored restaurants from backup\n');
      } else {
        console.log('  ⚠️  No restaurants or restaurants_backup found!');
        console.log('  This means the data may have already been fully migrated.\n');
      }
    } else {
      const restaurantCount = await db.collection('restaurants').countDocuments();
      console.log(`Step 2: Found restaurants collection with ${restaurantCount} documents\n`);
    }

    // Step 3: Reset user roles and references if needed
    console.log('Step 3: Checking user collection...');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const buyerOwnerCount = await User.countDocuments({ role: 'buyerOwner' });
    const buyerManagerCount = await User.countDocuments({ role: 'buyerManager' });

    console.log(`  - Found ${buyerOwnerCount} buyerOwner users`);
    console.log(`  - Found ${buyerManagerCount} buyerManager users`);

    if (buyerOwnerCount > 0 || buyerManagerCount > 0) {
      console.log('  - Reverting user roles back to restaurant roles...');

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

      console.log('  ✓ User roles reverted to restaurant roles\n');
    } else {
      console.log('  - No buyer roles found in users\n');
    }

    // Step 4: Reset orders if needed
    console.log('Step 4: Checking orders collection...');
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

    const ordersWithBuyerId = await Order.countDocuments({ buyerId: { $exists: true } });

    if (ordersWithBuyerId > 0) {
      console.log(`  - Found ${ordersWithBuyerId} orders with buyerId`);
      console.log('  - Reverting to restaurantId...');

      await Order.updateMany(
        { buyerId: { $exists: true } },
        { $rename: { buyerId: 'restaurantId' } }
      );

      console.log('  ✓ Orders reverted to restaurantId\n');
    } else {
      console.log('  - No orders with buyerId found\n');
    }

    // Step 5: Reset budgets if needed
    console.log('Step 5: Checking budgets collection...');
    const Budget = mongoose.model('Budget', new mongoose.Schema({}, { strict: false }));

    const budgetsWithBuyerId = await Budget.countDocuments({ buyerId: { $exists: true } });

    if (budgetsWithBuyerId > 0) {
      console.log(`  - Found ${budgetsWithBuyerId} budgets with buyerId`);
      console.log('  - Reverting to restaurantId...');

      await Budget.updateMany(
        { buyerId: { $exists: true } },
        { $rename: { buyerId: 'restaurantId' } }
      );

      console.log('  ✓ Budgets reverted to restaurantId\n');
    } else {
      console.log('  - No budgets with buyerId found\n');
    }

    console.log('========================================');
    console.log('✅ Cleanup completed successfully!');
    console.log('========================================\n');
    console.log('Now run: node scripts/migrate-restaurant-to-buyer.js\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

cleanup();
