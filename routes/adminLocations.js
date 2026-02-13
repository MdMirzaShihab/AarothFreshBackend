const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const {
  divisionValidation,
  districtValidation,
  upazilaValidation,
  unionValidation,
  mongoIdValidation
} = require('../middleware/validation');
const {
  // Division
  createDivision,
  getDivisions,
  getDivision,
  updateDivision,
  deleteDivision,
  // District
  createDistrict,
  getDistricts,
  getDistrict,
  updateDistrict,
  deleteDistrict,
  // Upazila
  createUpazila,
  getUpazilas,
  getUpazila,
  updateUpazila,
  deleteUpazila,
  // Union
  createUnion,
  getUnions,
  getUnion,
  updateUnion,
  deleteUnion
} = require('../controllers/adminLocationController');

const router = express.Router();

// All routes require admin authorization
router.use(protect, authorize('admin'));

// ================================
// DIVISION ROUTES
// ================================

router
  .route('/divisions')
  .get(getDivisions)
  .post(
    divisionValidation,
    auditLog('division_created', 'Division', 'Created division: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createDivision
  );

router
  .route('/divisions/:id')
  .get(
    mongoIdValidation('id'),
    getDivision
  )
  .put(
    mongoIdValidation('id'),
    divisionValidation,
    auditLog('division_updated', 'Division', 'Updated division: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateDivision
  )
  .delete(
    mongoIdValidation('id'),
    auditLog('division_deactivated', 'Division', 'Deactivated division', { severity: 'high', impactLevel: 'significant' }),
    deleteDivision
  );

// ================================
// DISTRICT ROUTES
// ================================

router
  .route('/districts')
  .get(getDistricts)
  .post(
    districtValidation,
    auditLog('district_created', 'District', 'Created district: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createDistrict
  );

router
  .route('/districts/:id')
  .get(
    mongoIdValidation('id'),
    getDistrict
  )
  .put(
    mongoIdValidation('id'),
    districtValidation,
    auditLog('district_updated', 'District', 'Updated district: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateDistrict
  )
  .delete(
    mongoIdValidation('id'),
    auditLog('district_deactivated', 'District', 'Deactivated district', { severity: 'high', impactLevel: 'significant' }),
    deleteDistrict
  );

// ================================
// UPAZILA ROUTES
// ================================

router
  .route('/upazilas')
  .get(getUpazilas)
  .post(
    upazilaValidation,
    auditLog('upazila_created', 'Upazila', 'Created upazila: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createUpazila
  );

router
  .route('/upazilas/:id')
  .get(
    mongoIdValidation('id'),
    getUpazila
  )
  .put(
    mongoIdValidation('id'),
    upazilaValidation,
    auditLog('upazila_updated', 'Upazila', 'Updated upazila: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateUpazila
  )
  .delete(
    mongoIdValidation('id'),
    auditLog('upazila_deactivated', 'Upazila', 'Deactivated upazila', { severity: 'high', impactLevel: 'significant' }),
    deleteUpazila
  );

// ================================
// UNION ROUTES
// ================================

router
  .route('/unions')
  .get(getUnions)
  .post(
    unionValidation,
    auditLog('union_created', 'Union', 'Created union: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    createUnion
  );

router
  .route('/unions/:id')
  .get(
    mongoIdValidation('id'),
    getUnion
  )
  .put(
    mongoIdValidation('id'),
    unionValidation,
    auditLog('union_updated', 'Union', 'Updated union: {name}', { severity: 'medium', impactLevel: 'moderate' }),
    updateUnion
  )
  .delete(
    mongoIdValidation('id'),
    auditLog('union_deactivated', 'Union', 'Deactivated union', { severity: 'high', impactLevel: 'significant' }),
    deleteUnion
  );

module.exports = router;
