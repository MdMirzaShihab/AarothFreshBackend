const Settings = require("../models/Settings");
const AuditLog = require("../models/AuditLog");
const { ErrorResponse } = require("../middleware/error");
const { validationResult } = require("express-validator");

/**
 * @desc    Get all settings by category
 * @route   GET /api/v1/admin/settings/general
 * @route   GET /api/v1/admin/settings/business
 * @route   GET /api/v1/admin/settings/notifications
 * @route   GET /api/v1/admin/settings/security
 * @route   GET /api/v1/admin/settings/payment
 * @access  Private/Admin
 */
exports.getSettingsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { includePrivate = false } = req.query;

    const validCategories = ['general', 'business', 'notifications', 'security', 'payment'];
    if (!validCategories.includes(category)) {
      return next(new ErrorResponse('Invalid category', 400));
    }

    const settings = await Settings.getByCategory(category, includePrivate === 'true');

    res.status(200).json({
      success: true,
      category,
      data: settings,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all settings (admin view)
 * @route   GET /api/v1/admin/settings
 * @access  Private/Admin
 */
exports.getAllSettings = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { key: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const settings = await Settings.find(query)
      .populate('updatedBy', 'name email')
      .sort({ category: 1, key: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Settings.countDocuments(query);

    res.status(200).json({
      success: true,
      count: settings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: settings
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single setting
 * @route   GET /api/v1/admin/settings/:key
 * @access  Private/Admin
 */
exports.getSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    
    const setting = await Settings.findOne({ key })
      .populate('updatedBy', 'name email');

    if (!setting) {
      return next(new ErrorResponse(`Setting with key '${key}' not found`, 404));
    }

    res.status(200).json({
      success: true,
      data: setting
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new setting
 * @route   POST /api/v1/admin/settings
 * @access  Private/Admin
 */
exports.createSetting = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ErrorResponse(errors.array()[0].msg, 400));
    }

    const { key, value, category, description, dataType, isPublic = false, isEditable = true, validation = {} } = req.body;

    // Check if setting already exists
    const existingSetting = await Settings.findOne({ key });
    if (existingSetting) {
      return next(new ErrorResponse(`Setting with key '${key}' already exists`, 400));
    }

    // Validate value against data type
    if (!validateValueType(value, dataType)) {
      return next(new ErrorResponse(`Value does not match specified data type: ${dataType}`, 400));
    }

    const setting = await Settings.create({
      key,
      value,
      category,
      description,
      dataType,
      isPublic,
      isEditable,
      validation,
      updatedBy: req.user.id
    });

    // Log the creation
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'settings_created',
      entityType: 'Settings',
      entityId: setting._id,
      description: `Created setting: ${key}`,
      severity: 'medium',
      impactLevel: 'moderate'
    });

    const populatedSetting = await Settings.findById(setting._id)
      .populate('updatedBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedSetting
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update setting
 * @route   PUT /api/v1/admin/settings/:key
 * @access  Private/Admin
 */
exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description, isPublic, isEditable, validation, changeReason } = req.body;

    const setting = await Settings.findOne({ key });
    if (!setting) {
      return next(new ErrorResponse(`Setting with key '${key}' not found`, 404));
    }

    if (!setting.isEditable) {
      return next(new ErrorResponse(`Setting '${key}' is not editable`, 400));
    }

    // Validate value against data type if value is being updated
    if (value !== undefined && !validateValueType(value, setting.dataType)) {
      return next(new ErrorResponse(`Value does not match setting data type: ${setting.dataType}`, 400));
    }

    // Store previous value for audit
    const previousValue = setting.value;

    // Update setting
    if (value !== undefined) setting.value = value;
    if (description !== undefined) setting.description = description;
    if (isPublic !== undefined) setting.isPublic = isPublic;
    if (isEditable !== undefined) setting.isEditable = isEditable;
    if (validation !== undefined) setting.validation = validation;
    
    setting.previousValue = previousValue;
    setting.updatedBy = req.user.id;
    setting.changeReason = changeReason;

    await setting.save();

    // Log the update
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'settings_updated',
      entityType: 'Settings',
      entityId: setting._id,
      description: `Updated setting: ${key}`,
      reason: changeReason,
      changes: {
        before: { value: previousValue },
        after: { value: setting.value }
      },
      severity: 'medium',
      impactLevel: 'moderate'
    });

    const populatedSetting = await Settings.findById(setting._id)
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      data: populatedSetting
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete setting
 * @route   DELETE /api/v1/admin/settings/:key
 * @access  Private/Admin
 */
exports.deleteSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return next(new ErrorResponse('Deletion reason is required', 400));
    }

    const setting = await Settings.findOne({ key });
    if (!setting) {
      return next(new ErrorResponse(`Setting with key '${key}' not found`, 404));
    }

    if (!setting.isEditable) {
      return next(new ErrorResponse(`Setting '${key}' cannot be deleted`, 400));
    }

    // Log the deletion before removing
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'settings_deleted',
      entityType: 'Settings',
      entityId: setting._id,
      description: `Deleted setting: ${key}`,
      reason,
      changes: {
        before: setting.toObject(),
        after: null
      },
      severity: 'high',
      impactLevel: 'moderate'
    });

    await setting.deleteOne();

    res.status(200).json({
      success: true,
      message: `Setting '${key}' deleted successfully`,
      data: { deletedKey: key }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Bulk update settings
 * @route   PUT /api/v1/admin/settings/bulk
 * @access  Private/Admin
 */
exports.bulkUpdateSettings = async (req, res, next) => {
  try {
    const { settings, changeReason } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return next(new ErrorResponse('Settings array is required', 400));
    }

    if (settings.length > 50) {
      return next(new ErrorResponse('Maximum 50 settings can be updated at once', 400));
    }

    const results = [];
    const errors = [];

    for (const settingUpdate of settings) {
      try {
        const { key, value } = settingUpdate;
        
        const setting = await Settings.findOne({ key });
        if (!setting) {
          errors.push({ key, error: 'Setting not found' });
          continue;
        }

        if (!setting.isEditable) {
          errors.push({ key, error: 'Setting is not editable' });
          continue;
        }

        if (!validateValueType(value, setting.dataType)) {
          errors.push({ key, error: `Value does not match data type: ${setting.dataType}` });
          continue;
        }

        const previousValue = setting.value;
        setting.value = value;
        setting.previousValue = previousValue;
        setting.updatedBy = req.user.id;
        setting.changeReason = changeReason;

        await setting.save();

        // Log individual update
        await AuditLog.logAction({
          userId: req.user.id,
          userRole: req.user.role,
          action: 'settings_updated',
          entityType: 'Settings',
          entityId: setting._id,
          description: `Bulk updated setting: ${key}`,
          reason: changeReason,
          changes: {
            before: { value: previousValue },
            after: { value: setting.value }
          },
          severity: 'medium',
          impactLevel: 'moderate',
          metadata: {
            bulkOperation: true,
            batchSize: settings.length
          }
        });

        results.push({ key, success: true, previousValue, newValue: value });
      } catch (error) {
        errors.push({ key: settingUpdate.key, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: settings.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reset settings to default values
 * @route   POST /api/v1/admin/settings/reset
 * @access  Private/Admin
 */
exports.resetSettingsToDefault = async (req, res, next) => {
  try {
    const { category, keys, reason } = req.body;

    if (!reason) {
      return next(new ErrorResponse('Reset reason is required', 400));
    }

    let query = { isEditable: true };
    
    if (category) {
      query.category = category;
    }
    
    if (keys && Array.isArray(keys)) {
      query.key = { $in: keys };
    }

    const defaultValues = getDefaultSettings();
    const settings = await Settings.find(query);

    const resetResults = [];

    for (const setting of settings) {
      const defaultValue = defaultValues[setting.key];
      if (defaultValue !== undefined) {
        const previousValue = setting.value;
        setting.value = defaultValue;
        setting.previousValue = previousValue;
        setting.updatedBy = req.user.id;
        setting.changeReason = `Reset to default: ${reason}`;
        
        await setting.save();

        // Log the reset
        await AuditLog.logAction({
          userId: req.user.id,
          userRole: req.user.role,
          action: 'settings_reset',
          entityType: 'Settings',
          entityId: setting._id,
          description: `Reset setting to default: ${setting.key}`,
          reason,
          changes: {
            before: { value: previousValue },
            after: { value: defaultValue }
          },
          severity: 'high',
          impactLevel: 'moderate'
        });

        resetResults.push({
          key: setting.key,
          previousValue,
          defaultValue
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Reset ${resetResults.length} settings to default values`,
      data: resetResults
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get settings history/audit trail
 * @route   GET /api/v1/admin/settings/:key/history
 * @access  Private/Admin
 */
exports.getSettingHistory = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const setting = await Settings.findOne({ key });
    if (!setting) {
      return next(new ErrorResponse(`Setting with key '${key}' not found`, 404));
    }

    const history = await AuditLog.getByEntity('Settings', setting._id, {
      limit: parseInt(limit),
      page: parseInt(page)
    });

    res.status(200).json({
      success: true,
      data: {
        setting: {
          key: setting.key,
          currentValue: setting.value,
          category: setting.category
        },
        history
      }
    });
  } catch (err) {
    next(err);
  }
};

// Helper functions

/**
 * Validate value against specified data type
 */
function validateValueType(value, dataType) {
  switch (dataType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Get default settings values
 */
function getDefaultSettings() {
  return {
    // General settings
    'app_name': 'Aaroth Fresh',
    'app_description': 'B2B Fresh Produce Marketplace',
    'max_file_size': 10485760, // 10MB
    'allowed_file_types': ['image/jpeg', 'image/png', 'image/webp'],
    
    // Business settings
    'commission_rate': 5.0,
    'min_order_amount': 100,
    'max_order_amount': 50000,
    'delivery_fee': 50,
    'free_delivery_threshold': 1000,
    
    // Notification settings
    'email_notifications': true,
    'sms_notifications': false,
    'push_notifications': true,
    'notification_frequency': 'immediate',
    
    // Security settings
    'session_timeout': 3600, // 1 hour
    'max_login_attempts': 5,
    'password_min_length': 8,
    'require_email_verification': true,
    
    // Payment settings
    'payment_methods': ['bank_transfer', 'cash_on_delivery'],
    'auto_payment_processing': false,
    'payment_timeout': 86400 // 24 hours
  };
}

