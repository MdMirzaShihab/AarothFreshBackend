# Business Entity Verification System

## Overview

The verification system ensures that vendors and restaurant users cannot perform critical business operations until their **business entities** (vendor business or restaurant) are verified by administrators. This maintains marketplace quality and security by verifying businesses, not individual users.

**🔧 SYSTEM UNIFIED**: The approval system has been consolidated to use business entity verification only. User-level approval fields have been removed and all verification logic now operates at the business level with atomic transactions.

## How It Works

### Business Entity States

1. **Unverified** (Default): Business registered but not yet verified
   - All users can browse the platform
   - Users can view their profiles
   - Vendors cannot create listings until business is verified
   - Restaurant users cannot place orders until restaurant is verified

2. **Verified**: Business can access all platform features
   - **Vendor Business Verified**: All vendor users can create, update, and delete listings
   - **Restaurant Verified**: All restaurant users (owner + managers) can place orders

3. **Inactive**: Business deactivated by admin
   - Users can view deactivation reason
   - Can contact admin for assistance

### Access Control Matrix

| Role | Business Unverified | Business Verified | Business Inactive |
|------|---------------------|-------------------|-------------------|
| **Vendor** | Browse only | Full listings management | View-only + contact admin |
| **Restaurant Owner** | Browse only | Full order placement | View-only + contact admin |
| **Restaurant Manager** | Browse only | Full order placement | View-only + contact admin |
| **Admin** | Full access | Full access | Full access |

### Key Benefits of Business-Entity Verification

1. **Team Access**: When a restaurant is verified, ALL its managers can immediately place orders
2. **Business Focus**: Verification applies to the business entity, not individual employees
3. **Scalability**: Adding new restaurant managers doesn't require separate approvals
4. **Logical Structure**: Aligns with real business operations where the business gets verified, not each employee

## Implementation Details

### Files Modified

1. **middleware/approval.js** (NEW)
   - `requireApproval()`: General approval checking middleware
   - `requireVendorApproval()`: Vendor-specific approval checks
   - `requireRestaurantApproval()`: Restaurant-specific approval checks
   - `addApprovalStatus()`: Adds approval info to responses

2. **middleware/auth.js** (UPDATED)
   - Added account status checks (active, deleted)
   - Added `authorizeApproved()` middleware for approval-aware authorization

3. **controllers/authController.js** (UPDATED)
   - Added `getUserStatus()` endpoint for approval status and capabilities

4. **controllers/listingsController.js** (UPDATED)
   - Added approval checks to create, update, and delete operations

5. **controllers/ordersController.js** (UPDATED)
   - Added approval checks to order placement

6. **routes/auth.js** (UPDATED)
   - Added `GET /api/v1/auth/status` route

### New API Endpoints

#### Get User Status
```
GET /api/v1/auth/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "+8801234567890",
      "role": "vendor",
      "isActive": true
    },
    "businessVerification": {
      "isVerified": false,
      "businessType": "vendor business",
      "businessName": "Fresh Produce Co",
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
      "reason": "vendor business \"Fresh Produce Co\" is not verified"
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
        "businessName": "Fresh Produce Co",
        "tradeLicenseNo": "TL123456",
        "isVerified": false,
        "verificationDate": null,
        "isActive": true,
        "address": {
          "street": "123 Market St",
          "city": "Dhaka",
          "state": "Dhaka",
          "zipCode": "1000"
        }
      }
    }
  }
}
```

### Error Messages

When users from unverified businesses try to perform restricted actions, they receive clear error messages:

**Unverified Vendor (trying to create listing):**
```json
{
  "success": false,
  "error": "Your vendor business \"Fresh Produce Co\" is not verified. You cannot create listings until your business is verified by admin."
}
```

**Unverified Restaurant (trying to place order):**
```json
{
  "success": false,
  "error": "Your restaurant \"Green Kitchen\" is not verified. You cannot place orders until your restaurant is verified by admin."
}
```

**Restaurant Manager (trying to place order for unverified restaurant):**
```json
{
  "success": false,
  "error": "Your restaurant \"Green Kitchen\" is not verified. You cannot place orders until your restaurant is verified by admin."
}
```

## Admin Workflow

### Available Admin Endpoints

#### **Preferred Business Verification Endpoints** ⭐

