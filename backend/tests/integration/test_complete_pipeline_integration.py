"""C2.3 完整 Pipeline 端到端整合測試。

此模組測試 SERP → 爬蟲 → AI 完整分析流程的端到端整合，
驗證 60 秒完整分析目標、資料流完整性、錯誤恢復機制和效能表現。

符合 Phase 2 C2.3 整合測試要求:
- 完整 Pipeline 端到端資料流驗證
- 60 秒完整分析流程穩定運行
- 三階段錯誤傳播和恢復機制
- 效能基準建立和監控
- 併發處理和負載測試
"""

import asyncio
import time
from typing import Dict, Any, List
from unittest.mock import AsyncMock, patch, Mock

import pytest

from app.services.integration_service import (
    IntegrationService, PerformanceTimer
)
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


class TestCompletePipelineEndToEnd:
    """測試完整 Pipeline 端到端整合流程。
    
    驗證 SERP → 爬蟲 → AI 三階段完整資料流，
    確保 60 秒內完成完整分析並生成高品質報告。
    """
    
    @pytest.fixture
    def sample_analyze_request(self) -> AnalyzeRequest:
        """建立標準的分析請求。"""
        return AnalyzeRequest(
            keyword="SEO 優化策略",
            audience="數位行銷專業人員",
            options=AnalyzeOptions(
                generate_draft=True,
                include_faq=True,
                include_table=False
            )
        )
    
    @pytest.fixture
    def mock_complete_serp_data(self) -> SerpResult:
        """建立完整的 SERP 搜尋結果。"""
        organic_results = []
        for i in range(1, 11):
            result = OrganicResult(
                position=i,
                title=f"專業 SEO 優化指南 {i} - 提升網站排名的完整策略",
                link=f"https://seo-expert{i}.com/optimization-guide",
                snippet=f"深入解析 SEO 優化策略 {i}，涵蓋關鍵字研究、內容優化、技術 SEO 等完整方法論，幫助企業提升搜尋引擎排名。"
            )
            organic_results.append(result)
        
        return SerpResult(
            keyword="SEO 優化策略",
            total_results=2500000,
            organic_results=organic_results,
            related_searches=[
                "SEO 關鍵字研究", "網站內容優化", "技術 SEO 指南", 
                "SEO 效果評估", "競爭對手分析"
            ]
        )
    
    @pytest.fixture
    def mock_complete_scraping_data(self) -> ScrapingResult:
        """建立完整的爬蟲結果。"""
        pages = []
        
        # 建立 8 個高品質成功頁面
        for i in range(1, 9):
            page = PageContent(
                url=f"https://seo-expert{i}.com/optimization-guide",
                title=f"專業 SEO 優化指南 {i} - 完整策略解析",
                meta_description=f"深度解析 SEO 優化策略 {i}，包含關鍵字研究、內容優化、技術實作的完整指南，助您提升網站搜尋排名。",
                h1=f"SEO 優化完整策略指南 {i}",
                h2_list=[
                    f"SEO 基礎概念與重要性 {i}",
                    f"關鍵字研究與選擇策略 {i}",
                    f"網站內容優化技巧 {i}",
                    f"技術 SEO 實作要點 {i}",
                    f"競爭對手分析方法 {i}",
                    f"SEO 效果監測與改善 {i}"
                ],
                word_count=2800 + i * 150,  # 2950-3950 字
                paragraph_count=18 + i * 2,  # 20-34 段
                status_code=200,
                load_time=1.2 + i * 0.1,
                success=True
            )
            pages.append(page)
        
        # 建立 2 個失敗頁面
        for i in range(9, 11):
            page = PageContent(
                url=f"https://seo-expert{i}.com/optimization-guide",
                h2_list=[],
                status_code=503 if i == 9 else 404,
                load_time=0.3,
                success=False,
                error="服務暫時無法使用" if i == 9 else "頁面不存在"
            )
            pages.append(page)
        
        return ScrapingResult(
            total_results=10,
            successful_scrapes=8,
            avg_word_count=3400,  # 高品質內容
            avg_paragraphs=25,    # 豐富的段落結構
            pages=pages,
            errors=[
                {"url": "https://seo-expert9.com/optimization-guide", 
                 "error": "服務暫時無法使用", "error_type": "ServiceUnavailable"},
                {"url": "https://seo-expert10.com/optimization-guide", 
                 "error": "頁面不存在", "error_type": "NotFound"}
            ]
        )
    
    @pytest.fixture
    def mock_complete_analysis_result(self) -> AnalysisResult:
        """建立完整的 AI 分析結果。"""
        return AnalysisResult(
            analysis_report="""# SEO 優化策略完整分析報告

## 1. 分析概述
基於對 8 個高品質 SEO 專業網站的深度分析，針對「SEO 優化策略」關鍵字為數位行銷專業人員提供完整的優化策略建議。

### 市場競爭分析
- 搜尋結果總數: 2,500,000 個相關頁面
- 分析樣本: 8 個專業 SEO 指南（平均 3,400 字）
- 內容品質: 高度專業化，涵蓋完整 SEO 方法論
- 競爭激烈程度: 極高（專業機構主導）

## 2. SERP 分析結果
### 前 8 名競爭對手策略解析
1. **專業 SEO 優化指南 1**: 著重基礎概念建立和實務操作
2. **專業 SEO 優化指南 2**: 強調技術 SEO 和效果評估
3. **專業 SEO 優化指南 3**: 深度關鍵字研究方法論
4. **專業 SEO 優化指南 4**: 內容優化和競爭分析並重

### 標題長度和關鍵字使用模式
- 平均標題長度: 35-45 字元
- 關鍵字密度: 「SEO 優化」在標題中出現率 100%
- 長尾關鍵字: 「策略」、「指南」、「完整」高頻出現

## 3. 內容策略建議
### 推薦標題寫法
1. "SEO 優化策略完全指南 2024 - 數位行銷專業人員必讀"
2. "專業 SEO 優化策略解析 - 從基礎到進階的完整方法"
3. "企業 SEO 優化策略規劃 - 提升搜尋排名的系統化方法"

### 內容結構規劃
- H1: 核心主題 + 目標受眾定位
- H2: 6-8 個主要章節（基礎→進階→實作→評估）
- 目標字數: 3,000-4,000 字（與競爭對手相當）

## 4. 關鍵字策略
### 主要關鍵字優化建議
- 主關鍵字: "SEO 優化策略"
- 相關關鍵字: "關鍵字研究"、"內容優化"、"技術 SEO"
- 長尾關鍵字: "SEO 優化策略規劃"、"企業 SEO 實作指南"

## 5. 競爭優勢分析
### 內容差異化機會
- 針對數位行銷專業人員的實戰經驗分享
- 結合最新 2024 SEO 趨勢和演算法更新
- 提供具體的 KPI 設定和效果評估方法

## 6. 執行建議
### 優先執行項目
1. 建立完整的 SEO 優化策略框架內容
2. 深度分析競爭對手的成功案例
3. 整合最新的 SEO 工具和技術實作方法

**建議**: 所有策略建議均基於 8 個高品質競爭對手網站的深度分析，確保內容的專業性和實用性。
""",
            token_usage=5200,
            processing_time=18.5,
            success=True
        )
    
    @pytest.mark.asyncio
    async def test_complete_pipeline_success_flow(
        self, 
        sample_analyze_request, 
        mock_complete_serp_data, 
        mock_complete_scraping_data, 
        mock_complete_analysis_result
    ):
        """測試完整 Pipeline 成功流程。"""
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            # 設定 Mock 服務
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = mock_complete_serp_data
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = mock_complete_scraping_data
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.return_value = mock_complete_analysis_result
            mock_ai.return_value = mock_ai_service
            
            # 執行完整 Pipeline
            integration_service = IntegrationService()
            start_time = time.time()
            
            response = await integration_service.execute_full_analysis(sample_analyze_request)
            
            total_time = time.time() - start_time
            
            # 驗證完整流程
            assert response.status == "success"
            assert response.processing_time > 0
            assert total_time < 60.0  # 60 秒完整分析目標
            
            # 驗證服務呼叫順序
            mock_serp_service.search_keyword.assert_called_once_with(
                keyword="SEO 優化策略", num_results=10
            )
            mock_scraper_service.scrape_urls.assert_called_once()
            mock_ai_service.analyze_seo_content.assert_called_once()
            
            # 驗證資料完整性
            assert response.data.analysis_report is not None
            assert "SEO 優化策略完整分析報告" in response.data.analysis_report
            assert response.data.serp_summary.total_results == 10
            assert response.data.serp_summary.successful_scrapes == 8
    
    @pytest.mark.asyncio
    async def test_pipeline_performance_benchmark(
        self, 
        sample_analyze_request,
        mock_complete_serp_data,
        mock_complete_scraping_data,
        mock_complete_analysis_result
    ):
        """測試 Pipeline 效能基準。"""
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            # 模擬各階段效能
            async def mock_serp_timing(*args, **kwargs):
                await asyncio.sleep(0.1)  # 模擬 SERP 階段
                return mock_complete_serp_data
            
            async def mock_scraper_timing(*args, **kwargs):
                await asyncio.sleep(0.15)  # 模擬爬蟲階段
                return mock_complete_scraping_data
            
            async def mock_ai_timing(*args, **kwargs):
                await asyncio.sleep(0.2)  # 模擬 AI 階段
                return mock_complete_analysis_result
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = mock_serp_timing
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = mock_scraper_timing
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content = mock_ai_timing
            mock_ai.return_value = mock_ai_service
            
            # 執行效能測試
            integration_service = IntegrationService()
            start_time = time.time()
            
            response = await integration_service.execute_full_analysis(sample_analyze_request)
            
            total_time = time.time() - start_time
            
            # 驗證效能基準
            assert total_time < 60.0, f"總處理時間 {total_time:.2f}s 超過 60 秒目標"
            assert response.processing_time < 55.0, f"內部處理時間過長"
            
            # 驗證階段計時（如果有的話）
            if hasattr(response.data.metadata, 'phase_timings'):
                phase_timings = response.data.metadata.phase_timings
                if phase_timings and 'serp_duration' in phase_timings:
                    assert phase_timings['serp_duration'] < 15.0, "SERP 階段超時"
                if phase_timings and 'scraping_duration' in phase_timings:
                    assert phase_timings['scraping_duration'] < 25.0, "爬蟲階段超時"
                if phase_timings and 'ai_duration' in phase_timings:
                    assert phase_timings['ai_duration'] < 35.0, "AI 階段超時"
    
    @pytest.mark.asyncio
    async def test_pipeline_data_flow_integrity(
        self,
        sample_analyze_request,
        mock_complete_serp_data,
        mock_complete_scraping_data,
        mock_complete_analysis_result
    ):
        """測試 Pipeline 資料流完整性。"""
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = mock_complete_serp_data
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock() 
            mock_scraper_service.scrape_urls.return_value = mock_complete_scraping_data
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.return_value = mock_complete_analysis_result
            mock_ai.return_value = mock_ai_service
            
            integration_service = IntegrationService()
            response = await integration_service.execute_full_analysis(sample_analyze_request)
            
            # 驗證資料流完整性
            # 1. SERP → 爬蟲資料流
            scraper_call_args = mock_scraper_service.scrape_urls.call_args[0][0]
            expected_urls = [result.link for result in mock_complete_serp_data.organic_results]
            assert scraper_call_args == expected_urls, "SERP → 爬蟲 URL 傳遞不正確"
            
            # 2. 爬蟲 → AI 資料流
            ai_call_args = mock_ai_service.analyze_seo_content.call_args[1]
            assert ai_call_args['keyword'] == sample_analyze_request.keyword
            assert ai_call_args['audience'] == sample_analyze_request.audience
            assert ai_call_args['serp_data'] == mock_complete_serp_data
            assert ai_call_args['scraping_data'] == mock_complete_scraping_data
            
            # 3. 最終回應資料完整性
            assert response.data.serp_summary.total_results == mock_complete_scraping_data.total_results
            assert response.data.serp_summary.successful_scrapes == mock_complete_scraping_data.successful_scrapes
            assert response.data.analysis_report == mock_complete_analysis_result.analysis_report


