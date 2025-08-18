# Aaroth Fresh API Integration Essentials

This document provides core integration patterns for the Aaroth Fresh React frontend with JavaScript, Tailwind CSS, and RTK Query.

## Backend Architecture Overview

### Server Configuration
- **Base URL**: `http://localhost:5000` (development)
- **API Prefix**: `/api/v1`
- **CORS**: Enabled for frontend domains
- **Authentication**: JWT tokens with phone-based login (NOT email-based)

### Database & Models
- **Database**: MongoDB with Mongoose ODM
- **Core Models**: User, Restaurant, Vendor, Product, ProductCategory, Listing, Order

## Critical Authentication System

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

### Simple JWT Token Management
```javascript
// Simple token storage
class TokenStorage {
  static setToken(accessToken) {
    localStorage.setItem('token', accessToken);
  }

  static getToken() {
    return localStorage.getItem('token');
  }

  static clearToken() {
    localStorage.removeItem('token');
  }

  static hasToken() {
    return !!this.getToken();
  }
}
```

### Simple Token Authentication
```javascript
// Simple axios interceptor matching backend capabilities
import axios from 'axios';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || '/api/v1',
    });
    
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor - add token to requests
    this.api.interceptors.request.use(
      (config) => {
        const token = TokenStorage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          TokenStorage.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
}

export default new ApiService();
```

## User Roles & Permissions

### Role Hierarchy
- **admin**: Full system access, manage users/products/categories
- **vendor**: Create/manage listings, process orders, view analytics
- **restaurantOwner**: Browse products, place orders, manage restaurant
- **restaurantManager**: Same as restaurantOwner but with limited admin rights

### Backend Role Validation
- All protected routes require valid JWT token
- Role-specific endpoints validate user permissions
- Frontend must respect role-based access patterns

## RTK Query Implementation

### API Slice Configuration
```javascript
// store/api/apiSlice.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_BASE_URL || '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('content-type', 'application/json');
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Product', 'Order', 'Listing', 'Category', 'Vendor', 'Restaurant', 'Approvals', 'Analytics'],
  endpoints: (builder) => ({
    // Authentication endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    
    // Listings endpoints
    getListings: builder.query({
      query: (params = {}) => ({
        url: '/listings',
        params,
      }),
      providesTags: (result) => [
        { type: 'Listing', id: 'LIST' },
        ...(result?.data?.listings || []).map(({ id }) => ({ type: 'Listing', id }))
      ],
    }),
    
    // Orders endpoints  
    getOrders: builder.query({
      query: (params = {}) => ({
        url: '/orders',
        params,
      }),
      providesTags: (result) => [
        { type: 'Order', id: 'LIST' },
        ...(result?.data?.orders || []).map(({ id }) => ({ type: 'Order', id }))
      ],
    }),
    
    // Admin endpoints
    getAdminDashboard: builder.query({
      query: () => '/admin/dashboard/overview',
      providesTags: ['Analytics'],
    }),
    
    // 🚨 NEW: Unified Approval System
    getAllApprovals: builder.query({
      query: (filters = {}) => ({
        url: '/admin/approvals',
        params: filters,
      }),
      providesTags: ['Approvals'],
    }),
    
    approveVendor: builder.mutation({
      query: ({ id, approvalNotes }) => ({
        url: `/admin/approvals/vendor/${id}/approve`,
        method: 'PUT',
        body: { approvalNotes },
      }),
      invalidatesTags: ['Approvals', 'User', 'Vendor'],
    }),
    
    rejectVendor: builder.mutation({
      query: ({ id, rejectionReason }) => ({
        url: `/admin/approvals/vendor/${id}/reject`,
        method: 'PUT',
        body: { rejectionReason },
      }),
      invalidatesTags: ['Approvals', 'User', 'Vendor'],
    }),
    
    approveRestaurant: builder.mutation({
      query: ({ id, approvalNotes }) => ({
        url: `/admin/approvals/restaurant/${id}/approve`,
        method: 'PUT',
        body: { approvalNotes },
      }),
      invalidatesTags: ['Approvals', 'User', 'Restaurant'],
    }),
    
    rejectRestaurant: builder.mutation({
      query: ({ id, rejectionReason }) => ({
        url: `/admin/approvals/restaurant/${id}/reject`,
        method: 'PUT',
        body: { rejectionReason },
      }),
      invalidatesTags: ['Approvals', 'User', 'Restaurant'],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetListingsQuery,
  useGetOrdersQuery,
  useGetAdminDashboardQuery,
  useGetAllApprovalsQuery,
  useApproveVendorMutation,
  useRejectVendorMutation,
  useApproveRestaurantMutation,
  useRejectRestaurantMutation,
} = apiSlice;
```

### Redux Auth Slice Integration
```javascript
// store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      const { user, token } = action.payload;
      state.loading = false;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('token', token);
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
```

