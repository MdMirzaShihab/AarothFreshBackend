# Vendor Inventory Management API

**Navigation**: [← Dashboard API](./vendor-dashboard-api.md) | [Overview](./vendor-interface-overview.md) | [Listings API →](./vendor-listings-api.md)

This document covers all inventory management endpoints for vendors including purchase tracking, stock management, and analytics.

## Base URL
All endpoints are prefixed with: `/api/v1/inventory`

**Authentication**: All endpoints require Bearer Token with `vendor` role.

---

## Inventory Overview

### 1. Get Inventory Overview

**Endpoint**: `GET /`  
**Description**: Get vendor's complete inventory overview with filtering options

#### Query Parameters
- `status` (string, optional): Filter by status - `active`, `low_stock`, `out_of_stock`, `overstocked`, `inactive`
- `lowStock` (boolean, optional): Show only low stock items
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (max: 100, default: 20)
- `sortBy` (string, optional): Sort field - `productName`, `availableQuantity`, `averagePurchasePrice`, `totalValue`
- `sortOrder` (string, optional): `asc` or `desc` (default: `desc`)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalItems": 38,
      "totalValue": 15420.50,
      "activeItems": 33,
      "lowStockItems": 4,
      "outOfStockItems": 1,
      "overstockedItems": 0,
      "criticalAlerts": 2,
      "avgTurnoverRate": 2.3
    },
    "inventory": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7e8",
        "productId": {
          "id": "64a7b8c9d1e2f3a4b5c6d7e9",
          "name": "Organic Tomatoes",
          "category": "Vegetables",
          "unit": "kg"
        },
        "status": "active",
        "availableQuantity": 45.5,
        "reservedQuantity": 5.0,
        "totalQuantity": 50.5,
        "averagePurchasePrice": 18.50,
        "totalValue": 841.25,
        "reorderLevel": 20.0,
        "maxStockLevel": 100.0,
        "autoReorderEnabled": true,
        "reorderQuantity": 50.0,
        "qualityGrades": {
          "premium": 25.0,
          "standard": 20.5,
          "basic": 0.0
        },
        "expiryInfo": {
          "nearExpiry": 5.0,
          "nextExpiryDate": "2023-12-20T00:00:00.000Z",
          "avgShelfLife": 7
        },
        "turnoverMetrics": {
          "turnoverRate": 2.8,
          "daysSalesInStock": 13,
          "lastSoldDate": "2023-12-15T14:30:00.000Z"
        },
        "alerts": [
          {
            "id": "64a7b8c9d1e2f3a4b5c6d7f0",
            "type": "restock_recommended",
            "severity": "medium",
            "message": "Consider restocking - current stock will last 8 days",
            "isRead": false,
            "createdAt": "2023-12-14T10:00:00.000Z"
          }
        ],
        "createdAt": "2023-11-01T10:00:00.000Z",
        "updatedAt": "2023-12-15T16:45:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 38,
      "pages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## Purchase Management

### 2. Add New Purchase

**Endpoint**: `POST /`  
**Description**: Add new inventory purchase with complete tracking information

#### Request Body
```json
{
  "productId": "64a7b8c9d1e2f3a4b5c6d7e9",
  "purchasePrice": 15.50,
  "purchasedQuantity": 50.0,
  "unit": "kg",
  "qualityGrade": "premium",
  "supplier": {
    "name": "Green Farm Supplies",
    "contactPerson": "Ahmed Hassan",
    "phone": "+8801987654321",
    "address": "Savar, Dhaka"
  },
  "harvestDate": "2023-12-10T00:00:00.000Z",
  "expiryDate": "2023-12-20T00:00:00.000Z",
  "transportationCost": 50.00,
  "storageCost": 25.00,
  "otherCosts": 15.00,
  "batchNumber": "TOM-2023-001",
  "notes": "Fresh harvest, premium quality"
}
```

#### Field Validation
- `productId` (required, MongoDB ObjectId): Valid product ID
- `purchasePrice` (required, number, min: 0): Price per unit
- `purchasedQuantity` (required, number, min: 0.1): Quantity purchased
- `unit` (required, string): Measurement unit
- `qualityGrade` (required, string): Quality classification
- `harvestDate` (optional, date): When product was harvested
- `expiryDate` (optional, date): Expiration date
- `transportationCost` (optional, number, min: 0): Transport costs
- `storageCost` (optional, number, min: 0): Storage costs
- `otherCosts` (optional, number, min: 0): Additional costs

