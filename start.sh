#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting SDP Product..."

# Backend
cd "$ROOT/backend"
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# kg-gen service (requires: pip install -e ./kg-gen && pip install fastapi "uvicorn[standard]")
cd "$ROOT/backend/kg-gen"
uvicorn service:app --reload --port 8002 &
KGGEN_PID=$!

# Frontend
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend      : http://localhost:8000  (PID $BACKEND_PID)"
echo "kg-gen servis: http://localhost:8002  (PID $KGGEN_PID)"
echo "Frontend     : http://localhost:5173  (PID $FRONTEND_PID)"
echo ""
echo "Durdurmak için Ctrl+C"

# Hepsi kapanınca çık
trap "kill $BACKEND_PID $KGGEN_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
