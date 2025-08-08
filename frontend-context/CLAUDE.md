### Error Handling UI (Gentle Guidance)

#### Error Messages (Compassionate Communication)
```typescript
// Inline Form Error - Subtle warning
className="text-tomato-red/80 text-sm mt-2 flex items-center gap-2 animate-fade-in"
// Icon: "w-4 h-4 text-tomato-red/60"

// Page Error State - Calm reassurance
className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6"
// Title: "text-2xl font-medium text-text-dark/80 mb-4"
// Message: "text-text-muted mb-8 max-w-md leading-relaxed"
// Action: "bg-gradient-secondary text-white px-8 py-3 rounded-2xl font-medium"

// Network Error - Offline elegance
className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 text-amber-800 p-4 rounded-2xl flex items-center gap-3"

// Validation Error - Focused feedback
className="border-2 border-tomato-red/30 bg-tomato-red/5 focus:border-tomato-red/50 focus:ring-2 focus:ring-tomato-red/10"
```

#### Toast Notifications (Floating Messages)
```typescript
// Success Toast - Gentle celebration
className="bg-mint-fresh/10 backdrop-blur-sm border border-mint-fresh/20 text-bottle-green p-4 rounded-2xl shadow-lg animate-slide-up"

// Error Toast - Soft alert
className="bg-tomato-red/5 backdrop-blur-sm border border-tomato-red/20 text-tomato-red/90 p-4 rounded-2xl shadow-lg animate-slide-up"

// Warning Toast - Cautious notice
className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 text-amber-800 p-4 rounded-2xl shadow-lg animate-slide-up"

// Info Toast - Subtle information
className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 text-blue-800 p-4 rounded-2xl shadow-lg animate-slide-up"

// Toast Container - Floating above reality
className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm"
```

#### Error Recovery (Resilient Experience)
```typescript
// Retry Button - Hopeful action
className="bg-earthy-yellow/20 hover:bg-earthy-yellow/30 text-earthy-brown px-6 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"

// Error Boundary - Graceful fallback
className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-earthy-beige/20 to-white"

// Network Status - Subtle indicator
className="fixed top-2 left-1/2 transform -translate-x-1/2 bg-amber-100/90 backdrop-blur-sm text-amber-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm animate-fade-in"
```# Aaroth Fresh Frontend - Claude Code Instructions

This file provides guidance to Claude Code when working with the Aaroth Fresh B2B marketplace frontend.

## Project Overview

React JavaScript frontend for Aaroth Fresh B2B marketplace - connecting local vegetable vendors with restaurants. Built with modern stack focusing on mobile-first design and MVP performance for 500 concurrent users.

## Technology Stack

- **Core**: React 18 + JavaScript + Vite
- **Styling**: Tailwind CSS (mobile-first approach)
- **State Management**: Redux Toolkit (global state) + RTK Query (server state)
- **Routing**: React Router v6 with role-based protection
- **Forms**: React Hook Form + basic validation
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Vite with optimization
- **UI Icons**: Lucide React

## Development Commands

- **Start development server**: `npm run dev` (Vite dev server with HMR)
- **Build for production**: `npm run build` (Vite build with optimization)
- **Preview production build**: `npm run preview`
- **Lint code**: `npm run lint` (ESLint for JavaScript)
- **Format code**: `npm run format` (Prettier)

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
├── store/              # Redux Toolkit store
│   ├── index.js        # Store configuration
│   ├── slices/         # Redux slices
│   │   ├── authSlice.js    # Authentication state
│   │   ├── cartSlice.js    # Shopping cart state
│   │   ├── notificationSlice.js # Notifications
│   │   └── productsSlice.js # Products state
├── services/           # API service functions
│   ├── api.js          # Axios configuration
│   ├── authService.js  # Authentication API calls
│   ├── listingsService.js # Listings API calls
│   └── ordersService.js # Orders API calls
├── utils/              # Utility functions
├── constants/          # App constants and configuration
└── styles/             # Global styles and Tailwind config
```

### State Management Strategy
- **Redux Toolkit**: For global app state (auth, cart, notifications, products)
- **RTK Query**: For server state management and caching
- **Local State**: React useState for component-specific state
- **Form State**: React Hook Form for form management

## UI Design System & Brand Guidelines

### Design Philosophy: Minimalistic Futurism with Organic Touch

The Aaroth Fresh interface embodies **"Organic Futurism"** - a design language that merges the natural essence of fresh produce with cutting-edge, minimalistic digital experiences. Think Apple's design precision meets sustainable agriculture aesthetics.

#### Core Design Principles
- **Radical Simplicity**: Every element serves a purpose; remove everything that doesn't
- **Futuristic Minimalism**: Clean lines, generous white space, and purposeful micro-interactions
- **Organic Tech**: Natural curves and gradients that feel both high-tech and earth-connected
- **Invisible Interfaces**: Interactions should feel magical and effortless
- **Breathing Room**: Embrace negative space as a design element
- **Subtle Sophistication**: Understated elegance over flashy elements

### Color Palette

#### Primary Colors (Minimalistic Earth-Tech Fusion)
- **Primary Dark (Earthy Brown)**: `#8C644A` - Grounding element, used sparingly for emphasis
- **Primary Light (Earthy Beige)**: `#F5ECD9` - Soft background, creates warmth without visual noise
- **Supporting Tone 1 (Earthy Yellow)**: `#D4A373` - Accent color for micro-interactions and highlights
- **Supporting Tone 2 (Earthy Tan)**: `#E6D5B8` - Subtle differentiation, card backgrounds

