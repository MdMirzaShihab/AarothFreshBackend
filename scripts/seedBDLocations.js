/**
 * Seed Script: Bangladesh Administrative Locations
 *
 * This script populates the database with Bangladesh administrative divisions,
 * districts, upazilas, and unions using data structure from bangladesh-geocode.
 *
 * Data source: https://github.com/nuhil/bangladesh-geocode
 *
 * Usage: node scripts/seedBDLocations.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Division = require('../models/Division');
const District = require('../models/District');
const Upazila = require('../models/Upazila');
const Union = require('../models/Union');
const User = require('../models/User');

// Bangladesh Divisions Data (8 divisions)
const DIVISIONS = [
  {
    code: 'DIV-01',
    name: { en: 'Dhaka', bn: 'ঢাকা' },
    coordinates: [90.4125, 23.8103]
  },
  {
    code: 'DIV-02',
    name: { en: 'Chittagong', bn: 'চট্টগ্রাম' },
    coordinates: [91.8311, 22.3569]
  },
  {
    code: 'DIV-03',
    name: { en: 'Rajshahi', bn: 'রাজশাহী' },
    coordinates: [88.6077, 24.3745]
  },
  {
    code: 'DIV-04',
    name: { en: 'Khulna', bn: 'খুলনা' },
    coordinates: [89.5403, 22.8456]
  },
  {
    code: 'DIV-05',
    name: { en: 'Barishal', bn: 'বরিশাল' },
    coordinates: [90.3696, 22.7010]
  },
  {
    code: 'DIV-06',
    name: { en: 'Sylhet', bn: 'সিলেট' },
    coordinates: [91.8719, 24.8949]
  },
  {
    code: 'DIV-07',
    name: { en: 'Rangpur', bn: 'রংপুর' },
    coordinates: [89.2444, 25.7439]
  },
  {
    code: 'DIV-08',
    name: { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
    coordinates: [90.4074, 24.7471]
  }
];

// Districts Data (64 districts organized by division)
// Source: https://github.com/nuhil/bangladesh-geocode
const DISTRICTS = [
  // Dhaka Division (DIV-01)
  { code: 'DIST-01', divisionCode: 'DIV-01', name: { en: 'Dhaka', bn: 'ঢাকা' }, coordinates: [90.4125, 23.8103] },
  { code: 'DIST-02', divisionCode: 'DIV-01', name: { en: 'Faridpur', bn: 'ফরিদপুর' }, coordinates: [89.8429, 23.6070] },
  { code: 'DIST-03', divisionCode: 'DIV-01', name: { en: 'Gazipur', bn: 'গাজীপুর' }, coordinates: [90.4203, 24.0022] },
  { code: 'DIST-04', divisionCode: 'DIV-01', name: { en: 'Gopalganj', bn: 'গোপালগঞ্জ' }, coordinates: [89.8266, 23.0050] },
  { code: 'DIST-05', divisionCode: 'DIV-01', name: { en: 'Kishoreganj', bn: 'কিশোরগঞ্জ' }, coordinates: [90.7769, 24.4260] },
  { code: 'DIST-06', divisionCode: 'DIV-01', name: { en: 'Madaripur', bn: 'মাদারীপুর' }, coordinates: [90.1896, 23.1641] },
  { code: 'DIST-07', divisionCode: 'DIV-01', name: { en: 'Manikganj', bn: 'মানিকগঞ্জ' }, coordinates: [90.0003, 23.8617] },
  { code: 'DIST-08', divisionCode: 'DIV-01', name: { en: 'Munshiganj', bn: 'মুন্সিগঞ্জ' }, coordinates: [90.5303, 23.5422] },
  { code: 'DIST-09', divisionCode: 'DIV-01', name: { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ' }, coordinates: [90.5000, 23.6238] },
  { code: 'DIST-10', divisionCode: 'DIV-01', name: { en: 'Narsingdi', bn: 'নরসিংদী' }, coordinates: [90.7151, 23.9229] },
  { code: 'DIST-11', divisionCode: 'DIV-01', name: { en: 'Rajbari', bn: 'রাজবাড়ী' }, coordinates: [89.6444, 23.7574] },
  { code: 'DIST-12', divisionCode: 'DIV-01', name: { en: 'Shariatpur', bn: 'শরীয়তপুর' }, coordinates: [90.4348, 23.2423] },
  { code: 'DIST-13', divisionCode: 'DIV-01', name: { en: 'Tangail', bn: 'টাঙ্গাইল' }, coordinates: [89.9167, 24.2513] },

  // Chittagong Division (DIV-02)
  { code: 'DIST-14', divisionCode: 'DIV-02', name: { en: 'Bandarban', bn: 'বান্দরবান' }, coordinates: [92.2185, 22.1953] },
  { code: 'DIST-15', divisionCode: 'DIV-02', name: { en: 'Brahmanbaria', bn: 'ব্রাহ্মণবাড়িয়া' }, coordinates: [91.1119, 23.9608] },
  { code: 'DIST-16', divisionCode: 'DIV-02', name: { en: 'Chandpur', bn: 'চাঁদপুর' }, coordinates: [90.6712, 23.2332] },
  { code: 'DIST-17', divisionCode: 'DIV-02', name: { en: 'Chittagong', bn: 'চট্টগ্রাম' }, coordinates: [91.8311, 22.3569] },
  { code: 'DIST-18', divisionCode: 'DIV-02', name: { en: 'Comilla', bn: 'কুমিল্লা' }, coordinates: [91.1809, 23.4607] },
  { code: 'DIST-19', divisionCode: 'DIV-02', name: { en: 'Cox\'s Bazar', bn: 'কক্সবাজার' }, coordinates: [91.9795, 21.4272] },
  { code: 'DIST-20', divisionCode: 'DIV-02', name: { en: 'Feni', bn: 'ফেনী' }, coordinates: [91.3976, 23.0159] },
  { code: 'DIST-21', divisionCode: 'DIV-02', name: { en: 'Khagrachari', bn: 'খাগড়াছড়ি' }, coordinates: [91.9847, 23.1193] },
  { code: 'DIST-22', divisionCode: 'DIV-02', name: { en: 'Lakshmipur', bn: 'লক্ষ্মীপুর' }, coordinates: [90.8412, 22.9447] },
  { code: 'DIST-23', divisionCode: 'DIV-02', name: { en: 'Noakhali', bn: 'নোয়াখালী' }, coordinates: [91.0973, 22.8696] },
  { code: 'DIST-24', divisionCode: 'DIV-02', name: { en: 'Rangamati', bn: 'রাঙ্গামাটি' }, coordinates: [92.1750, 22.7324] },

  // Rajshahi Division (DIV-03)
  { code: 'DIST-25', divisionCode: 'DIV-03', name: { en: 'Bogura', bn: 'বগুড়া' }, coordinates: [89.3697, 24.8465] },
  { code: 'DIST-26', divisionCode: 'DIV-03', name: { en: 'Joypurhat', bn: 'জয়পুরহাট' }, coordinates: [89.0294, 25.0968] },
  { code: 'DIST-27', divisionCode: 'DIV-03', name: { en: 'Naogaon', bn: 'নওগাঁ' }, coordinates: [88.9318, 24.7936] },
  { code: 'DIST-28', divisionCode: 'DIV-03', name: { en: 'Natore', bn: 'নাটোর' }, coordinates: [89.0000, 24.4206] },
  { code: 'DIST-29', divisionCode: 'DIV-03', name: { en: 'Chapainawabganj', bn: 'চাঁপাইনবাবগঞ্জ' }, coordinates: [88.2775, 24.5965] },
  { code: 'DIST-30', divisionCode: 'DIV-03', name: { en: 'Pabna', bn: 'পাবনা' }, coordinates: [89.2372, 24.0064] },
  { code: 'DIST-31', divisionCode: 'DIV-03', name: { en: 'Rajshahi', bn: 'রাজশাহী' }, coordinates: [88.6077, 24.3745] },
  { code: 'DIST-32', divisionCode: 'DIV-03', name: { en: 'Sirajganj', bn: 'সিরাজগঞ্জ' }, coordinates: [89.7006, 24.4533] },

  // Khulna Division (DIV-04)
  { code: 'DIST-33', divisionCode: 'DIV-04', name: { en: 'Bagerhat', bn: 'বাগেরহাট' }, coordinates: [89.7850, 22.6516] },
  { code: 'DIST-34', divisionCode: 'DIV-04', name: { en: 'Chuadanga', bn: 'চুয়াডাঙ্গা' }, coordinates: [88.8414, 23.6401] },
  { code: 'DIST-35', divisionCode: 'DIV-04', name: { en: 'Jessore', bn: 'যশোর' }, coordinates: [89.2081, 23.1634] },
  { code: 'DIST-36', divisionCode: 'DIV-04', name: { en: 'Jhenaidah', bn: 'ঝিনাইদহ' }, coordinates: [89.1539, 23.5450] },
  { code: 'DIST-37', divisionCode: 'DIV-04', name: { en: 'Khulna', bn: 'খুলনা' }, coordinates: [89.5403, 22.8456] },
  { code: 'DIST-38', divisionCode: 'DIV-04', name: { en: 'Kushtia', bn: 'কুষ্টিয়া' }, coordinates: [89.1199, 23.9011] },
  { code: 'DIST-39', divisionCode: 'DIV-04', name: { en: 'Magura', bn: 'মাগুরা' }, coordinates: [89.4197, 23.4855] },
  { code: 'DIST-40', divisionCode: 'DIV-04', name: { en: 'Meherpur', bn: 'মেহেরপুর' }, coordinates: [88.6318, 23.7722] },
  { code: 'DIST-41', divisionCode: 'DIV-04', name: { en: 'Narail', bn: 'নড়াইল' }, coordinates: [89.5125, 23.1163] },
  { code: 'DIST-42', divisionCode: 'DIV-04', name: { en: 'Satkhira', bn: 'সাতক্ষীরা' }, coordinates: [89.0700, 22.7186] },

  // Barishal Division (DIV-05)
  { code: 'DIST-43', divisionCode: 'DIV-05', name: { en: 'Barguna', bn: 'বরগুনা' }, coordinates: [90.1121, 22.1595] },
  { code: 'DIST-44', divisionCode: 'DIV-05', name: { en: 'Barishal', bn: 'বরিশাল' }, coordinates: [90.3696, 22.7010] },
  { code: 'DIST-45', divisionCode: 'DIV-05', name: { en: 'Bhola', bn: 'ভোলা' }, coordinates: [90.6482, 22.6859] },
  { code: 'DIST-46', divisionCode: 'DIV-05', name: { en: 'Jhalokati', bn: 'ঝালকাঠি' }, coordinates: [90.1870, 22.6406] },
  { code: 'DIST-47', divisionCode: 'DIV-05', name: { en: 'Patuakhali', bn: 'পটুয়াখালী' }, coordinates: [90.3298, 22.3596] },
  { code: 'DIST-48', divisionCode: 'DIV-05', name: { en: 'Pirojpur', bn: 'পিরোজপুর' }, coordinates: [89.9720, 22.5791] },

  // Sylhet Division (DIV-06)
  { code: 'DIST-49', divisionCode: 'DIV-06', name: { en: 'Habiganj', bn: 'হবিগঞ্জ' }, coordinates: [91.4152, 24.3745] },
  { code: 'DIST-50', divisionCode: 'DIV-06', name: { en: 'Moulvibazar', bn: 'মৌলভীবাজার' }, coordinates: [91.7774, 24.4829] },
  { code: 'DIST-51', divisionCode: 'DIV-06', name: { en: 'Sunamganj', bn: 'সুনামগঞ্জ' }, coordinates: [91.3958, 25.0658] },
  { code: 'DIST-52', divisionCode: 'DIV-06', name: { en: 'Sylhet', bn: 'সিলেট' }, coordinates: [91.8719, 24.8949] },

  // Rangpur Division (DIV-07)
  { code: 'DIST-53', divisionCode: 'DIV-07', name: { en: 'Dinajpur', bn: 'দিনাজপুর' }, coordinates: [88.6354, 25.6217] },
  { code: 'DIST-54', divisionCode: 'DIV-07', name: { en: 'Gaibandha', bn: 'গাইবান্ধা' }, coordinates: [89.5280, 25.3288] },
  { code: 'DIST-55', divisionCode: 'DIV-07', name: { en: 'Kurigram', bn: 'কুড়িগ্রাম' }, coordinates: [89.6294, 25.8072] },
  { code: 'DIST-56', divisionCode: 'DIV-07', name: { en: 'Lalmonirhat', bn: 'লালমনিরহাট' }, coordinates: [89.2847, 25.9923] },
  { code: 'DIST-57', divisionCode: 'DIV-07', name: { en: 'Nilphamari', bn: 'নীলফামারী' }, coordinates: [88.8563, 25.9317] },
  { code: 'DIST-58', divisionCode: 'DIV-07', name: { en: 'Panchagarh', bn: 'পঞ্চগড়' }, coordinates: [88.5541, 26.3411] },
  { code: 'DIST-59', divisionCode: 'DIV-07', name: { en: 'Rangpur', bn: 'রংপুর' }, coordinates: [89.2444, 25.7439] },
  { code: 'DIST-60', divisionCode: 'DIV-07', name: { en: 'Thakurgaon', bn: 'ঠাকুরগাঁও' }, coordinates: [88.4616, 26.0336] },

  // Mymensingh Division (DIV-08)
  { code: 'DIST-61', divisionCode: 'DIV-08', name: { en: 'Jamalpur', bn: 'জামালপুর' }, coordinates: [89.9370, 24.9375] },
  { code: 'DIST-62', divisionCode: 'DIV-08', name: { en: 'Mymensingh', bn: 'ময়মনসিংহ' }, coordinates: [90.4074, 24.7471] },
  { code: 'DIST-63', divisionCode: 'DIV-08', name: { en: 'Netrokona', bn: 'নেত্রকোনা' }, coordinates: [90.7270, 24.8103] },
  { code: 'DIST-64', divisionCode: 'DIV-08', name: { en: 'Sherpur', bn: 'শেরপুর' }, coordinates: [90.0151, 25.0204] }
];

// Sample Upazilas for Dhaka District
// Full list should be loaded from bangladesh-geocode repository
const SAMPLE_UPAZILAS = [
  {
    code: 'UPZ-001',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Dhamrai', bn: 'ধামরাই' },
    postalCodes: ['1350', '1351']
  },
  {
    code: 'UPZ-002',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Dohar', bn: 'দোহার' },
    postalCodes: ['1330']
  },
  {
    code: 'UPZ-003',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Keraniganj', bn: 'কেরানীগঞ্জ' },
    postalCodes: ['1310', '1312']
  },
  {
    code: 'UPZ-004',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Nawabganj', bn: 'নবাবগঞ্জ' },
    postalCodes: ['1320']
  },
  {
    code: 'UPZ-005',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Savar', bn: 'সাভার' },
    postalCodes: ['1340', '1341', '1342', '1343', '1344', '1345', '1346', '1347']
  },
  // Dhaka City Corporations - Thanas
  {
    code: 'UPZ-006',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Adabor', bn: 'আদাবর' },
    postalCodes: ['1207']
  },
  {
    code: 'UPZ-007',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Badda', bn: 'বাড্ডা' },
    postalCodes: ['1212']
  },
  {
    code: 'UPZ-008',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Dhanmondi', bn: 'ধানমন্ডি' },
    postalCodes: ['1205', '1209']
  },
  {
    code: 'UPZ-009',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Gulshan', bn: 'গুলশান' },
    postalCodes: ['1212', '1213']
  },
  {
    code: 'UPZ-010',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Mirpur', bn: 'মিরপুর' },
    postalCodes: ['1216']
  },
  {
    code: 'UPZ-011',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Mohammadpur', bn: 'মোহাম্মদপুর' },
    postalCodes: ['1207']
  },
  {
    code: 'UPZ-012',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Motijheel', bn: 'মতিঝিল' },
    postalCodes: ['1000', '1001']
  },
  {
    code: 'UPZ-013',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Pallabi', bn: 'পল্লবী' },
    postalCodes: ['1216']
  },
  {
    code: 'UPZ-014',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Ramna', bn: 'রমনা' },
    postalCodes: ['1217']
  },
  {
    code: 'UPZ-015',
    districtCode: 'DIST-01',
    divisionCode: 'DIV-01',
    name: { en: 'Uttara', bn: 'উত্তরা' },
    postalCodes: ['1230']
  }
];

// Sample Unions
const SAMPLE_UNIONS = [
  {
    code: 'UN-0001',
    type: 'union',
    upazilaCode: 'UPZ-001',
    name: { en: 'Amta', bn: 'আমতা' },
    postalCode: '1350'
  },
  {
    code: 'UN-0002',
    type: 'union',
    upazilaCode: 'UPZ-001',
    name: { en: 'Baisakanda', bn: 'বাইসাকান্দা' },
    postalCode: '1350'
  },
  {
    code: 'UN-0003',
    type: 'union',
    upazilaCode: 'UPZ-002',
    name: { en: 'Bilashpur', bn: 'বিলাসপুর' },
    postalCode: '1330'
  },
  {
    code: 'UN-0004',
    type: 'union',
    upazilaCode: 'UPZ-003',
    name: { en: 'Kalindi', bn: 'কালিন্দী' },
    postalCode: '1310'
  },
  {
    code: 'UN-0005',
    type: 'ward',
    upazilaCode: 'UPZ-006',
    name: { en: 'Ward 1', bn: 'ওয়ার্ড ১' },
    postalCode: '1207'
  }
];

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

const seedDivisions = async (adminUser) => {
  console.log('\n📍 Seeding Divisions...');

  const existingCount = await Division.countDocuments();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing divisions. Skipping division seeding.`);
    console.log('   Run `db.divisions.deleteMany({})` to re-seed.');
    return await Division.find();
  }

  const divisionsWithCreator = DIVISIONS.map(d => ({
    ...d,
    createdBy: adminUser?._id,
    isActive: true
  }));

  const created = await Division.insertMany(divisionsWithCreator);
  console.log(`✅ Created ${created.length} divisions`);

  return created;
};

const seedDistricts = async (divisions, adminUser) => {
  console.log('\n📍 Seeding Districts...');

  const existingCount = await District.countDocuments();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing districts. Skipping district seeding.`);
    console.log('   Run `db.districts.deleteMany({})` to re-seed.');
    return await District.find();
  }

  const divisionMap = new Map(divisions.map(d => [d.code, d._id]));

  const districtsWithRefs = DISTRICTS.map(d => ({
    code: d.code,
    name: d.name,
    coordinates: d.coordinates,
    division: divisionMap.get(d.divisionCode),
    createdBy: adminUser?._id,
    isActive: true
  }));

  const created = await District.insertMany(districtsWithRefs);
  console.log(`✅ Created ${created.length} districts`);

  return created;
};

const seedUpazilas = async (districts, divisions, adminUser) => {
  console.log('\n📍 Seeding Upazilas...');
  console.log('   ℹ️  Seeding sample data. For full 492 upazilas, add complete data from bangladesh-geocode.');

  const existingCount = await Upazila.countDocuments();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing upazilas. Skipping upazila seeding.`);
    console.log('   Run `db.upazilas.deleteMany({})` to re-seed.');
    return await Upazila.find();
  }

  const districtMap = new Map(districts.map(d => [d.code, d._id]));
  const divisionMap = new Map(divisions.map(d => [d.code, d._id]));

  const upazilasWithRefs = SAMPLE_UPAZILAS.map(u => ({
    code: u.code,
    name: u.name,
    postalCodes: u.postalCodes,
    district: districtMap.get(u.districtCode),
    division: divisionMap.get(u.divisionCode),
    createdBy: adminUser?._id,
    isActive: true
  }));

  const created = await Upazila.insertMany(upazilasWithRefs);
  console.log(`✅ Created ${created.length} upazilas (sample data)`);

  return created;
};

const seedUnions = async (upazilas, districts, divisions, adminUser) => {
  console.log('\n📍 Seeding Unions...');
  console.log('   ℹ️  Seeding sample data. For full union list, add complete data from bangladesh-geocode.');

  const existingCount = await Union.countDocuments();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing unions. Skipping union seeding.`);
    console.log('   Run `db.unions.deleteMany({})` to re-seed.');
    return await Union.find();
  }

  const upazilaMap = new Map(upazilas.map(u => [u.code, u]));

  const unionsWithRefs = SAMPLE_UNIONS.map(un => {
    const upazila = upazilaMap.get(un.upazilaCode);
    return {
      code: un.code,
      name: un.name,
      type: un.type,
      postalCode: un.postalCode,
      upazila: upazila._id,
      district: upazila.district,
      division: upazila.division,
      createdBy: adminUser?._id,
      isActive: true
    };
  });

  const created = await Union.insertMany(unionsWithRefs);
  console.log(`✅ Created ${created.length} unions (sample data)`);

  return created;
};

const verifyData = async () => {
  console.log('\n🔍 Verifying data integrity...');

  // Check division count
  const divisionCount = await Division.countDocuments({ isActive: true });
  console.log(`   ✅ Divisions: ${divisionCount} (expected: 8)`);

  // Check district count
  const districtCount = await District.countDocuments({ isActive: true });
  console.log(`   ✅ Districts: ${districtCount} (expected: 64)`);

  // Check upazila count
  const upazilaCount = await Upazila.countDocuments({ isActive: true });
  console.log(`   ✅ Upazilas: ${upazilaCount}`);

  // Check union count
  const unionCount = await Union.countDocuments({ isActive: true });
  console.log(`   ✅ Unions: ${unionCount}`);

  // Verify hierarchy integrity
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

  // Check upazila hierarchy
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

  console.log('\n✅ Data verification complete!');
};

const runSeed = async () => {
  try {
    console.log('🚀 Starting BD Locations Seed...\n');

    await connectDB();

    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.warn('⚠️  No admin user found. Data will be created without creator reference.');
    }

    const divisions = await seedDivisions(adminUser);
    const districts = await seedDistricts(divisions, adminUser);
    const upazilas = await seedUpazilas(districts, divisions, adminUser);
    const unions = await seedUnions(upazilas, districts, divisions, adminUser);

    await verifyData();

    console.log('\n✨ Seed completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   Divisions: ${divisions.length}`);
    console.log(`   Districts: ${districts.length}`);
    console.log(`   Upazilas: ${upazilas.length} (sample - expand with full data)`);
    console.log(`   Unions: ${unions.length} (sample - expand with full data)`);
    console.log('\n📝 Note: To add full upazila and union data:');
    console.log('   1. Visit https://github.com/nuhil/bangladesh-geocode');
    console.log('   2. Download upazilas and unions JSON/CSV data');
    console.log('   3. Add to SAMPLE_UPAZILAS and SAMPLE_UNIONS arrays');
    console.log('   4. Run this script again after clearing existing data');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
};

runSeed();
