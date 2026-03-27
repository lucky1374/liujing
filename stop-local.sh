#!/usr/bin/env bash

set +e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/.local-run"

if [ -f "$LOG_DIR/backend.pid" ]; then
  kill "$(cat "$LOG_DIR/backend.pid")" 2>/dev/null
  rm -f "$LOG_DIR/backend.pid"
  echo "已停止后端"
fi

if [ -f "$LOG_DIR/frontend.pid" ]; then
  kill "$(cat "$LOG_DIR/frontend.pid")" 2>/dev/null
  rm -f "$LOG_DIR/frontend.pid"
  echo "已停止前端"
fi

echo "本地服务停止完成"
