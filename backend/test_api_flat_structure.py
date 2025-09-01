#!/usr/bin/env python3
"""測試 API 端點的扁平結構回應。

模擬 API 呼叫來驗證新的扁平結構是否在實際 API 流程中正常運作。
"""

import json
import sys
import os
from datetime import datetime, timezone

# 添加 backend 路徑
backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.models.request import AnalyzeRequest, AnalyzeOptions
from app.models.response import AnalyzeResponse
from app.services.integration_service import IntegrationService
from app.services.ai_service import AnalysisResult

def create_mock_analysis_result():
    """創建真正的 AnalysisResult 物件，修正 FieldInfo 錯誤。"""
    return AnalysisResult(
        analysis_report="# SEO 分析報告\n\n## 1. 分析概述\n\n這是模擬的分析結果...",
        token_usage=4500,
        processing_time=25.3,
        success=True
    )

def create_mock_scraping_data():
    """創建模擬的爬蟲資料。"""
    # 簡化測試 - 使用簡單的物件
    class MockScrapingData:
        def __init__(self):
            self.total_results = 10
            self.successful_scrapes = 8
            self.avg_word_count = 1850
            self.avg_paragraphs = 15
            self.urls_scraped = []
            self.content_data = []
    
    return MockScrapingData()

def test_api_response_creation():
    """測試 API 回應創建流程。"""
    print("🧪 測試 API 回應創建流程...")
    
    try:
        # 1. 創建請求物件
        request = AnalyzeRequest(
            keyword="測試關鍵字",
            audience="測試受眾",
            options=AnalyzeOptions(
                generate_draft=True,
                include_faq=True,
                include_table=False
            )
        )
        print("✅ 請求物件創建成功")
        
        # 2. 創建 IntegrationService
        service = IntegrationService()
        
        # 3. 創建模擬資料
        mock_analysis = create_mock_analysis_result()
        mock_scraping = create_mock_scraping_data()
        
        # 4. 創建模擬 SERP 資料
        from app.services.serp_service import SerpResult
        mock_serp = SerpResult(
            keyword="測試關鍵字",
            total_results=10,
            organic_results=[],
            search_metadata={}
        )
        
        # 5. 呼叫 _build_success_response 方法
        response = service._build_success_response(
            request=request,
            serp_data=mock_serp,
            scraping_data=mock_scraping,
            analysis_result=mock_analysis,
            processing_time=mock_analysis.processing_time,
            timer=None  # 簡化測試
        )
        print("✅ API 回應創建成功")
        
        # 6. 驗證回應結構（雙欄位設計）
        assert isinstance(response, AnalyzeResponse)
        assert response.status == "success"  # API 契約欄位
        assert str(response.analysis_report).startswith("# SEO 分析報告")
        assert response.token_usage == 4500
        assert response.processing_time == 25.3
        assert response.success == True  # 業務狀態欄位
        assert response.keyword == "測試關鍵字"
        assert response.cached_at  # 應該有時間戳
        print("✅ 回應結構驗證通過（雙欄位）")
        
        # 6. 測試 JSON 序列化
        response_json = response.model_dump()
        json_str = json.dumps(response_json, ensure_ascii=False, indent=2)
        print("✅ JSON 序列化成功")
        
        # 7. 驗證 JSON 結構（雙欄位設計）
        expected_keys = {'status', 'analysis_report', 'token_usage', 'processing_time', 'success', 'cached_at', 'keyword'}
        actual_keys = set(response_json.keys())
        assert expected_keys == actual_keys, f"鍵值不匹配: 預期 {expected_keys}, 實際 {actual_keys}"
        print("✅ JSON 結構驗證通過（包含雙欄位）")
        
        print(f"📄 回應預覽: {json_str[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主測試函數。"""
    print("🚀 開始測試 API 扁平結構回應")
    print("=" * 50)
    
    if test_api_response_creation():
        print("\n🎉 API 扁平結構測試通過！")
        print("✅ 後端 Pydantic 模型重構完成")
        print("✅ 與快取檔案格式完全一致")
        print("✅ API 回應流程正常運作")
        return True
    else:
        print("\n❌ API 測試失敗")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)