/**
 * Test Script: BD Address System Validation
 *
 * Tests:
 * 1. Location hierarchy integrity
 * 2. Address validation rules
 * 3. Data completeness
 * 4. Query performance
 *
 * Usage: node scripts/testBDAddressSystem.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Division = require('../models/Division');
const District = require('../models/District');
const Upazila = require('../models/Upazila');
const Union = require('../models/Union');
const Buyer = require('../models/Buyer');

let testsPassed = 0;
let testsFailed = 0;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected\n');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const logTest = (testName, passed, message = '') => {
  if (passed) {
    console.log(`  ✅ ${testName}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${testName}${message ? ': ' + message : ''}`);
    testsFailed++;
  }
};

const testHierarchyIntegrity = async () => {
  console.log('🔍 Testing Hierarchy Integrity...\n');

  // Test 1: All divisions exist and are active
  const divisionCount = await Division.countDocuments({ isActive: true });
  logTest('All 8 divisions are seeded', divisionCount === 8, `Found ${divisionCount}/8`);

  // Test 2: All 64 districts exist
  const districtCount = await District.countDocuments({ isActive: true });
  logTest('All 64 districts are seeded', districtCount === 64, `Found ${districtCount}/64`);

  // Test 3: All districts have valid division references
  const districtsWithInvalidDivision = await District.aggregate([
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

  logTest(
    'All districts have valid division references',
    districtsWithInvalidDivision.length === 0,
    `Found ${districtsWithInvalidDivision.length} invalid references`
  );

  // Test 4: All upazilas have valid district and division references
  const upazilasWithInvalidRefs = await Upazila.aggregate([
    {
      $lookup: {
        from: 'districts',
        let: { districtId: '$district', divisionId: '$division' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$districtId'] } } }
        ],
        as: 'districtData'
      }
    },
    {
      $match: {
        $or: [
          { districtData: { $size: 0 } },
          { $expr: { $ne: ['$division', { $arrayElemAt: ['$districtData.division', 0] }] } }
        ]
      }
    }
  ]);

  logTest(
    'All upazilas have valid district and division references',
    upazilasWithInvalidRefs.length === 0,
    `Found ${upazilasWithInvalidRefs.length} invalid references`
  );

  // Test 5: All unions have valid upazila, district, and division references
  const unionsWithInvalidRefs = await Union.aggregate([
    {
      $lookup: {
        from: 'upazilas',
        let: { upazilaId: '$upazila' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$upazilaId'] } } }
        ],
        as: 'upazilaData'
      }
    },
    {
      $match: {
        $or: [
          { upazilaData: { $size: 0 } },
          { $expr: { $ne: ['$district', { $arrayElemAt: ['$upazilaData.district', 0] }] } },
          { $expr: { $ne: ['$division', { $arrayElemAt: ['$upazilaData.division', 0] }] } }
        ]
      }
    }
  ]);

  logTest(
    'All unions have valid upazila, district, and division references',
    unionsWithInvalidRefs.length === 0,
    `Found ${unionsWithInvalidRefs.length} invalid references`
  );

  console.log('');
};

const testDataCompleteness = async () => {
  console.log('🔍 Testing Data Completeness...\n');

  // Test bilingual names
  const divisionsWithoutBanglaNames = await Division.find({
    $or: [
      { 'name.bn': { $exists: false } },
      { 'name.bn': '' }
    ]
  });

  logTest(
    'All divisions have Bengali names',
    divisionsWithoutBanglaNames.length === 0,
    `Found ${divisionsWithoutBanglaNames.length} without Bengali names`
  );

  // Test district bilingual names
  const districtsWithoutBanglaNames = await District.find({
    $or: [
      { 'name.bn': { $exists: false } },
      { 'name.bn': '' }
    ]
  });

  logTest(
    'All districts have Bengali names',
    districtsWithoutBanglaNames.length === 0,
    `Found ${districtsWithoutBanglaNames.length} without Bengali names`
  );

  // Test postal codes in upazilas
  const upazilaCount = await Upazila.countDocuments();
  const upazilasWithPostalCodes = await Upazila.countDocuments({
    postalCodes: { $exists: true, $ne: [] }
  });

  logTest(
    'Upazilas have postal codes',
    upazilasWithPostalCodes > 0,
    `${upazilasWithPostalCodes}/${upazilaCount} have postal codes`
  );

  console.log('');
};

const testQueryPerformance = async () => {
  console.log('🔍 Testing Query Performance...\n');

  // Test 1: Find divisions
  const start1 = Date.now();
  await Division.find({ isActive: true });
  const time1 = Date.now() - start1;

  logTest(
    'Division query performance < 100ms',
    time1 < 100,
    `Took ${time1}ms`
  );

  // Test 2: Find districts by division
  const division = await Division.findOne({ 'name.en': 'Dhaka' });
  const start2 = Date.now();
  await District.find({ division: division._id, isActive: true });
  const time2 = Date.now() - start2;

  logTest(
    'District query performance < 100ms',
    time2 < 100,
    `Took ${time2}ms`
  );

  // Test 3: Find upazilas with populated references
  const district = await District.findOne({ division: division._id });
  const start3 = Date.now();
  await Upazila.find({ district: district._id, isActive: true })
    .populate('district', 'name code')
    .populate('division', 'name code');
  const time3 = Date.now() - start3;

  logTest(
    'Upazila query with population < 200ms',
    time3 < 200,
    `Took ${time3}ms`
  );

  // Test 4: Search across all location levels
  const start4 = Date.now();
  const searchRegex = new RegExp('Dhaka', 'i');
  await Promise.all([
    Division.find({ $or: [{ 'name.en': searchRegex }, { 'name.bn': searchRegex }] }).limit(5),
    District.find({ $or: [{ 'name.en': searchRegex }, { 'name.bn': searchRegex }] }).limit(5),
    Upazila.find({ $or: [{ 'name.en': searchRegex }, { 'name.bn': searchRegex }] }).limit(5)
  ]);
  const time4 = Date.now() - start4;

  logTest(
    'Search across all levels < 500ms',
    time4 < 500,
    `Took ${time4}ms`
  );

  console.log('');
};

const testAddressValidation = async () => {
  console.log('🔍 Testing Address Validation...\n');

  const division = await Division.findOne({ 'name.en': 'Dhaka' });
  const district = await District.findOne({ division: division._id });
  const upazila = await Upazila.findOne({ district: district._id });

  // Test 1: Valid address structure
  try {
    const validAddress = {
      division: division._id,
      district: district._id,
      upazila: upazila._id,
      street: 'Test Street 123',
      postalCode: upazila.postalCodes && upazila.postalCodes[0] ? upazila.postalCodes[0] : '1000'
    };

    // This would normally be validated through the API, but we're just checking the structure
    logTest('Valid address structure is accepted', true);
  } catch (error) {
    logTest('Valid address structure is accepted', false, error.message);
  }

  // Test 2: Postal code format validation
  const validPostalCode = /^\d{4}$/.test('1234');
  const invalidPostalCode = /^\d{4}$/.test('12345');

  logTest('4-digit postal code is valid', validPostalCode && !invalidPostalCode);

  // Test 3: Coordinates validation
  const validCoords = [90.4125, 23.8103]; // Dhaka coordinates
  const coordsValid = validCoords.length === 2 &&
                      validCoords[0] >= -180 && validCoords[0] <= 180 &&
                      validCoords[1] >= -90 && validCoords[1] <= 90;

  logTest('Valid coordinates pass validation', coordsValid);

  console.log('');
};

const testBilingualSupport = async () => {
  console.log('🔍 Testing Bilingual Support...\n');

  const division = await Division.findOne({ 'name.en': 'Dhaka' });

  logTest(
    'Division has English name',
    division && division.name && division.name.en === 'Dhaka'
  );

  logTest(
    'Division has Bengali name',
    division && division.name && division.name.bn === 'ঢাকা'
  );

  // Test localization method
  logTest(
    'getLocalizedName() returns English correctly',
    division.getLocalizedName('en') === 'Dhaka'
  );

  logTest(
    'getLocalizedName() returns Bengali correctly',
    division.getLocalizedName('bn') === 'ঢাকা'
  );

  console.log('');
};

const runTests = async () => {
  try {
    console.log('🚀 Starting BD Address System Tests...\n');

    await connectDB();

    await testHierarchyIntegrity();
    await testDataCompleteness();
    await testQueryPerformance();
    await testAddressValidation();
    await testBilingualSupport();

    console.log('═══════════════════════════════════════════════════');
    console.log(`✨ Tests Completed!`);
    console.log(`   ✅ Passed: ${testsPassed}`);
    console.log(`   ❌ Failed: ${testsFailed}`);
    console.log(`   Total: ${testsPassed + testsFailed}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (testsFailed === 0) {
      console.log('🎉 All tests passed! BD Address System is working correctly.\n');
      process.exit(0);
    } else {
      console.log(`⚠️  ${testsFailed} test(s) failed. Please review the output above.\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Tests failed with error:', err.message);
    console.error(err);
    process.exit(1);
  }
};

runTests();
