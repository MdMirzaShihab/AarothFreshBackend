const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/error');

// Load env vars
dotenv.config();

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 16) {
  console.error('FATAL ERROR: JWT_SECRET must be at least 16 characters long for security');
  process.exit(1);
}

// Connect to database
connectDB();

const app = express();

// Body parser middleware
app.use(express.json());

// Enable CORS with comprehensive configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));


// Rate limiting (only in production to avoid interfering with development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Apply rate limiting to all requests
  app.use(limiter);
  
  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use('/api/v1/auth', authLimiter);
}

// Static folder for uploads
app.use('/uploads', express.static('uploads'));


// Mount main API routes
app.use('/api/v1', require('./routes'));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Aaroth Fresh API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Global error handler
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Initialize SLA Monitoring Service (disabled for MVP)
  if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_SLA_MONITORING === 'true') {
    try {
      const slaMonitorService = require('./services/slaMonitorService');
      
      // Initialize default SLA configurations if needed
      // In production, you'd want to get a system admin ID
      const systemAdminId = '507f1f77bcf86cd799439011'; // Placeholder - replace with actual admin ID
      await slaMonitorService.initializeDefaultConfigs(systemAdminId);
      
      // Start the SLA monitoring service (check every 30 minutes)
      await slaMonitorService.start(30);
      console.log('SLA Monitoring Service started successfully');
    } catch (error) {
      console.error('Failed to start SLA Monitoring Service:', error);
      // Don't exit the server if SLA monitoring fails to start
    }
  } else if (process.env.NODE_ENV !== 'test') {
    console.log('SLA Monitoring Service disabled (set ENABLE_SLA_MONITORING=true to enable)');
  }

  // Initialize Inventory Monitoring Service
  if (process.env.NODE_ENV !== 'test') {
    try {
      const inventoryMonitoringService = require('./services/inventoryMonitoringService');
      
      // Start the inventory monitoring service
      inventoryMonitoringService.start();
      console.log('Inventory Monitoring Service started successfully');
      
      // Set check interval from environment (default: 60 minutes)
      const checkIntervalMinutes = parseInt(process.env.INVENTORY_CHECK_INTERVAL) || 60;
      inventoryMonitoringService.setCheckInterval(checkIntervalMinutes);
      
    } catch (error) {
      console.error('Failed to start Inventory Monitoring Service:', error);
      // Don't exit the server if inventory monitoring fails to start
    }
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

module.exports = app;