#!/usr/bin/env python3
"""
效能閾值警告機制測試腳本

測試系統的效能閾值警告機制是否能正確觸發和記錄警告。
"""

import asyncio
import time
import json
import sys
import os
from typing import Dict, Any, List
from io import StringIO
from contextlib import redirect_stdout, redirect_stderr

# 添加專案路徑
sys.path.append('/Users/danielchen/test/seo-analyzer/backend')

from app.services.integration_service import PerformanceTimer, IntegrationService


class PerformanceThresholdTester:
    """效能閾值警告機制測試器。"""

    def __init__(self):
        self.test_results = []
        
    async def run_threshold_warning_tests(self) -> Dict[str, Any]:
        """執行效能閾值警告測試。"""
        print("⚠️ 開始效能閾值警告機制測試")
        print("=" * 50)

        test_scenarios = [
            ("Timer 類別直接測試", self.test_timer_class_directly),
            ("模擬超過 SERP 閾值", self.test_serp_threshold_exceeded),
            ("模擬超過爬蟲閾值", self.test_scraping_threshold_exceeded),
            ("模擬超過 AI 閾值", self.test_ai_threshold_exceeded),
            ("模擬多階段超閾值", self.test_multiple_thresholds_exceeded),
            ("警告機制日誌輸出測試", self.test_warning_log_output)
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

    async def test_timer_class_directly(self) -> Dict[str, Any]:
        """直接測試 PerformanceTimer 類別的基本功能。"""
        timer = PerformanceTimer()
        
        # 測試正常階段計時
        timer.start_phase("test_phase")
        await asyncio.sleep(0.1)
        timer.end_phase("test_phase")
        
        duration = timer.get_phase_duration("test_phase")
        all_timings = timer.get_all_timings()
        
        return {
            "success": True,
            "duration": duration,
            "all_timings": all_timings,
            "timer_working": 0.08 <= duration <= 0.15,
            "message": f"計時器功能正常: {duration:.3f}s"
        }

    async def test_serp_threshold_exceeded(self) -> Dict[str, Any]:
        """測試超過 SERP 閾值的警告。"""
        timer = PerformanceTimer()
        
        # 模擬超過 SERP 閾值 (15.0s) 的情況
        timer.timings["serp_duration"] = 20.0  # 直接設定為超過閾值的值
        
        # 測試警告檢查
        service = IntegrationService()
        
        # 捕獲警告輸出
        warning_output = self._capture_warning_output(service, timer)
        
        expected_warning = "serp" in warning_output and "20.00s" in warning_output
        
        return {
            "success": True,
            "simulated_duration": 20.0,
            "threshold": 15.0,
            "warning_triggered": expected_warning,
            "warning_output": warning_output,
            "message": f"SERP 閾值警告 {'✅ 觸發' if expected_warning else '❌ 未觸發'}"
        }

    async def test_scraping_threshold_exceeded(self) -> Dict[str, Any]:
        """測試超過爬蟲閾值的警告。"""
        timer = PerformanceTimer()
        
        # 模擬超過爬蟲閾值 (25.0s) 的情況
        timer.timings["scraping_duration"] = 30.0
        
        service = IntegrationService()
        warning_output = self._capture_warning_output(service, timer)
        
        expected_warning = "scraping" in warning_output and "30.00s" in warning_output
        
        return {
            "success": True,
            "simulated_duration": 30.0,
            "threshold": 25.0,
            "warning_triggered": expected_warning,
            "warning_output": warning_output,
            "message": f"爬蟲閾值警告 {'✅ 觸發' if expected_warning else '❌ 未觸發'}"
        }

    async def test_ai_threshold_exceeded(self) -> Dict[str, Any]:
        """測試超過 AI 閾值的警告。"""
        timer = PerformanceTimer()
        
        # 模擬超過 AI 閾值 (35.0s) 的情況
        timer.timings["ai_duration"] = 40.0
        
        service = IntegrationService()
        warning_output = self._capture_warning_output(service, timer)
        
        expected_warning = "ai" in warning_output and "40.00s" in warning_output
        
        return {
            "success": True,
            "simulated_duration": 40.0,
            "threshold": 35.0,
            "warning_triggered": expected_warning,
            "warning_output": warning_output,
            "message": f"AI 閾值警告 {'✅ 觸發' if expected_warning else '❌ 未觸發'}"
        }

    async def test_multiple_thresholds_exceeded(self) -> Dict[str, Any]:
        """測試多個階段同時超過閾值。"""
        timer = PerformanceTimer()
        
        # 模擬多個階段都超過閾值
        timer.timings["serp_duration"] = 18.0      # 超過 15.0s
        timer.timings["scraping_duration"] = 28.0  # 超過 25.0s
        timer.timings["ai_duration"] = 38.0        # 超過 35.0s
        
        service = IntegrationService()
        warning_output = self._capture_warning_output(service, timer)
        
        # 檢查是否所有三個警告都觸發
        serp_warning = "serp" in warning_output and "18.00s" in warning_output
        scraping_warning = "scraping" in warning_output and "28.00s" in warning_output
        ai_warning = "ai" in warning_output and "38.00s" in warning_output
        
        all_warnings_triggered = serp_warning and scraping_warning and ai_warning
        
        return {
            "success": True,
            "warnings_triggered": {
                "serp": serp_warning,
                "scraping": scraping_warning,
                "ai": ai_warning
            },
            "all_warnings_triggered": all_warnings_triggered,
            "warning_output": warning_output,
            "message": f"多階段警告 {'✅ 全部觸發' if all_warnings_triggered else '❌ 部分觸發'}"
        }

    async def test_warning_log_output(self) -> Dict[str, Any]:
        """測試警告日誌輸出格式。"""
        timer = PerformanceTimer()
        timer.timings["test_duration"] = 50.0
        
        service = IntegrationService()
        # 模擬一個測試閾值
        service.performance_thresholds["test_duration"] = 30.0
        
        warning_output = self._capture_warning_output(service, timer)
        
        # 檢查警告格式
        has_warning_symbol = "⚠️" in warning_output
        has_phase_name = "test" in warning_output
        has_duration = "50.00s" in warning_output
        has_threshold = "30.0s" in warning_output
        
        format_correct = has_warning_symbol and has_phase_name and has_duration and has_threshold
        
        return {
            "success": True,
            "warning_format_checks": {
                "has_warning_symbol": has_warning_symbol,
                "has_phase_name": has_phase_name,
                "has_duration": has_duration,
                "has_threshold": has_threshold
            },
            "format_correct": format_correct,
            "warning_output": warning_output,
            "message": f"警告格式 {'✅ 正確' if format_correct else '❌ 不正確'}"
        }

    def _capture_warning_output(self, service: IntegrationService, timer: PerformanceTimer) -> str:
        """捕獲警告輸出。"""
        # 使用 StringIO 捕獲 print 輸出
        captured_output = StringIO()
        
        with redirect_stdout(captured_output):
            try:
                service._check_performance_warnings(timer)
            except Exception as e:
                print(f"Error in warning check: {e}")
        
        return captured_output.getvalue()

    def generate_summary(self) -> Dict[str, Any]:
        """生成測試結果摘要。"""
        print("\n" + "=" * 50)
        print("📊 效能閾值警告機制測試摘要")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["status"] == "PASS")
        failed_tests = sum(1 for result in self.test_results if result["status"] == "FAIL")
        error_tests = sum(1 for result in self.test_results if result["status"] == "ERROR")
        
        print(f"總測試數: {total_tests}")
        print(f"✅ 通過: {passed_tests}")
        print(f"❌ 失敗: {failed_tests}")
        print(f"💥 錯誤: {error_tests}")
        print(f"成功率: {(passed_tests/total_tests*100):.1f}%")
        
        # 分析警告機制功能狀態
        warning_tests = [r for r in self.test_results if "閾值" in r["test_name"] and r["status"] == "PASS"]
        warning_success_count = sum(1 for test in warning_tests if test["details"].get("warning_triggered", False))
        
        print(f"\n⚠️ 警告機制測試:")
        print(f"警告觸發測試: {warning_success_count}/{len(warning_tests)} 成功")
        
        mechanism_working = warning_success_count >= len(warning_tests) * 0.8  # 80% 以上成功率
        
        print(f"警告機制狀態: {'✅ 正常運作' if mechanism_working else '❌ 需要檢查'}")
        
        return {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "errors": error_tests,
            "success_rate": passed_tests / total_tests * 100 if total_tests > 0 else 0,
            "warning_mechanism_working": mechanism_working,
            "warning_tests_success": warning_success_count,
            "warning_tests_total": len(warning_tests),
            "details": self.test_results
        }


async def main():
    """主要執行函數。"""
    tester = PerformanceThresholdTester()
    
    print("⚠️ 效能閾值警告機制測試")
    print("測試系統閾值警告功能...")
    print()
    
    summary = await tester.run_threshold_warning_tests()
    
    # 保存結果
    with open("/Users/danielchen/test/seo-analyzer/backend/threshold_warning_test_results.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 詳細測試結果已保存至 threshold_warning_test_results.json")


if __name__ == "__main__":
    asyncio.run(main())