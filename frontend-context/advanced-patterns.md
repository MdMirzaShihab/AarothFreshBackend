# Advanced Integration Patterns for Aaroth Fresh

This document covers complex integration scenarios, performance optimizations, and advanced state management patterns for the Aaroth Fresh B2B marketplace.

## Advanced State Management

### Enhanced Redux Toolkit Configuration
```javascript
// store/index.js - Complete store setup
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import notificationReducer from './slices/notificationSlice';
import { apiSlice } from './api/apiSlice';
import { authMiddleware } from './middleware/authMiddleware';

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
    })
    .concat(apiSlice.middleware)
    .concat(authMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Enable listener behavior for the store
setupListeners(store.dispatch);

export default store;
```

### Advanced Token Management Middleware
```javascript
// store/middleware/authMiddleware.js
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { logout, refreshTokenSuccess } from '../slices/authSlice';
import { apiSlice } from '../api/apiSlice';

export const authMiddleware = createListenerMiddleware();

// Auto-refresh token when nearing expiration
authMiddleware.startListening({
  predicate: (action, currentState) => {
    const { auth } = currentState;
    const now = Date.now();
    const tokenExpiry = auth.tokenExpiry;
    
    // Refresh token if it expires in the next 2 minutes and user is authenticated
    return auth.isAuthenticated && 
           tokenExpiry && 
           (now >= tokenExpiry - 120000) && 
           !auth.isRefreshing;
  },
  effect: async (action, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { refreshToken } = getState().auth;
    
    if (!refreshToken) {
      dispatch(logout());
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        dispatch(refreshTokenSuccess({
          token: data.token,
          expiresIn: data.expiresIn || 3600,
        }));
      } else {
        dispatch(logout());
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      dispatch(logout());
    }
  },
});

// Handle 401 responses globally
authMiddleware.startListening({
  matcher: apiSlice.endpoints.matchRejected,
  effect: (action, listenerApi) => {
    if (action.payload?.status === 401) {
      listenerApi.dispatch(logout());
    }
  },
});
```

### Complex Caching Strategies
```javascript
// store/api/cacheUtils.js
export const createCacheTagStrategy = (entityType) => ({
  providesTags: (result, error, arg) => {
    if (error) return [];
    
    const tags = [{ type: entityType, id: 'LIST' }];
    
    if (result?.data) {
      if (Array.isArray(result.data)) {
        tags.push(...result.data.map(item => ({ type: entityType, id: item.id })));
      } else if (result.data.id) {
        tags.push({ type: entityType, id: result.data.id });
      }
    }
    
    return tags;
  },
  invalidatesTags: (result, error, arg) => {
    if (error) return [];
    return [{ type: entityType, id: 'LIST' }];
  },
});

// Selective cache invalidation
export const createSelectiveInvalidation = (entityType, dependencies = []) => ({
  invalidatesTags: (result, error, { id, action }) => {
    if (error) return [];
    
    const tags = [{ type: entityType, id }];
    
    // Invalidate dependent entities
    dependencies.forEach(dep => {
      tags.push({ type: dep, id: 'LIST' });
    });
    
    // Special case for delete operations
    if (action === 'delete') {
      tags.push({ type: entityType, id: 'LIST' });
    }
    
    return tags;
  },
});
```

