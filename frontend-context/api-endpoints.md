# Aaroth Fresh API Endpoints Reference

Comprehensive API endpoint reference for the Aaroth Fresh B2B marketplace backend.

**For Redux Toolkit integration patterns and implementation examples, see [api-integration.md](./api-integration.md)**

## Base Configuration
- **Base URL**: `http://localhost:5000/api/v1`
- **Authentication**: JWT Bearer tokens with phone-based login
- **Content-Type**: `application/json`
- **Authorization Header**: `Bearer {token}`

## Authentication Endpoints (`/api/v1/auth`)

> **Implementation**: See [Login Component with Redux](./api-integration.md#login-component-with-redux) for complete integration example.

### Login
**POST** `/api/v1/auth/login`

**Request Body**:
```json
{
  "phone": "+8801234567890",
  "password": "userPassword"
}
```

**Response (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "phone": "+8801234567890",
    "name": "User Name",
    "role": "vendor",
    "verificationStatus": "approved",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `400`: Invalid phone format or missing password
- `401`: Invalid credentials
- `429`: Too many login attempts

### Register
**POST** `/api/v1/auth/register`

**Request Body**:
```json
{
  "phone": "+8801234567890",
  "password": "securePassword",
  "name": "User Name",
  "role": "vendor",
  "businessName": "Fresh Produce Co",
  "businessAddress": {
    "street": "123 Market St",
    "city": "Dhaka",
    "area": "Dhanmondi"
  }
}
```

**Response (201)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "phone": "+8801234567890",
    "name": "User Name",
    "role": "vendor",
    "verificationStatus": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Current User
**GET** `/api/v1/auth/me`

**Headers**: `Authorization: Bearer {token}`

**Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "phone": "+8801234567890",
    "name": "User Name",
    "role": "vendor",
    "verificationStatus": "approved",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "vendor": {
      "businessName": "Fresh Produce Co",
      "businessAddress": {
        "street": "123 Market St",
        "city": "Dhaka"
      }
    }
  }
}
```

### Logout
**POST** `/api/v1/auth/logout`

**Headers**: `Authorization: Bearer {token}`

**Response (200)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Admin Endpoints (`/api/v1/admin`)

> **Implementation**: See [Admin Approval Management](./api-integration.md#admin-approval-management) for complete Redux integration example.

### Get All Vendors
**GET** `/api/v1/admin/vendors`

**Headers**: `Authorization: Bearer {admin_token}`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by verification status (`pending`, `approved`, `rejected`)
- `search`: Search by business name
- `sortBy`: Sort field (default: `createdAt`)
- `sortOrder`: Sort direction (`asc`, `desc` - default: `desc`)

**Response (200)**:
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "stats": {
    "totalVendors": 25,
    "pendingVendors": 8,
    "approvedVendors": 15,
    "rejectedVendors": 2
  },
  "data": [
    {
      "id": "vendor_id",
      "businessName": "Fresh Farm Co",
      "verificationStatus": "pending",
      "createdBy": {
        "name": "John Smith",
        "email": "john@freshfarm.com"
      },
      "businessAddress": {
        "street": "123 Farm Road",
        "city": "Dhaka"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get All Restaurants
**GET** `/api/v1/admin/restaurants`

**Headers**: `Authorization: Bearer {admin_token}`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by verification status (`pending`, `approved`, `rejected`)
- `search`: Search by restaurant name
- `sortBy`: Sort field (default: `createdAt`)
- `sortOrder`: Sort direction (`asc`, `desc` - default: `desc`)

**Response (200)**:
```json
{
  "success": true,
  "count": 5,
  "total": 12,
  "page": 1,
  "pages": 3,
  "stats": {
    "totalRestaurants": 12,
    "pendingRestaurants": 3,
    "approvedRestaurants": 8,
    "rejectedRestaurants": 1
  },
  "data": [
    {
      "id": "restaurant_id",
      "name": "Green Restaurant",
      "verificationStatus": "pending",
      "createdBy": {
        "name": "Jane Doe",
        "email": "jane@greenrest.com"
      },
      "managers": [
        {
          "name": "Manager Name",
          "email": "manager@greenrest.com"
        }
      ],
      "address": {
        "street": "456 Main St",
        "city": "Dhaka"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Single Vendor
**GET** `/api/v1/admin/vendors/{id}`

**Headers**: `Authorization: Bearer {admin_token}`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "vendor": {
      "id": "vendor_id",
      "businessName": "Fresh Farm Co",
      "verificationStatus": "approved",
      "createdBy": {
        "name": "John Smith",
        "email": "john@freshfarm.com"
      },
      "businessAddress": {
        "street": "123 Farm Road",
        "city": "Dhaka"
      }
    },
    "recentOrders": [
      {
        "id": "order_id",
        "status": "completed",
        "totalAmount": 250.00,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "orderStats": {
      "totalOrders": 45,
      "totalAmount": 5000.00,
      "activeOrders": 2,
      "completedOrders": 43
    },
    "listingStats": {
      "totalListings": 12,
      "activeListings": 10,
      "featuredListings": 3,
      "inactiveListings": 2
    }
  }
}
```

### Update Vendor
**PUT** `/api/v1/admin/vendors/{id}`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "businessName": "Updated Farm Co",
  "email": "newemail@farm.com",
  "phone": "+8801234567890",
  "businessAddress": {
    "street": "456 New Farm Road",
    "city": "Dhaka",
    "area": "Gulshan"
  },
  "tradeLicenseNo": "VL123456789"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Vendor updated successfully",
  "data": {
    "id": "vendor_id",
    "businessName": "Updated Farm Co",
    "email": "newemail@farm.com",
    "updatedBy": {
      "name": "Admin Name",
      "email": "admin@aarothfresh.com"
    }
  }
}
```

### Deactivate Vendor
**PUT** `/api/v1/admin/vendors/{id}/deactivate`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "reason": "Violation of terms and conditions"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Vendor deactivated successfully",
  "data": {
    "id": "vendor_id",
    "businessName": "Vendor Name",
    "isActive": false,
    "adminNotes": "Violation of terms and conditions"
  }
}
```

### Delete Vendor (Soft Delete)
**DELETE** `/api/v1/admin/vendors/{id}/safe-delete`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "reason": "Business permanently closed"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Vendor deleted successfully",
  "data": {
    "deletedId": "vendor_id"
  }
}
```

### Update Vendor Verification
**PUT** `/api/v1/admin/vendors/{id}/verification`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "status": "approved",
  "reason": "All documents verified successfully"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Vendor verified successfully",
  "data": {
    "id": "vendor_id",
    "businessName": "Fresh Farm Co",
    "verificationStatus": "approved",
    "statusUpdatedBy": {
      "name": "Admin Name",
      "email": "admin@aarothfresh.com"
    },
    "verificationDate": "2024-01-01T12:00:00.000Z"
  }
}
```

### Update Restaurant Verification
**PUT** `/api/v1/admin/restaurants/{id}/verification`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "status": "rejected",
  "reason": "Trade license documents not clear - please resubmit"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Restaurant verification rejected",
  "data": {
    "id": "restaurant_id",
    "name": "Green Restaurant",
    "verificationStatus": "rejected",
    "statusUpdatedBy": {
      "name": "Admin Name",
      "email": "admin@aarothfresh.com"
    },
    "adminNotes": "Trade license documents not clear - please resubmit"
  }
}
```

### Get Single Restaurant 
**GET** `/api/v1/admin/restaurants/{id}`

**Headers**: `Authorization: Bearer {admin_token}`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "restaurant": {
      "id": "restaurant_id",
      "name": "Green Restaurant",
      "verificationStatus": "approved",
      "createdBy": {
        "name": "Jane Doe",
        "email": "jane@greenrest.com"
      },
      "managers": [
        {
          "name": "Manager Name",
          "email": "manager@greenrest.com"
        }
      ]
    },
    "recentOrders": [
      {
        "id": "order_id",
        "status": "completed",
        "totalAmount": 150.00,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "orderStats": {
      "totalOrders": 25,
      "totalAmount": 2500.00,
      "activeOrders": 3,
      "completedOrders": 22
    }
  }
}
```

### Update Restaurant
**PUT** `/api/v1/admin/restaurants/{id}`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "name": "Updated Restaurant Name",
  "email": "newemail@restaurant.com",
  "phone": "+8801234567890",
  "address": {
    "street": "456 New Street",
    "city": "Dhaka",
    "area": "Gulshan"
  },
  "tradeLicenseNo": "TL123456789"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Restaurant updated successfully",
  "data": {
    "id": "restaurant_id",
    "name": "Updated Restaurant Name",
    "email": "newemail@restaurant.com",
    "updatedBy": {
      "name": "Admin Name",
      "email": "admin@aarothfresh.com"
    }
  }
}
```

### Deactivate Restaurant
**PUT** `/api/v1/admin/restaurants/{id}/deactivate`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "reason": "Violation of terms and conditions"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Restaurant deactivated successfully",
  "data": {
    "id": "restaurant_id",
    "name": "Restaurant Name",
    "isActive": false,
    "adminNotes": "Violation of terms and conditions"
  }
}
```

### Delete Restaurant (Soft Delete)
**DELETE** `/api/v1/admin/restaurants/{id}/safe-delete`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "reason": "Business permanently closed"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Restaurant deleted successfully",
  "data": {
    "deletedId": "restaurant_id"
  }
}
```

## Admin Performance Monitoring (`/api/v1/admin/performance`)

### Get Performance Dashboard
**GET** `/api/v1/admin/performance/dashboard`

**Headers**: `Authorization: Bearer {admin_token}`

**Query Parameters**:
- `period`: Period type (`daily`, `weekly`, `monthly` - default: `monthly`)
- `adminId`: Filter by specific admin (optional)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "period": "2024-01",
    "periodType": "monthly",
    "overview": {
      "totalAdmins": 5,
      "totalActions": 250,
      "avgResponseTime": 8.5,
      "avgApprovalRate": 85.2,
      "avgSLACompliance": 92.1,
      "totalSLAViolations": 12,
      "highPerformers": 3
    },
    "currentMetrics": [
      {
        "adminId": {
          "name": "Admin Name",
          "email": "admin@aarothfresh.com"
        },
        "metrics": {
          "totalActions": 45,
          "approvals": 38,
          "rejections": 7,
          "approvalRate": 84.4,
          "avgResponseTime": 6.2
        },
        "performanceGrade": {
          "overall": "A",
          "responseTime": "A",
          "slaCompliance": "B+",
          "qualityScore": "A"
        }
      }
    ],
    "topPerformers": [],
    "performanceDistribution": {
      "excellent": 2,
      "good": 2,
      "average": 1,
      "poor": 0
    },
    "trendData": []
  }
}
```

### Get SLA Violations
**GET** `/api/v1/admin/performance/sla-violations`

**Headers**: `Authorization: Bearer {admin_token}`

**Query Parameters**:
- `adminId`: Filter by admin (optional)
- `entityType`: Filter by entity type (`vendor`, `restaurant`, etc.)
- `violationType`: Filter by violation type
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response (200)**:
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "stats": {
    "totalViolations": 25
  },
  "data": [
    {
      "adminName": "Admin Name",
      "violation": {
        "entityType": "vendor",
        "entityId": "vendor_id",
        "submittedAt": "2024-01-01T00:00:00.000Z",
        "actionTakenAt": "2024-01-01T12:00:00.000Z",
        "responseTime": 12.5,
        "slaTarget": 8.0,
        "violationType": "late_approval",
        "severityLevel": "medium"
      }
    }
  ]
}
```

