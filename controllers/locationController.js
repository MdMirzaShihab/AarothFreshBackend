const Division = require('../models/Division');
const District = require('../models/District');
const Upazila = require('../models/Upazila');
const Union = require('../models/Union');
const { ErrorResponse } = require('../middleware/error');

/**
 * @route   GET /api/v1/locations/divisions
 * @desc    Get all divisions
 * @access  Public
 */
exports.getDivisions = async (req, res, next) => {
  try {
    const { lang = 'en', active = 'true' } = req.query;

    const query = active === 'true' ? { isActive: true } : {};

    const divisions = await Division.find(query)
      .select('name code coordinates')
      .sort('name.en');

    // Format response based on language preference
    const formattedDivisions = divisions.map(div => ({
      id: div._id,
      name: lang === 'bn' ? div.name.bn : div.name.en,
      nameEn: div.name.en,
      nameBn: div.name.bn,
      code: div.code,
      coordinates: div.coordinates
    }));

    res.status(200).json({
      success: true,
      count: formattedDivisions.length,
      data: formattedDivisions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/divisions/:id
 * @desc    Get single division by ID
 * @access  Public
 */
exports.getDivision = async (req, res, next) => {
  try {
    const { lang = 'en' } = req.query;

    const division = await Division.findById(req.params.id);

    if (!division) {
      return next(new ErrorResponse('Division not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        id: division._id,
        name: lang === 'bn' ? division.name.bn : division.name.en,
        nameEn: division.name.en,
        nameBn: division.name.bn,
        code: division.code,
        coordinates: division.coordinates,
        isActive: division.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/districts/:divisionId
 * @desc    Get districts in a division
 * @access  Public
 */
exports.getDistricts = async (req, res, next) => {
  try {
    const { divisionId } = req.params;
    const { lang = 'en', active = 'true' } = req.query;

    const query = {
      division: divisionId,
      ...(active === 'true' && { isActive: true })
    };

    const districts = await District.find(query)
      .select('name code division coordinates')
      .sort('name.en')
      .populate('division', 'name code');

    const formattedDistricts = districts.map(dist => ({
      id: dist._id,
      name: lang === 'bn' ? dist.name.bn : dist.name.en,
      nameEn: dist.name.en,
      nameBn: dist.name.bn,
      code: dist.code,
      division: {
        id: dist.division._id,
        name: lang === 'bn' ? dist.division.name.bn : dist.division.name.en,
        code: dist.division.code
      },
      coordinates: dist.coordinates
    }));

    res.status(200).json({
      success: true,
      count: formattedDistricts.length,
      data: formattedDistricts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/districts/single/:id
 * @desc    Get single district by ID
 * @access  Public
 */
exports.getDistrict = async (req, res, next) => {
  try {
    const { lang = 'en' } = req.query;

    const district = await District.findById(req.params.id)
      .populate('division', 'name code');

    if (!district) {
      return next(new ErrorResponse('District not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        id: district._id,
        name: lang === 'bn' ? district.name.bn : district.name.en,
        nameEn: district.name.en,
        nameBn: district.name.bn,
        code: district.code,
        division: {
          id: district.division._id,
          name: lang === 'bn' ? district.division.name.bn : district.division.name.en,
          code: district.division.code
        },
        coordinates: district.coordinates,
        isActive: district.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/upazilas/:districtId
 * @desc    Get upazilas in a district
 * @access  Public
 */
exports.getUpazilas = async (req, res, next) => {
  try {
    const { districtId } = req.params;
    const { lang = 'en', active = 'true' } = req.query;

    const query = {
      district: districtId,
      ...(active === 'true' && { isActive: true })
    };

    const upazilas = await Upazila.find(query)
      .select('name code district division postalCodes coordinates')
      .sort('name.en')
      .populate('district', 'name code')
      .populate('division', 'name code');

    const formattedUpazilas = upazilas.map(upz => ({
      id: upz._id,
      name: lang === 'bn' ? upz.name.bn : upz.name.en,
      nameEn: upz.name.en,
      nameBn: upz.name.bn,
      code: upz.code,
      district: {
        id: upz.district._id,
        name: lang === 'bn' ? upz.district.name.bn : upz.district.name.en,
        code: upz.district.code
      },
      division: {
        id: upz.division._id,
        name: lang === 'bn' ? upz.division.name.bn : upz.division.name.en,
        code: upz.division.code
      },
      postalCodes: upz.postalCodes,
      coordinates: upz.coordinates
    }));

    res.status(200).json({
      success: true,
      count: formattedUpazilas.length,
      data: formattedUpazilas
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/upazilas/single/:id
 * @desc    Get single upazila by ID
 * @access  Public
 */
exports.getUpazila = async (req, res, next) => {
  try {
    const { lang = 'en' } = req.query;

    const upazila = await Upazila.findById(req.params.id)
      .populate('district', 'name code')
      .populate('division', 'name code');

    if (!upazila) {
      return next(new ErrorResponse('Upazila not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        id: upazila._id,
        name: lang === 'bn' ? upazila.name.bn : upazila.name.en,
        nameEn: upazila.name.en,
        nameBn: upazila.name.bn,
        code: upazila.code,
        district: {
          id: upazila.district._id,
          name: lang === 'bn' ? upazila.district.name.bn : upazila.district.name.en,
          code: upazila.district.code
        },
        division: {
          id: upazila.division._id,
          name: lang === 'bn' ? upazila.division.name.bn : upazila.division.name.en,
          code: upazila.division.code
        },
        postalCodes: upazila.postalCodes,
        coordinates: upazila.coordinates,
        isActive: upazila.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/unions/:upazilaId
 * @desc    Get unions in an upazila
 * @access  Public
 */
exports.getUnions = async (req, res, next) => {
  try {
    const { upazilaId } = req.params;
    const { lang = 'en', active = 'true' } = req.query;

    const query = {
      upazila: upazilaId,
      ...(active === 'true' && { isActive: true })
    };

    const unions = await Union.find(query)
      .select('name code type upazila district division postalCode coordinates')
      .sort('name.en')
      .populate('upazila', 'name code')
      .populate('district', 'name code')
      .populate('division', 'name code');

    const formattedUnions = unions.map(un => ({
      id: un._id,
      name: lang === 'bn' ? un.name.bn : un.name.en,
      nameEn: un.name.en,
      nameBn: un.name.bn,
      code: un.code,
      type: un.type,
      typeLocalized: un.getLocalizedType(lang),
      upazila: {
        id: un.upazila._id,
        name: lang === 'bn' ? un.upazila.name.bn : un.upazila.name.en,
        code: un.upazila.code
      },
      district: {
        id: un.district._id,
        name: lang === 'bn' ? un.district.name.bn : un.district.name.en,
        code: un.district.code
      },
      division: {
        id: un.division._id,
        name: lang === 'bn' ? un.division.name.bn : un.division.name.en,
        code: un.division.code
      },
      postalCode: un.postalCode,
      coordinates: un.coordinates
    }));

    res.status(200).json({
      success: true,
      count: formattedUnions.length,
      data: formattedUnions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/unions/single/:id
 * @desc    Get single union by ID
 * @access  Public
 */
exports.getUnion = async (req, res, next) => {
  try {
    const { lang = 'en' } = req.query;

    const union = await Union.findById(req.params.id)
      .populate('upazila', 'name code')
      .populate('district', 'name code')
      .populate('division', 'name code');

    if (!union) {
      return next(new ErrorResponse('Union not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        id: union._id,
        name: lang === 'bn' ? union.name.bn : union.name.en,
        nameEn: union.name.en,
        nameBn: union.name.bn,
        code: union.code,
        type: union.type,
        typeLocalized: union.getLocalizedType(lang),
        upazila: {
          id: union.upazila._id,
          name: lang === 'bn' ? union.upazila.name.bn : union.upazila.name.en,
          code: union.upazila.code
        },
        district: {
          id: union.district._id,
          name: lang === 'bn' ? union.district.name.bn : union.district.name.en,
          code: union.district.code
        },
        division: {
          id: union.division._id,
          name: lang === 'bn' ? union.division.name.bn : union.division.name.en,
          code: union.division.code
        },
        postalCode: union.postalCode,
        coordinates: union.coordinates,
        isActive: union.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/search
 * @desc    Search locations across all levels
 * @access  Public
 */
exports.searchLocations = async (req, res, next) => {
  try {
    const { q, type, lang = 'en' } = req.query;

    if (!q || q.length < 2) {
      return next(new ErrorResponse('Search query must be at least 2 characters', 400));
    }

    const searchRegex = new RegExp(q, 'i');
    const results = { divisions: [], districts: [], upazilas: [], unions: [] };

    // Search divisions
    if (!type || type === 'division') {
      const divisions = await Division.find({
        $or: [
          { 'name.en': searchRegex },
          { 'name.bn': searchRegex }
        ],
        isActive: true
      }).limit(10);

      results.divisions = divisions.map(d => ({
        id: d._id,
        name: lang === 'bn' ? d.name.bn : d.name.en,
        nameEn: d.name.en,
        nameBn: d.name.bn,
        code: d.code,
        type: 'division'
      }));
    }

    // Search districts
    if (!type || type === 'district') {
      const districts = await District.find({
        $or: [
          { 'name.en': searchRegex },
          { 'name.bn': searchRegex }
        ],
        isActive: true
      }).populate('division', 'name code').limit(10);

      results.districts = districts.map(d => ({
        id: d._id,
        name: lang === 'bn' ? d.name.bn : d.name.en,
        nameEn: d.name.en,
        nameBn: d.name.bn,
        code: d.code,
        division: {
          name: lang === 'bn' ? d.division.name.bn : d.division.name.en,
          code: d.division.code
        },
        type: 'district'
      }));
    }

    // Search upazilas
    if (!type || type === 'upazila') {
      const upazilas = await Upazila.find({
        $or: [
          { 'name.en': searchRegex },
          { 'name.bn': searchRegex }
        ],
        isActive: true
      }).populate('district', 'name code').populate('division', 'name code').limit(10);

      results.upazilas = upazilas.map(u => ({
        id: u._id,
        name: lang === 'bn' ? u.name.bn : u.name.en,
        nameEn: u.name.en,
        nameBn: u.name.bn,
        code: u.code,
        district: {
          name: lang === 'bn' ? u.district.name.bn : u.district.name.en,
          code: u.district.code
        },
        division: {
          name: lang === 'bn' ? u.division.name.bn : u.division.name.en,
          code: u.division.code
        },
        type: 'upazila'
      }));
    }

    // Search unions
    if (!type || type === 'union') {
      const unions = await Union.find({
        $or: [
          { 'name.en': searchRegex },
          { 'name.bn': searchRegex }
        ],
        isActive: true
      }).populate('upazila', 'name code')
        .populate('district', 'name code')
        .populate('division', 'name code').limit(10);

      results.unions = unions.map(u => ({
        id: u._id,
        name: lang === 'bn' ? u.name.bn : u.name.en,
        nameEn: u.name.en,
        nameBn: u.name.bn,
        code: u.code,
        unionType: u.type,
        upazila: {
          name: lang === 'bn' ? u.upazila.name.bn : u.upazila.name.en,
          code: u.upazila.code
        },
        district: {
          name: lang === 'bn' ? u.district.name.bn : u.district.name.en,
          code: u.district.code
        },
        division: {
          name: lang === 'bn' ? u.division.name.bn : u.division.name.en,
          code: u.division.code
        },
        type: 'union'
      }));
    }

    const totalResults = results.divisions.length + results.districts.length +
                        results.upazilas.length + results.unions.length;

    res.status(200).json({
      success: true,
      count: totalResults,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/locations/postal-code/:postalCode
 * @desc    Get locations by postal code
 * @access  Public
 */
exports.getLocationsByPostalCode = async (req, res, next) => {
  try {
    const { postalCode } = req.params;
    const { lang = 'en' } = req.query;

    if (!/^\d{4}$/.test(postalCode)) {
      return next(new ErrorResponse('Postal code must be 4 digits', 400));
    }

    // Find upazilas with this postal code
    const upazilas = await Upazila.find({
      postalCodes: postalCode,
      isActive: true
    }).populate('district', 'name code').populate('division', 'name code');

    // Find unions with this postal code
    const unions = await Union.find({
      postalCode: postalCode,
      isActive: true
    }).populate('upazila', 'name code')
      .populate('district', 'name code')
      .populate('division', 'name code');

    res.status(200).json({
      success: true,
      postalCode,
      data: {
        upazilas: upazilas.map(u => ({
          id: u._id,
          name: lang === 'bn' ? u.name.bn : u.name.en,
          district: lang === 'bn' ? u.district.name.bn : u.district.name.en,
          division: lang === 'bn' ? u.division.name.bn : u.division.name.en
        })),
        unions: unions.map(u => ({
          id: u._id,
          name: lang === 'bn' ? u.name.bn : u.name.en,
          type: u.type,
          upazila: lang === 'bn' ? u.upazila.name.bn : u.upazila.name.en,
          district: lang === 'bn' ? u.district.name.bn : u.district.name.en,
          division: lang === 'bn' ? u.division.name.bn : u.division.name.en
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
