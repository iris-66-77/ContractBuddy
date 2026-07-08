# -*- coding: utf-8 -*-
"""
DeepSeek API服务
将 Node.js 的 server.js 中 enhancedContractAnalysis 函数翻译为 Python。
提供基于 DeepSeek API 的合同分析与合同草稿生成功能。
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests

from utils.helpers import escape_html, extract_json_from_llm_response


# 从环境变量读取 DeepSeek API 密钥
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')


def _calculate_max_tokens(contract_text: str) -> int:
    """
    自适应计算 max_tokens。
    公式：min(8000, max(3000, len(contract_text) * 2))
    """
    return min(8000, max(3000, len(contract_text) * 2))


def _escape_dict_strings(obj: Any) -> Any:
    """
    递归转义字典/列表中的所有字符串，防止XSS。
    所有用户-facing内容均经过此函数处理。
    """
    if isinstance(obj, dict):
        return {k: _escape_dict_strings(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_escape_dict_strings(v) for v in obj]
    if isinstance(obj, str):
        return escape_html(obj)
    return obj


async def analyze_contract_with_deepseek(
    contract_text: str,
    serpapi_service: Any = None,
    rag_vector_store: Any = None,
    risk_assessment: Any = None
) -> Dict[str, Any]:
    """
    使用 DeepSeek API 对合同进行增强分析。

    分析流程：
    1. 如有SerpAPI，先搜索法律信息作为参考
    2. 如有RAG，做向量检索获取知识库参考
    3. 构建System Prompt（四大原则、判断标准、民法典法条、输出格式JSON Schema）
    4. 调用DeepSeek API (deepseek-chat, temperature=0.3)
    5. 提取JSON（使用utils.helpers.extract_json_from_llm_response）
    6. 联网验证高风险条款（最多3条，用SerpAPI）
    7. 返回解析结果（所有用户-facing文本字段已HTML转义）
    """
    # 1. 法律信息搜索
    legal_references = ''
    if serpapi_service and hasattr(serpapi_service, 'has_api_key') and serpapi_service.has_api_key():
        try:
            search_result = serpapi_service.search_legal_info('民法典 格式条款 违约金 霸王条款')
            results = search_result.get('results', [])
            if results:
                legal_references = '\n\n【相关法律参考】\n'
                for i, r in enumerate(results[:3]):
                    title = r.get('title', '')
                    snippet = r.get('snippet', '')
                    legal_references += f'- {title}\n'
                    if snippet:
                        legal_references += f'  {snippet[:150]}...\n'
        except Exception as e:
            print(f'法律搜索失败: {e}')

    # 2. RAG 知识库检索
    rag_knowledge = ''
    if rag_vector_store and hasattr(rag_vector_store, 'search'):
        try:
            search_result = await rag_vector_store.search(contract_text[:500], {'limit': 5})
            results = search_result.get('results', [])
            if results:
                mode = search_result.get('mode', 'keyword')
                rag_knowledge = f'\n\n【知识库参考】({mode})\n'
                for r in results:
                    source = r.get('source', 'keyword')
                    score = r.get('score', 0)
                    content = r.get('content', '')
                    rag_knowledge += f'- [{source} {score}] {content[:100]}\n'
        except Exception as e:
            print(f'RAG搜索失败: {e}')

    # 3. 构建 System Prompt
    system_prompt = (
        '你是【一纸穿透】AI法务导师，精通《民法典》和合同法律实务。你的任务是分析合同文本，找出真正的霸王条款（格式条款）。\n\n'
        '【分析原则】\n'
        '1. 严谨原则：不要随便把正常商业条款标记为霸王条款\n'
        '2. 证据原则：每个结论都要有法律依据（引用具体法条）\n'
        '3. 语境原则：必须结合整个合同上下文判断，不能只看单个句子\n'
        '4. 中立原则：如果条款有争议但可能合法，标记为"需注意"而非"霸王条款"\n\n'
        '【霸王条款判断标准】\n'
        '1. 格式条款（重复使用且未协商）\n'
        '2. 不合理免除或减轻己方责任\n'
        '3. 不合理加重对方责任\n'
        '4. 不合理排除或限制对方主要权利\n'
        '5. 违反公平原则\n\n'
        '【民法典相关法条参考】\n'
        '- 第496条：格式条款定义、提供者提示说明义务\n'
        '- 第497条：格式条款无效的情形\n'
        '- 第498条：格式条款解释规则\n'
        '- 第585条：违约金过高调整规则\n'
        '- 第716条：转租条款\n'
        f'{legal_references}\n'
        f'{rag_knowledge}\n\n'
        '【输出格式】\n'
        '{\n'
        '  "overall_risk":"high/medium/low",\n'
        '  "risk_score":0-100,\n'
        '  "summary":"整体风险评估",\n'
        '  "clauses": [\n'
        '    {\n'
        '      "type":"霸王条款/需注意/正常条款",\n'
        '      "risk_level":"high/medium/low/none",\n'
        '      "clause":"条款原文",\n'
        '      "is_false_positive":false,\n'
        '      "explanation":"基于法律和上下文的分析",\n'
        '      "legal_basis":"引用相关法律条文",\n'
        '      "counter_script":"协商话术",\n'
        '      "recommended_fix":"建议修改方案"\n'
        '    }\n'
        '  ],\n'
        '  "battle_plan": [{"step":"1","action":"","detail":"","script":""}],\n'
        '  "key_takeaway":"",\n'
        '  "positive_points": ["合同中合理的地方"]\n'
        '}\n\n'
        '【注意事项】\n'
        '- is_false_positive: 如果本来正常但可能被误判的条款，设为 true\n'
        '- positive_points: 列出合同中做得好的地方\n'
        '- 每个霸王条款必须有明确的法律依据\n'
        '- 只有明显不公平的条款才标记为"霸王条款"\n\n'
        '现在分析这份合同：'
    )

    # 4. 调用 DeepSeek API
    max_tokens = _calculate_max_tokens(contract_text)
    api_key = DEEPSEEK_API_KEY

    if not api_key:
        # 未配置API密钥，返回降级结果
        return _escape_dict_strings({
            'overall_risk': 'low',
            'risk_score': 25,
            'summary': '分析完成，未发现明显霸王条款',
            'clauses': [],
            'battle_plan': [],
            'key_takeaway': '建议仔细阅读合同',
            'positive_points': ['未发现明显风险条款']
        })

    try:
        response = requests.post(
            'https://api.deepseek.com/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            },
            json={
                'model': 'deepseek-chat',
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': f'请分析这份合同：\n\n{contract_text}'}
                ],
                'temperature': 0.3,
                'max_tokens': max_tokens
            },
            timeout=120
        )
        response.raise_for_status()
        data = response.json()

        choices = data.get('choices', [])
        if not choices:
            raise RuntimeError('API返回异常，无choices')

        content = choices[0].get('message', {}).get('content', '')
    except Exception as e:
        print(f'DeepSeek API调用失败: {e}')
        return _escape_dict_strings({
            'overall_risk': 'low',
            'risk_score': 25,
            'summary': '分析服务暂时不可用',
            'clauses': [],
            'battle_plan': [],
            'key_takeaway': '请稍后重试',
            'positive_points': []
        })

    # 5. 提取 JSON
    parsed = extract_json_from_llm_response(content)
    if not parsed:
        return _escape_dict_strings({
            'overall_risk': 'low',
            'risk_score': 25,
            'summary': '分析完成，未发现明显霸王条款',
            'clauses': [],
            'battle_plan': [],
            'key_takeaway': '建议仔细阅读合同',
            'positive_points': ['未发现明显风险条款']
        })

    # 确保必要字段存在
    if 'online_verification' not in parsed:
        parsed['online_verification'] = []

    # 6. 联网验证高风险条款（最多3条）
    if serpapi_service and hasattr(serpapi_service, 'has_api_key') and serpapi_service.has_api_key():
        clauses = parsed.get('clauses', [])
        high_risk_clauses = [
            c for c in clauses
            if c.get('risk_level') in ('high', '高危')
        ][:3]

        for clause in high_risk_clauses:
            keyword = (clause.get('clause', ''))[:20]
            if not keyword:
                continue
            try:
                search_query = f'民法典 {keyword} {clause.get("type", "")}'
                verify_result = serpapi_service.search_legal_info(search_query)
                results = verify_result.get('results', [])
                if results:
                    parsed['online_verification'].append({
                        'clause_index': clauses.index(clause),
                        'keyword': keyword,
                        'query': search_query,
                        'results': [
                            {
                                'title': r.get('title', ''),
                                'snippet': (r.get('snippet', ''))[:200],
                                'link': r.get('link', '')
                            }
                            for r in results[:2]
                        ],
                        'verified': True
                    })
            except Exception as e:
                print(f'[VERIFY] 联网验证失败: {e}')

    return _escape_dict_strings(parsed)


def generate_contract_draft(data: Dict[str, Any]) -> str:
    """
    生成合同草稿。
    支持租赁/劳动/服务/借款四种模板，内容与Node.js版本完全一致。
    所有用户输入内容均已做HTML转义。
    """
    contract_type = data.get('type', '')
    party_a = escape_html(data.get('partyA', ''))
    party_b = escape_html(data.get('partyB', ''))
    intent = escape_html(data.get('intent', ''))
    details = escape_html(data.get('details', ''))

    today = datetime.now()
    date_str = f'{today.year}年{today.month}月{today.day}日'

    contract = ''

    if contract_type == '租赁合同':
        contract = f'# {party_a} 与 {party_b} 房屋租赁合同\n\n'
        contract += '## 第一条 合同主体\n\n'
        contract += f'甲方（出租方）：{party_a}\n'
        contract += f'乙方（承租方）：{party_b}\n\n'
        contract += '## 第二条 房屋概况\n\n'
        contract += '甲方将位于 [具体地址] 的房屋出租给乙方使用。\n\n'
        contract += '## 第三条 租赁期限\n\n'
        contract += '租赁期限自 [起始日期] 起至 [结束日期] 止。\n\n'
        contract += '## 第四条 租金及支付方式\n\n'
        contract += '1. 每月租金为人民币 [金额] 元整。\n'
        contract += '2. 支付方式：[支付方式]，首期租金应于 [日期] 前支付。\n\n'
        contract += '## 第五条 押金\n\n'
        contract += '乙方应向甲方支付押金人民币 [金额] 元整，作为履约保证金。租赁期满且乙方无违约时，甲方应全额退还押金（不计利息）。\n\n'
        contract += '## 第六条 双方权利义务\n\n'
        contract += '### 甲方权利义务\n'
        contract += '1. 按照约定时间向乙方交付房屋；\n'
        contract += '2. 保证房屋及附属设施正常使用；\n'
        contract += '3. 负责房屋主体结构的维修。\n\n'
        contract += '### 乙方权利义务\n'
        contract += '1. 按时足额支付租金及各项费用；\n'
        contract += '2. 爱护房屋及附属设施，合理使用；\n'
        contract += '3. 不得擅自转租、改变房屋结构。\n\n'
        contract += '## 第七条 合同解除\n\n'
        contract += '1. 双方协商一致，可以解除合同；\n'
        contract += '2. 一方严重违约，另一方有权单方解除合同；\n'
        contract += '3. 因不可抗力导致合同无法继续履行的。\n\n'
        contract += '## 第八条 违约责任\n\n'
        contract += '1. 一方违约，应承担相应的违约责任；\n'
        contract += '2. 违约金数额应与实际损失相当，不得超过合同总金额的30%。\n\n'
        contract += '## 第九条 争议解决\n\n'
        contract += '本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，任何一方可向房屋所在地人民法院提起诉讼。\n\n'

    elif contract_type == '劳动合同':
        contract = f'# {party_a} 与 {party_b} 劳动合同\n\n'
        contract += '## 第一条 合同主体\n\n'
        contract += f'甲方（用人单位）：{party_a}\n'
        contract += f'乙方（劳动者）：{party_b}\n\n'
        contract += '## 第二条 合同期限\n\n'
        contract += '本合同为[固定/无固定]期限劳动合同，自 [起始日期] 起至 [结束日期] 止。试用期自 [起始日期] 起至 [结束日期] 止，试用期工资为人民币 [金额] 元。\n\n'
        contract += '## 第三条 工作内容和工作地点\n\n'
        contract += '1. 乙方同意根据甲方工作需要，在 [工作地点] 担任 [岗位名称] 工作；\n'
        contract += '2. 甲方可以根据经营需要调整乙方的工作岗位。\n\n'
        contract += '## 第四条 工作时间和休息休假\n\n'
        contract += '1. 实行 [标准工时/综合计算工时/不定时] 工作制；\n'
        contract += '2. 乙方依法享有法定节假日、年休假等休息休假权利。\n\n'
        contract += '## 第五条 劳动报酬\n\n'
        contract += '1. 乙方月工资为人民币 [金额] 元整；\n'
        contract += '2. 工资支付日期为每月 [日期] 日；\n'
        contract += '3. 甲方依法为乙方缴纳社会保险和住房公积金。\n\n'
        contract += '## 第六条 劳动保护和工作条件\n\n'
        contract += '甲方应提供符合国家规定的劳动安全卫生条件和必要的劳动保护用品。\n\n'
        contract += '## 第七条 劳动合同的解除和终止\n\n'
        contract += '双方应按照《中华人民共和国劳动合同法》的规定执行。\n\n'
        contract += '## 第八条 劳动争议处理\n\n'
        contract += '发生劳动争议，双方可以协商解决；也可以向劳动争议仲裁委员会申请仲裁。\n\n'

    elif contract_type == '服务合同':
        contract = f'# {party_a} 与 {party_b} 服务合同\n\n'
        contract += '## 第一条 合同主体\n\n'
        contract += f'甲方（服务提供方）：{party_a}\n'
        contract += f'乙方（服务接受方）：{party_b}\n\n'
        contract += '## 第二条 服务内容\n\n'
        contract += '甲方同意为乙方提供以下服务：[具体服务内容]\n\n'
        contract += '## 第三条 服务期限\n\n'
        contract += '服务期限自 [起始日期] 起至 [结束日期] 止。\n\n'
        contract += '## 第四条 服务费用及支付方式\n\n'
        contract += '1. 服务费用总计为人民币 [金额] 元整；\n'
        contract += '2. 支付方式：[支付方式]。\n\n'
        contract += '## 第五条 双方权利义务\n\n'
        contract += '### 甲方权利义务\n'
        contract += '1. 按照约定提供服务；\n'
        contract += '2. 保证服务质量；\n'
        contract += '3. 对知悉的乙方商业秘密负有保密义务。\n\n'
        contract += '### 乙方权利义务\n'
        contract += '1. 按时支付服务费用；\n'
        contract += '2. 为甲方提供必要的工作条件；\n'
        contract += '3. 按照约定接受服务。\n\n'
        contract += '## 第六条 违约责任\n\n'
        contract += '任何一方违反本合同约定，应承担相应的违约责任。\n\n'

    elif contract_type == '借款合同':
        contract = f'# {party_a} 与 {party_b} 借款合同\n\n'
        contract += '## 第一条 合同主体\n\n'
        contract += f'甲方（出借人）：{party_a}\n'
        contract += f'乙方（借款人）：{party_b}\n\n'
        contract += '## 第二条 借款金额\n\n'
        contract += '甲方向乙方提供借款人民币 [金额] 元整。\n\n'
        contract += '## 第三条 借款用途\n\n'
        contract += '借款用途为：[具体用途]\n\n'
        contract += '## 第四条 借款期限\n\n'
        contract += '借款期限自 [起始日期] 起至 [结束日期] 止。\n\n'
        contract += '## 第五条 借款利率及利息支付\n\n'
        contract += '1. 双方约定年利率为 [利率]%；\n'
        contract += '2. 利息支付方式：[支付方式]；\n'
        contract += '3. 利率不得超过合同成立时一年期贷款市场报价利率（LPR）的四倍。\n\n'
        contract += '## 第六条 还款方式\n\n'
        contract += '乙方应于 [还款日期] 前将本金及利息一次性支付给甲方。\n\n'
        contract += '## 第七条 违约责任\n\n'
        contract += '1. 乙方逾期还款的，应承担相应的违约责任；\n'
        contract += '2. 甲方有权要求乙方支付逾期利息。\n\n'
        contract += '## 第八条 争议解决\n\n'
        contract += '发生争议，双方应友好协商解决；协商不成的，向甲方所在地人民法院提起诉讼。\n\n'

    else:
        contract = f'# {party_a} 与 {party_b} 合同\n\n'
        contract += '## 第一条 合同主体\n\n'
        contract += f'甲方：{party_a}\n'
        contract += f'乙方：{party_b}\n\n'
        contract += '## 第二条 合同目的\n\n'
        contract += '双方经友好协商，达成以下协议。\n\n'
        contract += '## 第三条 双方权利义务\n\n'
        contract += '### 甲方权利义务\n'
        contract += '1. [甲方权利1]\n'
        contract += '2. [甲方义务1]\n\n'
        contract += '### 乙方权利义务\n'
        contract += '1. [乙方权利1]\n'
        contract += '2. [乙方义务1]\n\n'
        contract += '## 第四条 违约责任\n\n'
        contract += '任何一方违反本合同约定，应承担相应的违约责任。\n\n'

    contract += '## 第十条 其他约定\n\n'
    if details:
        contract += f'其他特别约定：{details}\n\n'
    contract += '## 第十一条 生效条款\n\n'
    contract += '本合同自双方签字盖章之日起生效。本合同一式两份，双方各执一份，具有同等法律效力。\n\n'
    contract += '甲方（签字/盖章）：\n\n'
    contract += f'日期：{date_str}\n\n'
    contract += '乙方（签字/盖章）：\n\n'
    contract += f'日期：{date_str}\n'

    return contract
