#!/bin/bash
set -e

# VM 端獨立部署腳本
# 此腳本在 VM 上背景執行，不依賴 SSH 連線

DEPLOY_DIR="/home/daniel/seo-analyzer"
BACKUP_DIR="/home/daniel/seo-analyzer-backup"
LOG_FILE="/home/daniel/deploy.log"
STATUS_FILE="/home/daniel/deploy.status"

# 日誌函數
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 更新部署狀態
update_status() {
    echo "$1" > "$STATUS_FILE"
    log "狀態更新: $1"
}

# 錯誤處理
handle_error() {
    local exit_code=$?
    log "❌ 部署失敗於步驟: $1 (退出碼: $exit_code)"
    update_status "FAILED:$1"
    
    # 嘗試回滾
    if [ -d "$BACKUP_DIR" ]; then
        log "🔄 嘗試回滾到備份版本..."
        sudo rm -rf "$DEPLOY_DIR" 2>/dev/null || true
        sudo mv "$BACKUP_DIR" "$DEPLOY_DIR" 2>/dev/null || true
        log "✅ 已回滾到備份版本"
        update_status "ROLLED_BACK"
    fi
    exit $exit_code
}

# 設置錯誤陷阱
trap 'handle_error "UNEXPECTED_ERROR"' ERR

log "🚀 開始 VM 端部署..."
update_status "STARTING"

# 檢查必要參數
if [ -z "$1" ]; then
    log "❌ 缺少壓縮檔案名稱參數"
    update_status "FAILED:MISSING_ARCHIVE"
    exit 1
fi

ARCHIVE_NAME="$1"

if [ ! -f "$HOME/$ARCHIVE_NAME" ]; then
    log "❌ 找不到壓縮檔: $HOME/$ARCHIVE_NAME"
    update_status "FAILED:ARCHIVE_NOT_FOUND"
    exit 1
fi

# 停止現有服務
log "⏹️ 停止現有服務..."
update_status "STOPPING_SERVICES"

# 使用 systemd 停止服務（如果存在）
if systemctl is-active --quiet seo-analyzer 2>/dev/null; then
    sudo systemctl stop seo-analyzer || true
    log "✅ 已停止 systemd 服務"
fi

# 強制終止埠號上的進程
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log "終止後端進程 (埠號 8000)..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log "終止前端進程 (埠號 3000)..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

sleep 2

# 備份現有部署
log "📦 備份現有部署..."
update_status "BACKING_UP"

if [ -d "$DEPLOY_DIR" ]; then
    sudo rm -rf "$BACKUP_DIR" 2>/dev/null || true
    sudo mv "$DEPLOY_DIR" "$BACKUP_DIR" 2>/dev/null || true
    log "✅ 現有部署已備份到: $BACKUP_DIR"
else
    log "ℹ️ 沒有現有部署需要備份"
fi

# 建立部署目錄
log "📁 建立部署目錄..."
update_status "CREATING_DIRECTORY"

sudo mkdir -p "$DEPLOY_DIR"
sudo chown $USER:$USER "$DEPLOY_DIR"

# 解壓縮應用程式
log "📂 解壓縮應用程式..."
update_status "EXTRACTING"

cd "$DEPLOY_DIR"
tar -xzf "$HOME/$ARCHIVE_NAME" --strip-components=0

if [ $? -ne 0 ]; then
    handle_error "EXTRACTION_FAILED"
fi

# 設定檔案權限
log "🔒 設定檔案權限..."
update_status "SETTING_PERMISSIONS"

chmod +x start-servers.sh start-frontend.sh start-backend.sh setup-vm.sh setup-nginx.sh vm-deploy.sh 2>/dev/null || true
find . -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true

# 檢查關鍵檔案
log "🔍 檢查關鍵檔案..."
update_status "VALIDATING_FILES"

for file in "start-servers.sh" "backend/requirements.txt" "frontend/package.json"; do
    if [ ! -f "$file" ]; then
        log "❌ 缺少關鍵檔案: $file"
        handle_error "MISSING_KEY_FILE:$file"
    fi
done

# 清理壓縮檔
log "🗑️ 清理壓縮檔..."
rm -f "$HOME/$ARCHIVE_NAME"

log "✅ VM 端部署完成"
update_status "COMPLETED"

log "📝 部署摘要:"
log "  - 部署路徑: $DEPLOY_DIR"
log "  - 備份路徑: $BACKUP_DIR"
log "  - 日誌檔案: $LOG_FILE"

log ""
log "🔧 下一步操作:"
log "1. 執行環境設定: cd $DEPLOY_DIR && ./setup-vm.sh"
log "2. 啟動服務: ./start-servers.sh"
log "3. 檢查服務狀態: sudo systemctl status seo-analyzer"
log ""

log "🎉 部署流程結束"