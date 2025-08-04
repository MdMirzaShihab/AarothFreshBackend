# Aaroth Fresh Frontend Architecture Plan

## Project Overview
A B2B web application for approximately 100 restaurants to order fresh vegetables daily from about 100 local vendors. Performance and UX focused, with most users accessing from mobile devices.

**Backend System**: Express.js + MongoDB with JWT authentication
**User Roles**: Admin, Vendor, Restaurant Owner, Restaurant Manager

---

## 1. Technology Stack & Libraries

### Core Framework
- **React 18** with Vite for fast development and build performance
- **TypeScript** for type safety and better development experience
- **React Router v6** for client-side routing and navigation

### UI Framework & Styling
- **Tailwind CSS** for utility-first styling (mobile-first approach)
- **Headless UI** or **Radix UI** for accessible unstyled components
- **React Hook Form** with **Zod** for form handling and validation
- **Framer Motion** for smooth animations and transitions
- **Lucide React** for consistent iconography

### State Management
- **Zustand** for lightweight global state management
- **TanStack Query (React Query)** for server state management and caching
- **Context API** for theme and authentication state

### Mobile & UX Libraries
- **React Responsive** for responsive design utilities
- **React Hot Toast** for user notifications
- **React Helmet Async** for SEO and document head management
- **Date-fns** for date manipulation and formatting
- **React Intersection Observer** for lazy loading

### Development Tools
- **ESLint** + **Prettier** for code quality and formatting
- **Husky** + **lint-staged** for git hooks
- **Vite PWA Plugin** for progressive web app features
- **Storybook** for component documentation (optional)

---

## 2. Project Structure

```
aaroth-fresh-frontend/
├── public/
│   ├── icons/
│   ├── images/
│   └── manifest.json
├── src/
│   ├── assets/              # Static assets (images, fonts)
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Basic UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   ├── forms/          # Form components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ListingForm.tsx
│   │   │   └── OrderForm.tsx
│   │   ├── layout/         # Layout components
│   │   │   ├── AppLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MobileNavigation.tsx
│   │   ├── charts/         # Analytics components
│   │   │   ├── OrderChart.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   └── MetricsCard.tsx
│   │   └── features/       # Feature-specific components
│   │       ├── products/
│   │       ├── listings/
│   │       ├── orders/
│   │       └── analytics/
│   ├── pages/              # Page components by role
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── ForgotPassword.tsx
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProductManagement.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── Analytics.tsx
│   │   ├── vendor/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Listings.tsx
│   │   │   ├── Orders.tsx
│   │   │   └── Profile.tsx
│   │   ├── restaurant/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Browse.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── Orders.tsx
│   │   │   └── Analytics.tsx
│   │   └── public/
│   │       ├── Home.tsx
│   │       └── About.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useCart.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   ├── services/           # API service layer
│   │   ├── api.ts          # Base API configuration
│   │   ├── auth.ts         # Authentication endpoints
│   │   ├── products.ts     # Products and categories
│   │   ├── listings.ts     # Vendor listings
│   │   ├── orders.ts       # Order management
│   │   └── admin.ts        # Admin operations
│   ├── stores/             # Zustand stores
│   │   ├── authStore.ts
│   │   ├── cartStore.ts
│   │   ├── notificationStore.ts
│   │   └── themeStore.ts
│   ├── types/              # TypeScript definitions
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── product.ts
│   │   ├── order.ts
│   │   └── user.ts
│   ├── utils/              # Utility functions
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 3. User Experience & Interface Design

### Mobile-First Approach
- **Progressive Web App** capabilities for mobile installation
- **Touch-friendly** interface with minimum 44px touch targets
- **Responsive design** that works seamlessly across all device sizes
- **Fast loading** with code splitting and lazy loading strategies
- **Offline support** for critical functions using service workers

### Role-Based Navigation
- **Dynamic sidebar/navigation** that adapts based on user role
- **Role-specific dashboards** with relevant metrics and quick actions
- **Breadcrumb navigation** for complex nested pages
- **Quick actions toolbar** for frequently used features

### Key UX Features
- **Real-time notifications** for order updates and system alerts
- **Intuitive forms** with inline validation and helpful error messages
- **Advanced search and filtering** with debounced inputs and faceted search
- **Image galleries** with zoom functionality and lazy loading
- **Drag-and-drop** file uploads with progress indicators
- **Dark/light mode** toggle for user preference

---

## 4. Component Architecture

### UI Component Library (components/ui/)
```typescript
// Button Component Example
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

