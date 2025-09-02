# Aaroth Fresh Vendor Interface Design Documentation

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

## Technology Stack

- **Frontend**: React.js + TypeScript + Vite
- **Styling**: Tailwind CSS with Aaroth Fresh custom colors
- **State Management**: Zustand + TanStack Query
- **Authentication**: JWT with phone-based login
- **Real-time**: WebSocket connections for live updates
- **Charts**: Recharts with custom olive-themed styling

---

## Brand Color System (Vendor Interface)

### Primary Olive-Centered Palette
```css
/* Primary Earth-Tech Colors */
--earthy-brown: #8C644A;      /* Dark accents, emphasis elements */
--earthy-beige: #F5ECD9;      /* Soft backgrounds, cards */
--earthy-yellow: #D4A373;     /* Warm highlights, success states */
--earthy-tan: #E6D5B8;        /* Subtle differentiation */

/* Secondary Sophisticated Olive Palette */
--muted-olive: #7f8966;       /* Primary brand color, buttons, links */
--sage-green: #9CAF88;        /* Success indicators, positive metrics */
--dusty-cedar: #A0826D;       /* Warning states, attention elements */

/* Enhanced Utility Colors */
--text-dark: #3A2A1F;         /* Primary text */
--text-light: #FFFFFF;        /* Text on dark surfaces */
--text-muted: #6B7280;        /* Secondary information */
--tomato-red: #E94B3C;        /* Critical actions, alerts */
--amber-warm: #F59E0B;        /* Warning states */

/* Glassmorphism Enhancements */
--glass-white: rgba(255, 255, 255, 0.1);
--glass-dark: rgba(31, 41, 55, 0.8);
--glow-olive: #7f896620;      /* Subtle olive glow effects */
--shadow-soft: rgba(60, 42, 31, 0.08);
```

---

## Authentication & Onboarding Interface

### Login Screen - Minimalistic Entry Point

