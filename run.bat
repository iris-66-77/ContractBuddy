@echo off
cd /d "C:\Users\denghaoyun\Documents\New project\yizhi-chuantou"
set PORT=3000
echo Starting 一纸穿透 on http://localhost:3000
echo Press Ctrl+C to stop
echo.
node server.js
if errorlevel 1 (
  echo.
  echo Server exited with error. Press any key to exit.
  pause
)