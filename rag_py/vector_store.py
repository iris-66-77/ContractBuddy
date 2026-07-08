"""
向量存储服务
提供文档的添加、语义检索、关键词检索和混合检索功能
"""

import json
import os
import re
from typing import List, Optional, Dict, Any

from .embedding_service import EmbeddingService


# 向量存储持久化路径
VECTOR_CACHE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'vector_store.json')


class VectorStore:
    """
    向量存储类
    管理文档集合，支持语义搜索、关键词搜索和混合搜索
    """

    def __init__(self, embedding_service: Optional[EmbeddingService] = None):
        """
        :param embedding_service: Embedding服务实例，用于生成和比较向量
        """
        self.documents: List[Dict[str, Any]] = []
        self.indices: Dict[str, List[str]] = {}
        self.embedding_service = embedding_service
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        """从磁盘加载向量存储数据"""
        try:
            if os.path.exists(VECTOR_CACHE_PATH):
                with open(VECTOR_CACHE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.documents = data.get('documents', [])
                    self.indices = data.get('indices', {})
        except Exception:
            self.documents = []
            self.indices = {}

    def _save_to_disk(self) -> None:
        """将向量存储数据持久化到磁盘"""
        try:
            cache_dir = os.path.dirname(VECTOR_CACHE_PATH)
            if not os.path.exists(cache_dir):
                os.makedirs(cache_dir, exist_ok=True)
            with open(VECTOR_CACHE_PATH, 'w', encoding='utf-8') as f:
                json.dump({
                    'documents': self.documents,
                    'indices': self.indices
                }, f, ensure_ascii=False)
        except Exception:
            pass

    def add_document(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        添加文档到存储（不生成向量）
        :param doc: 文档字典，需包含 content 字段，可选 id 和 metadata
        :return: 添加后的文档对象
        """
        document = {
            'id': doc.get('id') or self.generate_id(),
            'content': doc['content'],
            'metadata': doc.get('metadata', {}),
            'embedding': doc.get('embedding') or None,
            'createdAt': self._now_iso()
        }
        self.documents.append(document)

        category = document['metadata'].get('category')
        if category:
            if category not in self.indices:
                self.indices[category] = []
            self.indices[category].append(document['id'])

        return document

    async def add_document_with_embedding(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """
        添加文档并自动生成Embedding向量
        :param doc: 文档字典
        :return: 添加后的文档对象
        """
        document = self.add_document(doc)
        if self.embedding_service and self.embedding_service.ready:
            document['embedding'] = self.embedding_service.embed(doc['content'])
            self._save_to_disk()
        return document

    async def embed_all_documents(self) -> None:
        """
        为所有没有Embedding的文档生成向量
        """
        if not self.embedding_service or not self.embedding_service.ready:
            return

        for doc in self.documents:
            if not doc.get('embedding'):
                doc['embedding'] = self.embedding_service.embed(doc['content'])

        self._save_to_disk()
        print(f'[VectorStore] 已为 {len(self.documents)} 条文档生成向量')

    def semantic_search(self, query_vector: Optional[List[float]], options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        语义检索：基于向量相似度搜索文档
        :param query_vector: 查询向量
        :param options: 可选参数（limit, category, minScore）
        :return: 检索结果字典
        """
        if not query_vector:
            return {'query': '', 'results': [], 'total': 0}
        if options is None:
            options = {}

        limit = options.get('limit', 5)
        category = options.get('category')
        min_score = options.get('minScore', 30)

        scored = []
        for doc in self.documents:
            if category and doc.get('metadata', {}).get('category') != category:
                continue
            if not doc.get('embedding'):
                continue

            sim = self._cosine_similarity(query_vector, doc['embedding']) * 100
            if sim >= min_score:
                scored.append({
                    'id': doc['id'],
                    'content': doc['content'],
                    'metadata': doc['metadata'],
                    'score': round(sim),
                    'source': 'semantic'
                })

        scored.sort(key=lambda x: x['score'], reverse=True)
        return {
            'query': 'semantic',
            'results': scored[:limit],
            'total': len(scored)
        }

    def keyword_search(self, query: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        关键词检索：基于文本匹配评分搜索文档
        精确匹配+100分，分词匹配+20/词，覆盖率+50分
        :param query: 查询关键词
        :param options: 可选参数（limit, category, minScore）
        :return: 检索结果字典
        """
        if options is None:
            options = {}

        limit = options.get('limit', 5)
        category = options.get('category')
        min_score = options.get('minScore', 0)

        results = []
        query_lower = query.lower()

        for doc in self.documents:
            if category and doc.get('metadata', {}).get('category') != category:
                continue

            score = self.calculate_keyword_score(doc['content'], query_lower)
            if score > min_score:
                results.append({
                    'id': doc['id'],
                    'content': doc['content'],
                    'metadata': doc['metadata'],
                    'score': score,
                    'source': 'keyword'
                })

        results.sort(key=lambda x: x['score'], reverse=True)
        return {
            'query': query,
            'results': results[:limit],
            'total': len(results)
        }

    def hybrid_search(self, query: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        纯关键词混合检索（无Embedding时使用）
        :param query: 查询关键词
        :param options: 可选参数
        :return: 检索结果字典
        """
        if options is None:
            options = {}

        keyword_results = self.keyword_search(query, {'limit': 10, 'category': options.get('category')})
        keyword_map = {r['id']: r for r in keyword_results['results']}

        merged = []
        for r in keyword_results['results']:
            merged.append({
                'id': r['id'],
                'content': r['content'],
                'metadata': r['metadata'],
                'score': r['score'],
                'sources': ['keyword'],
                'source': 'keyword'
            })

        merged.sort(key=lambda x: x['score'], reverse=True)
        return {
            'query': query,
            'results': merged[:options.get('limit', 5)],
            'total': len(merged),
            'mode': 'hybrid' if (self.embedding_service and self.embedding_service.ready) else 'keyword'
        }

    async def hybrid_search_with_embedding(self, query: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        语义+关键词加权融合检索（语义权重0.7 + 关键词权重0.3）
        :param query: 查询关键词
        :param options: 可选参数
        :return: 检索结果字典
        """
        if options is None:
            options = {}

        limit = options.get('limit', 5)
        query_vector = None

        if self.embedding_service and self.embedding_service.ready:
            query_vector = self.embedding_service.embed(query)

        sem_results = self.semantic_search(query_vector, {'limit': 10, 'category': options.get('category'), 'minScore': 20})
        kw_results = self.keyword_search(query, {'limit': 10, 'category': options.get('category')})

        sem_map = {r['id']: r for r in sem_results['results']}
        kw_map = {r['id']: r for r in kw_results['results']}

        merged_map = {}
        for r in sem_results['results']:
            kw_score = kw_map[r['id']]['score'] if r['id'] in kw_map else 0
            hybrid_score = round(r['score'] * 0.7 + kw_score * 0.3)
            merged_map[r['id']] = {
                'id': r['id'],
                'content': r['content'],
                'metadata': r['metadata'],
                'score': hybrid_score,
                'sources': ['semantic', 'keyword'] if r['id'] in kw_map else ['semantic'],
                'source': 'hybrid' if r['id'] in kw_map else 'semantic'
            }

        for r in kw_results['results']:
            if r['id'] not in merged_map:
                merged_map[r['id']] = {
                    'id': r['id'],
                    'content': r['content'],
                    'metadata': r['metadata'],
                    'score': r['score'],
                    'sources': ['keyword'],
                    'source': 'keyword'
                }

        merged = list(merged_map.values())
        merged.sort(key=lambda x: x['score'], reverse=True)

        return {
            'query': query,
            'results': merged[:limit],
            'total': len(merged),
            'mode': 'hybrid' if query_vector else 'keyword'
        }

    async def search(self, query: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        自动选择检索模式：
        - 若Embedding服务就绪，使用语义+关键词混合检索
        - 否则使用纯关键词混合检索
        :param query: 查询关键词
        :param options: 可选参数
        :return: 检索结果字典
        """
        if self.embedding_service and self.embedding_service.ready:
            return await self.hybrid_search_with_embedding(query, options)
        return self.hybrid_search(query, options)

    def calculate_keyword_score(self, content: str, query: str) -> int:
        """
        计算关键词匹配得分
        精确匹配+100分，分词匹配+20/词，覆盖率+50分
        :param content: 文档内容
        :param query: 查询关键词（已转小写）
        :return: 得分（0~100）
        """
        score = 0
        content_lower = content.lower()

        # 精确匹配加分
        if query in content_lower:
            score += 100

        # 分词匹配加分
        query_words = re.split(r'\s+', query)
        match_count = 0
        for word in query_words:
            if len(word) > 1 and word in content_lower:
                match_count += 1
                score += 20

        # 覆盖率加分
        if match_count > 0 and query_words:
            score += (match_count / len(query_words)) * 50

        return min(int(score), 100)

    def _cosine_similarity(self, a: Optional[List[float]], b: Optional[List[float]]) -> float:
        """
        计算两个向量之间的余弦相似度
        :param a: 向量A
        :param b: 向量B
        :return: 相似度得分（0~1）
        """
        if not a or not b or len(a) != len(b):
            return 0.0

        dot = 0.0
        for i in range(len(a)):
            dot += a[i] * b[i]

        return max(0.0, min(1.0, dot))

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        根据ID获取文档
        :param doc_id: 文档ID
        :return: 文档字典，未找到返回 None
        """
        for doc in self.documents:
            if doc['id'] == doc_id:
                return doc
        return None

    def get_all_documents(self) -> List[Dict[str, Any]]:
        """
        获取所有文档
        :return: 文档列表
        """
        return self.documents

    def delete_document(self, doc_id: str) -> None:
        """
        根据ID删除文档
        :param doc_id: 文档ID
        """
        idx = -1
        for i, doc in enumerate(self.documents):
            if doc['id'] == doc_id:
                idx = i
                break

        if idx != -1:
            self.documents.pop(idx)
            # 从分类索引中移除
            for cat in list(self.indices.keys()):
                if doc_id in self.indices[cat]:
                    self.indices[cat].remove(doc_id)
            self._save_to_disk()

    def clear(self) -> None:
        """清空所有文档和索引"""
        self.documents = []
        self.indices = {}

    def generate_id(self) -> str:
        """
        生成唯一文档ID
        :return: 文档ID字符串
        """
        import time
        import random
        return f"doc_{int(time.time() * 1000)}_{random.randint(100000000, 999999999)}"

    @staticmethod
    def _now_iso() -> str:
        """获取当前ISO格式时间字符串"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()
