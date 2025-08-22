"""SEO Analyzer FastAPI 主應用程式。"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import configparser
import os
from pathlib import Path

# 初始化 FastAPI 應用程式
app = FastAPI(
    title="SEO Analyzer API",
    description="SEO 關鍵字分析工具 REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 載入配置檔案
config = configparser.ConfigParser()
config_path = Path(__file__).parent.parent / "config.ini"

if config_path.exists():
    config.read(config_path, encoding='utf-8')
else:
    raise FileNotFoundError(f"配置檔案不存在: {config_path}")

# 設定 CORS
cors_origins = config.get('server', 'cors_origins', fallback='*').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路由 - API 基本資訊。"""
    return {
        "message": "SEO Analyzer API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check():
    """健康檢查端點。"""
    return {
        "status": "healthy",
        "timestamp": "2025-01-22T10:00:00Z",
        "version": "1.0.0"
    }


@app.get("/api/version")
async def get_version():
    """取得 API 版本資訊。"""
    return {
        "api_version": "1.0.0",
        "fastapi_version": "0.116.1",
        "python_version": "3.13.5"
    }


@app.post("/api/analyze")
async def analyze_seo(request_data: dict):
    """SEO 分析主要端點 - 暫時回傳測試資料。"""
    # 暫時實作，回傳基本結構
    return {
        "status": "success",
        "data": {
            "keyword": request_data.get("keyword", ""),
            "audience": request_data.get("audience", ""),
            "analysis": "分析功能開發中...",
            "processing_time": "1.2 秒"
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    host = config.get('server', 'host', fallback='0.0.0.0')
    port = config.getint('server', 'port', fallback=8000)
    debug = config.getboolean('server', 'debug', fallback=True)
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )