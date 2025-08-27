"""配置管理簡化測試。

測試現有的 Config 類別功能。
"""

import pytest
import tempfile
import os
from pathlib import Path
from app.config import Config, get_config


class TestConfigSimple:
    """簡化配置管理測試。"""

    def test_config_initialization(self):
        """測試配置初始化。"""
        # Act
        config = get_config()
        
        # Assert
        assert isinstance(config, Config)
        assert hasattr(config, '_config')

    def test_config_with_custom_path(self):
        """測試自訂配置檔案路徑。"""
        # Arrange
        with tempfile.NamedTemporaryFile(mode='w', suffix='.ini', delete=False) as f:
            f.write("""
[server]
host = 127.0.0.1
port = 9000
debug = true
cors_origins = http://localhost:3000

[api]
timeout = 60
max_urls = 10
rate_limit = 100

[serp]
api_key = test_key
search_engine = google
location = Taiwan
language = zh-tw

[openai]  
api_key = test_key
endpoint = https://test.openai.azure.com/
deployment_name = gpt-4o
api_version = 2024-12-01-preview
model = gpt-4o
max_tokens = 8000
temperature = 0.7

[scraper]
timeout = 10.0
max_concurrent = 10
max_retries = 3
user_agent = Test-Agent
retry_delay = 1.0
""")
            temp_file = f.name
        
        try:
            # Act
            config = Config(temp_file)
            
            # Assert
            assert config.get_server_host() == "127.0.0.1"
            assert config.get_server_port() == 9000
            assert config.get_server_debug() is True
            
        finally:
            os.unlink(temp_file)

    def test_config_default_values(self):
        """測試預設值。"""
        # Arrange & Act
        config = get_config()
        
        # Assert - 測試一些基本的預設值
        assert isinstance(config.get_server_host(), str)
        assert isinstance(config.get_server_port(), int)
        assert isinstance(config.get_server_debug(), bool)
        
    def test_config_type_conversion(self):
        """測試型別轉換。"""
        # Arrange - 使用現有配置檔案測試
        config = get_config()
        
        # Assert - 測試型別轉換
        assert isinstance(config.get_server_host(), str)
        assert isinstance(config.get_server_port(), int)
        assert isinstance(config.get_server_debug(), bool)
        assert isinstance(config.get_api_timeout(), int) 
        assert isinstance(config.get_scraper_timeout(), float)
            
    def test_config_file_not_found(self):
        """測試配置檔案不存在的處理。"""
        # Arrange
        non_existent_file = "/non/existent/config.ini"
        
        # Act & Assert
        with pytest.raises(FileNotFoundError):
            Config(non_existent_file)