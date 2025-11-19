const AuditLog = require('../models/AuditLog');

/**
 * Audit logging middleware for admin actions
 * @param {string} action - The action being performed
 * @param {string} entityType - The type of entity being acted upon
 * @param {string} description - Description of the action
 * @param {Object} options - Additional options for logging
 */
const auditLog = (action, entityType, description, options = {}) => {
  return async (req, res, next) => {
    // Store original res.json to capture response
    const originalJson = res.json;
    
    // Override res.json to capture response data
    res.json = function(data) {
      // Call original json method
      originalJson.call(this, data);
      
      // Only log if the operation was successful
      if (data.success) {
        // Perform audit logging asynchronously
        setImmediate(async () => {
          try {
            const {
              severity = 'medium',
              impactLevel = 'minor',
              reason = null,
              customDescription = null
            } = options;

            // Extract entity ID from params or response data
            let entityId = req.params.id || null;
            if (!entityId && data.data && data.data._id) {
              entityId = data.data._id;
            }
            if (!entityId && data.data && data.data.id) {
              entityId = data.data.id;
            }
            // Ensure entityId is null instead of undefined
            if (!entityId) {
              entityId = null;
            }

            // Capture changes if available
            let changes = {};
            if (req.originalData && data.data) {
              changes = {
                before: req.originalData,
                after: data.data
              };
            }

            // Generate dynamic description if needed
            let finalDescription = customDescription || description;
            if (data.data && data.data.name) {
              finalDescription = finalDescription.replace('{name}', data.data.name);
            }
            if (data.data && data.data.businessName) {
              finalDescription = finalDescription.replace('{name}', data.data.businessName);
            }

            // Extract request metadata
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            const requestId = req.headers['x-request-id'] || req.id;

            // Log the action
            await AuditLog.logAction({
              userId: req.user.id,
              userRole: req.user.role,
              action,
              entityType,
              entityId,
              changes,
              description: finalDescription,
              reason,
              ipAddress,
              userAgent,
              requestId,
              severity,
              impactLevel,
              status: 'success'
            });
          } catch (error) {
            console.error('Audit logging failed:', error);
            // Don't throw error - audit logging failure shouldn't break the main operation
          }
        });
      }
    };

    next();
  };
};

/**
 * Middleware to capture original data before modification
 * Useful for tracking changes in audit logs
 */
const captureOriginalData = (Model) => {
  return async (req, res, next) => {
    try {
      if (req.params.id && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const originalData = await Model.findById(req.params.id);
        if (originalData) {
          req.originalData = originalData.toObject();
        }
      }
    } catch (error) {
      // Don't fail the request if we can't capture original data
      console.warn('Failed to capture original data for audit:', error.message);
    }
    next();
  };
};

/**
 * Error audit logging middleware
 * Logs failed operations for security monitoring
 */
const auditError = (action, entityType, description) => {
  return (err, req, res, next) => {
    // Log failed operations asynchronously
    setImmediate(async () => {
      try {
        if (req.user) {
          await AuditLog.logAction({
            userId: req.user.id,
            userRole: req.user.role,
            action,
            entityType,
            entityId: req.params.id || null,
            description: `Failed: ${description}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: 'high',
            impactLevel: 'minor',
            status: 'failed',
            errorMessage: err.message
          });
        }
      } catch (auditError) {
        console.error('Error audit logging failed:', auditError);
      }
    });

    next(err);
  };
};

/**
 * Bulk operation audit logging
 * Special handling for operations that affect multiple entities
 */
const auditBulkOperation = (action, entityType, description) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      originalJson.call(this, data);
      
      if (data.success) {
        setImmediate(async () => {
          try {
            const bulkOperationId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const batchSize = data.count || data.affected || 1;

            await AuditLog.logAction({
              userId: req.user.id,
              userRole: req.user.role,
              action: 'bulk_operation',
              entityType,
              entityId: null, // Bulk operations don't have single entity ID
              description: `${description} (${batchSize} items)`,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              severity: batchSize > 10 ? 'high' : 'medium',
              impactLevel: batchSize > 50 ? 'major' : 'moderate',
              status: 'success',
              metadata: {
                bulkOperationId,
                batchSize,
                originalAction: action,
                additionalData: {
                  filters: req.query,
                  bodyParams: Object.keys(req.body)
                }
              }
            });
          } catch (error) {
            console.error('Bulk audit logging failed:', error);
          }
        });
      }
    };

    next();
  };
};

/**
 * Security-focused audit logging for sensitive operations
 */
const auditSecurity = (action, description, options = {}) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      originalJson.call(this, data);
      
      // Log both successful and failed security operations
      setImmediate(async () => {
        try {
          const {
            severity = 'high',
            impactLevel = 'major',
            entityType = 'User',
            forceLog = false
          } = options;

          // Always log security operations, even if not successful (unless specifically disabled)
          if (data.success || forceLog) {
            await AuditLog.logAction({
              userId: req.user ? req.user.id : null,
              userRole: req.user ? req.user.role : 'anonymous',
              action,
              entityType,
              entityId: req.params.id || (req.user ? req.user.id : null),
              description,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              requestId: req.headers['x-request-id'] || req.id,
              severity,
              impactLevel,
              status: data.success ? 'success' : 'failed',
              errorMessage: data.success ? null : data.error,
              metadata: {
                securityEvent: true,
                timestamp: new Date().toISOString(),
                additionalData: {
                  method: req.method,
                  path: req.path,
                  query: req.query
                }
              }
            });
          }
        } catch (error) {
          console.error('Security audit logging failed:', error);
        }
      });
    };

    next();
  };
};

/**
 * Rate limiting audit for admin actions
 * Tracks frequency of admin operations for security monitoring
 */
const auditRateLimit = () => {
  const adminActionCounts = new Map();
  
  return (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      const userId = req.user.id;
      const currentTime = Date.now();
      const timeWindow = 15 * 60 * 1000; // 15 minutes
      
      // Clean old entries
      const cutoff = currentTime - timeWindow;
      for (const [key, data] of adminActionCounts.entries()) {
        if (data.timestamp < cutoff) {
          adminActionCounts.delete(key);
        }
      }
      
      // Track current action
      const key = `${userId}_${currentTime}`;
      adminActionCounts.set(key, {
        timestamp: currentTime,
        action: `${req.method} ${req.path}`,
        ip: req.ip
      });
      
      // Count actions in current window
      const userActions = Array.from(adminActionCounts.values())
        .filter(data => data.timestamp >= cutoff && key.startsWith(userId));
      
      // Log if suspicious activity detected
      if (userActions.length > 50) { // More than 50 actions in 15 minutes
        setImmediate(async () => {
          try {
            await AuditLog.logAction({
              userId: req.user.id,
              userRole: req.user.role,
              action: 'high_frequency_access',
              entityType: 'User',
              entityId: req.user.id,
              description: `High frequency admin activity detected: ${userActions.length} actions in 15 minutes`,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              severity: 'critical',
              impactLevel: 'major',
              status: 'success',
              metadata: {
                actionCount: userActions.length,
                timeWindow: '15min',
                securityAlert: true
              }
            });
          } catch (error) {
            console.error('Rate limit audit logging failed:', error);
          }
        });
      }
    }
    
    next();
  };
};

module.exports = {
  auditLog,
  captureOriginalData,
  auditError,
  auditBulkOperation,
  auditSecurity,
  auditRateLimit
};