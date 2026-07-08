# -*- coding: utf-8 -*-
"""
通用工具函数模块
提供UUID生成、JSON安全读写、HTML转义、LLM响应解析、合同分类及摘要生成等功能。
"""

import json
import os
import uuid
import html
import re
from typing import Any, Dict, List, Optional


def generate_id() -> str:
    """
    生成UUID字符串。

    Returns:
        小写的32位UUID字符串（不含横杠）。
    """
    return uuid.uuid4().hex


def safe_json_load(path: str, default: Any = None) -> Any:
    """
    安全加载JSON文件。

    若文件不存在或内容解析失败，则返回默认值。

    Args:
        path: JSON文件路径。
        default: 加载失败时的默认返回值。

    Returns:
        解析后的Python对象，或default。
    """
    if default is None:
        default = {}
    try:
        if not os.path.exists(path):
            return default
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError, TypeError):
        return default


def safe_json_save(path: str, data: Any) -> bool:
    """
    安全保存JSON文件。

    先将数据写入临时文件（.tmp），再通过rename原子替换目标文件，
    避免写入过程中断导致原文件损坏。

    Args:
        path: 目标JSON文件路径。
        data: 待保存的Python对象。

    Returns:
        保存成功返回True，否则返回False。
    """
    tmp_path = path + '.tmp'
    try:
        # 确保目标目录存在
        dir_name = os.path.dirname(path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # 原子替换，保证写入完整性
        os.replace(tmp_path, path)
        return True
    except (OSError, TypeError, ValueError):
        # 清理临时文件
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        return False


def escape_html(text: str) -> str:
    """
    HTML转义，防止XSS攻击。

    将特殊字符转换为对应的HTML实体。

    Args:
        text: 原始文本。

    Returns:
        转义后的安全文本。
    """
    if not isinstance(text, str):
        text = str(text)
    return html.escape(text, quote=True)


def extract_json_from_llm_response(text: str) -> Optional[Dict[str, Any]]:
    """
    从LLM响应文本中提取JSON对象。

    使用括号深度跟踪算法定位最外层的大括号结构，避免贪婪正则导致的匹配错误。
    支持提取代码块（```json ... ```）中的JSON，也支持裸JSON文本。

    Args:
        text: LLM返回的原始文本。

    Returns:
        解析后的字典对象；若未找到有效JSON则返回None。
    """
    if not text:
        return None

    # 优先尝试从 markdown 代码块中提取
    code_block_pattern = re.compile(r'```(?:json)?\s*(.*?)\s*```', re.DOTALL)
    matches = code_block_pattern.findall(text)
    for candidate in matches:
        candidate = candidate.strip()
        if candidate.startswith('{') and candidate.endswith('}'):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

    # 使用括号深度跟踪算法，在全文范围内查找最外层 JSON 对象
    # 从第一个 '{' 开始，跟踪深度，当深度归零且位于 '}' 时即为一个完整对象
    best_candidate = None
    i = 0
    n = len(text)
    while i < n:
        if text[i] == '{':
            depth = 0
            in_string = False
            escape_next = False
            start = i
            j = i
            while j < n:
                ch = text[j]
                if escape_next:
                    escape_next = False
                    j += 1
                    continue
                if ch == '\\' and in_string:
                    escape_next = True
                    j += 1
                    continue
                if ch == '"':
                    in_string = not in_string
                    j += 1
                    continue
                if not in_string:
                    if ch == '{':
                        depth += 1
                    elif ch == '}':
                        depth -= 1
                        if depth == 0:
                            # 找到一个完整对象
                            candidate = text[start:j + 1]
                            try:
                                parsed = json.loads(candidate)
                                # 优先保留长度更长（通常更完整）的对象
                                if best_candidate is None or len(candidate) > len(best_candidate):
                                    best_candidate = candidate
                            except json.JSONDecodeError:
                                pass
                            i = j  # 从当前位置继续外层循环
                            break
                j += 1
        i += 1

    if best_candidate is not None:
        try:
            return json.loads(best_candidate)
        except json.JSONDecodeError:
            pass

    return None


def get_contract_category(text: str) -> Dict[str, str]:
    """
    根据合同文本判断合同类别。

    通过关键词匹配识别租赁、劳动、购房、服务、借款等常见合同类型。

    Args:
        text: 合同全文或前部文本。

    Returns:
        包含 category（类别名称）和 icon（对应图标/标识）的字典。
    """
    if not text:
        return {"category": "其他", "icon": "📄"}

    lowered = text.lower()

    # 定义各类别的关键词与图标
    categories = [
        {
            "name": "租赁",
            "icon": "🏠",
            "keywords": ["租赁", "出租", "承租", "租金", "房东", "租客", "房屋", "押金", "租期"]
        },
        {
            "name": "劳动",
            "icon": "💼",
            "keywords": ["劳动", "聘用", "雇佣", "工资", "薪酬", "社保", "五险一金",
                        "劳动合同", "试用期", "解雇", "辞职", "离职", "加班"]
        },
        {
            "name": "购房",
            "icon": "🏡",
            "keywords": ["购房", "买房", "商品房", "房产", "产权证", "首付", "按揭",
                        "房贷", "房屋买卖", "过户", "不动产登记"]
        },
        {
            "name": "服务",
            "icon": "🔧",
            "keywords": ["服务", "委托", "代理", "咨询", "技术服务", "维保", "维修",
                        "运维", "提供服务", "服务费"]
        },
        {
            "name": "借款",
            "icon": "💰",
            "keywords": ["借款", "借贷", "贷款", "出借", "还款", "利息", "本金",
                        "借条", "欠条", "抵押", "担保", "信用贷"]
        }
    ]

    scores = []
    for cat in categories:
        score = sum(1 for kw in cat["keywords"] if kw in lowered)
        scores.append((score, cat))

    # 按匹配数量降序排列
    scores.sort(key=lambda x: x[0], reverse=True)

    if scores and scores[0][0] > 0:
        best = scores[0][1]
        return {"category": best["name"], "icon": best["icon"]}

    return {"category": "其他", "icon": "📄"}


def make_contract_summary(text: str, analysis_result: Optional[Dict[str, Any]] = None) -> str:
    """
    生成合同摘要。

    基于合同文本和分析结果生成一段简短的中文摘要，说明合同类型、主要关注点及风险提示。

    Args:
        text: 合同全文。
        analysis_result: 可选的分析结果字典，包含风险等级、条款数量等信息。

    Returns:
        合同摘要字符串。
    """
    if not text:
        return "未提供合同文本，无法生成摘要。"

    cat_info = get_contract_category(text)
    category = cat_info["category"]
    icon = cat_info["icon"]

    # 提取文本前200字作为预览
    preview = text[:200].replace('\n', ' ').strip()
    if len(text) > 200:
        preview += "……"

    lines = [f"{icon} 合同类别：{category}", f"内容预览：{preview}"]

    if analysis_result:
        level = analysis_result.get("overall_risk") or analysis_result.get("level") or "未知"
        score = analysis_result.get("risk_score") or analysis_result.get("score")
        clauses = analysis_result.get("clauses")

        if score is not None:
            lines.append(f"风险评分：{score} 分")
        if level:
            lines.append(f"风险等级：{level}")
        if isinstance(clauses, list):
            lines.append(f"识别条款数：{len(clauses)}")

        # 提取高风险关键词作为关注点
        high_risk_keywords = analysis_result.get("high_risk_keywords", [])
        if high_risk_keywords:
            lines.append(f"主要风险点：{', '.join(high_risk_keywords[:5])}")

    return "\n".join(lines)
