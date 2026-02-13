# Aaroth Fresh Backend - Architecture Plan & Implementation Document

**Version:** 2.1
**Date:** February 2026
**Status:** Planning & Documentation Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Gap Analysis](#3-gap-analysis)
4. [Location Management System](#4-location-management-system)
5. [Market-Based Listing Filtering](#5-market-based-listing-filtering)
6. [Registration & Approval Workflow](#6-registration--approval-workflow)
7. [Restaurant-to-Buyer Scope Change](#7-restaurant-to-buyer-scope-change)
8. [Improvement Recommendations](#8-improvement-recommendations)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [API Reference](#10-api-reference)

---

## 1. Executive Summary

Aaroth Fresh is a B2B marketplace REST API connecting local agricultural vendors with business buyers (restaurants, corporates, supershops, catering services) in Bangladesh. The platform enables:

- **Vendors** to register, get admin approval, manage listings across multiple markets
- **Buyers** (formerly restaurants) to register, get admin approval, browse/filter listings, place orders
- **Admins** to manage products, categories, markets, locations, and approve vendor/buyer registrations
- **Location-based discovery** via Bangladesh's administrative hierarchy (Division > District > Upazila > Union > Market)

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Base buyer model | `Buyer` (not Restaurant) | Scope expanded beyond restaurants to include corporate, supershop, catering |
| Location filter pattern | Cascading dropdown with market auto-select | Matches Bangladesh administrative hierarchy; intuitive UX |
| Location CRUD scope | Full CRUD for all 5 levels | Admin needs complete control over location data |
| Architecture approach | Extend existing patterns | Mature codebase with established conventions |

---

## 2. Current State Analysis

### 2.1 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | >= 16 |
| Framework | Express.js | 4.x |
| Database | MongoDB + Mongoose | 6.x |
| Authentication | JWT (jsonwebtoken) | - |
| Password Hashing | bcryptjs | Cost factor 12 |
| File Upload | Multer + Cloudinary | - |
| Email Service | Brevo (Sendinblue) | - |
| Validation | express-validator | - |
| Rate Limiting | express-rate-limit | - |

### 2.2 Data Models (21 Models)

```
Core Business:
  User.js          - Multi-role auth (admin, vendor, buyerOwner, buyerManager)
  Vendor.js        - Business entity, multi-market support, verification
  Buyer.js         - Business entity with types (restaurant/corporate/supershop/catering)
  Product.js       - Product catalog with categories, quality grades
  ProductCategory.js - Hierarchical categories (max 3 levels)
  Listing.js       - Vendor product listings with pack-based pricing
  Order.js         - Full order lifecycle management

Location Hierarchy:
  Division.js      - 8 Bangladesh divisions (bilingual: en/bn)
  District.js      - 64 districts under divisions
  Upazila.js       - ~500 upazilas under districts
  Union.js         - ~4000+ unions/wards/pourashava under upazilas
  Market.js        - Physical markets with full location hierarchy

Supporting:
  Notification.js  - In-app notification system
  AuditLog.js      - Action audit trail
  SLAPolicy.js     - SLA monitoring (disabled for MVP)
  Restaurant.js    - LEGACY (being replaced by Buyer.js)
```

### 2.3 Route Structure

```
/api/v1/
  ├── auth/              - Registration, login, logout, profile, managers
  ├── admin/             - Admin operations (vendors, buyers, products, categories, markets, orders)
  ├── listings/          - Buyer-facing listing browsing
  ├── orders/            - Order management
  ├── public/            - Public endpoints (no auth required)
  ├── locations/         - Public cascading location data
  ├── vendor-dashboard/  - Vendor operations + listing CRUD
  └── buyer-dashboard/   - Buyer operations
```

### 2.4 Authentication & Authorization

- **Phone-based login** with +880 format (Bangladesh)
- **JWT tokens** for session management
- **Role-based middleware**: `protect` > `authorize(roles)` > `requireApproval`
- **Three-state verification**: `pending` > `approved` / `rejected` at business entity level
- **Approval middleware** blocks actions (listings, orders) until business entity is approved

### 2.5 Existing Location System

The public location API (`/api/v1/locations/`) already provides cascading endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /divisions` | All active divisions |
| `GET /districts/:divisionId` | Districts in a division |
| `GET /upazilas/:districtId` | Upazilas in a district |
| `GET /unions/:upazilaId` | Unions in an upazila |
| `GET /search?q=term&lang=en` | Cross-level search |
| `GET /postal-code/:postalCode` | Lookup by postal code |

---

## 3. Gap Analysis

### 3.1 Critical Gaps (Must Have)

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| G1 | No admin CRUD for divisions/districts/upazilas/unions | Admin cannot manage location hierarchy data | CRITICAL |
| G2 | Listing search does not filter by location hierarchy | Buyers cannot find listings by geographic area | CRITICAL |
| G3 | No public market endpoint in `/locations` route | No cascading market discovery by location | CRITICAL |
| G4 | No approval notification to vendors/buyers | Users don't know when approved/rejected | HIGH |
| G5 | No password reset flow | Users cannot recover accounts | HIGH |
| G6 | CLAUDE.md references `restaurantOwner/restaurantManager` but code uses `buyerOwner/buyerManager` | Documentation mismatch | MEDIUM |

### 3.2 Feature Gaps (Should Have)

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| G7 | No email verification on registration | Unverified emails in system | HIGH |
| G8 | No refresh token system | Users must re-login when JWT expires | MEDIUM |
| G9 | No test suite | Cannot verify functionality automatically | MEDIUM |
| G10 | No Redis caching for location data | Repeated DB queries for static data | MEDIUM |
| G11 | No webhook support for integrations | No way to notify external systems | LOW |

### 3.3 Security Gaps

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| G12 | No helmet.js security headers | Missing standard HTTP security headers | CRITICAL |
| G13 | No NoSQL injection protection | Potential MongoDB injection attacks | CRITICAL |
| G14 | Rate limiting only on some routes | Inconsistent brute-force protection | HIGH |
| G15 | No failed login attempt tracking | Cannot detect brute-force attacks | MEDIUM |

---

## 4. Location Management System

### 4.1 Admin Location CRUD Design

**New Files Required:**
- `controllers/adminLocationController.js` - Admin CRUD for all 5 location levels
- `routes/adminLocations.js` - Route definitions mounted under `/api/v1/admin/locations/`
- Additions to `middleware/validation.js` - Validation rules for each level

**Existing Files to Modify:**
- `routes/admin.js` - Mount the new location sub-router

#### 4.1.1 Division Management

```
POST   /api/v1/admin/locations/divisions           - Create division
GET    /api/v1/admin/locations/divisions           - List all divisions
GET    /api/v1/admin/locations/divisions/:id       - Get single division
PUT    /api/v1/admin/locations/divisions/:id       - Update division
DELETE /api/v1/admin/locations/divisions/:id/soft-delete  - Soft delete
```

**Create Division Request:**
```json
{
  "name": { "en": "Dhaka", "bn": "ঢাকা" },
  "code": "DIV-01",
  "coordinates": [90.4125, 23.8103]
}
```

**Dependency Check on Delete:**
- Count active districts referencing this division
- Block deletion if `districtCount > 0`
- Return: `"Cannot delete division. 13 active districts still reference this division."`

#### 4.1.2 District Management

```
POST   /api/v1/admin/locations/districts           - Create district
GET    /api/v1/admin/locations/districts?division=:id  - List by division
GET    /api/v1/admin/locations/districts/:id       - Get single district
PUT    /api/v1/admin/locations/districts/:id       - Update district
DELETE /api/v1/admin/locations/districts/:id/soft-delete  - Soft delete
```

**Create District Request:**
```json
{
  "name": { "en": "Dhaka", "bn": "ঢাকা" },
  "code": "DIST-01",
  "division": "<Division ObjectId>",
  "coordinates": [90.4074, 23.7104]
}
```

**Validation:** Division must exist and be active before creating a district under it.

#### 4.1.3 Upazila Management

```
POST   /api/v1/admin/locations/upazilas            - Create upazila
GET    /api/v1/admin/locations/upazilas?district=:id  - List by district
GET    /api/v1/admin/locations/upazilas/:id        - Get single upazila
PUT    /api/v1/admin/locations/upazilas/:id        - Update upazila
DELETE /api/v1/admin/locations/upazilas/:id/soft-delete  - Soft delete
```

**Create Upazila Request:**
```json
{
  "name": { "en": "Dhanmondi", "bn": "ধানমন্ডি" },
  "code": "UPZ-001",
  "district": "<District ObjectId>",
  "division": "<Division ObjectId>",
  "postalCodes": ["1205", "1209", "1215"],
  "coordinates": [90.3742, 23.7461]
}
```

**Note:** Division is denormalized on Upazila for query performance (avoids joins).

#### 4.1.4 Union Management

```
POST   /api/v1/admin/locations/unions              - Create union
GET    /api/v1/admin/locations/unions?upazila=:id  - List by upazila
GET    /api/v1/admin/locations/unions/:id          - Get single union
PUT    /api/v1/admin/locations/unions/:id          - Update union
DELETE /api/v1/admin/locations/unions/:id/soft-delete  - Soft delete
```

**Create Union Request:**
```json
{
  "name": { "en": "Kalabagan", "bn": "কলাবাগান" },
  "code": "UN-0001",
  "type": "ward",
  "upazila": "<Upazila ObjectId>",
  "district": "<District ObjectId>",
  "division": "<Division ObjectId>",
  "postalCode": "1205",
  "coordinates": [90.3756, 23.7456]
}
```

**Union types:** `union`, `ward`, `pourashava`

#### 4.1.5 Market Management (Already Exists - Enhancement Needed)

Admin market CRUD already exists in `controllers/adminController.js`. Enhancement needed:
- Ensure market creation validates all location refs (division, district, upazila exist and are active)
- Add market listing in `/api/v1/locations/markets` route

### 4.2 Cross-Cutting Patterns for Admin Location CRUD

#### Soft Delete with Dependency Checking

```javascript
// Pattern for ALL location levels
exports.softDeleteDivision = async (req, res, next) => {
  const division = await Division.findById(req.params.id);
  if (!division) return next(new ErrorResponse('Division not found', 404));

  // Check for active children
  const districtCount = await District.countDocuments({
    division: division._id,
    isDeleted: { $ne: true }
  });

  if (districtCount > 0) {
    return next(new ErrorResponse(
      `Cannot delete division. ${districtCount} districts still reference this division.`,
      403
    ));
  }

  division.isDeleted = true;
  division.deletedAt = new Date();
  division.deletedBy = req.user.id;
  division.isActive = false;
  await division.save();

  res.status(200).json({ success: true, data: division });
};
```

#### Parent Reference Validation

```javascript
// Validate parent exists and is active before creating child
body('division')
  .isMongoId()
  .custom(async (divisionId) => {
    const division = await Division.findById(divisionId);
    if (!division || !division.isActive) {
      throw new Error('Invalid or inactive division');
    }
    return true;
  })
```

#### Code Format Enforcement

| Level | Format | Regex |
|-------|--------|-------|
| Division | DIV-## | `/^DIV-\d{2}$/` |
| District | DIST-## | `/^DIST-\d{2}$/` |
| Upazila | UPZ-### | `/^UPZ-\d{3}$/` |
| Union | UN-#### | `/^UN-\d{4}$/` |

#### Audit Logging

All admin location operations must use the existing `auditLog` middleware:
```javascript
auditLog('division_created', 'Division', 'Created division: {name.en}')
auditLog('division_deleted', 'Division', 'Soft deleted division: {name.en}')
```

---

## 5. Market-Based Listing Filtering

### 5.1 Public Market Discovery API

**New Endpoint in `/api/v1/locations/`:**

```
GET /api/v1/locations/markets
  ?division=<ObjectId>
  &district=<ObjectId>
  &upazila=<ObjectId>
  &union=<ObjectId>
  &active=true
  &lang=en|bn
  &page=1
  &limit=20

GET /api/v1/locations/markets/:id?lang=en|bn
```

**Files to Modify:**
- `controllers/locationController.js` - Add `getMarketsByLocation()` and `getMarketDetail()`
- `routes/locations.js` - Add market routes

**Response Example (Market List):**
```json
{
  "success": true,
  "count": 5,
  "pagination": { "page": 1, "limit": 20, "total": 5 },
  "data": [
    {
      "id": "...",
      "name": "Karwan Bazar",
      "description": "Largest wholesale market in Dhaka",
      "image": "https://cloudinary.com/...",
      "location": {
        "division": { "id": "...", "name": "Dhaka", "code": "DIV-01" },
        "district": { "id": "...", "name": "Dhaka", "code": "DIST-01" },
        "upazila": { "id": "...", "name": "Dhanmondi", "code": "UPZ-001" },
        "union": { "id": "...", "name": "Kalabagan", "code": "UN-0001", "type": "ward" },
        "address": "Karwan Bazar, Tejgaon",
        "postalCode": "1215"
      }
    }
  ]
}
```

### 5.2 Market Auto-Select Behavior

When a user selects a market from the dropdown, the frontend should auto-populate all location fields:

```
User Flow:
1. User types "Karwan" in market search
2. Dropdown shows matching markets with location context
3. User selects "Karwan Bazar"
4. Frontend calls: GET /api/v1/locations/markets/:id
5. Response includes full location hierarchy
6. Frontend auto-fills: Division=Dhaka, District=Dhaka, Upazila=Dhanmondi, Union=Kalabagan
7. Listing filter applies all location + market filters
```

**Reverse Flow (Cascading):**
```
1. User selects Division: "Dhaka"
   → GET /locations/districts/:dhakaDivisionId → populates districts dropdown
2. User selects District: "Dhaka"
   → GET /locations/upazilas/:dhakaDistrictId → populates upazilas dropdown
3. User selects Upazila: "Dhanmondi"
   → GET /locations/unions/:dhanmondiUpazilaId → populates unions dropdown
4. User selects Union: "Kalabagan"
   → GET /locations/markets?union=kalabagan → populates markets dropdown
5. Any combination of these filters → applied to listing search
```

### 5.3 Enhanced Listing Search with Location Filters

**File to Modify:** `models/Listing.js` - `searchListings()` static method (line ~621)

**New Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| division | ObjectId | Filter listings by market's division |
| district | ObjectId | Filter listings by market's district |
| upazila | ObjectId | Filter listings by market's upazila |
| union | ObjectId | Filter listings by market's union |
| marketId | ObjectId | Filter listings by specific market |

**Aggregation Pipeline Strategy:**

```javascript
// Add to the existing searchListings() aggregation pipeline:

// Step 1: Lookup markets collection
{ $lookup: { from: 'markets', localField: 'marketId', foreignField: '_id', as: 'market' } },
{ $unwind: '$market' },

// Step 2: Filter by location hierarchy
{ $match: {
    ...(division && { 'market.location.division': ObjectId(division) }),
    ...(district && { 'market.location.district': ObjectId(district) }),
    ...(upazila && { 'market.location.upazila': ObjectId(upazila) }),
    ...(union && { 'market.location.union': ObjectId(union) }),
    ...(marketId && { marketId: ObjectId(marketId) }),
    'market.isDeleted': { $ne: true },
    'market.isAvailable': true
}},

// Step 3: Lookup location hierarchy for populated response
{ $lookup: { from: 'divisions', localField: 'market.location.division', foreignField: '_id', as: 'market.location.divisionData' } },
{ $lookup: { from: 'districts', localField: 'market.location.district', foreignField: '_id', as: 'market.location.districtData' } },
{ $lookup: { from: 'upazilas', localField: 'market.location.upazila', foreignField: '_id', as: 'market.location.upazilaData' } },
{ $lookup: { from: 'unions', localField: 'market.location.union', foreignField: '_id', as: 'market.location.unionData' } },

// Step 4: Continue with existing product/vendor lookups and filters
```

**Enhanced Listing Search Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "pagination": { "page": 1, "limit": 10, "pages": 5 },
  "data": [
    {
      "_id": "...",
      "product": { "name": "Fresh Tomato", "category": { "name": "Vegetables" } },
      "vendor": { "businessName": "Green Farm Traders" },
      "market": {
        "name": "Karwan Bazar",
        "location": {
          "division": { "name": "Dhaka" },
          "district": { "name": "Dhaka" },
          "upazila": { "name": "Dhanmondi" },
          "union": { "name": "Kalabagan" }
        }
      },
      "pricing": [{ "unit": "kg", "pricePerBaseUnit": 120 }],
      "qualityGrade": "Grade A",
      "status": "active"
    }
  ]
}
```

### 5.4 New Indexes Required

```javascript
// Market.js - Add location-based indexes
MarketSchema.index({ 'location.division': 1, isDeleted: 1 });
MarketSchema.index({ 'location.district': 1, isDeleted: 1 });
MarketSchema.index({ 'location.upazila': 1, isDeleted: 1 });
MarketSchema.index({ 'location.union': 1, isDeleted: 1 });

// Listing.js - Add market-based search index
ListingSchema.index({ marketId: 1, status: 1, isDeleted: 1 });
```

### 5.5 Performance Expectations

| Operation | Expected Latency | Data Volume |
|-----------|-----------------|-------------|
| Division list | < 10ms | 8 divisions |
| District list by division | < 20ms | 6-13 per division |
| Upazila list by district | < 50ms | 5-25 per district |
| Union list by upazila | < 100ms | 10-50 per upazila |
| Market list by location | < 200ms | 20 per page |
| Listing search with location | < 500ms | 20 per page |

---

## 6. Registration & Approval Workflow

### 6.1 Current Registration Flow (Verified Working)

```
Vendor Registration:
1. POST /api/v1/auth/register (role: "vendor")
2. Creates Vendor entity (verificationStatus: "pending")
3. Creates User entity (role: "vendor", vendorId: <Vendor._id>)
4. Returns JWT token (user can login but actions blocked by approval middleware)

Buyer Registration:
1. POST /api/v1/auth/register (role: "buyerOwner")
2. Creates Buyer entity (verificationStatus: "pending", buyerType: required)
3. Creates User entity (role: "buyerOwner", buyerId: <Buyer._id>)
4. Returns JWT token (user can login but actions blocked by approval middleware)

Manager Creation (by buyerOwner):
1. POST /api/v1/auth/managers (requires authenticated buyerOwner)
2. Creates User entity (role: "buyerManager", buyerId: same as owner)
3. Manager inherits same buyer entity and approval status
```

### 6.2 Current Approval Flow

```
Admin Approval (Vendor):
1. GET /api/v1/admin/vendors?verificationStatus=pending
2. GET /api/v1/admin/vendors/:id (review details)
3. PUT /api/v1/admin/vendors/:id/verify
   Body: { "verificationStatus": "approved"|"rejected", "reason": "..." }
4. Updates Vendor.verificationStatus + audit fields

Admin Approval (Buyer):
1. GET /api/v1/admin/buyers?verificationStatus=pending
2. GET /api/v1/admin/buyers/:id (review details)
3. PUT /api/v1/admin/buyers/:id/verify
   Body: { "verificationStatus": "approved"|"rejected", "reason": "..." }
4. Updates Buyer.verificationStatus + audit fields
```

### 6.3 Approval Middleware Chain

```
Request → protect (JWT) → authorize (role) → requireApproval → Controller

requireApproval checks:
  - User.role === 'vendor' → Vendor.verificationStatus === 'approved'
  - User.role === 'buyerOwner'|'buyerManager' → Buyer.verificationStatus === 'approved'
  - User.role === 'admin' → Always passes

Helper functions:
  - canUserCreateListings(userId) → checks vendor approval
  - canUserPlaceOrders(userId) → checks buyer approval
  - canUserManageBuyer(userId) → checks buyer approval
```

### 6.4 Gap: Missing Approval Notifications

**Current State:** When admin approves/rejects, no notification is sent to the vendor/buyer.

**Required Implementation:**

1. **Integrate with NotificationService** (`services/notificationService.js`):
   - Add `createApprovalNotification()` method
   - Trigger after admin approval/rejection in `adminController.js`
   - Support both in-app and email notifications

2. **Email templates needed:**
   - Approval: Congratulations message + next steps (create listings / browse products)
   - Rejection: Reason + how to resubmit

3. **Integration point:** After line ~4036 in `adminController.js` (vendor verification) and line ~4142 (buyer verification)

---

## 7. Restaurant-to-Buyer Scope Change

### 7.1 Current State

The codebase has **already migrated** from `Restaurant` to `Buyer`:
- `models/Buyer.js` is the active model with `buyerType` discriminator
- User roles are `buyerOwner` and `buyerManager` (code reflects this)
- `models/Restaurant.js` still exists as legacy code
- `CLAUDE.md` still references `restaurantOwner/restaurantManager` (needs update)

### 7.2 Buyer Types

| Type | Description | Type-Specific Fields |
|------|-------------|---------------------|
| `restaurant` | Food service businesses | cuisineType, seatingCapacity, operatingHours |
| `corporate` | Corporate offices | industry, employeeCount, departmentBudgets |
| `supershop` | Retail chains | chainName, branchCount, retailCategory |
| `catering` | Event catering services | eventTypes, averageGuestCount, serviceRadius |

### 7.3 Remaining Migration Tasks

| Task | Status | Action Needed |
|------|--------|---------------|
| Buyer model created | DONE | - |
| User roles updated (buyerOwner/buyerManager) | DONE | - |
| Registration supports buyerType | DONE | - |
| Admin buyer CRUD | DONE | - |
| Buyer dashboard | DONE | - |
| Remove Restaurant.js model | TODO | Delete after confirming no imports reference it |
| Update CLAUDE.md documentation | TODO | Change restaurantOwner → buyerOwner references |
| Update ROUTES.md documentation | TODO | Review all restaurant references |
| Data migration script (if production data exists) | TODO | Migrate Restaurant documents to Buyer collection |

### 7.4 Documentation Updates Required

**CLAUDE.md line ~23:**
```diff
- - **User**: Multi-role system (`admin`, `vendor`, `restaurantOwner`, `restaurantManager`)
+ - **User**: Multi-role system (`admin`, `vendor`, `buyerOwner`, `buyerManager`)
```

**CLAUDE.md line ~38:**
```diff
- - **Core entities**: Restaurant, Vendor, Product, ProductCategory, Listing, Order
+ - **Core entities**: Buyer, Vendor, Product, ProductCategory, Listing, Order, Market
```

---

## 8. Improvement Recommendations

### 8.1 Security Improvements

#### 8.1.1 [CRITICAL] Add Helmet.js Security Headers

**File:** `server.js`
```bash
npm install helmet
```
```javascript
const helmet = require('helmet');
app.use(helmet());
```

#### 8.1.2 [CRITICAL] NoSQL Injection Protection

**File:** `middleware/sanitization.js` (new)
```bash
npm install express-mongo-sanitize
```
```javascript
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

#### 8.1.3 [HIGH] Password Reset Flow

**New endpoints in `routes/auth.js`:**
```
POST /api/v1/auth/forgot-password  - Send reset token via email
PUT  /api/v1/auth/reset-password/:resetToken  - Reset password with token
```

**Implementation:**
- Add `resetPasswordToken` and `resetPasswordExpire` fields to User model
- Generate cryptographic token, hash it, store with 10-minute expiry
- Send email with reset link
- Validate token and update password

#### 8.1.4 [HIGH] Email Verification

**New endpoints:**
```
POST /api/v1/auth/verify-email  - Send verification email
GET  /api/v1/auth/verify-email/:token  - Verify email token
```

**Implementation:**
- Add `isEmailVerified`, `emailVerificationToken`, `emailVerificationExpire` to User model
- Send verification email on registration
- Optional: block certain actions until email verified

#### 8.1.5 [HIGH] Consistent Rate Limiting

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts. Please try again after 15 minutes.'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

module.exports = { authLimiter, apiLimiter };
```

Apply `authLimiter` to `/auth/login`, `/auth/register`, `/auth/forgot-password`.
Apply `apiLimiter` to all other routes.

#### 8.1.6 [MEDIUM] Failed Login Tracking

Add audit logging for failed login attempts in `authController.js`:
```javascript
if (!isMatch) {
  await AuditLog.logAction({
    userId: user._id,
    action: 'login_failed',
    entityType: 'User',
    description: 'Failed login attempt - incorrect password',
    severity: 'medium',
    metadata: { attemptedFrom: req.ip, userAgent: req.get('user-agent') }
  });
  return next(new ErrorResponse('Invalid credentials', 401));
}
```

### 8.2 Performance Improvements

#### 8.2.1 [HIGH] Redis Caching for Location Data

Location data changes infrequently - ideal for caching.

```bash
npm install redis
```

**Cache Strategy:**
| Data | TTL | Invalidation Trigger |
|------|-----|---------------------|
| Division list | 24 hours | Admin division CRUD |
| District list by division | 24 hours | Admin district CRUD |
| Upazila list by district | 24 hours | Admin upazila CRUD |
| Union list by upazila | 24 hours | Admin union CRUD |
| Market list by location | 1 hour | Admin market CRUD |

#### 8.2.2 [MEDIUM] Query Projection

Add `.select()` to all queries to return only needed fields:
```javascript
// Instead of:
const vendors = await Vendor.find({ isActive: true });
// Use:
const vendors = await Vendor.find({ isActive: true })
  .select('businessName ownerName email phone verificationStatus')
  .lean();
```

Use `.lean()` for read-only queries (returns plain JS objects, 50%+ performance boost).

#### 8.2.3 [MEDIUM] Pagination Standardization

Create a reusable pagination utility:
```javascript
// utils/pagination.js
const paginate = (query, { page = 1, limit = 20, maxLimit = 100 }) => {
  const safeLimit = Math.min(parseInt(limit), maxLimit);
  const safePage = Math.max(parseInt(page), 1);
  const skip = (safePage - 1) * safeLimit;
  return query.skip(skip).limit(safeLimit);
};
```

### 8.3 Architecture Improvements

#### 8.3.1 [HIGH] Service Layer Extraction

**Problem:** Business logic is mixed into controllers. The `adminController.js` is 4000+ lines.

**Solution:** Extract business logic into service classes:

```
services/
  ├── vendorService.js      - Vendor creation, verification, market management
  ├── buyerService.js       - Buyer creation, verification, type management
  ├── orderService.js       - Order creation, status transitions, calculations
  ├── listingService.js     - Listing CRUD, search, market validation
  ├── locationService.js    - Location hierarchy management, cascading queries
  ├── notificationService.js - Already exists
  └── webhookService.js     - Future: event webhooks
```

**Benefits:**
- Controllers handle HTTP concerns only (request/response)
- Services handle business logic (reusable, testable)
- Easier unit testing

#### 8.3.2 [MEDIUM] Controller Split

Split the 4000+ line `adminController.js` into domain-specific controllers:

```
controllers/
  ├── admin/
  │   ├── adminVendorController.js
  │   ├── adminBuyerController.js
  │   ├── adminProductController.js
  │   ├── adminOrderController.js
  │   ├── adminLocationController.js   ← NEW
  │   └── adminAnalyticsController.js
  └── ...
```

#### 8.3.3 [MEDIUM] Soft Delete Consistency

Create a reusable Mongoose plugin for soft delete:

```javascript
// middleware/softDelete.js
const excludeSoftDeleted = function(schema) {
  schema.pre(/^find/, function() {
    if (!this.getOptions().includeDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
  });

  schema.methods.softDelete = async function(deletedBy) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (deletedBy) this.deletedBy = deletedBy;
    return await this.save();
  };

  schema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    return await this.save();
  };
};
```

Apply as plugin to all models with soft delete fields.

#### 8.3.4 [MEDIUM] Audit Trail Completeness

**Current Gaps:**
- No audit for user profile updates
- No audit for password changes
- No audit for failed login attempts

**Fix:** Add `AuditLog.logAction()` calls in `authController.js` for `updateProfile`, `changePassword`, and failed logins.

#### 8.3.5 [LOW] Refresh Token System

Add refresh tokens for better security:
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days, stored in HttpOnly cookie)
- Token rotation on refresh

#### 8.3.6 [LOW] Test Suite

```bash
npm install --save-dev jest supertest mongodb-memory-server
```

Priority test targets:
1. Authentication (register, login, token validation)
2. Authorization (role-based access, approval middleware)
3. Location hierarchy (cascading queries, dependency checks)
4. Listing search (location filters, pagination)
5. Order lifecycle (status transitions, calculations)

### 8.4 Data Model Improvements

#### 8.4.1 [MEDIUM] Phone Validation Improvement

Current regex allows inconsistent formats. Improve to:
```javascript
phone: {
  validate: {
    validator: function(v) {
      const bangladeshPhone = /^\+880[1-9]\d{8}$/;
      const internationalPhone = /^\+(?:[0-9] ?){6,14}[0-9]$/;
      return bangladeshPhone.test(v) || internationalPhone.test(v);
    },
    message: props => `${props.value} is not a valid phone number. Use: +8801XXXXXXXXX`
  }
}
```

#### 8.4.2 [LOW] Webhook Support

For future third-party integrations:
- `models/Webhook.js` - Webhook subscription model
- `services/webhookService.js` - Event triggering with HMAC signature verification
- Events: `order.created`, `order.delivered`, `vendor.approved`, `buyer.approved`, `listing.created`

#### 8.4.3 [LOW] Image Optimization

Add Sharp for image processing before Cloudinary upload:
```bash
npm install sharp
```
- Resize to max 1200x1200
- Convert to progressive JPEG at 85% quality
- Reduces bandwidth and improves load times

---

## 9. Implementation Roadmap

### Phase 1: Critical Foundation (Week 1-2)

| # | Task | Files | Effort | Priority |
|---|------|-------|--------|----------|
| 1.1 | Admin Location CRUD - Divisions | adminLocationController.js, adminLocations.js, validation.js | 1 day | CRITICAL |
| 1.2 | Admin Location CRUD - Districts | Same files | 0.5 day | CRITICAL |
| 1.3 | Admin Location CRUD - Upazilas | Same files | 0.5 day | CRITICAL |
| 1.4 | Admin Location CRUD - Unions | Same files | 0.5 day | CRITICAL |
| 1.5 | Mount admin location routes | routes/admin.js | 0.5 hour | CRITICAL |
| 1.6 | Add Helmet.js | server.js | 2 hours | CRITICAL |
| 1.7 | Add NoSQL injection protection | server.js, middleware/sanitization.js | 4 hours | CRITICAL |
| 1.8 | Add approval notifications | notificationService.js, adminController.js | 1 day | HIGH |
| 1.9 | Add password reset flow | authController.js, routes/auth.js, User.js | 1 day | HIGH |

### Phase 2: Location Filtering (Week 3)

| # | Task | Files | Effort | Priority |
|---|------|-------|--------|----------|
| 2.1 | Public market-by-location API | locationController.js, routes/locations.js | 1 day | CRITICAL |
| 2.2 | Market detail with full location | locationController.js | 0.5 day | CRITICAL |
| 2.3 | Listing search + location filters | models/Listing.js | 2 days | CRITICAL |
| 2.4 | Add location indexes to Market | models/Market.js | 1 hour | HIGH |
| 2.5 | Add market search index to Listing | models/Listing.js | 1 hour | HIGH |
| 2.6 | Test cascading filter flow end-to-end | Manual/Postman testing | 1 day | HIGH |

### Phase 3: Security & Performance (Week 4)

| # | Task | Files | Effort | Priority |
|---|------|-------|--------|----------|
| 3.1 | Email verification | authController.js, User.js | 1 day | HIGH |
| 3.2 | Consistent rate limiting | middleware/rateLimiter.js, routes/* | 0.5 day | HIGH |
| 3.3 | Failed login tracking | authController.js | 2 hours | MEDIUM |
| 3.4 | Query projection optimization | All controllers | 2 days | MEDIUM |
| 3.5 | Pagination standardization | utils/pagination.js | 1 day | MEDIUM |

### Phase 4: Architecture Cleanup (Week 5-6)

| # | Task | Files | Effort | Priority |
|---|------|-------|--------|----------|
| 4.1 | Split adminController.js | controllers/admin/* | 2 days | MEDIUM |
| 4.2 | Service layer extraction | services/* | 3 days | MEDIUM |
| 4.3 | Soft delete plugin | middleware/softDelete.js, all models | 1 day | MEDIUM |
| 4.4 | Audit trail completeness | authController.js | 0.5 day | MEDIUM |
| 4.5 | Remove legacy Restaurant.js | models/Restaurant.js | 0.5 day | MEDIUM |
| 4.6 | Update CLAUDE.md and ROUTES.md | CLAUDE.md, ROUTES.md | 0.5 day | MEDIUM |

### Phase 5: Advanced Features (Week 7-8)

| # | Task | Files | Effort | Priority |
|---|------|-------|--------|----------|
| 5.1 | Redis caching for locations | config/redis.js, middleware/cache.js | 2 days | MEDIUM |
| 5.2 | Refresh token system | authController.js, User.js | 2 days | LOW |
| 5.3 | Test suite setup | tests/* | 3 days | MEDIUM |
| 5.4 | Webhook support | models/Webhook.js, services/webhookService.js | 2 days | LOW |
| 5.5 | Image optimization | middleware/upload.js | 1 day | LOW |
| 5.6 | Location seed script (Bangladesh data) | scripts/seedLocations.js | 1 day | MEDIUM |

---

## 10. API Reference

### 10.1 Admin Location Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/locations/divisions` | Admin | Create division |
| GET | `/admin/locations/divisions` | Admin | List all divisions |
| GET | `/admin/locations/divisions/:id` | Admin | Get single division |
| PUT | `/admin/locations/divisions/:id` | Admin | Update division |
| DELETE | `/admin/locations/divisions/:id/soft-delete` | Admin | Soft delete division |
| POST | `/admin/locations/districts` | Admin | Create district |
| GET | `/admin/locations/districts?division=:id` | Admin | List districts |
| GET | `/admin/locations/districts/:id` | Admin | Get single district |
| PUT | `/admin/locations/districts/:id` | Admin | Update district |
| DELETE | `/admin/locations/districts/:id/soft-delete` | Admin | Soft delete district |
| POST | `/admin/locations/upazilas` | Admin | Create upazila |
| GET | `/admin/locations/upazilas?district=:id` | Admin | List upazilas |
| GET | `/admin/locations/upazilas/:id` | Admin | Get single upazila |
| PUT | `/admin/locations/upazilas/:id` | Admin | Update upazila |
| DELETE | `/admin/locations/upazilas/:id/soft-delete` | Admin | Soft delete upazila |
| POST | `/admin/locations/unions` | Admin | Create union |
| GET | `/admin/locations/unions?upazila=:id` | Admin | List unions |
| GET | `/admin/locations/unions/:id` | Admin | Get single union |
| PUT | `/admin/locations/unions/:id` | Admin | Update union |
| DELETE | `/admin/locations/unions/:id/soft-delete` | Admin | Soft delete union |

### 10.2 Public Location & Market Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/locations/divisions` | None | List active divisions |
| GET | `/locations/districts/:divisionId` | None | Districts by division |
| GET | `/locations/upazilas/:districtId` | None | Upazilas by district |
| GET | `/locations/unions/:upazilaId` | None | Unions by upazila |
| GET | `/locations/markets` | None | Markets by location (cascading) |
| GET | `/locations/markets/:id` | None | Market detail with full hierarchy |
| GET | `/locations/search?q=term&lang=en` | None | Cross-level search |

### 10.3 Enhanced Listing Search

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/public/listings` | None | Search with location filters |

**Query Parameters:**
```
Existing: keyword, category, minPrice, maxPrice, grade, inSeason, sortBy, page, limit
New:      division, district, upazila, union, marketId
```

### 10.4 Authentication Endpoints (New)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/forgot-password` | None | Send reset email |
| PUT | `/auth/reset-password/:token` | None | Reset password |
| POST | `/auth/verify-email` | Auth | Send verification email |
| GET | `/auth/verify-email/:token` | None | Verify email token |

---

## Appendix A: File Change Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `controllers/adminLocationController.js` | Admin CRUD for all location levels |
| `routes/adminLocations.js` | Admin location route definitions |
| `middleware/sanitization.js` | NoSQL injection protection |
| `middleware/rateLimiter.js` | Consistent rate limiting |
| `middleware/softDelete.js` | Reusable soft delete plugin |
| `utils/pagination.js` | Standardized pagination utility |
| `config/redis.js` | Redis connection (Phase 5) |
| `middleware/cache.js` | Cache middleware (Phase 5) |
| `scripts/seedLocations.js` | Bangladesh location seed data (Phase 5) |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `routes/admin.js` | Mount admin location routes |
| `routes/locations.js` | Add market-by-location and market-detail routes |
| `controllers/locationController.js` | Add getMarketsByLocation, getMarketDetail |
| `models/Listing.js` | Enhance searchListings with location filter aggregation |
| `models/Market.js` | Add location-based indexes |
| `models/User.js` | Add password reset fields, email verification fields |
| `controllers/authController.js` | Add forgot-password, reset-password, verify-email |
| `controllers/adminController.js` | Add notification triggers after approval |
| `services/notificationService.js` | Add createApprovalNotification method |
| `middleware/validation.js` | Add location validation rules |
| `server.js` | Add helmet, mongo-sanitize middleware |
| `CLAUDE.md` | Fix role references, update entity list |
| `ROUTES.md` | Update with new endpoints |

---

## Appendix B: Database Index Summary

### New Indexes to Add

```javascript
// Market.js
MarketSchema.index({ 'location.division': 1, isDeleted: 1 });
MarketSchema.index({ 'location.district': 1, isDeleted: 1 });
MarketSchema.index({ 'location.upazila': 1, isDeleted: 1 });
MarketSchema.index({ 'location.union': 1, isDeleted: 1 });

// Listing.js
ListingSchema.index({ marketId: 1, status: 1, isDeleted: 1 });
```

### Existing Indexes (Verified)

```javascript
// Division.js
{ 'name.en': 'text', 'name.bn': 'text' }
{ code: 1 }
{ isActive: 1 }

// District.js
{ 'name.en': 1, division: 1 } (unique compound)
{ division: 1, isActive: 1 }

// Upazila.js
{ district: 1, isActive: 1 }
{ division: 1 }

// Union.js
{ upazila: 1, isActive: 1 }
{ district: 1 }
{ division: 1 }

// Market.js
{ 'location.coordinates': '2dsphere' }
{ isActive: 1, isAvailable: 1 }
{ name: 'text', description: 'text' }
```

---

*Document generated as part of Aaroth Fresh Backend architecture review. All recommendations follow existing codebase patterns and conventions.*
