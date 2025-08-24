"""錯誤處理工具模組。

此模組提供統一的錯誤處理功能，確保所有 API 錯誤回應
都符合 API 規格要求的格式。
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional, Type
from fastapi import HTTPException

from ..services.serp_service import SerpAPIException
from ..services.scraper_service import ScraperException
from ..services.ai_service import AIServiceException, AIAPIException


# 錯誤碼映射表
ERROR_CODE_MAPPING = {
    SerpAPIException: ("SERP_API_ERROR", 503),
    ScraperException: ("SCRAPER_TIMEOUT", 504),
    AIServiceException: ("AI_API_ERROR", 503),
    AIAPIException: ("AI_API_ERROR", 503),
}


def create_api_error_response(
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 400
) -> HTTPException:
    """建立符合 API 規格的錯誤回應。

    Args:
        code: 錯誤代碼
        message: 錯誤訊息（繁體中文）
        details: 錯誤詳細資訊
        status_code: HTTP 狀態碼

    Returns:
        HTTPException: 符合 API 規格的錯誤回應

    Example:
        >>> error = create_api_error_response(
        ...     code="INVALID_INPUT",
        ...     message="關鍵字長度必須在 1-50 字元之間",
        ...     details={
        ...         "field": "keyword",
        ...         "provided_length": 55,
        ...         "max_length": 50
        ...     }
        ... )
    """
    error_detail = {
        "code": code,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    if details:
        error_detail["details"] = details

    return HTTPException(
        status_code=status_code,
        detail={
            "status": "error",
            "error": error_detail
        }
    )


def create_validation_error(
    field: str,
    message: str,
    provided_value: Any = None,
    provided_length: Optional[int] = None,
    max_length: Optional[int] = None,
    min_length: Optional[int] = None,
    expected_format: Optional[str] = None
) -> HTTPException:
    """建立輸入驗證錯誤回應。

    Args:
        field: 發生錯誤的欄位名稱
        message: 錯誤訊息
        provided_value: 提供的值
        provided_length: 提供的長度
        max_length: 最大允許長度
        min_length: 最小允許長度
        expected_format: 期望的格式

    Returns:
        HTTPException: 驗證錯誤回應
    """
    details = {"field": field}

    if provided_value is not None:
        details["provided_value"] = str(provided_value)
    if provided_length is not None:
        details["provided_length"] = provided_length
    if max_length is not None:
        details["max_length"] = max_length
    if min_length is not None:
        details["min_length"] = min_length
    if expected_format is not None:
        details["expected_format"] = expected_format

    return create_api_error_response(
        code="INVALID_INPUT",
        message=message,
        details=details,
        status_code=400
    )


def create_service_error(
    exception: Exception,
    processing_time: Optional[float] = None
) -> HTTPException:
    """根據服務例外建立標準錯誤回應。

    Args:
        exception: 服務例外
        processing_time: 處理時間（可選）

    Returns:
        HTTPException: 標準格式的錯誤回應
    """
    # 查找錯誤碼映射
    error_code = "INTERNAL_ERROR"
    status_code = 500
    message = "系統內部錯誤，請稍後再試"

    for exception_type, (code, http_code) in ERROR_CODE_MAPPING.items():
        if isinstance(exception, exception_type):
            error_code = code
            status_code = http_code
            message = _get_service_error_message(code, str(exception))
            break

    details = None
    if processing_time is not None:
        details = {"processing_time": processing_time}

    return create_api_error_response(
        code=error_code,
        message=message,
        details=details,
        status_code=status_code
    )


def _get_service_error_message(code: str, original_message: str) -> str:
    """根據錯誤碼產生友善的錯誤訊息。

    Args:
        code: 錯誤代碼
        original_message: 原始錯誤訊息

    Returns:
        str: 友善的錯誤訊息
    """
    error_messages = {
        "SERP_API_ERROR": "搜尋引擎服務暫時無法使用，請稍後重試",
        "SCRAPER_TIMEOUT": "網頁爬取超時，請稍後重試",
        "AI_API_ERROR": "AI 分析服務暫時無法使用，請稍後重試",
    }

    return error_messages.get(code, f"服務錯誤：{original_message}")


def validate_analyze_request_input(keyword: str, audience: str) -> None:
    """驗證分析請求的輸入參數。

    Args:
        keyword: 關鍵字
        audience: 目標受眾

    Raises:
        HTTPException: 當輸入不符合規格時拋出

    Example:
        >>> validate_analyze_request_input("", "測試受眾")  # 拋出錯誤
        >>> validate_analyze_request_input("很長的關鍵字" * 10, "測試")  # 拋出錯誤
    """
    # 驗證關鍵字
    if not keyword or not keyword.strip():
        raise create_validation_error(
            field="keyword",
            message="關鍵字不能為空",
            provided_value=keyword
        )

    if len(keyword) > 50:
        raise create_api_error_response(
            code="KEYWORD_TOO_LONG",
            message="關鍵字長度必須在 1-50 字元之間",
            details={
                "field": "keyword",
                "provided_length": len(keyword),
                "max_length": 50
            },
            status_code=400
        )

    # 驗證受眾描述
    if not audience or not audience.strip():
        raise create_validation_error(
            field="audience",
            message="目標受眾描述不能為空",
            provided_value=audience
        )

    if len(audience) > 200:
        raise create_api_error_response(
            code="AUDIENCE_TOO_LONG",
            message="受眾描述長度必須在 1-200 字元之間",
            details={
                "field": "audience",
                "provided_length": len(audience),
                "max_length": 200
            },
            status_code=400
        )


def create_job_not_found_error(job_id: str) -> HTTPException:
    """建立任務不存在錯誤。

    Args:
        job_id: 任務識別碼

    Returns:
        HTTPException: 任務不存在錯誤回應
    """
    return create_api_error_response(
        code="JOB_NOT_FOUND",
        message=f"任務 {job_id} 不存在或已過期",
        details={"job_id": job_id},
        status_code=404
    )


def create_rate_limit_error(retry_after: int = 60) -> HTTPException:
    """建立頻率限制錯誤。

    Args:
        retry_after: 建議重試等待時間（秒）

    Returns:
        HTTPException: 頻率限制錯誤回應
    """
    return create_api_error_response(
        code="RATE_LIMIT_EXCEEDED",
        message="請求頻率過高，請稍後重試",
        details={"retry_after": retry_after},
        status_code=429
    )