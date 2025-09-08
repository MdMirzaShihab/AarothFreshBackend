# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (uses nodemon for auto-restart)
- **Start production server**: `npm start`
- **No tests configured**: The test script is not implemented - check if tests need to be added

## Architecture Changes (v2.0)

- **Route Consolidation**: Vendor listing CRUD moved to `/api/v1/vendor-dashboard/listings/*`
- **Legacy Code Removal**: All backward compatibility patterns and old field structures removed
- **Real-time Features**: Simplified for MVP - SLA and inventory monitoring disabled by default
- **Validation Standardization**: Consistent nested field validation across all endpoints

## Architecture Overview

This is a B2B marketplace REST API connecting local vegetable vendors with restaurants, built with Express.js and MongoDB.

### Core Structure
- **Entry point**: `server.js` - Express server with error handling, CORS, and health check
- **API routes**: All routes mounted under `/api/v1` via `routes/index.js`
- **Database**: MongoDB with Mongoose ODM, connection configured in `config/db.js`

### Key Models & Relationships
- **User**: Multi-role system (`admin`, `vendor`, `restaurantOwner`, `restaurantManager`)
  - Phone-based authentication (unique phone numbers with country codes)
  - Role-based relationships to Vendor/Restaurant models
- **Core entities**: Restaurant, Vendor, Product, ProductCategory, Listing, Order

### Authentication & Authorization
- JWT-based authentication with phone number login (not email)
- Role-based access control with middleware in `middleware/auth.js`
- Password hashing with bcrypt (cost factor 12)

### Route Structure
- `/api/v1/auth` - Authentication endpoints
- `/api/v1/admin` - Admin operations  
- `/api/v1/listings` - Product listings management
- `/api/v1/orders` - Order management
- `/api/v1/public` - Public endpoints

### Key Features
- File upload support with Cloudinary integration
- Email service using Brevo (formerly Sendinblue)
- Comprehensive error handling and validation
- CORS configured for client integration

### Development Notes
- Uses nodemon for development with AWS SDK files ignored
- Environment variables required for JWT, database, email service, and Cloudinary
- Phone number format: must include country code (e.g., +8801234567890)
- Recent changes: Authentication moved from email to phone, user roles updated to restaurantOwner/restaurantManager

## Error Handling
Global error handler in `middleware/error.js` with standardized error responses and unhandled rejection/exception handling in server.js.