#### Success Response (201)
```json
{
  "success": true,
  "data": {
    "message": "Purchase added successfully",
    "inventory": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "productId": "64a7b8c9d1e2f3a4b5c6d7e9",
      "status": "active",
      "availableQuantity": 95.5,
      "averagePurchasePrice": 16.85,
      "totalValue": 1609.58,
      "lastPurchase": {
        "id": "64a7b8c9d1e2f3a4b5c6d7f1",
        "purchasePrice": 15.50,
        "quantity": 50.0,
        "totalCost": 865.00,
        "purchaseDate": "2023-12-15T10:30:00.000Z"
      }
    },
    "purchase": {
      "id": "64a7b8c9d1e2f3a4b5c6d7f1",
      "purchasePrice": 15.50,
      "purchasedQuantity": 50.0,
      "totalCost": 865.00,
      "qualityGrade": "premium",
      "batchNumber": "TOM-2023-001",
      "supplier": {
        "name": "Green Farm Supplies"
      },
      "purchaseDate": "2023-12-15T10:30:00.000Z"
    }
  }
}
```

#### Error Responses
```json
// Product not found
{
  "success": false,
  "error": "Product not found",
  "errorCode": "PRODUCT_NOT_FOUND"
}

// Invalid expiry date
{
  "success": false,
  "error": "Expiry date cannot be in the past",
  "errorCode": "INVALID_EXPIRY_DATE"
}
```

---

### 3. Get Inventory Item Details

**Endpoint**: `GET /:id`  
**Description**: Get detailed information about a specific inventory item

#### Path Parameters
- `id` (required): Inventory item ID

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "inventory": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "productId": {
        "id": "64a7b8c9d1e2f3a4b5c6d7e9",
        "name": "Organic Tomatoes",
        "category": "Vegetables",
        "description": "Fresh organic tomatoes",
        "unit": "kg"
      },
      "status": "active",
      "availableQuantity": 45.5,
      "reservedQuantity": 5.0,
      "totalQuantity": 50.5,
      "averagePurchasePrice": 18.50,
      "totalValue": 841.25,
      "costAnalytics": {
        "lowestCost": 15.00,
        "highestCost": 22.00,
        "averageCost": 18.50,
        "costTrend": "decreasing"
      },
      "settings": {
        "reorderLevel": 20.0,
        "maxStockLevel": 100.0,
        "autoReorderEnabled": true,
        "reorderQuantity": 50.0,
        "alertThresholds": {
          "lowStock": 20.0,
          "critical": 10.0
        }
      },
      "qualityBreakdown": {
        "premium": { "quantity": 25.0, "percentage": 55.1 },
        "standard": { "quantity": 20.5, "percentage": 44.9 },
        "basic": { "quantity": 0.0, "percentage": 0.0 }
      },
      "expiryTracking": {
        "nearExpiry": 5.0,
        "nextExpiryDate": "2023-12-20T00:00:00.000Z",
        "averageShelfLife": 7,
        "expiryBatches": [
          {
            "batchId": "TOM-2023-001",
            "quantity": 5.0,
            "expiryDate": "2023-12-20T00:00:00.000Z",
            "daysUntilExpiry": 5
          }
        ]
      },
      "turnoverAnalysis": {
        "turnoverRate": 2.8,
        "daysSalesInStock": 13,
        "velocityRating": "fast",
        "lastSoldDate": "2023-12-15T14:30:00.000Z",
        "avgSalesPerDay": 3.5
      },
      "supplierInsights": {
        "primarySupplier": "Green Farm Supplies",
        "supplierCount": 3,
        "avgLeadTime": 2,
        "reliabilityScore": 92.5
      },
      "profitability": {
        "avgSellingPrice": 28.75,
        "profitMargin": 35.7,
        "totalProfit": 1250.75,
        "roi": 148.6
      }
    },
    "purchaseHistory": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f1",
        "purchasePrice": 15.50,
        "purchasedQuantity": 50.0,
        "totalCost": 865.00,
        "qualityGrade": "premium",
        "supplier": {
          "name": "Green Farm Supplies",
          "contactPerson": "Ahmed Hassan"
        },
        "harvestDate": "2023-12-10T00:00:00.000Z",
        "expiryDate": "2023-12-20T00:00:00.000Z",
        "batchNumber": "TOM-2023-001",
        "remainingQuantity": 50.0,
        "status": "active",
        "purchaseDate": "2023-12-15T10:30:00.000Z"
      }
    ],
    "stockMovements": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f2",
        "type": "sale",
        "quantity": 5.0,
        "reason": "Order #ORD-2023-001456",
        "cost": 92.50,
        "date": "2023-12-15T14:30:00.000Z"
      }
    ],
    "alerts": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f0",
        "type": "restock_recommended",
        "severity": "medium",
        "message": "Consider restocking - current stock will last 8 days",
        "isRead": false,
        "createdAt": "2023-12-14T10:00:00.000Z"
      }
    ]
  }
}
```

---

## Stock Management

### 4. Update Inventory Settings

**Endpoint**: `PUT /:id/settings`  
**Description**: Update inventory management settings for a specific item

#### Path Parameters
- `id` (required): Inventory item ID

#### Request Body
```json
{
  "reorderLevel": 25.0,
  "maxStockLevel": 120.0,
  "autoReorderEnabled": true,
  "reorderQuantity": 60.0,
  "alertThresholds": {
    "lowStock": 25.0,
    "critical": 10.0
  }
}
```

#### Field Validation
- `reorderLevel` (optional, number, min: 0): Minimum stock level
- `maxStockLevel` (optional, number, min: 1): Maximum stock capacity
- `autoReorderEnabled` (optional, boolean): Enable automatic reordering
- `reorderQuantity` (optional, number, min: 1): Quantity to reorder

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Inventory settings updated successfully",
    "inventory": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "settings": {
        "reorderLevel": 25.0,
        "maxStockLevel": 120.0,
        "autoReorderEnabled": true,
        "reorderQuantity": 60.0,
        "alertThresholds": {
          "lowStock": 25.0,
          "critical": 10.0
        }
      },
      "updatedAt": "2023-12-15T16:45:00.000Z"
    }
  }
}
```

