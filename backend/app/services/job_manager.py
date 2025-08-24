"""任務管理服務。

此模組提供任務狀態管理功能，支援非同步 SEO 分析任務的
建立、更新和查詢操作。
"""

import uuid
from typing import Dict, Optional
from datetime import datetime, timedelta

from ..models.status import JobStatus, JobProgress
from ..models.response import AnalyzeResponse


class JobManager:
    """任務管理器。
    
    負責管理所有分析任務的狀態和進度，
    提供任務的全生命週期管理功能。
    """
    
    def __init__(self):
        """初始化任務管理器。"""
        self._jobs: Dict[str, JobStatus] = {}
        # 任務過期時間 (24小時)
        self._job_ttl = timedelta(hours=24)
    
    def create_job(self, job_id: Optional[str] = None) -> JobStatus:
        """建立新任務。
        
        Args:
            job_id: 可選的任務識別碼，未提供時自動生成
            
        Returns:
            建立的任務狀態物件
        """
        if job_id is None:
            job_id = str(uuid.uuid4())
        
        # 清理過期任務
        self._cleanup_expired_jobs()
        
        job_status = JobStatus.create_pending_job(job_id)
        self._jobs[job_id] = job_status
        
        return job_status
    
    def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        """取得任務狀態。
        
        Args:
            job_id: 任務識別碼
            
        Returns:
            任務狀態物件，不存在時回傳 None
        """
        # 清理過期任務
        self._cleanup_expired_jobs()
        
        return self._jobs.get(job_id)
    
    def update_progress(
        self,
        job_id: str,
        step: int,
        message: str,
        percentage: float
    ) -> bool:
        """更新任務進度。
        
        Args:
            job_id: 任務識別碼
            step: 當前處理步驟
            message: 狀態描述訊息
            percentage: 完成百分比
            
        Returns:
            更新成功回傳 True，任務不存在回傳 False
        """
        job_status = self._jobs.get(job_id)
        if job_status is None:
            return False
        
        job_status.update_progress(step, message, percentage)
        return True
    
    def complete_job(self, job_id: str, result: AnalyzeResponse) -> bool:
        """標記任務完成。
        
        Args:
            job_id: 任務識別碼
            result: 分析結果
            
        Returns:
            更新成功回傳 True，任務不存在回傳 False
        """
        job_status = self._jobs.get(job_id)
        if job_status is None:
            return False
        
        job_status.complete_job(result)
        return True
    
    def fail_job(self, job_id: str, error_message: str) -> bool:
        """標記任務失敗。
        
        Args:
            job_id: 任務識別碼
            error_message: 錯誤訊息
            
        Returns:
            更新成功回傳 True，任務不存在回傳 False
        """
        job_status = self._jobs.get(job_id)
        if job_status is None:
            return False
        
        job_status.fail_job(error_message)
        return True
    
    def delete_job(self, job_id: str) -> bool:
        """刪除任務。
        
        Args:
            job_id: 任務識別碼
            
        Returns:
            刪除成功回傳 True，任務不存在回傳 False
        """
        if job_id in self._jobs:
            del self._jobs[job_id]
            return True
        return False
    
    def get_job_count(self) -> int:
        """取得當前任務總數。
        
        Returns:
            任務總數
        """
        return len(self._jobs)
    
    def _cleanup_expired_jobs(self) -> None:
        """清理過期任務。
        
        移除超過 TTL 時間的任務以節省記憶體。
        """
        now = datetime.now()
        expired_jobs = []
        
        for job_id, job_status in self._jobs.items():
            if now - job_status.created_at.replace(tzinfo=None) > self._job_ttl:
                expired_jobs.append(job_id)
        
        for job_id in expired_jobs:
            del self._jobs[job_id]


# 全域任務管理器實例
_job_manager: Optional[JobManager] = None


def get_job_manager() -> JobManager:
    """取得任務管理器實例。
    
    使用單例模式確保全域只有一個任務管理器實例。
    
    Returns:
        任務管理器實例
    """
    global _job_manager
    if _job_manager is None:
        _job_manager = JobManager()
    return _job_manager