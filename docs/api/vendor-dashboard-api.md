# Vendor Dashboard Analytics API

**Navigation**: [← Auth API](./vendor-auth-api.md) | [Overview](./vendor-interface-overview.md) | [Inventory API →](./vendor-inventory-api.md)

This document covers all dashboard and analytics endpoints for vendor business intelligence.

## Base URL
All endpoints are prefixed with: `/api/v1/vendor-dashboard`

**Authentication**: All endpoints require Bearer Token with `vendor` role.

---

## Dashboard Overview

### 1. Get Dashboard Overview

**Endpoint**: `GET /overview`  
**Description**: Get comprehensive dashboard overview with key business metrics

#### Query Parameters
- `period` (string, optional): `today`, `week`, `month`, `quarter`, `year` (default: `month`)
- `startDate` (string, optional): ISO date string (overrides period)
- `endDate` (string, optional): ISO date string (overrides period)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z",
      "label": "month",
      "daysInPeriod": 31
    },
    "keyMetrics": {
      "revenue": {
        "current": 25650.75,
        "growth": 12.5
      },
      "orders": {
        "current": 156,
        "growth": 8.3
      },
      "profit": {
        "current": 8745.25,
        "growth": 15.2,
        "margin": 34.1
      },
      "averageOrderValue": 164.43,
      "totalQuantitySold": 2850
    },
    "businessMetrics": {
      "totalListings": 45,
      "activeListings": 42,
      "totalProducts": 38,
      "profitableListings": 35,
      "averageRating": 4.7,
      "listingActivationRate": 93,
      "profitabilityRate": 83
    },
    "inventoryHealth": {
      "totalItems": 38,
      "totalValue": 15420.50,
      "healthScore": 87,
      "activeItems": 33,
      "lowStockItems": 4,
      "outOfStockItems": 1,
      "overstockedItems": 0,
      "criticalAlerts": 2,
      "statusDistribution": {
        "active": 33,
        "lowStock": 4,
        "outOfStock": 1,
        "overstocked": 0
      }
    },
    "financialSummary": {
      "totalRevenue": 25650.75,
      "totalCosts": 16905.50,
      "grossProfit": 8745.25,
      "profitMargin": 34.1,
      "inventoryValue": 15420.50,
      "returnOnInventory": 56.7
    },
    "recentActivity": {
      "recentOrders": [
        {
          "id": "64a7b8c9d1e2f3a4b5c6d7e8",
          "orderNumber": "ORD-2023-001456",
          "restaurant": "Green Leaf Restaurant",
          "amount": 245.50,
          "status": "confirmed",
          "items": 4,
          "createdAt": "2023-12-15T14:30:00.000Z"
        }
      ]
    }
  }
}
```

---

## Revenue & Profit Analytics

### 2. Get Revenue Analytics

**Endpoint**: `GET /revenue`  
**Description**: Get comprehensive revenue and profit analytics with inventory cost integration

#### Query Parameters
- `period` (string, optional): Time period (default: `month`)
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string

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
      "totalRevenue": 25650.75,
      "totalCosts": 16905.50,
      "grossProfit": 8745.25,
      "profitMargin": 34.1,
      "orderCount": 156,
      "averageOrderValue": 164.43
    },
    "trends": {
      "revenue": {
        "current": 25650.75,
        "previous": 22875.25,
        "growth": 12.1,
        "trend": "increasing"
      },
      "profit": {
        "current": 8745.25,
        "previous": 7598.75,
        "growth": 15.1,
        "trend": "increasing"
      },
      "profitMargin": {
        "current": 34.1,
        "previous": 33.2,
        "change": 0.9
      }
    },
    "dailyBreakdown": [
      {
        "date": "2023-12-01",
        "revenue": 850.25,
        "costs": 561.75,
        "profit": 288.50,
        "orders": 5,
        "profitMargin": 33.9
      }
    ],
    "revenueByStatus": {
      "delivered": 24150.75,
      "confirmed": 1500.00,
      "pending": 0.00,
      "cancelled": 0.00
    },
    "profitByProduct": [
      {
        "productName": "Organic Tomatoes",
        "revenue": 3450.75,
        "costs": 2070.45,
        "profit": 1380.30,
        "profitMargin": 40.0,
        "quantity": 125
      }
    ],
    "monthlyComparison": [
      {
        "month": "2023-11",
        "revenue": 22875.25,
        "profit": 7598.75,
        "profitMargin": 33.2
      },
      {
        "month": "2023-12",
        "revenue": 25650.75,
        "profit": 8745.25,
        "profitMargin": 34.1
      }
    ],
    "inventoryInsights": {
      "totalInventoryValue": 15420.50,
      "avgCostPerUnit": 12.45,
      "inventoryTurnover": 1.6,
      "costEfficiency": 85.3
    }
  }
}
```

