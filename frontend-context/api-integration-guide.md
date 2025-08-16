# Aaroth Fresh API Integration Guide

This document provides implementation patterns, authentication strategies, and integration examples for the Aaroth Fresh React frontend.

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

### Simple JWT Token Management

#### Token Storage Strategy
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

#### Simple Token Authentication
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

    // Response interceptor - handle 401 errors with logout
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // If 401 error, clear token and redirect to login
        if (error.response?.status === 401) {
          TokenStorage.clearToken();
          
          // Redirect to login or dispatch logout action
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );
  }
}

export const apiService = new ApiService();
export const api = apiService.api;
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

## RTK Query Implementation

### API Slice Configuration
```javascript
// store/api/apiSlice.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout } from '../slices/authSlice';

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

// Base query with simple 401 handling (no token refresh - backend uses simple JWT)
const baseQueryWithAuth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    // Token expired or invalid, logout user
    api.dispatch(logout());
  }
  
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['User', 'Product', 'Order', 'Listing', 'Category', 'Vendor', 'Restaurant'],
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
    
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    
    getCurrentUser: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
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
    
    createListing: builder.mutation({
      query: (newListing) => ({
        url: '/listings',
        method: 'POST',
        body: newListing,
      }),
      invalidatesTags: [{ type: 'Listing', id: 'LIST' }],
    }),
    
    updateListing: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/listings/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Listing', id }],
    }),
    
    deleteListing: builder.mutation({
      query: (id) => ({
        url: `/listings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Listing', id: 'LIST' }],
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
    
    createOrder: builder.mutation({
      query: (orderData) => ({
        url: '/orders',
        method: 'POST',
        body: orderData,
      }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }],
    }),
    
    updateOrderStatus: builder.mutation({
      query: ({ id, status, notes }) => ({
        url: `/orders/${id}/status`,
        method: 'PUT',
        body: { status, notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }],
    }),
    
    // Public endpoints
    getPublicProducts: builder.query({
      query: (params = {}) => ({
        url: '/public/products',
        params,
      }),
      providesTags: ['Product'],
    }),
    
    getPublicProduct: builder.query({
      query: (id) => `/public/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    
    getCategories: builder.query({
      query: () => '/public/categories',
      providesTags: ['Category'],
    }),

    getFeaturedProducts: builder.query({
      query: () => '/public/featured-listings',
      providesTags: ['Product'],
    }),
    
    // Admin endpoints
    getAdminUsers: builder.query({
      query: (params = {}) => ({
        url: '/admin/users',
        params,
      }),
      providesTags: (result) => [
        { type: 'User', id: 'LIST' },
        ...(result?.data?.users || []).map(({ id }) => ({ type: 'User', id }))
      ],
    }),
    
    approveUser: builder.mutation({
      query: ({ id, isApproved }) => ({
        url: `/admin/users/${id}/approve`,
        method: 'PUT',
        body: { isApproved },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    
    getAdminAnalytics: builder.query({
      query: (params = {}) => ({
        url: '/admin/dashboard',
        params,
      }),
      providesTags: ['Analytics'],
    }),
    
    // File uploads are handled within listing creation/update endpoints
    // No separate upload endpoints exist in the backend
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useGetListingsQuery,
  useCreateListingMutation,
  useUpdateListingMutation,
  useDeleteListingMutation,
  useGetOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useGetPublicProductsQuery,
  useGetPublicProductQuery,
  useGetCategoriesQuery,
  useGetFeaturedProductsQuery,
  useGetAdminUsersQuery,
  useApproveUserMutation,
  useGetAdminAnalyticsQuery,
} = apiSlice;
```

### Redux Auth Slice Integration
```javascript
// store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { apiSlice } from './apiSlice';

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
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      
      // Clear localStorage
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Handle login
    builder
      .addMatcher(apiSlice.endpoints.login.matchPending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addMatcher(apiSlice.endpoints.login.matchFulfilled, (state, action) => {
        const { data } = action.payload;
        if (data.success) {
          state.loading = false;
          state.user = data.user;
          state.token = data.token;
          state.isAuthenticated = true;
          localStorage.setItem('token', data.token);
        }
      })
      .addMatcher(apiSlice.endpoints.login.matchRejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.data?.message || 'Login failed';
        state.isAuthenticated = false;
      })
      
      // Handle register
      .addMatcher(apiSlice.endpoints.register.matchPending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addMatcher(apiSlice.endpoints.register.matchFulfilled, (state, action) => {
        const { data } = action.payload;
        if (data.success) {
          state.loading = false;
          state.user = data.user;
          state.token = data.token;
          state.isAuthenticated = true;
          localStorage.setItem('token', data.token);
        }
      })
      .addMatcher(apiSlice.endpoints.register.matchRejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.data?.message || 'Registration failed';
        state.isAuthenticated = false;
      })
      
      // Handle current user
      .addMatcher(apiSlice.endpoints.getCurrentUser.matchFulfilled, (state, action) => {
        const { data } = action.payload;
        if (data.success) {
          state.user = data.data; // Backend returns user in 'data' field, not 'user'
        }
      })
      .addMatcher(apiSlice.endpoints.getCurrentUser.matchRejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      });
  },
});

export const { logout, clearError } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

export default authSlice.reducer;
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

### Cloudinary Configuration & Endpoints
The backend uses Cloudinary for file uploads with automatic image processing and organization.

### File Upload Integration with Listings
File uploads in the Aaroth Fresh backend are integrated directly into listing creation and updates through middleware.

#### Upload Constraints & Validation
- **Images Only**: JPG, JPEG, PNG, WebP, GIF
- **Maximum File Size**: 1MB per file
- **Maximum Files**: 5 files per listing
- **Automatic Processing**: Images resized to max 1024x768
- **Storage**: Cloudinary with automatic folder organization

### Frontend Implementation Patterns

#### Listing Creation with File Upload
Since file uploads are integrated with listing creation, use FormData with the listing creation endpoint:

```javascript
// hooks/useCreateListingWithImages.js
import { useCreateListingMutation } from '../store/api/apiSlice';
import { toast } from 'react-toastify';

export const useCreateListingWithImages = () => {
  const [createListing, { isLoading, error }] = useCreateListingMutation();
  
  const handleCreateListing = async (listingData, imageFiles = []) => {
    const formData = new FormData();
    
    // Add listing data
    formData.append('productId', listingData.productId);
    formData.append('description', listingData.description);
    
    // Add pricing data
    listingData.pricing.forEach((price, index) => {
      formData.append(`pricing[${index}][pricePerUnit]`, price.pricePerUnit);
      formData.append(`pricing[${index}][unit]`, price.unit);
    });
    
    // Add availability data
    formData.append('availability[quantityAvailable]', listingData.availability.quantityAvailable);
    if (listingData.availability.harvestDate) {
      formData.append('availability[harvestDate]', listingData.availability.harvestDate);
    }
    
    // Add image files (max 5)
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });
    
    try {
      const result = await createListing(formData).unwrap();
      return result;
    } catch (error) {
      const message = error?.data?.message || 'Listing creation failed';
      toast.error(message);
      throw error;
    }
  };
  
  return { createListing: handleCreateListing, isLoading, error };
};

// Component usage
const CreateListingForm = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [listingData, setListingData] = useState({
    productId: '',
    pricing: [{ pricePerUnit: '', unit: 'kg' }],
    availability: { quantityAvailable: 0 },
    description: ''
  });
  
  const { createListing, isLoading } = useCreateListingWithImages();
  
  const handleFilesSelect = (event) => {
    const files = Array.from(event.target.files);
    
    // Validate number of files
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    // Validate each file
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      
      if (file.size > 1024 * 1024) {
        toast.error(`${file.name} is too large (max 1MB)`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(validFiles);
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    try {
      const result = await createListing(listingData, selectedFiles);
      toast.success('Listing created successfully');
      // Reset form or redirect
    } catch (error) {
      // Error handled by hook
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields for listing data */}
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Product Images (Max 5)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {selectedFiles.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            {selectedFiles.length} file(s) selected
          </p>
        )}
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Creating Listing...' : 'Create Listing'}
      </button>
    </form>
  );
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
import { useSelector } from 'react-redux';
import { useGetListingsQuery } from '../store/api/apiSlice';

export const ProductList = () => {
  const { data: listings, isLoading, error } = useGetListingsQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading products</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings?.data?.listings.map((listing) => (
        <div key={listing.id} className="card-product">
          <h3>{listing.product.name}</h3>
          <p>${listing.price}</p>
          <button className="btn-primary">
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
};
```

## Testing Patterns

### RTK Query Testing
```javascript
// test/store/api/apiSlice.test.js
import { setupApiStore } from '../../test-utils';
import { apiSlice } from '../../../store/api/apiSlice';

describe('API Slice', () => {
  let storeRef;

  beforeEach(() => {
    storeRef = setupApiStore(apiSlice);
  });

  it('should handle login successfully', async () => {
    const loginData = { phone: '+8801234567890', password: 'password' };
    
    const result = await storeRef.store.dispatch(
      apiSlice.endpoints.login.initiate(loginData)
    );
    
    expect(result.data.success).toBe(true);
    expect(result.data.token).toBeDefined();
    expect(result.data.user).toBeDefined();
  });
});
```

## Performance Optimizations

### Selective Re-rendering
```javascript
// Use RTK Query's selectFromResult for optimizations
const { currentListing } = useGetListingsQuery(undefined, {
  selectFromResult: ({ data, ...otherProps }) => ({
    ...otherProps,
    currentListing: data?.listings?.find(listing => listing.id === currentId)
  }),
});
```

### Background Refetching
```javascript
// Configure automatic background refetching
useGetListingsQuery(params, {
  pollingInterval: 30000, // Refetch every 30 seconds
  refetchOnFocus: true,
  refetchOnReconnect: true,
});
```

## Dashboard Integration Patterns

### Vendor Dashboard API Integration

#### Dashboard Overview Hook
```javascript
// hooks/useVendorDashboard.js
import { useGetVendorDashboardOverviewQuery } from '../store/api/dashboardSlice';
import { useState } from 'react';

export const useVendorDashboard = () => {
  const [dateRange, setDateRange] = useState({
    period: 'month',
    startDate: null,
    endDate: null
  });

  const {
    data: overview,
    isLoading,
    error,
    refetch
  } = useGetVendorDashboardOverviewQuery(dateRange, {
    pollingInterval: 300000, // Refresh every 5 minutes
    refetchOnFocus: true,
  });

  const updateDateRange = (newRange) => {
    setDateRange(newRange);
  };

  return {
    overview: overview?.data,
    isLoading,
    error,
    refetch,
    dateRange,
    updateDateRange
  };
};
```

#### Revenue Analytics Component
```javascript
// components/VendorDashboard/RevenueChart.jsx
import { Line } from 'react-chartjs-2';
import { useGetVendorRevenueAnalyticsQuery } from '../../store/api/dashboardSlice';
import { format } from 'date-fns';

export const RevenueChart = ({ dateRange }) => {
  const { data, isLoading } = useGetVendorRevenueAnalyticsQuery(dateRange);

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-200 rounded"></div>;

  const chartData = {
    labels: data?.data.dailyTrends.map(day => format(new Date(day.date), 'MMM dd')),
    datasets: [
      {
        label: 'Revenue',
        data: data?.data.dailyTrends.map(day => day.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Orders',
        data: data?.data.dailyTrends.map(day => day.orders),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        yAxisID: 'orders',
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Revenue Trends'
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`
        }
      },
      orders: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <Line data={chartData} options={options} />
    </div>
  );
};
```

### Restaurant Dashboard Integration

#### Dashboard Slice Configuration
```javascript
// store/api/dashboardSlice.js
import { apiSlice } from './apiSlice';

export const dashboardSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Vendor Dashboard Endpoints
    getVendorDashboardOverview: builder.query({
      query: (params) => ({
        url: '/vendor-dashboard/overview',
        params
      }),
      providesTags: ['VendorDashboard'],
    }),
    
    getVendorRevenueAnalytics: builder.query({
      query: (params) => ({
        url: '/vendor-dashboard/revenue',
        params
      }),
      providesTags: ['VendorRevenue'],
    }),
    
    getVendorProductPerformance: builder.query({
      query: (params) => ({
        url: '/vendor-dashboard/products',
        params
      }),
      providesTags: ['VendorProducts'],
    }),
    
    getVendorInventoryStatus: builder.query({
      query: () => '/vendor-dashboard/inventory',
      providesTags: ['VendorInventory'],
    }),
    
    getVendorOrderManagement: builder.query({
      query: (params) => ({
        url: '/vendor-dashboard/order-management',
        params
      }),
      providesTags: ['VendorOrders'],
    }),
    
    getVendorNotifications: builder.query({
      query: (params) => ({
        url: '/vendor-dashboard/notifications',
        params
      }),
      providesTags: ['VendorNotifications'],
    }),
    
    // Restaurant Dashboard Endpoints
    getRestaurantDashboardOverview: builder.query({
      query: (params) => ({
        url: '/restaurant-dashboard/overview',
        params
      }),
      providesTags: ['RestaurantDashboard'],
    }),
    
    getRestaurantSpendingAnalytics: builder.query({
      query: (params) => ({
        url: '/restaurant-dashboard/spending',
        params
      }),
      providesTags: ['RestaurantSpending'],
    }),
    
    getRestaurantVendorInsights: builder.query({
      query: (params) => ({
        url: '/restaurant-dashboard/vendors',
        params
      }),
      providesTags: ['RestaurantVendors'],
    }),
    
    getRestaurantBudgetTracking: builder.query({
      query: (params) => ({
        url: '/restaurant-dashboard/budget',
        params
      }),
      providesTags: ['RestaurantBudget'],
    }),
    
    getRestaurantOrderHistory: builder.query({
      query: (params) => ({
        url: '/restaurant-dashboard/order-history',
        params
      }),
      providesTags: ['RestaurantOrderHistory'],
    }),
    
    getRestaurantFavoriteVendors: builder.query({
      query: (params) => ({
        url: '/restaurant-dashboard/favorite-vendors',
        params
      }),
      providesTags: ['RestaurantFavorites'],
    }),
    
    getRestaurantReorderSuggestions: builder.query({
      query: (params) => ({
        url: '/restaurant-dashboard/reorder-suggestions',
        params
      }),
      providesTags: ['RestaurantReorders'],
    }),
    
    getRestaurantNotifications: builder.query({
      query: (params) => ({
        url: '/restaurant-dashboard/notifications',
        params
      }),
      providesTags: ['RestaurantNotifications'],
    }),
    
    // Notification Management
    markNotificationsAsRead: builder.mutation({
      query: (notificationIds) => ({
        url: '/notifications/mark-read',
        method: 'PUT',
        body: { notificationIds }
      }),
      invalidatesTags: ['VendorNotifications', 'RestaurantNotifications'],
    }),
  }),
});

export const {
  // Vendor Dashboard Hooks
  useGetVendorDashboardOverviewQuery,
  useGetVendorRevenueAnalyticsQuery,
  useGetVendorProductPerformanceQuery,
  useGetVendorInventoryStatusQuery,
  useGetVendorOrderManagementQuery,
  useGetVendorNotificationsQuery,
  
  // Restaurant Dashboard Hooks
  useGetRestaurantDashboardOverviewQuery,
  useGetRestaurantSpendingAnalyticsQuery,
  useGetRestaurantVendorInsightsQuery,
  useGetRestaurantBudgetTrackingQuery,
  useGetRestaurantOrderHistoryQuery,
  useGetRestaurantFavoriteVendorsQuery,
  useGetRestaurantReorderSuggestionsQuery,
  useGetRestaurantNotificationsQuery,
  
  // Notification Hooks
  useMarkNotificationsAsReadMutation,
} = dashboardSlice;
```

### Real-time Notifications Implementation

#### Notification Context
```javascript
// contexts/NotificationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useGetVendorNotificationsQuery, useGetRestaurantNotificationsQuery } from '../store/api/dashboardSlice';
import { toast } from 'react-toastify';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useSelector(state => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Select appropriate query based on user role
  const isVendor = user?.role === 'vendor';
  const isRestaurant = ['restaurantOwner', 'restaurantManager'].includes(user?.role);

  const { data: vendorNotifications } = useGetVendorNotificationsQuery(
    { unreadOnly: false, limit: 50 },
    { 
      skip: !isVendor,
      pollingInterval: 60000, // Poll every minute
    }
  );

  const { data: restaurantNotifications } = useGetRestaurantNotificationsQuery(
    { unreadOnly: false, limit: 50 },
    { 
      skip: !isRestaurant,
      pollingInterval: 60000, // Poll every minute
    }
  );

  useEffect(() => {
    const currentNotifications = isVendor ? vendorNotifications : restaurantNotifications;
    if (currentNotifications?.data) {
      const { notifications: notifs, summary } = currentNotifications.data;
      
      // Check for new urgent notifications
      const newUrgent = notifs?.filter(n => 
        n.priority === 'urgent' && 
        !n.isRead && 
        !notifications.find(existing => existing.id === n.id)
      );

      newUrgent?.forEach(notification => {
        toast.error(notification.message, {
          position: 'top-right',
          autoClose: 8000,
          onClick: () => {
            if (notification.actionUrl) {
              window.location.href = notification.actionUrl;
            }
          }
        });
      });

      setNotifications(notifs || []);
      setUnreadCount(summary?.unread || 0);
    }
  }, [vendorNotifications, restaurantNotifications, notifications, isVendor]);

  const markAsRead = async (notificationIds) => {
    try {
      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      
      // API call to mark as read
      // await markNotificationsAsRead(notificationIds);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  return (
    <NotificationContext.Provider 
      value={{
        notifications,
        unreadCount,
        markAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
```

#### Notification Component
```javascript
// components/Notifications/NotificationCenter.jsx
import { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { format } from 'date-fns';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead([notification.id]);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.isRead)
      .map(n => n.id);
    
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-blue-500',
      low: 'bg-gray-500'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Priority Indicator */}
                    <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(notification.priority)}`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-500">
                          {format(new Date(notification.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      {notification.isActionRequired && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Action Required
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200">
            <button className="text-sm text-blue-600 hover:text-blue-800 w-full text-center">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Date Range Picker Integration

#### Custom Date Range Hook
```javascript
// hooks/useDateRange.js
import { useState } from 'react';
import { subDays, subWeeks, subMonths, subQuarters, subYears, startOfDay, endOfDay } from 'date-fns';

export const useDateRange = (defaultPeriod = 'month') => {
  const [period, setPeriod] = useState(defaultPeriod);
  const [customRange, setCustomRange] = useState({ startDate: null, endDate: null });

  const getDateRange = () => {
    const now = new Date();
    
    switch (period) {
      case 'today':
        return {
          startDate: startOfDay(now).toISOString(),
          endDate: endOfDay(now).toISOString(),
          period: 'today'
        };
      case 'week':
        return {
          startDate: subWeeks(now, 1).toISOString(),
          endDate: now.toISOString(),
          period: 'week'
        };
      case 'month':
        return {
          startDate: subMonths(now, 1).toISOString(),
          endDate: now.toISOString(),
          period: 'month'
        };
      case 'quarter':
        return {
          startDate: subQuarters(now, 1).toISOString(),
          endDate: now.toISOString(),
          period: 'quarter'
        };
      case 'year':
        return {
          startDate: subYears(now, 1).toISOString(),
          endDate: now.toISOString(),
          period: 'year'
        };
      case 'custom':
        return {
          startDate: customRange.startDate?.toISOString(),
          endDate: customRange.endDate?.toISOString(),
          period: 'custom'
        };
      default:
        return {
          startDate: subMonths(now, 1).toISOString(),
          endDate: now.toISOString(),
          period: 'month'
        };
    }
  };

  const updatePeriod = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const updateCustomRange = (startDate, endDate) => {
    setCustomRange({ startDate, endDate });
    setPeriod('custom');
  };

  return {
    period,
    dateRange: getDateRange(),
    updatePeriod,
    updateCustomRange,
    customRange
  };
};
```

### Performance Optimization Patterns

#### Memoized Chart Components
```javascript
// components/Dashboard/MemoizedChart.jsx
import { memo } from 'react';
import { Line } from 'react-chartjs-2';

export const MemoizedChart = memo(({ data, options, title }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <Line data={data} options={options} />
    </div>
  );
});
```

#### Virtualized Data Tables
```javascript
// components/Dashboard/VirtualizedTable.jsx
import { FixedSizeList as List } from 'react-window';
import { memo } from 'react';

const Row = memo(({ index, style, data }) => (
  <div style={style} className="border-b border-gray-200 px-4 py-3">
    <div className="flex items-center justify-between">
      <span className="font-medium">{data[index].name}</span>
      <span className="text-gray-600">${data[index].amount}</span>
    </div>
  </div>
));

export const VirtualizedTable = ({ items, height = 400 }) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <List
        height={height}
        itemCount={items.length}
        itemSize={60}
        itemData={items}
      >
        {Row}
      </List>
    </div>
  );
};
```

### Role-based Dashboard Layout

#### Dashboard Layout Component
```javascript
// components/Layout/DashboardLayout.jsx
import { useSelector } from 'react-redux';
import { VendorSidebar } from './VendorSidebar';
import { RestaurantSidebar } from './RestaurantSidebar';
import { NotificationCenter } from '../Notifications/NotificationCenter';

export const DashboardLayout = ({ children }) => {
  const { user } = useSelector(state => state.auth);
  
  const getSidebar = () => {
    switch (user?.role) {
      case 'vendor':
        return <VendorSidebar />;
      case 'restaurantOwner':
      case 'restaurantManager':
        return <RestaurantSidebar />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {user?.role === 'vendor' ? 'Vendor Dashboard' : 'Restaurant Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{user?.name}</span>
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm h-screen sticky top-0">
          {getSidebar()}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

This comprehensive integration guide provides the foundation for implementing advanced B2B marketplace dashboards with real-time notifications, performance optimizations, and role-based access control using React and RTK Query.