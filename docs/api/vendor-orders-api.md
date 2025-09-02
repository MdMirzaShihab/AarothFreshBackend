# Vendor Order Management API

**Navigation**: [← Listings API](./vendor-listings-api.md) | [Overview](./vendor-interface-overview.md)

This document covers order management endpoints for vendors including order processing, status updates, and analytics.

## Base URL
All endpoints are prefixed with: `/api/v1/orders`

**Authentication**: All endpoints require Bearer Token with `vendor` role.

---

## Order Overview

### 1. Get All Orders

**Endpoint**: `GET /`  
**Description**: Get vendor's orders with filtering and search capabilities

#### Query Parameters
- `status` (string, optional): Filter by status - `pending`, `confirmed`, `processing`, `ready`, `delivered`, `cancelled`
- `paymentStatus` (string, optional): Filter by payment - `pending`, `paid`, `failed`, `refunded`
- `priority` (string, optional): Filter by priority - `urgent`, `high`, `normal`, `low`
- `customerId` (string, optional): Filter by specific customer
- `startDate` (string, optional): Orders from date (ISO format)
- `endDate` (string, optional): Orders to date (ISO format)
- `search` (string, optional): Search in order number, customer name
- `sortBy` (string, optional): `createdAt`, `totalAmount`, `status`, `deliveryDate`
- `sortOrder` (string, optional): `asc` or `desc` (default: `desc`)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (max: 100, default: 20)

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOrders": 156,
      "pendingOrders": 8,
      "confirmedOrders": 12,
      "processingOrders": 6,
      "readyOrders": 4,
      "deliveredOrders": 124,
      "cancelledOrders": 2,
      "totalRevenue": 25650.75,
      "avgOrderValue": 164.43
    },
    "orders": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7e8",
        "orderNumber": "ORD-2023-001456",
        "status": "confirmed",
        "priority": "normal",
        "customer": {
          "id": "64a7b8c9d1e2f3a4b5c6d7e9",
          "restaurantName": "Green Leaf Restaurant",
          "contactPerson": "Ahmed Hassan",
          "phone": "+8801234567890",
          "email": "ahmed@greenleaf.com",
          "customerType": "regular"
        },
        "items": [
          {
            "id": "64a7b8c9d1e2f3a4b5c6d7f0",
            "listingId": "64a7b8c9d1e2f3a4b5c6d7f1",
            "productName": "Organic Tomatoes",
            "quantity": 10.0,
            "unit": "kg",
            "unitPrice": 28.75,
            "subtotal": 287.50,
            "qualityGrade": "premium",
            "specialRequests": "Extra ripe tomatoes preferred"
          },
          {
            "id": "64a7b8c9d1e2f3a4b5c6d7f2",
            "listingId": "64a7b8c9d1e2f3a4b5c6d7f3",
            "productName": "Fresh Spinach",
            "quantity": 5.0,
            "unit": "kg",
            "unitPrice": 35.00,
            "subtotal": 175.00,
            "qualityGrade": "premium"
          }
        ],
        "pricing": {
          "subtotal": 462.50,
          "deliveryFee": 50.00,
          "tax": 25.63,
          "discount": 0.00,
          "totalAmount": 538.13
        },
        "payment": {
          "method": "bank_transfer",
          "status": "pending",
          "dueDate": "2023-12-20T00:00:00.000Z",
          "paidAmount": 0.00,
          "remainingAmount": 538.13
        },
        "delivery": {
          "type": "vendor_delivery",
          "address": {
            "street": "House 15, Road 8",
            "area": "Dhanmondi",
            "city": "Dhaka",
            "zipCode": "1205",
            "coordinates": {
              "latitude": 23.7465,
              "longitude": 90.3763
            }
          },
          "scheduledDate": "2023-12-16T10:00:00.000Z",
          "timeSlot": "morning",
          "instructions": "Call before delivery, use back entrance",
          "estimatedDuration": "30 min",
          "deliveryFee": 50.00
        },
        "timeline": {
          "orderPlaced": "2023-12-15T14:30:00.000Z",
          "orderConfirmed": "2023-12-15T14:45:00.000Z",
          "estimatedReady": "2023-12-16T09:30:00.000Z",
          "estimatedDelivery": "2023-12-16T10:30:00.000Z"
        },
        "communication": {
          "lastContactDate": "2023-12-15T14:45:00.000Z",
          "communicationMethod": "phone",
          "notes": "Customer confirmed delivery time",
          "unreadMessages": 0
        },
        "fulfillment": {
          "preparationTime": "4h",
          "packagingInstructions": "Use insulated bags for leafy greens",
          "qualityCheck": "pending",
          "specialHandling": false
        },
        "metadata": {
          "source": "mobile_app",
          "referenceNumber": "REF-GL-001",
          "repeatCustomer": true,
          "urgentDelivery": false
        },
        "createdAt": "2023-12-15T14:30:00.000Z",
        "updatedAt": "2023-12-15T14:45:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "pages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "statusCounts": {
        "pending": 8,
        "confirmed": 12,
        "processing": 6,
        "ready": 4,
        "delivered": 124,
        "cancelled": 2
      },
      "paymentStatusCounts": {
        "pending": 20,
        "paid": 134,
        "failed": 1,
        "refunded": 1
      },
      "priorityCounts": {
        "urgent": 3,
        "high": 15,
        "normal": 132,
        "low": 6
      }
    }
  }
}
```

---

### 2. Get Single Order

**Endpoint**: `GET /:id`  
**Description**: Get detailed information about a specific order

#### Path Parameters
- `id` (required): Order ID

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "orderNumber": "ORD-2023-001456",
      "status": "confirmed",
      "priority": "normal",
      "customer": {
        "id": "64a7b8c9d1e2f3a4b5c6d7e9",
        "restaurantName": "Green Leaf Restaurant",
        "contactPerson": "Ahmed Hassan",
        "phone": "+8801234567890",
        "email": "ahmed@greenleaf.com",
        "businessType": "restaurant",
        "customerSince": "2023-06-15T10:00:00.000Z",
        "totalOrders": 23,
        "averageOrderValue": 485.75,
        "paymentHistory": "reliable",
        "preferredDeliveryTime": "morning",
        "specialRequirements": ["organic_only", "early_delivery"],
        "address": {
          "primary": {
            "street": "House 15, Road 8",
            "area": "Dhanmondi",
            "city": "Dhaka",
            "zipCode": "1205",
            "landmark": "Near Dhanmondi Lake",
            "coordinates": {
              "latitude": 23.7465,
              "longitude": 90.3763
            }
          }
        }
      },
      "items": [
        {
          "id": "64a7b8c9d1e2f3a4b5c6d7f0",
          "listingId": "64a7b8c9d1e2f3a4b5c6d7f1",
          "productId": "64a7b8c9d1e2f3a4b5c6d7f4",
          "productName": "Organic Tomatoes",
          "productCategory": "Vegetables",
          "quantity": 10.0,
          "unit": "kg",
          "unitPrice": 28.75,
          "subtotal": 287.50,
          "qualityGrade": "premium",
          "inventory": {
            "batchId": "TOM-2023-001",
            "harvestDate": "2023-12-10T00:00:00.000Z",
            "expiryDate": "2023-12-20T00:00:00.000Z",
            "availableQuantity": 45.5,
            "reserved": true
          },
          "packaging": {
            "type": "biodegradable_bag",
            "instructions": "Keep refrigerated",
            "weight": "10.2kg"
          },
          "specialRequests": "Extra ripe tomatoes preferred",
          "costAnalysis": {
            "costPrice": 17.25,
            "profit": 11.50,
            "profitMargin": 40.0
          }
        }
      ],
      "pricing": {
        "subtotal": 462.50,
        "deliveryFee": 50.00,
        "serviceFee": 0.00,
        "tax": 25.63,
        "discount": {
          "amount": 0.00,
          "type": null,
          "code": null
        },
        "totalAmount": 538.13,
        "currency": "BDT"
      },
      "payment": {
        "method": "bank_transfer",
        "status": "pending",
        "terms": "net_7",
        "dueDate": "2023-12-22T23:59:59.999Z",
        "paidAmount": 0.00,
        "remainingAmount": 538.13,
        "paymentInstructions": "Transfer to account: ABC Bank - 1234567890",
        "creditLimit": 5000.00,
        "creditUsed": 1850.75,
        "availableCredit": 3149.25
      },
      "delivery": {
        "type": "vendor_delivery",
        "status": "scheduled",
        "address": {
          "street": "House 15, Road 8",
          "area": "Dhanmondi",
          "city": "Dhaka",
          "zipCode": "1205",
          "landmark": "Near Dhanmondi Lake",
          "coordinates": {
            "latitude": 23.7465,
            "longitude": 90.3763
          },
          "accessInstructions": "Use back entrance, parking available"
        },
        "scheduledDate": "2023-12-16T10:00:00.000Z",
        "timeSlot": "morning",
        "estimatedDuration": "30 min",
        "deliveryWindow": {
          "start": "09:30",
          "end": "11:00"
        },
        "deliveryFee": 50.00,
        "distance": 8.5,
        "route": "optimal",
        "driver": {
          "assigned": false,
          "driverId": null,
          "driverName": null,
          "vehicle": null
        },
        "instructions": "Call before delivery, customer prefers back entrance",
        "contactRequired": true
      },
      "fulfillment": {
        "status": "pending",
        "preparationTime": "4h",
        "estimatedReadyTime": "2023-12-16T09:30:00.000Z",
        "packagingRequirements": {
          "refrigerated": true,
          "fragile": false,
          "organic_certified": true,
          "instructions": "Use insulated bags for leafy greens"
        },
        "qualityCheck": {
          "required": true,
          "status": "pending",
          "checkpoints": ["freshness", "weight", "packaging"]
        },
        "staffAssigned": [],
        "specialHandling": false,
        "notes": "Priority order - ensure premium quality"
      },
      "timeline": {
        "orderPlaced": "2023-12-15T14:30:00.000Z",
        "orderConfirmed": "2023-12-15T14:45:00.000Z",
        "paymentReceived": null,
        "preparationStarted": null,
        "orderReady": null,
        "outForDelivery": null,
        "delivered": null,
        "estimatedReady": "2023-12-16T09:30:00.000Z",
        "estimatedDelivery": "2023-12-16T10:30:00.000Z"
      },
      "communication": {
        "lastContactDate": "2023-12-15T14:45:00.000Z",
        "lastContactMethod": "phone",
        "communicationPreference": "phone",
        "responseTime": "15min",
        "unreadMessages": 0,
        "notes": [
          {
            "date": "2023-12-15T14:45:00.000Z",
            "type": "confirmation",
            "message": "Order confirmed with customer, delivery time agreed"
          }
        ],
        "reminders": [
          {
            "type": "payment_reminder",
            "scheduledFor": "2023-12-20T09:00:00.000Z",
            "sent": false
          }
        ]
      },
      "analytics": {
        "profitability": {
          "totalCost": 322.88,
          "grossProfit": 215.25,
          "profitMargin": 40.0,
          "roi": 66.7
        },
        "efficiency": {
          "orderComplexity": "medium",
          "preparationComplexity": "low",
          "deliveryComplexity": "low"
        },
        "customerValue": {
          "lifetimeValue": 11174.25,
          "orderFrequency": "weekly",
          "loyaltyScore": 8.5
        }
      },
      "metadata": {
        "source": "mobile_app",
        "deviceInfo": "iOS 16.0",
        "referenceNumber": "REF-GL-001",
        "repeatCustomer": true,
        "seasonalOrder": false,
        "bulkOrder": false,
        "urgentDelivery": false,
        "customFields": {
          "purchaseOrder": "PO-GL-2023-145",
          "budgetCode": "FOOD-Q4-2023"
        }
      },
      "createdAt": "2023-12-15T14:30:00.000Z",
      "updatedAt": "2023-12-15T14:45:00.000Z"
    },
    "relatedOrders": [
      {
        "id": "64a7b8c9d1e2f3a4b5c6d7f5",
        "orderNumber": "ORD-2023-001420",
        "date": "2023-12-08T14:30:00.000Z",
        "status": "delivered",
        "amount": 425.75
      }
    ],
    "recommendations": [
      "Prepare organic certification documents for delivery",
      "Call customer 30 minutes before delivery",
      "Double-check tomato ripeness as per special request"
    ]
  }
}
```