#### Secondary Colors (Future-Forward Accents)
- **Secondary Dark (Bottle Green)**: `#006A4E` - Primary action color, tech-forward yet natural
- **Secondary Light (Mint Fresh)**: `#8FD4BE` - Success states, fresh indicators, subtle highlights

#### Utility Colors (Futuristic Neutrals)
- **Text Dark**: `#3A2A1F` - Primary text, softer than harsh black for comfortable reading
- **Text Light**: `#FFFFFF` - Clean contrast on dark surfaces
- **Text Muted**: `#6B7280` - Secondary information, maintains hierarchy without clutter
- **Accent (Tomato Red)**: `#E94B3C` - Strategic use for critical actions only
- **Warning (Amber)**: `#F59E0B` - Minimal warning states
- **Border**: `#E5E7EB` - Barely-there separations
- **Background**: `#FFFFFF` - Pure, clean foundation
- **Background Alt**: `#F9FAFB` - Subtle texture without visual weight

#### Futuristic Enhancement Colors
- **Glass Effect**: `rgba(255, 255, 255, 0.1)` - Glassmorphism overlays
- **Glow Green**: `#006A4E20` - Subtle success glows and hover states
- **Shadow Soft**: `rgba(60, 42, 31, 0.08)` - Elevated surfaces
- **Gradient Primary**: `linear-gradient(135deg, #8C644A 0%, #D4A373 100%)` - Premium surfaces
- **Gradient Secondary**: `linear-gradient(135deg, #006A4E 0%, #8FD4BE 100%)` - Action elements

### Tailwind Configuration
Add these custom colors to your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'earthy-brown': '#8C644A',
        'earthy-beige': '#F5ECD9',
        'earthy-yellow': '#D4A373',
        'earthy-tan': '#E6D5B8',
        'bottle-green': '#006A4E',
        'mint-fresh': '#8FD4BE',
        'text-dark': '#3A2A1F',
        'text-muted': '#6B7280',
        'tomato-red': '#E94B3C',
        'glass': 'rgba(255, 255, 255, 0.1)',
        'glow-green': '#006A4E20',
        'shadow-soft': 'rgba(60, 42, 31, 0.08)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #8C644A 0%, #D4A373 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #006A4E 0%, #8FD4BE 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 106, 78, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 106, 78, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    }
  }
}
```

### Typography System (Futuristic Minimalism)

#### Font Family
```css
/* Primary: Clean, modern system fonts */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;

/* Optional: Consider Inter or Poppins for premium feel */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

#### Font Sizes (Minimalistic Hierarchy)
- **xs**: 0.75rem (12px) - Micro-labels, timestamps
- **sm**: 0.875rem (14px) - Secondary text, captions
- **base**: 1rem (16px) - Primary body text
- **lg**: 1.125rem (18px) - Emphasized content
- **xl**: 1.25rem (20px) - Small headings
- **2xl**: 1.5rem (24px) - Section headings
- **3xl**: 1.875rem (30px) - Page titles (use sparingly)
- **4xl**: 2.25rem (36px) - Hero text (rare, impactful moments)

#### Typography Principles
- **Generous Line Heights**: 1.6-1.8 for readability and breathing room
- **Selective Bold Usage**: Use font-medium (500) over font-bold (700) for subtlety
- **Letter Spacing**: Slight tracking on headings (-0.025em) for premium feel
- **Hierarchy Through Scale & Color**: Not just size - use color and weight strategically

### Component Design Patterns

### Component Design Patterns (Futuristic Minimalism)

#### Buttons (Invisible Until Needed)
```javascript
// Primary CTA - Subtle Glow Effect
className="bg-gradient-secondary text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-glow-green hover:-translate-y-0.5 min-h-[44px] border-0 focus:outline-none focus:ring-2 focus:ring-bottle-green/20"

// Secondary Button - Glass Morphism
className="bg-glass backdrop-blur-sm border border-white/20 text-text-dark px-8 py-4 rounded-2xl font-medium transition-all duration-300 hover:bg-white/10 hover:border-white/30 min-h-[44px]"

// Ghost Button - Minimal Presence
className="text-bottle-green hover:text-bottle-green/80 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:bg-bottle-green/5 min-h-[44px]"

// Floating Action Button - Modern & Minimal
className="bg-gradient-secondary text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center border-0 focus:outline-none focus:ring-2 focus:ring-bottle-green/20"

// Danger Button - Restrained
className="bg-tomato-red/90 hover:bg-tomato-red text-white px-8 py-4 rounded-2xl font-medium transition-all duration-300 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-tomato-red/20"
```

