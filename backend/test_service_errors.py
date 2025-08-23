#!/usr/bin/env python3
"""
服務層錯誤情境測試腳本

測試 SERP、爬蟲、AI 服務的各種錯誤處理情境。
"""

import asyncio
import json
import time
from typing import Dict, Any
from unittest.mock import patch, AsyncMock

import httpx
from app.services.integration_service import get_integration_service
from app.services.serp_service import SerpAPIException
from app.services.scraper_service import ScraperTimeoutException, ScraperException
from app.services.ai_service import AIServiceException, AIAPIException, TokenLimitExceededException
from app.models.request import AnalyzeRequest, AnalyzeOptions


class ServiceErrorTester:
    """服務層錯誤測試器。"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.integration_service = get_integration_service()
        self.test_results = []

    async def run_service_error_tests(self) -> Dict[str, Any]:
        """執行服務層錯誤測試。"""
        print("🔧 開始服務層錯誤情境測試")
        print("=" * 50)

        # 測試正常請求（確保服務基本運作）
        test_request = AnalyzeRequest(
            keyword="測試關鍵字",
            audience="測試受眾",
            options=AnalyzeOptions(
                generate_draft=False,
                include_faq=False,
                include_table=False
            )
        )

        # 服務錯誤測試情境
        error_scenarios = [
            ("SERP API 錯誤模擬", self.test_serp_api_error, test_request),
            ("爬蟲超時錯誤模擬", self.test_scraper_timeout, test_request),
            ("爬蟲一般錯誤模擬", self.test_scraper_general_error, test_request),
            ("AI API 錯誤模擬", self.test_ai_api_error, test_request),
            ("AI Token 限制錯誤模擬", self.test_ai_token_limit, test_request),
            ("多重服務錯誤模擬", self.test_multiple_service_errors, test_request)
        ]

        for test_name, test_func, request in error_scenarios:
            print(f"\n🔍 執行: {test_name}")
            try:
                result = await test_func(request)
                self.test_results.append({
                    "test_name": test_name,
                    "status": "PASS" if result["success"] else "FAIL",
                    "details": result
                })
                status_emoji = "✅" if result["success"] else "❌"
                print(f"{status_emoji} {test_name}: {result['message']}")
            except Exception as e:
                self.test_results.append({
                    "test_name": test_name,
                    "status": "ERROR", 
                    "details": {"error": str(e)}
                })
                print(f"💥 {test_name}: 測試執行錯誤 - {str(e)}")

        return self.generate_summary()

    async def test_serp_api_error(self, request: AnalyzeRequest) -> Dict[str, Any]:
        """測試 SERP API 錯誤處理。"""
        with patch.object(self.integration_service.serp_service, 'search_keyword', side_effect=SerpAPIException("SerpAPI quota exceeded")):
            try:
                result = await self.integration_service.execute_full_analysis(request)
                return {
                    "success": False,
                    "message": "SERP 錯誤未被正確處理",
                    "result": result
                }
            except SerpAPIException as e:
                # 檢查錯誤處理
                error_response, status_code = self.integration_service.handle_analysis_error(e, 2.5)
                return {
                    "success": status_code == 503 and error_response.error["code"] == "SERP_API_ERROR",
                    "message": f"SERP 錯誤處理 - 錯誤碼: {error_response.error['code']}, 狀態碼: {status_code}",
                    "error_response": error_response.model_dump()
                }

    async def test_scraper_timeout(self, request: AnalyzeRequest) -> Dict[str, Any]:
        """測試爬蟲超時錯誤處理。"""
        with patch.object(self.integration_service.scraper_service, 'scrape_urls', side_effect=ScraperTimeoutException("Scraping timeout occurred")):
            try:
                result = await self.integration_service.execute_full_analysis(request)
                return {
                    "success": False,
                    "message": "爬蟲超時錯誤未被正確處理",
                    "result": result
                }
            except ScraperTimeoutException as e:
                error_response, status_code = self.integration_service.handle_analysis_error(e, 15.2)
                return {
                    "success": status_code == 504 and error_response.error["code"] == "SCRAPER_TIMEOUT",
                    "message": f"爬蟲超時錯誤處理 - 錯誤碼: {error_response.error['code']}, 狀態碼: {status_code}",
                    "error_response": error_response.model_dump()
                }

    async def test_scraper_general_error(self, request: AnalyzeRequest) -> Dict[str, Any]:
        """測試爬蟲一般錯誤處理。"""
        with patch.object(self.integration_service.scraper_service, 'scrape_urls', side_effect=ScraperException("Network connection failed")):
            try:
                result = await self.integration_service.execute_full_analysis(request)
                return {
                    "success": False,
                    "message": "爬蟲一般錯誤未被正確處理",
                    "result": result
                }
            except ScraperException as e:
                error_response, status_code = self.integration_service.handle_analysis_error(e, 8.3)
                return {
                    "success": status_code == 504 and error_response.error["code"] == "SCRAPER_TIMEOUT",
                    "message": f"爬蟲一般錯誤處理 - 錯誤碼: {error_response.error['code']}, 狀態碼: {status_code}",
                    "error_response": error_response.model_dump()
                }

    async def test_ai_api_error(self, request: AnalyzeRequest) -> Dict[str, Any]:
        """測試 AI API 錯誤處理。"""
        with patch.object(self.integration_service.ai_service, 'analyze_seo_content', side_effect=AIAPIException("Azure OpenAI service unavailable")):
            try:
                result = await self.integration_service.execute_full_analysis(request)
                return {
                    "success": False,
                    "message": "AI API 錯誤未被正確處理",
                    "result": result
                }
            except AIAPIException as e:
                error_response, status_code = self.integration_service.handle_analysis_error(e, 22.1)
                return {
                    "success": status_code == 503 and error_response.error["code"] == "AI_API_ERROR",
                    "message": f"AI API 錯誤處理 - 錯誤碼: {error_response.error['code']}, 狀態碼: {status_code}",
                    "error_response": error_response.model_dump()
                }

    async def test_ai_token_limit(self, request: AnalyzeRequest) -> Dict[str, Any]:
        """測試 AI Token 限制錯誤處理。"""
        with patch.object(self.integration_service.ai_service, 'analyze_seo_content', side_effect=TokenLimitExceededException("Token limit exceeded for the request")):
            try:
                result = await self.integration_service.execute_full_analysis(request)
                return {
                    "success": False,
                    "message": "AI Token 限制錯誤未被正確處理",
                    "result": result
                }
            except TokenLimitExceededException as e:
                error_response, status_code = self.integration_service.handle_analysis_error(e, 18.7)
                return {
                    "success": status_code == 503 and error_response.error["code"] == "AI_API_ERROR",
                    "message": f"AI Token 限制錯誤處理 - 錯誤碼: {error_response.error['code']}, 狀態碼: {status_code}",
                    "error_response": error_response.model_dump()
                }

    async def test_multiple_service_errors(self, request: AnalyzeRequest) -> Dict[str, Any]:
        """測試多重服務錯誤處理。"""
        # 模擬連續錯誤: SERP 成功 -> 爬蟲失敗
        original_scrape = self.integration_service.scraper_service.scrape_urls
        
        async def mock_scrape_with_error(urls):
            # 第一次調用失敗
            raise ScraperException("All scraping attempts failed")
        
        with patch.object(self.integration_service.scraper_service, 'scrape_urls', side_effect=mock_scrape_with_error):
            try:
                result = await self.integration_service.execute_full_analysis(request)
                return {
                    "success": False,
                    "message": "多重服務錯誤未被正確處理",
                    "result": result
                }
            except Exception as e:
                error_response, status_code = self.integration_service.handle_analysis_error(e, 25.6)
                return {
                    "success": status_code >= 400,
                    "message": f"多重服務錯誤處理 - 錯誤類型: {type(e).__name__}, 狀態碼: {status_code}",
                    "error_response": error_response.model_dump()
                }

    def generate_summary(self) -> Dict[str, Any]:
        """生成測試結果摘要。"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["status"] == "PASS")
        failed_tests = sum(1 for result in self.test_results if result["status"] == "FAIL")
        error_tests = sum(1 for result in self.test_results if result["status"] == "ERROR")
        
        print("\n" + "=" * 50)
        print("📊 服務層錯誤測試結果摘要")
        print("=" * 50)
        print(f"總測試數: {total_tests}")
        print(f"✅ 通過: {passed_tests}")
        print(f"❌ 失敗: {failed_tests}")
        print(f"💥 錯誤: {error_tests}")
        print(f"成功率: {(passed_tests/total_tests*100):.1f}%")
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "errors": error_tests,
            "success_rate": passed_tests / total_tests * 100 if total_tests > 0 else 0,
            "details": self.test_results
        }


async def main():
    """主要執行函數。"""
    tester = ServiceErrorTester()
    
    print("🔧 服務層錯誤情境測試")
    print("測試各種服務錯誤的處理機制...")
    print()
    
    summary = await tester.run_service_error_tests()
    
    # 保存結果
    with open("/Users/danielchen/test/seo-analyzer/backend/service_error_results.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 詳細測試結果已保存至 service_error_results.json")


if __name__ == "__main__":
    asyncio.run(main())