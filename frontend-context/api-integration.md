# Aaroth Fresh API Integration Guide

Redux Toolkit integration patterns and implementation guidance for the Aaroth Fresh React frontend.

**For complete API endpoint specifications, see [api-endpoints.md](./api-endpoints.md)**

## Technology Stack

- **Frontend**: React 18 + JavaScript (ES6+)
- **State Management**: Redux Toolkit + RTK Query
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Styling**: Tailwind CSS

## Backend Configuration

- **Base URL**: `http://localhost:5000/api/v1`
- **Authentication**: JWT Bearer tokens with phone-based login
- **Database**: MongoDB with Mongoose ODM
- **User Roles**: `admin`, `vendor`, `restaurantOwner`, `restaurantManager`

## Redux Toolkit Store Setup

### Core Store Configuration

```javascript
// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import notificationReducer from './slices/notificationSlice';
import { apiSlice } from './api/apiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    notifications: notificationReducer,
    api: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(apiSlice.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
```

### Authentication Slice with Token Management

```javascript
// store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  tokenExpiry: localStorage.getItem('tokenExpiry') ? 
    parseInt(localStorage.getItem('tokenExpiry')) : null,
  isRefreshing: false,
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
      const { user, token, refreshToken, expiresIn } = action.payload;
      state.loading = false;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.tokenExpiry = Date.now() + (expiresIn * 1000);
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('tokenExpiry', state.tokenExpiry.toString());
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    refreshTokenStart: (state) => {
      state.isRefreshing = true;
    },
    refreshTokenSuccess: (state, action) => {
      const { token, expiresIn } = action.payload;
      state.token = token;
      state.tokenExpiry = Date.now() + (expiresIn * 1000);
      state.isRefreshing = false;
      
      localStorage.setItem('token', token);
      localStorage.setItem('tokenExpiry', state.tokenExpiry.toString());
    },
    refreshTokenFailure: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isRefreshing = false;
      state.tokenExpiry = null;
      
      localStorage.clear();
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.tokenExpiry = null;
      
      localStorage.clear();
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  refreshTokenStart, 
  refreshTokenSuccess, 
  refreshTokenFailure, 
  logout, 
  updateUser, 
  clearError 
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectShouldRefresh = (state) => {
  const { isAuthenticated, isRefreshing, tokenExpiry } = state.auth;
  return isAuthenticated && !isRefreshing && tokenExpiry && 
    Date.now() >= (tokenExpiry - 120000); // Refresh 2 minutes before expiry
};

export default authSlice.reducer;
```

## RTK Query API Integration

### Main API Slice with Auto-Refresh

