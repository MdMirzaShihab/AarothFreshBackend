# UI Patterns Reference for Aaroth Fresh

This document provides UI component patterns, styling conventions, and implementation examples following the Organic Futurism design philosophy.

## Design Philosophy: Organic Futurism

The Aaroth Fresh interface embodies **"Organic Futurism"** - merging natural essence with cutting-edge minimalistic digital experiences.

### Core Principles
- **Radical Simplicity**: Every element serves a purpose
- **Invisible Interfaces**: Interactions feel magical and effortless
- **Organic Tech**: Natural curves with digital precision
- **Breathing Room**: Embrace negative space as a design element

## Component Patterns

### Button Patterns (Invisible Until Needed)

```javascript
// Primary CTA - Subtle Glow Effect
const PrimaryButton = ({ children, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="bg-gradient-secondary text-white px-8 py-4 rounded-2xl font-medium 
               transition-all duration-300 hover:shadow-lg hover:shadow-glow-green 
               hover:-translate-y-0.5 min-h-[44px] border-0 focus:outline-none 
               focus:ring-2 focus:ring-bottle-green/20 disabled:opacity-50 
               disabled:cursor-not-allowed disabled:hover:transform-none"
  >
    {children}
  </button>
);

// Secondary Button - Glass Morphism
const SecondaryButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="bg-glass backdrop-blur-sm border border-white/20 text-text-dark 
               px-8 py-4 rounded-2xl font-medium transition-all duration-300 
               hover:bg-white/10 hover:border-white/30 min-h-[44px] 
               focus:outline-none focus:ring-2 focus:ring-bottle-green/20"
  >
    {children}
  </button>
);

// Ghost Button - Minimal Presence
const GhostButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="text-bottle-green hover:text-bottle-green/80 px-6 py-3 rounded-xl 
               font-medium transition-all duration-200 hover:bg-bottle-green/5 
               min-h-[44px] focus:outline-none focus:ring-2 focus:ring-bottle-green/20"
  >
    {children}
  </button>
);

// Danger Button - Restrained
const DangerButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="bg-tomato-red/90 hover:bg-tomato-red text-white px-8 py-4 
               rounded-2xl font-medium transition-all duration-300 min-h-[44px] 
               focus:outline-none focus:ring-2 focus:ring-tomato-red/20"
  >
    {children}
  </button>
);
```

### Card & Container Patterns (Elevated Simplicity)

```javascript
// Product Card - Floating Glass Effect
const ProductCard = ({ product, onAction }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-2xl 
                  hover:shadow-shadow-soft transition-all duration-500 p-6 border 
                  border-white/50 hover:-translate-y-1 group cursor-pointer">
    <div className="aspect-w-16 aspect-h-9 mb-4">
      <img 
        src={product.image} 
        alt={product.name}
        className="w-full h-48 object-cover rounded-2xl"
      />
    </div>
    <h3 className="text-lg font-medium text-text-dark mb-2">{product.name}</h3>
    <p className="text-text-muted text-sm mb-4">{product.description}</p>
    <div className="flex justify-between items-center">
      <span className="text-xl font-semibold text-bottle-green">${product.price}</span>
      <button 
        onClick={() => onAction(product)}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                   bg-bottle-green text-white px-4 py-2 rounded-xl text-sm font-medium"
      >
        Add to Cart
      </button>
    </div>
  </div>
);

// Dashboard Card - Organic Curves
const DashboardCard = ({ title, value, subtitle, icon: Icon, trend }) => (
  <div className="bg-gradient-glass backdrop-blur-md rounded-3xl p-8 border 
                  border-white/20 shadow-soft hover:shadow-lg transition-all duration-300">
    <div className="flex items-center justify-between mb-6">
      <div className="p-3 bg-bottle-green/10 rounded-2xl">
        <Icon className="w-6 h-6 text-bottle-green" />
      </div>
      {trend && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-mint-fresh' : 'text-tomato-red'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-text-muted text-sm font-medium mb-2">{title}</h3>
    <p className="text-3xl font-bold text-text-dark mb-1">{value}</p>
    {subtitle && <p className="text-text-muted text-sm">{subtitle}</p>}
  </div>
);

// Modal/Dialog - Floating Above Reality
const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl 
                      p-8 max-w-md mx-auto border border-white/50 animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-text-dark">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
```

