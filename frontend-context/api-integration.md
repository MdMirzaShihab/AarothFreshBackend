# Aaroth Fresh API Integration Guide

This document provides detailed guidance for integrating the Aaroth Fresh React frontend with the Express.js backend API.

## Backend Architecture Understanding

### Server Configuration
- **Base URL**: `http://localhost:5000` (development)
- **API Prefix**: `/api/v1`
- **CORS**: Enabled for frontend domains
- **Body Parser**: JSON parser with 10mb limit
- **Error Handling**: Global error middleware with standardized responses

### Database & Models
- **Database**: MongoDB with Mongoose ODM
- **Connection**: Configured in `config/db.js`
- **Models**: User, Restaurant, Vendor, Product, ProductCategory, Listing, Order

## Authentication System

### Phone-Based Authentication (CRITICAL)
```javascript
// Backend expects phone numbers, NOT emails
const loginData = {
  phone: "+8801234567890",  // Must include country code
  password: "userPassword"
};

// WRONG - Don't use email
const wrongData = {
  email: "user@example.com",  // This will fail
  password: "userPassword"
};
```

### Authentication Flow
1. **Login**: `POST /api/v1/auth/login`
   - Send: `{ phone: "+8801234567890", password: "password" }`
   - Receive: `{ token: "jwt_token", user: {...} }`

2. **Register**: `POST /api/v1/auth/register`
   - Send: `{ phone, password, role, name, ...additionalFields }`
   - Receive: `{ token: "jwt_token", user: {...} }`

3. **Token Usage**: Include in every protected request
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   }
   ```

### JWT Token Management
```javascript
// Frontend token handling pattern
class AuthService {
  setToken(token) {
    localStorage.setItem('token', token);
    // Set default header for all subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  removeToken() {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
}
```

## User Roles & Permissions

### Role Hierarchy
```javascript
const USER_ROLES = {
  ADMIN: 'admin',
  VENDOR: 'vendor', 
  RESTAURANT_OWNER: 'restaurantOwner',
  RESTAURANT_MANAGER: 'restaurantManager'
};

// Role-based route access
const rolePermissions = {
  admin: ['admin', 'listings', 'orders', 'public'],
  vendor: ['listings', 'orders', 'public'],
  restaurantOwner: ['orders', 'public'],
  restaurantManager: ['orders', 'public']
};
```

### Backend Role Validation
The backend validates roles at multiple levels:
- Route level (middleware/auth.js)
- Controller level (specific permission checks)
- Data level (user can only access their own data)

## API Endpoints Reference

### Authentication Routes (`/api/v1/auth`)

#### Login
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

#### Register
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

#### Logout
```javascript
POST /api/v1/auth/logout
Authorization: Bearer {token}

// Success Response (200)
{
  "success": true,
  "message": "Logged out successfully"
}

// Note: Frontend should clear token from localStorage
```

#### Get Current User Profile
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

#### Update User Profile
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

#### Change Password
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

#### Create Manager Account (Restaurant Owner Only)
```javascript
POST /api/v1/auth/create-manager
Authorization: Bearer {restaurant_owner_token}
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
```

#### Get Restaurant Managers (Restaurant Owner Only)
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

#### Deactivate Manager (Restaurant Owner Only)
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

### Admin Routes (`/api/v1/admin`)

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

#### Get Single User
```javascript
GET /api/v1/admin/users/{userId}
Authorization: Bearer {admin_token}

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
    "vendor": {
      "businessName": "Fresh Produce Co",
      "businessAddress": {...}
    }
  }
}
```

#### Update User
```javascript
PUT /api/v1/admin/users/{userId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Updated Name",
  "isActive": true,
  "isApproved": true,
  // Role-specific updates
  "businessName": "Updated Business" // for vendors
}

// Success Response (200)
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    // Updated user object
  }
}
```

#### Delete User
```javascript
DELETE /api/v1/admin/users/{userId}
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "message": "User deleted successfully"
}

