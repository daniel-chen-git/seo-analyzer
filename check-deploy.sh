#!/bin/bash
set -e

# 部署狀態檢查腳本
VM_IP="135.149.56.162"
VM_USER="daniel"

echo "📊 檢查 VM 部署狀態..."

# 檢查 SSH 連線
if ! ssh -o ConnectTimeout=5 "$VM_USER@$VM_IP" "echo 'SSH 連線正常'" 2>/dev/null; then
    echo "❌ SSH 連線失敗"
    exit 1
fi

echo "✅ SSH 連線正常"

# 檢查部署狀態檔案
if ssh "$VM_USER@$VM_IP" "[ -f /home/daniel/deploy.status ]" 2>/dev/null; then
    STATUS=$(ssh "$VM_USER@$VM_IP" "cat /home/daniel/deploy.status" 2>/dev/null)
    echo "📋 部署狀態: $STATUS"
    
    case "$STATUS" in
        "COMPLETED")
            echo "✅ 部署已完成"
            ;;
        "FAILED:"*)
            echo "❌ 部署失敗: $STATUS"
            ;;
        "ROLLED_BACK")
            echo "🔄 已回滾到備份版本"
            ;;
        *)
            echo "⏳ 部署進行中: $STATUS"
            ;;
    esac
else
    echo "📋 部署狀態: 尚未開始或狀態檔案不存在"
fi

# 檢查部署日誌
if ssh "$VM_USER@$VM_IP" "[ -f /home/daniel/deploy.log ]" 2>/dev/null; then
    echo ""
    echo "📝 最新部署日誌 (最後 10 行):"
    echo "----------------------------------------"
    ssh "$VM_USER@$VM_IP" "tail -10 /home/daniel/deploy.log" 2>/dev/null
    echo "----------------------------------------"
else
    echo "📝 部署日誌: 不存在"
fi

# 檢查應用程式狀態
echo ""
echo "🔍 檢查應用程式狀態..."

# 檢查目錄
if ssh "$VM_USER@$VM_IP" "[ -d /home/daniel/seo-analyzer ]" 2>/dev/null; then
    echo "📁 應用程式目錄: 存在"
    
    # 檢查關鍵檔案
    KEY_FILES="start-servers.sh backend/requirements.txt frontend/package.json"
    for file in $KEY_FILES; do
        if ssh "$VM_USER@$VM_IP" "[ -f /home/daniel/seo-analyzer/$file ]" 2>/dev/null; then
            echo "✅ $file: 存在"
        else
            echo "❌ $file: 不存在"
        fi
    done
else
    echo "📁 應用程式目錄: 不存在"
fi

# 檢查服務狀態
echo ""
echo "⚙️ 檢查服務狀態..."

# 檢查 systemd 服務
if ssh "$VM_USER@$VM_IP" "systemctl is-active --quiet seo-analyzer" 2>/dev/null; then
    echo "🟢 SEO Analyzer 服務: 運行中"
else
    echo "🔴 SEO Analyzer 服務: 未運行"
fi

# 檢查埠號
echo ""
echo "🔌 檢查埠號狀態..."

# 檢查後端埠號 8000
if ssh "$VM_USER@$VM_IP" "lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1" 2>/dev/null; then
    BACKEND_PID=$(ssh "$VM_USER@$VM_IP" "lsof -Pi :8000 -sTCP:LISTEN -t" 2>/dev/null | head -1)
    echo "🟢 後端服務 (埠號 8000): 運行中 (PID: $BACKEND_PID)"
else
    echo "🔴 後端服務 (埠號 8000): 未運行"
fi

# 檢查前端埠號 3000
if ssh "$VM_USER@$VM_IP" "lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1" 2>/dev/null; then
    FRONTEND_PID=$(ssh "$VM_USER@$VM_IP" "lsof -Pi :3000 -sTCP:LISTEN -t" 2>/dev/null | head -1)
    echo "🟢 前端服務 (埠號 3000): 運行中 (PID: $FRONTEND_PID)"
else
    echo "🔴 前端服務 (埠號 3000): 未運行"
fi

# 檢查 Nginx
if ssh "$VM_USER@$VM_IP" "systemctl is-active --quiet nginx" 2>/dev/null; then
    echo "🟢 Nginx 服務: 運行中"
else
    echo "🔴 Nginx 服務: 未運行"
fi

echo ""
echo "📞 常用命令:"
echo "查看完整日誌: ssh $VM_USER@$VM_IP 'tail -f /home/daniel/deploy.log'"
echo "重新部署: ./deploy.sh"
echo "SSH 到 VM: ssh $VM_USER@$VM_IP"
echo "手動啟動: ssh $VM_USER@$VM_IP 'cd /home/daniel/seo-analyzer && ./start-servers.sh'"