### Generate Performance Report
**POST** `/api/v1/admin/performance/generate-report`

**Headers**: `Authorization: Bearer {admin_token}`

**Request Body**:
```json
{
  "reportType": "comprehensive",
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "adminIds": ["admin_id_1", "admin_id_2"],
  "includeCharts": false
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Performance report generated successfully",
  "data": {
    "reportType": "comprehensive",
    "period": "monthly",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "generatedAt": "2024-02-01T00:00:00.000Z",
    "generatedBy": "admin_id",
    "metrics": [],
    "violations": [],
    "trends": [],
    "teamComparison": []
  }
}
```

### Get All Users
**GET** `/api/v1/admin/users`

**Headers**: `Authorization: Bearer {admin_token}`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `role`: Filter by role (`vendor`, `restaurantOwner`, `restaurantManager`)
- `verificationStatus`: Filter by status (`pending`, `approved`, `rejected`)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "name": "John Doe",
        "phone": "+8801234567890",
        "role": "vendor",
        "verificationStatus": "approved",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 150,
      "currentPage": 1,
      "totalPages": 8
    }
  }
}
```

### Get Dashboard Overview
**GET** `/api/v1/admin/dashboard/overview`

**Headers**: `Authorization: Bearer {admin_token}`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "keyMetrics": {
      "totalUsers": 250,
      "activeVendors": 45,
      "activeRestaurants": 32,
      "totalOrders": 1250,
      "totalRevenue": 125000
    },
    "approvalMetrics": {
      "pendingVendors": 8,
      "pendingRestaurants": 3,
      "approvedToday": 5,
      "rejectedToday": 1
    },
    "recentActivity": [
      {
        "type": "vendor_approval",
        "message": "Fresh Farm Co approved",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

## Listings Endpoints (`/api/v1/listings`)

> **Implementation**: See [Listing Management for Vendors](./api-integration.md#listing-management-for-vendors) for complete component integration.

### Get All Listings
**GET** `/api/v1/listings`

**Headers**: `Authorization: Bearer {token}`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category ID
- `vendor`: Filter by vendor ID
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter
- `available`: Filter by availability (`true`/`false`)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing_id",
        "vendor": {
          "id": "vendor_id",
          "businessName": "Fresh Farm Co"
        },
        "product": {
          "id": "product_id",
          "name": "Fresh Tomatoes",
          "category": {
            "id": "category_id",
            "name": "Vegetables"
          }
        },
        "pricing": [{
          "pricePerUnit": 25.50,
          "unit": "kg"
        }],
        "availability": {
          "quantityAvailable": 100,
          "unit": "kg"
        },
        "qualityGrade": "Premium",
        "images": ["url1", "url2"],
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 200,
      "currentPage": 1,
      "totalPages": 10
    }
  }
}
```