class TestPipelineErrorScenarios:
    """測試 Pipeline 錯誤場景和恢復機制。
    
    驗證各階段失敗對整體流程的影響，
    確保錯誤傳播和恢復機制正常運作。
    """
    
    @pytest.fixture
    def sample_request(self) -> AnalyzeRequest:
        """建立測試請求。"""
        return AnalyzeRequest(
            keyword="測試關鍵字",
            audience="測試受眾",
            options=AnalyzeOptions(
                generate_draft=False,
                include_faq=False,
                include_table=False
            )
        )
    
    @pytest.mark.asyncio
    async def test_serp_stage_failure_propagation(self, sample_request):
        """測試 SERP 階段失敗的錯誤傳播。"""
        with patch('app.services.integration_service.get_serp_service') as mock_serp:
            # 模擬 SERP 服務失敗
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.side_effect = SerpAPIException("API 配額已用盡")
            mock_serp.return_value = mock_serp_service
            
            integration_service = IntegrationService()
            
            # 驗證 SERP 階段失敗導致整個 Pipeline 失敗
            with pytest.raises(SerpAPIException, match="API 配額已用盡"):
                await integration_service.execute_full_analysis(sample_request)
    
    @pytest.mark.asyncio
    async def test_scraper_stage_failure_propagation(self, sample_request):
        """測試爬蟲階段失敗的錯誤傳播。"""
        # 建立最小 SERP 資料
        mock_serp_data = SerpResult(
            keyword="測試",
            total_results=1,
            organic_results=[OrganicResult(1, "測試", "https://test.com", "測試")]
        )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = mock_serp_data
            mock_serp.return_value = mock_serp_service
            
            # 模擬爬蟲服務完全失敗
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.side_effect = ScraperTimeoutException("所有頁面爬取逾時")
            mock_scraper.return_value = mock_scraper_service
            
            integration_service = IntegrationService()
            
            # 驗證爬蟲階段失敗導致整個 Pipeline 失敗
            with pytest.raises(ScraperTimeoutException, match="所有頁面爬取逾時"):
                await integration_service.execute_full_analysis(sample_request)
    
    @pytest.mark.asyncio
    async def test_ai_stage_failure_propagation(self, sample_request):
        """測試 AI 階段失敗的錯誤傳播。"""
        # 建立最小測試資料
        mock_serp_data = SerpResult(
            keyword="測試",
            total_results=1,
            organic_results=[OrganicResult(1, "測試", "https://test.com", "測試")]
        )
        
        mock_scraping_data = ScrapingResult(
            total_results=1,
            successful_scrapes=1,
            avg_word_count=500,
            avg_paragraphs=3,
            pages=[PageContent("https://test.com", ["測試"], success=True)],
            errors=[]
        )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = mock_serp_data
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = mock_scraping_data
            mock_scraper.return_value = mock_scraper_service
            
            # 模擬 AI 服務失敗
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.side_effect = TokenLimitExceededException("Token 使用量超過限制")
            mock_ai.return_value = mock_ai_service
            
            integration_service = IntegrationService()
            
            # 驗證 AI 階段失敗導致整個 Pipeline 失敗
            with pytest.raises(TokenLimitExceededException, match="Token 使用量超過限制"):
                await integration_service.execute_full_analysis(sample_request)
    
    @pytest.mark.asyncio
    async def test_partial_failure_pipeline_resilience(self, sample_request):
        """測試部分失敗情況下的 Pipeline 韌性。"""
        # SERP 資料正常
        mock_serp_data = SerpResult(
            keyword="測試",
            total_results=5,
            organic_results=[
                OrganicResult(i, f"測試{i}", f"https://test{i}.com", f"測試{i}")
                for i in range(1, 6)
            ]
        )
        
        # 爬蟲部分失敗（5個URL中只有2個成功）
        mock_scraping_data = ScrapingResult(
            total_results=5,
            successful_scrapes=2,
            avg_word_count=800,
            avg_paragraphs=5,
            pages=[
                PageContent("https://test1.com", ["成功1"], success=True, word_count=800),
                PageContent("https://test2.com", ["成功2"], success=True, word_count=1000),
                PageContent("https://test3.com", [], success=False, error="404錯誤"),
                PageContent("https://test4.com", [], success=False, error="逾時"),
                PageContent("https://test5.com", [], success=False, error="拒絕存取")
            ],
            errors=[
                {"url": "https://test3.com", "error": "404錯誤", "error_type": "NotFound"},
                {"url": "https://test4.com", "error": "逾時", "error_type": "Timeout"},
                {"url": "https://test5.com", "error": "拒絕存取", "error_type": "AccessDenied"}
            ]
        )
        
        # AI 服務適應性處理
        mock_analysis_result = AnalysisResult(
            analysis_report="# 有限資料分析報告\n\n基於 2 個成功爬取的頁面進行分析...\n\n**資料限制說明**: 由於爬取成功率僅 40%，分析結果可能不夠全面。",
            token_usage=1500,
            processing_time=8.0,
            success=True
        )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = mock_serp_data
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = mock_scraping_data
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.return_value = mock_analysis_result
            mock_ai.return_value = mock_ai_service
            
            integration_service = IntegrationService()
            
            # Pipeline 應該能夠處理部分失敗並完成分析
            response = await integration_service.execute_full_analysis(sample_request)
            
            # 驗證 Pipeline 韌性
            assert response.status == "success"
            assert "有限資料分析" in response.data.analysis_report
            assert "資料限制說明" in response.data.analysis_report
            assert response.data.serp_summary.successful_scrapes == 2
            assert response.data.serp_summary.total_results == 5


