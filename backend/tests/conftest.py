"""pytest 全域配置檔案。

提供測試環境設定、共用 fixtures、Mock 配置和測試資料準備。
"""

import asyncio
import sys
import os
from pathlib import Path

# 添加專案根目錄到 Python 路徑
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock
from typing import Dict, Any, List

# 設定 pytest-asyncio 模式
pytestmark = pytest.mark.asyncio


@pytest.fixture(scope="session")
def event_loop():
    """提供事件迴圈給整個測試 session。"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_config():
    """Mock 配置資料 fixture。"""
    return {
        "serpapi": {
            "api_key": "test_serpapi_key_12345",
            "timeout": 10,
            "max_results": 10
        },
        "azure_openai": {
            "api_key": "test_azure_key_12345", 
            "endpoint": "https://test-azure-openai.openai.azure.com",
            "deployment_name": "gpt-4o-test",
            "api_version": "2024-02-01",
            "timeout": 30,
            "max_tokens": 8000
        },
        "scraper": {
            "timeout": 20,
            "max_concurrent": 10,
            "user_agent": "SEO-Analyzer-Test/1.0"
        }
    }


@pytest.fixture
def mock_serp_response():
    """Mock SerpAPI 回應資料 fixture。"""
    return {
        "organic_results": [
            {
                "position": 1,
                "title": "測試標題 1 - 最佳 SEO 優化指南",
                "link": "https://example.com/seo-guide-1",
                "snippet": "這是一個關於 SEO 優化的詳細指南，涵蓋關鍵字研究、內容策略等。",
                "displayed_link": "example.com › seo-guide-1"
            },
            {
                "position": 2,
                "title": "測試標題 2 - SEO 工具推薦",
                "link": "https://example.com/seo-tools-2", 
                "snippet": "推薦最實用的 SEO 工具，包括關鍵字分析、排名追蹤等功能。",
                "displayed_link": "example.com › seo-tools-2"
            },
            # 補齊到 10 個結果以符合測試要求
            *[
                {
                    "position": i,
                    "title": f"測試標題 {i} - SEO 相關內容",
                    "link": f"https://example.com/seo-content-{i}",
                    "snippet": f"第 {i} 個搜尋結果的摘要內容，包含 SEO 相關資訊。",
                    "displayed_link": f"example.com › seo-content-{i}"
                }
                for i in range(3, 11)
            ]
        ],
        "search_metadata": {
            "status": "Success",
            "total_time_taken": 2.5,
            "processed_at": "2025-08-27 11:30:00 UTC"
        }
    }


@pytest.fixture
def mock_scraper_response():
    """Mock 爬蟲回應資料 fixture。"""
    return {
        "url": "https://example.com/test-page",
        "title": "測試頁面標題 - SEO 最佳實務",
        "meta_description": "這是一個測試頁面的 meta description，長度適中並包含關鍵字。",
        "h1": "主要標題：SEO 最佳實務指南",
        "h2_list": [
            "關鍵字研究策略",
            "內容優化技巧", 
            "技術 SEO 要點",
            "效能優化建議"
        ],
        "word_count": 1250,
        "paragraph_count": 8,
        "status_code": 200,
        "load_time": 1.2,
        "success": True,
        "error": None
    }


@pytest.fixture
def mock_ai_response():
    """Mock AI 服務回應資料 fixture。"""
    return {
        "analysis": """# SEO 分析報告

## 執行摘要
針對關鍵字「SEO 優化」的競爭對手分析已完成，以下是主要發現：

## 關鍵字競爭分析
- **競爭強度**: 中等
- **搜尋意圖**: 資訊導向 (80%) + 商業導向 (20%)
- **內容缺口**: 技術 SEO 實務案例

## 內容策略建議
1. **主要內容方向**: 實務操作指南
2. **建議字數**: 1,500-2,000 字
3. **關鍵標題結構**: H1 → H2 → H3 層次清晰

## 競爭對手分析
| 網站 | 標題策略 | 內容深度 | 技術優化 |
|------|----------|----------|----------|
| 網站1 | 基礎介紹 | 中等 | 良好 |
| 網站2 | 工具導向 | 深入 | 優秀 |

## 行動建議
- 強化技術 SEO 內容
- 增加實務案例分享
- 優化頁面載入速度
""",
        "token_usage": {
            "prompt_tokens": 2500,
            "completion_tokens": 800,
            "total_tokens": 3300
        },
        "processing_time": 15.2
    }


@pytest.fixture
def mock_page_contents():
    """Mock 多個頁面內容資料，用於爬蟲測試。"""
    return [
        {
            "url": f"https://example.com/page-{i}",
            "title": f"測試頁面 {i} - SEO 內容",
            "meta_description": f"第 {i} 個測試頁面的 meta description。",
            "h1": f"主標題 {i}",
            "h2_list": [f"副標題 {i}-1", f"副標題 {i}-2"],
            "word_count": 800 + i * 50,
            "paragraph_count": 4 + i,
            "status_code": 200,
            "load_time": 0.8 + i * 0.1,
            "success": True,
            "error": None
        }
        for i in range(1, 11)
    ]