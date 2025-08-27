"""整合測試配置和 fixtures。

提供 FastAPI 測試客戶端、資料庫設定和服務模擬
供整合測試場景使用。
"""

import asyncio
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Generator, AsyncGenerator
from unittest.mock import Mock, AsyncMock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient

# 添加專案根目錄到路徑
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from app.main import app
from app.models.request import AnalyzeRequest, AnalyzeOptions


@pytest.fixture(scope="session")
def event_loop():
    """為測試 session 建立事件迴圈。"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_client() -> Generator[TestClient, None, None]:
    """提供同步測試用的 FastAPI 測試客戶端。"""
    with TestClient(app) as client:
        yield client


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """提供非同步測試用的 HTTP 客戶端。"""
    from app.main import app
    from httpx import ASGITransport
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
def sample_analyze_request() -> AnalyzeRequest:
    """提供測試用的範例分析請求。"""
    return AnalyzeRequest(
        keyword="SEO 優化",
        audience="數位行銷新手",
        options=AnalyzeOptions(
            generate_draft=True,
            include_faq=True,
            include_table=False
        )
    )


@pytest.fixture
def sample_simple_request() -> AnalyzeRequest:
    """提供基本測試用的簡單分析請求。"""
    return AnalyzeRequest(
        keyword="Python 教學",
        audience="程式初學者",
        options=AnalyzeOptions(
            generate_draft=False,
            include_faq=False,
            include_table=False
        )
    )


@pytest.fixture
def mock_integration_service():
    """模擬整合服務，提供預定義的回應。"""

    async def mock_execute_full_analysis(request):
        """模擬完整分析執行。"""
        await asyncio.sleep(0.1)  # 模擬處理時間

        from app.models.response import (
            AnalyzeResponse, SerpSummary, AnalysisMetadata, AnalysisData
        )

        metadata = AnalysisMetadata(
            keyword=request.keyword,
            audience=request.audience,
            generated_at="2025-08-27T12:00:00Z",
            token_usage=3500,
            total_phases_time=15.5,
            phase_timings={
                "serp_duration": 2.5,
                "scraping_duration": 5.0,
                "ai_duration": 8.0,
                "total_duration": 15.5
            }
        )

        serp_summary = SerpSummary(
            total_results=10,
            successful_scrapes=8,
            avg_word_count=1200,
            avg_paragraphs=8
        )

        analysis_data = AnalysisData(
            analysis_report="# 模擬分析報告\n\n這是測試用的模擬分析報告。",
            metadata=metadata,
            serp_summary=serp_summary
        )

        return AnalyzeResponse(
            status="success",
            data=analysis_data,
            processing_time=15.5
        )

    mock_service = AsyncMock()
    mock_service.execute_full_analysis = mock_execute_full_analysis
    mock_service.execute_full_analysis_with_progress = mock_execute_full_analysis

    return mock_service


@pytest.fixture
def mock_serp_service():
    """模擬 SERP API 服務。"""

    async def mock_search(keyword):
        await asyncio.sleep(0.1)  # 模擬 API 呼叫

        # 建立模擬搜尋結果
        organic_results = []
        for i in range(1, 11):
            organic_results.append({
                "position": i,
                "title": f"測試標題 {i} - {keyword}",
                "link": f"https://example{i}.com/test-page",
                "snippet": f"測試摘要 {i} 關於 {keyword}",
                "displayed_link": f"example{i}.com"
            })

        return {
            "organic_results": organic_results,
            "total_results": 1000000,
            "search_metadata": {
                "status": "Success",
                "total_time_taken": 2.5,
                "processed_at": "2025-08-27 12:00:00 UTC"
            }
        }

    async def mock_test_connection():
        await asyncio.sleep(0.1)
        return True

    mock_service = AsyncMock()
    mock_service.search = mock_search
    mock_service._test_connection = mock_test_connection

    return mock_service


@pytest.fixture
def mock_scraper_service():
    """Mock web scraper service."""
    
    async def mock_scrape_urls(urls):
        await asyncio.sleep(0.2)  # Simulate scraping time
        
        results = []
        for i, url in enumerate(urls, 1):
            results.append({
                "url": url,
                "title": f"Scraped Title {i}",
                "meta_description": f"Scraped meta description {i}",
                "h1": f"Main heading {i}",
                "h2_list": [f"Subheading {i}-1", f"Subheading {i}-2"],
                "word_count": 1200 + i * 50,
                "paragraph_count": 8 + i,
                "status_code": 200,
                "load_time": 0.8 + i * 0.1,
                "success": True,
                "error": None
            })
        
        return results
    
    mock_service = AsyncMock()
    mock_service.scrape_urls = mock_scrape_urls
    
    return mock_service


@pytest.fixture
def mock_ai_service():
    """Mock AI service."""
    
    async def mock_analyze_content(keyword, audience, serp_result, scraped_contents, options):
        await asyncio.sleep(0.3)  # Simulate AI processing time
        
        return {
            "analysis": f"""# AI Analysis Report for "{keyword}"

## Executive Summary
This is a comprehensive SEO analysis for the keyword "{keyword}" targeting "{audience}".

## Competition Analysis
- Total competitors analyzed: {len(scraped_contents)}
- Average content length: 1,500 words
- Competition level: Medium

