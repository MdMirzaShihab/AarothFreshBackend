/**
 * Migration Script: Add Pack-Based Selling Support
 *
 * This script migrates existing listings to support the new pack-based selling system.
 * It converts the old pricing structure to the new format while maintaining backward compatibility.
 *
 * Changes:
 * - Renames `pricePerUnit` to `pricePerBaseUnit`
 * - Renames `minimumQuantity` to converted pack values
 * - Renames `maximumQuantity` to converted pack values
 * - Sets `enablePackSelling` to false for all existing listings
 * - Sets default `packSize` to 1 (meaning no packing)
 *
 * Usage:
 *   node scripts/migrate-pack-based-selling.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration function
const migrateListing = async () => {
  try {
    console.log('Starting pack-based selling migration...\n');

    const Listing = mongoose.model('Listing', require('../models/Listing').schema);

    // Find all listings
    const listings = await Listing.find({});
    console.log(`Found ${listings.length} listings to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const listing of listings) {
      try {
        let needsUpdate = false;

        if (listing.pricing && listing.pricing.length > 0) {
          listing.pricing.forEach((price, index) => {
            // Check if already migrated
            if (price.pricePerBaseUnit !== undefined && price.pricePerBaseUnit !== null) {
              console.log(`Skipping listing ${listing._id} - already migrated`);
              skippedCount++;
              return;
            }

            // Migrate pricePerUnit to pricePerBaseUnit
            if (price.pricePerUnit !== undefined && price.pricePerUnit !== null) {
              price.pricePerBaseUnit = price.pricePerUnit;
              needsUpdate = true;
            }

            // Set pack-based selling fields with defaults
            if (price.enablePackSelling === undefined) {
              price.enablePackSelling = false;
              price.packSize = 1; // Default: 1 unit per "pack" (no packing)
              price.packUnit = 'pack';
              needsUpdate = true;
            }

            // Convert minimumQuantity to minimumPacks
            if (price.minimumQuantity !== undefined && price.minimumPacks === undefined) {
              // Since packSize = 1, minimumPacks = minimumQuantity
              price.minimumPacks = price.minimumQuantity || 1;
              needsUpdate = true;
            }

            // Convert maximumQuantity to maximumPacks
            if (price.maximumQuantity !== undefined && price.maximumPacks === undefined) {
              // Since packSize = 1, maximumPacks = maximumQuantity
              price.maximumPacks = price.maximumQuantity;
              needsUpdate = true;
            }
          });
        }

        if (needsUpdate) {
          // Save without running validation to avoid issues with new required fields
          await listing.save({ validateBeforeSave: false });
          migratedCount++;
          console.log(`✓ Migrated listing ${listing._id} (${listing.availability?.unit})`);
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating listing ${listing._id}:`, error.message);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total listings: ${listings.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Skipped (already migrated): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('=========================\n');

    if (errorCount > 0) {
      console.log('⚠️  Some listings failed to migrate. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
const runMigration = async () => {
  console.log('========================================');
  console.log('Pack-Based Selling Migration');
  console.log('========================================\n');
  console.log('This will migrate all existing listings to support pack-based selling.');
  console.log('All existing listings will be set to non-pack mode (packSize = 1).\n');

  await connectDB();
  await migrateListing();

  mongoose.connection.close();
};

// Execute
runMigration();
