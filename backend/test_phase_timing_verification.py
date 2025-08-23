#!/usr/bin/env python3
"""
階段式計時機制驗證測試腳本

驗證 PerformanceTimer 和整合服務的階段計時功能是否正常運作。
"""

import asyncio
import time
import json
from typing import Dict, Any

import httpx


class PhaseTimingVerifier:
    """階段式計時機制驗證器。"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        
    async def test_phase_timing_mechanism(self) -> Dict[str, Any]:
        """測試階段式計時機制。"""
        print("⏱️ 開始階段式計時機制驗證")
        print("=" * 50)

        test_data = {
            "keyword": "階段計時測試",
            "audience": "測試用戶",
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
                
                # 提取計時資訊
                timing_info = self._extract_timing_info(data)
                
                # 驗證計時資訊
                verification_results = self._verify_timing_mechanism(timing_info, total_time)
                
                return {
                    "success": True,
                    "total_request_time": total_time,
                    "api_response_data": data,
                    "timing_info": timing_info,
                    "verification_results": verification_results,
                    "message": "階段式計時機制驗證完成"
                }
            else:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "response_text": response.text,
                    "message": f"API 請求失敗，狀態碼: {response.status_code}"
                }

    def _extract_timing_info(self, api_response: Dict[str, Any]) -> Dict[str, Any]:
        """從 API 回應中提取計時資訊。"""
        timing_info = {
            "processing_time": api_response.get("processing_time"),
            "metadata": api_response.get("data", {}).get("metadata", {}),
            "analysis_stages": {}
        }
        
        # 查找可能的階段計時資訊
        metadata = timing_info["metadata"]
        
        # 檢查是否有階段計時資料
        for key, value in metadata.items():
            if "time" in key.lower() or "duration" in key.lower():
                timing_info["analysis_stages"][key] = value
                
        return timing_info

    def _verify_timing_mechanism(self, timing_info: Dict[str, Any], total_time: float) -> Dict[str, Any]:
        """驗證計時機制的正確性。"""
        results = {
            "has_processing_time": False,
            "processing_time_reasonable": False,
            "has_stage_timing": False,
            "timing_consistency": False,
            "detailed_checks": {}
        }
        
        # 檢查 1: 是否有 processing_time
        processing_time = timing_info.get("processing_time")
        if processing_time is not None:
            results["has_processing_time"] = True
            
            # 檢查處理時間是否合理
            if 0 < processing_time < total_time + 5:  # 允許 5 秒誤差
                results["processing_time_reasonable"] = True
            
            results["detailed_checks"]["processing_time"] = {
                "value": processing_time,
                "total_request_time": total_time,
                "difference": abs(processing_time - total_time)
            }
        
        # 檢查 2: 是否有階段計時資訊
        stage_timings = timing_info.get("analysis_stages", {})
        if stage_timings:
            results["has_stage_timing"] = True
            results["detailed_checks"]["stage_timings"] = stage_timings
        
        # 檢查 3: 計時一致性
        if results["has_processing_time"] and processing_time:
            if 10 <= processing_time <= 60:  # 合理的處理時間範圍
                results["timing_consistency"] = True
        
        return results

    async def test_timer_class_functionality(self) -> Dict[str, Any]:
        """直接測試 PerformanceTimer 類別功能。"""
        print("\n🔧 測試 PerformanceTimer 類別功能")
        
        # 導入 PerformanceTimer
        try:
            import sys
            import os
            sys.path.append('/Users/danielchen/test/seo-analyzer/backend')
            
            from app.services.integration_service import PerformanceTimer
            
            # 測試計時器
            timer = PerformanceTimer()
            
            # 模擬階段計時
            timer.start_phase("test_phase_1")
            await asyncio.sleep(0.1)  # 模擬 100ms 的處理時間
            timer.end_phase("test_phase_1")
            
            timer.start_phase("test_phase_2")
            await asyncio.sleep(0.2)  # 模擬 200ms 的處理時間
            timer.end_phase("test_phase_2")
            
            # 測試計時器功能
            duration_1 = timer.get_phase_duration("test_phase_1")
            duration_2 = timer.get_phase_duration("test_phase_2")
            all_timings = timer.get_all_timings()
            
            return {
                "success": True,
                "phase_1_duration": duration_1,
                "phase_2_duration": duration_2,
                "all_timings": all_timings,
                "timer_working": 0.08 <= duration_1 <= 0.15 and 0.18 <= duration_2 <= 0.25,
                "message": f"計時器測試完成: Phase1={duration_1:.3f}s, Phase2={duration_2:.3f}s"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"PerformanceTimer 測試失敗: {str(e)}"
            }

    def generate_report(self, api_test_result: Dict[str, Any], timer_test_result: Dict[str, Any]) -> Dict[str, Any]:
        """生成驗證報告。"""
        print("\n" + "=" * 50)
        print("📊 階段式計時機制驗證報告")
        print("=" * 50)
        
        # API 層級測試結果
        print("\n1. API 層級計時測試:")
        if api_test_result.get("success", False):
            verification = api_test_result["verification_results"]
            print(f"   ✅ Processing Time: {verification['has_processing_time']}")
            print(f"   ✅ 時間合理性: {verification['processing_time_reasonable']}")
            print(f"   ✅ 階段計時資訊: {verification['has_stage_timing']}")
            print(f"   ✅ 計時一致性: {verification['timing_consistency']}")
            
            if "processing_time" in verification["detailed_checks"]:
                pt = verification["detailed_checks"]["processing_time"]
                print(f"   📊 處理時間: {pt['value']:.2f}s (請求總時間: {pt['total_request_time']:.2f}s)")
        else:
            print(f"   ❌ API 測試失敗: {api_test_result.get('message', '未知錯誤')}")
        
        # Timer 類別測試結果
        print("\n2. PerformanceTimer 類別測試:")
        if timer_test_result.get("success", False):
            print(f"   ✅ 計時器功能正常: {timer_test_result['timer_working']}")
            print(f"   📊 Phase 1: {timer_test_result['phase_1_duration']:.3f}s")
            print(f"   📊 Phase 2: {timer_test_result['phase_2_duration']:.3f}s")
            print(f"   📊 All Timings: {timer_test_result['all_timings']}")
        else:
            print(f"   ❌ Timer 測試失敗: {timer_test_result.get('message', '未知錯誤')}")
        
        # 整體評估
        api_success = api_test_result.get("success", False)
        timer_success = timer_test_result.get("success", False) and timer_test_result.get("timer_working", False)
        
        overall_success = api_success and timer_success
        
        print(f"\n3. 整體評估:")
        print(f"   階段式計時機制: {'✅ 正常運作' if overall_success else '❌ 需要檢查'}")
        
        return {
            "api_test": api_test_result,
            "timer_test": timer_test_result,
            "overall_success": overall_success,
            "summary": {
                "api_layer_working": api_success,
                "timer_class_working": timer_success,
                "phase_timing_verified": overall_success
            }
        }


async def main():
    """主要執行函數。"""
    verifier = PhaseTimingVerifier()
    
    print("⏱️ 階段式計時機制驗證測試")
    print("驗證 PerformanceTimer 和 API 計時功能...")
    print()
    
    # 檢查伺服器狀態
    try:
        async with httpx.AsyncClient() as client:
            health_response = await client.get("http://localhost:8001/api/health", timeout=5.0)
            if health_response.status_code != 200:
                print("❌ 伺服器健康檢查失敗，請先啟動服務器")
                return
            print("✅ 伺服器連線正常")
    except Exception as e:
        print(f"❌ 無法連接到伺服器: {str(e)}")
        return
    
    # 執行測試
    api_test_result = await verifier.test_phase_timing_mechanism()
    timer_test_result = await verifier.test_timer_class_functionality()
    
    # 生成報告
    final_report = verifier.generate_report(api_test_result, timer_test_result)
    
    # 保存結果
    with open("/Users/danielchen/test/seo-analyzer/backend/phase_timing_verification_results.json", "w", encoding="utf-8") as f:
        json.dump(final_report, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 詳細驗證結果已保存至 phase_timing_verification_results.json")


if __name__ == "__main__":
    asyncio.run(main())