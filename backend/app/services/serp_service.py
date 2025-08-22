"""SerpAPI 服務模組。

此模組提供 SerpAPI 整合功能，包括關鍵字搜尋、結果解析、
錯誤處理和重試機制。用於取得真實的搜尋引擎結果頁面資料。
"""

import asyncio
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from serpapi import GoogleSearch

from ..config import get_config


# 自定義例外類別
class SerpAPIException(Exception):
    """SerpAPI 相關錯誤的基礎例外類別。"""


class RateLimitException(SerpAPIException):
    """API 呼叫超過速率限制時的例外。"""


class InvalidAPIKeyException(SerpAPIException):
    """API 密鑰無效時的例外。"""


class SearchFailedException(SerpAPIException):
    """搜尋失敗時的例外。"""


# 資料結構定義
@dataclass
class OrganicResult:
    """SERP 有機搜尋結果資料結構。

    Attributes:
        position: 搜尋結果位置 (1-based)
        title: 頁面標題
        link: 頁面連結 URL
        snippet: 搜尋結果摘要
        displayed_link: 顯示的連結文字
    """
    position: int
    title: str
    link: str
    snippet: str
    displayed_link: Optional[str] = None


@dataclass
class SerpResult:
    """完整的 SERP 搜尋結果資料結構。

    Attributes:
        keyword: 搜尋關鍵字
        total_results: 總搜尋結果數量
        organic_results: 有機搜尋結果清單
        related_searches: 相關搜尋建議
        search_metadata: 搜尋元資料
    """
    keyword: str
    total_results: int
    organic_results: List[OrganicResult]
    related_searches: Optional[List[str]] = None
    search_metadata: Optional[Dict[str, Any]] = None


