# 🔐 Aaroth Fresh Admin Interface Implementation Guide

## 🎯 Task: Build Admin Dashboard Interface

**OBJECTIVE**: You are a React developer tasked with building the **complete Admin interface** for Aaroth Fresh B2B marketplace. Create a comprehensive admin dashboard using React + JavaScript (NO TypeScript) with Vite, Tailwind CSS, and RTK Query.

**CRITICAL REQUIREMENTS**:
- Use React + JavaScript (vanilla JS, NO TypeScript)
- Implement ALL admin features described in this document
- Follow the enhanced backend API structure exactly
- Create professional, responsive admin interface
- Ensure proper error handling and loading states

## 🏗️ Enhanced Backend Context

### 📚 Essential Reference Files
**IMPORTANT**: The previous `api-integration-guide.md` (4,400+ lines) has been optimized and split into focused, digestible files for better Claude Code consumption:

1. **@api-integration-essentials.md** (~1,500 lines)
   - Core authentication patterns and JWT management
   - Essential RTK Query configuration
   - Critical API migration from legacy to unified approval system
   - Basic error handling and security patterns
   - **USE THIS** as your primary integration reference

2. **@ui-patterns-reference.md** (~800 lines)
   - Complete UI component patterns following Organic Futurism design
   - Button, form, navigation, and layout patterns
   - Loading states, empty states, and status indicators
   - Accessibility and responsive design patterns
   - **USE THIS** for all component styling and patterns

3. **@advanced-patterns.md** (~1,200 lines)
   - Complex state management with Redux Toolkit
   - Performance optimization techniques
   - Real-time WebSocket integration
   - Advanced caching and security patterns
   - **USE THIS** for complex features and optimizations

4. **@api-endpoints.md** (~1,900 lines)
   - Complete API reference with request/response examples
   - All admin endpoints with parameters and data structures
   - **USE THIS** as your API reference guide

**Total optimized context**: ~5,400 lines across 4 focused files (vs. previous single 4,400+ line file)
**Claude Code consumption**: Each file is under 2,000 lines for optimal processing

### Admin API Endpoints Overview
- **Base URL**: `http://localhost:5000/api/v1/admin`
- **Authentication**: JWT Bearer tokens (admin role required)
- **New Features**: Unified approval system, advanced analytics, system settings, content moderation

### 🚨 Critical API Migration
**Legacy endpoints REMOVED** - Use new unified approval system:

#### Removed (❌):
- `PUT /admin/users/:id/approve`
- `PUT /admin/vendors/:id/verify` 
- `PUT /admin/restaurants/:id/verify`

#### New Unified System (✅):
- `GET /admin/approvals` - All pending approvals
- `PUT /admin/approvals/vendor/:id/approve` - Approve vendor
- `PUT /admin/approvals/vendor/:id/reject` - Reject vendor
- `PUT /admin/approvals/restaurant/:id/approve` - Approve restaurant
- `PUT /admin/approvals/restaurant/:id/reject` - Reject restaurant

### Enhanced Admin APIs
```javascript
// Dashboard & Analytics
GET /admin/dashboard/overview          // Enhanced metrics with approval data
GET /admin/analytics/overview?period=month&useCache=true
GET /admin/analytics/sales?startDate=2024-01-01
GET /admin/analytics/users?period=quarter
DELETE /admin/analytics/cache          // Clear analytics cache

// System Settings Management
GET /admin/settings                    // All system settings
GET /admin/settings/:category          // Category-specific settings
PUT /admin/settings/key/:key           // Update setting with reason
POST /admin/settings/reset             // Reset to defaults
GET /admin/settings/key/:key/history   // Setting change history

// Content Moderation & Security
PUT /admin/listings/:id/flag           // Flag listing with reason
GET /admin/listings/flagged            // Get flagged content
DELETE /admin/products/:id/safe-delete // Safe delete with dependency check
PUT /admin/vendors/:id/deactivate      // Deactivate with audit
PUT /admin/restaurants/:id/toggle-status // Enable/disable restaurant
```

## 🚀 Implementation Requirements

### 1. **Admin Dashboard Layout**

