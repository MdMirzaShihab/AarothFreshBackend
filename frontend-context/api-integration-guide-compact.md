# Aaroth Fresh API Integration Guide (Compact)

React frontend integration guide for Aaroth Fresh B2B marketplace with enhanced backend APIs.

## Quick Setup

### Base Configuration
- **API Base**: `http://localhost:5000/api/v1`
- **Auth**: Phone-based JWT (not email) 
- **Headers**: `Authorization: Bearer ${token}`, `Content-Type: application/json`
- **Phone Format**: Must include country code (+8801234567890)

### Enhanced RTK Query API Slice
```javascript
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['User', 'Product', 'Order', 'Listing', 'Approvals', 'Analytics', 'Settings'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({ query: (credentials) => ({ url: '/auth/login', method: 'POST', body: credentials }) }),
    getCurrentUser: builder.query({ query: () => '/auth/me', providesTags: ['User'] }),
    
    // 🆕 ENHANCED ADMIN ENDPOINTS
    
    // Unified Approval System
    getAllApprovals: builder.query({
      query: (params = {}) => ({ url: '/admin/approvals', params }),
      providesTags: ['Approvals'],
    }),
    approveVendor: builder.mutation({
      query: ({ id, approvalNotes }) => ({ url: `/admin/approvals/vendor/${id}/approve`, method: 'PUT', body: { approvalNotes } }),
      invalidatesTags: ['Approvals', 'User'],
    }),
    rejectVendor: builder.mutation({
      query: ({ id, rejectionReason }) => ({ url: `/admin/approvals/vendor/${id}/reject`, method: 'PUT', body: { rejectionReason } }),
      invalidatesTags: ['Approvals', 'User'],
    }),
    approveRestaurant: builder.mutation({
      query: ({ id, approvalNotes }) => ({ url: `/admin/approvals/restaurant/${id}/approve`, method: 'PUT', body: { approvalNotes } }),
      invalidatesTags: ['Approvals', 'User'],
    }),
    rejectRestaurant: builder.mutation({
      query: ({ id, rejectionReason }) => ({ url: `/admin/approvals/restaurant/${id}/reject`, method: 'PUT', body: { rejectionReason } }),
      invalidatesTags: ['Approvals', 'User'],
    }),
    
    // Enhanced Dashboard & Analytics
    getAdminDashboardOverview: builder.query({
      query: (params = {}) => ({ url: '/admin/dashboard/overview', params }),
      providesTags: ['Analytics'],
    }),
    getAnalyticsOverview: builder.query({
      query: (params = {}) => ({ url: '/admin/analytics/overview', params }),
      providesTags: ['Analytics'],
    }),
    getSalesAnalytics: builder.query({
      query: (params = {}) => ({ url: '/admin/analytics/sales', params }),
      providesTags: ['Analytics'],
    }),
    clearAnalyticsCache: builder.mutation({
      query: () => ({ url: '/admin/analytics/cache', method: 'DELETE' }),
      invalidatesTags: ['Analytics'],
    }),
    
    // System Settings Management
    getSystemSettings: builder.query({
      query: (params = {}) => ({ url: '/admin/settings', params }),
      providesTags: ['Settings'],
    }),
    updateSystemSetting: builder.mutation({
      query: ({ key, value, changeReason }) => ({ url: `/admin/settings/key/${key}`, method: 'PUT', body: { value, changeReason } }),
      invalidatesTags: ['Settings'],
    }),
    resetSystemSettings: builder.mutation({
      query: () => ({ url: '/admin/settings/reset', method: 'POST' }),
      invalidatesTags: ['Settings'],
    }),
    
    // Content Moderation
    flagListing: builder.mutation({
      query: ({ id, flagReason, moderationNotes }) => ({ url: `/admin/listings/${id}/flag`, method: 'PUT', body: { flagReason, moderationNotes } }),
      invalidatesTags: ['Listing'],
    }),
    getFlaggedListings: builder.query({
      query: (params = {}) => ({ url: '/admin/listings/flagged', params }),
      providesTags: ['Listing'],
    }),
    
    // Safe Deletion
    safeDeleteProduct: builder.mutation({
      query: ({ id, reason }) => ({ url: `/admin/products/${id}/safe-delete`, method: 'DELETE', body: { reason } }),
      invalidatesTags: ['Product'],
    }),
    
    // Enhanced User Management
    deactivateVendor: builder.mutation({
      query: ({ id, reason, adminNotes }) => ({ url: `/admin/vendors/${id}/deactivate`, method: 'PUT', body: { reason, adminNotes } }),
      invalidatesTags: ['User'],
    }),
    toggleRestaurantStatus: builder.mutation({
      query: ({ id, isActive, reason }) => ({ url: `/admin/restaurants/${id}/toggle-status`, method: 'PUT', body: { isActive, reason } }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  // Auth hooks
  useLoginMutation, useGetCurrentUserQuery,
  
  // 🆕 NEW ADMIN HOOKS
  useGetAllApprovalsQuery,
  useApproveVendorMutation, useRejectVendorMutation,
  useApproveRestaurantMutation, useRejectRestaurantMutation,
  useGetAdminDashboardOverviewQuery, useGetAnalyticsOverviewQuery,
  useGetSystemSettingsQuery, useUpdateSystemSettingMutation,
  useFlagListingMutation, useGetFlaggedListingsQuery,
  useSafeDeleteProductMutation, useDeactivateVendorMutation,
} = apiSlice;
```