class SerpService:
    """SerpAPI 服務類別。

    提供與 SerpAPI 互動的完整功能，包括搜尋執行、
    結果解析、錯誤處理和重試機制。
    """

    def __init__(self):
        """初始化 SerpAPI 服務。

        載入配置並驗證 API 密鑰是否存在。

        Raises:
            InvalidAPIKeyException: 當 API 密鑰為空時
        """
        self.config = get_config()
        self.api_key = self.config.get_serp_api_key()

        if not self.api_key:
            raise InvalidAPIKeyException("SerpAPI 密鑰未設定或為空")

        self.search_engine = self.config.get_serp_search_engine()
        self.location = self.config.get_serp_location()
        self.language = self.config.get_serp_language()

        # 重試設定
        self.max_retries = 3
        self.retry_delay = 1.0  # 秒
        self.backoff_multiplier = 2.0

    async def search_keyword(
        self,
        keyword: str,
        num_results: int = 10,
        location: Optional[str] = None
    ) -> SerpResult:
        """執行關鍵字搜尋並回傳結構化結果。

        Args:
            keyword: 要搜尋的關鍵字
            num_results: 要取得的結果數量 (預設 10)
            location: 搜尋地理位置 (可選，預設使用配置中的設定)

        Returns:
            SerpResult: 包含搜尋結果的結構化資料

        Raises:
            SerpAPIException: 搜尋過程中發生錯誤
            RateLimitException: 超過 API 呼叫限制
            SearchFailedException: 搜尋執行失敗
        """
        search_params = self._build_search_params(
            keyword=keyword,
            num_results=num_results,
            location=location or self.location
        )

        # 執行帶重試的搜尋
        search_data = await self._execute_search_with_retry(search_params)

        # 解析搜尋結果
        return self._parse_search_results(keyword, search_data)

    def _build_search_params(
        self,
        keyword: str,
        num_results: int = 10,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """建立 SerpAPI 搜尋參數。

        Args:
            keyword: 搜尋關鍵字
            num_results: 結果數量
            location: 搜尋位置

        Returns:
            dict: SerpAPI 搜尋參數字典
        """
        params = {
            "q": keyword,
            "engine": self.search_engine,
            "api_key": self.api_key,
            "num": min(num_results, 100),  # SerpAPI 單次最多 100 筆
            "hl": self.language,  # 介面語言
            "gl": "tw" if location == "Taiwan" else "us",  # 國家代碼
        }

        if location:
            params["location"] = location

        return params

    async def _execute_search_with_retry(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """執行帶重試機制的搜尋。

        Args:
            search_params: 搜尋參數

        Returns:
            dict: SerpAPI 回應資料

        Raises:
            SerpAPIException: 重試耗盡後仍失敗
        """
        last_exception = None

        for attempt in range(self.max_retries):
            try:
                # 在非同步環境中執行同步的 SerpAPI 呼叫
                search = GoogleSearch(search_params)
                result = await asyncio.get_event_loop().run_in_executor(
                    None, search.get_dict
                )

                # 檢查 API 回應中的錯誤
                self._validate_api_response(result)

                return result

            except Exception as e:
                last_exception = e

                # 判斷是否應該重試
                if not self._should_retry(e):
                    raise self._handle_api_error(e)

                # 等待後重試 (指數退避)
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (self.backoff_multiplier ** attempt)
                    print(f"搜尋失敗，{delay:.1f} 秒後重試... (嘗試 {attempt + 1}/{self.max_retries})")
                    await asyncio.sleep(delay)

        # 重試耗盡
        if last_exception is not None:
            raise self._handle_api_error(last_exception)
        raise SearchFailedException("未知錯誤")

    def _validate_api_response(self, response: Dict[str, Any]) -> None:
        """驗證 SerpAPI 回應的有效性。

        Args:
            response: SerpAPI 回應資料

        Raises:
            SerpAPIException: 回應包含錯誤時
        """
        if "error" in response:
            error_message = response["error"]
            if "Invalid API key" in error_message:
                raise InvalidAPIKeyException(f"API 密鑰無效: {error_message}")
            elif "rate limit" in error_message.lower():
                raise RateLimitException(f"API 呼叫超過限制: {error_message}")
            else:
                raise SearchFailedException(f"搜尋失敗: {error_message}")

    def _should_retry(self, exception: Exception) -> bool:
        """判斷是否應該重試請求。

        Args:
            exception: 發生的例外

        Returns:
            bool: 是否應該重試
        """
        # 網路相關錯誤可以重試
        if isinstance(exception, (ConnectionError, TimeoutError)):
            return True

        # API 密鑰錯誤和速率限制不重試
        if isinstance(exception, (InvalidAPIKeyException, RateLimitException)):
            return False

        # 其他錯誤預設可以重試
        return True

    def _handle_api_error(self, exception: Exception) -> SerpAPIException:
        """處理 API 錯誤並轉換為適當的例外類型。

        Args:
            exception: 原始例外

        Returns:
            SerpAPIException: 轉換後的例外
        """
        if isinstance(exception, SerpAPIException):
            return exception

        error_message = str(exception)

        if "Invalid API key" in error_message:
            return InvalidAPIKeyException(f"API 密鑰無效: {error_message}")
        elif "rate limit" in error_message.lower():
            return RateLimitException(f"API 呼叫超過限制: {error_message}")
        elif isinstance(exception, (ConnectionError, TimeoutError)):
            return SearchFailedException(f"網路連線錯誤: {error_message}")
        else:
            return SearchFailedException(f"搜尋執行失敗: {error_message}")

    def _parse_search_results(self, keyword: str, search_data: Dict[str, Any]) -> SerpResult:
        """解析 SerpAPI 搜尋結果。

        Args:
            keyword: 原始搜尋關鍵字
            search_data: SerpAPI 回應資料

        Returns:
            SerpResult: 結構化的搜尋結果
        """
        # 解析有機搜尋結果
        organic_results = []
        raw_organic = search_data.get("organic_results", [])

        for i, result in enumerate(raw_organic, 1):
            organic_result = OrganicResult(
                position=result.get("position", i),
                title=result.get("title", ""),
                link=result.get("link", ""),
                snippet=result.get("snippet", ""),
                displayed_link=result.get("displayed_link")
            )
            organic_results.append(organic_result)

        # 解析相關搜尋
        related_searches = []
        raw_related = search_data.get("related_searches", [])
        for related in raw_related:
            if "query" in related:
                related_searches.append(related["query"])

        # 取得總結果數量
        search_info = search_data.get("search_information", {})
        total_results_str = search_info.get("total_results", "0")

        # 解析總結果數量 (移除逗號等格式字符)
        try:
            total_results = int(str(total_results_str).replace(",", "").replace("約", "").strip())
        except (ValueError, AttributeError):
            total_results = len(organic_results)

        # 建立搜尋元資料
        search_metadata = {
            "search_time": search_info.get("time_taken_displayed"),
            "engine_used": search_data.get("search_metadata", {}).get("engine"),
            "total_time_taken": search_info.get("total_time_taken")
        }

        return SerpResult(
            keyword=keyword,
            total_results=total_results,
            organic_results=organic_results,
            related_searches=related_searches if related_searches else None,
            search_metadata=search_metadata
        )

    async def get_top_urls(self, keyword: str, limit: int = 10) -> List[str]:
        """取得指定關鍵字的前 N 個搜尋結果 URL。

        這是一個便利方法，專門用於快速取得 URL 清單。

        Args:
            keyword: 搜尋關鍵字
            limit: 要取得的 URL 數量

        Returns:
            List[str]: 搜尋結果 URL 清單

        Raises:
            SerpAPIException: 搜尋過程中發生錯誤
        """
        try:
            serp_result = await self.search_keyword(keyword, num_results=limit)
            return [result.link for result in serp_result.organic_results]
        except SerpAPIException:
            raise
        except Exception as e:
            raise SearchFailedException(f"取得搜尋結果 URL 失敗: {str(e)}") from e


# 建立全域服務實例
_serp_service_instance: Optional[SerpService] = None


def get_serp_service() -> SerpService:
    """取得 SerpAPI 服務的單例實例。

    Returns:
        SerpService: SerpAPI 服務實例

    Example:
        >>> serp_service = get_serp_service()
        >>> results = await serp_service.search_keyword("SEO 工具")
        >>> print(f"找到 {len(results.organic_results)} 個結果")
    """
    global _serp_service_instance

    if _serp_service_instance is None:
        _serp_service_instance = SerpService()

    return _serp_service_instance
