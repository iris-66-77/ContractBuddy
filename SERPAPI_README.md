
# 一纸穿透 - SerpAPI 使用说明

## 📋 概述

已成功为项目添加 SerpAPI 网页搜索功能！可用于合同分析时搜索最新法律信息。

## 🚀 快速开始

### 1️⃣ 获取 API Key

1. 访问 [https://serpapi.com](https://serpapi.com)
2. 注册账号
3. 在 Dashboard 中复制您的 API Key

### 2️⃣ 配置 API Key

打开项目根目录下的 [`.env`](file:///f:/ContractBuddy/.env) 文件，添加：

```env
SERPAPI_KEY=你的serpapi_key
```

### 3️⃣ 重启服务器

```bash
npm start
```

看到以下提示表示成功：
```
提示：...；SerpAPI网页搜索已启用
```

## 📡 API 接口

### 1. 普通网页搜索
```
POST /api/web/search
Content-Type: application/json

{
  "query": "民法典 违约金规定",
  "options": {
    "num": 10,
    "hl": "zh-CN",
    "gl": "cn"
  }
}
```

**响应示例：**
```json
{
  "query": "民法典 违约金规定",
  "results": [
    {
      "title": "《民法典》关于违约金的规定",
      "link": "https://example.com/...",
      "snippet": "根据《民法典》第五百八十五条规定...",
      "position": 1
    }
  ],
  "totalResults": 123456,
  "searchTime": 0.34
}
```

### 2. 法律信息搜索
```
POST /api/web/search/legal
Content-Type: application/json

{
  "query": "租赁合同 押金不退"
}
```

## 💻 使用示例

### JavaScript Fetch
```javascript
// 搜索法律信息
fetch('http://localhost:3000/api/web/search/legal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '劳动合同 试用期规定'
  })
})
.then(r => r.json())
.then(data => console.log(data));
```

### curl
```bash
curl -X POST http://localhost:3000/api/web/search \
  -H "Content-Type: application/json" \
  -d '{"query": "民法典 合同解除"}'
```

## 🔧 配置选项

| 参数 | 说明 | 默认值 |
|------|------|---------|
| `engine` | 搜索引擎 | `google` |
| `hl` | 语言 | `zh-CN` |
| `gl` | 国家/地区 | `cn` |
| `num` | 返回结果数 | `10` |

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| [`serpapi.js`](file:///f:/ContractBuddy/serpapi.js) | SerpAPI 工具模块 |
| [`.env`](file:///f:/ContractBuddy/.env) | 环境变量配置 |
| [`server.js`](file:///f:/ContractBuddy/server.js) | 已集成 SerpAPI 路由 |

## 💰 费用说明

- SerpAPI 提供免费额度（通常每月 ~100 次搜索）
- 超出免费额度后按次收费
- 具体价格请查看 [https://serpapi.com/pricing](https://serpapi.com/pricing)

## ⚠️ 注意事项

1. **保护 API Key**：不要将 `.env` 文件提交到公开仓库
2. **合理使用**：注意免费额度限制，避免超用
3. **搜索优化**：使用更精确的关键词可获得更好的结果

## 🔄 下一步

如需将网页搜索与合同分析功能深度集成，请告诉我！
