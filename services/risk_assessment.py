# -*- coding: utf-8 -*-
"""
风险评估引擎模块（对应 Node.js 的 riskAssessment.js）

提供合同风险识别、风险分数计算、AI与规则交叉验证、风险等级标签等功能。
"""

from typing import Any, Dict, List, Optional

# ==========================================
# 风险评估标准定义
# ==========================================

RISK_CRITERIA = {
    "levels": {
        "high": {
            "label": "高",
            "minScore": 60,
            "color": "#ef4444",
            "description": "存在明显的霸王条款或严重法律风险",
            "icon": "🔴"
        },
        "medium": {
            "label": "中",
            "minScore": 30,
            "maxScore": 59,
            "color": "#f59e0b",
            "description": "存在一些需要注意的条款，但整体风险可控",
            "icon": "🟡"
        },
        "low": {
            "label": "低",
            "maxScore": 29,
            "color": "#10b981",
            "description": "未发现明显风险，或仅有轻微问题",
            "icon": "🟢"
        }
    },
    "weights": {
        "霸王条款": 0.5,
        "需注意": 0.3,
        "违约金过高": 0.35,
        "限制解除权": 0.3,
        "责任免除": 0.4,
        "最终解释权": 0.2,
        "隐私条款": 0.25,
        "安全责任": 0.35,
        "押金不退": 0.45,
        "退房扣款": 0.4,
        "费用不合理": 0.35,
        "权责不清": 0.35,
        "保密条款": 0.3,
        "仲裁条款": 0.25,
        "期限条款": 0.25,
        "变更条款": 0.3,
        "争议解决": 0.3,
        "通知条款": 0.2,
        "不可抗力": 0.25,
        "生效条件": 0.25,
        "免责范围过宽": 0.4,
        "限制竞争": 0.35,
        "转让限制": 0.3,
        "保证条款": 0.3,
        "知识产权": 0.3
    },
    "indicators": {
        "霸王条款": {
            "conditions": [
                "免除己方主要责任",
                "加重对方责任",
                "排除对方主要权利",
                "显失公平",
                "格式条款",
                "单方面",
                "无权主张",
                "不得异议",
                "必须接受",
                "不得拒绝"
            ],
            "keywords": [
                "概不负责", "不负责任", "一切责任", "全部责任", "后果自负",
                "无权", "不得异议", "必须接受", "不得拒绝", "完全由", "全部由"
            ],
            "pointsPer": 40,
            "description": "霸王条款：免除己方责任、排除对方主要权利的条款"
        },
        "违约金过高": {
            "threshold": "超过实际损失30%或每日超过0.1%",
            "keywords": [
                "违约金", "每日", "%", "双倍", "赔偿", "滞纳金", "罚款", "罚息",
                "逾期违约金", "迟延违约金", "违约金标准"
            ],
            "pointsPer": 25,
            "description": "违约金条款：可能存在过高违约金的约定"
        },
        "限制解除权": {
            "conditions": [
                "不得提前解除", "解除需支付高额违约金", "不得终止", "不得撤销", "不得解除"
            ],
            "keywords": [
                "不得解除", "不得提前", "不得终止", "解除需", "终止需", "不得撤销",
                "只能由", "单方解除", "随时解除", "任意解除"
            ],
            "pointsPer": 25,
            "description": "合同解除权限制：限制或剥夺了合法的合同解除权利"
        },
        "责任免除": {
            "conditions": [
                "概不负责", "全部责任由对方承担", "免责声明", "不承担任何责任"
            ],
            "keywords": [
                "概不负责", "不负责任", "免责", "不承担", "无论", "任何情况",
                "无论如何", "不承担责任", "不承担赔偿责任", "不承担任何责任"
            ],
            "pointsPer": 30,
            "description": "责任免除条款：过度免除己方应承担的责任"
        },
        "最终解释权": {
            "keywords": [
                "最终解释权", "解释权归", "有权解释", "单方解释", "解释权属于",
                "由我方解释", "解释权"
            ],
            "points": 20,
            "description": "最终解释权条款：违反公平原则的格式条款"
        },
        "押金不退": {
            "keywords": [
                "押金不退", "押金不予退还", "押金不得退还", "押金没收",
                "保证金不退", "保证金不予退还", "定金不退", "定金不予退还"
            ],
            "pointsPer": 35,
            "description": "押金不退条款：不合理地没收押金的约定"
        },
        "退房扣款": {
            "keywords": [
                "扣款", "扣除", "扣押金", "扣费用", "不退", "扣除费用", "扣除押金",
                "扣保证金", "扣除保证金"
            ],
            "pointsPer": 30,
            "description": "扣款条款：不合理的扣款或扣费约定"
        },
        "费用不合理": {
            "keywords": [
                "固定费用", "统一收取", "额外费用", "强制收费", "必须支付",
                "强制缴纳", "另行收费", "附加费用", "额外收费"
            ],
            "pointsPer": 25,
            "description": "费用条款：可能存在不合理或强制收费的约定"
        },
        "隐私条款": {
            "keywords": [
                "隐私", "个人信息", "收集", "使用", "披露", "共享", "个人资料",
                "身份信息", "联系方式"
            ],
            "pointsPer": 15,
            "description": "隐私条款：涉及个人信息处理的条款"
        },
        "安全责任": {
            "keywords": [
                "安全责任", "人身安全", "财产安全", "安全事故", "安全保障",
                "安全义务", "安全责任承担", "人身损害赔偿"
            ],
            "pointsPer": 20,
            "description": "安全责任条款：涉及人身财产安全的责任划分"
        },
        "权责不清": {
            "keywords": [
                "责任划分不明确", "职责不清", "权利义务不明确", "承担责任主体不明确",
                "双方责任", "各自承担", "分别承担", "连带责任", "按份责任",
                "不明确", "不清楚", "未约定"
            ],
            "pointsPer": 25,
            "description": "权责划分：权利义务划分不明确，可能引发争议"
        },
        "保密条款": {
            "keywords": [
                "保密", "保密义务", "保密期限", "保密责任", "泄密", "泄露",
                "保密信息", "商业秘密", "技术秘密"
            ],
            "pointsPer": 20,
            "description": "保密条款：需要注意保密义务的范围和期限"
        },
        "仲裁条款": {
            "keywords": [
                "仲裁", "仲裁委员会", "仲裁机构", "仲裁庭", "仲裁管辖",
                "申请仲裁", "提交仲裁"
            ],
            "pointsPer": 15,
            "description": "仲裁条款：争议解决方式选择仲裁需要注意管辖和程序"
        },
        "期限条款": {
            "keywords": [
                "期限", "有效期", "生效日期", "终止日期", "有效期至",
                "履行期限", "交付期限", "付款期限"
            ],
            "pointsPer": 15,
            "description": "期限条款：需注意履行期限和有效期的约定"
        },
        "变更条款": {
            "keywords": [
                "变更", "修改", "变更合同", "修改合同", "合同变更",
                "单方变更", "协商变更"
            ],
            "pointsPer": 20,
            "description": "变更条款：需注意合同变更的条件和程序"
        },
        "争议解决": {
            "keywords": [
                "争议解决", "管辖", "法院", "诉讼", "向法院",
                "管辖法院", "由法院", "向人民法院"
            ],
            "pointsPer": 20,
            "description": "争议解决条款：需注意管辖法院的选择和法律适用"
        },
        "通知条款": {
            "keywords": [
                "通知", "送达", "书面通知", "通知义务", "通知方式",
                "视为送达", "送达地址"
            ],
            "pointsPer": 10,
            "description": "通知条款：需注意通知方式和送达的约定"
        },
        "不可抗力": {
            "keywords": [
                "不可抗力", "免责事由", "不能预见", "不能避免", "不能克服",
                "免责", "免责条款", "免责事由"
            ],
            "pointsPer": 15,
            "description": "不可抗力条款：需注意不可抗力的范围和免责条件"
        },
        "生效条件": {
            "keywords": [
                "生效", "生效条件", "签字盖章", "签字", "盖章",
                "经批准", "经登记", "公证生效", "审批生效"
            ],
            "pointsPer": 10,
            "description": "生效条件：需注意合同生效的条件和时间"
        },
        "免责范围过宽": {
            "keywords": [
                "无论何种情况", "无论发生", "任何情况下", "所有情况", "任何情形",
                "在任何情况下", "均不负责", "均不承担"
            ],
            "pointsPer": 35,
            "description": "免责范围过宽：过度扩大免责范围，可能显失公平"
        },
        "限制竞争": {
            "keywords": [
                "竞业限制", "不得竞争", "禁止竞争", "竞争限制", "不竞争",
                "竞业禁止", "同业竞争"
            ],
            "pointsPer": 25,
            "description": "限制竞争条款：需注意限制的范围、地域和期限是否合理"
        },
        "转让限制": {
            "keywords": [
                "不得转让", "不得转租", "不得转包", "禁止转让", "转让需经",
                "转让需同意", "转租需同意"
            ],
            "pointsPer": 20,
            "description": "转让限制：需注意合同权利义务转让的限制条件"
        },
        "保证条款": {
            "keywords": [
                "保证", "担保", "保证人", "担保人", "连带责任",
                "一般保证", "保证责任", "担保责任"
            ],
            "pointsPer": 20,
            "description": "保证条款：需注意保证方式和保证期间"
        },
        "知识产权": {
            "keywords": [
                "知识产权", "著作权", "专利权", "商标权", "所有权",
                "侵权", "知识产权归属", "知识产权条款"
            ],
            "pointsPer": 20,
            "description": "知识产权条款：需注意知识产权归属和侵权责任"
        }
    },
    "mandatory_high_risk": [
        "租金不退", "押金不退", "保证金不退", "定金不退",
        "单方免责", "解释权归", "概不负责", "不承担任何责任",
        "不得解除", "不得提前", "格式条款", "有权随时解除",
        "随时解除合同", "完全由我方", "全部责任由我方"
    ],
    "riskTypes": {
        "overlord_clause": {"name": "霸王条款", "level": "high", "severity": 4},
        "liability_exemption": {"name": "责任免除", "level": "high", "severity": 4},
        "high_penalty": {"name": "违约金过高", "level": "medium", "severity": 3},
        "termination_restriction": {"name": "解除权限制", "level": "medium", "severity": 3},
        "deposit_confiscation": {"name": "押金不退", "level": "high", "severity": 4},
        "unfair_deduction": {"name": "不合理扣款", "level": "medium", "severity": 3},
        "mandatory_high_risk": {"name": "强制性高危条款", "level": "high", "severity": 5},
        "unclear_responsibility": {"name": "权责不清", "level": "medium", "severity": 2},
        "confidentiality": {"name": "保密条款", "level": "low", "severity": 1},
        "arbitration": {"name": "仲裁条款", "level": "low", "severity": 1},
        "term_clause": {"name": "期限条款", "level": "low", "severity": 1},
        "change_clause": {"name": "变更条款", "level": "low", "severity": 1},
        "dispute_resolution": {"name": "争议解决", "level": "medium", "severity": 2},
        "notice_clause": {"name": "通知条款", "level": "low", "severity": 1},
        "force_majeure": {"name": "不可抗力", "level": "low", "severity": 1},
        "effective_condition": {"name": "生效条件", "level": "low", "severity": 1},
        "overly_broad_exemption": {"name": "免责范围过宽", "level": "high", "severity": 4},
        "competition_restriction": {"name": "限制竞争", "level": "medium", "severity": 3},
        "transfer_restriction": {"name": "转让限制", "level": "medium", "severity": 2},
        "guarantee_clause": {"name": "保证条款", "level": "medium", "severity": 2},
        "intellectual_property": {"name": "知识产权", "level": "medium", "severity": 2}
    }
}


