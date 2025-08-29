"""整合服務模組。

此模組提供各個服務間的資料轉換、整合協調和統一錯誤處理功能。
負責將 SERP、爬蟲、AI 服務整合為完整的 SEO 分析流程。
"""

import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

from .job_manager import JobManager

from ..models.request import AnalyzeRequest, AnalyzeOptions as RequestOptions
from ..models.response import (
    AnalyzeResponse, AnalysisData, SerpSummary, 
    AnalysisMetadata
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
            
            # 印出 SERP 資料內容
            print("📋 SERP 擷取資料內容：")
            for i, result in enumerate(serp_data.organic_results, 1):
                print(f"  {i}. {result.title[:100]}{'...' if len(result.title) > 100 else ''}")
                print(f"     URL: {result.link}")
                if result.snippet:
                    print(f"     摘要: {result.snippet[:200]}{'...' if len(result.snippet) > 200 else ''}")
                print()
            
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
                processing_time=total_time,
                timer=timer
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
        processing_time: float,
        timer: Optional['PerformanceTimer'] = None
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
        
        # 建立分析元資料 (包含階段計時資訊)
        metadata_dict = {
            "keyword": request.keyword,
            "audience": request.audience,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "token_usage": analysis_result.token_usage
        }
        
        # 添加階段計時資訊 (如果有的話)
        if timer:
            phase_timings = timer.get_all_timings()
            if phase_timings:
                metadata_dict["phase_timings"] = phase_timings
                metadata_dict["total_phases_time"] = sum(phase_timings.values())
        
        metadata = AnalysisMetadata(**metadata_dict)
        
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

    async def execute_full_analysis_with_progress(
        self,
        request: AnalyzeRequest,
        job_manager: 'JobManager',
        job_id: str
    ) -> AnalyzeResponse:
        """執行完整分析流程並追蹤進度。

        此方法與 execute_full_analysis 相同，但會更新任務進度。

        Args:
            request: SEO 分析請求
            job_manager: 任務管理器
            job_id: 任務識別碼

        Returns:
            AnalyzeResponse: 完整的分析結果

        Raises:
            各種服務相關例外
        """
        start_time = time.time()
        timer = PerformanceTimer()

        try:
            # 階段 1: SERP 資料擷取
            job_manager.update_progress(
                job_id, 1, "正在擷取 SERP 資料...", 10.0
            )
            print(f"🔍 開始 SERP 資料擷取: {request.keyword}")
            timer.start_phase("serp")

            serp_data = await self.serp_service.search_keyword(
                keyword=request.keyword,
                num_results=10
            )

            timer.end_phase("serp")
            job_manager.update_progress(
                job_id, 1, "SERP 資料擷取完成", 30.0
            )
            print(f"✅ SERP 擷取完成，取得 {len(serp_data.organic_results)} 個結果 "
                  f"({timer.get_phase_duration('serp'):.2f}s)")
            
            # 印出 SERP 資料內容
            print("📋 SERP 擷取資料內容：")
            for i, result in enumerate(serp_data.organic_results, 1):
                print(f"  {i}. {result.title[:100]}{'...' if len(result.title) > 100 else ''}")
                print(f"     URL: {result.link}")
                if result.snippet:
                    print(f"     摘要: {result.snippet[:200]}{'...' if len(result.snippet) > 200 else ''}")
                print()

            # 階段 2: 網頁內容爬取
            job_manager.update_progress(
                job_id, 2, "正在爬取網頁內容...", 35.0
            )
            print("🕷️ 開始網頁內容爬取")
            timer.start_phase("scraping")

            scraping_data = await self.scraper_service.scrape_urls(
                urls=[result.link for result in serp_data.organic_results]
            )

            timer.end_phase("scraping")
            job_manager.update_progress(
                job_id, 2, "網頁爬取完成", 60.0
            )
            print(f"✅ 爬取完成，成功率 {scraping_data.successful_scrapes}/"
                  f"{scraping_data.total_results} "
                  f"({timer.get_phase_duration('scraping'):.2f}s)")

            # 階段 3: AI 分析
            job_manager.update_progress(
                job_id, 3, "正在進行 AI 分析...", 65.0
            )
            print("🤖 開始 AI 分析")
            timer.start_phase("ai")

            ai_options = self._convert_to_ai_options(request.options)
            
            # 暫時註解 AI 分析以便測試進度顯示功能
            # analysis_result = await self.ai_service.analyze_seo_content(
            #     serp_data=serp_data,
            #     scraping_data=scraping_data,
            #     keyword=request.keyword,
            #     audience=request.audience,
            #     options=ai_options
            # )
            
            # 使用模擬的 AI 分析結果進行測試
            from ..services.ai_service import AnalysisResult
            import asyncio
            
            # 模擬 AI 處理時間（5秒）
            print("🤖 模擬 AI 分析處理中...")
            await asyncio.sleep(5)
            
            analysis_result = AnalysisResult(
                analysis_report=f"""# SEO 分析報告

## 關鍵字分析：{request.keyword}
目標受眾：{request.audience}

### SERP 分析結果
- 共找到 {len(serp_data.organic_results)} 個搜尋結果
- 網頁爬取成功 {scraping_data.successful_scrapes} 個頁面

### 模擬分析建議
1. **內容優化建議**
   - 針對關鍵字 "{request.keyword}" 優化標題和內容
   - 提升內容相關性和權威性

2. **技術優化建議**  
   - 改善頁面載入速度
   - 優化行動裝置體驗

*（此為測試模式的模擬報告）*
""",
                token_usage=1500,  # 模擬 token 使用量
                processing_time=5.0,  # 模擬處理時間
                success=True
            )

            timer.end_phase("ai")
            job_manager.update_progress(
                job_id, 3, "AI 分析完成", 95.0
            )
            print(f"✅ AI 分析完成，使用 {analysis_result.token_usage} tokens "
                  f"({timer.get_phase_duration('ai'):.2f}s)")

            # 建構回應
            processing_time = time.time() - start_time
            response = self._build_success_response(
                request=request,
                serp_data=serp_data,
                scraping_data=scraping_data,
                analysis_result=analysis_result,
                processing_time=processing_time,
                timer=timer
            )

            # 檢查效能警告
            self._check_performance_warnings(timer)

            job_manager.update_progress(
                job_id, 3, "分析完成", 100.0
            )
            return response

        except Exception as e:
            # 任務失敗時更新狀態
            job_manager.fail_job(job_id, str(e))
            raise


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