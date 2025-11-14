# Aaroth Fresh Backend - API Routes Documentation

**Version:** 2.0
**Last Updated:** 2025-11-14

---

## Table of Contents

1. [Overview](#overview)
2. [Project Architecture](#project-architecture)
3. [User Roles](#user-roles)
4. [Route Files](#route-files)
5. [Core Workflows](#core-workflows)
6. [Complete API Reference](#complete-api-reference)
7. [Common Patterns](#common-patterns)

---

## Overview

The Aaroth Fresh B2B marketplace connects local vegetable vendors with restaurants. The backend API is organized into 9 route files, each serving specific user roles and business functions.

**Core Business Flow:**
- **Vendors** purchase vegetables, track inventory, create listings, and fulfill orders
- **Restaurants** browse listings, place orders, manage budgets, and analyze spending
- **Admins** oversee the platform, approve users, and monitor system health

---

## Project Architecture

### Route Organization

```
/api/v1/
├── auth                    → Authentication & user management (All users)
├── public                  → Public browsing (No auth required)
├── listings                → Restaurant browsing interface (Restaurant users)
├── orders                  → Order placement & fulfillment (Restaurant/Vendor)
├── inventory               → Vendor purchase tracking (Vendor only)
├── vendor-dashboard        → Vendor operations & analytics (Vendor only)
├── restaurant-dashboard    → Restaurant analytics & budgeting (Restaurant only)
└── admin                   → System administration (Admin only)
```

### Key Architectural Decisions

**1. Separation of Browsing vs Management**
- `/listings/*` - Restaurants browse listings (READ-ONLY for restaurants)
- `/vendor-dashboard/listings/*` - Vendors manage listings (CRUD operations)

**2. Inventory vs Listing Management**
- `/inventory/*` - Tracks vendor **purchases and costs** (input side)
- `/vendor-dashboard/listings/*` - Manages vendor **listings and sales** (output side)
- These are tightly coupled but serve different business purposes

**3. Dashboard Analytics**
- Separate dashboard routes for vendors and restaurants
- Focused on aggregated analytics, not raw data
- Use aggregation pipelines for performance

---

## User Roles

### Role Hierarchy

| Role | Access Level | Primary Routes |
|------|--------------|----------------|
| **admin** | Full system access | `/admin/*`, all routes |
| **vendor** | Sell products, manage inventory | `/vendor-dashboard/*`, `/inventory/*`, `/orders/*` |
| **restaurantOwner** | Buy products, manage budget, full restaurant control | `/restaurant-dashboard/*`, `/listings/*`, `/orders/*` |
| **restaurantManager** | Buy products, limited restaurant control | `/restaurant-dashboard/*` (some restrictions), `/listings/*`, `/orders/*` |

### Role-Based Access Control

All routes use `protect` middleware for authentication and `authorize('role1', 'role2')` middleware for role-based access.

Example:
```javascript
router.use(protect);  // All routes require authentication
router.use(authorize('restaurantOwner', 'restaurantManager'));  // Only restaurant users
```

---

## Route Files

### 1. auth.js - Authentication & User Management

**Purpose:** Handle user authentication, registration, and profile management
**Base Path:** `/api/v1/auth`
**Access:** All users (some endpoints public, some protected)

**Key Endpoints:**
- `POST /register` - User registration with role selection
- `POST /login` - Phone-based authentication (returns JWT token)
- `POST /logout` - Session termination
- `GET /me` - Get current user profile
- `PUT /me` - Update user profile
- `POST /change-password` - Change password
- `POST /create-manager` - Create restaurant manager (Owner/Admin only)
- `GET /managers` - List restaurant managers
- `DELETE /managers/:id/deactivate` - Deactivate manager

**Authentication Method:** Phone number + password (not email-based)

---

### 2. public.js - Public Access

**Purpose:** Allow browsing without authentication (marketing/discovery)
**Base Path:** `/api/v1/public`
**Access:** No authentication required

**Key Endpoints:**
- `GET /products` - Browse all products
- `GET /products/:id` - View single product
- `GET /categories` - Browse product categories
- `GET /listings` - Browse active listings
- `GET /listings/:id` - View single listing
- `GET /featured-listings` - View featured listings

**Use Case:** Public website, marketing pages, SEO

---

### 3. listings.js - Restaurant Browsing Interface

**Purpose:** Restaurant users browse and search listings to place orders
**Base Path:** `/api/v1/listings`
**Access:** Authenticated users (primarily restaurants)

**Key Endpoints:**
- `GET /` - Browse all active listings with search/filter (Restaurant users)
- `GET /:id` - View single listing details (Any authenticated user)

**Important Notes:**
- This route is **READ-ONLY** for restaurant users
- Vendors manage listings through `/vendor-dashboard/listings/*`
- Supports filtering by category, vendor, price range, etc.

**Typical Use Case:**
```
Restaurant user → Browse listings → View details → Add to cart → Place order
```

---

### 4. orders.js - Order Management

**Purpose:** Handle order placement, approval, and fulfillment
**Base Path:** `/api/v1/orders`
**Access:** All authenticated users (role-based filtering)

**Key Endpoints:**
- `GET /` - List orders (filtered by role)
- `POST /` - Place new order (Restaurant users only)
- `GET /:id` - View single order
- `POST /:id/approve` - Approve pending order (Restaurant Owner only)
- `PUT /:id/status` - Update order status (Vendor only)

**Order Workflow:**
```
1. Restaurant places order → Status: "pending_approval"
2. Restaurant owner approves → Status: "confirmed"
3. Vendor confirms order → Status: "processing"
4. Vendor marks ready → Status: "ready_for_pickup" or "out_for_delivery"
5. Vendor delivers → Status: "delivered" (inventory & analytics updated)
```

**Role-Based Data Access:**
- **Admin:** Sees all orders
- **Vendor:** Sees only their orders (as seller)
- **Restaurant:** Sees only their orders (as buyer)

**Automatic Updates on Delivery:**
When order status changes to "delivered":
- VendorInventory stock is reduced
- Listing analytics are updated
- Restaurant spending tracked for analytics

---

### 5. inventory.js - Vendor Purchase Tracking

**Purpose:** Track vendor purchases, costs, and inventory levels
**Base Path:** `/api/v1/inventory`
**Access:** Vendor only

**Key Endpoints:**
- `GET /` - Inventory overview with summary statistics
  - Query param: `?summary=true` - Returns lightweight dashboard data
  - Query param: `?summary=false` or omitted - Returns full detailed data
- `POST /` - Add purchase to inventory
- `GET /analytics` - Inventory analytics and insights
- `GET /alerts` - Low stock and expiry alerts
- `POST /sync-listings` - Sync inventory levels with listings
- `GET /:id` - Get inventory item details with purchase history
- `PUT /:id/settings` - Update reorder levels and settings
- `POST /:id/adjust` - Adjust stock (wastage, damage, returns)
- `GET /:id/purchases` - Get purchase history

**Business Purpose:**
- Track **input costs** (what vendor paid for vegetables)
- Monitor stock levels and batches
- Calculate profit margins (purchase cost vs selling price)
- Generate low stock alerts
- Track wastage and adjustments

**Relationship with Listings:**
- Inventory items can be linked to listings via `inventoryId`
- Creating inventory-based listings requires inventory records
- Stock levels sync between inventory and listings
- When order is delivered, both inventory and listing are updated

**Use Case Example:**
```
Vendor buys 100kg tomatoes at $2/kg → POST /inventory
System creates VendorInventory record with:
  - Product: Tomatoes
  - Quantity: 100kg
  - Cost per unit: $2/kg
  - Total cost: $200
  - Batch tracking, expiry date, etc.
```

---

### 6. vendor-dashboard.js - Vendor Operations & Analytics

**Purpose:** Complete vendor interface including listing management and analytics
**Base Path:** `/api/v1/vendor-dashboard`
**Access:** Vendor only

**Dashboard Analytics Endpoints:**
- `GET /overview` - Dashboard overview with key metrics
- `GET /revenue` - Revenue analytics and trends
- `GET /orders` - Order volume, status distribution, patterns
- `GET /products` - Product performance analytics
- `GET /customers` - Customer insights (top restaurants, etc.)
- `GET /order-management` - Orders needing action (pending, processing)
- `GET /top-products` - Top performing products by revenue
- `GET /sales-reports` - Detailed sales reports
- `GET /seasonal-trends` - Seasonal patterns
- `GET /financial-summary` - Financial summary and payment tracking
- `GET /notifications` - Vendor notifications and alerts

**Note:** For inventory data, use `/api/v1/inventory` directly:
- Dashboard widgets: `GET /inventory?summary=true` (lightweight)
- Full management: `GET /inventory` (complete data)

**Listing Management Endpoints (CRUD):**
- `GET /listings` - Get vendor's own listings
- `POST /listings` - Create new listing (requires vendor approval status)
- `GET /listings/:id` - Get single listing
- `PUT /listings/:id` - Update listing
- `DELETE /listings/:id` - Delete listing

**Listing Analytics Endpoints:**
- `GET /listings/analytics` - Listing performance metrics
- `GET /listings/sales-history` - Sales history by listing type
- `GET /listings/revenue-breakdown` - Revenue breakdown (inventory vs non-inventory)

**Business Purpose:**
- Manage **output side** (what vendor is selling)
- Set selling prices and profit margins
- Track sales performance
- Monitor customer relationships
- Analyze revenue trends

**Listing Types:**
1. **Inventory-based listings** - Linked to VendorInventory, stock synced
2. **Non-inventory listings** - Not tracked in inventory system

**Use Case Example:**
```
Vendor creates listing from inventory:
  - POST /vendor-dashboard/listings
  - Links to inventory item (inventoryId)
  - Sets selling price: $3/kg (vs $2/kg purchase cost)
  - Profit margin: $1/kg
```

---

### 7. restaurant-dashboard.js - Restaurant Analytics & Budgeting

**Purpose:** Comprehensive analytics and budget management for restaurants
**Base Path:** `/api/v1/restaurant-dashboard`
**Access:** Restaurant Owner/Manager (some endpoints Owner-only)

**Dashboard Analytics:**
- `GET /overview` - Dashboard overview with key metrics
- `GET /spending` - Spending analytics by category/vendor/time
- `GET /orders` - Order volume, frequency, peak ordering times
- `GET /vendors` - Vendor performance, reliability tracking
- `GET /inventory-planning` - Consumption insights and reorder suggestions
- `GET /order-history` - Detailed order history with filters
- `GET /favorite-vendors` - Frequently used vendors
- `GET /cost-analysis` - Cost breakdowns and savings tracking
- `GET /price-analytics` - **Average price tracking by product/category**
- `GET /purchase-patterns` - Seasonal trends and forecasting
- `GET /delivery-tracking` - Delivery performance metrics
- `GET /team-activity` - Team member activity (Owner only)
- `GET /notifications` - Budget alerts, order updates
- `GET /reorder-suggestions` - Smart reorder recommendations

**Budget Management:**
- `GET /budget` - Budget tracking and spending limits
- `POST /budget` - Create monthly/quarterly/yearly budget (Owner only)
- `PUT /budget/:budgetId` - Update existing budget (Owner only)

**Business Purpose:**
This dashboard fulfills the core project goals for restaurants:
- ✅ Track **spending by product and category**
- ✅ Monitor **average prices** over time
- ✅ Identify **most-used vendors**
- ✅ Create and track **budgets**
- ✅ Analyze purchasing patterns
- ✅ Get reorder suggestions

**Key Features:**
- Period-over-period comparisons (growth analysis)
- Budget utilization alerts (>80% warning)
- Price volatility tracking
- Vendor loyalty scoring
- Consumption-based forecasting
- Team activity monitoring (Owner only)

**Use Case Example:**
```
Restaurant owner reviews monthly spending:
  - GET /restaurant-dashboard/spending?period=month
  - Shows: $5,000 spent (10% increase vs last month)
  - Breakdown: Vegetables $3,000, Fruits $2,000
  - Top vendor: Fresh Farms ($2,500)
  - Budget status: 75% utilized (on track)
```

---

### 8. admin.js - System Administration

**Purpose:** Complete platform oversight and management
**Base Path:** `/api/v1/admin`
**Access:** Admin only

**Dashboard:**
- `GET /dashboard/overview` - System-wide metrics

**User Management:**
- `GET /users` - List all users with pagination
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `PUT /users/:id/toggle-status` - Activate/deactivate user

**Vendor Management:**
- `GET /vendors` - List all vendors
- `GET /vendors/:id` - Get vendor details
- `PUT /vendors/:id/approve` - Approve vendor account
- `PUT /vendors/:id/reject` - Reject vendor account
- `PUT /vendors/:id/verify-business` - Verify business documents
- `PUT /vendors/:id/deactivate` - Deactivate vendor
- `DELETE /vendors/:id/safe-delete` - Safe deletion (check dependencies)

**Restaurant Management:**
- `GET /restaurants` - List all restaurants
- `GET /restaurants/:id` - Get restaurant details
- `PUT /restaurants/:id/approve` - Approve restaurant account
- `PUT /restaurants/:id/reject` - Reject restaurant account
- `PUT /restaurants/:id/verify-business` - Verify business documents
- `PUT /restaurants/:id/transfer-ownership` - Transfer ownership
- `POST /restaurants/:id/request-documents` - Request additional documents

**Product & Category Management:**
- `GET /products` - List all products
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `GET /categories` - List all categories
- `POST /categories` - Create category
- `PUT /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

**Listing Oversight:**
- `GET /listings` - All listings (admin view)
- `PUT /listings/:id/toggle-featured` - Feature/unfeature listing
- `PUT /listings/:id/flag` - Flag problematic listing

**Analytics & Reporting:**
- `GET /analytics/overview` - Platform analytics
- `GET /analytics/sales` - Sales analytics
- `GET /analytics/users` - User analytics
- `GET /analytics/products` - Product analytics

**System Settings:**
- `GET /settings` - Get system settings
- `PUT /settings` - Update system settings

---

## Core Workflows

### Vendor Workflow: From Purchase to Sale

```
┌─────────────────────────────────────────────────────────────────┐
│                        VENDOR WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

Step 1: Purchase Vegetables
  → Vendor buys 100kg tomatoes from wholesale market
  → POST /inventory
  → Creates VendorInventory record
     • Product: Tomatoes
     • Quantity: 100kg
     • Cost: $2/kg
     • Batch: BATCH-001
     • Expiry: 2025-11-20

Step 2: Create Listing
  → Vendor creates listing to sell tomatoes
  → POST /vendor-dashboard/listings
  → Creates Listing record
     • Product: Tomatoes
     • Vendor: VendorID
     • inventoryId: InventoryItemID (links to step 1)
     • pricePerUnit: $3/kg
     • availableQuantity: 100kg (synced from inventory)
     • isActive: true

Step 3: Automatic Sync
  → System keeps inventory and listing in sync
  → When inventory stock changes, listing quantity updates
  → POST /inventory/sync-listings (can be called manually)

Step 4: Receive Order
  → Restaurant places order for 20kg tomatoes
  → POST /orders (from restaurant side)
  → Vendor receives notification
  → GET /vendor-dashboard/order-management

Step 5: Fulfill Order
  → Vendor confirms order
  → PUT /orders/:id/status → "confirmed"
  → PUT /orders/:id/status → "processing"
  → PUT /orders/:id/status → "out_for_delivery"
  → PUT /orders/:id/status → "delivered"

Step 6: Automatic Updates on Delivery
  → When status = "delivered":
     ✓ VendorInventory stock: 100kg → 80kg
     ✓ Listing availableQuantity: 100kg → 80kg
     ✓ Listing analytics updated (totalSold, totalRevenue)
     ✓ Vendor revenue tracked in dashboard

Step 7: Track Performance
  → GET /vendor-dashboard/revenue
  → See: $60 revenue from tomato sales
  → Profit: ($3 - $2) × 20kg = $20
```

### Restaurant Workflow: From Browsing to Analytics

```
┌─────────────────────────────────────────────────────────────────┐
│                      RESTAURANT WORKFLOW                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Browse Listings
  → GET /listings?category=vegetables&search=tomatoes
  → See listings from multiple vendors with prices
  → Filter by price, vendor, rating, etc.

Step 2: View Details
  → GET /listings/:id
  → See detailed listing info:
     • Vendor name and rating
     • Price per unit
     • Available quantity
     • Quality grade
     • Reviews

Step 3: Add to Cart & Place Order
  → POST /orders
  → Order requires approval if restaurant has this setting
  → Status: "pending_approval"

Step 4: Approve Order (if required)
  → Restaurant owner reviews order
  → POST /orders/:id/approve
  → Status: "confirmed"
  → Notification sent to vendor

Step 5: Track Order
  → GET /orders/:id
  → See order status updates
  → Track delivery

Step 6: Order Delivered
  → Vendor marks delivered
  → Restaurant confirms receipt
  → Order complete

Step 7: View Analytics
  → GET /restaurant-dashboard/overview
  → See monthly spending, order volume

Step 8: Track Spending by Category
  → GET /restaurant-dashboard/spending?period=month
  → See breakdown:
     • Vegetables: $3,000
     • Fruits: $2,000
     • Dairy: $1,000

Step 9: Monitor Average Prices
  → GET /restaurant-dashboard/price-analytics?productId=TomatoID
  → See price trends:
     • January: $2.50/kg average
     • February: $3.00/kg average (+20%)
     • March: $2.80/kg average (-7%)

Step 10: Track Vendor Usage
  → GET /restaurant-dashboard/vendors
  → See most-used vendors:
     1. Fresh Farms - $2,500 spent, 15 orders
     2. Green Valley - $1,800 spent, 12 orders
     3. Organic Hub - $700 spent, 5 orders

Step 11: Set Budget
  → POST /restaurant-dashboard/budget
  → Create monthly budget:
     • Total: $8,000
     • Vegetables: $4,000
     • Fruits: $3,000
     • Dairy: $1,000

Step 12: Monitor Budget
  → GET /restaurant-dashboard/budget
  → See utilization:
     • Overall: 75% used ($6,000 / $8,000)
     • Vegetables: 85% used (warning alert)
     • Fruits: 70% used
     • Dairy: 60% used
```

### Admin Workflow: Platform Management

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN WORKFLOW                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: Review New Registrations
  → GET /admin/vendors?status=pending
  → GET /admin/restaurants?status=pending
  → Review business documents

Step 2: Approve/Reject Users
  → PUT /admin/vendors/:id/approve
  → PUT /admin/restaurants/:id/approve
  → OR
  → PUT /admin/vendors/:id/reject

Step 3: Verify Business Documents
  → PUT /admin/vendors/:id/verify-business
  → PUT /admin/restaurants/:id/verify-business

Step 4: Monitor Platform Health
  → GET /admin/dashboard/overview
  → See: Total users, active listings, orders, revenue

Step 5: Manage Products & Categories
  → POST /admin/products (add new products)
  → POST /admin/categories (create categories)
  → PUT /admin/categories/:id (update category)

Step 6: Oversee Listings
  → GET /admin/listings
  → PUT /admin/listings/:id/toggle-featured
  → PUT /admin/listings/:id/flag (if problematic)

Step 7: View Analytics
  → GET /admin/analytics/overview
  → Track platform growth, sales trends
```

---

## Complete API Reference

### Quick Reference Table

| Route | Method | Endpoint | Access | Purpose |
|-------|--------|----------|--------|---------|
| **AUTH** | | | | |
| auth | POST | /register | Public | User registration |
| auth | POST | /login | Public | Login (phone + password) |
| auth | POST | /logout | Protected | Logout |
| auth | GET | /me | Protected | Get current user |
| auth | PUT | /me | Protected | Update profile |
| auth | POST | /change-password | Protected | Change password |
| auth | POST | /create-manager | Owner/Admin | Create restaurant manager |
| **PUBLIC** | | | | |
| public | GET | /products | Public | Browse products |
| public | GET | /categories | Public | Browse categories |
| public | GET | /listings | Public | Browse listings |
| public | GET | /featured-listings | Public | Featured listings |
| **LISTINGS** | | | | |
| listings | GET | / | Restaurant | Browse listings to buy |
| listings | GET | /:id | Authenticated | View listing details |
| **ORDERS** | | | | |
| orders | GET | / | Authenticated | List orders (role-filtered) |
| orders | POST | / | Restaurant | Place order |
| orders | GET | /:id | Authenticated | View order |
| orders | POST | /:id/approve | Owner | Approve order |
| orders | PUT | /:id/status | Vendor | Update order status |
| **INVENTORY** | | | | |
| inventory | GET | / | Vendor | Inventory overview |
| inventory | GET | /?summary=true | Vendor | Dashboard summary |
| inventory | POST | / | Vendor | Add purchase |
| inventory | GET | /analytics | Vendor | Inventory analytics |
| inventory | GET | /alerts | Vendor | Stock alerts |
| inventory | POST | /sync-listings | Vendor | Sync with listings |
| inventory | GET | /:id | Vendor | Inventory item details |
| inventory | PUT | /:id/settings | Vendor | Update settings |
| inventory | POST | /:id/adjust | Vendor | Adjust stock |
| **VENDOR DASHBOARD** | | | | |
| vendor-dashboard | GET | /overview | Vendor | Dashboard overview |
| vendor-dashboard | GET | /revenue | Vendor | Revenue analytics |
| vendor-dashboard | GET | /orders | Vendor | Order analytics |
| vendor-dashboard | GET | /listings | Vendor | Vendor's listings |
| vendor-dashboard | POST | /listings | Vendor | Create listing |
| vendor-dashboard | GET | /listings/:id | Vendor | View listing |
| vendor-dashboard | PUT | /listings/:id | Vendor | Update listing |
| vendor-dashboard | DELETE | /listings/:id | Vendor | Delete listing |
| vendor-dashboard | GET | /listings/analytics | Vendor | Listing performance |
| **RESTAURANT DASHBOARD** | | | | |
| restaurant-dashboard | GET | /overview | Restaurant | Dashboard overview |
| restaurant-dashboard | GET | /spending | Restaurant | Spending analytics |
| restaurant-dashboard | GET | /orders | Restaurant | Order analytics |
| restaurant-dashboard | GET | /vendors | Restaurant | Vendor insights |
| restaurant-dashboard | GET | /budget | Restaurant | Budget tracking |
| restaurant-dashboard | POST | /budget | Owner | Create budget |
| restaurant-dashboard | PUT | /budget/:id | Owner | Update budget |
| restaurant-dashboard | GET | /price-analytics | Restaurant | Price trends |
| restaurant-dashboard | GET | /cost-analysis | Restaurant | Cost analysis |
| restaurant-dashboard | GET | /favorite-vendors | Restaurant | Top vendors |
| **ADMIN** | | | | |
| admin | GET | /dashboard/overview | Admin | System overview |
| admin | GET | /users | Admin | List users |
| admin | GET | /vendors | Admin | List vendors |
| admin | PUT | /vendors/:id/approve | Admin | Approve vendor |
| admin | GET | /restaurants | Admin | List restaurants |
| admin | PUT | /restaurants/:id/approve | Admin | Approve restaurant |
| admin | GET | /products | Admin | List products |
| admin | POST | /products | Admin | Create product |
| admin | GET | /categories | Admin | List categories |
| admin | POST | /categories | Admin | Create category |
| admin | GET | /analytics/overview | Admin | Platform analytics |

---

## Common Patterns

### Authentication Pattern

All protected routes use:
```javascript
router.use(protect);  // JWT authentication
```

### Authorization Pattern

Role-based routes use:
```javascript
router.use(authorize('role1', 'role2'));  // Role check
```

### Validation Pattern

Input validation uses express-validator:
```javascript
[
  body('field').isString().withMessage('Error message'),
  query('param').optional().isInt()
]
```

### Error Handling

Controllers use async/await with try-catch:
```javascript
try {
  // Business logic
  res.status(200).json({ success: true, data });
} catch (error) {
  next(error);  // Global error handler
}
```

### Pagination Pattern

List endpoints support:
```javascript
?page=1&limit=10&sort=-createdAt
```

### Date Range Pattern

Analytics endpoints support:
```javascript
?startDate=2025-01-01&endDate=2025-01-31
// OR
?period=month  // today, week, month, quarter, year
```

---

## Key Relationships

### Inventory ↔ Listing Relationship

```
VendorInventory (inventory.js)
  ├── productId → Product
  ├── vendorId → Vendor
  ├── quantity: 100kg
  ├── costPerUnit: $2/kg
  └── batches: [...]

Listing (vendor-dashboard.js)
  ├── productId → Product
  ├── vendorId → Vendor
  ├── inventoryId → VendorInventory (optional link)
  ├── pricePerUnit: $3/kg
  ├── availableQuantity: 100kg (synced from inventory)
  └── isActive: true

When order is delivered:
  ├── VendorInventory.quantity -= ordered quantity
  ├── Listing.availableQuantity -= ordered quantity
  └── Analytics updated for both
```

### Order ↔ Budget Relationship

```
Order (orders.js)
  ├── restaurantId → Restaurant
  ├── vendorId → Vendor
  ├── items: [...]
  ├── totalAmount: $60
  ├── status: "delivered"
  └── createdAt: 2025-11-14

Budget (restaurant-dashboard.js)
  ├── restaurantId → Restaurant
  ├── totalBudgetLimit: $8,000
  ├── categoryLimits: [
  │     { category: "Vegetables", limit: $4,000 }
  │   ]
  └── period: "monthly"

Dashboard Analytics:
  ├── Tracks spending by category
  ├── Compares against budget limits
  ├── Generates alerts when >80% utilized
  └── Shows period-over-period trends
```

---

## Best Practices

### For Frontend Developers

1. **Always use role-appropriate endpoints**
   - Restaurants should browse via `/listings/*`
   - Vendors should manage via `/vendor-dashboard/listings/*`

2. **Handle role-based data filtering**
   - `/orders` returns different data based on user role
   - Frontend should adapt UI accordingly

3. **Use dashboard endpoints for analytics**
   - Don't aggregate data on frontend
   - Use pre-aggregated dashboard endpoints

4. **Respect authorization boundaries**
   - Don't try to access endpoints without proper role
   - Check user.role before rendering features

### For Backend Developers

1. **Maintain separation of concerns**
   - Keep inventory (costs) separate from listings (prices)
   - Keep dashboard (analytics) separate from operations (CRUD)

2. **Use aggregation pipelines for analytics**
   - Don't fetch all data and aggregate in Node.js
   - Use MongoDB aggregation for performance

3. **Document workflow dependencies**
   - Inventory → Listing creation
   - Order delivery → Inventory/Listing updates

4. **Validate role-based access**
   - Always use authorize() middleware
   - Validate ownership (vendor can only update their listings)

---

## Future Enhancements

### Planned Features

1. **Export Reports** (High Priority)
   - `GET /restaurant-dashboard/reports/export` - PDF/Excel export
   - `GET /vendor-dashboard/reports/sales` - Sales reports

2. **Recurring Orders** (Medium Priority)
   - `POST /orders/recurring` - Set up recurring orders
   - `GET /orders/recurring` - Manage recurring orders

3. **Inventory Forecasting** (Medium Priority)
   - `GET /inventory/forecast` - Predict future stock needs

4. **Price Notifications** (Low Priority)
   - `POST /restaurant-dashboard/price-alerts` - Set price alerts
   - Get notified when prices drop

---

## Troubleshooting

### Common Issues

**1. "Forbidden" error when creating listing**
- **Cause:** Vendor account not approved by admin
- **Solution:** Admin must approve vendor via `PUT /admin/vendors/:id/approve`

**2. Orders not appearing in restaurant dashboard**
- **Cause:** Order status might be filtered
- **Solution:** Check order status and date range filters

**3. Inventory and listing quantities don't match**
- **Cause:** Sync might be needed
- **Solution:** Call `POST /inventory/sync-listings`

**4. Budget alerts not showing**
- **Cause:** Budget might not be created
- **Solution:** Create budget via `POST /restaurant-dashboard/budget`

---

## Changelog

### Version 2.1 (2025-11-14) - Clean MVP Architecture
- **BREAKING:** Removed `/vendor-dashboard/inventory` endpoint (use `/inventory` directly)
- Removed backward compatibility for cleaner, more maintainable code
- Consolidated inventory access: `/inventory` for full data, `/inventory?summary=true` for dashboard widgets
- Updated documentation to reflect simplified architecture
- Frontend should call `/inventory` endpoints directly (no proxy routes)

### Version 2.0 (2025-11-14)
- Separated listing browsing (`/listings`) from vendor management (`/vendor-dashboard/listings`)
- Added comprehensive restaurant dashboard with budget management
- Added inventory endpoint consolidation (`?summary=true` parameter)
- Enhanced documentation with complete workflows

### Version 1.0 (Initial Release)
- Basic route structure
- Authentication and authorization
- Order management
- Vendor and restaurant dashboards

---

**For questions or issues, contact the development team.**
