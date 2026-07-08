# -*- coding: utf-8 -*-
"""
RAG API 路由模块

提供合同增强分析、知识库检索与法律知识管理接口。
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from rag_py.embedding_service import EmbeddingService
from rag_py.enhanced_analyzer import EnhancedAnalyzer
from rag_py.vector_store import VectorStore

router = APIRouter(prefix="/api/rag")

# 全局服务实例（由 init_rag_services 初始化）
_analyzer: Optional[EnhancedAnalyzer] = None
_knowledge_store: Optional[VectorStore] = None
_embedding_service: Optional[EmbeddingService] = None


class AnalyzeRequest(BaseModel):
    """增强分析请求体。"""
    text: str


class SearchRequest(BaseModel):
    """知识库搜索请求体。"""
    query: str
    limit: int = 5
    category: Optional[str] = None


class AddKnowledgeRequest(BaseModel):
    """添加知识请求体。"""
    content: str
    metadata: Optional[Dict[str, Any]] = None


import asyncio

_rag_init_lock = asyncio.Lock()
_rag_initialized = False

async def init_rag_services() -> None:
    """
    异步初始化 RAG 基础设施。

    按顺序初始化 EmbeddingService -> VectorStore -> EnhancedAnalyzer，
    并预加载法律知识库。模型加载在后台线程执行，不阻塞主服务启动。
    线程安全，重复调用不会重复初始化。
    """
    global _analyzer, _knowledge_store, _embedding_service, _rag_initialized

    if _rag_initialized:
        return

    async with _rag_init_lock:
        if _rag_initialized:
            return

        print("[RAG] 正在后台初始化 Embedding 服务...")
        _embedding_service = EmbeddingService()
        # 模型加载是CPU密集型同步操作，放到后台线程避免阻塞事件循环
        await asyncio.to_thread(_embedding_service.init)

        if not _embedding_service.ready:
            print("[RAG] Embedding 服务初始化失败，将降级为纯关键词检索")

        print("[RAG] 正在初始化向量存储...")
        _knowledge_store = VectorStore(embedding_service=_embedding_service)

        print("[RAG] 正在初始化增强分析器...")
        _analyzer = EnhancedAnalyzer(
            vector_store=_knowledge_store,
            embedding_service=_embedding_service
        )
        await _analyzer.initialize_knowledge_base_async()

        _rag_initialized = True
        print("[RAG] 初始化完成")


@router.post("/analyze")
async def handle_enhanced_analysis(request: Request, body: AnalyzeRequest) -> JSONResponse:
    """
    对合同文本进行增强分析。

    接收合同全文，返回模式分析、法律依据与综合评估结果。
    首次调用会自动触发 RAG 懒加载。
    """
    if len(body.text) < 20:
        return JSONResponse(
            {"error": "合同文本过短，至少需要20个字符"},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    await init_rag_services()

    if _analyzer is None:
        return JSONResponse(
            {"error": "RAG 服务初始化失败"},
            status_code=503,
            media_type="application/json; charset=utf-8"
        )

    result = await _analyzer.analyze_contract_enhanced(body.text)
    return JSONResponse(
        result,
        media_type="application/json; charset=utf-8"
    )


@router.post("/search")
async def handle_knowledge_search(request: Request, body: SearchRequest) -> JSONResponse:
    """
    在知识库中进行语义/关键词混合搜索。

    接收查询词与可选过滤条件，返回最相关的知识条目。
    首次调用会自动触发 RAG 懒加载。
    """
    if len(body.query) < 2:
        return JSONResponse(
            {"error": "查询词过短，至少需要2个字符"},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    await init_rag_services()

    if _knowledge_store is None:
        return JSONResponse(
            {"error": "知识库初始化失败"},
            status_code=503,
            media_type="application/json; charset=utf-8"
        )

    options: Dict[str, Any] = {"limit": body.limit}
    if body.category:
        options["category"] = body.category

    result = await _knowledge_store.search(body.query, options)
    return JSONResponse(
        result,
        media_type="application/json; charset=utf-8"
    )


@router.post("/add")
async def handle_add_knowledge(request: Request, body: AddKnowledgeRequest) -> JSONResponse:
    """
    向知识库添加新文档，并自动生成 Embedding。

    接收内容与元数据，返回201创建成功。
    首次调用会自动触发 RAG 懒加载。
    """
    if len(body.content) < 10:
        return JSONResponse(
            {"error": "内容过短，至少需要10个字符"},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    await init_rag_services()

    if _knowledge_store is None:
        return JSONResponse(
            {"error": "知识库初始化失败"},
            status_code=503,
            media_type="application/json; charset=utf-8"
        )

    doc = await _knowledge_store.add_document_with_embedding({
        "content": body.content,
        "metadata": body.metadata or {}
    })

    return JSONResponse(
        {"success": True, "document": doc},
        status_code=201,
        media_type="application/json; charset=utf-8"
    )


@router.get("/status")
async def handle_knowledge_status(request: Request) -> JSONResponse:
    """
    获取知识库状态。

    返回总文档数与文档列表摘要。
    首次调用会自动触发 RAG 懒加载。
    """
    await init_rag_services()

    if _knowledge_store is None:
        return JSONResponse(
            {"error": "知识库初始化失败"},
            status_code=503,
            media_type="application/json; charset=utf-8"
        )

    docs = _knowledge_store.get_all_documents()
    return JSONResponse(
        {
            "totalDocuments": len(docs),
            "documents": [
                {
                    "id": d.get("id"),
                    "contentPreview": d.get("content", "")[:100],
                    "metadata": d.get("metadata", {}),
                    "createdAt": d.get("createdAt")
                }
                for d in docs
            ],
            "embeddingReady": _embedding_service is not None and _embedding_service.ready
        },
        media_type="application/json; charset=utf-8"
    )
