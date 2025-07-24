const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ErrorResponse } = require('./error');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create subdirectories based on file type
    const subDir = file.fieldname === 'images' ? 'listings' : 'general';
    const fullPath = path.join(uploadsDir, subDir);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, name);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    // Allow image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ErrorResponse('Only JPEG, JPG, PNG and GIF images are allowed', 400), false);
    }
  } else {
    cb(new ErrorResponse('Only image files are allowed', 400), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5 // Maximum 5 files per request
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large. Maximum size is 5MB per file';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum 5 files allowed';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = err.message;
    }
    
    return next(new ErrorResponse(message, 400));
  }
  next(err);
};

// Middleware to clean up uploaded files on error
const cleanupOnError = (req, res, next) => {
  const originalNext = next;
  next = (err) => {
    if (err && req.files) {
      // Delete uploaded files if there's an error
      req.files.forEach(file => {
        fs.unlink(file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
      });
    }
    originalNext(err);
  };
  next();
};

// Export configured upload middleware with error handling
module.exports = {
  // Single file upload
  single: (fieldName) => [
    upload.single(fieldName),
    handleMulterError,
    cleanupOnError
  ],
  
  // Multiple file upload
  array: (fieldName, maxCount = 5) => [
    upload.array(fieldName, maxCount),
    handleMulterError,
    cleanupOnError
  ],
  
  // Multiple fields upload
  fields: (fields) => [
    upload.fields(fields),
    handleMulterError,
    cleanupOnError
  ],
  
  // Raw multer instance for custom configurations
  raw: upload
};