## Error Handling Patterns

### Standard Error Response Format
```javascript
// Backend sends standardized error responses
{
  "success": false,
  "message": "User-friendly error message",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": ["Phone number is required", "Password must be at least 6 characters"]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### RTK Query Error Handling
```javascript
// Enhanced error handling in components
const LoginComponent = () => {
  const [login, { isLoading, error }] = useLoginMutation();

  const handleLogin = async (formData) => {
    try {
      const result = await login(formData).unwrap();
      // Handle success
      console.log('Login successful:', result);
    } catch (err) {
      // RTK Query provides structured error
      const errorMessage = err.data?.message || 'Login failed. Please try again.';
      const errorDetails = err.data?.error?.details || [];
      
      // Display error to user
      console.error('Login error:', errorMessage, errorDetails);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded">
          {error.data?.message || 'An error occurred'}
        </div>
      )}
      {/* Form fields */}
    </form>
  );
};
```

### Custom Error Hook
```javascript
// hooks/useErrorHandler.js
import { useEffect } from 'react';
import { toast } from 'react-toastify';

export const useErrorHandler = (error) => {
  useEffect(() => {
    if (error) {
      const message = error.data?.message || 'An unexpected error occurred';
      const details = error.data?.error?.details || [];
      
      // Show main error message
      toast.error(message);
      
      // Show validation details if available
      details.forEach(detail => {
        toast.warn(detail);
      });
    }
  }, [error]);
};
```

## Security Features Integration

### Content Flagging and Moderation
```javascript
// Admin content moderation hook
export const useContentModeration = () => {
  const [flagListing] = useFlagListingMutation();
  const [unflagListing] = useUnflagListingMutation();
  
  const flagContent = async (listingId, reason, notes) => {
    try {
      await flagListing({
        id: listingId,
        flagReason: reason,
        moderationNotes: notes
      }).unwrap();
      
      toast.success('Content flagged successfully');
    } catch (error) {
      toast.error('Failed to flag content');
    }
  };
  
  const unflagContent = async (listingId, notes) => {
    try {
      await unflagListing({
        id: listingId,
        moderationNotes: notes
      }).unwrap();
      
      toast.success('Content unflagged successfully');
    } catch (error) {
      toast.error('Failed to unflag content');
    }
  };
  
  return { flagContent, unflagContent };
};
```

### Safe Delete with Dependency Checking
```javascript
// Safe delete pattern for admin operations
export const useSafeDelete = () => {
  const [checkDependencies] = useCheckDependenciesMutation();
  const [safeDeleteProduct] = useSafeDeleteProductMutation();
  
  const attemptDelete = async (productId, reason) => {
    try {
      // First check for dependencies
      const dependencies = await checkDependencies({
        type: 'product',
        id: productId
      }).unwrap();
      
      if (dependencies.hasActiveListings) {
        toast.warn(`Cannot delete: ${dependencies.activeListingsCount} active listings depend on this product`);
        return false;
      }
      
      if (dependencies.hasActiveOrders) {
        toast.warn(`Cannot delete: ${dependencies.activeOrdersCount} active orders contain this product`);
        return false;
      }
      
      // Safe to delete
      await safeDeleteProduct({
        id: productId,
        reason
      }).unwrap();
      
      toast.success('Product deleted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to delete product');
      return false;
    }
  };
  
  return { attemptDelete };
};
```

## Component Integration Examples

### Protected Route Pattern
```javascript
// components/ProtectedRoute.jsx
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};
```

### Component with RTK Query
```javascript
// components/ProductList.jsx
import { useGetListingsQuery } from '../store/api/apiSlice';
import { useErrorHandler } from '../hooks/useErrorHandler';

export const ProductList = () => {
  const { data: listings, isLoading, error } = useGetListingsQuery();
  
  // Handle errors automatically
  useErrorHandler(error);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading products</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings?.data?.listings.map((listing) => (
        <div key={listing.id} className="bg-white rounded-lg p-4 shadow">
          <h3>{listing.product.name}</h3>
          <p>${listing.price}</p>
        </div>
      ))}
    </div>
  );
};
```

## 🚨 CRITICAL: API Migration Guide

### Legacy Approval System Removal

#### Removed Endpoints (❌):
- `PUT /admin/users/:id/approve`
- `PUT /admin/vendors/:id/verify` 
- `PUT /admin/restaurants/:id/verify`

#### New Unified System (✅):
- `GET /admin/approvals` - All pending approvals
- `PUT /admin/approvals/vendor/:id/approve` - Approve vendor
- `PUT /admin/approvals/vendor/:id/reject` - Reject vendor
- `PUT /admin/approvals/restaurant/:id/approve` - Approve restaurant
- `PUT /admin/approvals/restaurant/:id/reject` - Reject restaurant

### Migration Implementation

#### 1. Replace User Approval Calls
```javascript
// OLD - Remove these calls
const approveUser = async (userId) => {
  // ❌ This will return 404
  await api.put(`/admin/users/${userId}/approve`);
};

