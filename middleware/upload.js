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

// Create storage engine for listings
const listingStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aaroth-fresh/listings',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1024, height: 768, crop: 'limit' }]
  }
});

// Create storage engine for product categories
const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aaroth-fresh/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
});

// Create storage engine for products
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aaroth-fresh/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1024, height: 768, crop: 'limit' }]
  }
});

// Create storage engine for user profiles
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aaroth-fresh/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
  }
});

// Create storage engine for other general purposes
const generalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aaroth-fresh/general',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

// Generic file filter for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ErrorResponse('Only image files are allowed', 400), false);
  }
};

// Generic error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large. Maximum size is 1MB per file.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded.';
        break;
      default:
        message = err.message;
    }
    return next(new ErrorResponse(message, 400));
  }
  next(err);
};


// EXPORT SPECIFIC UPLOAD HANDLERS
module.exports = {
  // Use this for listing images
  uploadListingImages: (fieldName, maxCount = 5) => {
    const upload = multer({
      storage: listingStorage,
      fileFilter,
      limits: {
        fileSize: 1 * 1024 * 1024, // 1MB
        files: maxCount
      }
    });
    return [upload.array(fieldName, maxCount), handleMulterError];
  },

  // Use this for product category images
  uploadCategoryImage: (fieldName) => {
    const upload = multer({
      storage: categoryStorage,
      fileFilter,
      limits: {
        fileSize: 1 * 1024 * 1024 // 1MB
      }
    });
    return [upload.single(fieldName), handleMulterError];
  },

  // Use this for product images
  uploadProductImages: (fieldName, maxCount = 5) => {
    const upload = multer({
      storage: productStorage,
      fileFilter,
      limits: {
        fileSize: 1 * 1024 * 1024, // 1MB
        files: maxCount
      }
    });
    return [upload.array(fieldName, maxCount), handleMulterError];
  },

  // Use this for user profile images
  uploadProfileImage: (fieldName) => {
    const upload = multer({
      storage: profileStorage,
      fileFilter,
      limits: {
        fileSize: 1 * 1024 * 1024 // 1MB
      }
    });
    return [upload.single(fieldName), handleMulterError];
  },

  // General purpose uploads
  uploadGeneralImage: (fieldName) => {
    const upload = multer({
      storage: generalStorage,
      fileFilter,
      limits: {
        fileSize: 1 * 1024 * 1024 // 1MB
      }
    });
    return [upload.single(fieldName), handleMulterError];
  },

  // Cloudinary instance for manual operations
  cloudinary
};