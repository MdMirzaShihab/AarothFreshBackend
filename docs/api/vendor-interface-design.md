# Aaroth Fresh Vendor Interface Design Documentation

**Navigation**: [Components & Technical Guidelines →](./vendor-interface-components.md)

## Executive Overview

This comprehensive documentation provides frontend developers with complete specifications for building the Aaroth Fresh vendor interface - a cutting-edge B2B marketplace portal that embodies "Organic Futurism" design philosophy while delivering exceptional user experience for vegetable vendors.

### Design Philosophy: Organic Futurism for B2B

The vendor interface merges the natural essence of fresh produce with minimalistic, futuristic digital experiences optimized for modern B2B workflows.

#### Core Principles
- **Radical Simplicity**: Every element serves a purpose - eliminate everything else
- **Invisible Interfaces**: Interactions feel magical and effortless
- **Mobile-First B2B**: Optimized for vendors managing business on mobile devices
- **Glassmorphic Depth**: Professional interfaces with 5-layer transparency system
- **Breathing Room**: Embrace negative space as a design element
- **Performance Excellence**: 60fps animations optimized for all devices

---

## Technology Stack & Integration

**Frontend Foundation (Already Configured):**
- **Framework**: Vanilla JavaScript + React.js + Vite build system
- **Styling**: TailwindCSS with custom Aaroth Fresh color palette (see config below)
- **Components**: Extend existing components in `src/components/ui/`, `src/components/forms/`, `src/components/layout/`
- **API Integration**: REST API integration with existing frontend patterns
- **Authentication**: JWT Bearer tokens with phone-based vendor login
- **File Structure**: Follow existing `src/` directory structure and naming conventions

**Integration Notes:**
- Build vendor interfaces by **extending existing components** rather than creating new ones
- Use **existing routing patterns** and add vendor-specific routes
- Follow **established API integration patterns** from current frontend
- Maintain **consistent styling** with existing TailwindCSS configuration

---

## TailwindCSS Color System (Pre-configured)

**Important**: Use the exact color names from the frontend's TailwindCSS configuration. All colors below are already defined and available:

### Primary Colors
```javascript
// Use these exact Tailwind classes in your components:
// Brown variants
'brown-600'        // #8C644A - Dark accents, emphasis
'amber-100'        // #F5ECD9 - Soft backgrounds, cards  
'amber-400'        // #D4A373 - Warm highlights
'stone-200'        // #E6D5B8 - Subtle differentiation

// Olive-centered palette (primary brand colors)
'olive-600'        // #7f8966 - Primary brand color
'olive-400'        // #9CAF88 - Success indicators
'orange-400'       // #A0826D - Warning states

// Text colors (standard Tailwind)
'gray-800'         // #1F2937 - Primary text
'white'            // #FFFFFF - Light text
'gray-600'         // #4B5563 - Secondary text
'red-500'          // #EF4444 - Critical alerts
'amber-500'        // #F59E0B - Warnings
```

### Glassmorphism & Effects with Standard TailwindCSS
```javascript
// Use standard Tailwind classes for glass effects:
'bg-white/80 backdrop-blur-sm'        // Light glassmorphism
'bg-white/60 backdrop-blur-md'        // Medium glassmorphism
'bg-white/40 backdrop-blur-lg'        // Strong glassmorphism
'bg-gray-900/80 backdrop-blur-sm'     // Dark mode glass

// Shadow & Glow Effects using standard Tailwind:
'shadow-lg shadow-olive-200/40'       // Olive glow effect
'shadow-md shadow-olive-100/30'       // Soft olive shadow
'shadow-xl shadow-gray-900/10'        // Professional depth
'hover:shadow-lg hover:shadow-olive-200/40' // Hover interactions

// Focus & Interaction states:
'focus:ring-2 focus:ring-olive-500/20 focus:border-olive-500'
'focus:outline-none'                  // Clean focus states
'touch-pan-y'                         // Mobile-friendly interactions
```

---

## Authentication & Onboarding Interface

### Login Screen - Minimalistic Entry Point

