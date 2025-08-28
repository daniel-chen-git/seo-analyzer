"""C2.4 系統韌性和高級錯誤恢復機制測試。

此模組測試系統在各種極端條件下的韌性表現，
驗證高級錯誤恢復機制、資源回收、狀態一致性和災難恢復能力。

符合 Phase 2 C2.4 系統韌性測試要求:
- 系統極限條件下的穩定性測試
- 高級錯誤恢復和重試機制
- 資源洩漏檢測和自動回收
- 狀態一致性和資料完整性保護
- 災難恢復和優雅降級機制
"""

import asyncio
import time
from typing import Dict, Any, List, Optional
from unittest.mock import AsyncMock, patch, Mock, MagicMock
from concurrent.futures import ThreadPoolExecutor
import gc
import sys

import pytest

from app.services.integration_service import IntegrationService, PerformanceTimer
from app.models.request import AnalyzeRequest, AnalyzeOptions
from app.models.response import AnalyzeResponse
from app.services.serp_service import (
    SerpResult, OrganicResult, SerpAPIException, RateLimitException
)
from app.services.scraper_service import (
    ScrapingResult, PageContent, ScraperException, ScraperTimeoutException
)
from app.services.ai_service import (
    AnalysisResult, AnalysisOptions, 
    AIServiceException, TokenLimitExceededException, AIAPIException, AITimeoutException
)


