/**
 * Mongoose Soft Delete Plugin
 *
 * Adds soft delete functionality to any schema with isDeleted, deletedAt, deletedBy fields.
 * - Automatically excludes soft-deleted documents from find/findOne/count queries
 * - Provides softDelete() and restore() instance methods
 * - Use { includeSoftDeleted: true } in query options to include deleted documents
 */

const softDelete = function(schema) {
  // Add soft delete fields if not already present
  if (!schema.path('isDeleted')) {
    schema.add({
      isDeleted: { type: Boolean, default: false }
    });
  }
  if (!schema.path('deletedAt')) {
    schema.add({
      deletedAt: { type: Date, default: null }
    });
  }
  if (!schema.path('deletedBy')) {
    schema.add({
      deletedBy: { type: require('mongoose').Schema.Types.ObjectId, ref: 'User', default: null }
    });
  }

  // Pre-find hooks to exclude soft-deleted documents by default
  const excludeSoftDeleted = function() {
    const options = this.getOptions();
    if (!options.includeSoftDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
  };

  schema.pre('find', excludeSoftDeleted);
  schema.pre('findOne', excludeSoftDeleted);
  schema.pre('countDocuments', excludeSoftDeleted);
  schema.pre('findOneAndUpdate', excludeSoftDeleted);
  schema.pre('findOneAndDelete', excludeSoftDeleted);

  // Instance method to soft delete a document
  schema.methods.softDelete = function(deletedByUserId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (deletedByUserId) {
      this.deletedBy = deletedByUserId;
    }
    if (this.schema.path('isActive')) {
      this.isActive = false;
    }
    return this.save();
  };

  // Instance method to restore a soft-deleted document
  schema.methods.restore = function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    if (this.schema.path('isActive')) {
      this.isActive = true;
    }
    return this.save();
  };

  // Static method to find including soft-deleted documents
  schema.statics.findWithDeleted = function(conditions) {
    return this.find(conditions).setOptions({ includeSoftDeleted: true });
  };

  // Static method to find only soft-deleted documents
  schema.statics.findDeleted = function(conditions) {
    return this.find({ ...conditions, isDeleted: true }).setOptions({ includeSoftDeleted: true });
  };
};

module.exports = softDelete;
