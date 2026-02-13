const Division = require('../models/Division');
const District = require('../models/District');
const Upazila = require('../models/Upazila');
const Union = require('../models/Union');
const { ErrorResponse } = require('../middleware/error');

// ================================
// DIVISION CRUD
// ================================

/**
 * @desc    Create a new division
 * @route   POST /api/v1/admin/locations/divisions
 * @access  Admin
 */
const createDivision = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;

    const division = await Division.create(req.body);

    res.status(201).json({
      success: true,
      data: division
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all divisions with pagination
 * @route   GET /api/v1/admin/locations/divisions
 * @access  Admin
 */
const getDivisions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const [divisions, total] = await Promise.all([
      Division.find(query)
        .sort('name.en')
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
      Division.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: divisions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: divisions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single division by ID
 * @route   GET /api/v1/admin/locations/divisions/:id
 * @access  Admin
 */
const getDivision = async (req, res, next) => {
  try {
    const division = await Division.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!division) {
      return next(new ErrorResponse('Division not found', 404));
    }

    res.status(200).json({
      success: true,
      data: division
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a division
 * @route   PUT /api/v1/admin/locations/divisions/:id
 * @access  Admin
 */
const updateDivision = async (req, res, next) => {
  try {
    req.body.updatedBy = req.user.id;

    const division = await Division.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!division) {
      return next(new ErrorResponse('Division not found', 404));
    }

    res.status(200).json({
      success: true,
      data: division
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete (deactivate) a division
 * @route   DELETE /api/v1/admin/locations/divisions/:id
 * @access  Admin
 */
const deleteDivision = async (req, res, next) => {
  try {
    const division = await Division.findById(req.params.id);

    if (!division) {
      return next(new ErrorResponse('Division not found', 404));
    }

    // Check for active child districts
    const activeChildren = await District.countDocuments({
      division: req.params.id,
      isActive: true
    });

    if (activeChildren > 0) {
      return next(
        new ErrorResponse(
          `Cannot deactivate division. It has ${activeChildren} active district(s). Deactivate them first.`,
          400
        )
      );
    }

    division.isActive = false;
    division.updatedBy = req.user.id;
    await division.save();

    res.status(200).json({
      success: true,
      data: division
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// DISTRICT CRUD
// ================================

/**
 * @desc    Create a new district
 * @route   POST /api/v1/admin/locations/districts
 * @access  Admin
 */
const createDistrict = async (req, res, next) => {
  try {
    // Validate parent division exists and is active
    const division = await Division.findById(req.body.division);
    if (!division) {
      return next(new ErrorResponse('Division not found', 404));
    }
    if (!division.isActive) {
      return next(new ErrorResponse('Cannot add district to an inactive division', 400));
    }

    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;

    const district = await District.create(req.body);

    res.status(201).json({
      success: true,
      data: district
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all districts with pagination
 * @route   GET /api/v1/admin/locations/districts
 * @access  Admin
 */
const getDistricts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    if (req.query.division) {
      query.division = req.query.division;
    }

    const [districts, total] = await Promise.all([
      District.find(query)
        .sort('name.en')
        .skip(skip)
        .limit(limit)
        .populate('division', 'name code')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
      District.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: districts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: districts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single district by ID
 * @route   GET /api/v1/admin/locations/districts/:id
 * @access  Admin
 */
const getDistrict = async (req, res, next) => {
  try {
    const district = await District.findById(req.params.id)
      .populate('division', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!district) {
      return next(new ErrorResponse('District not found', 404));
    }

    res.status(200).json({
      success: true,
      data: district
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a district
 * @route   PUT /api/v1/admin/locations/districts/:id
 * @access  Admin
 */
const updateDistrict = async (req, res, next) => {
  try {
    // If division is being changed, validate the new parent
    if (req.body.division) {
      const division = await Division.findById(req.body.division);
      if (!division) {
        return next(new ErrorResponse('Division not found', 404));
      }
      if (!division.isActive) {
        return next(new ErrorResponse('Cannot assign district to an inactive division', 400));
      }
    }

    req.body.updatedBy = req.user.id;

    const district = await District.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('division', 'name code');

    if (!district) {
      return next(new ErrorResponse('District not found', 404));
    }

    res.status(200).json({
      success: true,
      data: district
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete (deactivate) a district
 * @route   DELETE /api/v1/admin/locations/districts/:id
 * @access  Admin
 */
const deleteDistrict = async (req, res, next) => {
  try {
    const district = await District.findById(req.params.id);

    if (!district) {
      return next(new ErrorResponse('District not found', 404));
    }

    // Check for active child upazilas
    const activeChildren = await Upazila.countDocuments({
      district: req.params.id,
      isActive: true
    });

    if (activeChildren > 0) {
      return next(
        new ErrorResponse(
          `Cannot deactivate district. It has ${activeChildren} active upazila(s). Deactivate them first.`,
          400
        )
      );
    }

    district.isActive = false;
    district.updatedBy = req.user.id;
    await district.save();

    res.status(200).json({
      success: true,
      data: district
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// UPAZILA CRUD
// ================================

/**
 * @desc    Create a new upazila
 * @route   POST /api/v1/admin/locations/upazilas
 * @access  Admin
 */
const createUpazila = async (req, res, next) => {
  try {
    // Validate parent district exists and is active
    const district = await District.findById(req.body.district);
    if (!district) {
      return next(new ErrorResponse('District not found', 404));
    }
    if (!district.isActive) {
      return next(new ErrorResponse('Cannot add upazila to an inactive district', 400));
    }

    // Validate parent division exists and is active
    const division = await Division.findById(req.body.division);
    if (!division) {
      return next(new ErrorResponse('Division not found', 404));
    }
    if (!division.isActive) {
      return next(new ErrorResponse('Cannot add upazila to an inactive division', 400));
    }

    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;

    const upazila = await Upazila.create(req.body);

    res.status(201).json({
      success: true,
      data: upazila
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all upazilas with pagination
 * @route   GET /api/v1/admin/locations/upazilas
 * @access  Admin
 */
const getUpazilas = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    if (req.query.district) {
      query.district = req.query.district;
    }
    if (req.query.division) {
      query.division = req.query.division;
    }

    const [upazilas, total] = await Promise.all([
      Upazila.find(query)
        .sort('name.en')
        .skip(skip)
        .limit(limit)
        .populate('district', 'name code')
        .populate('division', 'name code')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
      Upazila.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: upazilas.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: upazilas
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single upazila by ID
 * @route   GET /api/v1/admin/locations/upazilas/:id
 * @access  Admin
 */
const getUpazila = async (req, res, next) => {
  try {
    const upazila = await Upazila.findById(req.params.id)
      .populate('district', 'name code')
      .populate('division', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!upazila) {
      return next(new ErrorResponse('Upazila not found', 404));
    }

    res.status(200).json({
      success: true,
      data: upazila
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an upazila
 * @route   PUT /api/v1/admin/locations/upazilas/:id
 * @access  Admin
 */
const updateUpazila = async (req, res, next) => {
  try {
    // If district is being changed, validate the new parent
    if (req.body.district) {
      const district = await District.findById(req.body.district);
      if (!district) {
        return next(new ErrorResponse('District not found', 404));
      }
      if (!district.isActive) {
        return next(new ErrorResponse('Cannot assign upazila to an inactive district', 400));
      }
    }

    // If division is being changed, validate the new parent
    if (req.body.division) {
      const division = await Division.findById(req.body.division);
      if (!division) {
        return next(new ErrorResponse('Division not found', 404));
      }
      if (!division.isActive) {
        return next(new ErrorResponse('Cannot assign upazila to an inactive division', 400));
      }
    }

    req.body.updatedBy = req.user.id;

    const upazila = await Upazila.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('district', 'name code')
      .populate('division', 'name code');

    if (!upazila) {
      return next(new ErrorResponse('Upazila not found', 404));
    }

    res.status(200).json({
      success: true,
      data: upazila
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete (deactivate) an upazila
 * @route   DELETE /api/v1/admin/locations/upazilas/:id
 * @access  Admin
 */
const deleteUpazila = async (req, res, next) => {
  try {
    const upazila = await Upazila.findById(req.params.id);

    if (!upazila) {
      return next(new ErrorResponse('Upazila not found', 404));
    }

    // Check for active child unions
    const activeChildren = await Union.countDocuments({
      upazila: req.params.id,
      isActive: true
    });

    if (activeChildren > 0) {
      return next(
        new ErrorResponse(
          `Cannot deactivate upazila. It has ${activeChildren} active union(s). Deactivate them first.`,
          400
        )
      );
    }

    upazila.isActive = false;
    upazila.updatedBy = req.user.id;
    await upazila.save();

    res.status(200).json({
      success: true,
      data: upazila
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// UNION CRUD
// ================================

/**
 * @desc    Create a new union
 * @route   POST /api/v1/admin/locations/unions
 * @access  Admin
 */
const createUnion = async (req, res, next) => {
  try {
    // Validate parent upazila exists and is active
    const upazila = await Upazila.findById(req.body.upazila);
    if (!upazila) {
      return next(new ErrorResponse('Upazila not found', 404));
    }
    if (!upazila.isActive) {
      return next(new ErrorResponse('Cannot add union to an inactive upazila', 400));
    }

    // Validate parent district exists and is active
    const district = await District.findById(req.body.district);
    if (!district) {
      return next(new ErrorResponse('District not found', 404));
    }
    if (!district.isActive) {
      return next(new ErrorResponse('Cannot add union to an inactive district', 400));
    }

    // Validate parent division exists and is active
    const division = await Division.findById(req.body.division);
    if (!division) {
      return next(new ErrorResponse('Division not found', 404));
    }
    if (!division.isActive) {
      return next(new ErrorResponse('Cannot add union to an inactive division', 400));
    }

    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;

    const union = await Union.create(req.body);

    res.status(201).json({
      success: true,
      data: union
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all unions with pagination
 * @route   GET /api/v1/admin/locations/unions
 * @access  Admin
 */
const getUnions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    if (req.query.upazila) {
      query.upazila = req.query.upazila;
    }
    if (req.query.district) {
      query.district = req.query.district;
    }
    if (req.query.division) {
      query.division = req.query.division;
    }
    if (req.query.type) {
      query.type = req.query.type;
    }

    const [unions, total] = await Promise.all([
      Union.find(query)
        .sort('name.en')
        .skip(skip)
        .limit(limit)
        .populate('upazila', 'name code')
        .populate('district', 'name code')
        .populate('division', 'name code')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
      Union.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: unions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: unions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single union by ID
 * @route   GET /api/v1/admin/locations/unions/:id
 * @access  Admin
 */
const getUnion = async (req, res, next) => {
  try {
    const union = await Union.findById(req.params.id)
      .populate('upazila', 'name code')
      .populate('district', 'name code')
      .populate('division', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!union) {
      return next(new ErrorResponse('Union not found', 404));
    }

    res.status(200).json({
      success: true,
      data: union
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a union
 * @route   PUT /api/v1/admin/locations/unions/:id
 * @access  Admin
 */
const updateUnion = async (req, res, next) => {
  try {
    // If upazila is being changed, validate the new parent
    if (req.body.upazila) {
      const upazila = await Upazila.findById(req.body.upazila);
      if (!upazila) {
        return next(new ErrorResponse('Upazila not found', 404));
      }
      if (!upazila.isActive) {
        return next(new ErrorResponse('Cannot assign union to an inactive upazila', 400));
      }
    }

    // If district is being changed, validate the new parent
    if (req.body.district) {
      const district = await District.findById(req.body.district);
      if (!district) {
        return next(new ErrorResponse('District not found', 404));
      }
      if (!district.isActive) {
        return next(new ErrorResponse('Cannot assign union to an inactive district', 400));
      }
    }

    // If division is being changed, validate the new parent
    if (req.body.division) {
      const division = await Division.findById(req.body.division);
      if (!division) {
        return next(new ErrorResponse('Division not found', 404));
      }
      if (!division.isActive) {
        return next(new ErrorResponse('Cannot assign union to an inactive division', 400));
      }
    }

    req.body.updatedBy = req.user.id;

    const union = await Union.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('upazila', 'name code')
      .populate('district', 'name code')
      .populate('division', 'name code');

    if (!union) {
      return next(new ErrorResponse('Union not found', 404));
    }

    res.status(200).json({
      success: true,
      data: union
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete (deactivate) a union
 * @route   DELETE /api/v1/admin/locations/unions/:id
 * @access  Admin
 */
const deleteUnion = async (req, res, next) => {
  try {
    const union = await Union.findById(req.params.id);

    if (!union) {
      return next(new ErrorResponse('Union not found', 404));
    }

    // Union is the lowest level, no children to check
    union.isActive = false;
    union.updatedBy = req.user.id;
    await union.save();

    res.status(200).json({
      success: true,
      data: union
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
