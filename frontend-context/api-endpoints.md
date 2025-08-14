# Aaroth Fresh API Endpoints Reference

This document provides a complete reference of all API endpoints for the Aaroth Fresh B2B marketplace backend.

## Base Configuration

### Server Details
- **Base URL**: `http://localhost:5000` (development)
- **API Prefix**: `/api/v1`
- **CORS**: Enabled for frontend domains
- **Authentication**: JWT Bearer tokens
- **Content Type**: `application/json`

### Authentication Headers
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

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
GET /api/v1/admin/users
Authorization: Bearer {admin_token}

// Query parameters
?page=1&limit=10&role=vendor&isActive=true

// Response
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50
    }
  }
}
```

#### Approve Vendor
```javascript
PUT /api/v1/admin/users/{userId}/approve
Authorization: Bearer {admin_token}

{
  "isApproved": true
}

// Success Response (200)
{
  "success": true,
  "message": "User approved successfully",
  "user": {
    "id": "user_id",
    "isApproved": true
  }
}
```

#### Get Dashboard Analytics
```javascript
GET /api/v1/admin/dashboard
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "analytics": {
    "totalUsers": 150,
    "totalVendors": 45,
    "totalRestaurants": 30,
    "pendingApprovals": 12,
    "totalOrders": 1250,
    "totalListings": 340,
    "revenueThisMonth": 125000,
    "ordersByStatus": {
      "pending": 15,
      "confirmed": 45,
      "delivered": 890,
      "cancelled": 25
    }
  }
}
```

### Product Management

#### Get All Products
```javascript
GET /api/v1/admin/products
Authorization: Bearer {admin_token}

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
        "isActive": true,
        "activeListingsCount": 5,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 10,
      "total": 200
    }
  }
}
```

#### Create Product
```javascript
POST /api/v1/admin/products
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Fresh Carrot",
  "category": "category_id",
  "description": "Organic fresh carrots",
  "unit": "kg",
  "images": ["image_url1", "image_url2"]
}

// Success Response (201)
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "id": "new_product_id",
    "name": "Fresh Carrot",
    "category": {...},
    "description": "Organic fresh carrots",
    "unit": "kg",
    "images": ["image_url1", "image_url2"],
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Category Management

#### Get All Categories
```javascript
GET /api/v1/admin/categories
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "category_id",
        "name": "Vegetables",
        "description": "Fresh vegetables category",
        "isActive": true,
        "productCount": 25,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### Create Category
```javascript
POST /api/v1/admin/categories
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Fruits",
  "description": "Fresh fruits category"
}

// Success Response (201)
{
  "success": true,
  "message": "Category created successfully",
  "category": {
    "id": "new_category_id",
    "name": "Fruits",
    "description": "Fresh fruits category",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Restaurant Management

#### Create Restaurant Owner (Admin Only)
```javascript
POST /api/v1/admin/restaurant-owners
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@restaurant.com",
  "phone": "+8801234567890",
  "password": "SecurePass123",
  "restaurantName": "Green Garden Restaurant",
  "ownerName": "John Doe",
  "address": {
    "street": "123 Main Street",
    "city": "Dhaka",
    "area": "Dhanmondi",
    "postalCode": "1205"
  },
  "tradeLicenseNo": "TL123456"
}

// Success Response (201)
{
  "success": true,
  "message": "Restaurant owner created successfully",
  "data": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@restaurant.com",
    "phone": "+8801234567890",
    "role": "restaurantOwner",
    "isActive": true,
    "restaurantId": {
      "id": "restaurant_id",
      "name": "Green Garden Restaurant",
      "email": "john@restaurant.com",
      "phone": "+8801234567890",
      "address": {
        "street": "123 Main Street",
        "city": "Dhaka",
        "area": "Dhanmondi",
        "postalCode": "1205"
      }
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Create Restaurant Manager (Admin Only)
```javascript
POST /api/v1/admin/restaurant-managers
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@restaurant.com",
  "phone": "+8801234567891",
  "password": "ManagerPass123",
  "restaurantId": "restaurant_id"
}

// Success Response (201)
{
  "success": true,
  "message": "Restaurant manager created successfully",
  "data": {
    "id": "manager_id",
    "name": "Jane Smith",
    "email": "jane@restaurant.com", 
    "phone": "+8801234567891",
    "role": "restaurantManager",
    "isActive": true,
    "restaurantId": {
      "id": "restaurant_id",
      "name": "Green Garden Restaurant",
      "email": "john@restaurant.com",
      "phone": "+8801234567890",
      "address": {
        "street": "123 Main Street",
        "city": "Dhaka",
        "area": "Dhanmondi",
        "postalCode": "1205"
      }
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
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