#!/bin/bash

# VM 日誌查看工具
VM_IP="135.149.56.162"
VM_USER="daniel"

echo "📋 SEO Analyzer 日誌查看工具"

show_help() {
    echo "使用方式："
    echo "  $0 [選項]"
    echo ""
    echo "選項："
    echo "  --deploy        顯示部署日誌"
    echo "  --frontend      顯示前端日誌"
    echo "  --backend       顯示後端日誌"
    echo "  --nginx         顯示 Nginx 日誌"
    echo "  --system        顯示系統服務日誌"
    echo "  --all           顯示所有日誌"
    echo "  --tail          即時監控日誌"
    echo "  --help          顯示此說明"
    echo ""
    echo "範例："
    echo "  $0 --deploy     # 查看部署日誌"
    echo "  $0 --tail       # 即時監控所有日誌"
    echo "  $0 --all        # 顯示所有日誌摘要"
}

# 測試 SSH 連線
test_connection() {
    if ! ssh -o ConnectTimeout=5 "$VM_USER@$VM_IP" "echo 'SSH 連線正常'" 2>/dev/null; then
        echo "❌ SSH 連線失敗"
        exit 1
    fi
}

# 顯示部署日誌
show_deploy_logs() {
    echo "📝 部署日誌 (/home/daniel/deploy.log):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if ssh "$VM_USER@$VM_IP" "[ -f /home/daniel/deploy.log ]" 2>/dev/null; then
        ssh "$VM_USER@$VM_IP" "tail -50 /home/daniel/deploy.log" 2>/dev/null
    else
        echo "部署日誌檔案不存在"
    fi
    echo ""
}

# 顯示前端日誌
show_frontend_logs() {
    echo "🌐 前端日誌："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 檢查多個可能的日誌位置
    for log_path in "/home/daniel/seo-analyzer/frontend.log" "/home/daniel/seo-analyzer/app.log"; do
        if ssh "$VM_USER@$VM_IP" "[ -f $log_path ]" 2>/dev/null; then
            echo "📍 $log_path:"
            ssh "$VM_USER@$VM_IP" "tail -20 $log_path" 2>/dev/null | grep -E "(error|Error|ERROR|warn|Warn|WARN)" || \
            ssh "$VM_USER@$VM_IP" "tail -10 $log_path" 2>/dev/null
            echo ""
        fi
    done
    
    # 檢查 npm 進程日誌
    if ssh "$VM_USER@$VM_IP" "pgrep -f 'npm.*dev'" 2>/dev/null >/dev/null; then
        echo "📍 前端進程狀態: 運行中"
        ssh "$VM_USER@$VM_IP" "ps aux | grep 'npm.*dev' | grep -v grep" 2>/dev/null
    else
        echo "📍 前端進程狀態: 未運行"
    fi
    echo ""
}

# 顯示後端日誌
show_backend_logs() {
    echo "⚙️ 後端日誌："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 檢查多個可能的日誌位置
    for log_path in "/home/daniel/seo-analyzer/backend.log" "/home/daniel/seo-analyzer/app.log"; do
        if ssh "$VM_USER@$VM_IP" "[ -f $log_path ]" 2>/dev/null; then
            echo "📍 $log_path:"
            ssh "$VM_USER@$VM_IP" "tail -20 $log_path" 2>/dev/null | grep -E "(error|Error|ERROR|warn|Warn|WARN|traceback|Traceback)" || \
            ssh "$VM_USER@$VM_IP" "tail -10 $log_path" 2>/dev/null
            echo ""
        fi
    done
    
    # 檢查 Python 進程日誌
    if ssh "$VM_USER@$VM_IP" "pgrep -f 'python.*app.main'" 2>/dev/null >/dev/null; then
        echo "📍 後端進程狀態: 運行中"
        ssh "$VM_USER@$VM_IP" "ps aux | grep 'python.*app.main' | grep -v grep" 2>/dev/null
    else
        echo "📍 後端進程狀態: 未運行"
    fi
    echo ""
}

