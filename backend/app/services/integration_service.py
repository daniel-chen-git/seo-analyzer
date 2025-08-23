"""整合服務模組。

此模組提供各個服務間的資料轉換、整合協調和統一錯誤處理功能。
負責將 SERP、爬蟲、AI 服務整合為完整的 SEO 分析流程。
"""

import time
from datetime import datetime, timezone
from typing import Dict, List

from ..models.request import AnalyzeRequest, AnalyzeOptions as RequestOptions
from ..models.response import (
    AnalyzeResponse, AnalysisData, SerpSummary, 
    AnalysisMetadata, ErrorResponse
)
from .serp_service import get_serp_service, SerpResult, SerpAPIException
from .scraper_service import get_scraper_service, ScrapingResult, ScraperException
from .ai_service import (
    get_ai_service, AnalysisOptions as AIOptions, AnalysisResult,
    AIServiceException, TokenLimitExceededException, AIAPIException
)


class IntegrationService:
    """整合服務類別。
    
    協調 SERP、爬蟲、AI 服務的完整分析流程，
    提供統一的資料轉換和錯誤處理機制。
    """

    def __init__(self):
        """初始化整合服務。"""
        self.serp_service = get_serp_service()
        self.scraper_service = get_scraper_service()
        self.ai_service = get_ai_service()
        
        # 效能監控配置
        self.performance_thresholds = {
            "serp_duration": 15.0,      # SERP 階段警告閾值
            "scraping_duration": 25.0,  # 爬蟲階段警告閾值
            "ai_duration": 35.0,        # AI 階段警告閾值
            "total_duration": 55.0      # 總時間警告閾值
        }
        
        # 錯誤映射配置
        self.error_mappings = {
            SerpAPIException: ("SERP_API_ERROR", 503),
            ScraperException: ("SCRAPER_TIMEOUT", 504),
            AIServiceException: ("AI_API_ERROR", 503),
            AIAPIException: ("AI_API_ERROR", 503),
            TokenLimitExceededException: ("AI_API_ERROR", 503),
            ValueError: ("INVALID_INPUT", 400),
            Exception: ("INTERNAL_ERROR", 500)
        }
    
    async def execute_full_analysis(self, request: AnalyzeRequest) -> AnalyzeResponse:
        """執行完整的 SEO 分析流程。
        
        整合 SERP 擷取、網頁爬取和 AI 分析，生成完整的分析報告。
        
        Args:
            request: SEO 分析請求
            
        Returns:
            AnalyzeResponse: 完整的分析結果
            
        Raises:
            各種服務相關例外
        """
        start_time = time.time()
        timer = PerformanceTimer()
        
        try:
            # 階段 1: SERP 資料擷取
            print(f"🔍 開始 SERP 資料擷取: {request.keyword}")
            timer.start_phase("serp")
            
            serp_data = await self.serp_service.search_keyword(
                keyword=request.keyword,
                num_results=10
            )
            
            timer.end_phase("serp")
            print(f"✅ SERP 擷取完成，取得 {len(serp_data.organic_results)} 個結果 "
                  f"({timer.get_phase_duration('serp'):.2f}s)")
            
            # 階段 2: 網頁內容爬取
            print("🕷️ 開始網頁內容爬取")
            timer.start_phase("scraping")
            
            urls = self._extract_urls_from_serp(serp_data)
            scraping_data = await self.scraper_service.scrape_urls(urls)
            
            timer.end_phase("scraping")
            success_rate = scraping_data.successful_scrapes / scraping_data.total_results
            print(f"✅ 網頁爬取完成，成功率 {success_rate:.1%} "
                  f"({scraping_data.successful_scrapes}/{scraping_data.total_results}) "
                  f"({timer.get_phase_duration('scraping'):.2f}s)")
            
            # 檢查爬取成功率
            if success_rate < 0.5:  # 低於 50% 則警告
                print(f"⚠️ 爬取成功率較低: {success_rate:.1%}")
            
            # 階段 3: AI 分析報告生成
            print("🤖 開始 AI 分析報告生成")
            timer.start_phase("ai")
            
            ai_options = self._convert_to_ai_options(request.options)
            analysis_result = await self.ai_service.analyze_seo_content(
                keyword=request.keyword,
                audience=request.audience,
                serp_data=serp_data,
                scraping_data=scraping_data,
                options=ai_options
            )
            
            timer.end_phase("ai")
            print(f"✅ AI 分析完成，使用 {analysis_result.token_usage} tokens "
                  f"({timer.get_phase_duration('ai'):.2f}s)")
            
            # 階段 4: 結果整合
            total_time = time.time() - start_time
            print(f"📋 整合分析結果，總耗時 {total_time:.2f}s")
            
            response = self._build_success_response(
                request=request,
                serp_data=serp_data,
                scraping_data=scraping_data,
                analysis_result=analysis_result,
                processing_time=total_time
            )
            
            # 效能警告檢查
            self._check_performance_warnings(timer)
            
            return response
            
        except Exception as e:
            processing_time = time.time() - start_time
            print(f"❌ 分析流程失敗: {str(e)} (耗時 {processing_time:.2f}s)")
            raise e  # 重新拋出例外，由上層處理
    
    def _extract_urls_from_serp(self, serp_data: SerpResult) -> List[str]:
        """從 SERP 資料中提取 URL 清單。
        
        Args:
            serp_data: SERP 搜尋結果
            
        Returns:
            List[str]: URL 清單
        """
        urls = []
        for result in serp_data.organic_results:
            if result.link and result.link.startswith(('http://', 'https://')):
                urls.append(result.link)
        
        print(f"📍 從 SERP 提取 {len(urls)} 個有效 URL")
        return urls
    
    def _convert_to_ai_options(self, request_options: RequestOptions) -> AIOptions:
        """轉換請求選項為 AI 服務選項。
        
        Args:
            request_options: 請求中的選項
            
        Returns:
            AIOptions: AI 服務選項
        """
        return AIOptions(
            generate_draft=request_options.generate_draft,
            include_faq=request_options.include_faq,
            include_table=request_options.include_table
        )
    
    def _build_success_response(
        self,
        request: AnalyzeRequest,
        serp_data: SerpResult,
        scraping_data: ScrapingResult,
        analysis_result: AnalysisResult,
        processing_time: float
    ) -> AnalyzeResponse:
        """建立成功回應。
        
        Args:
            request: 原始請求
            serp_data: SERP 資料
            scraping_data: 爬蟲資料
            analysis_result: AI 分析結果
            processing_time: 總處理時間
            
        Returns:
            AnalyzeResponse: 完整的成功回應
        """
        # 建立 SERP 摘要
        serp_summary = SerpSummary(
            total_results=scraping_data.total_results,
            successful_scrapes=scraping_data.successful_scrapes,
            avg_word_count=scraping_data.avg_word_count,
            avg_paragraphs=scraping_data.avg_paragraphs
        )
        
        # 建立分析元資料
        metadata = AnalysisMetadata(
            keyword=request.keyword,
            audience=request.audience,
            generated_at=datetime.now(timezone.utc).isoformat(),
            token_usage=analysis_result.token_usage
        )
        
        # 建立分析資料
        data = AnalysisData(
            serp_summary=serp_summary,
            analysis_report=analysis_result.analysis_report,
            metadata=metadata
        )
        
        # 建立完整回應
        return AnalyzeResponse(
            status="success",
            processing_time=processing_time,
            data=data
        )
    
    def handle_analysis_error(
        self, 
        error: Exception, 
        processing_time: float
    ) -> tuple[ErrorResponse, int]:
        """處理分析過程中的錯誤。
        
        Args:
            error: 發生的例外
            processing_time: 處理時間
            
        Returns:
            tuple: (ErrorResponse, HTTP狀態碼)
        """
        # 根據例外類型決定錯誤碼和狀態碼
        error_code, status_code = self._get_error_mapping(error)
        
        # 建立錯誤回應
        error_response = ErrorResponse(
            status="error",
            error={
                "code": error_code,
                "message": str(error),
                "details": {
                    "error_type": type(error).__name__,
                    "processing_time": processing_time
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
        
        print(f"🚨 錯誤處理: {error_code} ({status_code}) - {str(error)}")
        
        return error_response, status_code
    
    def _get_error_mapping(self, error: Exception) -> tuple[str, int]:
        """取得錯誤映射。
        
        Args:
            error: 例外物件
            
        Returns:
            tuple: (錯誤碼, HTTP狀態碼)
        """
        # 遍歷錯誤映射，找到最匹配的類型
        for error_type, (code, status) in self.error_mappings.items():
            if isinstance(error, error_type):
                return code, status
        
        # 預設錯誤
        return "INTERNAL_ERROR", 500
    
    def _check_performance_warnings(self, timer: 'PerformanceTimer') -> None:
        """檢查效能警告。
        
        Args:
            timer: 效能計時器
        """
        timings = timer.get_all_timings()
        
        for phase, duration in timings.items():
            if phase.endswith('_duration'):
                phase_name = phase.replace('_duration', '')
                threshold = self.performance_thresholds.get(phase, float('inf'))
                
                if duration > threshold:
                    print(f"⚠️ 效能警告: {phase_name} 階段耗時 {duration:.2f}s "
                          f"(超過 {threshold}s 閾值)")


class PerformanceTimer:
    """效能計時器。
    
    用於監控各個處理階段的執行時間。
    """
    
    def __init__(self):
        """初始化計時器。"""
        self.timings = {}
    
    def start_phase(self, phase_name: str) -> None:
        """開始計時特定階段。
        
        Args:
            phase_name: 階段名稱
        """
        self.timings[f"{phase_name}_start"] = time.time()
    
    def end_phase(self, phase_name: str) -> None:
        """結束計時特定階段。
        
        Args:
            phase_name: 階段名稱
        """
        start_key = f"{phase_name}_start"
        duration_key = f"{phase_name}_duration"
        
        if start_key in self.timings:
            start_time = self.timings[start_key]
            self.timings[duration_key] = time.time() - start_time
    
    def get_phase_duration(self, phase_name: str) -> float:
        """取得特定階段的持續時間。
        
        Args:
            phase_name: 階段名稱
            
        Returns:
            float: 持續時間（秒）
        """
        return self.timings.get(f"{phase_name}_duration", 0.0)
    
    def get_all_timings(self) -> Dict[str, float]:
        """取得所有計時資訊。
        
        Returns:
            Dict[str, float]: 所有計時資訊
        """
        return {k: v for k, v in self.timings.items() if k.endswith('_duration')}
    
    def get_summary(self) -> Dict[str, float]:
        """取得計時摘要。
        
        Returns:
            Dict[str, float]: 計時摘要
        """
        duration_timings = self.get_all_timings()
        total_duration = sum(duration_timings.values())
        
        return {
            **duration_timings,
            "total_duration": total_duration
        }


# 全域服務實例
_integration_service = None


def get_integration_service() -> IntegrationService:
    """取得整合服務的全域實例。
    
    實作單例模式，確保整個應用程式使用同一個服務實例。
    
    Returns:
        IntegrationService: 整合服務實例
    """
    global _integration_service
    if _integration_service is None:
        _integration_service = IntegrationService()
    return _integration_service