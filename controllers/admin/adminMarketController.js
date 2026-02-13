const AuditLog = require("../../models/AuditLog");
const { ErrorResponse } = require("../../middleware/error");
const { validationResult } = require("express-validator");

// ================================
// MARKET MANAGEMENT
// ================================

/**
 * @desc    Create a new market
 * @route   POST /api/v1/admin/markets
 * @access  Private/Admin
 */
exports.createMarket = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    // Check if image was uploaded
    if (!req.file) {
      return next(new ErrorResponse('Market image is required', 400));
    }

    // Create market data with image URL from Cloudinary
    // Location uses BD address hierarchy: division -> district -> upazila -> union
    const marketData = {
      name: req.body.name,
      description: req.body.description,
      location: {
        division: req.body['location.division'] || req.body.division,
        district: req.body['location.district'] || req.body.district,
        upazila: req.body['location.upazila'] || req.body.upazila,
        union: req.body['location.union'] || req.body.union || undefined,
        address: req.body['location.address'] || req.body.address,
        landmark: req.body['location.landmark'] || req.body.landmark || undefined,
        postalCode: req.body['location.postalCode'] || req.body.postalCode,
        coordinates: req.body.coordinates ?
          (typeof req.body.coordinates === 'string' ?
            JSON.parse(req.body.coordinates) : req.body.coordinates) :
          undefined
      },
      image: req.file.path, // Cloudinary URL
      isActive: req.body.isActive !== 'false' && req.body.isActive !== false,
      createdBy: req.user.id
    };

    const Market = require('../../models/Market');
    const market = await Market.create(marketData);

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'market_created',
      entityType: 'Market',
      entityId: market._id,
      description: `Created market: ${market.name}`,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    const populatedMarket = await Market.findById(market._id)
      .populate('location.division', 'name code')
      .populate('location.district', 'name code')
      .populate('location.upazila', 'name code')
      .populate('location.union', 'name code')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Market created successfully',
      data: populatedMarket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all markets with advanced filtering
 * @route   GET /api/v1/admin/markets
 * @access  Private/Admin
 */