class TestSystemResilienceAndRecovery:
    """測試系統韌性和高級錯誤恢復機制。
    
    驗證系統在極端條件下的穩定性，
    確保高級錯誤恢復、資源管理和災難恢復機制。
    """
    
    @pytest.fixture
    def stress_analyze_request(self) -> AnalyzeRequest:
        """建立壓力測試請求。"""
        return AnalyzeRequest(
            keyword="系統韌性壓力測試關鍵字",
            audience="高負載測試用戶",
            options=AnalyzeOptions(
                generate_draft=True,
                include_faq=True,
                include_table=True
            )
        )
    
    @pytest.mark.asyncio
    async def test_cascading_failure_recovery(self, stress_analyze_request):
        """測試級聯失敗的恢復機制。"""
        failure_count = 0
        
        async def failing_serp_service(*args, **kwargs):
            nonlocal failure_count
            failure_count += 1
            if failure_count <= 2:  # 前兩次失敗
                raise SerpAPIException(f"API 暫時失敗 #{failure_count}")
            # 第三次成功
            return SerpResult(
                keyword="系統韌性壓力測試關鍵字",
                total_results=100,
                organic_results=[
                    OrganicResult(1, "恢復測試", "https://recovery-test.com", "系統恢復測試")
                ]
            )
        
        async def failing_scraper_service(*args, **kwargs):
            if failure_count <= 3:  # SERP 失敗時也失敗
                raise ScraperTimeoutException("爬蟲服務連鎖失敗")
            return ScrapingResult(
                total_results=1,
                successful_scrapes=1,
                avg_word_count=1000,
                avg_paragraphs=6,
                pages=[PageContent("https://recovery-test.com", ["恢復內容"], success=True)],
                errors=[]
            )
        
        async def failing_ai_service(*args, **kwargs):
            if failure_count <= 4:  # 前面都失敗時也失敗
                raise AITimeoutException("AI 服務連鎖失敗")
            return AnalysisResult(
                analysis_report="# 系統恢復分析報告\n\n經過多次重試後成功恢復...",
                token_usage=2000,
                processing_time=5.0,
                success=True
            )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = failing_serp_service
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = failing_scraper_service
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content = failing_ai_service
            mock_ai.return_value = mock_ai_service
            
            # 測試級聯失敗恢復
            integration_service = IntegrationService()
            
            # 應該經過多次重試最終成功
            retry_count = 0
            max_retries = 5
            
            while retry_count < max_retries:
                try:
                    response = await integration_service.execute_full_analysis(stress_analyze_request)
                    # 最終成功
                    assert response.status == "success"
                    assert "系統恢復分析報告" in response.data.analysis_report
                    break
                except (SerpAPIException, ScraperTimeoutException, AITimeoutException):
                    retry_count += 1
                    await asyncio.sleep(0.1)  # 短暫等待重試
                    continue
            
            # 驗證最終恢復成功
            assert retry_count < max_retries, "系統未能從級聯失敗中恢復"
            assert failure_count >= 3, "重試機制未正常工作"
    
    @pytest.mark.asyncio 
    async def test_resource_leak_detection_and_cleanup(self):
        """測試資源洩漏檢測和自動清理。"""
        initial_object_count = len(gc.get_objects())
        
        # 模擬大量物件建立和資源使用
        large_requests = [
            AnalyzeRequest(
                keyword=f"資源洩漏測試 {i}",
                audience=f"測試用戶 {i}",
                options=AnalyzeOptions(generate_draft=True, include_faq=True, include_table=True)
            )
            for i in range(50)
        ]
        
        # 模擬記憶體密集的服務回應
        def create_large_mock_data(index):
            # 建立大量資料模擬記憶體使用
            large_content = "大量測試內容 " * 1000  # 約 10KB 每個
            
            serp_data = SerpResult(
                keyword=f"資源洩漏測試 {index}",
                total_results=100000,
                organic_results=[
                    OrganicResult(j, f"結果{j}", f"https://test-{index}-{j}.com", large_content[:200])
                    for j in range(1, 21)  # 20個結果
                ]
            )
            
            scraping_data = ScrapingResult(
                total_results=20,
                successful_scrapes=18,
                avg_word_count=5000,
                avg_paragraphs=40,
                pages=[
                    PageContent(
                        f"https://test-{index}-{k}.com", 
                        [f"標題{k}"] * 10, 
                        title=f"大型頁面{k}",
                        success=True,
                        word_count=5000
                    ) for k in range(1, 19)
                ],
                errors=[]
            )
            
            analysis_result = AnalysisResult(
                analysis_report=f"# 大型分析報告 {index}\n\n" + large_content * 5,  # 約 50KB 報告
                token_usage=8000,
                processing_time=15.0,
                success=True
            )
            
            return serp_data, scraping_data, analysis_result
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            async def mock_serp_with_cleanup(keyword, num_results=10):
                index = keyword.split()[-1]
                serp_data, _, _ = create_large_mock_data(index)
                await asyncio.sleep(0.001)  # 模擬處理時間
                return serp_data
            
            async def mock_scraper_with_cleanup(urls):
                index = urls[0].split('-')[-2]
                _, scraping_data, _ = create_large_mock_data(index)
                await asyncio.sleep(0.002)  # 模擬處理時間
                return scraping_data
            
            async def mock_ai_with_cleanup(**kwargs):
                keyword = kwargs['keyword']
                index = keyword.split()[-1]
                _, _, analysis_result = create_large_mock_data(index)
                await asyncio.sleep(0.001)  # 模擬處理時間
                return analysis_result
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = mock_serp_with_cleanup
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = mock_scraper_with_cleanup
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content = mock_ai_with_cleanup
            mock_ai.return_value = mock_ai_service
            
            # 執行大量分析請求
            integration_service = IntegrationService()
            successful_analyses = 0
            
            for request in large_requests:
                try:
                    response = await integration_service.execute_full_analysis(request)
                    if response.status == "success":
                        successful_analyses += 1
                    
                    # 定期檢查記憶體使用
                    if successful_analyses % 10 == 0:
                        gc.collect()  # 強制垃圾收集
                        current_objects = len(gc.get_objects())
                        
                        # 記憶體增長應該在合理範圍內
                        growth_ratio = current_objects / initial_object_count
                        assert growth_ratio < 10.0, f"記憶體增長過度: {growth_ratio:.2f}x"
                    
                except Exception as e:
                    print(f"分析失敗: {e}")
                    continue
            
            # 最終記憶體檢查
            gc.collect()
            final_object_count = len(gc.get_objects())
            final_growth = final_object_count / initial_object_count
            
            # 驗證資源管理
            assert successful_analyses >= 40, f"成功分析數量不足: {successful_analyses}/50"
            assert final_growth < 15.0, f"最終記憶體洩漏過度: {final_growth:.2f}x"
    
    @pytest.mark.asyncio
    async def test_state_consistency_under_concurrent_failures(self):
        """測試併發失敗情況下的狀態一致性。"""
        
        # 狀態追蹤
        service_states = {
            "serp_calls": 0,
            "scraper_calls": 0, 
            "ai_calls": 0,
            "successful_completions": 0,
            "failed_operations": 0
        }
        
        async def stateful_serp_service(keyword, num_results=10):
            service_states["serp_calls"] += 1
            # 模擬隨機失敗
            if service_states["serp_calls"] % 3 == 0:
                service_states["failed_operations"] += 1
                raise SerpAPIException(f"SERP 狀態失敗 #{service_states['serp_calls']}")
            
            return SerpResult(
                keyword=keyword,
                total_results=1000,
                organic_results=[
                    OrganicResult(1, f"狀態測試 {service_states['serp_calls']}", 
                                "https://state-test.com", "狀態一致性測試")
                ]
            )
        
        async def stateful_scraper_service(urls):
            service_states["scraper_calls"] += 1
            # 模擬狀態依賴失敗
            if service_states["scraper_calls"] % 4 == 0:
                service_states["failed_operations"] += 1
                raise ScraperTimeoutException(f"爬蟲狀態失敗 #{service_states['scraper_calls']}")
            
            return ScrapingResult(
                total_results=1,
                successful_scrapes=1,
                avg_word_count=800,
                avg_paragraphs=5,
                pages=[PageContent("https://state-test.com", [f"狀態內容 {service_states['scraper_calls']}"], success=True)],
                errors=[]
            )
        
        async def stateful_ai_service(**kwargs):
            service_states["ai_calls"] += 1
            # 模擬狀態相關失敗
            if service_states["ai_calls"] % 5 == 0:
                service_states["failed_operations"] += 1
                raise TokenLimitExceededException(f"AI 狀態失敗 #{service_states['ai_calls']}")
            
            service_states["successful_completions"] += 1
            return AnalysisResult(
                analysis_report=f"# 狀態一致性報告 {service_states['ai_calls']}\n\n狀態追蹤: {service_states}",
                token_usage=3000,
                processing_time=8.0,
                success=True
            )
        
        # 建立併發請求
        concurrent_requests = [
            AnalyzeRequest(
                keyword=f"併發狀態測試 {i}",
                audience=f"併發用戶 {i}",
                options=AnalyzeOptions(generate_draft=False, include_faq=False, include_table=False)
            )
            for i in range(20)
        ]
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = stateful_serp_service
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = stateful_scraper_service
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content = stateful_ai_service
            mock_ai.return_value = mock_ai_service
            
            # 併發執行分析
            integration_service = IntegrationService()
            
            async def analyze_with_error_handling(request):
                try:
                    return await integration_service.execute_full_analysis(request)
                except Exception as e:
                    return {"error": str(e), "request": request.keyword}
            
            # 併發執行所有請求
            results = await asyncio.gather(
                *[analyze_with_error_handling(req) for req in concurrent_requests],
                return_exceptions=True
            )
            
            # 分析結果和狀態一致性
            successful_results = [r for r in results if isinstance(r, AnalyzeResponse) and r.status == "success"]
            error_results = [r for r in results if not isinstance(r, AnalyzeResponse)]
            
            # 驗證狀態一致性（允許一些差異因為併發執行）
            completion_diff = abs(service_states["successful_completions"] - len(successful_results))
            assert completion_diff <= 2, f"成功完成數量差異過大: {completion_diff}"
            
            # 驗證併發處理下的基本功能
            assert len(successful_results) >= 10, f"成功結果太少: {len(successful_results)}/20"
            assert service_states["failed_operations"] > 0, "沒有觸發失敗場景"
            
            # 驗證狀態追蹤的準確性
            total_expected_calls = service_states["serp_calls"] + service_states["scraper_calls"] + service_states["ai_calls"]
            assert total_expected_calls > 20, "服務調用次數異常"
            
            # 檢查每個成功結果的狀態資訊（如果有的話）
            for result in successful_results:
                if hasattr(result.data, 'analysis_report') and result.data.analysis_report:
                    assert "狀態追蹤" in result.data.analysis_report or "狀態一致性報告" in result.data.analysis_report
    
    @pytest.mark.asyncio
    async def test_graceful_degradation_mechanisms(self):
        """測試優雅降級機制。"""
        
        degradation_scenarios = [
            "serp_partial_failure",
            "scraper_majority_failure", 
            "ai_quality_degradation"
        ]
        
        for scenario in degradation_scenarios:
            if scenario == "serp_partial_failure":
                # SERP 部分失敗 - 結果數量減少但仍可運作
                async def degraded_serp_service(keyword, num_results=10):
                    return SerpResult(
                        keyword=keyword,
                        total_results=500,  # 低於正常水準
                        organic_results=[
                            OrganicResult(i, f"降級結果{i}", f"https://degraded-{i}.com", f"降級內容{i}")
                            for i in range(1, 4)  # 只有3個結果而非10個
                        ]
                    )
                
                async def normal_scraper_service(urls):
                    return ScrapingResult(
                        total_results=len(urls),
                        successful_scrapes=min(2, len(urls)),  # 降級但仍有結果
                        avg_word_count=1200,
                        avg_paragraphs=8,
                        pages=[
                            PageContent(urls[0], ["降級內容1"], success=True),
                            PageContent(urls[1] if len(urls) > 1 else urls[0], ["降級內容2"], success=True)
                        ],
                        errors=[]
                    )
                
                async def adaptive_ai_service(**kwargs):
                    return AnalysisResult(
                        analysis_report="# 降級分析報告\n\n**注意**: 由於 SERP 數據有限，本分析基於有限資源進行。\n\n基於可用的2個頁面進行分析...",
                        token_usage=2000,  # 較低的 token 使用量
                        processing_time=6.0,
                        success=True
                    )
                
            elif scenario == "scraper_majority_failure":
                # 爬蟲大部分失敗但 AI 能適應
                async def normal_serp_service(keyword, num_results=10):
                    return SerpResult(
                        keyword=keyword,
                        total_results=5000,
                        organic_results=[
                            OrganicResult(i, f"正常結果{i}", f"https://normal-{i}.com", f"正常內容{i}")
                            for i in range(1, 11)
                        ]
                    )
                
                async def degraded_scraper_service(urls):
                    return ScrapingResult(
                        total_results=len(urls),
                        successful_scrapes=1,  # 大部分失敗
                        avg_word_count=600,  # 品質下降
                        avg_paragraphs=3,
                        pages=[
                            PageContent(urls[0], ["僅存內容"], success=True, word_count=600)
                        ] + [
                            PageContent(url, [], success=False, error="爬取失敗")
                            for url in urls[1:]
                        ],
                        errors=[{"url": url, "error": "爬取失敗", "error_type": "GeneralError"} for url in urls[1:]]
                    )
                
                async def adaptive_ai_service(**kwargs):
                    return AnalysisResult(
                        analysis_report="# 有限數據分析報告\n\n**資料限制警告**: 由於大部分頁面爬取失敗，僅基於1個頁面進行分析。\n\n建議後續補充更多數據源...",
                        token_usage=1500,
                        processing_time=4.0,
                        success=True
                    )
                
            else:  # ai_quality_degradation
                # AI 品質降級但仍提供基本分析
                async def normal_serp_service(keyword, num_results=10):
                    return SerpResult(
                        keyword=keyword,
                        total_results=8000,
                        organic_results=[
                            OrganicResult(i, f"高品質結果{i}", f"https://quality-{i}.com", f"高品質內容{i}")
                            for i in range(1, 11)
                        ]
                    )
                
                async def normal_scraper_service(urls):
                    return ScrapingResult(
                        total_results=len(urls),
                        successful_scrapes=8,
                        avg_word_count=3500,
                        avg_paragraphs=25,
                        pages=[
                            PageContent(f"https://quality-{i}.com", [f"高品質內容{i}"], 
                                      success=True, word_count=3500)
                            for i in range(1, 9)
                        ],
                        errors=[]
                    )
                
                async def degraded_ai_service(**kwargs):
                    return AnalysisResult(
                        analysis_report="# 基本分析報告\n\n**品質提示**: AI 服務當前處於降級模式，提供基本分析功能。\n\n## 簡化分析結果\n- 關鍵字相關性: 高\n- 競爭程度: 中等\n- 建議: 基本SEO優化策略\n\n*詳細分析功能暫時不可用*",
                        token_usage=800,  # 大幅減少
                        processing_time=2.0,
                        success=True
                    )
            
            # 設定對應的模擬服務
            if scenario == "serp_partial_failure":
                serp_func, scraper_func, ai_func = degraded_serp_service, normal_scraper_service, adaptive_ai_service
            elif scenario == "scraper_majority_failure":
                serp_func, scraper_func, ai_func = normal_serp_service, degraded_scraper_service, adaptive_ai_service
            else:
                serp_func, scraper_func, ai_func = normal_serp_service, normal_scraper_service, degraded_ai_service
            
            with patch('app.services.integration_service.get_serp_service') as mock_serp, \
                 patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
                 patch('app.services.integration_service.get_ai_service') as mock_ai:
                
                mock_serp_service = AsyncMock()
                mock_serp_service.search_keyword = serp_func
                mock_serp.return_value = mock_serp_service
                
                mock_scraper_service = AsyncMock() 
                mock_scraper_service.scrape_urls = scraper_func
                mock_scraper.return_value = mock_scraper_service
                
                mock_ai_service = AsyncMock()
                mock_ai_service.analyze_seo_content = ai_func
                mock_ai.return_value = mock_ai_service
                
                # 測試降級場景
                test_request = AnalyzeRequest(
                    keyword=f"降級測試-{scenario}",
                    audience="降級場景用戶",
                    options=AnalyzeOptions(generate_draft=True, include_faq=False, include_table=False)
                )
                
                integration_service = IntegrationService()
                response = await integration_service.execute_full_analysis(test_request)
                
                # 驗證降級機制
                assert response.status == "success", f"{scenario} 降級失敗"
                
                if scenario == "serp_partial_failure":
                    assert "降級分析報告" in response.data.analysis_report
                    assert "SERP 數據有限" in response.data.analysis_report
                elif scenario == "scraper_majority_failure":
                    assert "有限數據分析報告" in response.data.analysis_report
                    assert "資料限制警告" in response.data.analysis_report
                else:  # ai_quality_degradation
                    assert "基本分析報告" in response.data.analysis_report
                    assert "降級模式" in response.data.analysis_report
    
    @pytest.mark.asyncio
    async def test_disaster_recovery_simulation(self):
        """測試災難恢復情境模擬。"""
        
        disaster_scenarios = [
            "total_service_outage",
            "database_corruption_simulation",
            "network_partition_tolerance"
        ]
        
        for disaster_type in disaster_scenarios:
            
            if disaster_type == "total_service_outage":
                # 模擬所有服務同時停機
                async def outage_serp_service(*args, **kwargs):
                    raise SerpAPIException("服務完全停機 - 所有SERP服務不可用")
                
                async def outage_scraper_service(*args, **kwargs):
                    raise ScraperTimeoutException("服務完全停機 - 所有爬蟲服務不可用")
                
                async def outage_ai_service(*args, **kwargs):
                    raise AIAPIException("服務完全停機 - 所有AI服務不可用")
                
                serp_func, scraper_func, ai_func = outage_serp_service, outage_scraper_service, outage_ai_service
                expected_exception = (SerpAPIException, ScraperTimeoutException, AIAPIException)
                
            elif disaster_type == "database_corruption_simulation":
                # 模擬數據損壞導致的異常回應
                async def corrupted_serp_service(*args, **kwargs):
                    # 返回損壞的數據結構
                    return SerpResult(
                        keyword="",  # 損壞的關鍵字
                        total_results=-1,  # 無效數值
                        organic_results=[]  # 空結果
                    )
                
                async def corrupted_scraper_service(*args, **kwargs):
                    return ScrapingResult(
                        total_results=10,
                        successful_scrapes=0,  # 修正為有效數值
                        avg_word_count=0,
                        avg_paragraphs=0,
                        pages=[],
                        errors=[{"url": "corrupted", "error": "數據損壞", "error_type": "DataCorruption"}]
                    )
                
                async def corrupted_ai_service(*args, **kwargs):
                    return AnalysisResult(
                        analysis_report="",  # 空報告
                        token_usage=0,  # 修正為有效數值
                        processing_time=0.0,  # 修正為有效數值
                        success=False  # 無效狀態
                    )
                
                serp_func, scraper_func, ai_func = corrupted_serp_service, corrupted_scraper_service, corrupted_ai_service
                expected_exception = Exception  # 各種資料驗證錯誤
                
            else:  # network_partition_tolerance
                # 模擬網路分區情況
                partition_counter = 0
                
                async def partitioned_serp_service(*args, **kwargs):
                    nonlocal partition_counter
                    partition_counter += 1
                    if partition_counter <= 2:  # 減少失敗次數避免測試超時
                        await asyncio.sleep(1)  # 減少等待時間
                        raise SerpAPIException("網路分區 - SERP服務無法連線")
                    # 第3次嘗試成功
                    return SerpResult(
                        keyword="網路恢復測試",
                        total_results=100,
                        organic_results=[OrganicResult(1, "網路恢復", "https://recovery.com", "恢復測試")]
                    )
                
                async def partitioned_scraper_service(*args, **kwargs):
                    if partition_counter <= 3:  # 調整失敗次數
                        await asyncio.sleep(0.5)  # 減少延遲時間
                        raise ScraperTimeoutException("網路分區 - 爬蟲服務連線不穩定")
                    return ScrapingResult(
                        total_results=1,
                        successful_scrapes=1,
                        avg_word_count=800,
                        avg_paragraphs=5,
                        pages=[PageContent("https://recovery.com", ["恢復內容"], success=True)],
                        errors=[]
                    )
                
                async def partitioned_ai_service(*args, **kwargs):
                    if partition_counter <= 4:  # 調整失敗次數
                        await asyncio.sleep(0.3)  # 大幅減少延遲時間
                        raise AITimeoutException("網路分區 - AI服務回應超時")
                    return AnalysisResult(
                        analysis_report="# 網路恢復後分析\n\n系統已從網路分區中恢復...",
                        token_usage=2500,
                        processing_time=12.0,
                        success=True
                    )
                
                serp_func, scraper_func, ai_func = partitioned_serp_service, partitioned_scraper_service, partitioned_ai_service
                expected_exception = None  # 最終應該成功
            
            with patch('app.services.integration_service.get_serp_service') as mock_serp, \
                 patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
                 patch('app.services.integration_service.get_ai_service') as mock_ai:
                
                mock_serp_service = AsyncMock()
                mock_serp_service.search_keyword = serp_func
                mock_serp.return_value = mock_serp_service
                
                mock_scraper_service = AsyncMock()
                mock_scraper_service.scrape_urls = scraper_func
                mock_scraper.return_value = mock_scraper_service
                
                mock_ai_service = AsyncMock()
                mock_ai_service.analyze_seo_content = ai_func
                mock_ai.return_value = mock_ai_service
                
                # 測試災難恢復
                disaster_request = AnalyzeRequest(
                    keyword=f"災難恢復測試-{disaster_type}",
                    audience="災難恢復用戶",
                    options=AnalyzeOptions(generate_draft=False, include_faq=False, include_table=False)
                )
                
                integration_service = IntegrationService()
                
                if disaster_type == "network_partition_tolerance":
                    # 模擬多次重試直到網路恢復
                    max_retries = 5
                    retry_count = 0
                    last_exception = None
                    
                    while retry_count < max_retries:
                        try:
                            response = await integration_service.execute_full_analysis(disaster_request)
                            # 成功則跳出循環
                            assert response.status == "success"
                            assert "網路恢復後分析" in response.data.analysis_report
                            break
                        except (SerpAPIException, ScraperTimeoutException, AITimeoutException) as e:
                            last_exception = e
                            retry_count += 1
                            await asyncio.sleep(0.1)  # 短暫等待後重試
                    
                    # 驗證最終是否成功恢復
                    if retry_count >= max_retries:
                        pytest.fail(f"網路分區災難恢復失敗，重試 {max_retries} 次後仍未成功: {last_exception}")
                    
                    assert partition_counter >= 3, f"網路分區恢復機制測試不足: {partition_counter} 次調用"
                
                else:
                    # 其他災難情況應該正確處理失敗
                    if expected_exception:
                        with pytest.raises(expected_exception):
                            await integration_service.execute_full_analysis(disaster_request)
                    else:
                        # 如果沒有預期異常，則測試應該成功
                        response = await integration_service.execute_full_analysis(disaster_request)
                        assert response.status == "success"


