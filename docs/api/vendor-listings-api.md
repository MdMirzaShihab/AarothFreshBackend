# Vendor Listings & Product Management API

**Navigation**: [← Inventory API](./vendor-inventory-api.md) | [Overview](./vendor-interface-overview.md) | [Orders API →](./vendor-orders-api.md)

This document covers product catalog and listing management endpoints for vendors.

## Base URL
All endpoints are prefixed with: `/api/v1/listings`

**Authentication**: All endpoints require Bearer Token with `vendor` role.

---

## Listing Management

### 1. Get All Listings

**Endpoint**: `GET /`  
**Description**: Get vendor's product listings with filtering and search

#### Query Parameters
- `search` (string, optional): Search in product name, description
- `category` (string, optional): Filter by product category
- `status` (string, optional): `active`, `inactive`, `out_of_stock`, `draft`
- `priceMin` (number, optional): Minimum price filter
- `priceMax` (number, optional): Maximum price filter
- `sortBy` (string, optional): `name`, `price`, `createdAt`, `updatedAt`, `rating`, `sales`
- `sortOrder` (string, optional): `asc` or `desc` (default: `desc`)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (max: 100, default: 20)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalListings": 45,
      "activeListings": 42,
      "inactiveListings": 3,
      "draftListings": 2,
      "outOfStockListings": 1,
      "avgRating": 4.6,
      "totalRevenue": 125650.75
    },
    "listings": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7e8",
        "productId": {
          "id": "64a7b8c9d1e2f3a4b5c6d7e9",
          "name": "Organic Tomatoes",
          "category": "Vegetables",
          "description": "Fresh organic tomatoes, locally sourced",
          "images": [
            "https://cdn.aarothfresh.com/products/tomatoes_1.jpg"
          ]
        },
        "title": "Premium Organic Tomatoes - Farm Fresh",
        "description": "Hand-picked organic tomatoes from our certified farms. Perfect for cooking and salads.",
        "price": {
          "selling": 28.75,
          "minimum": 25.00,
          "bulk": 26.50,
          "currency": "BDT"
        },
        "inventory": {
          "available": 45.5,
          "reserved": 5.0,
          "unit": "kg",
          "minOrderQuantity": 1.0,
          "maxOrderQuantity": 50.0,
          "inventoryId": "64a7b8c9d1e2f3a4b5c6d7f0"
        },
        "status": "active",
        "visibility": "public",
        "quality": {
          "grade": "premium",
          "certifications": ["organic", "local"],
          "shelfLife": 7,
          "storageInstructions": "Store in cool, dry place"
        },
        "delivery": {
          "areas": ["Dhanmondi", "Gulshan", "Banani"],
          "timeSlots": ["morning", "afternoon"],
          "minDeliveryTime": "2h",
          "maxDeliveryTime": "6h"
        },
        "performance": {
          "totalSales": 285.5,
          "totalRevenue": 8205.63,
          "totalOrders": 67,
          "rating": {
            "average": 4.8,
            "count": 34,
            "breakdown": {
              "5": 22,
              "4": 8,
              "3": 3,
              "2": 1,
              "1": 0
            }
          }
        },
        "profitAnalytics": {
          "totalRevenue": 8205.63,
          "totalCost": 4923.38,
          "grossProfit": 3282.25,
          "profitMargin": 40.0,
          "roi": 66.7
        },
        "seoMetadata": {
          "metaTitle": "Fresh Organic Tomatoes | Premium Quality",
          "metaDescription": "Buy fresh organic tomatoes online. Locally sourced, premium quality.",
          "keywords": ["organic", "tomatoes", "fresh", "vegetables"]
        },
        "createdAt": "2023-11-01T10:00:00.000Z",
        "updatedAt": "2023-12-15T14:30:00.000Z",
        "lastSoldAt": "2023-12-15T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "categories": ["Vegetables", "Fruits", "Leafy Greens"],
      "priceRange": {
        "min": 15.00,
        "max": 85.75
      },
      "qualityGrades": ["premium", "standard", "basic"]
    }
  }
}
```

---

### 2. Create New Listing

**Endpoint**: `POST /`  
**Description**: Create a new product listing

#### Request Body
```json
{
  "productId": "64a7b8c9d1e2f3a4b5c6d7e9",
  "title": "Premium Organic Tomatoes - Farm Fresh",
  "description": "Hand-picked organic tomatoes from our certified farms. Perfect for cooking and salads.",
  "price": {
    "selling": 28.75,
    "minimum": 25.00,
    "bulk": 26.50
  },
  "inventory": {
    "minOrderQuantity": 1.0,
    "maxOrderQuantity": 50.0,
    "inventoryId": "64a7b8c9d1e2f3a4b5c6d7f0"
  },
  "quality": {
    "grade": "premium",
    "certifications": ["organic", "local"],
    "shelfLife": 7,
    "storageInstructions": "Store in cool, dry place"
  },
  "delivery": {
    "areas": ["Dhanmondi", "Gulshan", "Banani"],
    "timeSlots": ["morning", "afternoon"],
    "minDeliveryTime": "2h",
    "maxDeliveryTime": "6h"
  },
  "seoMetadata": {
    "metaTitle": "Fresh Organic Tomatoes | Premium Quality",
    "metaDescription": "Buy fresh organic tomatoes online. Locally sourced, premium quality.",
    "keywords": ["organic", "tomatoes", "fresh", "vegetables"]
  },
  "visibility": "public",
  "status": "active"
}
```

#### Field Validation
- `productId` (required, MongoDB ObjectId): Must be valid product with inventory
- `title` (required, string, 10-200 chars): Listing title
- `description` (required, string, 50-1000 chars): Detailed description
- `price.selling` (required, number, min: 0.01): Main selling price
- `price.minimum` (optional, number): Minimum acceptable price
- `inventory.minOrderQuantity` (optional, number, min: 0.1): Minimum order quantity
- `quality.grade` (required, enum): `premium`, `standard`, `basic`
- `delivery.areas` (required, array): Delivery areas
- `status` (required, enum): `active`, `inactive`, `draft`

#### Success Response (201)
```json
{
  "success": true,
  "data": {
    "message": "Listing created successfully",
    "listing": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "productId": "64a7b8c9d1e2f3a4b5c6d7e9",
      "title": "Premium Organic Tomatoes - Farm Fresh",
      "status": "active",
      "visibility": "public",
      "price": {
        "selling": 28.75,
        "minimum": 25.00,
        "bulk": 26.50,
        "currency": "BDT"
      },
      "inventory": {
        "available": 45.5,
        "unit": "kg",
        "status": "in_stock"
      },
      "createdAt": "2023-12-15T16:00:00.000Z"
    }
  }
}
```

#### Error Responses
```json
// Product already has listing
{
  "success": false,
  "error": "Product already has an active listing",
  "errorCode": "LISTING_EXISTS"
}

