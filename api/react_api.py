# -*- coding: utf-8 -*-
"""
ReAct API 路由模块

提供基于 ReAct（Reasoning + Acting）框架的合同分析接口，
支持推理轨迹查询、反馈提交与框架状态管理。
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.contract_analyzer import ContractAnalyzer

router = APIRouter(prefix="/api/react")

# 全局 ReAct 分析器实例
_contract_analyzer = ContractAnalyzer()


class AnalyzeRequest(BaseModel):
    """ReAct 分析请求体。"""
    contractText: Optional[str] = None
    text: Optional[str] = None


class FeedbackRequest(BaseModel):
    """反馈提交请求体。"""
    type: Optional[str] = "action"
    actionId: Optional[str] = None
    success: bool = True
    qualityScore: Optional[float] = None
    feedback: Optional[str] = None
    lessonsLearned: Optional[List[str]] = None
    reason: Optional[str] = None
    previousState: Optional[Dict[str, Any]] = None
    newState: Optional[Dict[str, Any]] = None


@router.post("/analyze")
async def handle_analyze_with_react(request: Request, body: AnalyzeRequest) -> JSONResponse:
    """
    使用 ReAct 框架分析合同。

    接收合同全文，返回分析结果、推理轨迹与性能指标。
    """
    contract_text = body.contractText or body.text or ""
    if len(contract_text) < 10:
        return JSONResponse(
            {"error": "合同文本过短，至少需要10个字符"},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    analysis = await _contract_analyzer.analyze(contract_text)

    return JSONResponse(
        {
            "success": True,
            "data": analysis["result"],
            "reactTrace": analysis["trace"],
            "performance": analysis["performance"]
        },
        media_type="application/json; charset=utf-8"
    )


@router.get("/trace")
async def handle_get_trace(request: Request) -> JSONResponse:
    """
    获取当前 ReAct 推理轨迹。

    返回思考链、行动链与摘要统计。
    """
    trace = _contract_analyzer.react.get_trace()
    return JSONResponse(
        trace,
        media_type="application/json; charset=utf-8"
    )


@router.get("/feedback")
async def handle_get_feedback(request: Request) -> JSONResponse:
    """
    获取 ReAct 反馈数据。

    返回反馈记录、性能指标与经验教训。
    """
    store = _contract_analyzer.react.feedback_store
    feedback_entries = store.get("feedbackEntries", [])
    metrics = store.get("performanceMetrics", [])

    lessons = []
    for entry in feedback_entries:
        entry_lessons = entry.get("lessonsLearned", [])
        if isinstance(entry_lessons, list):
            lessons.extend(entry_lessons)

    return JSONResponse(
        {
            "feedback": feedback_entries,
            "metrics": metrics,
            "lessonsLearned": lessons[-50:],
            "feedbackCount": len(feedback_entries),
            "metricCount": len(metrics),
            "lessonCount": len(lessons)
        },
        media_type="application/json; charset=utf-8"
    )


@router.post("/feedback")
async def handle_submit_feedback(request: Request, body: FeedbackRequest) -> JSONResponse:
    """
    提交 ReAct 反馈。

    支持行动评估、策略调整与性能指标记录。
    """
    react = _contract_analyzer.react

    if body.type == "action" or body.actionId:
        react.evaluate_action(
            {"id": body.actionId or react.generate_id()},
            {
                "success": body.success,
                "qualityScore": body.qualityScore or 0.7,
                "feedback": body.feedback or "",
                "lessonsLearned": body.lessonsLearned or []
            }
        )
    elif body.type == "strategy":
        react.record_strategy_adjustment({
            "reason": body.reason or "",
            "previousState": body.previousState,
            "newState": body.newState
        })
    elif body.type == "metric" and body.qualityScore is not None:
        react.record_performance_metric({
            "type": body.feedback or "custom",
            "value": body.qualityScore,
            "context": body.previousState or {}
        })

    return JSONResponse(
        {"success": True, "message": "反馈已记录"},
        media_type="application/json; charset=utf-8"
    )


@router.get("/status")
async def handle_get_status(request: Request) -> JSONResponse:
    """
    获取 ReAct 框架状态。

    返回框架配置、反馈数量、指标数量与当前状态。
    """
    react = _contract_analyzer.react
    store = react.feedback_store

    return JSONResponse(
        {
            "framework": "ReAct",
            "maxIterations": react.options.get("maxIterations", 5),
            "enableReflection": react.options.get("enableReflection", True),
            "feedbackCount": len(store.get("feedbackEntries", [])),
            "metricCount": len(store.get("performanceMetrics", [])),
            "adjustmentCount": len(store.get("strategyAdjustments", [])),
            "thinkingCount": len(react.thinking_history),
            "actionCount": len(react.action_history),
            "initialized": True
        },
        media_type="application/json; charset=utf-8"
    )


@router.post("/reset")
async def handle_reset(request: Request) -> JSONResponse:
    """
    重置 ReAct 状态。

    清空思考历史与行动历史（保留反馈存储）。
    """
    _contract_analyzer.react.reset()
    return JSONResponse(
        {"success": True, "message": "ReAct 状态已重置"},
        media_type="application/json; charset=utf-8"
    )
