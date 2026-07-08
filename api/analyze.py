# -*- coding: utf-8 -*-
"""
主分析 API 路由模块

提供合同分析、合同拟写与健康检查接口。
融合 DeepSeek 分析与 ReAct 推理结果。
"""

import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import services.deepseek_service as deepseek_service
from services.contract_analyzer import ContractAnalyzer

router = APIRouter(prefix="/api")

# 应用启动时间戳（用于计算 uptime）
_start_time = time.time()

# ReAct 分析器实例（用于融合分析）
_react_analyzer = ContractAnalyzer()


class AnalyzeContractRequest(BaseModel):
    """合同分析请求体。"""
    text: str
    useReact: bool = True


class DraftContractRequest(BaseModel):
    """合同拟写请求体。"""
    type: str
    partyA: str
    partyB: str
    intent: str
    details: str


@router.post("/analyze")
async def handle_analyze_contract(request: Request, body: AnalyzeContractRequest) -> JSONResponse:
    """
    合同分析主端点。

    调用 DeepSeek 服务进行合同分析；若 useReact 为 True，
    则同时调用 ReAct 框架分析，并返回融合后的综合结果。
    """
    if not body.text or len(body.text) < 10:
        return JSONResponse(
            {"error": "合同文本过短，至少需要10个字符"},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    # DeepSeek 分析
    deepseek_result = await deepseek_service.analyze_contract_with_deepseek(body.text)

    response_data: Dict[str, Any] = {
        "source": "deepseek",
        "deepseekAnalysis": deepseek_result,
        "reactAnalysis": None,
        "fused": deepseek_result
    }

    # 若启用 ReAct，执行融合分析
    if body.useReact:
        react_result = await _react_analyzer.analyze(body.text)
        response_data["reactAnalysis"] = {
            "result": react_result["result"],
            "performance": react_result["performance"]
        }

        # 简单融合：以 DeepSeek 结果为主，补充 ReAct 的线索
        fused = dict(deepseek_result)
        react_clues = react_result["result"].get("cluesFound", [])
        if react_clues and "details" in fused:
            fused["reactClues"] = react_clues

        fused["fusionNote"] = "综合 DeepSeek 深度分析与 ReAct 推理框架结果"
        response_data["fused"] = fused
        response_data["source"] = "fused"

    return JSONResponse(
        response_data,
        media_type="application/json; charset=utf-8"
    )


@router.post("/contract/draft")
async def handle_draft_contract(request: Request, body: DraftContractRequest) -> JSONResponse:
    """
    合同拟写端点。

    根据合同类型、当事人信息与需求描述，生成合同草稿。
    """
    if not all([body.type, body.partyA, body.partyB]):
        return JSONResponse(
            {"error": "合同类型、甲方和乙方为必填项"},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    result = await deepseek_service.generate_contract_draft(
        contract_type=body.type,
        party_a=body.partyA,
        party_b=body.partyB,
        intent=body.intent or "",
        details=body.details or ""
    )

    return JSONResponse(
        result,
        media_type="application/json; charset=utf-8"
    )


@router.get("/health")
async def handle_health_check(request: Request) -> JSONResponse:
    """
    健康检查端点。

    返回服务状态、运行时长、当前时间戳与版本号。
    """
    uptime_seconds = int(time.time() - _start_time)
    return JSONResponse(
        {
            "status": "healthy",
            "uptime": uptime_seconds,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0"
        },
        media_type="application/json; charset=utf-8"
    )
