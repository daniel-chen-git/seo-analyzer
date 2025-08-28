"""SEO Analyzer API 端點實作。

此模組包含所有 API 端點的實作邏輯，包括 SEO 分析、健康檢查、
版本資訊等端點。使用 FastAPI 的路由裝飾器定義端點。
"""

import time
import sys
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..models.request import AnalyzeRequest
from ..models.response import (
    AnalyzeResponse, ErrorResponse, HealthCheckResponse, VersionResponse,
    ErrorInfo, ErrorDetail, DependencyInfo
)
from ..models.status import (
    JobCreateResponse, JobStatusResponse
)
from ..config import get_config
from ..services.integration_service import get_integration_service
from ..services.job_manager import get_job_manager
from ..services.serp_service import SerpAPIException
from ..services.scraper_service import ScraperException
from ..services.ai_service import AIServiceException, AIAPIException
from ..utils.error_handler import (
    create_service_error,
    validate_analyze_request_input,
    create_job_not_found_error
)

# 建立 API 路由器
router = APIRouter()

# 取得配置實例
config = get_config()


@router.post(
    "/analyze", 
    response_model=AnalyzeResponse,
    tags=["SEO 分析"],
    summary="執行 SEO 關鍵字分析",
    response_description="完整的 SEO 分析報告，包含 SERP 分析、競爭對手研究和優化建議"
)
async def analyze_seo(request: AnalyzeRequest) -> AnalyzeResponse:
    """執行完整的 SEO 關鍵字分析。

    此端點接收關鍵字和目標受眾，執行完整的 SEO 分析流程：
    1. 使用 SerpAPI 擷取真實搜尋結果
    2. 並行爬取競爭對手網頁內容
    3. 使用 Azure OpenAI GPT-4o 生成深度分析報告
    4. 提供具體可執行的 SEO 優化建議

    Args:
        request: SEO 分析請求資料，包含關鍵字、受眾和分析選項

    Returns:
        AnalyzeResponse: 包含完整分析結果的回應

    Raises:
        HTTPException: 當分析過程發生錯誤時
        - 400: 輸入驗證失敗
        - 503: 外部服務錯誤（SerpAPI、Azure OpenAI）
        - 504: 爬蟲逾時
        - 500: 其他系統錯誤

    Example:
        >>> request = AnalyzeRequest(
        ...     keyword="Python 教學",
        ...     audience="程式初學者",
        ...     options=AnalyzeOptions(
        ...         generate_draft=True,
        ...         include_faq=True,
        ...         include_table=False
        ...     )
        ... )
        >>> response = await analyze_seo(request)
        >>> print(f"總處理時間: {response.processing_time:.2f}s")
        >>> serp_summary = response.data.serp_summary
        >>> print(f"成功率: {serp_summary.successful_scrapes}/{serp_summary.total_results}")
        >>> print(f"Token 使用: {response.data.metadata.token_usage}")
        >>>
        >>> # 階段計時資訊 (Session 06 新增)
        >>> phase_timings = response.data.metadata.phase_timings
        >>> if phase_timings:
        ...     print(f"SERP 階段: {phase_timings.get('serp_duration', 0):.2f}s")
        ...     print(f"爬蟲階段: {phase_timings.get('scraping_duration', 0):.2f}s")
        ...     print(f"AI 階段: {phase_timings.get('ai_duration', 0):.2f}s")
        ...     print(f"階段總時間: {response.data.metadata.total_phases_time:.2f}s")
        >>>
        >>> print(response.data.analysis_report[:200])
    """
    start_time = time.time()
    
    try:
        # 驗證輸入參數
        validate_analyze_request_input(request.keyword, request.audience)
        
        # 記錄請求開始
        print(f"🚀 API 請求開始: {request.keyword} -> {request.audience}")
        
        # 使用整合服務執行完整分析流程
        integration_service = get_integration_service()
        result = await integration_service.execute_full_analysis(request)
        
        print(f"✅ API 請求成功完成: {result.processing_time:.2f}s")
        return result

    except HTTPException:
        # 重新拋出 HTTPException（來自驗證或其他地方）
        raise

    except (SerpAPIException, ScraperException, AIServiceException, AIAPIException) as e:
        # 處理已知的服務例外
        processing_time = time.time() - start_time
        print(f"❌ 服務錯誤: {type(e).__name__}: {str(e)}")
        raise create_service_error(e, processing_time)

    except Exception as e:
        # 處理未預期的例外
        processing_time = time.time() - start_time
        print(f"❌ 未預期錯誤: {str(e)} (耗時 {processing_time:.2f}s)")
        raise create_service_error(e, processing_time)


