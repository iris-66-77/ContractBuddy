# -*- coding: utf-8 -*-
"""
文件 API 路由模块

提供文件上传、下载、删除、统计与文本提取功能。
"""

import base64
import io
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

import services.file_storage as file_storage

router = APIRouter(prefix="/api/files")


class UploadRequest(BaseModel):
    """文件上传请求体。"""
    fileData: str
    fileInfo: Dict[str, Any]
    contractId: Optional[str] = None


class ExtractTextRequest(BaseModel):
    """文本提取请求体。"""
    fileData: str
    fileInfo: Dict[str, Any]


@router.post("/upload")
async def handle_upload(request: Request, body: UploadRequest) -> JSONResponse:
    """
    上传文件。

    接收 Base64 编码的文件数据与文件信息，保存到本地存储。
    """
    result = file_storage.store_file(body.fileData, body.fileInfo, body.contractId)

    if not result.get("success"):
        return JSONResponse(
            {"error": result.get("error", "上传失败")},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    return JSONResponse(
        {"success": True, "file": result["file"]},
        status_code=201,
        media_type="application/json; charset=utf-8"
    )


@router.get("/{id}")
async def handle_get_file(request: Request, id: str) -> Response:
    """
    根据 ID 获取文件二进制数据。

    返回文件内容，Content-Type 从记录中的 type 字段读取。
    """
    file_data = file_storage.get_file(id)

    if file_data is None:
        return JSONResponse(
            {"error": "文件未找到"},
            status_code=404,
            media_type="application/json; charset=utf-8"
        )

    record = file_data["record"]
    data_bytes = file_data["data_bytes"]

    return Response(
        content=data_bytes,
        media_type=record.get("type", "application/octet-stream")
    )


@router.get("/contract/{contract_id}")
async def handle_get_files_by_contract(request: Request, contract_id: str) -> JSONResponse:
    """
    获取与指定合同关联的文件列表。
    """
    files = file_storage.get_files_by_contract(contract_id)
    return JSONResponse(
        {"contractId": contract_id, "files": files, "total": len(files)},
        media_type="application/json; charset=utf-8"
    )


@router.delete("/{id}")
async def handle_delete_file(request: Request, id: str) -> JSONResponse:
    """
    删除指定文件。
    """
    result = file_storage.delete_file(id)

    if not result.get("success"):
        return JSONResponse(
            {"error": result.get("error", "删除失败")},
            status_code=404,
            media_type="application/json; charset=utf-8"
        )

    return JSONResponse(
        {"success": True, "deletedFileId": id},
        media_type="application/json; charset=utf-8"
    )


@router.get("/stats")
async def handle_get_stats(request: Request) -> JSONResponse:
    """
    获取文件存储统计信息。
    """
    stats = file_storage.get_storage_stats()
    return JSONResponse(
        stats,
        media_type="application/json; charset=utf-8"
    )


@router.post("/extract-text")
async def handle_extract_text(request: Request, body: ExtractTextRequest) -> JSONResponse:
    """
    从文件中提取文本。

    支持 docx（python-docx）与 txt 格式，返回截取前50000字符的文本。
    """
    file_info = body.fileInfo
    mime_type = file_info.get("type", "")
    file_name = file_info.get("name", "")

    # 去除可能的 data URI 前缀并解码 Base64
    raw_data = body.fileData
    if raw_data.startswith("data:"):
        comma_index = raw_data.find(",")
        if comma_index != -1:
            raw_data = raw_data[comma_index + 1:]

    try:
        data_bytes = base64.b64decode(raw_data)
    except Exception:
        return JSONResponse(
            {"error": "Base64 解码失败"},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    extracted_text = ""

    # 根据 MIME 类型或扩展名选择提取方式
    if mime_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
    ) or file_name.lower().endswith(".docx"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(data_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            extracted_text = "\n".join(paragraphs)
        except Exception as e:
            return JSONResponse(
                {"error": f"DOCX 解析失败: {e}"},
                status_code=400,
                media_type="application/json; charset=utf-8"
            )

    elif mime_type == "text/plain" or file_name.lower().endswith(".txt"):
        # 尝试多种编码解码
        for encoding in ("utf-8", "gbk", "gb2312", "latin-1"):
            try:
                extracted_text = data_bytes.decode(encoding)
                break
            except Exception:
                continue
        else:
            return JSONResponse(
                {"error": "文本解码失败，无法识别文件编码"},
                status_code=400,
                media_type="application/json; charset=utf-8"
            )
    else:
        return JSONResponse(
            {"error": "不支持的文件类型，目前仅支持 docx 和 txt"},
            status_code=400,
            media_type="application/json; charset=utf-8"
        )

    # 截取前 50000 字符
    truncated = len(extracted_text) > 50000
    text_output = extracted_text[:50000]

    return JSONResponse(
        {
            "text": text_output,
            "length": len(extracted_text),
            "truncated": truncated,
            "fileName": file_name,
            "mimeType": mime_type
        },
        media_type="application/json; charset=utf-8"
    )