---

## Order Status Management

### 3. Update Order Status

**Endpoint**: `PUT /:id/status`  
**Description**: Update order status with automatic workflow management

#### Path Parameters
- `id` (required): Order ID

#### Request Body
```json
{
  "status": "processing",
  "notes": "Started preparing order items, estimated completion in 3 hours",
  "estimatedReadyTime": "2023-12-16T09:00:00.000Z",
  "notifyCustomer": true,
  "qualityCheckCompleted": false,
  "staffAssigned": ["64a7b8c9d1e2f3a4b5c6d7f6"],
  "metadata": {
    "preparationStarted": "2023-12-15T18:00:00.000Z",
    "specialInstructions": "Extra care with organic tomatoes"
  }
}
```

#### Field Validation
- `status` (required, enum): `pending`, `confirmed`, `processing`, `ready`, `out_for_delivery`, `delivered`, `cancelled`
- `notes` (optional, string, max: 500): Status update notes
- `estimatedReadyTime` (optional, date): When order will be ready
- `notifyCustomer` (optional, boolean): Send notification to customer
- `qualityCheckCompleted` (optional, boolean): Quality check status
- `staffAssigned` (optional, array): Staff member IDs

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Order status updated successfully",
    "order": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "orderNumber": "ORD-2023-001456",
      "status": "processing",
      "previousStatus": "confirmed",
      "timeline": {
        "orderConfirmed": "2023-12-15T14:45:00.000Z",
        "preparationStarted": "2023-12-15T18:00:00.000Z",
        "estimatedReady": "2023-12-16T09:00:00.000Z",
        "estimatedDelivery": "2023-12-16T10:00:00.000Z"
      },
      "fulfillment": {
        "status": "in_progress",
        "staffAssigned": ["64a7b8c9d1e2f3a4b5c6d7f6"],
        "estimatedReadyTime": "2023-12-16T09:00:00.000Z"
      },
      "updatedAt": "2023-12-15T18:00:00.000Z"
    },
    "notifications": {
      "customerNotified": true,
      "notificationMethod": "sms",
      "notificationTime": "2023-12-15T18:01:00.000Z"
    },
    "automatedActions": [
      "Inventory reserved for order items",
      "Customer notification sent",
      "Delivery slot confirmed"
    ],
    "nextActions": [
      "Complete quality check",
      "Update packaging status",
      "Confirm delivery arrangements"
    ]
  }
}
```

#### Error Responses
```json
// Invalid status transition
{
  "success": false,
  "error": "Cannot change status from delivered to processing",
  "errorCode": "INVALID_STATUS_TRANSITION",
  "details": {
    "currentStatus": "delivered",
    "requestedStatus": "processing",
    "allowedTransitions": []
  }
}

