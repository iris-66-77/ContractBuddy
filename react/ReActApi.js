
var ReActCore = require('./ReActCore');
var ContractAnalyzer = require('./ContractAnalyzer');

function ReActApi() {
  this.reactCore = new ReActCore();
  this.contractAnalyzer = new ContractAnalyzer();
}

ReActApi.prototype.handleAnalyzeWithReAct = async function(req, res, parseBody) {
  try {
    var body = await parseBody(req);
    var contractText = body.contractText || body.text;

    if (!contractText || contractText.trim().length < 10) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '请提供有效的合同文本（至少10个字符）' }));
      return;
    }

    var result = await this.contractAnalyzer.analyze(contractText, {
      enableEvaluation: true
    });

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: result.result,
      reactTrace: result.trace,
      performance: result.performance
    }));
  } catch (error) {
    console.error('ReAct分析错误:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '分析失败: ' + error.message }));
  }
};

ReActApi.prototype.handleGetTrace = function(req, res) {
  var trace = this.reactCore.getTrace();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    success: true,
    trace: trace
  }));
};

ReActApi.prototype.handleGetFeedback = function(req, res, urlParse) {
  var query = urlParse.query || {};
  var limit = query.limit ? parseInt(query.limit) : 20;

  var feedback = this.reactCore.feedbackStore.feedbackEntries.slice(-limit);
  var metrics = this.reactCore.feedbackStore.performanceMetrics.slice(-limit);
  var lessons = this.reactCore.getLessonsLearned(10);

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    success: true,
    feedback: feedback,
    metrics: metrics,
    lessonsLearned: lessons
  }));
};

ReActApi.prototype.handleSubmitFeedback = async function(req, res, parseBody) {
  try {
    var body = await parseBody(req);

    if (body.type === 'action_feedback' && body.actionId) {
      var evaluation = this.reactCore.evaluateAction(
        { id: body.actionId },
        {
          success: body.success !== false,
          qualityScore: body.qualityScore || 0.7,
          feedback: body.feedback || '',
          lessonsLearned: body.lessonsLearned || []
        }
      );

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        evaluation: evaluation
      }));
      return;
    }

    if (body.type === 'strategy_adjustment') {
      var adjustment = this.reactCore.recordStrategyAdjustment({
        reason: body.reason,
        previousState: body.previousState,
        newState: body.newState
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        adjustment: adjustment
      }));
      return;
    }

    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '未知的反馈类型' }));
  } catch (error) {
    console.error('反馈提交错误:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '提交失败: ' + error.message }));
  }
};

ReActApi.prototype.handleGetStatus = function(req, res) {
  var lessons = this.reactCore.getLessonsLearned(10);
  var analysisTimeTrend = this.reactCore.getPerformanceTrend('analysis_time', 20);

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    success: true,
    status: {
      framework: 'ReAct',
      version: '1.0',
      feedbackCount: this.reactCore.feedbackStore.feedbackEntries.length,
      metricCount: this.reactCore.feedbackStore.performanceMetrics.length,
      lessonsLearned: lessons,
      recentPerformance: {
        analysisTime: analysisTimeTrend
      }
    }
  }));
};

ReActApi.prototype.handleReset = function(req, res) {
  this.reactCore.reset();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    success: true,
    message: 'ReAct状态已重置'
  }));
};

module.exports = ReActApi;