### Layout Components
- **AppLayout** - Main application wrapper with role-based sidebar
- **AuthLayout** - Centered layout for authentication pages
- **DashboardLayout** - Grid-based layout for dashboard pages
- **MobileNavigation** - Bottom tab navigation for mobile devices

### Feature-Specific Components
- **ProductListing** - Grid/list view of products with filtering
- **OrderManagement** - Order creation, tracking, and approval workflows
- **Analytics Dashboard** - Interactive charts and metrics visualization
- **ImageUpload** - Drag-and-drop image upload with preview and cropping
- **SearchFilters** - Advanced filtering panel with multiple criteria

### Form Components
- **LoginForm** - Phone-based authentication
- **RegisterForm** - Multi-step registration for different user types
- **ProductForm** - Admin product creation/editing with categories
- **ListingForm** - Vendor listing creation with pricing and images
- **OrderForm** - Restaurant order placement with cart functionality

---

## 5. State Management Strategy

### Global State (Zustand Stores)

```typescript
// authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileData) => Promise<void>;
}

// cartStore.ts
interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}
```

### Server State (TanStack Query)
- **Automatic caching** with configurable cache times
- **Background refetching** for real-time data updates
- **Optimistic updates** for immediate UI feedback
- **Error handling** with retry logic and error boundaries
- **Pagination** and infinite scroll support

---

## 6. API Integration Layer

### Service Architecture
```typescript
// services/api.ts - Base configuration
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### API Services
- **auth.ts** - Login, register, profile management
- **products.ts** - Product and category CRUD operations
- **listings.ts** - Vendor listing management
- **orders.ts** - Order placement, tracking, approval
- **admin.ts** - Admin dashboard and user management

---

## 7. Key User Flows Implementation

### Vendor Flow: Creating Product Listings
1. **Dashboard** → View performance metrics and quick actions
2. **Create Listing** → Select from available products
3. **Set Categories & Pricing** → Configure pricing tiers and quality grades
4. **Upload Images** → Drag-and-drop with preview and editing
5. **Set Availability** → Quantity, harvest dates, delivery options
6. **Publish** → Make listing live with immediate feedback

### Restaurant Flow: Ordering with Approval System
1. **Browse Listings** → Search, filter, and discover products
2. **Add to Cart** → Bulk selection with quantity controls
3. **Review Order** → Edit quantities, add special instructions
4. **Submit Order** → Choose delivery method and preferred time
5. **Await Approval** → Real-time status updates (if approval enabled)
6. **Track Order** → Live updates from confirmation to delivery

### Admin Flow: Product & User Management
1. **Admin Dashboard** → System overview and key metrics
2. **Product Management** → Create/edit products and categories
3. **User Management** → Approve vendors, manage restaurant accounts
4. **Analytics** → Platform performance and business insights

---

## 8. Performance Optimizations

### Code Splitting & Lazy Loading
```typescript
// Route-based code splitting
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const VendorDashboard = lazy(() => import('./pages/vendor/Dashboard'));

