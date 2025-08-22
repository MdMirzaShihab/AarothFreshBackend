# Cleaned API Endpoints Documentation

## 🧹 Post-Cleanup API Reference for Frontend Integration

This document outlines the **cleaned and simplified** API endpoints after removing legacy approval system code. Use these endpoints for your React.js frontend implementation.

---

## 🔐 Authentication

All admin endpoints require JWT token authentication:

```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 🏢 Business Entity Verification Endpoints

### **1. Vendor Verification Management**

#### **Get Pending Vendors**
```
GET /api/v1/admin/vendors/pending
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `isVerified` (optional): Filter by verification status

**Response:**
```json
{
  "success": true,
  "count": 10,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  },
  "data": [
    {
      "_id": "vendor_id",
      "businessName": "Fresh Vegetables Ltd",
      "ownerName": "John Doe",
      "email": "john@freshveggies.com",
      "phone": "+8801234567890",
      "address": {
        "street": "123 Market St",
        "city": "Dhaka",
        "area": "Dhanmondi",
        "postalCode": "1205"
      },
      "tradeLicenseNo": "TL123456",
      "isVerified": false,
      "verificationDate": null,
      "statusUpdatedBy": null,
      "statusUpdatedAt": null,
      "adminNotes": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### **Get All Vendors**
```
GET /api/v1/admin/vendors
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `isVerified` (optional): Filter by verification status (`true`, `false`)
- `search` (optional): Search by business name or owner name

**Response:** Same structure as pending vendors

#### **Toggle Vendor Verification**
```
PUT /api/v1/admin/vendors/:id/verification
```

**Request Body:**
```json
{
  "isVerified": true,
  "reason": "All documents verified successfully"
}
```

**Required Fields:**
- `isVerified`: Boolean (true to verify, false to revoke)
- `reason`: String (optional for verification, required for revocation, 5-500 chars)

**Response:**
```json
{
  "success": true,
  "message": "Vendor verification enabled successfully",
  "data": {
    "_id": "vendor_id",
    "businessName": "Fresh Vegetables Ltd",
    "isVerified": true,
    "verificationDate": "2024-01-15T12:00:00Z",
    "statusUpdatedBy": {
      "_id": "admin_id",
      "name": "Admin User",
      "email": "admin@aarothfresh.com"
    },
    "statusUpdatedAt": "2024-01-15T12:00:00Z",
    "adminNotes": "All documents verified successfully"
  }
}
```

---

### **2. Restaurant Verification Management**

#### **Get Pending Restaurants**
```
GET /api/v1/admin/restaurants/pending
```

**Response:** Same structure as vendors with restaurant-specific fields

#### **Get All Restaurants**
```
GET /api/v1/admin/restaurants
```

**Response:** Same structure and parameters as vendors

#### **Toggle Restaurant Verification**
```
PUT /api/v1/admin/restaurants/:id/verification
```

**Request/Response:** Same structure as vendor verification

---

## 👤 User Business Status Endpoint

### **Get User Business Status**
```
GET /api/v1/auth/status
```

**Description:** Get the current user's business verification status, capabilities, and next steps. This endpoint addresses user-level status by providing business entity verification information.

**Headers Required:**
```javascript
{
  'Authorization': 'Bearer your_jwt_token'
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com", 
      "phone": "+8801234567890",
      "role": "vendor",
      "isActive": true
    },
    "businessVerification": {
      "isVerified": false,
      "businessType": "vendor business",
      "businessName": "Fresh Vegetables Ltd",
      "verificationDate": null
    },
    "capabilities": {
      "canCreateListings": false,
      "canPlaceOrders": false,
      "canManageRestaurant": false,
      "canAccessDashboard": false,
      "canUpdateProfile": true
    },
    "restrictions": {
      "hasRestrictions": true,
      "reason": "vendor business \"Fresh Vegetables Ltd\" is not verified"
    },
    "nextSteps": [
      "Wait for admin verification of your vendor business",
      "Ensure all required business documents are uploaded", 
      "Check your email for any additional requirements",
      "Contact admin if you have been waiting more than 3 business days",
      "Complete your business profile with accurate information"
    ],
    "businessInfo": {
      "vendor": {
        "id": "vendor_id",
        "businessName": "Fresh Vegetables Ltd",
        "tradeLicenseNo": "TL123456",
        "isVerified": false,
        "verificationDate": null,
        "isActive": true,
        "address": {
          "street": "123 Market St",
          "city": "Dhaka",
          "area": "Dhanmondi",
          "postalCode": "1205"
        }
      }
    }
  }
}
```

**Frontend Usage:**
```javascript
// Check if user can create listings
const canCreateListings = statusResponse.data.capabilities.canCreateListings;

// Show appropriate UI based on verification status
if (statusResponse.data.businessVerification.isVerified) {
  // Show full dashboard
} else {
  // Show pending verification screen with next steps
}
```

---

## 📊 Dashboard & Analytics Endpoints

### **Dashboard Overview**
```
GET /api/v1/admin/dashboard/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "totalVendors": 125,
      "totalRestaurants": 89,
      "pendingApprovals": 15,
      "activeUsers": 200,
      "newUsersToday": 3
    },
    "listings": {
      "totalListings": 1250,
      "activeListings": 1100,
      "featuredListings": 50,
      "flaggedListings": 5
    },
    "orders": {
      "totalOrders": 2300,
      "pendingOrders": 25,
      "completedToday": 45,
      "totalRevenue": 125000
    },
    "verification": {
      "verifiedVendors": 110,
      "verifiedRestaurants": 75,
      "pendingVendors": 15,
      "pendingRestaurants": 14,
      "verificationRate": 87.5
    }
  }
}
```

