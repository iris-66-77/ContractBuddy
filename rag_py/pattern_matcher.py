# -*- coding: utf-8 -*-
"""
风险模式匹配模块（对应 Node.js 的 patternLibrary.js）

提供合同条款风险模式定义及 ClauseMatcher 匹配器，
用于从合同文本中识别潜在的霸王条款与风险条款。
"""

import re
from typing import Any, Dict, List

# ==========================================
# 风险模式定义
# ==========================================

PATTERNS = {
    "exemptionClauses": [
        {
            "id": "exemption_001",
            "name": "完全免责条款",
            "keywords": ["概不负责", "不承担责任", "免责", "不负责", "承担任何责任", "不承担任何责任"],
            "risk": "high",
            "category": "exemption",
            "description": "一方完全免除责任的霸王条款"
        },
        {
            "id": "exemption_002",
            "name": "安全事故免责",
            "keywords": ["安全事故", "人身安全", "概不负责", "与我无关"],
            "risk": "critical",
            "category": "exemption",
            "description": "免除自身安全保障义务的条款"
        },
        {
            "id": "exemption_003",
            "name": "不可抗力滥用",
            "keywords": ["不可抗力", "视为不可抗力"],
            "risk": "medium",
            "category": "exemption",
            "description": "扩大不可抗力范围的条款"
        }
    ],

    "penaltyClauses": [
        {
            "id": "penalty_001",
            "name": "高额违约金",
            "keywords": ["违约金", "滞纳金", "罚款", "每日", "每月"],
            "risk": "high",
            "category": "penalty",
            "description": "违约金过高的条款"
        },
        {
            "id": "penalty_002",
            "name": "双倍赔偿",
            "keywords": ["双倍", "三倍", "十倍赔偿"],
            "risk": "high",
            "category": "penalty",
            "description": "要求倍数赔偿的条款"
        }
    ],

    "interpretationClauses": [
        {
            "id": "interpretation_001",
            "name": "最终解释权",
            "keywords": ["最终解释权", "解释权归", "归我方解释", "本公司保留"],
            "risk": "high",
            "category": "interpretation",
            "description": "单方保留解释权的条款"
        }
    ],

    "terminationClauses": [
        {
            "id": "termination_001",
            "name": "单方随时解除",
            "keywords": ["随时解除", "无条件解除", "任意解除", "无需理由"],
            "risk": "high",
            "category": "termination",
            "description": "一方可随意解除合同的条款"
        },
        {
            "id": "termination_002",
            "name": "逾期即可解除",
            "keywords": ["逾期", "逾期一天", "即可解除", "有权解除"],
            "risk": "high",
            "category": "termination",
            "description": "轻微逾期即可解除合同的条款"
        },
        {
            "id": "termination_003",
            "name": "擅自处理财产",
            "keywords": ["处理物品", "处置财物", "处理财产", "有权处理", "自行处理"],
            "risk": "critical",
            "category": "termination",
            "description": "可擅自处置对方财产的条款"
        }
    ],

    "depositClauses": [
        {
            "id": "deposit_001",
            "name": "押金一概不退",
            "keywords": ["押金不退", "定金不退", "不退还押金", "不予退还"],
            "risk": "high",
            "category": "deposit",
            "description": "无正当理由不退还押金的条款"
        },
        {
            "id": "deposit_002",
            "name": "短期不退押金",
            "keywords": ["未满", "不满", "不足", "押金不退", "不予退还"],
            "risk": "medium",
            "category": "deposit",
            "description": "租期过短不退押金的条款"
        }
    ],

    "rightRestrictionClauses": [
        {
            "id": "restriction_001",
            "name": "不得转租转借",
            "keywords": ["不得转租", "不得转借", "禁止转租"],
            "risk": "low",
            "category": "restriction",
            "description": "限制转租权利的条款"
        },
        {
            "id": "restriction_002",
            "name": "不得提前解约",
            "keywords": ["不得提前", "不得解除", "不得终止", "不得退租"],
            "risk": "medium",
            "category": "restriction",
            "description": "限制提前解约权利的条款"
        },
        {
            "id": "restriction_003",
            "name": "不得诉讼",
            "keywords": ["不得起诉", "不得诉讼", "不得仲裁", "放弃诉讼"],
            "risk": "critical",
            "category": "restriction",
            "description": "放弃司法救济权利的条款"
        }
    ],

    "unfairClauses": [
        {
            "id": "unfair_001",
            "name": "格式条款未提示",
            "keywords": ["已阅读", "已理解", "无异议"],
            "risk": "low",
            "category": "unfair",
            "description": "可能未进行合理提示的格式条款"
        }
    ]
}


