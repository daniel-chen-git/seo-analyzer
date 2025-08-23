#!/usr/bin/env python3
"""
效能指標與警告機制測試腳本

測試系統的效能監控、階段計時和警告機制是否正常運作。
"""

import asyncio
import json
import time
from typing import Dict, Any, List
from statistics import mean, median

import httpx


class PerformanceMetricsTester:
    """效能指標測試器。"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.test_results = []
        
        # 效能閾值 (來自 integration_service.py)
        self.thresholds = {
            "serp_duration": 15.0,
            "scraping_duration": 25.0,
            "ai_duration": 35.0,
            "total_duration": 55.0
        }

    async def run_performance_tests(self) -> Dict[str, Any]:
        """執行完整的效能測試。"""
        print("⚡ 開始效能指標與警告機制測試")
        print("=" * 50)

        test_scenarios = [
            ("基準效能測試", self.test_baseline_performance),
            ("多關鍵字效能比較", self.test_multiple_keywords_performance),
            ("不同選項效能影響", self.test_options_performance_impact),
            ("並發處理效能", self.test_concurrent_performance),
            ("長時間運行穩定性", self.test_long_running_stability)
        ]

        for test_name, test_func in test_scenarios:
            print(f"\n🔍 執行: {test_name}")
            try:
                result = await test_func()
                self.test_results.append({
                    "test_name": test_name,
                    "status": "PASS" if result.get("success", True) else "FAIL",
                    "details": result
                })
                status_emoji = "✅" if result.get("success", True) else "❌"
                print(f"{status_emoji} {test_name}: {result.get('message', '已完成')}")
            except Exception as e:
                self.test_results.append({
                    "test_name": test_name,
                    "status": "ERROR",
                    "details": {"error": str(e)}
                })
                print(f"💥 {test_name}: 測試執行錯誤 - {str(e)}")

        return self.generate_summary()

    async def test_baseline_performance(self) -> Dict[str, Any]:
        """測試基準效能。"""
        test_data = {
            "keyword": "SEO 工具",
            "audience": "數位行銷人員",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }

        start_time = time.time()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/analyze",
                json=test_data,
                timeout=70.0
            )
            
            total_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                processing_time = data.get("processing_time", total_time)
                
                # 檢查是否超過總時間閾值
                exceeds_threshold = processing_time > self.thresholds["total_duration"]
                
                return {
                    "success": True,
                    "processing_time": processing_time,
                    "total_request_time": total_time,
                    "exceeds_threshold": exceeds_threshold,
                    "threshold": self.thresholds["total_duration"],
                    "token_usage": data.get("data", {}).get("metadata", {}).get("token_usage", 0),
                    "message": f"處理時間: {processing_time:.2f}s {'⚠️ 超過閾值' if exceeds_threshold else '✅ 符合要求'}"
                }
            else:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "message": f"請求失敗，狀態碼: {response.status_code}"
                }

    async def test_multiple_keywords_performance(self) -> Dict[str, Any]:
        """測試多個關鍵字的效能比較。"""
        keywords = [
            "Python 教學",
            "機器學習",
            "數位行銷策略",
            "網站 SEO 優化",
            "人工智慧應用"
        ]
        
        results = []
        
        for keyword in keywords:
            test_data = {
                "keyword": keyword,
                "audience": "技術專業人員",
                "options": {
                    "generate_draft": False,
                    "include_faq": False,
                    "include_table": False
                }
            }
            
            start_time = time.time()
            
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.post(
                        f"{self.base_url}/api/analyze",
                        json=test_data,
                        timeout=70.0
                    )
                    
                    total_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        processing_time = data.get("processing_time", total_time)
                        
                        results.append({
                            "keyword": keyword,
                            "processing_time": processing_time,
                            "total_request_time": total_time,
                            "success": True
                        })
                    else:
                        results.append({
                            "keyword": keyword,
                            "success": False,
                            "status_code": response.status_code
                        })
                        
                except Exception as e:
                    results.append({
                        "keyword": keyword,
                        "success": False,
                        "error": str(e)
                    })
                
                # 間隔一些時間避免過度負載
                await asyncio.sleep(2)
        
        # 統計分析
        successful_results = [r for r in results if r.get("success", False)]
        
        if successful_results:
            processing_times = [r["processing_time"] for r in successful_results]
            avg_time = mean(processing_times)
            median_time = median(processing_times)
            max_time = max(processing_times)
            min_time = min(processing_times)
            
            return {
                "success": True,
                "total_tests": len(results),
                "successful_tests": len(successful_results),
                "avg_processing_time": avg_time,
                "median_processing_time": median_time,
                "max_processing_time": max_time,
                "min_processing_time": min_time,
                "results": results,
                "message": f"平均處理時間: {avg_time:.2f}s, 中位數: {median_time:.2f}s, 範圍: {min_time:.2f}s-{max_time:.2f}s"
            }
        else:
            return {
                "success": False,
                "message": "所有測試都失敗",
                "results": results
            }

    async def test_options_performance_impact(self) -> Dict[str, Any]:
        """測試不同選項對效能的影響。"""
        base_data = {
            "keyword": "內容行銷策略",
            "audience": "行銷經理"
        }
        
        option_scenarios = [
            {
                "name": "基本分析",
                "options": {"generate_draft": False, "include_faq": False, "include_table": False}
            },
            {
                "name": "包含 FAQ", 
                "options": {"generate_draft": False, "include_faq": True, "include_table": False}
            },
            {
                "name": "包含表格",
                "options": {"generate_draft": False, "include_faq": False, "include_table": True}
            },
            {
                "name": "完整功能",
                "options": {"generate_draft": True, "include_faq": True, "include_table": True}
            }
        ]
        
        results = []
        
        for scenario in option_scenarios:
            test_data = {**base_data, "options": scenario["options"]}
            
            start_time = time.time()
            
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.post(
                        f"{self.base_url}/api/analyze",
                        json=test_data,
                        timeout=80.0  # 更長的超時時間給完整功能
                    )
                    
                    total_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        processing_time = data.get("processing_time", total_time)
                        token_usage = data.get("data", {}).get("metadata", {}).get("token_usage", 0)
                        
                        results.append({
                            "scenario": scenario["name"],
                            "processing_time": processing_time,
                            "token_usage": token_usage,
                            "success": True
                        })
                    else:
                        results.append({
                            "scenario": scenario["name"],
                            "success": False,
                            "status_code": response.status_code
                        })
                        
                except Exception as e:
                    results.append({
                        "scenario": scenario["name"],
                        "success": False,
                        "error": str(e)
                    })
                
                await asyncio.sleep(3)  # 較長間隔
        
        # 效能影響分析
        successful_results = [r for r in results if r.get("success", False)]
        
        if len(successful_results) >= 2:
            base_time = successful_results[0]["processing_time"]  # 基本分析時間
            impact_analysis = []
            
            for result in successful_results[1:]:
                time_increase = result["processing_time"] - base_time
                percentage_increase = (time_increase / base_time) * 100
                
                impact_analysis.append({
                    "scenario": result["scenario"],
                    "time_increase": time_increase,
                    "percentage_increase": percentage_increase
                })
            
            return {
                "success": True,
                "results": results,
                "impact_analysis": impact_analysis,
                "message": f"選項對效能影響分析完成，共 {len(successful_results)} 個有效結果"
            }
        else:
            return {
                "success": False,
                "message": "測試結果不足以進行比較分析",
                "results": results
            }

    async def test_concurrent_performance(self) -> Dict[str, Any]:
        """測試並發處理效能。"""
        # 準備多個並發請求
        concurrent_requests = 3  # 適度的並發數量
        
        test_data = {
            "keyword": "並發測試關鍵字",
            "audience": "測試用戶",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        async def single_request(request_id: int):
            start_time = time.time()
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.post(
                        f"{self.base_url}/api/analyze",
                        json=test_data,
                        timeout=90.0
                    )
                    
                    total_time = time.time() - start_time
                    
                    if response.status_code == 200:
                        data = response.json()
                        return {
                            "request_id": request_id,
                            "success": True,
                            "processing_time": data.get("processing_time", total_time),
                            "total_request_time": total_time
                        }
                    else:
                        return {
                            "request_id": request_id,
                            "success": False,
                            "status_code": response.status_code
                        }
                except Exception as e:
                    return {
                        "request_id": request_id,
                        "success": False,
                        "error": str(e)
                    }
        
        # 執行並發請求
        start_concurrent_time = time.time()
        tasks = [single_request(i) for i in range(concurrent_requests)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_concurrent_time = time.time() - start_concurrent_time
        
        # 處理結果
        successful_results = []
        failed_results = []
        
        for result in results:
            if isinstance(result, dict) and result.get("success", False):
                successful_results.append(result)
            else:
                failed_results.append(result)
        
        if successful_results:
            avg_processing_time = mean([r["processing_time"] for r in successful_results])
            max_processing_time = max([r["processing_time"] for r in successful_results])
            
            return {
                "success": True,
                "concurrent_requests": concurrent_requests,
                "successful_requests": len(successful_results),
                "failed_requests": len(failed_results),
                "total_concurrent_time": total_concurrent_time,
                "avg_processing_time": avg_processing_time,
                "max_processing_time": max_processing_time,
                "results": results,
                "message": f"並發測試: {len(successful_results)}/{concurrent_requests} 成功, 平均處理時間: {avg_processing_time:.2f}s"
            }
        else:
            return {
                "success": False,
                "message": "所有並發請求都失敗",
                "results": results
            }

    async def test_long_running_stability(self) -> Dict[str, Any]:
        """測試長時間運行穩定性。"""
        # 執行一個預期會接近時間限制的測試
        test_data = {
            "keyword": "長時間處理測試關鍵字",
            "audience": "專業測試人員",
            "options": {
                "generate_draft": True,  # 增加處理複雜度
                "include_faq": True,
                "include_table": True
            }
        }
        
        start_time = time.time()
        memory_start = None
        
        try:
            import psutil
            process = psutil.Process()
            memory_start = process.memory_info().rss / 1024 / 1024  # MB
        except ImportError:
            pass
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/analyze",
                    json=test_data,
                    timeout=90.0
                )
                
                total_time = time.time() - start_time
                
                memory_end = None
                if memory_start is not None:
                    memory_end = process.memory_info().rss / 1024 / 1024  # MB
                
                if response.status_code == 200:
                    data = response.json()
                    processing_time = data.get("processing_time", total_time)
                    
                    # 檢查是否接近或超過閾值
                    near_threshold = processing_time > (self.thresholds["total_duration"] * 0.8)
                    exceeds_threshold = processing_time > self.thresholds["total_duration"]
                    
                    return {
                        "success": True,
                        "processing_time": processing_time,
                        "total_request_time": total_time,
                        "near_threshold": near_threshold,
                        "exceeds_threshold": exceeds_threshold,
                        "memory_usage": {
                            "start_mb": memory_start,
                            "end_mb": memory_end,
                            "increase_mb": memory_end - memory_start if memory_end and memory_start else None
                        },
                        "message": f"長時間測試: {processing_time:.2f}s {'⚠️ 接近閾值' if near_threshold else '✅ 正常'}"
                    }
                else:
                    return {
                        "success": False,
                        "status_code": response.status_code,
                        "message": f"長時間測試失敗，狀態碼: {response.status_code}"
                    }
                    
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "message": f"長時間測試錯誤: {str(e)}"
                }

    def generate_summary(self) -> Dict[str, Any]:
        """生成測試結果摘要。"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["status"] == "PASS")
        failed_tests = sum(1 for result in self.test_results if result["status"] == "FAIL")
        error_tests = sum(1 for result in self.test_results if result["status"] == "ERROR")
        
        # 收集所有處理時間資料
        all_processing_times = []
        for result in self.test_results:
            if result["status"] == "PASS":
                details = result["details"]
                if "processing_time" in details:
                    all_processing_times.append(details["processing_time"])
                elif "avg_processing_time" in details:
                    all_processing_times.append(details["avg_processing_time"])
        
        performance_stats = {}
        if all_processing_times:
            performance_stats = {
                "avg_processing_time": mean(all_processing_times),
                "median_processing_time": median(all_processing_times),
                "max_processing_time": max(all_processing_times),
                "min_processing_time": min(all_processing_times),
                "within_threshold": sum(1 for t in all_processing_times if t <= self.thresholds["total_duration"]),
                "total_samples": len(all_processing_times)
            }
        
        print("\n" + "=" * 50)
        print("📊 效能指標測試結果摘要")
        print("=" * 50)
        print(f"總測試數: {total_tests}")
        print(f"✅ 通過: {passed_tests}")
        print(f"❌ 失敗: {failed_tests}")
        print(f"💥 錯誤: {error_tests}")
        print(f"成功率: {(passed_tests/total_tests*100):.1f}%")
        
        if performance_stats:
            print(f"\n⚡ 效能統計:")
            print(f"平均處理時間: {performance_stats['avg_processing_time']:.2f}s")
            print(f"中位數處理時間: {performance_stats['median_processing_time']:.2f}s")
            print(f"最大處理時間: {performance_stats['max_processing_time']:.2f}s")
            print(f"最小處理時間: {performance_stats['min_processing_time']:.2f}s")
            print(f"符合閾值 (<{self.thresholds['total_duration']}s): {performance_stats['within_threshold']}/{performance_stats['total_samples']}")
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "errors": error_tests,
            "success_rate": passed_tests / total_tests * 100 if total_tests > 0 else 0,
            "performance_stats": performance_stats,
            "thresholds": self.thresholds,
            "details": self.test_results
        }


async def main():
    """主要執行函數。"""
    tester = PerformanceMetricsTester()
    
    print("⚡ 效能指標與警告機制測試")
    print("測試系統效能監控和閾值警告...")
    print()
    
    # 檢查伺服器狀態
    try:
        async with httpx.AsyncClient() as client:
            health_response = await client.get("http://localhost:8001/api/health", timeout=5.0)
            if health_response.status_code != 200:
                print("❌ 伺服器健康檢查失敗，請先啟動服務器")
                print("   啟動命令: python -m uvicorn app.main:app --reload --port 8001")
                return
            print("✅ 伺服器連線正常")
    except Exception as e:
        print(f"❌ 無法連接到伺服器: {str(e)}")
        print("   請確保服務器正在運行")
        return
    
    summary = await tester.run_performance_tests()
    
    # 保存結果
    with open("/Users/danielchen/test/seo-analyzer/backend/performance_test_results.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 詳細測試結果已保存至 performance_test_results.json")


if __name__ == "__main__":
    asyncio.run(main())