### Form Patterns (Invisible Interactions)

```javascript
// Input Field - Borderless Focus
const InputField = ({ label, error, ...props }) => (
  <div className="relative group">
    <label className="block text-sm font-medium text-text-dark/80 mb-3 tracking-wide">
      {label}
    </label>
    <input
      {...props}
      className={`w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 
                  focus:bg-white focus:shadow-lg focus:shadow-glow-green 
                  transition-all duration-300 placeholder:text-text-muted/60 
                  min-h-[44px] focus:outline-none ${
                    error ? 'border-2 border-tomato-red/30 bg-tomato-red/5' : ''
                  }`}
    />
    {error && (
      <p className="text-tomato-red/80 text-sm mt-2 flex items-center gap-2 animate-fade-in">
        <AlertCircle className="w-4 h-4 text-tomato-red/60" />
        {error}
      </p>
    )}
  </div>
);

// Floating Label Input
const FloatingLabelInput = ({ label, error, value, ...props }) => (
  <div className="relative group">
    <input
      {...props}
      value={value}
      className="w-full px-6 pt-6 pb-2 rounded-2xl bg-earthy-beige/30 border-0 
                 focus:bg-white focus:shadow-lg transition-all duration-300 peer"
    />
    <label className={`absolute left-6 transition-all duration-300 pointer-events-none
                       ${value ? 'top-2 text-xs text-bottle-green' : 'top-4 text-text-muted'}
                       peer-focus:top-2 peer-focus:text-xs peer-focus:text-bottle-green`}>
      {label}
    </label>
    {error && (
      <p className="text-tomato-red/80 text-sm mt-2 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )}
  </div>
);

// Select Dropdown - Minimal & Clean
const SelectField = ({ label, options, error, ...props }) => (
  <div className="relative">
    <label className="block text-sm font-medium text-text-dark/80 mb-3 tracking-wide">
      {label}
    </label>
    <select
      {...props}
      className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 
                 focus:bg-white focus:shadow-lg appearance-none cursor-pointer 
                 transition-all duration-300 min-h-[44px] focus:outline-none"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-14 w-5 h-5 text-text-muted pointer-events-none" />
    {error && (
      <p className="text-tomato-red/80 text-sm mt-2">{error}</p>
    )}
  </div>
);
```

### Navigation Patterns (Invisible Until Needed)

```javascript
// Header - Floating Glass Bar
const Header = ({ user, onLogout }) => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl 
                     border-b border-white/20 transition-all duration-300">
    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <img src="/logo.svg" alt="Aaroth Fresh" className="h-8 w-auto" />
        <span className="text-xl font-semibold text-text-dark">Aaroth Fresh</span>
      </div>
      
      <nav className="hidden md:flex space-x-8">
        <NavLink to="/dashboard" className="nav-item">Dashboard</NavLink>
        <NavLink to="/products" className="nav-item">Products</NavLink>
        <NavLink to="/orders" className="nav-item">Orders</NavLink>
      </nav>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <span className="text-text-dark font-medium">{user?.name}</span>
        </div>
        <button 
          onClick={onLogout}
          className="text-text-muted hover:text-tomato-red transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  </header>
);

// Mobile Navigation - Hidden Drawer
const MobileNav = ({ isOpen, onClose, navigationItems }) => (
  <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white/95 backdrop-blur-xl 
                   shadow-2xl transform transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-semibold text-text-dark">Menu</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <nav className="space-y-4">
        {navigationItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-6 py-3 rounded-2xl text-text-dark/70 
                       hover:text-bottle-green hover:bg-bottle-green/5 transition-all 
                       duration-200 font-medium"
            onClick={onClose}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  </div>
);

// Sidebar - Admin Interface
const AdminSidebar = ({ navigationItems, currentPath }) => (
  <aside className="fixed left-0 top-0 h-full w-64 bg-white/90 backdrop-blur-sm 
                    border-r border-gray-100 z-40">
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text-dark">Admin Panel</h1>
          <p className="text-text-muted text-sm">Aaroth Fresh</p>
        </div>
      </div>
      
      <nav className="space-y-2">
        {navigationItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium 
                       transition-all duration-200 ${
                         currentPath === item.path
                           ? 'bg-bottle-green text-white'
                           : 'text-text-dark/70 hover:text-bottle-green hover:bg-bottle-green/5'
                       }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-tomato-red text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  </aside>
);
```

