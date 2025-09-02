# Vendor Interface API Documentation

## Overview

This comprehensive documentation covers all API endpoints available to vendors in the Aaroth Fresh B2B marketplace platform. The documentation is split into multiple focused documents for better organization and maintainability.

## Base Information

- **Base URL**: `https://api.aarothfresh.com/api/v1`
- **Development URL**: `http://localhost:5000/api/v1`
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`
- **API Version**: v1

## Authentication Requirements

All vendor endpoints require:
1. Valid JWT token in Authorization header: `Authorization: Bearer <token>`
2. User role must be `vendor`
3. Active vendor account with approved status

## Document Structure

This documentation is organized into the following documents:

### 1. [Authentication & User Management](./vendor-auth-api.md)
- User authentication and registration
- Profile management
- Password management
- Token refresh mechanisms

### 2. [Vendor Dashboard Analytics](./vendor-dashboard-api.md)
- Dashboard overview metrics
- Revenue and profit analytics
- Product performance analytics
- Customer insights
- Financial summaries
- Notification management

### 3. [Inventory Management](./vendor-inventory-api.md)
- Inventory CRUD operations
- Purchase tracking
- Stock adjustments
- Low stock alerts
- Analytics and reporting
- Sync operations

### 4. [Product & Listing Management](./vendor-listings-api.md)
- Product catalog management
- Listing creation and updates
- Pricing and availability
- Product performance tracking
- Bulk operations

### 5. [Order Management](./vendor-orders-api.md)
- Order processing
- Status updates
- Order analytics
- Customer communications
- Fulfillment tracking

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data varies by endpoint
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errorCode": "ERROR_CODE",
  "details": {
    // Additional error details when available
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Common HTTP Status Codes

- `200` - OK (Success)
- `201` - Created (Resource created successfully)
- `400` - Bad Request (Invalid input data)
- `401` - Unauthorized (Missing or invalid authentication)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found (Resource not found)
- `422` - Unprocessable Entity (Validation errors)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error (Server error)

## Common Query Parameters

### Pagination
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page

### Date Filtering
- `startDate` (ISO 8601 date) - Filter from date
- `endDate` (ISO 8601 date) - Filter to date
- `period` (string) - Predefined period: `today`, `week`, `month`, `quarter`, `year`

### Sorting
- `sort` (string) - Field to sort by
- `order` (string) - Sort order: `asc` or `desc`

## Rate Limiting

- **Development**: No rate limiting
- **Production**: 
  - General endpoints: 100 requests per 15 minutes per IP
  - Authentication endpoints: 5 requests per 15 minutes per IP

## Error Handling

The API uses consistent error handling across all endpoints:

### Validation Errors
```json
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "field": "Field-specific error message"
  }
}
```

### Authentication Errors
```json
{
  "success": false,
  "error": "Authentication required",
  "errorCode": "UNAUTHORIZED"
}
```

### Authorization Errors
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "errorCode": "FORBIDDEN"
}
```

### Resource Not Found
```json
{
  "success": false,
  "error": "Resource not found",
  "errorCode": "NOT_FOUND"
}
```

## Data Types

### Common Data Structures

#### Money/Currency
All monetary values are represented as numbers with 2 decimal precision:
```json
{
  "amount": 123.45,
  "currency": "BDT"
}
```

#### Dates
All dates use ISO 8601 format:
```json
{
  "createdAt": "2023-12-01T10:30:00.000Z",
  "updatedAt": "2023-12-01T15:45:30.000Z"
}
```

#### Phone Numbers
Phone numbers must include country code:
```json
{
  "phone": "+8801234567890"
}
```

#### Coordinates
Geographic coordinates for delivery/pickup locations:
```json
{
  "latitude": 23.8103,
  "longitude": 90.4125
}
```

## Getting Started

1. **Register/Login**: Use the authentication endpoints to get access tokens
2. **Setup Profile**: Complete your vendor profile information
3. **Manage Inventory**: Add your products and track inventory
4. **Create Listings**: Make your products available for purchase
5. **Process Orders**: Handle incoming orders and fulfill them
6. **Track Performance**: Use analytics endpoints to monitor your business

## Support

For technical support and questions:
- **Documentation Issues**: Check the individual API documents
- **Integration Help**: Contact technical support
- **Business Questions**: Contact vendor support team

## Changelog

### Version 1.0 (Current)
- Initial vendor interface implementation
- Complete CRUD operations for all resources
- Comprehensive analytics and reporting
- Integrated inventory management
- Unified notification system

---

**Next**: Start with [Authentication & User Management](./vendor-auth-api.md) to begin integration.