// No inventory available
{
  "success": false,
  "error": "No inventory available for this product",
  "errorCode": "NO_INVENTORY"
}

// Invalid product
{
  "success": false,
  "error": "Product not found or not accessible",
  "errorCode": "PRODUCT_NOT_FOUND"
}
```

---

### 3. Get Single Listing

**Endpoint**: `GET /:id`  
**Description**: Get detailed information about a specific listing

#### Path Parameters
- `id` (required): Listing ID

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "listing": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "productId": {
        "id": "64a7b8c9d1e2f3a4b5c6d7e9",
        "name": "Organic Tomatoes",
        "category": "Vegetables",
        "description": "Fresh organic tomatoes",
        "images": [
          "https://cdn.aarothfresh.com/products/tomatoes_1.jpg",
          "https://cdn.aarothfresh.com/products/tomatoes_2.jpg"
        ],
        "nutritionalInfo": {
          "calories": 18,
          "protein": 0.9,
          "carbs": 3.9,
          "fiber": 1.2,
          "vitamins": ["C", "K", "Folate"]
        }
      },
      "title": "Premium Organic Tomatoes - Farm Fresh",
      "description": "Hand-picked organic tomatoes from our certified farms. Perfect for cooking and salads.",
      "price": {
        "selling": 28.75,
        "minimum": 25.00,
        "bulk": 26.50,
        "currency": "BDT",
        "priceHistory": [
          { "price": 26.50, "date": "2023-11-01T00:00:00.000Z" },
          { "price": 28.75, "date": "2023-12-01T00:00:00.000Z" }
        ]
      },
      "inventory": {
        "available": 45.5,
        "reserved": 5.0,
        "total": 50.5,
        "unit": "kg",
        "minOrderQuantity": 1.0,
        "maxOrderQuantity": 50.0,
        "inventoryId": "64a7b8c9d1e2f3a4b5c6d7f0",
        "lastRestocked": "2023-12-15T10:30:00.000Z",
        "stockStatus": "in_stock",
        "lowStockThreshold": 20.0
      },
      "status": "active",
      "visibility": "public",
      "quality": {
        "grade": "premium",
        "certifications": ["organic", "local"],
        "shelfLife": 7,
        "storageInstructions": "Store in cool, dry place",
        "harvestDate": "2023-12-10T00:00:00.000Z",
        "qualityScore": 9.2
      },
      "delivery": {
        "areas": ["Dhanmondi", "Gulshan", "Banani"],
        "timeSlots": ["morning", "afternoon"],
        "minDeliveryTime": "2h",
        "maxDeliveryTime": "6h",
        "deliveryFee": 50.00,
        "freeDeliveryThreshold": 500.00
      },
      "performance": {
        "totalSales": 285.5,
        "totalRevenue": 8205.63,
        "totalOrders": 67,
        "averageOrderSize": 4.3,
        "conversionRate": 12.5,
        "viewCount": 534,
        "wishlistCount": 23,
        "rating": {
          "average": 4.8,
          "count": 34,
          "breakdown": {
            "5": 22,
            "4": 8,
            "3": 3,
            "2": 1,
            "1": 0
          }
        },
        "recentReviews": [
          {
            "id": "64a7b8c9d1e2f3a4b5c6d7f1",
            "customer": "Green Leaf Restaurant",
            "rating": 5,
            "comment": "Excellent quality, always fresh",
            "date": "2023-12-14T16:00:00.000Z",
            "verified": true
          }
        ]
      },
      "profitAnalytics": {
        "totalRevenue": 8205.63,
        "totalCost": 4923.38,
        "grossProfit": 3282.25,
        "profitMargin": 40.0,
        "roi": 66.7,
        "avgCostPerUnit": 17.25,
        "avgProfitPerUnit": 11.50,
        "salesHistory": [
          {
            "date": "2023-12-15",
            "quantity": 15.0,
            "revenue": 431.25,
            "cost": 258.75,
            "profit": 172.50
          }
        ]
      },
      "seoMetadata": {
        "metaTitle": "Fresh Organic Tomatoes | Premium Quality",
        "metaDescription": "Buy fresh organic tomatoes online. Locally sourced, premium quality.",
        "keywords": ["organic", "tomatoes", "fresh", "vegetables"],
        "slug": "premium-organic-tomatoes-farm-fresh"
      },
      "competitiveAnalysis": {
        "marketPosition": "premium",
        "priceCompetitiveness": "competitive",
        "avgMarketPrice": 29.50,
        "priceAdvantage": -2.6
      },
      "createdAt": "2023-11-01T10:00:00.000Z",
      "updatedAt": "2023-12-15T14:30:00.000Z",
      "lastSoldAt": "2023-12-15T14:30:00.000Z"
    },
    "relatedListings": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f2",
        "title": "Fresh Cherry Tomatoes",
        "price": 35.00,
        "rating": 4.6
      }
    ],
    "recommendations": [
      "Consider bundling with other vegetables",
      "Optimize pricing based on market analysis",
      "Add more product images for better conversion"
    ]
  }
}
```

