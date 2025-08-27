"""API 端點整合測試 (C1.1 - C1.4)。

測試 API 端點的完整流程包括：
- POST /api/analyze 完整流程
- WebSocket 連線和進度更新
- 輸入驗證和錯誤處理
- 回應格式和狀態碼驗證
"""

import asyncio
from typing import cast
from unittest.mock import patch

import pytest
from fastapi import status
from httpx import AsyncClient, Response

from app.models.request import AnalyzeRequest, AnalyzeOptions


class TestAnalyzeEndpointIntegration:
    """C1.1 - POST /api/analyze 完整流程測試。"""

    @pytest.mark.asyncio
    async def test_analyze_complete_success_flow(
        self,
        async_client: AsyncClient,
        sample_analyze_request: AnalyzeRequest,
        mock_integration_service,
        performance_monitor
    ):
        """測試完整成功分析流程。"""
        performance_monitor.start()

        # 模擬整合服務
        with patch('app.api.endpoints.get_integration_service',
                   return_value=mock_integration_service):
            response = await async_client.post(
                "/api/analyze",
                json=sample_analyze_request.model_dump()
            )

        # 驗證回應
        assert response.status_code == status.HTTP_200_OK

        response_data = response.json()
        assert response_data["status"] == "success"
        assert "data" in response_data
        assert "processing_time" in response_data

        # 驗證資料結構
        data = response_data["data"]
        assert "analysis_report" in data
        assert "metadata" in data
        assert "serp_summary" in data

        # 驗證元資料
        metadata = data["metadata"]
        assert "keyword" in metadata
        assert "audience" in metadata
        assert "generated_at" in metadata
        assert "token_usage" in metadata
        assert "phase_timings" in metadata

        # 驗證階段計時
        phase_timings = metadata["phase_timings"]
        assert "serp_duration" in phase_timings
        assert "scraping_duration" in phase_timings
        assert "ai_duration" in phase_timings

        # 驗證 SERP 摘要
        serp_summary = data["serp_summary"]
        assert "total_results" in serp_summary
        assert "successful_scrapes" in serp_summary
        assert "avg_word_count" in serp_summary
        assert "avg_paragraphs" in serp_summary

        # 效能驗證
        elapsed = performance_monitor.elapsed()
        assert elapsed < 60.0, f"請求耗時 {elapsed:.2f}s，應小於 60s"

        print(f"✅ 完整流程測試通過，耗時 {elapsed:.2f}s")

    @pytest.mark.asyncio
    async def test_analyze_with_different_options(
        self,
        async_client: AsyncClient,
        mock_integration_service,
        performance_monitor
    ):
        """測試不同選項的分析流程。"""
        performance_monitor.start()

        # 測試不同的分析選項組合
        test_cases = [
            {
                "keyword": "Python 程式設計",
                "audience": "初學者",
                "options": AnalyzeOptions(
                    generate_draft=True,
                    include_faq=False,
                    include_table=False
                )
            },
            {
                "keyword": "機器學習入門",
                "audience": "資料科學學生",
                "options": AnalyzeOptions(
                    generate_draft=False,
                    include_faq=True,
                    include_table=True
                )
            },
            {
                "keyword": "網站優化技巧",
                "audience": "網站管理員",
                "options": AnalyzeOptions(
                    generate_draft=True,
                    include_faq=True,
                    include_table=False
                )
            }
        ]

        with patch('app.api.endpoints.get_integration_service', return_value=mock_integration_service):
            for i, test_case in enumerate(test_cases, 1):
                request = AnalyzeRequest(**test_case)
                
                response = await async_client.post(
                    "/api/analyze",
                    json=request.model_dump()
                )

                assert response.status_code == status.HTTP_200_OK
                response_data = response.json()
                assert response_data["status"] == "success"
                
                # 驗證選項是否正確處理
                assert "data" in response_data
                assert "analysis_report" in response_data["data"]

                print(f"✅ 測試案例 {i} 通過：{test_case['keyword']}")

        elapsed = performance_monitor.elapsed()
        print(f"✅ 不同選項測試完成，總耗時 {elapsed:.2f}s")

    @pytest.mark.asyncio
    async def test_analyze_async_complete_flow(
        self,
        async_client: AsyncClient,
        sample_simple_request: AnalyzeRequest,
        mock_job_manager
    ):
        """測試非同步分析端點完整流程。"""

        with patch('app.api.endpoints.get_job_manager', return_value=mock_job_manager):
            # 建立非同步任務
            response = await async_client.post(
                "/api/analyze-async",
                json=sample_simple_request.model_dump()
            )

        assert response.status_code == status.HTTP_200_OK

        response_data = response.json()
        assert "job_id" in response_data
        assert "status_url" in response_data

        job_id = response_data["job_id"]
        assert job_id.startswith("test-job-")
        assert response_data["status_url"] == f"/api/status/{job_id}"

        print(f"✅ 非同步任務建立測試通過：{job_id}")

    @pytest.mark.asyncio
    async def test_job_status_complete_flow(
        self,
        async_client: AsyncClient,
        mock_job_manager
    ):
        """測試任務狀態端點完整流程。"""

        test_job_id = "test-job-12345"

        with patch('app.api.endpoints.get_job_manager', return_value=mock_job_manager):
            response = await async_client.get(f"/api/status/{test_job_id}")

        assert response.status_code == status.HTTP_200_OK

        response_data = response.json()
        assert response_data["job_id"] == test_job_id
        assert "status" in response_data
        assert "progress" in response_data
        assert "created_at" in response_data
        assert "updated_at" in response_data

        print(f"✅ 任務狀態測試通過：{test_job_id}")

    @pytest.mark.asyncio
    async def test_analyze_performance_metrics(
        self,
        async_client: AsyncClient,
        sample_simple_request: AnalyzeRequest,
        mock_integration_service,
        performance_monitor
    ):
        """測試分析效能指標。"""
        performance_monitor.start()

        with patch('app.api.endpoints.get_integration_service', return_value=mock_integration_service):
            response = await async_client.post(
                "/api/analyze",
                json=sample_simple_request.model_dump()
            )

        assert response.status_code == status.HTTP_200_OK
        
        response_data = response.json()
        processing_time = response_data["processing_time"]
        
        # 驗證處理時間在合理範圍內
        assert 0 < processing_time < 60, f"處理時間 {processing_time}s 超出範圍"
        
        # 驗證回應時間
        elapsed = performance_monitor.elapsed()
        assert elapsed < 5.0, f"API 回應時間 {elapsed:.2f}s 過長"
        
        # 記錄效能指標
        performance_monitor.record("processing_time", processing_time)
        performance_monitor.record("response_time", elapsed)
        
        print(f"✅ 效能指標測試通過")
        print(f"   - 處理時間：{processing_time:.2f}s")
        print(f"   - 回應時間：{elapsed:.2f}s")

    @pytest.mark.asyncio
    async def test_concurrent_analyze_requests(
        self,
        async_client: AsyncClient,
        mock_integration_service,
        performance_monitor
    ):
        """測試並發分析請求處理。"""
        performance_monitor.start()

        # 建立多個不同關鍵字的請求
        requests = [
            AnalyzeRequest(
                keyword=f"測試關鍵字 {i}",
                audience="測試受眾",
                options=AnalyzeOptions(generate_draft=False, include_faq=False, include_table=False)
            )
            for i in range(1, 4)  # 3 個並發請求
        ]

        with patch('app.api.endpoints.get_integration_service', return_value=mock_integration_service):
            # 並發執行請求
            tasks = [
                async_client.post("/api/analyze", json=req.model_dump())
                for req in requests
            ]

            responses = await asyncio.gather(*tasks, return_exceptions=True)

        # 驗證所有請求成功
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                pytest.fail(f"請求 {i+1} 失敗，異常：{response}")
            else:
                # 明確告訴型別檢查器這是 Response 而不是 Exception
                http_response = cast(Response, response)
                assert http_response.status_code == status.HTTP_200_OK
                response_data = http_response.json()
                assert response_data["status"] == "success"

        elapsed = performance_monitor.elapsed()
        print(f"✅ 並發請求測試通過，耗時 {elapsed:.2f}s")

        # 效能驗證 - 並發請求不應該比單一請求慢太多
        assert elapsed < 10.0, f"並發請求耗時 {elapsed:.2f}s，應小於 10s"

    @pytest.mark.asyncio
    async def test_analyze_response_consistency(
        self,
        async_client: AsyncClient,
        sample_analyze_request: AnalyzeRequest,
        mock_integration_service
    ):
        """測試分析回應的一致性。"""

        responses = []
        
        with patch('app.api.endpoints.get_integration_service', return_value=mock_integration_service):
            # 多次執行相同請求
            for _ in range(3):
                response = await async_client.post(
                    "/api/analyze",
                    json=sample_analyze_request.model_dump()
                )
                assert response.status_code == status.HTTP_200_OK
                responses.append(response.json())
                
                # 短暫延遲避免過度負載
                await asyncio.sleep(0.1)

        # 驗證回應結構一致性
        first_response = responses[0]
        for i, response in enumerate(responses[1:], 2):
            assert response["status"] == first_response["status"]
            assert set(response["data"].keys()) == set(first_response["data"].keys())
            assert set(response["data"]["metadata"].keys()) == set(first_response["data"]["metadata"].keys())
            print(f"✅ 第 {i} 次回應結構一致")

        print("✅ 回應一致性測試通過")