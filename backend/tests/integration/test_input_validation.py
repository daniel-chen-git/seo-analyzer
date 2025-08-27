"""輸入驗證和錯誤處理測試 (C1.3)。

測試 API 輸入驗證的完整功能包括：
- 輸入參數邊界值驗證和錯誤回應
- Pydantic 模型驗證規則測試
- HTTP 狀態碼和錯誤訊息格式驗證
- 各種無效輸入場景的錯誤處理
"""

import pytest
from httpx import AsyncClient
from fastapi import status

from app.models.request import AnalyzeRequest, AnalyzeOptions


class TestInputValidationIntegration:
    """C1.3 - 輸入驗證和錯誤處理整合測試。"""

    @pytest.mark.asyncio
    async def test_keyword_length_validation(
        self,
        async_client: AsyncClient
    ):
        """測試關鍵字長度驗證邊界值。"""
        # 測試空關鍵字
        empty_keyword_request = {
            "keyword": "",
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=empty_keyword_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        assert any("keyword" in str(error).lower() for error in error_detail["detail"])
        
        # 測試過長關鍵字 (>50 字元)
        long_keyword = "這是一個非常長的關鍵字" * 10  # 超過 50 字元
        long_keyword_request = {
            "keyword": long_keyword,
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=long_keyword_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        
        # 測試邊界值 - 正好 50 字元 (應該通過驗證，但可能因為服務未實作而失敗)
        boundary_keyword = "a" * 50
        boundary_request = {
            "keyword": boundary_keyword,
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=boundary_request)
        # 應該通過驗證（422 表示驗證失敗，其他錯誤表示驗證通過但服務層問題）
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 關鍵字長度驗證測試通過")

    @pytest.mark.asyncio
    async def test_audience_length_validation(
        self,
        async_client: AsyncClient
    ):
        """測試受眾描述長度驗證邊界值。"""
        # 測試空受眾
        empty_audience_request = {
            "keyword": "測試關鍵字",
            "audience": "",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=empty_audience_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        assert any("audience" in str(error).lower() for error in error_detail["detail"])
        
        # 測試過長受眾描述 (>200 字元)
        long_audience = "這是一個非常詳細的目標受眾描述，" * 20  # 超過 200 字元
        long_audience_request = {
            "keyword": "測試關鍵字",
            "audience": long_audience,
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=long_audience_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        
        # 測試邊界值 - 正好 200 字元
        boundary_audience = "測試受眾描述，" + "a" * 185  # 正好 200 字元
        boundary_request = {
            "keyword": "測試關鍵字",
            "audience": boundary_audience,
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=boundary_request)
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 受眾描述長度驗證測試通過")

    @pytest.mark.asyncio
    async def test_whitespace_validation(
        self,
        async_client: AsyncClient
    ):
        """測試空白字元驗證。"""
        # 測試只有空白的關鍵字
        whitespace_keyword_request = {
            "keyword": "   \t\n  ",
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=whitespace_keyword_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        
        # 測試只有空白的受眾描述
        whitespace_audience_request = {
            "keyword": "測試關鍵字",
            "audience": "   \t\n  ",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=whitespace_audience_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        
        # 測試前後有空白但中間有內容（應該通過）
        padded_request = {
            "keyword": "  測試關鍵字  ",
            "audience": "  測試受眾描述  ",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=padded_request)
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 空白字元驗證測試通過")

    @pytest.mark.asyncio
    async def test_missing_required_fields(
        self,
        async_client: AsyncClient
    ):
        """測試必填欄位缺失的錯誤處理。"""
        # 測試缺少關鍵字
        missing_keyword_request = {
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=missing_keyword_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        assert any("keyword" in str(error).lower() for error in error_detail["detail"])
        
        # 測試缺少受眾
        missing_audience_request = {
            "keyword": "測試關鍵字",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=missing_audience_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        assert any("audience" in str(error).lower() for error in error_detail["detail"])
        
        # 測試缺少選項
        missing_options_request = {
            "keyword": "測試關鍵字",
            "audience": "測試受眾"
        }
        
        response = await async_client.post("/api/analyze", json=missing_options_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        assert any("options" in str(error).lower() for error in error_detail["detail"])
        
        print("✅ 必填欄位缺失驗證測試通過")

    @pytest.mark.asyncio
    async def test_invalid_options_validation(
        self,
        async_client: AsyncClient
    ):
        """測試無效選項值的驗證。"""
        # 測試無效的布林值
        invalid_boolean_request = {
            "keyword": "測試關鍵字",
            "audience": "測試受眾",
            "options": {
                "generate_draft": "invalid",  # 應該是 boolean
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=invalid_boolean_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        
        # 測試缺少選項欄位
        incomplete_options_request = {
            "keyword": "測試關鍵字",
            "audience": "測試受眾",
            "options": {
                "generate_draft": True
                # 缺少 include_faq 和 include_table
            }
        }
        
        response = await async_client.post("/api/analyze", json=incomplete_options_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        
        print("✅ 選項驗證測試通過")

    @pytest.mark.asyncio
    async def test_invalid_json_format(
        self,
        async_client: AsyncClient
    ):
        """測試無效 JSON 格式的錯誤處理。"""
        # 發送無效 JSON
        response = await async_client.post(
            "/api/analyze", 
            content="invalid json content",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ JSON 格式驗證測試通過")

    @pytest.mark.asyncio
    async def test_null_values_validation(
        self,
        async_client: AsyncClient
    ):
        """測試 null 值的驗證處理。"""
        null_keyword_request = {
            "keyword": None,
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=null_keyword_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        
        null_audience_request = {
            "keyword": "測試關鍵字",
            "audience": None,
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=null_audience_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()
        assert "detail" in error_detail
        
        print("✅ Null 值驗證測試通過")

    @pytest.mark.asyncio
    async def test_chinese_content_validation(
        self,
        async_client: AsyncClient
    ):
        """測試中文內容驗證。"""
        # 測試中文關鍵字和受眾
        chinese_request = {
            "keyword": "中文SEO優化指南",
            "audience": "台灣中小企業主和行銷人員",
            "options": {
                "generate_draft": True,
                "include_faq": True,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=chinese_request)
        # 應該通過驗證（不是 422 錯誤）
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # 測試繁體中文特殊字符
        traditional_chinese_request = {
            "keyword": "網頁優化與搜尋引擎排名",
            "audience": "網路行銷專業人員、數位代理商",
            "options": {
                "generate_draft": False,
                "include_faq": True,
                "include_table": True
            }
        }
        
        response = await async_client.post("/api/analyze", json=traditional_chinese_request)
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # 測試中英文混合
        mixed_language_request = {
            "keyword": "SEO工具推薦2024",
            "audience": "Digital Marketing專業人員",
            "options": {
                "generate_draft": True,
                "include_faq": False,
                "include_table": True
            }
        }
        
        response = await async_client.post("/api/analyze", json=mixed_language_request)
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 中文內容驗證測試通過")

    @pytest.mark.asyncio
    async def test_special_characters_validation(
        self,
        async_client: AsyncClient
    ):
        """測試特殊字符的驗證處理。"""
        # 測試包含特殊符號
        special_chars_request = {
            "keyword": "SEO & 網站優化 (2024)",
            "audience": "企業主 + 行銷人員",
            "options": {
                "generate_draft": True,
                "include_faq": True,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=special_chars_request)
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # 測試 Unicode 字符
        unicode_request = {
            "keyword": "SEO 優化 🚀 排名提升",
            "audience": "網路創業家 ⭐ 行銷新手",
            "options": {
                "generate_draft": False,
                "include_faq": True,
                "include_table": True
            }
        }
        
        response = await async_client.post("/api/analyze", json=unicode_request)
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 特殊字符驗證測試通過")

    @pytest.mark.asyncio
    async def test_error_response_format(
        self,
        async_client: AsyncClient
    ):
        """測試錯誤回應格式的一致性。"""
        # 發送一個會導致驗證錯誤的請求
        invalid_request = {
            "keyword": "",  # 空關鍵字
            "audience": "",  # 空受眾
            "options": {
                "generate_draft": "invalid"  # 無效布林值
            }
        }
        
        response = await async_client.post("/api/analyze", json=invalid_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        error_response = response.json()
        
        # 驗證錯誤回應結構
        assert "detail" in error_response
        assert isinstance(error_response["detail"], list)
        
        # 驗證錯誤詳細資訊格式
        for error in error_response["detail"]:
            assert "type" in error
            assert "loc" in error
            assert "msg" in error
            assert isinstance(error["loc"], list)
            assert isinstance(error["msg"], str)
        
        print("✅ 錯誤回應格式驗證測試通過")

    @pytest.mark.asyncio
    async def test_boundary_combinations(
        self,
        async_client: AsyncClient
    ):
        """測試邊界值組合場景。"""
        # 最小有效值
        minimal_request = {
            "keyword": "a",  # 1 字元
            "audience": "b",  # 1 字元
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze", json=minimal_request)
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # 最大有效值
        maximal_request = {
            "keyword": "a" * 50,  # 50 字元
            "audience": "b" * 200,  # 200 字元
            "options": {
                "generate_draft": True,
                "include_faq": True,
                "include_table": True
            }
        }
        
        response = await async_client.post("/api/analyze", json=maximal_request)
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 邊界值組合測試通過")

    @pytest.mark.asyncio
    async def test_async_endpoint_validation(
        self,
        async_client: AsyncClient
    ):
        """測試非同步端點的輸入驗證。"""
        # 測試 /api/analyze-async 的驗證
        invalid_async_request = {
            "keyword": "",  # 無效關鍵字
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze-async", json=invalid_async_request)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # 測試有效的異步請求
        valid_async_request = {
            "keyword": "有效關鍵字",
            "audience": "測試受眾",
            "options": {
                "generate_draft": True,
                "include_faq": True,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/analyze-async", json=valid_async_request)
        # 應該通過驗證（不是 422 錯誤）
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 非同步端點驗證測試通過")