```typescript
// LoginScreen.tsx
const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-earthy-beige/20 via-white to-sage-green/10 
                    flex items-center justify-center p-6">
      {/* Floating Glass Card */}
      <div className="glass-4 rounded-3xl p-8 w-full max-w-md border shadow-depth-3 
                      animate-fade-in backdrop-blur-xl">
        
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-secondary rounded-2xl mx-auto mb-4 
                          flex items-center justify-center">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-dark mb-2">Vendor Portal</h1>
          <p className="text-text-muted text-sm">Aaroth Fresh B2B Marketplace</p>
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
            className="w-full bg-gradient-secondary text-white py-4 rounded-2xl 
                       font-medium transition-all duration-300 hover:shadow-glow-olive 
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
              className="text-muted-olive hover:text-muted-olive/80 text-sm 
                         transition-colors duration-200"
            >
              Forgot Password?
            </button>
          </div>
        </form>

        {/* Registration Link */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-text-muted text-sm mb-3">New to Aaroth Fresh?</p>
          <button className="text-muted-olive hover:text-muted-olive/80 font-medium 
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

```typescript
// VendorRegistration.tsx
const VendorRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    personalInfo: {},
    businessInfo: {},
    documents: {},
    verification: {}
  });

  const steps = [
    { id: 1, title: 'Personal Details', icon: User },
    { id: 2, title: 'Business Information', icon: Building },
    { id: 3, title: 'Documents Upload', icon: FileText },
    { id: 4, title: 'Verification', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-earthy-beige/10 to-sage-green/5 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Progress Header */}
        <div className="glass-2 rounded-3xl p-6 mb-8 border">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-text-dark">Join Aaroth Fresh</h1>
            <span className="text-text-muted text-sm">Step {currentStep} of {steps.length}</span>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center 
                                transition-all duration-300 ${
                  currentStep >= step.id 
                    ? 'bg-gradient-secondary text-white shadow-glow-olive' 
                    : 'glass-1 text-text-muted'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="ml-3">
                  <p className={`font-medium text-sm ${
                    currentStep >= step.id ? 'text-muted-olive' : 'text-text-muted'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-6 transition-all duration-500 ${
                    currentStep > step.id ? 'bg-muted-olive' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="glass-3 rounded-3xl p-8 border shadow-depth-2">
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

```typescript
// VendorDashboard.tsx
const VendorDashboard = () => {
  const { data: dashboardData, isLoading } = useDashboardOverview();
  const { data: notifications } = useNotifications({ unreadOnly: true });

  return (
    <div className="min-h-screen bg-gradient-to-br from-earthy-beige/5 to-white">
      
      {/* Header with Notifications */}
      <header className="glass-1 border-b border-white/10 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-dark">Dashboard</h1>
              <p className="text-text-muted text-sm">Welcome back, Fresh Vegetables Ltd</p>
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
          <div className="glass-2 rounded-3xl p-6 border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-dark">Recent Orders</h3>
              <Link to="/orders" className="text-muted-olive hover:text-muted-olive/80 
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
          <div className="glass-2 rounded-3xl p-6 border">
            <h3 className="text-lg font-semibold text-text-dark mb-6">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <QuickActionCard
                title="Add Product"
                description="List new product"
                icon={Plus}
                onClick={() => navigate('/products/create')}
                className="hover:shadow-glow-olive"
              />
              <QuickActionCard
                title="Update Inventory"
                description="Stock management"
                icon={Package}
                onClick={() => navigate('/inventory')}
                className="hover:shadow-glow-sage"
              />
              <QuickActionCard
                title="View Orders"
                description="Process pending"
                icon={ClipboardList}
                onClick={() => navigate('/orders?status=pending')}
                className="hover:shadow-glow-cedar"
                badge={dashboardData?.summary.pendingOrders}
              />
              <QuickActionCard
                title="Analytics"
                description="Detailed reports"
                icon={BarChart}
                onClick={() => navigate('/analytics')}
                className="hover:shadow-glow-amber"
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

```typescript
// MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: number | string;
  growth?: number;
  icon: React.ComponentType<any>;
  format?: 'currency' | 'number' | 'percentage';
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, value, growth, icon: Icon, format = 'number', loading 
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
    if (!growth) return 'text-text-muted';
    return growth > 0 ? 'text-sage-green' : 'text-tomato-red';
  };

  return (
    <div className="glass-3 rounded-3xl p-6 border shadow-depth-2 
                    hover:shadow-depth-3 hover:glass-4 transition-all duration-300 
                    hover:-translate-y-1 group">
      
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-gradient-to-br from-muted-olive/10 to-sage-green/10 
                        rounded-2xl group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-muted-olive" />
        </div>
        
        {growth !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${getGrowthColor(growth)}`}>
            <TrendingUp className={`w-4 h-4 ${growth < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(growth)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="text-text-muted text-sm font-medium tracking-wide uppercase">
          {title}
        </h3>
        
        {loading ? (
          <div className="animate-pulse bg-earthy-beige rounded-lg h-8 w-24"></div>
        ) : (
          <p className="text-3xl font-bold text-text-dark group-hover:text-muted-olive 
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

```typescript
// InventoryOverview.tsx
const InventoryOverview = () => {
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    lowStock: false
  });
  
  const { data: inventory, isLoading } = useInventory(filters);
  const { data: alerts } = useInventoryAlerts();

  return (
    <div className="space-y-8">
      
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-dark mb-2">Inventory</h1>
          <p className="text-text-muted">Manage your product stock and supplies</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="glass-2 px-4 py-3 rounded-xl text-muted-olive hover:glass-3 
                             transition-all duration-200 flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          
          <button className="bg-gradient-secondary text-white px-6 py-3 rounded-xl 
                             font-medium hover:shadow-glow-olive hover:-translate-y-0.5 
                             transition-all duration-300 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Purchase
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alerts?.summary.criticalAlerts > 0 && (
        <div className="glass-2 border-l-4 border-tomato-red rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-tomato-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text-dark">
                {alerts.summary.criticalAlerts} Critical Alert{alerts.summary.criticalAlerts > 1 ? 's' : ''}
              </p>
              <p className="text-text-muted text-sm mt-1">
                Some products need immediate attention
              </p>
            </div>
            <Link to="/inventory/alerts" 
                  className="ml-auto text-tomato-red hover:text-tomato-red/80 
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
          className="border-amber-warm/20"
          loading={isLoading}
        />
        <SummaryCard
          title="Out of Stock"
          value={inventory?.summary.outOfStockItems}
          icon={XCircle}
          className="border-tomato-red/20"
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="glass-2 rounded-2xl p-4 border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-olive" />
            <span className="text-text-dark font-medium">Filters:</span>
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

```typescript
// InventoryCard.tsx
interface InventoryCardProps {
  item: InventoryItem;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item }) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      active: { 
        color: 'text-sage-green', 
        bg: 'bg-sage-green/10', 
        border: 'border-sage-green/30' 
      },
      low_stock: { 
        color: 'text-amber-warm', 
        bg: 'bg-amber-warm/10', 
        border: 'border-amber-warm/30' 
      },
      out_of_stock: { 
        color: 'text-tomato-red', 
        bg: 'bg-tomato-red/10', 
        border: 'border-tomato-red/30' 
      }
    };
    return configs[status] || configs.active;
  };

  const statusConfig = getStatusConfig(item.status);
  const stockPercentage = (item.availableQuantity / item.reorderLevel) * 100;

  return (
    <div className="glass-card rounded-3xl p-6 border hover:shadow-glow-olive 
                    transition-all duration-300 hover:-translate-y-1 group">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-dark group-hover:text-muted-olive 
                         transition-colors duration-200 truncate">
            {item.productId.name}
          </h3>
          <p className="text-text-muted text-sm">{item.productId.category}</p>
        </div>
        
        <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
          {item.status.replace('_', ' ')}
        </div>
      </div>

      {/* Stock Information */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-text-muted text-sm">Available</span>
          <span className="font-semibold text-text-dark">
            {item.availableQuantity} {item.productId.unit}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-text-muted text-sm">Total Value</span>
          <span className="font-semibold text-text-dark">
            ৳{item.totalValue.toLocaleString()}
          </span>
        </div>

        {/* Stock Level Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Stock Level</span>
            <span>{Math.round(stockPercentage)}%</span>
          </div>
          <div className="w-full bg-earthy-beige/30 rounded-full h-2">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                stockPercentage > 50 ? 'bg-sage-green' : 
                stockPercentage > 25 ? 'bg-amber-warm' : 'bg-tomato-red'
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
              alert.severity === 'high' ? 'bg-tomato-red/5 border border-tomato-red/20' :
              alert.severity === 'medium' ? 'bg-amber-warm/5 border border-amber-warm/20' :
              'bg-blue-50/50 border border-blue-200/30'
            }`}>
              <p className="text-xs font-medium text-text-dark">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="flex-1 glass-2 py-2 px-3 rounded-xl text-sm font-medium 
                           text-muted-olive hover:glass-3 transition-all duration-200">
          Update Stock
        </button>
        <button className="p-2 glass-2 rounded-xl hover:glass-3 transition-all duration-200">
          <Settings className="w-4 h-4 text-text-muted" />
        </button>
        <button className="p-2 glass-2 rounded-xl hover:glass-3 transition-all duration-200">
          <MoreVertical className="w-4 h-4 text-text-muted" />
        </button>
      </div>
    </div>
  );
};
```

---

## Product Listings Management Interface

### Listings Overview - Visual Product Catalog

```typescript
// ProductListings.tsx
const ProductListings = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: ''
  });

  const { data: listings, isLoading } = useListings(filters);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-dark mb-2">Product Listings</h1>
          <p className="text-text-muted">Manage your product catalog and pricing</p>
        </div>
        
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          
          <button className="bg-gradient-secondary text-white px-6 py-3 rounded-xl 
                             font-medium hover:shadow-glow-olive hover:-translate-y-0.5 
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
          className="text-sage-green"
          loading={isLoading}
        />
        <QuickStat 
          label="Draft" 
          value={listings?.summary.draftListings} 
          className="text-amber-warm"
          loading={isLoading}
        />
        <QuickStat 
          label="Out of Stock" 
          value={listings?.summary.outOfStockListings} 
          className="text-tomato-red"
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

```typescript
// ListingCard.tsx
interface ListingCardProps {
  listing: Listing;
  onEdit?: (listing: Listing) => void;
  onDelete?: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onEdit, onDelete }) => {
  return (
    <div className="glass-card rounded-3xl overflow-hidden hover:shadow-glow-olive 
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
        <div className="absolute top-3 right-3 glass-3 px-3 py-1 rounded-full 
                        text-white font-semibold backdrop-blur-sm">
          ৳{listing.price.selling}
        </div>
        
        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 
                        transition-opacity duration-300 flex items-center justify-center">
          <div className="flex gap-2">
            <button 
              onClick={() => onEdit?.(listing)}
              className="p-3 glass-4 rounded-xl text-white hover:glass-5 
                         transition-all duration-200"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              className="p-3 glass-4 rounded-xl text-white hover:glass-5 
                         transition-all duration-200"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              className="p-3 glass-4 rounded-xl text-white hover:glass-5 
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
          <h3 className="font-semibold text-text-dark group-hover:text-muted-olive 
                         transition-colors duration-200 line-clamp-2 mb-1">
            {listing.title}
          </h3>
          <p className="text-text-muted text-sm">{listing.productId.category}</p>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-white/10">
          <div className="text-center">
            <p className="text-lg font-bold text-text-dark">
              {listing.performance.totalOrders}
            </p>
            <p className="text-xs text-text-muted">Orders</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-3 h-3 fill-amber-warm text-amber-warm" />
              <span className="text-lg font-bold text-text-dark">
                {listing.performance.rating.average}
              </span>
            </div>
            <p className="text-xs text-text-muted">Rating</p>
          </div>
        </div>

        {/* Revenue & Profit */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-sm">Revenue</span>
            <span className="font-semibold text-sage-green">
              ৳{listing.profitAnalytics.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-sm">Profit</span>
            <span className="font-semibold text-muted-olive">
              ৳{listing.profitAnalytics.grossProfit.toLocaleString()} 
              ({listing.profitAnalytics.profitMargin}%)
            </span>
          </div>
        </div>

        {/* Stock Status */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              listing.inventory.available > 20 ? 'bg-sage-green' :
              listing.inventory.available > 0 ? 'bg-amber-warm' : 'bg-tomato-red'
            }`} />
            <span className="text-sm text-text-muted">
              {listing.inventory.available} {listing.inventory.unit} in stock
            </span>
          </div>
          
          {/* Quick Edit Button */}
          <button 
            onClick={() => onEdit?.(listing)}
            className="p-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200 
                       opacity-0 group-hover:opacity-100"
          >
            <Settings className="w-4 h-4 text-text-muted" />
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

