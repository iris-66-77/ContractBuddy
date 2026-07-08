"""
文件存储服务
提供文件的上传、下载、删除、查询和统计功能
仅实现本地存储模式（local storage）
"""

import base64
import json
import os
import shutil
import uuid
from typing import Dict, Any, List, Optional, Tuple


# 文件数据库路径
FILE_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'files.json')

# 允许的文件类型及对应扩展名和分类
ALLOWED_TYPES: Dict[str, Dict[str, str]] = {
    'image/jpeg': {'ext': '.jpg', 'category': 'image'},
    'image/png': {'ext': '.png', 'category': 'image'},
    'image/gif': {'ext': '.gif', 'category': 'image'},
    'image/webp': {'ext': '.webp', 'category': 'image'},
    'application/pdf': {'ext': '.pdf', 'category': 'document'},
    'application/msword': {'ext': '.doc', 'category': 'document'},
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {'ext': '.docx', 'category': 'document'},
    'text/plain': {'ext': '.txt', 'category': 'document'},
    'application/rtf': {'ext': '.rtf', 'category': 'document'}
}

# 最大文件大小：20MB
MAX_FILE_SIZE = 20 * 1024 * 1024

# 上传目录
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'uploads')

# 本地存储类型标记
_STORAGE_TYPE = 'local'


def init_storage() -> None:
    """初始化存储系统，确保必要目录和文件存在"""
    db_dir = os.path.dirname(FILE_DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    if not os.path.exists(FILE_DB_PATH):
        with open(FILE_DB_PATH, 'w', encoding='utf-8') as f:
            json.dump([], f)
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR, exist_ok=True)


