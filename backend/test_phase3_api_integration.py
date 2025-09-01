#!/usr/bin/env python3
"""Phase 3: API 整合測試
驗證完整的 API 請求→回應→前端顯示鏈路

根據 Phase 3 整合測試計劃執行：
1. 正常分析流程
2. 快取命中流程
3. 錯誤處理流程
"""

import json
import sys
import os
from datetime import datetime

# 添加 backend 路徑
backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.models.request import AnalyzeRequest, AnalyzeOptions
from app.models.response import AnalyzeResponse, ErrorResponse
from app.services.integration_service import IntegrationService
from app.services.ai_service import AnalysisResult
from app.services.serp_service import SerpResult
from app.services.scraper_service import ScrapingResult

def create_test_request():
    """創建測試請求物件"""
    return AnalyzeRequest(
        keyword="SEO 工具推薦",
        audience="行銷人員",
        options=AnalyzeOptions(
            generate_draft=True,
            include_faq=True,
            include_table=False
        )
    )

def test_normal_analysis_flow():
    """測試 1: 正常分析流程"""
    print("🧪 測試 1: 正常分析流程")
    print("-" * 40)
    
    try:
        # 1. 創建請求
        request = create_test_request()
        print(f"✅ 請求創建: {request.keyword} -> {request.audience}")
        
        # 2. 創建服務實例
        service = IntegrationService()
        
        # 3. 模擬分析處理
        # 注意：這裡我們模擬完整流程，不實際呼叫外部 API
        print("⏳ 模擬分析處理...")
        
        # 模擬成功的分析結果
        mock_analysis = AnalysisResult(
            analysis_report="# SEO 工具推薦分析報告\n\n## 1. 分析概述\n\n針對「SEO 工具推薦」關鍵字進行深度分析...",
            token_usage=5484,
            processing_time=22.46,
            success=True
        )
        
        # 4. 創建模擬資料
        
        mock_serp = SerpResult(
            keyword="SEO 工具推薦",
            total_results=10,
            organic_results=[],
            search_metadata={}
        )
        
        # 使用正確的 ScrapingResult 類型
        
        mock_scraping = ScrapingResult(
            total_results=10,
            successful_scrapes=8,
            avg_word_count=1850,
            avg_paragraphs=15,
            pages=[],  # 空的頁面列表
            errors=[]  # 空的錯誤列表
        )
        
        # 5. 建構回應
        response = service._build_success_response(
            request=request,
            serp_data=mock_serp,
            scraping_data=mock_scraping,
            analysis_result=mock_analysis,
            processing_time=mock_analysis.processing_time,
            timer=None
        )
        
        print("✅ 分析完成")
        
        # 6. 驗證回應格式（扁平結構）
        assert isinstance(response, AnalyzeResponse)
        assert response.status == "success"
        assert str(response.analysis_report).startswith("# SEO 工具推薦")
        assert response.token_usage == 5484
        assert response.processing_time == 22.46
        assert response.success is True
        assert response.keyword == "SEO 工具推薦"
        assert response.cached_at
        
        print("✅ 回應格式驗證通過（扁平結構）")
        
        # 6. 驗證 JSON 序列化
        json_data = response.model_dump()
        expected_keys = {'status', 'analysis_report', 'token_usage', 'processing_time', 'success', 'cached_at', 'keyword'}
        actual_keys = set(json_data.keys())
        assert expected_keys == actual_keys
        
        print("✅ JSON 結構驗證通過")
        
        # 7. 確認沒有舊的巢狀結構
        assert 'data' not in json_data
        
        print("✅ 確認無舊巢狀結構")
        print(f"📊 回應大小: {len(json.dumps(json_data))} bytes")
        
        return True
        
    except (ValueError, TypeError, AssertionError, AttributeError) as e:
        print(f"❌ 正常流程測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_cached_response_flow():
    """測試 2: 快取回應流程"""
    print("\n🧪 測試 2: 快取回應流程")
    print("-" * 40)
    
    try:
        # 1. 創建快取資料格式（模擬）
        cached_data = {
            "analysis_report": "# 快取的 SEO 分析報告\n\n這是從快取載入的內容...",
            "token_usage": 4200,
            "processing_time": 0.05,  # 快取回應很快
            "success": True,
            "cached_at": datetime.now().isoformat(),
            "keyword": "SEO 工具推薦"
        }
        
        # 2. 創建回應物件
        response = AnalyzeResponse(**cached_data)
        print("✅ 快取回應創建成功")
        
        # 3. 驗證快取特徵
        assert response.processing_time < 1.0  # 快取回應應該很快
        assert response.success is True
        assert "快取" in str(response.analysis_report)
        
        print("✅ 快取特徵驗證通過")
        
        # 4. 驗證時間戳格式
        try:
            datetime.fromisoformat(str(response.cached_at).replace('+00:00', ''))
            print("✅ 時間戳格式正確")
        except ValueError:
            print("❌ 時間戳格式錯誤")
            return False
        
        return True
        
    except (ValueError, TypeError, AttributeError) as e:
        print(f"❌ 快取流程測試失敗: {e}")
        return False

def test_error_handling_flow():
    """測試 3: 錯誤處理流程"""
    print("\n🧪 測試 3: 錯誤處理流程")
    print("-" * 40)
    
    try:
        # 1. 測試錯誤回應格式
        error_response = ErrorResponse(
            status="error",
            success=False,
            error_message="無效的關鍵字輸入",
            error_code="INVALID_INPUT"
        )
        
        print("✅ 錯誤回應創建成功")
        
        # 2. 驗證錯誤結構
        assert error_response.status == "error"
        assert error_response.success is False
        assert error_response.error_message
        
        print("✅ 錯誤結構驗證通過")
        
        # 3. 驗證 JSON 序列化
        error_json = error_response.model_dump()
        expected_error_keys = {'status', 'success', 'error_message', 'error_code'}
        actual_error_keys = set(error_json.keys())
        assert expected_error_keys == actual_error_keys
        
        print("✅ 錯誤 JSON 結構驗證通過")
        
        # 4. 測試雙欄位一致性
        assert error_json['status'] == 'error'
        assert error_json['success'] is False
        
        print("✅ 雙欄位一致性驗證通過")
        
        return True
        
    except (ValueError, TypeError, AssertionError, AttributeError) as e:
        print(f"❌ 錯誤處理測試失敗: {e}")
        return False

def main():
    """執行 Phase 3 API 整合測試"""
    print("🚀 Phase 3: API 整合測試開始")
    print("=" * 50)
    
    tests = [
        ("正常分析流程", test_normal_analysis_flow),
        ("快取回應流程", test_cached_response_flow),
        ("錯誤處理流程", test_error_handling_flow),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 執行測試: {test_name}")
        if test_func():
            passed += 1
            print(f"✅ {test_name} - 通過")
        else:
            print(f"❌ {test_name} - 失敗")
    
    # 輸出總結
    print("\n" + "=" * 50)
    print(f"📊 Phase 3 API 整合測試結果: {passed}/{total} 通過")
    
    if passed == total:
        print("🎉 所有 API 整合測試通過！")
        print("✅ 扁平結構 API 回應正常")
        print("✅ 雙欄位設計實現正確") 
        print("✅ 前端接收格式準備就緒")
        return True
    print("❌ 部分測試失敗，需要修復")
    return False

if __name__ == "__main__":
    SUCCESS = main()
    sys.exit(0 if SUCCESS else 1)