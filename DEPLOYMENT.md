# 🚀 SEO Analyzer 部署指南

本文檔說明如何將 SEO Analyzer 部署到 Azure VM。

## 📋 前置需求

### 本地環境
- SSH 金鑰已設定並可連接到 Azure VM
- Git 已安裝並可正常使用

### Azure VM 環境
- **IP**: 135.149.56.162
- **使用者**: daniel
- **作業系統**: Ubuntu/Debian
- **所需資源**: 至少 2GB RAM, 10GB 磁碟空間

## 🔧 部署步驟

### 1. 執行本地部署腳本

```bash
# 在專案根目錄執行
./deploy.sh
```

此腳本會：
- 建立壓縮檔（排除不必要檔案）
- 測試 SSH 連線
- 傳輸檔案到 VM
- **在 VM 上啟動背景部署（支援斷線續傳）**
- 自動監控部署狀態並提供即時回饋

### 2. 檢查部署狀態

如果部署過程中需要檢查狀態：

```bash
# 檢查部署狀態和服務狀態
./check-deploy.sh
```

### 3. SSH 到 VM 並設定環境

```bash
# 連接到 VM
ssh daniel@135.149.56.162

# 進入部署目錄
cd /home/daniel/seo-analyzer

# 執行環境設定
./setup-vm.sh
```

`setup-vm.sh` 會自動安裝：
- Python 3.8+
- uv (Python 套件管理工具)
- Node.js 18+
- 前後端依賴套件
- 建立 systemd 服務檔案

### 4. 設定 Nginx 反向代理（可選）

```bash
# 設定 Nginx
./setup-nginx.sh

# 開放防火牆埠號（如需要）
sudo ufw allow 'Nginx Full'
```

### 5. 啟動服務

有三種啟動方式：

#### A. 手動啟動（建議用於測試）
```bash
./start-servers.sh
```

#### B. 系統服務啟動
```bash
# 啟動服務
sudo systemctl start seo-analyzer

# 檢查狀態
sudo systemctl status seo-analyzer

# 設定開機自動啟動
sudo systemctl enable seo-analyzer
```

#### C. 背景執行
```bash
nohup ./start-servers.sh > app.log 2>&1 &
```

## 🌐 服務存取

### 直接存取
- **前端**: http://135.149.56.162:3000
- **後端**: http://135.149.56.162:8000
- **API 文檔**: http://135.149.56.162:8000/docs

### 透過 Nginx（如已設定）
- **應用程式**: http://135.149.56.162
- **健康檢查**: http://135.149.56.162/health

## 📁 檔案結構

```
/home/daniel/seo-analyzer/
├── backend/              # 後端 Python 應用程式
├── frontend/             # 前端 React 應用程式
├── .deployignore         # 部署時排除的檔案清單
├── deploy.sh            # 本地部署腳本（支援斷線續傳）
├── vm-deploy.sh         # VM 端獨立部署腳本
├── check-deploy.sh      # 部署狀態檢查腳本
├── setup-vm.sh          # VM 環境設定腳本
├── setup-nginx.sh       # Nginx 設定腳本
├── nginx.conf           # Nginx 配置檔案
├── start-servers.sh     # 啟動服務腳本
└── DEPLOYMENT.md        # 本文檔
```

### 🔄 部署機制說明

**改進的部署流程**：
1. **本地腳本** (`deploy.sh`) 只負責打包、傳輸和啟動
2. **VM 端腳本** (`vm-deploy.sh`) 在背景獨立執行部署
3. **狀態監控** 透過檔案追蹤部署進度
4. **自動回滾** 部署失敗時恢復備份版本

## 🔄 更新部署

要更新應用程式：

1. 在本地進行修改
2. 執行 `./deploy.sh` 重新部署
3. 在 VM 上重啟服務：
   ```bash
   sudo systemctl restart seo-analyzer
   # 或
   ./start-servers.sh
   ```

## 🛠️ 故障排除

### 檢查服務狀態
```bash
# 檢查系統服務
sudo systemctl status seo-analyzer

# 檢查埠號使用
lsof -i :3000
lsof -i :8000

# 查看應用程式日誌
tail -f app.log

# 查看 Nginx 日誌
sudo tail -f /var/log/nginx/seo-analyzer-error.log
```

### 常見問題

1. **SSH 連線失敗**
   - 檢查 SSH 金鑰設定
   - 確認 VM IP 正確
   - 檢查 VM 是否正在運行

2. **依賴安裝失敗**
   - 確保網路連線正常
   - 檢查磁碟空間是否足夠
   - 嘗試手動安裝失敗的套件

3. **服務無法啟動**
   - 檢查埠號是否被佔用
   - 查看錯誤日誌
   - 確認環境變數設定正確

4. **Nginx 代理失敗**
   - 確認應用程式服務正在運行
   - 檢查 Nginx 配置語法
   - 查看 Nginx 錯誤日誌

## 📞 支援

如遇到問題，請檢查：
1. 應用程式日誌
2. 系統服務狀態
3. 網路連線
4. 防火牆設定