### Advanced RTK Query Patterns
```javascript
// store/api/adminSlice.js - Enhanced admin API with complex caching
import { apiSlice } from './apiSlice';
import { createCacheTagStrategy } from './cacheUtils';

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Dashboard with intelligent caching
    getAdminDashboard: builder.query({
      query: (filters = {}) => ({
        url: '/admin/dashboard/overview',
        params: filters,
      }),
      providesTags: ['AdminDashboard'],
      // Cache for 5 minutes, but allow background refetch
      keepUnusedDataFor: 300,
      refetchOnMountOrArgChange: 60, // Refetch if cache is older than 1 minute
    }),
    
    // Complex approval system with optimistic updates
    approveEntity: builder.mutation({
      query: ({ type, id, data }) => ({
        url: `/admin/approvals/${type}/${id}/approve`,
        method: 'PUT',
        body: data,
      }),
      // Optimistic update
      onQueryStarted: async ({ type, id, data }, { dispatch, queryFulfilled }) => {
        // Update the approvals list optimistically
        const patchResult = dispatch(
          adminApiSlice.util.updateQueryData('getAllApprovals', undefined, (draft) => {
            const approval = draft.data?.find(item => item.id === id && item.type === type);
            if (approval) {
              approval.status = 'approved';
              approval.approvedBy = data.adminId;
              approval.approvalDate = new Date().toISOString();
              approval.approvalNotes = data.notes;
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on failure
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { type, id }) => [
        'Approvals',
        { type: type === 'vendor' ? 'Vendor' : 'Restaurant', id },
        'AdminDashboard', // Update dashboard metrics
      ],
    }),
    
    // Batch operations
    batchApprove: builder.mutation({
      query: ({ approvals }) => ({
        url: '/admin/approvals/batch',
        method: 'PUT',
        body: { approvals },
      }),
      invalidatesTags: ['Approvals', 'AdminDashboard'],
    }),
    
    // Analytics with caching controls
    getAnalytics: builder.query({
      query: ({ period, useCache = true, forceRefresh = false }) => ({
        url: '/admin/analytics/overview',
        params: { period, useCache, forceRefresh },
      }),
      providesTags: (result, error, { period }) => [
        { type: 'Analytics', id: period },
      ],
      // Different cache times based on data sensitivity
      keepUnusedDataFor: (arg) => {
        const cacheTimes = {
          'today': 60,      // 1 minute for today's data
          'week': 300,      // 5 minutes for weekly data
          'month': 900,     // 15 minutes for monthly data
          'year': 3600,     // 1 hour for yearly data
        };
        return cacheTimes[arg.period] || 300;
      },
    }),
    
    // Settings with change tracking
    updateSystemSetting: builder.mutation({
      query: ({ key, value, changeReason, adminId }) => ({
        url: `/admin/settings/key/${key}`,
        method: 'PUT',
        body: { value, changeReason, adminId },
      }),
      // Track changes for audit trail
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          
          // Log the change for audit purposes
          dispatch(adminApiSlice.endpoints.logSystemChange.initiate({
            type: 'setting_update',
            entityId: arg.key,
            changes: {
              oldValue: data.oldValue,
              newValue: arg.value,
              reason: arg.changeReason,
            },
            adminId: arg.adminId,
          }));
        } catch (error) {
          console.error('Setting update failed:', error);
        }
      },
      invalidatesTags: ['Settings', 'AdminDashboard'],
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useApproveEntityMutation,
  useBatchApproveMutation,
  useGetAnalyticsQuery,
  useUpdateSystemSettingMutation,
} = adminApiSlice;
```

## Performance Optimization Patterns

### Component Optimization
```javascript
// Advanced memoization patterns
import React, { memo, useMemo, useCallback } from 'react';
import { useSelector, shallowEqual } from 'react-redux';

// Memoized selectors for performance
const selectUserData = (state) => ({
  id: state.auth.user?.id,
  name: state.auth.user?.name,
  role: state.auth.user?.role,
});

const selectCartSummary = (state) => ({
  itemCount: state.cart.items.length,
  totalPrice: state.cart.totalPrice,
});

// Optimized component with selective re-rendering
export const Header = memo(({ onMenuToggle, onLogout }) => {
  // Use shallow equality for better performance
  const user = useSelector(selectUserData, shallowEqual);
  const cartSummary = useSelector(selectCartSummary, shallowEqual);
  
  // Memoize handlers to prevent unnecessary re-renders
  const handleLogout = useCallback(() => {
    if (window.confirm('Are you sure you want to log out?')) {
      onLogout();
    }
  }, [onLogout]);
  
  const userInitial = useMemo(() => 
    user.name?.charAt(0)?.toUpperCase() || 'U',
    [user.name]
  );
  
  return (
    <header className="header-class">
      {/* Header content */}
    </header>
  );
});

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';

export const VirtualizedProductList = ({ products, onItemClick }) => {
  const ItemRenderer = useCallback(({ index, style }) => {
    const product = products[index];
    
    return (
      <div style={style} className="p-4 border-b">
        <ProductCard 
          product={product} 
          onClick={() => onItemClick(product)}
        />
      </div>
    );
  }, [products, onItemClick]);
  
  return (
    <List
      height={600}
      itemCount={products.length}
      itemSize={200}
      itemData={products}
    >
      {ItemRenderer}
    </List>
  );
};
```

