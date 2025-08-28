#!/bin/bash
set -e

echo "🎨 啟動前端服務器..."

# 檢查並終止已運行的前端服務
echo "檢查端口 3000..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "終止已存在的前端進程..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# 切換到前端目錄並啟動服務
cd frontend

echo "確保依賴已安裝..."
if [ ! -d "node_modules" ]; then
    echo "安裝前端依賴..."
    npm install
fi

echo "啟動前端開發服務器..."
npm run dev -- --host 0.0.0.0

echo "前端服務器已啟動:"
echo "本地: http://localhost:3000/"
echo "網路: 檢查終端輸出獲取網路地址"