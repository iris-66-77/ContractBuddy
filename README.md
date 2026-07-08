# 智能合同分析工具

一个智能合同分析工具，支持图片OCR识别、合同风险评估、合同记忆库管理等功能。

## 功能特点

- 📲 图片OCR识别（支持PaddleOCR和Tesseract）
- 🤖 AI合同分析（基于DeepSeek API）
- ⚡ 智能霸王条款识别
- 📧 文件上传与管理（支持本地存储）
- 🗄 合同记忆库
- 🌐 支持局域网/公网访问

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置：
- DeepSeek API密钥
- SerpAPI密钥（可选）
- 存储配置（默认本地存储）

### 3. 启动服务

```bash
npm start
```

访问 http://localhost:3000

## 公网访问

详细说明见 [PUBLIC_ACCESS.md](PUBLIC_ACCESS.md)

### 使用ngrok

```bash
# 下载ngrok
# 运行
ngrok http 3000
```

### 使用localxpose

```bash
npx localxpose tunnel --port 3000
```

## 技术栈

- 前端：HTML5 + CSS3 + JavaScript
- 后端：Node.js + Express
- OCR：PaddleOCR / Tesseract.js
- AI分析：DeepSeek API
- 存储：本地文件系统

## 项目结构

```
ContractBuddy/
├── public/              # 前端文件
│   ├── index.html       # 主页
│   ├── app.js           # 前端逻辑
│   └── styles.css       # 样式
├── storage/             # 存储模块
│   ├── baseStorage.js   # 基础存储接口
│   ├── localStorage.js  # 本地存储
│   ├── index.js         # 存储索引
│   └── storageManager.js # 存储管理器
├── rag/                 # RAG增强模块
├── react/               # ReAct推理模块
├── rag_py/              # Python RAG模块
├── api/                 # API接口
├── services/            # 服务层
├── utils/               # 工具函数
├── data/                # 数据目录
├── server.js            # 主服务
├── fileStorage.js       # 文件存储服务
├── riskAssessment.js    # 风险评估模块
└── paddle_ocr_server.py # PaddleOCR服务
```

## 许可协议
MIT License