class TestPipelineLoadAndStress:
    """測試 Pipeline 負載和壓力處理。
    
    驗證併發處理能力和高負載情況下的穩定性，
    確保生產環境的可靠性。
    """
    
    @pytest.mark.asyncio
    async def test_concurrent_pipeline_processing(self):
        """測試併發 Pipeline 處理能力。"""
        # 建立多個分析請求
        requests = [
            AnalyzeRequest(
                keyword=f"測試關鍵字 {i}",
                audience=f"測試受眾 {i}",
                options=AnalyzeOptions(generate_draft=False, include_faq=False, include_table=False)
            )
            for i in range(1, 4)  # 3 個併發請求
        ]
        
        # Mock 資料
        def create_mock_data(index):
            serp_data = SerpResult(
                keyword=f"測試關鍵字 {index}",
                total_results=1000,
                organic_results=[OrganicResult(1, f"結果{index}", f"https://test{index}.com", f"摘要{index}")]
            )
            
            scraping_data = ScrapingResult(
                total_results=1,
                successful_scrapes=1,
                avg_word_count=1000,
                avg_paragraphs=8,
                pages=[PageContent(f"https://test{index}.com", [f"標題{index}"], success=True)],
                errors=[]
            )
            
            analysis_result = AnalysisResult(
                analysis_report=f"# 分析報告 {index}\n\n測試內容...",
                token_usage=2000,
                processing_time=5.0,
                success=True
            )
            
            return serp_data, scraping_data, analysis_result
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            # 設定動態 Mock 回應
            async def mock_serp_search(keyword, num_results=10):
                await asyncio.sleep(0.05)  # 模擬處理時間
                index = keyword.split()[-1]
                serp_data, _, _ = create_mock_data(index)
                return serp_data
            
            async def mock_scraper_scrape(urls):
                await asyncio.sleep(0.1)  # 模擬處理時間
                url = urls[0]
                index = url.split('.com')[0].split('test')[-1]
                _, scraping_data, _ = create_mock_data(index)
                return scraping_data
            
            async def mock_ai_analyze(**kwargs):
                await asyncio.sleep(0.08)  # 模擬處理時間
                keyword = kwargs['keyword']
                index = keyword.split()[-1]
                _, _, analysis_result = create_mock_data(index)
                return analysis_result
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = mock_serp_search
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = mock_scraper_scrape
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content = mock_ai_analyze
            mock_ai.return_value = mock_ai_service
            
            # 併發執行多個 Pipeline
            integration_service = IntegrationService()
            start_time = time.time()
            
            tasks = [
                integration_service.execute_full_analysis(request)
                for request in requests
            ]
            
            responses = await asyncio.gather(*tasks)
            concurrent_time = time.time() - start_time
            
            # 驗證併發處理結果
            assert len(responses) == 3, "併發請求數量不正確"
            for i, response in enumerate(responses, 1):
                assert response.status == "success"
                assert f"分析報告 {i}" in response.data.analysis_report
            
            # 驗證併發效率（應該比序列處理快）
            expected_sequential_time = 3 * 0.23  # 每個約 0.23s
            assert concurrent_time < expected_sequential_time * 0.8, "併發處理效率不足"
            assert concurrent_time < 10.0, "併發處理時間過長"
    
    @pytest.mark.asyncio
    async def test_pipeline_memory_and_resource_usage(self):
        """測試 Pipeline 記憶體和資源使用情況。"""
        # 建立大型資料請求（模擬高負載）
        large_request = AnalyzeRequest(
            keyword="大型數據分析測試",
            audience="企業級用戶",
            options=AnalyzeOptions(
                generate_draft=True,
                include_faq=True,
                include_table=True
            )
        )
        
        # 建立大型 Mock 資料
        large_serp_data = SerpResult(
            keyword="大型數據分析測試",
            total_results=10000000,
            organic_results=[
                OrganicResult(i, f"大型數據結果 {i}", f"https://large-data-{i}.com/analysis", 
                            f"深度分析大型數據處理方法 {i}，包含完整的技術方案和實作細節。")
                for i in range(1, 21)  # 20 個結果
            ],
            related_searches=[f"大型數據關鍵字 {i}" for i in range(1, 11)]
        )
        
        large_scraping_data = ScrapingResult(
            total_results=20,
            successful_scrapes=18,
            avg_word_count=4500,
            avg_paragraphs=35,
            pages=[
                PageContent(
                    url=f"https://large-data-{i}.com/analysis",
                    title=f"大型數據分析完整指南 {i}",
                    meta_description=f"深入探討大型數據分析方法 {i}，涵蓋數據收集、處理、分析的完整流程。",
                    h1=f"大型數據分析指南 {i}",
                    h2_list=[f"數據收集方法 {i}", f"數據處理技術 {i}", f"分析工具選擇 {i}",
                           f"結果解釋 {i}", f"案例研究 {i}", f"最佳實踐 {i}"],
                    word_count=4500 + i * 100,
                    paragraph_count=35 + i,
                    success=True
                )
                for i in range(1, 19)
            ] + [
                PageContent(f"https://large-data-{i}.com/analysis", [], success=False, error="逾時")
                for i in range(19, 21)
            ],
            errors=[
                {"url": f"https://large-data-{i}.com/analysis", "error": "逾時", "error_type": "Timeout"}
                for i in range(19, 21)
            ]
        )
        
        large_analysis_result = AnalysisResult(
            analysis_report="# 大型數據分析完整報告\n\n" + "詳細分析內容... " * 200,  # 大型報告
            token_usage=7800,
            processing_time=25.0,
            success=True
        )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = large_serp_data
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = large_scraping_data
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.return_value = large_analysis_result
            mock_ai.return_value = mock_ai_service
            
            # 執行大型資料處理測試
            integration_service = IntegrationService()
            start_time = time.time()
            
            response = await integration_service.execute_full_analysis(large_request)
            
            processing_time = time.time() - start_time
            
            # 驗證大型資料處理能力
            assert response.status == "success"
            assert processing_time < 60.0, f"大型資料處理時間 {processing_time:.2f}s 超過限制"
            assert response.data.serp_summary.total_results == 20
            assert response.data.serp_summary.successful_scrapes == 18
            assert "大型數據分析完整報告" in response.data.analysis_report
            
            # 驗證 Token 使用量在合理範圍
            assert hasattr(response.data.metadata, 'token_usage')
            if hasattr(response.data.metadata, 'token_usage'):
                assert response.data.metadata.token_usage > 5000  # 大型分析應使用較多 Token
                assert response.data.metadata.token_usage < 10000  # 但不應超過合理限制


