# UI Patterns Reference for Aaroth Fresh

This comprehensive guide provides UI component patterns, styling conventions, and implementation examples for the React.js + Vite + Tailwind CSS frontend, following the Organic Futurism design philosophy.

## Technology Stack
- **Frontend**: React.js + Vite + Vanilla JavaScript
- **Styling**: Tailwind CSS with custom brand colors
- **Design**: Mobile-first, glassmorphic, minimalistic B2B interface
- **Theme**: Dark/Light mode support with smooth transitions

## Design Philosophy: Organic Futurism

The Aaroth Fresh interface embodies **"Organic Futurism"** - merging natural essence with cutting-edge minimalistic digital experiences perfect for B2B agritech workflows.

### Core Principles
- **Radical Simplicity**: Every element serves a purpose - remove everything else
- **Invisible Interfaces**: Interactions feel magical and effortless
- **Organic Tech**: Natural curves with digital precision and 3D depth
- **Breathing Room**: Embrace negative space as a design element
- **Mobile-First B2B**: Optimized for restaurant managers on mobile devices
- **Glassmorphic Depth**: 5-layer transparency system for professional interfaces
- **Performance Excellence**: 60fps animations optimized for all devices

## Brand Color System

### Custom Tailwind Colors (From Configuration)
```javascript
// Primary Earth-Tech Colors (Minimalistic Fusion)
'earthy-brown': '#8C644A'    // Primary dark accents
'earthy-beige': '#F5ECD9'    // Soft backgrounds  
'earthy-yellow': '#D4A373'   // Warm highlights
'earthy-tan': '#E6D5B8'      // Subtle differentiation

// Secondary Sophisticated Olive-Centered Palette
'muted-olive': '#7f8966'     // Primary secondary (main accent)
'sage-green': '#9CAF88'      // Lighter, softer complement to muted-olive
'dusty-cedar': '#A0826D'     // Warm earth tone bridging olive and brown

// Enhanced Utility Colors (Futuristic Neutrals)
'text-dark': '#3A2A1F'       // Primary text
'text-light': '#FFFFFF'      // Clean contrast on dark surfaces
'text-muted': '#6B7280'      // Secondary text
'tomato-red': '#E94B3C'      // Critical actions only
'amber-warm': '#F59E0B'      // Warning states
'border-light': '#E5E7EB'    // Barely-there separations
'background-alt': '#F9FAFB'  // Subtle texture without weight

// Dark Mode Harmony (Olive-focused)
'dark-bg': '#1A1A1A'         // Deep background
'dark-bg-alt': '#2D2D2D'     // Alternative dark surface
'dark-surface': '#374151'    // Interactive surfaces
'dark-text-primary': '#F5ECD9' // Primary text in dark mode
'dark-text-muted': '#9CA3AF' // Secondary text in dark mode
'dark-border': '#4B5563'     // Borders in dark mode

// Enhanced Glassmorphism (Olive-focused)
'glass-white': 'rgba(255, 255, 255, 0.1)' // Light glass effect
'glass-dark': 'rgba(31, 41, 55, 0.8)'     // Dark glass effect
'glow-olive': '#7f896620'    // Subtle olive glow
'glow-sage': '#9CAF8820'     // Sage green glow
'glow-cedar': '#A0826D20'    // Cedar glow
'glow-amber': '#F59E0B20'    // Amber glow

// Status Colors (Olive-harmonized B2B)
'success-light': '#E8F3E8'   // Softer, olive-influenced success
'success-dark': '#4A5D4A'    // Deeper olive-green for success
'warning-light': '#FEF3C7'   // Standard warning light
'warning-dark': '#92400E'    // Standard warning dark
'error-light': '#FEE2E2'     // Standard error light
'error-dark': '#991B1B'      // Standard error dark
'info-light': '#E8F1F5'      // Subtle sage-influenced info
'info-dark': '#5A6B5D'       // Olive-toned info dark
'pending-light': '#F3F1E8'   // Warm, cedar-influenced pending
'pending-dark': '#826D5A'    // Cedar-toned pending dark
```

## Dark/Light Theme System

### Theme Context Setup (React)
```javascript
// hooks/useTheme.js
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### Theme Toggle Component
```javascript
// components/ThemeToggle.js
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="glass-2 p-3 rounded-2xl transition-all duration-300 
                 hover:glass-3 hover:scale-105 focus:outline-none focus:ring-2 
                 focus:ring-muted-olive/20 touch-target"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-text-muted" />
      ) : (
        <Sun className="w-5 h-5 text-earthy-yellow" />
      )}
    </button>
  );
};
```

### Enhanced Dark Mode Support (Professional 3D Futuristic)

#### Dark Mode Color System
```javascript
// Enhanced Dark Mode Olive-Themed Colors (from tailwind.config.js)
'dark-olive-bg': '#1F2419'        // Deep olive-tinted background for brand consistency  
'dark-olive-surface': '#2A3024'   // Elevated olive-tinted surfaces
'dark-olive-border': '#3A4A32'    // Olive-tinted borders for subtle brand presence
'dark-sage-accent': '#8FB57C'     // Brighter sage for dark mode visibility
'dark-cedar-warm': '#B8906F'      // Warmer cedar tone for dark mode
'dark-glass-olive': 'rgba(143, 181, 124, 0.12)' // Dark-optimized olive glass
'dark-glass-sage': 'rgba(159, 175, 136, 0.08)'  // Dark-optimized sage glass
'dark-glow-olive': 'rgba(143, 181, 124, 0.2)'   // Enhanced olive glow for dark mode
```

#### Professional Dark Mode Glassmorphism (5-Layer System)
```javascript
// Dark Mode Glass Variants (Enhanced for Professional UI)
className="glass-1-dark"  // Subtle: rgba(47, 58, 47, 0.08), blur(6px), olive border
className="glass-2-dark"  // Light: rgba(47, 58, 47, 0.12), blur(10px)  
className="glass-3-dark"  // Medium: rgba(47, 58, 47, 0.16), blur(14px)
className="glass-4-dark"  // Strong: rgba(47, 58, 47, 0.20), blur(18px)
className="glass-5-dark"  // Intense: rgba(47, 58, 47, 0.25), blur(22px)

