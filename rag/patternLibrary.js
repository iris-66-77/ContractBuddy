
var PATTERNS = {
  exemptionClauses: [
    {
      id: 'exemption_001',
      name: '完全免责条款',
      keywords: ['概不负责', '不承担责任', '免责', '不负责', '承担任何责任', '不承担任何责任'],
      risk: 'high',
      category: 'exemption',
      description: '一方完全免除责任的霸王条款'
    },
    {
      id: 'exemption_002',
      name: '安全事故免责',
      keywords: ['安全事故', '人身安全', '概不负责', '与我无关'],
      risk: 'critical',
      category: 'exemption',
      description: '免除自身安全保障义务的条款'
    },
    {
      id: 'exemption_003',
      name: '不可抗力滥用',
      keywords: ['不可抗力', '视为不可抗力'],
      risk: 'medium',
      category: 'exemption',
      description: '扩大不可抗力范围的条款'
    }
  ],

  penaltyClauses: [
    {
      id: 'penalty_001',
      name: '高额违约金',
      keywords: ['违约金', '滞纳金', '罚款', '每日', '每月'],
      risk: 'high',
      category: 'penalty',
      description: '违约金过高的条款'
    },
    {
      id: 'penalty_002',
      name: '双倍赔偿',
      keywords: ['双倍', '三倍', '十倍赔偿'],
      risk: 'high',
      category: 'penalty',
      description: '要求倍数赔偿的条款'
    }
  ],

  interpretationClauses: [
    {
      id: 'interpretation_001',
      name: '最终解释权',
      keywords: ['最终解释权', '解释权归', '归我方解释', '本公司保留'],
      risk: 'high',
      category: 'interpretation',
      description: '单方保留解释权的条款'
    }
  ],

  terminationClauses: [
    {
      id: 'termination_001',
      name: '单方随时解除',
      keywords: ['随时解除', '无条件解除', '任意解除', '无需理由'],
      risk: 'high',
      category: 'termination',
      description: '一方可随意解除合同的条款'
    },
    {
      id: 'termination_002',
      name: '逾期即可解除',
      keywords: ['逾期', '逾期一天', '即可解除', '有权解除'],
      risk: 'high',
      category: 'termination',
      description: '轻微逾期即可解除合同的条款'
    },
    {
      id: 'termination_003',
      name: '擅自处理财产',
      keywords: ['处理物品', '处置财物', '处理财产', '有权处理', '自行处理'],
      risk: 'critical',
      category: 'termination',
      description: '可擅自处置对方财产的条款'
    }
  ],

  depositClauses: [
    {
      id: 'deposit_001',
      name: '押金一概不退',
      keywords: ['押金不退', '定金不退', '不退还押金', '不予退还'],
      risk: 'high',
      category: 'deposit',
      description: '无正当理由不退还押金的条款'
    },
    {
      id: 'deposit_002',
      name: '短期不退押金',
      keywords: ['未满', '不满', '不足', '押金不退', '不予退还'],
      risk: 'medium',
      category: 'deposit',
      description: '租期过短不退押金的条款'
    }
  ],

  rightRestrictionClauses: [
    {
      id: 'restriction_001',
      name: '不得转租转借',
      keywords: ['不得转租', '不得转借', '禁止转租'],
      risk: 'low',
      category: 'restriction',
      description: '限制转租权利的条款'
    },
    {
      id: 'restriction_002',
      name: '不得提前解约',
      keywords: ['不得提前', '不得解除', '不得终止', '不得退租'],
      risk: 'medium',
      category: 'restriction',
      description: '限制提前解约权利的条款'
    },
    {
      id: 'restriction_003',
      name: '不得诉讼',
      keywords: ['不得起诉', '不得诉讼', '不得仲裁', '放弃诉讼'],
      risk: 'critical',
      category: 'restriction',
      description: '放弃司法救济权利的条款'
    }
  ],

  unfairClauses: [
    {
      id: 'unfair_001',
      name: '格式条款未提示',
      keywords: ['已阅读', '已理解', '无异议'],
      risk: 'low',
      category: 'unfair',
      description: '可能未进行合理提示的格式条款'
    }
  ]
};

class ClauseMatcher {
  constructor() {
    this.allPatterns = this.flattenPatterns();
  }

  flattenPatterns() {
    var patterns = [];
    var key, group;
    for (key in PATTERNS) {
      if (PATTERNS.hasOwnProperty(key)) {
        group = PATTERNS[key];
        var i;
        for (i = 0; i < group.length; i++) {
          patterns.push(group[i]);
        }
      }
    }
    return patterns;
  }

  analyzeContract(text) {
    var clauses = this.extractClauses(text);
    var matches = [];
    var i, clause;
    for (i = 0; i < clauses.length; i++) {
      clause = clauses[i];
      var matchedPatterns = this.matchClause(clause);
      if (matchedPatterns.length > 0) {
        matches.push({
          clause: clause,
          patterns: matchedPatterns,
          maxRisk: this.getMaxRisk(matchedPatterns)
        });
      }
    }

    return {
      totalClauses: clauses.length,
      riskyClauses: matches.length,
      details: matches,
      summary: this.generateSummary(matches)
    };
  }

  extractClauses(text) {
    var clauses = [];
    var lines = text.split(/\n+/);
    var i, line;
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      var trimmed = line.trim();
      if (trimmed.length > 5) {
        var subClauses = trimmed.split(/[。；！？]/);
        var j, sub;
        for (j = 0; j < subClauses.length; j++) {
          sub = subClauses[j];
          var subTrimmed = sub.trim();
          if (subTrimmed.length > 8) {
            clauses.push(subTrimmed);
          }
        }
      }
    }

    return clauses;
  }

  matchClause(clause) {
    var matches = [];
    var clauseLower = clause.toLowerCase();
    var i, pattern, j, keyword;
    for (i = 0; i < this.allPatterns.length; i++) {
      pattern = this.allPatterns[i];
      for (j = 0; j < pattern.keywords.length; j++) {
        keyword = pattern.keywords[j];
        if (clauseLower.indexOf(keyword) !== -1) {
          matches.push(pattern);
          break;
        }
      }
    }

    return matches;
  }

  getMaxRisk(patterns) {
    var riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    var maxRisk = 'low';
    var maxScore = 0;
    var i, pattern, score;
    for (i = 0; i < patterns.length; i++) {
      pattern = patterns[i];
      score = riskOrder[pattern.risk] || 0;
      if (score > maxScore) {
        maxScore = score;
        maxRisk = pattern.risk;
      }
    }

    return maxRisk;
  }

  generateSummary(matches) {
    if (matches.length === 0) {
      return '未发现明显霸王条款，合同相对公平。';
    }

    var highRiskCount = 0;
    var i, match;
    for (i = 0; i < matches.length; i++) {
      match = matches[i];
      if (match.maxRisk === 'high' || match.maxRisk === 'critical') {
        highRiskCount++;
      }
    }

    if (highRiskCount >= 3) {
      return '检测到 ' + highRiskCount + ' 条高风险条款，合同对您不利，建议谨慎签署或要求修改。';
    } else if (highRiskCount > 0) {
      return '检测到 ' + highRiskCount + ' 条高风险条款，建议针对这些条款进行协商修改。';
    } else {
      return '检测到一些中等风险条款，建议协商优化，但整体风险可控。';
    }
  }

  getAllPatterns() {
    return PATTERNS;
  }
}

module.exports = {
  PATTERNS: PATTERNS,
  ClauseMatcher: ClauseMatcher
};
