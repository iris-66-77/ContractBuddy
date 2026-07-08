@echo off
cd /d "%~dp0"
echo [启动] 一纸穿透 Python 后端服务
echo [信息] 首次启动时 RAG 模型会自动下载/加载，请耐心等待
echo [信息] 服务默认运行在 http://localhost:3000
echo.
python app.py
pause
