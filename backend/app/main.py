"""SEO Analyzer FastAPI 主應用程式。

此模組是 FastAPI 應用程式的入口點，負責初始化應用程式、
設定中間件、註冊路由和啟動伺服器。
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html
import os

from .config import get_config
from .api.endpoints import router

# 取得配置實例
config = get_config()

# 取得應用目錄路徑
APP_DIR = os.path.dirname(os.path.abspath(__file__))

# 初始化模板引擎
templates = Jinja2Templates(directory=os.path.join(APP_DIR, "templates"))

# 初始化 FastAPI 應用程式（關閉預設文檔）
app = FastAPI(
    title="SEO Analyzer API",
    description="""
## SEO 關鍵字分析工具 REST API

### 功能特色
- 🔍 **真實搜尋結果分析**：使用 SerpAPI 擷取 Google 真實搜尋結果
- 🕷️ **並行網頁爬取**：高效率爬取競爭對手網頁內容
- 🤖 **AI 深度分析**：Azure OpenAI GPT-4o 生成專業 SEO 分析報告
- ⚡ **效能監控**：完整的階段計時和效能警告機制
- 📊 **詳細指標**：包含處理時間、Token 使用量、成功率等指標

### 效能指標
- **處理時間**：平均 20-35 秒（< 60 秒保證）
- **成功率**：95%+ 穩定運行
- **並發支援**：3-5 個同時請求
- **Token 效率**：平均 5,000-7,000 tokens/請求

### 效能閾值警告
系統會監控以下階段並在超過閾值時發出警告：
- **SERP 階段**：> 15 秒
- **爬蟲階段**：> 25 秒  
- **AI 分析階段**：> 35 秒
- **總處理時間**：> 55 秒

### 使用建議
1. 關鍵字長度控制在 1-50 字元
2. 目標受眾描述越具體越好 (1-200 字元)
3. 根據需求選擇分析選項以控制處理時間
    """,
    version="1.0.0",
    docs_url=None,  # 關閉預設文檔
    redoc_url=None,  # 關閉預設 ReDoc
    contact={
        "name": "SEO Analyzer Support",
        "email": "support@seo-analyzer.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    }
)

# 掛載靜態檔案
app.mount("/static", StaticFiles(directory=os.path.join(APP_DIR, "static")), name="static")

# 設定 CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊 API 路由
app.include_router(router, prefix="/api")


@app.get("/docs", response_class=HTMLResponse, include_in_schema=False)
async def custom_swagger_ui_html(request: Request):
    """自定義 Swagger UI 文檔頁面。
    
    使用自定義 HTML 模板提供品牌化的 API 文檔體驗，
    包含使用範例、效能指標說明和快速開始指南。
    
    Args:
        request: HTTP 請求物件
        
    Returns:
        HTMLResponse: 自定義的 Swagger UI 頁面
    """
    return templates.TemplateResponse(
        "swagger_ui.html",
        {
            "request": request,
            "title": app.title,
            "openapi_url": app.openapi_url,
        }
    )


@app.get("/docs/faq", response_class=HTMLResponse, include_in_schema=False)
async def faq_html(request: Request):
    """常見問題 FAQ 頁面。
    
    提供 SEO Analyzer API 的常見問題和解答，
    包含 API 使用、錯誤處理、效能優化和整合指南。
    
    Args:
        request: HTTP 請求物件
        
    Returns:
        HTMLResponse: FAQ 頁面
    """
    return templates.TemplateResponse(
        "faq.html",
        {"request": request}
    )


@app.get("/redoc", response_class=HTMLResponse, include_in_schema=False)
async def redoc_html():
    """ReDoc 文檔頁面（重定向到自定義文檔）。"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


@app.get("/")
async def root():
    """根路由 - API 基本資訊。

    提供 API 的基本資訊和文檔連結。

    Returns:
        dict: 包含 API 基本資訊的字典

    Example:
        >>> response = await root()
        >>> print(response["message"])  # "SEO Analyzer API"
    """
    return {
        "message": "SEO Analyzer API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "api_endpoints": {
            "analyze": "/api/analyze",
            "health": "/api/health", 
            "version": "/api/version"
        },
        "features": {
            "serp_analysis": "SerpAPI 真實搜尋結果分析",
            "web_scraping": "並行網頁內容爬取",
            "ai_analysis": "Azure OpenAI GPT-4o 深度分析",
            "performance_monitoring": "階段計時與效能警告",
            "concurrent_requests": "支援 3-5 個並發請求"
        },
        "performance_thresholds": {
            "serp_stage": "15 秒",
            "scraping_stage": "25 秒",
            "ai_stage": "35 秒", 
            "total_time": "55 秒 (保證 < 60 秒)"
        }
    }


if __name__ == "__main__":
    import uvicorn

    # 從配置檔案讀取伺服器設定
    host = config.get_server_host()
    port = config.get_server_port()
    debug = config.get_server_debug()

    print(f"啟動 SEO Analyzer API 伺服器")
    print(f"主機: {host}:{port}")
    print(f"除錯模式: {debug}")
    print(f"API 文檔: http://{host}:{port}/docs")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )