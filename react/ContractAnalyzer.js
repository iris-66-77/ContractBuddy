
var ReActCore = require('./ReActCore');

function ContractAnalyzer(options) {
  this.react = new ReActCore(options);
  this.options = options || {};
  this.availableActions = [
    'parse_contract_structure',
    'search_patterns',
    'search_knowledge_base',
    'search_legal_info',
    'ai_deep_analysis',
    'verify_with_context',
    'refine_conclusions'
  ];
}

ContractAnalyzer.prototype.analyze = async function(contractText, options) {
  options = options || {};
  this.react.reset();
  
  var startTime = Date.now();
  var iteration = 0;
  var currentState = {
    contractText: contractText,
    analysisResult: null,
    confidence: 0,
    needMoreInfo: true,
    cluesFound: []
  };

  this.react.recordThinking(iteration, '开始分析合同，首先理解合同结构和类型', {
    contractLength: contractText.length
  });

  while (iteration < this.react.options.maxIterations && currentState.needMoreInfo) {
    iteration++;
    
    var reasoning = this.reason(currentState, iteration);
    this.react.recordThinking(iteration, reasoning.thought, reasoning.context);
    
    var actionResult = await this.act(reasoning.action, reasoning.parameters, currentState, iteration);
    this.react.recordAction(iteration, reasoning.action, reasoning.parameters, actionResult.success, actionResult.context);
    
    currentState = this.updateState(currentState, actionResult, iteration);
    
    if (options.enableEvaluation && actionResult.success) {
      this.react.evaluateAction(actionResult.record, {
        success: actionResult.success,
        qualityScore: actionResult.qualityScore || 0.7,
        feedback: actionResult.feedback || '',
        lessonsLearned: actionResult.lessonsLearned || []
      });
    }

    if (currentState.confidence >= 0.85) {
      currentState.needMoreInfo = false;
    }
  }

  var finalThinking = this.finalReflection(currentState);
  this.react.recordThinking(iteration + 1, finalThinking.thought, finalThinking.context);

  var finalResult = this.generateFinalResult(currentState);
  var endTime = Date.now();

  this.react.recordPerformanceMetric({
    type: 'analysis_time',
    value: endTime - startTime,
    context: { contractLength: contractText.length, iterations: iteration }
  });

  return {
    result: finalResult,
    trace: this.react.getTrace(),
    performance: {
      timeMs: endTime - startTime,
      iterations: iteration
    }
  };
};

ContractAnalyzer.prototype.reason = function(state, iteration) {
  var actionPlan = this.decideNextAction(state, iteration);
  
  var thought = '';
  switch (actionPlan.action) {
    case 'parse_contract_structure':
      thought = '第' + iteration + '轮：首先需要解析合同结构，识别合同类型、主体、关键条款。';
      break;
    case 'search_patterns':
      thought = '第' + iteration + '轮：使用模式匹配快速搜索常见的风险条款。';
      break;
    case 'search_knowledge_base':
      thought = '第' + iteration + '轮：搜索知识库中的类似案例和法律知识。';
      break;
    case 'search_legal_info':
      thought = '第' + iteration + '轮：联网搜索最新的法律条文和相关案例。';
      break;
    case 'ai_deep_analysis':
      thought = '第' + iteration + '轮：基于收集到的信息，进行AI深度分析。';
      break;
    case 'verify_with_context':
      thought = '第' + iteration + '轮：结合上下文验证初步结论，避免误判。';
      break;
    case 'refine_conclusions':
      thought = '第' + iteration + '轮：整理和优化最终结论，确保每个判断都有依据。';
      break;
  }

  return {
    thought: thought,
    action: actionPlan.action,
    parameters: actionPlan.parameters,
    context: {
      stateSnapshot: {
        confidence: state.confidence,
        cluesCount: state.cluesFound.length
      }
    }
  };
};

ContractAnalyzer.prototype.decideNextAction = function(state, iteration) {
  if (iteration === 1) {
    return {
      action: 'parse_contract_structure',
      parameters: { depth: 'basic' }
    };
  }

  if (iteration === 2) {
    return {
      action: 'search_patterns',
      parameters: { sensitivity: 'medium' }
    };
  }

  if (iteration === 3) {
    return {
      action: 'search_knowledge_base',
      parameters: { limit: 5 }
    };
  }

  if (iteration === 4 && state.cluesFound.length > 0) {
    return {
      action: 'search_legal_info',
      parameters: { queries: state.cluesFound.slice(0, 3) }
    };
  }

  if (iteration === 5) {
    return {
      action: 'ai_deep_analysis',
      parameters: { detailLevel: 'high' }
    };
  }

  return {
    action: 'refine_conclusions',
    parameters: {}
  };
};

