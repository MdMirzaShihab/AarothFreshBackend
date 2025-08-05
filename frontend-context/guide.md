# Aaroth Fresh Frontend Development Guide - Step by Step

This guide provides exact prompts and workflow to build the complete Aaroth Fresh frontend using Claude Code efficiently.

## Prerequisites

1. **Copy context files** to your new frontend project directory:
   - `CLAUDE.md`
   - `api-integration.md` 
   - `guide.md` (this file)

2. **Backend running** at `http://localhost:5000`

3. **Claude Code** installed and ready

## Phase 1: Project Setup & Foundation (Days 1-2)

### Step 1.1: Initial Project Setup

**Prompt to use with Claude Code:**
```
Create a new Aaroth Fresh B2B marketplace frontend project. Use React 18 + TypeScript + Vite with the following requirements:

1. Initialize project with Vite template (react-ts)
2. Install core dependencies: Tailwind CSS, React Router v6, Zustand, TanStack Query, React Hook Form, Zod, Axios, Framer Motion
3. Configure Tailwind CSS with mobile-first approach
4. Set up ESLint + Prettier with Airbnb config
5. Create the complete folder structure following the architecture plan
6. Configure Vite with development settings and environment variables
7. Set up TypeScript with strict mode and path mapping

Follow the CLAUDE.md and api-integration.md files for exact specifications. Use TodoWrite to track all setup tasks.
```

**Expected Outcome:** Complete project setup with all dependencies and configuration files.

### Step 1.2: Core Infrastructure Setup

**Prompt to use with Claude Code:**
```
Set up the core infrastructure for Aaroth Fresh frontend based on CLAUDE.md specifications:

1. Configure Axios base API client with interceptors for the backend at http://localhost:5000/api/v1
2. Set up TanStack Query with proper cache configuration
3. Create TypeScript interfaces matching the backend models (User, Product, Listing, Order) from api-integration.md
4. Initialize Zustand stores: authStore, cartStore, notificationStore, themeStore
5. Create utility functions for token management and phone number validation
6. Set up error handling patterns and toast notifications
7. Configure environment variables for development and production

This is phone-based authentication (not email). Use TodoWrite to track progress.
```

**Expected Outcome:** Complete API integration layer and state management setup.

## Phase 2: Authentication & Layout (Days 3-4)

### Step 2.1: Authentication System

**Prompt to use with Claude Code:**
```
Implement the complete authentication system for Aaroth Fresh following the phone-based authentication from api-integration.md:

1. Create authentication service functions (login, register, logout, token refresh)
2. Build LoginForm and RegisterForm components using React Hook Form + Zod
3. Implement phone number validation (must include country code like +8801234567890)
4. Create role-based registration flow for: admin, vendor, restaurantOwner, restaurantManager
5. Set up protected route wrapper with role-based access control
6. Implement automatic token refresh and logout on token expiration
7. Create authentication layouts (AuthLayout for login/register pages)

CRITICAL: Use phone numbers, NOT emails. Follow the exact API endpoints from api-integration.md. Use TodoWrite for task tracking.
```

**Expected Outcome:** Complete working authentication system with phone-based login.

### Step 2.2: Core Layout Components

**Prompt to use with Claude Code:**
```
Build the core layout system for Aaroth Fresh following mobile-first design from CLAUDE.md:

1. Create AppLayout with role-based sidebar navigation
2. Build responsive Header with user menu, notifications, and logout
3. Implement MobileNavigation with bottom tabs for mobile users
4. Create Sidebar component with collapsible menu and role-based filtering
5. Build responsive navigation system with proper breakpoints
6. Add theme toggle functionality (dark/light mode) using themeStore
7. Implement breadcrumb navigation for better UX

Focus on mobile-first approach with touch-friendly interactions. Use TodoWrite to track component creation.
```

**Expected Outcome:** Complete responsive layout system working on all device sizes.

## Phase 3: UI Component Library (Day 5)

