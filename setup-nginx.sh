#!/bin/bash
set -e

echo "🌐 設定 Nginx 反向代理..."

# 檢查是否為 root 使用者或具有 sudo 權限
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
    echo "❌ 此腳本需要 root 權限或 sudo 權限"
    exit 1
fi

# 檢查 Nginx 是否已安裝
if ! command -v nginx &> /dev/null; then
    echo "📥 安裝 Nginx..."
    sudo apt update
    sudo apt install -y nginx
else
    echo "✅ Nginx 已安裝: $(nginx -v 2>&1)"
fi

# 檢查配置檔案是否存在
if [ ! -f "nginx.conf" ]; then
    echo "❌ 找不到 nginx.conf 檔案"
    exit 1
fi

# 備份現有的預設配置（如果存在）
if [ -f "/etc/nginx/sites-available/default" ]; then
    echo "📦 備份現有的 Nginx 預設配置..."
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
fi

# 複製配置檔案
echo "📝 複製 Nginx 配置檔案..."
sudo cp nginx.conf /etc/nginx/sites-available/seo-analyzer

# 建立符號連結啟用站點
echo "🔗 啟用 SEO Analyzer 站點..."
sudo ln -sf /etc/nginx/sites-available/seo-analyzer /etc/nginx/sites-enabled/

# 移除預設站點（避免衝突）
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "🗑️ 移除預設 Nginx 站點..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# 測試 Nginx 配置
echo "🔍 測試 Nginx 配置..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx 配置測試失敗"
    exit 1
fi

echo "✅ Nginx 配置測試通過"

# 重新載入 Nginx
echo "🔄 重新載入 Nginx..."
sudo systemctl reload nginx

# 確保 Nginx 服務已啟動並設為開機自動啟動
echo "⚙️ 設定 Nginx 服務..."
sudo systemctl enable nginx
sudo systemctl start nginx

# 檢查 Nginx 狀態
echo "📊 檢查 Nginx 狀態..."
sudo systemctl status nginx --no-pager -l

# 檢查埠號使用情況
echo "🔌 檢查埠號 80 使用情況..."
if command -v lsof &> /dev/null; then
    lsof -i:80 || echo "埠號 80 未被使用"
else
    netstat -tlnp | grep :80 || echo "埠號 80 未被使用"
fi

# 防火牆設定建議
echo ""
echo "🔥 防火牆設定建議："
if command -v ufw &> /dev/null; then
    echo "   sudo ufw allow 'Nginx Full'    # 允許 HTTP 和 HTTPS"
    echo "   或"
    echo "   sudo ufw allow 80               # 僅允許 HTTP"
    echo "   sudo ufw allow 443              # 僅允許 HTTPS（如需要）"
else
    echo "   請確保防火牆允許埠號 80 (HTTP) 的連線"
fi

echo ""
echo "🎉 Nginx 設定完成！"
echo ""
echo "📝 重要提醒："
echo "1. 確保 SEO Analyzer 應用程式正在運行："
echo "   - 前端服務: http://localhost:3000"
echo "   - 後端服務: http://localhost:8000"
echo ""
echo "2. 現在可以透過以下方式訪問應用程式："
echo "   - 直接 IP: http://135.149.56.162"
echo "   - 健康檢查: http://135.149.56.162/health"
echo ""
echo "3. 常用 Nginx 命令："
echo "   sudo systemctl status nginx      # 檢查狀態"
echo "   sudo systemctl restart nginx     # 重啟 Nginx"
echo "   sudo nginx -t                    # 測試配置"
echo "   sudo tail -f /var/log/nginx/seo-analyzer-error.log  # 查看錯誤日誌"
echo ""