"""SEO Analyzer 請求資料模型。

此模組定義 API 請求的資料結構，使用 Pydantic 進行資料驗證。
包含所有 API 端點的請求模型和自定義驗證器。
"""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class AnalyzeOptions(BaseModel):
    """SEO 分析選項配置。

    定義 SEO 分析的各種選項設定，控制分析報告的內容和格式。

    Attributes:
        generate_draft: 是否生成文章初稿
        include_faq: 是否包含 FAQ 段落
        include_table: 是否包含比較表格
    """

    generate_draft: bool = Field(
        ...,
        description="是否生成文章初稿"
    )
    include_faq: bool = Field(
        ...,
        description="是否包含 FAQ 段落"
    )
    include_table: bool = Field(
        ...,
        description="是否包含比較表格"
    )


class AnalyzeRequest(BaseModel):
    """SEO 分析請求模型。

    定義 POST /api/analyze 端點的請求資料結構。
    包含關鍵字、目標受眾和分析選項的驗證規則。

    Attributes:
        keyword: SEO 關鍵字（1-50 字元）
        audience: 目標受眾描述（1-200 字元）
        options: 分析選項配置

    Example:
        >>> request = AnalyzeRequest(
        ...     keyword="SEO 工具推薦",
        ...     audience="中小企業行銷人員",
        ...     options=AnalyzeOptions(
        ...         generate_draft=True,
        ...         include_faq=True,
        ...         include_table=False
        ...     )
        ... )
    """

    keyword: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="SEO 關鍵字，長度限制 1-50 字元"
    )
    audience: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="目標受眾描述，長度限制 1-200 字元"
    )
    options: AnalyzeOptions = Field(
        ...,
        description="分析選項配置"
    )

    @field_validator('keyword')
    @classmethod
    def validate_keyword(cls, v):
        """驗證關鍵字格式。

        Args:
            v: 關鍵字字串

        Returns:
            str: 清理後的關鍵字

        Raises:
            ValueError: 當關鍵字格式不正確時
        """
        if not v or not v.strip():
            raise ValueError('關鍵字不能為空或只包含空白字元')

        # 移除前後空白並檢查長度
        cleaned = v.strip()
        if len(cleaned) == 0:
            raise ValueError('關鍵字不能為空')
        if len(cleaned) > 50:
            raise ValueError('關鍵字長度不能超過 50 字元')

        return cleaned

    @field_validator('audience')
    @classmethod
    def validate_audience(cls, v):
        """驗證受眾描述格式。

        Args:
            v: 受眾描述字串

        Returns:
            str: 清理後的受眾描述

        Raises:
            ValueError: 當受眾描述格式不正確時
        """
        if not v or not v.strip():
            raise ValueError('受眾描述不能為空或只包含空白字元')

        # 移除前後空白並檢查長度
        cleaned = v.strip()
        if len(cleaned) == 0:
            raise ValueError('受眾描述不能為空')
        if len(cleaned) > 200:
            raise ValueError('受眾描述長度不能超過 200 字元')

        return cleaned

    class Config:
        """Pydantic 模型配置。"""
        json_schema_extra = {
            "example": {
                "keyword": "SEO 工具推薦",
                "audience": "中小企業行銷人員",
                "options": {
                    "generate_draft": True,
                    "include_faq": True,
                    "include_table": False
                }
            }
        }


class HealthCheckRequest(BaseModel):
    """健康檢查請求模型。

    GET /api/health 端點的請求模型（通常不需要參數）。
    """

    class Config:
        """Pydantic 模型配置。"""
        json_schema_extra = {
            "example": {}
        }


class VersionRequest(BaseModel):
    """版本資訊請求模型。

    GET /api/version 端點的請求模型（通常不需要參數）。
    """

    class Config:
        """Pydantic 模型配置。"""
        json_schema_extra = {
            "example": {}
        }