#### Sidebar Navigation Structure
```javascript
const adminNavItems = [
  { 
    path: '/admin/dashboard', 
    label: 'Dashboard', 
    icon: 'LayoutDashboard',
    description: 'Platform overview and key metrics'
  },
  { 
    path: '/admin/approvals', 
    label: 'Approval Management', 
    icon: 'CheckCircle',
    badge: pendingApprovalsCount,
    description: 'Review and approve vendor/restaurant applications'
  },
  { 
    path: '/admin/restaurant-management', 
    label: 'Restaurant Management', 
    icon: 'Store',
    description: 'CRUD restaurant owners/managers, enable/disable restaurants'
  },
  { 
    path: '/admin/vendor-management', 
    label: 'Vendor Management', 
    icon: 'Truck',
    description: 'Manage vendors, view performance, enable/disable accounts'
  },
  { 
    path: '/admin/categories', 
    label: 'Categories', 
    icon: 'Tag',
    description: 'CRUD product categories'
  },
  { 
    path: '/admin/products', 
    label: 'Products', 
    icon: 'Package',
    description: 'CRUD products, manage status (active/inactive/discontinued)'
  },
  { 
    path: '/admin/listing-management', 
    label: 'Listing Management', 
    icon: 'List',
    description: 'Flag/unflag listings, feature management, status updates'
  },
  { 
    path: '/admin/analytics', 
    label: 'Analytics', 
    icon: 'BarChart3',
    description: 'Advanced platform analytics with caching'
  },
  { 
    path: '/admin/system-settings', 
    label: 'System Settings', 
    icon: 'Settings',
    description: 'Platform configuration management'
  }
];
```

### 2. **Core Admin Components**

#### Approval Management Interface
```javascript
// components/admin/ApprovalManagement.jsx
// CREATE: Main approval management component

// Key Features TO IMPLEMENT:
- Unified dashboard showing pending vendors and restaurants
- Detailed application review with document verification
- Approve with notes / Reject with detailed reason
- Approval history and audit trail
- Search and filter by application date, business type
- Batch approval capabilities for efficient processing
- Email notification triggers on approval/rejection

// REQUIRED Sub-components TO CREATE:
- ApprovalCard.jsx          // Individual approval item display
- ApprovalModal.jsx         // Detailed review and action modal
- ApprovalHistory.jsx       // Audit trail of decisions
- ApprovalFilters.jsx       // Filter and search interface

// EXAMPLE Component Structure:
const ApprovalManagement = () => {
  const { data: approvals, isLoading, error } = useGetAllApprovalsQuery();
  const [approveVendor] = useApproveVendorMutation();
  const [rejectVendor] = useRejectVendorMutation();
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Handle approval logic
  const handleApproval = async (type, id, action, data) => {
    try {
      // Implementation logic here
    } catch (error) {
      // Error handling
    }
  };
  
  return (
    // JSX implementation
  );
};
```

#### Enhanced Dashboard Overview
```javascript
// components/admin/AdminDashboard.jsx
// CREATE: Main admin dashboard component

// IMPLEMENT These Key Metrics Cards:
- Total Platform Users (vendors, restaurants, managers)
- Pending Approvals (with urgency indicators)
- Monthly Revenue and Growth Trends
- Active Listings and Order Volume
- System Health Status
- Recent Critical Activities

// IMPLEMENT These Visual Components:
- Approval Pipeline Chart (pending → approved → rejected flow)
- Revenue Trends (Line chart with monthly/quarterly view)
- User Growth Analytics (New registrations, activation rates)
- Geographic Distribution (Where vendors/restaurants are located)
- Top Performing Categories/Products
- Platform Activity Timeline

// EXAMPLE Implementation:
const AdminDashboard = () => {
  const { data: dashboard, isLoading } = useGetAdminDashboardOverviewQuery();
  const { data: analytics } = useGetAnalyticsOverviewQuery();
  
  if (isLoading) return <LoadingSpinner />;
  
  const { keyMetrics, approvalMetrics, systemHealth, recentActivity } = dashboard?.data || {};
  
  return (
    <div className="space-y-8">
      <MetricsGrid metrics={keyMetrics} />
      <ApprovalMetricsSection metrics={approvalMetrics} />
      <ChartsSection analytics={analytics} />
      <RecentActivityFeed activity={recentActivity} />
    </div>
  );
};
```