# ==========================================
# 风险识别与计算函数
# ==========================================

def identify_risk_types(contract_text: str, clauses: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    识别合同中的风险类型。

    通过关键词匹配 mandatory_high_risk 和 indicators，
    并结合 AI 识别的条款（clauses）综合输出风险列表。

    Args:
        contract_text: 合同全文。
        clauses: 可选的 AI 识别条款列表，每项包含 type、risk_level、is_false_positive、clause 等字段。

    Returns:
        风险项字典列表，每项包含 type、severity、description 等信息。
    """
    risks = []
    text = contract_text.lower()

    # 1. 检查强制性高危关键词
    for keyword in RISK_CRITERIA["mandatory_high_risk"]:
        if keyword.lower() in text:
            risks.append({
                "type": "mandatory_high_risk",
                "keyword": keyword,
                "severity": 5,
                "description": f"检测到强制性高危关键词：\"{keyword}\""
            })

    # 2. 检查各类 indicators
    for indicator_key, indicator in RISK_CRITERIA["indicators"].items():
        found = False
        matched_keywords = []
        if indicator.get("keywords"):
            for keyword in indicator["keywords"]:
                if keyword.lower() in text:
                    found = True
                    matched_keywords.append(keyword)
        if found and matched_keywords:
            risks.append({
                "type": indicator_key,
                "keywords": matched_keywords,
                "severity": indicator.get("pointsPer") or indicator.get("points") or 20,
                "description": indicator.get("description", "检测到潜在风险条款")
            })

    # 3. 结合 AI 识别的条款结果
    if clauses and isinstance(clauses, list):
        for index, clause in enumerate(clauses):
            clause_type = (clause.get("type") or "").lower()
            risk = (clause.get("risk_level") or "").lower()

            if clause.get("is_false_positive"):
                continue

            if "霸王" in clause_type or "high" in risk:
                risks.append({
                    "type": "ai_high_risk",
                    "clauseIndex": index,
                    "severity": 4,
                    "description": "AI识别的高危条款：" + (clause.get("clause") or "")[:50]
                })
            elif "需注意" in clause_type or "medium" in risk:
                risks.append({
                    "type": "ai_medium_risk",
                    "clauseIndex": index,
                    "severity": 2,
                    "description": "AI识别的中危条款：" + (clause.get("clause") or "")[:50]
                })

    return risks


def calculate_risk_score(analysis_result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    计算合同风险评分。

    基于分析结果中的条款列表与原始文本，通过多维度指标加权计算风险分数。

    Args:
        analysis_result: 分析结果字典，通常包含 clauses、originalText、summary 等字段。

    Returns:
        包含 level、score、risks、details、criteriaVersion、evaluationNotes 的字典。
    """
    if not analysis_result or not analysis_result.get("clauses"):
        return {
            "level": "low",
            "score": 10,
            "reason": "无分析结果",
            "risks": [],
            "details": {}
        }

    clauses = analysis_result.get("clauses", [])
    contract_text = (analysis_result.get("originalText") or "") + (analysis_result.get("summary") or "")

    high_risk_count = 0
    medium_risk_count = 0
    low_risk_count = 0
    false_positive_count = 0
    has_overlord_clause = False
    has_high_penalty = False
    has_unfair_termination = False
    has_no_refund = False
    has_deduct = False
    has_unreasonable_fee = False
    has_mandatory_high_risk = False
    has_broad_exemption = False
    has_unclear_responsibility = False
    has_competition_restriction = False
    risk_keywords_found = []

    full_text = contract_text.lower()

    # 统计各类条款数量及标志位
    for clause in clauses:
        clause_type = (clause.get("type") or "").lower()
        risk = (clause.get("risk_level") or "").lower()
        clause_text = (clause.get("clause") or "").lower()

        if clause.get("is_false_positive"):
            false_positive_count += 1
        elif "霸王" in clause_type or "high" in risk:
            high_risk_count += 1
            has_overlord_clause = True
        elif "需注意" in clause_type or "medium" in risk:
            medium_risk_count += 1

    # 全文关键词检测
    if "违约金" in full_text and ("%" in full_text or "双倍" in full_text):
        has_high_penalty = True
    if "不得解除" in full_text or "不得提前" in full_text:
        has_unfair_termination = True
    if "押金" in full_text and ("不退" in full_text or "不予退还" in full_text):
        has_no_refund = True
    if "扣款" in full_text or "扣除" in full_text or "强行扣除" in full_text:
        has_deduct = True
    if ("固定" in full_text or "统一" in full_text) and "费用" in full_text:
        has_unreasonable_fee = True
    if "概不负责" in full_text or "不承担任何责任" in full_text:
        has_overlord_clause = True
    if "无论何种情况" in full_text or "无论发生" in full_text or "任何情况下" in full_text:
        has_broad_exemption = True
    if "责任划分不明确" in full_text or "职责不清" in full_text or "权利义务不明确" in full_text:
        has_unclear_responsibility = True
    if "竞业限制" in full_text or "不得竞争" in full_text or "禁止竞争" in full_text:
        has_competition_restriction = True

    # 收集 indicators 中匹配到的关键词
    for indicator in RISK_CRITERIA["indicators"].values():
        if indicator.get("keywords"):
            for keyword in indicator["keywords"]:
                if keyword.lower() in full_text and keyword not in risk_keywords_found:
                    risk_keywords_found.append(keyword)

    # 再次检查 mandatory_high_risk 关键词
    for keyword in RISK_CRITERIA["mandatory_high_risk"]:
        if keyword.lower() in full_text:
            has_mandatory_high_risk = True

    # 计算分数
    score = 0
    score += high_risk_count * 35
    score += medium_risk_count * 20
    score += 25 if has_overlord_clause else 0
    score += 20 if has_high_penalty else 0
    score += 18 if has_unfair_termination else 0
    score += 35 if has_no_refund else 0
    score += 25 if has_deduct else 0
    score += 20 if has_unreasonable_fee else 0
    score += len(risk_keywords_found) * 5
    score += 30 if has_broad_exemption else 0
    score += 15 if has_unclear_responsibility else 0
    score += 20 if has_competition_restriction else 0

    # 若存在强制性高危关键词，分数保底为65
    if has_mandatory_high_risk:
        score = max(score, 65)

    # 扣除误判分数
    score -= false_positive_count * 15
    score = max(0, min(100, score))

    # 确定风险等级
    level = "low"
    if score >= RISK_CRITERIA["levels"]["high"]["minScore"]:
        level = "high"
    elif score >= RISK_CRITERIA["levels"]["medium"]["minScore"]:
        level = "medium"

    risks = identify_risk_types(contract_text, clauses)

    return {
        "level": level,
        "score": score,
        "risks": risks,
        "details": {
            "highRiskClauses": high_risk_count,
            "mediumRiskClauses": medium_risk_count,
            "falsePositiveClauses": false_positive_count,
            "hasOverlordClause": has_overlord_clause,
            "hasHighPenalty": has_high_penalty,
            "hasUnfairTermination": has_unfair_termination,
            "hasNoRefund": has_no_refund,
            "hasDeduct": has_deduct,
            "hasUnreasonableFee": has_unreasonable_fee,
            "hasMandatoryHighRisk": has_mandatory_high_risk,
            "hasBroadExemption": has_broad_exemption,
            "hasUnclearResponsibility": has_unclear_responsibility,
            "hasCompetitionRestriction": has_competition_restriction,
            "riskKeywordsFound": risk_keywords_found,
            "keywordsFoundCount": len(risk_keywords_found)
        },
        "criteriaVersion": "3.0",
        "evaluationNotes": []
    }


def cross_validate_risk(initial_result: Dict[str, Any], contract_text: str) -> Dict[str, Any]:
    """
    交叉验证 AI 与规则引擎的风险评估结果。

    采用 AI 结果（权重 60%）与标准规则评估（权重 40%） blended 的方式，
    当两者存在显著分歧时进行调和，确保评估结论稳健可靠。

    Args:
        initial_result: AI 初步分析结果，通常包含 overall_risk、risk_score、clauses 等。
        contract_text: 合同原始全文。

    Returns:
        包含 validation、standardAssessment、needsReview、resolvedBy、risks 的字典。
    """
    validation = {
        "pass": True,
        "conflicts": [],
        "finalLevel": None,
        "finalScore": None
    }

    # 基于 initial_result 计算标准规则评估
    standard = calculate_risk_score(initial_result)

    # 补充原始文本后再次计算
    enhanced_result = {**initial_result, "originalText": contract_text}
    enhanced_standard = calculate_risk_score(enhanced_result)

    ai_level = initial_result.get("overall_risk", "medium")
    ai_score = initial_result.get("risk_score", 50)
    ai_level_num = 2 if ai_level == "high" else (1 if ai_level == "medium" else 0)
    standard_level_num = (
        2 if enhanced_standard["level"] == "high"
        else (1 if enhanced_standard["level"] == "medium" else 0)
    )

    # 等级冲突检测
    if abs(ai_level_num - standard_level_num) >= 1:
        validation["pass"] = False
        validation["conflicts"].append({
            "type": "level_conflict",
            "aiLevel": ai_level,
            "standardLevel": enhanced_standard["level"],
            "aiScore": ai_score,
            "standardScore": enhanced_standard["score"]
        })

    # 分数冲突检测
    if abs(ai_score - enhanced_standard["score"]) > 20:
        validation["pass"] = False
        validation["conflicts"].append({
            "type": "score_conflict",
            "aiScore": ai_score,
            "standardScore": enhanced_standard["score"],
            "difference": abs(ai_score - enhanced_standard["score"])
        })

    # 强制性高危关键词冲突
    if enhanced_standard["details"].get("hasMandatoryHighRisk") and ai_level != "high":
        validation["pass"] = False
        validation["conflicts"].append({
            "type": "mandatory_high_risk",
            "reason": "检测到强制性高危关键词",
            "keywords": enhanced_standard["details"].get("riskKeywordsFound", [])
        })

    # 确定最终等级与分数
    if validation["pass"]:
        validation["finalLevel"] = ai_level
        validation["finalScore"] = ai_score
    else:
        ai_weight = 0.6
        standard_weight = 0.4
        blended_score = round(ai_score * ai_weight + enhanced_standard["score"] * standard_weight)
        blended_score = max(0, min(100, blended_score))

        ai_level_num2 = 2 if ai_level == "high" else (1 if ai_level == "medium" else 0)
        std_level_num2 = (
            2 if enhanced_standard["level"] == "high"
            else (1 if enhanced_standard["level"] == "medium" else 0)
        )
        blended_level_num = round(ai_level_num2 * ai_weight + std_level_num2 * standard_weight)
        blended_level = "high" if blended_level_num >= 2 else ("medium" if blended_level_num >= 1 else "low")

        validation["finalLevel"] = blended_level
        validation["finalScore"] = blended_score
        validation["blendedFrom"] = {
            "aiScore": ai_score,
            "standardScore": enhanced_standard["score"],
            "aiLevel": ai_level,
            "standardLevel": enhanced_standard["level"],
            "aiWeight": ai_weight,
            "standardWeight": standard_weight
        }

    return {
        "validation": validation,
        "standardAssessment": enhanced_standard,
        "needsReview": (
            not validation["pass"]
            or (enhanced_standard["score"] >= 50 and enhanced_standard["score"] <= 65)
        ),
        "resolvedBy": "standard",
        "risks": enhanced_standard["risks"]
    }


# ==========================================
# 风险等级辅助函数
# ==========================================

def get_risk_label(level: str) -> str:
    """
    获取风险等级的文字标签。

    Args:
        level: 风险等级（high / medium / low）。

    Returns:
        对应的中文标签。
    """
    levels = {"high": "高危", "medium": "中危", "low": "低危"}
    return levels.get(level, "中危")


def get_risk_icon(level: str) -> str:
    """
    获取风险等级的图标。

    Args:
        level: 风险等级（high / medium / low）。

    Returns:
        对应的图标字符。
    """
    icons = {"high": "🔴", "medium": "🟡", "low": "🟢"}
    return icons.get(level, "⚪")


def get_risk_description(level: str) -> str:
    """
    获取风险等级的详细描述。

    Args:
        level: 风险等级（high / medium / low）。

    Returns:
        对应等级的描述文本。
    """
    if level == "high":
        return RISK_CRITERIA["levels"]["high"]["description"]
    if level == "medium":
        return RISK_CRITERIA["levels"]["medium"]["description"]
    return RISK_CRITERIA["levels"]["low"]["description"]


def get_risk_level_by_score(score: int) -> str:
    """
    根据分数判断风险等级。

    Args:
        score: 0-100 的整数分数。

    Returns:
        对应的风险等级字符串。
    """
    if score >= RISK_CRITERIA["levels"]["high"]["minScore"]:
        return "high"
    if score >= RISK_CRITERIA["levels"]["medium"]["minScore"]:
        return "medium"
    return "low"
