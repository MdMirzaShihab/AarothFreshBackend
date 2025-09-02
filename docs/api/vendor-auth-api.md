# Vendor Authentication & User Management API

**Navigation**: [← Overview](./vendor-interface-overview.md) | [Dashboard API →](./vendor-dashboard-api.md)

This document covers authentication and user management endpoints for vendors.

## Base URL
All endpoints are prefixed with: `/api/v1`

---

## Authentication Endpoints

### 1. Login

**Endpoint**: `POST /auth/login`  
**Description**: Authenticate vendor with phone number and password  
**Authentication**: None (public endpoint)

#### Request Body
```json
{
  "phone": "+8801234567890",
  "password": "securePassword123"
}
```

#### Field Validation
- `phone` (required, string): Valid phone number with country code
- `password` (required, string, min: 6): User password

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "name": "John Doe",
      "phone": "+8801234567890",
      "email": "john@example.com",
      "role": "vendor",
      "isApproved": true,
      "vendor": {
        "id": "64a7b8c9d1e2f3a4b5c6d7e9",
        "businessName": "Fresh Vegetables Ltd",
        "businessType": "wholesale",
        "status": "active"
      }
    },
    "expiresIn": "24h"
  }
}
```

#### Error Responses
```json
// Invalid credentials
{
  "success": false,
  "error": "Invalid phone number or password",
  "errorCode": "INVALID_CREDENTIALS"
}

// Account not approved
{
  "success": false,
  "error": "Account pending approval",
  "errorCode": "ACCOUNT_PENDING"
}

// Account suspended
{
  "success": false,
  "error": "Account has been suspended",
  "errorCode": "ACCOUNT_SUSPENDED"
}
```

---

### 2. Register

**Endpoint**: `POST /auth/register`  
**Description**: Register new vendor account  
**Authentication**: None (public endpoint)

#### Request Body
```json
{
  "name": "John Doe",
  "phone": "+8801234567890",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "vendor",
  "vendorInfo": {
    "businessName": "Fresh Vegetables Ltd",
    "businessType": "wholesale",
    "description": "Premium fresh vegetables supplier",
    "address": {
      "street": "123 Main Street",
      "city": "Dhaka",
      "state": "Dhaka",
      "zipCode": "1000",
      "country": "Bangladesh"
    },
    "contactInfo": {
      "businessPhone": "+8801234567891",
      "businessEmail": "business@freshveggies.com",
      "website": "https://freshveggies.com"
    }
  }
}
```

#### Field Validation
- `name` (required, string, 2-100 chars): Full name
- `phone` (required, string): Unique phone with country code
- `email` (optional, string): Valid email address
- `password` (required, string, min: 6): Strong password
- `role` (required, string): Must be "vendor"
- `vendorInfo.businessName` (required, string, 2-200 chars): Business name
- `vendorInfo.businessType` (required, enum): `retail`, `wholesale`, `farmer`, `distributor`

#### Success Response (201)
```json
{
  "success": true,
  "data": {
    "message": "Vendor account created successfully. Please wait for admin approval.",
    "userId": "64a7b8c9d1e2f3a4b5c6d7e8",
    "vendorId": "64a7b8c9d1e2f3a4b5c6d7e9",
    "status": "pending_approval"
  }
}
```

#### Error Responses
```json
// Phone already exists
{
  "success": false,
  "error": "Phone number already registered",
  "errorCode": "PHONE_EXISTS"
}

// Email already exists
{
  "success": false,
  "error": "Email already registered",
  "errorCode": "EMAIL_EXISTS"
}