#### Restaurant Management Interface
```javascript
// components/admin/RestaurantManagement.jsx
// CREATE: Restaurant management component

// IMPLEMENT Core Features:
- CRUD Restaurant Owners (create, edit, view profile, deactivate)
- CRUD Restaurant Managers (assign to restaurants, permissions)
- Restaurant Profile Management (edit details, address, licenses)
- Enable/Disable Restaurant Operations
- View Restaurant Performance Metrics
- Manage Restaurant-Manager Relationships

// CREATE These Sub-components:
- RestaurantOwnerForm.jsx   // Create/edit restaurant owners
- RestaurantManagerForm.jsx // Create/edit managers
- RestaurantDetails.jsx     // Full restaurant profile view
- RestaurantStatusToggle.jsx // Enable/disable controls with reason
- RestaurantMetrics.jsx     // Performance dashboard per restaurant

// EXAMPLE Structure:
const RestaurantManagement = () => {
  const [selectedTab, setSelectedTab] = useState('owners'); // 'owners', 'managers'
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Restaurant Management</h1>
        <button onClick={() => setShowForm(true)}>Add New</button>
      </div>
      
      <TabNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} />
      
      {selectedTab === 'owners' && <RestaurantOwnersTable />}
      {selectedTab === 'managers' && <RestaurantManagersTable />}
      
      {showForm && <RestaurantForm onClose={() => setShowForm(false)} />}
    </div>
  );
};
```

#### Vendor Management Interface
```javascript
// components/admin/VendorManagement.jsx
// CREATE: Vendor management component

// IMPLEMENT Core Features:
- View All Vendors with Status (active, inactive, suspended)
- Vendor Profile Management (edit business details)
- Performance Analytics per Vendor
- Enable/Disable Vendor Operations
- View Vendor Listings and Order History
- Vendor Verification Status Tracking

// CREATE These Sub-components:
- VendorProfile.jsx         // Complete vendor information view
- VendorPerformance.jsx     // Sales, ratings, order fulfillment metrics
- VendorStatusControls.jsx  // Activation/deactivation with admin notes
- VendorListings.jsx        // Listings management for specific vendor

// EXAMPLE Implementation:
const VendorManagement = () => {
  const { data: vendors, isLoading } = useGetVendorsQuery();
  const [deactivateVendor] = useDeactivateVendorMutation();
  const [selectedVendor, setSelectedVendor] = useState(null);
  
  const handleStatusToggle = async (vendorId, isActive, reason) => {
    try {
      await deactivateVendor({ id: vendorId, reason }).unwrap();
      toast.success('Vendor status updated successfully');
    } catch (error) {
      toast.error(error.data?.message || 'Failed to update vendor status');
    }
  };
  
  return (
    <div className="space-y-6">
      <VendorFilters />
      <VendorTable vendors={vendors} onStatusToggle={handleStatusToggle} />
      {selectedVendor && <VendorDetailsModal vendor={selectedVendor} />}
    </div>
  );
};
```

#### Content Moderation System
```javascript
// components/admin/ContentModeration.jsx
// CREATE: Content moderation component

// IMPLEMENT Features:
- View Flagged Listings with Reason and Context
- Review and Moderate Flagged Content
- Unflag/Approve Legitimate Content
- Listing Feature Management (featured/unfeatured)
- Content Status Updates (active, under review, removed)
- Moderation History and Appeals

// CREATE These Sub-components:
- FlaggedContentList.jsx    // List all flagged items
- ModerationReview.jsx      // Individual content review interface
- FlagReason.jsx            // Categorized flagging system
- ContentActions.jsx        // Approve, reject, escalate actions

// EXAMPLE Structure:
const ContentModeration = () => {
  const { data: flaggedContent } = useGetFlaggedListingsQuery();
  const [flagListing] = useFlagListingMutation();
  const [selectedContent, setSelectedContent] = useState(null);
  
  const handleModeration = async (action, contentId, data) => {
    try {
      if (action === 'flag') {
        await flagListing({ id: contentId, ...data }).unwrap();
      }
      toast.success('Content moderated successfully');
    } catch (error) {
      toast.error(error.data?.message || 'Moderation failed');
    }
  };
  
  return (
    <div className="space-y-6">
      <ModerationFilters />
      <FlaggedContentGrid content={flaggedContent} onSelect={setSelectedContent} />
      {selectedContent && (
        <ModerationPanel 
          content={selectedContent} 
          onModerate={handleModeration}
        />
      )}
    </div>
  );
};
```

