# Vendor Interface Components & UI Guidelines

**Navigation**: [← Design](./vendor-interface-design.md)

This document provides UI/UX component specifications for the vendor interface using vanilla JavaScript + React.js + TailwindCSS. Follow the existing frontend structure and enhance existing components rather than creating new ones.

## Component Architecture Strategy

**INTEGRATION APPROACH**: 
- **Extend existing UI components** from `src/components/ui/` with vendor-specific features
- **Create vendor-specific layouts** in `src/components/vendor/` that use existing base components
- **Follow existing component patterns** from the configured frontend structure
- **Integrate with existing form library** from `src/components/forms/`
- **Use existing layout system** from `src/components/layout/` as foundation

## Core Form Components - Aaroth Fresh Design System

These components extend existing form components with vendor-specific styling using the exact TailwindCSS classes from the configured theme.

```javascript
// src/components/vendor/VendorInput.jsx - Extend existing form inputs
const VendorFloatingInput = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  required = false,
  error,
  disabled = false,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputId = `vendor-input-${Math.random().toString(36).substr(2, 9)}`;

  const isFloated = isFocused || value;
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`relative group ${className}`}>
      {/* Glassmorphic floating label */}
      <label
        htmlFor={inputId}
        className={`absolute left-4 transition-all duration-300 cursor-text pointer-events-none z-10 ${
          isFloated
            ? '-top-2 text-xs bg-white px-2 text-olive-600 font-medium'
            : 'top-1/2 transform -translate-y-1/2 text-gray-500'
        } ${Icon ? 'left-12' : 'left-4'}`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Icon with olive theme */}
      {Icon && (
        <Icon 
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
            isFocused ? 'text-olive-600' : 'text-gray-400'
          }`} 
        />
      )}

      {/* Input with Aaroth Fresh glassmorphism */}
      <input
        id={inputId}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isFocused ? placeholder : ''}
        disabled={disabled}
        className={`w-full h-14 px-4 ${Icon ? 'pl-12' : 'pl-4'} ${
          type === 'password' ? 'pr-12' : 'pr-4'
        } bg-white/80 backdrop-blur-sm border-2 border-olive-200/50 rounded-2xl 
                   transition-all duration-300 text-gray-800
                   focus:border-olive-500 focus:shadow-lg focus:shadow-olive-200/30 focus:outline-none
                   disabled:bg-gray-50 disabled:text-gray-400
                   hover:border-olive-300/70 group-hover:shadow-md group-hover:shadow-olive-100/40
                   ${error ? 'border-red-400 focus:border-red-500 focus:shadow-red-200/30' : ''}`}
      />

      {/* Password visibility toggle */}
      {type === 'password' && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 
                     hover:text-olive-600 transition-colors duration-200"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}

      {/* Error message styling */}
      {error && (
        <p className="text-red-500 text-xs mt-2 ml-1 font-medium">{error}</p>
      )}
    </div>
  );
};

// Vendor Search Component - Integrate with existing search patterns
const VendorSearchInput = ({ onSearch, placeholder = 'Search products, orders...', className = '' }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (value) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className={`relative group ${className}`}>
      <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 
                         transition-colors duration-300 ${
        isFocused ? 'text-olive-600' : 'text-gray-400'
      }`} />
      
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full h-12 pl-12 pr-4 bg-white/80 backdrop-blur-sm border border-olive-200/50 rounded-2xl 
                   transition-all duration-300 text-gray-800 placeholder-gray-500
                   focus:border-olive-500 focus:shadow-lg focus:shadow-olive-200/30 focus:outline-none
                   hover:border-olive-300/70"
      />
      
      {query && (
        <button
          onClick={() => handleSearch('')}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 
                     hover:text-olive-600 transition-colors duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Vendor Select Dropdown - Enhanced with Aaroth Fresh styling
const VendorSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select option...', 
  className = '' 
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-12 px-4 bg-white/80 backdrop-blur-sm border border-olive-200/50 rounded-2xl 
                   text-gray-800 transition-all duration-300 cursor-pointer
                   focus:border-olive-500 focus:shadow-lg focus:shadow-olive-200/30 focus:outline-none
                   hover:border-olive-300/70 appearance-none
                   ${className}`}
      >
        <option value="" disabled className="text-gray-500">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-gray-800">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
};
```

## Chart Components - Vendor Analytics Visualization

Data visualization components for vendor dashboard analytics. Integrate with existing chart library from frontend package.json.

```javascript
// src/components/vendor/VendorCharts.jsx - Extend existing chart components
const VendorRevenueChart = ({ data }) => {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            {/* Olive gradient for revenue */}
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#808F67" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#808F67" stopOpacity={0}/>
            </linearGradient>
            {/* Sage gradient for profit */}
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9CAF88" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#9CAF88" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          
          <XAxis 
            dataKey="date" 
            stroke="#64748B"
            fontSize={12}
            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
          />
          
          <YAxis 
            stroke="#64748B"
            fontSize={12}
            tickFormatter={(value) => `৳${value.toLocaleString()}`}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(128, 143, 103, 0.2)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value, name) => [
              `৳${value.toLocaleString()}`,
              name === 'revenue' ? 'Total Revenue' : 'Net Profit'
            ]}
            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
          />
          
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#808F67"
            strokeWidth={3}
            fill="url(#revenueGradient)"
            strokeLinecap="round"
          />
          
          <Area
            type="monotone"
            dataKey="profit"
            stroke="#9CAF88"
            strokeWidth={2}
            fill="url(#profitGradient)"
            strokeLinecap="round"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Inventory Status Donut Chart
