# Backend Migration Guide: Restaurant → Multi-Buyer System

**Version:** 2.0
**Migration Date:** November 18, 2024
**Status:** ✅ Completed and Deployed

---

## 📋 Executive Summary

The Aaroth Fresh backend has been migrated from a **restaurant-only buyer system** to a **unified multi-buyer system** that supports four types of buyers:

1. **Restaurants** - Food service establishments
2. **Corporate Companies** - Office/corporate bulk buyers
3. **Supershops** - Retail chain stores
4. **Catering Services** - Event and catering businesses

All existing restaurant data has been successfully migrated to the new `Buyer` model with `buyerType='restaurant'`. The system maintains full backward compatibility while adding support for new buyer types.

---

## 🔑 Key Changes Summary

### 1. **Model Changes**
- ❌ `Restaurant` model → ✅ `Buyer` model (unified)
- New field: `buyerType` (enum: restaurant, corporate, supershop, catering)
- New field: `typeSpecificData` (buyer-type specific fields)

### 2. **Field Name Changes**
- ❌ `restaurantId` → ✅ `buyerId`
- ❌ `restaurantOwner` → ✅ `buyerOwner`
- ❌ `restaurantManager` → ✅ `buyerManager`

### 3. **API Route Changes**
- ❌ `/api/v1/restaurant-dashboard/*` → ✅ `/api/v1/buyer-dashboard/*`
- ❌ `/api/v1/admin/restaurants/*` → ✅ `/api/v1/admin/buyers/*`

### 4. **User Roles**
- ❌ `restaurantOwner` → ✅ `buyerOwner`
- ❌ `restaurantManager` → ✅ `buyerManager`

---

## 📊 Data Model Changes

### Buyer Model (New Unified Model)

```typescript
interface Buyer {
  _id: ObjectId;
  name: string;                    // Business name
  ownerName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    area: string;
    postalCode: string;
  };
  logo?: string;                   // Cloudinary URL
  tradeLicenseNo: string;

  // NEW: Buyer type discriminator
  buyerType: 'restaurant' | 'corporate' | 'supershop' | 'catering';

  // NEW: Type-specific data (dynamic based on buyerType)
  typeSpecificData: {
    // For buyerType='restaurant'
    cuisineType?: string[];        // ['Italian', 'Chinese']
    seatingCapacity?: number;
    operatingHours?: {
      monday?: { open: string; close: string; };
      tuesday?: { open: string; close: string; };
      // ... other days
    };

    // For buyerType='corporate'
    industry?: string;             // 'IT', 'Finance', 'Healthcare'
    employeeCount?: number;
    departmentBudgets?: Array<{
      department: string;
      budgetLimit: number;
    }>;

    // For buyerType='supershop'
    chainName?: string;            // 'Shopno', 'Meena Bazar'
    branchCount?: number;
    retailCategory?: string[];     // ['Grocery', 'Electronics']

    // For buyerType='catering'
    eventTypes?: string[];         // ['Wedding', 'Corporate Event']
    averageGuestCount?: number;
    serviceRadius?: number;        // in km
  };

  // Verification
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationDate?: Date;
  statusUpdatedBy?: ObjectId;
  statusUpdatedAt?: Date;
  adminNotes?: string;

  // Management
  managers: ObjectId[];            // Array of User IDs
  createdBy: ObjectId;

  // Status flags
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;
  deletionReason?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual field (computed)
  displayType: string;             // 'Restaurant', 'Corporate Company', etc.
}
```

### User Model Changes

```typescript
interface User {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;                // Hashed

  // CHANGED: Role enum values
  role: 'admin' | 'vendor' | 'buyerOwner' | 'buyerManager';

  // CHANGED: Field name
  buyerId?: ObjectId;              // Reference to Buyer (was restaurantId)
  vendorId?: ObjectId;             // Unchanged

  profileImage?: string;
  isActive: boolean;
  isDeleted: boolean;
  lastLogin?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

### Order Model Changes

```typescript
interface Order {
  _id: ObjectId;
  orderNumber: string;

  // CHANGED: Field name
  buyerId: ObjectId;               // Reference to Buyer (was restaurantId)
  vendorId: ObjectId;              // Unchanged

  placedBy: ObjectId;              // User who placed the order
  approvedBy?: ObjectId;

  items: Array<{
    listingId: ObjectId;
    productId: ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
    unit: string;
    // ... other fields
  }>;