// Insufficient inventory
{
  "success": false,
  "error": "Insufficient inventory to fulfill order",
  "errorCode": "INSUFFICIENT_INVENTORY",
  "details": {
    "items": [
      {
        "productName": "Organic Tomatoes",
        "requested": 10.0,
        "available": 5.5
      }
    ]
  }
}
```

---

### 4. Batch Update Order Status

**Endpoint**: `PUT /batch-status`  
**Description**: Update status for multiple orders simultaneously

#### Request Body
```json
{
  "orderIds": [
    "64a7b8c9d1e2f3a4b5c6d7e8",
    "64a7b8c9d1e2f3a4b5c6d7e9",
    "64a7b8c9d1e2f3a4b5c6d7f0"
  ],
  "status": "ready",
  "notes": "All orders ready for delivery",
  "notifyCustomers": true,
  "scheduledDeliveryDate": "2023-12-16T10:00:00.000Z"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Batch status update completed",
    "results": {
      "totalOrders": 3,
      "successful": 3,
      "failed": 0,
      "warnings": 0
    },
    "updates": [
      {
        "orderId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "orderNumber": "ORD-2023-001456",
        "status": "success",
        "previousStatus": "processing",
        "newStatus": "ready",
        "customerNotified": true
      }
    ],
    "summary": {
      "readyForDelivery": 3,
      "totalValue": 1650.75,
      "estimatedDeliveryTime": "3h",
      "customersNotified": 3
    }
  }
}
```

---

## Order Fulfillment

### 5. Process Order Items

**Endpoint**: `POST /:id/process-items`  
**Description**: Process individual items within an order

#### Path Parameters
- `id` (required): Order ID

#### Request Body
```json
{
  "items": [
    {
      "itemId": "64a7b8c9d1e2f3a4b5c6d7f0",
      "status": "ready",
      "actualQuantity": 10.0,
      "qualityGrade": "premium",
      "qualityCheck": {
        "passed": true,
        "notes": "Excellent quality, perfectly ripe",
        "inspector": "64a7b8c9d1e2f3a4b5c6d7f7"
      },
      "packaging": {
        "type": "biodegradable_bag",
        "weight": "10.2kg",
        "labelPrinted": true
      },
      "batchInfo": {
        "batchId": "TOM-2023-001",
        "harvestDate": "2023-12-10T00:00:00.000Z",
        "expiryDate": "2023-12-20T00:00:00.000Z"
      },
      "substitution": null,
      "notes": "Premium grade as requested"
    }
  ],
  "overallStatus": "processing",
  "qualityCheckBy": "64a7b8c9d1e2f3a4b5c6d7f7",
  "notes": "All items meet quality standards"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Order items processed successfully",
    "order": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "orderNumber": "ORD-2023-001456",
      "status": "processing",
      "fulfillment": {
        "status": "in_progress",
        "itemsReady": 1,
        "totalItems": 2,
        "completionPercentage": 50.0,
        "qualityCheckStatus": "passed",
        "estimatedCompletion": "2023-12-16T08:30:00.000Z"
      }
    },
    "processedItems": [
      {
        "itemId": "64a7b8c9d1e2f3a4b5c6d7f0",
        "productName": "Organic Tomatoes",
        "status": "ready",
        "qualityGrade": "premium",
        "actualQuantity": 10.0,
        "packaging": "biodegradable_bag",
        "batchId": "TOM-2023-001"
      }
    ],
    "inventory": {
      "itemsConsumed": [
        {
          "inventoryId": "64a7b8c9d1e2f3a4b5c6d7f1",
          "productName": "Organic Tomatoes",
          "quantityConsumed": 10.0,
          "batchId": "TOM-2023-001",
          "costOfGoods": 172.50
        }
      ],
      "totalCOGS": 172.50
    },
    "nextSteps": [
      "Process remaining item (Fresh Spinach)",
      "Complete final quality check",
      "Prepare for packaging and delivery"
    ]
  }
}
```

---

### 6. Handle Order Issues

**Endpoint**: `POST /:id/issues`  
**Description**: Report and handle order-related issues

#### Path Parameters
- `id` (required): Order ID

#### Request Body
```json
{
  "issueType": "inventory_shortage",
  "severity": "medium",
  "description": "Organic tomatoes short by 2kg due to quality rejection",
  "affectedItems": [
    {
      "itemId": "64a7b8c9d1e2f3a4b5c6d7f0",
      "requestedQuantity": 10.0,
      "availableQuantity": 8.0,
      "shortfall": 2.0
    }
  ],
  "proposedSolution": {
    "type": "partial_fulfillment",
    "details": "Deliver 8kg now, 2kg tomorrow morning",
    "compensation": "Free delivery for next order"
  },
  "urgency": "high",
  "customerNotification": {
    "method": "phone",
    "message": "We'll deliver 8kg today and 2kg tomorrow at no extra charge"
  }
}
```

#### Field Validation
- `issueType` (required, enum): `inventory_shortage`, `quality_issue`, `delivery_delay`, `customer_change`, `payment_issue`
- `severity` (required, enum): `low`, `medium`, `high`, `critical`
- `description` (required, string, 10-500 chars): Issue description
- `urgency` (required, enum): `low`, `medium`, `high`, `urgent`

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Order issue logged and solution proposed",
    "issue": {
      "id": "64a7b8c9d1e2f3a4b5c6d7f8",
      "orderId": "64a7b8c9d1e2f3a4b5c6d7e8",
      "issueType": "inventory_shortage",
      "severity": "medium",
      "status": "proposed_solution",
      "description": "Organic tomatoes short by 2kg due to quality rejection",
      "proposedSolution": {
        "type": "partial_fulfillment",
        "details": "Deliver 8kg now, 2kg tomorrow morning",
        "compensation": "Free delivery for next order",
        "estimatedCost": 0.00,
        "timeline": "Next day delivery"
      },
      "customerNotified": true,
      "createdAt": "2023-12-15T19:30:00.000Z"
    },
    "orderUpdates": {
      "status": "processing_with_issues",
      "estimatedDelay": "1 day",
      "revisedDeliveryDate": "2023-12-17T10:00:00.000Z"
    },
    "automatedActions": [
      "Customer notification sent",
      "Inventory allocation updated",
      "Alternative supplier contacted"
    ],
    "recommendations": [
      "Confirm customer acceptance of solution",
      "Schedule follow-up delivery",
      "Update quality control procedures"
    ]
  }
}
```

