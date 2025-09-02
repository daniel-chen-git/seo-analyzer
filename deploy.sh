#!/bin/bash
set -e

# 設定變數
VM_IP="135.149.56.162"
VM_USER="daniel"
DEPLOY_DIR="/home/daniel/seo-analyzer"
BACKUP_DIR="/home/daniel/seo-analyzer-backup"
ARCHIVE_NAME="seo-analyzer-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "🚀 開始部署 SEO Analyzer 到 Azure VM..."

# 檢查必要檔案
echo "📋 檢查必要檔案..."
if [ ! -f ".deployignore" ]; then
    echo "❌ 找不到 .deployignore 檔案"
    exit 1
fi

if [ ! -f "start-servers.sh" ]; then
    echo "❌ 找不到 start-servers.sh 檔案"
    exit 1
fi

# 建立壓縮檔
echo "📦 建立部署壓縮檔..."
tar -czf "$ARCHIVE_NAME" --exclude-from=.deployignore .

if [ $? -ne 0 ]; then
    echo "❌ 建立壓縮檔失敗"
    exit 1
fi

echo "✅ 壓縮檔建立成功: $ARCHIVE_NAME"
echo "📊 壓縮檔大小: $(ls -lh $ARCHIVE_NAME | awk '{print $5}')"

# 測試 SSH 連線
echo "🔐 測試 SSH 連線..."
ssh -o ConnectTimeout=10 "$VM_USER@$VM_IP" "echo '連線測試成功'" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ SSH 連線失敗，請檢查："
    echo "  1. VM IP 是否正確: $VM_IP"
    echo "  2. SSH 金鑰是否已設定"
    echo "  3. VM 是否正在運行"
    rm -f "$ARCHIVE_NAME"
    exit 1
fi

# 傳輸檔案到 VM
echo "📤 傳輸檔案到 VM..."
scp "$ARCHIVE_NAME" "$VM_USER@$VM_IP:~/"

if [ $? -ne 0 ]; then
    echo "❌ 檔案傳輸失敗"
    rm -f "$ARCHIVE_NAME"
    exit 1
fi

echo "✅ 檔案傳輸完成"

# 啟動 VM 端背景部署
echo "🔄 啟動 VM 端背景部署..."

# 建立部署狀態檢查函數
check_deploy_status() {
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "📡 檢查部署狀態 (嘗試 $attempt/$max_attempts)..."
        
        # 檢查部署狀態
        if ssh -o ConnectTimeout=10 "$VM_USER@$VM_IP" "[ -f /home/daniel/deploy.status ]" 2>/dev/null; then
            local status=$(ssh -o ConnectTimeout=10 "$VM_USER@$VM_IP" "cat /home/daniel/deploy.status" 2>/dev/null)
            echo "📊 當前狀態: $status"
            
            case "$status" in
                "COMPLETED")
                    echo "✅ 部署成功完成！"
                    return 0
                    ;;
                "FAILED:"*)
                    echo "❌ 部署失敗: $status"
                    return 1
                    ;;
                "ROLLED_BACK")
                    echo "🔄 已回滾到備份版本"
                    return 1
                    ;;
                *)
                    echo "⏳ 部署進行中: $status"
                    ;;
            esac
        else
            echo "📊 部署狀態檔案尚未建立..."
        fi
        
        sleep 10
        ((attempt++))
    done
    
    echo "⏰ 部署狀態檢查逾時，請手動確認"
    return 2
}

# 在 VM 上啟動背景部署
ssh -o ConnectTimeout=10 "$VM_USER@$VM_IP" "nohup ./vm-deploy.sh $ARCHIVE_NAME > /dev/null 2>&1 &" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ 無法啟動 VM 端部署"
    rm -f "$ARCHIVE_NAME"
    exit 1
fi

echo "✅ VM 端部署已在背景啟動"
echo "📊 開始監控部署狀態..."

# 檢查部署狀態
check_deploy_status
deploy_result=$?

case $deploy_result in
    0)
        echo "🎉 部署成功！"
        ;;
    1)
        echo "💥 部署失敗，請檢查日誌"
        rm -f "$ARCHIVE_NAME"
        exit 1
        ;;
    2)
        echo "⚠️ 部署狀態檢查逾時"
        echo "請手動檢查部署狀態："
        echo "   ssh $VM_USER@$VM_IP"
        echo "   cat /home/daniel/deploy.status"
        echo "   tail -f /home/daniel/deploy.log"
        ;;
esac

# 清理本地壓縮檔
rm -f "$ARCHIVE_NAME"

echo ""
echo "🎉 部署完成！"
echo ""
echo "📝 下一步操作："
echo "1. SSH 到 VM: ssh $VM_USER@$VM_IP"
echo "2. 進入目錄: cd $DEPLOY_DIR"
echo "3. 執行環境設定: ./setup-vm.sh"
echo "4. 啟動服務: ./start-servers.sh"
echo ""
echo "🌐 服務位址:"
echo "   前端: http://$VM_IP:3000"
echo "   後端: http://$VM_IP:8000"
echo "   API 文檔: http://$VM_IP:8000/docs"
echo ""