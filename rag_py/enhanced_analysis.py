# -*- coding: utf-8 -*-
"""
增强分析引擎
将 Node.js 的 enhancedAnalysis.js 翻译为 Python。
提供基于模式匹配 + 向量检索的合同增强分析能力。
"""

from typing import Any, Dict, List, Optional

from rag_py.vector_store import VectorStore
from rag_py.pattern_matcher import ClauseMatcher
from rag_py.embedding_service import EmbeddingService


class EnhancedAnalyzer:
    """
    增强分析器。
    结合模式匹配与向量检索，对合同文本进行深度风险分析。
    """

    def __init__(self, vector_store: Optional[VectorStore] = None, embedding_service: Optional[EmbeddingService] = None):
        """
        :param vector_store: 向量存储实例
        :param embedding_service: Embedding服务实例
        """
        self.vector_store = vector_store or VectorStore()
        self.embedding_service = embedding_service or None
        self.clause_matcher = ClauseMatcher()
        self.initialized = False
        self.initialize_knowledge_base()

    def initialize_knowledge_base(self) -> None:
        """初始化25条预置法律知识到向量存储"""
        knowledge_items = [
            {
                'content': '中国法律文件标准格式要求：1.合同标题居中，使用"××合同"命名；2.合同编号（如需）置于标题右下方；3.当事人信息栏：甲方名称、法定代表人、住所地、联系电话、统一社会信用代码；乙方同上；4.鉴于条款（前言）：写明签约背景和目的；5.正文条款按第一条、第二条...顺序编号；6.每条内容使用全角标点；7.签署栏：甲方签章处、法定代表人/授权代表、日期；乙方同上；8.附件清单（如有）。合同文本应使用宋体或仿宋，标题二号加粗，正文三号。',
                'metadata': {'type': 'format', 'category': '法律文书格式', 'riskLevel': 'none', 'source': '中国法律文书写作规范'}
            },
            {
                'content': '合同签署栏法律要求：必须有双方当事人签章（公章或合同专用章）、法定代表人或授权代理人签字、签署日期。自然人签署需本人签字并按捺手印（金额较大时建议公证）。法人签署需加盖公章并由法定代表人或授权代理人签字。签署日期应使用"××××年××月××日"格式。合同生效条件应在合同正文中明确约定。',
                'metadata': {'type': 'format', 'category': '签署规范', 'riskLevel': 'none', 'source': '合同法签署要求'}
            },
            {
                'content': '合同必备条款（民法典第470条）：合同内容由当事人约定，一般包括下列条款：（一）当事人的姓名或者名称和住所；（二）标的；（三）数量；（四）质量；（五）价款或者报酬；（六）履行期限、地点和方式；（七）违约责任；（八）解决争议的方法。缺少必备条款可能导致合同不成立或无法履行。',
                'metadata': {'type': 'law', 'category': '民法典', 'riskLevel': 'medium', 'source': '民法典第470条'}
            },
            {
                'content': '租赁合同法律要点：应包含房屋具体坐落地址、建筑面积、房屋用途、租赁期限、租金数额及支付方式、押金数额及退还条件、房屋维修责任、装修改造约定、转租条件、合同解除条件、违约责任、争议解决方式。依据民法典第七百零三条至第七百三十四条。',
                'metadata': {'type': 'format', 'category': '租赁合同', 'riskLevel': 'none', 'source': '民法典租赁合同章'}
            },
            {
                'content': '劳动合同法律要点：应包含用人单位名称、住所、法定代表人；劳动者姓名、住址、身份证号；合同期限（固定/无固定/以完成一定工作为期限）；工作内容和工作地点；工作时间和休息休假；劳动报酬；社会保险；劳动保护；合同解除和终止条件。依据劳动合同法第十七条。试用期不得超过：不满一年一个月，一到三年两个月，三年以上六个月。',
                'metadata': {'type': 'format', 'category': '劳动合同', 'riskLevel': 'none', 'source': '劳动合同法第17条、第19条'}
            },
            {
                'content': '借款合同法律要点：应包含借款人和出借人完整身份信息、借款金额（大写和小写）、借款用途、借款期限、借款利率（不得超过LPR四倍）、还款方式、担保方式（如有）、违约责任、争议解决方式。自然人之间借款建议写明转账方式及账户信息。依据民法典第六百六十七条至第六百八十条。',
                'metadata': {'type': 'format', 'category': '借款合同', 'riskLevel': 'none', 'source': '民法典借款合同章'}
            },
            {
                'content': '服务合同法律要点：应包含服务内容的具体描述和标准、服务期限、服务费用及支付节点、服务质量验收标准、保密条款、知识产权归属（如适用）、违约责任及赔偿计算方式、合同解除条件、争议解决方式。依据民法典合同编通则及服务合同相关规定。',
                'metadata': {'type': 'format', 'category': '服务合同', 'riskLevel': 'none', 'source': '民法典合同编'}
            },
            {
                'content': '合同编号规范：合同编号一般由年份+合同类型缩写+流水号组成，如"2026-LZ-001"表示2026年第001号租赁合同。劳动合同编号应包含部门信息以便管理。编号有助于合同管理和纠纷处理时的证据保全。',
                'metadata': {'type': 'format', 'category': '法律文书格式', 'riskLevel': 'none', 'source': '合同管理规范'}
            },
            {
                'content': '根据民法典第497条，提供格式条款一方免除其责任、加重对方责任、排除对方主要权利的，该格式条款无效。',
                'metadata': {'type': 'law', 'category': '民法典', 'riskLevel': 'high', 'source': '民法典第497条'}
            },
            {
                'content': '违约金超过实际损失30%的部分，当事人可以请求人民法院或者仲裁机构予以适当减少。',
                'metadata': {'type': 'law', 'category': '民法典', 'riskLevel': 'high', 'source': '民法典第585条'}
            },
            {
                'content': '租赁合同中，出租人不得擅自进入承租人房屋或处置承租人财物，必须通过法律途径。',
                'metadata': {'type': 'knowledge', 'category': '租赁合同', 'riskLevel': 'critical', 'source': '租赁合同法律常识'}
            },
            {
                'content': '最终解释权条款在法律上存在争议，对格式条款有两种以上解释的，应当作出不利于提供格式条款一方的解释。',
                'metadata': {'type': 'knowledge', 'category': '格式条款', 'riskLevel': 'high', 'source': '民法典第498条'}
            },
            {
                'content': '押金的性质是履约担保，租赁合同终止后，如无违约情形，出租人应当退还押金。',
                'metadata': {'type': 'knowledge', 'category': '租赁合同', 'riskLevel': 'medium', 'source': '押金法律性质'}
            },
            {
                'content': '因不可抗力不能履行合同的，根据不可抗力的影响，部分或者全部免除责任，但法律另有规定的除外。',
                'metadata': {'type': 'law', 'category': '民法典', 'riskLevel': 'medium', 'source': '民法典第590条'}
            },
            {
                'content': '实习协议不属于劳动合同，不受劳动法调整，但应遵循民事法律的公平原则和诚实信用原则。',
                'metadata': {'type': 'law', 'category': '实习协议', 'riskLevel': 'high', 'source': '实习协议法律性质'}
            },
            {
                'content': '三方协议是学校、学生、用人单位三方签订的协议，任何一方不得擅自变更或解除协议内容。',
                'metadata': {'type': 'knowledge', 'category': '三方协议', 'riskLevel': 'medium', 'source': '三方协议法律常识'}
            },
            {
                'content': '实习期间用人单位应当为实习生提供必要的劳动保护和安全生产条件，保障实习生人身安全。',
                'metadata': {'type': 'law', 'category': '实习权益', 'riskLevel': 'critical', 'source': '实习安全保障'}
            },
            {
                'content': '实习报酬应遵循公平原则，不得低于当地最低工资标准或合理的实习补贴标准。',
                'metadata': {'type': 'law', 'category': '实习报酬', 'riskLevel': 'high', 'source': '实习报酬规定'}
            },
            {
                'content': '三方协议中如约定"一方违约需支付巨额违约金"，可能因显失公平而被认定为无效条款。',
                'metadata': {'type': 'knowledge', 'category': '三方协议', 'riskLevel': 'high', 'source': '违约金公平原则'}
            },
            {
                'content': '实习协议中不得约定"实习生必须无偿加班"或"无条件接受岗位调动"等排除实习生主要权利的条款。',
                'metadata': {'type': 'knowledge', 'category': '实习协议', 'riskLevel': 'critical', 'source': '实习权利保护'}
            },
            {
                'content': '实习期限应明确约定，不得超过法律规定或合理范围，延期应经双方协商一致。',
                'metadata': {'type': 'knowledge', 'category': '实习协议', 'riskLevel': 'medium', 'source': '实习期限规定'}
            },
            {
                'content': '三方协议中学校的主要义务是推荐学生、协助管理学生实习，不得免除自身应尽的管理和保护责任。',
                'metadata': {'type': 'knowledge', 'category': '三方协议', 'riskLevel': 'medium', 'source': '学校责任界定'}
            },
            {
                'content': '实习期间实习生造成他人损害的，用人单位和学校根据过错程度承担相应责任，实习生有过错的也应承担责任。',
                'metadata': {'type': 'law', 'category': '实习责任', 'riskLevel': 'medium', 'source': '侵权责任法相关规定'}
            },
            {
                'content': '三方协议解除应当有明确的条件和程序，不得约定一方享有任意解除权而无需承担责任。',
                'metadata': {'type': 'knowledge', 'category': '三方协议', 'riskLevel': 'high', 'source': '协议解除条款'}
            },
            {
                'content': '实习协议中应当明确工作内容、工作时间、工作地点、实习报酬、保险保障等核心条款，模糊不清的条款应要求明确。',
                'metadata': {'type': 'knowledge', 'category': '实习协议', 'riskLevel': 'medium', 'source': '合同条款完整性'}
            }
        ]

        for item in knowledge_items:
            self.vector_store.add_document(item)

    async def initialize_knowledge_base_async(self) -> None:
        """异步初始化知识库：先添加预置文档，再为所有文档生成Embedding"""
        if self.initialized:
            return
        self.initialize_knowledge_base()
        await self.vector_store.embed_all_documents()
        self.initialized = True

    async def analyze_contract_enhanced(self, text: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        增强分析合同文本。
        先进行模式匹配，再对每个匹配的风险条款做向量检索，
        返回 patternAnalysis、similarCases、legalReferences、integratedAnalysis。
        """
        if options is None:
            options = {}

        result = {
            'patternAnalysis': None,
            'similarCases': [],
            'legalReferences': [],
            'integratedAnalysis': None,
            'searchMode': 'keyword'
        }

        result['patternAnalysis'] = self.clause_matcher.analyze_contract(text)

        if result['patternAnalysis'] and result['patternAnalysis']['details']:
            for match in result['patternAnalysis']['details']:
                query = match['clause']
                search_result = await self.vector_store.search(query, {'limit': 3})
                if search_result.get('mode'):
                    result['searchMode'] = search_result['mode']

                for res in search_result.get('results', []):
                    result['legalReferences'].append({
                        'clause': match['clause'],
                        'reference': res['content'],
                        'metadata': res['metadata'],
                        'score': res['score'],
                        'source': res.get('source') or 'keyword'
                    })

        result['integratedAnalysis'] = self.generate_integrated_analysis(result)

        return result

    def generate_integrated_analysis(self, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        生成综合分析报告。
        包含整体风险等级（overallRisk）、风险评分（riskScore）、
        模式发现（patternFindings）、法律依据（legalReferences）、建议（suggestions）。
        """
        pattern_analysis = result.get('patternAnalysis')
        if not pattern_analysis:
            return None

        overall_risk = 'low'
        risk_score = 30

        if pattern_analysis['riskyClauses'] > 0:
            high_risk_count = 0
            for detail in pattern_analysis['details']:
                if detail['maxRisk'] in ('high', 'critical'):
                    high_risk_count += 1

            if high_risk_count >= 3:
                overall_risk = 'high'
                risk_score = 85
            elif high_risk_count >= 1:
                overall_risk = 'medium'
                risk_score = 60
            else:
                overall_risk = 'low'
                risk_score = 40

        suggestions = self.generate_suggestions(pattern_analysis, result.get('legalReferences', []))

        return {
            'overallRisk': overall_risk,
            'riskScore': risk_score,
            'patternFindings': pattern_analysis,
            'legalReferences': result.get('legalReferences', []),
            'suggestions': suggestions
        }

    def generate_suggestions(self, pattern_analysis: Dict[str, Any], legal_references: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        根据模式分析结果和法律参考生成建议列表。
        """
        suggestions = []

        if pattern_analysis['riskyClauses'] == 0:
            suggestions.append({
                'type': 'success',
                'content': '恭喜！未检测到明显霸王条款。',
                'priority': 'info'
            })
            return suggestions

        high_risk_items = []
        for detail in pattern_analysis['details']:
            if detail['maxRisk'] in ('high', 'critical'):
                high_risk_items.append(detail)

        if high_risk_items:
            suggestions.append({
                'type': 'critical',
                'content': f'发现 {len(high_risk_items)} 条高风险条款，建议重点关注并要求修改。',
                'priority': 'high'
            })

            for item in high_risk_items[:3]:
                pattern_names = '、'.join(p['name'] for p in item['patterns'])
                suggestions.append({
                    'type': 'warning',
                    'content': f'{item["clause"][:50]}...可能属于{pattern_names}',
                    'priority': 'high'
                })

        if legal_references:
            suggestions.append({
                'type': 'info',
                'content': f'已找到 {len(legal_references)} 条相关法律依据可供参考。',
                'priority': 'medium'
            })

        return suggestions

    async def add_contract_to_knowledge(self, contract: Dict[str, Any]) -> Dict[str, Any]:
        """
        将合同添加到知识库。
        :param contract: 合同字典，需包含 originalText 等字段
        :return: 添加后的文档对象
        """
        knowledge_doc = {
            'content': contract.get('originalText', ''),
            'metadata': {
                'type': 'case',
                'category': contract.get('category', ''),
                'riskLevel': contract.get('riskLevel', ''),
                'riskScore': contract.get('riskScore', 0),
                'clauseCount': contract.get('clauseCount', 0),
                'source': '用户案例'
            }
        }

        return await self.vector_store.add_document_with_embedding(knowledge_doc)

    async def search_similar_contracts(self, text: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        搜索相似合同。
        :param text: 查询文本
        :param options: 可选参数（limit, category）
        :return: 检索结果字典
        """
        if options is None:
            options = {}

        return await self.vector_store.search(text, {
            'limit': options.get('limit', 3),
            'category': options.get('category')
        })
