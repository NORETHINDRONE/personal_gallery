@echo off
cd /d "E:\Codex\personal_gallery"

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found in PATH
    pause
    exit /b 1
)

echo [%date% %time%] Starting Gallery + Admin on port 8080...
echo Admin panel at http://localhost:8080/admin
node _server.js 2>&1
echo [%date% %time%] Server stopped (exit code: %ERRORLEVEL%)
pause