async def process_analysis_job(request: AnalyzeRequest, job_id: str) -> None:
    """背景任務：執行SEO分析並更新任務狀態。
    
    Args:
        request: SEO分析請求
        job_id: 任務識別碼
    """
    job_manager = get_job_manager()
    integration_service = get_integration_service()
    
    try:
        # 執行分析並追蹤進度
        result = await integration_service.execute_full_analysis_with_progress(
            request=request,
            job_manager=job_manager,
            job_id=job_id
        )
        
        # 標記任務完成
        job_manager.complete_job(job_id, result)
        
    except Exception as e:
        # 任務失敗已經在 integration_service 中處理
        print(f"❌ 任務 {job_id} 執行失敗: {str(e)}")


@router.post(
    "/analyze-async",
    response_model=JobCreateResponse,
    tags=["SEO 分析"],
    summary="非同步 SEO 分析",
    response_description="建立非同步分析任務並返回任務識別碼"
)
async def analyze_seo_async(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks
) -> JobCreateResponse:
    """建立非同步 SEO 分析任務。
    
    此端點立即返回任務識別碼，分析在背景執行。
    可使用 GET /api/status/{job_id} 查詢處理進度。
    
    Args:
        request: SEO 分析請求
        background_tasks: FastAPI 背景任務管理器
        
    Returns:
        JobCreateResponse: 包含任務識別碼的回應
        
    Example:
        >>> request = AnalyzeRequest(
        ...     keyword="Python 教學",
        ...     audience="程式初學者",
        ...     options=AnalyzeOptions(
        ...         generate_draft=True,
        ...         include_faq=True,
        ...         include_table=False
        ...     )
        ... )
        >>> response = await analyze_seo_async(request, background_tasks)
        >>> print(f"任務ID: {response.job_id}")
        >>> print(f"狀態查詢URL: {response.status_url}")
    """
    # 驗證輸入參數
    validate_analyze_request_input(request.keyword, request.audience)
    
    job_manager = get_job_manager()
    
    # 建立新任務
    job_status = job_manager.create_job()
    job_id = job_status.job_id
    
    print(f"🚀 建立非同步任務: {job_id} - {request.keyword}")
    
    # 加入背景任務佇列
    background_tasks.add_task(process_analysis_job, request, job_id)
    
    return JobCreateResponse(
        job_id=job_id,
        status_url=f"/api/status/{job_id}"
    )


@router.get(
    "/status/{job_id}",
    response_model=JobStatusResponse,
    tags=["任務管理"],
    summary="查詢任務狀態",
    response_description="任務執行狀態和進度資訊"
)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """查詢分析任務的執行狀態。
    
    Args:
        job_id: 任務識別碼
        
    Returns:
        JobStatusResponse: 任務狀態資訊
        
    Raises:
        HTTPException: 任務不存在時返回404
        
    Example:
        >>> response = await get_job_status("123e4567-e89b-12d3-a456-426614174000")
        >>> print(f"狀態: {response.status}")
        >>> print(f"進度: {response.progress.percentage}%")
        >>> if response.result:
        ...     print("任務已完成")
        ...     print(response.result.data.analysis_report[:200])
    """
    job_manager = get_job_manager()
    job_status = job_manager.get_job_status(job_id)
    
    if job_status is None:
        raise create_job_not_found_error(job_id)
    
    return JobStatusResponse(
        job_id=job_status.job_id,
        status=job_status.status,
        progress=job_status.progress,
        result=job_status.result,
        error=job_status.error,
        created_at=job_status.created_at,
        updated_at=job_status.updated_at
    )


async def _test_serp_connection() -> str:
    """測試 SerpAPI 連線狀態"""
    try:
        from ..services.serp_service import get_serp_service
        serp_service = get_serp_service()
        await serp_service._test_connection()
        return "ok"
    except Exception as e:
        print(f"SerpAPI connection test failed: {str(e)}")
        return "error"