#### System Settings Management
```javascript
// components/admin/SystemSettings.jsx
// CREATE: System settings management component

// IMPLEMENT Features:
- Platform Configuration Management
- Category-based Settings Organization
- Setting Change History with Audit Trail
- Bulk Settings Update and Reset to Defaults
- Real-time Configuration Validation
- Environment-specific Settings Display

// IMPLEMENT These Settings Categories:
- General Platform Settings
- Email & Notification Configuration
- Payment & Commission Settings
- Security & Authentication Settings
- Feature Flags and Toggles
- API Rate Limiting Configuration

// CREATE These Sub-components:
- SettingsCategoryNav.jsx   // Category navigation
- SettingItem.jsx           // Individual setting with validation
- SettingsHistory.jsx       // Change audit trail
- BulkSettingsActions.jsx   // Bulk operations interface

// EXAMPLE Implementation:
const SystemSettings = () => {
  const [selectedCategory, setSelectedCategory] = useState('general');
  const { data: settings } = useGetSystemSettingsQuery({ category: selectedCategory });
  const [updateSetting] = useUpdateSystemSettingMutation();
  
  const handleSettingUpdate = async (key, value, reason) => {
    try {
      await updateSetting({ key, value, changeReason: reason }).unwrap();
      toast.success('Setting updated successfully');
    } catch (error) {
      toast.error(error.data?.message || 'Failed to update setting');
    }
  };
  
  return (
    <div className="flex h-screen">
      <SettingsCategoryNav 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <div className="flex-1 p-6">
        <SettingsForm 
          settings={settings}
          category={selectedCategory}
          onUpdate={handleSettingUpdate}
        />
      </div>
    </div>
  );
};
```

#### Advanced Analytics Dashboard
```javascript
// components/admin/AnalyticsDashboard.jsx
// CREATE: Advanced analytics dashboard

// IMPLEMENT Core Analytics:
- User Growth Trends (Registration, approval, activation rates)
- Revenue Analytics (Platform commission, growth metrics)
- Business Performance (Top vendors, restaurants, categories)
- Platform Usage Metrics (Active users, order volume, listing activity)
- Geographic Analytics (User distribution, regional performance)
- Seasonal Trends and Forecasting

// IMPLEMENT Features:
- Date Range Selection (Today, Week, Month, Quarter, Year, Custom)
- Export Capabilities (PDF reports, CSV data)
- Real-time vs Cached Data Toggle
- Drill-down Capabilities (Click metrics to see details)
- Comparative Analysis (Period over period comparison)

// CREATE These Sub-components:
- MetricsOverview.jsx       // Key platform metrics
- RevenueCharts.jsx         // Revenue and financial analytics
- UserAnalytics.jsx         // User behavior and growth
- BusinessAnalytics.jsx     // Vendor/restaurant performance
- ExportControls.jsx        // Data export functionality

// EXAMPLE Structure:
const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState({ period: 'month' });
  const [useCache, setUseCache] = useState(true);
  
  const { data: analytics, isLoading } = useGetAnalyticsOverviewQuery({ 
    ...dateRange, 
    useCache 
  });
  
  const handleExport = (format) => {
    // Export logic implementation
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
        <div className="flex gap-4">
          <CacheToggle value={useCache} onChange={setUseCache} />
          <ExportControls onExport={handleExport} />
        </div>
      </div>
      
      <MetricsGrid data={analytics?.keyMetrics} />
      <ChartsGrid data={analytics?.charts} />
      <DetailedTables data={analytics?.tables} />
    </div>
  );
};
```

### 3. **Data Models and Constants**