---

## 🚫 Removed Legacy Endpoints

These endpoints have been **removed** and will return `404 Not Found`:

```javascript
// ❌ REMOVED - Do not use these endpoints
GET /api/v1/admin/approvals
PUT /api/v1/admin/approvals/vendor/:id/approve
PUT /api/v1/admin/approvals/vendor/:id/reject
PUT /api/v1/admin/approvals/restaurant/:id/approve
PUT /api/v1/admin/approvals/restaurant/:id/reject
PUT /api/v1/admin/approvals/vendor/:id/reset
PUT /api/v1/admin/approvals/restaurant/:id/reset
```

---

## 🔄 Migration Guide

### **Old vs New Endpoint Mapping**

| Legacy Endpoint | New Endpoint | Notes |
|---|---|---|
| `GET /admin/approvals` | `GET /admin/vendors/pending` + `GET /admin/restaurants/pending` | Split by entity type |
| `PUT /admin/approvals/vendor/:id/approve` | `PUT /admin/vendors/:id/verification` | Direct verification toggle |
| `PUT /admin/approvals/vendor/:id/reject` | `PUT /admin/vendors/:id/verification` | Use `isVerified: false` |
| `PUT /admin/approvals/restaurant/:id/approve` | `PUT /admin/restaurants/:id/verification` | Direct verification toggle |
| `PUT /admin/approvals/restaurant/:id/reject` | `PUT /admin/restaurants/:id/verification` | Use `isVerified: false` |

### **Frontend Code Migration Example**

**Old Implementation (REMOVE):**
```javascript
// ❌ Old - This will fail
const approveVendor = async (vendorId, notes) => {
  await api.put(`/admin/approvals/vendor/${vendorId}/approve`, {
    approvalNotes: notes
  });
};
```

**New Implementation (USE):**
```javascript
// ✅ New - Use this instead
const verifyVendor = async (vendorId, reason) => {
  await api.put(`/admin/vendors/${vendorId}/verification`, {
    isVerified: true,
    reason: reason
  });
};

const revokeVendorVerification = async (vendorId, reason) => {
  await api.put(`/admin/vendors/${vendorId}/verification`, {
    isVerified: false,
    reason: reason
  });
};
```

---

## 📝 Request/Response Examples

### **Verify a Vendor**
```bash
curl -X PUT "http://localhost:5000/api/v1/admin/vendors/60a7c7b4f3b2c8e4d5a6b7c8/verification" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "isVerified": true,
    "reason": "All documentation verified and business license confirmed"
  }'
```

### **Revoke Restaurant Verification**
```bash
curl -X PUT "http://localhost:5000/api/v1/admin/restaurants/60a7c7b4f3b2c8e4d5a6b7c9/verification" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "isVerified": false,
    "reason": "Invalid trade license document provided"
  }'
```

### **Get Pending Vendors with Filters**
```bash
curl -X GET "http://localhost:5000/api/v1/admin/vendors/pending?page=1&limit=10" \
  -H "Authorization: Bearer your_jwt_token"
```

---

## ⚠️ Error Responses

### **Standard Error Format**
```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": ["Specific validation errors"]
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### **Common Error Codes**

| Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid request data |
| `401` | `UNAUTHORIZED` | Invalid or missing JWT token |
| `403` | `FORBIDDEN` | Insufficient permissions |
| `404` | `NOT_FOUND` | Entity not found |
| `409` | `CONFLICT` | Business logic conflict |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `INTERNAL_ERROR` | Server error |

---

## 🔒 Security & Validation

### **Request Validation Rules**

**Vendor/Restaurant ID:**
- Must be valid MongoDB ObjectId
- Entity must exist and not be deleted

**Verification Reason:**
- Optional for verification (`isVerified: true`)
- Required for revocation (`isVerified: false`)
- Length: 5-500 characters
- Must be trimmed string

**Admin Authorization:**
- Only users with `role: 'admin'` can access these endpoints
- JWT token must be valid and not expired
- All actions are audit logged

### **Rate Limiting**
- 100 requests per minute per IP
- 1000 requests per hour per user
- Verification actions limited to 10 per minute

---

## 📈 Performance Considerations

### **Caching Strategy**
- Dashboard statistics cached for 5 minutes
- Entity lists cached with smart invalidation
- Verification status changes trigger cache updates

### **Pagination**
- Default page size: 20 items
- Maximum page size: 100 items
- Use cursor-based pagination for large datasets

### **Database Optimization**
- Indexes on `isVerified`, `createdAt`, `statusUpdatedAt`
- Compound indexes for filtered queries
- Optimized aggregation pipelines for dashboard stats

---

## 🧪 Testing Endpoints

### **Health Check**
```
GET /api/v1/health
```

**Response:**
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### **Auth Test**
```
GET /api/v1/auth/me
```

Use this to verify JWT token validity before making admin requests.

---

## 📊 Monitoring & Analytics

### **Key Metrics to Track**
- Verification response times
- Error rates by endpoint
- Daily verification counts
- Admin user activity
- Cache hit rates

### **Recommended Monitoring**
```javascript
// Frontend monitoring example
const trackVerificationAction = (entityType, action, success) => {
  analytics.track('Admin Verification Action', {
    entityType,
    action, // 'verify' or 'revoke'
    success,
    timestamp: new Date().toISOString()
  });
};
```

---

This cleaned API provides a streamlined, efficient approval workflow perfect for your MVP while maintaining all necessary functionality and security measures.