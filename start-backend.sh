#!/bin/bash
set -e

echo "🚀 啟動後端服務器..."

# 檢查並終止已運行的後端服務
echo "檢查端口 8000..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "終止已存在的後端進程..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 切換到後端目錄並啟動服務
cd backend

echo "使用 uv 啟動後端服務器..."
uv run python -m app.main

echo "後端服務器已啟動在 http://0.0.0.0:8000"
echo "API 文檔: http://0.0.0.0:8000/docs"