```javascript
// src/components/vendor/LoginScreen.jsx - Extend existing auth components
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, Leaf, Loader } from 'lucide-react';
import FloatingLabelInput from '../ui/FloatingLabelInput';

const VendorLoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Integrate with existing auth API pattern
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      
      const data = await response.json();
      if (data.success) {
        // Follow existing auth storage pattern
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('userRole', data.data.user.role);
        navigate('/vendor/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/20 via-white to-olive-50/10 
                    flex items-center justify-center p-6">
      {/* Floating Glass Card */}
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md border shadow-xl shadow-gray-900/10 
                      animate-fade-in backdrop-blur-xl">
        
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-olive-600 to-olive-700 rounded-2xl mx-auto mb-4 
                          flex items-center justify-center">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Vendor Portal</h1>
          <p className="text-gray-600 text-sm">Aaroth Fresh B2B Marketplace</p>
        </div>

        {/* Login Form */}
        <form className="space-y-6">
          {/* Phone Input with Floating Label */}
          <FloatingLabelInput
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={setPhone}
            icon={Phone}
            placeholder="+8801234567890"
            required
          />

          {/* Password Input */}
          <FloatingLabelInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            icon={Lock}
            required
          />

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-olive-600 to-olive-700 text-white py-4 rounded-2xl 
                       font-medium transition-all duration-300 hover:shadow-lg hover:shadow-olive-200/40 
                       hover:-translate-y-0.5 disabled:opacity-50 touch-target"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="w-5 h-5 animate-spin" />
                <span>Signing In...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <button 
              type="button"
              className="text-olive-600 hover:text-olive-600/80 text-sm 
                         transition-colors duration-200"
            >
              Forgot Password?
            </button>
          </div>
        </form>

        {/* Registration Link */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-gray-600 text-sm mb-3">New to Aaroth Fresh?</p>
          <button className="text-olive-600 hover:text-olive-600/80 font-medium 
                             transition-colors duration-200">
            Register Your Business
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Registration Flow - Multi-Step Onboarding

```javascript
// src/components/vendor/VendorRegistration.jsx - Multi-step registration form
import { useState } from 'react';
import { User, Building, FileText, Shield } from 'lucide-react';

const VendorRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    personalInfo: {},
    businessInfo: {},
    documents: {},
    verification: {}
  });
  
  // Registration API integration
  const handleRegistration = async (stepData) => {
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData)
      });
      return await response.json();
    } catch (error) {
      console.error('Registration step failed:', error);
      return { success: false, error: error.message };
    }
  };

  const steps = [
    { id: 1, title: 'Personal Details', icon: User },
    { id: 2, title: 'Business Information', icon: Building },
    { id: 3, title: 'Documents Upload', icon: FileText },
    { id: 4, title: 'Verification', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/10 to-olive-50/5 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Progress Header */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 mb-8 border">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Join Aaroth Fresh</h1>
            <span className="text-gray-600 text-sm">Step {currentStep} of {steps.length}</span>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center 
                                transition-all duration-300 ${
                  currentStep >= step.id 
                    ? 'bg-gradient-to-r from-olive-600 to-olive-700 text-white shadow-lg shadow-olive-200/40' 
                    : 'bg-white/60 backdrop-blur-sm text-gray-600'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="ml-3">
                  <p className={`font-medium text-sm ${
                    currentStep >= step.id ? 'text-olive-600' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-6 transition-all duration-500 ${
                    currentStep > step.id ? 'bg-olive-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 border shadow-lg shadow-gray-900/10">
          {currentStep === 1 && <PersonalInfoStep />}
          {currentStep === 2 && <BusinessInfoStep />}
          {currentStep === 3 && <DocumentsUploadStep />}
          {currentStep === 4 && <VerificationStep />}
        </div>
      </div>
    </div>
  );
};
```

---

## Dashboard Analytics Interface

### Main Dashboard - Command Center

```javascript
// src/pages/vendor/Dashboard.jsx - Main vendor dashboard
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, ShoppingBag, DollarSign, Calculator, 
  Plus, Package, ClipboardList, BarChart, Bell 
} from 'lucide-react';
import MetricCard from '../../components/vendor/MetricCard';
import NotificationBell from '../../components/ui/NotificationBell';

const VendorDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState(null);
  const navigate = useNavigate();
  
  // Fetch dashboard data from vendor-dashboard API
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/v1/vendor-dashboard/overview?period=month', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const result = await response.json();
        if (result.success) {
          setDashboardData(result.data);
        }
      } catch (error) {
        console.error('Dashboard fetch failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/5 to-white">
      
      {/* Header with Notifications */}
      <header className="bg-white/60 backdrop-blur-sm border-b border-white/10 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-gray-600 text-sm">Welcome back, Fresh Vegetables Ltd</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-4">
              <NotificationBell count={notifications?.summary.unread} />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Revenue"
            value={dashboardData?.keyMetrics.revenue.current}
            growth={dashboardData?.keyMetrics.revenue.growth}
            icon={TrendingUp}
            format="currency"
            loading={isLoading}
          />
          <MetricCard
            title="Orders"
            value={dashboardData?.keyMetrics.orders.current}
            growth={dashboardData?.keyMetrics.orders.growth}
            icon={ShoppingBag}
            format="number"
            loading={isLoading}
          />
          <MetricCard
            title="Profit Margin"
            value={dashboardData?.keyMetrics.profit.margin}
            growth={dashboardData?.keyMetrics.profit.growth}
            icon={DollarSign}
            format="percentage"
            loading={isLoading}
          />
          <MetricCard
            title="Avg Order Value"
            value={dashboardData?.keyMetrics.averageOrderValue}
            icon={Calculator}
            format="currency"
            loading={isLoading}
          />
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Revenue Trend Chart */}
          <div className="lg:col-span-2">
            <ChartCard
              title="Revenue Trends"
              subtitle="Last 30 days performance"
              className="h-80"
            >
              <RevenueChart data={dashboardData?.revenueData} />
            </ChartCard>
          </div>

          {/* Inventory Health */}
          <div>
            <InventoryHealthCard data={dashboardData?.inventoryHealth} />
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent Orders */}
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Recent Orders</h3>
              <Link to="/orders" className="text-olive-600 hover:text-olive-600/80 
                                           text-sm font-medium transition-colors">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {dashboardData?.recentActivity.recentOrders.map(order => (
                <OrderListItem key={order.id} order={order} />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <QuickActionCard
                title="Add Product"
                description="List new product"
                icon={Plus}
                onClick={() => navigate('/products/create')}
                className="hover:shadow-lg hover:shadow-olive-200/40"
              />
              <QuickActionCard
                title="Update Inventory"
                description="Stock management"
                icon={Package}
                onClick={() => navigate('/inventory')}
                className="hover:shadow-lg shadow-olive-200/30"
              />
              <QuickActionCard
                title="View Orders"
                description="Process pending"
                icon={ClipboardList}
                onClick={() => navigate('/orders?status=pending')}
                className="hover:shadow-lg shadow-orange-200/40"
                badge={dashboardData?.summary.pendingOrders}
              />
              <QuickActionCard
                title="Analytics"
                description="Detailed reports"
                icon={BarChart}
                onClick={() => navigate('/analytics')}
                className="hover:shadow-lg shadow-amber-200/40"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
```

### Metric Card Component - Glassmorphic Design

```javascript
// src/components/vendor/MetricCard.jsx - Reusable metric display component
import { TrendingUp } from 'lucide-react';

const MetricCard = ({ 
  title, 
  value, 
  growth, 
  icon: Icon, 
  format = 'number', 
  loading = false 
}) => {
  const formatValue = (val: number | string) => {
    if (loading) return '---';
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return `৳${val.toLocaleString()}`;
      case 'percentage':
        return `${val}%`;
      default:
        return val.toLocaleString();
    }
  };

  const getGrowthColor = (growth?: number) => {
    if (!growth) return 'text-gray-600';
    return growth > 0 ? 'text-olive-400' : 'text-red-500';
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border shadow-lg shadow-gray-900/10 
                    hover:shadow-xl shadow-gray-900/10 hover:bg-white/80 backdrop-blur-lg transition-all duration-300 
                    hover:-translate-y-1 group">
      
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-gradient-to-br from-olive-600/10 to-olive-50/10 
                        rounded-2xl group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-olive-600" />
        </div>
        
        {growth !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${getGrowthColor(growth)}`}>
            <TrendingUp className={`w-4 h-4 ${growth < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(growth)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-gray-600 text-sm font-medium tracking-wide uppercase">
          {title}
        </h3>
        
        {loading ? (
          <div className="animate-pulse bg-amber-100 rounded-lg h-8 w-24"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-800 group-hover:text-olive-600 
                        transition-colors duration-300">
            {formatValue(value)}
          </p>
        )}
      </div>
    </div>
  );
};
```

---

## Inventory Management Interface

### Inventory Overview - Smart Monitoring

```javascript
// src/pages/vendor/Inventory.jsx - Inventory management interface
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Download, Plus, Filter, AlertTriangle, Package, 
  DollarSign, AlertCircle, XCircle, Settings, MoreVertical 
} from 'lucide-react';
import SearchInput from '../../components/ui/SearchInput';
import Select from '../../components/ui/Select';
import ToggleSwitch from '../../components/ui/ToggleSwitch';

const VendorInventory = () => {
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    lowStock: false
  });
  const [inventory, setInventory] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch inventory data from API
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const queryParams = new URLSearchParams({
          status: filters.status,
          search: filters.search,
          lowStock: filters.lowStock.toString(),
          page: '1',
          limit: '20'
        });
        
        const response = await fetch(`/api/v1/inventory?${queryParams}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        if (result.success) {
          setInventory(result.data);
        }
      } catch (error) {
        console.error('Inventory fetch failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInventory();
  }, [filters]);

  return (
    <div className="space-y-8">
      
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Inventory</h1>
          <p className="text-gray-600">Manage your product stock and supplies</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="bg-white/70 backdrop-blur-md px-4 py-3 rounded-xl text-olive-600 hover:bg-white/70 backdrop-blur-md 
                             transition-all duration-200 flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          
          <button className="bg-gradient-to-r from-olive-600 to-olive-700 text-white px-6 py-3 rounded-xl 
                             font-medium hover:shadow-lg hover:shadow-olive-200/40 hover:-translate-y-0.5 
                             transition-all duration-300 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Purchase
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alerts?.summary.criticalAlerts > 0 && (
        <div className="bg-white/70 backdrop-blur-md border-l-4 border-red-400 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-800">
                {alerts.summary.criticalAlerts} Critical Alert{alerts.summary.criticalAlerts > 1 ? 's' : ''}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Some products need immediate attention
              </p>
            </div>
            <Link to="/inventory/alerts" 
                  className="ml-auto text-red-500 hover:text-red-500/80 
                             font-medium text-sm transition-colors">
              View All
            </Link>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Items"
          value={inventory?.summary.totalItems}
          icon={Package}
          loading={isLoading}
        />
        <SummaryCard
          title="Total Value"
          value={inventory?.summary.totalValue}
          format="currency"
          icon={DollarSign}
          loading={isLoading}
        />
        <SummaryCard
          title="Low Stock"
          value={inventory?.summary.lowStockItems}
          icon={AlertCircle}
          className="border-amber-500/20"
          loading={isLoading}
        />
        <SummaryCard
          title="Out of Stock"
          value={inventory?.summary.outOfStockItems}
          icon={XCircle}
          className="border-red-400/20"
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-olive-600" />
            <span className="text-gray-800 font-medium">Filters:</span>
          </div>
          
          <SearchInput
            placeholder="Search products..."
            value={filters.search}
            onChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
            className="flex-1 min-w-[200px]"
          />
          
          <Select
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'low_stock', label: 'Low Stock' },
              { value: 'out_of_stock', label: 'Out of Stock' }
            ]}
          />
          
          <ToggleSwitch
            label="Low Stock Only"
            checked={filters.lowStock}
            onChange={(checked) => setFilters(prev => ({ ...prev, lowStock: checked }))}
          />
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => <InventoryCardSkeleton key={i} />)
        ) : (
          inventory?.inventory.map(item => (
            <InventoryCard key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
};
```

### Inventory Item Card - Status Indicators

```javascript
// src/components/vendor/InventoryCard.jsx - Individual inventory item card
import { Settings, MoreVertical } from 'lucide-react';

const InventoryCard = ({ item }) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      active: { 
        color: 'text-olive-400', 
        bg: 'bg-olive-400/10', 
        border: 'border-olive-200/30' 
      },
      low_stock: { 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/30' 
      },
      out_of_stock: { 
        color: 'text-red-500', 
        bg: 'bg-red-500/10', 
        border: 'border-red-400/30' 
      }
    };
    return configs[status] || configs.active;
  };

  const statusConfig = getStatusConfig(item.status);
  const stockPercentage = (item.availableQuantity / item.reorderLevel) * 100;

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border hover:shadow-lg hover:shadow-olive-200/40 
                    transition-all duration-300 hover:-translate-y-1 group">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 group-hover:text-olive-600 
                         transition-colors duration-200 truncate">
            {item.productId.name}
          </h3>
          <p className="text-gray-600 text-sm">{item.productId.category}</p>
        </div>
        
        <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
          {item.status.replace('_', ' ')}
        </div>
      </div>

      {/* Stock Information */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Available</span>
          <span className="font-semibold text-gray-800">
            {item.availableQuantity} {item.productId.unit}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Total Value</span>
          <span className="font-semibold text-gray-800">
            ৳{item.totalValue.toLocaleString()}
          </span>
        </div>

        {/* Stock Level Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Stock Level</span>
            <span>{Math.round(stockPercentage)}%</span>
          </div>
          <div className="w-full bg-amber-100/30 rounded-full h-2">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                stockPercentage > 50 ? 'bg-olive-400' : 
                stockPercentage > 25 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {item.alerts && item.alerts.length > 0 && (
        <div className="mb-4">
          {item.alerts.slice(0, 1).map(alert => (
            <div key={alert.id} className={`p-3 rounded-xl ${
              alert.severity === 'high' ? 'bg-red-500/5 border border-red-400/20' :
              alert.severity === 'medium' ? 'bg-amber-500/5 border border-amber-500/20' :
              'bg-blue-50/50 border border-blue-200/30'
            }`}>
              <p className="text-xs font-medium text-gray-800">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="flex-1 bg-white/70 backdrop-blur-md py-2 px-3 rounded-xl text-sm font-medium 
                           text-olive-600 hover:bg-white/70 backdrop-blur-md transition-all duration-200">
          Update Stock
        </button>
        <button className="p-2 bg-white/70 backdrop-blur-md rounded-xl hover:bg-white/70 backdrop-blur-md transition-all duration-200">
          <Settings className="w-4 h-4 text-gray-600" />
        </button>
        <button className="p-2 bg-white/70 backdrop-blur-md rounded-xl hover:bg-white/70 backdrop-blur-md transition-all duration-200">
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};
```

---

## Product Listings Management Interface

### Listings Overview - Visual Product Catalog

```javascript
// src/pages/vendor/Listings.jsx - Product listings management
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, Grid, List } from 'lucide-react';
import ViewToggle from '../../components/ui/ViewToggle';
import FilterBar from '../../components/vendor/FilterBar';

const VendorListings = () => {
  const [view, setView] = useState('grid');
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all', 
    search: ''
  });
  const [listings, setListings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch listings from API
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const queryParams = new URLSearchParams({
          search: filters.search,
          category: filters.category,
          status: filters.status,
          page: '1',
          limit: '20'
        });
        
        const response = await fetch(`/api/v1/listings?${queryParams}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        if (result.success) {
          setListings(result.data);
        }
      } catch (error) {
        console.error('Listings fetch failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchListings();
  }, [filters]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Product Listings</h1>
          <p className="text-gray-600">Manage your product catalog and pricing</p>
        </div>
        
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          
          <button className="bg-gradient-to-r from-olive-600 to-olive-700 text-white px-6 py-3 rounded-xl 
                             font-medium hover:shadow-lg hover:shadow-olive-200/40 hover:-translate-y-0.5 
                             transition-all duration-300 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Listing
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <QuickStat 
          label="Total Listings" 
          value={listings?.summary.totalListings} 
          loading={isLoading}
        />
        <QuickStat 
          label="Active" 
          value={listings?.summary.activeListings} 
          className="text-olive-400"
          loading={isLoading}
        />
        <QuickStat 
          label="Draft" 
          value={listings?.summary.draftListings} 
          className="text-amber-500"
          loading={isLoading}
        />
        <QuickStat 
          label="Out of Stock" 
          value={listings?.summary.outOfStockListings} 
          className="text-red-500"
          loading={isLoading}
        />
        <QuickStat 
          label="Avg Rating" 
          value={listings?.summary.avgRating} 
          format="rating"
          loading={isLoading}
        />
      </div>

      {/* Filters & Search */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        categories={listings?.filters.categories}
      />

      {/* Listings Display */}
      {isLoading ? (
        <LoadingGrid view={view} />
      ) : view === 'grid' ? (
        <ListingsGrid listings={listings?.listings} />
      ) : (
        <ListingsList listings={listings?.listings} />
      )}
    </div>
  );
};
```

### Listing Card - Performance Focused

```javascript
// src/components/vendor/ListingCard.jsx - Product listing card component
import { Edit, Eye, Share, Star, Settings } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

