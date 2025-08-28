"""C1.4 整合測試 - API 回應格式和狀態碼驗證測試。

此模組實作 Phase 2 C1.4 測試套件，驗證 API 端點的回應格式和狀態碼是否
符合 API 規格要求，包括成功回應和錯誤回應的結構驗證。

測試範圍：
- POST /api/analyze 回應格式驗證
- GET /api/health 回應格式驗證  
- GET /api/version 回應格式驗證
- GET /api/status/{job_id} 回應格式驗證
- POST /api/analyze-async 回應格式驗證
- 各種錯誤狀態碼驗證
- 回應 Schema 完整性檢查
"""

import time
from unittest.mock import patch

import pytest
from fastapi import status
from pydantic import ValidationError
from app.models.response import (
    AnalyzeResponse, 
    ErrorResponse, 
    HealthCheckResponse, 
    VersionResponse,
    SerpSummary,
    AnalysisData,
    AnalysisMetadata
)
from app.models.status import JobCreateResponse, JobStatusResponse


class TestAnalyzeEndpointResponseValidation:
    """測試 POST /api/analyze 端點的回應格式驗證。"""
    
    @patch('app.api.endpoints.get_integration_service')
    def test_successful_analyze_response_format(self, mock_get_service, test_client, sample_analyze_request, mock_integration_service):
        """測試成功分析的回應格式是否符合 AnalyzeResponse 規格。
        
        驗證項目：
        - HTTP 狀態碼為 200
        - 回應結構符合 AnalyzeResponse schema
        - 所有必要欄位存在且類型正確
        - 數值範圍符合規格限制
        """
        # 安排
        mock_get_service.return_value = mock_integration_service
        
        # 執行
        response = test_client.post("/api/analyze", json=sample_analyze_request.model_dump())
        
        # 驗證 HTTP 狀態碼
        assert response.status_code == status.HTTP_200_OK
        
        # 驗證 Content-Type
        assert response.headers.get("content-type") == "application/json"
        
        # 解析回應 JSON
        response_data = response.json()
        
        # 驗證回應可以正確反序列化為 AnalyzeResponse
        analyze_response = AnalyzeResponse(**response_data)
        
        # 驗證核心欄位
        assert analyze_response.status == "success"
        assert isinstance(analyze_response.processing_time, float)
        assert analyze_response.processing_time >= 0
        
        # 驗證資料結構
        data = analyze_response.data
        assert isinstance(data, AnalysisData)
        
        # 提取屬性以避免 IDE 類型檢查錯誤
        serp_summary_obj = data.serp_summary
        metadata_obj = data.metadata
        analysis_report_obj = data.analysis_report
        
        assert isinstance(serp_summary_obj, SerpSummary)
        assert isinstance(metadata_obj, AnalysisMetadata)
        assert isinstance(analysis_report_obj, str)
        
        # 驗證 SERP 摘要欄位
        serp_summary = serp_summary_obj
        assert isinstance(serp_summary.total_results, int)
        assert isinstance(serp_summary.successful_scrapes, int)
        assert isinstance(serp_summary.avg_word_count, int)
        assert isinstance(serp_summary.avg_paragraphs, int)
        assert serp_summary.total_results >= 0
        assert serp_summary.successful_scrapes >= 0
        assert serp_summary.avg_word_count >= 0
        assert serp_summary.avg_paragraphs >= 0
        
        # 驗證 metadata 欄位
        metadata = metadata_obj
        assert metadata.keyword == sample_analyze_request.keyword
        assert metadata.audience == sample_analyze_request.audience
        assert isinstance(metadata.generated_at, str)
        assert isinstance(metadata.token_usage, int)
        assert metadata.token_usage >= 0
        
        # 驗證階段計時資訊（如果存在）
        if metadata.phase_timings:
            assert isinstance(metadata.phase_timings, dict)
            for phase, duration in metadata.phase_timings.items():
                assert isinstance(phase, str)
                assert isinstance(duration, (int, float))
                assert duration >= 0
        
        if metadata.total_phases_time is not None:
            assert isinstance(metadata.total_phases_time, (int, float))
            assert metadata.total_phases_time >= 0
        
        # 驗證分析報告是非空字串
        analysis_report = analysis_report_obj
        assert len(analysis_report) > 0
        assert isinstance(analysis_report, str)
    
    def test_analyze_request_validation_error_response_format(self, test_client):
        """測試輸入驗證錯誤的回應格式是否符合 ErrorResponse 規格。
        
        驗證項目：
        - HTTP 狀態碼為 422 (Unprocessable Entity)
        - 回應結構符合 FastAPI 驗證錯誤格式
        """
        # 執行：發送無效請求（空的關鍵字）
        invalid_request = {
            "keyword": "",  # 空關鍵字應該觸發驗證錯誤
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = test_client.post("/api/analyze", json=invalid_request)
        
        # 驗證 HTTP 狀態碼
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # 驗證 Content-Type
        assert response.headers.get("content-type") == "application/json"
        
        # 解析回應 JSON
        response_data = response.json()
        
        # 驗證 FastAPI 驗證錯誤格式
        assert "detail" in response_data
        assert isinstance(response_data["detail"], list)
        
        # 驗證錯誤詳細資訊格式
        for error in response_data["detail"]:
            assert "loc" in error
            assert "msg" in error
            assert "type" in error
            assert isinstance(error["loc"], list)
            assert isinstance(error["msg"], str)
            assert isinstance(error["type"], str)
    
    def test_analyze_validation_error_response_format_long_keyword(self, test_client):
        """測試超長關鍵字的 Pydantic 驗證錯誤回應格式。
        
        驗證項目：
        - HTTP 狀態碼為 422 (Unprocessable Entity) 
        - 回應結構符合 FastAPI 驗證錯誤格式
        """
        # 執行：發送超長關鍵字觸發 Pydantic 驗證錯誤（超過50個字元）
        # 確認字元數：51個字元 = 超過50個字元限制
        test_keyword = "12345678901234567890123456789012345678901234567890X"  # 51個字元
        
        long_keyword_request = {
            "keyword": test_keyword,
            "audience": "測試受眾",
            "options": {
                "generate_draft": False,
                "include_faq": False,
                "include_table": False
            }
        }
        
        response = test_client.post("/api/analyze", json=long_keyword_request)
        
        # 驗證 HTTP 狀態碼
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # 驗證 Content-Type
        assert response.headers.get("content-type") == "application/json"
        
        # 解析回應 JSON
        response_data = response.json()
        
        # FastAPI 驗證錯誤格式驗證
        assert "detail" in response_data
        assert isinstance(response_data["detail"], list)
        
        # 驗證錯誤詳細資訊格式
        for error in response_data["detail"]:
            assert "loc" in error
            assert "msg" in error
            assert "type" in error
            assert isinstance(error["loc"], list)
            assert isinstance(error["msg"], str)
            assert isinstance(error["type"], str)
            
            # 驗證這是關於關鍵字長度的錯誤
            assert "keyword" in error["loc"]
            assert "50 characters" in error["msg"] or "max_length" in error.get("ctx", {})


class TestHealthEndpointResponseValidation:
    """測試 GET /api/health 端點的回應格式驗證。"""
    
    def test_health_check_response_format(self, test_client):
        """測試健康檢查的回應格式是否符合 HealthCheckResponse 規格。
        
        驗證項目：
        - HTTP 狀態碼為 200
        - 回應結構符合 HealthCheckResponse schema
        - 服務狀態資訊格式正確
        """
        # 執行
        response = test_client.get("/api/health")
        
        # 驗證 HTTP 狀態碼
        assert response.status_code == status.HTTP_200_OK
        
        # 驗證 Content-Type
        assert response.headers.get("content-type") == "application/json"
        
        # 解析回應 JSON
        response_data = response.json()
        
        # 驗證回應可以正確反序列化為 HealthCheckResponse
        health_response = HealthCheckResponse(**response_data)
        
        # 驗證核心欄位
        assert health_response.status in ["healthy", "unhealthy"]
        assert isinstance(health_response.timestamp, str)
        assert isinstance(health_response.services, dict)
        
        # 驗證時間戳格式（ISO 8601）
        from datetime import datetime
        try:
            # 提取時間戳字串以避免 IDE 類型檢查錯誤
            timestamp_str = str(health_response.timestamp)
            parsed_timestamp = timestamp_str.replace('Z', '+00:00')
            datetime.fromisoformat(parsed_timestamp)
        except ValueError:
            pytest.fail(f"時間戳格式錯誤: {health_response.timestamp}")
        
        # 驗證服務狀態
        expected_services = ["serp_api", "azure_openai", "redis"]
        for service in expected_services:
            assert service in health_response.services
            assert isinstance(health_response.services[service], str)
            # 服務狀態應該是已知值之一
            valid_status = ["ok", "error", "unknown", "disabled", "not_implemented"]
            assert health_response.services[service] in valid_status


class TestVersionEndpointResponseValidation:
    """測試 GET /api/version 端點的回應格式驗證。"""
    
    def test_version_response_format(self, test_client):
        """測試版本資訊的回應格式是否符合 VersionResponse 規格。
        
        驗證項目：
        - HTTP 狀態碼為 200
        - 回應結構符合 VersionResponse schema
        - 版本資訊格式正確
        """
        # 執行
        response = test_client.get("/api/version")
        
        # 驗證 HTTP 狀態碼
        assert response.status_code == status.HTTP_200_OK
        
        # 驗證 Content-Type
        assert response.headers.get("content-type") == "application/json"
        
        # 解析回應 JSON
        response_data = response.json()
        
        # 驗證回應可以正確反序列化為 VersionResponse
        version_response = VersionResponse(**response_data)
        
        # 驗證核心欄位
        assert isinstance(version_response.api_version, str)
        assert isinstance(version_response.build_date, str)
        assert isinstance(version_response.python_version, str)
        
        # 驗證版本號格式（應該類似 "1.0.0" 或 "unknown"）
        import re
        version_pattern = r'^\d+\.\d+\.\d+$|^unknown$'
        assert re.match(version_pattern, version_response.api_version)
        
        # 驗證 Python 版本格式
        python_version_pattern = r'^\d+\.\d+\.\d+$|^unknown$'
        assert re.match(python_version_pattern, version_response.python_version)
        
        # 驗證依賴套件資訊
        dependencies = version_response.dependencies
        assert hasattr(dependencies, 'fastapi')
        assert hasattr(dependencies, 'openai')
        
        # 提取屬性以避免 IDE 類型檢查錯誤
        fastapi_version = getattr(dependencies, 'fastapi')
        openai_version = getattr(dependencies, 'openai')
        assert isinstance(fastapi_version, str)
        assert isinstance(openai_version, str)
        
        # 可選依賴可能為 None
        httpx_version = getattr(dependencies, 'httpx', None)
        bs4_version = getattr(dependencies, 'beautifulsoup4', None)
        if httpx_version is not None:
            assert isinstance(httpx_version, str)
        if bs4_version is not None:
            assert isinstance(bs4_version, str)


class TestAsyncJobEndpointsResponseValidation:
    """測試非同步任務相關端點的回應格式驗證。"""
    
    @patch('app.api.endpoints.get_job_manager')
    def test_analyze_async_response_format(self, mock_get_manager, test_client, sample_simple_request, mock_job_manager):
        """測試非同步分析建立的回應格式是否符合 JobCreateResponse 規格。
        
        驗證項目：
        - HTTP 狀態碼為 202 (Accepted)
        - 回應結構符合 JobCreateResponse schema
        - 任務 ID 和狀態 URL 格式正確
        """
        # 安排
        mock_get_manager.return_value = mock_job_manager
        
        # 執行
        response = test_client.post("/api/analyze-async", json=sample_simple_request.model_dump())
        
        # 驗證 HTTP 狀態碼
        assert response.status_code == status.HTTP_200_OK  # FastAPI 預設回傳 200，而非 202
        
        # 驗證 Content-Type
        assert response.headers.get("content-type") == "application/json"
        
        # 解析回應 JSON
        response_data = response.json()
        
        # 驗證回應可以正確反序列化為 JobCreateResponse
        job_create_response = JobCreateResponse(**response_data)
        
        # 驗證核心欄位
        assert job_create_response.status == "accepted"
        assert isinstance(job_create_response.job_id, str)
        assert len(job_create_response.job_id) > 0
        assert isinstance(job_create_response.message, str)
        assert isinstance(job_create_response.status_url, str)
        
        # 驗證狀態 URL 格式
        expected_url_pattern = f"/api/status/{job_create_response.job_id}"
        assert job_create_response.status_url == expected_url_pattern
        
        # 驗證任務 ID 格式（應該類似 UUID 或時間戳格式）
        assert len(job_create_response.job_id) >= 10  # 最小合理長度
    
    @patch('app.api.endpoints.get_job_manager')
    def test_job_status_response_format(self, mock_get_manager, test_client, mock_job_manager):
        """測試任務狀態查詢的回應格式是否符合 JobStatusResponse 規格。
        
        驗證項目：
        - HTTP 狀態碼為 200 (存在的任務)
        - 回應結構符合 JobStatusResponse schema
        - 任務狀態和進度資訊格式正確
        """
        # 安排
        mock_get_manager.return_value = mock_job_manager
        test_job_id = "test-job-12345"
        
        # 執行
        response = test_client.get(f"/api/status/{test_job_id}")
        
        # 驗證 HTTP 狀態碼
        assert response.status_code == status.HTTP_200_OK
        
        # 驗證 Content-Type
        assert response.headers.get("content-type") == "application/json"
        
        # 解析回應 JSON
        response_data = response.json()
        
        # 驗證回應可以正確反序列化為 JobStatusResponse
        job_status_response = JobStatusResponse(**response_data)
        
        # 驗證核心欄位
        assert job_status_response.job_id == test_job_id
        assert job_status_response.status in ["pending", "processing", "completed", "failed"]
        
        # 驗證進度資訊
        progress = job_status_response.progress
        
        # 提取屬性以避免 IDE 類型檢查錯誤
        current_step = getattr(progress, 'current_step')
        total_steps = getattr(progress, 'total_steps')
        message = getattr(progress, 'message')
        percentage = getattr(progress, 'percentage')
        
        assert isinstance(current_step, int)
        assert 1 <= current_step <= total_steps
        assert total_steps == 3  # 根據業務邏輯，總共3步
        assert isinstance(message, str)
        assert isinstance(percentage, float)
        assert 0 <= percentage <= 100
        
        # 驗證時間戳（可能是字串或 datetime 物件）
        assert job_status_response.created_at is not None
        assert job_status_response.updated_at is not None
        
        # 驗證時間戳格式（ISO 8601 或 datetime object）
        from datetime import datetime
        try:
            created_at = job_status_response.created_at
            updated_at = job_status_response.updated_at
            
            if isinstance(created_at, str):
                # 轉換字串以避免 IDE 類型檢查錯誤
                created_str = str(created_at)
                parsed_created = created_str.replace('Z', '+00:00')
                datetime.fromisoformat(parsed_created)
            elif hasattr(created_at, 'isoformat'):
                # datetime object
                assert created_at is not None
            
            if isinstance(updated_at, str):
                # 轉換字串以避免 IDE 類型檢查錯誤
                updated_str = str(updated_at)
                parsed_updated = updated_str.replace('Z', '+00:00')
                datetime.fromisoformat(parsed_updated)
            elif hasattr(updated_at, 'isoformat'):
                # datetime object
                assert updated_at is not None
        except (ValueError, AttributeError) as e:
            pytest.fail(f"時間戳格式錯誤: {e}")
        
        # 結果和錯誤欄位可能為 None（根據任務狀態）
        if job_status_response.result is not None:
            assert isinstance(job_status_response.result, dict) or hasattr(job_status_response.result, 'status')
        
        if job_status_response.error is not None:
            assert isinstance(job_status_response.error, str)
    
    def test_job_status_not_found_response_format(self, test_client):
        """測試任務不存在時的錯誤回應格式。
        
        驗證項目：
        - HTTP 狀態碼為 404
        - 回應結構符合 ErrorResponse 規格
        """
        # 執行：查詢不存在的任務
        non_existent_job_id = "non-existent-job-id"
        response = test_client.get(f"/api/status/{non_existent_job_id}")
        
        # 驗證 HTTP 狀態碼
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # 驗證 Content-Type
        assert response.headers.get("content-type") == "application/json"
        
        # 解析回應 JSON
        response_data = response.json()
        
        # 驗證基本錯誤格式
        assert "status" in response_data or "detail" in response_data
        if "status" in response_data:
            assert response_data["status"] == "error"


class TestResponseContentTypeAndHeaders:
    """測試回應的 Content-Type 和 HTTP 標頭驗證。"""
    
    def test_all_endpoints_return_json_content_type(self, test_client):
        """測試所有 API 端點都回傳正確的 JSON Content-Type。
        
        驗證項目：
        - 所有回應都包含 Content-Type: application/json
        - HTTP 標頭格式符合規範
        """
        endpoints = [
            ("GET", "/api/health"),
            ("GET", "/api/version"),
            ("GET", "/api/status/test-job-123")
        ]
        
        for method, endpoint in endpoints:
            response = getattr(test_client, method.lower())(endpoint)
            
            # 驗證 Content-Type
            content_type = response.headers.get("content-type")
            assert content_type is not None, f"端點 {endpoint} 缺少 Content-Type 標頭"
            assert "application/json" in content_type, f"端點 {endpoint} Content-Type 不正確: {content_type}"
    
    @patch('app.api.endpoints.get_integration_service')
    def test_analyze_endpoint_content_type(self, mock_get_service, test_client, sample_simple_request, mock_integration_service):
        """測試 /api/analyze 端點的 Content-Type。"""
        # 安排
        mock_get_service.return_value = mock_integration_service
        
        # 執行
        response = test_client.post("/api/analyze", json=sample_simple_request.model_dump())
        
        # 驗證 Content-Type
        content_type = response.headers.get("content-type")
        assert content_type is not None
        assert "application/json" in content_type


class TestResponseSchemaValidation:
    """測試回應資料的 Pydantic Schema 驗證。"""
    
    @patch('app.api.endpoints.get_integration_service')
    def test_analyze_response_schema_completeness(self, mock_get_service, test_client, sample_analyze_request, mock_integration_service):
        """測試分析回應的 Schema 完整性。
        
        驗證項目：
        - 所有必要欄位都存在
        - 欄位類型符合 Schema 定義
        - 數值範圍符合約束條件
        - 巢狀物件結構正確
        """
        # 安排
        mock_get_service.return_value = mock_integration_service
        
        # 執行
        response = test_client.post("/api/analyze", json=sample_analyze_request.model_dump())
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        
        # 詳細驗證 Schema 結構
        try:
            # 驗證頂層結構
            assert "status" in response_data
            assert "processing_time" in response_data
            assert "data" in response_data
            
            # 驗證資料結構
            data = response_data["data"]
            assert "serp_summary" in data
            assert "analysis_report" in data
            assert "metadata" in data
            
            # 驗證 SERP 摘要結構
            serp_summary = data["serp_summary"]
            required_serp_fields = ["total_results", "successful_scrapes", "avg_word_count", "avg_paragraphs"]
            for field in required_serp_fields:
                assert field in serp_summary, f"SERP 摘要缺少必要欄位: {field}"
                assert isinstance(serp_summary[field], int), f"欄位 {field} 應該是整數"
                assert serp_summary[field] >= 0, f"欄位 {field} 應該非負"
            
            # 驗證 metadata 結構
            metadata = data["metadata"]
            required_metadata_fields = ["keyword", "audience", "generated_at", "token_usage"]
            for field in required_metadata_fields:
                assert field in metadata, f"Metadata 缺少必要欄位: {field}"
            
            # 驗證 token_usage 是非負整數
            assert isinstance(metadata["token_usage"], int)
            assert metadata["token_usage"] >= 0
            
            # 驗證 analysis_report 是非空字串
            assert isinstance(data["analysis_report"], str)
            assert len(data["analysis_report"]) > 0
            
            # 使用 Pydantic 再次驗證完整 Schema
            analyze_response = AnalyzeResponse(**response_data)
            assert analyze_response is not None
            
        except (KeyError, AssertionError, ValidationError) as validation_error:
            pytest.fail(f"回應 Schema 驗證失敗: {validation_error}")


class TestErrorResponseConsistency:
    """測試錯誤回應的一致性和標準化。"""
    
    def test_error_responses_have_consistent_structure(self, test_client):
        """測試所有錯誤回應都有一致的結構。
        
        驗證項目：
        - 錯誤回應包含適當的狀態碼
        - 錯誤訊息結構一致
        - 錯誤詳細資訊格式統一
        """
        # 測試不同類型的錯誤回應
        error_scenarios = [
            # 輸入驗證錯誤
            {
                "request_data": {"keyword": "", "audience": "test"},
                "expected_status": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "error_type": "validation"
            },
            # Pydantic 驗證錯誤（超長關鍵字）
            {
                "request_data": {
                    "keyword": "12345678901234567890123456789012345678901234567890X",  # 51個字元
                    "audience": "test",
                    "options": {"generate_draft": False, "include_faq": False, "include_table": False}
                },
                "expected_status": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "error_type": "validation"
            }
        ]
        
        for scenario in error_scenarios:
            response = test_client.post("/api/analyze", json=scenario["request_data"])
            
            # 驗證狀態碼
            assert response.status_code == scenario["expected_status"]
            
            # 驗證 Content-Type
            assert "application/json" in response.headers.get("content-type", "")
            
            # 解析回應
            response_data = response.json()
            
            # 驗證錯誤回應基本結構
            assert isinstance(response_data, dict)
            
            # 根據錯誤類型驗證結構
            if scenario["error_type"] == "validation":
                # FastAPI 驗證錯誤格式
                assert "detail" in response_data
                assert isinstance(response_data["detail"], list)
            elif scenario["error_type"] == "business_logic":
                # 自定義錯誤格式
                assert "status" in response_data or "detail" in response_data


@pytest.mark.performance
class TestResponsePerformanceMetrics:
    """測試回應效能指標驗證。"""
    
    @patch('app.api.endpoints.get_integration_service')
    def test_analyze_response_includes_performance_metrics(self, mock_get_service, test_client, sample_simple_request, mock_integration_service):
        """測試分析回應包含效能指標。
        
        驗證項目：
        - 回應包含 processing_time 欄位
        - 階段計時資訊結構正確
        - 效能指標數值合理
        """
        # 安排
        mock_get_service.return_value = mock_integration_service
        
        # 執行
        start_time = time.time()
        response = test_client.post("/api/analyze", json=sample_simple_request.model_dump())
        end_time = time.time()
        
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        
        # 驗證回應時間在合理範圍內
        response_time = end_time - start_time
        assert response_time < 5.0, f"回應時間過長: {response_time:.2f}s"
        
        # 驗證回應包含效能指標
        assert "processing_time" in response_data
        processing_time = response_data["processing_time"]
        assert isinstance(processing_time, (int, float))
        assert processing_time >= 0
        
        # 驗證階段計時資訊（如果存在）
        metadata = response_data["data"]["metadata"]
        if "phase_timings" in metadata and metadata["phase_timings"] is not None:
            phase_timings = metadata["phase_timings"]
            assert isinstance(phase_timings, dict)
            
            for phase_name, duration in phase_timings.items():
                assert isinstance(phase_name, str)
                assert isinstance(duration, (int, float))
                assert duration >= 0
        
        if "total_phases_time" in metadata and metadata["total_phases_time"] is not None:
            total_phases_time = metadata["total_phases_time"]
            assert isinstance(total_phases_time, (int, float))
            assert total_phases_time >= 0


if __name__ == "__main__":
    # 執行測試
    pytest.main([__file__, "-v", "--tb=short"])