#!/usr/bin/env python3
"""測試新的扁平結構 AnalyzeResponse 模型。

此腳本驗證：
1. 新的扁平結構 Pydantic 模型是否正常工作
2. 與實際快取檔案格式的兼容性
3. 向後兼容的 Legacy 模型是否正常
"""

import json
import sys
import os

# 添加 backend 路徑
backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.models.response import AnalyzeResponse, LegacyAnalyzeResponse
from pydantic import ValidationError

def test_flat_structure_with_cache_data():
    """測試扁平結構與快取資料的兼容性。"""
    print("🧪 測試扁平結構與快取資料兼容性...")
    
    # 模擬快取檔案的實際資料格式
    cache_data = {
        "analysis_report": "# SEO 分析報告\n\n## 1. 分析概述\n\n這是測試內容...",
        "token_usage": 5484,
        "processing_time": 22.46,
        "success": True,
        "cached_at": "2025-08-31T12:29:07.924683+00:00",
        "keyword": "跑步鞋"
    }
    
    try:
        # 嘗試創建新的扁平結構模型
        response = AnalyzeResponse(**cache_data)
        print("✅ 扁平結構模型創建成功")
        
        # 驗證欄位
        assert response.analysis_report.startswith("# SEO 分析報告")
        assert response.token_usage == 5484
        assert response.processing_time == 22.46
        assert response.success == True
        assert response.keyword == "跑步鞋"
        print("✅ 所有欄位驗證通過")
        
        # 測試序列化
        json_output = response.model_dump()
        print("✅ JSON 序列化成功")
        print(f"📄 輸出鍵值: {list(json_output.keys())}")
        
        return True
        
    except ValidationError as e:
        print(f"❌ 驗證錯誤: {e}")
        return False
    except Exception as e:
        print(f"❌ 未預期錯誤: {e}")
        return False

def test_legacy_compatibility():
    """測試舊版本的向後兼容性。"""
    print("\n🧪 測試舊版巢狀結構模型...")
    
    # 模擬舊的巢狀結構資料
    legacy_data = {
        "status": "success",
        "processing_time": 45.8,
        "data": {
            "serp_summary": {
                "total_results": 10,
                "successful_scrapes": 8,
                "avg_word_count": 1850,
                "avg_paragraphs": 15
            },
            "analysis_report": "# 舊版分析報告...",
            "metadata": {
                "keyword": "SEO 工具推薦",
                "audience": "中小企業行銷人員",
                "generated_at": "2025-01-22T10:30:00Z",
                "token_usage": 7500
            }
        }
    }
    
    try:
        # 創建舊版模型（確保向後兼容）
        legacy_response = LegacyAnalyzeResponse(**legacy_data)
        print("✅ 舊版模型向後兼容性正常")
        return True
        
    except Exception as e:
        print(f"❌ 舊版兼容性測試失敗: {e}")
        return False

def main():
    """主測試函數。"""
    print("🚀 開始測試扁平結構 Pydantic 模型")
    print("=" * 50)
    
    success_count = 0
    total_tests = 2
    
    # 測試 1: 扁平結構兼容性
    if test_flat_structure_with_cache_data():
        success_count += 1
    
    # 測試 2: 向後兼容性  
    if test_legacy_compatibility():
        success_count += 1
    
    # 輸出結果
    print("\n" + "=" * 50)
    print(f"📊 測試結果: {success_count}/{total_tests} 通過")
    
    if success_count == total_tests:
        print("🎉 所有測試通過！扁平結構模型重構成功")
        return True
    else:
        print("❌ 部分測試失敗，需要檢查模型定義")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)