exports.getMarkets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      city,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const Market = require('../../models/Market');

    // Build query
    let query = { isDeleted: { $ne: true } };

    // Search by name, description, or city
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'flagged') {
        query.isAvailable = false;
      }
    }

    // Filter by city
    if (city && city !== 'all') {
      query['location.city'] = city;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const markets = await Market.find(query)
      .populate('location.division', 'name code')
      .populate('location.district', 'name code')
      .populate('location.upazila', 'name code')
      .populate('location.union', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('flaggedBy', 'name email')
      .populate('deletedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add vendor count to each market
    const Vendor = require('../../models/Vendor');
    for (let market of markets) {
      market.vendorCount = await Vendor.countDocuments({
        markets: market._id,
        isDeleted: { $ne: true }
      });
      market.activeVendorCount = await Vendor.countDocuments({
        markets: market._id,
        isActive: true,
        verificationStatus: 'approved',
        isDeleted: { $ne: true }
      });
    }

    // Get total count
    const total = await Market.countDocuments(query);

    // Calculate statistics
    const stats = await Market.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalMarkets: { $sum: 1 },
          activeMarkets: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          availableMarkets: {
            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] }
          },
          flaggedMarkets: {
            $sum: { $cond: [{ $eq: ['$isAvailable', false] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: markets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
        count: markets.length
      },
      stats: stats[0] || {
        totalMarkets: 0,
        activeMarkets: 0,
        availableMarkets: 0,
        flaggedMarkets: 0
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single market with usage statistics
 * @route   GET /api/v1/admin/markets/:id
 * @access  Private/Admin
 */
exports.getMarket = async (req, res, next) => {
  try {
    const Market = require('../../models/Market');
    const market = await Market.findById(req.params.id)
      .populate('location.division', 'name code')
      .populate('location.district', 'name code')
      .populate('location.upazila', 'name code')
      .populate('location.union', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('flaggedBy', 'name email')
      .populate('deletedBy', 'name email');

    if (!market) {
      return next(new ErrorResponse(`Market not found with id of ${req.params.id}`, 404));
    }

    // Get usage statistics
    const usageStats = await market.canBeDeleted();

    res.status(200).json({
      success: true,
      data: {
        market,
        usageStats
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update market
 * @route   PUT /api/v1/admin/markets/:id
 * @access  Private/Admin
 */
exports.updateMarket = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const Market = require('../../models/Market');
    let market = await Market.findById(req.params.id);

    if (!market) {
      return next(new ErrorResponse(`Market not found with id of ${req.params.id}`, 404));
    }

    if (market.isDeleted) {
      return next(new ErrorResponse('Cannot update deleted market', 400));
    }

    // Store old values for audit log
    const oldValues = {
      name: market.name,
      isActive: market.isActive,
      isAvailable: market.isAvailable
    };

    // Update data - only include allowed fields
    const updateData = {
      updatedBy: req.user.id
    };

    // Handle basic field updates
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive !== 'false' && req.body.isActive !== false;

    // Handle location updates - BD address hierarchy
    const hasLocationUpdates = req.body['location.division'] || req.body.division ||
                               req.body['location.address'] || req.body.address ||
                               req.body['location.postalCode'] || req.body.postalCode;

    if (hasLocationUpdates) {
      updateData.location = {
        division: req.body['location.division'] || req.body.division || market.location.division,
        district: req.body['location.district'] || req.body.district || market.location.district,
        upazila: req.body['location.upazila'] || req.body.upazila || market.location.upazila,
        union: req.body['location.union'] || req.body.union || market.location.union,
        address: req.body['location.address'] || req.body.address || market.location.address,
        landmark: req.body['location.landmark'] || req.body.landmark || market.location.landmark,
        postalCode: req.body['location.postalCode'] || req.body.postalCode || market.location.postalCode,
        coordinates: req.body.coordinates ?
          (typeof req.body.coordinates === 'string' ?
            JSON.parse(req.body.coordinates) : req.body.coordinates) :
          market.location.coordinates
      };
    }

    // If new image was uploaded, update the image URL
    if (req.file) {
      updateData.image = req.file.path; // Cloudinary URL
    }

    market = await Market.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
    .populate('location.division', 'name code')
    .populate('location.district', 'name code')
    .populate('location.upazila', 'name code')
    .populate('location.union', 'name code')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

    // Log significant changes
    const changes = [];
    if (oldValues.name !== market.name) changes.push(`name changed from '${oldValues.name}' to '${market.name}'`);
    if (oldValues.isActive !== market.isActive) changes.push(`status changed to ${market.isActive ? 'active' : 'inactive'}`);
    if (oldValues.isAvailable !== market.isAvailable) changes.push(`availability changed to ${market.isAvailable ? 'available' : 'unavailable'}`);

    if (changes.length > 0) {
      await AuditLog.logAction({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'market_updated',
        entityType: 'Market',
        entityId: market._id,
        description: `Updated market: ${changes.join(', ')}`,
        severity: 'medium',
        impactLevel: 'moderate',
        metadata: { changes: oldValues }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Market updated successfully',
      data: market
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle market availability (flag system)
 * @route   PUT /api/v1/admin/markets/:id/availability
 * @access  Private/Admin
 */
exports.toggleMarketAvailability = async (req, res, next) => {
  try {
    const { isAvailable, flagReason } = req.body;

    if (isAvailable === undefined) {
      return next(new ErrorResponse('isAvailable field is required', 400));
    }

    if (!isAvailable && !flagReason) {
      return next(new ErrorResponse('Flag reason is required when disabling availability', 400));
    }

    const Market = require('../../models/Market');
    const market = await Market.findById(req.params.id);
    if (!market) {
      return next(new ErrorResponse(`Market not found with id of ${req.params.id}`, 404));
    }

    if (market.isDeleted) {
      return next(new ErrorResponse('Cannot modify deleted market', 400));
    }

    const oldAvailability = market.isAvailable;

    // Use the model method to toggle availability
    market.toggleAvailability(isAvailable, flagReason, req.user.id);
    await market.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: isAvailable ? 'market_unflagged' : 'market_flagged',
      entityType: 'Market',
      entityId: market._id,
      description: `${isAvailable ? 'Enabled' : 'Disabled'} market availability: ${market.name}`,
      reason: flagReason,
      severity: 'medium',
      impactLevel: 'moderate',
      metadata: {
        oldAvailability,
        newAvailability: isAvailable
      }
    });

    const updatedMarket = await Market.findById(market._id)
      .populate('flaggedBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Market ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: updatedMarket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get market usage statistics
 * @route   GET /api/v1/admin/markets/:id/usage
 * @access  Private/Admin
 */
exports.getMarketUsageStats = async (req, res, next) => {
  try {
    const Market = require('../../models/Market');
    const market = await Market.findById(req.params.id);

    if (!market) {
      return next(new ErrorResponse(`Market not found with id of ${req.params.id}`, 404));
    }

    const usageStats = await market.canBeDeleted();

    res.status(200).json({
      success: true,
      data: usageStats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Safe delete market with dependency check
 * @route   DELETE /api/v1/admin/markets/:id/safe-delete
 * @access  Private/Admin
 */
exports.safeDeleteMarket = async (req, res, next) => {
  try {
    const Market = require('../../models/Market');
    const market = await Market.findById(req.params.id);
    if (!market) {
      return next(new ErrorResponse('Market not found', 404));
    }

    // Check for vendors in this market
    const Vendor = require('../../models/Vendor');
    const vendorsInMarket = await Vendor.countDocuments({
      markets: req.params.id,
      isDeleted: { $ne: true }
    });

    if (vendorsInMarket > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete market with existing vendors',
        dependencies: {
          type: 'vendors',
          count: vendorsInMarket
        },
        suggestions: [
          'Move vendors to another market first',
          'Or deactivate this market instead of deleting'
        ]
      });
    }

    // Perform soft delete
    market.isDeleted = true;
    market.deletedAt = new Date();
    market.deletedBy = req.user.id;
    market.isActive = false;
    await market.save();

    // Log the deletion
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'market_deleted',
      entityType: 'Market',
      entityId: market._id,
      description: `Deleted market: ${market.name}`,
      severity: 'high',
      impactLevel: 'significant'
    });

    res.status(200).json({
      success: true,
      message: 'Market deleted successfully',
      data: { deletedId: market._id }
    });
  } catch (err) {
    next(err);
  }
};