#### Cards & Containers (Elevated Simplicity)
```javascript
// Product Card - Floating Glass Effect
className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-shadow-soft transition-all duration-500 p-6 border border-white/50 hover:-translate-y-1 group"

// Dashboard Card - Organic Curves
className="bg-gradient-glass backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-soft"

// Modal/Dialog - Floating Above Reality
className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md mx-auto border border-white/50 animate-scale-in"

// Container - Breathing Space
className="container mx-auto px-6 sm:px-8 lg:px-12 max-w-7xl"

// Hero Section - Expansive Minimalism
className="min-h-screen flex items-center justify-center bg-gradient-to-br from-earthy-beige via-white to-mint-fresh/10"
```

#### Form Elements (Invisible Interactions)
```javascript
// Input Field - Borderless Focus
className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 focus:bg-white focus:shadow-lg focus:shadow-glow-green transition-all duration-300 placeholder:text-text-muted/60 min-h-[44px] focus:outline-none"

// Floating Label Input
className="relative group"
// Input: "w-full px-6 pt-6 pb-2 rounded-2xl bg-earthy-beige/30 border-0 focus:bg-white focus:shadow-lg transition-all duration-300 peer"
// Label: "absolute left-6 top-4 text-text-muted transition-all duration-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-bottle-green"

// Select Dropdown - Minimal & Clean
className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 focus:bg-white focus:shadow-lg appearance-none cursor-pointer transition-all duration-300 min-h-[44px]"

// Checkbox - Organic Toggle
className="w-6 h-6 rounded-lg text-bottle-green focus:ring-0 focus:ring-offset-0 border-2 border-gray-200 transition-all duration-200 hover:border-bottle-green"

// Toggle Switch - Futuristic
className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-bottle-green focus:ring-offset-2 data-[checked]:bg-bottle-green"

// Form Label - Subtle Presence
className="block text-sm font-medium text-text-dark/80 mb-3 tracking-wide"

// Error Message - Gentle Warning
className="text-tomato-red/80 text-sm mt-2 flex items-center gap-2"
```

#### Navigation (Invisible Until Needed)
```javascript
// Header - Floating Glass Bar
className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 transition-all duration-300"

// Mobile Navigation - Hidden Drawer
className="fixed inset-y-0 left-0 z-50 w-80 bg-white/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out"

// Navigation Item - Subtle Hover
className="flex items-center gap-3 px-6 py-3 rounded-2xl text-text-dark/70 hover:text-bottle-green hover:bg-bottle-green/5 transition-all duration-200 font-medium"

// Breadcrumb - Minimal Trail
className="flex items-center gap-2 text-sm text-text-muted"
```

### Mobile-First Design Principles (Futuristic Touch)

#### Touch Targets (Enhanced for Future)
- **Minimum size**: 44px × 44px for all interactive elements
- **Optimal size**: 48px × 48px for primary actions
- **Spacing between targets**: minimum 12px for comfortable interaction
- **Bottom navigation items**: 72px height with floating indicators
- **Gesture-friendly**: Swipe areas extend beyond visual boundaries

#### Responsive Grid System (Organic Flow)
```javascript
// Adaptive Grid - Flows like nature
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"

// Masonry-style Layout - Organic arrangement
className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"

// Product Grid - Asymmetric beauty
className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"

// Dashboard Grid - Breathing space
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-12"

// Hero Layout - Centered minimalism
className="flex flex-col items-center justify-center min-h-screen text-center px-6 max-w-4xl mx-auto"
```

#### Gesture-First Interactions
```javascript
// Swipeable Cards
className="snap-x snap-mandatory flex overflow-x-auto gap-6 px-6 pb-4"

// Pull-to-refresh Indicator
className="flex items-center justify-center py-4 text-bottle-green animate-float"

// Floating Action Menu - Expandable
className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3"

// Sticky Elements - Smart positioning
className="sticky top-20 z-40 bg-white/90 backdrop-blur-sm"
```

### Animation & Transitions (Invisible Magic)

#### Micro-Interactions Philosophy
- **Purposeful Motion**: Every animation communicates state or guides attention
- **Organic Easing**: Use `ease-out` for entrances, `ease-in` for exits
- **Staggered Reveals**: Create rhythm with sequential animations
- **Breathing UI**: Subtle hover states that feel alive
- **Performance First**: 60fps animations, transform over position changes

