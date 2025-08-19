# Frontend Image Upload Implementation Guide

## 🚨 CRITICAL BACKEND UPDATES

The backend has been updated with **mandatory image requirements** for Product Categories and Products, and **optional profile images** for Users. The frontend must be updated accordingly.

## Backend Changes Summary

### 1. Model Updates

#### ProductCategory Model (`models/ProductCategory.js`)
- **Image field is now MANDATORY**
- Field: `image` (String, required, Cloudinary URL)
- Validation: Cannot be empty

#### Product Model (`models/Product.js`)
- **At least one image is now MANDATORY**
- Field: `images` (Array of objects, required, minimum 1 item)
- Structure: `{ url: String, alt: String, isPrimary: Boolean }`
- Validation: Array must contain at least one image

#### User Model (`models/User.js`)
- **Profile image is OPTIONAL**
- Field: `profileImage` (String, optional, Cloudinary URL)
- Validation: Must be valid URL if provided

### 2. Upload Middleware Updates (`middleware/upload.js`)

New upload handlers available:
- `uploadCategoryImage('image')` - Single image for categories
- `uploadProductImages('images', 5)` - Multiple images for products (max 5)
- `uploadProfileImage('profileImage')` - Single image for user profiles
- `uploadListingImages('images', 5)` - Existing listings handler

Storage configurations:
- **Categories**: `aaroth-fresh/categories` (800x600)
- **Products**: `aaroth-fresh/products` (1024x768)
- **User Profiles**: `aaroth-fresh/profiles` (400x400, face-focused crop)
- **Listings**: `aaroth-fresh/listings` (1024x768)

### 3. New API Endpoints

#### Product Category Management
```javascript
// All require admin role
POST   /api/v1/admin/categories          // Create with mandatory image
GET    /api/v1/admin/categories          // List all categories
GET    /api/v1/admin/categories/:id      // Get single category
PUT    /api/v1/admin/categories/:id      // Update category (optional new image)
DELETE /api/v1/admin/categories/:id      // Soft delete category
```

#### Updated Product Management
```javascript
// All require admin role
POST   /api/v1/admin/products            // Create with mandatory images
PUT    /api/v1/admin/products/:id        // Update product (optional new images)
```

#### Updated User Management
```javascript
// User profile updates
PUT    /api/v1/auth/me                   // Update profile (optional image)
PUT    /api/v1/admin/users/:id           // Admin update user (optional image)
```

## Frontend Implementation Requirements

### 1. Form Handling Patterns

#### Category Form (Mandatory Image)
```javascript
// CategoryForm.jsx - MANDATORY image
import { useState } from 'react';
import { useCreateCategoryMutation } from '../store/api/adminSlice';

const CategoryForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [createCategory, { isLoading, error }] = useCreateCategoryMutation();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 1024 * 1024) { // 1MB limit
        alert('Image must be less than 1MB');
        return;
      }
      
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate mandatory image
    if (!imageFile) {
      alert('Category image is required');
      return;
    }

    // Create FormData for multipart upload
    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('description', formData.description);
    submitData.append('image', imageFile); // Mandatory

    try {
      await createCategory(submitData).unwrap();
      // Success handling
      alert('Category created successfully');
      // Reset form
      setFormData({ name: '', description: '' });
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name field */}
      <div>
        <label className="block text-sm font-medium text-text-dark/80 mb-3">
          Category Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 
                     focus:bg-white focus:shadow-lg focus:shadow-glow-green 
                     transition-all duration-300 min-h-[44px] focus:outline-none"
          required
        />
      </div>

      {/* Description field */}
      <div>
        <label className="block text-sm font-medium text-text-dark/80 mb-3">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 
                     focus:bg-white focus:shadow-lg focus:shadow-glow-green 
                     transition-all duration-300 focus:outline-none"
        />
      </div>

      {/* MANDATORY Image upload */}
      <div>
        <label className="block text-sm font-medium text-text-dark/80 mb-3">
          Category Image * (Required)
        </label>
        
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-4">
            <img
              src={imagePreview}
              alt="Category preview"
              className="w-32 h-24 object-cover rounded-2xl border-2 border-mint-fresh/20"
            />
          </div>
        )}

        {/* File input */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-text-muted
                     file:mr-4 file:py-3 file:px-6
                     file:rounded-2xl file:border-0
                     file:bg-gradient-secondary file:text-white
                     file:font-medium hover:file:shadow-lg
                     transition-all duration-300"
          required
        />
        <p className="text-xs text-text-muted mt-2">
          Image is required. Max size: 1MB. Supported formats: JPG, PNG, GIF
        </p>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading || !imageFile}
        className="bg-gradient-secondary text-white px-8 py-4 rounded-2xl 
                   font-medium transition-all duration-300 hover:shadow-lg 
                   hover:shadow-glow-green hover:-translate-y-0.5 min-h-[44px] 
                   disabled:opacity-50 disabled:cursor-not-allowed 
                   disabled:hover:transform-none"
      >
        {isLoading ? 'Creating...' : 'Create Category'}
      </button>

      {/* Error display */}
      {error && (
        <div className="bg-tomato-red/5 backdrop-blur-sm border border-tomato-red/20 
                        text-tomato-red/90 p-4 rounded-2xl">
          {error.data?.message || 'Failed to create category'}
        </div>
      )}
    </form>
  );
};
```