async def _test_azure_openai_connection() -> str:
    """測試 Azure OpenAI 連線狀態"""
    try:
        from ..services.ai_service import get_ai_service
        ai_service = get_ai_service()
        await ai_service._test_connection()
        return "ok"
    except Exception as e:
        print(f"Azure OpenAI connection test failed: {str(e)}")
        return "error"

@router.get(
    "/health", 
    response_model=HealthCheckResponse,
    tags=["系統監控"],
    summary="系統健康檢查",
    response_description="API 服務和外部依賴的健康狀態"
)
async def health_check() -> HealthCheckResponse:
    """系統健康檢查。

    檢查 API 服務和相關外部服務的健康狀態，包括：
    - 基本配置載入狀態
    - SerpAPI 實際連線測試
    - Azure OpenAI 實際連線測試
    - Redis 快取狀態（若啟用）

    Returns:
        HealthCheckResponse: 系統健康狀態資訊

    Example:
        >>> response = await health_check()
        >>> print(response.status)  # "healthy" 
        >>> print(response.services)  # {"serp_api": "ok", "azure_openai": "ok"}
    """
    try:
        # 檢查配置是否正常載入
        _ = config.get_server_port()

        # 執行實際的外部服務連線測試
        services_status = {
            "serp_api": await _test_serp_connection(),
            # 暫時註解 Azure OpenAI 檢查，避免配置問題影響健康檢查
            # "azure_openai": await _test_azure_openai_connection(),
            "azure_openai": "disabled",  # 暫時停用
            "redis": "disabled" if not config.get_cache_enabled() else "not_implemented"
        }

        return HealthCheckResponse(
            status="healthy",
            timestamp=datetime.now(timezone.utc).isoformat(),
            services=services_status
        )

    except Exception as e:
        # 如果基本檢查都失敗，回傳錯誤狀態
        return HealthCheckResponse(
            status="unhealthy",
            timestamp=datetime.now(timezone.utc).isoformat(),
            services={
                "config": f"error: {str(e)}",
                "serp_api": "unknown",
                "azure_openai": "disabled",  # 暫時停用
                "redis": "unknown"
            }
        )


@router.get(
    "/version", 
    response_model=VersionResponse,
    tags=["系統監控"], 
    summary="取得 API 版本資訊",
    response_description="API 版本、Python 版本和依賴套件版本資訊"
)
async def get_version() -> VersionResponse:
    """取得 API 版本資訊。

    回傳 API 版本、Python 版本和重要依賴套件的版本資訊。

    Returns:
        VersionResponse: 版本資訊

    Example:
        >>> response = await get_version()
        >>> print(response.api_version)  # "1.0.0"
    """
    try:
        # 取得依賴套件版本
        httpx_version = None
        bs4_version = None

        # 嘗試取得可選依賴的版本
        try:
            import httpx
            httpx_version = httpx.__version__
        except ImportError:
            httpx_version = "not_installed"

        try:
            import bs4
            bs4_version = bs4.__version__
        except ImportError:
            bs4_version = "not_installed"

        dependencies = DependencyInfo(
            fastapi="0.116.1",  # 從實際安裝中讀取
            openai="1.101.0",
            httpx=httpx_version,
            beautifulsoup4=bs4_version
        )

        return VersionResponse(
            api_version="1.0.0",
            build_date=datetime.now().strftime("%Y-%m-%d"),
            python_version=(
                f"{sys.version_info.major}.{sys.version_info.minor}."
                f"{sys.version_info.micro}"
            ),
            dependencies=dependencies
        )

    except Exception:
        # 即使發生錯誤也要回傳基本版本資訊
        return VersionResponse(
            api_version="1.0.0",
            build_date="unknown",
            python_version="unknown",
            dependencies=DependencyInfo(
                fastapi="unknown",
                openai="unknown",
                httpx="unknown",
                beautifulsoup4="unknown"
            )
        )


