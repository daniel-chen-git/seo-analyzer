#!/usr/bin/env python3
"""
簡化錯誤處理測試

直接測試已知的錯誤情況，不依賴 mock。
"""

import asyncio
import json
import httpx


async def test_input_validation_errors():
    """測試輸入驗證錯誤。"""
    print("🧪 測試輸入驗證錯誤處理")
    
    base_url = "http://localhost:8001"
    
    test_cases = [
        {
            "name": "空關鍵字",
            "data": {"keyword": "", "audience": "測試", "options": {"generate_draft": True, "include_faq": False, "include_table": False}},
            "expected_status": 422
        },
        {
            "name": "超長關鍵字", 
            "data": {"keyword": "超長關鍵字" * 20, "audience": "測試", "options": {"generate_draft": True, "include_faq": False, "include_table": False}},
            "expected_status": 422
        },
        {
            "name": "缺少必要欄位",
            "data": {"keyword": "測試"},
            "expected_status": 422
        },
        {
            "name": "無效布林值",
            "data": {"keyword": "測試", "audience": "測試", "options": {"generate_draft": "invalid", "include_faq": False, "include_table": False}},
            "expected_status": 422
        }
    ]
    
    results = []
    
    for case in test_cases:
        print(f"\n🔍 測試: {case['name']}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/api/analyze",
                    json=case["data"],
                    timeout=10.0
                )
                
                success = response.status_code == case["expected_status"]
                status_emoji = "✅" if success else "❌"
                
                print(f"{status_emoji} {case['name']}: 狀態碼 {response.status_code} (期望: {case['expected_status']})")
                
                results.append({
                    "test": case["name"],
                    "status_code": response.status_code,
                    "expected": case["expected_status"],
                    "success": success,
                    "response": response.json() if response.status_code != 500 else {"error": "server error"}
                })
                
        except Exception as e:
            print(f"💥 {case['name']}: 測試失敗 - {str(e)}")
            results.append({
                "test": case["name"],
                "error": str(e),
                "success": False
            })
    
    # 統計結果
    total = len(results)
    passed = sum(1 for r in results if r.get("success", False))
    
    print(f"\n📊 輸入驗證測試結果")
    print(f"總測試: {total}, 通過: {passed}, 成功率: {passed/total*100:.1f}%")
    
    return results


async def test_timeout_simulation():
    """測試超時情況。"""
    print("\n🕐 測試超時處理")
    
    # 使用一個會超時的請求（極短的超時時間）
    base_url = "http://localhost:8001"
    
    test_data = {
        "keyword": "測試關鍵字",
        "audience": "測試受眾", 
        "options": {
            "generate_draft": True,
            "include_faq": True,
            "include_table": True
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/api/analyze",
                json=test_data,
                timeout=5.0  # 5 秒超時，應該會超時
            )
            
            if response.status_code == 200:
                print("✅ 請求在超時前完成")
                return {"success": True, "message": "正常完成"}
            else:
                print(f"⚠️ 請求回應異常狀態碼: {response.status_code}")
                return {"success": False, "status_code": response.status_code}
                
    except httpx.TimeoutException:
        print("✅ 正確捕獲超時例外")
        return {"success": True, "message": "超時處理正常"}
    except Exception as e:
        print(f"❌ 意外錯誤: {str(e)}")
        return {"success": False, "error": str(e)}


async def main():
    """主要測試函數。"""
    print("🔧 簡化錯誤處理測試")
    print("=" * 40)
    
    # 檢查服務器
    try:
        async with httpx.AsyncClient() as client:
            health = await client.get("http://localhost:8001/api/health", timeout=5.0)
            if health.status_code != 200:
                print("❌ 服務器不健康")
                return
            print("✅ 服務器正常運行")
    except Exception as e:
        print(f"❌ 無法連接服務器: {str(e)}")
        return
    
    # 執行測試
    validation_results = await test_input_validation_errors()
    timeout_results = await test_timeout_simulation()
    
    # 儲存結果
    all_results = {
        "validation_tests": validation_results,
        "timeout_test": timeout_results
    }
    
    with open("simple_error_test_results.json", "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n📄 測試結果已儲存至 simple_error_test_results.json")


if __name__ == "__main__":
    asyncio.run(main())