class TestPipelineQualityAndReliability:
    """測試 Pipeline 品質保證和可靠性。
    
    驗證不同場景下的輸出品質，
    確保分析結果的一致性和可靠性。
    """
    
    @pytest.fixture
    def high_quality_request(self) -> AnalyzeRequest:
        """高品質分析請求。"""
        return AnalyzeRequest(
            keyword="企業數位轉型策略",
            audience="企業決策者和IT主管",
            options=AnalyzeOptions(
                generate_draft=True,
                include_faq=True,
                include_table=True
            )
        )
    
    @pytest.fixture
    def quality_serp_data(self) -> SerpResult:
        """高品質 SERP 資料。"""
        return SerpResult(
            keyword="企業數位轉型策略",
            total_results=3200000,
            organic_results=[
                OrganicResult(
                    position=i,
                    title=f"企業數位轉型完整策略指南 {i} - 成功案例與實施方法",
                    link=f"https://digital-transform-{i}.com/strategy-guide",
                    snippet=f"深度解析企業數位轉型策略 {i}，包含技術架構、組織變革、流程優化等完整方案，助您成功實現數位化升級。"
                )
                for i in range(1, 9)
            ],
            related_searches=[
                "數位轉型技術架構", "企業流程數位化", "數位轉型組織變革",
                "數位轉型成功案例", "企業數位化策略規劃"
            ]
        )
    
    @pytest.fixture  
    def quality_scraping_data(self) -> ScrapingResult:
        """高品質爬蟲資料。"""
        return ScrapingResult(
            total_results=8,
            successful_scrapes=7,
            avg_word_count=3800,
            avg_paragraphs=28,
            pages=[
                PageContent(
                    url=f"https://digital-transform-{i}.com/strategy-guide",
                    title=f"企業數位轉型完整策略指南 {i} - 技術與管理並重",
                    meta_description=f"提供企業數位轉型的完整策略框架 {i}，涵蓋技術選型、組織架構、流程再造等關鍵要素。",
                    h1=f"企業數位轉型策略完整指南 {i}",
                    h2_list=[
                        f"數位轉型戰略規劃 {i}",
                        f"技術架構設計 {i}",
                        f"組織變革管理 {i}",
                        f"流程數位化改造 {i}",
                        f"數據治理與分析 {i}",
                        f"風險控制與安全 {i}",
                        f"實施計劃與里程碑 {i}",
                        f"效果評估與優化 {i}"
                    ],
                    word_count=3800 + i * 200,
                    paragraph_count=28 + i * 3,
                    status_code=200,
                    load_time=1.5,
                    success=True
                )
                for i in range(1, 8)
            ] + [
                PageContent("https://digital-transform-8.com/strategy-guide", [], 
                          success=False, error="內容存取限制")
            ],
            errors=[
                {"url": "https://digital-transform-8.com/strategy-guide", 
                 "error": "內容存取限制", "error_type": "AccessRestricted"}
            ]
        )
    
    @pytest.mark.asyncio
    async def test_high_quality_analysis_pipeline(
        self, 
        high_quality_request, 
        quality_serp_data, 
        quality_scraping_data
    ):
        """測試高品質分析 Pipeline。"""
        # 高品質 AI 分析結果
        quality_analysis_result = AnalysisResult(
            analysis_report="""# 企業數位轉型策略完整分析報告

## 1. 分析概述
基於對 7 個頂級企業數位轉型諮詢機構的深度分析，針對「企業數位轉型策略」關鍵字為企業決策者和IT主管提供完整的轉型策略建議。

### 市場環境分析
- 搜尋結果總數: 3,200,000 個相關頁面
- 分析樣本: 7 個專業轉型指南（平均 4,200 字）
- 內容特色: 高度專業化，涵蓋戰略到執行的完整框架
- 競爭態勢: 管理諮詢公司和技術服務商主導市場

## 2. SERP 競爭分析
### 前 7 名競爭對手策略特點
1. **技術與管理雙重視角**: 87% 的頂級內容同時涵蓋技術和管理層面
2. **實施方法論**: 100% 提供具體的實施步驟和里程碑規劃
3. **風險管控**: 71% 詳細討論數位轉型風險和應對策略
4. **成功案例**: 85% 包含真實的企業轉型案例分析

### 關鍵字佈局分析
- 核心關鍵字密度: 「數位轉型」在標題中出現率 100%
- 高價值長尾詞: 「策略規劃」(85%)、「組織變革」(71%)、「技術架構」(57%)
- 目標受眾定位: 明確針對「企業決策者」和「IT主管」

## 3. 內容策略建議
### 差異化定位機會
1. **決策支援工具**: 提供數位轉型決策框架和評估工具
2. **行業化解決方案**: 針對不同行業的個性化轉型路徑
3. **ROI 量化方法**: 數位轉型投資回報的量化評估方法

### 推薦內容架構
- 目標字數: 4,000-5,000 字（超越競爭對手平均水準）
- 章節規劃: 8-10 個主要部分（戰略→技術→組織→執行→評估）
- 視覺化元素: 轉型路線圖、組織架構圖、技術架構圖

## 4. 實施建議
### 優先執行項目
1. 建立企業數位轉型成熟度評估工具
2. 開發行業化的數位轉型解決方案模板  
3. 建立數位轉型 ROI 計算和追蹤系統

### 內容更新策略
- 定期更新: 每季度更新技術趋勢和最佳實踐
- 案例擴充: 持續收集各行業成功轉型案例
- 工具升級: 根據市場反饋持續優化決策支援工具

**分析基礎**: 本報告基於 7 個高權威企業數位轉型專業網站的深度分析，確保建議的專業性和可操作性。
""",
            token_usage=6500,
            processing_time=22.0,
            success=True
        )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = quality_serp_data
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = quality_scraping_data
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.return_value = quality_analysis_result
            mock_ai.return_value = mock_ai_service
            
            # 執行高品質分析
            integration_service = IntegrationService()
            response = await integration_service.execute_full_analysis(high_quality_request)
            
            # 驗證高品質輸出
            assert response.status == "success"
            assert "企業數位轉型策略完整分析報告" in response.data.analysis_report
            
            # 驗證分析深度
            analysis_content = response.data.analysis_report
            assert "市場環境分析" in analysis_content
            assert "競爭對手策略特點" in analysis_content
            assert "差異化定位機會" in analysis_content
            assert "實施建議" in analysis_content
            
            # 驗證資料品質指標
            assert response.data.serp_summary.successful_scrapes >= 7
            assert response.data.serp_summary.avg_word_count >= 3800
            
            # 驗證 Token 使用效率
            if hasattr(response.data.metadata, 'token_usage'):
                token_usage = response.data.metadata.token_usage
                assert token_usage >= 5000, "高品質分析 Token 使用量應較高"
                assert token_usage <= 8000, "Token 使用量應保持在合理範圍"
    
    @pytest.mark.asyncio
    async def test_pipeline_consistency_across_runs(self):
        """測試 Pipeline 多次執行的一致性。"""
        consistent_request = AnalyzeRequest(
            keyword="一致性測試關鍵字",
            audience="測試用戶",
            options=AnalyzeOptions(generate_draft=False, include_faq=False, include_table=False)
        )
        
        # 建立一致的 Mock 資料
        consistent_serp_data = SerpResult(
            keyword="一致性測試關鍵字",
            total_results=50000,
            organic_results=[OrganicResult(1, "一致性測試", "https://consistency.com", "測試")]
        )
        
        consistent_scraping_data = ScrapingResult(
            total_results=1,
            successful_scrapes=1,
            avg_word_count=1200,
            avg_paragraphs=8,
            pages=[PageContent("https://consistency.com", ["一致性"], success=True)],
            errors=[]
        )
        
        consistent_analysis_result = AnalysisResult(
            analysis_report="# 一致性分析報告\n\n固定格式內容...",
            token_usage=3000,
            processing_time=10.0,
            success=True
        )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = consistent_serp_data
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = consistent_scraping_data
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.return_value = consistent_analysis_result
            mock_ai.return_value = mock_ai_service
            
            # 執行多次分析
            integration_service = IntegrationService()
            responses = []
            
            for _ in range(3):
                response = await integration_service.execute_full_analysis(consistent_request)
                responses.append(response)
            
            # 驗證一致性
            for i in range(1, len(responses)):
                # 核心資料應該一致
                assert responses[i].status == responses[0].status
                assert responses[i].data.analysis_report == responses[0].data.analysis_report
                assert responses[i].data.serp_summary.total_results == responses[0].data.serp_summary.total_results
                assert responses[i].data.serp_summary.successful_scrapes == responses[0].data.serp_summary.successful_scrapes
                
                # 處理時間可能略有差異，但應在合理範圍內
                time_diff = abs(responses[i].processing_time - responses[0].processing_time)
                assert time_diff < 1.0, f"執行時間差異過大: {time_diff}"