#### Standard Transitions (Refined Timing)
- **Instant**: 100ms (micro-feedback, button presses)
- **Fast**: 200ms (hover states, focus indicators)
- **Normal**: 300ms (page elements, modals)
- **Slow**: 500ms (page transitions, complex reveals)
- **Cinematic**: 800ms (hero animations, onboarding)

#### Common Animations (Signature Movements)
```javascript
// Entrance Animations - Organic appearance
className="animate-fade-in" // Gentle fade with subtle upward motion
className="animate-slide-up" // Smooth emergence from below
className="animate-scale-in" // Gentle scale with fade

// Hover States - Living interface
className="hover:scale-[1.02] hover:-translate-y-1 transition-transform duration-300 ease-out"
className="hover:shadow-2xl hover:shadow-glow-green/10 transition-all duration-400"

// Loading States - Zen-like patience
className="animate-pulse bg-gradient-to-r from-earthy-beige to-earthy-tan"
className="animate-float" // Gentle floating motion

// Interactive Feedback - Immediate response
className="active:scale-95 transition-transform duration-100"
className="hover:bg-bottle-green/5 transition-colors duration-200"

// Page Transitions - Seamless flow
className="transition-all duration-500 ease-in-out transform"

// Glow Effects - Subtle energy
className="hover:animate-glow transition-all duration-300"
```

#### Advanced Animation Patterns
```javascript
// Staggered List Animations
className="[&>*:nth-child(1)]:animate-[fade-in_0.3s_ease-out_0.1s_both] [&>*:nth-child(2)]:animate-[fade-in_0.3s_ease-out_0.2s_both] [&>*:nth-child(3)]:animate-[fade-in_0.3s_ease-out_0.3s_both]"

// Parallax Scrolling Effects
className="transform transition-transform duration-1000 ease-out"

// Morphing Buttons
className="relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-secondary before:translate-x-[-100%] hover:before:translate-x-0 before:transition-transform before:duration-300"

// Loading Skeleton - Breathing effect
className="animate-pulse bg-gradient-to-r from-earthy-beige via-white to-earthy-beige bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]"
```

### Iconography Guidelines

#### Icon Library
- **Primary**: Lucide React (already in tech stack)

#### Size Standards
- **Small**: 16px (`w-4 h-4`)
- **Default**: 20px (`w-5 h-5`)
- **Medium**: 24px (`w-6 h-6`)
- **Large**: 32px (`w-8 h-8`)

#### Icon Colors
- **Default**: Text color (`text-current`)
- **Interactive**: Bottle green (`text-bottle-green`)
- **Muted**: Gray (`text-gray-400`)
- **Success**: Mint fresh (`text-mint-fresh`)
- **Error**: Tomato red (`text-tomato-red`)

### Dark Mode Considerations

#### Color Adjustments
```javascript
// Dark mode palette classes
dark: {
  'bg-dark': '#1A1A1A',
  'bg-dark-alt': '#2D2D2D',
  'text-dark-primary': '#F5ECD9',
  'text-dark-muted': '#A0A0A0',
  'primary-dark': '#D4A373',
  'secondary-dark': '#8FD4BE'
}
```

### Component Spacing System

#### Spacing Scale (Tailwind)
- **0**: 0px
- **1**: 0.25rem (4px)
- **2**: 0.5rem (8px)
- **3**: 0.75rem (12px)
- **4**: 1rem (16px)
- **5**: 1.25rem (20px)
- **6**: 1.5rem (24px)
- **8**: 2rem (32px)
- **10**: 2.5rem (40px)
- **12**: 3rem (48px)
- **16**: 4rem (64px)

### Loading & Empty States (Zen-like Patience)

#### Loading Patterns (Elegant Waiting)
```javascript
// Skeleton Screens - Organic shapes
className="animate-pulse bg-gradient-to-r from-earthy-beige/50 via-white to-earthy-beige/50 rounded-3xl h-4 w-full"

// Content Placeholder - Breathing rhythm
className="space-y-4 animate-pulse"
// Child elements: "h-4 bg-earthy-beige rounded-full w-3/4", "h-4 bg-earthy-beige rounded-full w-1/2"

// Spinner - Minimal presence
className="animate-spin rounded-full h-8 w-8 border-2 border-earthy-beige border-t-bottle-green"

// Progress Bars - Organic flow
className="w-full bg-earthy-beige/30 rounded-full h-2 overflow-hidden"
// Progress: "h-full bg-gradient-secondary rounded-full origin-left transition-transform duration-500 ease-out"

// Floating Loader - Zen circle
className="flex items-center justify-center p-8"
// Inner: "w-12 h-12 border-4 border-bottle-green/20 border-t-bottle-green rounded-full animate-spin"
```

