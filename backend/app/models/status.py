"""任務狀態相關的資料模型。

此模組定義了任務狀態追蹤所需的資料結構，
支援非同步 SEO 分析任務的進度查詢功能。
"""

from datetime import datetime, timezone
from typing import Optional, Literal
from pydantic import BaseModel, Field

from .response import AnalyzeResponse


class JobProgress(BaseModel):
    """任務進度資訊。

    記錄當前處理階段和進度百分比。
    """

    current_step: int = Field(
        ...,
        description="當前處理步驟 (1=SERP擷取, 2=網頁爬取, 3=AI分析)",
        ge=1,
        le=3
    )
    total_steps: int = Field(
        default=3,
        description="總處理步驟數"
    )
    message: str = Field(
        ...,
        description="當前處理狀態描述",
        max_length=200
    )
    percentage: float = Field(
        ...,
        description="完成百分比 (0-100)",
        ge=0,
        le=100
    )


class JobStatus(BaseModel):
    """任務狀態資訊。

    完整記錄任務的執行狀態、進度和結果。
    """

    job_id: str = Field(
        ...,
        description="任務唯一識別碼"
    )
    status: Literal["pending", "processing", "completed", "failed"] = Field(
        ...,
        description="任務狀態"
    )
    progress: JobProgress = Field(
        ...,
        description="任務進度資訊"
    )
    result: Optional[AnalyzeResponse] = Field(
        default=None,
        description="任務完成時的分析結果"
    )
    error: Optional[str] = Field(
        default=None,
        description="任務失敗時的錯誤訊息"
    )
    created_at: datetime = Field(
        ...,
        description="任務建立時間"
    )
    updated_at: datetime = Field(
        ...,
        description="最後更新時間"
    )

    @classmethod
    def create_pending_job(cls, job_id: str) -> "JobStatus":
        """建立待處理狀態的任務。

        Args:
            job_id: 任務識別碼

        Returns:
            待處理狀態的 JobStatus 實例
        """
        now = datetime.now(timezone.utc)
        return cls(
            job_id=job_id,
            status="pending",
            progress=JobProgress(
                current_step=1,
                message="任務已建立，等待處理...",
                percentage=0.0
            ),
            created_at=now,
            updated_at=now
        )

    def update_progress(
        self,
        step: int,
        message: str,
        percentage: float
    ) -> None:
        """更新任務進度。

        Args:
            step: 當前處理步驟
            message: 狀態描述訊息
            percentage: 完成百分比
        """
        self.status = "processing"
        self.progress = JobProgress(
            current_step=step,
            message=message,
            percentage=percentage
        )
        self.updated_at = datetime.now(timezone.utc)

    def complete_job(self, result: AnalyzeResponse) -> None:
        """標記任務完成。

        Args:
            result: 分析結果
        """
        self.status = "completed"
        self.progress = JobProgress(
            current_step=3,
            message="分析完成",
            percentage=100.0
        )
        self.result = result
        self.updated_at = datetime.now(timezone.utc)

    def fail_job(self, error_message: str) -> None:
        """標記任務失敗。

        Args:
            error_message: 錯誤訊息
        """
        self.status = "failed"
        self.error = error_message
        self.updated_at = datetime.now(timezone.utc)


class JobCreateResponse(BaseModel):
    """任務建立回應。

    當成功建立非同步任務時回傳的資訊。
    """

    status: Literal["accepted"] = "accepted"
    job_id: str = Field(
        ...,
        description="任務識別碼"
    )
    message: str = Field(
        default="任務已建立，正在處理中...",
        description="回應訊息"
    )
    status_url: str = Field(
        ...,
        description="任務狀態查詢 URL"
    )


class JobStatusResponse(BaseModel):
    """任務狀態查詢回應。

    查詢任務狀態時回傳的完整資訊。
    """

    job_id: str = Field(
        ...,
        description="任務識別碼"
    )
    status: Literal["pending", "processing", "completed", "failed"] = Field(
        ...,
        description="任務狀態"
    )
    progress: JobProgress = Field(
        ...,
        description="任務進度資訊"
    )
    result: Optional[AnalyzeResponse] = Field(
        default=None,
        description="任務完成時的分析結果"
    )
    error: Optional[str] = Field(
        default=None,
        description="任務失敗時的錯誤訊息"
    )
    created_at: datetime = Field(
        ...,
        description="任務建立時間"
    )
    updated_at: datetime = Field(
        ...,
        description="最後更新時間"
    )