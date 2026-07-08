
const VectorStore = require('./vectorStore');
const { ClauseMatcher } = require('./patternLibrary');
const EmbeddingService = require('./embeddingService');

class EnhancedAnalyzer {
  constructor(vectorStore, embeddingService) {
    this.vectorStore = vectorStore || new VectorStore();
    this.embeddingService = embeddingService || null;
    this.clauseMatcher = new ClauseMatcher();
    this.initializeKnowledgeBase();
  }

  initializeKnowledgeBase() {
    var knowledgeItems = [
      {
        content: '中国法律文件标准格式要求：1.合同标题居中，使用"××合同"命名；2.合同编号（如需）置于标题右下方；3.当事人信息栏：甲方名称、法定代表人、住所地、联系电话、统一社会信用代码；乙方同上；4.鉴于条款（前言）：写明签约背景和目的；5.正文条款按第一条、第二条...顺序编号；6.每条内容使用全角标点；7.签署栏：甲方签章处、法定代表人/授权代表、日期；乙方同上；8.附件清单（如有）。合同文本应使用宋体或仿宋，标题二号加粗，正文三号。',
        metadata: { type: 'format', category: '法律文书格式', riskLevel: 'none', source: '中国法律文书写作规范' }
      },
      {
        content: '合同签署栏法律要求：必须有双方当事人签章（公章或合同专用章）、法定代表人或授权代理人签字、签署日期。自然人签署需本人签字并按捺手印（金额较大时建议公证）。法人签署需加盖公章并由法定代表人或授权代理人签字。签署日期应使用"××××年××月××日"格式。合同生效条件应在合同正文中明确约定。',
        metadata: { type: 'format', category: '签署规范', riskLevel: 'none', source: '合同法签署要求' }
      },
      {
        content: '合同必备条款（民法典第470条）：合同内容由当事人约定，一般包括下列条款：（一）当事人的姓名或者名称和住所；（二）标的；（三）数量；（四）质量；（五）价款或者报酬；（六）履行期限、地点和方式；（七）违约责任；（八）解决争议的方法。缺少必备条款可能导致合同不成立或无法履行。',
        metadata: { type: 'law', category: '民法典', riskLevel: 'medium', source: '民法典第470条' }
      },
      {
        content: '租赁合同法律要点：应包含房屋具体坐落地址、建筑面积、房屋用途、租赁期限、租金数额及支付方式、押金数额及退还条件、房屋维修责任、装修改造约定、转租条件、合同解除条件、违约责任、争议解决方式。依据民法典第七百零三条至第七百三十四条。',
        metadata: { type: 'format', category: '租赁合同', riskLevel: 'none', source: '民法典租赁合同章' }
      },
      {
        content: '劳动合同法律要点：应包含用人单位名称、住所、法定代表人；劳动者姓名、住址、身份证号；合同期限（固定/无固定/以完成一定工作为期限）；工作内容和工作地点；工作时间和休息休假；劳动报酬；社会保险；劳动保护；合同解除和终止条件。依据劳动合同法第十七条。试用期不得超过：不满一年一个月，一到三年两个月，三年以上六个月。',
        metadata: { type: 'format', category: '劳动合同', riskLevel: 'none', source: '劳动合同法第17条、第19条' }
      },
      {
        content: '借款合同法律要点：应包含借款人和出借人完整身份信息、借款金额（大写和小写）、借款用途、借款期限、借款利率（不得超过LPR四倍）、还款方式、担保方式（如有）、违约责任、争议解决方式。自然人之间借款建议写明转账方式及账户信息。依据民法典第六百六十七条至第六百八十条。',
        metadata: { type: 'format', category: '借款合同', riskLevel: 'none', source: '民法典借款合同章' }
      },
      {
        content: '服务合同法律要点：应包含服务内容的具体描述和标准、服务期限、服务费用及支付节点、服务质量验收标准、保密条款、知识产权归属（如适用）、违约责任及赔偿计算方式、合同解除条件、争议解决方式。依据民法典合同编通则及服务合同相关规定。',
        metadata: { type: 'format', category: '服务合同', riskLevel: 'none', source: '民法典合同编' }
      },
      {
        content: '合同编号规范：合同编号一般由年份+合同类型缩写+流水号组成，如"2026-LZ-001"表示2026年第001号租赁合同。劳动合同编号应包含部门信息以便管理。编号有助于合同管理和纠纷处理时的证据保全。',
        metadata: { type: 'format', category: '法律文书格式', riskLevel: 'none', source: '合同管理规范' }
      },
      {
        content: '根据民法典第497条，提供格式条款一方免除其责任、加重对方责任、排除对方主要权利的，该格式条款无效。',
        metadata: { type: 'law', category: '民法典', riskLevel: 'high', source: '民法典第497条' }
      },
      {
        content: '违约金超过实际损失30%的部分，当事人可以请求人民法院或者仲裁机构予以适当减少。',
        metadata: { type: 'law', category: '民法典', riskLevel: 'high', source: '民法典第585条' }
      },
      {
        content: '租赁合同中，出租人不得擅自进入承租人房屋或处置承租人财物，必须通过法律途径。',
        metadata: { type: 'knowledge', category: '租赁合同', riskLevel: 'critical', source: '租赁合同法律常识' }
      },
      {
        content: '最终解释权条款在法律上存在争议，对格式条款有两种以上解释的，应当作出不利于提供格式条款一方的解释。',
        metadata: { type: 'knowledge', category: '格式条款', riskLevel: 'high', source: '民法典第498条' }
      },
      {
        content: '押金的性质是履约担保，租赁合同终止后，如无违约情形，出租人应当退还押金。',
        metadata: { type: 'knowledge', category: '租赁合同', riskLevel: 'medium', source: '押金法律性质' }
      },
      {
        content: '因不可抗力不能履行合同的，根据不可抗力的影响，部分或者全部免除责任，但法律另有规定的除外。',
        metadata: { type: 'law', category: '民法典', riskLevel: 'medium', source: '民法典第590条' }
      },
      {
        content: '实习协议不属于劳动合同，不受劳动法调整，但应遵循民事法律的公平原则和诚实信用原则。',
        metadata: { type: 'law', category: '实习协议', riskLevel: 'high', source: '实习协议法律性质' }
      },
      {
        content: '三方协议是学校、学生、用人单位三方签订的协议，任何一方不得擅自变更或解除协议内容。',
        metadata: { type: 'knowledge', category: '三方协议', riskLevel: 'medium', source: '三方协议法律常识' }
      },
      {
        content: '实习期间用人单位应当为实习生提供必要的劳动保护和安全生产条件，保障实习生人身安全。',
        metadata: { type: 'law', category: '实习权益', riskLevel: 'critical', source: '实习安全保障' }
      },
      {
        content: '实习报酬应遵循公平原则，不得低于当地最低工资标准或合理的实习补贴标准。',
        metadata: { type: 'law', category: '实习报酬', riskLevel: 'high', source: '实习报酬规定' }
      },
      {
        content: '三方协议中如约定"一方违约需支付巨额违约金"，可能因显失公平而被认定为无效条款。',
        metadata: { type: 'knowledge', category: '三方协议', riskLevel: 'high', source: '违约金公平原则' }
      },
      {
        content: '实习协议中不得约定"实习生必须无偿加班"或"无条件接受岗位调动"等排除实习生主要权利的条款。',
        metadata: { type: 'knowledge', category: '实习协议', riskLevel: 'critical', source: '实习权利保护' }
      },
      {
        content: '实习期限应明确约定，不得超过法律规定或合理范围，延期应经双方协商一致。',
        metadata: { type: 'knowledge', category: '实习协议', riskLevel: 'medium', source: '实习期限规定' }
      },
      {
        content: '三方协议中学校的主要义务是推荐学生、协助管理学生实习，不得免除自身应尽的管理和保护责任。',
        metadata: { type: 'knowledge', category: '三方协议', riskLevel: 'medium', source: '学校责任界定' }
      },
      {
        content: '实习期间实习生造成他人损害的，用人单位和学校根据过错程度承担相应责任，实习生有过错的也应承担责任。',
        metadata: { type: 'law', category: '实习责任', riskLevel: 'medium', source: '侵权责任法相关规定' }
      },
      {
        content: '三方协议解除应当有明确的条件和程序，不得约定一方享有任意解除权而无需承担责任。',
        metadata: { type: 'knowledge', category: '三方协议', riskLevel: 'high', source: '协议解除条款' }
      },
      {
        content: '实习协议中应当明确工作内容、工作时间、工作地点、实习报酬、保险保障等核心条款，模糊不清的条款应要求明确。',
        metadata: { type: 'knowledge', category: '实习协议', riskLevel: 'medium', source: '合同条款完整性' }
      }
    ];

    var i, item;
    for (i = 0; i < knowledgeItems.length; i++) {
      item = knowledgeItems[i];
      this.vectorStore.addDocument(item);
    }
  }