---

### 4. Update Listing

**Endpoint**: `PUT /:id`  
**Description**: Update an existing listing

#### Path Parameters
- `id` (required): Listing ID

#### Request Body (Partial Update)
```json
{
  "title": "Premium Organic Tomatoes - Farm Fresh Daily",
  "price": {
    "selling": 29.50,
    "minimum": 26.00,
    "bulk": 27.75
  },
  "description": "Hand-picked organic tomatoes from our certified farms, harvested daily for maximum freshness.",
  "delivery": {
    "areas": ["Dhanmondi", "Gulshan", "Banani", "Uttara"],
    "timeSlots": ["morning", "afternoon", "evening"]
  },
  "seoMetadata": {
    "metaTitle": "Fresh Organic Tomatoes Daily | Premium Quality",
    "keywords": ["organic", "tomatoes", "fresh", "vegetables", "daily"]
  }
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Listing updated successfully",
    "listing": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "title": "Premium Organic Tomatoes - Farm Fresh Daily",
      "price": {
        "selling": 29.50,
        "minimum": 26.00,
        "bulk": 27.75,
        "currency": "BDT"
      },
      "updatedAt": "2023-12-15T17:00:00.000Z",
      "changes": [
        "title",
        "price",
        "description",
        "delivery.areas",
        "seoMetadata"
      ]
    }
  }
}
```