## 🚨 API Migration Guide

**BREAKING CHANGE**: Legacy verification endpoints removed. Use new unified approval system.

### Updated Admin Component Example
```javascript
const EnhancedAdminApprovals = () => {
  const { data: approvals, isLoading } = useGetAllApprovalsQuery();
  const [approveVendor] = useApproveVendorMutation();
  const [rejectVendor] = useRejectVendorMutation();
  const [approveRestaurant] = useApproveRestaurantMutation();
  const [rejectRestaurant] = useRejectRestaurantMutation();
  
  const handleApproval = async (type, id, action, notes, reason) => {
    const mutations = {
      vendor: { approve: approveVendor, reject: rejectVendor },
      restaurant: { approve: approveRestaurant, reject: rejectRestaurant }
    };
    
    try {
      const payload = action === 'approve' ? { approvalNotes: notes } : { rejectionReason: reason };
      await mutations[type][action]({ id, ...payload }).unwrap();
      toast.success(`${type} ${action}d successfully`);
    } catch (error) {
      toast.error(error.data?.message || 'Operation failed');
    }
  };
  
  if (isLoading) return <LoadingSpinner />;
  
  const { vendors, restaurants, summary } = approvals?.data || {};
  
  return (
    <div className="space-y-6">
      <ApprovalSummary metrics={summary} />
      <ApprovalSection 
        title="Vendor Approvals" 
        items={vendors?.pending || []} 
        onAction={(id, action, notes, reason) => handleApproval('vendor', id, action, notes, reason)} 
      />
      <ApprovalSection 
        title="Restaurant Approvals" 
        items={restaurants?.pending || []} 
        onAction={(id, action, notes, reason) => handleApproval('restaurant', id, action, notes, reason)} 
      />
    </div>
  );
};
```

### Enhanced Data Models
```javascript
// User Model (Enhanced)
interface User {
  // Standard fields + enhanced approval tracking
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalDate?: string;
  approvedBy?: string;
  rejectionReason?: string;
  adminNotes?: string;
  isDeleted: boolean;
  lastModifiedBy?: string;
}

// Product/Listing Models (Enhanced)
// Products: adminStatus: "active|inactive|discontinued"
// Listings: isFlagged, flagReason, moderatedBy, moderationNotes
// All models: isDeleted, deletedAt, deletedBy for soft delete
```

### File Upload Integration
```javascript
// File uploads integrated with listing creation
const useCreateListingWithImages = () => {
  const [createListing, { isLoading }] = useCreateListingMutation();
  
  const handleCreateListing = async (listingData, imageFiles = []) => {
    const formData = new FormData();
    
    // Add listing data
    formData.append('productId', listingData.productId);
    formData.append('description', listingData.description);
    
    // Add image files (max 5)
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });
    
    try {
      const result = await createListing(formData).unwrap();
      return result;
    } catch (error) {
      toast.error(error?.data?.message || 'Listing creation failed');
      throw error;
    }
  };
  
  return { createListing: handleCreateListing, isLoading };
};
```

### Key Migration Points
1. Replace all legacy approval API calls with new unified system
2. Update data models to handle `approvalStatus` enum instead of boolean `isApproved`
3. Add approval notes and rejection reason fields to forms
4. Implement enhanced admin dashboard with new analytics and settings
5. Add content moderation and safe deletion features
6. Test all approval workflows thoroughly

## Core Integration Patterns

### Authentication Flow
```javascript
const loginData = {
  phone: "+8801234567890",  // Must include country code
  password: "userPassword"
};
// Note: Email authentication not supported
```

### Error Handling
```javascript
// Global error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status } = error.response || {};
    
    switch (status) {
      case 401:
        authService.logout();
        window.location.href = '/login';
        break;
      case 403:
        toast.error('Permission denied');
        break;
      default:
        toast.error(error.response?.data?.message || 'An error occurred');
    }
    
    return Promise.reject(error);
  }
);
```

### Performance Optimization
```javascript
// RTK Query caching strategy
- 5-minute cache for dashboard data
- 15-minute cache for analytics
- 1-hour cache for reference data
- Background refresh with stale-while-revalidate
```

This enhanced integration provides comprehensive admin capabilities with audit trails and better user experience.