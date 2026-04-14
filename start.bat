@echo off
echo Starting SDP Product...

:: Backend
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: Frontend
start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend : http://localhost:8000
echo Frontend: http://localhost:5173
echo.