---

### 3. Get Order Analytics

**Endpoint**: `GET /orders`  
**Description**: Get order analytics including volume, status distribution, and trends

#### Query Parameters
- `period` (string, optional): Time period (default: `month`)
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z"
    },
    "summary": {
      "totalOrders": 156,
      "totalRevenue": 25650.75,
      "averageOrderValue": 164.43,
      "totalItems": 542,
      "uniqueCustomers": 78
    },
    "statusDistribution": {
      "delivered": { "count": 142, "percentage": 91.0, "revenue": 24150.75 },
      "confirmed": { "count": 8, "percentage": 5.1, "revenue": 1500.00 },
      "processing": { "count": 4, "percentage": 2.6, "revenue": 0.00 },
      "pending": { "count": 2, "percentage": 1.3, "revenue": 0.00 },
      "cancelled": { "count": 0, "percentage": 0.0, "revenue": 0.00 }
    },
    "dailyTrends": [
      {
        "date": "2023-12-01",
        "orders": 5,
        "revenue": 850.25,
        "avgOrderValue": 170.05,
        "fulfillmentRate": 100
      }
    ],
    "orderSizeAnalysis": {
      "small": { "range": "0-100", "count": 45, "percentage": 28.8 },
      "medium": { "range": "100-300", "count": 89, "percentage": 57.1 },
      "large": { "range": "300+", "count": 22, "percentage": 14.1 }
    },
    "customerSegments": {
      "new": { "count": 23, "percentage": 29.5, "avgOrderValue": 145.30 },
      "returning": { "count": 55, "percentage": 70.5, "avgOrderValue": 174.85 }
    },
    "fulfillmentMetrics": {
      "onTimeDeliveryRate": 94.5,
      "averageProcessingTime": "4.2h",
      "averageDeliveryTime": "18.5h",
      "cancellationRate": 2.1
    },
    "peakHours": [
      { "hour": 9, "orders": 18, "percentage": 11.5 },
      { "hour": 14, "orders": 25, "percentage": 16.0 },
      { "hour": 17, "orders": 22, "percentage": 14.1 }
    ]
  }
}
```

---

## Product Performance Analytics

### 4. Get Product Performance

**Endpoint**: `GET /products`  
**Description**: Get detailed product performance analytics with profitability focus

#### Query Parameters
- `period` (string, optional): Time period (default: `month`)
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string
- `sort` (string, optional): `revenue`, `profit`, `profitMargin`, `roi`, `quantity`, `orders` (default: `profit`)
- `limit` (integer, optional): Number of products to return (max: 100, default: 20)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z"
    },
    "summary": {
      "totalProducts": 38,
      "profitableProducts": 35,
      "totalRevenue": 25650.75,
      "totalProfit": 8745.25,
      "avgProfitMargin": 34.1,
      "bestPerformer": "Organic Tomatoes",
      "worstPerformer": "Bell Peppers"
    },
    "products": [
      {
        "productId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "productName": "Organic Tomatoes",
        "category": "Vegetables",
        "performance": {
          "totalRevenue": 3450.75,
          "totalCosts": 2070.45,
          "grossProfit": 1380.30,
          "profitMargin": 40.0,
          "roi": 66.7,
          "quantitySold": 125,
          "totalOrders": 24,
          "avgOrderQuantity": 5.2,
          "avgSellingPrice": 27.61,
          "avgCostPrice": 16.56
        },
        "trends": {
          "revenueGrowth": 15.2,
          "profitGrowth": 18.5,
          "quantityGrowth": 12.8,
          "trend": "increasing"
        },
        "inventory": {
          "currentStock": 45,
          "stockStatus": "active",
          "daysOfStock": 12,
          "reorderLevel": 20,
          "turnoverRate": 2.8
        },
        "customerMetrics": {
          "uniqueCustomers": 18,
          "repeatPurchaseRate": 67.5,
          "avgRating": 4.8,
          "reviewCount": 34
        }
      }
    ],
    "profitMarginDistribution": {
      "high": { "range": "30%+", "count": 15, "revenue": 12850.45 },
      "medium": { "range": "15-30%", "count": 18, "revenue": 9875.30 },
      "low": { "range": "0-15%", "count": 5, "revenue": 2925.00 }
    },
    "categoryPerformance": [
      {
        "category": "Leafy Greens",
        "revenue": 8450.25,
        "profit": 3380.10,
        "profitMargin": 40.0,
        "productCount": 12
      }
    ],
    "seasonalInsights": {
      "trendingProducts": ["Organic Tomatoes", "Fresh Spinach"],
      "decliningProducts": ["Bell Peppers"],
      "seasonalPeaks": {
        "winter": ["Cauliflower", "Cabbage"],
        "summer": ["Tomatoes", "Cucumbers"]
      }
    }
  }
}
```