  status: 'pending_approval' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'cancelled';
  totalAmount: number;

  deliveryInfo?: {
    address: string;
    contactPerson: string;
    contactPhone: string;
    deliveryDate?: Date;
    deliveryTime?: string;
  };

  notes?: {
    buyer?: string;                // Was 'restaurant'
    vendor?: string;
    internal?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### Budget Model Changes

```typescript
interface Budget {
  _id: ObjectId;

  // CHANGED: Field name
  buyerId: ObjectId;               // Reference to Buyer (was restaurantId)

  budgetPeriod: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number;                  // 1-12 for monthly
  quarter?: number;                // 1-4 for quarterly

  totalBudgetLimit: number;
  currentSpending: number;

  categoryLimits?: Array<{
    categoryId: ObjectId;
    budgetLimit: number;
    currentSpending: number;
  }>;

  status: 'draft' | 'active' | 'expired' | 'archived';
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔄 API Endpoint Changes

### Authentication Endpoints

#### **POST /api/v1/auth/register**

**Request Changes:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+8801234567890",

  // CHANGED: Role value
  "role": "buyerOwner",                    // Was "restaurantOwner"

  // CHANGED: Field name
  "businessName": "My Business",            // Was "restaurantName"

  // NEW: Required for buyer registration
  "buyerType": "restaurant",                // NEW FIELD (required)
  // Options: "restaurant", "corporate", "supershop", "catering"

  // NEW: Optional type-specific data
  "typeSpecificData": {                     // NEW FIELD (optional)
    // For restaurant
    "cuisineType": ["Italian", "Chinese"],
    "seatingCapacity": 50,
    "operatingHours": {
      "monday": { "open": "10:00", "close": "22:00" }
    }

    // For corporate
    // "industry": "IT",
    // "employeeCount": 500

    // For supershop
    // "chainName": "Shopno",
    // "branchCount": 10

    // For catering
    // "eventTypes": ["Wedding", "Corporate Event"],
    // "averageGuestCount": 200
  },

  "ownerName": "John Doe",
  "address": {
    "street": "123 Main St",
    "city": "Dhaka",
    "area": "Gulshan",
    "postalCode": "1212"
  },
  "tradeLicenseNo": "TL123456"
}
```

**Response Changes:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+8801234567890",
    "role": "buyerOwner",                   // CHANGED: Was "restaurantOwner"
    "buyerId": {                            // CHANGED: Was "restaurantId"
      "_id": "456",
      "name": "My Business",
      "buyerType": "restaurant",            // NEW FIELD
      "verificationStatus": "pending",
      "typeSpecificData": {                 // NEW FIELD
        "cuisineType": ["Italian", "Chinese"],
        "seatingCapacity": 50
      },
      "displayType": "Restaurant",          // NEW FIELD (virtual)
      "email": "john@example.com",
      "phone": "+8801234567890",
      "address": { /* ... */ },
      "isActive": true
    }
  }
}
```

#### **POST /api/v1/auth/login**

**Request:** (Unchanged)
```json
{
  "phone": "+8801234567890",
  "password": "SecurePass123"
}
```

**Response Changes:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+8801234567890",
    "role": "buyerOwner",                   // CHANGED: Was "restaurantOwner"
    "buyerId": {                            // CHANGED: Was "restaurantId"
      "_id": "456",
      "name": "My Business",
      "buyerType": "restaurant",            // NEW FIELD
      "verificationStatus": "approved",
      "typeSpecificData": { /* ... */ },    // NEW FIELD
      "displayType": "Restaurant"           // NEW FIELD
    }
  }
}
```

#### **GET /api/v1/auth/me**

**Response Changes:** Same as login response above.

#### **GET /api/v1/auth/status**