#### Product Form (Mandatory Images)
```javascript
// ProductForm.jsx - MANDATORY multiple images
import { useState } from 'react';
import { useCreateProductMutation } from '../store/api/adminSlice';

const ProductForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  
  const [createProduct, { isLoading, error }] = useCreateProductMutation();

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 1024 * 1024) {
        alert(`${file.name} is too large (max 1MB)`);
        return false;
      }
      return true;
    });

    // Limit to 5 images
    if (validFiles.length > 5) {
      alert('Maximum 5 images allowed');
      validFiles.splice(5);
    }

    setImageFiles(validFiles);
    
    // Create previews
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index) => {
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate mandatory images
    if (imageFiles.length === 0) {
      alert('At least one product image is required');
      return;
    }

    // Create FormData for multipart upload
    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('description', formData.description);
    submitData.append('category', formData.category);
    
    // Append multiple images
    imageFiles.forEach((file) => {
      submitData.append('images', file);
    });

    try {
      await createProduct(submitData).unwrap();
      // Success handling
      alert('Product created successfully');
      // Reset form
      setFormData({ name: '', description: '', category: '' });
      setImageFiles([]);
      setImagePreviews([]);
    } catch (err) {
      console.error('Failed to create product:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic fields... */}
      
      {/* MANDATORY Multiple images upload */}
      <div>
        <label className="block text-sm font-medium text-text-dark/80 mb-3">
          Product Images * (Required - At least 1 image)
        </label>
        
        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Product preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-2xl"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-tomato-red text-white 
                             w-6 h-6 rounded-full text-xs hover:bg-tomato-red/80
                             transition-colors duration-200"
                >
                  ×
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 bg-bottle-green text-white 
                                   text-xs px-2 py-1 rounded-lg">Primary</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* File input */}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImagesChange}
          className="block w-full text-sm text-text-muted
                     file:mr-4 file:py-3 file:px-6
                     file:rounded-2xl file:border-0
                     file:bg-gradient-secondary file:text-white
                     file:font-medium hover:file:shadow-lg
                     transition-all duration-300"
          required
        />
        <p className="text-xs text-text-muted mt-2">
          At least 1 image required. Max 5 images, 1MB each. First image will be primary.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || imageFiles.length === 0}
        className="bg-gradient-secondary text-white px-8 py-4 rounded-2xl 
                   font-medium transition-all duration-300 hover:shadow-lg 
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating...' : 'Create Product'}
      </button>
    </form>
  );
};
```

#### User Profile Form (Optional Image)
```javascript
// ProfileForm.jsx - OPTIONAL image
import { useState } from 'react';
import { useUpdateProfileMutation } from '../store/api/authSlice';

const ProfileForm = ({ user }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profileImage || null);
  
  const [updateProfile, { isLoading, error }] = useUpdateProfileMutation();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 1024 * 1024) {
        alert('Image must be less than 1MB');
        return;
      }
      
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create FormData for multipart upload
    const submitData = new FormData();
    submitData.append('name', formData.name);
    
    // Optional profile image
    if (imageFile) {
      submitData.append('profileImage', imageFile);
    }

    try {
      await updateProfile(submitData).unwrap();
      alert('Profile updated successfully');
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name field */}
      <div>
        <label className="block text-sm font-medium text-text-dark/80 mb-3">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-6 py-4 rounded-2xl bg-earthy-beige/30 border-0 
                     focus:bg-white focus:shadow-lg transition-all duration-300"
          required
        />
      </div>

      {/* OPTIONAL Profile image */}
      <div>
        <label className="block text-sm font-medium text-text-dark/80 mb-3">
          Profile Image (Optional)
        </label>
        
        {/* Current/Preview image */}
        {imagePreview && (
          <div className="mb-4">
            <img
              src={imagePreview}
              alt="Profile preview"
              className="w-24 h-24 object-cover rounded-full border-2 border-mint-fresh/20"
            />
          </div>
        )}

        {/* File input */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-text-muted
                     file:mr-4 file:py-3 file:px-6
                     file:rounded-2xl file:border-0
                     file:bg-earthy-yellow/20 file:text-earthy-brown
                     file:font-medium hover:file:bg-earthy-yellow/30
                     transition-all duration-300"
        />
        <p className="text-xs text-text-muted mt-2">
          Optional profile picture. Max size: 1MB. Will be cropped to square.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-gradient-secondary text-white px-8 py-4 rounded-2xl 
                   font-medium transition-all duration-300 hover:shadow-lg 
                   disabled:opacity-50"
      >
        {isLoading ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  );
};
```