class ClauseMatcher:
    """
    条款风险匹配器。

    将合同文本拆分为子句，逐条匹配预定义的风险模式，
    返回风险条款列表及综合摘要。
    """

    def __init__(self):
        """初始化匹配器，展平所有风险模式。"""
        self.all_patterns = self._flatten_patterns()

    def _flatten_patterns(self) -> List[Dict[str, Any]]:
        """
        将 PATTERNS 字典按类别展平为单一列表。

        Returns:
            包含所有模式字典的列表。
        """
        patterns = []
        for group in PATTERNS.values():
            for pattern in group:
                patterns.append(pattern)
        return patterns

    def analyze_contract(self, text: str) -> Dict[str, Any]:
        """
        分析合同文本，识别风险条款。

        Args:
            text: 合同全文。

        Returns:
            包含 totalClauses（总子句数）、riskyClauses（风险子句数）、
            details（详细匹配结果）和 summary（文字摘要）的字典。
        """
        clauses = self.extract_clauses(text)
        matches = []
        for clause in clauses:
            matched_patterns = self.match_clause(clause)
            if matched_patterns:
                matches.append({
                    "clause": clause,
                    "patterns": matched_patterns,
                    "maxRisk": self.get_max_risk(matched_patterns)
                })

        return {
            "totalClauses": len(clauses),
            "riskyClauses": len(matches),
            "details": matches,
            "summary": self.generate_summary(matches)
        }

    def extract_clauses(self, text: str) -> List[str]:
        """
        从合同文本中提取子句列表。

        按换行切分后，对每行按中文句号、分号、感叹号、问号再次切分，
        保留长度大于8的片段作为有效子句。

        Args:
            text: 合同全文。

        Returns:
            有效子句字符串列表。
        """
        clauses = []
        lines = re.split(r"\n+", text)
        for line in lines:
            trimmed = line.strip()
            if len(trimmed) > 5:
                sub_clauses = re.split(r"[。；！？]", trimmed)
                for sub in sub_clauses:
                    sub_trimmed = sub.strip()
                    if len(sub_trimmed) > 8:
                        clauses.append(sub_trimmed)
        return clauses

    def match_clause(self, clause: str) -> List[Dict[str, Any]]:
        """
        对单个子句匹配所有风险模式。

        只要子句中包含某个模式的任意一个关键词，即视为匹配该模式。

        Args:
            clause: 单个子句文本。

        Returns:
            匹配到的模式字典列表。
        """
        matches = []
        clause_lower = clause.lower()
        for pattern in self.all_patterns:
            for keyword in pattern["keywords"]:
                if keyword in clause_lower:
                    matches.append(pattern)
                    break
        return matches

    def get_max_risk(self, patterns: List[Dict[str, Any]]) -> str:
        """
        从匹配到的模式中获取最高风险等级。

        风险等级优先级：critical > high > medium > low。

        Args:
            patterns: 匹配到的模式列表。

        Returns:
            最高风险等级字符串。
        """
        risk_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        max_risk = "low"
        max_score = 0
        for pattern in patterns:
            score = risk_order.get(pattern.get("risk"), 0)
            if score > max_score:
                max_score = score
                max_risk = pattern["risk"]
        return max_risk

    def generate_summary(self, matches: List[Dict[str, Any]]) -> str:
        """
        根据匹配结果生成中文摘要。

        Args:
            matches: 匹配结果列表，每项包含 clause、patterns、maxRisk。

        Returns:
            描述合同风险状况的摘要字符串。
        """
        if not matches:
            return "未发现明显霸王条款，合同相对公平。"

        high_risk_count = 0
        for match in matches:
            if match["maxRisk"] in ("high", "critical"):
                high_risk_count += 1

        if high_risk_count >= 3:
            return (
                f"检测到 {high_risk_count} 条高风险条款，"
                f"合同对您不利，建议谨慎签署或要求修改。"
            )
        elif high_risk_count > 0:
            return (
                f"检测到 {high_risk_count} 条高风险条款，"
                f"建议针对这些条款进行协商修改。"
            )
        else:
            return "检测到一些中等风险条款，建议协商优化，但整体风险可控。"

    def get_all_patterns(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        获取原始 PATTERNS 字典。

        Returns:
            按类别分组的风险模式字典。
        """
        return PATTERNS
