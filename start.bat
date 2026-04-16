@echo off
echo Starting SDP Product...

:: Backend
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: kg-gen service (requires: pip install -e backend\kg-gen && pip install fastapi uvicorn)
start "KG-Gen Service" cmd /k "cd /d %~dp0backend\kg-gen && uvicorn service:app --reload --port 8002"

:: Frontend
start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend      : http://localhost:8000
echo KG-Gen Servis: http://localhost:8002
echo Frontend     : http://localhost:5173
echo.
