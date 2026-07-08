@echo off
chcp 65001 >nul
echo ====================================
echo  一纸穿透 - 公网访问一键设置
echo ====================================
echo.

REM 检查ngrok是否存在
if exist ngrok.exe (
    echo [1/2] 检测到 ngrok.exe，正在启动...
    echo.
    echo 请等待几秒，ngrok正在建立连接...
    echo.
    ngrok http 3000
) else (
    echo [提示] 未找到 ngrok.exe
    echo.
    echo ====================================
    echo  请按以下步骤操作：
    echo ====================================
    echo.
    echo 1. 访问 https://ngrok.com/download
    echo 2. 下载 Windows 版本的 ngrok
    echo 3. 将 ngrok.exe 解压到当前文件夹 (%~dp0)
    echo 4. 重新运行此脚本
    echo.
    echo 或者：
    echo 手动打开 https://ngrok.com/download 下载后
    echo 在当前文件夹运行: ngrok http 3000
    echo.
    pause
)