---

### 5. Delete Listing

**Endpoint**: `DELETE /:id`  
**Description**: Delete or deactivate a listing

#### Path Parameters
- `id` (required): Listing ID

#### Query Parameters
- `permanent` (boolean, optional): Permanently delete (default: false, just deactivates)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Listing deleted successfully",
    "action": "deactivated", // or "deleted" if permanent=true
    "listing": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "status": "inactive",
      "deactivatedAt": "2023-12-15T17:30:00.000Z"
    }
  }
}
```

---

## Bulk Operations

### 6. Bulk Update Listings

**Endpoint**: `PUT /bulk`  
**Description**: Update multiple listings at once

#### Request Body
```json
{
  "listingIds": [
    "64a7b8c9d1e2f3a4b5c6d7e8",
    "64a7b8c9d1e2f3a4b5c6d7e9",
    "64a7b8c9d1e2f3a4b5c6d7f0"
  ],
  "updates": {
    "status": "active",
    "delivery": {
      "areas": ["Dhanmondi", "Gulshan", "Banani", "Uttara"]
    },
    "visibility": "public"
  }
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Bulk update completed",
    "results": {
      "totalRequested": 3,
      "successful": 3,
      "failed": 0,
      "warnings": 0
    },
    "details": [
      {
        "listingId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "status": "success",
        "changes": ["status", "delivery.areas"]
      },
      {
        "listingId": "64a7b8c9d1e2f3a4b5c6d7e9",
        "status": "success",
        "changes": ["status", "delivery.areas", "visibility"]
      }
    ]
  }
}
```

---

### 7. Bulk Price Update

**Endpoint**: `PUT /bulk-pricing`  
**Description**: Update prices for multiple listings

#### Request Body
```json
{
  "updateType": "percentage", // "percentage", "fixed", "individual"
  "updates": {
    "percentage": 5.0, // 5% increase
    "applyTo": "selling", // "selling", "minimum", "bulk", "all"
    "category": "Vegetables", // optional: apply only to specific category
    "minCurrentPrice": 20.00, // optional: apply only to items above this price
    "maxCurrentPrice": 50.00 // optional: apply only to items below this price
  },
  "individualUpdates": [ // used when updateType is "individual"
    {
      "listingId": "64a7b8c9d1e2f3a4b5c6d7e8",
      "selling": 30.25,
      "minimum": 27.00
    }
  ]
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Bulk price update completed",
    "results": {
      "totalListings": 25,
      "updated": 23,
      "skipped": 2,
      "errors": 0
    },
    "summary": {
      "avgPriceIncrease": 1.42,
      "totalRevenueImpact": 2850.75,
      "affectedCategories": ["Vegetables", "Fruits"]
    },
    "details": [
      {
        "listingId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "productName": "Organic Tomatoes",
        "oldPrice": 28.75,
        "newPrice": 30.19,
        "increase": 1.44,
        "percentageIncrease": 5.0
      }
    ]
  }
}
```

---

## Performance Analytics

### 8. Get Listing Performance

**Endpoint**: `GET /:id/performance`  
**Description**: Get detailed performance analytics for a specific listing

#### Path Parameters
- `id` (required): Listing ID

#### Query Parameters
- `period` (string, optional): `today`, `week`, `month`, `quarter`, `year` (default: `month`)
- `startDate` (string, optional): Start date (ISO format)
- `endDate` (string, optional): End date (ISO format)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "listing": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "title": "Premium Organic Tomatoes - Farm Fresh",
      "status": "active"
    },
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z",
      "label": "month"
    },
    "salesPerformance": {
      "totalRevenue": 3450.75,
      "totalCost": 2070.45,
      "grossProfit": 1380.30,
      "profitMargin": 40.0,
      "totalOrders": 24,
      "totalQuantity": 125.0,
      "averageOrderValue": 143.78,
      "averageOrderQuantity": 5.2,
      "conversionRate": 12.5
    },
    "trends": {
      "revenueGrowth": 15.2,
      "orderGrowth": 8.5,
      "profitGrowth": 18.7,
      "trend": "increasing"
    },
    "dailyMetrics": [
      {
        "date": "2023-12-01",
        "views": 45,
        "orders": 3,
        "revenue": 172.50,
        "profit": 69.00,
        "conversionRate": 6.7
      }
    ],
    "customerInsights": {
      "uniqueCustomers": 18,
      "repeatCustomers": 12,
      "repeatPurchaseRate": 66.7,
      "avgCustomerValue": 191.71,
      "topCustomers": [
        {
          "customerId": "64a7b8c9d1e2f3a4b5c6d7f3",
          "restaurantName": "Green Leaf Restaurant",
          "totalOrders": 5,
          "totalSpent": 718.75
        }
      ]
    },
    "marketingInsights": {
      "totalViews": 534,
      "uniqueViews": 287,
      "wishlistAdditions": 23,
      "shareCount": 8,
      "searchRanking": 3,
      "categoryRanking": 2,
      "clickThroughRate": 8.2
    },
    "competitivePosition": {
      "marketShare": 15.3,
      "pricePosition": "competitive",
      "qualityRating": "premium",
      "competitorCount": 12,
      "avgCompetitorPrice": 29.50
    },
    "recommendations": [
      "Consider slight price increase based on demand",
      "Optimize listing title for better search visibility",
      "Add seasonal promotion for winter months"
    ]
  }
}
```

