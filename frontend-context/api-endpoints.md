# Aaroth Fresh API Endpoints Reference

Compact reference for all API endpoints in the Aaroth Fresh B2B marketplace backend.

## Configuration
- **Base URL**: `http://localhost:5000/api/v1`
- **Auth**: JWT Bearer tokens with phone-based authentication
- **Headers**: `Authorization: Bearer ${token}`, `Content-Type: application/json`

## Authentication Routes (`/api/v1/auth`)

### Login
```javascript
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "+8801234567890",
  "password": "userPassword"
}

// Success Response (200)
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "phone": "+8801234567890",
    "name": "User Name",
    "role": "vendor",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}

// Error Response (400/401)
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Register
```javascript
POST /api/v1/auth/register
Content-Type: application/json

{
  "phone": "+8801234567890",
  "password": "userPassword",
  "name": "User Name",
  "role": "vendor",
  // Additional fields based on role
  "businessName": "Vendor Business", // for vendors
  "restaurantName": "Restaurant Name" // for restaurant users
}

// Success Response (201)
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "phone": "+8801234567890",
    "name": "User Name",
    "role": "vendor",
    "isActive": true,
    "isApproved": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Logout
```javascript
POST /api/v1/auth/logout
Authorization: Bearer {token}

// Success Response (200)
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User Profile
```javascript
GET /api/v1/auth/me
Authorization: Bearer {token}

// Success Response (200)
{
  "success": true,
  "user": {
    "id": "user_id",
    "phone": "+8801234567890",
    "name": "User Name",
    "role": "vendor",
    "isActive": true,
    "isApproved": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    // Populated vendor/restaurant data based on role
    "vendor": {
      "businessName": "Fresh Produce Co",
      "businessAddress": {
        "street": "123 Market St",
        "city": "Dhaka",
        "area": "Dhanmondi",
        "postalCode": "1205"
      },
      "businessLicense": "BL123456"
    }
  }
}
```

### Update User Profile
```javascript
PUT /api/v1/auth/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  // Role-specific fields can be updated
  "businessName": "Updated Business Name", // for vendors
  "restaurantName": "Updated Restaurant Name" // for restaurant users
}

// Success Response (200)
{
  "success": true,
  "user": {
    // Updated user object
  }
}
```

### Change Password
```javascript
PUT /api/v1/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123"
}

// Success Response (200)
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Create Manager Account (Restaurant Owner or Admin)
```javascript
POST /api/v1/auth/create-manager
Authorization: Bearer {restaurant_owner_token or admin_token}
Content-Type: application/json

{
  "phone": "+8801234567891",
  "password": "managerPassword",
  "name": "Manager Name"
}

// Success Response (201)
{
  "success": true,
  "user": {
    "id": "manager_id",
    "phone": "+8801234567891",
    "name": "Manager Name",
    "role": "restaurantManager",
    "isActive": true,
    "restaurantId": "restaurant_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}

// Note: Restaurant owners can only create managers for their own restaurant
// Admins can create managers for any restaurant using /admin/restaurant-managers
```

### Get Restaurant Managers (Restaurant Owner Only)
```javascript
GET /api/v1/auth/managers
Authorization: Bearer {restaurant_owner_token}

// Success Response (200)
{
  "success": true,
  "managers": [
    {
      "id": "manager_id",
      "name": "Manager Name",
      "phone": "+8801234567891",
      "role": "restaurantManager",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Deactivate Manager (Restaurant Owner Only)
```javascript
PUT /api/v1/auth/managers/{managerId}/deactivate
Authorization: Bearer {restaurant_owner_token}

{
  "isActive": false
}

// Success Response (200)
{
  "success": true,
  "message": "Manager deactivated successfully"
}
```

## Admin Routes (`/api/v1/admin`)

### User Management

#### Get All Users
```javascript
GET /admin/users?page=1&limit=10&role=vendor&isActive=true
// Response: { success: true, data: { users: [...], pagination: {...} } }
```

### Enhanced Admin Management

#### Unified Approval System
```javascript
// Get all pending approvals
GET /admin/approvals
// Response: { success: true, data: { vendors: {...}, restaurants: {...}, summary: {...} } }

// Approve vendor
PUT /admin/approvals/vendor/{id}/approve
{ "approvalNotes": "All documents verified" }

// Reject vendor
PUT /admin/approvals/vendor/{id}/reject
{ "rejectionReason": "Missing business license" }

// Approve restaurant
PUT /admin/approvals/restaurant/{id}/approve
{ "approvalNotes": "Trade license verified" }

// Reject restaurant
PUT /admin/approvals/restaurant/{id}/reject
{ "rejectionReason": "Invalid documentation" }
```

#### Enhanced Dashboard & Analytics
```javascript
// Dashboard overview with approval metrics
GET /admin/dashboard/overview
// Response includes: keyMetrics, approvalMetrics, systemHealth, recentActivity

