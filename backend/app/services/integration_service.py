"""整合服務模組。

此模組提供各個服務間的資料轉換、整合協調和統一錯誤處理功能。
負責將 SERP、爬蟲、AI 服務整合為完整的 SEO 分析流程。
"""

import time
import os
import json
import hashlib
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
        
        # 快取設定 - 使用當前檔案的相對路徑
        self.cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
    
    def _get_cache_file_path(self, keyword: str) -> str:
        """生成基於關鍵字 hash 的快取檔案路徑。
        
        Args:
            keyword: 搜尋關鍵字
            
        Returns:
            str: 快取檔案的完整路徑
        """
        # 生成關鍵字的 hash 值
        keyword_hash = hashlib.md5(keyword.encode('utf-8')).hexdigest()[:8]
        filename = f"analysis_result_{keyword_hash}.json"
        return os.path.join(self.cache_dir, filename)
    
    def _load_cached_result(self, keyword: str) -> Optional[AnalysisResult]:
        """從快取檔案載入分析結果。
        
        支援向後相容：自動為舊版快取檔案補充缺失的 status 欄位。
        
        Args:
            keyword: 搜尋關鍵字
            
        Returns:
            Optional[AnalysisResult]: 快取的分析結果，如果不存在則返回 None
        """
        cache_file = self._get_cache_file_path(keyword)
        
        if not os.path.exists(cache_file):
            print(f"📂 快取檔案不存在: {cache_file}")
            return None
        
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            # 向後相容：為舊版快取檔案自動補充 status 欄位
            if 'status' not in cache_data:
                cache_data['status'] = 'success'
                print(f"🔄 為舊版快取檔案補充 status 欄位: {cache_file}")
                
                # 更新快取檔案以包含 status 欄位
                try:
                    with open(cache_file, 'w', encoding='utf-8') as f:
                        json.dump(cache_data, f, ensure_ascii=False, indent=2)
                    print(f"💾 已更新快取檔案格式: {cache_file}")
                except Exception as update_error:
                    print(f"⚠️ 快取檔案格式更新失敗（不影響載入）: {update_error}")
            
            print(f"📂 從快取載入分析結果（雙欄位格式）: {cache_file}")
            
            # 重建 AnalysisResult 物件（只需要業務資料）
            return AnalysisResult(
                analysis_report=cache_data['analysis_report'],
                token_usage=cache_data['token_usage'],
                processing_time=cache_data['processing_time'],
                success=cache_data['success']
            )
            
        except (json.JSONDecodeError, KeyError, FileNotFoundError) as e:
            print(f"❌ 快取檔案讀取失敗: {e}")
            return None
    
    def _save_result_to_cache(self, keyword: str, analysis_result: AnalysisResult) -> None:
        """將分析結果儲存到快取檔案（雙欄位格式）。
        
        快取檔案採用與 AnalyzeResponse 一致的扁平結構，包含雙狀態欄位：
        - status: 固定為 "success"，保持與 API 回應格式一致
        - success: 來自 analysis_result.success，反映業務處理結果
        
        Args:
            keyword: 搜尋關鍵字
            analysis_result: 要儲存的分析結果
        """
        cache_file = self._get_cache_file_path(keyword)
        
        try:
            # 準備要儲存的資料（雙欄位格式，與 AnalyzeResponse 一致）
            cache_data = {
                # API 契約欄位：與回應格式保持一致
                'status': 'success',
                
                # 核心業務資料
                'analysis_report': analysis_result.analysis_report,
                'token_usage': analysis_result.token_usage,
                'processing_time': analysis_result.processing_time,
                # 業務狀態欄位：反映實際處理結果
                'success': analysis_result.success,
                'cached_at': datetime.now(timezone.utc).isoformat(),
                'keyword': keyword
            }
            
            # 確保目錄存在
            os.makedirs(self.cache_dir, exist_ok=True)
            
            # 寫入檔案
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
            print(f"💾 分析結果已儲存到快取（雙欄位格式）: {cache_file}")
            
        except Exception as e:
            print(f"❌ 快取檔案寫入失敗: {e}")
            # 不拋出例外，讓主流程繼續
    
    def _load_cached_response(self, keyword: str) -> Optional[AnalyzeResponse]:
        """從快取檔案直接載入並轉換為 AnalyzeResponse。
        
        用於快取命中的情況，直接返回完整的回應物件。
        自動處理向後相容和 status 欄位補充。
        
        Args:
            keyword: 搜尋關鍵字
            
        Returns:
            Optional[AnalyzeResponse]: 完整的快取回應，如果不存在則返回 None
        """
        cache_file = self._get_cache_file_path(keyword)
        
        if not os.path.exists(cache_file):
            return None
        
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            # 向後相容：為舊版快取檔案自動補充 status 欄位
            if 'status' not in cache_data:
                cache_data['status'] = 'success'
                print(f"🔄 快取回應補充 status 欄位: {cache_file}")
                
                # 更新快取檔案
                try:
                    with open(cache_file, 'w', encoding='utf-8') as f:
                        json.dump(cache_data, f, ensure_ascii=False, indent=2)
                except Exception:
                    pass  # 靜默處理更新失敗
            
            # 直接建構 AnalyzeResponse 物件（雙欄位格式）
            return AnalyzeResponse(
                status=cache_data['status'],  # API 契約欄位
                analysis_report=cache_data['analysis_report'],
                token_usage=cache_data['token_usage'],
                processing_time=cache_data['processing_time'],
                success=cache_data['success'],  # 業務狀態欄位
                cached_at=cache_data['cached_at'],
                keyword=cache_data['keyword']
            )
            
        except (json.JSONDecodeError, KeyError, FileNotFoundError) as e:
            print(f"❌ 快取回應載入失敗: {e}")
            return None
    
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
        """建立成功回應（雙欄位設計）。
        
        雙欄位設計說明：
        - status: 固定為 "success"，維護 API 契約和前端相容性
        - success: 來自 analysis_result.success，反映業務層實際處理結果
        
        Args:
            request: 原始請求
            serp_data: SERP 資料
            scraping_data: 爬蟲資料  
            analysis_result: AI 分析結果（包含業務成功狀態）
            processing_time: 總處理時間
            timer: 效能計時器（可選）
            
        Returns:
            AnalyzeResponse: 完整的成功回應（包含雙狀態欄位）
        """
        # 建立扁平結構回應（雙欄位設計）
        return AnalyzeResponse(
            # API 契約欄位：固定為 "success"，維護前端 response.status === "success" 判斷
            status="success",
            
            # 核心業務資料
            analysis_report=analysis_result.analysis_report,
            token_usage=analysis_result.token_usage,
            processing_time=processing_time,
            # 業務狀態欄位：直接反映 AI 服務層的實際處理結果
            success=analysis_result.success,
            cached_at=datetime.now(timezone.utc).isoformat(),
            keyword=request.keyword
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
            
            # 嘗試從快取載入分析結果
            analysis_result = self._load_cached_result(request.keyword)
            
            if analysis_result is None:
                # 快取不存在，執行實際的 AI 分析
                print("🤖 執行 AI 分析（未找到快取）")
                analysis_result = await self.ai_service.analyze_seo_content(
                    keyword=request.keyword,
                    audience=request.audience,
                    serp_data=serp_data,
                    scraping_data=scraping_data,
                    options=ai_options
                )
                
                # 將結果儲存到快取
                self._save_result_to_cache(request.keyword, analysis_result)
            else:
                # 使用快取的結果
                print("📂 使用快取的 AI 分析結果")

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