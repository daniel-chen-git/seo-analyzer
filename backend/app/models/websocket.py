"""WebSocket 訊息相關的資料模型。

此模組定義了 WebSocket 通訊所需的資料結構，
支援即時進度更新和雙向通訊功能。
"""

from datetime import datetime, timezone
from typing import Optional, Any, Dict, Literal
from pydantic import BaseModel, Field


class WebSocketMessage(BaseModel):
    """基礎 WebSocket 訊息結構。
    
    所有 WebSocket 訊息的基礎格式。
    """
    
    type: str = Field(
        ...,
        description="訊息類型"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="訊息時間戳記"
    )
    data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="訊息數據"
    )


class ProgressMessage(BaseModel):
    """進度更新訊息。
    
    用於推送分析進度更新的訊息格式。
    """
    
    analysis_id: str = Field(
        ...,
        description="分析任務 ID"
    )
    phase: str = Field(
        ...,
        description="當前處理階段",
        examples=["serp_search", "content_scraping", "ai_analysis", "completed"]
    )
    progress: float = Field(
        ...,
        description="進度百分比 (0-100)",
        ge=0,
        le=100
    )
    message: str = Field(
        ...,
        description="進度描述訊息",
        max_length=500
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="詳細進度資訊"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="訊息時間戳記"
    )
    
    def to_websocket_message(self) -> WebSocketMessage:
        """轉換為 WebSocket 訊息格式。
        
        Returns:
            WebSocket 訊息實例
        """
        return WebSocketMessage(
            type="progress_update",
            timestamp=self.timestamp,
            data=self.model_dump()
        )


class ConnectionMessage(BaseModel):
    """連線狀態訊息。
    
    用於處理 WebSocket 連線建立、維持和關閉的訊息。
    """
    
    type: Literal["connect", "disconnect", "ping", "pong"] = Field(
        ...,
        description="連線訊息類型"
    )
    connection_id: Optional[str] = Field(
        default=None,
        description="連線唯一識別碼"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="訊息時間戳記"
    )
    sequence: Optional[int] = Field(
        default=None,
        description="訊息序號（用於 ping/pong）"
    )


class AnalysisControlMessage(BaseModel):
    """分析控制訊息。
    
    用於控制分析任務的開始、暫停、停止等操作。
    """
    
    type: Literal["start_analysis", "pause_analysis", "stop_analysis", "resume_analysis"] = Field(
        ...,
        description="控制訊息類型"
    )
    analysis_id: str = Field(
        ...,
        description="分析任務 ID"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="分析參數"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="訊息時間戳記"
    )


class ErrorMessage(BaseModel):
    """錯誤訊息。
    
    用於傳送錯誤資訊的 WebSocket 訊息格式。
    """
    
    type: Literal["error"] = "error"
    error_code: str = Field(
        ...,
        description="錯誤代碼"
    )
    message: str = Field(
        ...,
        description="錯誤描述訊息"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="錯誤詳細資訊"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="訊息時間戳記"
    )
    
    def to_websocket_message(self) -> WebSocketMessage:
        """轉換為 WebSocket 訊息格式。
        
        Returns:
            WebSocket 訊息實例
        """
        return WebSocketMessage(
            type="error",
            timestamp=self.timestamp,
            data=self.model_dump()
        )


class SuccessMessage(BaseModel):
    """成功回應訊息。
    
    用於確認操作成功的 WebSocket 訊息格式。
    """
    
    type: Literal["success", "analysis_started", "analysis_completed"] = Field(
        ...,
        description="成功訊息類型"
    )
    analysis_id: Optional[str] = Field(
        default=None,
        description="相關的分析任務 ID"
    )
    message: str = Field(
        ...,
        description="成功訊息內容"
    )
    data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="額外的成功資訊"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="訊息時間戳記"
    )
    
    def to_websocket_message(self) -> WebSocketMessage:
        """轉換為 WebSocket 訊息格式。
        
        Returns:
            WebSocket 訊息實例
        """
        return WebSocketMessage(
            type=self.type,
            timestamp=self.timestamp,
            data={
                "analysis_id": self.analysis_id,
                "message": self.message,
                "data": self.data
            }
        )