#### JavaScript Data Structure Examples
```javascript
// utils/dataStructures.js
// REFERENCE: Expected data structures from backend

// Enhanced User Object
const enhancedUserExample = {
  id: 'string',
  phone: 'string',
  name: 'string',
  role: 'vendor | restaurantOwner | restaurantManager',
  
  // Enhanced approval tracking
  approvalStatus: 'pending | approved | rejected',
  approvalDate: 'string (ISO date)',
  approvedBy: 'string (admin user id)',
  rejectionReason: 'string',
  adminNotes: 'string',
  
  // Audit fields
  isDeleted: 'boolean',
  deletedAt: 'string (ISO date)',
  deletedBy: 'string (admin user id)',
  lastModifiedBy: 'string (admin user id)',
  statusUpdatedAt: 'string (ISO date)',
  
  // Relations (populated objects)
  vendor: 'VendorObject',
  restaurant: 'RestaurantObject'
};

// Enhanced Product Object
const enhancedProductExample = {
  id: 'string',
  name: 'string',
  category: 'CategoryObject',
  
  // Admin status management
  adminStatus: 'active | inactive | discontinued',
  
  // Soft delete
  isDeleted: 'boolean',
  deletedAt: 'string (ISO date)',
  deletedBy: 'string (admin user id)'
};

// System Setting Object
const systemSettingExample = {
  id: 'string',
  key: 'string',
  value: 'any type',
  category: 'string',
  dataType: 'string | number | boolean | object | array',
  description: 'string',
  defaultValue: 'any type',
  lastModifiedBy: 'string (admin user id)',
  updatedAt: 'string (ISO date)'
};

// Approval Metrics Object
const approvalMetricsExample = {
  totalPending: 'number',
  totalApproved: 'number',
  totalRejected: 'number',
  pendingVendors: 'number',
  pendingRestaurants: 'number',
  avgApprovalTime: 'number (hours)',
  recentActivity: ['array of ApprovalActivity objects']
};

// Constants for use throughout the app
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const ADMIN_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DISCONTINUED: 'discontinued'
};

export const USER_ROLES = {
  VENDOR: 'vendor',
  RESTAURANT_OWNER: 'restaurantOwner',
  RESTAURANT_MANAGER: 'restaurantManager'
};
```

### 4. **RTK Query Integration**