# 顯示 Nginx 日誌
show_nginx_logs() {
    echo "🌐 Nginx 日誌："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 錯誤日誌
    if ssh "$VM_USER@$VM_IP" "[ -f /var/log/nginx/seo-analyzer-error.log ]" 2>/dev/null; then
        echo "📍 錯誤日誌 (最後 10 行):"
        ssh "$VM_USER@$VM_IP" "sudo tail -10 /var/log/nginx/seo-analyzer-error.log" 2>/dev/null || true
    else
        echo "📍 Nginx 錯誤日誌: 不存在或無權限"
    fi
    
    # 存取日誌
    if ssh "$VM_USER@$VM_IP" "[ -f /var/log/nginx/seo-analyzer-access.log ]" 2>/dev/null; then
        echo "📍 存取日誌 (最後 5 行):"
        ssh "$VM_USER@$VM_IP" "sudo tail -5 /var/log/nginx/seo-analyzer-access.log" 2>/dev/null || true
    else
        echo "📍 Nginx 存取日誌: 不存在或無權限"
    fi
    
    # Nginx 狀態
    if ssh "$VM_USER@$VM_IP" "systemctl is-active --quiet nginx" 2>/dev/null; then
        echo "📍 Nginx 狀態: 運行中"
    else
        echo "📍 Nginx 狀態: 未運行"
    fi
    echo ""
}

# 顯示系統服務日誌
show_system_logs() {
    echo "⚙️ 系統服務日誌："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if ssh "$VM_USER@$VM_IP" "systemctl list-units --type=service | grep -q seo-analyzer" 2>/dev/null; then
        echo "📍 SEO Analyzer 服務日誌:"
        ssh "$VM_USER@$VM_IP" "sudo journalctl -u seo-analyzer --no-pager -n 20" 2>/dev/null || true
    else
        echo "📍 SEO Analyzer systemd 服務未找到"
    fi
    echo ""
}

# 即時監控日誌
tail_logs() {
    echo "👁️ 即時監控日誌 (按 Ctrl+C 退出)..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 建立多個日誌監控
    ssh "$VM_USER@$VM_IP" "
    # 建立日誌監控腳本
    cat << 'SCRIPT' > /tmp/monitor_logs.sh
#!/bin/bash
echo '開始監控日誌...'

# 監控部署日誌
if [ -f /home/daniel/deploy.log ]; then
    echo '[部署日誌]' && tail -f /home/daniel/deploy.log &
fi

# 監控應用程式日誌
if [ -f /home/daniel/seo-analyzer/app.log ]; then
    echo '[應用程式日誌]' && tail -f /home/daniel/seo-analyzer/app.log &
fi

# 監控前端日誌
if [ -f /home/daniel/seo-analyzer/frontend.log ]; then
    echo '[前端日誌]' && tail -f /home/daniel/seo-analyzer/frontend.log &
fi

# 監控後端日誌
if [ -f /home/daniel/seo-analyzer/backend.log ]; then
    echo '[後端日誌]' && tail -f /home/daniel/seo-analyzer/backend.log &
fi

wait
SCRIPT

    chmod +x /tmp/monitor_logs.sh
    /tmp/monitor_logs.sh
    "
}

# 顯示所有日誌摘要
show_all_logs() {
    show_deploy_logs
    show_frontend_logs
    show_backend_logs
    show_nginx_logs
    show_system_logs
    
    echo "💡 常用命令："
    echo "   即時監控: $0 --tail"
    echo "   查看特定日誌: $0 --backend 或 $0 --frontend"
    echo "   SSH 直接查看: ssh $VM_USER@$VM_IP 'tail -f /home/daniel/deploy.log'"
}

# 解析命令列參數
case "${1:-}" in
    --deploy)
        test_connection
        show_deploy_logs
        ;;
    --frontend)
        test_connection
        show_frontend_logs
        ;;
    --backend)
        test_connection
        show_backend_logs
        ;;
    --nginx)
        test_connection
        show_nginx_logs
        ;;
    --system)
        test_connection
        show_system_logs
        ;;
    --all)
        test_connection
        show_all_logs
        ;;
    --tail)
        test_connection
        tail_logs
        ;;
    --help)
        show_help
        ;;
    "")
        test_connection
        show_all_logs
        ;;
    *)
        echo "❌ 未知參數: $1"
        show_help
        exit 1
        ;;
esac