class TestSystemStabilityUnderExtremePressure:
    """測試極端壓力下的系統穩定性。"""
    
    @pytest.mark.asyncio
    async def test_extreme_concurrent_load_handling(self):
        """測試極端併發負載處理。"""
        
        # 建立大量併發請求 (100個)
        extreme_requests = [
            AnalyzeRequest(
                keyword=f"極端負載測試 {i:03d}",
                audience=f"壓力用戶 {i:03d}",
                options=AnalyzeOptions(
                    generate_draft=i % 2 == 0,
                    include_faq=i % 3 == 0,
                    include_table=i % 4 == 0
                )
            )
            for i in range(100)
        ]
        
        # 高效能模擬服務
        async def high_performance_serp(keyword, num_results=10):
            await asyncio.sleep(0.001)  # 極短處理時間
            index = keyword.split()[-1]
            return SerpResult(
                keyword=keyword,
                total_results=1000,
                organic_results=[
                    OrganicResult(j, f"快速結果{j}-{index}", f"https://fast-{index}-{j}.com", f"快速內容{j}")
                    for j in range(1, min(6, num_results+1))  # 減少結果數量提升效能
                ]
            )
        
        async def high_performance_scraper(urls):
            await asyncio.sleep(0.002)  # 極短處理時間
            return ScrapingResult(
                total_results=len(urls),
                successful_scrapes=min(3, len(urls)),
                avg_word_count=800,
                avg_paragraphs=5,
                pages=[
                    PageContent(url, [f"快速內容{i}"], success=True, word_count=800)
                    for i, url in enumerate(urls[:3])
                ],
                errors=[]
            )
        
        async def high_performance_ai(**kwargs):
            await asyncio.sleep(0.003)  # 極短處理時間
            keyword = kwargs['keyword']
            return AnalysisResult(
                analysis_report=f"# 高效能分析 - {keyword}\n\n快速分析完成。",
                token_usage=1000,
                processing_time=0.003,
                success=True
            )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = high_performance_serp
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = high_performance_scraper
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content = high_performance_ai
            mock_ai.return_value = mock_ai_service
            
            # 測試極端併發負載
            integration_service = IntegrationService()
            start_time = time.time()
            
            # 使用 asyncio.gather 進行大規模併發
            async def safe_analysis(request):
                try:
                    return await integration_service.execute_full_analysis(request)
                except Exception as e:
                    return {"error": str(e)}
            
            # 分批處理以避免系統過載
            batch_size = 20
            all_results = []
            
            for i in range(0, len(extreme_requests), batch_size):
                batch = extreme_requests[i:i + batch_size]
                batch_results = await asyncio.gather(
                    *[safe_analysis(req) for req in batch],
                    return_exceptions=True
                )
                all_results.extend(batch_results)
                
                # 短暫間隔讓系統喘息
                await asyncio.sleep(0.1)
            
            total_time = time.time() - start_time
            
            # 分析結果
            successful_results = [r for r in all_results if isinstance(r, AnalyzeResponse) and r.status == "success"]
            error_results = [r for r in all_results if not isinstance(r, AnalyzeResponse)]
            
            # 驗證極端負載處理
            success_rate = len(successful_results) / len(extreme_requests)
            assert success_rate >= 0.8, f"極端負載成功率過低: {success_rate:.2f}"
            assert total_time < 60.0, f"極端負載處理時間過長: {total_time:.2f}s"
            
            # 驗證平均處理時間
            if successful_results:
                avg_processing_time = sum(r.processing_time for r in successful_results) / len(successful_results)
                assert avg_processing_time < 5.0, f"平均處理時間過長: {avg_processing_time:.2f}s"
    
    @pytest.mark.asyncio
    async def test_memory_stability_under_sustained_load(self):
        """測試持續負載下的記憶體穩定性。"""
        
        initial_memory = sys.getsizeof(gc.get_objects())
        
        # 持續運行分析請求
        sustained_duration = 30  # 30 次迭代
        memory_snapshots = []
        
        for iteration in range(sustained_duration):
            
            # 每輪建立新的請求
            requests = [
                AnalyzeRequest(
                    keyword=f"記憶體測試 Round{iteration} Item{i}",
                    audience=f"持續用戶 {i}",
                    options=AnalyzeOptions(generate_draft=True, include_faq=i%2==0, include_table=i%3==0)
                )
                for i in range(10)
            ]
            
            # 簡單但會產生記憶體使用的模擬服務
            async def memory_intensive_serp(keyword, num_results=10):
                # 建立一些臨時數據
                temp_data = [f"SERP資料{i}" for i in range(100)]
                return SerpResult(
                    keyword=keyword,
                    total_results=5000,
                    organic_results=[
                        OrganicResult(j, f"結果{j}", f"https://mem-test-{j}.com", f"內容{j}")
                        for j in range(1, 6)
                    ]
                )
            
            async def memory_intensive_scraper(urls):
                # 建立較大的臨時數據
                temp_pages = [f"頁面內容{i}" * 100 for i in range(50)]
                return ScrapingResult(
                    total_results=len(urls),
                    successful_scrapes=len(urls),
                    avg_word_count=2000,
                    avg_paragraphs=15,
                    pages=[
                        PageContent(url, [f"內容{i}"], success=True, word_count=2000)
                        for i, url in enumerate(urls)
                    ],
                    errors=[]
                )
            
            async def memory_intensive_ai(**kwargs):
                # 建立大型報告數據
                large_report = "# 記憶體密集分析\n\n" + "分析內容 " * 1000
                return AnalysisResult(
                    analysis_report=large_report,
                    token_usage=4000,
                    processing_time=5.0,
                    success=True
                )
            
            with patch('app.services.integration_service.get_serp_service') as mock_serp, \
                 patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
                 patch('app.services.integration_service.get_ai_service') as mock_ai:
                
                mock_serp_service = AsyncMock()
                mock_serp_service.search_keyword = memory_intensive_serp
                mock_serp.return_value = mock_serp_service
                
                mock_scraper_service = AsyncMock()
                mock_scraper_service.scrape_urls = memory_intensive_scraper
                mock_scraper.return_value = mock_scraper_service
                
                mock_ai_service = AsyncMock()
                mock_ai_service.analyze_seo_content = memory_intensive_ai
                mock_ai.return_value = mock_ai_service
                
                # 執行本輪分析
                integration_service = IntegrationService()
                
                batch_results = await asyncio.gather(
                    *[integration_service.execute_full_analysis(req) for req in requests],
                    return_exceptions=True
                )
                
                # 記錄記憶體使用
                gc.collect()  # 強制垃圾收集
                current_memory = sys.getsizeof(gc.get_objects())
                memory_snapshots.append(current_memory)
                
                # 檢查是否有明顯的記憶體洩漏
                if iteration > 5:  # 給系統暖身時間
                    recent_growth = (current_memory - memory_snapshots[iteration-5]) / memory_snapshots[iteration-5]
                    assert recent_growth < 0.5, f"記憶體成長過快 iteration {iteration}: {recent_growth:.2f}"
                
                successful_count = sum(1 for r in batch_results if isinstance(r, AnalyzeResponse) and r.status == "success")
                assert successful_count >= 8, f"持續負載 iteration {iteration} 成功率過低: {successful_count}/10"
        
        # 最終記憶體檢查
        final_memory = memory_snapshots[-1]
        total_growth = (final_memory - initial_memory) / initial_memory if initial_memory > 0 else 0
        
        # 允許合理的記憶體成長，但不應該無限增長
        assert total_growth < 5.0, f"總記憶體成長過度: {total_growth:.2f}"
        
        # 檢查記憶體使用是否趨於穩定
        if len(memory_snapshots) >= 10:
            last_10_avg = sum(memory_snapshots[-10:]) / 10
            first_10_avg = sum(memory_snapshots[:10]) / 10
            stabilization_ratio = last_10_avg / first_10_avg if first_10_avg > 0 else 1
            assert stabilization_ratio < 3.0, f"記憶體未達到穩定狀態: {stabilization_ratio:.2f}"