#### Empty States (Thoughtful Emptiness)
```javascript
// Empty State Container - Peaceful void
className="flex flex-col items-center justify-center py-16 px-8 text-center max-w-md mx-auto"

// Empty State Illustration - Minimal icon
className="w-24 h-24 text-text-muted/40 mb-6"

// Empty State Text - Gentle guidance
className="text-lg font-medium text-text-dark/70 mb-2"
// Subtitle: "text-text-muted mb-8 leading-relaxed"

// Empty State CTA - Soft invitation
className="bg-gradient-secondary text-white px-8 py-3 rounded-2xl font-medium hover:shadow-lg transition-all duration-300"
```

### Error Handling UI

#### Error Messages
- Use warm, helpful language
- Provide clear next steps
- Include error codes for technical issues
- Position near the relevant field for form errors
- Use tomato-red color for error states

#### Toast Notifications
```javascript
// Success toast
className="bg-mint-fresh/10 border border-mint-fresh/20 text-bottle-green p-4 rounded-lg"

// Error toast
className="bg-tomato-red/10 border border-tomato-red/20 text-tomato-red p-4 rounded-lg"

// Warning toast
className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg"

// Info toast
className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg"
```

### Accessibility Standards (Inclusive Futurism)

#### Color Contrast (Universal Readability)
- **Normal text**: Minimum 4.5:1 contrast ratio with enhanced focus on 7:1 for premium accessibility
- **Large text**: Minimum 3:1 contrast ratio with 4.5:1 preferred
- **Interactive elements**: Clear focus indicators with 2px outline and 4px offset
- **Color Independence**: Never rely solely on color to convey information

#### ARIA Labels & Semantic Structure
```javascript
// Accessible Button - Screen reader friendly
className="focus:outline-none focus:ring-2 focus:ring-bottle-green/40 focus:ring-offset-4 rounded-2xl"
// Attributes: aria-label="Add product to cart" role="button"

// Form Field - Complete accessibility
className="focus:outline-none focus:ring-2 focus:ring-bottle-green/40 focus:ring-offset-2"
// Structure: <label htmlFor="email">Email</label> <input id="email" aria-describedby="email-error">

// Navigation - Semantic structure
className="nav" // Use semantic HTML: <nav>, <main>, <section>, <article>
// Skip Link: "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-bottle-green text-white px-4 py-2 rounded-lg z-50"

// Icon with Context - Meaningful for all users
// <span className="sr-only">Search products</span>
// <SearchIcon className="w-5 h-5" aria-hidden="true" />
```

#### Focus Management (Keyboard Navigation)
```javascript
// Focus Ring - Modern and subtle
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bottle-green/40 focus-visible:ring-offset-4 focus-visible:rounded-2xl"

// Focus Trap - Modal accessibility
className="focus:outline-none" // Use libraries like focus-trap-react

// Skip Links - Keyboard user assistance
className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-bottle-green text-white px-6 py-3 rounded-2xl z-50 font-medium transition-all duration-200"

// High Contrast Mode Support
className="contrast-more:border-2 contrast-more:border-current"
```

#### Motion & Animation Accessibility
```javascript
// Respect prefers-reduced-motion
className="motion-reduce:animate-none motion-reduce:transition-none"

// Alternative static states
className="motion-reduce:transform-none motion-reduce:hover:scale-100"

// Essential animations only
// Use @media (prefers-reduced-motion: reduce) in CSS for critical animations
```

### PWA-Specific UI Guidelines (App-like Fluidity)

#### Offline Indicators (Graceful Degradation)
```javascript
// Offline Banner - Subtle notification
className="fixed top-0 left-0 right-0 bg-amber-100/90 backdrop-blur-sm text-amber-800 py-3 px-6 text-center text-sm font-medium z-50 animate-slide-up"

// Cached Content Badge - Transparency indicator
className="inline-flex items-center gap-1 bg-mint-fresh/20 text-bottle-green px-2 py-1 rounded-full text-xs font-medium"

// Sync Status - Real-time feedback
className="flex items-center gap-2 text-sm text-text-muted"
// Syncing: "animate-spin w-4 h-4 text-bottle-green"
// Synced: "w-4 h-4 text-mint-fresh"
// Error: "w-4 h-4 text-tomato-red"
```

#### Install Prompt (Native App Feel)
```javascript
// Custom Install Banner - Brand aligned
className="fixed bottom-4 left-4 right-4 bg-gradient-glass backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl animate-slide-up z-50"

// Install Button - Compelling action
className="bg-gradient-secondary text-white px-8 py-3 rounded-2xl font-medium hover:shadow-lg transition-all duration-300 flex items-center gap-3"

// Dismiss Button - Respectful exit
className="text-text-muted hover:text-text-dark p-2 rounded-xl hover:bg-black/5 transition-colors duration-200"

// App Icon Preview - Visual context
className="w-16 h-16 rounded-2xl shadow-lg bg-gradient-primary p-3"
```

#### Native-like Navigation
```javascript
// Tab Bar - iOS/Android inspired
className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-2 py-2 safe-area-pb z-50"

// Tab Item - Touch optimized
className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl min-h-[64px] transition-all duration-200 active:scale-95"

// Status Bar - Respects safe areas
className="pt-safe-top bg-gradient-to-r from-earthy-beige to-white"

// Pull-to-Refresh - Native gesture
className="flex items-center justify-center py-12 text-bottle-green"
```

## Development Guidelines

### Code Style & Standards
- **JavaScript**: Modern ES6+ syntax with ESLint configuration
- **ESLint**: Airbnb configuration with React hooks
- **Prettier**: Consistent code formatting
- **File Naming**: kebab-case for files, PascalCase for components
- **Import Order**: External packages → internal modules → relative imports
- **PropTypes**: Runtime type checking for component props

### Component Development
- **Mobile-First**: Always design for mobile, then scale up
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Lazy loading, code splitting, image optimization
- **Reusability**: Create composable, reusable components
- **Testing**: Unit tests for utilities, integration tests for components

### API Integration Best Practices
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Show loading indicators for all async operations
- **Caching**: Use RTK Query for smart caching and background updates
- **Optimistic Updates**: For better user experience with Redux Toolkit
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
- **Redux Slices**: Test Redux Toolkit slice reducers and actions

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

### Redux Toolkit Store Setup
```javascript
// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import { apiSlice } from './api/apiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    api: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export default store;
```

### Redux Toolkit Slice Pattern with Token Management
```javascript
// store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  tokenExpiry: localStorage.getItem('tokenExpiry') ? parseInt(localStorage.getItem('tokenExpiry')) : null,
  isRefreshing: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      const { user, token, refreshToken, expiresIn } = action.payload;
      state.loading = false;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.tokenExpiry = Date.now() + (expiresIn * 1000); // Convert to milliseconds
      
      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('tokenExpiry', state.tokenExpiry.toString());
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    refreshTokenStart: (state) => {
      state.isRefreshing = true;
      state.error = null;
    },
    refreshTokenSuccess: (state, action) => {
      const { token, expiresIn } = action.payload;
      state.token = token;
      state.tokenExpiry = Date.now() + (expiresIn * 1000);
      state.isRefreshing = false;
      
      // Update localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('tokenExpiry', state.tokenExpiry.toString());
    },
    refreshTokenFailure: (state) => {
      // If refresh fails, logout user
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isRefreshing = false;
      state.tokenExpiry = null;
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiry');
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.tokenExpiry = null;
      state.isRefreshing = false;
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiry');
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  refreshTokenStart, 
  refreshTokenSuccess, 
  refreshTokenFailure, 
  logout, 
  updateUser, 
  clearError 
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsTokenExpired = (state) => {
  const { tokenExpiry } = state.auth;
  return tokenExpiry ? Date.now() >= (tokenExpiry - 60000) : false; // Check if token expires in 1 minute
};
export const selectShouldRefresh = (state) => {
  const { isAuthenticated, isRefreshing, tokenExpiry } = state.auth;
  return isAuthenticated && !isRefreshing && tokenExpiry && Date.now() >= (tokenExpiry - 120000); // Refresh 2 minutes before expiry
};

export default authSlice.reducer;
```

### Token Management Middleware
```javascript
// store/middleware/authMiddleware.js
import { refreshTokenStart, refreshTokenSuccess, refreshTokenFailure, logout } from '../slices/authSlice';

const authMiddleware = (store) => (next) => (action) => {
  // Check if we need to refresh token before any API call
  const state = store.getState();
  const { isAuthenticated, isRefreshing, tokenExpiry, refreshToken } = state.auth;
  
  // Auto refresh token if it's about to expire (within 2 minutes)
  if (isAuthenticated && !isRefreshing && refreshToken && tokenExpiry && Date.now() >= (tokenExpiry - 120000)) {
    store.dispatch(refreshTokenStart());
    
    // Call refresh token API
    fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        store.dispatch(refreshTokenSuccess(data));
      } else {
        store.dispatch(refreshTokenFailure());
      }
    })
    .catch(() => {
      store.dispatch(refreshTokenFailure());
    });
  }
  
  return next(action);
};

export default authMiddleware;
```