## Recommendations
1. Focus on detailed tutorials and guides
2. Include practical examples
3. Optimize for user intent

## Content Strategy
Based on the analysis, create content that addresses the specific needs of "{audience}".
""",
            "token_usage": {
                "prompt_tokens": 2000,
                "completion_tokens": 1500,
                "total_tokens": 3500
            },
            "processing_time": 8.0
        }
    
    async def mock_test_connection():
        await asyncio.sleep(0.1)
        return True
    
    mock_service = AsyncMock()
    mock_service.analyze_content = mock_analyze_content
    mock_service._test_connection = mock_test_connection
    
    return mock_service


@pytest.fixture
def mock_job_manager():
    """Mock job manager for async job testing."""
    
    class MockJobStatus:
        def __init__(self, job_id: str):
            from app.models.status import JobProgress
            self.job_id = job_id
            self.status = "pending"
            self.progress = JobProgress(
                current_step=1,
                message="任務已建立，等待處理...",
                percentage=0.0
            )
            self.result = None
            self.error = None
            self.created_at = datetime.utcnow()
            self.updated_at = datetime.utcnow()
    
    def mock_create_job():
        job_id = f"test-job-{int(time.time())}"
        return MockJobStatus(job_id)
    
    def mock_get_job_status(job_id):
        if job_id.startswith("test-job-"):
            return MockJobStatus(job_id)
        return None
    
    def mock_complete_job(job_id, result):
        pass
    
    mock_manager = Mock()
    mock_manager.create_job = mock_create_job
    mock_manager.get_job_status = mock_get_job_status
    mock_manager.complete_job = mock_complete_job
    
    return mock_manager


@pytest.fixture
def performance_monitor():
    """Monitor test performance metrics."""
    
    class PerformanceMonitor:
        def __init__(self):
            self.start_time = None
            self.metrics = {}
        
        def start(self):
            self.start_time = time.time()
        
        def record(self, metric_name: str, value: float):
            self.metrics[metric_name] = value
        
        def elapsed(self) -> float:
            if self.start_time is None:
                return 0.0
            return time.time() - self.start_time
        
        def get_metrics(self) -> dict:
            return {
                "elapsed_time": self.elapsed(),
                **self.metrics
            }
    
    return PerformanceMonitor()


@pytest.fixture
def test_app():
    """提供測試用的 FastAPI 應用程式實例。"""
    from app.main import app
    return app


@pytest.fixture
def websocket_manager():
    """提供 WebSocket 管理器的 mock 實例。"""
    from unittest.mock import AsyncMock
    
    class MockWebSocketManager:
        def __init__(self):
            self.connections = {}
            self.analysis_connections = {}
        
        async def send_progress(self, analysis_id: str, progress_message):
            # 模擬發送進度訊息
            pass
        
        async def add_connection(self, connection_id: str, websocket):
            self.connections[connection_id] = websocket
        
        async def remove_connection(self, connection_id: str):
            self.connections.pop(connection_id, None)
        
        async def subscribe_to_analysis(self, connection_id: str, analysis_id: str):
            # 模擬訂閱分析
            if analysis_id not in self.analysis_connections:
                self.analysis_connections[analysis_id] = set()
            self.analysis_connections[analysis_id].add(connection_id)
        
        async def unsubscribe_from_analysis(self, connection_id: str, analysis_id: str):
            # 模擬取消訂閱
            if analysis_id in self.analysis_connections:
                self.analysis_connections[analysis_id].discard(connection_id)
                if not self.analysis_connections[analysis_id]:
                    del self.analysis_connections[analysis_id]
        
        async def send_error(self, connection_id: str, error_code: str, error_message: str, details=None):
            # 模擬發送錯誤訊息
            pass
        
        def get_connection_count(self) -> int:
            # 模擬取得連線數量
            return len(self.connections)
        
        def get_analysis_subscriber_count(self, analysis_id: str) -> int:
            # 模擬取得分析訂閱者數量
            return len(self.analysis_connections.get(analysis_id, set()))
        
        async def broadcast_message(self, message):
            # 模擬廣播訊息
            pass
    
    return MockWebSocketManager()


@pytest.fixture
def mock_progress_data():
    """提供測試用的進度資料。"""
    return {
        "phases": [
            {
                "name": "serp_search",
                "display_name": "SERP 搜尋",
                "progress_range": (0, 25),
                "messages": [
                    "開始搜尋競爭對手網站...",
                    "分析搜尋結果...",
                    "完成 SERP 分析"
                ]
            },
            {
                "name": "content_scraping",
                "display_name": "內容爬取",
                "progress_range": (25, 70),
                "messages": [
                    "爬取競爭對手網站內容...",
                    "分析頁面結構...",
                    "提取關鍵內容"
                ]
            },
            {
                "name": "ai_analysis",
                "display_name": "AI 分析",
                "progress_range": (70, 100),
                "messages": [
                    "生成競爭分析報告...",
                    "優化內容建議...",
                    "完成分析報告"
                ]
            }
        ],
        "sample_details": {
            "total_urls": 10,
            "processed_urls": 0,
            "current_url": "",
            "tokens_used": 0,
            "max_tokens": 8000
        }
    }