// Validation error
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "phone": "Phone number is required",
    "vendorInfo.businessName": "Business name is required"
  }
}
```

---

### 3. Refresh Token

**Endpoint**: `POST /auth/refresh`  
**Description**: Get new access token using refresh token  
**Authentication**: Refresh Token

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

---

### 4. Logout

**Endpoint**: `POST /auth/logout`  
**Description**: Invalidate current session  
**Authentication**: Bearer Token

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### 5. Forgot Password

**Endpoint**: `POST /auth/forgot-password`  
**Description**: Request password reset  
**Authentication**: None

#### Request Body
```json
{
  "phone": "+8801234567890"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Password reset instructions sent",
    "resetTokenSent": true
  }
}
```

---

### 6. Reset Password

**Endpoint**: `POST /auth/reset-password`  
**Description**: Reset password with token  
**Authentication**: None

#### Request Body
```json
{
  "resetToken": "abc123def456",
  "newPassword": "newSecurePassword123"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

## User Profile Management

### 7. Get Current User

**Endpoint**: `GET /auth/me`  
**Description**: Get current authenticated user profile  
**Authentication**: Bearer Token

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "name": "John Doe",
      "phone": "+8801234567890",
      "email": "john@example.com",
      "role": "vendor",
      "isApproved": true,
      "profileImage": "https://cdn.aarothfresh.com/profiles/johndoe.jpg",
      "createdAt": "2023-12-01T10:30:00.000Z",
      "lastLoginAt": "2023-12-15T09:20:00.000Z",
      "vendor": {
        "id": "64a7b8c9d1e2f3a4b5c6d7e9",
        "businessName": "Fresh Vegetables Ltd",
        "businessType": "wholesale",
        "status": "active",
        "description": "Premium fresh vegetables supplier",
        "rating": {
          "average": 4.8,
          "count": 156
        },
        "verificationStatus": "verified",
        "address": {
          "street": "123 Main Street",
          "city": "Dhaka",
          "state": "Dhaka",
          "zipCode": "1000",
          "country": "Bangladesh",
          "coordinates": {
            "latitude": 23.8103,
            "longitude": 90.4125
          }
        },
        "contactInfo": {
          "businessPhone": "+8801234567891",
          "businessEmail": "business@freshveggies.com",
          "website": "https://freshveggies.com"
        },
        "businessHours": {
          "monday": { "open": "08:00", "close": "18:00" },
          "tuesday": { "open": "08:00", "close": "18:00" },
          "wednesday": { "open": "08:00", "close": "18:00" },
          "thursday": { "open": "08:00", "close": "18:00" },
          "friday": { "open": "08:00", "close": "18:00" },
          "saturday": { "open": "08:00", "close": "16:00" },
          "sunday": { "closed": true }
        },
        "documents": {
          "businessLicense": "https://cdn.aarothfresh.com/docs/license_123.pdf",
          "tradeLicense": "https://cdn.aarothfresh.com/docs/trade_123.pdf"
        },
        "paymentInfo": {
          "bankName": "ABC Bank",
          "accountName": "Fresh Vegetables Ltd",
          "accountNumber": "1234567890",
          "routingNumber": "123456789"
        },
        "statistics": {
          "totalOrders": 1456,
          "totalRevenue": 125000.50,
          "averageRating": 4.8,
          "completionRate": 96.5,
          "responseTime": "2.3h"
        },
        "createdAt": "2023-06-01T10:00:00.000Z",
        "updatedAt": "2023-12-15T09:20:00.000Z"
      }
    }
  }
}
```

---

### 8. Update Profile

**Endpoint**: `PUT /auth/profile`  
**Description**: Update user profile information  
**Authentication**: Bearer Token

#### Request Body
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com",
  "profileImage": "base64encodedimage...", // or URL
  "vendorInfo": {
    "businessName": "Fresh Vegetables Ltd",
    "description": "Premium fresh vegetables supplier with 10 years experience",
    "address": {
      "street": "123 New Street",
      "city": "Dhaka",
      "state": "Dhaka",
      "zipCode": "1000",
      "country": "Bangladesh",
      "coordinates": {
        "latitude": 23.8103,
        "longitude": 90.4125
      }
    },
    "contactInfo": {
      "businessPhone": "+8801234567891",
      "businessEmail": "business@freshveggies.com",
      "website": "https://freshveggies.com"
    },
    "businessHours": {
      "monday": { "open": "08:00", "close": "18:00" },
      "tuesday": { "open": "08:00", "close": "18:00" },
      "wednesday": { "open": "08:00", "close": "18:00" },
      "thursday": { "open": "08:00", "close": "18:00" },
      "friday": { "open": "08:00", "close": "18:00" },
      "saturday": { "open": "08:00", "close": "16:00" },
      "sunday": { "closed": true }
    }
  }
}
```