### Loading & Empty States (Zen-like Patience)

```javascript
// Loading Spinner - Minimal Presence
const LoadingSpinner = ({ size = 'default' }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-4 border-bottle-green/20 
                       border-t-bottle-green rounded-full animate-spin`} />
    </div>
  );
};

// Skeleton Screen - Organic Shapes
const ProductSkeleton = () => (
  <div className="animate-pulse bg-gradient-to-r from-earthy-beige/50 via-white 
                  to-earthy-beige/50 rounded-3xl p-6 space-y-4">
    <div className="h-48 bg-earthy-beige rounded-2xl" />
    <div className="h-4 bg-earthy-beige rounded-full w-3/4" />
    <div className="h-4 bg-earthy-beige rounded-full w-1/2" />
    <div className="flex justify-between items-center">
      <div className="h-6 bg-earthy-beige rounded-full w-1/3" />
      <div className="h-8 bg-earthy-beige rounded-xl w-20" />
    </div>
  </div>
);

// Empty State - Thoughtful Emptiness
const EmptyState = ({ 
  title, 
  description, 
  actionLabel, 
  onAction, 
  icon: Icon = Package 
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center max-w-md mx-auto">
    <div className="w-24 h-24 text-text-muted/40 mb-6">
      <Icon className="w-full h-full" />
    </div>
    <h3 className="text-lg font-medium text-text-dark/70 mb-2">{title}</h3>
    <p className="text-text-muted mb-8 leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="bg-gradient-secondary text-white px-8 py-3 rounded-2xl 
                   font-medium hover:shadow-lg transition-all duration-300"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
```

### Status & Feedback Patterns

```javascript
// Status Badge - Clear Visual Indicators
const StatusBadge = ({ status, children }) => {
  const statusClasses = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-amber-100 text-amber-800',
    rejected: 'bg-red-100 text-red-800',
    approved: 'bg-mint-fresh/20 text-bottle-green'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm 
                     font-medium ${statusClasses[status]}`}>
      {children}
    </span>
  );
};

// Toast Notification - Floating Messages
const Toast = ({ type, message, onClose }) => {
  const typeClasses = {
    success: 'bg-mint-fresh/10 backdrop-blur-sm border border-mint-fresh/20 text-bottle-green',
    error: 'bg-tomato-red/5 backdrop-blur-sm border border-tomato-red/20 text-tomato-red/90',
    warning: 'bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 text-amber-800',
    info: 'bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 text-blue-800'
  };

  return (
    <div className={`${typeClasses[type]} p-4 rounded-2xl shadow-lg animate-slide-up 
                     flex items-center justify-between max-w-sm`}>
      <span className="font-medium">{message}</span>
      <button 
        onClick={onClose}
        className="ml-4 p-1 hover:bg-black/5 rounded-lg transition-colors duration-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Progress Bar - Organic Flow
const ProgressBar = ({ progress, label }) => (
  <div className="w-full">
    {label && (
      <div className="flex justify-between text-sm font-medium text-text-dark mb-2">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
    )}
    <div className="w-full bg-earthy-beige/30 rounded-full h-2 overflow-hidden">
      <div 
        className="h-full bg-gradient-secondary rounded-full origin-left 
                   transition-transform duration-500 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  </div>
);
```

### Data Display Patterns

```javascript
// Data Table - Clean & Responsive
const DataTable = ({ headers, data, actions }) => (
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-earthy-beige/30">
          <tr>
            {headers.map(header => (
              <th key={header.key} className="px-6 py-4 text-left text-sm font-medium 
                                              text-text-dark tracking-wide">
                {header.label}
              </th>
            ))}
            {actions && <th className="px-6 py-4 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-earthy-beige/10 transition-colors duration-200">
              {headers.map(header => (
                <td key={header.key} className="px-6 py-4 text-sm text-text-dark">
                  {row[header.key]}
                </td>
              ))}
              {actions && (
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    {actions.map(action => (
                      <button
                        key={action.label}
                        onClick={() => action.onClick(row)}
                        className={action.className}
                      >
                        {action.icon && <action.icon className="w-4 h-4" />}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Metrics Grid - Dashboard Cards
const MetricsGrid = ({ metrics }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {metrics.map(metric => (
      <DashboardCard
        key={metric.id}
        title={metric.title}
        value={metric.value}
        subtitle={metric.subtitle}
        icon={metric.icon}
        trend={metric.trend}
      />
    ))}
  </div>
);
```

## Animation Patterns

### Standard Animations
```css
/* Add to your CSS file */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(0, 106, 78, 0.2); }
  100% { box-shadow: 0 0 20px rgba(0, 106, 78, 0.4); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
```

### React Animation Hooks
```javascript
// Custom animation hooks
import { useEffect, useState } from 'react';

export const useStaggeredAnimation = (items, delay = 100) => {
  const [visibleItems, setVisibleItems] = useState(new Set());

  useEffect(() => {
    items.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, index]));
      }, index * delay);
    });
  }, [items, delay]);

  return visibleItems;
};

export const useScrollAnimation = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const [elementRef, setElementRef] = useState(null);

  useEffect(() => {
    if (!elementRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold }
    );

    observer.observe(elementRef);
    return () => observer.disconnect();
  }, [elementRef, threshold]);

  return [setElementRef, isVisible];
};
```

## Responsive Patterns

### Mobile-First Grid System
```javascript
// Responsive utilities
export const ResponsiveGrid = ({ children, cols = { default: 1, sm: 2, lg: 3, xl: 4 } }) => {
  const gridClasses = `grid gap-6 
    grid-cols-${cols.default} 
    sm:grid-cols-${cols.sm} 
    lg:grid-cols-${cols.lg} 
    xl:grid-cols-${cols.xl}`;
  
  return <div className={gridClasses}>{children}</div>;
};

// Responsive container
export const Container = ({ children, size = 'default' }) => {
  const sizeClasses = {
    small: 'max-w-4xl',
    default: 'max-w-7xl',
    full: 'max-w-full'
  };

  return (
    <div className={`container mx-auto px-6 sm:px-8 lg:px-12 ${sizeClasses[size]}`}>
      {children}
    </div>
  );
};
```

## Accessibility Patterns

### ARIA Implementation
```javascript
// Accessible components
export const AccessibleButton = ({ 
  children, 
  onClick, 
  ariaLabel, 
  disabled = false,
  ...props 
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    disabled={disabled}
    className="focus-visible:outline-none focus-visible:ring-2 
               focus-visible:ring-bottle-green/40 focus-visible:ring-offset-4 
               focus-visible:rounded-2xl transition-all duration-200"
    {...props}
  >
    {children}
  </button>
);

// Screen reader text
export const ScreenReaderOnly = ({ children }) => (
  <span className="sr-only">{children}</span>
);

// Skip link for keyboard navigation
export const SkipLink = ({ href = "#main-content", children = "Skip to main content" }) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
               bg-bottle-green text-white px-6 py-3 rounded-2xl z-50 font-medium 
               transition-all duration-200"
  >
    {children}
  </a>
);
```

## Usage Guidelines

### When to Use Each Pattern
- **Primary Buttons**: Main actions, CTAs, form submissions
- **Secondary Buttons**: Alternative actions, cancel buttons
- **Ghost Buttons**: Navigation items, subtle actions
- **Product Cards**: Listing displays, catalog views
- **Dashboard Cards**: Metrics, KPIs, summary information
- **Modals**: Confirmations, forms, detailed views
- **Loading States**: Any async operations
- **Empty States**: No data scenarios, error fallbacks

### Customization Notes
- Adjust colors using Tailwind custom color palette
- Modify border radius for different curve intensities
- Scale animations for performance on slower devices
- Test contrast ratios for accessibility compliance

## Implementation Checklist

- [ ] Use semantic HTML elements
- [ ] Implement proper ARIA labels
- [ ] Test keyboard navigation
- [ ] Verify color contrast ratios
- [ ] Optimize for mobile touch targets
- [ ] Test with screen readers
- [ ] Implement proper focus management
- [ ] Add loading and error states
- [ ] Test animation performance
- [ ] Verify responsive behavior