### Step 3.1: Base UI Components

**Prompt to use with Claude Code:**
```
Create a comprehensive UI component library for Aaroth Fresh using Tailwind CSS:

1. Build base components: Button (primary, secondary, outline, ghost variants), Input (with validation states), Modal, Card, LoadingSpinner
2. Create form components: FormField wrapper, ErrorMessage, FileUpload with drag-and-drop support
3. Implement data display components: Table, Pagination, EmptyState, SearchBar
4. Build feedback components: Toast notifications, ConfirmDialog, AlertBanner
5. Create navigation components: Tabs, Dropdown, Breadcrumb
6. Add loading and skeleton states for all components
7. Implement accessibility features (ARIA labels, keyboard navigation)

All components should be mobile-responsive and follow the design system. Use TodoWrite for tracking.
```

**Expected Outcome:** Complete reusable UI component library ready for feature development.

## Phase 4: Admin Features (Days 6-7)

### Step 4.1: Admin Dashboard

**Prompt to use with Claude Code:**
```
Build the admin dashboard and user management features for Aaroth Fresh:

1. Create AdminDashboard with metrics cards (total users, vendors, restaurants, orders)
2. Build UserManagement page with user list, search, filtering, and pagination
3. Implement vendor approval workflow with approve/reject actions
4. Create ProductManagement for CRUD operations on products and categories
5. Build analytics dashboard with charts and KPIs
6. Add bulk operations for user management
7. Implement admin-specific navigation and permissions

Use TanStack Query for data fetching and caching. Follow the admin API endpoints from api-integration.md. Use TodoWrite for task tracking.
```

**Expected Outcome:** Complete admin panel with user management and analytics.

### Step 4.2: Product & Category Management

**Prompt to use with Claude Code:**
```
Implement product and category management features for admins:

1. Create ProductList with search, filtering, and sorting capabilities
2. Build CreateProduct and EditProduct forms with image upload
3. Implement CategoryManagement with CRUD operations
4. Add bulk product operations (enable/disable, bulk edit)
5. Create product approval workflow if needed
6. Implement image management with Cloudinary integration
7. Add product analytics and performance metrics

Focus on efficient data management and user experience. Use TodoWrite to track progress.
```

**Expected Outcome:** Complete product and category management system.

## Phase 5: Vendor Features (Days 8-9)

### Step 5.1: Vendor Dashboard & Listings

**Prompt to use with Claude Code:**
```
Build the vendor dashboard and listing management system:

1. Create VendorDashboard with performance metrics, recent orders, and quick actions
2. Build ListingManagement page with CRUD operations for product listings
3. Implement CreateListing and EditListing forms with pricing, inventory, and images
4. Add listing status management (available/unavailable, quantity updates)
5. Create bulk listing operations and inventory management
6. Build vendor analytics (sales, popular products, order trends)
7. Implement notification system for new orders and low inventory

Use the listings API endpoints from api-integration.md. Ensure mobile optimization. Use TodoWrite for tracking.
```

**Expected Outcome:** Complete vendor dashboard with listing management capabilities.

### Step 5.2: Vendor Order Management

**Prompt to use with Claude Code:**
```
Implement order processing features for vendors:

1. Create OrderManagement page with incoming orders and order history
2. Build order detail view with item breakdown and customer information
3. Implement order status updates (pending, confirmed, prepared, delivered)
4. Add order filtering and search capabilities
5. Create order analytics and reporting
6. Implement real-time order notifications
7. Build order fulfillment workflow with status tracking

Follow the orders API from api-integration.md. Focus on efficient order processing UX. Use TodoWrite for progress tracking.
```

**Expected Outcome:** Complete vendor order management system.

## Phase 6: Restaurant Features (Days 10-11)

### Step 6.1: Product Browsing & Shopping

