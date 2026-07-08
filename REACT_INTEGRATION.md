# ReAct（Reasoning + Acting）框架集成文档

## 概述

本文档详细说明了如何在「一纸穿透」合同审查项目中集成ReAct（Reasoning and Acting）决策框架，实现思考过程显性化、行动步骤可验证、以及基于反馈的动态优化。

## 目录

1. [框架设计原理](#框架设计原理)
2. [核心模块说明](#核心模块说明)
3. [API接口文档](#api接口文档)
4. [使用指南](#使用指南)
5. [性能优化与评估](#性能优化与评估)
6. [未来扩展方向](#未来扩展方向)

---

## 框架设计原理

### 什么是ReAct？

ReAct是一种将**推理（Reasoning）**与**行动（Acting）**相结合的决策框架，它允许系统：
- 显式记录思考过程，使决策逻辑透明可追溯
- 将复杂任务分解为多个步骤，每步执行后评估结果
- 根据行动反馈动态调整策略，实现持续优化

### 在合同审查中的应用

在合同审查场景中，ReAct框架帮助我们：
1. **结构化推理**：将合同分析过程分解为明确的步骤
2. **可追溯决策**：每一步的思考和行动都有记录
3. **持续改进**：通过反馈机制不断优化分析质量
4. **减少误判**：多轮验证降低误判风险

### 框架架构

```
┌─────────────────────────────────────────────────────────────┐
│                         合同文本输入                          │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │   ReActCore (核心引擎)      │
              │  - 思考记录                 │
              │  - 行动追踪                 │
              │  - 反馈管理                 │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │ ContractAnalyzer (分析器)   │
              │  ┌─────────────────────┐   │
              │  │ 1. 解析合同结构     │   │
              │  │ 2. 模式匹配搜索     │   │
              │  │ 3. 知识库检索       │   │
              │  │ 4. 法律信息搜索     │   │
              │  │ 5. AI深度分析       │   │
              │  │ 6. 上下文验证       │   │
              │  │ 7. 结论优化         │   │
              │  └─────────────────────┘   │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │     结果输出 + 思考链       │
              └─────────────────────────────┘
```

---

## 核心模块说明

### 1. ReActCore（核心引擎）

**文件位置**：`react/ReActCore.js`

**主要功能**：
- 记录思考过程（thinking history）
- 追踪行动执行（action history）
- 管理反馈存储（feedback store）
- 提供性能指标记录

**核心方法**：

```javascript
// 记录思考过程
recordThinking(iteration, thought, context)

// 记录行动执行
recordAction(iteration, action, parameters, result, context)

// 评估行动结果
evaluateAction(actionRecord, outcome)

// 获取完整思考-行动链
getTrace()

// 获取经验教训
getLessonsLearned(limit)
```

**数据结构**：

```javascript
// 思考记录
{
  id: "uuid",
  timestamp: "ISO-8601",
  iteration: 1,
  thought: "思考内容",
  context: {},
  type: "reasoning"
}

// 行动记录
{
  id: "uuid",
  timestamp: "ISO-8601",
  iteration: 1,
  action: "action_name",
  parameters: {},
  result: true/false,
  context: {},
  type: "acting"
}

// 反馈评估
{
  actionId: "uuid",
  timestamp: "ISO-8601",
  success: true/false,
  qualityScore: 0-1,
  feedback: "反馈文本",
  lessonsLearned: ["经验1", "经验2"]
}
```

### 2. ContractAnalyzer（合同分析器）

**文件位置**：`react/ContractAnalyzer.js`

**主要功能**：
- 实现ReAct循环：Reason → Act → Update → Repeat
- 协调多个分析步骤
- 管理分析状态和置信度

**分析步骤**：

| 步骤 | 行动名称 | 描述 | 输出 |
|------|---------|------|------|
| 1 | parse_contract_structure | 解析合同结构，识别类型和主体 | 合同类型、结构信息 |
| 2 | search_patterns | 模式匹配搜索常见风险条款 | 风险模式匹配结果 |
| 3 | search_knowledge_base | 检索RAG知识库获取历史案例 | 相关案例和知识 |
| 4 | search_legal_info | 通过SerpAPI搜索法律条文 | 法律参考信息 |
| 5 | ai_deep_analysis | 基于收集信息的深度分析 | 初步分析结论 |
| 6 | verify_with_context | 结合上下文验证结论 | 验证结果 |
| 7 | refine_conclusions | 优化和完善最终结论 | 最终分析结果 |

**状态管理**：

```javascript
{
  contractText: "合同文本",
  analysisResult: {},
  confidence: 0.85, // 0-1 置信度
  needMoreInfo: false,
  cluesFound: ["线索1", "线索2"]
}
```

### 3. ReActApi（API接口）

**文件位置**：`react/ReActApi.js`

**主要功能**：
- 提供HTTP API接口
- 处理分析请求
- 管理反馈提交
- 提供状态查询

---

## API接口文档

### 1. 使用ReAct框架分析合同

**接口**：`POST /api/react/analyze`

**请求参数**：
```json
{
  "contractText": "合同文本内容..."
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "contractType": "租赁合同",
    "confidence": 0.85,
    "cluesFound": ["租赁合同线索", "押金条款"],
    "analysisSteps": {
      "step_1": {...},
      "step_2": {...}
    },
    "status": "completed"
  },
  "reactTrace": {
    "thinking": [
      {
        "step": 1,
        "iteration": 0,
        "thought": "开始分析合同，首先理解合同结构和类型",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ],
    "acting": [
      {
        "step": 1,
        "iteration": 1,
        "action": "parse_contract_structure",
        "result": "success",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ],
    "summary": {
      "totalIterations": 5,
      "thinkingCount": 6,
      "actionCount": 5
    }
  },
  "performance": {
    "timeMs": 1250,
    "iterations": 5
  }
}
```

### 2. 获取最新思考-行动链

**接口**：`GET /api/react/trace`

**响应**：
```json
{
  "success": true,
  "trace": {
    "thinking": [...],
    "acting": [...],
    "summary": {...}
  }
}
```

### 3. 获取反馈和性能数据

**接口**：`GET /api/react/feedback?limit=20`

**查询参数**：
- `limit`：返回记录数，默认20

**响应**：
```json
{
  "success": true,
  "feedback": [...],
  "metrics": [...],
  "lessonsLearned": [
    "合同类型推断可作为后续分析的重要上下文",
    "模式匹配可以快速识别潜在风险，但需要进一步验证"
  ]
}
```

### 4. 提交反馈

**接口**：`POST /api/react/feedback`

**请求（行动评估）**：
```json
{
  "type": "action_feedback",
  "actionId": "action-uuid",
  "success": true,
  "qualityScore": 0.9,
  "feedback": "这次分析很准确",
  "lessonsLearned": ["多结合上下文可以提高准确率"]
}
```

**请求（策略调整）**：
```json
{
  "type": "strategy_adjustment",
  "reason": "发现误判率较高",
  "previousState": {"sensitivity": "high"},
  "newState": {"sensitivity": "medium"}
}
```

### 5. 获取ReAct框架状态

**接口**：`GET /api/react/status`

**响应**：
```json
{
  "success": true,
  "status": {
    "framework": "ReAct",
    "version": "1.0",
    "feedbackCount": 15,
    "metricCount": 42,
    "lessonsLearned": [...],
    "recentPerformance": {
      "analysisTime": [...]
    }
  }
}
```

### 6. 重置ReAct状态

**接口**：`POST /api/react/reset`

**响应**：
```json
{
  "success": true,
  "message": "ReAct状态已重置"
}
```

---

## 使用指南

### 快速开始

1. **确保服务正在运行**：
   ```bash
   npm start
   ```

2. **检查ReAct框架状态**：
   ```bash
   curl http://localhost:3000/api/react/status
   ```

3. **使用ReAct分析合同**：
   ```bash
   curl -X POST http://localhost:3000/api/react/analyze \
     -H "Content-Type: application/json" \
     -d '{"contractText": "租赁合同文本..."}'
   ```

### 前端集成示例

```javascript
// 使用ReAct框架分析合同
async function analyzeWithReAct(contractText) {
  const response = await fetch('/api/react/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contractText })
  });
  
  const data = await response.json();
  
  // 显示思考链
  displayThinkingChain(data.reactTrace.thinking);
  
  // 显示行动链
  displayActionChain(data.reactTrace.acting);
  
  // 显示分析结果
  displayAnalysisResult(data.data);
  
  // 显示性能指标
  displayPerformance(data.performance);
  
  return data;
}

// 显示思考链
function displayThinkingChain(thinking) {
  thinking.forEach((step, index) => {
    console.log(`[思考 ${step.step}] ${step.thought}`);
  });
}

// 提交反馈
async function submitFeedback(actionId, feedback) {
  await fetch('/api/react/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'action_feedback',
      actionId: actionId,
      success: true,
      qualityScore: 0.9,
      feedback: feedback,
      lessonsLearned: ['用户反馈很有价值']
    })
  });
}
```

---

## 性能优化与评估

### 性能指标

ReAct框架自动记录以下性能指标：

| 指标 | 类型 | 描述 |
|------|------|------|
| analysis_time | 数值 | 分析耗时（毫秒） |
| iterations | 数值 | 执行的迭代步数 |
| confidence | 数值 | 最终置信度（0-1） |

### 质量评估

通过以下方式评估分析质量：

1. **用户反馈评分**：0-1分的质量评分
2. **误判率追踪**：通过 `is_false_positive` 标记追踪误判
3. **经验教训积累**：从每次评估中提取经验教训

### 性能提升预期

相比原有的单步分析，ReAct框架预计带来：

- **分析准确率提升**：15-25%（通过多步验证）
- **误判率降低**：30-40%（通过上下文验证）
- **决策透明度**：100%（思考过程完全可见）
- **持续改进能力**：可通过反馈不断优化

---

## 未来扩展方向

### 1. 自适应策略选择

根据合同类型和复杂度自动选择最优分析策略：
- 简单合同：简化流程，快速返回
- 复杂合同：增加验证步骤，确保准确性

### 2. 强化学习优化

基于历史反馈数据训练策略模型：
- 学习哪些步骤组合最有效
- 自动调整迭代终止条件
- 优化行动执行顺序

### 3. 多模态支持

扩展支持更多合同形式：
- PDF文档直接解析
- 扫描件增强OCR
- 手写合同识别

### 4. 协作审查流程

支持多人协作审查：
- 思考链共享
- 多人反馈汇总
- 集体决策支持

---

## 总结

ReAct框架为「一纸穿透」带来了以下核心价值：

1. **透明性**：思考过程完全可见，决策可追溯
2. **可靠性**：多步验证降低误判风险
3. **进化性**：通过反馈持续优化分析质量
4. **扩展性**：模块化设计便于功能扩展

通过系统性地应用ReAct框架，我们将合同审查从简单的AI判断提升为智能的、可解释的、持续进化的决策系统。
