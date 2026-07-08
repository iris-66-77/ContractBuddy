# -*- coding: utf-8 -*-
"""
ReAct合同分析器
将 Node.js 的 ContractAnalyzer.js 翻译为 Python。
基于 ReAct（推理+行动）框架对合同进行多轮分析。
"""

import re
import time
from typing import Any, Dict, List, Optional

from services.react_core import ReActCore
from rag_py.vector_store import VectorStore


class ContractAnalyzer:
    """
    ReAct合同分析器。
    通过多轮推理与行动循环，逐步收集信息并生成分析结论。
    """

    def __init__(self, options: Optional[Dict[str, Any]] = None):
        """
        :param options: 配置选项，可选 maxIterations 等
        """
        if options is None:
            options = {}
        self.options = options
        self.react_core = ReActCore(options)
        self.available_actions = [
            'parse_contract_structure',
            'search_patterns',
            'search_knowledge_base',
            'search_legal_info',
            'ai_deep_analysis',
            'verify_with_context',
            'refine_conclusions'
        ]

    async def analyze(self, contract_text: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        主分析方法。
        执行最多5轮固定推理循环，置信度达到0.85或满5轮后终止。
        """
        if options is None:
            options = {}

        self.react_core.reset()

        start_time = time.time()
        iteration = 0

        current_state = {
            'contractText': contract_text,
            'analysisResult': None,
            'confidence': 0.0,
            'needMoreInfo': True,
            'cluesFound': []
        }

        self.react_core.record_thinking(iteration, '开始分析合同，首先理解合同结构和类型', {
            'contractLength': len(contract_text)
        })

        while iteration < self.react_core.options['maxIterations'] and current_state['needMoreInfo']:
            iteration += 1

            reasoning = self.reason(current_state, iteration)
            self.react_core.record_thinking(iteration, reasoning['thought'], reasoning['context'])

            action_result = await self.act(reasoning['action'], reasoning['parameters'], current_state, iteration)
            action_record = self.react_core.record_action(
                iteration, reasoning['action'], reasoning['parameters'],
                action_result['success'], action_result.get('context', {})
            )

            current_state = self.update_state(current_state, action_result, iteration)

            if options.get('enableEvaluation') and action_result['success']:
                self.react_core.evaluate_action(action_record, {
                    'success': action_result['success'],
                    'qualityScore': action_result.get('qualityScore', 0.7),
                    'feedback': action_result.get('feedback', ''),
                    'lessonsLearned': action_result.get('lessonsLearned', [])
                })

            if current_state['confidence'] >= 0.85:
                current_state['needMoreInfo'] = False

        final_thinking = self.final_reflection(current_state)
        self.react_core.record_thinking(iteration + 1, final_thinking['thought'], final_thinking['context'])

        final_result = self.generate_final_result(current_state)
        end_time = time.time()

        self.react_core.record_performance_metric({
            'type': 'analysis_time',
            'value': int((end_time - start_time) * 1000),
            'context': {'contractLength': len(contract_text), 'iterations': iteration}
        })

        return {
            'result': final_result,
            'trace': self.react_core.get_trace(),
            'performance': {
                'timeMs': int((end_time - start_time) * 1000),
                'iterations': iteration
            }
        }

    def reason(self, state: Dict[str, Any], iteration: int) -> Dict[str, Any]:
        """
        生成当前轮次的Thought。
        """
        action_plan = self.decide_next_action(state, iteration)

        thought = ''
        action = action_plan['action']
        if action == 'parse_contract_structure':
            thought = f'第{iteration}轮：首先需要解析合同结构，识别合同类型、主体、关键条款。'
        elif action == 'search_patterns':
            thought = f'第{iteration}轮：使用模式匹配快速搜索常见的风险条款。'
        elif action == 'search_knowledge_base':
            thought = f'第{iteration}轮：搜索知识库中的类似案例和法律知识。'
        elif action == 'search_legal_info':
            thought = f'第{iteration}轮：联网搜索最新的法律条文和相关案例。'
        elif action == 'ai_deep_analysis':
            thought = f'第{iteration}轮：基于收集到的信息，进行AI深度分析。'
        elif action == 'verify_with_context':
            thought = f'第{iteration}轮：结合上下文验证初步结论，避免误判。'
        elif action == 'refine_conclusions':
            thought = f'第{iteration}轮：整理和优化最终结论，确保每个判断都有依据。'

        return {
            'thought': thought,
            'action': action,
            'parameters': action_plan['parameters'],
            'context': {
                'stateSnapshot': {
                    'confidence': state['confidence'],
                    'cluesCount': len(state['cluesFound'])
                }
            }
        }

    def decide_next_action(self, state: Dict[str, Any], iteration: int) -> Dict[str, Any]:
        """
        决定下一步行动。
        轮次1-5采用固定路径，超出后默认优化结论。
        """
        if iteration == 1:
            return {
                'action': 'parse_contract_structure',
                'parameters': {'depth': 'basic'}
            }

        if iteration == 2:
            return {
                'action': 'search_patterns',
                'parameters': {'sensitivity': 'medium'}
            }

        if iteration == 3:
            return {
                'action': 'search_knowledge_base',
                'parameters': {'limit': 5}
            }

        if iteration == 4 and state['cluesFound']:
            return {
                'action': 'search_legal_info',
                'parameters': {'queries': state['cluesFound'][:3]}
            }

        if iteration == 5:
            return {
                'action': 'ai_deep_analysis',
                'parameters': {'detailLevel': 'high'}
            }

        return {
            'action': 'refine_conclusions',
            'parameters': {}
        }

    async def act(self, action: str, parameters: Dict[str, Any], state: Dict[str, Any], iteration: int) -> Dict[str, Any]:
        """
        执行指定行动。
        """
        result = {
            'success': True,
            'qualityScore': 0.7,
            'data': None,
            'feedback': '',
            'lessonsLearned': [],
            'context': {}
        }

        try:
            if action == 'parse_contract_structure':
                result = await self.parse_contract_structure(state['contractText'], parameters)
            elif action == 'search_patterns':
                result = await self.search_patterns(state['contractText'], parameters)
            elif action == 'search_knowledge_base':
                result = await self.search_knowledge_base(state['contractText'], parameters)
            elif action == 'search_legal_info':
                result = await self.search_legal_info(parameters)
            elif action == 'ai_deep_analysis':
                result = await self.perform_ai_deep_analysis(state, parameters)
            elif action == 'verify_with_context':
                result = await self.verify_with_context(state, parameters)
            elif action == 'refine_conclusions':
                result = await self.refine_conclusions(state, parameters)
        except Exception as error:
            result['success'] = False
            result['feedback'] = str(error)

        return result

    async def parse_contract_structure(self, text: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        解析合同结构，推断合同类型并提取线索。
        """
        lines = [l for l in text.split('\n') if l.strip()]
        clues = []

        contract_type = self.infer_contract_type(text)

        if '租赁' in text or '房东' in text:
            clues.append('租赁合同线索')
        if '劳动' in text or '工资' in text:
            clues.append('劳动合同线索')
        if '违约金' in text:
            clues.append('违约金条款')
        if '押金' in text:
            clues.append('押金条款')
        if '最终解释权' in text:
            clues.append('最终解释权条款')

        return {
            'success': True,
            'qualityScore': 0.8,
            'data': {
                'contractType': contract_type,
                'lineCount': len(lines),
                'structure': 'parsed'
            },
            'cluesFound': clues,
            'feedback': '合同结构解析完成',
            'lessonsLearned': ['合同类型推断可作为后续分析的重要上下文'],
            'context': {'contractType': contract_type}
        }

    def infer_contract_type(self, text: str) -> str:
        """
        根据关键词推断合同类型。
        """
        t = text.lower()
        if re.search(r'租赁|房东|押金|租金', t):
            return '租赁合同'
        if re.search(r'劳动|工资|加班|社保', t):
            return '劳动合同'
        if re.search(r'购房|房产|定金', t):
            return '购房协议'
        if re.search(r'服务|条款|协议|注册', t):
            return '服务合同'
        if re.search(r'借款|贷款|利息', t):
            return '借款合同'
        return '其他合同'

    async def search_patterns(self, text: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        模式匹配搜索：识别常见风险条款。
        """
        risky_patterns = [
            {'name': '最终解释权', 'pattern': re.compile(r'最终解释权|最终决定权'), 'risk': 'high'},
            {'name': '押金不退', 'pattern': re.compile(r'押金.*不退|押金.*不予退还'), 'risk': 'high'},
            {'name': '违约金过高', 'pattern': re.compile(r'违约金.*[2-9][0-9]%|违约金.*100%'), 'risk': 'high'},
            {'name': '单方解除权', 'pattern': re.compile(r'甲方.*有权.*解除|单方.*解除.*合同'), 'risk': 'medium'}
        ]

        matches = []
        for p in risky_patterns:
            if p['pattern'].search(text):
                matches.append({
                    'pattern': p['name'],
                    'risk': p['risk'],
                    'match': True
                })

        return {
            'success': True,
            'qualityScore': 0.85 if matches else 0.6,
            'data': {'matches': matches},
            'cluesFound': [m['pattern'] for m in matches],
            'feedback': f'找到{len(matches)}个可能的风险模式',
            'lessonsLearned': ['模式匹配可以快速识别潜在风险，但需要进一步验证'],
            'context': {'matchCount': len(matches)}
        }

    async def search_knowledge_base(self, text: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        知识库搜索：使用向量存储检索相似文档。
        """
        try:
            store = VectorStore()
            search_result = await store.search(text[:500], {'limit': params.get('limit', 5)})

            clues = []
            for r in search_result.get('results', []):
                meta = r.get('metadata', {})
                if meta.get('category'):
                    clues.append(meta['category'])
                else:
                    clues.append('knowledge')

            return {
                'success': True,
                'qualityScore': 0.8 if search_result.get('results') else 0.5,
                'data': search_result,
                'cluesFound': clues,
                'feedback': f'找到{len(search_result.get("results", []))}条知识库记录',
                'lessonsLearned': ['知识库可以提供历史案例和法律知识'],
                'context': {'resultCount': len(search_result.get('results', []))}
            }
        except Exception as e:
            return {
                'success': False,
                'qualityScore': 0.0,
                'data': None,
                'cluesFound': [],
                'feedback': f'知识库搜索失败: {e}',
                'lessonsLearned': [],
                'context': {'error': str(e)}
            }

    async def search_legal_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        法律搜索：使用SerpAPI搜索最新法律信息。
        """
        try:
            import services.serpapi_service as serpapi_service

            if not serpapi_service.has_api_key():
                return {
                    'success': True,
                    'qualityScore': 0.4,
                    'data': None,
                    'cluesFound': [],
                    'feedback': 'SerpAPI未配置，跳过法律搜索',
                    'lessonsLearned': ['法律搜索需要配置SerpAPI'],
                    'context': {'serpApiAvailable': False}
                }

            queries = params.get('queries', ['民法典 格式条款'])
            results = []

            for query in queries[:2]:
                try:
                    search_result = serpapi_service.search_legal_info(query)
                    results.append(search_result)
                except Exception as e:
                    print(f'搜索失败: {e}')

            return {
                'success': True,
                'qualityScore': 0.85 if results else 0.4,
                'data': results,
                'cluesFound': ['法律条文参考'],
                'feedback': f'完成{len(results)}次法律搜索',
                'lessonsLearned': ['法律搜索可以提供最新的法律参考'],
                'context': {'searchCount': len(results)}
            }
        except Exception:
            return {
                'success': True,
                'qualityScore': 0.3,
                'data': None,
                'cluesFound': [],
                'feedback': '法律搜索跳过',
                'lessonsLearned': [],
                'context': {'skipped': True}
            }

    async def perform_ai_deep_analysis(self, state: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
        """
        AI深度分析准备。
        """
        return {
            'success': True,
            'qualityScore': 0.75,
            'data': {'status': 'ready_for_ai'},
            'cluesFound': ['AI分析准备完成'],
            'feedback': 'AI深度分析已准备',
            'lessonsLearned': ['AI分析应建立在前期信息收集基础上'],
            'context': {'stateConfidence': state['confidence']}
        }

    async def verify_with_context(self, state: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
        """
        结合上下文验证初步结论。
        """
        return {
            'success': True,
            'qualityScore': 0.8,
            'data': {'verified': True},
            'cluesFound': [],
            'feedback': '上下文验证完成',
            'lessonsLearned': ['上下文验证可减少误判'],
            'context': {}
        }

    async def refine_conclusions(self, state: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
        """
        整理和优化最终结论。
        """
        return {
            'success': True,
            'qualityScore': 0.9,
            'data': {'refined': True},
            'cluesFound': [],
            'feedback': '结论优化完成',
            'lessonsLearned': ['最终结论需要多次推敲'],
            'context': {}
        }

    def update_state(self, state: Dict[str, Any], action_result: Dict[str, Any], iteration: int) -> Dict[str, Any]:
        """
        更新分析状态。
        根据行动质量得分增加置信度（+0.15 ~ +0.25）。
        """
        new_state = {
            'contractText': state['contractText'],
            'analysisResult': state.get('analysisResult') or {},
            'confidence': state['confidence'],
            'needMoreInfo': state['needMoreInfo'],
            'cluesFound': list(state['cluesFound'])
        }

        if action_result.get('cluesFound'):
            new_state['cluesFound'].extend(action_result['cluesFound'])

        incremental_confidence = 0.15 + (action_result.get('qualityScore', 0.7) * 0.1)
        new_state['confidence'] = min(1.0, new_state['confidence'] + incremental_confidence)

        if iteration >= 5:
            new_state['needMoreInfo'] = False

        new_state['analysisResult'][f'step_{iteration}'] = action_result.get('data')

        return new_state

    def final_reflection(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        最终反思：总结分析过程和结论可靠性。
        """
        confidence_pct = round(state['confidence'] * 100)
        completeness = '高' if state['confidence'] >= 0.85 else ('中' if state['confidence'] >= 0.6 else '低')
        suggestion = '分析结果较为可靠' if state['confidence'] >= 0.8 else '建议补充更多信息或咨询专业人士'

        thought = (
            f'最终反思：\n'
            f'- 共进行了{len(state["cluesFound"])}个线索发现\n'
            f'- 最终置信度：{confidence_pct}%\n'
            f'- 分析完整度：{completeness}\n'
            f'- 建议：{suggestion}'
        )

        return {
            'thought': thought,
            'context': {
                'finalConfidence': state['confidence'],
                'totalClues': len(state['cluesFound'])
            }
        }

    def generate_final_result(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成最终分析结果。
        """
        return {
            'contractType': self.infer_contract_type(state['contractText']),
            'confidence': state['confidence'],
            'cluesFound': state['cluesFound'],
            'analysisSteps': state.get('analysisResult', {}),
            'status': 'completed'
        }