// NEW - Use unified approval system
const approveVendor = async (vendorId, notes) => {
  // ✅ New unified endpoint
  await approveVendorMutation({
    id: vendorId,
    approvalNotes: notes
  }).unwrap();
};

const approveRestaurant = async (restaurantId, notes) => {
  // ✅ New unified endpoint
  await approveRestaurantMutation({
    id: restaurantId,
    approvalNotes: notes
  }).unwrap();
};
```

#### 2. Update Admin Components
```javascript
// components/admin/ApprovalManagement.jsx
import { 
  useGetAllApprovalsQuery,
  useApproveVendorMutation,
  useRejectVendorMutation,
  useApproveRestaurantMutation,
  useRejectRestaurantMutation 
} from '../store/api/apiSlice';

export const ApprovalManagement = () => {
  const { data: approvals, isLoading } = useGetAllApprovalsQuery();
  const [approveVendor] = useApproveVendorMutation();
  const [rejectVendor] = useRejectVendorMutation();
  const [approveRestaurant] = useApproveRestaurantMutation();
  const [rejectRestaurant] = useRejectRestaurantMutation();

  const handleApproval = async (type, id, action, data) => {
    try {
      if (type === 'vendor') {
        if (action === 'approve') {
          await approveVendor({ id, approvalNotes: data.notes }).unwrap();
        } else {
          await rejectVendor({ id, rejectionReason: data.reason }).unwrap();
        }
      } else if (type === 'restaurant') {
        if (action === 'approve') {
          await approveRestaurant({ id, approvalNotes: data.notes }).unwrap();
        } else {
          await rejectRestaurant({ id, rejectionReason: data.reason }).unwrap();
        }
      }
      
      toast.success(`${type} ${action}ed successfully`);
    } catch (error) {
      toast.error(`Failed to ${action} ${type}`);
    }
  };

  if (isLoading) return <div>Loading approvals...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approval Management</h1>
      
      {approvals?.data?.map((approval) => (
        <div key={approval.id} className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{approval.businessName}</h3>
              <p className="text-gray-600">{approval.type} - {approval.status}</p>
              <p className="text-sm text-gray-500">Applied: {approval.createdAt}</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleApproval(approval.type, approval.id, 'approve', { notes: 'Approved by admin' })}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleApproval(approval.type, approval.id, 'reject', { reason: 'Incomplete documentation' })}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Migration Checklist

#### Frontend Tasks:
- [ ] Remove all legacy approval API calls
- [ ] Implement unified approval system hooks
- [ ] Update admin dashboard components
- [ ] Add approval history display
- [ ] Update state management for new data models
- [ ] Test all approval workflows

#### Testing Requirements:
- [ ] Test vendor approval/rejection flow
- [ ] Test restaurant approval/rejection flow
- [ ] Verify approval history display
- [ ] Test error handling for failed approvals
- [ ] Verify real-time updates after approval actions

#### Performance Considerations:
- [ ] Implement caching for approval data
- [ ] Add optimistic updates for approval actions
- [ ] Monitor API response times

## Performance Optimization Patterns

### Memoized Components
```javascript
// Use React.memo for expensive components
import React, { memo } from 'react';

export const ProductCard = memo(({ product, onAddToCart }) => {
  return (
    <div className="product-card">
      {/* Product card content */}
    </div>
  );
});
```

### RTK Query Caching
```javascript
// Configure intelligent caching
export const apiSlice = createApi({
  // ... other config
  endpoints: (builder) => ({
    getListings: builder.query({
      query: (params) => ({ url: '/listings', params }),
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
      // Refetch on focus
      refetchOnFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
    }),
  }),
});
```

### Selective Re-rendering
```javascript
// Use selectors to prevent unnecessary re-renders
import { useSelector } from 'react-redux';

const ProductList = () => {
  // Only re-render when products change, not entire state
  const products = useSelector(state => state.products.items);
  const isLoading = useSelector(state => state.products.loading);
  
  // Component implementation
};
```

## Important Notes for Claude Code

### Authentication Context
- **CRITICAL**: This app uses PHONE-based authentication, not email
- **Phone Format**: Always include country code validation
- **Backend Compatibility**: Ensure frontend auth matches backend exactly
- **Role System**: Four distinct roles with different permissions

### Migration Priority
- **API Migration**: Replace ALL legacy endpoints with new unified system
- **Error Handling**: Comprehensive error handling throughout
- **User Feedback**: Clear loading states and success/error messages
- **Security**: Proper role-based access control
- **Performance**: Efficient data fetching and caching