```typescript
// OrdersOverview.tsx
const OrdersOverview = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  const { data: orders, isLoading } = useOrders({ status: activeTab });
  const { data: orderStats } = useOrderStats();

  const statusTabs = [
    { id: 'all', label: 'All Orders', count: orderStats?.summary.totalOrders },
    { id: 'pending', label: 'Pending', count: orderStats?.summary.pendingOrders, color: 'amber-warm' },
    { id: 'confirmed', label: 'Confirmed', count: orderStats?.summary.confirmedOrders, color: 'blue-500' },
    { id: 'processing', label: 'Processing', count: orderStats?.summary.processingOrders, color: 'muted-olive' },
    { id: 'ready', label: 'Ready', count: orderStats?.summary.readyOrders, color: 'sage-green' },
    { id: 'delivered', label: 'Delivered', count: orderStats?.summary.deliveredOrders, color: 'green-600' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-text-dark mb-2">Orders</h1>
          <p className="text-text-muted">Manage and track your order fulfillment</p>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-text-dark">
              ৳{orderStats?.summary.totalRevenue?.toLocaleString()}
            </p>
            <p className="text-text-muted text-sm">Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-dark">
              {orderStats?.summary.totalOrders}
            </p>
            <p className="text-text-muted text-sm">Total Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-sage-green">
              ৳{orderStats?.summary.avgOrderValue?.toFixed(0)}
            </p>
            <p className="text-text-muted text-sm">Avg Value</p>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="glass-2 rounded-2xl p-2 border">
        <div className="flex overflow-x-auto gap-1">
          {statusTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap 
                         font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-muted-olive text-white shadow-glow-olive'
                  : 'hover:glass-3 text-text-muted hover:text-text-dark'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id 
                    ? 'bg-white/20 text-white' 
                    : 'bg-earthy-beige text-text-muted'
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
        <div className="glass-3 rounded-2xl p-4 border animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted-olive/20 rounded-full flex items-center justify-center">
                <span className="text-muted-olive font-medium text-sm">
                  {selectedOrders.length}
                </span>
              </div>
              <span className="text-text-dark font-medium">
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
                <X className="w-5 h-5 text-text-muted" />
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

```typescript
// OrderCard.tsx
interface OrderCardProps {
  order: Order;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, selected, onSelect }) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { color: 'text-amber-warm', bg: 'bg-amber-warm/10', border: 'border-amber-warm/30' },
      confirmed: { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
      processing: { color: 'text-muted-olive', bg: 'bg-muted-olive/10', border: 'border-muted-olive/30' },
      ready: { color: 'text-sage-green', bg: 'bg-sage-green/10', border: 'border-sage-green/30' },
      delivered: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      cancelled: { color: 'text-tomato-red', bg: 'bg-tomato-red/10', border: 'border-tomato-red/30' }
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const isUrgent = order.priority === 'urgent' || order.priority === 'high';

  return (
    <div className={`glass-card rounded-3xl p-6 border transition-all duration-300 
                     hover:shadow-glow-olive hover:-translate-y-0.5 ${
                       selected ? 'ring-2 ring-muted-olive/30 shadow-glow-olive' : ''
                     } ${isUrgent ? 'border-l-4 border-l-tomato-red' : ''}`}>
      
      <div className="flex items-start gap-4">
        
        {/* Selection Checkbox */}
        <div className="flex items-center pt-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 rounded border-2 border-text-muted/30 
                       text-muted-olive focus:ring-muted-olive/20"
          />
        </div>

        {/* Order Content */}
        <div className="flex-1 min-w-0">
          
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-text-dark">
                {order.orderNumber}
              </h3>
              
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                {order.status.replace('_', ' ')}
              </div>
              
              {isUrgent && (
                <div className="flex items-center gap-1 text-tomato-red">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-medium">URGENT</span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <p className="text-lg font-bold text-text-dark">
                ৳{order.pricing.totalAmount.toLocaleString()}
              </p>
              <p className="text-text-muted text-sm">
                {order.items.length} item{order.items.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Customer & Timeline */}
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            
            {/* Customer Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-text-dark flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-olive" />
                {order.customer.restaurantName}
              </h4>
              <p className="text-text-muted text-sm flex items-center gap-2">
                <User className="w-3 h-3" />
                {order.customer.contactPerson}
              </p>
              <p className="text-text-muted text-sm flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                {order.delivery.address.area}, {order.delivery.address.city}
              </p>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-3 h-3 text-muted-olive" />
                <span className="text-text-muted">Placed:</span>
                <span className="text-text-dark font-medium">
                  {format(new Date(order.timeline.orderPlaced), 'MMM dd, HH:mm')}
                </span>
              </div>
              
              {order.timeline.estimatedDelivery && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-3 h-3 text-sage-green" />
                  <span className="text-text-muted">Delivery:</span>
                  <span className="text-text-dark font-medium">
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
                <div key={item.id} className="glass-1 px-3 py-1 rounded-full text-xs">
                  {item.productName} ({item.quantity}{item.unit})
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="glass-1 px-3 py-1 rounded-full text-xs text-text-muted">
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
              <button className="p-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200">
                <MessageSquare className="w-4 h-4 text-text-muted" />
              </button>
              
              <button className="p-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200">
                <Eye className="w-4 h-4 text-text-muted" />
              </button>
              
              <button className="p-2 glass-2 rounded-lg hover:glass-3 transition-all duration-200">
                <MoreHorizontal className="w-4 h-4 text-text-muted" />
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

```typescript
// NotificationsCenter.tsx
const NotificationsCenter = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  
  const { data: notifications, isLoading } = useNotifications({ 
    type: activeTab === 'all' ? undefined : activeTab 
  });

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
          <h1 className="text-3xl font-bold text-text-dark mb-2">Notifications</h1>
          <p className="text-text-muted">Stay updated with your business alerts</p>
        </div>
        
        {notifications?.summary.unread > 0 && (
          <button className="glass-2 px-4 py-2 rounded-xl text-muted-olive hover:glass-3 
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
          className="border-muted-olive/20"
        />
        <SummaryCard
          title="Urgent"
          value={notifications?.summary.urgent}
          icon={AlertTriangle}
          className="border-tomato-red/20"
        />
        <SummaryCard
          title="Action Required"
          value={notifications?.summary.actionRequired}
          icon={CheckSquare}
          className="border-amber-warm/20"
        />
      </div>

      {/* Filter Tabs */}
      <div className="glass-2 rounded-2xl p-2 border">
        <div className="flex overflow-x-auto gap-1">
          {notificationTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap 
                         font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-muted-olive text-white shadow-glow-olive'
                  : 'hover:glass-3 text-text-muted hover:text-text-dark'
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id 
                    ? 'bg-white/20 text-white' 
                    : 'bg-earthy-beige text-text-muted'
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

```typescript
// NotificationCard.tsx
interface NotificationCardProps {
  notification: Notification;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notification }) => {
  const getTypeConfig = (type: string) => {
    const configs = {
      inventory: { 
        color: 'text-amber-warm', 
        bg: 'bg-amber-warm/5', 
        border: 'border-amber-warm/20',
        icon: Package 
      },
      order: { 
        color: 'text-muted-olive', 
        bg: 'bg-muted-olive/5', 
        border: 'border-muted-olive/20',
        icon: ShoppingBag 
      },
      payment: { 
        color: 'text-sage-green', 
        bg: 'bg-sage-green/5', 
        border: 'border-sage-green/20',
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
      urgent: { color: 'text-tomato-red', bg: 'bg-tomato-red/10', pulse: true },
      high: { color: 'text-amber-warm', bg: 'bg-amber-warm/10', pulse: false },
      medium: { color: 'text-blue-500', bg: 'bg-blue-50', pulse: false },
      low: { color: 'text-text-muted', bg: 'bg-gray-50', pulse: false }
    };
    return configs[priority] || configs.medium;
  };

  const typeConfig = getTypeConfig(notification.type);
  const priorityConfig = getPriorityConfig(notification.priority);
  const IconComponent = typeConfig.icon;

  return (
    <div className={`glass-card rounded-2xl p-4 border transition-all duration-300 
                     hover:shadow-glow-olive group ${
                       !notification.isRead ? 'border-l-4 border-l-muted-olive' : ''
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
              <h3 className={`font-semibold ${!notification.isRead ? 'text-text-dark' : 'text-text-muted'}`}>
                {notification.title}
              </h3>
              
              {notification.priority === 'urgent' && (
                <span className="px-2 py-1 bg-tomato-red text-white text-xs rounded-full 
                               font-medium animate-pulse">
                  URGENT
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-text-muted text-xs">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Message */}
          <p className={`text-sm mb-3 ${!notification.isRead ? 'text-text-dark' : 'text-text-muted'}`}>
            {notification.message}
          </p>

          {/* Metadata */}
          {notification.metadata && (
            <div className="mb-3">
              {notification.type === 'inventory' && notification.metadata.productName && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
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
                <button className="bg-gradient-secondary text-white px-4 py-2 rounded-xl 
                                 text-sm font-medium hover:shadow-glow-olive 
                                 transition-all duration-300">
                  {notification.actionText || 'Take Action'}
                </button>
              )}
              
              {!notification.isRead && (
                <button className="text-muted-olive hover:text-muted-olive/80 text-sm 
                                 font-medium transition-colors duration-200">
                  Mark as Read
                </button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 
                            transition-opacity duration-200">
              <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <Eye className="w-3 h-3 text-text-muted" />
              </button>
              <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <Archive className="w-3 h-3 text-text-muted" />
              </button>
              <button className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <Trash2 className="w-3 h-3 text-text-muted" />
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

## Component Library - Reusable Elements

### Form Components - Glassmorphic Inputs

```typescript
// FloatingLabelInput.tsx
interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: React.ComponentType<any>;
  error?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label, value, onChange, type = 'text', icon: Icon, error, required, placeholder, className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const isFloating = isFocused || hasValue;

  return (
    <div className={`relative group ${className}`}>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 
                          w-5 h-5 text-text-muted group-focus-within:text-muted-olive 
                          transition-colors duration-300 z-10" />
        )}
        
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFocused ? placeholder : ''}
          className={`w-full ${Icon ? 'pl-12 pr-6' : 'px-6'} pt-6 pb-2 rounded-2xl 
                      bg-earthy-beige/30 border-0 focus:glass-3 focus:shadow-glow-olive 
                      transition-all duration-300 peer touch-target focus:outline-none 
                      text-text-dark placeholder:text-text-muted/60 
                      ${error ? 'border-2 border-tomato-red/30 bg-tomato-red/5' : ''}`}
        />
        
        <label className={`absolute ${Icon ? 'left-12' : 'left-6'} transition-all duration-300 
                           pointer-events-none select-none
                           ${isFloating 
                             ? 'top-2 text-xs text-muted-olive font-medium' 
                             : 'top-1/2 -translate-y-1/2 text-text-muted'}`}>
          {label}
          {required && <span className="text-tomato-red ml-1">*</span>}
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

// SearchInput.tsx
interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...', value, onChange, onSubmit, className = ''
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 
                        w-5 h-5 text-text-muted" />
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="w-full pl-12 pr-10 py-3 rounded-2xl bg-earthy-beige/30 border-0 
                   focus:glass-3 focus:shadow-glow-olive transition-all duration-300 
                   placeholder:text-text-muted/60 touch-target focus:outline-none 
                   text-text-dark"
      />
      
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 
                     p-1 hover:bg-black/5 rounded-full transition-colors duration-200"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </div>
  );
};

// Select.tsx
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  value, onChange, options, placeholder = 'Select option...', className = ''
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-4 py-3 rounded-xl bg-earthy-beige/30 border-0 
                  focus:glass-3 focus:shadow-glow-olive appearance-none cursor-pointer 
                  transition-all duration-300 touch-target focus:outline-none text-text-dark
                  bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" fill="%236B7280" viewBox="0 0 20 20"><path d="M5.23 7.21a.75.75 0 011.06-.02L10 10.88l3.71-3.69a.75.75 0 111.06 1.06l-4.24 4.22a.75.75 0 01-1.06 0L5.23 8.25a.75.75 0 01.02-1.04z"/></svg>')] 
                  bg-no-repeat bg-[length:20px] bg-[right_1rem_center] ${className}`}
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
  );
};

// ToggleSwitch.tsx
interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label, checked, onChange, description
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full 
                   transition-colors focus:outline-none focus:ring-2 
                   focus:ring-muted-olive/20 focus:ring-offset-2 ${
          checked ? 'bg-muted-olive' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white 
                     transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      
      <div>
        <label className="text-sm font-medium text-text-dark cursor-pointer"
               onClick={() => onChange(!checked)}>
          {label}
        </label>
        {description && (
          <p className="text-xs text-text-muted">{description}</p>
        )}
      </div>
    </div>
  );
};
```

### Chart Components - Data Visualization

```typescript
// RevenueChart.tsx
interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
    profit: number;
    orders: number;
  }>;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7f8966" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#7f8966" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9CAF88" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#9CAF88" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
          />
          
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `৳${value.toLocaleString()}`}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: 'none',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number, name: string) => [
              `৳${value.toLocaleString()}`,
              name === 'revenue' ? 'Revenue' : 'Profit'
            ]}
            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
          />
          
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#7f8966"
            strokeWidth={3}
            fill="url(#revenueGradient)"
            strokeLinecap="round"
          />
          
          <Area
            type="monotone"
            dataKey="profit"
            stroke="#9CAF88"
            strokeWidth={3}
            fill="url(#profitGradient)"
            strokeLinecap="round"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// InventoryHealthChart.tsx
const InventoryHealthChart = ({ data }) => {
  const chartData = [
    { name: 'Healthy', value: data?.statusDistribution.active, color: '#9CAF88' },
    { name: 'Low Stock', value: data?.statusDistribution.lowStock, color: '#F59E0B' },
    { name: 'Out of Stock', value: data?.statusDistribution.outOfStock, color: '#E94B3C' },
    { name: 'Overstocked', value: data?.statusDistribution.overstocked, color: '#A0826D' }
  ];

  return (
    <div className="glass-2 rounded-3xl p-6 border">
      <h3 className="text-lg font-semibold text-text-dark mb-6">Inventory Health</h3>
      
      <div className="h-40 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-text-muted">{item.name}</span>
            </div>
            <span className="text-sm font-medium text-text-dark">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Health Score</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-earthy-beige/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-sage-green to-muted-olive rounded-full 
                           transition-all duration-500"
                style={{ width: `${data?.healthScore || 0}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-muted-olive">
              {data?.healthScore || 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Technical Integration Guidelines

### API Integration Pattern

```typescript
// services/api.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api };

// Custom hooks for API integration
export const useApiQuery = <T>(
  key: string[], 
  fetcher: () => Promise<{ data: T }>,
  options?: any
) => {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetcher();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
};

export const useApiMutation = <T, V>(
  mutationFn: (variables: V) => Promise<{ data: T }>,
  options?: any
) => {
  return useMutation({
    mutationFn: async (variables: V) => {
      const response = await mutationFn(variables);
      return response.data;
    },
    ...options
  });
};
```

### Real-time Updates with WebSocket

```typescript
// hooks/useWebSocket.ts
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
      
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);
  }, [token]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, isConnected]);

  return { socket, isConnected, sendMessage };
};

// Real-time notifications hook
export const useRealtimeNotifications = () => {
  const { socket } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'notification':
          setNotifications(prev => [data.payload, ...prev]);
          // Show toast notification
          toast.success(data.payload.message);
          break;
          
        case 'order_update':
          queryClient.invalidateQueries(['orders']);
          queryClient.invalidateQueries(['dashboard']);
          break;
          
        case 'inventory_alert':
          queryClient.invalidateQueries(['inventory']);
          queryClient.invalidateQueries(['alerts']);
          break;
      }
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, queryClient]);

  return { notifications };
};
```

### State Management with Zustand

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  vendor: {
    id: string;
    businessName: string;
    status: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens: { token: string; refreshToken: string; user: User }) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: ({ token, refreshToken, user }) => {
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// stores/notificationStore.ts
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find(n => n.id === id);
      return {
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: notification && !notification.isRead 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount,
      };
    });
  },
}));
```

