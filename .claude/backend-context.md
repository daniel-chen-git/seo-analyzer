# Backend Context - 後端開發記憶

## 當前狀態
- **階段**: 專案初始化
- **進度**: ░░░░░░░░░░ 0%
- **環境**: 尚未設置

## 技術架構

### 資料夾結構
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI 應用入口
│   ├── config.py         # 環境變數配置
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py     # 路由定義
│   │   └── endpoints.py  # API 端點實作
│   ├── services/
│   │   ├── __init__.py
│   │   ├── serp_service.py      # SerpAPI 整合
│   │   ├── scraper_service.py   # 網頁爬蟲
│   │   └── ai_service.py        # GPT-4o 整合
│   ├── models/
│   │   ├── __init__.py
│   │   ├── request.py    # 請求模型
│   │   └── response.py   # 回應模型
│   └── utils/
│       ├── __init__.py
│       ├── exceptions.py  # 自定義例外
│       └── validators.py  # 輸入驗證
├── tests/
│   ├── unit/
│   └── integration/
├── scripts/
├── requirements.txt
├── .env.example
└── README.md
```

## 服務層設計

### 1. SerpAPI Service
```python
# services/serp_service.py 規劃

class SerpService:
    """負責與 SerpAPI 互動。"""
    
    async def get_serp_data(
        self,
        keyword: str,
        location: str = "Taiwan"
    ) -> dict:
        """取得 SERP 資料。
        
        預期回傳格式:
        {
            "organic_results": [
                {
                    "position": int,
                    "title": str,
                    "link": str,
                    "snippet": str
                }
            ]
        }
        """
        pass
```

### 2. Scraper Service
```python
# services/scraper_service.py 規劃

class ScraperService:
    """負責網頁內容爬取。"""
    
    async def scrape_content(self, url: str) -> dict:
        """爬取單一網頁內容。"""
        pass
    
    async def scrape_multiple(
        self,
        urls: List[str],
        max_workers: int = 10
    ) -> List[dict]:
        """並行爬取多個網頁。"""
        pass
```

### 3. AI Service
```python
# services/ai_service.py 規劃

class AIService:
    """負責 GPT-4o 分析。"""
    
    async def analyze_seo(
        self,
        serp_data: dict,
        keyword: str,
        audience: str,
        options: dict
    ) -> str:
        """執行 SEO 分析。"""
        pass
```

## API 端點實作細節

### POST /api/analyze
```python
# api/endpoints.py 規劃

