# Aaroth Fresh Frontend - Claude Code Instructions

This file provides guidance to Claude Code when working with the Aaroth Fresh B2B marketplace frontend.

## Project Overview

React TypeScript frontend for Aaroth Fresh B2B marketplace - connecting local vegetable vendors with restaurants. Built with modern stack focusing on mobile-first design and performance.

## Technology Stack

- **Core**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (mobile-first approach)
- **State Management**: Zustand (global state) + TanStack Query (server state)
- **Routing**: React Router v6 with role-based protection
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Vite with PWA plugin
- **Testing**: Vitest + React Testing Library

## Development Commands

- **Start development server**: `npm run dev` (Vite dev server with HMR)
- **Build for production**: `npm run build` (TypeScript check + Vite build)
- **Preview production build**: `npm run preview`
- **Run tests**: `npm run test` (Vitest)
- **Run tests with coverage**: `npm run test:coverage`
- **Lint code**: `npm run lint` (ESLint)
- **Format code**: `npm run format` (Prettier)
- **Type check**: `npm run type-check` (TypeScript compiler)

## Backend Integration

### API Configuration
- **Backend Base URL**: `http://localhost:5000/api/v1` (development)
- **Production URL**: To be configured in environment variables
- **Authentication**: JWT tokens with phone-based login (NOT email-based)
- **Content Type**: JSON for all API requests
- **CORS**: Configured in backend for frontend domains

### Authentication Flow
- **Login Method**: Phone number + password (not email)
- **Phone Format**: Must include country code (e.g., `+8801234567890`)
- **Token Storage**: localStorage for persistence, memory for active session
- **Token Refresh**: Automatic refresh on 401 responses
- **Role-based Access**: Routes and features based on user role

### User Roles & Permissions
- **admin**: Full system access, manage users/products/categories
- **vendor**: Create/manage listings, process orders, view analytics
- **restaurantOwner**: Browse products, place orders, manage restaurant
- **restaurantManager**: Same as restaurantOwner but with limited admin rights

## Key Backend API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /login` - Phone-based login
- `POST /register` - Multi-role registration
- `POST /refresh` - Token refresh
- `POST /logout` - Logout and token invalidation
- `GET /me` - Get current user profile

### Admin Routes (`/api/v1/admin`)
- `GET /users` - List all users with pagination
- `PUT /users/:id/approve` - Approve vendor accounts
- `GET /analytics` - System analytics and metrics
- Product and category management endpoints

### Listings (`/api/v1/listings`)
- `GET /` - Browse listings with search/filter
- `POST /` - Create new listing (vendor only)
- `PUT /:id` - Update listing (vendor only)
- `DELETE /:id` - Delete listing (vendor only)

### Orders (`/api/v1/orders`)
- `GET /` - List orders (role-based filtering)
- `POST /` - Create new order (restaurant only)
- `PUT /:id/status` - Update order status
- `GET /:id` - Get order details

### Public Routes (`/api/v1/public`)
- `GET /categories` - Product categories
- `GET /featured-products` - Featured products for homepage

## Project Architecture