**Prompt to use with Claude Code:**
```
Build the product browsing and shopping experience for restaurants:

1. Create ProductBrowse page with grid/list views, search, and advanced filtering
2. Implement category navigation and product search with debouncing
3. Build ProductDetail page with images, pricing, vendor info, and reviews
4. Create shopping cart functionality with add/remove items and quantity management
5. Implement bulk ordering capabilities for restaurant needs
6. Add product comparison and favorites features
7. Build responsive design optimized for mobile browsing

Use the listings API endpoints and focus on intuitive shopping experience. Use TodoWrite for task tracking.
```

**Expected Outcome:** Complete product browsing and shopping cart system.

### Step 6.2: Order Placement & Management

**Prompt to use with Claude Code:**
```
Implement order placement and management for restaurants:

1. Create checkout flow with order summary, delivery address, and payment info
2. Build OrderHistory page with order tracking and status updates
3. Implement order approval workflow (if enabled for restaurant)
4. Add reorder functionality for frequently ordered items
5. Create order analytics and spending reports
6. Build delivery tracking and order status notifications
7. Implement bulk reordering and scheduled ordering features

Follow the orders API from api-integration.md. Focus on restaurant business needs. Use TodoWrite for progress.
```

**Expected Outcome:** Complete restaurant ordering system with order management.

## Phase 7: Advanced Features (Days 12-13)

### Step 7.1: Real-time Features & Notifications

**Prompt to use with Claude Code:**
```
Implement real-time features and comprehensive notification system:

1. Set up WebSocket connection for real-time updates
2. Implement real-time order status updates and notifications
3. Build in-app notification center with read/unread states
4. Add push notifications for critical events (new orders, status changes)
5. Create notification preferences and settings
6. Implement real-time inventory updates
7. Add live chat or messaging system between vendors and restaurants

Focus on performance and user experience. Use TodoWrite to track implementation.
```

**Expected Outcome:** Real-time communication and notification system.

### Step 7.2: PWA & Offline Support

**Prompt to use with Claude Code:**
```
Convert the application to a Progressive Web App with offline capabilities:

1. Configure service worker with Vite PWA plugin
2. Create web app manifest with proper icons and settings
3. Implement offline functionality for critical features
4. Add cache strategies for API responses and static assets
5. Build offline indicators and sync mechanisms
6. Implement push notification support
7. Add install prompts and app-like experience

Focus on mobile experience and performance optimization. Use TodoWrite for tracking.
```

**Expected Outcome:** Full PWA with offline capabilities.

## Phase 8: Performance & Testing (Days 14-15)

### Step 8.1: Performance Optimization

**Prompt to use with Claude Code:**
```
Optimize the application for maximum performance:

1. Implement code splitting and lazy loading for routes and components
2. Optimize images with lazy loading, WebP format, and responsive sizes
3. Add virtual scrolling for long lists and tables
4. Implement bundle analysis and tree shaking optimization
5. Add performance monitoring and metrics
6. Optimize API calls with proper caching and request batching
7. Implement skeleton loading states and smooth animations

Use Vite build tools and React performance best practices. Use TodoWrite for optimization tasks.
```

**Expected Outcome:** Highly optimized application with fast loading times.

### Step 8.2: Testing & Quality Assurance

**Prompt to use with Claude Code:**
```
Implement comprehensive testing strategy:

1. Set up Vitest and React Testing Library
2. Write unit tests for utility functions and custom hooks
3. Create component tests for UI components
4. Implement integration tests for user flows
5. Add API integration tests with mock server
6. Create end-to-end tests for critical user journeys
7. Set up test coverage reporting and quality gates

Focus on testing critical functionality and user workflows. Use TodoWrite for test implementation.
```

**Expected Outcome:** Comprehensive test suite with good coverage.

## Phase 9: Final Polish & Deployment (Day 16)

### Step 9.1: Final Polish & Bug Fixes

