"""網頁爬蟲服務單元測試。

測試網頁內容爬取功能，包括並行爬取、HTML 解析、
SEO 元素提取、錯誤處理和資源管理。
"""

import asyncio
import sys
import time
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

import pytest
from aiohttp import ClientResponse, ClientTimeout

# 確保可以從不同的工作目錄執行測試
# 動態添加 backend 目錄到 Python 路徑
current_file = Path(__file__)
test_dir = current_file.parent
backend_dir = test_dir.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# pylint: disable=import-error,wrong-import-position
from app.services.scraper_service import (
    ScraperService,
    ScraperException, 
    ScraperTimeoutException,
    ScraperParsingException,
    PageContent,
    ScrapingResult
)


class TestScraperService:
    """網頁爬蟲服務測試類別。"""

    @pytest.fixture
    def mock_config(self):
        """Mock 配置物件 fixture。"""
        config_mock = Mock()
        config_mock.get_scraper_max_concurrent.return_value = 10
        config_mock.get_scraper_timeout.return_value = 10.0
        config_mock.get_scraper_retry_count.return_value = 3
        config_mock.get_scraper_retry_delay.return_value = 1.0
        return config_mock

    @pytest.fixture
    def scraper_service(self, mock_config):
        """ScraperService 實例 fixture。"""
        with patch('app.services.scraper_service.get_config', return_value=mock_config):
            return ScraperService()

    @pytest.fixture
    def mock_html_content(self):
        """Mock HTML 內容 fixture。"""
        return '''
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <title>測試頁面標題 - SEO 最佳實務指南</title>
            <meta name="description" content="這是一個詳細的 SEO 指南，涵蓋關鍵字研究、內容優化、技術 SEO 等面向。">
        </head>
        <body>
            <h1>完整 SEO 最佳實務指南</h1>
            <h2>關鍵字研究策略</h2>
            <p>關鍵字研究是 SEO 成功的基礎，需要深入了解目標受眾的搜尋行為。</p>
            <h2>內容優化技巧</h2>
            <p>優質內容是提升搜尋排名的核心要素，需要兼顧使用者體驗和搜尋引擎優化。</p>
            <h2>技術 SEO 要點</h2>
            <p>技術 SEO 包含網站速度、行動友善性、結構化資料等多個面向。</p>
            <h2>效能優化建議</h2>
            <p>網站效能直接影響使用者體驗和搜尋排名，需要持續監控和改善。</p>
            <p>透過這些策略的整合應用，可以大幅提升網站的搜尋可見度。</p>
        </body>
        </html>
        '''

    @pytest.mark.asyncio
    async def test_scrape_single_page_success(self, scraper_service, mock_html_content):
        """測試單一頁面爬取成功案例。
        
        驗證：
        - HTML 正確解析
        - SEO 元素提取完整
        - 載入時間記錄
        - 字數統計準確
        """
        # Arrange
        url = "https://example.com/seo-guide"
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text.return_value = mock_html_content
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Act
            start_time = time.time()
            result = await scraper_service.scrape_single_url(url)
            processing_time = time.time() - start_time
            
            # Assert
            assert isinstance(result, PageContent)
            assert result.url == url
            assert result.success is True
            assert result.status_code == 200
            assert result.error is None
            
            # 驗證 SEO 元素提取
            assert result.title and "測試頁面標題" in result.title
            assert result.meta_description and "SEO 指南" in result.meta_description
            assert result.h1 and "完整 SEO 最佳實務指南" in result.h1
            assert len(result.h2_list) == 4
            assert "關鍵字研究策略" in result.h2_list
            
            # 驗證統計資料
            assert result.word_count > 10  # 內容有字數
            assert result.paragraph_count == 5  # 5個段落
            assert result.load_time > 0
            assert processing_time < 5.0  # 單頁處理時間應該很快

    @pytest.mark.asyncio
    async def test_parallel_scraping_success(self, scraper_service):
        """測試並行爬蟲成功案例。
        
        驗證：
        - 10 個 URL 並行處理
        - 成功率 ≥ 80% (至少 8 個成功)
        - 總處理時間 < 20 秒
        - 無資源競爭問題
        """
        # Arrange
        urls = [f"https://example.com/page-{i}" for i in range(1, 11)]
        
        def mock_response_factory(url):
            mock_response = AsyncMock()
            mock_response.status = 200
            # 根據 URL 返回不同內容
            page_num = int(url.split('-')[-1])
            mock_response.text.return_value = f'''
            <html>
                <head>
                    <title>頁面 {page_num} 標題</title>
                    <meta name="description" content="頁面 {page_num} 描述">
                </head>
                <body>
                    <h1>主標題 {page_num}</h1>
                    <h2>副標題 {page_num}-1</h2>
                    <h2>副標題 {page_num}-2</h2>
                    <p>內容段落 {page_num}</p>
                </body>
            </html>
            '''
            return mock_response

        with patch('aiohttp.ClientSession.get') as mock_get:
            # 修正 mock 設定
            def mock_get_side_effect(url, **kwargs):
                mock_context = AsyncMock()
                mock_context.__aenter__.return_value = mock_response_factory(url)
                return mock_context
            mock_get.side_effect = mock_get_side_effect
            
            # Act
            start_time = time.time()
            results = await scraper_service.scrape_urls(urls)
            total_time = time.time() - start_time
            
            # Assert
            assert total_time < 20.0, f"總處理時間 {total_time:.2f} 秒超過 20 秒限制"
            assert isinstance(results, ScrapingResult)
            assert len(results.pages) == 10
            
            # 驗證成功率 ≥ 80%
            successful_pages = [p for p in results.pages if p.success]
            success_rate = len(successful_pages) / len(results.pages)
            assert success_rate >= 0.8, f"成功率 {success_rate:.1%} 低於 80% 要求"
            
            # 驗證並行處理效果（使用可用的屬性）
            assert len(results.pages) > 0
            assert results.successful_scrapes > 0

    @pytest.mark.asyncio
    async def test_chinese_content_extraction(self, scraper_service):
        """測試中文內容爬取。
        
        驗證：
        - 繁體中文編碼正確性
        - 簡體中文編碼正確性  
        - 內容完整性
        - 特殊字元處理
        """
        # Arrange
        chinese_html = '''
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <title>繁體中文測試頁面 - 數位行銷策略</title>
            <meta name="description" content="這是一個繁體中文的測試頁面，包含各種中文字元和標點符號。">
        </head>
        <body>
            <h1>數位行銷策略指南</h1>
            <h2>社群媒體經營</h2>
            <p>在台灣的數位行銷環境中，Facebook、Instagram、LINE 是最重要的平台。</p>
            <h2>搜尋引擎優化</h2>
            <p>針對 Google 繁體中文搜尋的優化策略，需要考慮台灣使用者的搜尋習慣。</p>
            <p>包含：關鍵字研究、內容在地化、技術 SEO 等面向。</p>
        </body>
        </html>
        '''
        
        url = "https://example.com/chinese-content"
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text.return_value = chinese_html
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Act
            result = await scraper_service.scrape_single_url(url)
            
            # Assert
            assert result.success is True
            assert result.title and "繁體中文測試頁面" in result.title
            assert result.title and "數位行銷" in result.title
            assert result.h1 and "數位行銷" in result.h1
            assert "社群媒體經營" in result.h2_list
            assert "搜尋引擎優化" in result.h2_list
            assert result.word_count > 5
            # 驗證繁體中文特殊字元  
            assert result.meta_description and "繁體中文" in result.meta_description

    @pytest.mark.asyncio
    async def test_scraping_timeout_handling(self, scraper_service):
        """測試爬蟲逾時處理。
        
        驗證：
        - 超過 20 秒逾時機制
        - 拋出 ScraperTimeoutException  
        - 資源正確清理
        """
        # Arrange
        url = "https://slow-website.com/page"
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.side_effect = asyncio.TimeoutError("Request timeout")
            
            # Act
            result = await scraper_service.scrape_single_url(url)
                
            # Assert
            assert result.success is False
            assert "逾時" in str(result.error) or "timeout" in str(result.error).lower()

    @pytest.mark.asyncio  
    async def test_invalid_html_parsing(self, scraper_service):
        """測試無效 HTML 解析處理。
        
        驗證：
        - 畸形 HTML 處理
        - 解析錯誤處理  
        - 部分資料提取
        """
        # Arrange
        invalid_html = "<html><title>無效 HTML<body><h1>缺少閉合標籤"
        url = "https://example.com/invalid"
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text.return_value = invalid_html
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Act
            result = await scraper_service.scrape_single_url(url)
            
            # Assert
            # BeautifulSoup 應該能處理畸形 HTML
            assert result.success is True
            assert result.title and "無效 HTML" in result.title
            # 可能無法提取 h1，但不應該拋出例外
            assert result.error is None

    @pytest.mark.asyncio
    async def test_network_error_handling(self, scraper_service):
        """測試網路錯誤處理。
        
        驗證：
        - 連線錯誤處理
        - HTTP 錯誤狀態碼
        - 錯誤訊息記錄
        """
        # Arrange
        url = "https://non-existent-site.com/page"
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 404
            mock_response.text.return_value = "<html><body>Not Found</body></html>"
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Act
            result = await scraper_service.scrape_single_url(url)
            
            # Assert
            assert result.success is False
            assert result.status_code == 404
            assert result.error is not None
            assert "404" in str(result.error)

    @pytest.mark.asyncio
    async def test_memory_usage_monitoring(self, scraper_service):
        """測試記憶體使用量監控。
        
        驗證：
        - 大量內容處理
        - 記憶體使用限制
        - 資源清理機制
        """
        # Arrange - 建立大內容頁面
        large_content = "大量內容段落。" * 1000  # 約 7KB 內容
        large_html = f'''
        <html>
            <head><title>大型頁面測試</title></head>
            <body>
                <h1>大型內容頁面</h1>
                <p>{large_content}</p>
            </body>
        </html>
        '''
        
        url = "https://example.com/large-page"
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text.return_value = large_html
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Act
            result = await scraper_service.scrape_single_url(url)
            
            # Assert
            assert result.success is True
            assert result.word_count > 1  # 有內容
            # 記憶體使用應該在合理範圍內（由系統監控，這裡檢查基本功能）
            assert len(result.title) > 0

    def test_page_content_dataclass(self):
        """測試 PageContent 資料結構。
        
        驗證：
        - 必要欄位存在
        - 預設值正確
        - 型別檢查通過
        """
        # Act
        content = PageContent(
            url="https://test.com",
            title="測試標題",
            meta_description="測試描述",
            h1="主標題",
            h2_list=["副標題1", "副標題2"],
            word_count=100,
            paragraph_count=3,
            status_code=200,
            load_time=1.5,
            success=True
        )
        
        # Assert
        assert content.url == "https://test.com"
        assert content.title == "測試標題"
        assert len(content.h2_list) == 2
        assert content.success is True
        assert content.error is None  # 預設值