// Advanced analytics with caching
GET /admin/analytics/overview?period=month&useCache=true
GET /admin/analytics/sales?startDate=2024-01-01&endDate=2024-01-31
GET /admin/analytics/users?period=quarter
GET /admin/analytics/products?sort=revenue&limit=20
DELETE /admin/analytics/cache // Clear cache
```

#### System Settings Management
```javascript
GET /admin/settings // All settings
GET /admin/settings/{category} // Category-specific
PUT /admin/settings/key/{key} // Update setting
{ "value": "new_value", "changeReason": "Updated for compliance" }
POST /admin/settings/reset // Reset to defaults
GET /admin/settings/key/{key}/history // Change history
```

#### Content Moderation & Security
```javascript
// Flag listing for moderation
PUT /admin/listings/{id}/flag
{ "flagReason": "inappropriate_content", "moderationNotes": "Contains spam" }

// Get flagged content
GET /admin/listings/flagged?status=pending&page=1

// Safe deletion with dependency checking
DELETE /admin/products/{id}/safe-delete
{ "reason": "Product discontinued" }

// Enhanced user management
PUT /admin/vendors/{id}/deactivate
{ "reason": "Policy violation", "adminNotes": "Multiple complaints" }
PUT /admin/restaurants/{id}/toggle-status
{ "isActive": false, "reason": "Temporary suspension" }
```

### Product Management
```javascript
// Get products with enhanced admin status
GET /admin/products?page=1&limit=20&adminStatus=active&search=tomato
// Response includes adminStatus: 'active'|'inactive'|'discontinued'

// Create product
POST /admin/products
{ "name": "Fresh Carrot", "category": "category_id", "description": "...", "unit": "kg" }

// Update product status
PUT /admin/products/{id}/status
{ "adminStatus": "discontinued", "reason": "Seasonal unavailability" }
```

### Category Management
```javascript
GET /admin/categories // List all categories
POST /admin/categories // Create category
{ "name": "Fruits", "description": "Fresh fruits category" }
PUT /admin/categories/{id} // Update category
DELETE /admin/categories/{id}/safe-delete // Safe delete with dependency check
```

### Restaurant Management

### Restaurant & Vendor Management
```javascript
// Create restaurant owner
POST /admin/restaurant-owners
{ "name": "John Doe", "phone": "+8801234567890", "password": "...", "restaurantName": "...", "address": {...} }

// Create restaurant manager
POST /admin/restaurant-managers  
{ "name": "Jane Smith", "phone": "+8801234567891", "password": "...", "restaurantId": "restaurant_id" }

// Enhanced restaurant management
GET /admin/restaurants?approvalStatus=pending&page=1
PUT /admin/restaurants/{id}/toggle-status
{ "isActive": false, "reason": "Compliance review" }

// Enhanced vendor management
GET /admin/vendors?approvalStatus=approved&isActive=true
PUT /admin/vendors/{id}/deactivate
{ "reason": "Policy violation", "adminNotes": "Multiple complaints received" }
```

## Listings Routes (`/api/v1/listings`)

### Get All Listings
```javascript
GET /api/v1/listings
Authorization: Bearer {token}

// Query parameters for filtering
?category=vegetables&minPrice=10&maxPrice=100&vendor=vendorId&available=true&page=1&limit=20

// Response
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing_id",
        "vendor": {
          "id": "vendor_id",
          "name": "Vendor Name",
          "businessName": "Business Name"
        },
        "product": {
          "id": "product_id",
          "name": "Product Name",
          "category": "vegetables"
        },
        "price": 25.50,
        "unit": "kg",
        "availableQuantity": 100,
        "isAvailable": true,
        "images": ["url1", "url2"],
        "description": "Product description",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### Get Vendor's Own Listings
```javascript
GET /api/v1/listings/vendor
Authorization: Bearer {vendor_token}

// Query parameters
?page=1&limit=20&isAvailable=true&search=tomato&sortBy=createdAt&sortOrder=desc

// Success Response (200)
{
  "success": true,
  "data": {
    "listings": [...],
    "pagination": {...},
    "stats": {
      "totalListings": 150,
      "activeListings": 120,
      "totalOrders": 450,
      "averageRating": 4.3
    }
  }
}
```

