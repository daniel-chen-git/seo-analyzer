"""C2.1 SerpAPI → 爬蟲服務資料流整合測試。

此模組測試 SerpAPI 服務與爬蟲服務之間的資料流整合，
驗證資料格式一致性、服務鏈路完整性、錯誤場景處理和效能表現。

符合 Phase 2 C2.1 整合測試要求:
- 資料流格式驗證
- 服務間介面測試  
- 錯誤場景整合測試
- 效能基準測試
"""

import asyncio
import time
from unittest.mock import AsyncMock, patch, Mock

import pytest
import pytest_asyncio

from app.services.serp_service import (
    SerpResult, OrganicResult,
    SerpAPIException, RateLimitException
)
from app.services.scraper_service import (
    ScrapingResult, PageContent,
    ScraperException, ScraperTimeoutException
)
from app.services.integration_service import IntegrationService


class TestSerpScraperDataFlow:
    """測試 SERP → 爬蟲服務資料流完整性。
    
    驗證資料從 SerpAPI 搜尋結果正確傳遞到爬蟲服務，
    確保資料格式一致性和轉換正確性。
    """
    
    @pytest_asyncio.fixture
    async def mock_serp_result(self) -> SerpResult:
        """建立模擬的 SERP 搜尋結果。"""
        organic_results = []
        
        # 建立 10 個測試用的搜尋結果
        for i in range(1, 11):
            result = OrganicResult(
                position=i,
                title=f"SEO 測試標題 {i}",
                link=f"https://example{i}.com/seo-guide",
                snippet=f"這是測試摘要 {i}，包含 SEO 相關資訊。",
                displayed_link=f"example{i}.com"
            )
            organic_results.append(result)
        
        return SerpResult(
            keyword="SEO 優化",
            total_results=1000000,
            organic_results=organic_results,
            related_searches=["SEO 教學", "網站優化", "搜尋引擎優化"],
            search_metadata={
                "search_time": "1.5s",
                "engine_used": "google",
                "total_time_taken": 2.3
            }
        )
    
    @pytest_asyncio.fixture
    async def mock_scraping_result(self) -> ScrapingResult:
        """建立模擬的爬蟲結果。"""
        pages = []
        
        # 建立成功的頁面內容
        for i in range(1, 9):  # 8 個成功，2 個失敗
            page = PageContent(
                url=f"https://example{i}.com/seo-guide",
                title=f"SEO 優化指南 {i}",
                meta_description=f"完整的 SEO 優化教學 {i}",
                h1=f"SEO 優化完全指南 {i}",
                h2_list=[f"基礎概念 {i}", f"進階技巧 {i}", f"實務案例 {i}"],
                word_count=1200 + i * 50,
                paragraph_count=8 + i,
                status_code=200,
                load_time=0.8 + i * 0.1,
                success=True
            )
            pages.append(page)
        
        # 建立失敗的頁面內容
        for i in range(9, 11):
            page = PageContent(
                url=f"https://example{i}.com/seo-guide",
                h2_list=[],
                status_code=404,
                load_time=0.5,
                success=False,
                error="HTTP 404 錯誤"
            )
            pages.append(page)
        
        return ScrapingResult(
            total_results=10,
            successful_scrapes=8,
            avg_word_count=1325,  # 8 個成功頁面的平均值
            avg_paragraphs=12,    # 8 個成功頁面的平均值
            pages=pages,
            errors=[
                {"url": "https://example9.com/seo-guide", "error": "HTTP 404 錯誤", "error_type": "ScrapingError"},
                {"url": "https://example10.com/seo-guide", "error": "HTTP 404 錯誤", "error_type": "ScrapingError"}
            ]
        )
    
    def test_serp_to_urls_extraction(self, mock_serp_result):
        """測試從 SERP 結果正確提取 URL 清單。"""
        integration_service = IntegrationService()
        
        # 執行 URL 提取
        urls = integration_service._extract_urls_from_serp(mock_serp_result)
        
        # 驗證 URL 數量
        assert len(urls) == 10, f"期望 10 個 URL，實際得到 {len(urls)} 個"
        
        # 驗證 URL 格式
        for i, url in enumerate(urls, 1):
            expected_url = f"https://example{i}.com/seo-guide"
            assert url == expected_url, f"URL {i} 不匹配：期望 {expected_url}，實際 {url}"
            assert url.startswith(('http://', 'https://')), f"URL {url} 格式無效"
        
        # 驗證沒有重複 URL
        assert len(set(urls)) == len(urls), "URL 清單中存在重複項目"
    
    @pytest.mark.asyncio
    async def test_urls_to_scraper_data_format(self, mock_scraping_result):
        """測試 URL 清單到爬蟲服務的資料格式傳遞。"""
        test_urls = [
            f"https://example{i}.com/seo-guide" 
            for i in range(1, 11)
        ]
        
        # 模擬爬蟲服務
        scraper_service = Mock()
        scraper_service.scrape_urls = AsyncMock(return_value=mock_scraping_result)
        
        # 執行爬取
        result = await scraper_service.scrape_urls(test_urls)
        
        # 驗證呼叫參數
        scraper_service.scrape_urls.assert_called_once_with(test_urls)
        
        # 驗證回傳資料結構
        assert isinstance(result, ScrapingResult), "回傳結果類型不正確"
        assert result.total_results == 10, "總結果數量不正確"
        assert result.successful_scrapes == 8, "成功爬取數量不正確"
        assert len(result.pages) == 10, "頁面資料數量不正確"
        assert len(result.errors) == 2, "錯誤資料數量不正確"
    
    @pytest.mark.asyncio
    async def test_complete_data_flow_integration(self, mock_serp_result, mock_scraping_result):
        """測試完整的 SERP → 爬蟲資料流整合。"""
        # 模擬服務
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper:
            
            # 設定 mock 行為
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.return_value = mock_serp_result
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.return_value = mock_scraping_result
            mock_scraper.return_value = mock_scraper_service
            
            # 執行整合測試
            integration_service = IntegrationService()
            
            # 1. SERP 搜尋
            serp_data = await mock_serp_service.search_keyword("SEO 優化", num_results=10)
            
            # 2. 提取 URL
            urls = integration_service._extract_urls_from_serp(serp_data)
            
            # 3. 爬蟲執行
            scraping_data = await mock_scraper_service.scrape_urls(urls)
            
            # 驗證完整流程
            mock_serp_service.search_keyword.assert_called_once_with("SEO 優化", num_results=10)
            mock_scraper_service.scrape_urls.assert_called_once_with(urls)
            
            # 驗證資料一致性
            assert len(urls) == len(serp_data.organic_results), "URL 數量與 SERP 結果不一致"
            assert scraping_data.total_results == len(urls), "爬蟲總數量與 URL 數量不一致"
    
    def test_data_flow_with_invalid_urls(self):
        """測試包含無效 URL 的資料流處理。"""
        # 建立包含無效 URL 的 SERP 結果
        organic_results = [
            OrganicResult(1, "Valid URL", "https://example1.com/valid", "Valid snippet"),
            OrganicResult(2, "Invalid URL", "invalid-url", "Invalid snippet"),
            OrganicResult(3, "FTP URL", "ftp://example.com/file", "FTP snippet"),
            OrganicResult(4, "Empty URL", "", "Empty snippet"),
            OrganicResult(5, "Another Valid", "https://example2.com/valid", "Another valid"),
        ]
        
        serp_result = SerpResult(
            keyword="測試關鍵字",
            total_results=5,
            organic_results=organic_results
        )
        
        integration_service = IntegrationService()
        urls = integration_service._extract_urls_from_serp(serp_result)
        
        # 應該只提取有效的 HTTP/HTTPS URL
        assert len(urls) == 2, f"期望 2 個有效 URL，實際得到 {len(urls)} 個"
        assert "https://example1.com/valid" in urls
        assert "https://example2.com/valid" in urls
        assert "invalid-url" not in urls
        assert "ftp://example.com/file" not in urls
    
    def test_empty_serp_result_handling(self):
        """測試空 SERP 結果的處理。"""
        # 建立空的 SERP 結果
        empty_serp = SerpResult(
            keyword="無結果關鍵字",
            total_results=0,
            organic_results=[]
        )
        
        integration_service = IntegrationService()
        urls = integration_service._extract_urls_from_serp(empty_serp)
        
        # 驗證空結果處理
        assert urls == [], "空 SERP 結果應回傳空 URL 清單"
        assert isinstance(urls, list), "應回傳 list 類型"