---

### 5. Adjust Stock

**Endpoint**: `POST /:id/adjust`  
**Description**: Manually adjust stock levels for wastage, damage, returns, etc.

#### Path Parameters
- `id` (required): Inventory item ID

#### Request Body
```json
{
  "type": "wastage",
  "quantity": 5.5,
  "reason": "Damaged during transport",
  "batchId": "TOM-2023-001",
  "notes": "Packaging damage, products spoiled"
}
```

#### Field Validation
- `type` (required, enum): `wastage`, `damage`, `return`, `adjustment`
- `quantity` (required, number, min: 0.1): Quantity to adjust
- `reason` (required, string, 5-200 chars): Reason for adjustment
- `batchId` (optional, string): Specific batch affected

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Stock adjustment recorded successfully",
    "adjustment": {
      "id": "64a7b8c9d1e2f3a4b5c6d7f3",
      "type": "wastage",
      "quantity": 5.5,
      "costImpact": 101.75,
      "reason": "Damaged during transport",
      "batchId": "TOM-2023-001",
      "adjustedBy": "64a7b8c9d1e2f3a4b5c6d7e0",
      "createdAt": "2023-12-15T17:00:00.000Z"
    },
    "inventory": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "availableQuantity": 40.0,
      "totalValue": 739.50,
      "status": "low_stock",
      "updatedAt": "2023-12-15T17:00:00.000Z"
    }
  }
}
```

---

## Alerts & Monitoring

### 6. Get Low Stock Alerts

**Endpoint**: `GET /alerts`  
**Description**: Get inventory alerts and warnings

#### Query Parameters
- `severity` (string, optional): Filter by severity - `all`, `critical`, `high`, `medium`, `low`
- `type` (string, optional): Filter by alert type
- `unreadOnly` (boolean, optional): Show only unread alerts
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (max: 50, default: 20)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalAlerts": 8,
      "criticalAlerts": 2,
      "highAlerts": 3,
      "mediumAlerts": 2,
      "lowAlerts": 1,
      "unreadAlerts": 5
    },
    "alerts": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f0",
        "inventoryId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "productName": "Organic Tomatoes",
        "type": "out_of_stock",
        "severity": "critical",
        "message": "Product is completely out of stock",
        "impact": "Cannot fulfill new orders",
        "recommendedAction": "Restock immediately",
        "isRead": false,
        "isActionTaken": false,
        "metadata": {
          "currentStock": 0,
          "reorderLevel": 20,
          "lastSaleDate": "2023-12-15T14:30:00.000Z",
          "avgDailySales": 3.5
        },
        "createdAt": "2023-12-15T18:00:00.000Z",
        "readAt": null
      },
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f4",
        "inventoryId": "64a7b8c9d1e2f3a4b5c6d7e9",
        "productName": "Fresh Spinach",
        "type": "expiry_warning",
        "severity": "high",
        "message": "15kg of stock expires in 2 days",
        "impact": "Potential wastage of $225.00",
        "recommendedAction": "Promote or discount expiring stock",
        "isRead": false,
        "isActionTaken": false,
        "metadata": {
          "expiringQuantity": 15,
          "daysUntilExpiry": 2,
          "potentialLoss": 225.00,
          "batchIds": ["SPN-2023-005"]
        },
        "createdAt": "2023-12-14T08:00:00.000Z",
        "readAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "actionsSummary": {
      "restockNeeded": 3,
      "expiryAction": 2,
      "qualityCheck": 1,
      "overStockReview": 2
    }
  }
}
```