// Error Response - User has active orders/listings
{
  "success": false,
  "message": "Cannot delete user with active orders or listings"
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
    },
    "recentActivity": [
      {
        "type": "new_order",
        "message": "New order from Restaurant ABC",
        "timestamp": "2024-01-01T10:30:00.000Z"
      }
    ]
  }
}
```

### Product Management (`/api/v1/admin/products`)

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

#### Get Single Product
```javascript
GET /api/v1/admin/products/{productId}
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "product": {
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
    "listings": [
      {
        "id": "listing_id",
        "vendor": "vendor_name",
        "price": 25.50,
        "isAvailable": true
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Product
```javascript
PUT /api/v1/admin/products/{productId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Updated Product Name",
  "category": "category_id",
  "description": "Updated description",
  "unit": "piece",
  "isActive": true
}

// Success Response (200)
{
  "success": true,
  "message": "Product updated successfully",
  "product": {
    // Updated product object
  }
}
```

#### Delete Product
```javascript
DELETE /api/v1/admin/products/{productId}
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "message": "Product deleted successfully"
}

// Error Response - Product has active listings
{
  "success": false,
  "message": "Cannot delete product with active listings"
}
```

### Category Management (`/api/v1/admin/categories`)

#### Get All Categories
```javascript
GET /api/v1/admin/categories
Authorization: Bearer {admin_token}

// Query parameters
?page=1&limit=20&search=vegetables&isActive=true

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
    "pagination": {
      "current": 1,
      "pages": 3,
      "total": 50
    }
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

#### Get Single Category
```javascript
GET /api/v1/admin/categories/{categoryId}
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "category": {
    "id": "category_id",
    "name": "Vegetables",
    "description": "Fresh vegetables category",
    "isActive": true,
    "productCount": 25,
    "products": [
      {
        "id": "product_id",
        "name": "Tomato",
        "activeListingsCount": 5
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Category
```javascript
PUT /api/v1/admin/categories/{categoryId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Updated Category Name",
  "description": "Updated description",
  "isActive": true
}

// Success Response (200)
{
  "success": true,
  "message": "Category updated successfully",
  "category": {
    // Updated category object
  }
}
```

#### Delete Category
```javascript
DELETE /api/v1/admin/categories/{categoryId}
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "message": "Category deleted successfully"
}

// Error Response - Category has products
{
  "success": false,
  "message": "Cannot delete category with existing products"
}
```

### Vendor Management (`/api/v1/admin/vendors`)

#### Get All Vendors
```javascript
GET /api/v1/admin/vendors
Authorization: Bearer {admin_token}

// Query parameters
?page=1&limit=20&isApproved=true&isActive=true&search=business_name

// Success Response (200)
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "vendor_id",
        "name": "Vendor Name",
        "phone": "+8801234567890",
        "businessName": "Fresh Produce Co",
        "businessAddress": {...},
        "isApproved": true,
        "isActive": true,
        "activeListingsCount": 12,
        "totalOrders": 45,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### Get Pending Vendors
```javascript
GET /api/v1/admin/vendors/pending
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "vendors": [
    {
      "id": "vendor_id",
      "name": "Pending Vendor",
      "phone": "+8801234567890",
      "businessName": "New Business",
      "businessLicense": "license_url",
      "isApproved": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Verify Vendor
```javascript
PUT /api/v1/admin/vendors/{vendorId}/verify
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "isApproved": true,
  "verificationNotes": "All documents verified"
}

// Success Response (200)
{
  "success": true,
  "message": "Vendor verified successfully"
}
```

### Restaurant Management (`/api/v1/admin/restaurants`)

#### Get All Restaurants
```javascript
GET /api/v1/admin/restaurants
Authorization: Bearer {admin_token}

// Query parameters
?page=1&limit=20&isActive=true&search=restaurant_name

// Success Response (200)
{
  "success": true,
  "data": {
    "restaurants": [
      {
        "id": "restaurant_id",
        "name": "Owner Name",
        "phone": "+8801234567890",
        "restaurantName": "ABC Restaurant",
        "restaurantAddress": {...},
        "restaurantType": "Fine Dining",
        "isActive": true,
        "totalOrders": 78,
        "managersCount": 2,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### Get Pending Restaurants
```javascript
GET /api/v1/admin/restaurants/pending
Authorization: Bearer {admin_token}

// Success Response (200)
{
  "success": true,
  "restaurants": [
    {
      "id": "restaurant_id",
      "name": "Pending Owner",
      "restaurantName": "New Restaurant",
      "restaurantType": "Casual Dining",
      "isApproved": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Verify Restaurant
```javascript
PUT /api/v1/admin/restaurants/{restaurantId}/verify
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "isApproved": true,
  "verificationNotes": "Restaurant verified"
}

// Success Response (200)
{
  "success": true,
  "message": "Restaurant verified successfully"
}
```

### Listings Routes (`/api/v1/listings`)

#### Get All Listings
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

#### Get Vendor's Own Listings
```javascript
GET /api/v1/listings/vendor
Authorization: Bearer {vendor_token}

// Query parameters
?page=1&limit=20&isAvailable=true&search=tomato&sortBy=createdAt&sortOrder=desc

// Success Response (200)
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing_id",
        "product": {
          "id": "product_id",
          "name": "Fresh Tomato",
          "category": {
            "id": "category_id",
            "name": "Vegetables"
          }
        },
        "price": 25.50,
        "availableQuantity": 100,
        "isAvailable": true,
        "images": ["url1", "url2"],
        "description": "Premium quality fresh tomatoes",
        "qualityGrade": "Premium",
        "harvestDate": "2024-01-01",
        "deliveryOptions": ["pickup", "delivery"],
        "minimumOrder": 5,
        "leadTime": "2-4 hours",
        "totalOrders": 15,
        "averageRating": 4.5,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 8,
      "total": 150
    },
    "stats": {
      "totalListings": 150,
      "activeListings": 120,
      "totalOrders": 450,
      "averageRating": 4.3
    }
  }
}
```

#### Get Single Listing Details
```javascript
GET /api/v1/listings/{listingId}
Authorization: Bearer {token}

// Success Response (200)
{
  "success": true,
  "listing": {
    "id": "listing_id",
    "vendor": {
      "id": "vendor_id",
      "name": "Vendor Name",
      "businessName": "Fresh Produce Co",
      "phone": "+8801234567890",
      "businessAddress": {
        "street": "123 Market St",
        "city": "Dhaka",
        "area": "Dhanmondi",
        "postalCode": "1205"
      },
      "rating": 4.5,
      "totalOrders": 145,
      "isApproved": true
    },
    "product": {
      "id": "product_id",
      "name": "Fresh Tomato",
      "category": {
        "id": "category_id",
        "name": "Vegetables"
      },
      "description": "Premium quality fresh tomatoes",
      "unit": "kg"
    },
    "price": 25.50,
    "availableQuantity": 100,
    "isAvailable": true,
    "images": ["url1", "url2", "url3"],
    "description": "Farm-fresh organic tomatoes harvested this morning",
    "qualityGrade": "Premium",
    "harvestDate": "2024-01-01",
    "expiryDate": "2024-01-07",
    "deliveryOptions": [
      {
        "type": "pickup",
        "cost": 0,
        "timeRange": "30 minutes"
      },
      {
        "type": "delivery", 
        "cost": 50,
        "timeRange": "2-4 hours"
      }
    ],
    "minimumOrder": 5,
    "leadTime": "2-4 hours",
    "certifications": ["Organic", "Fresh", "Pesticide-Free"],
    "storageInstructions": "Store in cool, dry place",
    "nutritionalInfo": {
      "calories": "18 per 100g",
      "vitamin_c": "High",
      "fiber": "1.2g per 100g"
    },
    "discount": {
      "percentage": 10,
      "validUntil": "2024-01-07T00:00:00.000Z",
      "reason": "Bulk order promotion"
    },
    "totalOrders": 25,
    "averageRating": 4.7,
    "reviews": [
      {
        "id": "review_id",
        "customer": "Restaurant ABC",
        "rating": 5,
        "comment": "Excellent quality",
        "date": "2024-01-01T00:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z"
  }
}
```

#### Create Listing (Vendor Only)
```javascript
POST /api/v1/listings
Authorization: Bearer {vendor_token}
Content-Type: application/json

{
  "product": "product_id",
  "price": 25.50,
  "availableQuantity": 100,
  "description": "Farm-fresh organic tomatoes harvested this morning",
  "images": ["image_url1", "image_url2", "image_url3"],
  "qualityGrade": "Premium", // Premium, Standard, Economy
  "harvestDate": "2024-01-01",
  "expiryDate": "2024-01-07",
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
  "minimumOrder": 5,
  "leadTime": "2-4 hours",
  "certifications": ["Organic", "Fresh", "Pesticide-Free"],
  "storageInstructions": "Store in cool, dry place",
  "nutritionalInfo": {
    "calories": "18 per 100g",
    "vitamin_c": "High",
    "fiber": "1.2g per 100g"
  },
  "discount": {
    "percentage": 10,
    "validUntil": "2024-01-07T00:00:00.000Z",
    "reason": "Bulk order promotion"
  },
  "tags": ["organic", "fresh", "local", "pesticide-free"]
}

// Success Response (201)
{
  "success": true,
  "message": "Listing created successfully",
  "listing": {
    "id": "new_listing_id",
    "product": {
      "id": "product_id",
      "name": "Fresh Tomato",
      "category": "Vegetables"
    },
    "price": 25.50,
    "availableQuantity": 100,
    "isAvailable": true,
    "images": ["url1", "url2", "url3"],
    "qualityGrade": "Premium",
    "harvestDate": "2024-01-01",
    "deliveryOptions": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Listing (Vendor Only)
```javascript
PUT /api/v1/listings/{listingId}
Authorization: Bearer {vendor_token}
Content-Type: application/json

{
  "price": 28.00,
  "availableQuantity": 80,
  "description": "Updated description",
  "isAvailable": true,
  "images": ["new_url1", "new_url2"],
  "qualityGrade": "Premium",
  "deliveryOptions": [
    {
      "type": "pickup",
      "cost": 0,
      "timeRange": "30 minutes"
    }
  ],
  "discount": {
    "percentage": 15,
    "validUntil": "2024-01-10T00:00:00.000Z",
    "reason": "Weekend special"
  }
}

// Success Response (200)
{
  "success": true,
  "message": "Listing updated successfully",
  "listing": {
    "id": "listing_id",
    "price": 28.00,
    "availableQuantity": 80,
    "isAvailable": true,
    "updatedAt": "2024-01-02T12:00:00.000Z"
  }
}
```

#### Delete Listing (Vendor Only)
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

### Orders Routes (`/api/v1/orders`)

#### Create Order (Restaurant Only)
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
```

#### Update Order Status
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

#### Approve Order (Restaurant Owner Only)
```javascript
POST /api/v1/orders/{orderId}/approve
Authorization: Bearer {restaurant_owner_token}

{
  "approved": true,
  "notes": "Order approved by owner"
}

// Success Response (200)
{
  "success": true,
  "message": "Order approved successfully"
}
```

### Public Routes (`/api/v1/public`)

#### Get All Products (Public)
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
    "pagination": {
      "current": 1,
      "pages": 10,
      "total": 200
    }
  }
}
```

#### Get Single Product (Public)
```javascript
GET /api/v1/public/products/{productId}

// Success Response (200)
{
  "success": true,
  "product": {
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
    "priceRange": {
      "min": 20.00,
      "max": 30.00,
      "average": 25.50
    },
    "availableVendors": 8,
    "totalStock": 500,
    "listings": [
      {
        "id": "listing_id",
        "vendor": {
          "id": "vendor_id",
          "name": "Vendor Name",
          "businessName": "Fresh Produce Co"
        },
        "price": 25.50,
        "availableQuantity": 100,
        "isAvailable": true
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get All Categories (Public)
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
    },
    {
      "id": "fruits_id",
      "name": "Fruits",
      "description": "Fresh fruits category",
      "productCount": 18,
      "activeListingsCount": 85,
      "image": "fruits_image_url",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get All Public Listings
```javascript
GET /api/v1/public/listings

// Query parameters (extensive filtering)
?page=1&limit=20&category=vegetables&product=product_id&vendor=vendor_id&minPrice=10&maxPrice=100&available=true&search=organic&sortBy=price&sortOrder=asc&location=dhaka

// Success Response (200)
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing_id",
        "vendor": {
          "id": "vendor_id",
          "name": "Vendor Name",
          "businessName": "Fresh Produce Co",
          "location": "Dhaka",
          "rating": 4.5,
          "totalOrders": 145
        },
        "product": {
          "id": "product_id",
          "name": "Fresh Tomato",
          "category": "Vegetables",
          "unit": "kg"
        },
        "price": 25.50,
        "availableQuantity": 100,
        "isAvailable": true,
        "images": ["url1", "url2"],
        "description": "Organic fresh tomatoes",
        "qualityGrade": "Premium",
        "harvestDate": "2024-01-01",
        "deliveryOptions": ["pickup", "delivery"],
        "minimumOrder": 5,
        "leadTime": "2-4 hours",
        "certifications": ["Organic", "Fresh"],
        "discount": {
          "percentage": 10,
          "validUntil": "2024-01-07T00:00:00.000Z"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 25,
      "total": 500
    },
    "filters": {
      "appliedFilters": {
        "category": "vegetables",
        "available": true,
        "priceRange": [10, 100]
      },
      "availableFilters": {
        "categories": ["vegetables", "fruits", "grains"],
        "vendors": [{"id": "vendor1", "name": "Vendor Name"}],
        "priceRange": {"min": 5, "max": 200},
        "locations": ["dhaka", "chittagong", "sylhet"]
      }
    }
  }
}
```

#### Get Single Public Listing
```javascript
GET /api/v1/public/listings/{listingId}

// Success Response (200)
{
  "success": true,
  "listing": {
    "id": "listing_id",
    "vendor": {
      "id": "vendor_id",
      "name": "Vendor Name",
      "businessName": "Fresh Produce Co",
      "businessAddress": {
        "street": "123 Market St",
        "city": "Dhaka",
        "area": "Dhanmondi",
        "postalCode": "1205"
      },
      "phone": "+8801234567890",
      "rating": 4.5,
      "totalOrders": 145,
      "yearsInBusiness": 3,
      "specialties": ["Organic Produce", "Daily Fresh"],
      "deliveryAreas": ["Dhanmondi", "Gulshan", "Banani"],
      "businessHours": {
        "monday": "6:00 AM - 6:00 PM",
        "tuesday": "6:00 AM - 6:00 PM"
      }
    },
    "product": {
      "id": "product_id",
      "name": "Fresh Tomato",
      "category": {
        "id": "category_id",
        "name": "Vegetables"
      },
      "description": "Premium quality fresh tomatoes",
      "unit": "kg",
      "images": ["url1", "url2", "url3"],
      "nutritionalInfo": {
        "calories": "18 per 100g",
        "vitamin_c": "High",
        "fiber": "1.2g per 100g"
      }
    },
    "price": 25.50,
    "availableQuantity": 100,
    "isAvailable": true,
    "images": ["listing_url1", "listing_url2"],
    "description": "Farm-fresh organic tomatoes harvested this morning",
    "qualityGrade": "Premium",
    "harvestDate": "2024-01-01",
    "expiryDate": "2024-01-07",
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
        "areas": ["Dhanmondi", "Gulshan"]
      }
    ],
    "minimumOrder": 5,
    "leadTime": "2-4 hours",
    "certifications": ["Organic", "Fresh", "Pesticide-Free"],
    "storageInstructions": "Store in cool, dry place",
    "discount": {
      "percentage": 10,
      "validUntil": "2024-01-07T00:00:00.000Z",
      "reason": "Bulk order promotion"
    },
    "relatedListings": [
      {
        "id": "related_listing_id",
        "product": "Cherry Tomato",
        "price": 35.00,
        "vendor": "Same Vendor"
      }
    ],
    "reviews": [
      {
        "id": "review_id",
        "customer": "Restaurant ABC",
        "rating": 5,
        "comment": "Excellent quality tomatoes",
        "date": "2024-01-01T00:00:00.000Z"
      }
    ],
    "averageRating": 4.7,
    "totalReviews": 23,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z"
  }
}
```

### System Health (`/api/v1/health`)

#### Health Check
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

// Error Response (503) - Service unavailable
{
  "success": false,
  "status": "unhealthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "database": "disconnected",
    "redis": "connected",
    "cloudinary": "connected",
    "email": "error"
  },
  "version": "1.0.0"
}
```

## Data Models & TypeScript Types

### User Model
```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'vendor' | 'restaurantOwner' | 'restaurantManager';
  isActive: boolean;
  isApproved?: boolean; // for vendors
  createdAt: string;
  updatedAt: string;
  
  // Role-specific fields
  vendor?: {
    businessName: string;
    businessAddress: Address;
    businessLicense?: string;
  };
  
  restaurant?: {
    restaurantName: string;
    restaurantAddress: Address;
    restaurantType: string;
  };
}
```

### Product & Listing Models
```typescript
interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  unit: string; // kg, piece, bunch, etc.
  images: string[];
  createdAt: string;
}

interface Listing {
  id: string;
  vendor: User;
  product: Product;
  price: number;
  availableQuantity: number;
  isAvailable: boolean;
  description?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Order Model
```typescript
interface Order {
  id: string;
  restaurant: User;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled';
  totalAmount: number;
  deliveryAddress: Address;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  listing: Listing;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

## Error Handling Patterns

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

### Frontend Error Handling Strategy
```javascript
// API service with error handling
const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {};
    
    switch (status) {
      case 401:
        // Clear token and redirect to login
        authService.logout();
        window.location.href = '/login';
        break;
      case 403:
        // Show permission denied message
        toast.error('You do not have permission to perform this action');
        break;
      case 500:
        // Show generic error message
        toast.error('Something went wrong. Please try again.');
        break;
      default:
        // Show specific error message from backend
        toast.error(data?.message || 'An error occurred');
    }
    
    return Promise.reject(error);
  }
);
```

## File Upload Integration

### Cloudinary Configuration & Endpoints
The backend uses Cloudinary for file uploads with automatic image processing and organization.

#### Upload Single File
```javascript
POST /api/v1/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

// Form data
file: [Image file]
folder: "listings" // Optional: "listings", "categories", "general"

// Success Response (200)
{
  "success": true,
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/listings/abc123.jpg",
  "publicId": "listings/abc123",
  "format": "jpg",
  "size": 245760,
  "width": 1024,
  "height": 768,
  "folder": "listings"
}

// Error Response (400)
{
  "success": false,
  "message": "Invalid file type. Only images are allowed."
}
```

#### Upload Multiple Files
```javascript
POST /api/v1/upload/multiple
Authorization: Bearer {token}
Content-Type: multipart/form-data

// Form data
files: [Image file 1, Image file 2, Image file 3, Image file 4, Image file 5]
folder: "listings"

// Success Response (200)
{
  "success": true,
  "uploads": [
    {
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/listings/abc123.jpg",
      "publicId": "listings/abc123",
      "format": "jpg",
      "size": 245760
    },
    {
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/listings/def456.jpg",
      "publicId": "listings/def456", 
      "format": "jpg",
      "size": 389120
    }
  ],
  "totalUploaded": 2,
  "totalSize": 634880
}
```

### File Upload Constraints & Validation

#### Supported File Types
- **Images Only**: JPG, JPEG, PNG, WebP, GIF
- **Maximum File Size**: 1MB per file
- **Maximum Files**: 5 files per upload (for listings)
- **Automatic Processing**: Images resized to max 1024x768 for listings
- **Folder Organization**: Files organized by type (listings, categories, general)

### Frontend Implementation Patterns

#### Single File Upload Component
```javascript
// hooks/useFileUpload.js
import { useMutation } from '@tanstack/react-query';
import { uploadService } from '../services/upload.service';

export const useFileUpload = () => {
  return useMutation({
    mutationFn: ({ file, folder = 'general' }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      
      return api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'File upload failed';
      toast.error(message);
    }
  });
};

// Component usage
const ImageUpload = ({ onUploadSuccess, folder = 'general' }) => {
  const uploadMutation = useFileUpload();
  
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 1024 * 1024) {
      toast.error('File size must be less than 1MB');
      return;
    }
    
    try {
      const response = await uploadMutation.mutateAsync({ file, folder });
      onUploadSuccess(response.data.url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  return (
    <div className="upload-container">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label 
        htmlFor="file-upload"
        className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
      >
        {uploadMutation.isLoading ? 'Uploading...' : 'Select Image'}
      </label>
      
      {uploadMutation.isLoading && (
        <div className="mt-2 text-sm text-gray-600">
          Uploading image...
        </div>
      )}
    </div>
  );
};
```

#### Multiple Files Upload Component
```javascript
// hooks/useMultipleFileUpload.js
export const useMultipleFileUpload = () => {
  return useMutation({
    mutationFn: ({ files, folder = 'listings' }) => {
      const formData = new FormData();
      
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('folder', folder);
      
      return api.post('/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        // Add upload progress tracking
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${progress}%`);
        }
      });
    }
  });
};

// Multi-image upload component for listings
const ListingImageUpload = ({ onUploadSuccess, maxImages = 5 }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const uploadMutation = useMultipleFileUpload();
  
  const handleFilesSelect = (event) => {
    const files = Array.from(event.target.files);
    
    // Validate number of files
    if (files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    
    // Validate each file
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      
      if (file.size > 1024 * 1024) {
        toast.error(`${file.name} is too large (max 1MB)`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length !== files.length) {
      return;
    }
    
    setSelectedFiles(validFiles);
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select images first');
      return;
    }
    
    try {
      const response = await uploadMutation.mutateAsync({
        files: selectedFiles,
        folder: 'listings'
      });
      
      const imageUrls = response.data.uploads.map(upload => upload.url);
      onUploadSuccess(imageUrls);
      setSelectedFiles([]);
      toast.success(`${imageUrls.length} images uploaded successfully`);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelect}
          className="hidden"
          id="multiple-file-upload"
        />
        <label
          htmlFor="multiple-file-upload"
          className="cursor-pointer bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Select Images (Max {maxImages})
        </label>
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {selectedFiles.length} image(s) selected
          </p>
          
          {/* Image previews */}
          <div className="grid grid-cols-3 gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedFiles(files => files.filter((_, i) => i !== index));
                  }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isLoading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            {uploadMutation.isLoading ? 'Uploading...' : 'Upload Images'}
          </button>
        </div>
      )}
    </div>
  );
};
```

#### Upload Service Layer
```javascript
// services/upload.service.js
import api from './api';

export const uploadService = {
  // Single file upload
  uploadSingle: async (file, folder = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  // Multiple files upload
  uploadMultiple: async (files, folder = 'listings') => {
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });
    formData.append('folder', folder);
    
    const response = await api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  // Delete image (if backend supports)
  deleteImage: async (publicId) => {
    const response = await api.delete('/upload', {
      data: { publicId }
    });
    
    return response.data;
  }
};
```

### Image Optimization & Transformations

#### Cloudinary URL Transformations
```javascript
// utils/imageUtils.js

// Generate optimized image URLs for different use cases
export const getOptimizedImageUrl = (originalUrl, options = {}) => {
  if (!originalUrl) return null;
  
  const {
    width = 400,
    height = 300,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options;
  
  // Insert transformations into Cloudinary URL
  const transformations = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
  
  return originalUrl.replace('/upload/', `/upload/${transformations}/`);
};

// Usage examples
const thumbnailUrl = getOptimizedImageUrl(originalUrl, { width: 150, height: 150 });
const cardImageUrl = getOptimizedImageUrl(originalUrl, { width: 400, height: 300 });
const heroImageUrl = getOptimizedImageUrl(originalUrl, { width: 1200, height: 600 });
```

### Error Handling & Validation

#### File Upload Validation
```javascript
// utils/fileValidation.js
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 1024 * 1024, // 1MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxWidth = 5000,
    maxHeight = 5000
  } = options;
  
  const errors = [];
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only images are allowed.');
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`);
  }
  
  // Check image dimensions (requires loading the image)
  return new Promise((resolve) => {
    if (errors.length > 0) {
      resolve({ isValid: false, errors });
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      if (img.width > maxWidth || img.height > maxHeight) {
        errors.push(`Image dimensions too large. Maximum size is ${maxWidth}x${maxHeight}.`);
      }
      
      resolve({ isValid: errors.length === 0, errors, dimensions: { width: img.width, height: img.height } });
    };
    
    img.onerror = () => {
      errors.push('Invalid image file.');
      resolve({ isValid: false, errors });
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Usage in upload components
const handleFileSelect = async (file) => {
  const validation = await validateFile(file);
  
  if (!validation.isValid) {
    validation.errors.forEach(error => toast.error(error));
    return;
  }
  
  // Proceed with upload
  uploadFile(file);
};
```

## Real-time Features (Future)

### WebSocket Integration Preparation
```javascript
// Socket.io client setup for real-time features
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: authService.getToken()
  }
});

// Listen for order updates
socket.on('order:updated', (orderData) => {
  // Update order in state management
  queryClient.invalidateQueries(['orders']);
});

// Listen for new notifications
socket.on('notification:new', (notification) => {
  // Add to notification store
  notificationStore.addNotification(notification);
});
```

## API Service Implementation Pattern

### Base API Service
```javascript
// services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Service Layer Pattern
```javascript
// services/listings.service.js
import api from './api';

export const listingsService = {
  // Get all listings with optional filters
  async getAll(filters = {}) {
    const response = await api.get('/listings', { params: filters });
    return response.data;
  },

  // Get single listing by ID
  async getById(id) {
    const response = await api.get(`/listings/${id}`);
    return response.data;
  },

  // Create new listing (vendor only)
  async create(listingData) {
    const response = await api.post('/listings', listingData);
    return response.data;
  },

  // Update existing listing
  async update(id, updateData) {
    const response = await api.put(`/listings/${id}`, updateData);
    return response.data;
  },

  // Delete listing
  async delete(id) {
    const response = await api.delete(`/listings/${id}`);
    return response.data;
  }
};
```

## TanStack Query Integration

### Query Hooks Pattern
```javascript
// hooks/useListings.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsService } from '../services/listings.service';

// Get listings with caching
export const useListings = (filters = {}) => {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => listingsService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Create listing mutation
export const useCreateListing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: listingsService.create,
    onSuccess: () => {
      // Invalidate and refetch listings
      queryClient.invalidateQueries(['listings']);
      toast.success('Listing created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create listing');
    }
  });
};
```

## Performance Optimization

### API Request Optimization
- **Pagination**: Always use pagination for lists
- **Filtering**: Implement server-side filtering
- **Caching**: Use TanStack Query for intelligent caching
- **Debouncing**: Debounce search inputs to reduce API calls

### Image Optimization
- **Lazy Loading**: Load images only when needed
- **Responsive Images**: Use different sizes for different devices
- **WebP Format**: Use modern image formats with fallbacks
- **Cloudinary Transformations**: Use Cloudinary's image transformations

## Development Workflow

### API Development Workflow
1. **Understand Backend**: Read backend code and documentation
2. **Create Types**: Define TypeScript interfaces matching backend models
3. **Build Services**: Create API service functions
4. **Create Hooks**: Build TanStack Query hooks
5. **Handle Errors**: Implement comprehensive error handling
6. **Test Integration**: Test with real backend API

### Testing API Integration
```javascript
// Example API integration test
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useListings } from '../hooks/useListings';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('should fetch listings successfully', async () => {
  const { result } = renderHook(() => useListings(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toBeDefined();
});
```

## Security Considerations

### API Security Best Practices
- **Validate All Inputs**: Client-side validation + server-side validation
- **Sanitize Data**: Prevent XSS attacks
- **HTTPS Only**: Use HTTPS in production
- **Token Security**: Secure JWT token storage and transmission
- **Role Validation**: Always validate user permissions
- **Rate Limiting**: Respect backend rate limits

### Environment Variables
```javascript
// .env files for different environments
// .env.development
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name

// .env.production
REACT_APP_API_BASE_URL=https://api.aarothfresh.com/api/v1
REACT_APP_CLOUDINARY_CLOUD_NAME=production_cloud_name
```

## Troubleshooting Common Issues

### Authentication Issues
- **Token Expiration**: Implement automatic token refresh
- **CORS Errors**: Ensure backend CORS is configured for frontend domain
- **Phone Format**: Always include country code in phone numbers

### API Integration Issues
- **Network Errors**: Implement retry logic and offline handling
- **Data Mismatch**: Ensure frontend types match backend models exactly
- **Caching Issues**: Use proper cache invalidation strategies

### Development Issues
- **Hot Reload**: Configure Vite for optimal development experience
- **Environment Variables**: Ensure all required variables are set
- **Proxy Configuration**: Use Vite proxy for API calls in development

## Summary

This API integration guide provides:
- Complete authentication flow with phone-based login
- All API endpoints with request/response examples
- TypeScript types matching backend models
- Error handling patterns and best practices
- Performance optimization strategies
- Security considerations and best practices

The key points to remember:
1. **Phone-based authentication** (not email)
2. **Role-based permissions** with four distinct roles
3. **Comprehensive error handling** with user-friendly messages
4. **Mobile-first approach** with performance optimization
5. **TanStack Query** for efficient server state management