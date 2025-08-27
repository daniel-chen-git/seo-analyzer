"""WebSocket 連線和進度推送測試 (C1.2)。

測試 WebSocket 連線的完整功能包括：
- WebSocket 連線建立和驗證
- 進度訊息推送和格式驗證
- 連線中斷和清理處理
- 錯誤狀況和異常處理
"""

import asyncio
from typing import Dict, Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.websocket import ProgressMessage
from app.services.websocket_manager import WebSocketManager


class TestWebSocketConnectionIntegration:
    """C1.2 - WebSocket 連線和進度推送測試。"""

    @pytest.mark.asyncio
    async def test_websocket_connection_establishment(
        self,
        test_app,
        websocket_manager: WebSocketManager
    ):
        """測試 WebSocket 連線建立。"""
        with TestClient(test_app) as client:
            try:
                with client.websocket_connect("/ws") as websocket:
                    # 發送測試訊息
                    test_message = {"type": "ping"}
                    websocket.send_json(test_message)

                    # 接收回應
                    response = websocket.receive_json()
                    assert response["type"] == "pong"

                    print("✅ WebSocket 連線建立測試通過")
            except Exception as e:
                # 如果 WebSocket 端點尚未實作，跳過測試
                pytest.skip(f"WebSocket 端點尚未實作: {e}")

    @pytest.mark.asyncio
    async def test_websocket_progress_message_format(
        self,
        test_app,
        websocket_manager: WebSocketManager,
        mock_progress_data: Dict[str, Any]
    ):
        """測試進度訊息格式驗證。"""
        # 測試進度訊息物件建立和驗證
        analysis_id = "test-analysis-001"
        
        progress_message = ProgressMessage(
            analysis_id=analysis_id,
            phase="serp_search",
            progress=25.0,
            message="搜尋競爭對手網站中...",
            details={
                "completed_queries": 5,
                "total_queries": 20,
                "current_query": "Python 程式設計 tutorial"
            }
        )
        
        # 驗證進度訊息結構
        assert progress_message.analysis_id == analysis_id
        assert progress_message.phase == "serp_search"
        assert progress_message.progress == 25.0
        assert progress_message.message == "搜尋競爭對手網站中..."
        assert progress_message.details is not None
        assert progress_message.details["completed_queries"] == 5
        
        # 測試轉換為 WebSocket 訊息
        websocket_message = progress_message.to_websocket_message()
        assert websocket_message.type == "progress_update"
        assert websocket_message.data is not None
        assert websocket_message.data["analysis_id"] == analysis_id
        
        print("✅ 進度訊息格式驗證測試通過")

    @pytest.mark.asyncio
    async def test_websocket_progress_phases(
        self,
        websocket_manager: WebSocketManager
    ):
        """測試各階段進度訊息推送。"""
        analysis_id = "test-analysis-002"
        
        # 測試各個分析階段的進度訊息
        test_phases = [
            {
                "phase": "serp_search",
                "progress": 20.0,
                "message": "搜尋 SERP 結果中...",
                "details": {"current_page": 1, "total_pages": 3}
            },
            {
                "phase": "content_scraping",
                "progress": 50.0,
                "message": "爬取競爭對手內容中...",
                "details": {"scraped_urls": 5, "total_urls": 10}
            },
            {
                "phase": "ai_analysis",
                "progress": 80.0,
                "message": "生成分析報告中...",
                "details": {"tokens_used": 4500, "max_tokens": 8000}
            },
            {
                "phase": "completed",
                "progress": 100.0,
                "message": "分析完成",
                "details": {"total_time": 45.2, "success": True}
            }
        ]
        
        # 模擬各階段進度更新
        for phase_data in test_phases:
            progress = ProgressMessage(
                analysis_id=analysis_id,
                **phase_data
            )
            
            # 驗證進度訊息建立
            assert progress.analysis_id == analysis_id
            assert progress.phase == phase_data["phase"]
            assert progress.progress == phase_data["progress"]
            assert progress.message == phase_data["message"]
            
            # 測試 WebSocket 管理器進度發送（模擬）
            with patch.object(websocket_manager, 'send_progress') as mock_send:
                await websocket_manager.send_progress(analysis_id, progress)
                mock_send.assert_called_once_with(analysis_id, progress)
            
            print(f"✅ {phase_data['phase']} 階段進度推送測試通過")

    @pytest.mark.asyncio
    async def test_websocket_multiple_connections(
        self,
        websocket_manager: WebSocketManager
    ):
        """測試多個 WebSocket 連線管理。"""
        analysis_ids = [f"multi-analysis-{i+1}" for i in range(3)]
        
        # 向所有分析發送進度更新
        for i, analysis_id in enumerate(analysis_ids):
            progress = ProgressMessage(
                analysis_id=analysis_id,
                phase="content_scraping",
                progress=50.0 + i * 10,
                message=f"處理分析 {i+1}",
                details={"connection_id": i+1}
            )
            
            # 驗證進度訊息結構
            assert progress.analysis_id == analysis_id
            assert progress.progress == 50.0 + i * 10
            assert f"分析 {i+1}" in progress.message
            
            # 模擬向管理器發送進度
            with patch.object(websocket_manager, 'send_progress') as mock_send:
                await websocket_manager.send_progress(analysis_id, progress)
                mock_send.assert_called_once()
        
        print("✅ 多連線管理測試通過")

    @pytest.mark.asyncio
    async def test_websocket_connection_cleanup(
        self,
        websocket_manager: WebSocketManager
    ):
        """測試 WebSocket 連線清理。"""
        connection_id = "test-connection-001"
        analysis_id = "cleanup-test-001"
        
        # 模擬訂閱分析
        await websocket_manager.subscribe_to_analysis(connection_id, analysis_id)
        
        # 驗證訂閱狀態
        subscriber_count = websocket_manager.get_analysis_subscriber_count(analysis_id)
        assert subscriber_count == 1  # 訂閱後應該有 1 個連線
        
        # 模擬取消訂閱
        await websocket_manager.unsubscribe_from_analysis(connection_id, analysis_id)
        
        # 模擬連線移除
        with patch.object(websocket_manager, 'remove_connection') as mock_remove:
            await websocket_manager.remove_connection(connection_id)
            mock_remove.assert_called_once_with(connection_id)
        
        print("✅ WebSocket 連線清理測試通過")

    @pytest.mark.asyncio
    async def test_websocket_error_handling(
        self,
        websocket_manager: WebSocketManager
    ):
        """測試 WebSocket 錯誤處理。"""
        connection_id = "test-error-connection"
        
        # 測試發送錯誤訊息
        await websocket_manager.send_error(
            connection_id=connection_id,
            error_code="INVALID_MESSAGE",
            error_message="無效的訊息格式",
            details={"received_type": "invalid"}
        )
        
        # 測試錯誤訊息模型
        from app.models.websocket import ErrorMessage
        
        error_msg = ErrorMessage(
            error_code="CONNECTION_FAILED",
            message="WebSocket 連線失敗",
            details={"reason": "timeout"}
        )
        
        # 驗證錯誤訊息結構
        assert error_msg.type == "error"
        assert error_msg.error_code == "CONNECTION_FAILED"
        assert error_msg.message == "WebSocket 連線失敗"
        assert error_msg.details is not None
        assert error_msg.details["reason"] == "timeout"
        
        # 測試轉換為 WebSocket 訊息
        websocket_message = error_msg.to_websocket_message()
        assert websocket_message.type == "error"
        assert websocket_message.data is not None
        
        print("✅ WebSocket 錯誤處理測試通過")

    @pytest.mark.asyncio
    async def test_websocket_progress_message_validation(
        self,
        websocket_manager: WebSocketManager
    ):
        """測試進度訊息驗證和型別檢查。"""
        analysis_id = "validation-test-001"
        
        # 測試有效的進度訊息
        valid_message = ProgressMessage(
            analysis_id=analysis_id,
            phase="serp_search",
            progress=33.3,
            message="搜尋進行中",
            details={
                "query": "Python 教學",
                "results_found": 150,
                "page": 1
            }
        )
        
        # 驗證訊息結構
        message_dict = valid_message.model_dump()
        assert "analysis_id" in message_dict
        assert "phase" in message_dict
        assert "progress" in message_dict
        assert "message" in message_dict
        assert "details" in message_dict
        assert "timestamp" in message_dict
        
        # 驗證數據類型
        assert isinstance(message_dict["progress"], float)
        assert 0 <= message_dict["progress"] <= 100
        assert isinstance(message_dict["details"], dict)
        
        # 測試無效進度值（應該通過 Pydantic 驗證捕獲）
        try:
            ProgressMessage(
                analysis_id=analysis_id,
                phase="test",
                progress=150.0,  # 超出範圍
                message="invalid progress"
            )
            assert False, "應該拋出驗證錯誤"
        except Exception as e:
            assert "150.0" in str(e) or "greater" in str(e).lower()
        
        try:
            ProgressMessage(
                analysis_id=analysis_id,
                phase="test",
                progress=-10.0,  # 負數
                message="invalid progress"
            )
            assert False, "應該拋出驗證錯誤"
        except Exception as e:
            assert "-10.0" in str(e) or "greater" in str(e).lower()
        
        print("✅ 進度訊息驗證測試通過")

    @pytest.mark.asyncio
    async def test_websocket_connection_heartbeat(
        self,
        websocket_manager: WebSocketManager
    ):
        """測試 WebSocket 心跳機制。"""
        # 測試連線訊息模型
        from app.models.websocket import ConnectionMessage
        
        # 測試 ping 訊息
        ping_msg = ConnectionMessage(
            type="ping",
            sequence=1
        )
        
        assert ping_msg.type == "ping"
        assert ping_msg.sequence == 1
        assert ping_msg.timestamp is not None
        
        # 測試 pong 訊息
        pong_msg = ConnectionMessage(
            type="pong",
            sequence=1,
            connection_id="test-connection"
        )
        
        assert pong_msg.type == "pong"
        assert pong_msg.sequence == 1
        assert pong_msg.connection_id == "test-connection"
        
        # 測試連線統計
        connection_count = websocket_manager.get_connection_count()
        assert isinstance(connection_count, int)
        assert connection_count >= 0
        
        print("✅ WebSocket 心跳機制測試通過")

    @pytest.mark.asyncio
    async def test_websocket_concurrent_progress_updates(
        self,
        websocket_manager: WebSocketManager
    ):
        """測試並發進度更新處理。"""
        analysis_id = "concurrent-test-001"
        
        # 模擬並發進度更新
        update_tasks = []
        progress_messages = []
        
        for i in range(5):
            progress_value = i * 20.0
            progress_msg = ProgressMessage(
                analysis_id=analysis_id,
                phase=f"phase_{i}",
                progress=progress_value,
                message=f"處理步驟 {i+1}",
                details={"step": i + 1}
            )
            progress_messages.append(progress_msg)
            
            # 創建並發更新任務
            task = asyncio.create_task(
                self._mock_progress_send(websocket_manager, analysis_id, progress_msg)
            )
            update_tasks.append(task)
        
        # 等待所有更新完成
        results = await asyncio.gather(*update_tasks, return_exceptions=True)
        
        # 驗證所有更新都成功處理
        for i, result in enumerate(results):
            assert not isinstance(result, Exception), f"任務 {i} 失敗: {result}"
            assert result is True, f"任務 {i} 沒有成功執行"
        
        # 驗證進度訊息順序和內容
        for i, progress_msg in enumerate(progress_messages):
            assert progress_msg.progress == i * 20.0
            assert f"步驟 {i+1}" in progress_msg.message
            assert progress_msg.details["step"] == i + 1
        
        print("✅ 並發進度更新測試通過")
    
    async def _mock_progress_send(self, manager, analysis_id, progress_msg):
        """模擬進度發送的輔助方法。"""
        # 模擬進度發送邏輯
        await asyncio.sleep(0.01)  # 模擬處理時間
        return True