### Enhanced RTK Query API Slice with Token Refresh
```javascript
// store/api/apiSlice.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { refreshTokenStart, refreshTokenSuccess, refreshTokenFailure, logout } from '../slices/authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_BASE_URL || '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Enhanced base query with automatic token refresh
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    const refreshToken = api.getState().auth.refreshToken;
    
    if (refreshToken && !api.getState().auth.isRefreshing) {
      // Try to refresh token
      api.dispatch(refreshTokenStart());
      
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${refreshToken}`,
          },
        },
        api,
        extraOptions
      );
      
      if (refreshResult.data) {
        // Successfully refreshed token
        api.dispatch(refreshTokenSuccess(refreshResult.data));
        
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        api.dispatch(refreshTokenFailure());
        api.dispatch(logout());
      }
    }
  }
  
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Product', 'Order', 'Listing', 'Category', 'Vendor', 'Restaurant'],
  endpoints: (builder) => ({
    // Authentication endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    getCurrentUser: builder.query({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    
    // Listings endpoints
    getListings: builder.query({
      query: (params = {}) => ({
        url: '/listings',
        params,
      }),
      providesTags: (result) => [
        { type: 'Listing', id: 'LIST' },
        ...(result?.data?.listings || []).map(({ id }) => ({ type: 'Listing', id }))
      ],
    }),
    createListing: builder.mutation({
      query: (newListing) => ({
        url: '/listings',
        method: 'POST',
        body: newListing,
      }),
      invalidatesTags: [{ type: 'Listing', id: 'LIST' }],
    }),
    
    // Orders endpoints  
    getOrders: builder.query({
      query: (params = {}) => ({
        url: '/orders',
        params,
      }),
      providesTags: (result) => [
        { type: 'Order', id: 'LIST' },
        ...(result?.data?.orders || []).map(({ id }) => ({ type: 'Order', id }))
      ],
    }),
    createOrder: builder.mutation({
      query: (orderData) => ({
        url: '/orders',
        method: 'POST',
        body: orderData,
      }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useGetListingsQuery,
  useCreateListingMutation,
  useGetOrdersQuery,
  useCreateOrderMutation,
} = apiSlice;
```

### Protected Route Pattern
```javascript
// components/ProtectedRoute.jsx
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};
```

### Component with Redux Integration
```javascript
// components/ProductList.jsx
import { useSelector, useDispatch } from 'react-redux';
import { useGetListingsQuery } from '../store/api/apiSlice';
import { addToCart } from '../store/slices/cartSlice';

export const ProductList = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items);
  const { data: listings, isLoading, error } = useGetListingsQuery();

  const handleAddToCart = (product) => {
    dispatch(addToCart(product));
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading products</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings?.data?.listings.map((listing) => (
        <div key={listing.id} className="card-product">
          <h3>{listing.product.name}</h3>
          <p>${listing.price}</p>
          <button 
            onClick={() => handleAddToCart(listing)}
            className="btn-primary"
          >
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
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

### Advanced Authentication Service
```javascript
// services/authService.js
import { store } from '../store';
import { loginStart, loginSuccess, loginFailure, refreshTokenSuccess, logout } from '../store/slices/authSlice';

class AuthService {
  constructor() {
    this.refreshPromise = null;
    this.initializeFromStorage();
  }

  initializeFromStorage() {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    
    if (token && refreshToken && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      if (Date.now() < expiryTime) {
        // Token is still valid, we can continue with stored session
        console.log('Session restored from localStorage');
      } else {
        // Token expired, clear storage
        this.clearStorage();
      }
    }
  }

  async login(phone, password) {
    store.dispatch(loginStart());
    
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        store.dispatch(loginSuccess({
          user: data.user,
          token: data.token,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn || 3600, // Default 1 hour
        }));
        
        return { success: true, user: data.user };
      } else {
        store.dispatch(loginFailure(data.message));
        return { success: false, message: data.message };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      store.dispatch(loginFailure(errorMessage));
      return { success: false, message: errorMessage };
    }
  }

  async refreshToken() {
    // Prevent multiple concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const state = store.getState();
    const { refreshToken } = state.auth;
    
    if (!refreshToken) {
      store.dispatch(logout());
      return { success: false };
    }

    this.refreshPromise = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    })
    .then(response => response.json())
    .then(data => {
      this.refreshPromise = null;
      
      if (data.success) {
        store.dispatch(refreshTokenSuccess({
          token: data.token,
          expiresIn: data.expiresIn || 3600,
        }));
        return { success: true, token: data.token };
      } else {
        store.dispatch(logout());
        return { success: false };
      }
    })
    .catch(() => {
      this.refreshPromise = null;
      store.dispatch(logout());
      return { success: false };
    });

    return this.refreshPromise;
  }

  async logout() {
    const state = store.getState();
    const { token } = state.auth;
    
    // Call backend logout endpoint
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    // Clear frontend state regardless of backend response
    store.dispatch(logout());
    this.clearStorage();
  }

  clearStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
  }

  getToken() {
    return store.getState().auth.token;
  }

  isAuthenticated() {
    const state = store.getState();
    return state.auth.isAuthenticated && state.auth.token;
  }

  getUser() {
    return store.getState().auth.user;
  }

  hasRole(role) {
    const user = this.getUser();
    return user && user.role === role;
  }

  hasAnyRole(roles) {
    const user = this.getUser();
    return user && roles.includes(user.role);
  }
}

export default new AuthService();
```

### Real-time Features Foundation
```javascript
// services/websocketService.js
import { store } from '../store';
import authService from './authService';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 seconds
    this.heartbeatInterval = null;
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const token = authService.getToken();
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    this.socket = new WebSocket(`${wsUrl}?token=${token}`);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'order:updated':
        // Invalidate RTK Query cache for orders
        store.dispatch(store.getState().api.endpoints.getOrders.util.invalidateQueries());
        break;
        
      case 'listing:updated':
        // Invalidate RTK Query cache for listings
        store.dispatch(store.getState().api.endpoints.getListings.util.invalidateQueries());
        break;
        
      case 'notification:new':
        // Add notification to store
        console.log('New notification:', payload);
        break;
        
      default:
        console.log('Unknown message type:', type, payload);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && authService.isAuthenticated()) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts); // Exponential backoff
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.stopHeartbeat();
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  // Subscribe to specific events
  subscribeToUserEvents(userId) {
    this.send({
      type: 'subscribe',
      channel: `user:${userId}`,
    });
  }

  subscribeToOrderUpdates(orderId) {
    this.send({
      type: 'subscribe',
      channel: `order:${orderId}`,
    });
  }
}

export default new WebSocketService();
```

### Application Bootstrap with Token Validation
```javascript
// App.jsx - Enhanced with authentication and real-time features
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useGetCurrentUserQuery } from './store/api/apiSlice';
import { selectAuth, selectIsTokenExpired } from './store/slices/authSlice';
import websocketService from './services/websocketService';
import authService from './services/authService';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector(selectAuth);
  const isTokenExpired = useSelector(selectIsTokenExpired);
  
  // Validate current user on app start if token exists
  const { 
    data: currentUser, 
    isLoading, 
    error 
  } = useGetCurrentUserQuery(undefined, {
    skip: !isAuthenticated || !token,
  });

  useEffect(() => {
    // Initialize authentication from localStorage
    authService.initializeFromStorage();
    
    // Connect to WebSocket if authenticated
    if (isAuthenticated && token) {
      websocketService.connect();
      
      if (user?.id) {
        websocketService.subscribeToUserEvents(user.id);
      }
    }
    
    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated, token, user?.id]);

  // Handle token expiration
  useEffect(() => {
    if (isTokenExpired && isAuthenticated) {
      console.log('Token expired, attempting refresh...');
      authService.refreshToken();
    }
  }, [isTokenExpired, isAuthenticated]);

  // Handle authentication errors
  useEffect(() => {
    if (error && error.status === 401) {
      console.log('Authentication failed, logging out...');
      authService.logout();
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bottle-green/20 border-t-bottle-green"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Your routes here */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

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

### UI Consistency (Brand DNA)
- **Minimalistic Philosophy**: Every pixel serves a purpose - if it doesn't add value, remove it
- **Futuristic Touches**: Embrace glassmorphism, subtle glows, and organic curves
- **Invisible Interactions**: The best interface is the one users don't notice
- **Breathing Room**: White space is not empty space - it's a design element
- **Brand Colors**: Use the earth-tech palette consistently but sparingly
- **Touch Excellence**: All interactions must feel responsive and delightful
- **Accessibility**: Beautiful design that works for everyone
- **Performance**: Smooth 60fps animations, optimized for mobile
- **Organic Tech**: Blend natural forms with digital precision
- **Spatial Awareness**: Use depth and layering to create visual hierarchy

### Critical Implementation Notes

#### Futuristic Minimalism Guidelines
1. **Less is Exponentially More**: Start with nothing, add only what's essential
2. **Invisible Design**: Users should accomplish tasks without thinking about the interface
3. **Organic Curves**: Prefer rounded corners (16px-32px) over sharp edges
4. **Depth Through Layers**: Use backdrop-blur, shadows, and transparency for depth
5. **Micro-Interactions**: Every touch should provide subtle, meaningful feedback
6. **Breathing Typography**: Generous line-height (1.6-1.8) and letter-spacing
7. **Color Restraint**: Use brand colors as accents, not dominants
8. **Motion Purpose**: Animate to guide attention or communicate state changes
9. **Glass Aesthetics**: Incorporate glassmorphism for modern depth
10. **Touch-First**: Design for fingers, adapt for mouse

#### Component Philosophy
- **Invisible Until Needed**: Elements appear only when relevant (contextual menus, progressive disclosure)
- **Gesture-Driven**: Embrace swipes, pulls, and natural mobile interactions
- **Anticipatory Design**: Interface adapts to user behavior and context
- **Zero Learning Curve**: Intuitive interactions that feel natural
- **Emotional Connection**: Subtle animations that make users smile
- **Progressive Enhancement**: Start minimal, reveal complexity when needed