"""網頁爬蟲服務模組。

此模組提供網頁內容爬取功能，包括並行爬取、HTML 解析、
SEO 元素提取、錯誤處理和重試機制。
"""

import asyncio
import time
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

import aiohttp
from aiohttp import ClientError
from bs4 import BeautifulSoup, Tag
from bs4.element import NavigableString

from ..config import get_config


# 自定義例外類別
class ScraperException(Exception):
    """爬蟲相關錯誤的基礎例外類別。"""


class ScraperTimeoutException(ScraperException):
    """爬蟲逾時錯誤，對應 API 錯誤碼 SCRAPER_TIMEOUT。"""


class ScraperParsingException(ScraperException):
    """HTML 解析錯誤。"""


# 資料結構定義
@dataclass
class PageContent:
    """爬取的網頁內容資料結構。
    
    Attributes:
        url: 原始 URL
        title: 頁面標題 (<title> 標籤)
        meta_description: Meta 描述標籤內容
        h1: 主標題內容
        h2_list: 副標題清單
        word_count: 內文字數統計
        paragraph_count: 段落數統計
        status_code: HTTP 回應狀態碼
        load_time: 頁面載入時間 (秒)
        success: 是否成功爬取
        error: 錯誤訊息 (如果有)
    """
    url: str
    h2_list: List[str]
    title: Optional[str] = None
    meta_description: Optional[str] = None
    h1: Optional[str] = None
    word_count: int = 0
    paragraph_count: int = 0
    status_code: int = 0
    load_time: float = 0.0
    success: bool = False
    error: Optional[str] = None


@dataclass
class ScrapingResult:
    """批量爬取結果資料結構。
    
    符合 API 規格中 serp_summary 的格式要求。
    
    Attributes:
        total_results: 總 URL 數量
        successful_scrapes: 成功爬取數量
        avg_word_count: 平均字數
        avg_paragraphs: 平均段落數
        pages: 各頁面詳細內容
        errors: 錯誤資訊清單
    """
    total_results: int
    successful_scrapes: int
    avg_word_count: int
    avg_paragraphs: int
    pages: List[PageContent]
    errors: List[Dict[str, Any]]