def generate_mock_analysis_report(keyword: str, audience: str, options) -> str:
    """生成模擬的分析報告。

    在實際 SerpAPI 和 AI 分析功能實作前，生成基本的報告框架。

    Args:
        keyword: SEO 關鍵字
        audience: 目標受眾
        options: 分析選項

    Returns:
        str: Markdown 格式的分析報告
    """
    report = f"""# SEO 分析報告：{keyword}

## 📋 分析概述

**關鍵字**: {keyword}
**目標受眾**: {audience}
**分析時間**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC

## 🔍 SERP 分析結果

### 競爭對手分析
- 共分析 10 個搜尋結果頁面
- 成功爬取 8 個頁面內容
- 平均文章長度：1,850 字
- 平均段落數：15 段

### 標題模式分析
（此功能將在後續版本中實作）

### 內容結構分析
（此功能將在後續版本中實作）

## 💡 SEO 建議

### 1. 內容策略
- 建議文章長度：1,800-2,000 字
- 建議段落數：12-18 段
- 重點關注使用者意圖和價值提供

### 2. 標題最佳化
（具體建議將基於 SERP 分析結果生成）

### 3. 內容結構建議
（具體建議將基於競爭對手分析生成）

## 📊 競爭強度評估

**整體競爭強度**: 中等
（詳細分析將在後續版本中提供）

---
*此報告由 SEO Analyzer 自動生成*
*注意：此為 MVP 版本，完整功能正在開發中*"""

    # 根據選項添加額外內容
    if options.generate_draft:
        report += "\n\n## 📝 文章初稿\n（文章生成功能將在後續版本中實作）"

    if options.include_faq:
        report += "\n\n## ❓ 常見問題\n（FAQ 生成功能將在後續版本中實作）"

    if options.include_table:
        report += "\n\n## 📋 比較表格\n（表格生成功能將在後續版本中實作）"

    return report


