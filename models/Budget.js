const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required']
  },
  budgetPeriod: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly',
    required: true
  },
  year: {
    type: Number,
    required: [true, 'Budget year is required'],
    min: [2020, 'Year must be 2020 or later'],
    max: [2050, 'Year cannot be more than 2050']
  },
  month: {
    type: Number,
    min: [1, 'Month must be between 1 and 12'],
    max: [12, 'Month must be between 1 and 12'],
    validate: {
      validator: function(value) {
        return this.budgetPeriod !== 'monthly' || (value >= 1 && value <= 12);
      },
      message: 'Month is required for monthly budgets'
    }
  },
  quarter: {
    type: Number,
    min: [1, 'Quarter must be between 1 and 4'],
    max: [4, 'Quarter must be between 1 and 4'],
    validate: {
      validator: function(value) {
        return this.budgetPeriod !== 'quarterly' || (value >= 1 && value <= 4);
      },
      message: 'Quarter is required for quarterly budgets'
    }
  },
  totalBudgetLimit: {
    type: Number,
    required: [true, 'Total budget limit is required'],
    min: [0, 'Budget limit cannot be negative']
  },
  categoryLimits: [{
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: true
    },
    categoryName: {
      type: String,
      required: true
    },
    budgetLimit: {
      type: Number,
      required: [true, 'Category budget limit is required'],
      min: [0, 'Category budget limit cannot be negative']
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'archived'],
    default: 'draft'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

BudgetSchema.virtual('currentSpending', {
  ref: 'Order',
  localField: 'restaurantId',
  foreignField: 'restaurantId',
  justOne: false,
  match: function() {
    const start = this.budgetPeriod === 'monthly' 
      ? new Date(this.year, this.month - 1, 1)
      : this.budgetPeriod === 'quarterly'
      ? new Date(this.year, (this.quarter - 1) * 3, 1)
      : new Date(this.year, 0, 1);
    
    const end = this.budgetPeriod === 'monthly'
      ? new Date(this.year, this.month, 0)
      : this.budgetPeriod === 'quarterly'
      ? new Date(this.year, this.quarter * 3, 0)
      : new Date(this.year, 11, 31);
    
    return {
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' }
    };
  }
});

BudgetSchema.virtual('budgetUtilization').get(function() {
  return this.totalBudgetLimit > 0 ? 
    Math.round((this.totalSpent || 0) / this.totalBudgetLimit * 100) : 0;
});

BudgetSchema.virtual('remainingBudget').get(function() {
  return this.totalBudgetLimit - (this.totalSpent || 0);
});

BudgetSchema.virtual('isOverBudget').get(function() {
  return (this.totalSpent || 0) > this.totalBudgetLimit;
});

BudgetSchema.methods.getCategorySpending = async function() {
  const start = this.budgetPeriod === 'monthly' 
    ? new Date(this.year, this.month - 1, 1)
    : this.budgetPeriod === 'quarterly'
    ? new Date(this.year, (this.quarter - 1) * 3, 1)
    : new Date(this.year, 0, 1);
  
  const end = this.budgetPeriod === 'monthly'
    ? new Date(this.year, this.month, 0)
    : this.budgetPeriod === 'quarterly'
    ? new Date(this.year, this.quarter * 3, 0)
    : new Date(this.year, 11, 31);

  const Order = mongoose.model('Order');
  
  return await Order.aggregate([
    {
      $match: {
        restaurantId: this.restaurantId,
        createdAt: { $gte: start, $lte: end },
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'productcategories',
        localField: 'product.category',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category._id',
        categoryName: { $first: '$category.name' },
        totalSpent: { $sum: '$items.totalPrice' }
      }
    }
  ]);
};

BudgetSchema.statics.getCurrentBudget = async function(restaurantId, period = 'monthly') {
  const now = new Date();
  const query = {
    restaurantId: restaurantId,
    budgetPeriod: period,
    year: now.getFullYear(),
    isActive: true,
    status: 'active'
  };

  if (period === 'monthly') {
    query.month = now.getMonth() + 1;
  } else if (period === 'quarterly') {
    query.quarter = Math.floor(now.getMonth() / 3) + 1;
  }

  return await this.findOne(query);
};

BudgetSchema.statics.getBudgetHistory = async function(restaurantId, months = 12) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months);

  return await this.find({
    restaurantId: restaurantId,
    budgetPeriod: 'monthly',
    year: { $gte: startDate.getFullYear() },
    $or: [
      { year: { $gt: startDate.getFullYear() } },
      { 
        year: startDate.getFullYear(),
        month: { $gte: startDate.getMonth() + 1 }
      }
    ]
  }).sort({ year: 1, month: 1 });
};

BudgetSchema.index({ restaurantId: 1, budgetPeriod: 1, year: 1, month: 1 }, { unique: true });
BudgetSchema.index({ restaurantId: 1, budgetPeriod: 1, year: 1, quarter: 1 }, { unique: true });
BudgetSchema.index({ restaurantId: 1, isActive: 1, status: 1 });
BudgetSchema.index({ createdBy: 1, createdAt: -1 });
BudgetSchema.index({ year: 1, month: 1 });

module.exports = mongoose.model('Budget', BudgetSchema);