### Create Listing (Vendor Only)
```javascript
POST /api/v1/listings
Authorization: Bearer {vendor_token}
Content-Type: multipart/form-data

// Form data structure
{
  "productId": "product_id",
  "pricing": [
    {
      "pricePerUnit": 25.50,
      "unit": "kg",
      "bulkDiscount": {
        "minQuantity": 10,
        "discountPercentage": 5
      }
    }
  ],
  "qualityGrade": "Premium", // Premium, Standard, Economy
  "availability": {
    "quantityAvailable": 100,
    "harvestDate": "2024-01-01",
    "expiryDate": "2024-01-07"
  },
  "description": "Farm-fresh organic tomatoes harvested this morning",
  "images": [Image files], // Max 5 files, handled by middleware
  "deliveryOptions": [
    {
      "type": "pickup",
      "cost": 0,
      "timeRange": "30 minutes"
    },
    {
      "type": "delivery",
      "cost": 50,
      "timeRange": "2-4 hours",
      "areas": ["Dhanmondi", "Gulshan", "Banani"]
    }
  ],
  "minimumOrderValue": 250,
  "leadTime": "2-4 hours",
  "discount": {
    "type": "percentage",
    "value": 10,
    "validUntil": "2024-01-15"
  },
  "certifications": ["organic", "fair-trade"]
}

// Success Response (201)
{
  "success": true,
  "data": {
    "id": "new_listing_id",
    "vendorId": "vendor_id",
    "productId": {
      "id": "product_id",
      "name": "Fresh Tomato",
      "category": "Vegetables"
    },
    "pricing": [
      {
        "pricePerUnit": 25.50,
        "unit": "kg",
        "bulkDiscount": {
          "minQuantity": 10,
          "discountPercentage": 5
        }
      }
    ],
    "availability": {
      "quantityAvailable": 100,
      "harvestDate": "2024-01-01",
      "expiryDate": "2024-01-07"
    },
    "images": [
      {"url": "https://cloudinary.../image1.jpg"},
      {"url": "https://cloudinary.../image2.jpg"}
    ],
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Listing (Vendor Only)
```javascript
PUT /api/v1/listings/{listingId}
Authorization: Bearer {vendor_token}
Content-Type: multipart/form-data

// Form data structure - all fields optional
{
  "pricing": [
    {
      "pricePerUnit": 28.00,
      "unit": "kg",
      "bulkDiscount": {
        "minQuantity": 15,
        "discountPercentage": 7
      }
    }
  ],
  "availability": {
    "quantityAvailable": 80,
    "harvestDate": "2024-01-02",
    "expiryDate": "2024-01-09"
  },
  "description": "Updated: Premium organic tomatoes with extended freshness",
  "images": [New Image files], // Will replace existing images
  "status": "active", // active, inactive, out_of_stock
  "discount": {
    "type": "percentage",
    "value": 15,
    "validUntil": "2024-01-20"
  }
}

// Success Response (200)
{
  "success": true,
  "data": {
    "id": "listing_id",
    "pricing": [
      {
        "pricePerUnit": 28.00,
        "unit": "kg",
        "bulkDiscount": {
          "minQuantity": 15,
          "discountPercentage": 7
        }
      }
    ],
    "availability": {
      "quantityAvailable": 80,
      "harvestDate": "2024-01-02",
      "expiryDate": "2024-01-09"
    },
    "status": "active",
    "updatedAt": "2024-01-02T12:00:00.000Z"
  }
}
```

### Delete Listing (Vendor Only)
```javascript
DELETE /api/v1/listings/{listingId}
Authorization: Bearer {vendor_token}

// Success Response (200)
{
  "success": true,
  "message": "Listing deleted successfully"
}

// Error Response (400) - Has active orders
{
  "success": false,
  "message": "Cannot delete listing with active orders"
}
```

## Orders Routes (`/api/v1/orders`)

### Get All Orders
```javascript
GET /api/v1/orders
Authorization: Bearer {token}

// Query parameters
?page=1&limit=20&status=pending&vendor=vendorId&restaurant=restaurantId

// Success Response (200)
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_id",
        "restaurant": {
          "id": "restaurant_id",
          "name": "Restaurant Name"
        },
        "items": [
          {
            "listing": {
              "id": "listing_id",
              "product": "Product Name",
              "vendor": "Vendor Name"
            },
            "quantity": 5,
            "unitPrice": 25.50,
            "totalPrice": 127.50
          }
        ],
        "status": "pending",
        "totalAmount": 127.50,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### Create Order (Restaurant Only)
```javascript
POST /api/v1/orders
Authorization: Bearer {restaurant_token}
Content-Type: application/json

{
  "items": [
    {
      "listing": "listing_id",
      "quantity": 5,
      "unitPrice": 25.50
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Dhaka",
    "area": "Dhanmondi",
    "postalCode": "1205"
  },
  "notes": "Deliver in morning"
}

// Success Response (201)
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": "new_order_id",
    "status": "pending",
    "totalAmount": 127.50,
    "items": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Update Order Status
```javascript
PUT /api/v1/orders/{orderId}/status
Authorization: Bearer {token}

{
  "status": "confirmed", // pending, confirmed, prepared, delivered, cancelled
  "notes": "Order confirmed and in preparation"
}

// Success Response (200)
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

## Public Routes (`/api/v1/public`)

### Get All Products (Public)
```javascript
GET /api/v1/public/products

// Query parameters
?page=1&limit=20&category=vegetables&search=tomato&isActive=true

// Success Response (200)
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product_id",
        "name": "Fresh Tomato",
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
    "pagination": {...}
  }
}
```

### Get Single Product (Public)
```javascript
GET /api/v1/public/products/{productId}

// Success Response (200)
{
  "success": true,
  "product": {
    "id": "product_id",
    "name": "Fresh Tomato",
    "category": {...},
    "description": "Fresh red tomatoes",
    "unit": "kg",
    "images": ["url1", "url2"],
    "activeListingsCount": 5,
    "priceRange": {
      "min": 20.00,
      "max": 30.00,
      "average": 25.50
    },
    "availableVendors": 8,
    "totalStock": 500,
    "listings": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get All Categories (Public)
```javascript
GET /api/v1/public/categories