class ScraperService:
    """網頁爬蟲服務類別。
    
    提供並行網頁爬取、HTML 解析、SEO 元素提取等功能，
    支援重試機制、逾時控制和錯誤處理。
    """

    def __init__(self):
        """初始化爬蟲服務。
        
        載入配置並設定爬蟲參數。
        """
        self.config = get_config()
        
        # 爬蟲配置參數
        self.max_concurrent = self.config.get_scraper_max_concurrent()
        self.timeout = self.config.get_scraper_timeout()
        self.max_retries = self.config.get_scraper_retry_count()
        self.retry_delay = self.config.get_scraper_retry_delay()
        
        # HTTP 請求配置
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ]
        
    async def scrape_urls(self, urls: List[str]) -> ScrapingResult:
        """批量爬取 URL 清單。
        
        使用並行處理爬取多個 URL，提供完整的統計資訊。
        
        Args:
            urls: 要爬取的 URL 清單
            
        Returns:
            ScrapingResult: 包含統計資訊和各頁面內容的結果
            
        Raises:
            ScraperException: 爬蟲執行過程中發生錯誤
        """
        if not urls:
            return ScrapingResult(
                total_results=0,
                successful_scrapes=0,
                avg_word_count=0,
                avg_paragraphs=0,
                pages=[],
                errors=[]
            )
        
        start_time = time.time()
        
        # 使用 Semaphore 控制並行數量
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        # 建立並行任務
        tasks = [
            self._scrape_single_url_with_semaphore(semaphore, url)
            for url in urls
        ]
        
        # 執行並行爬取
        try:
            pages = await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            raise ScraperException(f"並行爬取執行失敗: {str(e)}")
        
        # 處理結果和例外
        successful_pages = []
        errors = []
        
        for i, result in enumerate(pages):
            if isinstance(result, Exception):
                errors.append({
                    'url': urls[i],
                    'error': str(result),
                    'error_type': type(result).__name__
                })
            elif isinstance(result, PageContent):
                if result.success:
                    successful_pages.append(result)
                else:
                    errors.append({
                        'url': result.url,
                        'error': result.error or 'Unknown error',
                        'error_type': 'ScrapingError'
                    })
        
        # 計算統計資訊
        total_results = len(urls)
        successful_scrapes = len(successful_pages)
        
        if successful_pages:
            avg_word_count = int(sum(page.word_count for page in successful_pages) / len(successful_pages))
            avg_paragraphs = int(sum(page.paragraph_count for page in successful_pages) / len(successful_pages))
        else:
            avg_word_count = 0
            avg_paragraphs = 0
        
        processing_time = time.time() - start_time
        
        # 檢查是否達到最低成功率要求 (80%)
        success_rate = successful_scrapes / total_results if total_results > 0 else 0
        if success_rate < 0.8:
            # 記錄警告但不拋出例外，允許部分失敗
            print(f"警告：爬蟲成功率 {success_rate:.1%} 低於 80% 目標")
        
        print(f"爬蟲完成：{successful_scrapes}/{total_results} 成功，耗時 {processing_time:.2f} 秒")
        
        # 印出每筆URL資料的前100字元
        print("📄 網頁爬取內容預覽：")
        for i, page in enumerate([p for p in pages if isinstance(p, PageContent)], 1):
            if page.success:
                # 組合可用內容作為預覽（PageContent 沒有 content 屬性，使用 title, h1, meta_description）
                content_parts = []
                if page.title:
                    content_parts.append(f"標題: {page.title}")
                if page.h1:
                    content_parts.append(f"H1: {page.h1}")
                if page.meta_description:
                    content_parts.append(f"描述: {page.meta_description}")
                
                content_preview = " | ".join(content_parts)[:100]
                print(f"  {i}. URL: {page.url}")
                print(f"     內容: {content_preview}{'...' if len(content_preview) > 100 else ''}")
                print(f"     字數: {page.word_count}, 段落: {page.paragraph_count}")
                print(f"     H2標籤: {len(page.h2_list)} 個")
            else:
                print(f"  {i}. URL: {page.url}")
                print(f"     狀態: 爬取失敗 - {page.error if page.error else '未知錯誤'}")
            print()
        
        return ScrapingResult(
            total_results=total_results,
            successful_scrapes=successful_scrapes,
            avg_word_count=avg_word_count,
            avg_paragraphs=avg_paragraphs,
            pages=successful_pages + [page for page in pages if isinstance(page, PageContent) and not page.success],
            errors=errors
        )
    
    async def _scrape_single_url_with_semaphore(self, semaphore: asyncio.Semaphore, url: str) -> PageContent:
        """使用 Semaphore 控制的單頁爬取。
        
        Args:
            semaphore: 用於控制並行數量的 Semaphore
            url: 要爬取的 URL
            
        Returns:
            PageContent: 爬取結果
        """
        async with semaphore:
            return await self.scrape_single_url(url)
    
    async def scrape_single_url(self, url: str) -> PageContent:
        """爬取單個 URL 的內容。
        
        包含重試機制和完整的錯誤處理。
        
        Args:
            url: 要爬取的 URL
            
        Returns:
            PageContent: 爬取的頁面內容
        """
        start_time = time.time()
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                return await self._execute_scraping(url, start_time)
            except asyncio.TimeoutError:
                last_error = ScraperTimeoutException(f"URL {url} 爬取逾時")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
                    continue
            except ClientError as e:
                last_error = ScraperException(f"網路錯誤: {str(e)}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
                    continue
            except Exception as e:
                last_error = ScraperException(f"未預期錯誤: {str(e)}")
                break  # 非網路錯誤不重試
        
        # 所有重試都失敗，回傳失敗結果
        load_time = time.time() - start_time
        return PageContent(
            url=url,
            h2_list=[],
            load_time=load_time,
            success=False,
            error=str(last_error) if last_error else "未知錯誤"
        )
    
    async def _execute_scraping(self, url: str, start_time: float) -> PageContent:
        """執行實際的網頁爬取作業。
        
        Args:
            url: 要爬取的 URL
            start_time: 開始時間 (用於計算載入時間)
            
        Returns:
            PageContent: 爬取結果
            
        Raises:
            各種網路和解析相關例外
        """
        # 建立 HTTP 客戶端配置
        timeout = aiohttp.ClientTimeout(total=self.timeout)
        headers = {
            'User-Agent': self.user_agents[hash(url) % len(self.user_agents)],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
            async with session.get(url) as response:
                # 記錄載入時間
                load_time = time.time() - start_time
                status_code = response.status
                
                # 檢查回應狀態
                if status_code >= 400:
                    return PageContent(
                        url=url,
                        h2_list=[],
                        status_code=status_code,
                        load_time=load_time,
                        success=False,
                        error=f"HTTP {status_code} 錯誤"
                    )
                
                # 讀取網頁內容
                html_content = await response.text()
                
                # 解析 HTML 並提取 SEO 元素
                page_data = self._extract_seo_elements(html_content, url)
                
                return PageContent(
                    url=url,
                    h2_list=page_data.get('h2_list', []),
                    title=page_data.get('title'),
                    meta_description=page_data.get('meta_description'),
                    h1=page_data.get('h1'),
                    word_count=page_data.get('word_count', 0),
                    paragraph_count=page_data.get('paragraph_count', 0),
                    status_code=status_code,
                    load_time=load_time,
                    success=True
                )
    
    def _extract_seo_elements(self, html: str, _original_url: str) -> Dict[str, Any]:
        """從 HTML 內容中提取 SEO 相關元素。
        
        Args:
            html: HTML 原始內容
            original_url: 原始 URL (用於相對連結處理)
            
        Returns:
            dict: 包含 SEO 元素的字典
            
        Raises:
            ScraperParsingException: HTML 解析失敗
        """
        try:
            # 使用 lxml 解析器提升效能
            soup = BeautifulSoup(html, 'lxml')
        except Exception as e:
            raise ScraperParsingException(f"HTML 解析失敗: {str(e)}")
        
        result = {}
        
        # 提取頁面標題
        title_tag = soup.find('title')
        result['title'] = title_tag.get_text(strip=True) if title_tag else None
        
        # 提取 Meta Description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if not meta_desc:
            meta_desc = soup.find('meta', attrs={'property': 'og:description'})
        
        if meta_desc and isinstance(meta_desc, Tag):
            # 根據 BeautifulSoup 文檔，使用 get 方法安全存取屬性
            content = meta_desc.get('content', '')
            if content and isinstance(content, (str, list)):
                # 處理可能的 list 類型 (如 class 屬性)
                content_str = content[0] if isinstance(content, list) else content
                result['meta_description'] = content_str.strip() if content_str else None
            else:
                result['meta_description'] = None
        else:
            result['meta_description'] = None
        
        # 提取 H1 標籤 (取第一個)
        h1_tag = soup.find('h1')
        result['h1'] = h1_tag.get_text(strip=True) if h1_tag else None
        
        # 提取所有 H2 標籤
        h2_tags = soup.find_all('h2')
        result['h2_list'] = []
        for h2 in h2_tags:
            if h2 and isinstance(h2, Tag):
                h2_text = h2.get_text(strip=True)
                if h2_text:
                    result['h2_list'].append(h2_text)
        
        # 計算內文字數和段落數
        # 移除 script, style, nav, footer 等非內容標籤
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            element.decompose()
        
        # 提取主要內容區域的文字
        main_content = (soup.find('main') or soup.find('article') or 
                       soup.find('div', class_='content') or soup.find('body'))
        
        if main_content and isinstance(main_content, (Tag, NavigableString)):
            # 計算字數 (移除多餘空白)
            text_content = main_content.get_text(separator=' ', strip=True)
            # 中英文字數統計 (中文字符 + 英文單字)
            chinese_chars = len([c for c in text_content if '\u4e00' <= c <= '\u9fff'])
            english_words = len(text_content.split()) - chinese_chars
            result['word_count'] = chinese_chars + english_words
            
            # 計算段落數 (p 標籤 + br 標籤組)
            paragraphs = []
            if isinstance(main_content, Tag):
                try:
                    paragraphs = main_content.find_all('p')
                except Exception:
                    paragraphs = []
            
            if isinstance(main_content, Tag):
                br_groups = len(main_content.get_text().split('\n\n'))
                result['paragraph_count'] = max(len(paragraphs), br_groups - 1, 1)
            else:
                result['paragraph_count'] = 1
        else:
            result['word_count'] = 0
            result['paragraph_count'] = 0
        
        return result



# 全域服務實例
_SCRAPER_SERVICE = None


def get_scraper_service() -> ScraperService:
    """取得爬蟲服務的全域實例。
    
    實作單例模式，確保整個應用程式使用同一個服務實例。
    
    Returns:
        ScraperService: 爬蟲服務實例
    """
    global _SCRAPER_SERVICE
    if _SCRAPER_SERVICE is None:
        _SCRAPER_SERVICE = ScraperService()
    return _SCRAPER_SERVICE