#### Enhanced Admin API Slice (JavaScript)
```javascript
// store/api/adminSlice.js
// CREATE: Complete admin API slice implementation

import { apiSlice } from './apiSlice';

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // IMPLEMENT: Unified Approval System
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
    
    // IMPLEMENT: Enhanced Dashboard
    getAdminDashboardOverview: builder.query({
      query: (dateFilter = {}) => ({
        url: '/admin/dashboard/overview',
        params: dateFilter,
      }),
      providesTags: ['AdminDashboard'],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),
    
    // IMPLEMENT: Advanced Analytics
    getAnalyticsOverview: builder.query({
      query: (filters = {}) => ({
        url: '/admin/analytics/overview',
        params: filters,
      }),
      providesTags: ['Analytics'],
    }),
    
    getSalesAnalytics: builder.query({
      query: (filters = {}) => ({
        url: '/admin/analytics/sales',
        params: filters,
      }),
      providesTags: ['SalesAnalytics'],
    }),
    
    getUserAnalytics: builder.query({
      query: (filters = {}) => ({
        url: '/admin/analytics/users',
        params: filters,
      }),
      providesTags: ['UserAnalytics'],
    }),
    
    clearAnalyticsCache: builder.mutation({
      query: () => ({
        url: '/admin/analytics/cache',
        method: 'DELETE',
      }),
      invalidatesTags: ['Analytics', 'SalesAnalytics', 'UserAnalytics'],
    }),
    
    // IMPLEMENT: System Settings
    getSystemSettings: builder.query({
      query: (filter = {}) => ({
        url: '/admin/settings',
        params: filter,
      }),
      providesTags: ['Settings'],
    }),
    
    updateSystemSetting: builder.mutation({
      query: ({ key, value, changeReason }) => ({
        url: `/admin/settings/key/${key}`,
        method: 'PUT',
        body: { value, changeReason },
      }),
      invalidatesTags: ['Settings'],
    }),
    
    resetSystemSettings: builder.mutation({
      query: () => ({
        url: '/admin/settings/reset',
        method: 'POST',
      }),
      invalidatesTags: ['Settings'],
    }),
    
    // IMPLEMENT: Content Moderation
    getFlaggedListings: builder.query({
      query: (filters = {}) => ({
        url: '/admin/listings/flagged',
        params: filters,
      }),
      providesTags: ['FlaggedContent'],
    }),
    
    flagListing: builder.mutation({
      query: ({ id, flagReason, moderationNotes }) => ({
        url: `/admin/listings/${id}/flag`,
        method: 'PUT',
        body: { flagReason, moderationNotes },
      }),
      invalidatesTags: ['FlaggedContent', 'Listing'],
    }),
    
    // IMPLEMENT: User Management
    getVendors: builder.query({
      query: (filters = {}) => ({
        url: '/admin/vendors',
        params: filters,
      }),
      providesTags: ['Vendor'],
    }),
    
    deactivateVendor: builder.mutation({
      query: ({ id, reason, adminNotes }) => ({
        url: `/admin/vendors/${id}/deactivate`,
        method: 'PUT',
        body: { reason, adminNotes },
      }),
      invalidatesTags: ['Vendor'],
    }),
    
    getRestaurants: builder.query({
      query: (filters = {}) => ({
        url: '/admin/restaurants',
        params: filters,
      }),
      providesTags: ['Restaurant'],
    }),
    
    toggleRestaurantStatus: builder.mutation({
      query: ({ id, isActive, reason }) => ({
        url: `/admin/restaurants/${id}/toggle-status`,
        method: 'PUT',
        body: { isActive, reason },
      }),
      invalidatesTags: ['Restaurant'],
    }),
    
    // IMPLEMENT: Safe Deletion
    safeDeleteProduct: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/admin/products/${id}/safe-delete`,
        method: 'DELETE',
        body: { reason },
      }),
      invalidatesTags: ['Product'],
    }),
    
    safeDeleteCategory: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/admin/categories/${id}/safe-delete`,
        method: 'DELETE',
        body: { reason },
      }),
      invalidatesTags: ['Category'],
    }),
  }),
});

// EXPORT: All hooks for use in components
export const {
  // Approval System Hooks
  useGetAllApprovalsQuery,
  useApproveVendorMutation,
  useRejectVendorMutation,
  useApproveRestaurantMutation,
  useRejectRestaurantMutation,
  
  // Dashboard & Analytics Hooks
  useGetAdminDashboardOverviewQuery,
  useGetAnalyticsOverviewQuery,
  useGetSalesAnalyticsQuery,
  useGetUserAnalyticsQuery,
  useClearAnalyticsCacheMutation,
  
  // Settings Management Hooks
  useGetSystemSettingsQuery,
  useUpdateSystemSettingMutation,
  useResetSystemSettingsMutation,
  
  // Content Moderation Hooks
  useGetFlaggedListingsQuery,
  useFlagListingMutation,
  
  // User Management Hooks
  useGetVendorsQuery,
  useDeactivateVendorMutation,
  useGetRestaurantsQuery,
  useToggleRestaurantStatusMutation,
  
  // Safe Deletion Hooks
  useSafeDeleteProductMutation,
  useSafeDeleteCategoryMutation,
} = adminApiSlice;
```

### 5. **UI Design System for Admin**

#### Admin-Specific Color Palette
```javascript
// Enhanced admin color scheme
const adminColors = {
  // Status colors
  'approval-pending': '#F59E0B',      // Amber for pending items
  'approval-approved': '#10B981',     // Green for approved
  'approval-rejected': '#EF4444',     // Red for rejected
  'system-healthy': '#10B981',        // Green for system health
  'system-warning': '#F59E0B',        // Amber for warnings
  'system-critical': '#EF4444',       // Red for critical issues
  
  // Admin action colors
  'admin-primary': '#1E40AF',         // Blue for primary admin actions
  'admin-secondary': '#6366F1',       // Indigo for secondary actions
  'admin-danger': '#DC2626',          // Red for dangerous actions
  
  // Background variations
  'admin-bg-primary': '#F8FAFC',      // Light gray background
  'admin-bg-secondary': '#F1F5F9',    // Slightly darker gray
  'admin-surface': '#FFFFFF',         // White surfaces
};
```

