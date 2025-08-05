# Aaroth Fresh API Integration Guide

This document provides detailed guidance for integrating the Aaroth Fresh React frontend with the Express.js backend API.

## Backend Architecture Understanding

### Server Configuration
- **Base URL**: `http://localhost:5000` (development)
- **API Prefix**: `/api/v1`
- **CORS**: Enabled for frontend domains
- **Body Parser**: JSON parser with 10mb limit
- **Error Handling**: Global error middleware with standardized responses

### Database & Models
- **Database**: MongoDB with Mongoose ODM
- **Connection**: Configured in `config/db.js`
- **Models**: User, Restaurant, Vendor, Product, ProductCategory, Listing, Order

## Authentication System

### Phone-Based Authentication (CRITICAL)
```javascript
// Backend expects phone numbers, NOT emails
const loginData = {
  phone: "+8801234567890",  // Must include country code
  password: "userPassword"
};

// WRONG - Don't use email
const wrongData = {
  email: "user@example.com",  // This will fail
  password: "userPassword"
};
```

### Authentication Flow
1. **Login**: `POST /api/v1/auth/login`
   - Send: `{ phone: "+8801234567890", password: "password" }`
   - Receive: `{ token: "jwt_token", user: {...} }`

2. **Register**: `POST /api/v1/auth/register`
   - Send: `{ phone, password, role, name, ...additionalFields }`
   - Receive: `{ token: "jwt_token", user: {...} }`

3. **Token Usage**: Include in every protected request
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   }
   ```

### JWT Token Management
```javascript
// Frontend token handling pattern
class AuthService {
  setToken(token) {
    localStorage.setItem('token', token);
    // Set default header for all subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  removeToken() {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
}
```

## User Roles & Permissions

### Role Hierarchy
```javascript
const USER_ROLES = {
  ADMIN: 'admin',
  VENDOR: 'vendor', 
  RESTAURANT_OWNER: 'restaurantOwner',
  RESTAURANT_MANAGER: 'restaurantManager'
};

// Role-based route access
const rolePermissions = {
  admin: ['admin', 'listings', 'orders', 'public'],
  vendor: ['listings', 'orders', 'public'],
  restaurantOwner: ['orders', 'public'],
  restaurantManager: ['orders', 'public']
};
```

### Backend Role Validation
The backend validates roles at multiple levels:
- Route level (middleware/auth.js)
- Controller level (specific permission checks)
- Data level (user can only access their own data)

## API Endpoints Reference

### Authentication Routes (`/api/v1/auth`)

#### Login
```javascript
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "+8801234567890",
  "password": "userPassword"
}

// Success Response (200)
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "phone": "+8801234567890",
    "name": "User Name",
    "role": "vendor",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}

// Error Response (400/401)
{
  "success": false,
  "message": "Invalid credentials"
}
```

#### Register
```javascript
POST /api/v1/auth/register
Content-Type: application/json

{
  "phone": "+8801234567890",
  "password": "userPassword",
  "name": "User Name",
  "role": "vendor",
  // Additional fields based on role
  "businessName": "Vendor Business", // for vendors
  "restaurantName": "Restaurant Name" // for restaurant users
}
```

### Admin Routes (`/api/v1/admin`)

#### Get All Users
```javascript
GET /api/v1/admin/users
Authorization: Bearer {admin_token}

// Query parameters
?page=1&limit=10&role=vendor&isActive=true

// Response
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50
    }
  }
}
```

#### Approve Vendor
```javascript
PUT /api/v1/admin/users/{userId}/approve
Authorization: Bearer {admin_token}

{
  "isApproved": true
}
```

### Listings Routes (`/api/v1/listings`)

#### Get All Listings
```javascript
GET /api/v1/listings
Authorization: Bearer {token}

// Query parameters for filtering
?category=vegetables&minPrice=10&maxPrice=100&vendor=vendorId&available=true&page=1&limit=20

