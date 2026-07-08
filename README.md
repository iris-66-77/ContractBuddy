# 一纸穿透 - 合同霸王条款识别工具

一个智能合同分析工具，支持图片OCR识别、合同风险评估、合同记忆库管理等功能。

## 功能特点

- 📷 图片OCR识别（支持PaddleOCR和Tesseract）
- 🤖 AI合同分析（基于DeepSeek API）
- 🔍 智能霸王条款识别
- 📁 文件上传与管理（支持腾讯云COS/阿里云OSS）
- 💾 合同记忆库
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
- 存储配置（腾讯云COS/阿里云OSS/本地存储）

### 3. 启动服务

```bash
npm start
```

访问 http://localhost:3000

## 文件存储配置

### 本地存储（默认）

```env
STORAGE_TYPE=local
```

### 腾讯云COS

```env
STORAGE_TYPE=tencent
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_BUCKET=your_bucket_name
TENCENT_REGION=ap-guangzhou
```

### 阿里云OSS

```env
STORAGE_TYPE=aliyun
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_BUCKET=your_bucket_name
ALIYUN_REGION=oss-cn-hangzhou
```

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
- 存储：本地文件系统 / 腾讯云COS / 阿里云OSS

## 项目结构

```
ContractBuddy/
├── public/              # 前端文件
│   ├── index.html      # 主页
│   ├── app.js          # 前端逻辑
│   └── styles.css      # 样式
├── storage/            # 存储模块
│   ├── baseStorage.js  # 基础存储接口
│   ├── localStorage.js # 本地存储
│   ├── aliyunOSS.js    # 阿里云OSS
│   ├── tencentCOS.js   # 腾讯云COS
│   └── storageManager.js # 存储管理器
├── rag/               # RAG增强模块
├── react/             # ReAct推理模块
├── server.js          # 主服务
├── fileStorage.js     # 文件存储服务
├── riskAssessment.js  # 风险评估模块
└── paddle_ocr_server.py  # PaddleOCR服务
```

## 许可证

MIT License
