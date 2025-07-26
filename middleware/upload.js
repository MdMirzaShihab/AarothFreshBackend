const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { ErrorResponse } = require('./error');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for listings
const listingStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aaroth-fresh/listings',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1024, height: 768, crop: 'limit' }]
  }
});

// Configure storage for other types
const generalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aaroth-fresh/general',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ErrorResponse('Only image files are allowed', 400), false);
  }
};

// Create a dynamic storage selector
const storageSelector = (req, file, cb) => {
  if (file.fieldname === 'images') {
    cb(null, listingStorage);
  } else {
    cb(null, generalStorage);
  }
};

// Configure multer
const upload = multer({
  storage: storageSelector,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit per file
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
      // If there's an error, delete the uploaded files from Cloudinary
      req.files.forEach(file => {
        cloudinary.uploader.destroy(file.filename, (error, result) => {
          if (error) console.error('Error deleting file from Cloudinary:', error);
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