@echo off
TITLE Launch Hostel Outpass Management System
echo ======================================================================
echo   HOSTEL OUTPASS MANAGEMENT DASHBOARD - MCA MAJOR PROJECT
echo ======================================================================
echo.
echo Launching Backend (Node.js + MongoDB on port 5000)...
start "Hostel Outpass - Backend (Port 5000)" cmd.exe /k "cd /d %~dp0backend && npm.cmd start"

echo Waiting for backend database and API to become ready...
set "BACKEND_READY="
for /l %%i in (1,1,60) do (
  curl.exe -sS --max-time 2 http://localhost:5000/api/health >nul 2>&1
  if not errorlevel 1 (
    set "BACKEND_READY=1"
    goto :backend_ready
  )
  timeout /t 1 /nobreak >nul
)

:backend_ready
if not defined BACKEND_READY (
  echo WARNING: Backend did not become ready within 60 seconds.
  echo The frontend will still start, but API requests may fail until backend is ready.
) else (
  echo Backend API is ready.
)

echo Launching Frontend (Vite + React on port 3000)...
start "Hostel Outpass - Frontend (Port 3000)" cmd.exe /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo ======================================================================
echo Both Backend and Frontend processes launched in separate windows!
echo - Backend API:     http://localhost:5000/api/health
echo - Frontend Web:    http://localhost:3000
echo ======================================================================
echo.
pause
