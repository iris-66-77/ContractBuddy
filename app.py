# -*- coding: utf-8 -*-
"""
一纸穿透 - FastAPI 主入口

整合 RAG、ReAct、合同记忆、文件管理与主分析模块，
提供统一的 RESTful API 服务。
"""

import logging
import os
import sys
import time
from datetime import datetime, timezone

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 加载环境变量
load_dotenv()

# 配置根日志
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("contractbuddy")

# 创建 FastAPI 应用
app = FastAPI(title="一纸穿透")

# CORS 中间件：允许所有来源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 自定义访问日志中间件，格式：[ISO时间] METHOD /path
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    记录每个 HTTP 请求的访问日志。
    """
    start = time.time()
    method = request.method
    path = request.url.path

    response = await call_next(request)

    duration = (time.time() - start) * 1000
    timestamp = datetime.now(timezone.utc).isoformat()
    logger.info(f"[{timestamp}] {method} {path} - {response.status_code} ({duration:.2f}ms)")

    return response


# 导入并注册 API 路由
from api import analyze, contract_api, file_api, rag_api, react_api

app.include_router(analyze.router)
app.include_router(rag_api.router)
app.include_router(react_api.router)
app.include_router(contract_api.router)
app.include_router(file_api.router)

# 挂载静态文件目录
public_dir = os.path.join(os.path.dirname(__file__), "public")
if os.path.exists(public_dir):
    app.mount("/", StaticFiles(directory=public_dir, html=True), name="public")


@app.on_event("startup")
async def on_startup() -> None:
    """
    应用启动事件处理。

    初始化文件存储系统。RAG 模型采用懒加载策略，
    首次调用 RAG 相关接口时自动初始化，避免阻塞服务启动。
    """
    logger.info("[Startup] 正在初始化服务...")

    # 初始化文件存储
    import services.file_storage as file_storage
    file_storage.init_storage()
    logger.info("[Startup] 文件存储初始化完成")

    logger.info("[Startup] 核心服务已就绪（RAG 模型将在首次请求时加载）")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """
    应用关闭事件处理。
    """
    logger.info("[Shutdown] 应用正在关闭...")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