---

### 7. Mark Alerts as Read

**Endpoint**: `PUT /:id/alerts/read`  
**Description**: Mark inventory alerts as read

#### Path Parameters
- `id` (required): Inventory item ID

#### Request Body
```json
{
  "alertIds": [
    "64a7b8c9d1e2f3a4b5c6d7f0",
    "64a7b8c9d1e2f3a4b5c6d7f4"
  ]
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Alerts marked as read successfully",
    "markedCount": 2,
    "remainingUnread": 3
  }
}
```

---

## Analytics & Reporting

### 8. Get Inventory Analytics

**Endpoint**: `GET /analytics`  
**Description**: Get comprehensive inventory analytics and insights

#### Query Parameters
- `startDate` (string, optional): Start date (ISO format)
- `endDate` (string, optional): End date (ISO format)
- `period` (string, optional): `today`, `week`, `month`, `quarter`, `year` (default: `month`)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z",
      "label": "month"
    },
    "summary": {
      "totalInventoryValue": 15420.50,
      "totalItems": 38,
      "totalQuantity": 1250.5,
      "averageTurnoverRate": 2.3,
      "totalPurchases": 18750.75,
      "totalCOGS": 12350.25,
      "inventoryEfficiency": 87.5
    },
    "turnoverAnalysis": {
      "fastMoving": {
        "count": 12,
        "value": 6850.25,
        "avgTurnover": 4.2
      },
      "mediumMoving": {
        "count": 18,
        "value": 6870.50,
        "avgTurnover": 2.1
      },
      "slowMoving": {
        "count": 8,
        "value": 1699.75,
        "avgTurnover": 0.8
      }
    },
    "stockStatus": {
      "healthy": { "count": 28, "percentage": 73.7 },
      "lowStock": { "count": 6, "percentage": 15.8 },
      "outOfStock": { "count": 2, "percentage": 5.3 },
      "overstocked": { "count": 2, "percentage": 5.3 }
    },
    "qualityDistribution": {
      "premium": { "quantity": 485.5, "value": 8750.25, "percentage": 38.8 },
      "standard": { "quantity": 620.0, "value": 5870.50, "percentage": 49.6 },
      "basic": { "quantity": 145.0, "value": 799.75, "percentage": 11.6 }
    },
    "expiryTracking": {
      "expiringSoon": { "quantity": 45.5, "value": 685.75, "days": 7 },
      "nearExpiry": { "quantity": 125.0, "value": 1875.50, "days": 14 },
      "longShelfLife": { "quantity": 1080.0, "value": 12859.25, "days": "30+" }
    },
    "costAnalysis": {
      "totalPurchaseCost": 18750.75,
      "avgCostPerUnit": 15.00,
      "costTrend": "stable",
      "highestCostProduct": "Premium Avocados",
      "lowestCostProduct": "Regular Potatoes",
      "costEfficiency": 92.3
    },
    "wasteAnalysis": {
      "totalWastage": 125.5,
      "wastageValue": 1875.75,
      "wastagePercentage": 10.0,
      "mainCauses": [
        { "cause": "Expiry", "percentage": 45.2 },
        { "cause": "Damage", "percentage": 32.1 },
        { "cause": "Quality decline", "percentage": 22.7 }
      ]
    },
    "supplierPerformance": [
      {
        "supplier": "Green Farm Supplies",
        "purchaseValue": 8450.75,
        "leadTime": 2.1,
        "qualityScore": 94.5,
        "reliabilityScore": 96.8
      }
    ],
    "recommendations": [
      "Consider reducing order quantity for slow-moving items",
      "Implement promotions for items nearing expiry",
      "Review supplier performance for damaged goods",
      "Optimize storage conditions to reduce wastage"
    ]
  }
}
```

---

### 9. Get Purchase History

**Endpoint**: `GET /:id/purchases`  
**Description**: Get detailed purchase history for a specific inventory item

#### Path Parameters
- `id` (required): Inventory item ID

#### Query Parameters
- `status` (string, optional): Filter by status - `active`, `sold_out`, `expired`, `damaged`
- `sortBy` (string, optional): Sort field - `purchaseDate`, `purchasePrice`, `quantity`
- `sortOrder` (string, optional): `asc` or `desc` (default: `desc`)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (max: 50, default: 20)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "productInfo": {
      "productId": "64a7b8c9d1e2f3a4b5c6d7e9",
      "productName": "Organic Tomatoes",
      "category": "Vegetables"
    },
    "summary": {
      "totalPurchases": 8,
      "totalQuantity": 425.0,
      "totalValue": 7650.75,
      "averagePrice": 18.00,
      "priceRange": {
        "min": 15.50,
        "max": 22.00
      }
    },
    "purchases": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f1",
        "purchasePrice": 15.50,
        "purchasedQuantity": 50.0,
        "remainingQuantity": 45.0,
        "soldQuantity": 5.0,
        "totalCost": 865.00,
        "costPerUnit": 17.30,
        "qualityGrade": "premium",
        "batchNumber": "TOM-2023-001",
        "status": "active",
        "supplier": {
          "name": "Green Farm Supplies",
          "contactPerson": "Ahmed Hassan",
          "phone": "+8801987654321"
        },
        "dates": {
          "purchaseDate": "2023-12-15T10:30:00.000Z",
          "harvestDate": "2023-12-10T00:00:00.000Z",
          "expiryDate": "2023-12-20T00:00:00.000Z"
        },
        "additionalCosts": {
          "transportation": 50.00,
          "storage": 25.00,
          "other": 15.00
        },
        "profitability": {
          "avgSellingPrice": 28.75,
          "profitPerUnit": 11.25,
          "profitMargin": 39.1,
          "totalProfit": 56.25
        },
        "notes": "Fresh harvest, premium quality"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

## Synchronization & Operations

### 10. Sync Listings with Inventory

**Endpoint**: `POST /sync-listings`  
**Description**: Synchronize all product listings with their current inventory levels

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Listings synchronized with inventory successfully",
    "syncResults": {
      "totalListings": 42,
      "updatedListings": 15,
      "deactivatedListings": 3,
      "errors": 0
    },
    "changes": [
      {
        "listingId": "64a7b8c9d1e2f3a4b5c6d7f5",
        "productName": "Organic Tomatoes",
        "action": "stock_updated",
        "previousStock": 20,
        "newStock": 45,
        "status": "reactivated"
      },
      {
        "listingId": "64a7b8c9d1e2f3a4b5c6d7f6",
        "productName": "Bell Peppers",
        "action": "deactivated",
        "reason": "out_of_stock",
        "stock": 0
      }
    ],
    "summary": {
      "activeListings": 39,
      "inactiveListings": 3,
      "outOfStockListings": 2,
      "lowStockListings": 4
    }
  }
}
```

