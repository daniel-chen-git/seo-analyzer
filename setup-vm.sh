#!/bin/bash
set -e

echo "🔧 開始設定 VM 環境..."

# 檢查是否在正確目錄
if [ ! -f "start-servers.sh" ]; then
    echo "❌ 請在專案根目錄執行此腳本"
    exit 1
fi

# 更新系統套件
echo "📦 更新系統套件..."
sudo apt update

# 安裝必要工具
echo "🛠️ 安裝必要工具..."
sudo apt install -y curl wget git build-essential

# 檢查並安裝 Python
echo "🐍 檢查 Python 環境..."
if ! command -v python3 &> /dev/null; then
    echo "📥 安裝 Python3..."
    sudo apt install -y python3 python3-pip python3-venv
else
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo "✅ Python 已安裝: $PYTHON_VERSION"
fi

# 檢查並安裝 uv
echo "⚡ 檢查 uv 套件管理工具..."
if ! command -v uv &> /dev/null; then
    echo "📥 安裝 uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
else
    echo "✅ uv 已安裝: $(uv --version)"
fi

# 檢查並安裝 Node.js
echo "🟢 檢查 Node.js 環境..."
if ! command -v node &> /dev/null; then
    echo "📥 安裝 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo "✅ Node.js 已安裝: $NODE_VERSION"
    
    # 檢查版本是否符合要求（18+）
    NODE_MAJOR=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$NODE_MAJOR" -lt "18" ]; then
        echo "⚠️ Node.js 版本過舊，升級到 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
fi

# 檢查 npm
echo "📦 檢查 npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安裝，請檢查 Node.js 安裝"
    exit 1
else
    echo "✅ npm 已安裝: $(npm --version)"
fi

# 建立生產環境變數檔案
echo "🔧 設定環境變數..."
if [ ! -f "frontend/.env.production" ]; then
    echo "📝 建立前端生產環境變數檔案..."
    if [ -f "frontend/.env.local.example" ]; then
        cp frontend/.env.local.example frontend/.env.production
        echo "✅ 使用 .env.local.example 作為模板建立環境變數檔案"
        
        # 更新環境變數為生產環境設定
        sed -i 's/VITE_APP_ENVIRONMENT=local/VITE_APP_ENVIRONMENT=production/' frontend/.env.production 2>/dev/null || true
        sed -i 's/VITE_ENABLE_DEBUG=true/VITE_ENABLE_DEBUG=false/' frontend/.env.production 2>/dev/null || true
        sed -i 's|VITE_API_BASE_URL=http://localhost:8000|VITE_API_BASE_URL=|' frontend/.env.production 2>/dev/null || true
        
        # 創建 .env.local 給開發模式使用
        cp frontend/.env.production frontend/.env.local
        echo "✅ 前端環境變數檔案已建立 (.env.production 和 .env.local)"
    else
        echo "❌ 找不到環境變數模板檔案 (.env.local.example)"
        exit 1
    fi
fi

# 安裝後端依賴
echo "🐍 安裝後端依賴..."
cd backend
export PATH="$HOME/.local/bin:$PATH"
uv sync

if [ $? -ne 0 ]; then
    echo "❌ 後端依賴安裝失敗"
    exit 1
fi

echo "✅ 後端依賴安裝完成"

# 安裝前端依賴
echo "🟢 安裝前端依賴..."
cd ../frontend
npm install

if [ $? -ne 0 ]; then
    echo "❌ 前端依賴安裝失敗"
    exit 1
fi

echo "✅ 前端依賴安裝完成"

# 回到專案根目錄
cd ..

# 檢查防火牆設定
echo "🔥 檢查防火牆設定..."
if command -v ufw &> /dev/null; then
    echo "📋 當前防火牆狀態:"
    sudo ufw status
    
    echo ""
    echo "🔧 如需從外部訪問，請執行以下命令開放埠號："
    echo "   sudo ufw allow 3000  # 前端"
    echo "   sudo ufw allow 8000  # 後端"
    echo "   sudo ufw allow 80    # HTTP (如使用 nginx)"
fi

# 檢查服務埠
echo "🔍 檢查埠號使用情況..."
if command -v lsof &> /dev/null; then
    echo "🔌 埠號 3000: $(lsof -i:3000 | tail -n +2 || echo '未使用')"
    echo "🔌 埠號 8000: $(lsof -i:8000 | tail -n +2 || echo '未使用')"
else
    echo "📥 安裝 lsof 工具..."
    sudo apt install -y lsof
fi

# 建立 systemd 服務檔案（可選）
echo "⚙️ 建立系統服務檔案..."
sudo tee /etc/systemd/system/seo-analyzer.service > /dev/null << EOF
[Unit]
Description=SEO Analyzer Application
After=network.target

[Service]
Type=simple
User=daniel
WorkingDirectory=/home/daniel/seo-analyzer
ExecStart=/home/daniel/seo-analyzer/start-servers.sh
Restart=always
RestartSec=10
Environment=PATH=/home/daniel/.local/bin:/usr/local/bin:/usr/bin:/bin
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "✅ 系統服務檔案已建立"

# 重新載入 systemd
sudo systemctl daemon-reload

echo ""
echo "🎉 VM 環境設定完成！"
echo ""
echo "🚀 啟動服務選項："
echo "1. 手動啟動: ./start-servers.sh"
echo "2. 系統服務啟動: sudo systemctl start seo-analyzer"
echo "3. 開機自動啟動: sudo systemctl enable seo-analyzer"
echo ""
echo "📋 服務管理命令："
echo "   sudo systemctl status seo-analyzer   # 檢查服務狀態"
echo "   sudo systemctl stop seo-analyzer     # 停止服務"
echo "   sudo systemctl restart seo-analyzer  # 重啟服務"
echo ""
echo "🌐 服務位址："
echo "   前端: http://localhost:3000"
echo "   後端: http://localhost:8000"
echo "   API 文檔: http://localhost:8000/docs"
echo ""
if command -v ufw &> /dev/null && sudo ufw status | grep -q "Status: active"; then
    echo "⚠️ 注意: 防火牆已啟用，如需外部訪問請開放相應埠號"
fi