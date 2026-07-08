var RISK_CRITERIA={
    levels:{
        high:{label:'高',minScore:60,color:'#ef4444',description:'存在明显的霸王条款或严重法律风险', icon:'🔴'},
        medium:{label:'中',minScore:30,maxScore:59,color:'#f59e0b',description:'存在一些需要注意的条款，但整体风险可控', icon:'🟡'},
        low:{label:'低',maxScore:29,color:'#10b981',description:'未发现明显风险，或仅有轻微问题', icon:'🟢'}
    },
    weights:{
       霸王条款:0.5,
       需注意:0.3,
       违约金过高:0.35,
       限制解除权:0.3,
       责任免除:0.4,
       最终解释权:0.2,
       隐私条款:0.25,
       安全责任:0.35,
       押金不退:0.45,
       退房扣款:0.4,
       费用不合理:0.35,
       权责不清:0.35,
       保密条款:0.3,
       仲裁条款:0.25,
       期限条款:0.25,
       变更条款:0.3,
       争议解决:0.3,
       通知条款:0.2,
       不可抗力:0.25,
       生效条件:0.25,
       免责范围过宽:0.4,
       限制竞争:0.35,
       转让限制:0.3,
       保证条款:0.3,
       知识产权:0.3
    },
    indicators:{
       霸王条款:{
            conditions:[
                '免除己方主要责任',
                '加重对方责任',
                '排除对方主要权利',
                '显失公平',
                '格式条款',
                '单方面',
                '无权主张',
                '不得异议',
                '必须接受',
                '不得拒绝'
            ],
            keywords:[
                '概不负责','不负责任','一切责任','全部责任','后果自负',
                '无权','不得异议','必须接受','不得拒绝','完全由','全部由'
            ],
            pointsPer:40,
            description:'霸王条款：免除己方责任、排除对方主要权利的条款'
        },
       违约金过高:{
            threshold:'超过实际损失30%或每日超过0.1%',
            keywords:[
                '违约金','每日','%','双倍','赔偿','滞纳金','罚款','罚息',
                '逾期违约金','迟延违约金','违约金标准'
            ],
            pointsPer:25,
            description:'违约金条款：可能存在过高违约金的约定'
        },
       限制解除权:{
            conditions:['不得提前解除','解除需支付高额违约金','不得终止','不得撤销','不得解除'],
            keywords:[
                '不得解除','不得提前','不得终止','解除需','终止需','不得撤销',
                '只能由','单方解除','随时解除','任意解除'
            ],
            pointsPer:25,
            description:'合同解除权限制：限制或剥夺了合法的合同解除权利'
        },
       责任免除:{
            conditions:['概不负责','全部责任由对方承担','免责声明','不承担任何责任'],
            keywords:[
                '概不负责','不负责任','免责','不承担','无论','任何情况',
                '无论如何','不承担责任','不承担赔偿责任','不承担任何责任'
            ],
            pointsPer:30,
            description:'责任免除条款：过度免除己方应承担的责任'
        },
       最终解释权:{
            keywords:[
                '最终解释权','解释权归','有权解释','单方解释','解释权属于',
                '由我方解释','解释权'
            ],
            points:20,
            description:'最终解释权条款：违反公平原则的格式条款'
        },
       押金不退:{
            keywords:[
                '押金不退','押金不予退还','押金不得退还','押金没收',
                '保证金不退','保证金不予退还','定金不退','定金不予退还'
            ],
            pointsPer:35,
            description:'押金不退条款：不合理地没收押金的约定'
        },
       退房扣款:{
            keywords:[
                '扣款','扣除','扣押金','扣费用','不退','扣除费用','扣除押金',
                '扣保证金','扣除保证金'
            ],
            pointsPer:30,
            description:'扣款条款：不合理的扣款或扣费约定'
        },
       费用不合理:{
            keywords:[
                '固定费用','统一收取','额外费用','强制收费','必须支付',
                '强制缴纳','另行收费','附加费用','额外收费'
            ],
            pointsPer:25,
            description:'费用条款：可能存在不合理或强制收费的约定'
        },
       隐私条款:{
            keywords:[
                '隐私','个人信息','收集','使用','披露','共享','个人资料',
                '身份信息','联系方式'
            ],
            pointsPer:15,
            description:'隐私条款：涉及个人信息处理的条款'
        },
       安全责任:{
            keywords:[
                '安全责任','人身安全','财产安全','安全事故','安全保障',
                '安全义务','安全责任承担','人身损害赔偿'
            ],
            pointsPer:20,
            description:'安全责任条款：涉及人身财产安全的责任划分'
        },
       权责不清:{
            keywords:[
                '责任划分不明确','职责不清','权利义务不明确','承担责任主体不明确',
                '双方责任','各自承担','分别承担','连带责任','按份责任',
                '不明确','不清楚','未约定'
            ],
            pointsPer:25,
            description:'权责划分：权利义务划分不明确，可能引发争议'
        },
       保密条款:{
            keywords:[
                '保密','保密义务','保密期限','保密责任','泄密','泄露',
                '保密信息','商业秘密','技术秘密'
            ],
            pointsPer:20,
            description:'保密条款：需要注意保密义务的范围和期限'
        },
       仲裁条款:{
            keywords:[
                '仲裁','仲裁委员会','仲裁机构','仲裁庭','仲裁管辖',
                '申请仲裁','提交仲裁'
            ],
            pointsPer:15,
            description:'仲裁条款：争议解决方式选择仲裁需要注意管辖和程序'
        },
       期限条款:{
            keywords:[
                '期限','有效期','生效日期','终止日期','有效期至',
                '履行期限','交付期限','付款期限'
            ],
            pointsPer:15,
            description:'期限条款：需注意履行期限和有效期的约定'
        },
       变更条款:{
            keywords:[
                '变更','修改','变更合同','修改合同','合同变更',
                '单方变更','协商变更'
            ],
            pointsPer:20,
            description:'变更条款：需注意合同变更的条件和程序'
        },
       争议解决:{
            keywords:[
                '争议解决','管辖','法院','诉讼','向法院',
                '管辖法院','由法院','向人民法院'
            ],
            pointsPer:20,
            description:'争议解决条款：需注意管辖法院的选择和法律适用'
        },
       通知条款:{
            keywords:[
                '通知','送达','书面通知','通知义务','通知方式',
                '视为送达','送达地址'
            ],
            pointsPer:10,
            description:'通知条款：需注意通知方式和送达的约定'
        },
       不可抗力:{
            keywords:[
                '不可抗力','免责事由','不能预见','不能避免','不能克服',
                '免责','免责条款','免责事由'
            ],
            pointsPer:15,
            description:'不可抗力条款：需注意不可抗力的范围和免责条件'
        },
       生效条件:{
            keywords:[
                '生效','生效条件','签字盖章','签字','盖章',
                '经批准','经登记','公证生效','审批生效'
            ],
            pointsPer:10,
            description:'生效条件：需注意合同生效的条件和时间'
        },
       免责范围过宽:{
            keywords:[
                '无论何种情况','无论发生','任何情况下','所有情况','任何情形',
                '在任何情况下','均不负责','均不承担'
            ],
            pointsPer:35,
            description:'免责范围过宽：过度扩大免责范围，可能显失公平'
        },
       限制竞争:{
            keywords:[
                '竞业限制','不得竞争','禁止竞争','竞争限制','不竞争',
                '竞业禁止','同业竞争'
            ],
            pointsPer:25,
            description:'限制竞争条款：需注意限制的范围、地域和期限是否合理'
        },
       转让限制:{
            keywords:[
                '不得转让','不得转租','不得转包','禁止转让','转让需经',
                '转让需同意','转租需同意'
            ],
            pointsPer:20,
            description:'转让限制：需注意合同权利义务转让的限制条件'
        },
       保证条款:{
            keywords:[
                '保证','担保','保证人','担保人','连带责任',
                '一般保证','保证责任','担保责任'
            ],
            pointsPer:20,
            description:'保证条款：需注意保证方式和保证期间'
        },
       知识产权:{
            keywords:[
                '知识产权','著作权','专利权','商标权','所有权',
                '侵权','知识产权归属','知识产权条款'
            ],
            pointsPer:20,
            description:'知识产权条款：需注意知识产权归属和侵权责任'
        }
    },
    mandatory_high_risk:[
        '租金不退','押金不退','保证金不退','定金不退',
        '单方免责','解释权归','概不负责','不承担任何责任',
        '不得解除','不得提前','格式条款','有权随时解除',
        '随时解除合同','完全由我方','全部责任由我方'
    ],
    riskTypes:{
        overlord_clause:{name:'霸王条款',level:'high',severity:4},
        liability_exemption:{name:'责任免除',level:'high',severity:4},
        high_penalty:{name:'违约金过高',level:'medium',severity:3},
        termination_restriction:{name:'解除权限制',level:'medium',severity:3},
        deposit_confiscation:{name:'押金不退',level:'high',severity:4},
        unfair_deduction:{name:'不合理扣款',level:'medium',severity:3},
        mandatory_high_risk:{name:'强制性高危条款',level:'high',severity:5},
        unclear_responsibility:{name:'权责不清',level:'medium',severity:2},
        confidentiality:{name:'保密条款',level:'low',severity:1},
        arbitration:{name:'仲裁条款',level:'low',severity:1},
        term_clause:{name:'期限条款',level:'low',severity:1},
        change_clause:{name:'变更条款',level:'low',severity:1},
        dispute_resolution:{name:'争议解决',level:'medium',severity:2},
        notice_clause:{name:'通知条款',level:'low',severity:1},
        force_majeure:{name:'不可抗力',level:'low',severity:1},
        effective_condition:{name:'生效条件',level:'low',severity:1},
        overly_broad_exemption:{name:'免责范围过宽',level:'high',severity:4},
        competition_restriction:{name:'限制竞争',level:'medium',severity:3},
        transfer_restriction:{name:'转让限制',level:'medium',severity:2},
        guarantee_clause:{name:'保证条款',level:'medium',severity:2},
        intellectual_property:{name:'知识产权',level:'medium',severity:2}
    }
};

function identifyRiskTypes(contractText, clauses) {
    var risks = [];
    var text = contractText.toLowerCase();
    
    RISK_CRITERIA.mandatory_high_risk.forEach(function(keyword) {
        if (text.indexOf(keyword.toLowerCase()) !== -1) {
            risks.push({
                type: 'mandatory_high_risk',
                keyword: keyword,
                severity: 5,
                description: '检测到强制性高危关键词："' + keyword + '"'
            });
        }
    });
    
    Object.keys(RISK_CRITERIA.indicators).forEach(function(indicatorKey) {
        var indicator = RISK_CRITERIA.indicators[indicatorKey];
        var found = false;
        var matchedKeywords = [];
        
        if (indicator.keywords) {
            indicator.keywords.forEach(function(keyword) {
                if (text.indexOf(keyword.toLowerCase()) !== -1) {
                    found = true;
                    matchedKeywords.push(keyword);
                }
            });
        }
        
        if (found && matchedKeywords.length > 0) {
            risks.push({
                type: indicatorKey,
                keywords: matchedKeywords,
                severity: indicator.pointsPer || indicator.points || 20,
                description: indicator.description || '检测到潜在风险条款'
            });
        }
    });
    
    if (clauses && Array.isArray(clauses)) {
        clauses.forEach(function(clause, index) {
            var type = (clause.type || '').toLowerCase();
            var risk = (clause.risk_level || '').toLowerCase();
            
            if (clause.is_false_positive) {
                return;
            }
            
            if (type.indexOf('霸王') !== -1 || risk.indexOf('high') !== -1) {
                risks.push({
                    type: 'ai_high_risk',
                    clauseIndex: index,
                    severity: 4,
                    description: 'AI识别的高危条款：' + (clause.clause || '').substring(0, 50)
                });
            } else if (type.indexOf('需注意') !== -1 || risk.indexOf('medium') !== -1) {
                risks.push({
                    type: 'ai_medium_risk',
                    clauseIndex: index,
                    severity: 2,
                    description: 'AI识别的中危条款：' + (clause.clause || '').substring(0, 50)
                });
            }
        });
    }
    
    return risks;
}

function calculateRiskScore(analysisResult){
    if(!analysisResult||!analysisResult.clauses){
        return {level:'low',score:10,reason:'无分析结果',risks:[],details:{}};
    }
    
    var clauses=analysisResult.clauses||[];
    var contractText=(analysisResult.originalText||'') + (analysisResult.summary||'');
    var highRiskCount=0;
    var mediumRiskCount=0;
    var lowRiskCount=0;
    var falsePositiveCount=0;
    var hasOverlordClause=false;
    var hasHighPenalty=false;
    var hasUnfairTermination=false;
    var hasNoRefund=false;
    var hasDeduct=false;
    var hasUnreasonableFee=false;
    var hasMandatoryHighRisk=false;
    var hasBroadExemption=false;
    var hasUnclearResponsibility=false;
    var hasCompetitionRestriction=false;
    var riskKeywordsFound=[];

    RISK_CRITERIA.mandatory_high_risk.forEach(function(keyword){
        if(contractText.toLowerCase().indexOf(keyword)!==-1){
            hasMandatoryHighRisk=true;
        }
    });

    var fullText=contractText.toLowerCase();
    
    clauses.forEach(function(clause){
        var type=(clause.type||'').toLowerCase();
        var risk=(clause.risk_level||'').toLowerCase();
        var clauseText=(clause.clause||'').toLowerCase();
        
        if(clause.is_false_positive){
            falsePositiveCount++;
        }else if(type.indexOf('霸王')!==-1||risk.indexOf('high')!==-1){
            highRiskCount++;
            hasOverlordClause=true;
        }else if(type.indexOf('需注意')!==-1||risk.indexOf('medium')!==-1){
            mediumRiskCount++;
        }
    });

    if(fullText.indexOf('违约金')!==-1&&(fullText.indexOf('%')!==-1||fullText.indexOf('双倍')!==-1)){
        hasHighPenalty=true;
    }
    if(fullText.indexOf('不得解除')!==-1||fullText.indexOf('不得提前')!==-1){
        hasUnfairTermination=true;
    }
    if(fullText.indexOf('押金')!==-1&&(fullText.indexOf('不退')!==-1||fullText.indexOf('不予退还')!==-1)){
        hasNoRefund=true;
    }
    if(fullText.indexOf('扣款')!==-1||fullText.indexOf('扣除')!==-1||fullText.indexOf('强行扣除')!==-1){
        hasDeduct=true;
    }
    if((fullText.indexOf('固定')!==-1||fullText.indexOf('统一')!==-1)&&fullText.indexOf('费用')!==-1){
        hasUnreasonableFee=true;
    }
    if(fullText.indexOf('概不负责')!==-1||fullText.indexOf('不承担任何责任')!==-1){
        hasOverlordClause=true;
    }
    if(fullText.indexOf('无论何种情况')!==-1||fullText.indexOf('无论发生')!==-1||fullText.indexOf('任何情况下')!==-1){
        hasBroadExemption=true;
    }
    if(fullText.indexOf('责任划分不明确')!==-1||fullText.indexOf('职责不清')!==-1||fullText.indexOf('权利义务不明确')!==-1){
        hasUnclearResponsibility=true;
    }
    if(fullText.indexOf('竞业限制')!==-1||fullText.indexOf('不得竞争')!==-1||fullText.indexOf('禁止竞争')!==-1){
        hasCompetitionRestriction=true;
    }

    Object.keys(RISK_CRITERIA.indicators).forEach(function(indicatorKey){
        var indicator=RISK_CRITERIA.indicators[indicatorKey];
        if(indicator.keywords){
            indicator.keywords.forEach(function(keyword){
                if(fullText.indexOf(keyword)!==-1&&riskKeywordsFound.indexOf(keyword)===-1){
                    riskKeywordsFound.push(keyword);
                }
            });
        }
    });

    RISK_CRITERIA.mandatory_high_risk.forEach(function(keyword){
        if(fullText.indexOf(keyword)!==-1){
            hasMandatoryHighRisk=true;
        }
    });

    var score=0;
    score+=highRiskCount*35;
    score+=mediumRiskCount*20;
    score+=hasOverlordClause?25:0;
    score+=hasHighPenalty?20:0;
    score+=hasUnfairTermination?18:0;
    score+=hasNoRefund?35:0;
    score+=hasDeduct?25:0;
    score+=hasUnreasonableFee?20:0;
    score+=riskKeywordsFound.length*5;
    score+=hasBroadExemption?30:0;
    score+=hasUnclearResponsibility?15:0;
    score+=hasCompetitionRestriction?20:0;
    
    if(hasMandatoryHighRisk){
        score=Math.max(score, 65);
    }
    
    score-=falsePositiveCount*15;
    score=Math.max(0,Math.min(100,score));

    var level='low';
    if(score>=RISK_CRITERIA.levels.high.minScore)level='high';
    else if(score>=RISK_CRITERIA.levels.medium.minScore)level='medium';

    var risks = identifyRiskTypes(contractText, clauses);

    return {
        level:level,
        score:score,
        risks:risks,
        details:{
            highRiskClauses:highRiskCount,
            mediumRiskClauses:mediumRiskCount,
            falsePositiveClauses:falsePositiveCount,
            hasOverlordClause:hasOverlordClause,
            hasHighPenalty:hasHighPenalty,
            hasUnfairTermination:hasUnfairTermination,
            hasNoRefund:hasNoRefund,
            hasDeduct:hasDeduct,
            hasUnreasonableFee:hasUnreasonableFee,
            hasMandatoryHighRisk:hasMandatoryHighRisk,
            hasBroadExemption:hasBroadExemption,
            hasUnclearResponsibility:hasUnclearResponsibility,
            hasCompetitionRestriction:hasCompetitionRestriction,
            riskKeywordsFound:riskKeywordsFound,
            keywordsFoundCount:riskKeywordsFound.length
        },
        criteriaVersion:'3.0',
        evaluationNotes:[]
    };
}