const VendorInventoryChart = ({ data }) => {
  const COLORS = {
    active: '#9CAF88',      // olive-400
    lowStock: '#F59E0B',   // amber-500
    outOfStock: '#EF4444', // red-500
    overstocked: '#3B82F6' // blue-500
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
```
```

## API Integration Pattern - Vendor Backend Integration

Integrate vendor endpoints with existing frontend API patterns using fetch() and the configured authentication system.

```javascript
// src/services/vendorApi.js - Extend existing API service patterns
class VendorApiService {
  constructor() {
    this.baseUrl = '/api/v1';
  }

  // Get auth token from existing auth system
  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Dashboard API Integration
  async getDashboardOverview(period = 'month') {
    try {
      const response = await fetch(
        `${this.baseUrl}/vendor-dashboard/overview?period=${period}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );
      return await response.json();
    } catch (error) {
      throw new Error(`Dashboard fetch failed: ${error.message}`);
    }
  }

  async getRevenueAnalytics(filters = {}) {
    const params = new URLSearchParams({
      period: filters.period || 'month',
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/vendor-dashboard/revenue?${params}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );
      return await response.json();
    } catch (error) {
      throw new Error(`Revenue analytics fetch failed: ${error.message}`);
    }
  }

  // Inventory API Integration
  async getInventoryOverview(filters = {}) {
    const params = new URLSearchParams({
      ...(filters.status && { status: filters.status }),
      ...(filters.search && { search: filters.search }),
      ...(filters.lowStock && { lowStock: filters.lowStock }),
      page: filters.page || 1,
      limit: filters.limit || 20
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/inventory?${params}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );
      return await response.json();
    } catch (error) {
      throw new Error(`Inventory fetch failed: ${error.message}`);
    }
  }

  async addInventoryPurchase(purchaseData) {
    try {
      const response = await fetch(`${this.baseUrl}/inventory`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(purchaseData)
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Add purchase failed: ${error.message}`);
    }
  }

  // Listings API Integration
  async getVendorListings(filters = {}) {
    const params = new URLSearchParams({
      ...(filters.search && { search: filters.search }),
      ...(filters.category && { category: filters.category }),
      ...(filters.status && { status: filters.status }),
      page: filters.page || 1,
      limit: filters.limit || 20,
      ...(filters.sortBy && { sortBy: filters.sortBy }),
      ...(filters.sortOrder && { sortOrder: filters.sortOrder })
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/listings?${params}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );
      return await response.json();
    } catch (error) {
      throw new Error(`Listings fetch failed: ${error.message}`);
    }
  }

  async createListing(listingData) {
    try {
      const response = await fetch(`${this.baseUrl}/listings`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(listingData)
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Create listing failed: ${error.message}`);
    }
  }

  // Orders API Integration
  async getVendorOrders(filters = {}) {
    const params = new URLSearchParams({
      ...(filters.status && { status: filters.status }),
      ...(filters.search && { search: filters.search }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
      page: filters.page || 1,
      limit: filters.limit || 20
    });

    try {
      const response = await fetch(
        `${this.baseUrl}/orders?${params}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );
      return await response.json();
    } catch (error) {
      throw new Error(`Orders fetch failed: ${error.message}`);
    }
  }

  async updateOrderStatus(orderId, statusData) {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(statusData)
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Update order status failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const vendorApi = new VendorApiService();
```

## State Management Pattern - Vendor Interface

Use React's built-in state management with Context API to integrate with existing frontend patterns.

```javascript
// src/contexts/VendorContext.jsx - Follow existing context patterns
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { vendorApi } from '../services/vendorApi';

// Initial vendor state
const initialState = {
  // Dashboard state
  selectedPeriod: 'month',
  dashboardData: null,
  
  // Filters state
  inventoryFilters: {
    status: 'all',
    search: '',
    lowStock: false,
    sortBy: 'productName',
    sortOrder: 'asc',
    page: 1
  },
  
  listingsFilters: {
    status: 'active',
    search: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1
  },
  
  ordersFilters: {
    status: 'all',
    search: '',
    dateRange: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1
  },
  
  // UI state
  activeModal: null,
  selectedItems: [],
  bulkMode: false,
  notifications: [],
  unreadCount: 0,
  
  // Loading states
  loading: {
    dashboard: false,
    inventory: false,
    listings: false,
    orders: false
  },
  
  // Error states
  errors: {
    dashboard: null,
    inventory: null,
    listings: null,
    orders: null
  }
};

// Vendor reducer
const vendorReducer = (state, action) => {
  switch (action.type) {
    case 'SET_PERIOD':
      return { ...state, selectedPeriod: action.payload };
      
    case 'UPDATE_INVENTORY_FILTERS':
      return {
        ...state,
        inventoryFilters: { ...state.inventoryFilters, ...action.payload }
      };
      
    case 'UPDATE_LISTINGS_FILTERS':
      return {
        ...state,
        listingsFilters: { ...state.listingsFilters, ...action.payload }
      };
      
    case 'UPDATE_ORDERS_FILTERS':
      return {
        ...state,
        ordersFilters: { ...state.ordersFilters, ...action.payload }
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.section]: action.payload }
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.section]: action.payload }
      };
      
    case 'SET_DASHBOARD_DATA':
      return { ...state, dashboardData: action.payload };
      
    case 'TOGGLE_BULK_MODE':
      return {
        ...state,
        bulkMode: action.payload,
        selectedItems: action.payload ? state.selectedItems : []
      };
      
    case 'TOGGLE_ITEM_SELECTION':
      const itemId = action.payload;
      const selected = state.selectedItems.includes(itemId)
        ? state.selectedItems.filter(id => id !== itemId)
        : [...state.selectedItems, itemId];
      return { ...state, selectedItems: selected };
      
    case 'SET_MODAL':
      return { ...state, activeModal: action.payload };
      
    case 'UPDATE_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length
      };
      
    default:
      return state;
  }
};

// Create contexts
const VendorContext = createContext();
const VendorDispatchContext = createContext();

// Context provider
export const VendorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(vendorReducer, initialState);

  // Auto-fetch dashboard data when period changes
  useEffect(() => {
    const fetchDashboard = async () => {
      dispatch({ type: 'SET_LOADING', section: 'dashboard', payload: true });
      try {
        const data = await vendorApi.getDashboardOverview(state.selectedPeriod);
        dispatch({ type: 'SET_DASHBOARD_DATA', payload: data.data });
        dispatch({ type: 'SET_ERROR', section: 'dashboard', payload: null });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', section: 'dashboard', payload: error.message });
      } finally {
        dispatch({ type: 'SET_LOADING', section: 'dashboard', payload: false });
      }
    };

    fetchDashboard();
  }, [state.selectedPeriod]);

  return (
    <VendorContext.Provider value={state}>
      <VendorDispatchContext.Provider value={dispatch}>
        {children}
      </VendorDispatchContext.Provider>
    </VendorContext.Provider>
  );
};

// Custom hooks for vendor state
export const useVendor = () => {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error('useVendor must be used within VendorProvider');
  }
  return context;
};

export const useVendorDispatch = () => {
  const context = useContext(VendorDispatchContext);
  if (!context) {
    throw new Error('useVendorDispatch must be used within VendorProvider');
  }
  return context;
};

// Vendor action creators
export const vendorActions = {
  setPeriod: (period) => ({ type: 'SET_PERIOD', payload: period }),
  updateInventoryFilters: (filters) => ({ type: 'UPDATE_INVENTORY_FILTERS', payload: filters }),
  updateListingsFilters: (filters) => ({ type: 'UPDATE_LISTINGS_FILTERS', payload: filters }),
  updateOrdersFilters: (filters) => ({ type: 'UPDATE_ORDERS_FILTERS', payload: filters }),
  toggleBulkMode: (enabled) => ({ type: 'TOGGLE_BULK_MODE', payload: enabled }),
  toggleItemSelection: (itemId) => ({ type: 'TOGGLE_ITEM_SELECTION', payload: itemId }),
  setModal: (modal) => ({ type: 'SET_MODAL', payload: modal }),
  updateNotifications: (notifications) => ({ type: 'UPDATE_NOTIFICATIONS', payload: notifications })
};
```

## Custom Hooks - Vendor Data Management

Custom hooks that integrate with existing frontend patterns and the vendor API endpoints.

```javascript
// src/hooks/useVendorData.js - Vendor-specific data hooks
import { useState, useEffect } from 'react';
import { vendorApi } from '../services/vendorApi';
import { useVendor, useVendorDispatch, vendorActions } from '../contexts/VendorContext';

// Hook for vendor dashboard data
export const useVendorDashboard = () => {
  const { selectedPeriod, dashboardData, loading, errors } = useVendor();
  const dispatch = useVendorDispatch();

  const changePeriod = (period) => {
    dispatch(vendorActions.setPeriod(period));
  };

  const refreshDashboard = async () => {
    dispatch({ type: 'SET_LOADING', section: 'dashboard', payload: true });
    try {
      const result = await vendorApi.getDashboardOverview(selectedPeriod);
      dispatch({ type: 'SET_DASHBOARD_DATA', payload: result.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', section: 'dashboard', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', section: 'dashboard', payload: false });
    }
  };

  return {
    dashboardData,
    selectedPeriod,
    isLoading: loading.dashboard,
    error: errors.dashboard,
    changePeriod,
    refreshDashboard
  };
};

// Hook for inventory management
export const useVendorInventory = () => {
  const { inventoryFilters, loading, errors } = useVendor();
  const dispatch = useVendorDispatch();
  const [inventory, setInventory] = useState(null);

  const updateFilters = (newFilters) => {
    dispatch(vendorActions.updateInventoryFilters(newFilters));
  };

  const fetchInventory = async () => {
    dispatch({ type: 'SET_LOADING', section: 'inventory', payload: true });
    try {
      const result = await vendorApi.getInventoryOverview(inventoryFilters);
      setInventory(result.data);
      dispatch({ type: 'SET_ERROR', section: 'inventory', payload: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', section: 'inventory', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', section: 'inventory', payload: false });
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [inventoryFilters]);

  return {
    inventory,
    filters: inventoryFilters,
    isLoading: loading.inventory,
    error: errors.inventory,
    updateFilters,
    refetch: fetchInventory
  };
};
```

## UI Components - Error Handling & Loading States

```javascript
// src/components/vendor/VendorErrorBoundary.jsx - Error boundary for vendor sections
class VendorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Vendor section error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Something went wrong</h3>
            <p className="text-gray-600 text-sm mb-4">
              We're having trouble loading this vendor section. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-olive-600 text-white px-6 py-2 rounded-xl font-medium 
                         hover:bg-olive-700 hover:shadow-lg hover:shadow-olive-200/40 transition-all duration-300"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading skeleton components with Aaroth Fresh styling
const VendorMetricCardSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-olive-100/50">
    <div className="flex items-center justify-between mb-6">
      <div className="w-12 h-12 bg-olive-100 rounded-2xl animate-pulse" />
      <div className="w-16 h-4 bg-olive-100 rounded animate-pulse" />
    </div>
    <div className="space-y-2">
      <div className="w-20 h-3 bg-olive-100 rounded animate-pulse" />
      <div className="w-24 h-8 bg-olive-100 rounded animate-pulse" />
    </div>
  </div>
);

const VendorListingCardSkeleton = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-olive-100/50 animate-pulse">
    <div className="space-y-4">
      <div className="h-6 bg-olive-100 rounded w-3/4" />
      <div className="h-4 bg-olive-100 rounded w-1/2" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-8 bg-olive-100 rounded" />
        <div className="h-8 bg-olive-100 rounded" />
      </div>
      <div className="h-12 bg-olive-100 rounded" />
    </div>
  </div>
);

// Error display component with Aaroth Fresh design
const VendorErrorDisplay = ({ error, onRetry, title = "Failed to load vendor data" }) => (
  <div className="min-h-[300px] flex items-center justify-center">
    <div className="text-center p-8 max-w-md">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-6">
        {error?.message || 'An unexpected error occurred while loading vendor data.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-olive-600 text-white px-6 py-2 rounded-xl font-medium 
                     hover:bg-olive-700 hover:shadow-lg hover:shadow-olive-200/40 
                     transition-all duration-300 inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  </div>
);
```

## Component Performance Optimization

Optimize vendor components for B2B dashboard performance using existing frontend optimization patterns.

```javascript
// src/components/vendor/VendorRoutes.jsx - Lazy loading vendor pages
import React, { Suspense, lazy } from 'react';
import { VendorProvider } from '../contexts/VendorContext';
import { VendorErrorBoundary } from './VendorErrorBoundary';

// Lazy load vendor pages for optimal bundle size
const VendorDashboard = lazy(() => import('../pages/vendor/Dashboard'));
const VendorInventory = lazy(() => import('../pages/vendor/Inventory'));
const VendorListings = lazy(() => import('../pages/vendor/Listings'));
const VendorOrders = lazy(() => import('../pages/vendor/Orders'));
const VendorProfile = lazy(() => import('../pages/vendor/Profile'));

// Loading fallback components
const VendorPageSkeleton = ({ type }) => (
  <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-olive-100 rounded w-48 animate-pulse" />
      <div className="h-10 bg-olive-100 rounded w-32 animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <VendorMetricCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Vendor routing configuration - extend existing routes
export const VendorRoutes = () => {
  return (
    <VendorProvider>
      <VendorErrorBoundary>
        <Routes>
          <Route path="/vendor" element={<VendorLayout />}>
            <Route 
              path="dashboard" 
              element={
                <Suspense fallback={<VendorPageSkeleton type="dashboard" />}>
                  <VendorDashboard />
                </Suspense>
              } 
            />
            <Route 
              path="inventory" 
              element={
                <Suspense fallback={<VendorPageSkeleton type="inventory" />}>
                  <VendorInventory />
                </Suspense>
              } 
            />
            <Route 
              path="listings" 
              element={
                <Suspense fallback={<VendorPageSkeleton type="listings" />}>
                  <VendorListings />
                </Suspense>
              } 
            />
            <Route 
              path="orders" 
              element={
                <Suspense fallback={<VendorPageSkeleton type="orders" />}>
                  <VendorOrders />
                </Suspense>
              } 
            />
            <Route 
              path="profile" 
              element={
                <Suspense fallback={<VendorPageSkeleton type="profile" />}>
                  <VendorProfile />
                </Suspense>
              } 
            />
          </Route>
        </Routes>
      </VendorErrorBoundary>
    </VendorProvider>
  );
};

// Preload critical vendor components on login
export const preloadVendorComponents = () => {
  // Preload most commonly accessed vendor pages
  import('../pages/vendor/Dashboard');
  import('../components/vendor/MetricCard');
  import('../components/vendor/NotificationCenter');
};
```

## Media Components - Product Images & Assets

Optimized image handling components for vendor product photos and dashboard assets.

```javascript
// src/components/vendor/VendorImage.jsx - Extend existing image components
const VendorProductImage = ({
  src,
  alt,
  className = '',
  fallback = '/images/placeholder-product.jpg',
  loading = 'lazy',
  objectFit = 'cover',
  quality = 85,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cloudinary optimization for product images
  const getOptimizedSrc = (src, width = 400) => {
    if (src && src.includes('cloudinary')) {
      return src.replace('/upload/', `/upload/w_${width},q_${quality},f_auto,c_fill/`);
    }
    return src;
  };

  const handleLoad = () => setIsLoading(false);
  const handleError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Loading state with olive theme */}
      {isLoading && (
        <div className="absolute inset-0 bg-olive-50 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-olive-200 border-t-olive-500 rounded-full animate-spin" />
        </div>
      )}
      
      <img
        src={imageError ? fallback : getOptimizedSrc(src)}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full transition-all duration-300 ${
          isLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
        } hover:scale-105 transition-transform`}
        style={{ objectFit }}
        {...props}
      />
      
      {/* Error overlay */}
      {imageError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <ImageOff className="w-8 h-8 text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Avatar component for vendor profile
const VendorAvatar = ({ src, name, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-xl'
  };

  const initials = name
    ? name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
    : 'V';

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {src ? (
        <VendorProductImage
          src={src}
          alt={name}
          className="w-full h-full rounded-full border-2 border-olive-200/50"
          objectFit="cover"
        />
      ) : (
        <div className={`w-full h-full rounded-full bg-olive-100 border-2 border-olive-200/50 
                        flex items-center justify-center font-medium text-olive-700`}>
          {initials}
        </div>
      )}
    </div>
  );
};
```

## Vendor Interface Implementation Roadmap

### Phase 1: Foundation Setup (Sprint 1-2)
- [ ] Integrate vendor routes with existing React Router configuration
- [ ] Set up VendorContext and provider in existing state management structure
- [ ] Extend existing authentication system to handle vendor role routing
- [ ] Create vendor API service layer extending existing API patterns
- [ ] Build VendorLayout component using existing layout components as base

### Phase 2: Core Vendor Features (Sprint 3-5)
- [ ] Extend existing dashboard components with vendor-specific metrics display
- [ ] Create inventory management interface with glassmorphic design system
- [ ] Enhance existing product listing components for vendor catalog management
- [ ] Extend existing order management for vendor fulfillment workflow
- [ ] Integrate vendor notification system with existing notification components

### Phase 3: Advanced B2B Features (Sprint 6-7)
- [ ] Implement advanced analytics charts using existing chart library
- [ ] Create bulk operation modals for listings and inventory management
- [ ] Enhance existing search and filter components for vendor data
- [ ] Extend existing profile management for vendor business settings
- [ ] Add data export functionality for vendor reports and analytics

### Phase 4: UX Polish & Optimization (Sprint 8)
- [ ] Implement component lazy loading and performance optimization
- [ ] Add accessibility enhancements following existing a11y patterns
- [ ] Comprehensive component testing integration with existing test suite
- [ ] Cross-browser compatibility testing for vendor dashboard
- [ ] Final UX polish and component library documentation

## Component Testing Patterns

Testing patterns for vendor components that integrate with existing test framework.

```javascript
// src/components/vendor/__tests__/VendorDashboard.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VendorProvider } from '../contexts/VendorContext';
import VendorDashboard from '../pages/vendor/Dashboard';

// Mock vendor API service
jest.mock('../services/vendorApi');

const renderWithVendorContext = (component) => {
  return render(
    <VendorProvider>
      {component}
    </VendorProvider>
  );
};

describe('VendorDashboard', () => {
  test('renders vendor dashboard metrics', async () => {
    renderWithVendorContext(<VendorDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Revenue Overview')).toBeInTheDocument();
      expect(screen.getByText('Inventory Status')).toBeInTheDocument();
    });
  });

  test('period selector updates dashboard data', async () => {
    const user = userEvent.setup();
    renderWithVendorContext(<VendorDashboard />);
    
    const periodSelect = screen.getByRole('combobox');
    await user.selectOptions(periodSelect, 'week');
    
    // Verify API is called with new period
    expect(mockVendorApi.getDashboardOverview).toHaveBeenCalledWith('week');
  });
});
```

## Accessibility Guidelines

Ensure vendor components meet accessibility standards using existing a11y patterns.

```javascript
// Accessible form components
const AccessibleVendorInput = ({ label, error, ...props }) => {
  const id = `vendor-input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${id}-error` : undefined;
  
  return (
    <div className="space-y-1">
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId}
        className="w-full px-4 py-3 border border-olive-200/50 rounded-xl 
                   focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
```

## Conclusion

This vendor component documentation provides UI/UX specifications for building a professional B2B vendor interface that seamlessly integrates with the existing React + TailwindCSS frontend. The components follow the Aaroth Fresh design system and vendor API structure.

**Implementation Strategy:**
- **Frontend Integration**: Extend existing components rather than creating new ones
- **Design Consistency**: Follow Aaroth Fresh olive-centered color palette and glassmorphism patterns  
- **API Integration**: Use vendor backend endpoints with proper authentication and error handling
- **Performance Optimization**: Implement lazy loading and code splitting for vendor sections
- **Accessibility**: Maintain WCAG compliance with existing frontend accessibility patterns
- **Testing Integration**: Follow existing test patterns for vendor-specific functionality

**File Structure:**
```
src/
├── components/vendor/          # Vendor-specific UI components
├── pages/vendor/              # Vendor page components 
├── contexts/VendorContext.jsx # Vendor state management
├── services/vendorApi.js      # Vendor API integration
├── hooks/useVendorData.js     # Vendor data hooks
└── __tests__/vendor/          # Vendor component tests
```

---

**Navigation**: [← Design](./vendor-interface-design.md)