---

## Delivery Management

### 7. Schedule Delivery

**Endpoint**: `POST /:id/delivery/schedule`  
**Description**: Schedule or reschedule order delivery

#### Path Parameters
- `id` (required): Order ID

#### Request Body
```json
{
  "deliveryDate": "2023-12-16T10:00:00.000Z",
  "timeSlot": "morning",
  "deliveryWindow": {
    "start": "09:30",
    "end": "11:00"
  },
  "deliveryType": "vendor_delivery",
  "driverId": "64a7b8c9d1e2f3a4b5c6d7f9",
  "vehicle": {
    "type": "van",
    "plateNumber": "DM-GA-123",
    "capacity": "500kg"
  },
  "route": {
    "sequence": 1,
    "estimatedDuration": "30min",
    "distance": 8.5
  },
  "specialInstructions": "Call customer 15 minutes before arrival",
  "contactRequired": true,
  "rescheduling": {
    "reason": "customer_request",
    "previousDate": "2023-12-15T14:00:00.000Z"
  }
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Delivery scheduled successfully",
    "delivery": {
      "id": "64a7b8c9d1e2f3a4b5c6d7fa",
      "orderId": "64a7b8c9d1e2f3a4b5c6d7e8",
      "status": "scheduled",
      "scheduledDate": "2023-12-16T10:00:00.000Z",
      "timeSlot": "morning",
      "deliveryWindow": {
        "start": "09:30",
        "end": "11:00"
      },
      "driver": {
        "id": "64a7b8c9d1e2f3a4b5c6d7f9",
        "name": "Karim Rahman",
        "phone": "+8801987654321",
        "rating": 4.8,
        "experience": "3 years"
      },
      "vehicle": {
        "type": "van",
        "plateNumber": "DM-GA-123",
        "capacity": "500kg",
        "currentLoad": "120kg"
      },
      "route": {
        "sequence": 1,
        "totalStops": 4,
        "estimatedDuration": "30min",
        "distance": 8.5,
        "optimized": true
      },
      "tracking": {
        "trackingNumber": "TRK-001456-2023",
        "trackingUrl": "https://track.aarothfresh.com/TRK-001456-2023",
        "estimatedArrival": "2023-12-16T10:15:00.000Z"
      }
    },
    "customerNotification": {
      "sent": true,
      "method": "sms",
      "message": "Your order will be delivered tomorrow between 9:30-11:00 AM. Tracking: TRK-001456-2023"
    },
    "timeline": {
      "pickupTime": "2023-12-16T09:00:00.000Z",
      "departureTime": "2023-12-16T09:45:00.000Z",
      "estimatedArrival": "2023-12-16T10:15:00.000Z",
      "completionTime": "2023-12-16T10:30:00.000Z"
    }
  }
}
```