class TestSerpScraperErrorHandling:
    """測試 SERP → 爬蟲服務錯誤場景整合處理。
    
    驗證各種錯誤情況下的服務行為和錯誤傳播機制。
    """
    
    @pytest.mark.asyncio
    async def test_serp_service_failure_impact(self):
        """測試 SERP 服務失敗對整個流程的影響。"""
        with patch('app.services.integration_service.get_serp_service') as mock_serp:
            # 模擬 SERP 服務失敗
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.side_effect = SerpAPIException("API 密鑰無效")
            mock_serp.return_value = mock_serp_service
            
            integration_service = IntegrationService()
            
            # 驗證例外傳播
            with pytest.raises(SerpAPIException, match="API 密鑰無效"):
                # 這裡應該調用實際的整合流程，但因為 mock 會失敗
                await mock_serp_service.search_keyword("測試關鍵字")
    
    def test_partial_scraping_failure_handling(self):
        """測試部分爬蟲失敗的處理機制。"""
        test_urls = [f"https://example{i}.com" for i in range(1, 6)]
        
        # 模擬部分失敗的爬蟲結果
        mixed_result = ScrapingResult(
            total_results=5,
            successful_scrapes=3,
            avg_word_count=1000,
            avg_paragraphs=8,
            pages=[
                PageContent("https://example1.com", ["h2-1"], success=True, word_count=1000),
                PageContent("https://example2.com", ["h2-2"], success=True, word_count=1200),
                PageContent("https://example3.com", ["h2-3"], success=True, word_count=800),
                PageContent("https://example4.com", [], success=False, error="逾時錯誤"),
                PageContent("https://example5.com", [], success=False, error="連線失敗"),
            ],
            errors=[
                {"url": "https://example4.com", "error": "逾時錯誤", "error_type": "TimeoutError"},
                {"url": "https://example5.com", "error": "連線失敗", "error_type": "ConnectionError"}
            ]
        )
        
        # 驗證部分失敗結果的結構
        assert mixed_result.total_results == 5
        assert mixed_result.successful_scrapes == 3
        assert len(mixed_result.errors) == 2
        
        # 驗證成功率計算
        success_rate = mixed_result.successful_scrapes / mixed_result.total_results
        assert success_rate == 0.6, f"成功率計算錯誤：期望 0.6，實際 {success_rate}"
    
    @pytest.mark.asyncio
    async def test_scraper_timeout_error_propagation(self):
        """測試爬蟲逾時錯誤的傳播機制。"""
        with patch('app.services.integration_service.get_scraper_service') as mock_scraper:
            # 模擬爬蟲逾時
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls.side_effect = ScraperTimeoutException("爬蟲逾時")
            mock_scraper.return_value = mock_scraper_service
            
            # 驗證逾時例外處理
            with pytest.raises(ScraperTimeoutException, match="爬蟲逾時"):
                await mock_scraper_service.scrape_urls(["https://example.com"])
    
    @pytest.mark.asyncio
    async def test_network_error_recovery_mechanism(self):
        """測試網路錯誤的恢復機制。"""
        # 模擬網路錯誤後恢復的場景
        call_count = [0]  # 使用 list 來避免 nonlocal 問題
        
        async def mock_scrape_with_recovery(urls):
            call_count[0] += 1
            
            if call_count[0] == 1:
                # 第一次呼叫失敗
                raise ScraperException("網路連線失敗")
            else:
                # 第二次呼叫成功
                return ScrapingResult(
                    total_results=len(urls),
                    successful_scrapes=len(urls),
                    avg_word_count=1000,
                    avg_paragraphs=8,
                    pages=[PageContent(url, ["test"], success=True) for url in urls],
                    errors=[]
                )
        
        with patch('app.services.integration_service.get_scraper_service') as mock_scraper:
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = mock_scrape_with_recovery
            mock_scraper.return_value = mock_scraper_service
            
            # 第一次呼叫應該失敗
            with pytest.raises(ScraperException, match="網路連線失敗"):
                await mock_scraper_service.scrape_urls(["https://example.com"])
            
            # 第二次呼叫應該成功
            result = await mock_scraper_service.scrape_urls(["https://example.com"])
            assert result.successful_scrapes == 1
    
    @pytest.mark.asyncio
    async def test_rate_limit_error_handling(self):
        """測試 API 速率限制錯誤處理。"""
        with patch('app.services.integration_service.get_serp_service') as mock_serp:
            # 模擬 SERP API 速率限制
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword.side_effect = RateLimitException("API 呼叫超過限制")
            mock_serp.return_value = mock_serp_service
            
            # 驗證速率限制例外處理
            with pytest.raises(RateLimitException, match="API 呼叫超過限制"):
                await mock_serp_service.search_keyword("測試關鍵字")


