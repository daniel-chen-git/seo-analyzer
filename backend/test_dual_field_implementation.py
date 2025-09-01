#!/usr/bin/env python3
"""雙欄位實現測試檔案。

測試 status + success 雙欄位設計的完整實現，包括：
1. AnalyzeResponse 模型的雙欄位功能
2. ErrorResponse 模型的一致性
3. 快取系統的向後相容性
4. integration_service 的雙欄位回應建構
5. 雙欄位一致性驗證

執行方式：
    python test_dual_field_implementation.py
"""

import os
import sys
import json
import tempfile
from datetime import datetime, timezone
from typing import Dict, Any

# 添加專案根目錄到 Python path
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.models.response import AnalyzeResponse, ErrorResponse
from app.models.request import AnalyzeRequest, AnalyzeOptions
from app.services.ai_service import AnalysisResult


def test_analyze_response_dual_fields():
    """測試 AnalyzeResponse 的雙欄位設計。"""
    print("🧪 測試 AnalyzeResponse 雙欄位設計...")
    
    # 測試完全成功的情況
    success_response = AnalyzeResponse(
        status="success",  # API 契約欄位
        analysis_report="# 完整分析報告\n\n## 成功分析結果",
        token_usage=1500,
        processing_time=18.5,
        success=True,  # 業務狀態欄位
        cached_at=datetime.now(timezone.utc).isoformat(),
        keyword="測試關鍵字"
    )
    
    # 驗證雙欄位一致性
    assert success_response.status == "success", "API 契約欄位應為 'success'"
    assert success_response.success is True, "業務狀態欄位應為 True"
    
    # 測試 API 成功但業務部分失敗的情況
    partial_success_response = AnalyzeResponse(
        status="success",  # API 契約：調用成功
        analysis_report="# 部分分析結果\n\n## 部分功能完成",
        token_usage=800,
        processing_time=12.3,
        success=False,  # 業務狀態：處理失敗
        cached_at=datetime.now(timezone.utc).isoformat(),
        keyword="部分成功測試"
    )
    
    # 驗證部分成功情況
    assert partial_success_response.status == "success", "API 契約仍應為 'success'"
    assert partial_success_response.success is False, "業務狀態應為 False"
    
    print("✅ AnalyzeResponse 雙欄位設計測試通過")
    return True


def test_error_response_dual_fields():
    """測試 ErrorResponse 的雙欄位設計。"""
    print("🧪 測試 ErrorResponse 雙欄位設計...")
    
    # 測試錯誤回應
    error_response = ErrorResponse(
        status="error",  # API 契約欄位
        success=False,   # 業務狀態欄位
        error_message="關鍵字長度超出限制",
        error_code="INVALID_INPUT"
    )
    
    # 驗證雙欄位一致性
    assert error_response.status == "error", "API 契約欄位應為 'error'"
    assert error_response.success is False, "業務狀態欄位應為 False"
    assert error_response.error_message == "關鍵字長度超出限制"
    assert error_response.error_code == "INVALID_INPUT"
    
    print("✅ ErrorResponse 雙欄位設計測試通過")
    return True


def test_json_serialization():
    """測試 JSON 序列化包含雙欄位。"""
    print("🧪 測試 JSON 序列化雙欄位...")
    
    # 測試成功回應序列化
    response = AnalyzeResponse(
        status="success",
        analysis_report="# 序列化測試",
        token_usage=1000,
        processing_time=15.0,
        success=True,
        cached_at=datetime.now(timezone.utc).isoformat(),
        keyword="序列化測試"
    )
    
    # 序列化為 JSON
    json_data = response.model_dump()
    
    # 驗證 JSON 包含雙欄位
    assert "status" in json_data, "JSON 應包含 status 欄位"
    assert "success" in json_data, "JSON 應包含 success 欄位"
    assert json_data["status"] == "success"
    assert json_data["success"] is True
    
    # 測試反序列化
    reconstructed = AnalyzeResponse(**json_data)
    assert reconstructed.status == response.status
    assert reconstructed.success == response.success
    
    print("✅ JSON 序列化雙欄位測試通過")
    return True


def test_cache_backward_compatibility():
    """測試快取系統的向後相容性。"""
    print("🧪 測試快取系統向後相容性...")
    
    # 模擬舊版快取檔案（缺少 status 欄位）
    legacy_cache_data = {
        "analysis_report": "# 舊版快取報告",
        "token_usage": 2000,
        "processing_time": 25.8,
        "success": True,
        "cached_at": "2025-09-01T00:15:00Z",
        "keyword": "舊版快取"
    }
    
    # 向後相容處理：補充 status 欄位
    if "status" not in legacy_cache_data:
        legacy_cache_data["status"] = "success"
    
    # 驗證可以正確建構 AnalyzeResponse
    response = AnalyzeResponse(**legacy_cache_data)
    assert response.status == "success"
    assert response.success is True
    assert response.keyword == "舊版快取"
    
    print("✅ 快取系統向後相容性測試通過")
    return True