---

## Customer Analytics

### 5. Get Customer Insights

**Endpoint**: `GET /customers`  
**Description**: Get customer behavior and insights analytics

#### Query Parameters
- `period` (string, optional): Time period (default: `month`)
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z"
    },
    "summary": {
      "totalCustomers": 78,
      "newCustomers": 23,
      "returningCustomers": 55,
      "customerRetentionRate": 70.5,
      "avgCustomerValue": 328.85,
      "topCustomerValue": 1250.75
    },
    "customerSegments": {
      "vip": {
        "count": 8,
        "criteria": "Orders >$500",
        "totalSpent": 6850.75,
        "avgOrderValue": 245.75
      },
      "regular": {
        "count": 35,
        "criteria": "Orders $100-$500",
        "totalSpent": 12450.25,
        "avgOrderValue": 175.50
      },
      "occasional": {
        "count": 35,
        "criteria": "Orders <$100",
        "totalSpent": 6349.75,
        "avgOrderValue": 89.25
      }
    },
    "topCustomers": [
      {
        "customerId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "restaurantName": "Green Leaf Restaurant",
        "totalOrders": 12,
        "totalSpent": 1250.75,
        "avgOrderValue": 104.23,
        "lastOrderDate": "2023-12-15T14:30:00.000Z",
        "customerSince": "2023-06-15T10:00:00.000Z",
        "favoriteProducts": ["Organic Tomatoes", "Fresh Spinach"]
      }
    ],
    "behaviorAnalysis": {
      "orderFrequency": {
        "weekly": 18,
        "biweekly": 25,
        "monthly": 35
      },
      "seasonalPatterns": {
        "peak": "December",
        "low": "August"
      },
      "avgTimeToReorder": "12.5 days",
      "preferredOrderTimes": {
        "morning": 35,
        "afternoon": 28,
        "evening": 15
      }
    },
    "customerFeedback": {
      "avgRating": 4.7,
      "totalReviews": 89,
      "satisfactionScore": 94.2,
      "commonComplaints": ["Delivery timing", "Product freshness"],
      "commonPraise": ["Product quality", "Packaging", "Pricing"]
    },
    "geographicDistribution": [
      {
        "area": "Dhanmondi",
        "customers": 28,
        "revenue": 8450.75,
        "avgDeliveryTime": "45 min"
      }
    ]
  }
}
```

---

## Financial Summary

### 6. Get Financial Summary

**Endpoint**: `GET /financial-summary`  
**Description**: Get comprehensive financial summary with P&L, COGS, and inventory valuation

#### Query Parameters
- `period` (string, optional): Time period (default: `month`)
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z",
      "label": "month",
      "daysInPeriod": 31
    },
    "revenue": {
      "gross": 25650.75,
      "delivered": 24150.75,
      "net": 22943.21,
      "pendingPayment": 1500.00
    },
    "profitAndLoss": {
      "revenue": 24150.75,
      "costOfGoodsSold": 15405.25,
      "grossProfit": 8745.50,
      "grossMargin": 36.2,
      "operatingExpenses": {
        "transportation": 450.75,
        "storage": 125.50,
        "other": 85.25,
        "total": 661.50
      },
      "platformFees": 1207.54,
      "netProfit": 6876.46,
      "netMargin": 28.5
    },
    "inventory": {
      "currentValue": 15420.50,
      "totalItems": 38,
      "totalQuantity": 1250,
      "averageCostPerUnit": 12.34,
      "turnoverRate": 1.85,
      "daysSalesInInventory": 17,
      "purchaseVolume": 2850,
      "totalPurchaseValue": 18750.75
    },
    "operations": {
      "totalOrders": 156,
      "deliveredOrders": 147,
      "fulfillmentRate": 94.2,
      "averageOrderValue": 164.43,
      "quantitySold": 2850,
      "averageCostPerSale": 5.41
    },
    "financialHealth": {
      "profitabilityScore": 78.5,
      "inventoryHealth": 92.5,
      "cashFlowHealth": "Positive",
      "returnOnInventory": 44.6,
      "profitableProductsRatio": 92.1
    },
    "paymentBreakdown": {
      "paid": { "count": 147, "amount": 24150.75 },
      "pending": { "count": 9, "amount": 1500.00 },
      "overdue": { "count": 0, "amount": 0.00 }
    },
    "cashFlow": {
      "inflows": [
        { "date": "2023-12-01", "amount": 850.25 },
        { "date": "2023-12-02", "amount": 1250.75 }
      ],
      "outflows": [
        { "date": "2023-12-01", "amount": 425.50 },
        { "date": "2023-12-02", "amount": 650.25 }
      ],
      "netCashFlow": 6876.46
    }
  }
}
```

