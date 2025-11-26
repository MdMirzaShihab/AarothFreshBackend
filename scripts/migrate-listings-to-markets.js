/**
 * Migration Script: Add Market Support to Existing Listings
 *
 * This script:
 * 1. Finds all listings without a marketId
 * 2. Assigns each listing to vendor's first market
 * 3. Falls back to "General Market" if vendor has no markets
 * 4. Deactivates listings that cannot be assigned
 *
 * Usage: node scripts/migrate-listings-to-markets.js
 *
 * Pre-requisites:
 * - All vendors must have at least one market (run migrateVendorsToMarkets.js first)
 * - "General Market" must exist in the database
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Listing = require('../models/Listing');
const Vendor = require('../models/Vendor');
const Market = require('../models/Market');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Migrate existing listings to markets
const migrateListings = async () => {
  try {
    console.log('\n📋 Starting listing migration to markets...');

    // Find the default "General Market" or use first available market as fallback
    let fallbackMarket = await Market.findOne({ slug: 'general-market', isDeleted: { $ne: true } });
    if (!fallbackMarket) {
      console.log('⚠️  No "General Market" found, using first available market as fallback...');
      fallbackMarket = await Market.findOne({
        isDeleted: { $ne: true },
        isActive: true,
        isAvailable: true
      });

      if (!fallbackMarket) {
        throw new Error('No active markets found in the database. Please create at least one market first.');
      }
    }
    console.log(`✅ Using fallback market: ${fallbackMarket.name}`);

    // Find all listings without marketId
    const listingsWithoutMarket = await Listing.find({
      $or: [
        { marketId: { $exists: false } },
        { marketId: null }
      ]
    }).populate('vendorId');

    console.log(`\n📊 Found ${listingsWithoutMarket.length} listings without market assignment`);

    if (listingsWithoutMarket.length === 0) {
      console.log('✅ All listings already have markets assigned. Nothing to migrate.');
      return {
        total: 0,
        assigned: 0,
        deactivated: 0,
        errors: 0
      };
    }

    let assignedCount = 0;
    let deactivatedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each listing
    for (const listing of listingsWithoutMarket) {
      try {
        // Get the vendor
        let vendor;
        if (listing.vendorId && typeof listing.vendorId === 'object') {
          vendor = listing.vendorId; // Already populated
        } else {
          vendor = await Vendor.findById(listing.vendorId);
        }

        if (!vendor) {
          console.error(`   ❌ Vendor not found for listing ${listing._id}`);
          // Deactivate listing
          await Listing.updateOne(
            { _id: listing._id },
            {
              status: 'inactive',
              isFlagged: true,
              flagReason: 'Migration: Vendor not found',
              lastStatusUpdate: new Date()
            }
          );
          deactivatedCount++;
          continue;
        }

        let marketToAssign = null;

        // Strategy 1: Assign to vendor's first market
        if (vendor.markets && vendor.markets.length > 0) {
          marketToAssign = vendor.markets[0];
          console.log(`   ✓ Assigning listing ${listing._id} to vendor's first market`);
        }
        // Strategy 2: Fallback to default market
        else {
          marketToAssign = fallbackMarket._id;
          console.log(`   ⚠️  Vendor has no markets. Assigning listing ${listing._id} to fallback market (${fallbackMarket.name})`);
        }

        // Update the listing with marketId
        await Listing.updateOne(
          { _id: listing._id },
          { marketId: marketToAssign },
          { runValidators: false } // Skip validation to avoid circular dependency
        );

        assignedCount++;
      } catch (err) {
        console.error(`   ❌ Error processing listing ${listing._id}:`, err.message);
        errors.push({
          listingId: listing._id,
          error: err.message
        });
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total listings processed: ${listingsWithoutMarket.length}`);
    console.log(`   ✅ Successfully assigned: ${assignedCount}`);
    console.log(`   ⚠️  Deactivated (vendor not found): ${deactivatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(e => {
        console.log(`   - Listing ${e.listingId}: ${e.error}`);
      });
    }

    return {
      total: listingsWithoutMarket.length,
      assigned: assignedCount,
      deactivated: deactivatedCount,
      errors: errorCount
    };
  } catch (err) {
    console.error('❌ Error during migration:', err.message);
    throw err;
  }
};

// Verify migration
const verifyMigration = async () => {
  try {
    console.log('\n🔍 Verifying migration...');

    // Check for listings without markets
    const listingsWithoutMarket = await Listing.countDocuments({
      $or: [
        { marketId: { $exists: false } },
        { marketId: null }
      ]
    });

    if (listingsWithoutMarket > 0) {
      console.log(`⚠️  Warning: ${listingsWithoutMarket} listings still without market assignment`);
      return false;
    }

    // Get statistics
    const totalListings = await Listing.countDocuments();
    const activeListings = await Listing.countDocuments({ status: 'active' });
    const listingsByMarket = await Listing.aggregate([
      {
        $group: {
          _id: '$marketId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'markets',
          localField: '_id',
          foreignField: '_id',
          as: 'market'
        }
      },
      { $unwind: '$market' },
      {
        $project: {
          marketName: '$market.name',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('✅ Migration verified successfully!');
    console.log(`\n📊 Statistics:`);
    console.log(`   Total listings: ${totalListings}`);
    console.log(`   Active listings: ${activeListings}`);
    console.log(`\n   Listings by market:`);
    listingsByMarket.forEach(({ marketName, count }) => {
      console.log(`   - ${marketName}: ${count} listings`);
    });

    return true;
  } catch (err) {
    console.error('❌ Error during verification:', err.message);
    return false;
  }
};

// Main migration function
const runMigration = async () => {
  try {
    console.log('\n🚀 Starting Listing to Market Migration');
    console.log('==========================================\n');

    // Connect to database
    await connectDB();

    // Run migration
    const results = await migrateListings();

    // Verify migration
    const verified = await verifyMigration();

    // Final summary
    console.log('\n==========================================');
    console.log('✅ Migration completed!');
    console.log(`   Processed: ${results.total} listings`);
    console.log(`   Assigned: ${results.assigned}`);
    console.log(`   Deactivated: ${results.deactivated}`);
    console.log(`   Errors: ${results.errors}`);
    console.log(`   Verified: ${verified ? 'Yes' : 'No'}`);
    console.log('==========================================\n');

    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Database disconnected');

    process.exit(results.errors > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the migration
runMigration();
