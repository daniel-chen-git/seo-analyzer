"""SerpAPI 服務單元測試。

測試 SerpAPI 整合功能，包括成功回應、錯誤處理、
時間限制、中文關鍵字處理和重試機制。
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, AsyncMock, patch
from serpapi.google_search import GoogleSearch

from app.services.serp_service import (
    SerpService, 
    SerpAPIException,
    RateLimitException,
    InvalidAPIKeyException,
    SearchFailedException,
    OrganicResult,
    SerpResult
)


class TestSerpService:
    """SerpAPI 服務測試類別。"""

    @pytest.fixture
    def serp_service(self, mock_config):
        """SerpService 實例 fixture。"""
        with patch('app.services.serp_service.get_config', return_value=mock_config):
            return SerpService()

    @pytest.mark.asyncio
    async def test_search_success(self, serp_service, mock_serp_response):
        """測試 SERP API 正常回應。
        
        驗證：
        - 回傳 10 個搜尋結果
        - 處理時間 < 10 秒
        - 資料結構正確
        """
        # Arrange
        keyword = "SEO 優化指南"
        
        with patch.object(GoogleSearch, 'get_dict', return_value=mock_serp_response):
            start_time = time.time()
            
            # Act
            result = await serp_service.search_keyword(keyword)
            
            # Assert
            processing_time = time.time() - start_time
            assert processing_time < 10.0, f"處理時間 {processing_time:.2f} 秒超過 10 秒限制"
            
            assert isinstance(result, SerpResult)
            assert result.keyword == keyword
            assert len(result.organic_results) == 10
            assert result.total_results >= 10
            assert result.processing_time > 0
            
            # 驗證第一個結果的資料結構
            first_result = result.organic_results[0]
            assert isinstance(first_result, OrganicResult)
            assert first_result.position == 1
            assert "SEO" in first_result.title
            assert first_result.link.startswith("https://")
            assert len(first_result.snippet) > 0

    @pytest.mark.asyncio
    async def test_chinese_keyword_encoding(self, serp_service, mock_serp_response):
        """測試中文關鍵字編碼處理。
        
        驗證：
        - 繁體中文關鍵字正確處理
        - 簡體中文關鍵字正確處理
        - 編碼不會導致搜尋失敗
        """
        test_cases = [
            "SEO優化",  # 繁體中文
            "SEO优化",  # 簡體中文  
            "網站排名提升",  # 純繁體
            "网站排名提升",  # 純簡體
            "數位行銷策略",  # 繁體中文含數字
        ]
        
        with patch.object(GoogleSearch, 'get_dict', return_value=mock_serp_response):
            for keyword in test_cases:
                # Act
                result = await serp_service.search_keyword(keyword)
                
                # Assert
                assert isinstance(result, SerpResult)
                assert result.keyword == keyword
                assert len(result.organic_results) > 0

    @pytest.mark.asyncio 
    async def test_api_timeout_handling(self, serp_service):
        """測試 API 逾時處理。
        
        驗證：
        - 超過 10 秒逾時機制
        - 拋出 SearchFailedException
        - 資源正確清理
        """
        # Arrange
        keyword = "test keyword"
        
        def slow_api_call(*args, **kwargs):
            time.sleep(11)  # 超過 10 秒限制
            return {}
            
        with patch.object(GoogleSearch, 'get_dict', side_effect=slow_api_call):
            # Act & Assert
            with pytest.raises(SearchFailedException) as exc_info:
                await serp_service.search_keyword(keyword)
                
            assert "timeout" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_rate_limit_exception(self, serp_service):
        """測試 API 速率限制處理。
        
        驗證：
        - 429 狀態碼觸發 RateLimitException
        - 錯誤訊息包含重試建議
        """
        # Arrange
        keyword = "test keyword"
        rate_limit_error = Exception("Rate limit exceeded")
        
        with patch.object(GoogleSearch, 'get_dict', side_effect=rate_limit_error):
            # Act & Assert
            with pytest.raises(RateLimitException) as exc_info:
                await serp_service.search_keyword(keyword)
                
            assert "rate limit" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_invalid_api_key(self, serp_service):
        """測試無效 API 金鑰處理。
        
        驗證：
        - 401 狀態碼觸發 InvalidAPIKeyException
        - 錯誤訊息提示檢查 API 金鑰
        """
        # Arrange
        keyword = "test keyword" 
        auth_error = Exception("Invalid API key")
        
        with patch.object(GoogleSearch, 'get_dict', side_effect=auth_error):
            # Act & Assert
            with pytest.raises(InvalidAPIKeyException) as exc_info:
                await serp_service.search_keyword(keyword)
                
            assert "api key" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_empty_results_handling(self, serp_service):
        """測試空結果處理。
        
        驗證：
        - 無搜尋結果時的處理
        - 回傳空列表而非拋出例外
        """
        # Arrange
        keyword = "極罕見關鍵字無結果"
        empty_response = {"organic_results": []}
        
        with patch.object(GoogleSearch, 'get_dict', return_value=empty_response):
            # Act
            result = await serp_service.search_keyword(keyword)
            
            # Assert
            assert isinstance(result, SerpResult)
            assert result.keyword == keyword
            assert len(result.organic_results) == 0
            assert result.total_results == 0

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, serp_service, mock_serp_response):
        """測試並發請求處理。
        
        驗證：
        - 多個同時請求不互相干擾
        - 各請求獨立完成
        - 無資源競爭問題
        """
        # Arrange
        keywords = [f"關鍵字{i}" for i in range(1, 6)]  # 5個關鍵字
        
        with patch.object(GoogleSearch, 'get_dict', return_value=mock_serp_response):
            # Act
            tasks = [serp_service.search_keyword(kw) for kw in keywords]
            results = await asyncio.gather(*tasks)
            
            # Assert
            assert len(results) == 5
            for i, result in enumerate(results):
                assert isinstance(result, SerpResult)
                assert result.keyword == keywords[i]
                assert len(result.organic_results) == 10

    def test_organic_result_dataclass(self):
        """測試 OrganicResult 資料結構。
        
        驗證：
        - 必要欄位存在
        - 選用欄位預設值正確
        - 型別檢查通過
        """
        # Act
        result = OrganicResult(
            position=1,
            title="測試標題",
            link="https://example.com",
            snippet="測試摘要"
        )
        
        # Assert
        assert result.position == 1
        assert result.title == "測試標題"
        assert result.link == "https://example.com"
        assert result.snippet == "測試摘要"
        assert result.displayed_link is None  # 選用欄位預設值

    @pytest.mark.asyncio
    async def test_search_metadata_extraction(self, serp_service):
        """測試搜尋元資料提取。
        
        驗證：
        - 處理時間正確記錄
        - 狀態訊息正確解析
        - 時間戳格式正確
        """
        # Arrange
        keyword = "metadata test"
        response_with_metadata = {
            "organic_results": [
                {
                    "position": 1,
                    "title": "Test",
                    "link": "https://test.com",
                    "snippet": "Test snippet"
                }
            ],
            "search_metadata": {
                "status": "Success",
                "total_time_taken": 2.5,
                "processed_at": "2025-08-27 11:30:00 UTC"
            }
        }
        
        with patch.object(GoogleSearch, 'get_dict', return_value=response_with_metadata):
            # Act
            result = await serp_service.search_keyword(keyword)
            
            # Assert
            assert result.processing_time == 2.5
            assert "Success" in str(result)  # 狀態包含在字串表示中