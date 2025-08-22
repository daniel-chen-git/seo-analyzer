"""SEO Analyzer FastAPI 主應用程式。

此模組是 FastAPI 應用程式的入口點，負責初始化應用程式、
設定中間件、註冊路由和啟動伺服器。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_config
from .api.endpoints import router

# 取得配置實例
config = get_config()

# 初始化 FastAPI 應用程式
app = FastAPI(
    title="SEO Analyzer API",
    description="SEO 關鍵字分析工具 REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

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