**Response Changes:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "name": "John Doe",
      "role": "buyerOwner"                  // CHANGED: Was "restaurantOwner"
    },
    "businessVerification": {
      "verificationStatus": "approved",
      "businessType": "restaurant",         // NEW FIELD
      "businessName": "My Business",
      "verificationDate": "2024-11-18T10:00:00Z",
      "adminNotes": null
    },
    "capabilities": {
      "canCreateListings": false,
      "canPlaceOrders": true,
      "canManageBuyer": true,               // CHANGED: Was "canManageRestaurant"
      "canAccessDashboard": true,
      "canUpdateProfile": true
    },
    "businessInfo": {
      "buyer": {                            // CHANGED: Was "restaurant"
        "id": "456",
        "name": "My Business",
        "buyerType": "restaurant",          // NEW FIELD
        "displayType": "Restaurant",        // NEW FIELD
        "tradeLicenseNo": "TL123456",
        "verificationStatus": "approved",
        "typeSpecificData": { /* ... */ }   // NEW FIELD
      }
    }
  }
}
```

#### **POST /api/v1/auth/create-manager**

**Authorization Change:**
```
// OLD: authorize('restaurantOwner', 'admin')
// NEW: authorize('buyerOwner', 'admin')
```

**Response:** Manager created with `role: 'buyerManager'` and `buyerId` populated.

---

### Dashboard Endpoints

#### **Route Base Path Change**
```
OLD: /api/v1/restaurant-dashboard/*
NEW: /api/v1/buyer-dashboard/*
```

#### **Authorization Change**
All buyer dashboard routes now require:
```
authorize('buyerOwner', 'buyerManager')  // Was: 'restaurantOwner', 'restaurantManager'
```

#### **GET /api/v1/buyer-dashboard/overview**

**Query Parameters:** (Unchanged)
```
?startDate=2024-01-01&endDate=2024-12-31
?period=month  // today, week, month, quarter, year
```

**Response Changes:**
```json
{
  "success": true,
  "data": {
    "buyerId": "456",                       // CHANGED: Was "restaurantId"
    "buyerName": "My Business",             // CHANGED: Was "restaurantName"
    "buyerType": "restaurant",              // NEW FIELD
    "period": {
      "start": "2024-11-01T00:00:00Z",
      "end": "2024-11-30T23:59:59Z"
    },
    "metrics": {
      "totalSpending": 125000,
      "orderCount": 45,
      "averageOrderValue": 2777.78,
      "topCategories": [
        {
          "categoryId": "789",
          "categoryName": "Vegetables",
          "spending": 45000,
          "percentage": 36
        }
      ],
      "spendingTrend": { /* ... */ }
    }
  }
}
```

#### **GET /api/v1/buyer-dashboard/spending**
#### **GET /api/v1/buyer-dashboard/orders**
#### **GET /api/v1/buyer-dashboard/vendors**
#### **GET /api/v1/buyer-dashboard/budget**
#### **GET /api/v1/buyer-dashboard/inventory-planning**
#### **GET /api/v1/buyer-dashboard/order-history**

All follow the same pattern:
- ✅ Same query parameters
- ✅ Authorization updated to `buyerOwner`/`buyerManager`
- ✅ Response includes `buyerId` instead of `restaurantId`
- ✅ Response may include `buyerType` field

---

### Order Endpoints

#### **POST /api/v1/orders**

**Authorization Change:**
```
authorize('buyerOwner', 'buyerManager')  // Was: 'restaurantOwner', 'restaurantManager'
```

**Request:** (Unchanged structure, but processed differently)
```json
{
  "items": [
    {
      "listingId": "listing123",
      "quantity": 10
    }
  ],
  "deliveryInfo": {
    "address": "123 Main St",
    "contactPerson": "John Doe",
    "contactPhone": "+8801234567890",
    "deliveryDate": "2024-11-20",
    "deliveryTime": "10:00-12:00"
  },
  "notes": "Please deliver fresh produce"
}
```

**Response Changes:**
```json
{
  "success": true,
  "data": {
    "_id": "order123",
    "orderNumber": "ORD-2024-001",
    "buyerId": "456",                       // CHANGED: Was "restaurantId"
    "vendorId": "vendor789",
    "placedBy": "user123",
    "items": [ /* ... */ ],
    "status": "pending_approval",
    "totalAmount": 5500,
    "notes": {
      "buyer": "Please deliver fresh produce"  // CHANGED: Was "restaurant"
    },
    "createdAt": "2024-11-18T10:00:00Z"
  }
}
```

#### **GET /api/v1/orders**

**Authorization:** Works for all roles (admin, vendor, buyerOwner, buyerManager)

**Response:** Returns orders filtered by user role, with `buyerId` field.

#### **GET /api/v1/orders/:id**

**Response Changes:**
```json
{
  "success": true,
  "data": {
    "_id": "order123",
    "orderNumber": "ORD-2024-001",
    "buyerId": {                            // CHANGED: Was "restaurantId"
      "_id": "456",
      "name": "My Business",
      "buyerType": "restaurant",            // NEW FIELD
      "phone": "+8801234567890",
      "address": { /* ... */ }
    },
    "vendorId": { /* ... */ },
    "items": [ /* ... */ ],
    "status": "confirmed",
    "totalAmount": 5500
  }
}
```

#### **POST /api/v1/orders/:id/approve**

**Authorization Change:**
```
authorize('buyerOwner')  // Was: 'restaurantOwner'
```

---

### Admin Endpoints

#### **Buyer Management**

**Route Changes:**
```
OLD: /api/v1/admin/restaurants/*
NEW: /api/v1/admin/buyers/*
```

#### **GET /api/v1/admin/buyers**

**Query Parameters:**
```
?status=pending|approved|rejected
?buyerType=restaurant|corporate|supershop|catering  // NEW FILTER
?page=1
&limit=20
&search=name
```

**Response Changes:**
```json
{
  "success": true,
  "count": 50,
  "pagination": { /* ... */ },
  "data": [
    {
      "_id": "456",
      "name": "My Business",
      "buyerType": "restaurant",            // NEW FIELD
      "displayType": "Restaurant",          // NEW FIELD
      "verificationStatus": "approved",
      "ownerName": "John Doe",
      "email": "john@example.com",
      "phone": "+8801234567890",
      "typeSpecificData": {                 // NEW FIELD
        "cuisineType": ["Italian"],
        "seatingCapacity": 50
      },
      "isActive": true,
      "createdAt": "2024-11-01T10:00:00Z"
    }
  ]
}
```

#### **GET /api/v1/admin/buyers/stats**

**Response Changes:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "pending": 20,
      "approved": 120,
      "rejected": 10
    },
    "byType": {                             // NEW FIELD
      "restaurant": 100,
      "corporate": 30,
      "supershop": 15,
      "catering": 5
    },
    "recentRegistrations": [ /* ... */ ],
    "activeCount": 140
  }
}
```

#### **GET /api/v1/admin/buyers/:id**

**Response:** Full buyer object with all fields including `buyerType` and `typeSpecificData`.

#### **PUT /api/v1/admin/buyers/:id**

**Request:** Can update buyer fields including `typeSpecificData`.

#### **POST /api/v1/admin/buyer-owners**

**Request Changes:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "phone": "+8801234567891",
  "businessName": "New Business",           // CHANGED: Was "restaurantName"
  "buyerType": "corporate",                 // NEW FIELD (required)
  "typeSpecificData": {                     // NEW FIELD (optional)
    "industry": "Healthcare",
    "employeeCount": 300
  },
  "ownerName": "Jane Doe",
  "address": { /* ... */ },
  "tradeLicenseNo": "TL789012"
}
```

#### **PUT /api/v1/admin/buyers/:id/verification**

**Request:**
```json
{
  "status": "approved",  // or "rejected", "pending"
  "reason": "Optional rejection reason"
}
```

**Response:** Updated buyer with new verification status.

---

## 🔐 Authorization Changes

### Role Name Changes

Update all role checks in your frontend:

```javascript
// OLD ROLE NAMES
const OLD_ROLES = {
  RESTAURANT_OWNER: 'restaurantOwner',
  RESTAURANT_MANAGER: 'restaurantManager'
};

// NEW ROLE NAMES
const NEW_ROLES = {
  BUYER_OWNER: 'buyerOwner',
  BUYER_MANAGER: 'buyerManager',
  VENDOR: 'vendor',           // Unchanged
  ADMIN: 'admin'              // Unchanged
};
```

### Permission Checks

```javascript
// OLD
const canPlaceOrder = user.role === 'restaurantOwner' || user.role === 'restaurantManager';

// NEW
const canPlaceOrder = user.role === 'buyerOwner' || user.role === 'buyerManager';

// OR BETTER: Use the capabilities from /auth/status endpoint
const canPlaceOrder = authStatus.capabilities.canPlaceOrders;
```

---

## 🎨 UI Display Changes

### Buyer Type Display Names

Map `buyerType` to user-friendly display names:

```javascript
const BUYER_TYPE_LABELS = {
  restaurant: 'Restaurant',
  corporate: 'Corporate Company',
  supershop: 'Supershop',
  catering: 'Catering Service'
};

// Or use the virtual field from backend
const displayName = buyer.displayType; // Already formatted
```

### Type-Specific Fields Display

Show relevant fields based on `buyerType`:

```javascript
// For restaurant
if (buyer.buyerType === 'restaurant') {
  display: buyer.typeSpecificData.cuisineType
  display: buyer.typeSpecificData.seatingCapacity
}

// For corporate
if (buyer.buyerType === 'corporate') {
  display: buyer.typeSpecificData.industry
  display: buyer.typeSpecificData.employeeCount
}

// For supershop
if (buyer.buyerType === 'supershop') {
  display: buyer.typeSpecificData.chainName
  display: buyer.typeSpecificData.branchCount
}

// For catering
if (buyer.buyerType === 'catering') {
  display: buyer.typeSpecificData.eventTypes
  display: buyer.typeSpecificData.averageGuestCount
}
```

---

## ⚠️ Breaking Changes Checklist

### Critical Changes That Require Frontend Updates:

- [ ] **Update all API route paths**
  - `/restaurant-dashboard/*` → `/buyer-dashboard/*`
  - `/admin/restaurants/*` → `/admin/buyers/*`

- [ ] **Update all field references in code**
  - `restaurantId` → `buyerId`
  - `restaurantOwner` → `buyerOwner`
  - `restaurantManager` → `buyerManager`
  - `user.restaurantId` → `user.buyerId`

- [ ] **Update Redux/State Management**
  - Update slice names (restaurantSlice → buyerSlice)
  - Update field names in state
  - Update action creators
  - Update selectors

- [ ] **Update API Service Layer**
  - Rename service files (restaurantService.js → buyerService.js)
  - Update endpoint URLs
  - Update request/response interfaces

- [ ] **Update TypeScript Interfaces**
  - Create new `Buyer` interface
  - Update `User` interface
  - Update `Order` interface
  - Add `BuyerType` enum
  - Add `TypeSpecificData` interface

- [ ] **Update Authorization Guards**
  - Update role checks
  - Update route guards
  - Update permission checks

- [ ] **Update Forms**
  - Add `buyerType` selector to registration form
  - Add conditional `typeSpecificData` fields
  - Update validation schemas

- [ ] **Update UI Components**
  - Update labels ("Restaurant" → "Buyer" or type-specific)
  - Update table headers
  - Update dashboard titles
  - Update breadcrumbs

- [ ] **Update Navigation**
  - Update menu items
  - Update route paths
  - Update sidebar links

---

## 📝 TypeScript Interface Definitions

### Complete Interface Set for Frontend

```typescript
// enums.ts
export enum UserRole {
  ADMIN = 'admin',
  VENDOR = 'vendor',
  BUYER_OWNER = 'buyerOwner',
  BUYER_MANAGER = 'buyerManager'
}

export enum BuyerType {
  RESTAURANT = 'restaurant',
  CORPORATE = 'corporate',
  SUPERSHOP = 'supershop',
  CATERING = 'catering'
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum OrderStatus {
  PENDING_APPROVAL = 'pending_approval',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

// types.ts
export interface Address {
  street: string;
  city: string;
  area: string;
  postalCode: string;
}

export interface OperatingHours {
  monday?: { open: string; close: string; };
  tuesday?: { open: string; close: string; };
  wednesday?: { open: string; close: string; };
  thursday?: { open: string; close: string; };
  friday?: { open: string; close: string; };
  saturday?: { open: string; close: string; };
  sunday?: { open: string; close: string; };
}

export interface RestaurantSpecificData {
  cuisineType?: string[];
  seatingCapacity?: number;
  operatingHours?: OperatingHours;
}

export interface CorporateSpecificData {
  industry?: string;
  employeeCount?: number;
  departmentBudgets?: Array<{
    department: string;
    budgetLimit: number;
  }>;
}

export interface SupershopSpecificData {
  chainName?: string;
  branchCount?: number;
  retailCategory?: string[];
}

export interface CateringSpecificData {
  eventTypes?: string[];
  averageGuestCount?: number;
  serviceRadius?: number;
}

export type TypeSpecificData =
  | RestaurantSpecificData
  | CorporateSpecificData
  | SupershopSpecificData
  | CateringSpecificData;

export interface Buyer {
  _id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: Address;
  logo?: string;
  tradeLicenseNo: string;
  buyerType: BuyerType;
  typeSpecificData: TypeSpecificData;
  verificationStatus: VerificationStatus;
  verificationDate?: string;
  statusUpdatedBy?: string;
  statusUpdatedAt?: string;
  adminNotes?: string;
  managers: string[];
  createdBy: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
  displayType: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  buyerId?: string | Buyer;
  vendorId?: string;
  profileImage?: string;
  isActive: boolean;
  isDeleted: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  listingId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  isPackBased?: boolean;
  numberOfPacks?: number;
  packSize?: number;
  pricePerPack?: number;
  qualityGrade?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  buyerId: string | Buyer;
  vendorId: string;
  placedBy: string | User;
  approvedBy?: string | User;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryInfo?: {
    address: string;
    contactPerson: string;
    contactPhone: string;
    deliveryDate?: string;
    deliveryTime?: string;
  };
  paymentInfo?: {
    method: string;
    status: string;
  };
  notes?: {
    buyer?: string;
    vendor?: string;
    internal?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data: T[];
}
```

---

## 🔨 Frontend Migration Checklist

### Phase 1: Update Constants & Types (Priority: High)
- [ ] Create new TypeScript interfaces for Buyer, User, Order
- [ ] Update role constants (restaurantOwner → buyerOwner)
- [ ] Create BuyerType enum
- [ ] Update all type imports across the app

### Phase 2: Update API Layer (Priority: High)
- [ ] Update API base URLs in config
- [ ] Rename service files (restaurantService → buyerService)
- [ ] Update all endpoint paths in service methods
- [ ] Update request/response payload types
- [ ] Test all API calls

### Phase 3: Update State Management (Priority: High)
- [ ] Update Redux slices (or state management solution)
- [ ] Rename state slices (restaurant → buyer)
- [ ] Update field names in state
- [ ] Update action creators
- [ ] Update selectors
- [ ] Update reducers

### Phase 4: Update Components (Priority: Medium)
- [ ] Update all component prop types
- [ ] Update field references (restaurantId → buyerId)
- [ ] Update role checks in conditional rendering
- [ ] Update form fields and validation
- [ ] Add buyerType selector to registration
- [ ] Add typeSpecificData conditional fields
- [ ] Update table columns and headers
- [ ] Update display labels

### Phase 5: Update Routes & Navigation (Priority: Medium)
- [ ] Update route paths (restaurant-dashboard → buyer-dashboard)
- [ ] Update navigation menu items
- [ ] Update breadcrumbs
- [ ] Update route guards with new roles
- [ ] Test all navigation flows

### Phase 6: Update UI Text & Labels (Priority: Low)
- [ ] Replace "Restaurant" with "Buyer" or dynamic type label
- [ ] Update page titles
- [ ] Update form labels
- [ ] Update button text
- [ ] Update toast/notification messages
- [ ] Update error messages

### Phase 7: Testing (Priority: High)
- [ ] Test registration flow for all buyer types
- [ ] Test login with migrated accounts
- [ ] Test order placement
- [ ] Test dashboard data loading
- [ ] Test admin buyer management
- [ ] Test role-based access control
- [ ] Test all CRUD operations

---

## 📌 Migration Example: Registration Form

### Before (Restaurant Only)

```tsx
// OLD: RestaurantRegistrationForm.tsx
interface FormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'restaurantOwner';
  restaurantName: string;
  ownerName: string;
  address: Address;
  tradeLicenseNo: string;
}

const handleSubmit = async (data: FormData) => {
  const response = await api.post('/auth/register', {
    ...data,
    role: 'restaurantOwner'
  });
};
```

### After (Multi-Buyer Support)

```tsx
// NEW: BuyerRegistrationForm.tsx
interface FormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'buyerOwner';
  businessName: string;                     // CHANGED from restaurantName
  buyerType: BuyerType;                     // NEW FIELD
  ownerName: string;
  address: Address;
  tradeLicenseNo: string;
  typeSpecificData?: TypeSpecificData;      // NEW FIELD
}

const handleSubmit = async (data: FormData) => {
  const response = await api.post('/auth/register', {
    ...data,
    role: 'buyerOwner',                     // CHANGED from restaurantOwner
    buyerType: data.buyerType,              // NEW FIELD
    typeSpecificData: getTypeSpecificData(data.buyerType, data)
  });
};

// Helper to build type-specific data
const getTypeSpecificData = (
  buyerType: BuyerType,
  formData: any
): TypeSpecificData => {
  switch (buyerType) {
    case BuyerType.RESTAURANT:
      return {
        cuisineType: formData.cuisineType || [],
        seatingCapacity: formData.seatingCapacity,
        operatingHours: formData.operatingHours
      };
    case BuyerType.CORPORATE:
      return {
        industry: formData.industry,
        employeeCount: formData.employeeCount
      };
    case BuyerType.SUPERSHOP:
      return {
        chainName: formData.chainName,
        branchCount: formData.branchCount,
        retailCategory: formData.retailCategory || []
      };
    case BuyerType.CATERING:
      return {
        eventTypes: formData.eventTypes || [],
        averageGuestCount: formData.averageGuestCount,
        serviceRadius: formData.serviceRadius
      };
    default:
      return {};
  }
};
```

### Form UI Changes

```tsx
// Add buyer type selector
<FormField>
  <Label>Business Type</Label>
  <Select
    value={buyerType}
    onChange={(e) => setBuyerType(e.target.value as BuyerType)}
  >
    <option value={BuyerType.RESTAURANT}>Restaurant</option>
    <option value={BuyerType.CORPORATE}>Corporate Company</option>
    <option value={BuyerType.SUPERSHOP}>Supershop</option>
    <option value={BuyerType.CATERING}>Catering Service</option>
  </Select>
</FormField>

{/* Conditional fields based on buyer type */}
{buyerType === BuyerType.RESTAURANT && (
  <>
    <FormField>
      <Label>Cuisine Types</Label>
      <MultiSelect
        value={cuisineType}
        onChange={setCuisineType}
        options={['Italian', 'Chinese', 'Indian', 'Continental']}
      />
    </FormField>
    <FormField>
      <Label>Seating Capacity</Label>
      <Input type="number" {...register('seatingCapacity')} />
    </FormField>
  </>
)}

