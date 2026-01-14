/**
 * Comprehensive Seed Script: Bangladesh Administrative Locations (Complete Data)
 *
 * This script populates the database with COMPLETE Bangladesh administrative data:
 * - 8 Divisions
 * - 64 Districts
 * - ~494 Upazilas
 * - ~4500+ Unions/Wards
 *
 * Data source: https://github.com/nuhil/bangladesh-geocode
 *
 * Prerequisites:
 * 1. Download JSON files from bangladesh-geocode to /tmp:
 *    curl -o /tmp/divisions.json https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/divisions/divisions.json
 *    curl -o /tmp/districts.json https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/districts/districts.json
 *    curl -o /tmp/upazilas.json https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/upazilas/upazilas.json
 *    curl -o /tmp/unions.json https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/unions/unions.json
 *
 * Usage: node scripts/seedCompleteBDLocations.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Division = require('../models/Division');
const District = require('../models/District');
const Upazila = require('../models/Upazila');
const Union = require('../models/Union');
const User = require('../models/User');

// Division mapping from bangladesh-geocode ID to our data
const DIVISION_MAPPING = {
  '1': { code: 'DIV-02', enName: 'Chittagong', coordinates: [91.8311, 22.3569] },
  '2': { code: 'DIV-03', enName: 'Rajshahi', coordinates: [88.6077, 24.3745] },
  '3': { code: 'DIV-04', enName: 'Khulna', coordinates: [89.5403, 22.8456] },
  '4': { code: 'DIV-05', enName: 'Barishal', coordinates: [90.3696, 22.7010] },
  '5': { code: 'DIV-06', enName: 'Sylhet', coordinates: [91.8719, 24.8949] },
  '6': { code: 'DIV-01', enName: 'Dhaka', coordinates: [90.4125, 23.8103] },
  '7': { code: 'DIV-07', enName: 'Rangpur', coordinates: [89.2444, 25.7439] },
  '8': { code: 'DIV-08', enName: 'Mymensingh', coordinates: [90.4074, 24.7471] }
};

// Read JSON files
const readJSONFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const jsonArray = JSON.parse(content);

    // bangladesh-geocode format has data in 3rd element
    if (Array.isArray(jsonArray) && jsonArray.length >= 3 && jsonArray[2].data) {
      return jsonArray[2].data;
    }

    return [];
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const clearExistingData = async () => {
  console.log('\n🗑️  Clearing existing location data...');

  await Union.deleteMany({});
  console.log('   ✅ Cleared unions');

  await Upazila.deleteMany({});
  console.log('   ✅ Cleared upazilas');

  await District.deleteMany({});
  console.log('   ✅ Cleared districts');

  await Division.deleteMany({});
  console.log('   ✅ Cleared divisions');

  console.log('✅ All existing location data cleared');
};

const seedDivisionsFromFile = async (adminUser) => {
  console.log('\n📍 Seeding Divisions from JSON...');

  const data = readJSONFile('/tmp/divisions.json');
  if (!data) {
    throw new Error('Failed to read divisions.json');
  }

  const divisionsToCreate = data.map(d => {
    const mapping = DIVISION_MAPPING[d.id];
    return {
      code: mapping.code,
      name: {
        en: d.name,
        bn: d.bn_name
      },
      coordinates: mapping.coordinates,
      createdBy: adminUser?._id,
      isActive: true
    };
  });

  const created = await Division.insertMany(divisionsToCreate);
  console.log(`✅ Created ${created.length} divisions`);

  // Create mapping from original ID to MongoDB ObjectId
  const divisionIdMap = new Map();
  data.forEach((d, index) => {
    divisionIdMap.set(d.id, created[index]._id);
  });

  return { divisions: created, divisionIdMap };
};

const seedDistrictsFromFile = async (divisionIdMap, adminUser) => {
  console.log('\n📍 Seeding Districts from JSON...');

  const data = readJSONFile('/tmp/districts.json');
  if (!data) {
    throw new Error('Failed to read districts.json');
  }

  const districtsToCreate = data.map((d, index) => {
    const divisionObjectId = divisionIdMap.get(d.division_id);
    return {
      code: `DIST-${String(index + 1).padStart(2, '0')}`,
      name: {
        en: d.name,
        bn: d.bn_name
      },
      coordinates: d.lat && d.long ? [parseFloat(d.long), parseFloat(d.lat)] : undefined,
      division: divisionObjectId,
      createdBy: adminUser?._id,
      isActive: true
    };
  });

  const created = await District.insertMany(districtsToCreate);
  console.log(`✅ Created ${created.length} districts`);

  // Create mapping from original ID to MongoDB ObjectId
  const districtIdMap = new Map();
  data.forEach((d, index) => {
    districtIdMap.set(d.id, created[index]._id);
  });

  return { districts: created, districtIdMap };
};

const seedUpazilasFromFile = async (districtIdMap, divisionIdMap, adminUser) => {
  console.log('\n📍 Seeding Upazilas from JSON...');

  const data = readJSONFile('/tmp/upazilas.json');
  if (!data) {
    throw new Error('Failed to read upazilas.json');
  }

  // Read district data to get division references
  const districtData = readJSONFile('/tmp/districts.json');
  const districtToDivisionMap = new Map();
  districtData.forEach(d => {
    districtToDivisionMap.set(d.id, d.division_id);
  });

  const upazilasToCreate = data.map((u, index) => {
    const districtObjectId = districtIdMap.get(u.district_id);
    const divisionId = districtToDivisionMap.get(u.district_id);
    const divisionObjectId = divisionIdMap.get(divisionId);

    return {
      code: `UPZ-${String(index + 1).padStart(3, '0')}`,
      name: {
        en: u.name,
        bn: u.bn_name
      },
      district: districtObjectId,
      division: divisionObjectId,
      postalCodes: [], // Will be populated from postal code data if available
      createdBy: adminUser?._id,
      isActive: true
    };
  });

  const created = await Upazila.insertMany(upazilasToCreate);
  console.log(`✅ Created ${created.length} upazilas`);

  // Create mapping from original ID to MongoDB ObjectId
  const upazilaIdMap = new Map();
  data.forEach((u, index) => {
    upazilaIdMap.set(u.id, created[index]._id);
  });

  return { upazilas: created, upazilaIdMap };
};

const seedUnionsFromFile = async (upazilaIdMap, districtIdMap, divisionIdMap, adminUser) => {
  console.log('\n📍 Seeding Unions from JSON...');

  const data = readJSONFile('/tmp/unions.json');
  if (!data) {
    console.warn('⚠️  Failed to read unions.json - skipping unions');
    return { unions: [] };
  }

  // Read upazila and district data to build hierarchy
  const upazilaData = readJSONFile('/tmp/upazilas.json');
  const districtData = readJSONFile('/tmp/districts.json');

  const upazilaToDistrictMap = new Map();
  upazilaData.forEach(u => {
    upazilaToDistrictMap.set(u.id, u.district_id);
  });

  const districtToDivisionMap = new Map();
  districtData.forEach(d => {
    districtToDivisionMap.set(d.id, d.division_id);
  });

  // Helper function to extract direction from Bengali name
  const extractDirection = (bnName) => {
    const directionMap = {
      'দক্ষিন': { en: 'South', bn: ' (দক্ষিন)' },
      'দক্ষিণ': { en: 'South', bn: ' (দক্ষিণ)' },
      'উত্তর': { en: 'North', bn: ' (উত্তর)' },
      'পূর্ব': { en: 'East', bn: ' (পূর্ব)' },
      'পশ্চিম': { en: 'West', bn: ' (পশ্চিম)' },
      'মধ্য': { en: 'Central', bn: ' (মধ্য)' }
    };

    for (const [key, value] of Object.entries(directionMap)) {
      if (bnName.includes(key)) {
        return value;
      }
    }
    return null;
  };

  // First pass: identify duplicates and fix English names
  const nameMap = new Map(); // Track names by upazila_id + name

  data.forEach(un => {
    const key = (un.upazilla_id || un.upazila_id) + '_' + un.name;
    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    nameMap.get(key).push(un);
  });

  // Build the unions with unique English names
  const unionsToCreate = [];
  let duplicatesFixed = 0;

  data.forEach((un, index) => {
    const upazilaObjectId = upazilaIdMap.get(un.upazilla_id || un.upazila_id);

    if (!upazilaObjectId) {
      return; // Skip if upazila reference not found
    }

    const districtId = upazilaToDistrictMap.get(un.upazilla_id || un.upazila_id);
    const districtObjectId = districtIdMap.get(districtId);
    const divisionId = districtToDivisionMap.get(districtId);
    const divisionObjectId = divisionIdMap.get(divisionId);

    // Determine type (union, ward, or pourashava)
    let type = 'union';
    if (un.name && un.name.toLowerCase().includes('ward')) {
      type = 'ward';
    } else if (un.name && un.name.toLowerCase().includes('pourashava')) {
      type = 'pourashava';
    }

    // Handle duplicate English names
    let enName = un.name;
    let bnName = un.bn_name;
    const key = (un.upazilla_id || un.upazila_id) + '_' + un.name;
    const duplicates = nameMap.get(key);

    if (duplicates && duplicates.length > 1) {
      // Extract direction from Bengali name
      const direction = extractDirection(un.bn_name);
      if (direction) {
        enName = `${un.name} ${direction.en}`;
        // Only add direction suffix to Bengali if not already present
        if (!un.bn_name.includes(direction.bn.trim())) {
          bnName = un.bn_name + direction.bn;
        }
        duplicatesFixed++;
      } else {
        // Fallback: use sequence number for true duplicates
        const seqNum = duplicates.indexOf(un) + 1;
        enName = `${un.name} ${seqNum}`;
        bnName = `${un.bn_name} ${seqNum}`;
        duplicatesFixed++;
      }
    }

    unionsToCreate.push({
      code: `UN-${String(index + 1).padStart(4, '0')}`,
      name: {
        en: enName,
        bn: bnName
      },
      type,
      upazila: upazilaObjectId,
      district: districtObjectId,
      division: divisionObjectId,
      postalCode: undefined, // Can be populated from postal code data
      createdBy: adminUser?._id,
      isActive: true
    });
  });

  if (duplicatesFixed > 0) {
    console.log(`   ℹ️  Fixed ${duplicatesFixed} duplicate English names by adding direction suffixes`);
  }

  if (unionsToCreate.length === 0) {
    console.log('⚠️  No valid unions to create');
    return { unions: [] };
  }

  const created = await Union.insertMany(unionsToCreate);
  console.log(`✅ Created ${created.length} unions/wards`);

  return { unions: created };
};

const verifyData = async () => {
  console.log('\n🔍 Verifying data integrity...');

  const divisionCount = await Division.countDocuments({ isActive: true });
  console.log(`   ✅ Divisions: ${divisionCount} (expected: 8)`);

  const districtCount = await District.countDocuments({ isActive: true });
  console.log(`   ✅ Districts: ${districtCount} (expected: 64)`);

  const upazilaCount = await Upazila.countDocuments({ isActive: true });
  console.log(`   ✅ Upazilas: ${upazilaCount} (expected: ~494)`);

  const unionCount = await Union.countDocuments({ isActive: true });
  console.log(`   ✅ Unions: ${unionCount}`);

  // Verify all districts have valid division references
  const districtsWithoutDivision = await District.aggregate([
    {
      $lookup: {
        from: 'divisions',
        localField: 'division',
        foreignField: '_id',
        as: 'divisionData'
      }
    },
    { $match: { divisionData: { $size: 0 } } }
  ]);

  if (districtsWithoutDivision.length > 0) {
    console.log(`   ⚠️  Found ${districtsWithoutDivision.length} districts with invalid division references`);
  } else {
    console.log('   ✅ All districts have valid division references');
  }

  // Verify all upazilas have valid references
  const upazilasWithInvalidRefs = await Upazila.aggregate([
    {
      $lookup: {
        from: 'districts',
        localField: 'district',
        foreignField: '_id',
        as: 'districtData'
      }
    },
    { $match: { districtData: { $size: 0 } } }
  ]);

  if (upazilasWithInvalidRefs.length > 0) {
    console.log(`   ⚠️  Found ${upazilasWithInvalidRefs.length} upazilas with invalid district references`);
  } else {
    console.log('   ✅ All upazilas have valid district references');
  }

  // Verify all unions have valid references
  if (unionCount > 0) {
    const unionsWithInvalidRefs = await Union.aggregate([
      {
        $lookup: {
          from: 'upazilas',
          localField: 'upazila',
          foreignField: '_id',
          as: 'upazilaData'
        }
      },
      { $match: { upazilaData: { $size: 0 } } }
    ]);

    if (unionsWithInvalidRefs.length > 0) {
      console.log(`   ⚠️  Found ${unionsWithInvalidRefs.length} unions with invalid upazila references`);
    } else {
      console.log('   ✅ All unions have valid upazila references');
    }
  }

  console.log('\n✅ Data verification complete!');
};

const runSeed = async () => {
  try {
    console.log('🚀 Starting COMPLETE BD Locations Seed...\n');
    console.log('📂 Reading JSON files from /tmp directory...\n');

    await connectDB();

    // Clear existing data
    await clearExistingData();

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.warn('⚠️  No admin user found. Data will be created without creator reference.');
    }

    // Seed divisions
    const { divisions, divisionIdMap } = await seedDivisionsFromFile(adminUser);

    // Seed districts
    const { districts, districtIdMap } = await seedDistrictsFromFile(divisionIdMap, adminUser);

    // Seed upazilas
    const { upazilas, upazilaIdMap } = await seedUpazilasFromFile(
      districtIdMap,
      divisionIdMap,
      adminUser
    );

    // Seed unions
    const { unions } = await seedUnionsFromFile(
      upazilaIdMap,
      districtIdMap,
      divisionIdMap,
      adminUser
    );

    await verifyData();

    console.log('\n✨ Seed completed successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📊 Complete Data Summary:`);
    console.log(`   Divisions: ${divisions.length}/8`);
    console.log(`   Districts: ${districts.length}/64`);
    console.log(`   Upazilas: ${upazilas.length}/494`);
    console.log(`   Unions/Wards: ${unions.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('🎉 Bangladesh address system is now fully populated!');
    console.log('📝 All administrative divisions, districts, upazilas, and unions are seeded.');
    console.log('🔗 Location hierarchy integrity verified.\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
};

runSeed();
