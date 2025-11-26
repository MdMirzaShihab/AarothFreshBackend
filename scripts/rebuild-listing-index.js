/**
 * Script to Rebuild Listing Price Index
 *
 * This script drops the old pricing.pricePerUnit index and creates
 * the new pricing.pricePerBaseUnit index after the field migration.
 *
 * Usage:
 *   node scripts/rebuild-listing-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully\n');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const rebuildIndex = async () => {
  try {
    console.log('========================================');
    console.log('Rebuild Listing Price Index');
    console.log('========================================\n');

    const db = mongoose.connection.db;
    const collection = db.collection('listings');

    // Get existing indexes
    console.log('Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log(`Found ${indexes.length} indexes\n`);

    // Check if old index exists
    const oldIndexName = 'pricing.pricePerUnit_1';
    const hasOldIndex = indexes.some(idx => idx.name === oldIndexName);

    if (hasOldIndex) {
      console.log(`Dropping old index: ${oldIndexName}`);
      try {
        await collection.dropIndex(oldIndexName);
        console.log('✓ Old index dropped successfully\n');
      } catch (error) {
        if (error.code === 27) {
          console.log('⚠ Old index does not exist (already dropped)\n');
        } else {
          throw error;
        }
      }
    } else {
      console.log('⚠ Old index not found (may have been dropped already)\n');
    }

    // Create new index
    console.log('Creating new index: pricing.pricePerBaseUnit_1');
    await collection.createIndex(
      { 'pricing.pricePerBaseUnit': 1 },
      { background: true, name: 'pricing.pricePerBaseUnit_1' }
    );
    console.log('✓ New index created successfully\n');

    // Verify new indexes
    const updatedIndexes = await collection.indexes();
    console.log('Current indexes:');
    updatedIndexes.forEach(idx => {
      console.log(`  - ${idx.name}`);
    });

    console.log('\n========================================');
    console.log('✅ Index rebuild completed successfully!');
    console.log('========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Index rebuild failed:', error);
    process.exit(1);
  }
};

const runScript = async () => {
  await connectDB();
  await rebuildIndex();
  mongoose.connection.close();
};

runScript();