// Component-based lazy loading
const HeavyChart = lazy(() => import('./components/charts/HeavyChart'));
```

### Image Optimization
- **Lazy loading** with intersection observer
- **Progressive image loading** with blur-to-sharp effect
- **WebP format** with fallbacks for older browsers
- **Responsive images** with srcset for different screen sizes

### Bundle Optimization
- **Tree shaking** to eliminate unused code
- **Dynamic imports** for feature-based splitting
- **Vendor chunks** for better caching
- **Compression** with gzip/brotli

### Caching Strategy
- **React Query** for API response caching
- **Service Worker** for offline asset caching
- **Local Storage** for user preferences
- **Session Storage** for temporary form data

---

## 9. Mobile-Specific Features

### Progressive Web App (PWA)
```json
// manifest.json
{
  "name": "Aaroth Fresh",
  "short_name": "Aaroth",
  "description": "B2B Fresh Vegetable Marketplace",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### Mobile Navigation
- **Bottom tab navigation** for primary actions
- **Swipe gestures** for image galleries and carousels
- **Pull-to-refresh** for data updates
- **Touch feedback** with haptic responses (where supported)

### Responsive Design Breakpoints
```css
/* Tailwind CSS breakpoints */
sm: 640px   // Small devices (phones)
md: 768px   // Medium devices (tablets)
lg: 1024px  // Large devices (laptops)
xl: 1280px  // Extra large devices (desktops)
2xl: 1536px // 2X extra large devices
```

---

## 10. Development Phases

### Phase 1: Foundation & Authentication (Week 1-2)
**Goals**: Set up project infrastructure and core authentication

**Tasks**:
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS and base styling
- [ ] Set up routing with React Router
- [ ] Implement authentication system (login/register)
- [ ] Create base layout components
- [ ] Configure API service layer
- [ ] Set up Zustand stores for auth state

**Deliverables**:
- Working authentication flow
- Basic app shell with navigation
- API integration foundation

### Phase 2: Core Features (Week 3-4)
**Goals**: Implement primary business functionality

**Tasks**:
- [ ] Product and category management (Admin)
- [ ] Vendor listing creation and management
- [ ] Restaurant product browsing and cart
- [ ] Order placement and basic tracking
- [ ] File upload system for images
- [ ] Basic dashboard layouts for all roles

**Deliverables**:
- Complete product lifecycle (create → list → order)
- Role-based dashboards
- Image upload functionality

### Phase 3: Advanced Features (Week 5-6)
**Goals**: Add sophisticated features and optimizations

**Tasks**:
- [ ] Order approval workflow for restaurant managers
- [ ] Advanced search and filtering system
- [ ] Analytics dashboards with charts
- [ ] Real-time notifications system
- [ ] Bulk operations for orders and listings
- [ ] Advanced form validation and UX

**Deliverables**:
- Complete order approval workflow
- Advanced search capabilities
- Analytics and reporting features

### Phase 4: Polish & PWA (Week 7-8)
**Goals**: Optimize performance and add PWA features

**Tasks**:
- [ ] Performance optimization and code splitting
- [ ] PWA implementation with offline support
- [ ] Comprehensive error handling
- [ ] Accessibility improvements (WCAG compliance)
- [ ] Cross-browser testing and bug fixes
- [ ] Documentation and deployment preparation

**Deliverables**:
- Production-ready application
- PWA with offline capabilities
- Comprehensive documentation

---

## 11. Security Considerations

### Frontend Security
- **JWT token** secure storage and automatic refresh
- **Input sanitization** to prevent XSS attacks
- **HTTPS enforcement** for all API communications
- **CSP headers** configuration for additional security
- **Sensitive data** never stored in localStorage

### Authentication & Authorization
- **Role-based access control** with route protection
- **Token expiration** handling with automatic refresh
- **Secure logout** with token invalidation
- **Password strength** validation and requirements

---

## 12. Testing Strategy

### Unit Testing
- **Component testing** with React Testing Library
- **Utility function testing** with Jest
- **Custom hooks testing** with React Hooks Testing Library

### Integration Testing
- **API integration** testing with MSW (Mock Service Worker)
- **User flow testing** with Cypress or Playwright
- **Cross-browser testing** with BrowserStack

### Performance Testing
- **Lighthouse audits** for performance metrics
- **Bundle size analysis** with webpack-bundle-analyzer
- **Load testing** for critical user flows

---

## 13. Deployment & DevOps

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', 'framer-motion'],
        },
      },
    },
  },
});
```

### Environment Configuration
```bash
# .env.local
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Aaroth Fresh
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_ENABLE_ANALYTICS=true
```

### CI/CD Pipeline
- **GitHub Actions** or **GitLab CI** for automated builds
- **Vercel** or **Netlify** for frontend deployment
- **Environment-specific** builds and configurations
- **Automated testing** integration in pipeline

---

## 14. Maintenance & Scaling

### Code Quality
- **TypeScript strict mode** for type safety
- **ESLint + Prettier** for consistent code style
- **Husky pre-commit hooks** for quality gates
- **Component documentation** with Storybook

### Monitoring & Analytics
- **Error tracking** with Sentry or similar
- **Performance monitoring** with Web Vitals
- **User analytics** with privacy-focused solutions
- **Real User Monitoring** for performance insights

### Future Enhancements
- **Internationalization (i18n)** for multiple languages
- **Advanced analytics** with custom dashboards
- **Real-time features** with WebSocket integration
- **Mobile app** development with React Native

---

This comprehensive plan provides a solid foundation for building a scalable, maintainable, and high-performance frontend for the Aaroth Fresh B2B marketplace. The architecture supports all backend features while delivering an excellent user experience across all devices and user roles.