@pytest.mark.integration 
class TestPipelineRealWorldIntegration:
    """真實世界場景的完整 Pipeline 整合測試。
    
    模擬實際生產環境的各種使用場景，
    驗證系統在複雜條件下的穩定性和可靠性。
    """
    
    @pytest.mark.asyncio
    async def test_multi_language_content_pipeline(self):
        """測試多語言內容 Pipeline 處理。"""
        multilingual_request = AnalyzeRequest(
            keyword="國際化 SEO 策略",
            audience="跨國企業行銷團隊",
            options=AnalyzeOptions(generate_draft=True, include_faq=False, include_table=True)
        )
        
        # 多語言 SERP 資料
        multilingual_serp = SerpResult(
            keyword="國際化 SEO 策略",
            total_results=1800000,
            organic_results=[
                OrganicResult(1, "國際化 SEO 完整策略 - 繁體中文市場", "https://seo-tw.com/international", "繁體中文"),
                OrganicResult(2, "国际化 SEO 优化策略 - 简体中文", "https://seo-cn.com/international", "简体中文"), 
                OrganicResult(3, "International SEO Strategy Guide", "https://seo-global.com/international", "English"),
                OrganicResult(4, "グローバルSEO戦略ガイド", "https://seo-jp.com/international", "Japanese"),
                OrganicResult(5, "국제적 SEO 전략 가이드", "https://seo-kr.com/international", "Korean")
            ]
        )
        
        # 多語言爬蟲資料
        multilingual_scraping = ScrapingResult(
            total_results=5,
            successful_scrapes=4,
            avg_word_count=2800,
            avg_paragraphs=20,
            pages=[
                PageContent("https://seo-tw.com/international", ["繁中標題"], 
                          title="國際化 SEO 策略指南", success=True, word_count=3200),
                PageContent("https://seo-cn.com/international", ["簡中標題"],
                          title="国际化 SEO 优化策略", success=True, word_count=2900),
                PageContent("https://seo-global.com/international", ["English Title"],
                          title="International SEO Strategy", success=True, word_count=3100),
                PageContent("https://seo-jp.com/international", ["日本語タイトル"], 
                          title="グローバルSEO戦略", success=True, word_count=2000),
                PageContent("https://seo-kr.com/international", [], success=False, error="韓文頁面解析失敗")
            ],
            errors=[{"url": "https://seo-kr.com/international", "error": "韓文頁面解析失敗", "error_type": "ParseError"}]
        )
        
        # 多語言 AI 分析結果
        multilingual_analysis = AnalysisResult(
            analysis_report="""# 國際化 SEO 策略分析報告

## 多語言市場分析
基於 4 個不同語言市場的專業 SEO 資源分析：
- **繁體中文市場**: 台灣、香港地區 SEO 策略特色
- **簡體中文市場**: 中國大陸搜尋引擎優化重點  
- **英語市場**: 全球通用的國際化 SEO 最佳實踐
- **日語市場**: 日本本地化搜尋優化方法

## 跨語言 SEO 策略建議
### 技術實作要點
1. hreflang 標記正確配置
2. 多語言網址結構優化
3. 在地化內容策略規劃
4. 跨語言關鍵字對應分析

### 內容本地化建議  
- 文化適應性內容調整
- 當地搜尋習慣研究
- 競爭對手本地化策略分析
- 多語言SEO效果監測

**分析範圍**: 涵蓋繁中、簡中、英文、日文四個主要語言市場的專業 SEO 資源。
""",
            token_usage=4800,
            processing_time=15.5,
            success=True
        )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = multilingual_serp
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = multilingual_scraping
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.return_value = multilingual_analysis
            mock_ai.return_value = mock_ai_service
            
            # 執行多語言 Pipeline
            integration_service = IntegrationService()
            response = await integration_service.execute_full_analysis(multilingual_request)
            
            # 驗證多語言處理結果
            assert response.status == "success"
            assert "多語言市場分析" in response.data.analysis_report
            assert "繁體中文市場" in response.data.analysis_report
            assert "簡體中文市場" in response.data.analysis_report
            assert "英語市場" in response.data.analysis_report
            assert "日語市場" in response.data.analysis_report
            
            # 驗證多語言資料處理
            assert response.data.serp_summary.total_results == 5
            assert response.data.serp_summary.successful_scrapes == 4  # 4個語言成功，1個失敗
    
    @pytest.mark.asyncio
    async def test_industry_specific_pipeline_analysis(self):
        """測試行業專精 Pipeline 分析。"""
        healthcare_request = AnalyzeRequest(
            keyword="醫療數位化轉型",
            audience="醫療機構管理者",
            options=AnalyzeOptions(generate_draft=True, include_faq=True, include_table=True)
        )
        
        # 醫療行業 SERP 資料
        healthcare_serp = SerpResult(
            keyword="醫療數位化轉型",
            total_results=650000,
            organic_results=[
                OrganicResult(i, f"醫療數位化轉型解決方案 {i}", f"https://healthcare-digital-{i}.com", f"醫療行業專業指南 {i}")
                for i in range(1, 7)
            ],
            related_searches=["電子病歷系統", "遠程醫療平台", "醫療數據分析", "智慧醫院建設"]
        )
        
        # 醫療行業爬蟲資料
        healthcare_scraping = ScrapingResult(
            total_results=6,
            successful_scrapes=5,
            avg_word_count=3500,
            avg_paragraphs=25,
            pages=[
                PageContent(
                    url=f"https://healthcare-digital-{i}.com",
                    title=f"醫療數位化轉型完整解決方案 {i}",
                    h1=f"醫療機構數位化轉型指南 {i}",
                    h2_list=[
                        f"法規合規要求 {i}", f"隱私安全保護 {i}", f"系統整合方案 {i}",
                        f"醫護人員培訓 {i}", f"患者體驗優化 {i}", f"效益評估指標 {i}"
                    ],
                    word_count=3500 + i * 100,
                    paragraph_count=25 + i * 2,
                    success=True
                )
                for i in range(1, 6)
            ] + [
                PageContent("https://healthcare-digital-6.com", [], success=False, error="存取權限限制")
            ],
            errors=[{"url": "https://healthcare-digital-6.com", "error": "存取權限限制", "error_type": "AccessDenied"}]
        )
        
        # 醫療行業 AI 分析
        healthcare_analysis = AnalysisResult(
            analysis_report="""# 醫療數位化轉型策略分析報告

## 醫療行業特殊性分析
基於 5 個醫療數位化專業機構的深度研究，為醫療機構管理者提供符合行業特性的數位轉型策略。

### 法規環境考量
- **資料隱私法規**: GDPR、HIPAA 等國際醫療隱私法規要求
- **醫療器械規範**: FDA、CE 認證等醫療設備數位化標準
- **電子病歷標準**: HL7 FHIR 等醫療資料交換標準

### 技術架構重點
1. **安全性優先**: 端到端加密、存取控制、審計追蹤
2. **互操作性**: 與既有 HIS/EMR 系統的無縫整合
3. **可靠性**: 7x24 醫療服務的高可用性要求
4. **擴展性**: 支援醫療機構規模擴展需求

## 實施路線圖
### 第一階段：基礎數位化
- 電子病歷系統建置
- 基礎網路架構升級
- 醫護人員數位技能培訓

### 第二階段：整合優化
- 部門間系統整合
- 數據分析平台建立
- 智慧決策支援系統

### 第三階段：創新應用
- AI 輔助診斷系統
- 遠程醫療服務平台
- 精準醫療解決方案

**專業建議**: 所有建議均考慮醫療行業的特殊法規要求和技術標準，確保合規性和實用性。
""",
            token_usage=5800,
            processing_time=20.0,
            success=True
        )
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper, \
             patch('app.services.integration_service.get_ai_service') as mock_ai:
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = healthcare_serp
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = healthcare_scraping
            mock_scraper.return_value = mock_scraper_service
            
            mock_ai_service = AsyncMock()
            mock_ai_service.analyze_seo_content.return_value = healthcare_analysis
            mock_ai.return_value = mock_ai_service
            
            # 執行醫療行業 Pipeline
            integration_service = IntegrationService()
            response = await integration_service.execute_full_analysis(healthcare_request)
            
            # 驗證行業專精分析
            assert response.status == "success"
            assert "醫療行業特殊性分析" in response.data.analysis_report
            assert "法規環境考量" in response.data.analysis_report
            assert "技術架構重點" in response.data.analysis_report
            assert "GDPR" in response.data.analysis_report
            assert "HIPAA" in response.data.analysis_report
            assert "HL7 FHIR" in response.data.analysis_report
            
            # 驗證專業內容品質
            analysis_content = response.data.analysis_report
            professional_terms = ["電子病歷", "遠程醫療", "精準醫療", "AI 輔助診斷"]
            for term in professional_terms:
                assert term in analysis_content, f"缺少專業術語: {term}"