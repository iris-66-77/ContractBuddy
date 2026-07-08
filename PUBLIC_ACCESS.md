# 🚀 公网访问部署指南

## 📱 当前可用的访问方式

### 1️⃣ 局域网访问（已配置）
- **地址**: `http://192.168.0.198:3000`
- **适用**: 同一WiFi下的设备
- **状态**: ✅ 已启动

---

## 🌐 公网访问方案（不同WiFi都能访问）

### 方案一：使用 LocalXpose（推荐，简单免费）

**优点**: 无需注册，国内访问快

**使用步骤**:

1. 打开新终端，运行:
```powershell
# Windows使用方式1
npx localxpose tunnel --port 3000
```

或者下载客户端使用：https://localxpose.io/

---

### 方案二：使用 Serveo.net（最简单）

**优点**: 无需安装，只需SSH

**使用步骤**:

1. 如果你有Git Bash或Windows Subsystem for Linux，运行:
```bash
ssh -R 80:localhost:3000 serveo.net
```

它会给你一个公网地址，类似: `https://abc123.serveo.net`

---

### 方案三：使用 ngrok（标准方案）

**优点**: 稳定，功能强大

**使用步骤**:

1. 访问 https://ngrok.com/download 下载Windows版
2. 解压到任意文件夹
3. 打开命令行进入该文件夹，运行:
```powershell
ngrok http 3000
```
4. 会显示公网地址，类似: `https://xxx.ngrok-free.app`

---

### 方案四：使用 cpolar（国内访问快）

**优点**: 国内节点，速度快

**使用步骤**:

1. 访问 https://www.cpolar.com/ 注册账号
2. 下载Windows客户端安装
3. 运行客户端，配置token（在官网获取）
4. 创建隧道:
```powershell
cpolar http 3000
```

---

## 💡 快速启动方案

我为你准备了一个一键启动脚本，如果你愿意手动操作：

### 方式A：手动使用 ngrok（最简单上手）

1. 访问 https://ngrok.com/download 下载 ngrok
2. 解压到 `F:\ContractBuddy` 文件夹
3. 在文件夹空白处，右键 → 在终端中打开
4. 运行:
```powershell
.\ngrok.exe http 3000
```
5. 复制显示的 `Forwarding` 地址（`https://xxx.ngrok-free.app`）
6. 在任何设备上打开这个地址即可访问！

---

## 📋 推荐方案对比

| 方案 | 难度 | 速度 | 稳定性 | 备注 |
|------|------|------|--------|------|
| LocalXpose | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 推荐国内使用 |
| Serveo | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 需要SSH |
| ngrok | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 国际标准 |
| cpolar | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 国内优化 |

---

## ⚠️ 注意事项

1. **免费版限制**: 免费工具通常有流量或连接数限制
2. **地址变化**: 每次重启工具，公网地址可能会变
3. **服务器需要保持运行**: 本地服务器 `npm start` 必须一直运行
4. **防火墙**: 确保Windows防火墙允许3000端口

---

## 🎯 最简单的临时方案（我推荐）

**立即使用 ngrok**（3步搞定）:

1. 下载: https://ngrok.com/download
2. 解压到项目文件夹
3. 运行: `ngrok http 3000`
4. 复制 `Forwarding` 地址，在任何设备访问！

---

需要我帮你实现特定方案吗？告诉我你想用哪个，我来帮你配置！
