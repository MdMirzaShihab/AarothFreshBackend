# Frontend Market Implementation Guide

**Last Updated:** 2025-11-26
**Backend Version:** v2.0 (Market Support)
**Migration Status:** ✅ Completed

---

## Table of Contents
1. [Overview](#overview)
2. [Backend Changes Summary](#backend-changes-summary)
3. [API Changes](#api-changes)
4. [Frontend Implementation Requirements](#frontend-implementation-requirements)
5. [Component-by-Component Guide](#component-by-component-guide)
6. [Validation Requirements](#validation-requirements)
7. [Testing Checklist](#testing-checklist)
8. [Migration Notes](#migration-notes)

---

## Overview

### What Changed?
The backend now supports **market-based listing management**. Each listing must be associated with a specific market, and vendors can operate in multiple markets but each listing belongs to only one market.

### Why This Matters for Frontend
- Vendors must select a market when creating/editing listings
- Users can filter listings by market across the platform
- Order validation requires all items to be from the same market
- Analytics now show market breakdown for vendor performance

### Key Principles
1. **One Market Per Listing** - Each listing belongs to exactly one market
2. **Vendor Market Constraints** - Vendors can only create listings in markets they operate in
3. **Same-Market Orders** - All items in an order must be from the same market
4. **Market Availability** - Only active and available markets can be used

---

## Backend Changes Summary

### Database Schema Changes

#### Listing Model
**New Required Field:**
```javascript
{
  marketId: ObjectId, // Reference to Market model
  // ... existing fields
}
```

**Populated Response:**
```javascript
{
  marketId: {
    _id: "691efdeb517a23d44b80207a",
    name: "Shyambazar",
    location: {
      city: "Kolkata",
      address: "Shyambazar Street, Kolkata-700004"
    }
  },
  // ... other listing fields
}
```

#### Vendor Model
**Existing Field (now used):**
```javascript
{
  markets: [ObjectId], // Array of Market references
  // ... existing fields
}
```

### Validation Changes

1. **Route-level validation** - express-validator checks on create/update
2. **Controller-level validation** - Business logic validation for market ownership
3. **Model-level validation** - Pre-save hooks verify vendor operates in selected market

### Auto-Deactivation
When a vendor is removed from a market, all their listings in that market are automatically:
- Set to `status: 'inactive'`
- Flagged with `isFlagged: true`
- Given `flagReason: 'Automatically deactivated: Vendor no longer operates in market'`

---

## API Changes

### 1. Vendor Listing Management

#### **POST /api/v1/vendor-dashboard/listings**
Create a new listing.

**NEW Request Field:**
```json
{
  "productId": "6886853cddb15bd800be1aaf",
  "marketId": "691efdeb517a23d44b80207a",  // ← NEW: Required
  "pricing": [...],
  "qualityGrade": "Grade A",
  "availability": {...},
  // ... other fields
}
```

**Validation Rules:**
- `marketId` is **required**
- Must be a valid MongoDB ObjectId
- Market must exist, be active, and available
- Vendor must operate in the selected market

**Error Responses:**
```json
// Market doesn't exist or unavailable
{
  "success": false,
  "error": "Selected market does not exist or is not available"
}

// Vendor doesn't operate in market
{
  "success": false,
  "error": "You cannot create listings in Shyambazar. Your vendor account does not operate in this market."
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "marketId": {
      "_id": "691efdeb517a23d44b80207a",
      "name": "Shyambazar",
      "location": {
        "city": "Kolkata",
        "address": "Shyambazar Street, Kolkata-700004"
      }
    },
    // ... other listing fields
  }
}
```

---

#### **GET /api/v1/vendor-dashboard/listings**
Get vendor's listings with optional market filter.

**NEW Query Parameter:**
```
GET /api/v1/vendor-dashboard/listings?marketId=691efdeb517a23d44b80207a
GET /api/v1/vendor-dashboard/listings?marketId=all  // Show all markets
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "...",
      "productId": {...},
      "marketId": {
        "_id": "691efdeb517a23d44b80207a",
        "name": "Shyambazar",
        "location": {
          "city": "Kolkata",
          "address": "..."
        }
      },
      // ... other fields
    }
  ]
}
```

---

#### **PUT /api/v1/vendor-dashboard/listings/:id**
Update an existing listing.

**Request (marketId is optional for updates):**
```json
{
  "marketId": "691efdeb517a23d44b80207a",  // ← Optional: Can change market
  "pricing": [...],
  // ... other fields to update
}
```

**Validation Rules (if changing market):**
- New market must exist, be active, and available
- Vendor must operate in the new market

**Error Response:**
```json
{
  "success": false,
  "error": "Cannot move listing to Karwan Bazar. Your vendor account does not operate in this market."
}
```

---

### 2. Public Endpoints

#### **GET /api/v1/public/listings**
Public listing search with market filter.

**NEW Query Parameter:**
```
GET /api/v1/public/listings?marketId=691efdeb517a23d44b80207a
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "...",
      "productId": {...},
      "vendorId": {...},
      "marketId": {
        "_id": "691efdeb517a23d44b80207a",
        "name": "Shyambazar",
        "location": {
          "city": "Kolkata",
          "address": "..."
        }
      },
      "pricing": [...],
      "availability": {...}
    }
  ]
}
```

---

#### **GET /api/v1/public/products/:id**
Get single product with listings, optionally filtered by market.

**NEW Query Parameter:**
```
GET /api/v1/public/products/:id?marketId=691efdeb517a23d44b80207a
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Tomato",
    "description": "...",
    "category": {...},
    "listings": [  // ← Filtered by marketId if provided
      {
        "_id": "...",
        "vendorId": {...},
        "marketId": {
          "_id": "691efdeb517a23d44b80207a",
          "name": "Shyambazar",
          "location": {...}
        },
        "pricing": [...],
        "availability": {...}
      }
    ]
  }
}
```

---

#### **GET /api/v1/public/featured-listings**
Get featured listings with market filter.

**NEW Query Parameter:**
```
GET /api/v1/public/featured-listings?marketId=691efdeb517a23d44b80207a
```

---

#### **GET /api/v1/public/markets**
Get all active markets (existing endpoint, no changes).

**Example Response:**
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "691efdeb517a23d44b80207a",
      "name": "Shyambazar",
      "description": "Main wholesale market in Kolkata",
      "slug": "shyambazar",
      "location": {
        "city": "Kolkata",
        "address": "Shyambazar Street, Kolkata-700004"
      },
      "image": "https://..."
    }
  ]
}
```

---

### 3. Admin Endpoints

#### **GET /api/v1/admin/listings**
Admin listing management with market filter.

**NEW Query Parameter:**
```
GET /api/v1/admin/listings?marketId=691efdeb517a23d44b80207a
```

**All existing query parameters still work:**
```
GET /api/v1/admin/listings?status=active&marketId=691efdeb517a23d44b80207a&page=1&limit=20
```

---

### 4. Order Endpoints

#### **POST /api/v1/orders**
Place a new order.

**IMPORTANT VALIDATION:**
All items in the order must be from the **same market**. The backend validates this automatically.

**Error Response (cross-market order):**
```json
{
  "success": false,
  "error": "All items in an order must be from the same market. Item \"Tomato\" is from a different market."
}
```

**Error Response (market unavailable):**
```json
{
  "success": false,
  "error": "Market \"Shyambazar\" is currently unavailable for orders"
}
```

**Frontend Requirements:**
- When user adds items to cart, check marketId of first item
- Prevent adding items from different markets to the same order
- Show clear error message if user tries to mix markets
- Display market name in cart/checkout

---

### 5. Vendor Dashboard Analytics

#### **GET /api/v1/vendor-dashboard/overview**
Get dashboard overview with market breakdown.

**NEW Response Field:**
```json
{
  "success": true,
  "data": {
    "currentStats": {...},
    "previousStats": {...},
    "totalListings": 25,
    "activeListings": 18,
    // ... existing fields

    "marketBreakdown": [  // ← NEW: Per-market statistics
      {
        "marketId": "691efdeb517a23d44b80207a",
        "marketName": "Shyambazar",
        "marketCity": "Kolkata",
        "totalListings": 15,
        "activeListings": 12,
        "totalRevenue": 45000.50,
        "totalOrders": 120,
        "totalQuantitySold": 1500,
        "activationRate": 80  // Percentage: (activeListings / totalListings) * 100
      },
      {
        "marketId": "...",
        "marketName": "Karwan Bazar",
        "marketCity": "Dhaka",
        "totalListings": 10,
        "activeListings": 6,
        "totalRevenue": 32000.00,
        "totalOrders": 85,
        "totalQuantitySold": 950,
        "activationRate": 60
      }
    ]
  }
}
```

---

## Frontend Implementation Requirements

### 1. Vendor Listing Create/Edit Form

**Location:** Vendor Dashboard → Create Listing / Edit Listing

**NEW UI Element: Market Selection Dropdown**

#### Requirements:
1. **Fetch Available Markets**
   ```javascript
   // API Call
   GET /api/v1/vendor-dashboard/profile  // Get vendor's markets array
   // OR (if vendor object is in state)
   const vendorMarkets = vendor.markets; // Array of market IDs

   // Then fetch market details
   GET /api/v1/public/markets  // Get all markets
   // Filter to only show markets where vendor operates
   const availableMarkets = allMarkets.filter(market =>
     vendorMarkets.includes(market._id)
   );
   ```

2. **Dropdown Component**
   - Label: "Market *" (required field)
   - Placeholder: "Select a market"
   - Options: Vendor's markets only
   - Display: `${market.name} - ${market.location.city}`
   - Value: `market._id`

3. **Form Validation**
   - Field is required
   - Show error if not selected before submit
   - Error message: "Please select a market for this listing"

4. **Error Handling**
   - Handle API error responses (403, 400)
   - Display error message from backend
   - Example: "You cannot create listings in this market. Your vendor account does not operate in the selected market."

#### Example Component (React):
```jsx
import { useState, useEffect } from 'react';

function ListingForm({ listing, vendor, onSubmit }) {
  const [formData, setFormData] = useState({
    productId: listing?.productId || '',
    marketId: listing?.marketId?._id || '',  // Pre-fill if editing
    pricing: listing?.pricing || [],
    // ... other fields
  });

  const [availableMarkets, setAvailableMarkets] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Fetch all markets
    fetch('/api/v1/public/markets')
      .then(res => res.json())
      .then(data => {
        // Filter to vendor's markets
        const vendorMarketIds = vendor.markets.map(m => m._id || m);
        const filtered = data.data.filter(market =>
          vendorMarketIds.includes(market._id)
        );
        setAvailableMarkets(filtered);
      });
  }, [vendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate market selection
    if (!formData.marketId) {
      setErrors({ ...errors, marketId: 'Please select a market' });
      return;
    }

    try {
      const response = await fetch('/api/v1/vendor-dashboard/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!data.success) {
        // Handle error (e.g., vendor not in market)
        setErrors({ marketId: data.error });
      } else {
        onSubmit(data.data);
      }
    } catch (error) {
      console.error('Error creating listing:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Product Selection */}
      <div className="form-group">
        <label>Product *</label>
        {/* Product dropdown */}
      </div>

      {/* Market Selection - NEW */}
      <div className="form-group">
        <label htmlFor="marketId">Market *</label>
        <select
          id="marketId"
          value={formData.marketId}
          onChange={(e) => setFormData({ ...formData, marketId: e.target.value })}
          className={errors.marketId ? 'error' : ''}
          required
        >
          <option value="">Select a market</option>
          {availableMarkets.map(market => (
            <option key={market._id} value={market._id}>
              {market.name} - {market.location.city}
            </option>
          ))}
        </select>
        {errors.marketId && (
          <span className="error-message">{errors.marketId}</span>
        )}
        <small className="help-text">
          You can only create listings in markets where you operate
        </small>
      </div>

      {/* Pricing, Availability, etc. */}
      {/* ... other form fields */}

      <button type="submit">Create Listing</button>
    </form>
  );
}
```

---

### 2. Vendor Listing Management Page

**Location:** Vendor Dashboard → My Listings

**NEW UI Element: Market Filter Dropdown**

#### Requirements:
1. **Filter Dropdown**
   - Position: Above listings table/grid
   - Label: "Filter by Market"
   - Options:
     - "All Markets" (default)
     - Each market vendor operates in
   - Updates URL query parameter: `?marketId=...`

2. **Market Display in Listing Cards/Rows**
   - Show market name and city
   - Example: "Shyambazar, Kolkata"
   - Badge/chip style recommended
   - Icon: 📍 or similar location icon

3. **API Integration**
   ```javascript
   // Fetch listings with market filter
   GET /api/v1/vendor-dashboard/listings?marketId=${selectedMarketId}
   // OR
   GET /api/v1/vendor-dashboard/listings?marketId=all  // Show all
   ```

#### Example Component (React):
```jsx
function VendorListings({ vendor }) {
  const [listings, setListings] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [availableMarkets, setAvailableMarkets] = useState([]);

  useEffect(() => {
    // Fetch vendor's markets
    fetch('/api/v1/public/markets')
      .then(res => res.json())
      .then(data => {
        const vendorMarketIds = vendor.markets.map(m => m._id || m);
        const filtered = data.data.filter(market =>
          vendorMarketIds.includes(market._id)
        );
        setAvailableMarkets(filtered);
      });
  }, [vendor]);

  useEffect(() => {
    // Fetch listings with filter
    const marketParam = selectedMarket === 'all' ? 'all' : selectedMarket;
    fetch(`/api/v1/vendor-dashboard/listings?marketId=${marketParam}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setListings(data.data));
  }, [selectedMarket]);

  return (
    <div className="vendor-listings">
      <div className="filters">
        <label>Filter by Market:</label>
        <select
          value={selectedMarket}
          onChange={(e) => setSelectedMarket(e.target.value)}
        >
          <option value="all">All Markets</option>
          {availableMarkets.map(market => (
            <option key={market._id} value={market._id}>
              {market.name} - {market.location.city}
            </option>
          ))}
        </select>
      </div>

      <div className="listings-grid">
        {listings.map(listing => (
          <div key={listing._id} className="listing-card">
            <h3>{listing.productId.name}</h3>

            {/* Market Badge - NEW */}
            <div className="market-badge">
              📍 {listing.marketId.name}, {listing.marketId.location.city}
            </div>

            <div className="pricing">
              ₹{listing.pricing[0].pricePerUnit}/{listing.pricing[0].unit}
            </div>

            {/* Status, actions, etc. */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 3. Public Listing Browse/Search Pages

**Location:** Public Pages → Browse Listings / Search

**NEW UI Element: Market Filter**

#### Requirements:
1. **Market Filter Dropdown/Chips**
   - Position: Sidebar or top filters
   - Type: Dropdown or chip selection
   - Label: "Market Location"
   - Options: All active markets from `GET /api/v1/public/markets`
   - Default: "All Markets"

2. **Market Display on Listing Cards**
   - Show market name and city on each listing card
   - Example: "Available at: Shyambazar, Kolkata"
   - Use subtle badge/chip styling

3. **URL Integration**
   - Update URL: `?marketId=691efdeb517a23d44b80207a`
   - Support deep linking (shareable URLs)

4. **API Integration**
   ```javascript
   GET /api/v1/public/listings?marketId=${selectedMarketId}&page=1&limit=20
   ```

#### Example Component (React):
```jsx
function PublicListings() {
  const [listings, setListings] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [filters, setFilters] = useState({
    marketId: '',
    search: '',
    category: '',
    page: 1
  });

  useEffect(() => {
    // Fetch all markets for filter
    fetch('/api/v1/public/markets')
      .then(res => res.json())
      .then(data => setMarkets(data.data));
  }, []);

  useEffect(() => {
    // Build query string
    const params = new URLSearchParams();
    if (filters.marketId) params.append('marketId', filters.marketId);
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    params.append('page', filters.page);

    // Fetch listings
    fetch(`/api/v1/public/listings?${params.toString()}`)
      .then(res => res.json())
      .then(data => setListings(data.data));
  }, [filters]);

  return (
    <div className="public-listings">
      <aside className="filters-sidebar">
        {/* Search */}
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search products..."
          />
        </div>

        {/* Market Filter - NEW */}
        <div className="filter-group">
          <label>Market Location</label>
          <select
            value={filters.marketId}
            onChange={(e) => setFilters({ ...filters, marketId: e.target.value, page: 1 })}
          >
            <option value="">All Markets</option>
            {markets.map(market => (
              <option key={market._id} value={market._id}>
                {market.name} - {market.location.city}
              </option>
            ))}
          </select>
        </div>

        {/* Category, Price Range, etc. */}
      </aside>

      <main className="listings-content">
        {filters.marketId && (
          <div className="active-filters">
            Showing listings from: {markets.find(m => m._id === filters.marketId)?.name}
            <button onClick={() => setFilters({ ...filters, marketId: '' })}>
              ✕ Clear
            </button>
          </div>
        )}

        <div className="listings-grid">
          {listings.map(listing => (
            <div key={listing._id} className="listing-card">
              <img src={listing.images[0]?.url} alt={listing.productId.name} />
              <h3>{listing.productId.name}</h3>

              {/* Market Badge */}
              <div className="market-info">
                📍 {listing.marketId.name}, {listing.marketId.location.city}
              </div>

              <div className="vendor-info">
                by {listing.vendorId.businessName}
              </div>

              <div className="pricing">
                ₹{listing.pricing[0].pricePerUnit}/{listing.pricing[0].unit}
              </div>

              <button>Add to Cart</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
```

---

### 4. Product Detail Page

**Location:** Public Pages → Product Detail

**NEW: Market Filter for Listings**

#### Requirements:
1. **Market Filter Dropdown**
   - Label: "Show prices from:"
   - Options: All markets that have listings for this product
   - Default: "All Markets"

2. **Market Display in Listings Section**
   - Each vendor listing shows market name
   - Group by market (optional UX enhancement)

3. **API Integration**
   ```javascript
   GET /api/v1/public/products/:id?marketId=${selectedMarketId}
   ```

#### Example Component (React):
```jsx
function ProductDetail({ productId }) {
  const [product, setProduct] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [availableMarkets, setAvailableMarkets] = useState([]);

  useEffect(() => {
    // Fetch product with all listings
    fetch(`/api/v1/public/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data.data);

        // Extract unique markets from listings
        const markets = [...new Set(data.data.listings.map(l => l.marketId))];
        setAvailableMarkets(markets);
      });
  }, [productId]);

  useEffect(() => {
    // Fetch with market filter
    const url = selectedMarket
      ? `/api/v1/public/products/${productId}?marketId=${selectedMarket}`
      : `/api/v1/public/products/${productId}`;

    fetch(url)
      .then(res => res.json())
      .then(data => setProduct(data.data));
  }, [selectedMarket, productId]);

  if (!product) return <div>Loading...</div>;

  return (
    <div className="product-detail">
      <div className="product-header">
        <h1>{product.name}</h1>
        <p>{product.description}</p>
      </div>

      <div className="listings-section">
        <h2>Available From:</h2>

        {/* Market Filter - NEW */}
        {availableMarkets.length > 1 && (
          <div className="market-filter">
            <label>Show prices from:</label>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
            >
              <option value="">All Markets</option>
              {availableMarkets.map(market => (
                <option key={market._id} value={market._id}>
                  {market.name} - {market.location.city}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Vendor Listings */}
        <div className="vendor-listings">
          {product.listings.map(listing => (
            <div key={listing._id} className="vendor-listing-card">
              <div className="vendor-info">
                <strong>{listing.vendorId.businessName}</strong>
                <div className="market-badge">
                  📍 {listing.marketId.name}, {listing.marketId.location.city}
                </div>
              </div>

              <div className="pricing">
                <span className="price">
                  ₹{listing.pricing[0].pricePerUnit}/{listing.pricing[0].unit}
                </span>
                <span className="quality">{listing.qualityGrade}</span>
              </div>

              <div className="availability">
                {listing.availability.quantityAvailable} {listing.availability.unit} available
              </div>

              <button onClick={() => addToCart(listing)}>
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 5. Shopping Cart / Checkout

**Location:** Cart Page / Checkout Flow

**CRITICAL: Same-Market Validation**

#### Requirements:
1. **Market Validation on Add to Cart**
   - When user adds first item, store the marketId
   - When adding subsequent items, validate they're from the same market
   - Prevent adding items from different markets

2. **Clear Error Messages**
   - Show modal/alert when user tries to add item from different market
   - Message: "Your cart contains items from [Market A]. You can only order from one market at a time. Please complete this order first or clear your cart."

3. **Market Display in Cart**
   - Show market name at top of cart
   - Example: "📍 Ordering from: Shyambazar, Kolkata"

4. **Clear Cart Option**
   - Allow users to clear cart if they want to switch markets
   - Confirmation: "This will remove all items. Continue?"

#### Example Component (React):
```jsx
import { useState } from 'react';

function useCart() {
  const [cart, setCart] = useState({
    items: [],
    marketId: null,
    marketName: null
  });

  const addToCart = (listing, quantity) => {
    // Check if cart is empty
    if (cart.items.length === 0) {
      // First item - set the market
      setCart({
        items: [{ listing, quantity }],
        marketId: listing.marketId._id,
        marketName: listing.marketId.name
      });
      return { success: true };
    }

    // Validate same market
    if (listing.marketId._id !== cart.marketId) {
      return {
        success: false,
        error: `Your cart contains items from ${cart.marketName}. You can only order from one market at a time. Please complete this order first or clear your cart to switch markets.`
      };
    }

    // Add to cart
    setCart({
      ...cart,
      items: [...cart.items, { listing, quantity }]
    });
    return { success: true };
  };

  const clearCart = () => {
    setCart({
      items: [],
      marketId: null,
      marketName: null
    });
  };

  return { cart, addToCart, clearCart };
}

function CartPage() {
  const { cart, addToCart, clearCart } = useCart();

  const handleClearCart = () => {
    if (confirm('This will remove all items from your cart. Continue?')) {
      clearCart();
    }
  };

  if (cart.items.length === 0) {
    return <div>Your cart is empty</div>;
  }

  return (
    <div className="cart-page">
      {/* Market Badge */}
      <div className="cart-market-info">
        📍 Ordering from: <strong>{cart.marketName}</strong>
        <button onClick={handleClearCart} className="link-button">
          Change market (clear cart)
        </button>
      </div>

      {/* Cart Items */}
      <div className="cart-items">
        {cart.items.map((item, index) => (
          <div key={index} className="cart-item">
            <img src={item.listing.images[0]?.url} />
            <div className="item-details">
              <h3>{item.listing.productId.name}</h3>
              <p>Vendor: {item.listing.vendorId.businessName}</p>
              <p>Price: ₹{item.listing.pricing[0].pricePerUnit}/{item.listing.pricing[0].unit}</p>
            </div>
            <div className="quantity">
              Quantity: {item.quantity}
            </div>
          </div>
        ))}
      </div>

      <button className="checkout-button">
        Proceed to Checkout
      </button>
    </div>
  );
}

// Add to Cart Button with Error Handling
function AddToCartButton({ listing }) {
  const { addToCart } = useCart();
  const [error, setError] = useState(null);

  const handleAddToCart = () => {
    const result = addToCart(listing, 1);

    if (!result.success) {
      setError(result.error);
      // Show error modal
      alert(result.error); // Or use a proper modal component
    }
  };

  return (
    <>
      <button onClick={handleAddToCart}>Add to Cart</button>
      {error && <div className="error-message">{error}</div>}
    </>
  );
}
```

---

### 6. Vendor Dashboard Analytics

**Location:** Vendor Dashboard → Overview / Analytics

**NEW: Market Breakdown Section**

#### Requirements:
1. **Market Breakdown Cards/Table**
   - Display statistics per market
   - Show: Market name, city, listings count, revenue, orders
   - Sort by revenue (highest first)

2. **Metrics to Display:**
   - Total listings per market
   - Active listings per market
   - Activation rate (%)
   - Total revenue per market
   - Total orders per market
   - Total quantity sold per market

3. **Visual Design:**
   - Cards or table layout
   - Use charts (bar/pie chart) for visual representation
   - Color coding for activation rate (green >80%, yellow 50-80%, red <50%)

4. **API Integration:**
   ```javascript
   GET /api/v1/vendor-dashboard/overview
   // Response includes marketBreakdown array
   ```

#### Example Component (React):
```jsx
import { useEffect, useState } from 'react';

function VendorDashboard() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetch('/api/v1/vendor-dashboard/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDashboardData(data.data));
  }, []);

  if (!dashboardData) return <div>Loading...</div>;

  return (
    <div className="vendor-dashboard">
      {/* Existing Dashboard Metrics */}
      <div className="overview-cards">
        <div className="card">
          <h3>Total Revenue</h3>
          <p>₹{dashboardData.currentStats.totalRevenue}</p>
        </div>
        <div className="card">
          <h3>Total Orders</h3>
          <p>{dashboardData.currentStats.totalOrders}</p>
        </div>
        {/* ... other metrics */}
      </div>

      {/* NEW: Market Breakdown Section */}
      <div className="market-breakdown-section">
        <h2>Performance by Market</h2>

        <div className="market-breakdown-grid">
          {dashboardData.marketBreakdown.map(market => (
            <div key={market.marketId} className="market-card">
              <div className="market-header">
                <h3>{market.marketName}</h3>
                <span className="market-city">📍 {market.marketCity}</span>
              </div>

              <div className="market-stats">
                <div className="stat">
                  <label>Listings</label>
                  <span>
                    {market.activeListings} / {market.totalListings} active
                  </span>
                </div>

                <div className="stat">
                  <label>Activation Rate</label>
                  <span className={getActivationClass(market.activationRate)}>
                    {market.activationRate}%
                  </span>
                </div>

                <div className="stat">
                  <label>Revenue</label>
                  <span>₹{market.totalRevenue.toLocaleString()}</span>
                </div>

                <div className="stat">
                  <label>Orders</label>
                  <span>{market.totalOrders}</span>
                </div>

                <div className="stat">
                  <label>Quantity Sold</label>
                  <span>{market.totalQuantitySold} units</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Optional: Chart Visualization */}
        {dashboardData.marketBreakdown.length > 0 && (
          <div className="market-chart">
            <h3>Revenue by Market</h3>
            <BarChart data={dashboardData.marketBreakdown} />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for activation rate color coding
function getActivationClass(rate) {
  if (rate >= 80) return 'high'; // Green
  if (rate >= 50) return 'medium'; // Yellow
  return 'low'; // Red
}

// Example Chart Component (using recharts or similar)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function MarketRevenueChart({ data }) {
  const chartData = data.map(m => ({
    name: m.marketName,
    revenue: m.totalRevenue,
    orders: m.totalOrders
  }));

  return (
    <BarChart width={600} height={300} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="revenue" fill="#8884d8" name="Revenue (₹)" />
      <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
    </BarChart>
  );
}
```

**CSS Example:**
```css
.market-breakdown-section {
  margin-top: 2rem;
}

.market-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.market-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.market-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.market-city {
  font-size: 0.9rem;
  color: #666;
}

.market-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat label {
  font-weight: 500;
  color: #666;
}

.stat span {
  font-weight: 600;
}

/* Activation rate colors */
.stat span.high {
  color: #10b981; /* Green */
}

.stat span.medium {
  color: #f59e0b; /* Yellow */
}

.stat span.low {
  color: #ef4444; /* Red */
}
```

---

### 7. Admin Listing Management

**Location:** Admin Dashboard → Manage Listings

**NEW: Market Filter**

#### Requirements:
1. **Market Filter Dropdown**
   - Position: Admin filters section
   - Options: All markets in database
   - Default: "All Markets"

2. **Market Column in Listings Table**
   - Add "Market" column
   - Display: Market name and city

3. **API Integration:**
   ```javascript
   GET /api/v1/admin/listings?marketId=${selectedMarketId}&status=active&page=1
   ```

#### Example Component (React):
```jsx
function AdminListings() {
  const [listings, setListings] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    marketId: '',
    vendor: '',
    page: 1
  });

  useEffect(() => {
    // Fetch all markets
    fetch('/api/v1/admin/markets', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
      .then(res => res.json())
      .then(data => setMarkets(data.data));
  }, []);

  useEffect(() => {
    // Build query
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.marketId) params.append('marketId', filters.marketId);
    if (filters.vendor) params.append('vendor', filters.vendor);
    params.append('page', filters.page);

    // Fetch listings
    fetch(`/api/v1/admin/listings?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
      .then(res => res.json())
      .then(data => setListings(data.data));
  }, [filters]);

  return (
    <div className="admin-listings">
      <h1>Manage Listings</h1>

      {/* Filters */}
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        {/* Market Filter - NEW */}
        <select
          value={filters.marketId}
          onChange={(e) => setFilters({ ...filters, marketId: e.target.value })}
        >
          <option value="">All Markets</option>
          {markets.map(market => (
            <option key={market._id} value={market._id}>
              {market.name} - {market.location.city}
            </option>
          ))}
        </select>
      </div>

      {/* Listings Table */}
      <table className="listings-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Vendor</th>
            <th>Market</th> {/* NEW Column */}
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings.map(listing => (
            <tr key={listing._id}>
              <td>{listing.productId.name}</td>
              <td>{listing.vendorId.businessName}</td>
              <td>
                {listing.marketId.name}<br />
                <small>{listing.marketId.location.city}</small>
              </td>
              <td>₹{listing.pricing[0].pricePerUnit}/{listing.pricing[0].unit}</td>
              <td>
                <span className={`status-badge ${listing.status}`}>
                  {listing.status}
                </span>
              </td>
              <td>
                <button>View</button>
                <button>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Validation Requirements

### Frontend Validation Rules

1. **Listing Create/Edit Form:**
   - marketId is **required**
   - Must be selected from dropdown (no manual input)
   - Should be validated before form submission

2. **Cart/Order:**
   - Validate all items are from same market **before** allowing checkout
   - Show clear error if user tries to add cross-market items
   - Prevent checkout if validation fails

3. **Market Filters:**
   - All market filters should accept empty/null for "All Markets"
   - Filter values should be valid MongoDB ObjectIds
   - Handle cases where marketId parameter is invalid (show error or ignore)

### Error Handling

**Backend Error Codes to Handle:**

1. **400 Bad Request**
   - Invalid marketId format
   - Market validation failed
   - Cross-market order validation failed

2. **403 Forbidden**
   - Vendor doesn't operate in selected market
   - Cannot create listing in market

3. **404 Not Found**
   - Market doesn't exist
   - Market is deleted or unavailable

**Example Error Handler:**
```javascript
async function handleApiError(response) {
  if (!response.ok) {
    const data = await response.json();

    switch (response.status) {
      case 400:
        // Validation error
        return { success: false, error: data.error };

      case 403:
        // Authorization error (vendor not in market)
        return { success: false, error: data.error };

      case 404:
        // Market not found
        return { success: false, error: 'Selected market is no longer available' };

      default:
        return { success: false, error: 'An unexpected error occurred' };
    }
  }

  return { success: true, data: await response.json() };
}

// Usage
const result = await handleApiError(response);
if (!result.success) {
  showError(result.error);
} else {
  handleSuccess(result.data);
}
```

---

## Testing Checklist

### Vendor Flow
- [ ] Vendor can see all their markets in listing form dropdown
- [ ] Vendor can create listing with market selection
- [ ] Form validation prevents submission without market
- [ ] Error shown if vendor tries to select market they don't operate in
- [ ] Vendor can filter their listings by market
- [ ] Vendor can edit listing and change market (if they operate in new market)
- [ ] Market badge displays correctly on listing cards
- [ ] Dashboard shows market breakdown with correct statistics

### Public Buyer Flow
- [ ] Buyers can browse listings with market filter
- [ ] Market filter updates URL and is shareable
- [ ] Listing cards show market name and location
- [ ] Product detail page shows market filter for vendor listings
- [ ] Featured listings can be filtered by market
- [ ] Market information is clearly visible on all listing displays

### Cart/Order Flow
- [ ] First item added to cart sets the market
- [ ] Adding item from different market shows error
- [ ] Error message is clear and actionable
- [ ] Market name displayed prominently in cart
- [ ] User can clear cart to switch markets
- [ ] Checkout validates same-market constraint
- [ ] Order placement succeeds with single-market items
- [ ] Order placement fails with cross-market items (with clear error)

### Admin Flow
- [ ] Admin can filter listings by market
- [ ] Market column shows in listings table
- [ ] Market filter works in combination with other filters (status, vendor)
- [ ] Admin can view market information in listing details

### Edge Cases
- [ ] Handle vendor with no markets (show message, disable listing creation)
- [ ] Handle vendor with only one market (auto-select or show dropdown with one option)
- [ ] Handle deleted/unavailable market gracefully (show error, prevent selection)
- [ ] Handle listings with orphaned marketId (backend should prevent, but show error if occurs)
- [ ] Handle empty cart when trying to checkout
- [ ] Handle concurrent cart modifications (race conditions)

---

## Migration Notes

### Database Migration Status
✅ **Completed on:** 2025-11-26

**Migration Results:**
- All vendors assigned to markets
- All listings have marketId field
- 1 orphaned listing identified (vendor doesn't exist)
- Orphaned listing flagged as inactive for admin review

### Data Integrity Notes

1. **Orphaned Listing:**
   - Listing ID: `688775d8b4432f12c0ea7905`
   - Issue: Vendor `6886fd91a7533938a57e66bd` doesn't exist
   - Status: Inactive, flagged
   - Reason: "Migration: Vendor not found - assigned to Shyambazar market. Listing remains inactive pending admin review."
   - **Frontend Action:** Admin should review and delete/reassign this listing

2. **Current Market:**
   - Only one market exists: "Shyambazar" (Kolkata)
   - All vendors assigned to this market
   - **Frontend Note:** If only one market, consider auto-selecting it or showing simplified UI

### Future Considerations

1. **Multiple Markets per Listing (Future Enhancement):**
   - Current: One market per listing
   - Future: Vendor might want to offer same product in multiple markets
   - **Frontend Impact:** Would need multi-select dropdown and duplicate listing handling

2. **Market Hierarchies (Future):**
   - Current: Flat market structure
   - Future: Regions → Cities → Markets
   - **Frontend Impact:** Cascading filters (region → city → market)

3. **Market-Specific Pricing:**
   - Current: Same pricing across markets (if vendor duplicates listing)
   - Future: Different pricing per market
   - **Frontend Impact:** Pricing management UI updates

---

## Common Gotchas & Tips

### 1. Always Populate marketId
When fetching listings from any endpoint, always check if marketId is populated:
```javascript
// Backend populates marketId automatically, but check in frontend
if (!listing.marketId || !listing.marketId.name) {
  console.error('Market data missing for listing:', listing._id);
  // Show fallback UI or fetch market separately
}
```

### 2. Market Filter State Management
Keep market filter in URL for deep linking:
```javascript
// Use URL search params
const [searchParams, setSearchParams] = useSearchParams();
const marketId = searchParams.get('marketId') || '';

// Update URL when filter changes
const handleMarketChange = (newMarketId) => {
  if (newMarketId) {
    searchParams.set('marketId', newMarketId);
  } else {
    searchParams.delete('marketId');
  }
  setSearchParams(searchParams);
};
```

### 3. Cart Market Validation
Store market context in cart state (localStorage or global state):
```javascript
// On app load, restore cart and validate marketId
const cart = JSON.parse(localStorage.getItem('cart') || '{}');
if (cart.marketId) {
  // Verify market still exists and is available
  fetch(`/api/v1/public/markets/${cart.marketId}`)
    .then(res => {
      if (!res.ok) {
        // Market no longer available, clear cart
        localStorage.removeItem('cart');
        alert('Your cart market is no longer available. Cart has been cleared.');
      }
    });
}
```

### 4. Vendor Markets Loading
Fetch vendor markets early and cache:
```javascript
// On vendor login/app load
useEffect(() => {
  if (user?.role === 'vendor') {
    fetch('/api/v1/vendor-dashboard/profile')
      .then(res => res.json())
      .then(data => {
        // Cache vendor markets in global state
        setVendorMarkets(data.data.markets);
      });
  }
}, [user]);
```

### 5. Loading States
Always show loading states for market-dependent data:
```javascript
const [markets, setMarkets] = useState([]);
const [marketsLoading, setMarketsLoading] = useState(true);

useEffect(() => {
  setMarketsLoading(true);
  fetch('/api/v1/public/markets')
    .then(res => res.json())
    .then(data => {
      setMarkets(data.data);
      setMarketsLoading(false);
    });
}, []);

// In render
if (marketsLoading) {
  return <div>Loading markets...</div>;
}
```

---

## Support & Questions

### Backend API Documentation
- Swagger/OpenAPI docs: `/api/v1/docs` (if available)
- Postman collection: `docs/postman/` (if exists)

### Contact
For backend questions or issues:
- Check backend logs for detailed error messages
- Refer to `models/Listing.js` for field structure
- Check `routes/vendor-dashboard.js` for validation rules

### Related Files
- **Migration Script:** `/scripts/migrate-listings-to-markets.js`
- **Listing Model:** `/models/Listing.js`
- **Vendor Model:** `/models/Vendor.js`
- **Market Model:** `/models/Market.js`
- **Controllers:**
  - Vendor: `/controllers/listingsController.js`
  - Public: `/controllers/publicController.js`
  - Admin: `/controllers/adminController.js`
  - Orders: `/controllers/ordersController.js`
  - Dashboard: `/controllers/vendorDashboardController.js`

---

## Changelog

### 2025-11-26 - Market Support Implementation
- Added marketId field to Listing model (required)
- Added market validation across all CRUD operations
- Added market filtering to public, vendor, and admin endpoints
- Added market breakdown analytics to vendor dashboard
- Added cross-market order validation
- Completed database migration (all listings and vendors have markets)

---

## Appendix

### Sample Market Object
```json
{
  "_id": "691efdeb517a23d44b80207a",
  "name": "Shyambazar",
  "description": "Main wholesale market in Kolkata",
  "slug": "shyambazar",
  "location": {
    "address": "Shyambazar Street, Kolkata-700004",
    "city": "Kolkata",
    "district": "Kolkata",
    "coordinates": [88.3732, 22.5958]
  },
  "image": "https://...",
  "isActive": true,
  "isAvailable": true,
  "createdAt": "2025-07-28T10:00:00.000Z",
  "updatedAt": "2025-07-28T10:00:00.000Z"
}
```

### Sample Listing Object (with marketId)
```json
{
  "_id": "688775d8b4432f12c0ea7905",
  "vendorId": {
    "_id": "6886fd91a7533938a57e66bd",
    "businessName": "Fresh Produce Co"
  },
  "productId": {
    "_id": "6886853cddb15bd800be1aaf",
    "name": "Tomato",
    "category": "Vegetables"
  },
  "marketId": {
    "_id": "691efdeb517a23d44b80207a",
    "name": "Shyambazar",
    "location": {
      "city": "Kolkata",
      "address": "Shyambazar Street, Kolkata-700004"
    }
  },
  "pricing": [
    {
      "unit": "kg",
      "pricePerUnit": 42,
      "minimumQuantity": 1
    }
  ],
  "qualityGrade": "Grade A",
  "availability": {
    "quantityAvailable": 60,
    "unit": "kg",
    "isInSeason": true
  },
  "status": "active",
  "featured": true,
  "createdAt": "2025-07-28T13:06:32.673Z",
  "updatedAt": "2025-11-26T10:00:00.000Z"
}
```

### Sample Dashboard Market Breakdown
```json
{
  "success": true,
  "data": {
    "currentStats": {...},
    "previousStats": {...},
    "totalListings": 25,
    "activeListings": 18,
    "marketBreakdown": [
      {
        "marketId": "691efdeb517a23d44b80207a",
        "marketName": "Shyambazar",
        "marketCity": "Kolkata",
        "totalListings": 15,
        "activeListings": 12,
        "totalRevenue": 45000.50,
        "totalOrders": 120,
        "totalQuantitySold": 1500,
        "activationRate": 80
      },
      {
        "marketId": "691efdeb517a23d44b80207b",
        "marketName": "Karwan Bazar",
        "marketCity": "Dhaka",
        "totalListings": 10,
        "activeListings": 6,
        "totalRevenue": 32000.00,
        "totalOrders": 85,
        "totalQuantitySold": 950,
        "activationRate": 60
      }
    ]
  }
}
```

---

**End of Document**

**Last Updated:** 2025-11-26
**Version:** 1.0
**Status:** Ready for Frontend Implementation
