# -*- coding: utf-8 -*-
"""
合同记忆 API 路由模块

提供合同分类统计、CRUD 操作、过滤查询与导出功能。
合同数据持久化存储在 data/contracts.json 中。
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import services.file_storage as file_storage
from services.risk_assessment import calculate_risk_score
from utils.helpers import generate_id, get_contract_category, safe_json_load, safe_json_save

router = APIRouter(prefix="/api/memory")

# 合同数据文件路径
CONTRACTS_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "contracts.json")


class SaveContractRequest(BaseModel):
    """保存合同请求体。"""
    text: str
    analysisResult: Optional[Dict[str, Any]] = None
    fileIds: Optional[List[str]] = None


class UpdateContractRequest(BaseModel):
    """更新合同请求体。"""
    title: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None


def _now_iso() -> str:
    """获取当前 ISO 格式时间字符串。"""
    return datetime.now(timezone.utc).isoformat()


@router.get("/categories")
async def handle_get_categories(request: Request) -> JSONResponse:
    """
    获取合同分类统计。

    按类别聚合合同数量与风险分布。
    """
    contracts = safe_json_load(CONTRACTS_DB_PATH, [])
    stats: Dict[str, Dict[str, Any]] = {}

    for c in contracts:
        cat = c.get("category", "其他")
        if cat not in stats:
            stats[cat] = {"count": 0, "icon": c.get("icon", "📄"), "riskLevels": {}}
        stats[cat]["count"] += 1

        risk = c.get("riskLevel", "low")
        stats[cat]["riskLevels"][risk] = stats[cat]["riskLevels"].get(risk, 0) + 1

    return JSONResponse(
        {"categories": stats, "total": len(contracts)},
        media_type="application/json; charset=utf-8"
    )


@router.get("/contracts")
async def handle_list_contracts(
    request: Request,
    search: Optional[str] = Query(None, description="文本搜索关键词"),
    category: Optional[str] = Query(None, description="按类别过滤"),
    risk: Optional[str] = Query(None, description="按风险等级过滤")
) -> JSONResponse:
    """
    获取合同列表，支持多维度过滤。

    可选 query 参数：search、category、risk。
    """
    contracts = safe_json_load(CONTRACTS_DB_PATH, [])
    filtered = contracts[:]

    if search:
        search_lower = search.lower()
        filtered = [
            c for c in filtered
            if search_lower in c.get("text", "").lower()
            or search_lower in c.get("title", "").lower()
            or search_lower in c.get("summary", "").lower()
        ]

    if category:
        filtered = [c for c in filtered if c.get("category") == category]

    if risk:
        filtered = [c for c in filtered if c.get("riskLevel") == risk]

    # 返回时截断长文本，避免响应过大
    result = []
    for c in filtered:
        item = dict(c)
        if "text" in item and len(item["text"]) > 500:
            item["textPreview"] = item["text"][:500] + "..."
            del item["text"]
        result.append(item)

    return JSONResponse(
        {"contracts": result, "total": len(result), "filter": {"search": search, "category": category, "risk": risk}},
        media_type="application/json; charset=utf-8"
    )


@router.get("/contracts/{id}")
async def handle_get_contract(request: Request, id: str) -> JSONResponse:
    """
    根据 ID 获取单个合同详情。
    """
    contracts = safe_json_load(CONTRACTS_DB_PATH, [])
    for c in contracts:
        if c.get("id") == id:
            return JSONResponse(
                c,
                media_type="application/json; charset=utf-8"
            )

    return JSONResponse(
        {"error": "合同未找到"},
        status_code=404,
        media_type="application/json; charset=utf-8"
    )


@router.post("/contracts")
async def handle_save_contract(request: Request, body: SaveContractRequest) -> JSONResponse:
    """
    保存新合同。

    计算风险等级，持久化到 contracts.json，
    若传入 fileIds 则关联文件。
    """
    contracts = safe_json_load(CONTRACTS_DB_PATH, [])

    # 计算风险等级
    risk_result = calculate_risk_score({
        "clauses": body.analysisResult.get("clauses", []) if body.analysisResult else [],
        "originalText": body.text,
        "summary": body.text[:200]
    })

    cat_info = get_contract_category(body.text)

    contract_id = generate_id()
    contract_record = {
        "id": contract_id,
        "title": body.analysisResult.get("title", f"合同-{contract_id[:8]}") if body.analysisResult else f"合同-{contract_id[:8]}",
        "text": body.text,
        "summary": body.text[:300] + "..." if len(body.text) > 300 else body.text,
        "category": cat_info["category"],
        "icon": cat_info["icon"],
        "riskLevel": risk_result["level"],
        "riskScore": risk_result["score"],
        "analysisResult": body.analysisResult,
        "fileIds": body.fileIds or [],
        "createdAt": _now_iso(),
        "updatedAt": _now_iso()
    }

    contracts.append(contract_record)
    safe_json_save(CONTRACTS_DB_PATH, contracts)

    # 关联文件
    if body.fileIds:
        for fid in body.fileIds:
            file_storage.update_file_contract_id(fid, contract_id)

    return JSONResponse(
        {"success": True, "contract": contract_record},
        status_code=201,
        media_type="application/json; charset=utf-8"
    )


@router.put("/contracts/{id}")
async def handle_update_contract(request: Request, id: str, body: UpdateContractRequest) -> JSONResponse:
    """
    更新合同标题、类别或图标。
    """
    contracts = safe_json_load(CONTRACTS_DB_PATH, [])
    idx = -1
    for i, c in enumerate(contracts):
        if c.get("id") == id:
            idx = i
            break

    if idx == -1:
        return JSONResponse(
            {"error": "合同未找到"},
            status_code=404,
            media_type="application/json; charset=utf-8"
        )

    if body.title is not None:
        contracts[idx]["title"] = body.title
    if body.category is not None:
        contracts[idx]["category"] = body.category
    if body.icon is not None:
        contracts[idx]["icon"] = body.icon

    contracts[idx]["updatedAt"] = _now_iso()
    safe_json_save(CONTRACTS_DB_PATH, contracts)

    return JSONResponse(
        {"success": True, "contract": contracts[idx]},
        media_type="application/json; charset=utf-8"
    )


@router.delete("/contracts/{id}")
async def handle_delete_contract(request: Request, id: str) -> JSONResponse:
    """
    删除合同及其关联文件。
    """
    contracts = safe_json_load(CONTRACTS_DB_PATH, [])
    idx = -1
    target = None
    for i, c in enumerate(contracts):
        if c.get("id") == id:
            idx = i
            target = c
            break

    if idx == -1 or target is None:
        return JSONResponse(
            {"error": "合同未找到"},
            status_code=404,
            media_type="application/json; charset=utf-8"
        )

    # 删除关联文件
    file_ids = target.get("fileIds", [])
    if file_ids:
        file_storage.delete_files_by_contract(id)

    contracts.pop(idx)
    safe_json_save(CONTRACTS_DB_PATH, contracts)

    return JSONResponse(
        {"success": True, "deletedContractId": id, "deletedFiles": len(file_ids)},
        media_type="application/json; charset=utf-8"
    )


@router.get("/export")
async def handle_export_contracts(request: Request) -> JSONResponse:
    """
    导出所有合同。

    返回完整合同数据，响应头包含 Content-Disposition attachment。
    """
    contracts = safe_json_load(CONTRACTS_DB_PATH, [])

    response = JSONResponse(
        {"contracts": contracts, "exportedAt": _now_iso(), "total": len(contracts)},
        media_type="application/json; charset=utf-8"
    )
    response.headers["Content-Disposition"] = 'attachment; filename="contracts_export.json"'
    return response
