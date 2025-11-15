"""
Amazon書籍情報取得機能

AmazonのURLから書籍情報（タイトル、著者、画像、ISBN、ASIN）を取得
"""

import re
import time
from typing import Optional
from bs4 import BeautifulSoup
import requests


class AmazonScraper:
    """Amazonスクレイピングクラス"""

    # レート制限用の最後のリクエスト時刻
    _last_request_time: float = 0
    _min_interval: float = 6.0  # 10req/分 = 6秒間隔

    @classmethod
    def _rate_limit(cls):
        """レート制限を実施"""
        current_time = time.time()
        elapsed = current_time - cls._last_request_time

        if elapsed < cls._min_interval:
            sleep_time = cls._min_interval - elapsed
            time.sleep(sleep_time)

        cls._last_request_time = time.time()

    @staticmethod
    def extract_asin(url: str) -> Optional[str]:
        """
        AmazonのURLからASINを抽出

        Args:
            url: Amazon URL

        Returns:
            ASIN (10文字の英数字) または None
        """
        patterns = [
            r'/dp/([A-Z0-9]{10})',
            r'/product/([A-Z0-9]{10})',
            r'/gp/product/([A-Z0-9]{10})',
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        return None

    @staticmethod
    def is_amazon_url(url: str) -> bool:
        """
        Amazon URLかどうかをチェック

        Args:
            url: チェック対象のURL

        Returns:
            Amazon URLの場合 True
        """
        return bool(re.search(r'amazon\.(co\.jp|com)', url))

    @classmethod
    async def fetch_book_info(cls, url: str) -> Optional[dict]:
        """
        AmazonのURLから書籍情報を取得

        Args:
            url: Amazon URL

        Returns:
            書籍情報の辞書 または None
            - title: タイトル
            - author: 著者
            - cover_image_url: カバー画像URL
            - isbn: ISBN
            - asin: ASIN
            - publisher: 出版社
        """
        try:
            # ASINを抽出
            asin = cls.extract_asin(url)
            if not asin:
                print(f"[ERROR] Invalid Amazon URL: ASIN not found in {url}")
                return None

            # レート制限
            cls._rate_limit()

            # HTTPリクエスト
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            }

            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            # HTMLをパース
            soup = BeautifulSoup(response.text, 'html.parser')

            # タイトルを取得
            title_elem = (
                soup.find('span', {'id': 'productTitle'}) or
                soup.find('h1', class_='a-size-large')
            )

            if not title_elem:
                print(f"[ERROR] Book title not found in {url}")
                return None

            title = title_elem.get_text(strip=True)

            # 著者を取得
            author = None
            author_elem = soup.select_one('.author a.contributorNameID, .author .a-link-normal, #bylineInfo .author a, #bylineInfo .contributorNameID')
            if author_elem:
                author = author_elem.get_text(strip=True)

            # カバー画像を取得
            cover_image_url = None
            img_elem = (
                soup.find('img', {'id': 'landingImage'}) or
                soup.find('img', {'id': 'imgBlkFront'}) or
                soup.find('img', {'id': 'ebooksImgBlkFront'}) or
                soup.find('img', class_='a-dynamic-image')
            )

            if img_elem:
                cover_image_url = img_elem.get('src') or img_elem.get('data-old-hires')

            # ISBN / 出版社を取得
            isbn = None
            publisher = None

            # 商品詳細テーブルから取得
            detail_bullets = soup.find('div', {'id': 'detailBullets_feature_div'})
            if detail_bullets:
                for li in detail_bullets.find_all('li'):
                    text = li.get_text()
                    if 'ISBN-13' in text or 'ISBN' in text:
                        isbn_match = re.search(r'(\d{13}|\d{10})', text.replace('-', ''))
                        if isbn_match:
                            isbn = isbn_match.group(1)
                    if '出版社' in text or 'Publisher' in text:
                        publisher_match = re.search(r'[：:]\s*([^(（]+)', text)
                        if publisher_match:
                            # 複数の空白を1つに、前後の空白も削除
                            publisher = re.sub(r'\s+', ' ', publisher_match.group(1).strip())

            # 商品の詳細テーブル（別の形式）
            if not isbn or not publisher:
                detail_table = soup.find('table', {'id': 'productDetailsTable'})
                if detail_table:
                    for row in detail_table.find_all('tr'):
                        th = row.find('th')
                        td = row.find('td')
                        if th and td:
                            header = th.get_text(strip=True)
                            value = td.get_text(strip=True)

                            if not isbn and ('ISBN' in header):
                                isbn_match = re.search(r'(\d{13}|\d{10})', value.replace('-', ''))
                                if isbn_match:
                                    isbn = isbn_match.group(1)

                            if not publisher and ('出版社' in header or 'Publisher' in header):
                                # 複数の空白を1つに、前後の空白も削除
                                publisher = re.sub(r'\s+', ' ', value.split('(')[0].split('（')[0].strip())

            return {
                'title': title,
                'author': author,
                'cover_image_url': cover_image_url,
                'isbn': isbn,
                'asin': asin,
                'publisher': publisher,
            }

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] HTTP request failed for {url}: {str(e)}")
            return None
        except Exception as e:
            print(f"[ERROR] Failed to fetch book info from {url}: {type(e).__name__}: {str(e)}")
            return None