  async initializeKnowledgeBaseAsync() {
    if (this.initialized) return;
    this.initializeKnowledgeBase();
    await this.vectorStore.embedAllDocuments();
    this.initialized = true;
  }

  async analyzeContractEnhanced(text, options) {
    if (!options) options = {};
    var result = {
      patternAnalysis: null,
      similarCases: [],
      legalReferences: [],
      integratedAnalysis: null,
      searchMode: 'keyword'
    };

    result.patternAnalysis = this.clauseMatcher.analyzeContract(text);

    if (result.patternAnalysis && result.patternAnalysis.details.length > 0) {
      var j, match;
      for (j = 0; j < result.patternAnalysis.details.length; j++) {
        match = result.patternAnalysis.details[j];
        var query = match.clause;
        var searchResult = await this.vectorStore.search(query, { limit: 3 });
        if (searchResult.mode) result.searchMode = searchResult.mode;
        var k, res;
        for (k = 0; k < searchResult.results.length; k++) {
          res = searchResult.results[k];
          result.legalReferences.push({
            clause: match.clause,
            reference: res.content,
            metadata: res.metadata,
            score: res.score,
            source: res.source || 'keyword'
          });
        }
      }
    }

    result.integratedAnalysis = this.generateIntegratedAnalysis(result);

    return result;
  }