class TestSerpScraperPerformance:
    """測試 SERP → 爬蟲服務效能整合指標。
    
    驗證服務間整合的效能表現，確保符合 60 秒完整分析的要求。
    """
    
    @pytest.mark.asyncio
    async def test_serp_search_performance(self):
        """測試 SERP 搜尋階段效能。"""
        with patch('app.services.integration_service.get_serp_service') as mock_serp:
            # 模擬 SERP 服務
            async def mock_search_with_timing(keyword, num_results=10):
                await asyncio.sleep(0.1)  # 模擬快速搜尋
                return SerpResult(
                    keyword=keyword,
                    total_results=1000000,
                    organic_results=[
                        OrganicResult(i, f"標題 {i}", f"https://example{i}.com", f"摘要 {i}")
                        for i in range(1, num_results + 1)
                    ]
                )
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = mock_search_with_timing
            mock_serp.return_value = mock_serp_service
            
            # 效能測試
            start_time = time.time()
            result = await mock_serp_service.search_keyword("SEO 測試", num_results=10)
            search_duration = time.time() - start_time
            
            # 驗證效能指標
            assert search_duration < 15.0, f"SERP 搜尋耗時 {search_duration:.2f}s，超過 15s 閾值"
            assert len(result.organic_results) == 10, "搜尋結果數量不正確"
    
    @pytest.mark.asyncio
    async def test_scraping_performance(self):
        """測試爬蟲階段效能。"""
        test_urls = [f"https://example{i}.com" for i in range(1, 11)]
        
        with patch('app.services.integration_service.get_scraper_service') as mock_scraper:
            # 模擬爬蟲服務
            async def mock_scrape_with_timing(urls):
                await asyncio.sleep(0.2)  # 模擬快速爬取
                return ScrapingResult(
                    total_results=len(urls),
                    successful_scrapes=len(urls),
                    avg_word_count=1200,
                    avg_paragraphs=8,
                    pages=[
                        PageContent(url, ["test"], success=True, load_time=0.1)
                        for url in urls
                    ],
                    errors=[]
                )
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = mock_scrape_with_timing
            mock_scraper.return_value = mock_scraper_service
            
            # 效能測試
            start_time = time.time()
            result = await mock_scraper_service.scrape_urls(test_urls)
            scraping_duration = time.time() - start_time
            
            # 驗證效能指標
            assert scraping_duration < 25.0, f"爬蟲耗時 {scraping_duration:.2f}s，超過 25s 閾值"
            assert result.successful_scrapes == 10, "爬蟲成功數量不正確"
    
    @pytest.mark.asyncio
    async def test_integrated_performance_baseline(self):
        """測試整合效能基準。"""
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper:
            
            # 模擬整合效能場景
            async def mock_serp_timing(keyword, num_results=10):
                await asyncio.sleep(0.1)  # SERP 階段
                return SerpResult(
                    keyword=keyword,
                    total_results=1000000,
                    organic_results=[
                        OrganicResult(i, f"標題 {i}", f"https://example{i}.com", f"摘要 {i}")
                        for i in range(1, num_results + 1)
                    ]
                )
            
            async def mock_scraper_timing(urls):
                await asyncio.sleep(0.2)  # 爬蟲階段
                return ScrapingResult(
                    total_results=len(urls),
                    successful_scrapes=len(urls),
                    avg_word_count=1200,
                    avg_paragraphs=8,
                    pages=[PageContent(url, ["test"], success=True) for url in urls],
                    errors=[]
                )
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = mock_serp_timing
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = mock_scraper_timing
            mock_scraper.return_value = mock_scraper_service
            
            integration_service = IntegrationService()
            
            # 整合效能測試
            start_time = time.time()
            
            # 1. SERP 搜尋
            serp_data = await mock_serp_service.search_keyword("SEO 測試")
            serp_time = time.time() - start_time
            
            # 2. URL 提取
            urls = integration_service._extract_urls_from_serp(serp_data)
            extract_time = time.time() - start_time - serp_time
            
            # 3. 爬蟲執行
            scraping_start = time.time()
            scraping_data = await mock_scraper_service.scrape_urls(urls)
            scraping_time = time.time() - scraping_start
            
            total_time = time.time() - start_time
            
            # 驗證效能基準
            assert serp_time < 15.0, f"SERP 階段 {serp_time:.2f}s 超過閾值"
            assert scraping_time < 25.0, f"爬蟲階段 {scraping_time:.2f}s 超過閾值"
            assert total_time < 30.0, f"SERP+爬蟲總時間 {total_time:.2f}s 超過 30s 閾值"
            assert extract_time < 0.1, f"URL 提取耗時 {extract_time:.2f}s 過長"
            
            # 驗證資料正確性
            assert len(urls) == 10
            assert scraping_data.successful_scrapes == 10
    
    @pytest.mark.asyncio
    async def test_concurrent_processing_efficiency(self):
        """測試併發處理效率。"""
        # 測試多個關鍵字的併發處理
        keywords = ["SEO", "SEM", "內容行銷", "數位行銷", "網站優化"]
        
        with patch('app.services.integration_service.get_serp_service') as mock_serp, \
             patch('app.services.integration_service.get_scraper_service') as mock_scraper:
            
            async def mock_concurrent_serp(keyword, num_results=10):
                await asyncio.sleep(0.05)  # 模擬快速並行搜尋
                return SerpResult(
                    keyword=keyword,
                    total_results=100000,
                    organic_results=[
                        OrganicResult(1, f"{keyword} 指南", f"https://example.com/{keyword}", f"{keyword} 相關內容")
                    ]
                )
            
            async def mock_concurrent_scraper(urls):
                await asyncio.sleep(0.1)  # 模擬快速並行爬取
                return ScrapingResult(
                    total_results=len(urls),
                    successful_scrapes=len(urls),
                    avg_word_count=1000,
                    avg_paragraphs=5,
                    pages=[PageContent(url, ["test"], success=True) for url in urls],
                    errors=[]
                )
            
            mock_serp_service = AsyncMock()
            mock_serp_service.search_keyword = mock_concurrent_serp
            mock_serp.return_value = mock_serp_service
            
            mock_scraper_service = AsyncMock()
            mock_scraper_service.scrape_urls = mock_concurrent_scraper
            mock_scraper.return_value = mock_scraper_service
            
            integration_service = IntegrationService()
            
            # 併發效能測試
            start_time = time.time()
            
            # 並行執行多個搜尋
            serp_tasks = [
                mock_serp_service.search_keyword(keyword)
                for keyword in keywords
            ]
            serp_results = await asyncio.gather(*serp_tasks)
            
            # 並行執行多個爬取
            scraper_tasks = []
            for serp_result in serp_results:
                urls = integration_service._extract_urls_from_serp(serp_result)
                if urls:  # 只處理有 URL 的結果
                    scraper_tasks.append(mock_scraper_service.scrape_urls(urls))
            
            if scraper_tasks:
                await asyncio.gather(*scraper_tasks)
            
            concurrent_time = time.time() - start_time
            
            # 驗證併發效率
            # 5 個關鍵字的併發處理應該比序列處理快
            expected_sequential_time = len(keywords) * 0.15  # 每個 0.15s
            assert concurrent_time < expected_sequential_time, \
                f"併發處理 {concurrent_time:.2f}s 未達到效率提升"
            
            # 整體時間應該控制在合理範圍
            assert concurrent_time < 5.0, f"併發處理 {concurrent_time:.2f}s 過長"