#### Admin Component Styling
```javascript
// Admin-specific component classes
const adminStyles = {
  // Dashboard cards
  dashboardCard: "bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300",
  
  // Approval items
  approvalCard: "bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 transition-colors duration-200",
  approvalPending: "border-l-4 border-l-amber-400 bg-amber-50/30",
  approvalApproved: "border-l-4 border-l-green-400 bg-green-50/30",
  approvalRejected: "border-l-4 border-l-red-400 bg-red-50/30",
  
  // Action buttons
  approveButton: "bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md",
  rejectButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md",
  moderateButton: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md",
  
  // Status indicators
  statusActive: "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800",
  statusInactive: "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800",
  statusSuspended: "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800",
  
  // Form elements
  adminInput: "w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200",
  adminSelect: "w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200",
  adminTextarea: "w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 min-h-[120px]",
};
```

## 📋 Detailed Implementation Checklist

### Phase 1: Core Admin Infrastructure
**MANDATORY FIRST STEPS**:
- [ ] **SETUP**: Create admin-only routing with role protection (`/admin/*` routes)
- [ ] **CREATE**: Admin layout component with fixed sidebar navigation
- [ ] **IMPLEMENT**: Admin authentication flow with role verification
- [ ] **SETUP**: Enhanced RTK Query admin slice (`store/api/adminSlice.js`)
- [ ] **CREATE**: Base admin dashboard structure (`components/admin/AdminDashboard.jsx`)
- [ ] **STYLE**: Apply admin-specific Tailwind CSS classes

### Phase 2: Approval Management System
**CRITICAL MIGRATION**:
- [ ] **REMOVE**: All legacy approval API calls (they will return 404 errors)
- [ ] **IMPLEMENT**: Unified approval management interface (`ApprovalManagement.jsx`)
- [ ] **CREATE**: Approval cards with detailed review capabilities (`ApprovalCard.jsx`)
- [ ] **BUILD**: Approve/reject modals with notes and reasons (`ApprovalModal.jsx`)
- [ ] **ADD**: Approval history and audit trail (`ApprovalHistory.jsx`)
- [ ] **IMPLEMENT**: Search and filter functionality (`ApprovalFilters.jsx`)
- [ ] **TEST**: All approval workflows (vendor + restaurant approval/rejection)

### Phase 3: User Management Interfaces  
**COMPLETE CRUD INTERFACES**:
- [ ] **BUILD**: Restaurant management with owners/managers CRUD (`RestaurantManagement.jsx`)
- [ ] **CREATE**: Vendor management with performance metrics (`VendorManagement.jsx`)
- [ ] **IMPLEMENT**: Enable/disable functionality with admin notes
- [ ] **ADD**: User profile editing capabilities
- [ ] **BUILD**: User search and filtering with pagination
- [ ] **STYLE**: Professional table layouts and forms

### Phase 4: Content and Product Management
**MODERATION SYSTEM**:
- [ ] **CREATE**: Category management interface with CRUD (`CategoryManagement.jsx`)
- [ ] **BUILD**: Product management with admin status (`ProductManagement.jsx`)
- [ ] **IMPLEMENT**: Listing management with flagging system (`ListingManagement.jsx`)
- [ ] **ADD**: Safe deletion with dependency checking warnings
- [ ] **CREATE**: Content moderation workflow (`ContentModeration.jsx`)
- [ ] **TEST**: All moderation and deletion workflows

### Phase 5: Advanced Analytics and Settings
**DATA VISUALIZATION**:
- [ ] **BUILD**: Comprehensive analytics dashboard (`AnalyticsDashboard.jsx`)
- [ ] **IMPLEMENT**: Chart.js integration for data visualization
- [ ] **CREATE**: System settings management (`SystemSettings.jsx`)
- [ ] **ADD**: Settings change history and audit trail
- [ ] **IMPLEMENT**: Data export functionality (CSV, PDF)
- [ ] **ADD**: Analytics caching with cache management controls

### Phase 6: Polish and Testing
**FINAL STEPS**:
- [ ] **TEST**: All approval workflows thoroughly
- [ ] **OPTIMIZE**: Performance and caching strategies
- [ ] **ENSURE**: Mobile responsiveness for admin interface
- [ ] **IMPLEMENT**: Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] **ADD**: Loading states, error handling, and user feedback
- [ ] **VERIFY**: All RTK Query hooks work correctly with backend APIs