1. **Toggle Vendor Verification** (Atomic Transaction)
   ```
   PUT /api/v1/admin/vendors/:id/verification
   Body: { "isVerified": true/false, "reason": "optional" }
   ```

2. **Toggle Restaurant Verification** (Atomic Transaction)
   ```
   PUT /api/v1/admin/restaurants/:id/verification
   Body: { "isVerified": true/false, "reason": "optional" }
   ```

3. **Reset Vendor Status**
   ```
   PUT /api/v1/admin/approvals/vendor/:id/reset
   Body: { "reason": "required" }
   ```

4. **Reset Restaurant Status**
   ```
   PUT /api/v1/admin/approvals/restaurant/:id/reset
   Body: { "reason": "required" }
   ```

#### **Legacy Endpoints** (Backward Compatibility)

1. **Get Pending Approvals**
   ```
   GET /api/v1/admin/approvals?type=vendors
   GET /api/v1/admin/approvals?type=restaurants
   ```

2. **Legacy Approve Vendor** (Redirects to Business Verification)
   ```
   PUT /api/v1/admin/approvals/vendor/:id/approve
   ```

3. **Legacy Reject Vendor** (Redirects to Business Verification)
   ```
   PUT /api/v1/admin/approvals/vendor/:id/reject
   ```

4. **Legacy Approve Restaurant** (Redirects to Business Verification)
   ```
   PUT /api/v1/admin/approvals/restaurant/:id/approve
   ```

5. **Legacy Reject Restaurant** (Redirects to Business Verification)
   ```
   PUT /api/v1/admin/approvals/restaurant/:id/reject
   ```

## Frontend Integration

### Checking User Capabilities

```javascript
// Get user status
const response = await fetch('/api/v1/auth/status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();

// Check capabilities based on business verification
if (data.capabilities.canCreateListings) {
  // Show "Create Listing" button (vendor business is verified)
} else {
  // Show verification pending message
  console.log(data.restrictions.reason);
  console.log(data.nextSteps);
}

// For restaurant managers, they inherit restaurant verification status
if (data.capabilities.canPlaceOrders) {
  // Show "Place Order" button (restaurant is verified)
} else if (data.user.role === 'restaurantManager') {
  // Show message that restaurant needs verification
  console.log(`Restaurant "${data.businessVerification.businessName}" needs verification`);
}
```

### Handling Business Verification Status

```javascript
if (data.businessVerification.isVerified) {
  // Business is verified - enable all features
  enableAllFeatures();
  showVerifiedBadge(data.businessVerification.businessName);
} else {
  // Business not verified - show restrictions
  showVerificationPendingMessage({
    businessType: data.businessVerification.businessType,
    businessName: data.businessVerification.businessName,
    nextSteps: data.nextSteps,
    userRole: data.user.role
  });
}

// Special handling for restaurant managers
if (data.user.role === 'restaurantManager') {
  if (data.businessVerification.isVerified) {
    showMessage(`You can manage orders for verified restaurant "${data.businessVerification.businessName}"`);
  } else {
    showMessage(`Restaurant "${data.businessVerification.businessName}" needs admin verification before you can place orders`);
  }
}
```

## Security Features

1. **Business Verification Validation**: All critical operations check business entity verification status
2. **Audit Trail**: All verification actions are logged in AuditLog
3. **Entity-based Access**: Verification applies to business entities, not individual users
4. **Role-based Access**: Admin users bypass verification checks
5. **Clear Error Messages**: Users understand why their business is restricted

## Benefits

1. **Quality Control**: Ensures only verified businesses can transact
2. **Security**: Prevents unauthorized listing creation and order placement
3. **Team Efficiency**: All team members (restaurant managers) inherit business verification status
4. **Business Logic**: Aligns with real-world business operations
5. **User Experience**: Clear business status visibility and next steps
6. **Compliance**: Audit trail for all verification decisions
7. **Scalability**: Middleware-based system easy to extend
8. **Logical Structure**: Verification at business entity level, not user level

## Future Enhancements

1. **Email Notifications**: Automatic emails for approval status changes
2. **Document Upload**: Requirement for business documents
3. **Bulk Approval**: Admin tools for bulk approval operations
4. **Re-application Process**: Streamlined process for rejected users
5. **Approval Workflows**: Multi-step approval with different admin levels