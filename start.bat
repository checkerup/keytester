@echo off
cd /d "%~dp0"

echo.
echo  ========================================
echo   KeyTester v1.0.0
echo   LLM API Key Tester with Chat UI
echo  ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found! Install from https://nodejs.org
    pause
    exit /b 1
)

:: Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] npm not found! Install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Install deps if needed
if not exist "node_modules" (
    echo  [SETUP] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo  [SETUP] Done!
    echo.
)

:: Kill any existing processes on ports
echo  [CLEAN] Stopping old processes...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":31337" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5174" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Wait a moment
timeout /t 1 /nobreak >nul 2>&1

:: Start server in background
echo  [START] Starting API server on port 31337...
start "KeyTester-API" /MIN cmd /c "npx tsx server/index.ts > server.log 2>&1"

:: Wait for server
timeout /t 3 /nobreak >nul 2>&1

:: Start Vite client
echo  [START] Starting UI on port 5174...
start "KeyTester-UI" /MIN cmd /c "npx vite --host 127.0.0.1 --port 5174 --strictPort > vite.log 2>&1"

:: Wait for Vite
timeout /t 4 /nobreak >nul 2>&1

:: Open browser
echo  [BROWSER] Opening http://127.0.0.1:5174 ...
start "" "http://127.0.0.1:5174"

echo.
echo  ========================================
echo   KeyTester is running!
echo.
echo   UI:  http://127.0.0.1:5174
echo   API: http://127.0.0.1:31337
echo.
echo   Zen free models: ENABLED (no key needed)
echo   Default model: deepseek-v4-flash-free
echo  ========================================
echo.
echo  Press any key to STOP all services...
pause >nul

:: Cleanup on exit
echo  [STOP] Stopping services...
taskkill /FI "WINDOWTITLE eq KeyTester-API*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq KeyTester-UI*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":31337" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5174" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  [STOP] Done.