  generateIntegratedAnalysis(result) {
    var patternAnalysis = result.patternAnalysis;

    if (!patternAnalysis) {
      return null;
    }

    var overallRisk = 'low';
    var riskScore = 30;

    if (patternAnalysis.riskyClauses > 0) {
      var highRiskCount = 0;
      var m, detail;
      for (m = 0; m < patternAnalysis.details.length; m++) {
        detail = patternAnalysis.details[m];
        if (detail.maxRisk === 'high' || detail.maxRisk === 'critical') {
          highRiskCount++;
        }
      }

      if (highRiskCount >= 3) {
        overallRisk = 'high';
        riskScore = 85;
      } else if (highRiskCount >= 1) {
        overallRisk = 'medium';
        riskScore = 60;
      } else {
        overallRisk = 'low';
        riskScore = 40;
      }
    }

    var suggestions = this.generateSuggestions(patternAnalysis, result.legalReferences);

    return {
      overallRisk: overallRisk,
      riskScore: riskScore,
      patternFindings: patternAnalysis,
      legalReferences: result.legalReferences,
      suggestions: suggestions
    };
  }

  generateSuggestions(patternAnalysis, legalReferences) {
    var suggestions = [];

    if (patternAnalysis.riskyClauses === 0) {
      suggestions.push({
        type: 'success',
        content: '恭喜！未检测到明显霸王条款。',
        priority: 'info'
      });
      return suggestions;
    }

    var highRiskItems = [];
    var n, detail2;
    for (n = 0; n < patternAnalysis.details.length; n++) {
      detail2 = patternAnalysis.details[n];
      if (detail2.maxRisk === 'high' || detail2.maxRisk === 'critical') {
        highRiskItems.push(detail2);
      }
    }

    if (highRiskItems.length > 0) {
      suggestions.push({
        type: 'critical',
        content: '发现 ' + highRiskItems.length + ' 条高风险条款，建议重点关注并要求修改。',
        priority: 'high'
      });

      var p, item;
      for (p = 0; p < Math.min(highRiskItems.length, 3); p++) {
        item = highRiskItems[p];
        var patternNames = '';
        var q, pat;
        for (q = 0; q < item.patterns.length; q++) {
          pat = item.patterns[q];
          if (q > 0) patternNames += '、';
          patternNames += pat.name;
        }
        suggestions.push({
          type: 'warning',
          content: item.clause.substring(0, 50) + '...可能属于' + patternNames,
          priority: 'high'
        });
      }
    }

    if (legalReferences.length > 0) {
      suggestions.push({
        type: 'info',
        content: '已找到 ' + legalReferences.length + ' 条相关法律依据可供参考。',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  async addContractToKnowledge(contract) {
    var knowledgeDoc = {
      content: contract.originalText,
      metadata: {
        type: 'case',
        category: contract.category,
        riskLevel: contract.riskLevel,
        riskScore: contract.riskScore,
        clauseCount: contract.clauseCount,
        source: '用户案例'
      }
    };

    return await this.vectorStore.addDocumentWithEmbedding(knowledgeDoc);
  }

  async searchSimilarContracts(text, options) {
    if (!options) options = {};
    return await this.vectorStore.search(text, {
      limit: options.limit || 3,
      category: options.category || null
    });
  }
}

module.exports = EnhancedAnalyzer;