// Success Response (200)
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

### Get Featured Listings (Public)
```javascript
GET /api/v1/public/featured-listings

// Query parameters
?page=1&limit=10

// Success Response (200)
{
  "success": true,
  "count": 5,
  "total": 5,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "id": "listing_id",
      "productId": {
        "id": "product_id",
        "name": "Fresh Tomato",
        "category": {
          "id": "category_id",
          "name": "Vegetables"
        },
        "description": "Fresh red tomatoes",
        "images": ["url1", "url2"]
      },
      "vendorId": {
        "id": "vendor_id",
        "businessName": "Fresh Produce Co",
        "rating": 4.5,
        "isVerified": true
      },
      "pricing": [{
        "unit": "kg",
        "pricePerUnit": 25.50,
        "minimumQuantity": 1
      }],
      "qualityGrade": "Premium",
      "availability": {
        "quantityAvailable": 100,
        "unit": "kg",
        "isInSeason": true
      },
      "images": ["listing_url1", "listing_url2"],
      "rating": {
        "average": 4.2,
        "count": 15
      },
      "featured": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## File Upload Integration

### File Upload with Listings
File uploads are integrated directly with listing creation and updates. There are no separate upload endpoints.

```javascript
// File upload happens during listing creation
POST /api/v1/listings
Authorization: Bearer {vendor_token}
Content-Type: multipart/form-data

// Form data includes both listing data and images
productId: "product_id"
pricing[0][pricePerUnit]: "25.50"
pricing[0][unit]: "kg"
availability[quantityAvailable]: "100"
description: "Fresh organic tomatoes"
images: [Image file 1, Image file 2, Image file 3] // Max 5 images