// Specialized Dark Glass Cards
className="glass-card-dark-olive" // Olive-themed dark glass with enhanced backdrop-blur
```

#### Dark Mode Component Patterns
```javascript
// Conditional Dark Mode Component Example
import { useTheme } from '../hooks/useTheme';

const EnhancedCard = ({ children, variant = 'default', className }) => {
  const { theme } = useTheme();
  
  const baseClasses = 'rounded-3xl transition-all duration-500 group';
  
  const variants = {
    glass: theme === 'dark' 
      ? 'glass-3-dark border-dark-olive-border hover:glass-4-dark hover:shadow-dark-glow-olive'
      : 'glass-3 border-white/20 hover:glass-4 hover:border-muted-olive/30 hover:shadow-glow-olive/10',
    
    elevated: theme === 'dark'
      ? 'bg-dark-olive-surface shadow-dark-depth-2 hover:shadow-dark-depth-3 border-dark-olive-border'
      : 'bg-white shadow-lg hover:shadow-2xl hover:shadow-shadow-soft border-gray-100',
      
    interactive: theme === 'dark'
      ? 'glass-2-dark hover:glass-3-dark hover:shadow-dark-glow-olive/20 border-dark-olive-border/50 hover:-translate-y-2 cursor-pointer'
      : 'bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-2xl hover:shadow-glow-olive/10 border-white/50 hover:-translate-y-2 cursor-pointer hover:bg-white/90'
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
```

#### Dark Mode Utility Classes
```javascript
// Enhanced Dark Mode Utilities (Professional B2B)
className="dark-olive-accent"      // Left border: 4px solid #8FB57C
className="dark-sage-highlight"    // Sage gradient highlight for dark mode
className="dark-cedar-warmth"      // Cedar gradient warmth for dark mode  
className="dark-focus-ring"        // Enhanced dark mode focus ring with olive glow

// Dark Mode Shadow System
className="shadow-dark-glow-olive" // Enhanced olive glow: 0 0 25px rgba(143, 181, 124, 0.25)
className="shadow-dark-glow-sage"  // Sage glow: 0 0 20px rgba(159, 175, 136, 0.2)
className="shadow-dark-glass"      // Dark glass shadow: 0 8px 32px rgba(0, 0, 0, 0.6)
className="shadow-dark-depth-1"    // Professional dark depth level 1
className="shadow-dark-depth-2"    // Professional dark depth level 2  
className="shadow-dark-depth-3"    // Professional dark depth level 3
```

#### Dark Mode Theme Toggle (Enhanced)
```javascript
// Enhanced Theme Toggle with 3D Effects
export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`${theme === 'dark' ? 'glass-2-dark' : 'glass-2'} 
                  p-3 rounded-2xl transition-all duration-300 
                  ${theme === 'dark' ? 'hover:glass-3-dark hover:shadow-dark-glow-olive' : 'hover:glass-3 hover:shadow-glow-olive'} 
                  hover:scale-105 focus:outline-none 
                  ${theme === 'dark' ? 'dark-focus-ring' : 'focus:ring-2 focus:ring-muted-olive/20'} 
                  touch-target group`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative overflow-hidden">
        {theme === 'light' ? (
          <Moon className={`w-5 h-5 text-text-muted transition-all duration-300 
                           group-hover:text-muted-olive group-hover:scale-110`} />
        ) : (
          <Sun className={`w-5 h-5 text-dark-sage-accent transition-all duration-300 
                          group-hover:text-earthy-yellow group-hover:scale-110 
                          group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]`} />
        )}
      </div>
    </button>
  );
};
```

## Enhanced Visual Elements (Olive-Centered Theme)

### New Glow Effects & Focus Rings
```javascript
// Enhanced Glow Effects
className="hover:shadow-glow-olive"    // Subtle olive glow (replaces glow-green)
className="hover:shadow-glow-sage"     // New sage green glow
className="hover:shadow-glow-cedar"    // New cedar warmth glow  
className="hover:shadow-glow-amber"    // Enhanced amber glow
className="hover:shadow-soft-olive"    // Ultra-subtle olive shadow

// Enhanced Focus Ring System
className="focus:ring-muted-olive/20"  // Primary olive focus (replaces bottle-green)
className="focus:ring-sage-green/20"   // New sage focus ring
className="focus:ring-dusty-cedar/20"  // New cedar focus ring
className="focus:ring-amber-warm/20"   // Enhanced amber focus ring

// Advanced Focus Ring Utilities
className="focus-ring"                 // Default olive focus ring utility
className="focus-ring-sage"            // Sage variant focus ring utility
className="focus-ring-cedar"           // Cedar variant focus ring utility
className="focus-ring-amber"           // Amber variant focus ring utility
```

### New Gradient System (Earth-Harmony)
```javascript
// Updated Core Gradients
className="bg-gradient-secondary"       // Now: muted-olive to sage-green
className="bg-gradient-tertiary"        // New: cedar-olive-sage blend
className="bg-gradient-olive-sage"      // New: 120deg olive to sage
className="bg-gradient-earth-harmony"   // New: full secondary harmony