### Create Listing (Vendor Only)
**POST** `/api/v1/listings`

**Headers**: `Authorization: Bearer {vendor_token}`, `Content-Type: multipart/form-data`

**Form Data**:
```
productId: "product_id"
pricing[0][pricePerUnit]: "25.50"
pricing[0][unit]: "kg"
availability[quantityAvailable]: "100"
description: "Farm-fresh organic tomatoes"
images: [File1, File2] // Max 5 images, 1MB each
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "new_listing_id",
    "productId": {
      "id": "product_id",
      "name": "Fresh Tomatoes"
    },
    "pricing": [{
      "pricePerUnit": 25.50,
      "unit": "kg"
    }],
    "images": [
      "https://cloudinary.../image1.jpg",
      "https://cloudinary.../image2.jpg"
    ],
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Listing (Vendor Only)
**PUT** `/api/v1/listings/{listingId}`

**Headers**: `Authorization: Bearer {vendor_token}`, `Content-Type: multipart/form-data`

### Delete Listing (Vendor Only)
**DELETE** `/api/v1/listings/{listingId}`

**Headers**: `Authorization: Bearer {vendor_token}`

**Response (200)**:
```json
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

## Orders Endpoints (`/api/v1/orders`)

> **Implementation**: See [RTK Query API Integration](./api-integration.md#rtk-query-api-integration) for order management patterns.

### Get All Orders
**GET** `/api/v1/orders`

**Headers**: `Authorization: Bearer {token}`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (`pending`, `confirmed`, `delivered`, `cancelled`)
- `vendor`: Filter by vendor ID (for restaurant users)
- `restaurant`: Filter by restaurant ID (for vendor users)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_id",
        "restaurant": {
          "id": "restaurant_id",
          "name": "Green Restaurant"
        },
        "vendor": {
          "id": "vendor_id",
          "businessName": "Fresh Farm Co"
        },
        "items": [
          {
            "listing": {
              "id": "listing_id",
              "product": {
                "name": "Fresh Tomatoes"
              }
            },
            "quantity": 10,
            "unitPrice": 25.50,
            "totalPrice": 255.00
          }
        ],
        "totalAmount": 255.00,
        "status": "pending",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 50,
      "currentPage": 1,
      "totalPages": 3
    }
  }
}
```

### Create Order (Restaurant Only)
**POST** `/api/v1/orders`

**Headers**: `Authorization: Bearer {restaurant_token}`

**Request Body**:
```json
{
  "items": [
    {
      "listing": "listing_id",
      "quantity": 10,
      "unitPrice": 25.50
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Dhaka",
    "area": "Dhanmondi"
  },
  "notes": "Deliver fresh in morning"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": "new_order_id",
    "status": "pending",
    "totalAmount": 255.00,
    "items": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Order Status
**PUT** `/api/v1/orders/{orderId}/status`

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "status": "confirmed",
  "notes": "Order confirmed and in preparation"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "order": {
    "id": "order_id",
    "status": "confirmed",
    "updatedAt": "2024-01-01T10:30:00.000Z"
  }
}
```

## Public Endpoints (`/api/v1/public`)

### Get All Products
**GET** `/api/v1/public/products`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category ID
- `search`: Search by product name

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product_id",
        "name": "Fresh Tomatoes",
        "category": {
          "id": "category_id",
          "name": "Vegetables"
        },
        "description": "Fresh red tomatoes",
        "unit": "kg",
        "images": ["url1", "url2"],
        "activeListingsCount": 5,
        "averagePrice": 25.50,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 100,
      "currentPage": 1,
      "totalPages": 5
    }
  }
}
```

### Get Categories
**GET** `/api/v1/public/categories`

**Response (200)**:
```json
{
  "success": true,
  "categories": [
    {
      "id": "category_id",
      "name": "Vegetables",
      "description": "Fresh vegetables category",
      "productCount": 25,
      "activeListingsCount": 120,
      "image": "category_image_url",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Featured Listings
**GET** `/api/v1/public/featured-listings`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "listing_id",
      "productId": {
        "id": "product_id",
        "name": "Fresh Tomatoes",
        "category": {
          "id": "category_id",
          "name": "Vegetables"
        }
      },
      "vendorId": {
        "id": "vendor_id",
        "businessName": "Fresh Farm Co",
        "verificationStatus": "approved"
      },
      "pricing": [{
        "pricePerUnit": 25.50,
        "unit": "kg"
      }],
      "availability": {
        "quantityAvailable": 100,
        "unit": "kg"
      },
      "qualityGrade": "Premium",
      "images": ["url1", "url2"],
      "featured": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "totalCount": 15,
    "currentPage": 1,
    "totalPages": 2
  }
}
```

## Dashboard Endpoints

> **Implementation**: See [Redux Toolkit Store Setup](./api-integration.md#redux-toolkit-store-setup) for dashboard state management patterns.

### Vendor Dashboard Overview
**GET** `/api/v1/vendor-dashboard/overview`

**Headers**: `Authorization: Bearer {vendor_token}`

**Query Parameters**:
- `period`: Time period (`day`, `week`, `month`, `year`)
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "keyMetrics": {
      "revenue": {
        "current": 15750.00,
        "growth": 12.5
      },
      "orders": {
        "current": 89,
        "growth": 8.3
      },
      "averageOrderValue": 176.97
    },
    "businessMetrics": {
      "totalListings": 45,
      "activeListings": 38,
      "averageRating": 4.2
    },
    "recentOrders": [
      {
        "id": "order_id",
        "restaurant": "Green Restaurant",
        "amount": 250.00,
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### Restaurant Dashboard Overview
**GET** `/api/v1/restaurant-dashboard/overview`

**Headers**: `Authorization: Bearer {restaurant_token}`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "keyMetrics": {
      "totalSpent": {
        "current": 8750.00,
        "growth": 15.2
      },
      "totalOrders": {
        "current": 42,
        "growth": 12.0
      },
      "averageOrderValue": 208.33
    },
    "budgetStatus": {
      "monthlyBudget": 10000.00,
      "spent": 8750.00,
      "remaining": 1250.00,
      "percentageUsed": 88
    },
    "recentOrders": [
      {
        "id": "order_id",
        "vendor": "Fresh Farm Co",
        "amount": 450.00,
        "status": "confirmed",
        "createdAt": "2024-01-15T14:20:00.000Z"
      }
    ]
  }
}
```

## Error Responses

### Standard Error Format
All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Detailed error information", // Only in development
  "statusCode": 400
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **429**: Too Many Requests
- **500**: Internal Server Error

## Data Models

### User Model
```javascript
{
  "id": "string",
  "phone": "string", // With country code: +8801234567890
  "name": "string",
  "role": "admin|vendor|restaurantOwner|restaurantManager",
  "verificationStatus": "pending|approved|rejected", // Three-state system
  "createdAt": "ISO 8601 date string",
  "updatedAt": "ISO 8601 date string"
}
```

### Vendor Model
```javascript
{
  "id": "string",
  "businessName": "string",
  "verificationStatus": "pending|approved|rejected", // Three-state verification system
  "createdBy": {
    "name": "string",
    "email": "string"
  },
  "businessAddress": {
    "street": "string",
    "city": "string",
    "area": "string"
  },
  "verificationDate": "ISO 8601 date string", // Only when approved
  "adminNotes": "string", // Admin comments/reasons
  "createdAt": "ISO 8601 date string",
  "updatedAt": "ISO 8601 date string"
}
```

### Restaurant Model
```javascript
{
  "id": "string",
  "name": "string",
  "verificationStatus": "pending|approved|rejected", // Three-state verification system
  "createdBy": {
    "name": "string",
    "email": "string"
  },
  "managers": [{
    "name": "string",
    "email": "string"
  }],
  "address": {
    "street": "string",
    "city": "string",
    "area": "string"
  },
  "verificationDate": "ISO 8601 date string", // Only when approved
  "adminNotes": "string", // Admin comments/reasons
  "createdAt": "ISO 8601 date string",
  "updatedAt": "ISO 8601 date string"
}
```

### Product Model
```javascript
{
  "id": "string",
  "name": "string",
  "category": {
    "id": "string",
    "name": "string"
  },
  "description": "string",
  "unit": "string", // kg, piece, bunch, etc.
  "images": ["url1", "url2"],
  "createdAt": "ISO 8601 date string"
}
```

### Listing Model
```javascript
{
  "id": "string",
  "vendor": "User object",
  "product": "Product object",
  "pricing": [{
    "pricePerUnit": "number",
    "unit": "string"
  }],
  "availability": {
    "quantityAvailable": "number",
    "unit": "string"
  },
  "qualityGrade": "Premium|Standard|Economy",
  "images": ["url1", "url2"],
  "createdAt": "ISO 8601 date string",
  "updatedAt": "ISO 8601 date string"
}
```

### Order Model
```javascript
{
  "id": "string",
  "restaurant": "User object",
  "vendor": "User object",
  "items": [{
    "listing": "Listing object",
    "quantity": "number",
    "unitPrice": "number",
    "totalPrice": "number"
  }],
  "status": "pending|confirmed|prepared|delivered|cancelled",
  "totalAmount": "number",
  "deliveryAddress": {
    "street": "string",
    "city": "string",
    "area": "string"
  },
  "createdAt": "ISO 8601 date string",
  "updatedAt": "ISO 8601 date string"
}
```

## File Upload Specifications

### Image Upload Constraints
- **Supported Formats**: JPG, JPEG, PNG, WebP, GIF
- **Maximum File Size**: 1MB per file
- **Maximum Files**: 5 files per listing
- **Processing**: Auto-resize to max 1024x768
- **Storage**: Cloudinary with organized folder structure

### Upload Integration
File uploads are handled through multipart/form-data on listing creation and update endpoints. No separate upload endpoints exist.

---

## Quick Integration References

### Implementation Guides
- **Authentication Setup**: [Redux Toolkit Store Setup](./api-integration.md#redux-toolkit-store-setup)
- **Login Implementation**: [Login Component with Redux](./api-integration.md#login-component-with-redux)
- **Protected Routes**: [Protected Route Implementation](./api-integration.md#protected-route-implementation)
- **Admin Features**: [Admin Approval Management](./api-integration.md#admin-approval-management)
- **Vendor Features**: [Listing Management for Vendors](./api-integration.md#listing-management-for-vendors)
- **Error Handling**: [Error Handling](./api-integration.md#error-handling)
- **Performance**: [Performance Optimization](./api-integration.md#performance-optimization)

### Advanced Patterns
- **Caching**: [Cache Management](./api-integration.md#cache-management)
- **Optimistic Updates**: [Optimistic Updates](./api-integration.md#optimistic-updates)
- **Testing**: [RTK Query Testing](./api-integration.md#rtk-query-testing)

**Note**: This document provides endpoint specifications only. For Redux Toolkit implementation patterns, authentication setup, caching strategies, and code examples, refer to [api-integration.md](./api-integration.md).