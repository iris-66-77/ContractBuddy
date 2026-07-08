"""
Embedding向量化服务
将文本转换为高维向量，用于语义搜索和相似度计算
"""

import json
import math
import os
from typing import List, Optional, Dict, Any


# 全局缓存路径
CACHE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'embeddings_cache.json')


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """计算两个向量之间的余弦相似度（点积），假设向量已归一化"""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    for i in range(len(a)):
        dot += a[i] * b[i]
    return dot


def _dot_product(a: List[float], b: List[float]) -> float:
    """计算两个向量的点积"""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    for i in range(len(a)):
        dot += a[i] * b[i]
    return dot


def _normalize(vec: List[float]) -> List[float]:
    """对向量进行L2归一化"""
    sum_sq = 0.0
    for v in vec:
        sum_sq += v * v
    length = math.sqrt(sum_sq)
    if length == 0:
        return vec[:]
    return [v / length for v in vec]


class EmbeddingService:
    """
    Embedding向量化服务类
    使用 sentence-transformers 库的 all-MiniLM-L6-v2 模型
    输出维度384，模型输出已归一化
    """

    def __init__(self):
        self.model = None
        self.ready = False
        self.model_name = 'all-MiniLM-L6-v2'
        self.dim = 384
        self._cache: Dict[str, List[float]] = {}
        self._load_cache()

    def _load_cache(self) -> None:
        """从磁盘加载缓存"""
        try:
            if os.path.exists(CACHE_PATH):
                with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # 兼容旧格式：可能是 list 或 dict
                    if isinstance(data, dict):
                        self._cache = data
                    else:
                        self._cache = {}
        except Exception:
            self._cache = {}

    def _save_cache(self) -> None:
        """将缓存持久化到磁盘"""
        try:
            cache_dir = os.path.dirname(CACHE_PATH)
            if not os.path.exists(cache_dir):
                os.makedirs(cache_dir, exist_ok=True)
            with open(CACHE_PATH, 'w', encoding='utf-8') as f:
                json.dump(self._cache, f, ensure_ascii=False)
        except Exception:
            pass

    def init(self) -> None:
        """
        初始化并加载Embedding模型
        加载失败时将 ready 设为 False，降级为关键词检索模式
        """
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
            self.ready = True
            print(f'[Embedding] 模型加载完成 ({self.model_name}, {self.dim}维)')
        except Exception as e:
            print(f'[Embedding] 模型加载失败，将使用关键词检索作为降级: {e}')
            self.ready = False

    def embed(self, text: str) -> Optional[List[float]]:
        """
        对单条文本进行向量化
        :param text: 输入文本
        :return: 归一化后的向量（list[float]），失败返回 None
        """
        if not text:
            return None

        cache_key = text[:200]
        if cache_key in self._cache:
            return self._cache[cache_key]

        if not self.ready or self.model is None:
            return None

        try:
            # SentenceTransformer 默认输出已归一化
            vector = self.model.encode(text, normalize_embeddings=True)
            vec = vector.tolist()
            self._cache[cache_key] = vec
            # 每新增50条缓存自动持久化一次
            if len(self._cache) % 50 == 0:
                self._save_cache()
            return vec
        except Exception as e:
            print(f'[Embedding] 向量化失败: {e}')
            return None

    def embed_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        对多条文本进行批量向量化
        :param texts: 文本列表
        :return: 向量列表，每个元素为 list[float] 或 None
        """
        results = []
        for text in texts:
            results.append(self.embed(text))
        self._save_cache()
        return results

    def similarity(self, a: Optional[List[float]], b: Optional[List[float]]) -> float:
        """
        计算两个向量之间的余弦相似度
        因模型输出已归一化，直接使用点积即可
        :param a: 向量A
        :param b: 向量B
        :return: 相似度得分（0~1）
        """
        if not a or not b or len(a) != len(b):
            return 0.0
        return _cosine_similarity(a, b)

    def search(self, query_vector: Optional[List[float]], documents: List[Any], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        在文档集合中搜索与查询向量最相似的文档
        :param query_vector: 查询向量
        :param documents: 文档列表，每个文档需包含 embedding 字段
        :param top_k: 返回最相似的结果数量
        :return: 带相似度分数的结果列表
        """
        if not query_vector:
            return []
        if not top_k:
            top_k = 5

        scored = []
        for i, doc in enumerate(documents):
            if not hasattr(doc, 'embedding') and not isinstance(doc, dict):
                continue
            embedding = doc.embedding if hasattr(doc, 'embedding') else doc.get('embedding')
            if not embedding:
                continue

            sim = _cosine_similarity(query_vector, embedding)
            if sim > 0.3:
                scored.append({
                    'index': i,
                    'doc': doc,
                    'score': round(sim * 100)
                })

        scored.sort(key=lambda x: x['score'], reverse=True)
        return scored[:top_k]
