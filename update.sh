#!/bin/bash
set -e

# 增量更新腳本
VM_IP="135.149.56.162"
VM_USER="daniel"
DEPLOY_DIR="/home/daniel/seo-analyzer"
UPDATE_TYPE=""

echo "🔄 SEO Analyzer 增量更新工具"

# 顯示使用說明
show_help() {
    echo "使用方式："
    echo "  $0 [選項]"
    echo ""
    echo "選項："
    echo "  --frontend-only    只更新前端"
    echo "  --backend-only     只更新後端"
    echo "  --config-only      只更新配置檔案"
    echo "  --hot-reload       熱更新（不重啟服務）"
    echo "  --help             顯示此說明"
    echo ""
    echo "範例："
    echo "  $0                    # 完整更新"
    echo "  $0 --frontend-only    # 只更新前端"
    echo "  $0 --backend-only     # 只更新後端"
    echo "  $0 --hot-reload       # 熱更新模式"
}

# 解析命令列參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend-only)
            UPDATE_TYPE="frontend"
            shift
            ;;
        --backend-only)
            UPDATE_TYPE="backend"
            shift
            ;;
        --config-only)
            UPDATE_TYPE="config"
            shift
            ;;
        --hot-reload)
            UPDATE_TYPE="hot"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "❌ 未知參數: $1"
            show_help
            exit 1
            ;;
    esac
done

# 建立時間戳
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
UPDATE_ARCHIVE="update-${TIMESTAMP}.tar.gz"

echo "📋 更新模式: ${UPDATE_TYPE:-完整更新}"

# 測試 SSH 連線
echo "🔐 測試 SSH 連線..."
if ! ssh -o ConnectTimeout=10 "$VM_USER@$VM_IP" "echo '連線測試成功'" 2>/dev/null; then
    echo "❌ SSH 連線失敗"
    exit 1
fi

# 根據更新類型建立不同的壓縮包
create_update_package() {
    case "$UPDATE_TYPE" in
        "frontend")
            echo "📦 建立前端更新包..."
            tar -czf "$UPDATE_ARCHIVE" --exclude-from=.deployignore frontend/ || exit 1
            ;;
        "backend")
            echo "📦 建立後端更新包..."
            tar -czf "$UPDATE_ARCHIVE" --exclude-from=.deployignore backend/ || exit 1
            ;;
        "config")
            echo "📦 建立配置更新包..."
            tar -czf "$UPDATE_ARCHIVE" \
                --exclude-from=.deployignore \
                nginx.conf setup-*.sh start-*.sh *.env.* 2>/dev/null || \
            tar -czf "$UPDATE_ARCHIVE" nginx.conf setup-*.sh start-*.sh 2>/dev/null || exit 1
            ;;
        "hot"|"")
            echo "📦 建立完整更新包..."
            tar -czf "$UPDATE_ARCHIVE" --exclude-from=.deployignore . || exit 1
            ;;
    esac
    
    echo "✅ 更新包建立成功: $(ls -lh $UPDATE_ARCHIVE | awk '{print $5}')"
}

# 執行更新
perform_update() {
    echo "📤 傳輸更新包到 VM..."
    scp "$UPDATE_ARCHIVE" "$VM_USER@$VM_IP:~/"
    
    if [ $? -ne 0 ]; then
        echo "❌ 檔案傳輸失敗"
        rm -f "$UPDATE_ARCHIVE"
        exit 1
    fi
    
    echo "🔄 在 VM 上執行更新..."
    
    # 根據更新類型選擇不同的更新策略
    case "$UPDATE_TYPE" in
        "frontend")
            ssh "$VM_USER@$VM_IP" << EOF
set -e
cd $DEPLOY_DIR
echo "⏹️ 停止前端服務..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "📦 備份前端..."
cp -r frontend frontend.backup.\$\$ 2>/dev/null || true

echo "📂 解壓縮前端更新..."
tar -xzf ~/$UPDATE_ARCHIVE

echo "🔧 重新安裝前端依賴..."
cd frontend && npm install && cd ..

echo "🚀 重啟前端服務..."
nohup npm run dev --prefix frontend -- --host 0.0.0.0 > frontend.log 2>&1 &

sleep 3
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ 前端服務重啟成功"
    rm -rf frontend.backup.\$\$ 2>/dev/null || true
else
    echo "❌ 前端服務重啟失敗，回滾..."
    killall node 2>/dev/null || true
    rm -rf frontend
    mv frontend.backup.\$\$ frontend 2>/dev/null || true
    exit 1
fi

rm -f ~/$UPDATE_ARCHIVE
EOF
            ;;
            
        "backend")
            ssh "$VM_USER@$VM_IP" << EOF
set -e
cd $DEPLOY_DIR
echo "⏹️ 停止後端服務..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "📦 備份後端..."
cp -r backend backend.backup.\$\$ 2>/dev/null || true

echo "📂 解壓縮後端更新..."
tar -xzf ~/$UPDATE_ARCHIVE

echo "🔧 重新安裝後端依賴..."
cd backend && export PATH="\$HOME/.local/bin:\$PATH" && uv sync && cd ..

echo "🚀 重啟後端服務..."
cd backend && nohup uv run python -m app.main > ../backend.log 2>&1 &