// Success Response (201)
{
  "success": true,
  "message": "Listing created successfully",
  "listing": {
    "id": "new_listing_id",
    "product": {...},
    "pricing": [...],
    "images": [
      "https://res.cloudinary.com/your-cloud/image/upload/v123456789/listings/abc123.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v123456789/listings/def456.jpg"
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### File Upload Constraints
- **Images Only**: JPG, JPEG, PNG, WebP, GIF
- **Maximum File Size**: 1MB per file
- **Maximum Files**: 5 files per listing
- **Automatic Processing**: Images resized to max 1024x768
- **Storage**: Cloudinary with organized folders

## Vendor Dashboard Routes (`/api/v1/vendor-dashboard`)

### Dashboard Overview
```javascript
GET /api/v1/vendor-dashboard/overview
Authorization: Bearer {vendor_token}

// Query parameters
?period=month&startDate=2024-01-01&endDate=2024-01-31

// Success Response (200)
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z",
      "label": "month"
    },
    "keyMetrics": {
      "revenue": {
        "current": 15750.00,
        "growth": 12.5
      },
      "orders": {
        "current": 89,
        "growth": 8.3
      },
      "averageOrderValue": 176.97,
      "totalItems": 342
    },
    "businessMetrics": {
      "totalListings": 45,
      "activeListings": 38,
      "totalProducts": 25,
      "averageRating": 4.2,
      "listingActivationRate": 84
    },
    "recentActivity": {
      "recentOrders": [
        {
          "id": "order_id",
          "orderNumber": "ORD-2024-001",
          "restaurant": "Green Garden Restaurant",
          "amount": 250.00,
          "status": "pending",
          "items": 3,
          "createdAt": "2024-01-15T10:30:00.000Z"
        }
      ]
    }
  }
}
```

### Revenue Analytics
```javascript
GET /api/v1/vendor-dashboard/revenue
Authorization: Bearer {vendor_token}

// Query parameters
?period=month&startDate=2024-01-01&endDate=2024-01-31

// Success Response (200)
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 15750.00,
      "totalOrders": 89,
      "averageDailyRevenue": 508.06
    },
    "dailyTrends": [
      {
        "date": "2024-01-01",
        "revenue": 480.00,
        "orders": 3
      }
    ],
    "revenueByStatus": {
      "delivered": {
        "revenue": 14250.00,
        "count": 78,
        "percentage": 90
      },
      "pending": {
        "revenue": 1500.00,
        "count": 11,
        "percentage": 10
      }
    },
    "revenueByCategory": [
      {
        "category": "Vegetables",
        "revenue": 9450.00,
        "quantity": 156
      }
    ],
    "monthlyTrends": [
      {
        "month": "2024-01",
        "revenue": 15750.00,
        "orders": 89
      }
    ]
  }
}
```

### Product Performance
```javascript
GET /api/v1/vendor-dashboard/products
Authorization: Bearer {vendor_token}

// Query parameters
?period=month&sort=revenue&limit=20

// Success Response (200)
{
  "success": true,
  "data": {
    "topProducts": [
      {
        "productId": "product_id",
        "name": "Organic Tomatoes",
        "category": "category_id",
        "orders": 25,
        "quantitySold": 150,
        "revenue": 3750.00,
        "averageUnitPrice": 25.00,
        "rating": 4.5,
        "views": 342,
        "status": "active"
      }
    ],
    "categoryPerformance": [
      {
        "categoryId": "category_id",
        "name": "Vegetables",
        "orders": 45,
        "quantitySold": 280,
        "revenue": 7000.00,
        "uniqueProducts": 8
      }
    ],
    "summary": {
      "totalProducts": 25,
      "totalRevenue": 15750.00,
      "totalQuantitySold": 567,
      "averageRating": 4.2
    }
  }
}
```

### Inventory Status
```javascript
GET /api/v1/vendor-dashboard/inventory
Authorization: Bearer {vendor_token}

// Success Response (200)
{
  "success": true,
  "data": {
    "summary": {
      "totalListings": 45,
      "activeListings": 38,
      "lowStockItems": 5,
      "outOfStockItems": 2,
      "totalValue": 12500.00
    },
    "stockAlerts": {
      "lowStock": [
        {
          "listingId": "listing_id",
          "productName": "Fresh Spinach",
          "currentStock": 8,
          "unit": "kg",
          "status": "low_stock"
        }
      ],
      "outOfStock": [
        {
          "listingId": "listing_id",
          "productName": "Organic Carrots",
          "currentStock": 0,
          "unit": "kg",
          "status": "out_of_stock"
        }
      ]
    },
    "inventoryList": [
      {
        "listingId": "listing_id",
        "productName": "Fresh Tomatoes",
        "category": "Vegetables",
        "currentStock": 50,
        "unit": "kg",
        "pricePerUnit": 25.00,
        "status": "active",
        "stockValue": 1250.00,
        "lastUpdated": "2024-01-15T08:00:00.000Z"
      }
    ]
  }
}
```

### Order Management
```javascript
GET /api/v1/vendor-dashboard/order-management
Authorization: Bearer {vendor_token}

// Query parameters
?status=pending&page=1&limit=20

// Success Response (200)
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_id",
        "orderNumber": "ORD-2024-001",
        "restaurant": {
          "id": "restaurant_id",
          "name": "Green Garden Restaurant",
          "email": "restaurant@example.com",
          "phone": "+8801234567890",
          "address": {
            "street": "123 Main St",
            "city": "Dhaka",
            "area": "Dhanmondi"
          }
        },
        "items": [
          {
            "productName": "Fresh Tomatoes",
            "quantity": 10,
            "unit": "kg",
            "unitPrice": 25.00,
            "totalPrice": 250.00
          }
        ],
        "totalAmount": 250.00,
        "status": "pending",
        "orderDate": "2024-01-15T10:30:00.000Z",
        "deliveryDate": null,
        "notes": "Deliver fresh in morning"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalOrders": 89,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "statusSummary": {
      "all": 89,
      "pending": 11,
      "confirmed": 15,
      "delivered": 63
    }
  }
}
```

### Financial Summary
```javascript
GET /api/v1/vendor-dashboard/financial-summary
Authorization: Bearer {vendor_token}

// Query parameters
?period=month

// Success Response (200)
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    },
    "revenue": {
      "gross": 15750.00,
      "delivered": 14250.00,
      "net": 13537.50,
      "pendingPayment": 1500.00
    },
    "orders": {
      "total": 89,
      "delivered": 78,
      "pending": 11
    },
    "metrics": {
      "averageOrderValue": 176.97,
      "fulfillmentRate": 88,
      "estimatedCommission": 712.50,
      "commissionRate": 5
    },
    "paymentBreakdown": {
      "paid": {
        "count": 65,
        "amount": 11875.00
      },
      "pending": {
        "count": 24,
        "amount": 3875.00
      }
    }
  }
}
```

### Notifications
```javascript
GET /api/v1/vendor-dashboard/notifications
Authorization: Bearer {vendor_token}

// Query parameters
?type=inventory&unreadOnly=true&page=1&limit=20

// Success Response (200)
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "type": "inventory",
        "title": "Low Stock Alert",
        "message": "Fresh Spinach is running low (8 kg remaining)",
        "priority": "high",
        "isRead": false,
        "isActionRequired": true,
        "actionUrl": "/vendor-dashboard/inventory?listingId=listing_id",
        "actionText": "Update Stock",
        "relatedEntity": {
          "entityType": "listing",
          "entityId": "listing_id",
          "entityData": {
            "productName": "Fresh Spinach",
            "currentStock": 8,
            "unit": "kg"
          }
        },
        "age": 2,
        "createdAt": "2024-01-15T08:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalNotifications": 45,
      "hasNextPage": true
    },
    "summary": {
      "total": 45,
      "unread": 12,
      "urgent": 3,
      "actionRequired": 8
    }
  }
}
```

## Restaurant Dashboard Routes (`/api/v1/restaurant-dashboard`)

### Dashboard Overview
```javascript
GET /api/v1/restaurant-dashboard/overview
Authorization: Bearer {restaurant_token}

// Query parameters
?period=month&startDate=2024-01-01&endDate=2024-01-31

// Success Response (200)
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z",
      "label": "month"
    },
    "keyMetrics": {
      "totalSpent": {
        "current": 8750.00,
        "growth": 15.2
      },
      "totalOrders": {
        "current": 42,
        "growth": 12.0
      },
      "averageOrderValue": 208.33,
      "totalItems": 156
    },
    "businessMetrics": {
      "activeVendors": 8,
      "totalProducts": 45,
      "uniqueVendorsThisPeriod": 6,
      "pendingOrders": 3,
      "avgVendorsPerOrder": 1.4
    },
    "budgetStatus": {
      "monthlyBudget": 10000.00,
      "spent": 8750.00,
      "remaining": 1250.00,
      "percentageUsed": 88
    },
    "recentActivity": {
      "recentOrders": [
        {
          "id": "order_id",
          "orderNumber": "ORD-2024-042",
          "vendor": "Fresh Produce Co",
          "amount": 450.00,
          "status": "confirmed",
          "items": 3,
          "createdAt": "2024-01-15T14:20:00.000Z"
        }
      ]
    }
  }
}
```

### Spending Analytics
```javascript
GET /api/v1/restaurant-dashboard/spending
Authorization: Bearer {restaurant_token}

// Success Response (200)
{
  "success": true,
  "data": {
    "summary": {
      "totalSpent": 8750.00,
      "totalOrders": 42,
      "averageDailySpending": 282.26,
      "topVendorSpending": 3200.00
    },
    "dailyTrends": [
      {
        "date": "2024-01-01",
        "spent": 320.00,
        "orders": 2
      }
    ],
    "spendingByVendor": [
      {
        "vendorId": "vendor_id",
        "name": "Fresh Produce Co",
        "spent": 3200.00,
        "orders": 15,
        "percentage": 37
      }
    ],
    "spendingByCategory": [
      {
        "categoryId": "category_id",
        "name": "Vegetables",
        "spent": 5250.00,
        "quantity": 210,
        "orders": 25,
        "percentage": 60
      }
    ],
    "monthlyTrends": [
      {
        "month": "2024-01",
        "spent": 8750.00,
        "orders": 42
      }
    ]
  }
}
```

### Vendor Insights
```javascript
GET /api/v1/restaurant-dashboard/vendors
Authorization: Bearer {restaurant_token}

// Query parameters
?sort=spending&limit=20&period=month

// Success Response (200)
{
  "success": true,
  "data": {
    "summary": {
      "totalVendors": 8,
      "totalSpentAllVendors": 8750.00,
      "averageSpentPerVendor": 1093.75,
      "averageReliabilityScore": 92.5,
      "topVendorSpending": 3200.00
    },
    "topVendors": [
      {
        "vendorId": "vendor_id",
        "businessName": "Fresh Produce Co",
        "contactInfo": {
          "email": "vendor@freshproduce.com",
          "phone": "+8801234567890",
          "address": {
            "street": "123 Farm Road",
            "city": "Dhaka"
          }
        },
        "performance": {
          "totalOrders": 15,
          "totalSpent": 3200.00,
          "averageOrderValue": 213.33,
          "uniqueProducts": 12
        },
        "reliability": {
          "onTimeDeliveryRate": 95.0,
          "completionRate": 100.0,
          "cancellationRate": 0.0
        },
        "relationship": {
          "firstOrderDate": "2023-10-15T00:00:00.000Z",
          "lastOrderDate": "2024-01-14T00:00:00.000Z",
          "daysSinceLastOrder": 1,
          "relationshipDuration": 92,
          "loyaltyScore": 87.5
        }
      }
    ],
    "vendorCategories": {
      "premium": 2,
      "reliable": 6,
      "frequent": 4,
      "occasional": 2
    }
  }
}
```

### Budget Tracking
```javascript
GET /api/v1/restaurant-dashboard/budget
Authorization: Bearer {restaurant_token}

// Query parameters
?period=month&category=category_id

// Success Response (200)
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z",
      "label": "month"
    },
    "currentBudget": {
      "limit": 10000.00,
      "spent": 8750.00,
      "remaining": 1250.00,
      "percentageUsed": 88,
      "isOverBudget": false
    },
    "monthlyOverview": {
      "limit": 10000.00,
      "spent": 8750.00,
      "remaining": 1250.00,
      "percentageUsed": 88
    },
    "categoryBreakdown": [
      {
        "categoryId": "category_id",
        "name": "Vegetables",
        "spent": 5250.00,
        "limit": 4000.00,
        "percentageUsed": 131,
        "orders": 25,
        "isOverBudget": true
      }
    ],
    "spendingTrend": [
      {
        "date": "2024-01-01",
        "spent": 320.00,
        "cumulativeSpent": 320.00
      }
    ],
    "alerts": [
      {
        "type": "category_warning",
        "message": "Vegetables category is 131% of budget",
        "category": "Vegetables",
        "severity": "high"
      }
    ],
    "recommendations": [
      {
        "type": "urgent",
        "message": "Consider reducing orders or finding cost-effective alternatives",
        "action": "budget_control"
      }
    ]
  }
}
```

### Order History
```javascript
GET /api/v1/restaurant-dashboard/order-history
Authorization: Bearer {restaurant_token}

// Query parameters
?period=month&vendor=vendor_id&status=delivered&page=1&limit=20

// Success Response (200)
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_id",
        "orderNumber": "ORD-2024-042",
        "vendor": {
          "id": "vendor_id",
          "name": "Fresh Produce Co",
          "email": "vendor@freshproduce.com",
          "phone": "+8801234567890"
        },
        "items": [
          {
            "productId": "product_id",
            "productName": "Fresh Tomatoes",
            "quantity": 10,
            "unit": "kg",
            "unitPrice": 25.00,
            "totalPrice": 250.00
          }
        ],
        "totalAmount": 450.00,
        "status": "delivered",
        "orderDate": "2024-01-14T10:00:00.000Z",
        "expectedDeliveryDate": "2024-01-15T08:00:00.000Z",
        "deliveryDate": "2024-01-15T07:30:00.000Z",
        "placedBy": {
          "id": "user_id",
          "name": "Restaurant Manager"
        },
        "notes": "Fresh vegetables for lunch prep",
        "paymentStatus": "paid"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalOrders": 42,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "summary": {
      "totalOrders": 42,
      "totalSpent": 8750.00,
      "averageOrderValue": 208.33,
      "statusBreakdown": {
        "delivered": {
          "count": 35,
          "totalAmount": 7300.00
        },
        "pending": {
          "count": 3,
          "totalAmount": 650.00
        },
        "confirmed": {
          "count": 4,
          "totalAmount": 800.00
        }
      }
    }
  }
}
```

### Favorite Vendors
```javascript
GET /api/v1/restaurant-dashboard/favorite-vendors
Authorization: Bearer {restaurant_token}

// Query parameters
?limit=10

// Success Response (200)
{
  "success": true,
  "data": {
    "favoriteVendors": [
      {
        "rank": 1,
        "vendorId": "vendor_id",
        "businessName": "Fresh Produce Co",
        "contactInfo": {
          "email": "vendor@freshproduce.com",
          "phone": "+8801234567890",
          "address": {
            "street": "123 Farm Road",
            "city": "Dhaka"
          }
        },
        "relationship": {
          "totalOrders": 15,
          "totalSpent": 3200.00,
          "averageOrderValue": 213.33,
          "lastOrderDate": "2024-01-14T00:00:00.000Z",
          "favoriteScore": 89.5
        },
        "tags": ["frequent", "high-value", "recent"]
      }
    ],
    "frequentProducts": [
      {
        "rank": 1,
        "productId": "product_id",
        "name": "Fresh Tomatoes",
        "category": "category_id",
        "usage": {
          "totalQuantity": 150,
          "totalOrders": 12,
          "totalSpent": 3750.00,
          "lastOrderDate": "2024-01-14T00:00:00.000Z",
          "availableVendors": 3
        },
        "reorderSuggestion": {
          "recommended": true,
          "urgency": "medium",
          "estimatedQuantity": 12.5
        }
      }
    ],
    "trendingVendors": [
      {
        "vendorId": "vendor_id",
        "businessName": "Organic Farms Ltd",
        "recentOrders": 5,
        "trend": "increasing",
        "firstRecentOrder": "2024-01-01T00:00:00.000Z"
      }
    ],
    "quickActions": {
      "repeatLastOrder": true,
      "bulkReorder": true,
      "exploreNewVendors": false
    }
  }
}
```

### Reorder Suggestions
```javascript
GET /api/v1/restaurant-dashboard/reorder-suggestions
Authorization: Bearer {restaurant_token}

// Query parameters
?limit=10&category=category_id

// Success Response (200)
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "productId": "product_id",
        "productName": "Fresh Tomatoes",
        "category": "Vegetables",
        "lastOrderDate": "2024-01-10T00:00:00.000Z",
        "daysSinceLastOrder": 5,
        "averageOrderInterval": 7,
        "recommendedQuantity": 15,
        "estimatedCost": 375.00,
        "urgency": "high",
        "availableVendors": [
          {
            "vendorId": "vendor_id",
            "businessName": "Fresh Produce Co",
            "pricePerUnit": 25.00,
            "rating": 4.5,
            "lastUsed": true
          }
        ],
        "consumptionPattern": {
          "weeklyAverage": 12.5,
          "monthlyAverage": 50.0,
          "seasonalTrend": "stable"
        }
      }
    ],
    "summary": {
      "totalSuggestions": 8,
      "highPriority": 3,
      "estimatedTotalCost": 1250.00,
      "potentialSavings": 125.00
    }
  }
}
```

## System Health (`/api/v1/health`)

### Health Check
```javascript
GET /api/v1/health

// Success Response (200)
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "cloudinary": "connected",
    "email": "connected"
  },
  "version": "1.0.0",
  "uptime": "5 days, 14 hours, 30 minutes"
}
```

## Error Handling

### Standard Error Response Format
```javascript
// All errors follow this structure
{
  "success": false,
  "message": "Error message for user",
  "error": "Detailed error for debugging", // only in development
  "statusCode": 400
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

## Data Models

### User Model Structure
```javascript
const user = {
  id: 'string',
  phone: 'string', // with country code +8801234567890
  name: 'string',
  role: 'admin' | 'vendor' | 'restaurantOwner' | 'restaurantManager',
  isActive: true,
  isApproved: true, // for vendors
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  
  // Role-specific fields (populated based on role)
  vendor: {
    businessName: 'string',
    businessAddress: {
      street: 'string',
      city: 'string',
      area: 'string',
      postalCode: 'string'
    },
    businessLicense: 'string' // optional
  },
  
  restaurant: {
    restaurantName: 'string',
    restaurantAddress: {
      street: 'string',
      city: 'string',
      area: 'string',
      postalCode: 'string'
    },
    restaurantType: 'string'
  }
};
```

### Product & Listing Models
```javascript
// Product object structure
const product = {
  id: 'string',
  name: 'string',
  category: {
    id: 'string',
    name: 'string'
  },
  description: 'string',
  unit: 'string', // kg, piece, bunch, etc.
  images: ['url1', 'url2'],
  createdAt: '2024-01-01T00:00:00.000Z'
};

// Listing object structure
const listing = {
  id: 'string',
  vendor: user, // User object
  product: product, // Product object
  price: 25.50,
  availableQuantity: 100,
  isAvailable: true,
  description: 'string',
  images: ['url1', 'url2'],
  qualityGrade: 'Premium', // Premium, Standard, Economy
  harvestDate: '2024-01-01',
  deliveryOptions: [
    {
      type: 'pickup',
      cost: 0,
      timeRange: '30 minutes'
    }
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};
```

### Order Model
```javascript
// Order object structure
const order = {
  id: 'string',
  restaurant: user, // User object
  items: [
    {
      listing: listing, // Listing object
      quantity: 5,
      unitPrice: 25.50,
      totalPrice: 127.50
    }
  ],
  status: 'pending', // 'pending' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled'
  totalAmount: 127.50,
  deliveryAddress: {
    street: '123 Main St',
    city: 'Dhaka',
    area: 'Dhanmondi',
    postalCode: '1205'
  },
  notes: 'string',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};
```

## Migration Notes for Frontend Teams

### 🚨 API Migration Notice

**Legacy verification endpoints removed** - Use new unified approval system:

#### Removed:
- ❌ `PUT /admin/vendors/:id/verify`
- ❌ `PUT /admin/restaurants/:id/verify`
- ❌ `PUT /admin/users/:id/approve`

#### Use Instead:
- ✅ `GET /admin/approvals` - Unified pending approvals
- ✅ `PUT /admin/approvals/vendor/:id/approve` - Approve with notes
- ✅ `PUT /admin/approvals/vendor/:id/reject` - Reject with reason
- ✅ `PUT /admin/approvals/restaurant/:id/approve` - Approve with notes
- ✅ `PUT /admin/approvals/restaurant/:id/reject` - Reject with reason

### Migration Guide

#### Before (Legacy - No longer works):
```javascript
// ❌ This will return 404 - endpoint removed
PUT /api/v1/admin/vendors/123/verify
{
  "isVerified": true
}
```

#### After (New Comprehensive System):
```javascript
// ✅ Use this instead
PUT /api/v1/admin/approvals/vendor/123/approve
{
  "approvalNotes": "All documents verified successfully"
}
```

### Enhanced Features in New System:
- **Audit Trail**: Complete tracking of who approved/rejected and when
- **Approval Notes**: Contextual information for approvals
- **Rejection Reasons**: Required detailed reasons for rejections
- **Unified Management**: Single endpoint to manage all pending approvals
- **Status Tracking**: Enhanced status fields (`pending`, `approved`, `rejected`)
- **Analytics Integration**: Approval metrics in admin dashboard

### Enhanced Data Models

#### User Model (Enhanced)
```javascript
{
  // Standard fields + enhanced approval tracking
  "approvalStatus": "pending|approved|rejected",
  "approvalDate": "2024-01-15T10:30:00.000Z",
  "approvedBy": "admin_user_id",
  "rejectionReason": "Detailed reason if rejected",
  "adminNotes": "Admin notes",
  "isDeleted": false,
  "lastModifiedBy": "admin_user_id"
}
```

#### Product/Listing Models (Enhanced)
```javascript
// Products: adminStatus: "active|inactive|discontinued"
// Listings: isFlagged, flagReason, moderatedBy, moderationNotes
// All models: isDeleted, deletedAt, deletedBy for soft delete
```

### Frontend Implementation Notes:
1. **Update API calls** to use new approval endpoints
2. **Handle approval status** in UI components (`pending`, `approved`, `rejected`)
3. **Display approval/rejection reasons** in admin interfaces
4. **Use unified approvals endpoint** for dashboard overview
5. **Implement proper error handling** for the new response formats
6. **Add approval workflow UI** for admin dashboard
7. **Display audit trail information** (who approved, when, notes)
8. **Handle soft delete status** in listing and product displays
9. **Implement flagging system** for content moderation
10. **Add analytics integration** for approval metrics
11. **Show dependency warnings** for delete operations
12. **Implement settings management UI** for system configuration
```