// Glass Gradient Enhancements
className="bg-gradient-glass"           // Enhanced with olive undertones
className="bg-gradient-glass-dark"      // Dark mode glass with olive hints
className="bg-gradient-depth"          // 3D depth with olive accents
```

### New Utility Classes (B2B Workflow Enhancements)
```javascript
// Olive-Themed Accents
className="olive-accent"                // Left border: 4px solid muted-olive
className="sage-highlight"              // Sage green gradient highlight
className="cedar-warmth"                // Cedar gradient warmth effect

// Enhanced Glass Cards
className="glass-card-olive"            // New olive-themed glass card
className="glass-1 through glass-5"     // 5-layer depth system (enhanced)

// Professional Shadows (Updated)
className="shadow-depth-1 through shadow-depth-5" // Professional depth system
className="professional-shadow"         // Business-appropriate shadow
className="professional-shadow-lg"      // Larger professional shadow
```

### Enhanced Animations (Olive-Focused)
```javascript
// New Olive-Specific Animations
className="animate-glow-olive"          // Olive-specific glow animation
className="animate-breathe"             // Subtle breathing effect (4s cycle)
className="animate-pulse-subtle"        // Gentler pulse animation
className="animate-shimmer"             // Loading shimmer effect

// Updated Keyframes
@keyframes glowOlive {
  '0%': { boxShadow: '0 0 5px rgba(127, 137, 102, 0.3)' },
  '100%': { boxShadow: '0 0 25px rgba(127, 137, 102, 0.6)' }
}

