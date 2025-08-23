"""SEO Analyzer 配置管理模組。

此模組負責讀取和管理應用程式的所有配置設定，包含伺服器、API、
外部服務等配置項目。使用 configparser 讀取 config.ini 檔案。
"""

import configparser
from pathlib import Path
from typing import Optional, List


class Config:
    """應用程式配置管理類別。

    負責載入、驗證和提供配置資訊給其他模組使用。
    支援從 config.ini 檔案讀取配置，並提供類型安全的存取方法。

    Attributes:
        _config (configparser.ConfigParser): 配置解析器實例
        config_path (Path): 配置檔案路徑

    Example:
        >>> config = Config()
        >>> port = config.get_server_port()
        >>> print(port)
        8000
    """

    def __init__(self, config_file: Optional[str] = None):
        """初始化配置管理器。

        Args:
            config_file: 自定義配置檔案路徑，預設為 ../config.ini

        Raises:
            FileNotFoundError: 當配置檔案不存在時
            configparser.Error: 當配置檔案格式錯誤時
        """
        self._config = configparser.ConfigParser()

        if config_file:
            self.config_path = Path(config_file)
        else:
            self.config_path = Path(__file__).parent.parent / "config.ini"

        self._load_config()
        self._validate_config()

    def _load_config(self) -> None:
        """載入配置檔案。

        Raises:
            FileNotFoundError: 當配置檔案不存在時
        """
        if not self.config_path.exists():
            raise FileNotFoundError(f"配置檔案不存在: {self.config_path}")

        self._config.read(self.config_path, encoding="utf-8")

    def _validate_config(self) -> None:
        """驗證配置檔案的必要欄位。

        Raises:
            ValueError: 當必要配置缺失時
        """
        required_sections = ["server", "api", "serp", "openai"]
        for section in required_sections:
            if not self._config.has_section(section):
                raise ValueError(f"配置檔案缺少必要區段: {section}")

        # 驗證必要的 API 密鑰
        if not self.get_serp_api_key():
            raise ValueError("SerpAPI 密鑰未設定")

        if not self.get_openai_api_key():
            raise ValueError("Azure OpenAI API 密鑰未設定")

    # 伺服器配置
    def get_server_host(self) -> str:
        """取得伺服器主機位址。"""
        return self._config.get("server", "host", fallback="0.0.0.0")

    def get_server_port(self) -> int:
        """取得伺服器埠號。"""
        return self._config.getint("server", "port", fallback=8000)

    def get_server_debug(self) -> bool:
        """取得除錯模式設定。"""
        return self._config.getboolean("server", "debug", fallback=False)

    def get_cors_origins(self) -> List[str]:
        """取得 CORS 允許的來源清單。"""
        origins = self._config.get("server", "cors_origins", fallback="*")
        return [origin.strip() for origin in origins.split(",")]

    # API 配置
    def get_api_timeout(self) -> int:
        """取得 API 請求逾時秒數。"""
        return self._config.getint("api", "timeout", fallback=60)

    def get_api_max_urls(self) -> int:
        """取得最大爬取 URL 數量。"""
        return self._config.getint("api", "max_urls", fallback=10)

    def get_api_rate_limit(self) -> int:
        """取得 API 速率限制（每分鐘請求數）。"""
        return self._config.getint("api", "rate_limit", fallback=100)

    # SerpAPI 配置
    def get_serp_api_key(self) -> str:
        """取得 SerpAPI 密鑰。"""
        return self._config.get("serp", "api_key", fallback="")

    def get_serp_search_engine(self) -> str:
        """取得搜尋引擎設定。"""
        return self._config.get("serp", "search_engine", fallback="google")

    def get_serp_location(self) -> str:
        """取得搜尋地理位置。"""
        return self._config.get("serp", "location", fallback="Taiwan")

    def get_serp_language(self) -> str:
        """取得搜尋語言設定。"""
        return self._config.get("serp", "language", fallback="zh-tw")

    # Azure OpenAI 配置
    def get_openai_api_key(self) -> str:
        """取得 Azure OpenAI API 密鑰。"""
        return self._config.get("openai", "api_key", fallback="")

    def get_openai_endpoint(self) -> str:
        """取得 Azure OpenAI 端點 URL。"""
        return self._config.get("openai", "endpoint", fallback="")

    def get_openai_deployment_name(self) -> str:
        """取得 Azure OpenAI 部署名稱。"""
        return self._config.get("openai", "deployment_name", fallback="gpt-4o")

    def get_openai_api_version(self) -> str:
        """取得 Azure OpenAI API 版本。"""
        return self._config.get("openai", "api_version", fallback="2024-12-01-preview")

    def get_openai_model(self) -> str:
        """取得 OpenAI 模型名稱。"""
        return self._config.get("openai", "model", fallback="gpt-4o")

    def get_openai_max_tokens(self) -> int:
        """取得 OpenAI 最大 token 數量。"""
        return self._config.getint("openai", "max_tokens", fallback=8000)

    def get_openai_temperature(self) -> float:
        """取得 OpenAI 溫度參數。"""
        return self._config.getfloat("openai", "temperature", fallback=0.7)

    # 爬蟲配置
    def get_scraper_timeout(self) -> float:
        """取得爬蟲逾時秒數。"""
        return self._config.getfloat("scraper", "timeout", fallback=10.0)

    def get_scraper_max_concurrent(self) -> int:
        """取得爬蟲最大並行數。"""
        return self._config.getint("scraper", "max_concurrent", fallback=10)

    def get_scraper_user_agent(self) -> str:
        """取得爬蟲 User-Agent。"""
        return self._config.get(
            "scraper",
            "user_agent",
            fallback="Mozilla/5.0 (compatible; SEOAnalyzer/1.0)",
        )

    def get_scraper_retry_count(self) -> int:
        """取得爬蟲重試次數。"""
        return self._config.getint("scraper", "max_retries", fallback=3)

    def get_scraper_retry_delay(self) -> float:
        """取得爬蟲重試延遲秒數。"""
        return self._config.getfloat("scraper", "retry_delay", fallback=1.0)

    # 快取配置
    def get_cache_enabled(self) -> bool:
        """取得快取啟用狀態。"""
        return self._config.getboolean("cache", "enabled", fallback=False)

    def get_redis_host(self) -> str:
        """取得 Redis 主機位址。"""
        return self._config.get("cache", "redis_host", fallback="localhost")

    def get_redis_port(self) -> int:
        """取得 Redis 埠號。"""
        return self._config.getint("cache", "redis_port", fallback=6379)

    def get_redis_db(self) -> int:
        """取得 Redis 資料庫編號。"""
        return self._config.getint("cache", "redis_db", fallback=0)

    def get_cache_ttl(self) -> int:
        """取得快取存活時間（秒）。"""
        return self._config.getint("cache", "ttl", fallback=3600)

    # 日誌配置
    def get_log_level(self) -> str:
        """取得日誌等級。"""
        return self._config.get("logging", "level", fallback="INFO")

    def get_log_format(self) -> str:
        """取得日誌格式。"""
        return self._config.get(
            "logging",
            "format",
            fallback="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )

    def get_log_file(self) -> str:
        """取得日誌檔案路徑。"""
        return self._config.get("logging", "file", fallback="logs/app.log")

    def get_log_max_size(self) -> str:
        """取得日誌檔案最大大小。"""
        return self._config.get("logging", "max_size", fallback="10MB")

    def get_log_backup_count(self) -> int:
        """取得日誌備份檔案數量。"""
        return self._config.getint("logging", "backup_count", fallback=5)


# 全域配置實例
_config_instance: Optional[Config] = None


def get_config() -> Config:
    """取得全域配置實例。

    使用單例模式確保整個應用程式使用同一個配置實例。

    Returns:
        Config: 配置管理器實例

    Example:
        >>> config = get_config()
        >>> port = config.get_server_port()
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
    return _config_instance


def reload_config() -> Config:
    """重新載入配置檔案。

    用於在配置檔案更新後重新讀取設定。

    Returns:
        Config: 新的配置管理器實例
    """
    global _config_instance
    _config_instance = None
    return get_config()