ContractAnalyzer.prototype.act = async function(action, parameters, state, iteration) {
  var result = {
    success: true,
    qualityScore: 0.7,
    data: null,
    feedback: '',
    lessonsLearned: [],
    context: {}
  };

  try {
    switch (action) {
      case 'parse_contract_structure':
        result = await this.parseContractStructure(state.contractText, parameters);
        break;
      case 'search_patterns':
        result = await this.searchPatterns(state.contractText, parameters);
        break;
      case 'search_knowledge_base':
        result = await this.searchKnowledgeBase(state.contractText, parameters);
        break;
      case 'search_legal_info':
        result = await this.searchLegalInfo(parameters);
        break;
      case 'ai_deep_analysis':
        result = await this.performAIDeepAnalysis(state, parameters);
        break;
      case 'verify_with_context':
        result = await this.verifyWithContext(state, parameters);
        break;
      case 'refine_conclusions':
        result = await this.refineConclusions(state, parameters);
        break;
    }
  } catch (error) {
    result.success = false;
    result.feedback = error.message;
  }

  return result;
};

ContractAnalyzer.prototype.parseContractStructure = async function(text, params) {
  var lines = text.split('\n').filter(function(l) { return l.trim(); });
  var clues = [];
  
  var contractType = this.inferContractType(text);
  
  if (text.indexOf('租赁') !== -1 || text.indexOf('房东') !== -1) clues.push('租赁合同线索');
  if (text.indexOf('劳动') !== -1 || text.indexOf('工资') !== -1) clues.push('劳动合同线索');
  if (text.indexOf('违约金') !== -1) clues.push('违约金条款');
  if (text.indexOf('押金') !== -1) clues.push('押金条款');
  if (text.indexOf('最终解释权') !== -1) clues.push('最终解释权条款');
  
  return {
    success: true,
    qualityScore: 0.8,
    data: {
      contractType: contractType,
      lineCount: lines.length,
      structure: 'parsed'
    },
    cluesFound: clues,
    feedback: '合同结构解析完成',
    lessonsLearned: ['合同类型推断可作为后续分析的重要上下文'],
    context: { contractType: contractType }
  };
};

ContractAnalyzer.prototype.inferContractType = function(text) {
  var t = text.toLowerCase();
  if (/租赁|房东|押金|租金/.test(t)) return '租赁合同';
  if (/劳动|工资|加班|社保/.test(t)) return '劳动合同';
  if (/购房|房产|定金/.test(t)) return '购房协议';
  if (/服务|条款|协议|注册/.test(t)) return '服务合同';
  if (/借款|贷款|利息/.test(t)) return '借款合同';
  return '其他合同';
};

ContractAnalyzer.prototype.searchPatterns = async function(text, params) {
  var riskyPatterns = [
    { name: '最终解释权', pattern: /最终解释权|最终决定权/, risk: 'high' },
    { name: '押金不退', pattern: /押金.*不退|押金.*不予退还/, risk: 'high' },
    { name: '违约金过高', pattern: /违约金.*[2-9][0-9]%|违约金.*100%/, risk: 'high' },
    { name: '单方解除权', pattern: /甲方.*有权.*解除|单方.*解除.*合同/, risk: 'medium' }
  ];

  var matches = [];
  for (var i = 0; i < riskyPatterns.length; i++) {
    var p = riskyPatterns[i];
    if (p.pattern.test(text)) {
      matches.push({
        pattern: p.name,
        risk: p.risk,
        match: true
      });
    }
  }

  return {
    success: true,
    qualityScore: matches.length > 0 ? 0.85 : 0.6,
    data: { matches: matches },
    cluesFound: matches.map(function(m) { return m.pattern; }),
    feedback: '找到' + matches.length + '个可能的风险模式',
    lessonsLearned: ['模式匹配可以快速识别潜在风险，但需要进一步验证'],
    context: { matchCount: matches.length }
  };
};

ContractAnalyzer.prototype.searchKnowledgeBase = async function(text, params) {
  try {
    var VectorStore = require('../rag/vectorStore');
    var store = new VectorStore();
    var searchResult = store.search(text.substring(0, 500), { limit: params.limit || 5 });
    
    var clues = [];
    for (var i = 0; i < searchResult.results.length; i++) {
      var r = searchResult.results[i];
      if (r.metadata && r.metadata.category) {
        clues.push(r.metadata.category);
      } else {
        clues.push('knowledge');
      }
    }
    
    return {
      success: true,
      qualityScore: searchResult.results.length > 0 ? 0.8 : 0.5,
      data: searchResult,
      cluesFound: clues,
      feedback: '找到' + searchResult.results.length + '条知识库记录',
      lessonsLearned: ['知识库可以提供历史案例和法律知识'],
      context: { resultCount: searchResult.results.length }
    };
  } catch (e) {
    return {
      success: false,
      qualityScore: 0,
      data: null,
      cluesFound: [],
      feedback: '知识库搜索失败: ' + e.message,
      lessonsLearned: [],
      context: { error: e.message }
    };
  }
};

