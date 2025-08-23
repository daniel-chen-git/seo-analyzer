#!/usr/bin/env python3
"""
API 層級錯誤處理整合測試

測試通過 HTTP API 的完整錯誤處理流程，確保錯誤能正確傳遞到 API 層級。
"""

import asyncio
import json
import time
from typing import Dict, Any
from unittest.mock import patch

import httpx
from app.services.serp_service import SerpAPIException
from app.services.scraper_service import ScraperTimeoutException
from app.services.ai_service import AIAPIException


class APIErrorIntegrationTester:
    """API 錯誤整合測試器。"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.test_results = []

    async def run_api_error_tests(self) -> Dict[str, Any]:
        """執行 API 層級錯誤整合測試。"""
        print("🌐 開始 API 層級錯誤整合測試")
        print("=" * 50)

        # 標準有效請求
        valid_request = {
            "keyword": "測試關鍵字",
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False, 
                "include_table": False
            }
        }

        # API 錯誤測試情境
        error_scenarios = [
            ("API 正常請求測試", self.test_normal_api_request, valid_request),
            ("API SERP 錯誤響應測試", self.test_api_serp_error, valid_request),
            ("API 爬蟲錯誤響應測試", self.test_api_scraper_error, valid_request),
            ("API AI 錯誤響應測試", self.test_api_ai_error, valid_request),
            ("API 並發錯誤測試", self.test_concurrent_api_errors, valid_request)
        ]

        for test_name, test_func, request_data in error_scenarios:
            print(f"\n🔍 執行: {test_name}")
            try:
                result = await test_func(request_data)
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

    async def test_normal_api_request(self, request_data: Dict) -> Dict[str, Any]:
        """測試正常 API 請求（基線測試）。"""
        start_time = time.time()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/analyze",
                json=request_data,
                timeout=60.0
            )
            
            processing_time = time.time() - start_time
            
            return {
                "success": response.status_code == 200,
                "status_code": response.status_code,
                "processing_time": processing_time,
                "response_size": len(response.content),
                "message": f"正常請求 - 狀態碼: {response.status_code}, 處理時間: {processing_time:.2f}s"
            }

    async def test_api_serp_error(self, request_data: Dict) -> Dict[str, Any]:
        """測試 API SERP 錯誤響應。"""
        # 導入需要 mock 的模組
        from app.services.integration_service import get_integration_service
        
        integration_service = get_integration_service()
        
        with patch.object(integration_service.serp_service, 'search_keyword', side_effect=SerpAPIException("API quota exhausted")):
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/analyze",
                    json=request_data,
                    timeout=30.0
                )
                
                response_json = response.json()
                
                return {
                    "success": (
                        response.status_code == 503 and
                        response_json.get("status") == "error" and
                        response_json.get("error", {}).get("code") == "SERP_API_ERROR"
                    ),
                    "status_code": response.status_code,
                    "response": response_json,
                    "message": f"SERP API 錯誤響應 - 狀態碼: {response.status_code}, 錯誤碼: {response_json.get('error', {}).get('code', 'N/A')}"
                }

    async def test_api_scraper_error(self, request_data: Dict) -> Dict[str, Any]:
        """測試 API 爬蟲錯誤響應。"""
        from app.services.integration_service import get_integration_service
        
        integration_service = get_integration_service()
        
        with patch.object(integration_service.scraper_service, 'scrape_urls', side_effect=ScraperTimeoutException("All URLs timeout")):
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/analyze",
                    json=request_data,
                    timeout=30.0
                )
                
                response_json = response.json()
                
                return {
                    "success": (
                        response.status_code == 504 and
                        response_json.get("status") == "error" and
                        response_json.get("error", {}).get("code") == "SCRAPER_TIMEOUT"
                    ),
                    "status_code": response.status_code,
                    "response": response_json,
                    "message": f"爬蟲錯誤響應 - 狀態碼: {response.status_code}, 錯誤碼: {response_json.get('error', {}).get('code', 'N/A')}"
                }

    async def test_api_ai_error(self, request_data: Dict) -> Dict[str, Any]:
        """測試 API AI 錯誤響應。"""
        from app.services.integration_service import get_integration_service
        
        integration_service = get_integration_service()
        
        with patch.object(integration_service.ai_service, 'analyze_seo_content', side_effect=AIAPIException("OpenAI service down")):
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/analyze",
                    json=request_data,
                    timeout=60.0  # AI 階段可能需要更長時間
                )
                
                response_json = response.json()
                
                return {
                    "success": (
                        response.status_code == 503 and
                        response_json.get("status") == "error" and
                        response_json.get("error", {}).get("code") == "AI_API_ERROR"
                    ),
                    "status_code": response.status_code,
                    "response": response_json,
                    "message": f"AI API 錯誤響應 - 狀態碼: {response.status_code}, 錯誤碼: {response_json.get('error', {}).get('code', 'N/A')}"
                }

    async def test_concurrent_api_errors(self, request_data: Dict) -> Dict[str, Any]:
        """測試並發 API 錯誤處理。"""
        from app.services.integration_service import get_integration_service
        
        integration_service = get_integration_service()
        
        # 模擬同時發生的不同錯誤
        requests = []
        
        # 請求 1: SERP 錯誤
        with patch.object(integration_service.serp_service, 'search_keyword', side_effect=SerpAPIException("SERP error")):
            requests.append(self._make_api_request(request_data))
        
        # 請求 2: 爬蟲錯誤  
        with patch.object(integration_service.scraper_service, 'scrape_urls', side_effect=ScraperTimeoutException("Scraper timeout")):
            requests.append(self._make_api_request(request_data))
        
        # 並發執行
        try:
            responses = await asyncio.gather(*requests[:2], return_exceptions=True)  # 只測試前兩個
            
            # 分析結果
            serp_error_handled = False
            scraper_error_handled = False
            
            for response in responses:
                if isinstance(response, dict):
                    if response.get("status_code") == 503:
                        serp_error_handled = True
                    elif response.get("status_code") == 504:
                        scraper_error_handled = True
            
            return {
                "success": serp_error_handled or scraper_error_handled,  # 至少一個錯誤被正確處理
                "serp_handled": serp_error_handled,
                "scraper_handled": scraper_error_handled,
                "responses": responses,
                "message": f"並發錯誤處理 - SERP: {'✅' if serp_error_handled else '❌'}, 爬蟲: {'✅' if scraper_error_handled else '❌'}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"並發測試執行失敗: {str(e)}"
            }

    async def _make_api_request(self, request_data: Dict) -> Dict[str, Any]:
        """製作單個 API 請求。"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/analyze",
                    json=request_data,
                    timeout=30.0
                )
                
                return {
                    "status_code": response.status_code,
                    "response": response.json()
                }
            except Exception as e:
                return {
                    "error": str(e),
                    "status_code": None
                }

    def generate_summary(self) -> Dict[str, Any]:
        """生成測試結果摘要。"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["status"] == "PASS")
        failed_tests = sum(1 for result in self.test_results if result["status"] == "FAIL")
        error_tests = sum(1 for result in self.test_results if result["status"] == "ERROR")
        
        print("\n" + "=" * 50)
        print("📊 API 錯誤整合測試結果摘要")
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
    tester = APIErrorIntegrationTester()
    
    print("🌐 API 層級錯誤處理整合測試")
    print("測試完整的錯誤處理流程...")
    print()
    
    # 檢查伺服器狀態
    try:
        async with httpx.AsyncClient() as client:
            health_response = await client.get("http://localhost:8001/api/health", timeout=5.0)
            if health_response.status_code != 200:
                print("❌ 伺服器健康檢查失敗")
                return
            print("✅ 伺服器連線正常")
    except Exception as e:
        print(f"❌ 無法連接到伺服器: {str(e)}")
        return
    
    summary = await tester.run_api_error_tests()
    
    # 保存結果
    with open("/Users/danielchen/test/seo-analyzer/backend/api_error_integration_results.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 詳細測試結果已保存至 api_error_integration_results.json")


if __name__ == "__main__":
    asyncio.run(main())