```javascript
// store/api/apiSlice.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { refreshTokenStart, refreshTokenSuccess, refreshTokenFailure, logout } from '../slices/authSlice';

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

// Enhanced base query with automatic token refresh
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    const refreshToken = api.getState().auth.refreshToken;
    
    if (refreshToken && !api.getState().auth.isRefreshing) {
      api.dispatch(refreshTokenStart());
      
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          headers: { 'Authorization': `Bearer ${refreshToken}` },
        },
        api,
        extraOptions
      );
      
      if (refreshResult.data?.success) {
        api.dispatch(refreshTokenSuccess(refreshResult.data));
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(refreshTokenFailure());
        api.dispatch(logout());
      }
    }
  }
  
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Product', 'Order', 'Listing', 'Category', 'Vendor', 'Restaurant', 'Approvals'],
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
    
    getCurrentUser: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    
    // Admin approval endpoints
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
      query: (formData) => ({
        url: '/listings',
        method: 'POST',
        body: formData,
        formData: true, // For multipart uploads
      }),
      invalidatesTags: [{ type: 'Listing', id: 'LIST' }],
    }),
    
    updateListing: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/listings/${id}`,
        method: 'PUT',
        body: formData,
        formData: true,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Listing', id },
        { type: 'Listing', id: 'LIST' }
      ],
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
      invalidatesTags: (result, error, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' }
      ],
    }),
    
    // Public endpoints
    getProducts: builder.query({
      query: (params = {}) => ({
        url: '/public/products',
        params,
      }),
      providesTags: (result) => [
        { type: 'Product', id: 'LIST' },
        ...(result?.data?.products || []).map(({ id }) => ({ type: 'Product', id }))
      ],
    }),
    
    getCategories: builder.query({
      query: () => '/public/categories',
      providesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    
    getFeaturedListings: builder.query({
      query: (params = {}) => ({
        url: '/public/featured-listings',
        params,
      }),
      providesTags: [{ type: 'Listing', id: 'FEATURED' }],
    }),
    
    // Dashboard endpoints
    getVendorDashboard: builder.query({
      query: (params = {}) => ({
        url: '/vendor-dashboard/overview',
        params,
      }),
      providesTags: ['Vendor'],
    }),
    
    getRestaurantDashboard: builder.query({
      query: (params = {}) => ({
        url: '/restaurant-dashboard/overview',
        params,
      }),
      providesTags: ['Restaurant'],
    }),
    
    getAdminDashboard: builder.query({
      query: () => '/admin/dashboard/overview',
      providesTags: ['User', 'Approvals'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
  useGetAllApprovalsQuery,
  useApproveVendorMutation,
  useRejectVendorMutation,
  useApproveRestaurantMutation,
  useRejectRestaurantMutation,
  useGetListingsQuery,
  useCreateListingMutation,
  useUpdateListingMutation,
  useDeleteListingMutation,
  useGetOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetFeaturedListingsQuery,
  useGetVendorDashboardQuery,
  useGetRestaurantDashboardQuery,
  useGetAdminDashboardQuery,
} = apiSlice;
```

## Authentication Implementation

> **API Reference**: See [Authentication Endpoints](./api-endpoints.md#authentication-endpoints-apiv1auth) for complete request/response specifications.

### Login Component with Redux

```javascript
// components/LoginForm.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api/apiSlice';
import { loginStart, loginSuccess, loginFailure, selectAuth } from '../store/slices/authSlice';

export const LoginForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(selectAuth);
  
  const [login, { isLoading: loginLoading }] = useLoginMutation();
  
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginStart());
    
    try {
      const result = await login(formData).unwrap();
      dispatch(loginSuccess(result));
      
      // Redirect based on user role
      const { role } = result.user;
      switch (role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'vendor':
          navigate('/vendor/dashboard');
          break;
        case 'restaurantOwner':
        case 'restaurantManager':
          navigate('/restaurant/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      dispatch(loginFailure(err.data?.message || 'Login failed'));
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-text-dark/80 mb-3">
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          value={formData.phone}
          onChange={handleChange}
          placeholder="+8801234567890"
          className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 focus:bg-white focus:shadow-lg transition-all duration-300 placeholder:text-text-muted/60"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-text-dark/80 mb-3">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 focus:bg-white focus:shadow-lg transition-all duration-300"
        />
      </div>

      {error && (
        <div className="bg-tomato-red/10 border border-tomato-red/20 text-tomato-red p-4 rounded-2xl">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || loginLoading}
        className="w-full bg-gradient-secondary text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-50"
      >
        {loading || loginLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### Protected Route Implementation

```javascript
// components/ProtectedRoute.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectAuth } from '../store/slices/authSlice';

export const ProtectedRoute = ({ children, requiredRole, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useSelector(selectAuth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bottle-green/20 border-t-bottle-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

## Component Integration Patterns

> **API Reference**: See [Admin Endpoints](./api-endpoints.md#admin-endpoints-apiv1admin) for all admin endpoint specifications.

### Admin Approval Management

```javascript
// components/admin/ApprovalManagement.jsx
import React, { useState } from 'react';
import { 
  useGetAllApprovalsQuery,
  useApproveVendorMutation,
  useRejectVendorMutation,
  useApproveRestaurantMutation,
  useRejectRestaurantMutation 
} from '../../store/api/apiSlice';

export const ApprovalManagement = () => {
  const [filters, setFilters] = useState({});
  const { data: approvals, isLoading, error } = useGetAllApprovalsQuery(filters);
  
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
      
      // Success feedback handled by RTK Query cache invalidation
      console.log(`${type} ${action}ed successfully`);
    } catch (error) {
      console.error(`Failed to ${action} ${type}:`, error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bottle-green/20 border-t-bottle-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-tomato-red/10 border border-tomato-red/20 text-tomato-red p-4 rounded-2xl">
        Error loading approvals: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-medium text-text-dark">Pending Approvals</h1>
        <div className="flex gap-4">
          <select 
            value={filters.type || ''}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="px-4 py-2 rounded-xl bg-earthy-beige/30 border-0"
          >
            <option value="">All Types</option>
            <option value="vendor">Vendors</option>
            <option value="restaurant">Restaurants</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6">
        {approvals?.data?.map((approval) => (
          <div key={approval.id} className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-text-dark">
                  {approval.businessName || approval.restaurantName}
                </h3>
                <p className="text-text-muted capitalize">
                  {approval.type} • {approval.verificationStatus}
                </p>
                <p className="text-sm text-text-muted mt-1">
                  Applied: {new Date(approval.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-4">
                  <p className="text-sm font-medium text-text-dark/80">Contact:</p>
                  <p className="text-sm text-text-muted">{approval.phone}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleApproval(approval.type, approval.id, 'approve', { 
                    notes: 'Documents verified and approved' 
                  })}
                  className="bg-mint-fresh/20 hover:bg-mint-fresh/30 text-bottle-green px-6 py-2 rounded-xl font-medium transition-all duration-200"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleApproval(approval.type, approval.id, 'reject', { 
                    reason: 'Documentation incomplete or invalid' 
                  })}
                  className="bg-tomato-red/20 hover:bg-tomato-red/30 text-tomato-red px-6 py-2 rounded-xl font-medium transition-all duration-200"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}

        {!approvals?.data?.length && (
          <div className="text-center py-16">
            <p className="text-text-muted text-lg">No pending approvals found</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Listing Management for Vendors

> **API Reference**: See [Listings Endpoints](./api-endpoints.md#listings-endpoints-apiv1listings) for complete endpoint specifications including file upload requirements.

```javascript
// components/vendor/ListingManagement.jsx
import React, { useState } from 'react';
import { 
  useGetListingsQuery, 
  useCreateListingMutation, 
  useDeleteListingMutation 
} from '../../store/api/apiSlice';

export const ListingManagement = () => {
  const [filters, setFilters] = useState({ vendor: true });
  const { data: listings, isLoading, error } = useGetListingsQuery(filters);
  const [createListing] = useCreateListingMutation();
  const [deleteListing] = useDeleteListingMutation();

  const handleCreateListing = async (formData) => {
    try {
      await createListing(formData).unwrap();
      console.log('Listing created successfully');
    } catch (error) {
      console.error('Failed to create listing:', error);
    }
  };

  const handleDeleteListing = async (id) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteListing(id).unwrap();
        console.log('Listing deleted successfully');
      } catch (error) {
        console.error('Failed to delete listing:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white/80 rounded-3xl p-6 animate-pulse">
            <div className="h-48 bg-earthy-beige/50 rounded-2xl mb-4"></div>
            <div className="h-4 bg-earthy-beige/50 rounded mb-2"></div>
            <div className="h-4 bg-earthy-beige/50 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-medium text-text-dark">My Listings</h1>
        <button 
          onClick={() => {/* Open create modal */}}
          className="bg-gradient-secondary text-white px-6 py-3 rounded-2xl font-medium hover:shadow-lg transition-all duration-300"
        >
          Create New Listing
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings?.data?.listings?.map((listing) => (
          <div key={listing.id} className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="relative">
              {listing.images?.[0] && (
                <img 
                  src={listing.images[0]} 
                  alt={listing.product.name}
                  className="w-full h-48 object-cover rounded-2xl mb-4"
                />
              )}
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-bottle-green">
                {listing.qualityGrade}
              </div>
            </div>
            
            <h3 className="font-semibold text-lg text-text-dark mb-2">
              {listing.product.name}
            </h3>
            <p className="text-text-muted text-sm mb-3">
              {listing.product.category.name}
            </p>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-2xl font-bold text-bottle-green">
                ৳{listing.pricing[0].pricePerUnit}
                <span className="text-sm font-normal text-text-muted">
                  /{listing.pricing[0].unit}
                </span>
              </span>
              <span className="text-sm text-text-muted">
                {listing.availability.quantityAvailable} {listing.availability.unit} available
              </span>
            </div>
            
            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <button className="flex-1 bg-earthy-yellow/20 hover:bg-earthy-yellow/30 text-earthy-brown px-4 py-2 rounded-xl font-medium transition-all duration-200">
                Edit
              </button>
              <button 
                onClick={() => handleDeleteListing(listing.id)}
                className="flex-1 bg-tomato-red/20 hover:bg-tomato-red/30 text-tomato-red px-4 py-2 rounded-xl font-medium transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!listings?.data?.listings?.length && (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg mb-4">No listings found</p>
          <button 
            onClick={() => {/* Open create modal */}}
            className="bg-gradient-secondary text-white px-8 py-3 rounded-2xl font-medium hover:shadow-lg transition-all duration-300"
          >
            Create Your First Listing
          </button>
        </div>
      )}
    </div>
  );
};
```

## Advanced Patterns

### Optimistic Updates

> **API Reference**: See [Orders Endpoints](./api-endpoints.md#orders-endpoints-apiv1orders) for order status update specifications.

```javascript
// Example: Optimistic order status update
const [updateOrderStatus] = useUpdateOrderStatusMutation();

const handleStatusUpdate = async (orderId, newStatus) => {
  try {
    // Optimistic update - immediately update UI
    const patchResult = dispatch(
      apiSlice.util.updateQueryData('getOrders', undefined, (draft) => {
        const order = draft.data.orders.find(o => o.id === orderId);
        if (order) {
          order.status = newStatus;
          order.updatedAt = new Date().toISOString();
        }
      })
    );
    
    // Actual API call
    await updateOrderStatus({ id: orderId, status: newStatus }).unwrap();
  } catch (error) {
    // Revert optimistic update on failure
    patchResult.undo();
    console.error('Status update failed:', error);
  }
};
```

### Cache Management

```javascript
// Custom hook for cache management
export const useCacheManagement = () => {
  const dispatch = useDispatch();

  const invalidateCache = (tags) => {
    dispatch(apiSlice.util.invalidateTags(tags));
  };

  const prefetchData = (endpoint, args) => {
    dispatch(apiSlice.util.prefetch(endpoint, args));
  };

  const updateCacheData = (endpoint, args, updateFn) => {
    dispatch(apiSlice.util.updateQueryData(endpoint, args, updateFn));
  };

  return { invalidateCache, prefetchData, updateCacheData };
};
```

### Error Handling

```javascript
// components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 text-tomato-red mb-6">
            <AlertTriangle className="w-full h-full" />
          </div>
          <h2 className="text-2xl font-medium text-text-dark/80 mb-4">
            Something went wrong
          </h2>
          <p className="text-text-muted mb-8 max-w-md">
            We encountered an unexpected error. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-secondary text-white px-8 py-3 rounded-2xl font-medium"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

## Performance Optimization

### Memoization Patterns

```javascript
import React, { memo, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';

// Memoized component
export const ProductCard = memo(({ product, onAddToCart }) => {
  const handleAddToCart = useCallback(() => {
    onAddToCart(product);
  }, [product, onAddToCart]);

  const priceDisplay = useMemo(() => 
    `৳${product.price.toFixed(2)}`,
    [product.price]
  );

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{priceDisplay}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
});

// Memoized selectors
const selectUserRole = useMemo(
  () => (state) => state.auth.user?.role,
  []
);
```

### Conditional Queries

```javascript
// Only fetch data when conditions are met
const { data: vendorData } = useGetVendorDashboardQuery(
  { period: 'month' },
  { 
    skip: user?.role !== 'vendor',
    pollingInterval: 300000 // Poll every 5 minutes
  }
);

// Conditional refetching
const { data: orders, refetch } = useGetOrdersQuery(
  { status: 'pending' },
  { 
    refetchOnFocus: true,
    refetchOnReconnect: true,
  }
);
```

## Testing Integration

### RTK Query Testing

```javascript
// tests/utils/testUtils.js
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { apiSlice } from '../store/api/apiSlice';
import authReducer from '../store/slices/authSlice';

export const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      api: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
    preloadedState: initialState,
  });
};

export const renderWithStore = (component, { store = createTestStore() } = {}) => {
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};
```

## Migration Checklist

### Three-State Verification System Migration

- [x] ✅ Replace all `isApproved`/`isVerified` fields with `verificationStatus`
- [x] ✅ Update admin approval endpoints to use new three-state system
- [x] ✅ Implement unified approval management in Redux
- [x] ✅ Update component logic to handle `pending`/`approved`/`rejected` states
- [x] ✅ Add approval notes and rejection reasons to UI
- [x] ✅ Test all approval workflows with new backend endpoints

### Redux Toolkit Implementation

- [ ] Set up Redux Toolkit store with proper middleware
- [ ] Implement authentication slice with token management
- [ ] Create RTK Query API slice with auto-refresh
- [ ] Build protected route system with role-based access
- [ ] Implement component integration patterns
- [ ] Add error handling and loading states
- [ ] Set up performance optimizations
- [ ] Write integration tests

---

## Quick API References

### Endpoint Specifications
- **Authentication**: [Authentication Endpoints](./api-endpoints.md#authentication-endpoints-apiv1auth)
- **Admin Operations**: [Admin Endpoints](./api-endpoints.md#admin-endpoints-apiv1admin)
- **Listings Management**: [Listings Endpoints](./api-endpoints.md#listings-endpoints-apiv1listings)
- **Order Management**: [Orders Endpoints](./api-endpoints.md#orders-endpoints-apiv1orders)
- **Public Data**: [Public Endpoints](./api-endpoints.md#public-endpoints-apiv1public)
- **Dashboard Data**: [Dashboard Endpoints](./api-endpoints.md#dashboard-endpoints)

### Data Models & Schemas
- **User Model**: [User Model](./api-endpoints.md#user-model)
- **Product Model**: [Product Model](./api-endpoints.md#product-model)
- **Listing Model**: [Listing Model](./api-endpoints.md#listing-model)
- **Order Model**: [Order Model](./api-endpoints.md#order-model)
- **Error Format**: [Standard Error Format](./api-endpoints.md#standard-error-format)
- **HTTP Status Codes**: [HTTP Status Codes](./api-endpoints.md#http-status-codes)

### File Upload Specifications
- **Upload Constraints**: [Image Upload Constraints](./api-endpoints.md#image-upload-constraints)
- **Upload Integration**: [Upload Integration](./api-endpoints.md#upload-integration)

**Note**: This document focuses on Redux Toolkit implementation patterns. For complete API endpoint specifications, request/response schemas, and data models, refer to [api-endpoints.md](./api-endpoints.md).