def load_file_db() -> List[Dict[str, Any]]:
    """
    加载文件数据库
    :return: 文件记录列表
    """
    try:
        with open(FILE_DB_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_file_db(db: List[Dict[str, Any]]) -> None:
    """
    原子写入保存文件数据库
    :param db: 文件记录列表
    """
    tmp_path = FILE_DB_PATH + '.tmp'
    try:
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
        # 原子替换
        if os.path.exists(FILE_DB_PATH):
            os.replace(tmp_path, FILE_DB_PATH)
        else:
            os.rename(tmp_path, FILE_DB_PATH)
    except Exception:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
        raise


def validate_file(file_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    验证文件类型和大小
    :param file_info: 文件信息字典，需包含 type, size, name
    :return: 验证结果 {valid: bool, error: str}
    """
    if not file_info.get('type') or file_info['type'] not in ALLOWED_TYPES:
        return {'valid': False, 'error': '不支持的文件类型'}
    if file_info.get('size', 0) > MAX_FILE_SIZE:
        return {'valid': False, 'error': '文件大小超过限制（最大20MB）'}
    if not file_info.get('name') or str(file_info['name']).strip() == '':
        return {'valid': False, 'error': '文件名不能为空'}
    return {'valid': True}


def _strip_data_uri(base64_data: str) -> str:
    """
    去除Base64字符串中的 data:image/... 前缀
    :param base64_data: 可能带前缀的Base64字符串
    :return: 纯Base64数据
    """
    if base64_data.startswith('data:'):
        comma_index = base64_data.find(',')
        if comma_index != -1:
            return base64_data[comma_index + 1:]
    return base64_data


def _validate_magic_bytes(buffer: bytes, mime_type: str) -> bool:
    """
    验证图片文件的魔术字节（Magic Bytes）
    :param buffer: 文件字节数据
    :param mime_type: 声明的MIME类型
    :return: 是否通过校验
    """
    if mime_type == 'image/jpeg':
        return len(buffer) >= 2 and buffer[0] == 0xFF and buffer[1] == 0xD8
    elif mime_type == 'image/png':
        return len(buffer) >= 4 and buffer[0] == 0x89 and buffer[1] == 0x50 and buffer[2] == 0x4E and buffer[3] == 0x47
    elif mime_type == 'image/gif':
        return len(buffer) >= 3 and buffer[0] == 0x47 and buffer[1] == 0x49 and buffer[2] == 0x46
    # webp 等图片类型暂不做魔术字节校验
    return True


def store_file(file_data_base64: str, file_info: Dict[str, Any], contract_id: Optional[str] = None) -> Dict[str, Any]:
    """
    存储文件：解码base64，魔术字节校验，生成UUID，保存到本地目录，记录到files.json
    :param file_data_base64: Base64编码的文件数据（可能带data:image前缀）
    :param file_info: 文件信息字典，需包含 type, size, name
    :param contract_id: 关联的合同ID
    :return: 存储结果 {success: bool, file: dict, error: str}
    """
    init_storage()

    validation = validate_file(file_info)
    if not validation['valid']:
        return {'success': False, 'error': validation['error']}

    file_id = str(uuid.uuid4())
    type_info = ALLOWED_TYPES[file_info['type']]

    # 去除可能的 data URI 前缀
    base64_data = _strip_data_uri(file_data_base64)

    # 解码Base64
    try:
        buffer = base64.b64decode(base64_data)
    except Exception:
        return {'success': False, 'error': 'Base64解码失败'}

    # 空文件校验
    if len(buffer) == 0:
        return {'success': False, 'error': '文件内容为空'}

    # 实际大小校验
    if len(buffer) > MAX_FILE_SIZE:
        return {'success': False, 'error': '文件大小超过限制（最大20MB）'}

    # 用实际解码后的大小覆盖前端传来的大小
    file_info['size'] = len(buffer)

    # 图片类型魔术字节校验
    if file_info['type'].startswith('image/'):
        if not _validate_magic_bytes(buffer, file_info['type']):
            return {'success': False, 'error': '文件内容与声明的类型不匹配'}

    # 保存到本地存储目录
    storage_filename = f"{file_id}{type_info['ext']}"
    storage_path = os.path.join(UPLOAD_DIR, storage_filename)
    try:
        with open(storage_path, 'wb') as f:
            f.write(buffer)
    except Exception as e:
        return {'success': False, 'error': f'文件写入失败: {e}'}

    # 构建文件记录
    file_record = {
        'id': file_id,
        'contractId': contract_id,
        'originalName': file_info['name'],
        'type': file_info['type'],
        'category': type_info['category'],
        'extension': type_info['ext'],
        'size': len(buffer),
        'storagePath': storage_path,
        'storageType': _STORAGE_TYPE,
        'cdnUrl': None,
        'uploadedAt': _now_iso(),
        'accessCount': 0,
        'lastAccessed': None
    }

    db = load_file_db()
    db.append(file_record)
    save_file_db(db)

    return {'success': True, 'file': file_record}


def get_file(file_id: str) -> Optional[Dict[str, Any]]:
    """
    根据文件ID获取文件记录和数据
    :param file_id: 文件ID
    :return: {record: dict, data_bytes: bytes}，未找到返回 None
    """
    db = load_file_db()
    file_record = None
    idx = -1
    for i, f in enumerate(db):
        if f['id'] == file_id:
            file_record = f
            idx = i
            break

    if not file_record:
        return None

    # 更新访问计数
    if idx != -1:
        db[idx]['accessCount'] = db[idx].get('accessCount', 0) + 1
        db[idx]['lastAccessed'] = _now_iso()
        save_file_db(db)

    # 读取本地文件数据
    storage_path = file_record.get('storagePath')
    if not storage_path or not os.path.exists(storage_path):
        return None

    try:
        with open(storage_path, 'rb') as f:
            data = f.read()
    except Exception:
        return None

    return {'record': file_record, 'data_bytes': data}


def get_files_by_contract(contract_id: str) -> List[Dict[str, Any]]:
    """
    根据合同ID获取关联的文件列表
    :param contract_id: 合同ID
    :return: 文件记录列表
    """
    db = load_file_db()
    return [f for f in db if f.get('contractId') == contract_id]


def delete_file(file_id: str) -> Dict[str, Any]:
    """
    删除指定文件（从数据库和本地存储中移除）
    :param file_id: 文件ID
    :return: 删除结果 {success: bool, error: str}
    """
    db = load_file_db()
    idx = -1
    file_record = None
    for i, f in enumerate(db):
        if f['id'] == file_id:
            idx = i
            file_record = f
            break

    if idx == -1:
        return {'success': False, 'error': '文件未找到'}

    # 删除本地文件
    storage_path = file_record.get('storagePath')
    if storage_path and os.path.exists(storage_path):
        try:
            os.remove(storage_path)
        except Exception:
            pass

    db.pop(idx)
    save_file_db(db)
    return {'success': True}


def delete_files_by_contract(contract_id: str) -> Dict[str, Any]:
    """
    删除指定合同关联的所有文件
    :param contract_id: 合同ID
    :return: 删除结果 {success: bool, deleted: int}
    """
    db = load_file_db()
    to_delete = [f for f in db if f.get('contractId') == contract_id]

    for file_record in to_delete:
        storage_path = file_record.get('storagePath')
        if storage_path and os.path.exists(storage_path):
            try:
                os.remove(storage_path)
            except Exception:
                pass

    db = [f for f in db if f.get('contractId') != contract_id]
    save_file_db(db)
    return {'success': True, 'deleted': len(to_delete)}


def get_storage_stats() -> Dict[str, Any]:
    """
    获取存储统计信息
    :return: 统计信息字典 {totalFiles, totalSize, categories, storageTypes}
    """
    db = load_file_db()
    total_size = 0
    categories: Dict[str, int] = {}
    storage_types: Dict[str, int] = {}

    for f in db:
        total_size += f.get('size', 0)
        cat = f.get('category', 'unknown')
        categories[cat] = categories.get(cat, 0) + 1
        st = f.get('storageType', 'local')
        storage_types[st] = storage_types.get(st, 0) + 1

    return {
        'totalFiles': len(db),
        'totalSize': total_size,
        'categories': categories,
        'storageTypes': storage_types
    }


def get_file_url(file_id: str) -> Optional[str]:
    """
    获取文件的访问URL（本地存储模式下返回本地路径）
    :param file_id: 文件ID
    :return: 文件URL或路径，未找到返回 None
    """
    db = load_file_db()
    for f in db:
        if f['id'] == file_id:
            return f.get('cdnUrl') or f.get('storagePath')
    return None


def update_file_contract_id(file_id: str, contract_id: Optional[str]) -> Dict[str, Any]:
    """
    更新文件关联的合同ID
    :param file_id: 文件ID
    :param contract_id: 新的合同ID
    :return: 更新结果 {success: bool, error: str}
    """
    db = load_file_db()
    idx = -1
    for i, f in enumerate(db):
        if f['id'] == file_id:
            idx = i
            break

    if idx == -1:
        return {'success': False, 'error': '文件未找到'}

    db[idx]['contractId'] = contract_id
    save_file_db(db)
    return {'success': True}


def _now_iso() -> str:
    """获取当前ISO格式时间字符串"""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