### Error Handling & Loading States

```typescript
// components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
          <div className="glass-3 rounded-3xl p-8 max-w-md">
            <AlertTriangle className="w-16 h-16 text-tomato-red mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text-dark mb-2">
              Something went wrong
            </h2>
            <p className="text-text-muted mb-6">
              We encountered an unexpected error. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-secondary text-white px-6 py-3 rounded-xl 
                         font-medium hover:shadow-glow-olive transition-all duration-300"
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

// components/LoadingStates.tsx
export const LoadingSpinner = ({ size = 'default' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
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

export const SkeletonCard = () => (
  <div className="animate-pulse glass-2 rounded-3xl p-6 space-y-4">
    <div className="h-4 bg-earthy-beige rounded-full w-3/4" />
    <div className="h-4 bg-earthy-beige rounded-full w-1/2" />
    <div className="h-32 bg-earthy-beige rounded-2xl" />
    <div className="flex justify-between">
      <div className="h-4 bg-earthy-beige rounded-full w-1/4" />
      <div className="h-4 bg-earthy-beige rounded-full w-1/4" />
    </div>
  </div>
);

export const EmptyState = ({ 
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
                   font-medium hover:shadow-glow-olive hover:-translate-y-0.5 
                   transition-all duration-300"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
```

---

## Performance Optimization

