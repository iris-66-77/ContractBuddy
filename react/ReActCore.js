
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

function ReActCore(options) {
  options = options || {};
  this.options = {
    dataDir: options.dataDir || path.join(__dirname, '..', 'data'),
    maxIterations: options.maxIterations || 5,
    enableReflection: options.enableReflection !== false
  };
  
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      this.options[key] = options[key];
    }
  }

  this.ensureDataDir();
  this.thinkingHistory = [];
  this.actionHistory = [];
  this.feedbackStore = this.loadFeedbackStore();
}

ReActCore.prototype.ensureDataDir = function() {
  if (!fs.existsSync(this.options.dataDir)) {
    fs.mkdirSync(this.options.dataDir, { recursive: true });
  }
};

ReActCore.prototype.loadFeedbackStore = function() {
  var feedbackPath = path.join(this.options.dataDir, 'react_feedback.json');
  if (fs.existsSync(feedbackPath)) {
    try {
      return JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));
    } catch (e) {
      console.error('加载反馈存储失败:', e.message);
    }
  }
  return {
    version: '1.0',
    feedbackEntries: [],
    strategyAdjustments: [],
    performanceMetrics: []
  };
};

ReActCore.prototype.saveFeedbackStore = function() {
  var feedbackPath = path.join(this.options.dataDir, 'react_feedback.json');
  fs.writeFileSync(feedbackPath, JSON.stringify(this.feedbackStore, null, 2), 'utf-8');
};

ReActCore.prototype.generateId = function() {
  return crypto.randomBytes(16).toString('hex');
};

ReActCore.prototype.recordThinking = function(iteration, thought, context) {
  var thinkingRecord = {
    id: this.generateId(),
    timestamp: new Date().toISOString(),
    iteration: iteration,
    thought: thought,
    context: context || {},
    type: 'reasoning'
  };
  this.thinkingHistory.push(thinkingRecord);
  return thinkingRecord;
};

ReActCore.prototype.recordAction = function(iteration, action, parameters, result, context) {
  var actionRecord = {
    id: this.generateId(),
    timestamp: new Date().toISOString(),
    iteration: iteration,
    action: action,
    parameters: parameters,
    result: result,
    context: context || {},
    type: 'acting'
  };
  this.actionHistory.push(actionRecord);
  return actionRecord;
};

ReActCore.prototype.evaluateAction = function(actionRecord, outcome) {
  var evaluation = {
    actionId: actionRecord.id,
    timestamp: new Date().toISOString(),
    success: outcome.success,
    qualityScore: outcome.qualityScore || 0,
    feedback: outcome.feedback || '',
    lessonsLearned: outcome.lessonsLearned || []
  };

  this.feedbackStore.feedbackEntries.push(evaluation);
  this.saveFeedbackStore();
  return evaluation;
};

ReActCore.prototype.recordStrategyAdjustment = function(adjustment) {
  var adjustmentRecord = {
    id: this.generateId(),
    timestamp: new Date().toISOString(),
    adjustment: adjustment,
    reason: adjustment.reason || '',
    previousState: adjustment.previousState || null,
    newState: adjustment.newState || null
  };
  this.feedbackStore.strategyAdjustments.push(adjustmentRecord);
  this.saveFeedbackStore();
  return adjustmentRecord;
};

ReActCore.prototype.recordPerformanceMetric = function(metric) {
  var metricRecord = {
    id: this.generateId(),
    timestamp: new Date().toISOString(),
    metricType: metric.type,
    value: metric.value,
    context: metric.context || {}
  };
  this.feedbackStore.performanceMetrics.push(metricRecord);
  this.saveFeedbackStore();
  return metricRecord;
};

ReActCore.prototype.getThinkingChain = function() {
  var self = this;
  return this.thinkingHistory.map(function(t, idx) {
    return {
      step: idx + 1,
      iteration: t.iteration,
      thought: t.thought,
      timestamp: t.timestamp
    };
  });
};

ReActCore.prototype.getActionChain = function() {
  var self = this;
  return this.actionHistory.map(function(a, idx) {
    return {
      step: idx + 1,
      iteration: a.iteration,
      action: a.action,
      result: a.result ? 'success' : 'failed',
      timestamp: a.timestamp
    };
  });
};

ReActCore.prototype.getTrace = function() {
  var totalIterations = 0;
  for (var i = 0; i < this.thinkingHistory.length; i++) {
    if (this.thinkingHistory[i].iteration > totalIterations) {
      totalIterations = this.thinkingHistory[i].iteration;
    }
  }
  for (var j = 0; j < this.actionHistory.length; j++) {
    if (this.actionHistory[j].iteration > totalIterations) {
      totalIterations = this.actionHistory[j].iteration;
    }
  }
  
  return {
    thinking: this.getThinkingChain(),
    acting: this.getActionChain(),
    summary: {
      totalIterations: totalIterations,
      thinkingCount: this.thinkingHistory.length,
      actionCount: this.actionHistory.length
    }
  };
};

ReActCore.prototype.reset = function() {
  this.thinkingHistory = [];
  this.actionHistory = [];
};

ReActCore.prototype.getLessonsLearned = function(limit) {
  limit = limit || 10;
  var lessons = [];
  for (var i = 0; i < this.feedbackStore.feedbackEntries.length; i++) {
    var entry = this.feedbackStore.feedbackEntries[i];
    if (entry.lessonsLearned && entry.lessonsLearned.length > 0) {
      for (var j = 0; j < entry.lessonsLearned.length; j++) {
        lessons.push(entry.lessonsLearned[j]);
      }
    }
  }
  return lessons.slice(-limit);
};

ReActCore.prototype.getPerformanceTrend = function(metricType, limit) {
  limit = limit || 20;
  var metrics = [];
  for (var i = 0; i < this.feedbackStore.performanceMetrics.length; i++) {
    var metric = this.feedbackStore.performanceMetrics[i];
    if (metric.metricType === metricType) {
      metrics.push(metric);
    }
  }
  return metrics.slice(-limit);
};

module.exports = ReActCore;