// Response
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "listing_id",
        "vendor": {
          "id": "vendor_id",
          "name": "Vendor Name",
          "businessName": "Business Name"
        },
        "product": {
          "id": "product_id",
          "name": "Product Name",
          "category": "vegetables"
        },
        "price": 25.50,
        "unit": "kg",
        "availableQuantity": 100,
        "isAvailable": true,
        "images": ["url1", "url2"],
        "description": "Product description",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### Create Listing (Vendor Only)
```javascript
POST /api/v1/listings
Authorization: Bearer {vendor_token}
Content-Type: application/json

{
  "product": "product_id",
  "price": 25.50,
  "unit": "kg",
  "availableQuantity": 100,
  "description": "Fresh organic tomatoes",
  "images": ["image_url1", "image_url2"]
}
```

### Orders Routes (`/api/v1/orders`)

#### Create Order (Restaurant Only)
```javascript
POST /api/v1/orders
Authorization: Bearer {restaurant_token}
Content-Type: application/json

{
  "items": [
    {
      "listing": "listing_id",
      "quantity": 5,
      "unitPrice": 25.50
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Dhaka",
    "area": "Dhanmondi",
    "postalCode": "1205"
  },
  "notes": "Deliver in morning"
}
```

#### Update Order Status
```javascript
PUT /api/v1/orders/{orderId}/status
Authorization: Bearer {token}

{
  "status": "confirmed", // pending, confirmed, prepared, delivered, cancelled
  "notes": "Order confirmed and in preparation"
}
```

## Data Models & TypeScript Types

### User Model
```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'vendor' | 'restaurantOwner' | 'restaurantManager';
  isActive: boolean;
  isApproved?: boolean; // for vendors
  createdAt: string;
  updatedAt: string;
  
  // Role-specific fields
  vendor?: {
    businessName: string;
    businessAddress: Address;
    businessLicense?: string;
  };
  
  restaurant?: {
    restaurantName: string;
    restaurantAddress: Address;
    restaurantType: string;
  };
}
```

### Product & Listing Models
```typescript
interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  unit: string; // kg, piece, bunch, etc.
  images: string[];
  createdAt: string;
}

interface Listing {
  id: string;
  vendor: User;
  product: Product;
  price: number;
  availableQuantity: number;
  isAvailable: boolean;
  description?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Order Model
```typescript
interface Order {
  id: string;
  restaurant: User;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled';
  totalAmount: number;
  deliveryAddress: Address;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  listing: Listing;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

## Error Handling Patterns

### Standard Error Response Format
```javascript
// All errors follow this structure
{
  "success": false,
  "message": "Error message for user",
  "error": "Detailed error for debugging", // only in development
  "statusCode": 400
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

### Frontend Error Handling Strategy
```javascript
// API service with error handling
const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {};
    
    switch (status) {
      case 401:
        // Clear token and redirect to login
        authService.logout();
        window.location.href = '/login';
        break;
      case 403:
        // Show permission denied message
        toast.error('You do not have permission to perform this action');
        break;
      case 500:
        // Show generic error message
        toast.error('Something went wrong. Please try again.');
        break;
      default:
        // Show specific error message from backend
        toast.error(data?.message || 'An error occurred');
    }
    
    return Promise.reject(error);
  }
);
```

## File Upload Integration

### Cloudinary Configuration
The backend uses Cloudinary for file uploads. Frontend should handle:

```javascript
// File upload component pattern
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.url; // Cloudinary URL
  } catch (error) {
    throw new Error('File upload failed');
  }
};
```

## Real-time Features (Future)

### WebSocket Integration Preparation
```javascript
// Socket.io client setup for real-time features
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: authService.getToken()
  }
});

// Listen for order updates
socket.on('order:updated', (orderData) => {
  // Update order in state management
  queryClient.invalidateQueries(['orders']);
});