### Bundle Optimization & Code Splitting

```typescript
// Router.tsx - Route-based code splitting
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from './components/LoadingStates';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Orders = lazy(() => import('./pages/Orders'));
const Listings = lazy(() => import('./pages/Listings'));
const Analytics = lazy(() => import('./pages/Analytics'));

export const Router = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory/*" element={<Inventory />} />
        <Route path="/orders/*" element={<Orders />} />
        <Route path="/listings/*" element={<Listings />} />
        <Route path="/analytics/*" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
};

// utils/lazyImport.ts - Dynamic component loading
export const lazyImport = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  return lazy(() =>
    importFn().catch(() => ({
      default: () => (
        <div className="text-center p-8">
          <p className="text-text-muted">Failed to load component</p>
        </div>
      ) as T,
    }))
  );
};
```

### Image Optimization & Caching

```typescript
// components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  sizes?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src, alt, className, placeholder = '/placeholder-image.jpg', sizes
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
    };
    
    img.src = src;
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        sizes={sizes}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        loading="lazy"
      />
      
      {isLoading && (
        <div className="absolute inset-0 bg-earthy-beige/20 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-muted-olive/20 border-t-muted-olive 
                          rounded-full animate-spin" />
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-earthy-beige/20 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-text-muted/40" />
        </div>
      )}
    </div>
  );
};

// hooks/useInfiniteScroll.ts - Performance optimization for large lists
export const useInfiniteScroll = <T>(
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options: { initialPage?: number; threshold?: number } = {}
) => {
  const { initialPage = 1, threshold = 0.8 } = options;
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(initialPage);
  const observerRef = useRef<IntersectionObserver>();
  const lastElementRef = useRef<HTMLDivElement>();

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const result = await fetchFn(page);
      setData(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, page, isLoading, hasMore]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold }
    );

    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadMore, threshold]);

  return { data, isLoading, hasMore, lastElementRef };
};
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Set up React + TypeScript + Vite project
- [ ] Configure Tailwind CSS with custom Aaroth Fresh colors
- [ ] Implement authentication system with phone-based login
- [ ] Create base component library (forms, buttons, cards)
- [ ] Set up routing with role-based protection
- [ ] Configure API integration with interceptors

### Phase 2: Core Features (Week 3-5)
- [ ] Build dashboard with analytics and metrics
- [ ] Implement inventory management interface
- [ ] Create product listings management
- [ ] Develop order management workflow
- [ ] Add notification system and real-time updates
- [ ] Implement responsive design for mobile devices

### Phase 3: Advanced Features (Week 6-7)
- [ ] Add advanced filtering and search functionality
- [ ] Implement bulk operations for efficiency
- [ ] Create data visualization charts
- [ ] Add file upload for product images
- [ ] Implement offline support with service workers
- [ ] Add performance optimization (lazy loading, caching)

### Phase 4: Polish & Testing (Week 8)
- [ ] Comprehensive testing (unit, integration, e2e)
- [ ] Accessibility audit and improvements
- [ ] Performance optimization and bundle analysis
- [ ] Documentation and deployment preparation
- [ ] User acceptance testing with vendors

---

## Conclusion

This comprehensive vendor interface design documentation provides frontend developers with everything needed to build a modern, user-friendly vendor portal for the Aaroth Fresh B2B marketplace. The design follows the "Organic Futurism" philosophy, combining natural aesthetics with cutting-edge technology to create an interface that vendors will love to use.

The documentation covers all major aspects from authentication to order management, with detailed component specifications, API integration patterns, and performance optimization guidelines. The result will be a professional, efficient, and delightful vendor experience that drives business growth and customer satisfaction.

**Key Benefits of This Design:**
- **Mobile-First**: Optimized for vendors managing business on mobile devices
- **Performance-Focused**: Fast loading times and smooth animations
- **Accessible**: WCAG 2.1 AA compliant for all users
- **Scalable**: Architecture supports future feature expansion
- **Brand-Consistent**: Follows Aaroth Fresh design language throughout
- **User-Centric**: Designed based on actual vendor workflows and needs

This interface will empower vegetable vendors to efficiently manage their business operations while providing an exceptional user experience that reflects the quality and values of the Aaroth Fresh platform.