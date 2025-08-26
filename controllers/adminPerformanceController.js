const AdminMetrics = require("../models/AdminMetrics");
const SLAConfig = require("../models/SLAConfig");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const { ErrorResponse } = require("../middleware/error");
const mongoose = require("mongoose");

// ================================
// ADMIN PERFORMANCE DASHBOARD
// ================================

/**
 * @desc    Get comprehensive admin performance dashboard
 * @route   GET /api/v1/admin/performance/dashboard
 * @access  Private/Admin
 */
exports.getPerformanceDashboard = async (req, res, next) => {
  try {
    const { period = 'monthly', adminId } = req.query;
    const currentPeriod = new Date().toISOString().slice(0, period === 'monthly' ? 7 : 10);
    
    // Get current period metrics for specific admin or all admins
    const metricsQuery = { period: currentPeriod, periodType: period };
    if (adminId) {
      metricsQuery.adminId = adminId;
    }
    
    const [
      currentMetrics,
      topPerformers,
      recentViolations,
      systemOverview
    ] = await Promise.all([
      // Current period metrics
      AdminMetrics.find(metricsQuery)
        .populate('adminId', 'name email role')
        .sort({ 'metrics.approvalRate': -1 }),
        
      // Top 5 performers
      AdminMetrics.getTopPerformers(period, 5),
      
      // Recent SLA violations (last 7 days)
      AdminMetrics.aggregate([
        { $unwind: '$slaViolations' },
        { $match: { 'slaViolations.actionTakenAt': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $sort: { 'slaViolations.actionTakenAt': -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'users',
            localField: 'adminId',
            foreignField: '_id',
            as: 'admin'
          }
        },
        { $unwind: '$admin' },
        {
          $project: {
            adminName: '$admin.name',
            violation: '$slaViolations',
            period: 1
          }
        }
      ]),
      
      // System-wide overview
      AdminMetrics.aggregate([
        { $match: { period: currentPeriod, periodType: period } },
        {
          $group: {
            _id: null,
            totalAdmins: { $sum: 1 },
            totalActions: { $sum: '$metrics.totalActions' },
            totalApprovals: { $sum: '$metrics.approvals' },
            totalRejections: { $sum: '$metrics.rejections' },
            avgResponseTime: { $avg: '$metrics.avgResponseTime' },
            avgApprovalRate: { $avg: '$metrics.approvalRate' },
            avgSLACompliance: { $avg: '$slaPerformance.slaComplianceRate' },
            totalSLAViolations: { $sum: { $size: '$slaViolations' } },
            highPerformers: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ['$metrics.approvalRate', 80] },
                    { $gte: ['$slaPerformance.slaComplianceRate', 90] }
                  ]},
                  1, 0
                ]
              }
            }
          }
        }
      ])
    ]);
    
    // Calculate performance distribution
    const performanceDistribution = {
      excellent: 0, // A grade
      good: 0,      // B grade  
      average: 0,   // C grade
      poor: 0       // D-F grade
    };
    
    currentMetrics.forEach(metric => {
      const overallGrade = metric.performanceGrade?.overall || 'C';
      if (['A+', 'A'].includes(overallGrade)) {
        performanceDistribution.excellent++;
      } else if (['B+', 'B'].includes(overallGrade)) {
        performanceDistribution.good++;
      } else if (['C+', 'C'].includes(overallGrade)) {
        performanceDistribution.average++;
      } else {
        performanceDistribution.poor++;
      }
    });
    
    // Get trend data (last 6 periods)
    const trendPeriods = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      if (period === 'monthly') {
        date.setMonth(date.getMonth() - i);
        trendPeriods.push(date.toISOString().slice(0, 7));
      } else {
        date.setDate(date.getDate() - i);
        trendPeriods.push(date.toISOString().slice(0, 10));
      }
    }
    
    const trendData = await AdminMetrics.aggregate([
      { $match: { period: { $in: trendPeriods }, periodType: period } },
      {
        $group: {
          _id: '$period',
          avgApprovalRate: { $avg: '$metrics.approvalRate' },
          avgResponseTime: { $avg: '$metrics.avgResponseTime' },
          avgSLACompliance: { $avg: '$slaPerformance.slaComplianceRate' },
          totalActions: { $sum: '$metrics.totalActions' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: currentPeriod,
        periodType: period,
        overview: systemOverview[0] || {
          totalAdmins: 0,
          totalActions: 0,
          avgResponseTime: 0,
          avgApprovalRate: 0,
          avgSLACompliance: 0,
          totalSLAViolations: 0,
          highPerformers: 0
        },
        currentMetrics,
        topPerformers,
        performanceDistribution,
        recentViolations,
        trendData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get detailed admin performance metrics
 * @route   GET /api/v1/admin/performance/metrics
 * @access  Private/Admin
 */
exports.getPerformanceMetrics = async (req, res, next) => {
  try {
    const {
      adminId,
      period = 'monthly',
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'period',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    let query = { periodType: period };
    
    if (adminId) {
      query.adminId = adminId;
    }
    
    if (startDate && endDate) {
      query.period = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const [metrics, total] = await Promise.all([
      AdminMetrics.find(query)
        .populate('adminId', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
        
      AdminMetrics.countDocuments(query)
    ]);
    
    // Calculate aggregated statistics
    const stats = await AdminMetrics.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgApprovalRate: { $avg: '$metrics.approvalRate' },
          avgResponseTime: { $avg: '$metrics.avgResponseTime' },
          avgSLACompliance: { $avg: '$slaPerformance.slaComplianceRate' },
          totalActions: { $sum: '$metrics.totalActions' },
          totalViolations: { $sum: { $size: '$slaViolations' } },
          bestApprovalRate: { $max: '$metrics.approvalRate' },
          worstResponseTime: { $max: '$metrics.avgResponseTime' },
          bestSLACompliance: { $max: '$slaPerformance.slaComplianceRate' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      count: metrics.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: stats[0] || {},
      data: metrics
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get SLA violations with detailed analysis
 * @route   GET /api/v1/admin/performance/sla-violations
 * @access  Private/Admin
 */
exports.getSLAViolations = async (req, res, next) => {
  try {
    const {
      adminId,
      entityType,
      violationType,
      severityLevel,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;
    
    // Build aggregation pipeline
    const pipeline = [
      { $unwind: '$slaViolations' },
      {
        $match: {
          ...(adminId && { adminId: mongoose.Types.ObjectId(adminId) }),
          ...(startDate && endDate && {
            'slaViolations.actionTakenAt': {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }),
          ...(entityType && { 'slaViolations.entityType': entityType }),
          ...(violationType && { 'slaViolations.violationType': violationType }),
          ...(severityLevel && { 'slaViolations.severityLevel': severityLevel })
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'adminId',
          foreignField: '_id',
          as: 'admin'
        }
      },
      { $unwind: '$admin' },
      {
        $project: {
          adminId: '$admin._id',
          adminName: '$admin.name',
          adminEmail: '$admin.email',
          period: 1,
          violation: '$slaViolations',
          overallPerformanceScore: 1
        }
      },
      { $sort: { 'violation.actionTakenAt': -1 } }
    ];
    
    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [violations, totalCount] = await Promise.all([
      AdminMetrics.aggregate([...pipeline, { $skip: skip }, { $limit: parseInt(limit) }]),
      AdminMetrics.aggregate([...pipeline, { $count: 'total' }])
    ]);
    
    // Get violation statistics
    const violationStats = await AdminMetrics.aggregate([
      { $unwind: '$slaViolations' },
      {
        $group: {
          _id: null,
          totalViolations: { $sum: 1 },
          byEntityType: {
            $push: {
              entityType: '$slaViolations.entityType',
              count: 1
            }
          },
          byViolationType: {
            $push: {
              violationType: '$slaViolations.violationType',
              count: 1
            }
          },
          bySeverity: {
            $push: {
              severity: '$slaViolations.severityLevel',
              count: 1
            }
          },
          avgExceedanceTime: { $avg: { $subtract: ['$slaViolations.responseTime', '$slaViolations.slaTarget'] } }
        }
      }
    ]);
    
    const total = totalCount[0]?.total || 0;
    
    res.status(200).json({
      success: true,
      count: violations.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats: violationStats[0] || { totalViolations: 0 },
      data: violations
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get team performance comparison
 * @route   GET /api/v1/admin/performance/team-comparison
 * @access  Private/Admin
 */
exports.getTeamComparison = async (req, res, next) => {
  try {
    const { period = 'monthly', metric = 'approvalRate', limit = 10 } = req.query;
    const currentPeriod = new Date().toISOString().slice(0, period === 'monthly' ? 7 : 10);
    
    // Get team comparison data
    const teamData = await AdminMetrics.find({
      period: currentPeriod,
      periodType: period
    })
    .populate('adminId', 'name email role')
    .sort({ [`metrics.${metric}`]: -1 })
    .limit(parseInt(limit));
    
    // Calculate team averages and rankings
    const teamStats = await AdminMetrics.aggregate([
      { $match: { period: currentPeriod, periodType: period } },
      {
        $group: {
          _id: null,
          teamAvgApprovalRate: { $avg: '$metrics.approvalRate' },
          teamAvgResponseTime: { $avg: '$metrics.avgResponseTime' },
          teamAvgSLACompliance: { $avg: '$slaPerformance.slaComplianceRate' },
          teamTotalActions: { $sum: '$metrics.totalActions' },
          topPerformerScore: { $max: '$overallPerformanceScore' },
          lowestPerformerScore: { $min: '$overallPerformanceScore' }
        }
      }
    ]);
    
    // Get historical comparison (last 6 periods)
    const periods = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      if (period === 'monthly') {
        date.setMonth(date.getMonth() - i);
        periods.push(date.toISOString().slice(0, 7));
      } else {
        date.setDate(date.getDate() - i);
        periods.push(date.toISOString().slice(0, 10));
      }
    }
    
    const historicalData = await AdminMetrics.aggregate([
      { 
        $match: { 
          period: { $in: periods }, 
          periodType: period,
          adminId: { $in: teamData.map(admin => admin.adminId._id) }
        } 
      },
      {
        $group: {
          _id: { period: '$period', adminId: '$adminId' },
          approvalRate: { $first: '$metrics.approvalRate' },
          responseTime: { $first: '$metrics.avgResponseTime' },
          slaCompliance: { $first: '$slaPerformance.slaComplianceRate' },
          overallScore: { $first: '$overallPerformanceScore' }
        }
      },
      { $sort: { '_id.period': 1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id.adminId',
          foreignField: '_id',
          as: 'admin'
        }
      },
      { $unwind: '$admin' },
      {
        $group: {
          _id: '$admin._id',
          adminName: { $first: '$admin.name' },
          trends: {
            $push: {
              period: '$_id.period',
              approvalRate: '$approvalRate',
              responseTime: '$responseTime',
              slaCompliance: '$slaCompliance',
              overallScore: '$overallScore'
            }
          }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: currentPeriod,
        metric,
        teamStats: teamStats[0] || {},
        rankings: teamData,
        historicalTrends: historicalData,
        comparisonDate: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get individual admin performance trends
 * @route   GET /api/v1/admin/performance/trends/:adminId
 * @access  Private/Admin
 */
exports.getAdminTrends = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { periods = 12, periodType = 'monthly' } = req.query;
    
    // Validate admin exists
    const admin = await User.findById(adminId).select('name email role');
    if (!admin) {
      return next(new ErrorResponse('Admin not found', 404));
    }
    
    // Get trend data
    const trends = await AdminMetrics.getPerformanceTrends(adminId, parseInt(periods));
    
    // Calculate improvement metrics
    const improvements = {
      approvalRateChange: 0,
      responseTimeChange: 0,
      slaComplianceChange: 0,
      overallScoreChange: 0
    };
    
    if (trends.length >= 2) {
      const latest = trends[0];
      const previous = trends[1];
      
      improvements.approvalRateChange = latest.metrics?.approvalRate - previous.metrics?.approvalRate;
      improvements.responseTimeChange = previous.metrics?.avgResponseTime - latest.metrics?.avgResponseTime; // Negative means improvement
      improvements.slaComplianceChange = latest.slaPerformance?.slaComplianceRate - previous.slaPerformance?.slaComplianceRate;
      improvements.overallScoreChange = latest.overallPerformanceScore - previous.overallPerformanceScore;
    }
    
    // Get recent activity summary
    const recentActivity = await AuditLog.find({
      userId: adminId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
    .select('action entityType createdAt description')
    .sort({ createdAt: -1 })
    .limit(20);
    
    res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        },
        trends,
        improvements,
        recentActivity,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get SLA configuration overview
 * @route   GET /api/v1/admin/performance/sla-config
 * @access  Private/Admin
 */
exports.getSLAConfiguration = async (req, res, next) => {
  try {
    const { entityType, actionType, isActive = true } = req.query;
    
    // Build query
    let query = {};
    if (entityType) query.entityType = entityType;
    if (actionType) query.actionType = actionType;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const configs = await SLAConfig.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ entityType: 1, actionType: 1, priority: 1 });
    
    // Get SLA compliance summary
    const complianceSummary = await AdminMetrics.aggregate([
      { $unwind: '$slaViolations' },
      {
        $group: {
          _id: {
            entityType: '$slaViolations.entityType',
            violationType: '$slaViolations.violationType'
          },
          totalViolations: { $sum: 1 },
          avgExceedance: { $avg: { $subtract: ['$slaViolations.responseTime', '$slaViolations.slaTarget'] } }
        }
      },
      {
        $group: {
          _id: '$_id.entityType',
          violations: {
            $push: {
              violationType: '$_id.violationType',
              count: '$totalViolations',
              avgExceedance: '$avgExceedance'
            }
          },
          totalForEntity: { $sum: '$totalViolations' }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      count: configs.length,
      data: {
        configurations: configs,
        complianceSummary,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Generate performance report
 * @route   POST /api/v1/admin/performance/generate-report
 * @access  Private/Admin
 */
exports.generatePerformanceReport = async (req, res, next) => {
  try {
    const {
      reportType = 'comprehensive', // comprehensive, summary, violations
      period = 'monthly',
      startDate,
      endDate,
      adminIds,
      includeCharts = false
    } = req.body;
    
    const reportData = {
      reportType,
      period,
      dateRange: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id
    };
    
    // Build date range query
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery.period = { $gte: startDate, $lte: endDate };
    }
    
    // Build admin filter
    let adminFilter = {};
    if (adminIds && adminIds.length > 0) {
      adminFilter.adminId = { $in: adminIds.map(id => mongoose.Types.ObjectId(id)) };
    }
    
    const query = { ...dateQuery, ...adminFilter, periodType: period };
    
    if (reportType === 'comprehensive') {
      // Full comprehensive report
      const [
        metricsData,
        violationsData,
        trendAnalysis,
        teamComparison
      ] = await Promise.all([
        AdminMetrics.find(query)
          .populate('adminId', 'name email role')
          .sort({ period: -1 }),
          
        AdminMetrics.aggregate([
          { $match: query },
          { $unwind: '$slaViolations' },
          {
            $group: {
              _id: '$adminId',
              totalViolations: { $sum: 1 },
              violations: { $push: '$slaViolations' }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'admin'
            }
          },
          { $unwind: '$admin' }
        ]),
        
        AdminMetrics.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$period',
              avgApprovalRate: { $avg: '$metrics.approvalRate' },
              avgResponseTime: { $avg: '$metrics.avgResponseTime' },
              avgSLACompliance: { $avg: '$slaPerformance.slaComplianceRate' },
              totalActions: { $sum: '$metrics.totalActions' }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        
        AdminMetrics.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$adminId',
              avgPerformance: { $avg: '$overallPerformanceScore' },
              totalActions: { $sum: '$metrics.totalActions' }
            }
          },
          { $sort: { avgPerformance: -1 } },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'admin'
            }
          },
          { $unwind: '$admin' }
        ])
      ]);
      
      reportData.metrics = metricsData;
      reportData.violations = violationsData;
      reportData.trends = trendAnalysis;
      reportData.teamComparison = teamComparison;
      
    } else if (reportType === 'summary') {
      // Summary report with key metrics only
      const summaryData = await AdminMetrics.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAdmins: { $addToSet: '$adminId' },
            avgApprovalRate: { $avg: '$metrics.approvalRate' },
            avgResponseTime: { $avg: '$metrics.avgResponseTime' },
            avgSLACompliance: { $avg: '$slaPerformance.slaComplianceRate' },
            totalActions: { $sum: '$metrics.totalActions' },
            totalViolations: { $sum: { $size: '$slaViolations' } }
          }
        },
        {
          $addFields: {
            totalAdmins: { $size: '$totalAdmins' }
          }
        }
      ]);
      
      reportData.summary = summaryData[0] || {};
      
    } else if (reportType === 'violations') {
      // Violations-focused report
      const violationsReport = await AdminMetrics.aggregate([
        { $match: query },
        { $unwind: '$slaViolations' },
        {
          $group: {
            _id: {
              adminId: '$adminId',
              entityType: '$slaViolations.entityType',
              violationType: '$slaViolations.violationType'
            },
            count: { $sum: 1 },
            avgExceedance: { $avg: { $subtract: ['$slaViolations.responseTime', '$slaViolations.slaTarget'] } },
            violations: { $push: '$slaViolations' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.adminId',
            foreignField: '_id',
            as: 'admin'
          }
        },
        { $unwind: '$admin' },
        { $sort: { count: -1 } }
      ]);
      
      reportData.violationsAnalysis = violationsReport;
    }
    
    // Log report generation
    await AuditLog.logAction({
      userId: req.user.id,
      userRole: req.user.role,
      action: 'performance_report_generated',
      entityType: 'AdminMetrics',
      description: `Generated ${reportType} performance report`,
      severity: 'low',
      impactLevel: 'minor',
      metadata: {
        reportType,
        period,
        dateRange: reportData.dateRange,
        adminCount: adminIds ? adminIds.length : 'all'
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Performance report generated successfully',
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPerformanceDashboard: exports.getPerformanceDashboard,
  getPerformanceMetrics: exports.getPerformanceMetrics,
  getSLAViolations: exports.getSLAViolations,
  getTeamComparison: exports.getTeamComparison,
  getAdminTrends: exports.getAdminTrends,
  getSLAConfiguration: exports.getSLAConfiguration,
  generatePerformanceReport: exports.generatePerformanceReport
};