sleep 5
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ 後端服務重啟成功"
    rm -rf backend.backup.\$\$ 2>/dev/null || true
else
    echo "❌ 後端服務重啟失敗，回滾..."
    pkill -f "python -m app.main" 2>/dev/null || true
    rm -rf backend
    mv backend.backup.\$\$ backend 2>/dev/null || true
    exit 1
fi

rm -f ~/$UPDATE_ARCHIVE
EOF
            ;;
            
        "config")
            ssh "$VM_USER@$VM_IP" << EOF
set -e
cd $DEPLOY_DIR
echo "📂 解壓縮配置更新..."
tar -xzf ~/$UPDATE_ARCHIVE

echo "🔒 設定執行權限..."
find . -name "*.sh" -exec chmod +x {} \;

echo "✅ 配置檔案更新完成"
echo "ℹ️ 如需套用 Nginx 配置，請執行 ./setup-nginx.sh"

rm -f ~/$UPDATE_ARCHIVE
EOF
            ;;
            
        "hot"|"")
            # 熱更新或完整更新
            if [ "$UPDATE_TYPE" = "hot" ]; then
                echo "🔥 執行熱更新（保持服務運行）..."
            else
                echo "🔄 執行完整更新..."
            fi
            
            ssh "$VM_USER@$VM_IP" << EOF
set -e
cd $DEPLOY_DIR

if [ "$UPDATE_TYPE" != "hot" ]; then
    echo "⏹️ 停止所有服務..."
    if systemctl is-active --quiet seo-analyzer 2>/dev/null; then
        sudo systemctl stop seo-analyzer
    fi
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    fi
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    fi
    sleep 2
fi

echo "📦 建立備份..."
cp -r . ../seo-analyzer-update-backup.\$\$ 2>/dev/null || true

echo "📂 解壓縮更新..."
tar -xzf ~/$UPDATE_ARCHIVE

echo "🔒 設定權限..."
find . -name "*.sh" -exec chmod +x {} \;

if [ "$UPDATE_TYPE" != "hot" ]; then
    echo "🚀 重啟所有服務..."
    ./start-servers.sh &
    
    sleep 10
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 && lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ 服務重啟成功"
        rm -rf ../seo-analyzer-update-backup.\$\$ 2>/dev/null || true
    else
        echo "❌ 服務重啟失敗，回滾..."
        pkill -f start-servers 2>/dev/null || true
        rm -rf ./*
        cp -r ../seo-analyzer-update-backup.\$\$/* . 2>/dev/null || true
        ./start-servers.sh &
        exit 1
    fi
else
    echo "🔥 熱更新完成，服務保持運行"
fi

rm -f ~/$UPDATE_ARCHIVE
EOF
            ;;
    esac
}

# 檢查更新結果
check_services() {
    echo "🔍 檢查服務狀態..."
    
    case "$UPDATE_TYPE" in
        "frontend")
            if ssh "$VM_USER@$VM_IP" "lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1"; then
                echo "✅ 前端服務運行正常"
            else
                echo "❌ 前端服務未運行"
            fi
            ;;
        "backend")
            if ssh "$VM_USER@$VM_IP" "lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1"; then
                echo "✅ 後端服務運行正常"
            else
                echo "❌ 後端服務未運行"
            fi
            ;;
        "config")
            echo "✅ 配置檔案更新完成"
            ;;
        "hot")
            echo "🔥 熱更新完成，服務保持運行"
            ;;
        *)
            # 檢查所有服務
            FRONTEND_OK=0
            BACKEND_OK=0
            
            if ssh "$VM_USER@$VM_IP" "lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1"; then
                echo "✅ 前端服務運行正常"
                FRONTEND_OK=1
            else
                echo "❌ 前端服務未運行"
            fi
            
            if ssh "$VM_USER@$VM_IP" "lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1"; then
                echo "✅ 後端服務運行正常"
                BACKEND_OK=1
            else
                echo "❌ 後端服務未運行"
            fi
            
            if [ $FRONTEND_OK -eq 1 ] && [ $BACKEND_OK -eq 1 ]; then
                echo "🎉 所有服務運行正常！"
            else
                echo "⚠️ 部分服務可能需要手動重啟"
            fi
            ;;
    esac
}

# 執行更新流程
create_update_package
perform_update

if [ $? -eq 0 ]; then
    echo "✅ 更新傳輸完成"
    check_services
else
    echo "❌ 更新失敗"
    rm -f "$UPDATE_ARCHIVE"
    exit 1
fi

# 清理本地檔案
rm -f "$UPDATE_ARCHIVE"

echo ""
echo "🎉 更新完成！"
echo ""
echo "🌐 服務位址："
case "$UPDATE_TYPE" in
    "frontend")
        echo "   前端: http://$VM_IP:3000"
        ;;
    "backend")
        echo "   後端: http://$VM_IP:8000"
        echo "   API 文檔: http://$VM_IP:8000/docs"
        ;;
    "config")
        echo "   配置檔案已更新"
        ;;
    *)
        echo "   前端: http://$VM_IP:3000"
        echo "   後端: http://$VM_IP:8000"
        echo "   API 文檔: http://$VM_IP:8000/docs"
        ;;
esac
echo ""