{buyerType === BuyerType.CORPORATE && (
  <>
    <FormField>
      <Label>Industry</Label>
      <Select {...register('industry')}>
        <option value="IT">IT</option>
        <option value="Finance">Finance</option>
        <option value="Healthcare">Healthcare</option>
      </Select>
    </FormField>
    <FormField>
      <Label>Employee Count</Label>
      <Input type="number" {...register('employeeCount')} />
    </FormField>
  </>
)}

{/* Similar for supershop and catering */}
```

---

## 🚀 Deployment Notes

### Database Migration Status
- ✅ All existing restaurants migrated to buyers with `buyerType='restaurant'`
- ✅ All user roles updated (restaurantOwner → buyerOwner)
- ✅ All orders updated (restaurantId → buyerId)
- ✅ Backup created as `restaurants_backup` collection
- ✅ Server tested and verified working

### Backward Compatibility
- ✅ All existing restaurant data preserved
- ✅ Existing user accounts work with new field names
- ✅ Existing orders accessible with buyerId reference
- ⚠️ Frontend MUST be updated - old API paths will not work

### Rollback Plan
If needed, rollback using:
```bash
node scripts/migrate-restaurant-to-buyer.js --rollback
```

---

## 📞 Support & Questions

For any questions about the migration or unclear points in this document, please contact the backend team.

**Migration Completed:** November 18, 2024
**Backend Version:** 2.0
**API Base URL:** `http://localhost:5000/api/v1` (dev) | `https://api.aarothfresh.com/api/v1` (prod)