#### Field Validation
- `name` (optional, string, 2-100 chars): Full name
- `email` (optional, string): Valid email
- `vendorInfo.businessName` (optional, string, 2-200 chars): Business name
- `vendorInfo.businessHours` (optional, object): Valid time format (HH:MM)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "user": {
      // Updated user object (same structure as GET /auth/me)
    }
  }
}
```

---

### 9. Change Password

**Endpoint**: `PUT /auth/change-password`  
**Description**: Change current password  
**Authentication**: Bearer Token

#### Request Body
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

#### Field Validation
- `currentPassword` (required, string): Current password
- `newPassword` (required, string, min: 6): New password

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Current password is incorrect",
  "errorCode": "INVALID_PASSWORD"
}
```

---

### 10. Upload Documents

**Endpoint**: `POST /auth/upload-documents`  
**Description**: Upload business verification documents  
**Authentication**: Bearer Token  
**Content-Type**: `multipart/form-data`

#### Request Body (Form Data)
```
businessLicense: File (PDF, max 10MB)
tradeLicense: File (PDF, max 10MB)
taxCertificate: File (PDF, max 10MB) [optional]
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Documents uploaded successfully",
    "documents": {
      "businessLicense": "https://cdn.aarothfresh.com/docs/license_123.pdf",
      "tradeLicense": "https://cdn.aarothfresh.com/docs/trade_123.pdf",
      "taxCertificate": "https://cdn.aarothfresh.com/docs/tax_123.pdf"
    },
    "verificationStatus": "pending_review"
  }
}
```

---

### 11. Update Payment Information

**Endpoint**: `PUT /auth/payment-info`  
**Description**: Update bank account and payment details  
**Authentication**: Bearer Token

#### Request Body
```json
{
  "bankName": "XYZ Bank",
  "accountName": "Fresh Vegetables Ltd",
  "accountNumber": "9876543210",
  "routingNumber": "987654321",
  "accountType": "business", // business or personal
  "paymentMethods": ["bank_transfer", "mobile_banking"]
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Payment information updated successfully",
    "paymentInfo": {
      "bankName": "XYZ Bank",
      "accountName": "Fresh Vegetables Ltd",
      "accountNumber": "****3210", // Masked for security
      "accountType": "business",
      "verificationStatus": "pending",
      "paymentMethods": ["bank_transfer", "mobile_banking"]
    }
  }
}
```

---

### 12. Delete Account

**Endpoint**: `DELETE /auth/account`  
**Description**: Request account deletion  
**Authentication**: Bearer Token

#### Request Body
```json
{
  "password": "currentPassword123",
  "reason": "No longer needed" // Optional
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Account deletion request submitted successfully",
    "status": "pending_deletion",
    "deletionDate": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Error Codes Reference

| Error Code | Description |
|------------|-------------|
| `INVALID_CREDENTIALS` | Invalid phone/password combination |
| `ACCOUNT_PENDING` | Account awaiting admin approval |
| `ACCOUNT_SUSPENDED` | Account has been suspended |
| `ACCOUNT_DEACTIVATED` | Account has been deactivated |
| `PHONE_EXISTS` | Phone number already registered |
| `EMAIL_EXISTS` | Email address already registered |
| `INVALID_TOKEN` | JWT token is invalid or expired |
| `TOKEN_EXPIRED` | JWT token has expired |
| `REFRESH_TOKEN_INVALID` | Refresh token is invalid |
| `INVALID_PASSWORD` | Current password is incorrect |
| `WEAK_PASSWORD` | Password doesn't meet security requirements |
| `VALIDATION_ERROR` | Input validation failed |
| `FILE_TOO_LARGE` | Uploaded file exceeds size limit |
| `INVALID_FILE_TYPE` | Unsupported file format |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

---

**Navigation**: [← Overview](./vendor-interface-overview.md) | [Dashboard API →](./vendor-dashboard-api.md)