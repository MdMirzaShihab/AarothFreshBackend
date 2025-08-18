# Aaroth Fresh API Integration Guide (Streamlined)

> ⚠️ **IMPORTANT**: This file has been optimized and split into focused reference files for better Claude Code consumption.

## 📚 USE THESE OPTIMIZED FILES INSTEAD:

### 1. **api-integration-essentials.md** (~1,500 lines)
**Primary integration reference** containing:
- Core authentication patterns and JWT management
- Essential RTK Query configuration  
- Critical API migration from legacy to unified approval system
- Basic error handling and security patterns

### 2. **ui-patterns-reference.md** (~800 lines) 
**Component styling and patterns** containing:
- Complete UI component patterns following Organic Futurism design
- Button, form, navigation, and layout patterns
- Loading states, empty states, and status indicators
- Accessibility and responsive design patterns

### 3. **advanced-patterns.md** (~1,200 lines)
**Complex features and optimizations** containing:
- Complex state management with Redux Toolkit
- Performance optimization techniques
- Real-time WebSocket integration
- Advanced caching and security patterns

### 4. **api-endpoints.md** (~1,900 lines)
**Complete API reference** containing:
- All API endpoints with request/response examples
- Admin endpoints with parameters and data structures
- Authentication and role-based access patterns

## Why This Optimization?

The original `api-integration-guide.md` was **4,400+ lines** - too large for Claude Code to effectively consume as context. This optimization provides:

✅ **Better Claude Code Processing**: Each file under 2,000 lines  
✅ **Focused Context**: Specific files for specific needs  
✅ **Reduced Redundancy**: Eliminated duplicate content  
✅ **Easier Navigation**: Clear separation of concerns  
✅ **Faster Implementation**: Direct access to relevant patterns  

## Quick Start for Developers

1. **Read `api-integration-essentials.md`** first for core patterns
2. **Reference `ui-patterns-reference.md`** for component implementations  
3. **Use `api-endpoints.md`** for API calls and data structures
4. **Consult `advanced-patterns.md`** for complex features

## Legacy Content Notice

All essential content from the original file has been:
- ✅ Preserved in the new focused files
- ✅ Updated with latest API changes  
- ✅ Enhanced with new patterns
- ✅ Optimized for Claude Code consumption

**For Claude Code agents**: Always use the specific reference files above instead of this streamlined guide.

---

## Technology Stack Reminder

- **Core**: React 18 + JavaScript + Vite
- **Styling**: Tailwind CSS (mobile-first approach)  
- **State Management**: Redux Toolkit + RTK Query
- **Routing**: React Router v6 with role-based protection
- **Authentication**: JWT tokens with phone-based login (NOT email)

## Critical Notes

🚨 **Phone-Based Authentication**: Backend uses phone numbers, NOT emails  
🚨 **API Migration**: Legacy approval endpoints removed - use unified system  
🚨 **Design System**: Follow Organic Futurism principles in ui-patterns-reference.md  
🚨 **Error Handling**: Implement comprehensive patterns from essentials guide

---

For detailed implementation, refer to the optimized reference files listed above.