### Folder Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, Modal)
│   ├── forms/          # Form-specific components
│   ├── layout/         # Layout components (Header, Sidebar, Navigation)
│   └── common/         # Common components (LoadingSpinner, ErrorBoundary)
├── pages/              # Route-based page components
│   ├── auth/           # Login, Register, ForgotPassword
│   ├── admin/          # Admin dashboard and features
│   ├── vendor/         # Vendor dashboard and features
│   ├── restaurant/     # Restaurant dashboard and features
│   └── public/         # Public pages (Home, About)
├── hooks/              # Custom React hooks
├── stores/             # Zustand stores
│   ├── authStore.ts    # Authentication state
│   ├── cartStore.ts    # Shopping cart state
│   ├── notificationStore.ts # Notifications
│   └── themeStore.ts   # Theme (dark/light mode)
├── services/           # API service functions
│   ├── api.ts          # Axios configuration
│   ├── auth.service.ts # Authentication API calls
│   ├── listings.service.ts # Listings API calls
│   └── orders.service.ts # Orders API calls
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── constants/          # App constants and configuration
└── styles/             # Global styles and Tailwind config
```

### State Management Strategy
- **Zustand**: For global app state (auth, cart, notifications, theme)
- **TanStack Query**: For server state management and caching
- **Local State**: React useState for component-specific state
- **Form State**: React Hook Form for form management

## Development Guidelines

### Code Style & Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Airbnb configuration with React hooks
- **Prettier**: Consistent code formatting
- **File Naming**: kebab-case for files, PascalCase for components
- **Import Order**: External packages → internal modules → relative imports

### Component Development
- **Mobile-First**: Always design for mobile, then scale up
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Lazy loading, code splitting, image optimization
- **Reusability**: Create composable, reusable components
- **Testing**: Unit tests for utilities, integration tests for components

### API Integration Best Practices
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Show loading indicators for all async operations
- **Caching**: Use TanStack Query for smart caching and background updates
- **Optimistic Updates**: For better user experience
- **Retry Logic**: Automatic retry for failed requests

## Mobile-First Design Principles

### Responsive Breakpoints (Tailwind CSS)
- **sm**: 640px (small tablets)
- **md**: 768px (tablets)
- **lg**: 1024px (laptops)
- **xl**: 1280px (desktops)
- **2xl**: 1536px (large desktops)

### Touch-Friendly Design
- **Minimum touch targets**: 44px × 44px
- **Swipe gestures**: For navigation and actions
- **Pull-to-refresh**: On list views
- **Bottom navigation**: For mobile users

## Performance Optimization

### Bundle Optimization
- **Code Splitting**: Route-based and component-based
- **Tree Shaking**: Remove unused code
- **Dynamic Imports**: Lazy load heavy components
- **Bundle Analysis**: Regular analysis of bundle size

### Runtime Performance
- **React.memo**: For expensive components
- **useMemo/useCallback**: For expensive calculations
- **Virtual Scrolling**: For long lists
- **Image Optimization**: WebP format, lazy loading, responsive images

## Security Considerations

### Authentication Security
- **JWT Storage**: Secure storage with httpOnly cookies (if possible)
- **Token Expiration**: Short-lived access tokens with refresh mechanism
- **Route Protection**: Client-side and server-side validation
- **Role Validation**: Verify user permissions on each protected action

### Data Security
- **Input Validation**: Client-side and server-side validation
- **XSS Prevention**: Sanitize user inputs
- **API Security**: Validate all API responses
- **Environment Variables**: Secure handling of sensitive configuration

## Testing Strategy

### Unit Tests
- **Components**: Test component behavior and props
- **Hooks**: Test custom hooks in isolation
- **Utilities**: Test utility functions thoroughly
- **Stores**: Test Zustand store actions and state changes

### Integration Tests
- **User Flows**: Test complete user workflows
- **API Integration**: Test API service functions
- **Form Validation**: Test form submission and validation
- **Error Handling**: Test error scenarios and recovery

## Deployment & Build

### Build Configuration
- **Environment Variables**: Different configs for dev/staging/production
- **Asset Optimization**: Minification, compression, caching headers
- **PWA Features**: Service worker, offline support, app manifest
- **Bundle Analysis**: Monitor bundle size and dependencies

### Production Checklist
- [ ] Environment variables configured
- [ ] API endpoints pointing to production
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics configured (if required)
- [ ] Performance monitoring enabled
- [ ] Security headers configured
- [ ] HTTPS enabled
- [ ] Domain and CORS configured

## Common Development Patterns

### API Service Pattern
```typescript
// services/listings.service.ts
export const listingsService = {
  getAll: (params?: ListingFilters) => api.get('/listings', { params }),
  getById: (id: string) => api.get(`/listings/${id}`),
  create: (data: CreateListingRequest) => api.post('/listings', data),
  update: (id: string, data: UpdateListingRequest) => api.put(`/listings/${id}`, data),
  delete: (id: string) => api.delete(`/listings/${id}`)
};
```

### TanStack Query Hook Pattern
```typescript
// hooks/useListings.ts
export const useListings = (filters?: ListingFilters) => {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => listingsService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### Protected Route Pattern
```typescript
// components/ProtectedRoute.tsx
export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/unauthorized" />;
  
  return <>{children}</>;
};
```

## Error Handling Standards

### Global Error Handling
- **Error Boundary**: Catch and handle React errors
- **API Error Interceptor**: Handle HTTP errors globally
- **Toast Notifications**: User-friendly error messages
- **Error Logging**: Log errors for debugging (development/staging)

### User Experience
- **Graceful Degradation**: App remains functional during errors
- **Clear Error Messages**: Actionable error messages for users
- **Retry Mechanisms**: Allow users to retry failed operations
- **Offline Support**: Handle offline scenarios gracefully

## Important Notes for Claude Code

### Authentication Context
- **CRITICAL**: This app uses PHONE-based authentication, not email
- **Phone Format**: Always include country code validation
- **Backend Compatibility**: Ensure frontend auth matches backend exactly
- **Role System**: Four distinct roles with different permissions

### Mobile Priority
- **Mobile-First**: Always prioritize mobile user experience
- **Touch Optimization**: All interactions must be touch-friendly
- **Performance**: Mobile users have slower connections and less powerful devices
- **Offline Support**: Consider offline functionality for critical features

### Development Workflow
- **Use TodoWrite**: For complex multi-step tasks
- **Follow Architecture**: Adhere to the folder structure and patterns
- **Test Early**: Write tests alongside feature development
- **Performance First**: Consider performance implications of every decision

### Backend Integration
- **API Consistency**: Match backend data structures exactly
- **Error Handling**: Handle backend errors gracefully
- **Loading States**: Provide feedback for all async operations
- **Caching Strategy**: Use TanStack Query for efficient data management