---

### 8. Update Delivery Status

**Endpoint**: `PUT /:id/delivery/status`  
**Description**: Update delivery status with real-time tracking

#### Path Parameters
- `id` (required): Order ID

#### Request Body
```json
{
  "status": "out_for_delivery",
  "driverLocation": {
    "latitude": 23.7505,
    "longitude": 90.3779,
    "timestamp": "2023-12-16T09:45:00.000Z"
  },
  "estimatedArrival": "2023-12-16T10:15:00.000Z",
  "notes": "Driver departed from warehouse, en route to delivery address",
  "photos": [
    "https://cdn.aarothfresh.com/deliveries/order_loaded_001456.jpg"
  ],
  "customerContact": {
    "attempted": true,
    "successful": true,
    "method": "phone",
    "notes": "Customer confirmed availability"
  }
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Delivery status updated successfully",
    "delivery": {
      "id": "64a7b8c9d1e2f3a4b5c6d7fa",
      "status": "out_for_delivery",
      "previousStatus": "scheduled",
      "currentLocation": {
        "latitude": 23.7505,
        "longitude": 90.3779,
        "address": "Mirpur Road, Dhanmondi",
        "timestamp": "2023-12-16T09:45:00.000Z"
      },
      "tracking": {
        "updates": [
          {
            "status": "departed",
            "location": "Warehouse",
            "timestamp": "2023-12-16T09:45:00.000Z",
            "notes": "Order loaded and departed"
          }
        ],
        "estimatedArrival": "2023-12-16T10:15:00.000Z",
        "progress": 25.0
      }
    },
    "order": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "status": "out_for_delivery",
      "timeline": {
        "outForDelivery": "2023-12-16T09:45:00.000Z",
        "estimatedDelivery": "2023-12-16T10:15:00.000Z"
      }
    },
    "customerNotification": {
      "sent": true,
      "method": "sms",
      "message": "Your order is out for delivery! Track: TRK-001456-2023"
    }
  }
}
```