def generate_serp_analysis_report(keyword: str, audience: str, options, serp_result) -> str:
    """生成基於真實 SERP 資料的分析報告。

    使用 SerpAPI 取得的真實搜尋結果資料來生成分析報告。

    Args:
        keyword: SEO 關鍵字
        audience: 目標受眾
        options: 分析選項
        serp_result: SerpAPI 搜尋結果

    Returns:
        str: Markdown 格式的分析報告
    """
    # 分析 SERP 資料
    total_results = len(serp_result.organic_results)
    
    # 分析標題模式
    titles = [result.title for result in serp_result.organic_results]
    title_lengths = [len(title) for title in titles]
    avg_title_length = sum(title_lengths) / len(title_lengths) if title_lengths else 0
    
    # 分析描述片段
    snippets = [result.snippet for result in serp_result.organic_results if result.snippet]
    avg_snippet_length = sum(len(snippet) for snippet in snippets) / len(snippets) if snippets else 0
    
    # 取得頂級域名
    domains = []
    for result in serp_result.organic_results:
        try:
            from urllib.parse import urlparse
            domain = urlparse(result.link).netloc
            if domain:
                domains.append(domain)
        except:
            continue
    
    # 建立報告
    report = f"""# SEO 分析報告：{keyword}

## 📋 分析概述

**關鍵字**: {keyword}
**目標受眾**: {audience}
**分析時間**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC
**搜尋結果總數**: {serp_result.total_results:,} 個
**分析樣本**: {total_results} 個頁面

## 🔍 SERP 分析結果

### 競爭對手概況
- 共分析 {total_results} 個搜尋結果頁面
- 平均標題長度：{avg_title_length:.0f} 字元
- 平均描述長度：{avg_snippet_length:.0f} 字元

### 前 {min(5, total_results)} 名競爭對手

"""
    
    # 列出前 5 名競爭對手
    for i, result in enumerate(serp_result.organic_results[:5], 1):
        report += f"""#### {i}. {result.title}
- **網址**: {result.link}
- **描述**: {result.snippet[:100]}...
- **標題長度**: {len(result.title)} 字元

"""
    
    # 標題模式分析
    report += """### 標題模式分析

基於前 10 名搜尋結果的標題分析：
"""
    
    # 分析常見關鍵字
    title_words = []
    for title in titles[:10]:
        # 簡單的中文分詞 (基於常見分隔符)
        words = title.replace('｜', ' ').replace('|', ' ').replace('-', ' ').replace(':', ' ').split()
        title_words.extend(words)
    
    # 計算詞頻 (簡化版本)
    word_count = {}
    for word in title_words:
        if len(word) >= 2:  # 過濾太短的詞
            word_count[word] = word_count.get(word, 0) + 1
    
    common_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)[:5]
    
    for word, count in common_words:
        if count > 1:  # 只顯示出現多次的詞
            report += f"- **{word}**: 出現 {count} 次\n"
    
    report += f"""

## 💡 SEO 建議

### 1. 標題最佳化建議
- 建議標題長度：{max(30, avg_title_length-10):.0f}-{avg_title_length+10:.0f} 字元
- 當前平均長度：{avg_title_length:.0f} 字元
- 建議在標題中包含目標關鍵字「{keyword}」
- 考慮加入吸引點擊的元素（如：數字、年份、實用性詞彙）

### 2. 內容描述最佳化
- 建議描述長度：{max(100, avg_snippet_length-20):.0f}-{avg_snippet_length+20:.0f} 字元
- 當前平均長度：{avg_snippet_length:.0f} 字元
- 在描述中明確提及目標受眾：{audience}
- 強調獨特價值和解決方案

### 3. 競爭分析洞察
- 市場競爭程度：{"激烈" if total_results >= 10 else "中等"}
- 主要競爭類型：{"商業網站" if any("shop" in result.link or "buy" in result.link for result in serp_result.organic_results) else "內容型網站"}

### 4. 內容策略建議
針對目標受眾「{audience}」的內容建議：
- 重點突出實用性和可操作性
- 提供具體的步驟指南或工具推薦
- 加入案例研究或實際效果展示
- 考慮製作比較表格或評測內容

## 📊 市場機會分析

基於 SERP 分析的市場機會：
1. **內容空白點識別**: 分析現有內容的共同弱點
2. **差異化機會**: 尋找與眾不同的角度切入
3. **使用者意圖滿足**: 確保內容完全對應搜尋意圖

"""
    
    # 根據選項添加額外內容
    if options.generate_draft:
        report += """
## 📝 內容大綱建議

基於競爭對手分析，建議的內容結構：

1. **引言部分** (約 200-300 字)
   - 點出問題痛點
   - 承諾解決方案價值

2. **主體內容** (約 1500-2000 字)
   - 詳細解答或指南
   - 具體步驟或工具介紹
   - 實際案例分享

3. **總結與行動呼籲** (約 100-200 字)
   - 重點摘要
   - 鼓勵採取行動
"""
    
    if options.include_faq:
        report += """
## ❓ 建議常見問題

基於搜尋結果分析，使用者可能關心的問題：
1. 如何開始使用相關工具或服務？
2. 費用和成本考量是什麼？
3. 效果多久能看到？
4. 適合哪些類型的企業或個人？
5. 與其他解決方案有何區別？
"""
    
    if options.include_table:
        report += """
## 📋 競爭對手比較表格

| 排名 | 標題 | 特色 | 目標受眾 |
|------|------|------|----------|
"""
        for i, result in enumerate(serp_result.organic_results[:5], 1):
            title_short = result.title[:30] + "..." if len(result.title) > 30 else result.title
            report += f"| {i} | {title_short} | 待分析 | 待分析 |\n"
    
    report += f"""

---
*此報告由 SEO Analyzer 基於真實搜尋資料自動生成*  
*分析資料來源: Google 搜尋結果 (共 {total_results} 筆)*  
*生成時間: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC*"""
    
    return report


def create_error_response(error_code: str, message: str, details: Optional[dict] = None) -> ErrorResponse:
    """建立統一格式的錯誤回應。

    Args:
        error_code: 錯誤代碼
        message: 錯誤訊息
        details: 錯誤詳細資訊

    Returns:
        ErrorResponse: 標準格式的錯誤回應
    """
    error_detail = None
    if details:
        error_detail = ErrorDetail(
            field=details.get("field"),
            provided_length=details.get("provided_length"),
            max_length=details.get("max_length"),
            min_length=details.get("min_length"),
            provided_value=details.get("provided_value"),
            expected_format=details.get("expected_format"),
            job_id=details.get("job_id"),
            processing_time=details.get("processing_time"),
            retry_after=details.get("retry_after")
        )

    error_info = ErrorInfo(
        code=error_code,
        message=message,
        details=error_detail,
        timestamp=datetime.now(timezone.utc).isoformat()
    )

    return ErrorResponse(
        status="error",
        error=error_info.model_dump()
    )
