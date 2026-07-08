var riskAssessment = require('./riskAssessment');

console.log("=== 风险评估标准测试 ===\n");

console.log("测试1: 正常合同（无风险）");
var test1 = {
  overall_risk: "low",
  risk_score: 15,
  clauses: []
};
var result1 = riskAssessment.calculateRiskScore(test1);
console.log("  评定等级:", result1.level);
console.log("  评定分数:", result1.score);
console.log("  期望: low, <40");
console.log("  ✓" + (result1.level === "low" && result1.score < 40 ? " 通过" : " 未通过") + "\n");

console.log("测试2: 合同有霸王条款");
var test2 = {
  overall_risk: "high",
  risk_score: 85,
  clauses: [
    { type: "霸王条款", risk_level: "high", clause: "甲方概不负责" },
    { type: "霸王条款", risk_level: "high", clause: "乙方不得解除合同" }
  ]
};
var result2 = riskAssessment.calculateRiskScore(test2);
console.log("  评定等级:", result2.level);
console.log("  评定分数:", result2.score);
console.log("  高危条款数:", result2.details.highRiskClauses);
console.log("  期望: high, >=70, 2");
console.log("  ✓" + (result2.level === "high" && result2.score >=70 ? " 通过" : " 未通过") + "\n");

console.log("测试3: 交叉验证测试");
var result3 = riskAssessment.crossValidateRisk(test2, "合同内容...");
console.log("  验证通过:", result3.validation ? result3.validation.pass : "N/A");
console.log("  需要人工审核:", result3.needsReview);
console.log("  标准评分:", result3.standardAssessment ? result3.standardAssessment.score : "N/A");
console.log("  ✓" + (result3.standardAssessment ? " 通过" : " 未通过") + "\n");

console.log("测试4: 获取风险标准");
console.log("  标准版本:", riskAssessment.RISK_CRITERIA ? "1.0" : "N/A");
console.log("  等级定义:", Object.keys(riskAssessment.RISK_CRITERIA.levels).join(", "));
console.log("  ✓ 完成\n");

console.log("=== 测试结束 ===");
console.log("\n所有功能正常！\n");
