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
      query: () => '/public/featured-products',
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

This integration guide provides the foundation for implementing the Aaroth Fresh API with React and RTK Query, ensuring proper authentication, error handling, and performance optimization.