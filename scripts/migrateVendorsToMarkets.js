/**
 * Migration Script: Add Markets Support to Existing Vendors
 *
 * This script:
 * 1. Creates initial market entries in the database
 * 2. Assigns all existing vendors to a default market
 * 3. Ensures all vendors have at least one market assigned
 *
 * Usage: node scripts/migrateVendorsToMarkets.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Market = require('../models/Market');
const Vendor = require('../models/Vendor');
const User = require('../models/User');

// Initial markets data (Bangladesh markets)
const INITIAL_MARKETS = [
  {
    name: 'Dhaka Central Market',
    description: 'Main vegetable wholesale market in central Dhaka serving restaurants across the capital',
    slug: 'dhaka-central-market',
    location: {
      address: 'Kawran Bazar, Dhaka-1215',
      city: 'Dhaka',
      district: 'Dhaka',
      coordinates: [90.3913, 23.7510] // [longitude, latitude]
    },
    image: 'https://res.cloudinary.com/demo/image/upload/v1/markets/dhaka-central.jpg', // Placeholder
    isActive: true,
    isAvailable: true,
    adminStatus: 'active'
  },
  {
    name: 'Karwan Bazar',
    description: 'One of the largest wholesale markets for fresh produce in Dhaka',
    slug: 'karwan-bazar',
    location: {
      address: 'Tejgaon, Dhaka-1215',
      city: 'Dhaka',
      district: 'Dhaka',
      coordinates: [90.3952, 23.7505]
    },
    image: 'https://res.cloudinary.com/demo/image/upload/v1/markets/karwan-bazar.jpg',
    isActive: true,
    isAvailable: true,
    adminStatus: 'active'
  },
  {
    name: 'Chittagong Port Market',
    description: 'Major market hub in Chittagong for imported and local vegetables',
    slug: 'chittagong-port-market',
    location: {
      address: 'Khatunganj, Chittagong-4000',
      city: 'Chittagong',
      district: 'Chittagong',
      coordinates: [91.8311, 22.3587]
    },
    image: 'https://res.cloudinary.com/demo/image/upload/v1/markets/chittagong-port.jpg',
    isActive: true,
    isAvailable: true,
    adminStatus: 'active'
  },
  {
    name: 'Sylhet Fresh Market',
    description: 'Primary wholesale market for fresh vegetables in Sylhet region',
    slug: 'sylhet-fresh-market',
    location: {
      address: 'Zindabazar, Sylhet-3100',
      city: 'Sylhet',
      district: 'Sylhet',
      coordinates: [91.8719, 24.9036]
    },
    image: 'https://res.cloudinary.com/demo/image/upload/v1/markets/sylhet-fresh.jpg',
    isActive: true,
    isAvailable: true,
    adminStatus: 'active'
  },
  {
    name: 'Rajshahi Vegetable Hub',
    description: 'Main agricultural produce market in Rajshahi division',
    slug: 'rajshahi-vegetable-hub',
    location: {
      address: 'Shaheb Bazar, Rajshahi-6100',
      city: 'Rajshahi',
      district: 'Rajshahi',
      coordinates: [88.6077, 24.3745]
    },
    image: 'https://res.cloudinary.com/demo/image/upload/v1/markets/rajshahi-hub.jpg',
    isActive: true,
    isAvailable: true,
    adminStatus: 'active'
  },
  {
    name: 'Khulna Wholesale Market',
    description: 'Central vegetable market serving Khulna and southwest Bangladesh',
    slug: 'khulna-wholesale-market',
    location: {
      address: 'Daulatpur, Khulna-9000',
      city: 'Khulna',
      district: 'Khulna',
      coordinates: [89.5554, 22.8156]
    },
    image: 'https://res.cloudinary.com/demo/image/upload/v1/markets/khulna-wholesale.jpg',
    isActive: true,
    isAvailable: true,
    adminStatus: 'active'
  },
  {
    name: 'General Market',
    description: 'Default market for vendors without specific market assignment',
    slug: 'general-market',
    location: {
      address: 'Various Locations',
      city: 'Nationwide',
      district: 'Bangladesh'
    },
    image: 'https://res.cloudinary.com/demo/image/upload/v1/markets/general.jpg',
    isActive: true,
    isAvailable: true,
    adminStatus: 'active'
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Create initial markets
const createMarkets = async () => {
  try {
    console.log('\n📍 Creating initial markets...');

    // Check if markets already exist
    const existingMarkets = await Market.countDocuments();
    if (existingMarkets > 0) {
      console.log(`⚠️  Found ${existingMarkets} existing markets. Skipping market creation.`);
      const markets = await Market.find();
      return markets;
    }

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.warn('⚠️  No admin user found. Markets will be created without createdBy field.');
    }

    // Create markets with createdBy
    const marketsWithCreator = INITIAL_MARKETS.map(market => ({
      ...market,
      createdBy: adminUser ? adminUser._id : null
    }));

    const createdMarkets = await Market.insertMany(marketsWithCreator);
    console.log(`✅ Created ${createdMarkets.length} markets successfully`);

    // List created markets
    createdMarkets.forEach(market => {
      console.log(`   - ${market.name} (${market.location.city})`);
    });

    return createdMarkets;
  } catch (err) {
    console.error('❌ Error creating markets:', err.message);
    throw err;
  }
};

// Migrate existing vendors to markets
const migrateVendors = async (markets) => {
  try {
    console.log('\n🏪 Migrating vendors to markets...');

    // Find the default "General Market"
    const defaultMarket = markets.find(m => m.slug === 'general-market');
    if (!defaultMarket) {
      throw new Error('Default "General Market" not found');
    }

    // Find all vendors without markets
    const vendorsWithoutMarkets = await Vendor.find({
      $or: [
        { markets: { $exists: false } },
        { markets: { $size: 0 } },
        { markets: null }
      ],
      isDeleted: { $ne: true }
    });

    console.log(`📊 Found ${vendorsWithoutMarkets.length} vendors without markets`);

    if (vendorsWithoutMarkets.length === 0) {
      console.log('✅ All vendors already have markets assigned');
      return { updated: 0, total: 0 };
    }

    // Assign default market to all vendors
    let updatedCount = 0;
    for (const vendor of vendorsWithoutMarkets) {
      try {
        // Assign General Market to vendor
        vendor.markets = [defaultMarket._id];
        await vendor.save();
        updatedCount++;

        if (updatedCount % 10 === 0) {
          console.log(`   ⏳ Updated ${updatedCount}/${vendorsWithoutMarkets.length} vendors...`);
        }
      } catch (err) {
        console.error(`   ❌ Error updating vendor ${vendor.businessName}:`, err.message);
      }
    }

    console.log(`✅ Successfully migrated ${updatedCount} vendors to default market`);

    return {
      updated: updatedCount,
      total: vendorsWithoutMarkets.length
    };
  } catch (err) {
    console.error('❌ Error migrating vendors:', err.message);
    throw err;
  }
};

// Verify migration
const verifyMigration = async () => {
  try {
    console.log('\n🔍 Verifying migration...');

    const totalVendors = await Vendor.countDocuments({ isDeleted: { $ne: true } });
    const vendorsWithMarkets = await Vendor.countDocuments({
      markets: { $exists: true, $ne: [] },
      isDeleted: { $ne: true }
    });

    const vendorsWithoutMarkets = totalVendors - vendorsWithMarkets;

    console.log(`📊 Migration Summary:`);
    console.log(`   Total vendors: ${totalVendors}`);
    console.log(`   Vendors with markets: ${vendorsWithMarkets}`);
    console.log(`   Vendors without markets: ${vendorsWithoutMarkets}`);

    if (vendorsWithoutMarkets > 0) {
      console.warn(`⚠️  ${vendorsWithoutMarkets} vendors still don't have markets!`);
      return false;
    }

    console.log('✅ All vendors have markets assigned');
    return true;
  } catch (err) {
    console.error('❌ Error verifying migration:', err.message);
    return false;
  }
};

// Main migration function
const runMigration = async () => {
  try {
    console.log('🚀 Starting Vendor-to-Markets Migration...\n');

    // Connect to database
    await connectDB();

    // Create initial markets
    const markets = await createMarkets();

    // Migrate vendors
    const migrationResult = await migrateVendors(markets);

    // Verify migration
    const isVerified = await verifyMigration();

    console.log('\n✨ Migration completed!');

    if (isVerified) {
      console.log('✅ All checks passed. Migration successful!');
    } else {
      console.warn('⚠️  Migration completed with warnings. Please review.');
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
};

// Run migration
runMigration();