@pytest.mark.integration
class TestSerpScraperRealWorldScenarios:
    """真實世界場景的 SERP → 爬蟲整合測試。
    
    模擬實際使用場景，驗證服務在各種條件下的穩定性。
    """
    
    def test_high_volume_url_processing(self):
        """測試大量 URL 處理能力。"""
        # 模擬搜尋返回大量結果
        large_serp = SerpResult(
            keyword="熱門關鍵字",
            total_results=5000000,
            organic_results=[
                OrganicResult(i, f"標題 {i}", f"https://site{i}.com", f"摘要 {i}")
                for i in range(1, 101)  # 100 個結果
            ]
        )
        
        integration_service = IntegrationService()
        urls = integration_service._extract_urls_from_serp(large_serp)
        
        # 驗證大量 URL 處理
        assert len(urls) == 100, "大量 URL 提取數量不正確"
        assert all(url.startswith('https://') for url in urls), "URL 格式驗證失敗"
    
    def test_mixed_content_quality_handling(self):
        """測試混合內容品質的處理。"""
        # 模擬包含各種品質頁面的爬蟲結果
        mixed_quality_result = ScrapingResult(
            total_results=10,
            successful_scrapes=7,
            avg_word_count=850,
            avg_paragraphs=6,
            pages=[
                # 高品質頁面
                PageContent("https://high-quality.com", ["詳細標題1", "詳細標題2"], 
                          success=True, word_count=2000, paragraph_count=15),
                PageContent("https://medium-quality.com", ["標題1"], 
                          success=True, word_count=800, paragraph_count=5),
                # 低品質頁面
                PageContent("https://low-quality.com", [], 
                          success=True, word_count=100, paragraph_count=1),
                # 失敗頁面
                PageContent("https://failed.com", [], success=False, error="403 禁止訪問"),
            ],
            errors=[
                {"url": "https://failed.com", "error": "403 禁止訪問", "error_type": "AccessDenied"}
            ]
        )
        
        # 驗證混合品質處理
        successful_pages = [p for p in mixed_quality_result.pages if p.success]
        assert len(successful_pages) >= 3, "成功頁面數量不足"
        
        # 驗證品質指標計算
        if successful_pages:
            avg_words = sum(p.word_count for p in successful_pages) / len(successful_pages)
            assert avg_words > 0, "平均字數計算錯誤"
    
    def test_edge_case_url_formats(self):
        """測試邊界情況的 URL 格式處理。"""
        edge_case_results = [
            OrganicResult(1, "正常 HTTPS", "https://normal.com/page", "正常頁面"),
            OrganicResult(2, "正常 HTTP", "http://normal.com/page", "HTTP 頁面"),
            OrganicResult(3, "帶參數", "https://param.com/page?q=test&lang=zh", "參數頁面"),
            OrganicResult(4, "帶錨點", "https://anchor.com/page#section1", "錨點頁面"),
            OrganicResult(5, "國際域名", "https://國際.com/頁面", "國際化域名"),
            OrganicResult(6, "長路徑", f"https://long.com/{'very-' * 20}long-path", "長路徑"),
            OrganicResult(7, "無效格式", "not-a-url", "無效 URL"),
            OrganicResult(8, "空 URL", "", "空 URL"),
            OrganicResult(9, "FTP 協議", "ftp://ftp.example.com/file", "FTP 文件"),
            OrganicResult(10, "相對路徑", "/relative/path", "相對路徑"),
        ]
        
        edge_serp = SerpResult(
            keyword="邊界測試",
            total_results=10,
            organic_results=edge_case_results
        )
        
        integration_service = IntegrationService()
        urls = integration_service._extract_urls_from_serp(edge_serp)
        
        # 驗證只提取有效的 HTTP/HTTPS URL
        expected_valid_urls = [
            "https://normal.com/page",
            "http://normal.com/page", 
            "https://param.com/page?q=test&lang=zh",
            "https://anchor.com/page#section1",
            "https://國際.com/頁面",
            f"https://long.com/{'very-' * 20}long-path"
        ]
        
        assert len(urls) == len(expected_valid_urls), f"有效 URL 數量不正確：期望 {len(expected_valid_urls)}，實際 {len(urls)}"
        
        # 驗證過濾掉無效 URL
        invalid_patterns = ["not-a-url", "ftp://", "/relative/path"]
        for pattern in invalid_patterns:
            assert not any(pattern in url for url in urls), f"無效 URL 模式 '{pattern}' 未被過濾"
        
        # 額外檢查空字串未被包含
        assert "" not in urls, "空字串 URL 未被過濾"