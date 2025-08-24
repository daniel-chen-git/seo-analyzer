"""Azure OpenAI 分析服務模組。

此模組提供 Azure OpenAI GPT-4o 整合功能，包括 SEO 分析報告生成、
Prompt 工程、Token 管理、錯誤處理和重試機制。
"""

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Dict, Any, Optional, List

from openai import AsyncAzureOpenAI
import openai

from ..config import get_config
from .serp_service import SerpResult
from .scraper_service import ScrapingResult


# 自定義例外類別
class AIServiceException(Exception):
    """AI 服務相關錯誤的基礎例外類別。"""


class TokenLimitExceededException(AIServiceException):
    """Token 使用量超過限制時的例外。"""


class AIAPIException(AIServiceException):
    """Azure OpenAI API 呼叫失敗時的例外，對應 API 錯誤碼 AI_API_ERROR。"""


class AITimeoutException(AIServiceException):
    """AI API 逾時例外。"""


# 資料結構定義
@dataclass
class AnalysisOptions:
    """SEO 分析選項資料結構。
    
    Attributes:
        generate_draft: 是否生成內容初稿
        include_faq: 是否包含 FAQ 建議
        include_table: 是否包含比較表格
    """
    generate_draft: bool
    include_faq: bool
    include_table: bool


@dataclass
class AnalysisResult:
    """AI 分析結果資料結構。
    
    Attributes:
        analysis_report: Markdown 格式的 SEO 分析報告
        token_usage: AI Token 使用量
        processing_time: AI 處理時間 (秒)
        success: 是否成功完成分析
        error: 錯誤訊息 (如果有)
    """
    analysis_report: str
    token_usage: int
    processing_time: float
    success: bool
    error: Optional[str] = None


