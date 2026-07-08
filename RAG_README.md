
# 一纸穿透 - RAG知识库系统

## 概述

本项目已实现了一套完整的**RAG（检索增强生成）知识库系统**，用于增强合同霸王条款的识别和分析能力。

---

## 文件结构

```
ContractBuddy/
├── rag/
│   ├── vectorStore.js       # 向量存储模块（关键词检索）
│   ├── patternLibrary.js    # 霸王条款模式库
│   ├── enhancedAnalysis.js  # 增强分析服务
│   └── ragApi.js            # RAG API 接口
├── RAG_DESIGN.md            # RAG系统设计文档
└── RAG_README.md            # 本文件
```

---

## 核心功能

### 1. 霸王条款模式库

内置了**7大类共16种**常见霸王条款的识别模式：

| 类别 | 模式数量 | 典型场景 |
|------|---------|---------|
| 免责条款 | 3 | 完全免责、安全事故免责等 |
| 违约金过高 | 2 | 高额违约金、倍数赔偿 |
| 最终解释权 | 1 | 单方保留解释权 |
| 单方解除权 | 3 | 随时解除、逾期解除、处置财产 |
| 押金不退 | 2 | 不退还押金、短期不退押金 |
| 权利限制 | 3 | 不得转租、不得解约、不得诉讼 |
| 格式条款 | 1 | 未合理提示 |

### 2. 增强合同分析

`/api/rag/analyze` 接口提供：
- **模式匹配分析** - 快速发现霸王条款
- **法律依据检索** - 自动查找相关法条
- **智能风险评估** - 综合判断风险等级
- **个性化建议** - 针对性的协商建议

### 3. 知识库管理

| 接口 | 功能 |
|------|------|
| `/api/rag/search` | 搜索知识库内容 |
| `/api/rag/add` | 添加知识文档 |
| `/api/rag/status` | 查看知识库状态 |

---

## 数据结构

### 知识库文档
```javascript
{
  id: "doc_xxx",
  content: "文档内容",
  metadata: {
    type: "clause|law|case",
    category: "合同类别",
    riskLevel: "low|medium|high|critical",
    source: "来源信息"
  },
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### 增强分析结果
```javascript
{
  patternAnalysis: {
    totalClauses: 10,
    riskyClauses: 3,
    details: [ /* 风险条款详情 */ ],
    summary: "分析摘要"
  },
  legalReferences: [ /* 相关法律依据 */ ],
  integratedAnalysis: {
    overallRisk: "high",
    riskScore: 85,
    suggestions: [ /* 建议列表 */ ]
  }
}
```

---

## 使用示例

### 调用增强分析API
```bash
curl -X POST http://localhost:3000/api/rag/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "合同文本内容"}'
```

### 搜索知识库
```bash
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "押金不退", "limit": 3}'
```

### 添加知识
```bash
curl -X POST http://localhost:3000/api/rag/add \
  -H "Content-Type: application/json" \
  -d '{
    "content": "知识内容",
    "metadata": {
      "type": "law",
      "category": "民法典",
      "riskLevel": "high"
    }
  }'
```

---

## 技术特点

### 当前实现
- ✅ **关键词检索** - 简单高效的匹配方式
- ✅ **模式匹配库** - 16种霸王条款识别模式
- ✅ **本地知识库** - 内置6条基础法律知识
- ✅ **增强分析** - 多维度合同分析

### 未来扩展方向
- 🔄 **真实向量检索** - 集成 embedding 模型
- 🔄 **持久化存储** - 向量数据库集成（ChromaDB等）
- 🔄 **持续学习** - 自动从历史案例中学习
- 🔄 **多模态支持** - PDF、图片直接解析

---

## 风险等级说明

| 等级 | 分值范围 | 含义 | 建议 |
|------|---------|------|------|
| 低级 | 0-30 | 相对公平 | 可以签署 |
| 中级 | 31-60 | 有一定风险 | 建议协商修改 |
| 高级 | 61-85 | 风险较高 | 需重点协商修改 |
| 严重 | 86-100 | 极其不利 | 建议不要签署或修改后再签 |

---

## 与原系统的对比

| 特性 | 原系统 | RAG增强系统 |
|------|--------|------------|
| 条款识别 | 仅依赖LLM | LLM + 模式库双重检查 |
| 法律依据 | LLM生成 | LLM + 知识库检索 |
| 风险评估 | LLM单次判断 | 多因素综合评估 |
| 案例参考 | 无 | 未来可支持 |

---

## 启动说明

1. 确保已安装 Node.js (v16+)
2. 在项目根目录运行：
```bash
npm start
```
3. 服务器启动成功后，看到提示：
```
一纸穿透 已启动
http://localhost:3000
提示：OCR使用浏览器端识别（Tesseract.js）；分析使用真实API（deepseek-chat）；RAG增强功能已启用
```

---

## 注意事项

1. 当前向量检索使用**关键词匹配**（轻量级方案）
2. 知识库为**内存存储**，重启后会重置
3. 生产环境建议使用真实的向量数据库
4. 模式库可根据需求不断扩展和优化

---

## 扩展建议

### 短期
- 完善法律条文库（加入更多真实法条）
- 增加更多霸王条款模式
- 添加知识库持久化（JSON文件存储）

### 中期
- 集成 text-embedding 模型
- 引入 ChromaDB 或 Milvus 向量数据库
- 实现合同相似度推荐

### 长期
- 建立完整的合同案例库
- 实现用户自定义模式上传
- 训练专属的合同分析模型