// Listen for new notifications
socket.on('notification:new', (notification) => {
  // Add to notification store
  notificationStore.addNotification(notification);
});
```

## API Service Implementation Pattern

### Base API Service
```javascript
// services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Service Layer Pattern
```javascript
// services/listings.service.js
import api from './api';

export const listingsService = {
  // Get all listings with optional filters
  async getAll(filters = {}) {
    const response = await api.get('/listings', { params: filters });
    return response.data;
  },

  // Get single listing by ID
  async getById(id) {
    const response = await api.get(`/listings/${id}`);
    return response.data;
  },

  // Create new listing (vendor only)
  async create(listingData) {
    const response = await api.post('/listings', listingData);
    return response.data;
  },

  // Update existing listing
  async update(id, updateData) {
    const response = await api.put(`/listings/${id}`, updateData);
    return response.data;
  },

  // Delete listing
  async delete(id) {
    const response = await api.delete(`/listings/${id}`);
    return response.data;
  }
};
```

## TanStack Query Integration

### Query Hooks Pattern
```javascript
// hooks/useListings.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsService } from '../services/listings.service';

// Get listings with caching
export const useListings = (filters = {}) => {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => listingsService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Create listing mutation
export const useCreateListing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: listingsService.create,
    onSuccess: () => {
      // Invalidate and refetch listings
      queryClient.invalidateQueries(['listings']);
      toast.success('Listing created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create listing');
    }
  });
};
```

## Performance Optimization

### API Request Optimization
- **Pagination**: Always use pagination for lists
- **Filtering**: Implement server-side filtering
- **Caching**: Use TanStack Query for intelligent caching
- **Debouncing**: Debounce search inputs to reduce API calls

### Image Optimization
- **Lazy Loading**: Load images only when needed
- **Responsive Images**: Use different sizes for different devices
- **WebP Format**: Use modern image formats with fallbacks
- **Cloudinary Transformations**: Use Cloudinary's image transformations

## Development Workflow

### API Development Workflow
1. **Understand Backend**: Read backend code and documentation
2. **Create Types**: Define TypeScript interfaces matching backend models
3. **Build Services**: Create API service functions
4. **Create Hooks**: Build TanStack Query hooks
5. **Handle Errors**: Implement comprehensive error handling
6. **Test Integration**: Test with real backend API

### Testing API Integration
```javascript
// Example API integration test
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useListings } from '../hooks/useListings';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('should fetch listings successfully', async () => {
  const { result } = renderHook(() => useListings(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  expect(result.current.data).toBeDefined();
});
```

## Security Considerations

### API Security Best Practices
- **Validate All Inputs**: Client-side validation + server-side validation
- **Sanitize Data**: Prevent XSS attacks
- **HTTPS Only**: Use HTTPS in production
- **Token Security**: Secure JWT token storage and transmission
- **Role Validation**: Always validate user permissions
- **Rate Limiting**: Respect backend rate limits

### Environment Variables
```javascript
// .env files for different environments
// .env.development
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name

// .env.production
REACT_APP_API_BASE_URL=https://api.aarothfresh.com/api/v1
REACT_APP_CLOUDINARY_CLOUD_NAME=production_cloud_name
```

## Troubleshooting Common Issues

### Authentication Issues
- **Token Expiration**: Implement automatic token refresh
- **CORS Errors**: Ensure backend CORS is configured for frontend domain
- **Phone Format**: Always include country code in phone numbers

### API Integration Issues
- **Network Errors**: Implement retry logic and offline handling
- **Data Mismatch**: Ensure frontend types match backend models exactly
- **Caching Issues**: Use proper cache invalidation strategies

### Development Issues
- **Hot Reload**: Configure Vite for optimal development experience
- **Environment Variables**: Ensure all required variables are set
- **Proxy Configuration**: Use Vite proxy for API calls in development

## Summary

This API integration guide provides:
- Complete authentication flow with phone-based login
- All API endpoints with request/response examples
- TypeScript types matching backend models
- Error handling patterns and best practices
- Performance optimization strategies
- Security considerations and best practices

The key points to remember:
1. **Phone-based authentication** (not email)
2. **Role-based permissions** with four distinct roles
3. **Comprehensive error handling** with user-friendly messages
4. **Mobile-first approach** with performance optimization
5. **TanStack Query** for efficient server state management