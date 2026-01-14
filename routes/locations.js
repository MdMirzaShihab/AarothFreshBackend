const express = require('express');
const router = express.Router();
const {
  getDivisions,
  getDivision,
  getDistricts,
  getDistrict,
  getUpazilas,
  getUpazila,
  getUnions,
  getUnion,
  searchLocations,
  getLocationsByPostalCode
} = require('../controllers/locationController');

// Public routes (no authentication required)

// Divisions
router.get('/divisions', getDivisions);
router.get('/divisions/:id', getDivision);

// Districts
router.get('/districts/:divisionId', getDistricts);
router.get('/districts/single/:id', getDistrict);

// Upazilas
router.get('/upazilas/:districtId', getUpazilas);
router.get('/upazilas/single/:id', getUpazila);

// Unions
router.get('/unions/:upazilaId', getUnions);
router.get('/unions/single/:id', getUnion);

// Search and lookup
router.get('/search', searchLocations);
router.get('/postal-code/:postalCode', getLocationsByPostalCode);

module.exports = router;