@router.post("/analyze")
async def analyze_seo(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    執行流程:
    1. 驗證輸入 (1秒)
    2. SERP 資料擷取 (10秒)
    3. 並行爬取網頁 (20秒)
    4. AI 分析生成報告 (30秒)
    5. 組合回應
    
    總時間目標: < 60秒
    """
    pass
```

## 已完成項目
- [x] 專案結構規劃
- [x] requirements.txt 建立
- [x] .env.example 建立

## 進行中
- [ ] FastAPI 應用初始化

## 待處理任務

### 優先級 P0 (核心功能)
- [ ] 建立 FastAPI 應用主體
- [ ] 環境變數配置 (config.py)
- [ ] 基本錯誤處理中間件
- [ ] CORS 設定

### 優先級 P1 (服務整合)
- [ ] SerpAPI 服務實作
  - [ ] API 呼叫邏輯
  - [ ] 重試機制
  - [ ] 錯誤處理
- [ ] 爬蟲服務實作
  - [ ] 單一網頁爬取
  - [ ] 並行爬取邏輯
  - [ ] 超時處理
  - [ ] 內容解析 (H1, H2, 字數等)
- [ ] AI 服務實作
  - [ ] Prompt 設計
  - [ ] Token 計算
  - [ ] 回應解析

### 優先級 P2 (優化)
- [ ] 快取機制 (Redis)
- [ ] Rate limiting
- [ ] 監控與日誌

## 技術決策記錄

### 1. 非同步框架選擇
- **決策**: 使用 asyncio + httpx
- **原因**: 
  - 原生支援非同步
  - httpx 支援 async/await
  - 適合 I/O 密集型操作

### 2. 並行策略
- **決策**: asyncio.gather() 處理多個爬蟲請求
- **原因**:
  - 簡單易用
  - 可設定 timeout
  - 容錯處理方便

### 3. 錯誤處理策略
- **決策**: 自定義 Exception + 統一錯誤格式
- **原因**:
  - 前端容易處理
  - 便於除錯
  - 使用者體驗一致

## 環境變數配置
```ini
# config.ini 結構

[api_keys]
serp_api_key = your_serp_api_key
azure_openai_api_key = your_azure_key  
azure_openai_endpoint = https://xxx.openai.azure.com
azure_deployment_name = gpt-4o

[server]
port = 8000
host = 0.0.0.0
debug = true

[limits]
max_scrape_workers = 10
scrape_timeout = 10
max_tokens = 8000

[redis]
redis_url = redis://localhost:6379
```

```python
# config.py - 使用 configparser 讀取配置

import configparser
from pathlib import Path

def load_config():
    """載入配置檔案。"""
    config = configparser.ConfigParser()
    config_path = Path(__file__).parent.parent / "config.ini"
    config.read(config_path)
    return config

# 使用範例
config = load_config()
api_key = config.get('api_keys', 'serp_api_key')
port = config.getint('server', 'port')
```

## 依賴套件說明
```txt
# Python 3.13.5 相容版本（2024年最新穩定版）
fastapi==0.115.0          # Web 框架（支援 Python 3.13）
uvicorn[standard]==0.35.0 # ASGI 伺服器
python-dotenv==1.1.1      # 環境變數管理
httpx==0.27.2            # 非同步 HTTP 客戶端
beautifulsoup4==4.13.4   # HTML 解析
openai==1.54.0           # Azure OpenAI SDK
pydantic==2.11.0         # 資料驗證
pytest==8.3.3            # 測試框架
pytest-asyncio==1.1.0    # 非同步測試
redis==6.4.0             # Redis 客戶端 (Optional)
```

## 重要程式碼片段

### 非同步爬蟲範例
```python
async def scrape_with_timeout(url: str, timeout: int = 10) -> dict:
    """帶超時的爬蟲。"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                timeout=timeout,
                headers={"User-Agent": "SEO-Analyzer/1.0"}
            )
            soup = BeautifulSoup(response.text, 'html.parser')
            
            return {
                "success": True,
                "h1": soup.find('h1').text if soup.find('h1') else "",
                "h2_list": [h2.text for h2 soup.find_all('h2')],
                "word_count": len(soup.get_text().split())
            }
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### 並行處理範例
```python
async def process_urls(urls: List[str]) -> List[dict]:
    """並行處理多個 URL。"""
    tasks = [scrape_with_timeout(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # 過濾成功的結果
    successful = [r for r in results if isinstance(r, dict) and r.get("success")]
    
    # 確保至少 80% 成功率
    if len(successful) / len(urls) < 0.8:
        logger.warning(f"爬蟲成功率低於 80%: {len(successful)}/{len(urls)}")
    
    return successful
```

## 測試策略

### 單元測試覆蓋
- [ ] config.py - 環境變數載入
- [ ] validators.py - 輸入驗證
- [ ] exceptions.py - 錯誤處理
- [ ] 各 service 的核心方法

### 整合測試
- [ ] API 端點測試
- [ ] 服務串接測試
- [ ] 錯誤情境測試

### 效能測試
- [ ] 60 秒內完成處理
- [ ] 並行爬取效能
- [ ] Token 使用量

## 問題追蹤
目前無問題

## 下次任務
1. 建立 FastAPI 應用主體 (main.py)
2. 設定環境變數管理 (config.py)
3. 建立基本 API 路由

## 備註
- 使用 uv 管理 Python 套件
- 遵循 PEP 8 與 PEP 257
- 所有註解使用繁體中文
- 記得標註 context7 查詢點

---
最後更新: 2024-01-20
負責人: Backend Team