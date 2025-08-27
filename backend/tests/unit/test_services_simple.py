"""服務層簡化測試。

測試核心服務類別的基本功能，專注於資料結構和基本邏輯。
"""

import pytest
from unittest.mock import Mock, patch

from app.services.serp_service import OrganicResult, SerpResult
from app.services.scraper_service import PageContent
from app.services.ai_service import AnalysisOptions, AnalysisResult


class TestServiceDataStructures:
    """測試服務層資料結構。"""

    def test_organic_result_creation(self):
        """測試 OrganicResult 資料結構建立。"""
        # Act
        result = OrganicResult(
            position=1,
            title="測試標題",
            link="https://example.com",
            snippet="測試摘要",
            displayed_link="example.com"
        )

        # Assert
        assert result.position == 1
        assert result.title == "測試標題"
        assert result.link == "https://example.com"
        assert result.snippet == "測試摘要"
        assert result.displayed_link == "example.com"

    def test_serp_result_creation(self):
        """測試 SerpResult 資料結構建立。"""
        # Arrange
        organic_results = [
            OrganicResult(1, "標題1", "https://example1.com", "摘要1", "example1.com"),
            OrganicResult(2, "標題2", "https://example2.com", "摘要2", "example2.com")
        ]

        # Act
        result = SerpResult(
            keyword="測試關鍵字",
            total_results=2,
            organic_results=organic_results
        )

        # Assert
        assert result.keyword == "測試關鍵字"
        assert result.total_results == 2
        assert len(result.organic_results) == 2
        assert result.organic_results[0].title == "標題1"

    def test_page_content_creation(self):
        """測試 PageContent 資料結構建立。"""
        # Act  
        content = PageContent(
            url="https://test.com",
            title="測試標題",
            meta_description="測試描述",
            h1="主標題",
            h2_list=["副標題1", "副標題2"],
            word_count=100,
            paragraph_count=5,
            status_code=200,
            load_time=1.5,
            success=True
        )

        # Assert
        assert content.url == "https://test.com"
        assert content.title == "測試標題"
        assert content.meta_description == "測試描述"
        assert content.h1 == "主標題"
        assert len(content.h2_list) == 2
        assert content.word_count == 100
        assert content.success is True
        assert content.error is None  # 預設值

    def test_analysis_options_creation(self):
        """測試 AnalysisOptions 資料結構建立。"""
        # Act
        options = AnalysisOptions(
            generate_draft=True,
            include_faq=False,
            include_table=True
        )

        # Assert
        assert options.generate_draft is True
        assert options.include_faq is False
        assert options.include_table is True

    def test_analysis_result_creation(self):
        """測試 AnalysisResult 資料結構建立。"""
        # Act
        result = AnalysisResult(
            analysis_report="# 測試報告\n## 內容分析\n這是測試內容。",
            token_usage=2500,
            processing_time=15.5,
            success=True,
            error=None
        )

        # Assert
        assert result.analysis_report.startswith("# 測試報告")
        assert result.token_usage == 2500
        assert result.processing_time == 15.5
        assert result.success is True
        assert result.error is None

    def test_analysis_result_with_error(self):
        """測試 AnalysisResult 帶錯誤的情況。"""
        # Act
        result = AnalysisResult(
            analysis_report="",
            token_usage=0,
            processing_time=0.0,
            success=False,
            error="API 呼叫失敗"
        )

        # Assert
        assert result.success is False
        assert result.error == "API 呼叫失敗"
        assert result.analysis_report == ""


class TestServiceIntegration:
    """測試服務整合功能。"""

    @pytest.fixture
    def mock_config_object(self):
        """建立 Mock Config 物件。"""
        config_mock = Mock()
        config_mock.get_serp_api_key.return_value = "test_api_key"
        config_mock.get_openai_api_key.return_value = "test_openai_key"
        config_mock.get_openai_endpoint.return_value = "https://test.openai.azure.com/"
        config_mock.get_openai_deployment_name.return_value = "gpt-4o"
        config_mock.get_scraper_timeout.return_value = 10.0
        config_mock.get_scraper_max_concurrent.return_value = 10
        return config_mock

    def test_serp_service_initialization(self, mock_config_object):
        """測試 SerpService 初始化。"""
        from app.services.serp_service import SerpService
        
        # Arrange & Act
        with patch('app.services.serp_service.get_config', return_value=mock_config_object):
            service = SerpService()
            
            # Assert
            assert service.api_key == "test_api_key"
            assert hasattr(service, 'search_keyword')

    def test_scraper_service_initialization(self, mock_config_object):
        """測試 ScraperService 初始化。"""
        from app.services.scraper_service import ScraperService
        
        # Arrange & Act
        with patch('app.services.scraper_service.get_config', return_value=mock_config_object):
            service = ScraperService()
            
            # Assert
            assert service.timeout == 10.0
            assert service.max_concurrent == 10
            assert hasattr(service, 'scrape_urls')  # 實際的方法名
            assert hasattr(service, 'scrape_single_url')

    def test_ai_service_initialization(self, mock_config_object):
        """測試 AIService 初始化。"""
        from app.services.ai_service import AIService
        
        # Arrange & Act
        with patch('app.services.ai_service.get_config', return_value=mock_config_object):
            service = AIService()
            
            # Assert
            assert service.api_key == "test_openai_key"
            assert service.endpoint == "https://test.openai.azure.com/"
            assert hasattr(service, 'analyze_seo_content')  # 實際的方法名

    def test_data_flow_compatibility(self):
        """測試資料流相容性。"""
        # Arrange - 模擬完整的資料流
        
        # 1. SERP 結果
        organic_results = [
            OrganicResult(1, "SEO指南", "https://example.com/seo", "SEO優化指南", "example.com"),
        ]
        serp_result = SerpResult("SEO優化", 10, organic_results)
        
        # 2. 爬蟲結果
        page_content = PageContent(
            url="https://example.com/seo",
            title="SEO優化完整指南",
            meta_description="最完整的SEO優化教學", 
            h1="SEO優化指南",
            h2_list=["關鍵字研究", "內容優化"],
            word_count=1500,
            paragraph_count=10,
            status_code=200,
            load_time=1.2,
            success=True
        )
        
        # 3. AI 分析選項
        options = AnalysisOptions(True, True, True)
        
        # 4. AI 分析結果
        analysis_result = AnalysisResult(
            analysis_report="# SEO分析報告\n## 關鍵字分析\n競爭程度：中等",
            token_usage=3000,
            processing_time=20.5,
            success=True
        )
        
        # Assert - 驗證資料流相容性
        assert serp_result.keyword == "SEO優化"
        assert serp_result.organic_results[0].link == page_content.url
        assert page_content.success == analysis_result.success
        assert "SEO" in analysis_result.analysis_report
        
        # 驗證資料可以正確傳遞
        assert len(serp_result.organic_results) > 0
        assert page_content.word_count > 0
        assert analysis_result.token_usage > 0