### 2. RTK Query API Integration

#### Admin API Slice Extension
```javascript
// store/api/adminSlice.js - Add new endpoints
export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Product Category endpoints
    createCategory: builder.mutation({
      query: (formData) => ({
        url: '/admin/categories',
        method: 'POST',
        body: formData, // FormData with image
      }),
      invalidatesTags: ['Category'],
    }),
    
    getCategories: builder.query({
      query: (params = {}) => ({
        url: '/admin/categories',
        params,
      }),
      providesTags: ['Category'],
    }),
    
    updateCategory: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/admin/categories/${id}`,
        method: 'PUT',
        body: formData, // FormData with optional image
      }),
      invalidatesTags: ['Category'],
    }),
    
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `/admin/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),
    
    // Updated product endpoints
    createProduct: builder.mutation({
      query: (formData) => ({
        url: '/admin/products',
        method: 'POST',
        body: formData, // FormData with mandatory images
      }),
      invalidatesTags: ['Product'],
    }),
    
    updateProduct: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/admin/products/${id}`,
        method: 'PUT',
        body: formData, // FormData with optional images
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const {
  useCreateCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
} = adminApiSlice;
```

#### Auth API Slice Extension
```javascript
// store/api/authSlice.js - Update profile endpoint
export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    updateProfile: builder.mutation({
      query: (formData) => ({
        url: '/auth/me',
        method: 'PUT',
        body: formData, // FormData with optional profileImage
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useUpdateProfileMutation,
} = authApiSlice;
```

### 3. Error Handling Patterns

#### Image Upload Error Handling
```javascript
// hooks/useImageUploadError.js
import { useEffect } from 'react';
import { toast } from 'react-toastify';

export const useImageUploadError = (error) => {
  useEffect(() => {
    if (error) {
      const message = error.data?.message || 'Upload failed';
      
      // Handle specific image-related errors
      if (message.includes('image is required')) {
        toast.error('Image is required for this operation');
      } else if (message.includes('File size too large')) {
        toast.error('Image file is too large (max 1MB)');
      } else if (message.includes('Only image files')) {
        toast.error('Please select a valid image file');
      } else if (message.includes('at least one')) {
        toast.error('At least one image is required');
      } else {
        toast.error(message);
      }
    }
  }, [error]);
};
```

### 4. Route Integration

#### Admin Routes with Upload Middleware
```javascript
// routes/admin.js - Add new category routes
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadCategoryImage, uploadProductImages, uploadProfileImage } = require('../middleware/upload');
const { categoryValidation, productValidation } = require('../middleware/validation');
const {
  // Existing imports...
  createProductCategory,
  getProductCategories,
  getProductCategory,
  updateProductCategory,
  deleteProductCategory,
  // Updated product methods
  createProduct,
  updateProduct,
  updateUser
} = require('../controllers/adminController');

// Category routes
router.route('/categories')
  .get(protect, authorize('admin'), getProductCategories)
  .post(
    protect, 
    authorize('admin'), 
    ...uploadCategoryImage('image'), // Middleware for single image
    categoryValidation,
    createProductCategory
  );

router.route('/categories/:id')
  .get(protect, authorize('admin'), getProductCategory)
  .put(
    protect, 
    authorize('admin'), 
    ...uploadCategoryImage('image'), // Optional image for update
    categoryValidation,
    updateProductCategory
  )
  .delete(protect, authorize('admin'), deleteProductCategory);

// Updated product routes
router.route('/products')
  .post(
    protect, 
    authorize('admin'), 
    ...uploadProductImages('images', 5), // Multiple images
    productValidation,
    createProduct
  );

router.route('/products/:id')
  .put(
    protect, 
    authorize('admin'), 
    ...uploadProductImages('images', 5), // Optional images for update
    productValidation,
    updateProduct
  );

// Updated user routes
router.route('/users/:id')
  .put(
    protect, 
    authorize('admin'), 
    ...uploadProfileImage('profileImage'), // Optional profile image
    userUpdateValidation,
    updateUser
  );

module.exports = router;
```

#### Auth Routes Update
```javascript
// routes/auth.js - Update profile route
const { uploadProfileImage } = require('../middleware/upload');
const { updateProfileValidation } = require('../middleware/validation');
const { updateProfile } = require('../controllers/authController');

router.put(
  '/me',
  protect,
  ...uploadProfileImage('profileImage'), // Optional profile image
  updateProfileValidation,
  updateProfile
);
```

### 5. UI Component Updates

#### Category Management Page
```javascript
// pages/admin/CategoryManagement.jsx
import { useState } from 'react';
import { useGetCategoriesQuery, useDeleteCategoryMutation } from '../../store/api/adminSlice';
import CategoryForm from '../../components/admin/CategoryForm';
import Modal from '../../components/ui/Modal';

const CategoryManagement = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const { data: categories, isLoading } = useGetCategoriesQuery();
  const [deleteCategory] = useDeleteCategoryMutation();

  const handleDelete = async (categoryId) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(categoryId).unwrap();
        alert('Category deleted successfully');
      } catch (error) {
        alert('Failed to delete category');
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-dark">Category Management</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-secondary text-white px-6 py-3 rounded-2xl font-medium"
        >
          Create Category
        </button>
      </div>

      {/* Categories grid with images */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories?.data?.map((category) => (
          <div key={category._id} className="bg-white rounded-3xl p-6 shadow-sm">
            {/* Category image */}
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-48 object-cover rounded-2xl mb-4"
            />
            <h3 className="text-lg font-medium text-text-dark mb-2">{category.name}</h3>
            <p className="text-text-muted text-sm mb-4">{category.description}</p>
            
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory(category)}
                className="flex-1 bg-earthy-yellow/20 text-earthy-brown py-2 rounded-xl font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(category._id)}
                className="flex-1 bg-tomato-red/10 text-tomato-red py-2 rounded-xl font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Category"
      >
        <CategoryForm onSuccess={() => setIsCreateModalOpen(false)} />
      </Modal>

      {/* Edit modal */}
      {selectedCategory && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCategory(null)}
          title="Edit Category"
        >
          <CategoryForm
            category={selectedCategory}
            onSuccess={() => setSelectedCategory(null)}
          />
        </Modal>
      )}
    </div>
  );
};
```

## Implementation Checklist

### Backend Verification
- [ ] ProductCategory model requires image field
- [ ] Product model requires at least one image
- [ ] User model has optional profileImage field
- [ ] Upload middleware has specific storage configurations
- [ ] Controllers handle image validation properly
- [ ] Routes include upload middleware

### Frontend Implementation
- [ ] Create CategoryForm with mandatory image upload
- [ ] Update ProductForm with mandatory images upload
- [ ] Update ProfileForm with optional image upload
- [ ] Add RTK Query endpoints for new image handling
- [ ] Implement proper error handling for image uploads
- [ ] Update admin pages to display images
- [ ] Test image upload flows for all entities
- [ ] Implement image preview functionality
- [ ] Add image removal capabilities
- [ ] Handle form validation for missing images

### UI/UX Enhancements
- [ ] Image preview components
- [ ] Drag-and-drop upload areas
- [ ] Progress indicators for uploads
- [ ] Image crop/resize options (optional)
- [ ] Multiple image reordering (products)
- [ ] Proper error messaging
- [ ] Loading states during uploads
- [ ] Success feedback after uploads

### Testing Requirements
- [ ] Test category creation without image (should fail)
- [ ] Test product creation without images (should fail)
- [ ] Test user profile update with/without image
- [ ] Test file type validation
- [ ] Test file size validation
- [ ] Test multiple image upload for products
- [ ] Test image preview functionality
- [ ] Test error handling scenarios

## Important Notes

1. **Mandatory vs Optional**: Categories and Products require images, Users do not
2. **File Validation**: Client-side validation for file type and size before upload
3. **FormData**: Always use FormData for multipart uploads with images
4. **Error Handling**: Implement comprehensive error handling for upload failures
5. **User Feedback**: Provide clear feedback for upload progress and results
6. **Image Preview**: Always show image previews before and after upload
7. **Performance**: Consider image optimization and lazy loading for lists

## Security Considerations

1. **File Type Validation**: Server-side validation prevents malicious uploads
2. **File Size Limits**: 1MB limit prevents DoS attacks
3. **Cloudinary**: Secure cloud storage with transformations
4. **Authorization**: Proper role-based access control
5. **Input Sanitization**: All form data is validated and sanitized