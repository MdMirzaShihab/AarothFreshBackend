// controllers/adminController.js - Re-exports for backward compatibility
// This file was split into domain-specific controllers under controllers/admin/
module.exports = {
  ...require('./admin/adminAnalyticsController'),
  ...require('./admin/adminUserController'),
  ...require('./admin/adminVendorController'),
  ...require('./admin/adminBuyerController'),
  ...require('./admin/adminProductController'),
  ...require('./admin/adminOrderController'),
  ...require('./admin/adminMarketController'),
};