---

## Reviews & Ratings

### 9. Get Listing Reviews

**Endpoint**: `GET /:id/reviews`  
**Description**: Get customer reviews and ratings for a listing

#### Path Parameters
- `id` (required): Listing ID

#### Query Parameters
- `rating` (integer, optional): Filter by rating (1-5)
- `verified` (boolean, optional): Show only verified purchase reviews
- `sortBy` (string, optional): `date`, `rating`, `helpful` (default: `date`)
- `sortOrder` (string, optional): `asc` or `desc` (default: `desc`)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (max: 50, default: 20)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "listing": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "title": "Premium Organic Tomatoes - Farm Fresh"
    },
    "ratingSummary": {
      "averageRating": 4.8,
      "totalReviews": 34,
      "breakdown": {
        "5": { "count": 22, "percentage": 64.7 },
        "4": { "count": 8, "percentage": 23.5 },
        "3": { "count": 3, "percentage": 8.8 },
        "2": { "count": 1, "percentage": 2.9 },
        "1": { "count": 0, "percentage": 0.0 }
      },
      "verifiedReviews": 31,
      "verifiedPercentage": 91.2
    },
    "reviews": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f4",
        "customer": {
          "id": "64a7b8c9d1e2f3a4b5c6d7f5",
          "name": "Green Leaf Restaurant",
          "verified": true,
          "totalOrders": 12
        },
        "rating": 5,
        "title": "Excellent Quality as Always",
        "comment": "We've been ordering from this vendor for months. The tomatoes are always fresh, organic, and delivered on time. Highly recommended!",
        "images": [
          "https://cdn.aarothfresh.com/reviews/rev_123_1.jpg"
        ],
        "verified": true,
        "helpfulCount": 8,
        "reportCount": 0,
        "vendorResponse": {
          "message": "Thank you for your continued trust in our products!",
          "date": "2023-12-15T10:00:00.000Z"
        },
        "purchaseDate": "2023-12-10T14:30:00.000Z",
        "reviewDate": "2023-12-14T16:00:00.000Z"
      }
    ],
    "insights": {
      "commonPositives": ["freshness", "quality", "packaging", "delivery"],
      "commonNegatives": ["pricing", "availability"],
      "averageDeliveryRating": 4.6,
      "averageQualityRating": 4.9,
      "averagePricingRating": 4.2,
      "recommendationRate": 94.1
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 34,
      "pages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 10. Respond to Review

**Endpoint**: `POST /:id/reviews/:reviewId/response`  
**Description**: Respond to a customer review

#### Path Parameters
- `id` (required): Listing ID
- `reviewId` (required): Review ID

#### Request Body
```json
{
  "message": "Thank you for your feedback! We're glad you enjoyed our organic tomatoes. We'll continue to maintain our quality standards."
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Response posted successfully",
    "response": {
      "id": "64a7b8c9d1e2f3a4b5c6d7f6",
      "reviewId": "64a7b8c9d1e2f3a4b5c6d7f4",
      "message": "Thank you for your feedback! We're glad you enjoyed our organic tomatoes.",
      "createdAt": "2023-12-15T18:00:00.000Z"
    }
  }
}
```

---

## Search & Optimization

### 11. Optimize Listing SEO

**Endpoint**: `POST /:id/optimize-seo`  
**Description**: Get SEO optimization suggestions for a listing

#### Path Parameters
- `id` (required): Listing ID

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "currentSeo": {
      "score": 78,
      "metaTitle": "Fresh Organic Tomatoes | Premium Quality",
      "metaDescription": "Buy fresh organic tomatoes online. Locally sourced, premium quality.",
      "keywords": ["organic", "tomatoes", "fresh", "vegetables"]
    },
    "suggestions": {
      "title": {
        "current": "Premium Organic Tomatoes - Farm Fresh",
        "suggested": "Premium Organic Tomatoes - Farm Fresh Daily Harvest | Best Quality",
        "improvement": "Add location and quality descriptors"
      },
      "description": {
        "improvement": "Include more specific benefits and local sourcing details",
        "suggestedLength": "150-160 characters",
        "currentLength": 89
      },
      "keywords": {
        "missing": ["local", "fresh daily", "restaurant supply"],
        "trending": ["organic vegetables", "farm to table"],
        "competitors": ["premium tomatoes", "restaurant quality"]
      }
    },
    "optimizedScore": 92,
    "recommendations": [
      "Add high-quality product images",
      "Include customer testimonials in description",
      "Use location-based keywords for local SEO",
      "Add seasonal availability information"
    ]
  }
}
```

---

## Error Handling

### Common Error Responses

#### Listing Not Found (404)
```json
{
  "success": false,
  "error": "Listing not found or not accessible",
  "errorCode": "LISTING_NOT_FOUND"
}
```

#### Inventory Sync Error (409)
```json
{
  "success": false,
  "error": "Listing inventory mismatch - please sync inventory first",
  "errorCode": "INVENTORY_SYNC_REQUIRED",
  "details": {
    "listingStock": 50,
    "actualStock": 30
  }
}
```

#### Price Validation Error (422)
```json
{
  "success": false,
  "error": "Invalid pricing structure",
  "errorCode": "PRICE_VALIDATION_ERROR",
  "details": {
    "selling": "Selling price must be greater than minimum price",
    "bulk": "Bulk price cannot exceed selling price"
  }
}
```

---

**Navigation**: [← Inventory API](./vendor-inventory-api.md) | [Overview](./vendor-interface-overview.md) | [Orders API →](./vendor-orders-api.md)