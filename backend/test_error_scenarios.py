#!/usr/bin/env python3
"""
錯誤情境測試腳本

用於測試 SEO 分析器在各種錯誤情況下的處理機制。
"""

import asyncio
import json
import time
from typing import Dict, Any

import httpx
from app.models.request import AnalyzeRequest, AnalyzeOptions


class ErrorScenarioTester:
    """錯誤情境測試器。"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        """初始化測試器。
        
        Args:
            base_url: API 基礎 URL
        """
        self.base_url = base_url
        self.test_results = []

    async def run_all_tests(self) -> Dict[str, Any]:
        """執行所有錯誤情境測試。
        
        Returns:
            測試結果摘要
        """
        print("🧪 開始錯誤情境測試")
        print("=" * 50)
        
        test_scenarios = [
            ("無效輸入參數測試", self.test_invalid_input),
            ("空關鍵字測試", self.test_empty_keyword),
            ("超長關鍵字測試", self.test_long_keyword),
            ("無效 JSON 格式測試", self.test_invalid_json),
            ("缺少必要欄位測試", self.test_missing_fields),
        ]
        
        for test_name, test_func in test_scenarios:
            print(f"\n📋 執行: {test_name}")
            try:
                result = await test_func()
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

    async def test_invalid_input(self) -> Dict[str, Any]:
        """測試無效輸入參數。"""
        invalid_request = {
            "keyword": "",  # 空關鍵字
            "audience": "",  # 空受眾
            "options": {
                "generate_draft": "invalid_boolean",  # 無效布林值
                "include_faq": None,
                "include_table": "yes"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/analyze",
                json=invalid_request,
                timeout=30.0
            )
            
            return {
                "success": response.status_code == 422,  # 期望驗證錯誤
                "status_code": response.status_code,
                "response": response.json() if response.status_code != 500 else {"error": "Internal server error"},
                "message": f"狀態碼: {response.status_code} (期望: 422)"
            }

    async def test_empty_keyword(self) -> Dict[str, Any]:
        """測試空關鍵字。"""
        request_data = {
            "keyword": "",
            "audience": "測試受眾",
            "options": {
                "generate_draft": True,
                "include_faq": False,
                "include_table": False
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/analyze",
                json=request_data,
                timeout=30.0
            )
            
            return {
                "success": response.status_code == 422,
                "status_code": response.status_code,
                "response": response.json() if response.status_code != 500 else {"error": "Internal server error"},
                "message": f"空關鍵字處理 - 狀態碼: {response.status_code}"
            }

    async def test_long_keyword(self) -> Dict[str, Any]:
        """測試超長關鍵字。"""
        long_keyword = "這是一個非常長的關鍵字" * 10  # 超過 50 字元限制
        
        request_data = {
            "keyword": long_keyword,
            "audience": "測試受眾",
            "options": {
                "generate_draft": True,
                "include_faq": False,
                "include_table": False
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/analyze",
                json=request_data,
                timeout=30.0
            )
            
            return {
                "success": response.status_code == 422,
                "status_code": response.status_code,
                "response": response.json() if response.status_code != 500 else {"error": "Internal server error"},
                "message": f"超長關鍵字處理 - 關鍵字長度: {len(long_keyword)} 字元"
            }

    async def test_invalid_json(self) -> Dict[str, Any]:
        """測試無效 JSON 格式。"""
        invalid_json = '{"keyword": "測試", "audience": "測試受眾", "options": {'  # 不完整的 JSON
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/analyze",
                    content=invalid_json,
                    headers={"Content-Type": "application/json"},
                    timeout=30.0
                )
                
                return {
                    "success": response.status_code == 422,
                    "status_code": response.status_code,
                    "response": response.json() if response.status_code != 500 else {"error": "Internal server error"},
                    "message": f"無效 JSON 處理 - 狀態碼: {response.status_code}"
                }
            except Exception as e:
                return {
                    "success": True,  # 期望會有錯誤
                    "status_code": None,
                    "response": {"error": str(e)},
                    "message": f"無效 JSON 正確拋出例外: {type(e).__name__}"
                }

    async def test_missing_fields(self) -> Dict[str, Any]:
        """測試缺少必要欄位。"""
        incomplete_request = {
            "keyword": "測試關鍵字"
            # 缺少 audience 和 options
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/analyze",
                json=incomplete_request,
                timeout=30.0
            )
            
            return {
                "success": response.status_code == 422,
                "status_code": response.status_code,
                "response": response.json() if response.status_code != 500 else {"error": "Internal server error"},
                "message": f"缺少欄位處理 - 狀態碼: {response.status_code}"
            }

    def generate_summary(self) -> Dict[str, Any]:
        """生成測試結果摘要。"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["status"] == "PASS")
        failed_tests = sum(1 for result in self.test_results if result["status"] == "FAIL")
        error_tests = sum(1 for result in self.test_results if result["status"] == "ERROR")
        
        print("\n" + "=" * 50)
        print("📊 測試結果摘要")
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
            "success_rate": passed_tests / total_tests * 100,
            "details": self.test_results
        }


async def main():
    """主要執行函數。"""
    tester = ErrorScenarioTester()
    
    print("⚠️  請確保 FastAPI 伺服器正在運行 (port 8001)")
    print("   啟動命令: python -m uvicorn app.main:app --reload --port 8001")
    print()
    
    try:
        # 先測試伺服器是否可用
        async with httpx.AsyncClient() as client:
            health_response = await client.get("http://localhost:8001/api/health", timeout=5.0)
            if health_response.status_code != 200:
                print("❌ 伺服器健康檢查失敗")
                return
            print("✅ 伺服器連線正常")
    except Exception as e:
        print(f"❌ 無法連接到伺服器: {str(e)}")
        print("請確保伺服器正在運行")
        return
    
    summary = await tester.run_all_tests()
    
    # 保存詳細結果到檔案
    with open("/Users/danielchen/test/seo-analyzer/backend/test_results.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 詳細測試結果已保存至 test_results.json")


if __name__ == "__main__":
    asyncio.run(main())