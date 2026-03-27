#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
BACKEND_DIR="$ROOT_DIR/ai-test-platform"
FRONTEND_DIR="$ROOT_DIR/ai-test-platform-web"
RUNNER_DIR="$BACKEND_DIR/python-runner"
LOG_DIR="$ROOT_DIR/.local-run"

mkdir -p "$LOG_DIR"

echo "[1/4] 检查 Python Runner 虚拟环境..."
if [ ! -d "$RUNNER_DIR/.venv" ]; then
  python3 -m venv "$RUNNER_DIR/.venv"
  "$RUNNER_DIR/.venv/bin/pip" install -r "$RUNNER_DIR/requirements.txt"
fi

echo "[2/4] 启动后端..."
nohup bash -lc "cd '$BACKEND_DIR' && npm run start:dev" > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$LOG_DIR/backend.pid"

echo "[3/4] 启动前端..."
nohup bash -lc "cd '$FRONTEND_DIR' && npm run dev -- --host 0.0.0.0" > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$LOG_DIR/frontend.pid"

echo "[4/4] 启动完成"
echo "后端日志: $LOG_DIR/backend.log"
echo "前端日志: $LOG_DIR/frontend.log"
echo "后端地址: http://localhost:3000/api-docs"
echo "前端地址: http://localhost:5173"