---

## Additional Analytics

### 7. Get Top Products

**Endpoint**: `GET /top-products`  
**Description**: Get top performing products by specified metric

#### Query Parameters
- `period` (string, optional): Time period (default: `month`)
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string
- `metric` (string, optional): `revenue`, `profit`, `quantity`, `orders` (default: `revenue`)
- `limit` (integer, optional): Number of products (max: 20, default: 10)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z"
    },
    "metric": "revenue",
    "products": [
      {
        "productId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "productName": "Organic Tomatoes",
        "category": "Vegetables",
        "metricValue": 3450.75,
        "rank": 1,
        "performance": {
          "revenue": 3450.75,
          "profit": 1380.30,
          "quantity": 125,
          "orders": 24,
          "profitMargin": 40.0
        },
        "growth": 15.2
      }
    ],
    "summary": {
      "totalValue": 25650.75,
      "topProductsValue": 15890.45,
      "topProductsPercentage": 62.0
    }
  }
}
```

---

### 8. Get Sales Reports

**Endpoint**: `GET /sales-reports`  
**Description**: Get detailed sales reports with various breakdowns

#### Query Parameters
- `period` (string, optional): Time period (default: `month`)
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2023-12-01T00:00:00.000Z",
      "end": "2023-12-31T23:59:59.999Z"
    },
    "summary": {
      "totalSales": 25650.75,
      "totalProfit": 8745.25,
      "totalOrders": 156,
      "totalCustomers": 78,
      "avgOrderValue": 164.43
    },
    "dailySales": [
      {
        "date": "2023-12-01",
        "sales": 850.25,
        "profit": 289.75,
        "orders": 5,
        "customers": 4
      }
    ],
    "weeklySales": [
      {
        "week": "2023-W48",
        "sales": 5650.75,
        "profit": 1920.50,
        "orders": 34,
        "growth": 12.5
      }
    ],
    "productCategorySales": [
      {
        "category": "Leafy Greens",
        "sales": 8450.25,
        "profit": 3380.10,
        "orders": 48,
        "profitMargin": 40.0
      }
    ],
    "customerTypeSales": {
      "new": {
        "sales": 3345.75,
        "orders": 23,
        "avgOrderValue": 145.47
      },
      "returning": {
        "sales": 22305.00,
        "orders": 133,
        "avgOrderValue": 167.67
      }
    }
  }
}
```

