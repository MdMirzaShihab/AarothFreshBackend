# Recommended Folder Structure

Create this folder structure in your `src/` directory:

```
src/
├── components/              # Reusable UI components
│   ├── ui/                 # Base UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Card.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── Toast.jsx
│   │   └── index.js        # Export all UI components
│   ├── forms/              # Form-specific components
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   │   ├── ProductForm.jsx
│   │   └── OrderForm.jsx
│   ├── layout/             # Layout components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Navigation.jsx
│   │   ├── MobileNav.jsx
│   │   └── Layout.jsx
│   └── common/             # Common components
│       ├── ErrorBoundary.jsx
│       ├── ProtectedRoute.jsx
│       ├── LoadingPage.jsx
│       └── EmptyState.jsx
├── pages/                  # Route-based page components
│   ├── auth/               # Authentication pages
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── ForgotPassword.jsx
│   ├── admin/              # Admin dashboard pages
│   │   ├── Dashboard.jsx
│   │   ├── UserManagement.jsx
│   │   ├── Analytics.jsx
│   │   ├── ProductManagement.jsx
│   │   └── CategoryManagement.jsx
│   ├── vendor/             # Vendor dashboard pages
│   │   ├── Dashboard.jsx
│   │   ├── ListingsManagement.jsx
│   │   ├── OrderManagement.jsx
│   │   ├── CreateListing.jsx
│   │   └── Profile.jsx
│   ├── restaurant/         # Restaurant dashboard pages
│   │   ├── Dashboard.jsx
│   │   ├── ProductCatalog.jsx
│   │   ├── ShoppingCart.jsx
│   │   ├── OrderHistory.jsx
│   │   ├── Profile.jsx
│   │   └── ManagerManagement.jsx
│   └── public/             # Public pages
│       ├── Home.jsx
│       ├── About.jsx
│       ├── ProductDetails.jsx
│       └── CategoryPage.jsx
├── hooks/                  # Custom React hooks
│   ├── useAuth.js
│   ├── useApi.js
│   ├── useLocalStorage.js
│   ├── useDebounce.js
│   └── usePermissions.js
├── store/                  # Redux Toolkit store
│   ├── index.js           # Store configuration
│   ├── slices/            # Redux slices
│   │   ├── authSlice.js
│   │   ├── cartSlice.js
│   │   ├── productsSlice.js
│   │   ├── ordersSlice.js
│   │   └── notificationSlice.js
│   └── middleware/        # Custom middleware
│       └── authMiddleware.js
├── services/               # API service functions
│   ├── api.js             # Axios configuration
│   ├── authService.js     # Authentication API
│   ├── productService.js  # Products API
│   ├── orderService.js    # Orders API
│   ├── uploadService.js   # File upload API
│   └── adminService.js    # Admin API
├── utils/                  # Utility functions
│   ├── constants.js       # App constants
│   ├── helpers.js         # Helper functions
│   ├── formatters.js      # Data formatting
│   ├── validators.js      # Validation functions
│   └── permissions.js     # Permission checking
├── styles/                 # Global styles
│   ├── index.css          # Main CSS file (already created)
│   └── components.css     # Component-specific styles
└── assets/                 # Static assets
    ├── images/
    ├── icons/
    └── logos/
```

## Key Files to Create First

1. **Store Configuration** (`src/store/index.js`)
2. **API Service** (`src/services/api.js`)
3. **Auth Service** (`src/services/authService.js`)
4. **Auth Slice** (`src/store/slices/authSlice.js`)
5. **Protected Route** (`src/components/common/ProtectedRoute.jsx`)
6. **Main Layout** (`src/components/layout/Layout.jsx`)

## File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.jsx`)
- **Hooks**: camelCase starting with 'use' (e.g., `useAuth.js`)
- **Services**: camelCase with 'Service' suffix (e.g., `authService.js`)
- **Utilities**: camelCase (e.g., `formatters.js`)
- **Constants**: UPPER_CASE (e.g., `USER_ROLES`)

## Import/Export Pattern

Each folder should have an `index.js` file that exports all modules for easier imports:

```javascript
// components/ui/index.js
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Modal } from './Modal';

// Usage in other files
import { Button, Input, Modal } from '../components/ui';
```