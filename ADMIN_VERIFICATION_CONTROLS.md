# Admin Verification Controls

## Overview

Comprehensive admin controls for managing business verification status with full state transition capabilities. Admins can now control all verification states and transitions for both vendors and restaurants.

## Available Admin Controls

### 🎯 **Complete State Transition Matrix**

| Current Status | Available Actions | New Status | Endpoint |
|---------------|------------------|------------|----------|
| **Pending** | Approve | Approved | `PUT /api/v1/admin/approvals/vendor/:id/approve` |
| **Pending** | Reject | Rejected | `PUT /api/v1/admin/approvals/vendor/:id/reject` |
| **Approved** | Revoke Verification | Pending | `PUT /api/v1/admin/vendors/:id/verification` |
| **Approved** | Reset to Pending | Pending | `PUT /api/v1/admin/approvals/vendor/:id/reset` |
| **Rejected** | Reset to Pending | Pending | `PUT /api/v1/admin/approvals/vendor/:id/reset` |
| **Rejected** | Direct Approve | Approved | `PUT /api/v1/admin/vendors/:id/verification` |

## New Admin Endpoints

### 1. **Direct Verification Toggle** (Most Powerful)

#### Toggle Vendor Verification
```
PUT /api/v1/admin/vendors/:id/verification
```

**Request Body:**
```json
{
  "isVerified": true,    // true to verify, false to revoke
  "reason": "Business documents approved and trade license verified"
}
```

**What it does:**
- Directly sets `vendor.isVerified = true/false`
- Updates ALL vendor users' `approvalStatus` accordingly
- Sets verification date or clears it
- Requires reason when revoking verification

#### Toggle Restaurant Verification
```
PUT /api/v1/admin/restaurants/:id/verification
```

**Request Body:**
```json
{
  "isVerified": false,
  "reason": "Trade license expired - verification revoked pending renewal"
}
```

**What it does:**
- Directly sets `restaurant.isVerified = true/false` 
- Updates ALL restaurant users (owner + managers) `approvalStatus`
- Affects all team members at once

### 2. **Status Reset to Pending**

#### Reset Vendor to Pending
```
PUT /api/v1/admin/approvals/vendor/:id/reset
```

**Request Body:**
```json
{
  "reason": "Re-reviewing application due to updated business documents"
}
```

**What it does:**
- Changes `approved` or `rejected` → `pending`
- Clears previous approval/rejection data
- Allows fresh re-evaluation

#### Reset Restaurant to Pending
```
PUT /api/v1/admin/approvals/restaurant/:id/reset
```

**What it does:**
- Resets ALL users for the restaurant to pending
- Clears restaurant verification
- Allows complete re-evaluation

## Admin Control Scenarios

### 🔄 **Scenario 1: Revoke Verification from Approved Business**
```bash
# Business was approved but violated terms
PUT /api/v1/admin/vendors/vendor_id/verification
{
  "isVerified": false,
  "reason": "Violation of marketplace terms - selling expired products"
}
```

**Result:**
- ✅ Vendor immediately loses verification 
- ✅ All vendor users lose listing/order capabilities
- ✅ Audit trail created with reason

### 🔄 **Scenario 2: Allow Rejected Business to Re-apply**
```bash
# Business fixed issues, allow re-application
PUT /api/v1/admin/approvals/vendor/user_id/reset
{
  "reason": "Business owner updated trade license - allow re-evaluation"
}
```

**Result:**
- ✅ Status changes from `rejected` → `pending`
- ✅ Clears rejection reason
- ✅ Business can be re-evaluated fresh

### 🔄 **Scenario 3: Direct Approval After Review**
```bash
# Skip pending status, directly verify
PUT /api/v1/admin/vendors/vendor_id/verification
{
  "isVerified": true,
  "reason": "Expedited verification - premium business partner"
}
```

**Result:**
- ✅ Business immediately verified
- ✅ All users get instant access
- ✅ Bypasses normal approval workflow

### 🔄 **Scenario 4: Restaurant Manager Team Control**
```bash
# Verify restaurant - affects owner + all managers
PUT /api/v1/admin/restaurants/restaurant_id/verification
{
  "isVerified": true,
  "reason": "Restaurant fully verified - all staff can place orders"
}
```

**Result:**
- ✅ Restaurant owner can place orders
- ✅ ALL restaurant managers can place orders
- ✅ Team-based verification in effect

## Advanced Admin Features

### 1. **Bulk State Changes**
Admins can change verification for multiple businesses by calling endpoints in sequence or using batch operations.

### 2. **Audit Trail**
Every verification change is logged with:
- Admin who made the change
- Timestamp of change
- Reason for change
- Previous and new status
- Number of affected users

### 3. **Impact Tracking**
```json
{
  "metadata": {
    "oldStatus": false,
    "newStatus": true,
    "affectedUsers": 3
  }
}
```

### 4. **Validation and Security**
- Reason required for all negative actions (reject, revoke)
- Boolean validation for verification status
- MongoDB ID validation for all parameters
- Admin-only access with audit logging

## Frontend Admin Interface Integration

### Status Display
```javascript
// Show current business verification status
if (business.isVerified) {
  showVerifiedBadge();
  enableActions(['revoke', 'reset']);
} else {
  showPendingBadge();
  enableActions(['verify', 'approve']);
}
```

### Action Buttons
```javascript
// Comprehensive admin actions
const adminActions = [
  { label: 'Verify Business', action: 'verify', type: 'success' },
  { label: 'Revoke Verification', action: 'revoke', type: 'danger' },
  { label: 'Reset to Pending', action: 'reset', type: 'warning' },
  { label: 'Approve User', action: 'approve', type: 'primary' },
  { label: 'Reject User', action: 'reject', type: 'danger' }
];
```

## Benefits of Enhanced Controls

1. **Complete Flexibility**: All possible state transitions available
2. **Team Management**: Actions affect entire business teams
3. **Audit Compliance**: Full trail of all verification changes  
4. **Quick Response**: Immediate verification revocation for violations
5. **Re-evaluation**: Easy reset for businesses that fix issues
6. **Bulk Impact**: One action affects all team members
7. **Security**: Proper validation and reason tracking

## Migration from Basic Approval

The existing basic approval endpoints still work:
- `PUT /api/v1/admin/approvals/vendor/:id/approve` 
- `PUT /api/v1/admin/approvals/vendor/:id/reject`

But the new verification controls provide much more comprehensive business entity management.

## Future Enhancements

1. **Bulk Verification**: Handle multiple businesses at once
2. **Conditional Verification**: Time-limited or conditional approvals
3. **Verification Levels**: Different levels of verification (basic, premium, etc.)
4. **Automated Verification**: Integration with external verification services
5. **Notification System**: Automatic emails on status changes