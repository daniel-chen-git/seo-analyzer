"""錯誤場景處理測試 (C1.3 擴展)。

測試各種錯誤場景的處理包括：
- HTTP 方法錯誤處理
- 內容類型錯誤處理  
- 服務不可用錯誤處理
- 資源限制和速率限制
"""

import asyncio
from typing import cast
import pytest
from httpx import AsyncClient, Response
from fastapi import status


class TestErrorScenariosIntegration:
    """C1.3 擴展 - 錯誤場景處理整合測試。"""

    @pytest.mark.asyncio
    async def test_http_method_not_allowed(
        self,
        async_client: AsyncClient
    ):
        """測試不支援的 HTTP 方法。"""
        # 測試 GET 方法到 POST 端點
        response = await async_client.get("/api/analyze")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        # 測試 PUT 方法到 POST 端點
        valid_request = {
            "keyword": "測試關鍵字",
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.put("/api/analyze", json=valid_request)
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        # 測試 DELETE 方法
        response = await async_client.delete("/api/analyze")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        print("✅ HTTP 方法錯誤處理測試通過")

    @pytest.mark.asyncio
    async def test_invalid_content_type(
        self,
        async_client: AsyncClient
    ):
        """測試無效的內容類型處理。"""
        # 測試 text/plain 內容類型
        response = await async_client.post(
            "/api/analyze",
            content="keyword=test&audience=test",
            headers={"Content-Type": "text/plain"}
        )
        assert response.status_code in [
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        ]
        
        # 測試 application/x-www-form-urlencoded
        response = await async_client.post(
            "/api/analyze",
            data={"keyword": "test", "audience": "test"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code in [
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        ]
        
        # 測試 multipart/form-data
        response = await async_client.post(
            "/api/analyze",
            files={"keyword": "test", "audience": "test"}
        )
        assert response.status_code in [
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        ]
        
        print("✅ 內容類型錯誤處理測試通過")

    @pytest.mark.asyncio
    async def test_malformed_json_handling(
        self,
        async_client: AsyncClient
    ):
        """測試各種格式錯誤的 JSON 處理。"""
        malformed_json_cases = [
            '{"keyword": "test", "audience": "test", "options": {',  # 不完整 JSON
            '{"keyword": test, "audience": "test"}',  # 無引號的字符串
            '{"keyword": "test" "audience": "test"}',  # 缺少逗號
            '{"keyword": "test", "audience": "test",}',  # 多餘的逗號
            '{keyword: "test", audience: "test"}',  # 無引號的鍵
        ]
        
        for malformed_json in malformed_json_cases:
            response = await async_client.post(
                "/api/analyze",
                content=malformed_json,
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 格式錯誤 JSON 處理測試通過")

    @pytest.mark.asyncio
    async def test_large_payload_handling(
        self,
        async_client: AsyncClient
    ):
        """測試大型請求負載的處理。"""
        # 創建非常大的請求（但仍在驗證限制內）
        large_keyword = "k" * 50  # 最大允許長度
        large_audience = "a" * 200  # 最大允許長度
        
        large_request = {
            "keyword": large_keyword,
            "audience": large_audience,
            "options": {
                "generate_draft": True,
                "include_faq": True,
                "include_table": True
            }
        }
        
        response = await async_client.post("/api/analyze", json=large_request)
        # 應該通過驗證（不是 422 錯誤）
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 大型請求負載處理測試通過")

    @pytest.mark.asyncio
    async def test_concurrent_invalid_requests(
        self,
        async_client: AsyncClient
    ):
        """測試並發無效請求的處理。"""
        # 創建多個無效請求
        invalid_requests = [
            {"keyword": "", "audience": "test", "options": {"generate_draft": False, "include_faq": False, "include_table": False}},
            {"keyword": "test", "audience": "", "options": {"generate_draft": False, "include_faq": False, "include_table": False}},
            {"keyword": "test", "audience": "test"},  # 缺少 options
            {"keyword": "test", "audience": "test", "options": {"generate_draft": "invalid"}},  # 無效選項
        ]
        
        # 並發發送請求
        tasks = [
            async_client.post("/api/analyze", json=req)
            for req in invalid_requests
        ]
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 驗證所有響應都是驗證錯誤
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                pytest.fail(f"請求 {i+1} 拋出異常: {response}")
            else:
                # 明確告訴型別檢查器這是 Response 而不是 Exception
                http_response = cast(Response, response)
                assert http_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 並發無效請求處理測試通過")

    @pytest.mark.asyncio
    async def test_endpoint_not_found_handling(
        self,
        async_client: AsyncClient
    ):
        """測試不存在端點的處理。"""
        # 測試不存在的端點
        response = await async_client.post("/api/nonexistent")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        response = await async_client.get("/api/invalid-endpoint")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # 測試錯誤的 API 版本路徑
        valid_request = {
            "keyword": "測試關鍵字",
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = await async_client.post("/api/v2/analyze", json=valid_request)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        print("✅ 端點不存在處理測試通過")

    @pytest.mark.asyncio
    async def test_status_endpoint_invalid_job_id(
        self,
        async_client: AsyncClient
    ):
        """測試狀態端點的無效任務 ID 處理。"""
        # 測試不存在的任務 ID
        response = await async_client.get("/api/status/nonexistent-job-id")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # 測試格式錯誤的任務 ID
        invalid_job_ids = [
            "",  # 空 ID
            "invalid-format",  # 無效格式
            "12345",  # 純數字
            "job-",  # 不完整格式
        ]
        
        for job_id in invalid_job_ids:
            if job_id == "":
                # 空 ID 會導致路由不匹配
                response = await async_client.get("/api/status/")
                assert response.status_code == status.HTTP_404_NOT_FOUND
            else:
                response = await async_client.get(f"/api/status/{job_id}")
                # 應該是 404 (任務不存在) 或其他服務層錯誤
                assert response.status_code != status.HTTP_200_OK
        
        print("✅ 狀態端點無效任務 ID 處理測試通過")

    @pytest.mark.asyncio
    async def test_unicode_and_encoding_issues(
        self,
        async_client: AsyncClient
    ):
        """測試 Unicode 和編碼問題的處理。"""
        # 測試各種 Unicode 字符
        unicode_test_cases = [
            {
                "keyword": "🚀 SEO優化",
                "audience": "💼 企業主",
                "options": {"generate_draft": False, "include_faq": False, "include_table": False}
            },
            {
                "keyword": "测试关键词",  # 簡體中文
                "audience": "測試受眾",  # 繁體中文
                "options": {"generate_draft": False, "include_faq": False, "include_table": False}
            },
            {
                "keyword": "한글 키워드",  # 韓文
                "audience": "日本語の受け手",  # 日文
                "options": {"generate_draft": False, "include_faq": False, "include_table": False}
            }
        ]
        
        for test_case in unicode_test_cases:
            response = await async_client.post("/api/analyze", json=test_case)
            # 應該通過驗證（不是 422 錯誤）
            assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ Unicode 和編碼處理測試通過")

    @pytest.mark.asyncio
    async def test_request_timeout_scenarios(
        self,
        async_client: AsyncClient
    ):
        """測試請求超時場景的處理。"""
        # 這個測試主要驗證客戶端行為，實際超時由服務器配置決定
        valid_request = {
            "keyword": "測試關鍵字",
            "audience": "測試受眾",
            "options": {
                "generate_draft": True,
                "include_faq": True,
                "include_table": True
            }
        }
        
        try:
            # 設置一個非常短的超時來測試超時處理
            response = await async_client.post(
                "/api/analyze", 
                json=valid_request,
                timeout=0.001  # 1ms 超時
            )
            # 如果沒有超時，檢查回應
            assert response.status_code is not None
        except Exception as e:
            # 預期會有超時異常
            assert "timeout" in str(e).lower() or "time" in str(e).lower()
        
        print("✅ 請求超時場景處理測試通過")

    @pytest.mark.asyncio
    async def test_health_check_endpoint(
        self,
        async_client: AsyncClient
    ):
        """測試健康檢查端點的錯誤處理。"""
        # 正常的健康檢查
        response = await async_client.get("/api/health")
        # 可能回傳 200 (健康) 或其他狀態，但不應該是 404
        assert response.status_code != status.HTTP_404_NOT_FOUND
        
        # 測試健康檢查端點不支援的方法
        response = await async_client.post("/api/health")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        response = await async_client.put("/api/health")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        print("✅ 健康檢查端點錯誤處理測試通過")

    @pytest.mark.asyncio
    async def test_version_endpoint_error_handling(
        self,
        async_client: AsyncClient
    ):
        """測試版本端點的錯誤處理。"""
        # 正常的版本查詢
        response = await async_client.get("/api/version")
        assert response.status_code != status.HTTP_404_NOT_FOUND
        
        # 測試版本端點不支援的方法
        response = await async_client.post("/api/version")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        response = await async_client.delete("/api/version")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        
        print("✅ 版本端點錯誤處理測試通過")

    @pytest.mark.asyncio
    async def test_cors_preflight_handling(
        self,
        async_client: AsyncClient
    ):
        """測試 CORS 預檢請求的處理。"""
        # OPTIONS 請求測試 CORS
        response = await async_client.options("/api/analyze")
        # 應該允許 OPTIONS 請求或回傳適當的 CORS 標頭
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_204_NO_CONTENT,
            status.HTTP_405_METHOD_NOT_ALLOWED  # 如果未配置 CORS
        ]
        
        print("✅ CORS 預檢請求處理測試通過")

    @pytest.mark.asyncio
    async def test_duplicate_field_handling(
        self,
        async_client: AsyncClient
    ):
        """測試重複欄位的處理。"""
        # JSON 中的重複鍵（大多數 JSON 解析器會使用最後一個值）
        duplicate_field_json = '''
        {
            "keyword": "第一個關鍵字",
            "keyword": "第二個關鍵字",
            "audience": "測試受眾",
            "options": {
                "generate_draft": false,
                "include_faq": false,
                "include_table": false
            }
        }
        '''
        
        response = await async_client.post(
            "/api/analyze",
            content=duplicate_field_json,
            headers={"Content-Type": "application/json"}
        )
        
        # 應該能夠處理（通常使用最後一個值）
        assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY
        
        print("✅ 重複欄位處理測試通過")