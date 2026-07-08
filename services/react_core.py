"""
ReAct推理核心
记录推理过程、行动执行、策略调整和性能指标，支持反思与自改进
"""

import json
import os
import secrets
from typing import List, Optional, Dict, Any


class ReActCore:
    """
    ReAct（Reasoning + Acting）推理核心类
    负责记录思考链、行动链、反馈和性能指标
    """

    def __init__(self, options: Optional[Dict[str, Any]] = None):
        """
        初始化ReAct核心
        :param options: 配置选项，可选 dataDir, maxIterations, enableReflection
        """
        if options is None:
            options = {}

        self.options = {
            'dataDir': options.get('dataDir', os.path.join(os.path.dirname(__file__), '..', 'data')),
            'maxIterations': options.get('maxIterations', 5),
            'enableReflection': options.get('enableReflection', True)
        }

        # 合并用户传入的其他选项
        for key, value in options.items():
            self.options[key] = value

        self._ensure_data_dir()
        self.thinking_history: List[Dict[str, Any]] = []
        self.action_history: List[Dict[str, Any]] = []
        self.feedback_store = self._load_feedback_store()

    def _ensure_data_dir(self) -> None:
        """确保数据目录存在"""
        data_dir = self.options['dataDir']
        if not os.path.exists(data_dir):
            os.makedirs(data_dir, exist_ok=True)

    def _load_feedback_store(self) -> Dict[str, Any]:
        """
        从磁盘加载反馈存储
        :return: 反馈存储字典
        """
        feedback_path = os.path.join(self.options['dataDir'], 'react_feedback.json')
        if os.path.exists(feedback_path):
            try:
                with open(feedback_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f'加载反馈存储失败: {e}')

        return {
            'version': '1.0',
            'feedbackEntries': [],
            'strategyAdjustments': [],
            'performanceMetrics': []
        }

    def _save_feedback_store(self) -> None:
        """将反馈存储持久化到磁盘"""
        feedback_path = os.path.join(self.options['dataDir'], 'react_feedback.json')
        try:
            with open(feedback_path, 'w', encoding='utf-8') as f:
                json.dump(self.feedback_store, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def generate_id(self) -> str:
        """
        生成唯一标识符
        :return: 32位十六进制随机字符串
        """
        return secrets.token_hex(16)

    def record_thinking(self, iteration: int, thought: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        记录思考过程
        :param iteration: 当前迭代轮次
        :param thought: 思考内容
        :param context: 上下文信息
        :return: 思考记录对象
        """
        thinking_record = {
            'id': self.generate_id(),
            'timestamp': self._now_iso(),
            'iteration': iteration,
            'thought': thought,
            'context': context or {},
            'type': 'reasoning'
        }
        self.thinking_history.append(thinking_record)
        return thinking_record

    def record_action(self, iteration: int, action: str, parameters: Dict[str, Any],
                      result: Any, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        记录行动执行
        :param iteration: 当前迭代轮次
        :param action: 行动名称
        :param parameters: 行动参数
        :param result: 行动结果
        :param context: 上下文信息
        :return: 行动记录对象
        """
        action_record = {
            'id': self.generate_id(),
            'timestamp': self._now_iso(),
            'iteration': iteration,
            'action': action,
            'parameters': parameters,
            'result': result,
            'context': context or {},
            'type': 'acting'
        }
        self.action_history.append(action_record)
        return action_record

    def evaluate_action(self, action_record: Dict[str, Any], outcome: Dict[str, Any]) -> Dict[str, Any]:
        """
        评估行动效果并记录反馈
        :param action_record: 行动记录对象
        :param outcome: 评估结果，包含 success, qualityScore, feedback, lessonsLearned
        :return: 评估记录对象
        """
        evaluation = {
            'actionId': action_record.get('id'),
            'timestamp': self._now_iso(),
            'success': outcome.get('success', False),
            'qualityScore': outcome.get('qualityScore', 0),
            'feedback': outcome.get('feedback', ''),
            'lessonsLearned': outcome.get('lessonsLearned', [])
        }

        self.feedback_store['feedbackEntries'].append(evaluation)
        self._save_feedback_store()
        return evaluation

    def record_strategy_adjustment(self, adjustment: Dict[str, Any]) -> Dict[str, Any]:
        """
        记录策略调整
        :param adjustment: 调整信息，可包含 reason, previousState, newState
        :return: 调整记录对象
        """
        adjustment_record = {
            'id': self.generate_id(),
            'timestamp': self._now_iso(),
            'adjustment': adjustment,
            'reason': adjustment.get('reason', ''),
            'previousState': adjustment.get('previousState'),
            'newState': adjustment.get('newState')
        }
        self.feedback_store['strategyAdjustments'].append(adjustment_record)
        self._save_feedback_store()
        return adjustment_record

    def record_performance_metric(self, metric: Dict[str, Any]) -> Dict[str, Any]:
        """
        记录性能指标
        :param metric: 指标信息，需包含 type, value，可选 context
        :return: 指标记录对象
        """
        metric_record = {
            'id': self.generate_id(),
            'timestamp': self._now_iso(),
            'metricType': metric.get('type'),
            'value': metric.get('value'),
            'context': metric.get('context', {})
        }
        self.feedback_store['performanceMetrics'].append(metric_record)
        self._save_feedback_store()
        return metric_record

    def get_thinking_chain(self) -> List[Dict[str, Any]]:
        """
        获取思考链
        :return: 思考记录列表（包含 step, iteration, thought, timestamp）
        """
        return [
            {
                'step': idx + 1,
                'iteration': t['iteration'],
                'thought': t['thought'],
                'timestamp': t['timestamp']
            }
            for idx, t in enumerate(self.thinking_history)
        ]

    def get_action_chain(self) -> List[Dict[str, Any]]:
        """
        获取行动链
        :return: 行动记录列表（包含 step, iteration, action, result, timestamp）
        """
        return [
            {
                'step': idx + 1,
                'iteration': a['iteration'],
                'action': a['action'],
                'result': 'success' if a.get('result') else 'failed',
                'timestamp': a['timestamp']
            }
            for idx, a in enumerate(self.action_history)
        ]

    def get_trace(self) -> Dict[str, Any]:
        """
        获取完整推理轨迹
        :return: 包含思考链、行动链和摘要统计的字典
        """
        total_iterations = 0
        for t in self.thinking_history:
            if t['iteration'] > total_iterations:
                total_iterations = t['iteration']
        for a in self.action_history:
            if a['iteration'] > total_iterations:
                total_iterations = a['iteration']

        return {
            'thinking': self.get_thinking_chain(),
            'acting': self.get_action_chain(),
            'summary': {
                'totalIterations': total_iterations,
                'thinkingCount': len(self.thinking_history),
                'actionCount': len(self.action_history)
            }
        }

    def reset(self) -> None:
        """重置思考历史和行动历史（不清除反馈存储）"""
        self.thinking_history = []
        self.action_history = []

    def get_lessons_learned(self, limit: Optional[int] = None) -> List[str]:
        """
        获取从历史反馈中提取的经验教训
        :param limit: 返回的最大条数，默认10
        :return: 经验教训列表
        """
        if limit is None:
            limit = 10

        lessons = []
        for entry in self.feedback_store.get('feedbackEntries', []):
            entry_lessons = entry.get('lessonsLearned', [])
            if entry_lessons:
                lessons.extend(entry_lessons)

        return lessons[-limit:]

    def get_performance_trend(self, metric_type: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        获取指定类型的性能指标趋势
        :param metric_type: 指标类型
        :param limit: 返回的最大条数，默认20
        :return: 指标记录列表
        """
        if limit is None:
            limit = 20

        metrics = [
            metric
            for metric in self.feedback_store.get('performanceMetrics', [])
            if metric.get('metricType') == metric_type
        ]

        return metrics[-limit:]

    @staticmethod
    def _now_iso() -> str:
        """获取当前ISO格式时间字符串"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()