---

## ✅ Quick Reference

### Field Name Mapping
| Old Field Name | New Field Name | Notes |
|---|---|---|
| `restaurantId` | `buyerId` | In User, Order, Budget models |
| `restaurantOwner` | `buyerOwner` | User role enum value |
| `restaurantManager` | `buyerManager` | User role enum value |
| `restaurantName` | `businessName` | In registration request |
| `Restaurant` | `Buyer` | Model name |

### Route Mapping
| Old Route | New Route |
|---|---|
| `/api/v1/restaurant-dashboard/*` | `/api/v1/buyer-dashboard/*` |
| `/api/v1/admin/restaurants` | `/api/v1/admin/buyers` |
| `/api/v1/admin/restaurants/:id` | `/api/v1/admin/buyers/:id` |
| `/api/v1/admin/restaurant-owners` | `/api/v1/admin/buyer-owners` |
| `/api/v1/admin/restaurant-managers` | `/api/v1/admin/buyer-managers` |

### New Features
- ✨ Support for 4 buyer types (restaurant, corporate, supershop, catering)
- ✨ Type-specific data fields for each buyer type
- ✨ Dynamic buyer type display names
- ✨ Buyer type filtering in admin panel
- ✨ Flexible registration flow for different buyer types

---

**End of Migration Guide**