@keyframes breathe {
  '0%, 100%': { transform: 'scale(1)', opacity: '1' },
  '50%': { transform: 'scale(1.02)', opacity: '0.95' }
}
```

## Component Patterns

### Enhanced Button System (5-Layer Depth)

```javascript
// Primary CTA - Enhanced Glow with 3D Depth
const PrimaryButton = ({ children, onClick, disabled = false, size = 'default' }) => {
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    default: 'px-8 py-4',
    large: 'px-12 py-5 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-gradient-secondary text-white ${sizeClasses[size]} rounded-2xl 
                  font-medium transition-all duration-300 hover:shadow-glow-olive 
                  hover:-translate-y-0.5 hover:scale-[1.02] touch-target border-0 
                  focus:outline-none focus:ring-2 focus:ring-muted-olive/30 
                  disabled:opacity-50 disabled:cursor-not-allowed 
                  disabled:hover:transform-none shadow-depth-2 
                  hover:shadow-depth-4 active:scale-95`}
    >
      {children}
    </button>
  );
};

// Glass Morphism Button - 5-Layer System
const GlassButton = ({ children, onClick, depth = 2, variant = 'primary' }) => {
  const depthClasses = {
    1: 'glass-1',
    2: 'glass-2', 
    3: 'glass-3',
    4: 'glass-4',
    5: 'glass-5'
  };

  const variantClasses = {
    primary: 'text-muted-olive hover:text-muted-olive/80',
    secondary: 'text-text-dark hover:text-text-muted',
    danger: 'text-tomato-red hover:text-tomato-red/80'
  };

  return (
    <button
      onClick={onClick}
      className={`${depthClasses[depth]} ${variantClasses[variant]} 
                  px-8 py-4 rounded-2xl font-medium transition-all duration-300 
                  hover:glass-${Math.min(depth + 1, 5)} hover:-translate-y-0.5 
                  touch-target focus:outline-none focus:ring-2 
                  focus:ring-muted-olive/20 shadow-glass hover:shadow-glass-lg`}
    >
      {children}
    </button>
  );
};

// Approval Button - B2B Specific
const ApprovalButton = ({ status, onApprove, onReject, loading = false }) => (
  <div className="flex gap-3">
    <button
      onClick={onApprove}
      disabled={loading || status === 'approved'}
      className="bg-gradient-to-r from-muted-olive to-sage-green text-white 
                 px-6 py-3 rounded-xl font-medium transition-all duration-300 
                 hover:shadow-glow-olive hover:-translate-y-0.5 disabled:opacity-50 
                 focus:outline-none focus:ring-2 focus:ring-muted-olive/30"
    >
      {loading ? 'Processing...' : 'Approve'}
    </button>
    <button
      onClick={onReject}
      disabled={loading || status === 'rejected'}
      className="bg-gradient-to-r from-tomato-red/90 to-tomato-red text-white 
                 px-6 py-3 rounded-xl font-medium transition-all duration-300 
                 hover:shadow-glow-amber hover:-translate-y-0.5 disabled:opacity-50 
                 focus:outline-none focus:ring-2 focus:ring-tomato-red/30"
    >
      {loading ? 'Processing...' : 'Reject'}
    </button>
  </div>
);

// Bulk Action Button - B2B Workflow
const BulkActionButton = ({ selectedCount, onAction, icon: Icon }) => (
  <button
    onClick={onAction}
    disabled={selectedCount === 0}
    className={`glass-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 
                flex items-center gap-2 ${selectedCount > 0 
                  ? 'text-muted-olive hover:glass-4 hover:-translate-y-0.5' 
                  : 'text-text-muted cursor-not-allowed'}`}
  >
    <Icon className="w-4 h-4" />
    Action ({selectedCount})
  </button>
);
```

### Card & Container Patterns (Elevated 3D Simplicity)

```javascript
// Product/Listing Card - Enhanced Glassmorphic Depth
const ProductCard = ({ product, onAction, variant = 'default' }) => {
  const { theme } = useTheme();
  
  return (
    <div className={`${theme === 'dark' ? 'glass-card-dark' : 'glass-card'} 
                     rounded-3xl shadow-depth-2 hover:shadow-depth-4 
                     transition-all duration-500 p-6 border hover:-translate-y-2 
                     hover:scale-[1.02] group cursor-pointer animate-fade-in`}>
      <div className="relative mb-4 overflow-hidden rounded-2xl">
        <img 
          src={product.image || '/placeholder-product.jpg'} 
          alt={product.name}
          className="w-full h-48 object-cover transition-transform duration-500 
                     group-hover:scale-110"
        />
        {product.featured && (
          <div className="absolute top-2 right-2 bg-gradient-secondary 
                          text-white px-3 py-1 rounded-full text-xs font-medium">
            Featured
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-text-dark group-hover:text-muted-olive 
                         transition-colors duration-200 line-clamp-2">
            {product.name}
          </h3>
          <StatusBadge status={product.status} />
        </div>
        
        <p className="text-text-muted text-sm line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center pt-2">
          <div className="space-y-1">
            <span className="text-2xl font-bold text-muted-olive">
              ${product.price}
            </span>
            <p className="text-xs text-text-muted">per {product.unit}</p>
          </div>
          
          <button 
            onClick={() => onAction(product)}
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 
                       bg-gradient-secondary text-white px-4 py-2 rounded-xl text-sm 
                       font-medium hover:scale-105 active:scale-95 touch-target"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Metrics Card - B2B Professional
const MetricsCard = ({ title, value, subtitle, icon: Icon, trend, loading = false }) => {
  const getTrendColor = () => {
    if (!trend) return 'text-text-muted';
    return trend > 0 ? 'text-sage-green' : 'text-tomato-red';
  };

  return (
    <div className="glass-3 rounded-3xl p-6 sm:p-8 border shadow-depth-2 
                    hover:shadow-depth-3 hover:glass-4 transition-all duration-300 
                    hover:-translate-y-1 group">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-gradient-to-br from-muted-olive/10 to-sage-green/10 
                        rounded-2xl group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-muted-olive" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
            <span>{trend > 0 ? '↗' : '↘'}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-text-muted text-sm font-medium tracking-wide uppercase">
          {title}
        </h3>
        {loading ? (
          <div className="animate-pulse bg-earthy-beige rounded h-8 w-24"></div>
        ) : (
          <p className="text-3xl font-bold text-text-dark group-hover:text-muted-olive 
                        transition-colors duration-300">
            {value}
          </p>
        )}
        {subtitle && (
          <p className="text-text-muted text-sm">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// Enhanced Modal - 5-Layer Glassmorphism
const Modal = ({ isOpen, onClose, children, title, size = 'default' }) => {
  const sizeClasses = {
    small: 'max-w-md',
    default: 'max-w-lg', 
    large: 'max-w-2xl',
    full: 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced backdrop with multiple blur layers */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className={`relative glass-5 rounded-3xl shadow-depth-5 
                       ${sizeClasses[size]} mx-auto border animate-scale-in 
                       max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-text-dark">{title}</h2>
          <button 
            onClick={onClose}
            className="glass-2 p-2 rounded-xl hover:glass-3 transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-muted-olive/30"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// B2B Data Container - Professional Layout
const DataContainer = ({ title, subtitle, children, actions, loading = false }) => (
  <div className="glass-2 rounded-3xl shadow-depth-2 border overflow-hidden">
    <div className="p-6 border-b border-white/10 bg-gradient-to-r from-earthy-beige/10 to-transparent">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-text-dark mb-1">{title}</h2>
          {subtitle && <p className="text-text-muted text-sm">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
    
    <div className="p-6">
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-earthy-beige/30 h-16 rounded-2xl" />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);
```

### Enhanced Form System (Glassmorphic Inputs)

```javascript
// Enhanced Input Field - 3D Glassmorphism
const InputField = ({ label, error, icon: Icon, required = false, ...props }) => {
  const { theme } = useTheme();
  
  return (
    <div className="relative group space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text-dark/80 tracking-wide">
          {label} {required && <span className="text-tomato-red">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 
                          w-5 h-5 text-text-muted group-focus-within:text-muted-olive 
                          transition-colors duration-300" />
        )}
        
        <input
          {...props}
          className={`w-full ${Icon ? 'pl-12 pr-6' : 'px-6'} py-4 rounded-2xl 
                      ${theme === 'dark' ? 'glass-card-dark' : 'bg-earthy-beige/30'} 
                      border-0 focus:glass-3 focus:shadow-glow-olive 
                      transition-all duration-300 placeholder:text-text-muted/60 
                      touch-target focus:outline-none text-text-dark
                      ${error ? 'border-2 border-tomato-red/30 bg-tomato-red/5' : ''}`}
        />
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-tomato-red/80 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// Floating Label Input - Advanced Animation
const FloatingLabelInput = ({ label, error, value, icon: Icon, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const isFloating = isFocused || hasValue;

  return (
    <div className="relative group">
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 
                          w-5 h-5 text-text-muted group-focus-within:text-muted-olive 
                          transition-colors duration-300 z-10" />
        )}
        
        <input
          {...props}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full ${Icon ? 'pl-12 pr-6' : 'px-6'} pt-6 pb-2 rounded-2xl 
                      bg-earthy-beige/30 border-0 focus:glass-3 focus:shadow-glow-green 
                      transition-all duration-300 peer touch-target focus:outline-none 
                      ${error ? 'border-2 border-tomato-red/30' : ''}`}
        />
        
        <label className={`absolute ${Icon ? 'left-12' : 'left-6'} transition-all duration-300 
                           pointer-events-none select-none
                           ${isFloating 
                             ? 'top-2 text-xs text-muted-olive font-medium' 
                             : 'top-1/2 -translate-y-1/2 text-text-muted'}`}>
          {label}
        </label>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-tomato-red/80 text-sm mt-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// Enhanced Select - Glassmorphic Dropdown
const SelectField = ({ label, options, error, placeholder = 'Select option...', ...props }) => (
  <div className="relative group space-y-2">
    {label && (
      <label className="block text-sm font-medium text-text-dark/80 tracking-wide">
        {label}
      </label>
    )}
    
    <div className="relative">
      <select
        {...props}
        className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 
                   focus:glass-3 focus:shadow-glow-green appearance-none cursor-pointer 
                   transition-all duration-300 touch-target focus:outline-none text-text-dark
                   bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"%236B7280\" viewBox=\"0 0 20 20\"><path d=\"M5.23 7.21a.75.75 0 011.06-.02L10 10.88l3.71-3.69a.75.75 0 111.06 1.06l-4.24 4.22a.75.75 0 01-1.06 0L5.23 8.25a.75.75 0 01.02-1.04z\"/></svg>')] 
                   bg-no-repeat bg-[length:20px] bg-[right_1rem_center]"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
    
    {error && (
      <div className="flex items-center gap-2 text-tomato-red/80 text-sm animate-fade-in">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )}
  </div>
);

// Multi-Select with Tags - B2B Feature
const MultiSelectField = ({ label, options, value = [], onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleOption = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const selectedOptions = options.filter(opt => value.includes(opt.value));

  return (
    <div className="relative group space-y-2">
      <label className="block text-sm font-medium text-text-dark/80 tracking-wide">
        {label}
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 
                     focus:glass-3 focus:shadow-glow-green text-left
                     transition-all duration-300 touch-target focus:outline-none"
        >
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map(option => (
                <span key={option.value} 
                      className="bg-muted-olive/10 text-muted-olive px-3 py-1 
                                 rounded-full text-sm font-medium">
                  {option.label}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-text-muted">Select options...</span>
          )}
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-4 rounded-2xl 
                          border shadow-depth-3 max-h-60 overflow-y-auto z-10">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className={`w-full px-6 py-3 text-left hover:glass-5 transition-all duration-200
                            ${value.includes(option.value) 
                              ? 'text-muted-olive font-medium' 
                              : 'text-text-dark'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center
                                   ${value.includes(option.value)
                                     ? 'bg-muted-olive border-muted-olive'
                                     : 'border-text-muted'}`}>
                    {value.includes(option.value) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span>{option.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-tomato-red/80 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// File Upload - Drag & Drop Glassmorphism
const FileUpload = ({ label, accept, multiple = false, onUpload, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(multiple ? droppedFiles : [droppedFiles[0]]);
    onUpload(multiple ? droppedFiles : droppedFiles[0]);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-dark/80 tracking-wide">
        {label}
      </label>
      
      <div
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`glass-2 border-2 border-dashed rounded-3xl p-8 text-center 
                    transition-all duration-300 cursor-pointer hover:glass-3
                    ${isDragging 
                      ? 'border-muted-olive glass-4 scale-[1.02]' 
                      : 'border-text-muted/30'}`}
      >
        <Upload className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <p className="text-text-dark font-medium mb-2">
          Drop files here or click to upload
        </p>
        <p className="text-text-muted text-sm">
          {accept ? `Accepts: ${accept}` : 'Any file type'}
        </p>
        
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const selectedFiles = Array.from(e.target.files);
            setFiles(selectedFiles);
            onUpload(multiple ? selectedFiles : selectedFiles[0]);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="glass-2 p-3 rounded-xl flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-olive" />
              <span className="text-text-dark text-sm font-medium flex-1">
                {file.name}
              </span>
              <span className="text-text-muted text-xs">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 text-tomato-red/80 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
```

### B2B Data Display Patterns

```javascript
// Enhanced Status Badge System
const StatusBadge = ({ status, size = 'default', variant = 'solid' }) => {
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    default: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const statusConfig = {
    pending: { 
      solid: 'bg-pending-light text-pending-dark border-pending-dark/20',
      glass: 'glass-2 text-earthy-yellow border-earthy-yellow/30'
    },
    approved: { 
      solid: 'bg-success-light text-success-dark border-success-dark/20',
      glass: 'glass-2 text-muted-olive border-muted-olive/30'
    },
    rejected: { 
      solid: 'bg-error-light text-error-dark border-error-dark/20',
      glass: 'glass-2 text-tomato-red border-tomato-red/30'
    },
    active: { 
      solid: 'bg-success-light text-success-dark border-success-dark/20',
      glass: 'glass-2 text-sage-green border-sage-green/30'
    },
    inactive: { 
      solid: 'bg-gray-100 text-gray-800 border-gray-300',
      glass: 'glass-1 text-text-muted border-text-muted/30'
    }
  };

  const config = statusConfig[status] || statusConfig.inactive;
  
  return (
    <span className={`inline-flex items-center rounded-full border font-medium 
                     ${sizeClasses[size]} ${config[variant]} animate-fade-in`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${variant === 'glass' 
        ? 'bg-current opacity-60' 
        : 'bg-current opacity-80'}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Professional Data Table - Mobile Responsive
const DataTable = ({ 
  headers, 
  data, 
  actions, 
  bulkActions, 
  onSelect, 
  selectedItems = [], 
  loading = false 
}) => {
  const [allSelected, setAllSelected] = useState(false);
  
  const toggleAll = () => {
    if (allSelected) {
      onSelect([]);
    } else {
      onSelect(data.map(item => item.id));
    }
    setAllSelected(!allSelected);
  };

  return (
    <div className="glass-2 rounded-3xl shadow-depth-2 border overflow-hidden">
      {/* Header with bulk actions */}
      {bulkActions && selectedItems.length > 0 && (
        <div className="p-4 bg-muted-olive/5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-text-dark font-medium">
              {selectedItems.length} items selected
            </span>
            <div className="flex gap-2">
              {bulkActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => action.onClick(selectedItems)}
                  className="glass-3 px-4 py-2 rounded-xl text-sm font-medium 
                             hover:glass-4 transition-all duration-200 flex items-center gap-2"
                >
                  {action.icon && <action.icon className="w-4 h-4" />}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-earthy-beige/20">
            <tr>
              {onSelect && (
                <th className="px-6 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-2 border-text-muted/30 
                               text-muted-olive focus:ring-muted-olive/20"
                  />
                </th>
              )}
              {headers.map(header => (
                <th key={header.key} 
                    className="px-6 py-4 text-left text-sm font-medium text-text-dark 
                               tracking-wide">
                  {header.label}
                </th>
              ))}
              {actions && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(headers.length + (onSelect ? 1 : 0) + (actions ? 1 : 0))].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-earthy-beige rounded-full w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              data.map((row, index) => (
                <tr key={row.id || index} 
                    className="hover:bg-earthy-beige/5 transition-colors duration-200 group">
                  {onSelect && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(row.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSelect([...selectedItems, row.id]);
                          } else {
                            onSelect(selectedItems.filter(id => id !== row.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-2 border-text-muted/30 
                                   text-muted-olive focus:ring-muted-olive/20"
                      />
                    </td>
                  )}
                  {headers.map(header => (
                    <td key={header.key} className="px-6 py-4 text-sm text-text-dark">
                      {header.render ? header.render(row[header.key], row) : row[header.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 
                                      transition-opacity duration-200">
                        {actions.map(action => (
                          <button
                            key={action.label}
                            onClick={() => action.onClick(row)}
                            className={`p-2 rounded-xl transition-all duration-200 ${action.className}`}
                            title={action.label}
                          >
                            {action.icon && <action.icon className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-gray-100/50">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-earthy-beige rounded-full w-3/4 mb-2"></div>
              <div className="h-4 bg-earthy-beige rounded-full w-1/2"></div>
            </div>
          ))
        ) : (
          data.map((row, index) => (
            <div key={row.id || index} className="p-4 hover:bg-earthy-beige/5 transition-colors">
              <div className="space-y-3">
                {headers.slice(0, 3).map(header => (
                  <div key={header.key} className="flex justify-between items-start">
                    <span className="text-text-muted text-sm font-medium">{header.label}:</span>
                    <span className="text-text-dark text-sm text-right">
                      {header.render ? header.render(row[header.key], row) : row[header.key]}
                    </span>
                  </div>
                ))}
                {actions && (
                  <div className="flex justify-end gap-2 pt-2">
                    {actions.map(action => (
                      <button
                        key={action.label}
                        onClick={() => action.onClick(row)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 
                                   ${action.className}`}
                      >
                        {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Approval Workflow Component - B2B Specific
const ApprovalWorkflow = ({ item, onApprove, onReject, loading = false }) => {
  const [reason, setReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [actionType, setActionType] = useState(null);

  const handleAction = (type) => {
    if (type === 'reject') {
      setActionType(type);
      setShowReasonModal(true);
    } else {
      if (type === 'approve') onApprove(item.id);
    }
  };

  const confirmAction = () => {
    if (actionType === 'reject') {
      onReject(item.id, reason);
    }
    setShowReasonModal(false);
    setReason('');
    setActionType(null);
  };

  return (
    <>
      <div className="glass-2 rounded-2xl p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-dark">{item.name}</h3>
            <p className="text-text-muted text-sm">ID: {item.id}</p>
          </div>
          <StatusBadge status={item.status} variant="glass" />
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Submitted:</span>
              <p className="text-text-dark font-medium">{item.submittedAt}</p>
            </div>
            <div>
              <span className="text-text-muted">Type:</span>
              <p className="text-text-dark font-medium">{item.type}</p>
            </div>
          </div>
        </div>

        {item.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-muted-olive to-sage-green 
                         text-white py-3 px-4 rounded-xl font-medium
                         hover:shadow-glow-olive hover:-translate-y-0.5 
                         transition-all duration-300 disabled:opacity-50
                         disabled:hover:transform-none"
            >
              {loading ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-tomato-red/90 to-tomato-red 
                         text-white py-3 px-4 rounded-xl font-medium
                         hover:shadow-glow-amber hover:-translate-y-0.5 
                         transition-all duration-300 disabled:opacity-50
                         disabled:hover:transform-none"
            >
              {loading ? 'Processing...' : 'Reject'}
            </button>
          </div>
        )}
      </div>

      {/* Reason Modal */}
      <Modal isOpen={showReasonModal} onClose={() => setShowReasonModal(false)} 
             title="Rejection Reason" size="default">
        <div className="space-y-4">
          <p className="text-text-muted">
            Please provide a reason for rejecting this {item.type}:
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full px-4 py-3 rounded-2xl bg-earthy-beige/30 border-0 
                       focus:glass-3 focus:shadow-glow-green transition-all duration-300 
                       placeholder:text-text-muted/60 resize-none h-24 focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setShowReasonModal(false)}
              className="flex-1 glass-2 py-3 px-4 rounded-xl font-medium
                         hover:glass-3 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={confirmAction}
              disabled={!reason.trim()}
              className="flex-1 bg-tomato-red text-white py-3 px-4 rounded-xl font-medium
                         hover:bg-tomato-red/90 transition-all duration-300 
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
```

### Navigation Patterns (Mobile-First B2B)

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
                       hover:text-muted-olive hover:bg-muted-olive/5 transition-all 
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
                           ? 'bg-muted-olive text-white'
                           : 'text-text-dark/70 hover:text-muted-olive hover:bg-muted-olive/5'
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
      <div className={`${sizeClasses[size]} border-4 border-muted-olive/20 
                       border-t-muted-olive rounded-full animate-spin`} />
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
    approved: 'bg-sage-green/20 text-muted-olive'
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
    success: 'bg-sage-green/10 backdrop-blur-sm border border-sage-green/20 text-muted-olive',
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
               focus-visible:ring-muted-olive/40 focus-visible:ring-offset-4 
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
               bg-muted-olive text-white px-6 py-3 rounded-2xl z-50 font-medium 
               transition-all duration-200"
  >
    {children}
  </a>
);
```

## Enhanced B2B Utility Classes (Olive-Themed Workflow)

### New Workflow-Specific Components
```javascript
// Olive Accent Sidebar - Professional B2B Navigation
const OliveSidebar = ({ isOpen, items }) => (
  <div className={`fixed left-0 top-0 h-full w-64 bg-white/90 backdrop-blur-sm 
                   border-r border-sage-green/20 z-40 transition-transform duration-300
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="p-6">
      <div className="olive-accent pl-4 mb-8">
        <h1 className="text-lg font-semibold text-text-dark">Admin Panel</h1>
        <p className="text-text-muted text-sm">Aaroth Fresh</p>
      </div>
      
      <nav className="space-y-2">
        {items.map(item => (
          <a key={item.path} 
             className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium 
                        text-text-dark/70 hover:text-muted-olive hover:bg-muted-olive/5 
                        cedar-warmth transition-all duration-200">
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  </div>
);

// Enhanced Approval Card - B2B Workflow
const ApprovalCard = ({ item, onApprove, onReject }) => (
  <div className="glass-card-olive rounded-3xl p-6 border sage-highlight hover:shadow-glow-sage 
                  transition-all duration-300 hover:-translate-y-1">
    <div className="flex items-center justify-between mb-4">
      <div className="olive-accent pl-4">
        <h3 className="font-semibold text-text-dark">{item.name}</h3>
        <p className="text-text-muted text-sm">Submitted {item.timeAgo}</p>
      </div>
      <StatusBadge status={item.status} variant="glass" size="small" />
    </div>
    
    <div className="cedar-warmth rounded-2xl p-4 mb-6">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-text-muted">Priority:</span>
          <p className="text-dusty-cedar font-medium">{item.priority}</p>
        </div>
        <div>
          <span className="text-text-muted">Type:</span>
          <p className="text-muted-olive font-medium">{item.type}</p>
        </div>
      </div>
    </div>

    <div className="flex gap-3">
      <button 
        onClick={() => onApprove(item.id)}
        className="flex-1 bg-gradient-olive-sage text-white py-3 px-4 rounded-xl 
                   font-medium hover:shadow-glow-olive hover:-translate-y-0.5 
                   transition-all duration-300 focus-ring-sage">
        Approve
      </button>
      <button 
        onClick={() => onReject(item.id)}
        className="flex-1 bg-gradient-to-r from-tomato-red/90 to-tomato-red 
                   text-white py-3 px-4 rounded-xl font-medium 
                   hover:shadow-glow-amber hover:-translate-y-0.5 
                   transition-all duration-300 focus-ring-amber">
        Reject
      </button>
    </div>
  </div>
);

// Professional Data Filter Bar
const FilterBar = ({ filters, onFilterChange, onReset }) => (
  <div className="glass-2 rounded-2xl p-4 border sage-highlight mb-6">
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-muted-olive" />
        <span className="text-text-dark font-medium">Filters:</span>
      </div>
      
      <div className="flex flex-wrap gap-3 flex-1">
        <select className="px-4 py-2 rounded-xl bg-earthy-beige/30 border-0 
                           focus:glass-3 focus-ring-sage min-w-[120px]">
          <option>All Status</option>
          <option>Pending</option>
          <option>Approved</option>
        </select>
        
        <select className="px-4 py-2 rounded-xl bg-earthy-beige/30 border-0 
                           focus:glass-3 focus-ring-cedar min-w-[120px]">
          <option>All Types</option>
          <option>Vendor</option>
          <option>Product</option>
        </select>
        
        <input 
          type="date" 
          className="px-4 py-2 rounded-xl bg-earthy-beige/30 border-0 
                     focus:glass-3 focus-ring-olive text-text-dark"
        />
      </div>
      
      <button 
        onClick={onReset}
        className="glass-2 px-4 py-2 rounded-xl text-text-muted hover:text-muted-olive 
                   hover:glass-3 transition-all duration-200 flex items-center gap-2">
        <RotateCcw className="w-4 h-4" />
        Reset
      </button>
    </div>
  </div>
);

// Bulk Operations Bar - Enhanced B2B
const BulkOperationsBar = ({ selectedCount, operations, onClearSelection }) => {
  if (selectedCount === 0) return null;
  
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 
                    glass-4 rounded-2xl p-4 border shadow-depth-4 animate-slide-up">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted-olive/20 rounded-full flex items-center justify-center">
            <span className="text-muted-olive font-medium text-sm">{selectedCount}</span>
          </div>
          <span className="text-text-dark font-medium">items selected</span>
        </div>
        
        <div className="flex gap-2">
          {operations.map(op => (
            <button key={op.key}
                    onClick={() => op.action(selectedCount)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 
                               flex items-center gap-2 ${op.variant === 'danger' 
                                 ? 'bg-tomato-red/10 text-tomato-red hover:bg-tomato-red/20' 
                                 : 'bg-muted-olive/10 text-muted-olive hover:bg-muted-olive/20'}`}>
              <op.icon className="w-4 h-4" />
              {op.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={onClearSelection}
          className="p-2 rounded-xl text-text-muted hover:text-text-dark 
                     hover:bg-black/5 transition-all duration-200">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
```

### Implementation Examples with New Theme
```javascript
// Admin Dashboard with Olive Theme
const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-earthy-beige/20 to-white">
      <OliveSidebar isOpen={true} items={navigationItems} />
      
      <main className="ml-64 p-8">
        <div className="mb-8 olive-accent pl-6">
          <h1 className="text-3xl font-bold text-text-dark mb-2">Admin Dashboard</h1>
          <p className="text-text-muted">Manage your B2B marketplace efficiently</p>
        </div>
        
        <FilterBar filters={filters} onFilterChange={handleFilter} onReset={resetFilters} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {approvalItems.map(item => (
            <ApprovalCard 
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
        
        <BulkOperationsBar 
          selectedCount={selectedItems.length}
          operations={bulkOperations}
          onClearSelection={clearSelection}
        />
      </main>
    </div>
  );
};

// Enhanced Status Indicators with New Colors
const StatusIndicator = ({ status, label, count }) => {
  const statusConfig = {
    pending: { bg: 'bg-pending-light', text: 'text-pending-dark', accent: 'cedar-warmth' },
    approved: { bg: 'bg-success-light', text: 'text-success-dark', accent: 'sage-highlight' },
    rejected: { bg: 'bg-error-light', text: 'text-error-dark', accent: 'bg-tomato-red/10' },
    active: { bg: 'bg-info-light', text: 'text-info-dark', accent: 'olive-accent' }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className={`glass-2 rounded-2xl p-6 border hover:glass-3 transition-all duration-300 ${config.accent}`}>
      <div className={`w-12 h-12 ${config.bg} rounded-full flex items-center justify-center mb-4`}>
        <div className={`w-6 h-6 ${config.text.replace('text-', 'bg-')} rounded-full`} />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-text-dark">{count}</p>
        <p className={`text-sm font-medium ${config.text}`}>{label}</p>
      </div>
    </div>
  );
};
```

### Enhanced Mobile-First B2B Components
```javascript
// Mobile Approval Queue with Olive Theme
const MobileApprovalQueue = ({ items, onAction }) => (
  <div className="space-y-4 px-4">
    {items.map(item => (
      <div key={item.id} 
           className="glass-card-olive rounded-2xl p-4 border sage-highlight 
                      transition-all duration-300 hover:shadow-glow-sage">
        <div className="flex justify-between items-start mb-3">
          <div className="olive-accent pl-3">
            <h3 className="font-semibold text-text-dark text-sm">{item.name}</h3>
            <p className="text-text-muted text-xs">{item.type}</p>
          </div>
          <StatusBadge status={item.status} size="small" variant="glass" />
        </div>
        
        <div className="cedar-warmth rounded-xl p-3 mb-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-text-muted block">Priority</span>
              <span className="text-dusty-cedar font-medium">{item.priority}</span>
            </div>
            <div>
              <span className="text-text-muted block">Submitted</span>
              <span className="text-muted-olive font-medium">{item.timeAgo}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => onAction(item.id, 'approve')}
            className="flex-1 bg-gradient-olive-sage text-white py-2.5 px-3 rounded-xl 
                       text-sm font-medium hover:shadow-glow-olive transition-all duration-300">
            Approve
          </button>
          <button 
            onClick={() => onAction(item.id, 'reject')}
            className="flex-1 bg-tomato-red/90 text-white py-2.5 px-3 rounded-xl 
                       text-sm font-medium hover:shadow-glow-amber transition-all duration-300">
            Reject
          </button>
        </div>
      </div>
    ))}
  </div>
);

// Touch-Optimized Filter Chips
const FilterChips = ({ activeFilters, onToggleFilter }) => (
  <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
    {filterOptions.map(filter => (
      <button
        key={filter.key}
        onClick={() => onToggleFilter(filter.key)}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium 
                    transition-all duration-300 touch-target ${activeFilters.includes(filter.key)
                      ? 'bg-muted-olive text-white shadow-glow-olive' 
                      : 'glass-2 text-text-dark hover:glass-3'}`}>
        {filter.label}
        {activeFilters.includes(filter.key) && (
          <X className="w-3 h-3 ml-2 inline" />
        )}
      </button>
    ))}
  </div>
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