const Order = require("../../models/Order");
const Listing = require("../../models/Listing");
const AuditLog = require("../../models/AuditLog");
const { ErrorResponse } = require("../../middleware/error");

// ================================
// LISTING MANAGEMENT
// ================================

/**
 * @desc    Get all listings with advanced filtering
 * @route   GET /api/v1/admin/listings
 * @access  Private/Admin
 */
exports.getAdminListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      featured,
      flagged,
      vendor,
      product,
      marketId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query object
    let query = { isDeleted: { $ne: true } };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by featured
    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    // Filter by flagged
    if (flagged !== undefined) {
      query.isFlagged = flagged === 'true';
    }

    // Filter by vendor
    if (vendor) {
      query.vendorId = vendor;
    }

    // Filter by product
    if (product) {
      query.productId = product;
    }

    // Filter by market
    if (marketId) {
      query.marketId = marketId;
    }

    // Text search
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { 'qualityGrade': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with population
    const listings = await Listing.find(query)
      .populate({
        path: 'productId',
        select: 'name description category images variety origin seasonality',
        populate: {
          path: 'category',
          select: 'name description'
        }
      })
      .populate('vendorId', 'businessName contactInfo email phone address tradeLicenseNo logo ownerName')
      .populate('marketId', 'name location.city location.address')
      .populate('moderatedBy', 'name email')
      .populate('deletedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Listing.countDocuments(query);

    // Calculate statistics
    const stats = await Listing.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          activeListings: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          featuredListings: {
            $sum: { $cond: [{ $eq: ['$featured', true] }, 1, 0] }
          },
          flaggedListings: {
            $sum: { $cond: [{ $eq: ['$isFlagged', true] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: listings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats[0] || {
        totalListings: 0,
        activeListings: 0,
        featuredListings: 0,
        flaggedListings: 0
      },
      data: listings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single listing with full details
 * @route   GET /api/v1/admin/listings/:id
 * @access  Private/Admin
 */
exports.getAdminListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate({
        path: 'productId',
        select: 'name description category images nutritionalInfo',
        populate: {
          path: 'category',
          select: 'name description'
        }
      })
      .populate('vendorId', 'businessName contactInfo email phone address tradeLicenseNo logo ownerName')
      .populate('marketId', 'name description location')
      .populate('moderatedBy', 'name email role')
      .populate('deletedBy', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Get recent order activity for this listing
    const recentOrders = await Order.find({
      'items.listingId': req.params.id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
    .populate('buyerId', 'name email phone')
    .populate('placedBy', 'name email')
    .select('orderNumber status totalAmount items createdAt deliveryInfo')
    .sort({ createdAt: -1 })
    .limit(10);

    res.status(200).json({
      success: true,
      data: {
        listing,
        recentOrders
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update listing status
 * @route   PUT /api/v1/admin/listings/:id/status
 * @access  Private/Admin
 */
exports.updateListingStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'out_of_stock', 'discontinued'];
    if (!validStatuses.includes(status)) {
      return next(new ErrorResponse('Invalid status provided', 400));
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    const oldStatus = listing.status;

    // Update listing
    listing.status = status;
    listing.lastStatusUpdate = new Date();
    listing.updatedBy = req.user.id;

    await listing.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'listing_status_updated',
      entityType: 'Listing',
      entityId: listing._id,
      description: `Status updated from ${oldStatus} to ${status}`,
      reason,
      severity: 'medium',
      impactLevel: 'moderate',
      metadata: {
        oldStatus,
        newStatus: status
      }
    });

    // Populate for response
    const updatedListing = await Listing.findById(listing._id)
      .populate('productId', 'name')
      .populate('vendorId', 'businessName')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Listing status updated to ${status}`,
      data: updatedListing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle listing featured status
 * @route   PUT /api/v1/admin/listings/:id/featured
 * @access  Private/Admin
 */
exports.toggleListingFeatured = async (req, res, next) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    // Only allow featuring of active listings
    if (!listing.featured && listing.status !== 'active') {
      return next(new ErrorResponse('Only active listings can be featured', 400));
    }

    const oldFeaturedStatus = listing.featured;

    // Toggle the featured status
    listing.featured = !listing.featured;
    listing.updatedBy = req.user.id;
    listing.lastStatusUpdate = new Date();

    await listing.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: listing.featured ? 'listing_featured' : 'listing_unfeatured',
      entityType: 'Listing',
      entityId: listing._id,
      description: `Listing ${listing.featured ? 'marked as featured' : 'removed from featured'}`,
      severity: 'low',
      impactLevel: 'minor',
      metadata: {
        oldFeaturedStatus,
        newFeaturedStatus: listing.featured
      }
    });

    // Populate for response
    listing = await Listing.findById(listing._id)
      .populate({
        path: 'productId',
        select: 'name description category',
        populate: {
          path: 'category',
          select: 'name'
        }
      })
      .populate('vendorId', 'businessName')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Listing ${listing.featured ? 'featured' : 'unfeatured'} successfully`,
      data: listing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Flag/unflag a listing
 * @route   PUT /api/v1/admin/listings/:id/flag
 * @access  Private/Admin
 */
exports.updateListingFlag = async (req, res, next) => {
  try {
    const { action, flagReason, moderationNotes } = req.body;

    // Validate action
    if (!['flag', 'unflag'].includes(action)) {
      return next(new ErrorResponse('Action must be either "flag" or "unflag"', 400));
    }

    if (action === 'flag' && !flagReason) {
      return next(new ErrorResponse('Flag reason is required when flagging', 400));
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(new ErrorResponse('Listing not found', 404));
    }

    const oldFlaggedStatus = listing.isFlagged;

    if (action === 'flag') {
      listing.isFlagged = true;
      listing.flagReason = flagReason;
      listing.moderatedBy = req.user.id;
      listing.moderationNotes = moderationNotes;
    } else {
      listing.isFlagged = false;
      listing.flagReason = undefined;
      listing.moderatedBy = req.user.id;
      listing.moderationNotes = moderationNotes || 'Flag removed by admin';
    }

    listing.lastStatusUpdate = new Date();
    await listing.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: action === 'flag' ? 'listing_flagged' : 'listing_unflagged',
      entityType: 'Listing',
      entityId: listing._id,
      description: action === 'flag' ? `Flagged listing for: ${flagReason}` : 'Removed flag from listing',
      reason: moderationNotes,
      severity: action === 'flag' ? 'medium' : 'low',
      impactLevel: action === 'flag' ? 'moderate' : 'minor',
      metadata: {
        oldFlaggedStatus,
        newFlaggedStatus: listing.isFlagged,
        flagReason: action === 'flag' ? flagReason : null
      }
    });

    // Populate for response
    const updatedListing = await Listing.findById(listing._id)
      .populate('productId', 'name')
      .populate('vendorId', 'businessName')
      .populate('moderatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Listing ${action}ged successfully`,
      data: updatedListing
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Soft delete a listing
 * @route   DELETE /api/v1/admin/listings/:id
 * @access  Private/Admin
 */
exports.softDeleteListing = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(new ErrorResponse(`Listing not found with id of ${req.params.id}`, 404));
    }

    if (listing.isDeleted) {
      return next(new ErrorResponse('Listing is already deleted', 400));
    }

    // Check for active orders
    const activeOrders = await Order.countDocuments({
      'items.listingId': req.params.id,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeOrders > 0) {
      return next(new ErrorResponse(
        `Cannot delete listing with ${activeOrders} active orders. Complete or cancel orders first.`,
        400
      ));
    }

    // Soft delete
    listing.isDeleted = true;
    listing.deletedAt = new Date();
    listing.deletedBy = req.user.id;
    listing.status = 'discontinued';
    await listing.save();

    // Log the action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'listing_deleted',
      entityType: 'Listing',
      entityId: listing._id,
      description: 'Soft deleted listing',
      reason,
      severity: 'high',
      impactLevel: 'significant',
      metadata: {
        deletionReason: reason,
        activeOrdersChecked: activeOrders
      }
    });

    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully',
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Bulk update listings
 * @route   POST /api/v1/admin/listings/bulk
 * @access  Private/Admin
 */
exports.bulkUpdateListings = async (req, res, next) => {
  try {
    const { listingIds, action, data } = req.body;

    // Validate input
    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return next(new ErrorResponse('Listing IDs array is required', 400));
    }

    if (listingIds.length > 50) {
      return next(new ErrorResponse('Cannot process more than 50 listings at once', 400));
    }

    const validActions = ['updateStatus', 'toggleFeatured', 'flag', 'unflag', 'delete'];
    if (!validActions.includes(action)) {
      return next(new ErrorResponse('Invalid bulk action', 400));
    }

    // Find all listings
    const listings = await Listing.find({
      _id: { $in: listingIds },
      isDeleted: { $ne: true }
    });

    if (listings.length === 0) {
      return next(new ErrorResponse('No valid listings found', 404));
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each listing
    for (const listing of listings) {
      try {
        switch (action) {
          case 'updateStatus':
            if (data.status) {
              listing.status = data.status;
              listing.lastStatusUpdate = new Date();
              listing.updatedBy = req.user.id;
            }
            break;

          case 'toggleFeatured':
            if (listing.status === 'active' || listing.featured) {
              listing.featured = !listing.featured;
              listing.lastStatusUpdate = new Date();
              listing.updatedBy = req.user.id;
            } else {
              throw new Error('Only active listings can be featured');
            }
            break;

          case 'flag':
            if (data.flagReason) {
              listing.isFlagged = true;
              listing.flagReason = data.flagReason;
              listing.moderatedBy = req.user.id;
              listing.moderationNotes = data.moderationNotes;
              listing.lastStatusUpdate = new Date();
            }
            break;

          case 'unflag':
            listing.isFlagged = false;
            listing.flagReason = undefined;
            listing.moderatedBy = req.user.id;
            listing.moderationNotes = data.moderationNotes || 'Bulk unflag operation';
            listing.lastStatusUpdate = new Date();
            break;

          case 'delete':
            // Check for active orders
            const activeOrders = await Order.countDocuments({
              'items.listingId': listing._id,
              status: { $in: ['pending', 'confirmed'] }
            });

            if (activeOrders > 0) {
              throw new Error(`Has ${activeOrders} active orders`);
            }

            listing.isDeleted = true;
            listing.deletedAt = new Date();
            listing.deletedBy = req.user.id;
            listing.status = 'discontinued';
            break;
        }

        await listing.save();
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          listingId: listing._id,
          error: error.message
        });
      }
    }

    // Log bulk action
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: `bulk_listing_${action}`,
      entityType: 'Listing',
      description: `Bulk ${action} operation on ${listingIds.length} listings`,
      severity: 'medium',
      impactLevel: 'moderate',
      metadata: {
        totalListings: listingIds.length,
        successful: results.success,
        failed: results.failed,
        actionData: data
      }
    });

    res.status(200).json({
      success: true,
      message: `Bulk operation completed. ${results.success} successful, ${results.failed} failed.`,
      data: results
    });
  } catch (err) {
    next(err);
  }
};