function crossValidateRisk(initialResult,contractText){
    var validation={pass:true,conflicts:[],finalLevel:null,finalScore:null};
    var standard=calculateRiskScore(initialResult);
    
    var enhancedResult={
        ...initialResult,
        originalText:contractText
    };
    var enhancedStandard=calculateRiskScore(enhancedResult);
    
    var aiLevel=initialResult.overall_risk||'medium';
    var aiScore=initialResult.risk_score||50;
    var aiLevelNum=aiLevel==='high'?2:aiLevel==='medium'?1:0;
    var standardLevelNum=enhancedStandard.level==='high'?2:enhancedStandard.level==='medium'?1:0;

    if(Math.abs(aiLevelNum-standardLevelNum)>=1){
        validation.pass=false;
        validation.conflicts.push({
            type:'level_conflict',
            aiLevel:aiLevel,
            standardLevel:enhancedStandard.level,
            aiScore:aiScore,
            standardScore:enhancedStandard.score
        });
    }
    if(Math.abs(aiScore-enhancedStandard.score)>20){
        validation.pass=false;
        validation.conflicts.push({
            type:'score_conflict',
            aiScore:aiScore,
            standardScore:enhancedStandard.score,
            difference:Math.abs(aiScore-enhancedStandard.score)
        });
    }

    if(enhancedStandard.details.hasMandatoryHighRisk && aiLevel!=='high'){
        validation.pass=false;
        validation.conflicts.push({
            type:'mandatory_high_risk',
            reason:'检测到强制性高危关键词',
            keywords:enhancedStandard.details.riskKeywordsFound
        });
    }

    if(validation.pass){
        validation.finalLevel=aiLevel;
        validation.finalScore=aiScore;
    }else{
        var aiWeight=0.6;
        var standardWeight=0.4;
        var blendedScore=Math.round(aiScore*aiWeight+enhancedStandard.score*standardWeight);
        blendedScore=Math.max(0,Math.min(100,blendedScore));
        var aiLevelNum2=aiLevel==='high'?2:aiLevel==='medium'?1:0;
        var stdLevelNum2=enhancedStandard.level==='high'?2:enhancedStandard.level==='medium'?1:0;
        var blendedLevelNum=Math.round(aiLevelNum2*aiWeight+stdLevelNum2*standardWeight);
        validation.finalLevel=blendedLevelNum>=2?'high':blendedLevelNum>=1?'medium':'low';
        validation.finalScore=blendedScore;
        validation.blendedFrom={aiScore:aiScore,standardScore:enhancedStandard.score,aiLevel:aiLevel,standardLevel:enhancedStandard.level,aiWeight:aiWeight,standardWeight:standardWeight};
    }

    return {
        validation:validation,
        standardAssessment:enhancedStandard,
        needsReview:!validation.pass||(enhancedStandard.score>=50&&enhancedStandard.score<=65),
        resolvedBy:'standard',
        risks:enhancedStandard.risks
    };
}

function getRiskLabel(level){
    var levels={high:'高危',medium:'中危',low:'低危'};
    return levels[level]||'中危';
}

function getRiskIcon(level){
    var icons={high:'🔴',medium:'🟡',low:'🟢'};
    return icons[level]||'⚪';
}

function getRiskDescription(level){
    if(level==='high')return RISK_CRITERIA.levels.high.description;
    if(level==='medium')return RISK_CRITERIA.levels.medium.description;
    return RISK_CRITERIA.levels.low.description;
}

function getRiskLevelByScore(score){
    if(score>=RISK_CRITERIA.levels.high.minScore)return 'high';
    if(score>=RISK_CRITERIA.levels.medium.minScore)return 'medium';
    return 'low';
}

module.exports={
    calculateRiskScore:calculateRiskScore,
    crossValidateRisk:crossValidateRisk,
    getRiskLabel:getRiskLabel,
    getRiskIcon:getRiskIcon,
    getRiskDescription:getRiskDescription,
    getRiskLevelByScore:getRiskLevelByScore,
    identifyRiskTypes:identifyRiskTypes,
    RISK_CRITERIA:RISK_CRITERIA
};