const ListingCard = ({ listing, onEdit, onDelete }) => {
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-3xl overflow-hidden hover:shadow-lg hover:shadow-olive-200/40 
                    transition-all duration-300 hover:-translate-y-1 group">
      
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={listing.productId.images?.[0] || '/placeholder-product.jpg'}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 
                     group-hover:scale-110"
        />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={listing.status} variant="glass" />
        </div>
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-white/70 backdrop-blur-md px-3 py-1 rounded-full 
                        text-white font-semibold backdrop-blur-sm">
          ৳{listing.price.selling}
        </div>
        
        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 
                        transition-opacity duration-300 flex items-center justify-center">
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit?.(listing)}
              className="p-3 bg-white/80 backdrop-blur-lg rounded-xl text-white hover:bg-white/40 backdrop-blur-lg 
                         transition-all duration-200"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              className="p-3 bg-white/80 backdrop-blur-lg rounded-xl text-white hover:bg-white/40 backdrop-blur-lg 
                         transition-all duration-200"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              className="p-3 bg-white/80 backdrop-blur-lg rounded-xl text-white hover:bg-white/40 backdrop-blur-lg 
                         transition-all duration-200"
            >
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        
        {/* Title & Category */}
        <div>
          <h3 className="font-semibold text-gray-800 group-hover:text-olive-600 
                         transition-colors duration-200 line-clamp-2 mb-1">
            {listing.title}
          </h3>
          <p className="text-gray-600 text-sm">{listing.productId.category}</p>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-white/10">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">
              {listing.performance.totalOrders}
            </p>
            <p className="text-xs text-gray-600">Orders</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="text-lg font-bold text-gray-800">
                {listing.performance.rating.average}
              </span>
            </div>
            <p className="text-xs text-gray-600">Rating</p>
          </div>
        </div>

        {/* Revenue & Profit */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Revenue</span>
            <span className="font-semibold text-olive-400">
              ৳{listing.profitAnalytics.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Profit</span>
            <span className="font-semibold text-olive-600">
              ৳{listing.profitAnalytics.grossProfit.toLocaleString()} 
              ({listing.profitAnalytics.profitMargin}%)
            </span>
          </div>
        </div>

        {/* Stock Status */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              listing.inventory.available > 20 ? 'bg-olive-400' :
              listing.inventory.available > 0 ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600">
              {listing.inventory.available} {listing.inventory.unit} in stock
            </span>
          </div>
          
          {/* Quick Edit Button */}
          <button 
            onClick={() => onEdit?.(listing)}
            className="p-2 bg-white/70 backdrop-blur-md rounded-lg hover:bg-white/70 backdrop-blur-md transition-all duration-200 
                       opacity-0 group-hover:opacity-100"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Order Management Workflow Interface

### Orders Dashboard - Process-Oriented Design

```javascript
// src/pages/vendor/Orders.jsx - Order management interface
import { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Play, Package, Truck, Clock,
  Building, User, MapPin, Calendar, MessageSquare, Eye, MoreHorizontal
} from 'lucide-react';
import BulkActionButton from '../../components/vendor/BulkActionButton';

const VendorOrders = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [orders, setOrders] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch orders data from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const queryParams = new URLSearchParams({
          status: activeTab === 'all' ? '' : activeTab,
          page: '1',
          limit: '20'
        });
        
        const response = await fetch(`/api/v1/orders?${queryParams}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        if (result.success) {
          setOrders(result.data);
        }
      } catch (error) {
        console.error('Orders fetch failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrders();
  }, [activeTab]);
  
  // Order status update function
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const result = await response.json();
      if (result.success) {
        // Refresh orders list
        fetchOrders();
      }
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const statusTabs = [
    { id: 'all', label: 'All Orders', count: orderStats?.summary.totalOrders },
    { id: 'pending', label: 'Pending', count: orderStats?.summary.pendingOrders, color: 'amber-500' },
    { id: 'confirmed', label: 'Confirmed', count: orderStats?.summary.confirmedOrders, color: 'blue-500' },
    { id: 'processing', label: 'Processing', count: orderStats?.summary.processingOrders, color: 'olive-600' },
    { id: 'ready', label: 'Ready', count: orderStats?.summary.readyOrders, color: 'sage-green' },
    { id: 'delivered', label: 'Delivered', count: orderStats?.summary.deliveredOrders, color: 'green-600' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Orders</h1>
          <p className="text-gray-600">Manage and track your order fulfillment</p>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">
              ৳{orderStats?.summary.totalRevenue?.toLocaleString()}
            </p>
            <p className="text-gray-600 text-sm">Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">
              {orderStats?.summary.totalOrders}
            </p>
            <p className="text-gray-600 text-sm">Total Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-olive-400">
              ৳{orderStats?.summary.avgOrderValue?.toFixed(0)}
            </p>
            <p className="text-gray-600 text-sm">Avg Value</p>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-2 border">
        <div className="flex overflow-x-auto gap-1">
          {statusTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap 
                         font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-olive-600 text-white shadow-lg shadow-olive-200/40'
                  : 'hover:bg-white/70 backdrop-blur-md text-gray-600 hover:text-gray-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id 
                    ? 'bg-white/20 text-white' 
                    : 'bg-amber-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-olive-600/20 rounded-full flex items-center justify-center">
                <span className="text-olive-600 font-medium text-sm">
                  {selectedOrders.length}
                </span>
              </div>
              <span className="text-gray-800 font-medium">
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <BulkActionButton
                label="Mark Ready"
                icon={CheckCircle}
                onClick={() => handleBulkStatusUpdate('ready')}
              />
              <BulkActionButton
                label="Export"
                icon={Download}
                onClick={() => handleBulkExport()}
              />
              <button
                onClick={() => setSelectedOrders([])}
                className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => <OrderCardSkeleton key={i} />)
        ) : (
          orders?.orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selectedOrders.includes(order.id)}
              onSelect={(selected) => {
                if (selected) {
                  setSelectedOrders(prev => [...prev, order.id]);
                } else {
                  setSelectedOrders(prev => prev.filter(id => id !== order.id));
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
```

### Order Card - Status-Driven Workflow

```javascript
// src/components/vendor/OrderCard.jsx - Individual order card component
import { format } from 'date-fns';
import StatusActionButton from '../ui/StatusActionButton';

const OrderCard = ({ order, selected, onSelect, onStatusUpdate }) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
      confirmed: { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
      processing: { color: 'text-olive-600', bg: 'bg-olive-600/10', border: 'border-olive-500/30' },
      ready: { color: 'text-olive-400', bg: 'bg-olive-400/10', border: 'border-olive-200/30' },
      delivered: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      cancelled: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-400/30' }
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const isUrgent = order.priority === 'urgent' || order.priority === 'high';

  return (
    <div className={`bg-white/70 backdrop-blur-md rounded-3xl p-6 border transition-all duration-300 
                     hover:shadow-lg hover:shadow-olive-200/40 hover:-translate-y-0.5 ${
                       selected ? 'ring-2 ring-olive-500/30 shadow-lg shadow-olive-200/40' : ''
                     } ${isUrgent ? 'border-l-4 border-l-red-500' : ''}`}>
      
      <div className="flex items-start gap-4">
        
        {/* Selection Checkbox */}
        <div className="flex items-center pt-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 rounded border-2 border-gray-300/30 
                       text-olive-600 focus:ring-olive-500/20"
          />
        </div>

        {/* Order Content */}
        <div className="flex-1 min-w-0">
          
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-800">
                {order.orderNumber}
              </h3>
              
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                {order.status.replace('_', ' ')}
              </div>
              
              {isUrgent && (
                <div className="flex items-center gap-1 text-red-500">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">URGENT</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-lg font-bold text-gray-800">
                ৳{order.pricing.totalAmount.toLocaleString()}
              </p>
              <p className="text-gray-600 text-sm">
                {order.items.length} item{order.items.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Customer & Timeline */}
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            
            {/* Customer Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-olive-600" />
                {order.customer.restaurantName}
              </h4>
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <User className="w-3 h-3" />
                {order.customer.contactPerson}
              </p>
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                {order.delivery.address.area}, {order.delivery.address.city}
              </p>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-3 h-3 text-olive-600" />
                <span className="text-gray-600">Placed:</span>
                <span className="text-gray-800 font-medium">
                  {format(new Date(order.timeline.orderPlaced), 'MMM dd, HH:mm')}
                </span>
              </div>
              
              {order.timeline.estimatedDelivery && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-3 h-3 text-olive-400" />
                  <span className="text-gray-600">Delivery:</span>
                  <span className="text-gray-800 font-medium">
                    {format(new Date(order.timeline.estimatedDelivery), 'MMM dd, HH:mm')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Items Preview */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {order.items.slice(0, 3).map(item => (
                <div key={item.id} className="bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs">
                  {item.productName} ({item.quantity}{item.unit})
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-600">
                  +{order.items.length - 3} more
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              
              {/* Status Actions */}
              {order.status === 'pending' && (
                <>
                  <StatusActionButton
                    label="Confirm"
                    icon={CheckCircle}
                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                    variant="success"
                  />
                  <StatusActionButton
                    label="Reject"
                    icon={XCircle}
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    variant="danger"
                  />
                </>
              )}
              
              {order.status === 'confirmed' && (
                <StatusActionButton
                  label="Start Processing"
                  icon={Play}
                  onClick={() => updateOrderStatus(order.id, 'processing')}
                  variant="primary"
                />
              )}
              
              {order.status === 'processing' && (
                <StatusActionButton
                  label="Mark Ready"
                  icon={Package}
                  onClick={() => updateOrderStatus(order.id, 'ready')}
                  variant="success"
                />
              )}
              
              {order.status === 'ready' && (
                <StatusActionButton
                  label="Start Delivery"
                  icon={Truck}
                  onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                  variant="primary"
                />
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-2">
              <button className="p-2 bg-white/70 backdrop-blur-md rounded-lg hover:bg-white/70 backdrop-blur-md transition-all duration-200">
                <MessageSquare className="w-4 h-4 text-gray-600" />
              </button>
              
              <button className="p-2 bg-white/70 backdrop-blur-md rounded-lg hover:bg-white/70 backdrop-blur-md transition-all duration-200">
                <Eye className="w-4 h-4 text-gray-600" />
              </button>
              
              <button className="p-2 bg-white/70 backdrop-blur-md rounded-lg hover:bg-white/70 backdrop-blur-md transition-all duration-200">
                <MoreHorizontal className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Communication Hub Interface

### Notifications Center - Unified Messaging

```javascript
// src/pages/vendor/Notifications.jsx - Notification center interface
import { useState, useEffect } from 'react';
import { 
  Bell, BellRing, AlertTriangle, CheckSquare, CheckCircle,
  Settings, Package, ShoppingBag, CreditCard, Clock,
  Eye, Archive, Trash2
} from 'lucide-react';

const VendorNotifications = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [notifications, setNotifications] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch notifications from API (assumes notifications endpoint exists)
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const queryParams = new URLSearchParams({
          type: activeTab === 'all' ? '' : activeTab,
          page: '1',
          limit: '20'
        });
        
        // Note: Update endpoint based on actual notifications API
        const response = await fetch(`/api/v1/vendor/notifications?${queryParams}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        if (result.success) {
          setNotifications(result.data);
        }
      } catch (error) {
        console.error('Notifications fetch failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNotifications();
  }, [activeTab]);

  const notificationTabs = [
    { id: 'all', label: 'All', count: notifications?.summary.total },
    { id: 'system', label: 'System', count: notifications?.summary.byType.system, icon: Settings },
    { id: 'inventory', label: 'Inventory', count: notifications?.summary.byType.inventory, icon: Package },
    { id: 'order', label: 'Orders', count: notifications?.summary.byType.order, icon: ShoppingBag },
    { id: 'payment', label: 'Payments', count: notifications?.summary.byType.payment, icon: CreditCard }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Notifications</h1>
          <p className="text-gray-600">Stay updated with your business alerts</p>
        </div>
        
        {notifications?.summary.unread > 0 && (
          <button className="bg-white/70 backdrop-blur-md px-4 py-2 rounded-xl text-olive-600 hover:bg-white/70 backdrop-blur-md 
                             transition-all duration-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total"
          value={notifications?.summary.total}
          icon={Bell}
        />
        <SummaryCard
          title="Unread"
          value={notifications?.summary.unread}
          icon={BellRing}
          className="border-olive-500/20"
        />
        <SummaryCard
          title="Urgent"
          value={notifications?.summary.urgent}
          icon={AlertTriangle}
          className="border-red-400/20"
        />
        <SummaryCard
          title="Action Required"
          value={notifications?.summary.actionRequired}
          icon={CheckSquare}
          className="border-amber-500/20"
        />
      </div>

      {/* Filter Tabs */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-2 border">
        <div className="flex overflow-x-auto gap-1">
          {notificationTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap 
                         font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-olive-600 text-white shadow-lg shadow-olive-200/40'
                  : 'hover:bg-white/70 backdrop-blur-md text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id 
                    ? 'bg-white/20 text-white' 
                    : 'bg-amber-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => <NotificationCardSkeleton key={i} />)
        ) : (
          notifications?.notifications.map(notification => (
            <NotificationCard
              key={notification.id}
              notification={notification}
            />
          ))
        )}
      </div>
    </div>
  );
};
```

### Notification Card - Contextual Alerts

```javascript
// src/components/vendor/NotificationCard.jsx - Individual notification display
import { formatDistanceToNow } from 'date-fns';
import { Package, ShoppingBag, CreditCard, Settings } from 'lucide-react';

const NotificationCard = ({ notification }) => {
  const getTypeConfig = (type: string) => {
    const configs = {
      inventory: { 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/5', 
        border: 'border-amber-500/20',
        icon: Package 
      },
      order: { 
        color: 'text-olive-600', 
        bg: 'bg-olive-600/5', 
        border: 'border-olive-500/20',
        icon: ShoppingBag 
      },
      payment: { 
        color: 'text-olive-400', 
        bg: 'bg-olive-400/5', 
        border: 'border-olive-200/20',
        icon: CreditCard 
      },
      system: { 
        color: 'text-blue-500', 
        bg: 'bg-blue-50', 
        border: 'border-blue-200',
        icon: Settings 
      }
    };
    return configs[type] || configs.system;
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      urgent: { color: 'text-red-500', bg: 'bg-red-500/10', pulse: true },
      high: { color: 'text-amber-500', bg: 'bg-amber-500/10', pulse: false },
      medium: { color: 'text-blue-500', bg: 'bg-blue-50', pulse: false },
      low: { color: 'text-gray-600', bg: 'bg-gray-50', pulse: false }
    };
    return configs[priority] || configs.medium;
  };

  const typeConfig = getTypeConfig(notification.type);
  const priorityConfig = getPriorityConfig(notification.priority);
  const IconComponent = typeConfig.icon;

  return (
    <div className={`bg-white/70 backdrop-blur-md rounded-2xl p-4 border transition-all duration-300 
                     hover:shadow-lg hover:shadow-olive-200/40 group ${
                       !notification.isRead ? 'border-l-4 border-l-olive-600' : ''
                     }`}>
      
      <div className="flex items-start gap-4">
        
        {/* Icon */}
        <div className={`p-3 rounded-2xl ${typeConfig.bg} ${typeConfig.border} border 
                        transition-transform duration-300 group-hover:scale-110 
                        ${priorityConfig.pulse ? 'animate-pulse' : ''}`}>
          <IconComponent className={`w-5 h-5 ${typeConfig.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-800' : 'text-gray-600'}`}>
                {notification.title}
              </h3>
              
              {notification.priority === 'urgent' && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full 
                               font-medium animate-pulse">
                  URGENT
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Message */}
          <p className={`text-sm mb-3 ${!notification.isRead ? 'text-gray-800' : 'text-gray-600'}`}>
            {notification.message}
          </p>

          {/* Metadata */}
          {notification.metadata && (
            <div className="mb-3">
              {notification.type === 'inventory' && notification.metadata.productName && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>Product: {notification.metadata.productName}</span>
                  {notification.metadata.currentStock !== undefined && (
                    <span>• Stock: {notification.metadata.currentStock}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              
              {notification.isActionRequired && notification.actionUrl && (
                <button className="bg-gradient-to-r from-olive-600 to-olive-700 text-white px-4 py-2 rounded-xl 
                                 text-sm font-medium hover:shadow-lg hover:shadow-olive-200/40 
                                 transition-all duration-300">
                  {notification.actionText || 'Take Action'}
                </button>
              )}
              
              {!notification.isRead && (
                <button className="text-olive-600 hover:text-olive-600/80 text-sm 
                                 font-medium transition-colors duration-200">
                  Mark as Read
                </button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 
                            transition-opacity duration-200">
              <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <Eye className="w-3 h-3 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <Archive className="w-3 h-3 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <Trash2 className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

**Continue reading**: [Component Library & Technical Guidelines →](./vendor-interface-components.md)
