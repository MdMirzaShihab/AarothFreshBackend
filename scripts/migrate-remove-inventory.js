/**
 * Database Migration Script - Remove Inventory System
 *
 * Purpose: Migrate all listings to non-inventory type and remove inventory references
 *
 * Changes:
 * - Set all listings.listingType to 'non_inventory'
 * - Remove inventoryId references from listings
 * - Keep availability data intact (quantityAvailable, unit)
 *
 * Run: node scripts/migrate-remove-inventory.js
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Listing = require('../models/Listing');

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Migration function
const migrate = async () => {
  console.log('\n==============================================');
  console.log('  INVENTORY SYSTEM REMOVAL MIGRATION');
  console.log('==============================================\n');

  try {
    // Connect to database
    await connectDB();

    // Get all listings
    const listings = await Listing.find({});
    console.log(`Found ${listings.length} listings to migrate\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Update each listing
    for (const listing of listings) {
      try {
        let updated = false;

        // Set listingType to non_inventory if not already
        if (listing.listingType !== 'non_inventory') {
          listing.listingType = 'non_inventory';
          updated = true;
        }

        // Remove inventoryId reference
        if (listing.inventoryId) {
          listing.inventoryId = undefined;
          updated = true;
        }

        // Save if changes were made
        if (updated) {
          await listing.save({ validateBeforeSave: false });
          updatedCount++;
          console.log(`✓ Updated listing: ${listing._id} (${listing.productId?.name || 'Unknown Product'})`);
        } else {
          skippedCount++;
          console.log(`- Skipped listing: ${listing._id} (already non-inventory)`);
        }

      } catch (error) {
        errors.push({
          listingId: listing._id,
          error: error.message
        });
        console.error(`✗ Error updating listing ${listing._id}:`, error.message);
      }
    }

    // Summary
    console.log('\n==============================================');
    console.log('  MIGRATION SUMMARY');
    console.log('==============================================');
    console.log(`Total Listings:    ${listings.length}`);
    console.log(`Updated:           ${updatedCount}`);
    console.log(`Skipped:           ${skippedCount}`);
    console.log(`Errors:            ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(err => {
        console.log(`  - Listing ${err.listingId}: ${err.error}`);
      });
    }

    console.log('\n✓ Migration completed successfully!\n');
    console.log('Notes:');
    console.log('  - All listings are now set to listingType: "non_inventory"');
    console.log('  - Inventory references have been removed');
    console.log('  - Availability data (quantityAvailable) is preserved');
    console.log('  - Pack-based selling functionality remains intact\n');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed\n');
  }
};

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = migrate;