## 🎨 Admin UI Guidelines

### Design Philosophy
- **Professional & Clean**: Business-focused interface with clear hierarchy
- **Data-Dense but Organized**: Present lots of information without overwhelming
- **Action-Oriented**: Clear paths to common admin tasks
- **Audit-Focused**: Transparency in all administrative actions

### Layout Principles
- **Fixed sidebar**: Always visible navigation for quick access
- **Contextual actions**: Actions relevant to current view
- **Status-first design**: Clear visual status indicators throughout
- **Mobile-responsive**: Functional on tablets for mobile administration

### Critical Success Factors
1. **Approval Efficiency**: Streamlined vendor/restaurant approval process
2. **System Monitoring**: Real-time visibility into platform health
3. **Content Safety**: Effective content moderation tools
4. **Audit Compliance**: Complete tracking of administrative actions
5. **Performance**: Fast loading of admin dashboards and analytics

## 🔑 Key Features Summary

### New Admin Capabilities
- **Unified Approval System**: Single interface for all approval workflows
- **Enhanced Analytics**: Advanced platform insights with caching
- **System Settings**: Comprehensive configuration management
- **Content Moderation**: Professional flagging and review system
- **Audit Trails**: Complete tracking of all admin actions
- **Safe Operations**: Dependency checking before deletions
- **Real-time Monitoring**: Live platform health and metrics

### Migration Requirements
- Replace all legacy approval endpoints
- Update data models for enhanced approval status
- Implement audit trail display throughout interface
- Add content moderation workflows
- Create system settings management interface

## 🚀 Getting Started Instructions

### Step 0: Review Context Files (CRITICAL)
**BEFORE CODING**: Read these optimized context files in order:

1. **@api-integration-essentials.md** - Authentication, RTK Query, API migration
2. **@ui-patterns-reference.md** - UI components and styling patterns  
3. **@api-endpoints.md** - Complete API reference
4. **@advanced-patterns.md** - Complex features (if needed)

### Step 1: Project Setup
```bash
# Ensure you have these dependencies
npm install @reduxjs/toolkit react-redux react-router-dom
npm install lucide-react react-toastify chart.js react-chartjs-2
```

### Step 2: File Structure to Create
```

├── layout/
│   ├── AdminLayout.jsx
│   ├── AdminSidebar.jsx
│   └── AdminHeader.jsx
├── dashboard/
│   ├── AdminDashboard.jsx
│   ├── MetricsCard.jsx
│   └── ChartsGrid.jsx
├── approvals/
│   ├── ApprovalManagement.jsx
│   ├── ApprovalCard.jsx
│   ├── ApprovalModal.jsx
│   └── ApprovalFilters.jsx
├── users/
│   ├── RestaurantManagement.jsx
│   ├── VendorManagement.jsx
│   └── UserStatusToggle.jsx
├── content/
│   ├── ProductManagement.jsx
│   ├── CategoryManagement.jsx
│   └── ContentModeration.jsx
├── analytics/
│   ├── AnalyticsDashboard.jsx
│   └── ExportControls.jsx
└── settings/
│   ├── SystemSettings.jsx
│   └── SettingItem.jsx

```

### Step 3: Start Implementation
1. **Begin with the admin layout and routing**
2. **Set up the RTK Query admin slice**
3. **Implement the dashboard overview first**
4. **Then tackle the approval management system**
5. **Follow the phase-by-phase implementation plan**

### Step 4: Key Integration Points
- **API Base URL**: `http://localhost:5000/api/v1/admin`
- **Authentication**: JWT Bearer tokens in headers
- **Error Handling**: Use react-toastify for user feedback
- **Loading States**: Show spinners and skeleton screens
- **Mobile First**: Ensure responsive design on all screens

### Critical Success Factors:
1. **API Migration**: Replace ALL legacy endpoints with new unified system
2. **Error Handling**: Comprehensive error handling throughout
3. **User Feedback**: Clear loading states and success/error messages
4. **Security**: Proper role-based access control
5. **Performance**: Efficient data fetching and caching
6. **Usability**: Clean, professional admin interface

**Remember**: This is a complete admin system implementation. Each component should be fully functional with proper styling, error handling, and integration with the enhanced backend APIs.