class AIService:
    """Azure OpenAI 分析服務類別。
    
    提供與 Azure OpenAI GPT-4o 互動的完整功能，包括 SEO 分析報告生成、
    Prompt 工程、Token 管理、錯誤處理和重試機制。
    """

    def __init__(self):
        """初始化 AI 服務。
        
        載入 Azure OpenAI 配置並建立客戶端連線。
        """
        self.config = get_config()
        
        # Azure OpenAI 配置參數
        self.api_key = self.config.get_openai_api_key()
        self.endpoint = self.config.get_openai_endpoint()
        self.deployment_name = self.config.get_openai_deployment_name()
        self.api_version = self.config.get_openai_api_version()
        self.model = self.config.get_openai_model()
        self.max_tokens = self.config.get_openai_max_tokens()
        self.temperature = self.config.get_openai_temperature()
        
        # Token 管理配置
        self.max_input_tokens = 6000  # 保留 2000 tokens 給回應
        self.max_retries = 3
        self.retry_delay = 2.0
        
        # 初始化 Azure OpenAI 客戶端
        self.client = AsyncAzureOpenAI(
            api_key=self.api_key,
            api_version=self.api_version,
            azure_endpoint=self.endpoint,
        )
    
    async def analyze_seo_content(
        self,
        keyword: str,
        audience: str,
        serp_data: SerpResult,
        scraping_data: ScrapingResult,
        options: AnalysisOptions
    ) -> AnalysisResult:
        """執行完整的 SEO 內容分析。
        
        結合 SERP 資料和爬蟲內容，使用 GPT-4o 生成專業的 SEO 分析報告。
        
        Args:
            keyword: 目標關鍵字
            audience: 目標受眾描述
            serp_data: SERP 搜尋結果資料
            scraping_data: 網頁爬蟲內容資料
            options: 分析選項設定
            
        Returns:
            AnalysisResult: 包含分析報告和統計資訊的結果
            
        Raises:
            AIServiceException: AI 服務執行過程中發生錯誤
            TokenLimitExceededException: Token 使用量超過限制
            AIAPIException: Azure OpenAI API 呼叫失敗
        """
        start_time = time.time()
        
        try:
            # 建立分析提示
            prompt = self._build_analysis_prompt(
                keyword=keyword,
                audience=audience,
                serp_data=serp_data,
                scraping_data=scraping_data,
                options=options
            )
            
            # 驗證 Token 使用量
            if not self._validate_token_usage(prompt):
                # 截斷內容後重新建立提示
                truncated_scraping = self._truncate_scraping_content(scraping_data)
                prompt = self._build_analysis_prompt(
                    keyword=keyword,
                    audience=audience,
                    serp_data=serp_data,
                    scraping_data=truncated_scraping,
                    options=options
                )
                
                if not self._validate_token_usage(prompt):
                    raise TokenLimitExceededException(
                        f"即使截斷內容後，Token 使用量仍超過 {self.max_input_tokens} 限制"
                    )
            
            # 呼叫 Azure OpenAI API
            api_response = await self._call_openai_api_with_retry(prompt)
            
            # 解析回應
            analysis_report = self._parse_openai_response(api_response)
            token_usage = api_response.get('usage', {}).get('total_tokens', 0)
            
            processing_time = time.time() - start_time
            
            return AnalysisResult(
                analysis_report=analysis_report,
                token_usage=token_usage,
                processing_time=processing_time,
                success=True
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            error_message = str(e)
            
            # 根據例外類型分類處理
            if isinstance(e, (TokenLimitExceededException, AIAPIException, AITimeoutException)):
                raise e
            else:
                raise AIServiceException(f"AI 分析執行失敗: {error_message}")
    
    def _build_analysis_prompt(
        self,
        keyword: str,
        audience: str,
        serp_data: SerpResult,
        scraping_data: ScrapingResult,
        options: AnalysisOptions
    ) -> str:
        """建立完整的分析提示。
        
        整合所有輸入資料，建立結構化的 GPT-4o 分析提示。
        
        Args:
            keyword: 目標關鍵字
            audience: 目標受眾
            serp_data: SERP 資料
            scraping_data: 爬蟲資料
            options: 分析選項
            
        Returns:
            str: 完整的分析提示
        """
        prompt_parts = [
            self._get_system_prompt(),
            self._format_analysis_request(keyword, audience),
            self._format_serp_data(serp_data),
            self._format_scraping_data(scraping_data),
            self._format_options_requirements(options),
            self._get_output_format_requirements()
        ]
        
        return "\n\n".join(prompt_parts)
    
    def _get_system_prompt(self) -> str:
        """取得系統提示，定義 AI 的角色和任務。"""
        return """你是一位資深的 SEO 專家和內容策略師，擁有超過 10 年的搜尋引擎優化經驗。

## 你的專業能力：
1. 深度分析 SERP (搜尋引擎結果頁面) 競爭對手策略
2. 識別關鍵字意圖和搜尋趨勢
3. 提供具體可執行的 SEO 優化建議
4. 設計符合目標受眾需求的內容策略

## 你的任務：
基於提供的真實 SERP 資料和競爭對手頁面內容分析，為指定關鍵字和目標受眾生成專業、實用的 SEO 分析報告。

## 分析原則：
- 基於實際資料，避免泛泛而談
- 提供具體的優化建議和行動方案
- 考慮目標受眾的搜尋意圖和需求
- 識別市場競爭空白點和機會"""
    
    def _format_analysis_request(self, keyword: str, audience: str) -> str:
        """格式化分析請求資訊。"""
        return f"""## 分析任務

**目標關鍵字**: {keyword}
**目標受眾**: {audience}

請針對此關鍵字和受眾，基於以下提供的真實資料進行深度 SEO 分析。"""
    
    def _format_serp_data(self, serp_data: SerpResult) -> str:
        """格式化 SERP 資料為提示內容。"""
        serp_text = f"""## SERP 資料分析

**搜尋關鍵字**: {serp_data.keyword}
**總搜尋結果數**: {serp_data.total_results:,}
**分析樣本數**: {len(serp_data.organic_results)}

### 前 {len(serp_data.organic_results)} 名競爭對手：
"""
        
        for result in serp_data.organic_results:
            serp_text += f"""
**第 {result.position} 名**:
- 標題: {result.title}
- URL: {result.link}
- 描述: {result.snippet}
"""
        
        if serp_data.related_searches:
            serp_text += f"\n### 相關搜尋建議:\n"
            for i, related in enumerate(serp_data.related_searches[:5], 1):
                serp_text += f"{i}. {related}\n"
        
        return serp_text
    
    def _format_scraping_data(self, scraping_data: ScrapingResult) -> str:
        """格式化爬蟲資料為提示內容。"""
        scraping_text = f"""## 競爭對手頁面內容分析

**爬取統計**:
- 總頁面數: {scraping_data.total_results}
- 成功爬取: {scraping_data.successful_scrapes}
- 平均字數: {scraping_data.avg_word_count}
- 平均段落數: {scraping_data.avg_paragraphs}

### 成功爬取的頁面詳細內容:
"""
        
        successful_pages = [page for page in scraping_data.pages if page.success]
        
        for i, page in enumerate(successful_pages[:5], 1):  # 限制最多 5 個頁面
            scraping_text += f"""
**頁面 {i}**: {page.url}
- 標題: {page.title or '未取得'}
- Meta 描述: {page.meta_description or '未取得'}
- H1: {page.h1 or '未取得'}
- H2 標籤 ({len(page.h2_list)} 個): {', '.join(page.h2_list[:10])}{'...' if len(page.h2_list) > 10 else ''}
- 字數: {page.word_count}, 段落數: {page.paragraph_count}
"""
        
        return scraping_text
    
    def _format_options_requirements(self, options: AnalysisOptions) -> str:
        """根據選項格式化額外需求。"""
        requirements = ["## 特殊要求"]
        
        if options.generate_draft:
            requirements.append("- 生成內容初稿建議")
        
        if options.include_faq:
            requirements.append("- 包含 FAQ 建議")
        
        if options.include_table:
            requirements.append("- 包含比較分析表格")
        
        return "\n".join(requirements)
    
    def _get_output_format_requirements(self) -> str:
        """取得輸出格式要求。"""
        return """## 輸出格式要求

請嚴格按照以下 Markdown 格式輸出完整的 SEO 分析報告：

# SEO 分析報告

## 1. 分析概述
- 關鍵字搜尋意圖分析
- 市場競爭激烈程度評估
- 目標受眾匹配度分析

## 2. SERP 分析結果
- 前 5 名競爭對手策略解析
- 標題長度和關鍵字使用模式
- 描述片段撰寫策略
- 網域權威度觀察

## 3. 內容策略建議
- 推薦標題寫法 (3-5 個選項)
- Meta 描述撰寫建議
- 內容結構規劃 (H1, H2, H3)
- 目標字數建議

## 4. 關鍵字策略
- 主要關鍵字優化建議
- 相關關鍵字擴展
- 長尾關鍵字機會
- 語義相關詞彙建議

## 5. 競爭優勢分析
- 內容差異化機會
- 競爭對手弱點分析
- 市場空白點識別
- 超越競爭對手的策略

## 6. 執行建議
- 優先執行項目 (前 3 項)
- 內容創作時程規劃
- 效果評估指標
- 後續優化建議

[根據選項包含額外內容：初稿建議、FAQ、比較表格]

**重要**: 所有建議必須基於提供的真實資料，避免泛泛而談。每個建議都要具體可執行。"""
    
    def _validate_token_usage(self, prompt: str) -> bool:
        """驗證 Token 使用量是否在限制範圍內。
        
        Args:
            prompt: 要檢查的提示文字
            
        Returns:
            bool: 是否在限制範圍內
        """
        estimated_tokens = self._estimate_token_count(prompt)
        return estimated_tokens <= self.max_input_tokens
    
    def _estimate_token_count(self, text: str) -> int:
        """估算文字的 Token 使用量。
        
        使用簡化的估算方法：中英文混合文字約 3 字元/token。
        
        Args:
            text: 要估算的文字
            
        Returns:
            int: 估算的 Token 數量
        """
        return len(text.encode('utf-8')) // 3
    
    def _truncate_scraping_content(self, scraping_data: ScrapingResult) -> ScrapingResult:
        """截斷爬蟲內容以符合 Token 限制。
        
        優先保留成功爬取的頁面，並截斷過長的內容。
        
        Args:
            scraping_data: 原始爬蟲資料
            
        Returns:
            ScrapingResult: 截斷後的爬蟲資料
        """
        # 建立截斷版本，只保留前 3 個成功頁面
        successful_pages = [page for page in scraping_data.pages if page.success][:3]
        
        # 截斷每個頁面的 H2 清單
        for page in successful_pages:
            if len(page.h2_list) > 5:
                page.h2_list = page.h2_list[:5]
        
        return ScrapingResult(
            total_results=scraping_data.total_results,
            successful_scrapes=len(successful_pages),
            avg_word_count=scraping_data.avg_word_count,
            avg_paragraphs=scraping_data.avg_paragraphs,
            pages=successful_pages,
            errors=scraping_data.errors
        )
    
    async def _call_openai_api_with_retry(self, prompt: str) -> Dict[str, Any]:
        """呼叫 Azure OpenAI API 並包含重試機制。
        
        Args:
            prompt: 分析提示
            
        Returns:
            dict: OpenAI API 回應
            
        Raises:
            AIAPIException: API 呼叫失敗
            AITimeoutException: API 呼叫逾時
        """
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                return await self._call_openai_api(prompt)
                
            except openai.RateLimitError as e:
                last_error = AIAPIException(f"API 速率限制: {str(e)}")
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2 ** attempt)  # 指數退避
                    await asyncio.sleep(delay)
                    continue
                    
            except openai.APITimeoutError as e:
                last_error = AITimeoutException(f"API 逾時: {str(e)}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                    continue
                    
            except openai.APIError as e:
                last_error = AIAPIException(f"API 錯誤: {str(e)}")
                break  # API 錯誤不重試
                
            except Exception as e:
                last_error = AIServiceException(f"未預期錯誤: {str(e)}")
                break
        
        # 所有重試都失敗
        if last_error:
            raise last_error
        else:
            raise AIAPIException("Azure OpenAI API 呼叫失敗")
    
    async def _call_openai_api(self, prompt: str) -> Dict[str, Any]:
        """實際呼叫 Azure OpenAI API。
        
        Args:
            prompt: 分析提示
            
        Returns:
            dict: OpenAI API 完整回應
        """
        response = await self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=self.max_tokens - self._estimate_token_count(prompt),
            temperature=self.temperature,
            stream=False
        )
        
        # 轉換為字典格式以便處理
        return {
            'choices': [{'message': {'content': response.choices[0].message.content}}],
            'usage': {
                'total_tokens': response.usage.total_tokens,
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens
            }
        }
    
    def _parse_openai_response(self, response: Dict[str, Any]) -> str:
        """解析 OpenAI API 回應。
        
        Args:
            response: OpenAI API 回應
            
        Returns:
            str: 解析出的分析報告
            
        Raises:
            AIServiceException: 回應解析失敗
        """
        try:
            content = response['choices'][0]['message']['content']
            
            if not content or not isinstance(content, str):
                raise AIServiceException("OpenAI API 回應內容為空或格式錯誤")
            
            # 清理回應內容
            content = content.strip()
            
            # 驗證是否包含必要的報告結構
            required_sections = ['# SEO 分析報告', '## 1. 分析概述', '## 2. SERP 分析結果']
            for section in required_sections:
                if section not in content:
                    print(f"警告：回應缺少必要章節 '{section}'")
            
            return content
            
        except (KeyError, IndexError, TypeError) as e:
            raise AIServiceException(f"OpenAI API 回應解析失敗: {str(e)}")

    async def _test_connection(self) -> bool:
        """測試 Azure OpenAI 連線狀態
        
        使用最小 token 的測試請求驗證連線。
        
        Returns:
            bool: 連線是否成功
            
        Raises:
            AIServiceException: 當 API 連線失敗時
        """
        try:
            if not self.api_key or not self.endpoint:
                raise AIServiceException("Azure OpenAI not configured")
            
            client = AsyncAzureOpenAI(
                api_key=self.api_key,
                api_version="2024-02-01",
                azure_endpoint=self.endpoint
            )
            
            # 發送最小的測試請求 (約 10-20 tokens)
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                timeout=10.0
            )
            
            return True
            
        except openai.AuthenticationError:
            raise AIServiceException("Invalid Azure OpenAI credentials")
        except openai.APITimeoutError:
            raise AIServiceException("Azure OpenAI request timeout")
        except openai.APIConnectionError:
            raise AIServiceException("Azure OpenAI connection failed")
        except Exception as e:
            if isinstance(e, AIServiceException):
                raise
            raise AIServiceException(f"Connection test failed: {str(e)}")


# 全域服務實例
_ai_service = None


def get_ai_service() -> AIService:
    """取得 AI 服務的全域實例。
    
    實作單例模式，確保整個應用程式使用同一個服務實例。
    
    Returns:
        AIService: AI 服務實例
    """
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service