---

### 11. Manual Inventory Check

**Endpoint**: `POST /check-alerts`  
**Description**: Manually trigger inventory check and generate alerts

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Inventory check completed successfully",
    "checkResults": {
      "itemsChecked": 38,
      "alertsGenerated": 5,
      "alertsUpdated": 2,
      "criticalIssues": 1
    },
    "newAlerts": [
      {
        "inventoryId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "productName": "Organic Tomatoes",
        "type": "low_stock",
        "severity": "high",
        "message": "Stock level below reorder point"
      }
    ],
    "summary": {
      "healthy": 28,
      "needsAttention": 10,
      "critical": 1,
      "recommendations": 3
    }
  }
}
```

---

## Error Handling

### Common Error Responses

#### Product Not Found (404)
```json
{
  "success": false,
  "error": "Product not found or not accessible",
  "errorCode": "PRODUCT_NOT_FOUND"
}
```

#### Insufficient Stock (400)
```json
{
  "success": false,
  "error": "Insufficient stock available",
  "errorCode": "INSUFFICIENT_STOCK",
  "details": {
    "available": 10.5,
    "requested": 15.0
  }
}
```

#### Invalid Batch (404)
```json
{
  "success": false,
  "error": "Batch not found or already consumed",
  "errorCode": "BATCH_NOT_FOUND"
}
```

#### Validation Error (422)
```json
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "quantity": "Quantity must be greater than 0",
    "expiryDate": "Expiry date cannot be in the past"
  }
}
```

---

**Navigation**: [← Dashboard API](./vendor-dashboard-api.md) | [Overview](./vendor-interface-overview.md) | [Listings API →](./vendor-listings-api.md)