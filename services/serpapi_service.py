# -*- coding: utf-8 -*-
"""
SerpAPI 服务模块（对应 Node.js 的 serpapi.js）

提供基于 SerpAPI 的通用网络搜索与法律信息搜索功能。
使用 requests 库进行 HTTP 请求。
"""

import os
from typing import Any, Dict, List, Optional

import requests


SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
SERPAPI_BASE_URL = "https://serpapi.com/search"


def search_web(query: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    通用网络搜索。

    通过 SerpAPI 调用 Google 搜索引擎返回结果列表。

    Args:
        query: 搜索关键词。
        options: 可选参数字典，支持 engine、hl、gl、num 等字段。

    Returns:
        格式化后的搜索结果字典，包含 query、results、totalResults、searchTime。

    Raises:
        RuntimeError: 未配置 SERPAPI_KEY 或请求失败时抛出。
    """
    if not SERPAPI_KEY:
        raise RuntimeError("请先配置 SERPAPI_KEY 环境变量")

    if options is None:
        options = {}

    params = {
        "api_key": SERPAPI_KEY,
        "q": query,
        "engine": options.get("engine", "google"),
        "hl": options.get("hl", "zh-CN"),
        "gl": options.get("gl", "cn"),
        "num": options.get("num", 10),
    }

    try:
        response = requests.get(SERPAPI_BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        return _format_results(data)
    except requests.RequestException as exc:
        raise RuntimeError(f"搜索失败: {exc}") from exc


def _format_results(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    将 SerpAPI 原始响应格式化为统一结构。

    Args:
        data: SerpAPI 返回的 JSON 字典。

    Returns:
        包含 query、results、totalResults、searchTime 的字典。
    """
    organic_results = data.get("organic_results", [])
    results = []
    for index, item in enumerate(organic_results):
        results.append({
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", ""),
            "position": index + 1
        })

    search_parameters = data.get("search_parameters", {})
    search_information = data.get("search_information", {})

    return {
        "query": search_parameters.get("q", ""),
        "results": results,
        "totalResults": search_information.get("total_results", 0),
        "searchTime": search_information.get("time_taken_displayed", 0)
    }


def search_legal_info(legal_query: str) -> Dict[str, Any]:
    """
    法律信息专用搜索。

    固定使用中文区域与语言设置，返回5条结果。

    Args:
        legal_query: 法律相关查询词。

    Returns:
        格式化后的搜索结果字典。
    """
    return search_web(legal_query, {"hl": "zh-CN", "gl": "cn", "num": 5})


def has_api_key() -> bool:
    """
    检查是否已配置 SerpAPI 密钥。

    Returns:
        已配置返回 True，否则返回 False。
    """
    return bool(SERPAPI_KEY)