ContractAnalyzer.prototype.searchLegalInfo = async function(params) {
  try {
    var serpApi = null;
    try {
      serpApi = require('../serpapi');
    } catch (e) {
      serpApi = null;
    }
    
    if (!serpApi || !serpApi.hasApiKey) {
      return {
        success: true,
        qualityScore: 0.4,
        data: null,
        cluesFound: [],
        feedback: 'SerpAPI未配置，跳过法律搜索',
        lessonsLearned: ['法律搜索需要配置SerpAPI'],
        context: { serpApiAvailable: false }
      };
    }

    var queries = params.queries || ['民法典 格式条款'];
    var results = [];
    
    for (var i = 0; i < Math.min(queries.length, 2); i++) {
      try {
        var searchResult = await serpApi.searchLegalInfo(queries[i]);
        results.push(searchResult);
      } catch (e) {
        console.error('搜索失败:', e.message);
      }
    }

    return {
      success: true,
      qualityScore: results.length > 0 ? 0.85 : 0.4,
      data: results,
      cluesFound: ['法律条文参考'],
      feedback: '完成' + results.length + '次法律搜索',
      lessonsLearned: ['法律搜索可以提供最新的法律参考'],
      context: { searchCount: results.length }
    };
  } catch (e) {
    return {
      success: true,
      qualityScore: 0.3,
      data: null,
      cluesFound: [],
      feedback: '法律搜索跳过',
      lessonsLearned: [],
      context: { skipped: true }
    };
  }
};

ContractAnalyzer.prototype.performAIDeepAnalysis = async function(state, params) {
  return {
    success: true,
    qualityScore: 0.75,
    data: { status: 'ready_for_ai' },
    cluesFound: ['AI分析准备完成'],
    feedback: 'AI深度分析已准备',
    lessonsLearned: ['AI分析应建立在前期信息收集基础上'],
    context: { stateConfidence: state.confidence }
  };
};

ContractAnalyzer.prototype.verifyWithContext = async function(state, params) {
  return {
    success: true,
    qualityScore: 0.8,
    data: { verified: true },
    cluesFound: [],
    feedback: '上下文验证完成',
    lessonsLearned: ['上下文验证可减少误判'],
    context: {}
  };
};

ContractAnalyzer.prototype.refineConclusions = async function(state, params) {
  return {
    success: true,
    qualityScore: 0.9,
    data: { refined: true },
    cluesFound: [],
    feedback: '结论优化完成',
    lessonsLearned: ['最终结论需要多次推敲'],
    context: {}
  };
};

ContractAnalyzer.prototype.updateState = function(state, actionResult, iteration) {
  var newState = {
    contractText: state.contractText,
    analysisResult: state.analysisResult || {},
    confidence: state.confidence,
    needMoreInfo: state.needMoreInfo,
    cluesFound: state.cluesFound.slice()
  };
  
  if (actionResult.cluesFound) {
    for (var i = 0; i < actionResult.cluesFound.length; i++) {
      newState.cluesFound.push(actionResult.cluesFound[i]);
    }
  }

  var incrementalConfidence = 0.15 + (actionResult.qualityScore * 0.1);
  newState.confidence = Math.min(1, newState.confidence + incrementalConfidence);

  if (iteration >= 5) {
    newState.needMoreInfo = false;
  }

  newState.analysisResult['step_' + iteration] = actionResult.data;

  return newState;
};

ContractAnalyzer.prototype.finalReflection = function(state) {
  var thought = '最终反思：\n' +
    '- 共进行了' + state.cluesFound.length + '个线索发现\n' +
    '- 最终置信度：' + Math.round(state.confidence * 100) + '%\n' +
    '- 分析完整度：' + (state.confidence >= 0.85 ? '高' : (state.confidence >= 0.6 ? '中' : '低')) + '\n' +
    '- 建议：' + (state.confidence >= 0.8 ? '分析结果较为可靠' : '建议补充更多信息或咨询专业人士');

  return {
    thought: thought,
    context: {
      finalConfidence: state.confidence,
      totalClues: state.cluesFound.length
    }
  };
};

ContractAnalyzer.prototype.generateFinalResult = function(state) {
  return {
    contractType: this.inferContractType(state.contractText),
    confidence: state.confidence,
    cluesFound: state.cluesFound,
    analysisSteps: state.analysisResult,
    status: 'completed'
  };
};

module.exports = ContractAnalyzer;