### Data Fetching Optimization
```javascript
// Custom hooks for optimized data fetching
import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@reduxjs/toolkit/query/react';

// Infinite scroll with RTK Query
export const useInfiniteListings = (filters = {}) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['listings', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      fetch(`/api/v1/listings?page=${pageParam}&${new URLSearchParams(filters)}`)
        .then(res => res.json()),
    getNextPageParam: (lastPage) => {
      const { currentPage, totalPages } = lastPage.pagination;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Flatten pages into single array
  const listings = useMemo(() => 
    data?.pages?.flatMap(page => page.data.listings) || [],
    [data]
  );
  
  return {
    listings,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  };
};

// Intersection Observer for auto-loading
export const useIntersectionObserver = (callback, options = {}) => {
  const targetRef = useRef();
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
      }
    }, {
      rootMargin: '100px',
      threshold: 0.1,
      ...options,
    });
    
    observer.observe(target);
    
    return () => observer.disconnect();
  }, [callback, options]);
  
  return targetRef;
};

// Combined infinite scroll component
export const InfiniteListings = ({ filters }) => {
  const {
    listings,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteListings(filters);
  
  const loadMoreRef = useIntersectionObserver(
    useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  );
  
  if (isLoading) return <LoadingGrid />;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map(listing => (
        <ProductCard key={listing.id} product={listing} />
      ))}
      
      {hasNextPage && (
        <div ref={loadMoreRef} className="col-span-full text-center py-8">
          {isFetchingNextPage ? <LoadingSpinner /> : 'Load more...'}
        </div>
      )}
    </div>
  );
};
```

## Real-time Features

### WebSocket Integration
```javascript
// services/websocketService.js - Enhanced real-time service
class WebSocketService {
  constructor() {
    this.socket = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.heartbeatInterval = null;
    this.messageQueue = [];
  }

  connect(token) {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    this.socket = new WebSocket(`${wsUrl}?token=${token}`);

    this.socket.onopen = this.handleOpen.bind(this);
    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onclose = this.handleClose.bind(this);
    this.socket.onerror = this.handleError.bind(this);
  }

  handleOpen() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.flushMessageQueue();
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.notifySubscribers(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  handleClose() {
    console.log('WebSocket disconnected');
    this.stopHeartbeat();
    this.attemptReconnect();
  }

  handleError(error) {
    console.error('WebSocket error:', error);
  }

  // Subscribe to specific events
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(eventType)?.delete(callback);
    };
  }

  notifySubscribers(message) {
    const { type, data } = message;
    const callbacks = this.subscribers.get(type);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket callback:', error);
        }
      });
    }
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat', timestamp: Date.now() });
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        const token = store.getState().auth.token;
        if (token) {
          this.connect(token);
        }
      }, delay);
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.subscribers.clear();
    this.messageQueue = [];
  }
}

export default new WebSocketService();
```

### Real-time Hooks
```javascript
// hooks/useRealtime.js
import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import websocketService from '../services/websocketService';
import { apiSlice } from '../store/api/apiSlice';

// Real-time order updates
export const useOrderUpdates = (userId) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = websocketService.subscribe('order:updated', (orderData) => {
      // Update RTK Query cache
      dispatch(
        apiSlice.util.updateQueryData('getOrders', undefined, (draft) => {
          const index = draft.data?.orders?.findIndex(order => order.id === orderData.id);
          if (index !== -1) {
            draft.data.orders[index] = { ...draft.data.orders[index], ...orderData };
          }
        })
      );
    });

    // Subscribe to user-specific order events
    websocketService.send({
      type: 'subscribe',
      channel: `orders:user:${userId}`,
    });

    return unsubscribe;
  }, [userId, dispatch]);
};

// Real-time approval notifications
export const useApprovalNotifications = () => {
  const dispatch = useDispatch();

  const handleApprovalUpdate = useCallback((approvalData) => {
    // Update approvals cache
    dispatch(
      apiSlice.util.updateQueryData('getAllApprovals', undefined, (draft) => {
        const index = draft.data?.findIndex(approval => approval.id === approvalData.id);
        if (index !== -1) {
          draft.data[index] = { ...draft.data[index], ...approvalData };
        }
      })
    );

    // Show notification
    dispatch(addNotification({
      type: approvalData.status === 'approved' ? 'success' : 'warning',
      message: `${approvalData.type} ${approvalData.status}`,
      timestamp: Date.now(),
    }));
  }, [dispatch]);

  useEffect(() => {
    return websocketService.subscribe('approval:updated', handleApprovalUpdate);
  }, [handleApprovalUpdate]);
};

// Generic real-time cache invalidation
export const useRealtimeInvalidation = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const handlers = {
      'cache:invalidate': ({ tags }) => {
        tags.forEach(tag => {
          dispatch(apiSlice.util.invalidateTags([tag]));
        });
      },
      'data:updated': ({ entity, id }) => {
        dispatch(apiSlice.util.invalidateTags([{ type: entity, id }]));
      },
    };

    const unsubscribers = Object.entries(handlers).map(([event, handler]) =>
      websocketService.subscribe(event, handler)
    );

    return () => unsubscribers.forEach(unsub => unsub());
  }, [dispatch]);
};
```

## Advanced Error Handling

### Error Boundary with Recovery
```javascript
// components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // Integration with error monitoring service
    console.error('Error logged:', { error, errorInfo });
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback) {
        return (
          <Fallback 
            error={this.state.error}
            onRetry={this.handleRetry}
            retryCount={this.state.retryCount}
          />
        );
      }

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 text-tomato-red mb-6">
            <AlertTriangle className="w-full h-full" />
          </div>
          <h2 className="text-2xl font-medium text-text-dark/80 mb-4">
            Something went wrong
          </h2>
          <p className="text-text-muted mb-8 max-w-md leading-relaxed">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
          <div className="flex gap-4">
            <button
              onClick={this.handleRetry}
              className="bg-gradient-secondary text-white px-8 py-3 rounded-2xl font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-earthy-yellow/20 hover:bg-earthy-yellow/30 text-earthy-brown px-6 py-3 rounded-xl font-medium"
            >
              Reload Page
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 max-w-2xl">
              <summary className="cursor-pointer text-sm text-text-muted">
                Error Details (Development)
              </summary>
              <pre className="mt-4 text-left text-xs bg-gray-100 p-4 rounded overflow-auto">
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Advanced Error Handling Hook
```javascript
// hooks/useErrorHandler.js
import { useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/notificationSlice';

export const useAdvancedErrorHandler = () => {
  const dispatch = useDispatch();

  const handleError = useCallback((error, context = {}) => {
    const errorInfo = {
      message: error.message || 'An unexpected error occurred',
      status: error.status,
      code: error.code,
      context,
      timestamp: new Date().toISOString(),
    };

    // Different handling based on error type
    switch (error.status) {
      case 401:
        dispatch(addNotification({
          type: 'error',
          message: 'Session expired. Please log in again.',
          persistent: true,
        }));
        break;
        
      case 403:
        dispatch(addNotification({
          type: 'error',
          message: 'You do not have permission to perform this action.',
        }));
        break;
        
      case 429:
        dispatch(addNotification({
          type: 'warning',
          message: 'Too many requests. Please wait a moment and try again.',
        }));
        break;
        
      case 500:
        dispatch(addNotification({
          type: 'error',
          message: 'Server error. Please try again later.',
        }));
        break;
        
      default:
        dispatch(addNotification({
          type: 'error',
          message: errorInfo.message,
        }));
    }

    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      logErrorToMonitoring(errorInfo);
    }

    return errorInfo;
  }, [dispatch]);

  return { handleError };
};

const logErrorToMonitoring = (errorInfo) => {
  // Integration with monitoring service
  console.error('Error logged to monitoring:', errorInfo);
};
```

## Security Patterns

### Enhanced CSRF Protection
```javascript
// utils/security.js
export class SecurityUtils {
  static getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static validatePhoneNumber(phone) {
    // Enhanced phone validation with country code
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  static checkPasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    
    return {
      score,
      strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
      checks,
    };
  }

  static encryptSensitiveData(data, key) {
    // Simple encryption for client-side temporary storage
    // Note: For production, use proper encryption libraries
    try {
      return btoa(JSON.stringify(data));
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }

  static decryptSensitiveData(encryptedData) {
    try {
      return JSON.parse(atob(encryptedData));
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
}
```

### Content Security Policy Integration
```javascript
// utils/csp.js
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https://res.cloudinary.com'],
  'connect-src': ["'self'", process.env.REACT_APP_API_BASE_URL],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

export const generateCSPHeader = () => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};
```

## Testing Patterns

### Advanced RTK Query Testing
```javascript
// tests/utils/testUtils.js
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { apiSlice } from '../../store/api/apiSlice';

export const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
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

// Mock WebSocket for testing
export const createMockWebSocket = () => {
  const mockWS = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.OPEN,
  };

  global.WebSocket = jest.fn(() => mockWS);
  return mockWS;
};
```

### Integration Test Patterns
```javascript
// tests/integration/approvalFlow.test.js
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { renderWithStore } from '../utils/testUtils';
import ApprovalManagement from '../../components/admin/ApprovalManagement';

const server = setupServer(
  rest.get('/api/v1/admin/approvals', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: [
        {
          id: '1',
          type: 'vendor',
          businessName: 'Test Vendor',
          status: 'pending',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    }));
  }),
  
  rest.put('/api/v1/admin/approvals/vendor/:id/approve', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      message: 'Vendor approved successfully',
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Approval Management Flow', () => {
  it('should approve vendor successfully', async () => {
    const user = userEvent.setup();
    
    renderWithStore(<ApprovalManagement />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
    
    // Click approve button
    const approveButton = screen.getByRole('button', { name: /approve/i });
    await user.click(approveButton);
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/approved successfully/i)).toBeInTheDocument();
    });
  });
});
```

## Deployment Patterns

### Environment Configuration
```javascript
// config/environment.js
const environments = {
  development: {
    API_BASE_URL: 'http://localhost:5000/api/v1',
    WS_URL: 'ws://localhost:5000',
    CLOUDINARY_CLOUD_NAME: 'dev-cloud',
    SENTRY_DSN: null,
    ENABLE_ANALYTICS: false,
  },
  
  staging: {
    API_BASE_URL: 'https://staging-api.aarothfresh.com/api/v1',
    WS_URL: 'wss://staging-api.aarothfresh.com',
    CLOUDINARY_CLOUD_NAME: 'staging-cloud',
    SENTRY_DSN: process.env.REACT_APP_SENTRY_DSN,
    ENABLE_ANALYTICS: true,
  },
  
  production: {
    API_BASE_URL: 'https://api.aarothfresh.com/api/v1',
    WS_URL: 'wss://api.aarothfresh.com',
    CLOUDINARY_CLOUD_NAME: 'production-cloud',
    SENTRY_DSN: process.env.REACT_APP_SENTRY_DSN,
    ENABLE_ANALYTICS: true,
  },
};

export const getEnvironmentConfig = () => {
  const env = process.env.REACT_APP_ENVIRONMENT || 'development';
  return environments[env] || environments.development;
};
```

### Performance Monitoring
```javascript
// utils/monitoring.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export const initializePerformanceMonitoring = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const sendToAnalytics = (metric) => {
    // Send to your analytics service
    console.log('Performance metric:', metric);
  };

  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
};

export const measureComponentPerformance = (componentName) => {
  return (WrappedComponent) => {
    return function MeasuredComponent(props) {
      const startTime = performance.now();
      
      useEffect(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (renderTime > 100) { // Log slow renders
          console.warn(`Slow render detected: ${componentName} took ${renderTime}ms`);
        }
      });
      
      return <WrappedComponent {...props} />;
    };
  };
};
```

## Conclusion

These advanced patterns provide a robust foundation for complex B2B marketplace functionality while maintaining performance, security, and maintainability. Always test thoroughly and adapt patterns to your specific use case.