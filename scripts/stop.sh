#!/bin/bash
# ============================================
# TinyDo - 停止脚本
# 一键停止：vite dev server + TinyDo Electron 应用
# 用法：npm run stop  或  bash scripts/stop.sh
# ============================================

echo "=== 停止 TinyDo 相关进程 ==="

# 1. 停止 vite dev server（端口 3000）
PIDS=$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "→ 停止 vite dev server (端口 3000): $PIDS"
  kill $PIDS 2>/dev/null
  sleep 1
  REMAIN=$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null)
  if [ -n "$REMAIN" ]; then
    echo "→ 强制结束残留: $REMAIN"
    kill -9 $REMAIN 2>/dev/null
  fi
  echo "✓ vite dev server 已停止"
else
  echo "· vite dev server 未运行"
fi

# 2. 停止 TinyDo Electron 应用
APPS=$(pgrep -f "TinyDo.app/Contents/MacOS/TinyDo" 2>/dev/null)
if [ -n "$APPS" ]; then
  echo "→ 停止 TinyDo 应用: $APPS"
  osascript -e 'quit app "TinyDo"' 2>/dev/null
  sleep 2
  REMAIN=$(pgrep -f "TinyDo.app/Contents/MacOS/TinyDo" 2>/dev/null)
  if [ -n "$REMAIN" ]; then
    echo "→ 强制结束残留进程: $REMAIN"
    kill -9 $REMAIN 2>/dev/null
  fi
  echo "✓ TinyDo 应用已停止"
else
  echo "· TinyDo 应用未运行"
fi

echo "=== 完成 ==="