---

## Order Analytics

### 9. Get Order Analytics

**Endpoint**: `GET /analytics`  
**Description**: Get comprehensive order analytics and insights

#### Query Parameters
- `period` (string, optional): `today`, `week`, `month`, `quarter`, `year` (default: `month`)
- `startDate` (string, optional): Start date (ISO format)
- `endDate` (string, optional): End date (ISO format)
- `groupBy` (string, optional): `day`, `week`, `month` (default: `day`)

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
      "totalOrders": 156,
      "totalRevenue": 25650.75,
      "totalProfit": 8745.25,
      "avgOrderValue": 164.43,
      "avgProfitPerOrder": 56.06,
      "fulfillmentRate": 96.2,
      "onTimeDeliveryRate": 94.5,
      "customerSatisfaction": 4.7
    },
    "orderTrends": [
      {
        "date": "2023-12-01",
        "orders": 8,
        "revenue": 1285.75,
        "profit": 412.50,
        "avgOrderValue": 160.72,
        "fulfillmentRate": 100.0
      }
    ],
    "statusDistribution": {
      "delivered": { "count": 142, "percentage": 91.0, "revenue": 24150.75 },
      "processing": { "count": 8, "percentage": 5.1, "revenue": 1200.00 },
      "ready": { "count": 4, "percentage": 2.6, "revenue": 300.00 },
      "pending": { "count": 2, "percentage": 1.3, "revenue": 0.00 }
    },
    "priorityAnalysis": {
      "urgent": { "count": 5, "avgProcessingTime": "2.1h", "onTimeRate": 100.0 },
      "high": { "count": 28, "avgProcessingTime": "3.5h", "onTimeRate": 96.4 },
      "normal": { "count": 118, "avgProcessingTime": "4.8h", "onTimeRate": 94.1 },
      "low": { "count": 5, "avgProcessingTime": "6.2h", "onTimeRate": 80.0 }
    },
    "deliveryAnalysis": {
      "avgDeliveryTime": "18.5h",
      "onTimeDeliveries": 147,
      "lateDeliveries": 8,
      "failedDeliveries": 1,
      "deliveryAreas": [
        {
          "area": "Dhanmondi",
          "orders": 45,
          "avgDeliveryTime": "45min",
          "onTimeRate": 97.8
        }
      ]
    },
    "customerAnalysis": {
      "newCustomers": 23,
      "returningCustomers": 55,
      "retentionRate": 70.5,
      "avgOrdersPerCustomer": 2.0,
      "topCustomers": [
        {
          "customerId": "64a7b8c9d1e2f3a4b5c6d7e9",
          "restaurantName": "Green Leaf Restaurant",
          "orders": 12,
          "revenue": 1950.75
        }
      ]
    },
    "productAnalysis": {
      "topProducts": [
        {
          "productName": "Organic Tomatoes",
          "orders": 67,
          "quantity": 285.5,
          "revenue": 8205.63,
          "profit": 3282.25
        }
      ],
      "categories": [
        {
          "category": "Vegetables",
          "orders": 89,
          "revenue": 15420.75,
          "profitMargin": 38.2
        }
      ]
    },
    "financialAnalysis": {
      "totalCosts": 16905.50,
      "grossProfit": 8745.25,
      "profitMargin": 34.1,
      "avgCostPerOrder": 108.37,
      "avgProfitPerOrder": 56.06,
      "highestProfitOrder": 245.75,
      "lowestProfitOrder": 12.50
    },
    "operationalMetrics": {
      "avgProcessingTime": "4.2h",
      "avgPreparationTime": "3.1h",
      "avgDeliveryTime": "1.1h",
      "qualityCheckPassRate": 98.5,
      "issueResolutionTime": "2.3h",
      "customerComplaintRate": 1.9
    },
    "recommendations": [
      "Optimize delivery routes for Uttara area to improve delivery times",
      "Consider bulk discounts for high-volume customers",
      "Implement quality control improvements for organic products",
      "Focus on acquiring more customers in high-profit segments"
    ]
  }
}
```

---

## Customer Communication

### 10. Send Order Update

**Endpoint**: `POST /:id/communicate`  
**Description**: Send updates or messages to customer about their order

#### Path Parameters
- `id` (required): Order ID

#### Request Body
```json
{
  "type": "status_update",
  "method": "sms", // "sms", "email", "push", "call"
  "message": {
    "title": "Order Update",
    "body": "Your order is ready for delivery tomorrow morning between 9:30-11:00 AM",
    "template": "order_ready",
    "variables": {
      "orderNumber": "ORD-2023-001456",
      "deliveryDate": "Tomorrow",
      "timeSlot": "9:30-11:00 AM"
    }
  },
  "priority": "normal",
  "scheduledFor": null, // Send immediately
  "trackDelivery": true,
  "requireResponse": false,
  "metadata": {
    "campaign": "order_fulfillment",
    "source": "vendor_portal"
  }
}
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Customer notification sent successfully",
    "communication": {
      "id": "64a7b8c9d1e2f3a4b5c6d7fb",
      "orderId": "64a7b8c9d1e2f3a4b5c6d7e8",
      "type": "status_update",
      "method": "sms",
      "status": "delivered",
      "recipient": "+8801234567890",
      "sentAt": "2023-12-15T19:45:00.000Z",
      "deliveredAt": "2023-12-15T19:45:15.000Z",
      "readAt": null,
      "responseRequired": false
    },
    "deliveryStats": {
      "deliveryRate": 100.0,
      "avgDeliveryTime": "3.2s",
      "readRate": 85.2,
      "responseRate": 12.5
    },
    "nextScheduled": [
      {
        "type": "delivery_reminder",
        "scheduledFor": "2023-12-16T08:30:00.000Z",
        "method": "sms"
      }
    ]
  }
}
```

---

## Error Handling

### Common Error Responses

#### Order Not Found (404)
```json
{
  "success": false,
  "error": "Order not found or not accessible",
  "errorCode": "ORDER_NOT_FOUND"
}
```

#### Invalid Status Transition (400)
```json
{
  "success": false,
  "error": "Invalid status transition",
  "errorCode": "INVALID_STATUS_TRANSITION",
  "details": {
    "currentStatus": "delivered",
    "requestedStatus": "processing",
    "allowedTransitions": ["refunded", "returned"]
  }
}
```

#### Delivery Scheduling Conflict (409)
```json
{
  "success": false,
  "error": "Delivery slot already occupied",
  "errorCode": "DELIVERY_CONFLICT",
  "details": {
    "requestedSlot": "2023-12-16T10:00:00.000Z",
    "conflictingOrder": "ORD-2023-001455",
    "availableSlots": [
      "2023-12-16T11:00:00.000Z",
      "2023-12-16T14:00:00.000Z"
    ]
  }
}
```

#### Payment Issue (402)
```json
{
  "success": false,
  "error": "Payment required before delivery",
  "errorCode": "PAYMENT_REQUIRED",
  "details": {
    "totalAmount": 538.13,
    "paidAmount": 0.00,
    "remainingAmount": 538.13,
    "paymentDueDate": "2023-12-22T23:59:59.999Z"
  }
}
```

---

**Navigation**: [← Listings API](./vendor-listings-api.md) | [Overview](./vendor-interface-overview.md)

---

## Summary

This completes the comprehensive Vendor Interface API documentation covering:

1. **Authentication & User Management** - Login, registration, profile management
2. **Dashboard Analytics** - Business intelligence and performance metrics  
3. **Inventory Management** - Stock tracking, purchase management, alerts
4. **Listings & Products** - Catalog management, pricing, performance
5. **Order Management** - Order processing, fulfillment, delivery tracking

Each document provides detailed endpoint specifications, request/response examples, validation rules, and error handling guidance to enable seamless integration with the vendor interface.