**Prompt to use with Claude Code:**
```
Perform final quality assurance and polish:

1. Conduct thorough cross-browser testing
2. Test responsive design on all device sizes
3. Verify accessibility compliance (WCAG 2.1 AA)
4. Fix any remaining bugs and UI inconsistencies
5. Optimize for different network conditions
6. Add proper error boundaries and fallback UI
7. Implement analytics and monitoring setup

Use TodoWrite to track final QA tasks and bug fixes.
```

**Expected Outcome:** Production-ready application with all issues resolved.

### Step 9.2: Deployment Preparation

**Prompt to use with Claude Code:**
```
Prepare the application for production deployment:

1. Configure production environment variables
2. Set up build optimization and minification
3. Configure proper HTTPS and security headers
4. Set up monitoring and error tracking (Sentry)
5. Create deployment scripts and CI/CD pipeline
6. Configure domain and SSL certificates
7. Perform final security audit and performance testing

Follow deployment best practices for React applications. Use TodoWrite for deployment tasks.
```

**Expected Outcome:** Application ready for production deployment.

## Development Best Practices

### Using Claude Code Efficiently

1. **Always use TodoWrite** for multi-step tasks
2. **Reference context files** in every prompt (CLAUDE.md, api-integration.md)
3. **Be specific** about phone-based authentication and backend integration
4. **Emphasize mobile-first** approach in all prompts
5. **Break complex features** into smaller, manageable tasks
6. **Test incrementally** as you build each feature

### Session Management Strategy

#### Long Development Sessions
```
I'm building the Aaroth Fresh frontend following the guide.md step-by-step. Currently working on [Phase X: Feature Name]. The project uses React + TypeScript + Vite with phone-based authentication and role-based access for admin, vendor, restaurantOwner, and restaurantManager. Continue with the next steps in the development plan using TodoWrite for task tracking.
```

#### Feature-Specific Sessions
```
Implement [specific feature] for Aaroth Fresh B2B marketplace. This is a React TypeScript project with Zustand + TanStack Query, connecting to Express.js backend. Follow the specifications in CLAUDE.md and api-integration.md. Focus on mobile-first responsive design and phone-based authentication. Use TodoWrite to track implementation steps.
```

### Quality Checkpoints

After each phase, verify:
- [ ] Mobile responsiveness works perfectly
- [ ] Authentication flows work with phone numbers
- [ ] Role-based access control functions correctly
- [ ] API integration matches backend exactly
- [ ] Performance is optimized
- [ ] Error handling is comprehensive
- [ ] TypeScript types are accurate
- [ ] Tests cover critical functionality

## Troubleshooting Common Issues

### If Authentication Fails
1. Verify phone number format includes country code
2. Check API endpoints match api-integration.md exactly
3. Ensure JWT token handling is correct
4. Verify CORS configuration on backend

### If Performance Issues Occur
1. Check bundle size and implement code splitting
2. Optimize images and implement lazy loading
3. Review TanStack Query cache configuration
4. Implement virtual scrolling for large lists

### If Mobile Experience is Poor
1. Review touch targets (minimum 44px)
2. Test on real devices, not just browser dev tools
3. Optimize for slow network connections
4. Implement proper loading states

## Success Metrics

By following this guide, you should achieve:
- **Performance**: < 3s initial load time, < 1s page transitions
- **Mobile UX**: Touch-friendly, responsive on all devices
- **Functionality**: All user roles working with complete feature sets
- **Quality**: 90%+ test coverage, accessibility compliant
- **Security**: Secure authentication and data handling
- **Scalability**: Architecture ready for growth and new features

## Final Notes

This guide provides a systematic approach to building the complete Aaroth Fresh frontend. Each prompt is designed to work optimally with Claude Code's capabilities while ensuring high-quality, production-ready code.

Remember to:
- Copy all context files to your frontend project
- Follow the exact prompt structure provided
- Use TodoWrite consistently for task tracking
- Test each phase before moving to the next
- Focus on mobile-first development throughout

The total estimated time is 16 development days, but this can be compressed with focused development sessions using Claude Code's efficiency.