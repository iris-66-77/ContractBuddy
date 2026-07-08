# 一纸穿透 - Python 后端启动脚本
$Host.UI.RawUI.WindowTitle = "一纸穿透 - FastAPI"
Write-Host "[启动] 一纸穿透 Python 后端服务" -ForegroundColor Cyan
Write-Host "[信息] 首次启动时 RAG 模型会自动下载/加载，请耐心等待" -ForegroundColor Yellow
Write-Host "[信息] 服务默认运行在 http://localhost:3000" -ForegroundColor Green
Write-Host ""
python app.py
