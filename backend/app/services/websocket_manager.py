"""WebSocket 連線管理服務。

此模組提供 WebSocket 連線的管理功能，
包括連線追蹤、訊息廣播和進度推送。
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from uuid import uuid4
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect
from ..models.websocket import ProgressMessage, WebSocketMessage, ErrorMessage

logger = logging.getLogger(__name__)


class WebSocketConnection:
    """WebSocket 連線封裝類別。
    
    封裝單一 WebSocket 連線及其相關資訊。
    """
    
    def __init__(self, websocket: WebSocket, connection_id: str):
        self.websocket = websocket
        self.connection_id = connection_id
        self.connected_at = datetime.utcnow()
        self.analysis_ids: Set[str] = set()
        self.is_alive = True
    
    async def send_message(self, message: dict) -> bool:
        """發送訊息到此連線。
        
        Args:
            message: 要發送的訊息字典
            
        Returns:
            發送是否成功
        """
        try:
            await self.websocket.send_text(json.dumps(message))
            return True
        except Exception as e:
            logger.warning(f"發送訊息失敗到連線 {self.connection_id}: {e}")
            self.is_alive = False
            return False
    
    async def close(self):
        """關閉連線。"""
        try:
            if self.is_alive:
                await self.websocket.close()
        except Exception as e:
            logger.warning(f"關閉連線失敗 {self.connection_id}: {e}")
        finally:
            self.is_alive = False


class WebSocketManager:
    """WebSocket 連線管理器。
    
    負責管理所有 WebSocket 連線、訊息廣播和進度推送。
    """
    
    def __init__(self):
        self.connections: Dict[str, WebSocketConnection] = {}
        self.analysis_connections: Dict[str, Set[str]] = {}
        self._lock = asyncio.Lock()
    
    async def add_connection(self, websocket: WebSocket) -> str:
        """新增 WebSocket 連線。
        
        Args:
            websocket: WebSocket 實例
            
        Returns:
            連線 ID
        """
        connection_id = str(uuid4())
        connection = WebSocketConnection(websocket, connection_id)
        
        async with self._lock:
            self.connections[connection_id] = connection
        
        logger.info(f"新增 WebSocket 連線: {connection_id}")
        return connection_id
    
    async def remove_connection(self, connection_id: str):
        """移除 WebSocket 連線。
        
        Args:
            connection_id: 連線 ID
        """
        async with self._lock:
            if connection_id in self.connections:
                connection = self.connections[connection_id]
                
                # 從所有分析任務中移除此連線
                for analysis_id in list(connection.analysis_ids):
                    self._remove_analysis_connection(analysis_id, connection_id)
                
                # 關閉連線
                await connection.close()
                del self.connections[connection_id]
                
                logger.info(f"移除 WebSocket 連線: {connection_id}")
    
    async def subscribe_to_analysis(self, connection_id: str, analysis_id: str):
        """訂閱分析任務進度更新。
        
        Args:
            connection_id: 連線 ID
            analysis_id: 分析任務 ID
        """
        async with self._lock:
            if connection_id in self.connections:
                connection = self.connections[connection_id]
                connection.analysis_ids.add(analysis_id)
                
                if analysis_id not in self.analysis_connections:
                    self.analysis_connections[analysis_id] = set()
                self.analysis_connections[analysis_id].add(connection_id)
                
                logger.debug(f"連線 {connection_id} 訂閱分析 {analysis_id}")
    
    async def unsubscribe_from_analysis(self, connection_id: str, analysis_id: str):
        """取消訂閱分析任務進度更新。
        
        Args:
            connection_id: 連線 ID
            analysis_id: 分析任務 ID
        """
        async with self._lock:
            if connection_id in self.connections:
                connection = self.connections[connection_id]
                connection.analysis_ids.discard(analysis_id)
            
            self._remove_analysis_connection(analysis_id, connection_id)
            logger.debug(f"連線 {connection_id} 取消訂閱分析 {analysis_id}")
    
    def _remove_analysis_connection(self, analysis_id: str, connection_id: str):
        """內部方法：從分析任務中移除連線。
        
        Args:
            analysis_id: 分析任務 ID
            connection_id: 連線 ID
        """
        if analysis_id in self.analysis_connections:
            self.analysis_connections[analysis_id].discard(connection_id)
            if not self.analysis_connections[analysis_id]:
                del self.analysis_connections[analysis_id]
    
    async def send_to_connection(
        self, 
        connection_id: str, 
        message: dict
    ) -> bool:
        """發送訊息到特定連線。
        
        Args:
            connection_id: 目標連線 ID
            message: 要發送的訊息
            
        Returns:
            發送是否成功
        """
        connection = self.connections.get(connection_id)
        if connection and connection.is_alive:
            return await connection.send_message(message)
        return False
    
    async def send_progress(
        self, 
        analysis_id: str, 
        progress_message: ProgressMessage
    ):
        """發送進度更新到所有訂閱的連線。
        
        Args:
            analysis_id: 分析任務 ID
            progress_message: 進度訊息
        """
        if analysis_id not in self.analysis_connections:
            logger.debug(f"分析 {analysis_id} 沒有訂閱的連線")
            return
        
        message = progress_message.to_websocket_message().model_dump()
        connection_ids = list(self.analysis_connections[analysis_id])
        
        # 並行發送到所有訂閱的連線
        send_tasks = []
        for connection_id in connection_ids:
            if connection_id in self.connections:
                connection = self.connections[connection_id]
                if connection.is_alive:
                    send_tasks.append(connection.send_message(message))
        
        if send_tasks:
            results = await asyncio.gather(*send_tasks, return_exceptions=True)
            
            # 移除失敗的連線
            failed_connections = []
            for i, result in enumerate(results):
                if isinstance(result, Exception) or result is False:
                    failed_connection_id = connection_ids[i]
                    failed_connections.append(failed_connection_id)
            
            for failed_connection_id in failed_connections:
                await self.remove_connection(failed_connection_id)
    
    async def broadcast_message(
        self, 
        message: dict, 
        exclude_connections: Optional[Set[str]] = None
    ):
        """廣播訊息到所有連線。
        
        Args:
            message: 要廣播的訊息
            exclude_connections: 要排除的連線 ID 集合
        """
        exclude_connections = exclude_connections or set()
        
        send_tasks = []
        connection_ids = []
        
        async with self._lock:
            for connection_id, connection in self.connections.items():
                if (connection_id not in exclude_connections and 
                    connection.is_alive):
                    send_tasks.append(connection.send_message(message))
                    connection_ids.append(connection_id)
        
        if send_tasks:
            results = await asyncio.gather(*send_tasks, return_exceptions=True)
            
            # 移除失敗的連線
            failed_connections = []
            for i, result in enumerate(results):
                if isinstance(result, Exception) or result is False:
                    failed_connections.append(connection_ids[i])
            
            for failed_connection_id in failed_connections:
                await self.remove_connection(failed_connection_id)
    
    async def send_error(
        self, 
        connection_id: str, 
        error_code: str, 
        error_message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """發送錯誤訊息到特定連線。
        
        Args:
            connection_id: 目標連線 ID
            error_code: 錯誤代碼
            error_message: 錯誤訊息
            details: 錯誤詳細資訊
        """
        error_msg = ErrorMessage(
            error_code=error_code,
            message=error_message,
            details=details
        )
        
        websocket_msg = error_msg.to_websocket_message()
        await self.send_to_connection(connection_id, websocket_msg.model_dump())
    
    def get_connection_count(self) -> int:
        """取得當前連線數量。
        
        Returns:
            連線數量
        """
        return len([conn for conn in self.connections.values() if conn.is_alive])
    
    def get_analysis_subscriber_count(self, analysis_id: str) -> int:
        """取得特定分析任務的訂閱者數量。
        
        Args:
            analysis_id: 分析任務 ID
            
        Returns:
            訂閱者數量
        """
        return len(self.analysis_connections.get(analysis_id, set()))
    
    async def cleanup_dead_connections(self):
        """清理已死亡的連線。"""
        dead_connections = []
        
        async with self._lock:
            for connection_id, connection in self.connections.items():
                if not connection.is_alive:
                    dead_connections.append(connection_id)
        
        for connection_id in dead_connections:
            await self.remove_connection(connection_id)
        
        if dead_connections:
            logger.info(f"清理了 {len(dead_connections)} 個死亡連線")


# 全域 WebSocket 管理器實例
websocket_manager = WebSocketManager()


def get_websocket_manager() -> WebSocketManager:
    """取得 WebSocket 管理器實例。
    
    Returns:
        WebSocket 管理器實例
    """
    return websocket_manager