---

### 9. Get Seasonal Trends

**Endpoint**: `GET /seasonal-trends`  
**Description**: Get seasonal sales trends and patterns

#### Query Parameters
- `year` (integer, optional): Year for analysis (2020-2030, default: current year)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "year": 2023,
    "monthlyTrends": [
      {
        "month": "January",
        "sales": 18450.75,
        "profit": 6257.50,
        "orders": 125,
        "seasonality": "winter_peak"
      }
    ],
    "seasonalPatterns": {
      "spring": {
        "totalSales": 65450.75,
        "avgMonthlySales": 21816.92,
        "topProducts": ["Lettuce", "Spinach"],
        "growth": 15.2
      },
      "summer": {
        "totalSales": 78950.25,
        "avgMonthlySales": 26316.75,
        "topProducts": ["Tomatoes", "Cucumbers"],
        "growth": 8.7
      },
      "autumn": {
        "totalSales": 71250.50,
        "avgMonthlySales": 23750.17,
        "topProducts": ["Cauliflower", "Broccoli"],
        "growth": -5.2
      },
      "winter": {
        "totalSales": 69875.75,
        "avgMonthlySales": 23291.92,
        "topProducts": ["Cabbage", "Carrots"],
        "growth": 12.5
      }
    },
    "peakSeasons": [
      {
        "season": "summer",
        "reason": "High demand for fresh vegetables",
        "impact": 25.3
      }
    ],
    "recommendations": [
      "Stock up on tomatoes before summer season",
      "Promote winter vegetables during autumn",
      "Prepare for spring vegetable demand"
    ]
  }
}
```

---

## Notifications & Alerts

### 10. Get Notifications

**Endpoint**: `GET /notifications`  
**Description**: Get unified vendor notifications including inventory alerts

#### Query Parameters
- `type` (string, optional): `all`, `system`, `inventory`, `order`, `payment` (default: `all`)
- `unreadOnly` (boolean, optional): Return only unread notifications
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (max: 50, default: 20)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7e8",
        "type": "inventory",
        "title": "Low Stock Alert",
        "message": "Organic Tomatoes stock is running low (5 units remaining)",
        "priority": "high",
        "isRead": false,
        "isActionRequired": true,
        "actionUrl": "/vendor/inventory/64a7b8c9d1e2f3a4b5c6d7e8",
        "actionText": "Restock Now",
        "relatedEntity": {
          "type": "inventory",
          "id": "64a7b8c9d1e2f3a4b5c6d7e8"
        },
        "metadata": {
          "productName": "Organic Tomatoes",
          "currentStock": 5,
          "reorderLevel": 20,
          "alertType": "low_stock",
          "severity": "high"
        },
        "age": 2.5,
        "createdAt": "2023-12-13T10:30:00.000Z",
        "readAt": null,
        "source": "inventory"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "summary": {
      "total": 15,
      "unread": 8,
      "urgent": 3,
      "actionRequired": 5,
      "byType": {
        "system": 4,
        "inventory": 7,
        "order": 3,
        "payment": 1
      }
    }
  }
}
```

---

## Error Handling

### Common Error Responses

#### Validation Error (422)
```json
{
  "success": false,
  "error": "Invalid date range",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "startDate": "Start date cannot be in the future",
    "endDate": "End date must be after start date"
  }
}
```

#### Insufficient Data (404)
```json
{
  "success": false,
  "error": "No data found for the specified period",
  "errorCode": "NO_DATA_FOUND"
}
```

---

**Navigation**: [← Auth API](./vendor-auth-api.md) | [Overview](./vendor-interface-overview.md) | [Inventory API →](./vendor-inventory-api.md)