"""SEO Analyzer 回應資料模型。

此模組定義 API 回應的資料結構，使用 Pydantic 進行資料序列化。
包含成功回應、錯誤回應和各種輔助資料結構。
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class SerpSummary(BaseModel):
    """SERP 搜尋結果摘要。

    包含搜尋引擎結果頁面的統計資訊和爬取狀況。

    Attributes:
        total_results: SERP 總結果數量
        successful_scrapes: 成功爬取的頁面數量
        avg_word_count: 平均字數
        avg_paragraphs: 平均段落數
    """

    total_results: int = Field(
        ...,
        ge=0,
        description="SERP 總結果數量"
    )
    successful_scrapes: int = Field(
        ...,
        ge=0,
        description="成功爬取的頁面數量"
    )
    avg_word_count: int = Field(
        ...,
        ge=0,
        description="爬取頁面的平均字數"
    )
    avg_paragraphs: int = Field(
        ...,
        ge=0,
        description="爬取頁面的平均段落數"
    )


class AnalysisMetadata(BaseModel):
    """分析元資料。

    包含分析過程的詳細資訊和統計數據。

    Attributes:
        keyword: 原始關鍵字
        audience: 原始受眾描述
        generated_at: 分析生成時間（ISO 8601 格式）
        token_usage: AI 模型使用的 token 數量
        phase_timings: 各階段計時資訊（可選）
        total_phases_time: 所有階段總時間（可選）
    """

    keyword: str = Field(
        ...,
        description="原始關鍵字"
    )
    audience: str = Field(
        ...,
        description="原始受眾描述"
    )
    generated_at: str = Field(
        ...,
        description="分析生成時間（ISO 8601 格式）"
    )
    token_usage: int = Field(
        ...,
        ge=0,
        description="AI 模型使用的 token 數量"
    )
    phase_timings: Optional[Dict[str, float]] = Field(
        None,
        description="各階段計時資訊（秒）"
    )
    total_phases_time: Optional[float] = Field(
        None,
        ge=0,
        description="所有階段總計時間（秒）"
    )


class AnalysisData(BaseModel):
    """分析結果資料。

    包含完整的 SEO 分析結果，包括 SERP 摘要、分析報告和元資料。

    Attributes:
        serp_summary: SERP 搜尋結果摘要
        analysis_report: Markdown 格式的分析報告
        metadata: 分析元資料
    """

    serp_summary: SerpSummary = Field(
        ...,
        description="SERP 搜尋結果摘要"
    )
    analysis_report: str = Field(
        ...,
        description="Markdown 格式的 SEO 分析報告"
    )
    metadata: AnalysisMetadata = Field(
        ...,
        description="分析過程的元資料"
    )


# ===== 向後兼容的舊版模型 =====
class LegacyAnalyzeResponse(BaseModel):
    """舊版巢狀結構的 AnalyzeResponse（向後兼容用）。
    
    @deprecated 請使用新的扁平結構 AnalyzeResponse
    """
    status: str = Field(default="success", description="回應狀態")
    processing_time: float = Field(..., ge=0, description="處理時間（秒）")
    data: AnalysisData = Field(..., description="分析結果資料")


# ===== 新的扁平結構模型（雙欄位設計）=====
class AnalyzeResponse(BaseModel):
    """SEO 分析成功回應模型。

    POST /api/analyze 端點的成功回應資料結構。
    採用扁平化設計，直接包含分析結果，無需巢狀 data 物件。
    
    雙欄位設計說明：
    - status: API 契約欄位，維護前端相容性（固定為 "success"）
    - success: 業務狀態欄位，反映實際處理結果（true/false）

    Attributes:
        status: API 契約狀態標識（固定為 "success"）
        analysis_report: Markdown 格式的 SEO 分析報告
        token_usage: AI Token 使用量
        processing_time: 處理時間（秒）
        success: 業務處理成功標誌（來自業務層的真實結果）
        cached_at: 快取時間戳（ISO 8601 格式）
        keyword: 原始關鍵字
    """

    # API 契約欄位：維護前端相容性
    status: str = Field(
        default="success",
        description="API 契約狀態標識，維護前端 response.status === 'success' 判斷邏輯"
    )
    
    # 核心業務資料（扁平結構）
    analysis_report: str = Field(
        ...,
        description="Markdown 格式的 SEO 分析報告"
    )
    token_usage: int = Field(
        ...,
        ge=0,
        description="AI Token 使用量"
    )
    processing_time: float = Field(
        ...,
        ge=0,
        description="處理時間（秒）"
    )
    success: bool = Field(
        ...,
        description="業務處理成功標誌，直接反映各服務層的實際處理結果"
    )
    cached_at: str = Field(
        ...,
        description="快取時間戳（ISO 8601 格式）"
    )
    keyword: str = Field(
        ...,
        description="原始關鍵字"
    )

    class Config:
        """Pydantic 模型配置。"""
        json_schema_extra = {
            "example": {
                "status": "success",
                "analysis_report": "# SEO 分析報告\n\n## 1. 分析概述\n\n### 關鍵字搜尋意圖分析\n目標關鍵字「跑步鞋」的搜尋意圖主要包含以下幾個層面...",
                "token_usage": 5484,
                "processing_time": 22.46,
                "success": True,
                "cached_at": "2025-08-31T12:29:07.924683+00:00",
                "keyword": "跑步鞋"
            }
        }


class ErrorDetail(BaseModel):
    """錯誤詳細資訊。

    符合 API 規格的錯誤詳細資訊格式，提供具體的錯誤內容，
    例如驗證失敗的欄位名稱、長度限制等。

    Attributes:
        field: 發生錯誤的欄位名稱（可選）
        provided_length: 提供的長度（可選）
        max_length: 最大允許長度（可選）
        min_length: 最小允許長度（可選）
        provided_value: 使用者提供的值（可選）
        expected_format: 期望的格式或範圍（可選）
        job_id: 任務識別碼（可選）
        processing_time: 處理時間（可選）
        retry_after: 重試等待時間（可選）
    """

    field: Optional[str] = Field(
        None,
        description="發生錯誤的欄位名稱"
    )
    provided_length: Optional[int] = Field(
        None,
        description="提供的長度"
    )
    max_length: Optional[int] = Field(
        None,
        description="最大允許長度"
    )
    min_length: Optional[int] = Field(
        None,
        description="最小允許長度"
    )
    provided_value: Optional[Any] = Field(
        None,
        description="使用者提供的值"
    )
    expected_format: Optional[str] = Field(
        None,
        description="期望的格式或範圍"
    )
    job_id: Optional[str] = Field(
        None,
        description="任務識別碼"
    )
    processing_time: Optional[float] = Field(
        None,
        description="處理時間（秒）"
    )
    retry_after: Optional[int] = Field(
        None,
        description="建議重試等待時間（秒）"
    )


class ErrorInfo(BaseModel):
    """錯誤資訊。

    包含錯誤的基本資訊和詳細說明。

    Attributes:
        code: 錯誤代碼
        message: 錯誤訊息（繁體中文）
        details: 錯誤詳細資訊（可選）
        timestamp: 錯誤發生時間（ISO 8601 格式）
    """

    code: str = Field(
        ...,
        description="錯誤代碼"
    )
    message: str = Field(
        ...,
        description="錯誤訊息（繁體中文）"
    )
    details: Optional[ErrorDetail] = Field(
        None,
        description="錯誤詳細資訊"
    )
    timestamp: str = Field(
        ...,
        description="錯誤發生時間（ISO 8601 格式）"
    )


class ErrorResponse(BaseModel):
    """錯誤回應模型。

    統一的錯誤回應格式，適用於所有 API 端點。
    
    雙欄位設計說明：
    - status: API 契約欄位，標識錯誤回應（固定為 "error"）
    - success: 業務狀態欄位，明確標識失敗（固定為 False）

    Attributes:
        status: API 契約狀態標識（固定為 "error"）
        success: 業務處理失敗標誌（固定為 False）
        error_message: 錯誤描述訊息
        error_code: 錯誤代碼（可選）
    """

    # API 契約欄位：標識錯誤回應
    status: str = Field(
        default="error",
        description="API 契約狀態標識，用於前端 response.status === 'error' 判斷"
    )
    
    # 業務狀態欄位：明確標識失敗
    success: bool = Field(
        default=False,
        description="業務處理失敗標誌，與 AnalyzeResponse 保持欄位一致性"
    )
    
    # 錯誤資訊
    error_message: str = Field(
        ...,
        description="錯誤描述訊息（繁體中文）"
    )
    error_code: Optional[str] = Field(
        None,
        description="錯誤代碼，用於程式化處理"
    )

    class Config:
        """Pydantic 模型配置。"""
        json_schema_extra = {
            "example": {
                "status": "error",
                "success": False,
                "error_message": "關鍵字長度必須在 1-50 字元之間",
                "error_code": "INVALID_INPUT"
            }
        }


class ServiceStatus(BaseModel):
    """服務狀態。

    表示單一外部服務的健康狀態。

    Attributes:
        status: 服務狀態（"ok", "error", "unknown"）
        message: 狀態說明（可選）
    """

    status: str = Field(
        ...,
        description="服務狀態"
    )
    message: Optional[str] = Field(
        None,
        description="狀態說明"
    )


class HealthCheckResponse(BaseModel):
    """健康檢查回應模型。

    GET /api/health 端點的回應資料結構。

    Attributes:
        status: 整體健康狀態
        timestamp: 檢查時間戳
        services: 各服務的健康狀態
    """

    status: str = Field(
        ...,
        description="整體健康狀態"
    )
    timestamp: str = Field(
        ...,
        description="檢查時間戳（ISO 8601 格式）"
    )
    services: Dict[str, str] = Field(
        ...,
        description="各外部服務的健康狀態"
    )

    class Config:
        """Pydantic 模型配置。"""
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2025-01-22T10:30:00Z",
                "services": {
                    "serp_api": "ok",
                    "azure_openai": "ok",
                    "redis": "optional"
                }
            }
        }


class DependencyInfo(BaseModel):
    """依賴套件資訊。

    包含重要依賴套件的版本資訊。

    Attributes:
        fastapi: FastAPI 版本
        openai: OpenAI SDK 版本
        httpx: HTTPX 版本（可選）
        beautifulsoup4: BeautifulSoup 版本（可選）
    """

    fastapi: str = Field(..., description="FastAPI 版本")
    openai: str = Field(..., description="OpenAI SDK 版本")
    httpx: Optional[str] = Field(None, description="HTTPX 版本")
    beautifulsoup4: Optional[str] = Field(None, description="BeautifulSoup 版本")


class VersionResponse(BaseModel):
    """版本資訊回應模型。

    GET /api/version 端點的回應資料結構。

    Attributes:
        api_version: API 版本
        build_date: 建置日期
        python_version: Python 版本
        dependencies: 依賴套件版本資訊
    """

    api_version: str = Field(
        ...,
        description="API 版本"
    )
    build_date: str = Field(
        ...,
        description="建置日期"
    )
    python_version: str = Field(
        ...,
        description="Python 版本"
    )
    dependencies: DependencyInfo = Field(
        ...,
        description="重要依賴套件版本"
    )

    class Config:
        """Pydantic 模型配置。"""
        json_schema_extra = {
            "example": {
                "api_version": "1.0.0",
                "build_date": "2025-01-22",
                "python_version": "3.13.5",
                "dependencies": {
                    "fastapi": "0.116.1",
                    "openai": "1.101.0",
                    "httpx": "0.28.1",
                    "beautifulsoup4": "4.13.4"
                }
            }
        }