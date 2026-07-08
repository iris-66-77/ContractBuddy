var riskAssessment = require('./riskAssessment');

console.log("=== 风险评估模型 V2.0 测试 ===");
console.log("测试目标：验证修正后能正确识别明显风险条款\n");

var testCases = [
    {
        id: 'TC001',
        name: '退房扣款条款',
        clause: '乙方退房时，扣卫生费单间150元，一房一厅200元，两房一厅300元，三房一厅400元。',
        expectedLevel: 'medium',
        expectedScoreMin: 30,
        description: '用户之前反馈的误判案例'
    },
    {
        id: 'TC002',
        name: '押金不退',
        clause: '押金不予退还',
        expectedLevel: 'high',
        expectedScoreMin: 60,
        description: '强制性高危关键词'
    },
    {
        id: 'TC003',
        name: '最终解释权',
        clause: '最终解释权归甲方所有',
        expectedLevel: 'high',
        expectedScoreMin: 60,
        description: '强制性高危关键词'
    },
    {
        id: 'TC004',
        name: '概不负责',
        clause: '甲方概不负责',
        expectedLevel: 'high',
        expectedScoreMin: 60,
        description: '强制性高危关键词'
    },
    {
        id: 'TC005',
        name: '不得提前解除',
        clause: '乙方不得提前解除合同',
        expectedLevel: 'high',
        expectedScoreMin: 60,
        description: '强制性高危关键词'
    },
    {
        id: 'TC006',
        name: '正常条款',
        clause: '本合同自双方签字盖章之日起生效',
        expectedLevel: 'low',
        expectedScoreMax: 30,
        description: '正常合同条款'
    },
    {
        id: 'TC007',
        name: '违约金过高',
        clause: '若甲方逾期支付费用，每逾期一日需支付总金额5%的违约金',
        expectedLevel: 'medium',
        expectedScoreMin: 30,
        description: '高额违约金条款'
    },
    {
        id: 'TC008',
        name: '霸王条款',
        clause: '甲方有权随时解除合同且不承担任何责任',
        expectedLevel: 'high',
        expectedScoreMin: 60,
        description: '典型霸王条款'
    }
];

var passed = 0;
var failed = 0;

testCases.forEach(function(testCase) {
    console.log("\n--- " + testCase.id + ": " + testCase.name + " ---");
    console.log("条款内容: " + testCase.clause);
    console.log("预期: " + testCase.expectedLevel + " (" + 
        (testCase.expectedScoreMin ? "≥" + testCase.expectedScoreMin : "") + 
        (testCase.expectedScoreMax ? ", ≤" + testCase.expectedScoreMax : "") + ")");
    
    var result = riskAssessment.calculateRiskScore({
        clauses: [{ clause: testCase.clause, type: '条款', risk_level: 'medium' }],
        originalText: testCase.clause
    });
    
    console.log("实际: " + result.level + " (" + result.score + "分)");
    console.log("检测到的风险关键词: " + (result.details.riskKeywordsFound.length > 0 ? result.details.riskKeywordsFound.join(', ') : '无'));
    
    var passedTest = false;
    
    if (result.level === testCase.expectedLevel) {
        if (testCase.expectedScoreMin && result.score >= testCase.expectedScoreMin) {
            passedTest = true;
        } else if (testCase.expectedScoreMax && result.score <= testCase.expectedScoreMax) {
            passedTest = true;
        } else if (!testCase.expectedScoreMin && !testCase.expectedScoreMax) {
            passedTest = true;
        }
    }
    
    if (passedTest) {
        console.log("✅ 通过");
        passed++;
    } else {
        console.log("❌ 未通过");
        failed++;
    }
});

console.log("\n=== 测试结果 ===");
console.log("通过: " + passed + " / " + testCases.length);
console.log("失败: " + failed + " / " + testCases.length);
console.log("通过率: " + Math.round(passed / testCases.length * 100) + "%");

if (failed === 0) {
    console.log("\n🎉 所有测试通过！风险评估模型 V2.0 已修复明显风险漏判问题。");
} else {
    console.log("\n⚠️ 部分测试未通过，请检查风险评估逻辑。");
}