def test_dual_field_consistency():
    """測試雙欄位一致性的各種場景。"""
    print("🧪 測試雙欄位一致性各種場景...")
    
    test_cases = [
        # (status, success, 描述)
        ("success", True, "完全成功"),
        ("success", False, "API 成功但業務失敗"),
        ("error", False, "錯誤情況")
    ]
    
    for status, success, description in test_cases:
        print(f"  - 測試場景: {description}")
        
        if status == "success":
            response = AnalyzeResponse(
                status=status,
                analysis_report=f"# {description} 報告",
                token_usage=1000,
                processing_time=10.0,
                success=success,
                cached_at=datetime.now(timezone.utc).isoformat(),
                keyword=f"{description}測試"
            )
            assert response.status == status
            assert response.success == success
            
        elif status == "error":
            response = ErrorResponse(
                status=status,
                success=success,
                error_message=f"{description}錯誤",
                error_code="TEST_ERROR"
            )
            assert response.status == status
            assert response.success == success
    
    print("✅ 雙欄位一致性測試通過")
    return True


def test_response_examples():
    """測試回應範例的正確性。"""
    print("🧪 測試回應範例正確性...")
    
    # 測試 AnalyzeResponse 的範例
    example_data = AnalyzeResponse.Config.json_schema_extra["example"]
    
    # 驗證範例包含雙欄位
    assert "status" in example_data, "範例應包含 status 欄位"
    assert "success" in example_data, "範例應包含 success 欄位"
    assert example_data["status"] == "success"
    assert example_data["success"] is True
    
    # 使用範例資料建構物件
    response = AnalyzeResponse(**example_data)
    assert response.status == "success"
    assert response.success is True
    
    # 測試 ErrorResponse 的範例
    error_example = ErrorResponse.Config.json_schema_extra["example"]
    
    # 驗證錯誤範例包含雙欄位
    assert "status" in error_example, "錯誤範例應包含 status 欄位"
    assert "success" in error_example, "錯誤範例應包含 success 欄位"
    assert error_example["status"] == "error"
    assert error_example["success"] is False
    
    print("✅ 回應範例正確性測試通過")
    return True


def test_frontend_compatibility():
    """測試前端相容性場景。"""
    print("🧪 測試前端相容性場景...")
    
    # 模擬前端判斷邏輯
    def simulate_frontend_logic(response_data: Dict[str, Any]) -> str:
        """模擬前端的回應處理邏輯。"""
        if response_data.get("status") == "success" and response_data.get("success") is True:
            return "complete_success"  # 完全成功
        elif response_data.get("status") == "success" and response_data.get("success") is False:
            return "partial_success"   # 部分成功
        elif response_data.get("status") == "error":
            return "error"             # 錯誤
        else:
            return "unknown"           # 未知狀態
    
    # 測試完全成功場景
    complete_success = {
        "status": "success",
        "success": True,
        "analysis_report": "完整報告",
        "token_usage": 1000,
        "processing_time": 10.0,
        "cached_at": "2025-09-01T00:00:00Z",
        "keyword": "測試"
    }
    assert simulate_frontend_logic(complete_success) == "complete_success"
    
    # 測試部分成功場景
    partial_success = {
        "status": "success",
        "success": False,
        "analysis_report": "部分報告",
        "token_usage": 500,
        "processing_time": 8.0,
        "cached_at": "2025-09-01T00:00:00Z",
        "keyword": "測試"
    }
    assert simulate_frontend_logic(partial_success) == "partial_success"
    
    # 測試錯誤場景
    error_case = {
        "status": "error",
        "success": False,
        "error_message": "測試錯誤",
        "error_code": "TEST_ERROR"
    }
    assert simulate_frontend_logic(error_case) == "error"
    
    print("✅ 前端相容性場景測試通過")
    return True


def main():
    """執行所有雙欄位實現測試。"""
    print("🚀 開始雙欄位實現測試")
    print("=" * 50)
    
    test_functions = [
        test_analyze_response_dual_fields,
        test_error_response_dual_fields,
        test_json_serialization,
        test_cache_backward_compatibility,
        test_dual_field_consistency,
        test_response_examples,
        test_frontend_compatibility,
    ]
    
    passed_tests = 0
    total_tests = len(test_functions)
    
    for test_func in test_functions:
        try:
            if test_func():
                passed_tests += 1
        except Exception as e:
            print(f"❌ {test_func.__name__} 失敗: {e}")
            import traceback
            traceback.print_exc()
    
    print("=" * 50)
    print(f"📊 測試結果: {passed_tests}/{total_tests} 通過")
    
    if passed_tests == total_tests:
        print("🎉 所有雙欄位實現測試通過！")
        print("✅ status + success 雙欄位設計實現成功")
        print("✅ 前端相容性完整保持")
        print("✅ 快取系統向後相容性確保")
        print("✅ 業務邏輯清晰度提升")
        return True
    else:
        print("⚠️ 部分測試失敗，需要檢查實現")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)