#!/bin/bash
set -e

echo "🚀 啟動 SEO Analyzer 前後端服務器..."

# 函數：清理背景進程
cleanup() {
    echo "正在關閉服務器..."
    # 終止後端
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    fi
    # 終止前端
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    fi
    echo "服務器已關閉"
}

# 註冊清理函數
trap cleanup EXIT INT TERM

# 檢查並終止已運行的服務
echo "檢查現有進程..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "終止已存在的後端進程..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "終止已存在的前端進程..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

sleep 2

echo "啟動後端服務器..."
cd backend

echo "檢查並安裝後端依賴..."
uv sync

echo "確保關鍵依賴已安裝..."
uv add aiohttp jinja2 --no-sync 2>/dev/null || true

uv run python -m app.main > ../backend.log 2>&1 &
BACKEND_PID=$!

# 等待後端啟動
sleep 5

echo "啟動前端服務器..."
cd ../frontend

# 確保依賴已安裝
if [ ! -d "node_modules" ]; then
    echo "安裝前端依賴..."
    npm install
fi

npm run dev -- --host 0.0.0.0 > ../frontend.log 2>&1 &
FRONTEND_PID=$!

echo ""
echo "✅ 服務器啟動完成!"
echo "📍 後端服務: http://0.0.0.0:8000"
echo "📍 API 文檔: http://0.0.0.0:8000/docs"
echo "📍 前端服務: http://localhost:3000/"
echo ""
echo "📋 日誌檔案位置:"
echo "  後端日誌: $(pwd)/backend.log"
echo "  前端日誌: $(pwd)/frontend.log"
echo ""
echo "💡 查看日誌命令:"
echo "  tail -f backend.log    # 監控後端日誌"
echo "  tail -f frontend.log   # 監控前端日誌"
echo "  ./show-logs.sh --all   # 查看所有日誌"
echo ""
echo "按 Ctrl+C 關閉所有服務器"

# 等待任一進程結束
wait