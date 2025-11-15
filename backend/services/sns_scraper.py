"""
SNS URL解析とユーザー情報取得機能

X（旧Twitter）とThreadsのURLからプラットフォームとハンドル名を抽出し、
ユーザー情報を取得
"""

import re
import time
from typing import Optional, Literal
import requests


Platform = Literal['X', 'THREADS']


class SnsUrlParser:
    """SNS URLパーサークラス"""

    @staticmethod
    def parse_x_url(url: str) -> Optional[dict]:
        """
        X（旧Twitter）のURLを解析

        Args:
            url: X URL

        Returns:
            {platform: 'X', handle: str, post_id: Optional[str]} または None
        """
        patterns = [
            # ポスト付き
            r'(?:twitter\.com|x\.com)/([^/]+)/status/(\d+)',
            # プロフィールのみ
            r'(?:twitter\.com|x\.com)/([^/\?]+)',
        ]

        excluded_paths = [
            'i', 'home', 'explore', 'notifications', 'messages',
            'settings', 'compose', 'search'
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                handle = match.group(1).replace('@', '')
                post_id = match.group(2) if len(match.groups()) >= 2 else None

                if handle.lower() in excluded_paths:
                    continue

                return {
                    'platform': 'X',
                    'handle': handle,
                    'post_id': post_id,
                }

        return None

    @staticmethod
    def parse_threads_url(url: str) -> Optional[dict]:
        """
        ThreadsのURLを解析

        Args:
            url: Threads URL

        Returns:
            {platform: 'THREADS', handle: str, post_id: Optional[str]} または None
        """
        patterns = [
            # ポスト付き
            r'threads\.(?:net|com)/@([^/]+)/post/([A-Za-z0-9_-]+)',
            # プロフィールのみ
            r'threads\.(?:net|com)/@([^/\?]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return {
                    'platform': 'THREADS',
                    'handle': match.group(1),
                    'post_id': match.group(2) if len(match.groups()) >= 2 else None,
                }

        return None

    @staticmethod
    def parse_sns_url(url: str) -> Optional[dict]:
        """
        SNS URLを解析してプラットフォームとハンドル名を取得

        Args:
            url: SNS URL

        Returns:
            {platform: Platform, handle: str, post_id: Optional[str]} または None
        """
        if 'twitter.com' in url or 'x.com' in url:
            return SnsUrlParser.parse_x_url(url)

        if 'threads.net' in url or 'threads.com' in url:
            return SnsUrlParser.parse_threads_url(url)

        return None

    @staticmethod
    def is_sns_url(url: str) -> bool:
        """
        SNS URLかどうかをチェック

        Args:
            url: チェック対象のURL

        Returns:
            SNS URLの場合 True
        """
        return (
            'twitter.com' in url or 'x.com' in url or
            'threads.net' in url or 'threads.com' in url
        )


class SnsScraper:
    """SNSスクレイピングクラス"""

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

    @classmethod
    async def fetch_x_user_info(cls, handle: str) -> dict:
        """
        X（旧Twitter）のユーザー情報を取得

        Args:
            handle: ユーザーハンドル

        Returns:
            {platform: 'X', handle: str, display_name: Optional[str]}
        """
        cls._rate_limit()

        url = f"https://x.com/{handle}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)

            if not response.ok:
                return {'platform': 'X', 'handle': handle, 'display_name': None}

            html = response.text
            display_name = None

            # 方法1: og:titleメタタグから取得
            og_title_match = re.search(
                r'<meta\s+(?:[^>]*?\s+)?property=["\']og:title["\']\s+content=["\']([^"\']+)["\']',
                html,
                re.IGNORECASE
            )
            if og_title_match:
                og_title = og_title_match.group(1)
                name_pattern = re.compile(rf'^([^(]+)\s*\(@{handle}\)', re.IGNORECASE)
                match = name_pattern.search(og_title)
                if match:
                    display_name = match.group(1).strip()

            # 方法2: HTMLの中のJSONデータから取得
            if not display_name:
                json_match = re.search(r'"screen_name":"([^"]+)","name":"([^"]+)"', html)
                if json_match and json_match.group(1).lower() == handle.lower():
                    display_name = json_match.group(2)

            return {
                'platform': 'X',
                'handle': handle,
                'display_name': display_name,
            }

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Failed to fetch X user info: {str(e)}")
            return {'platform': 'X', 'handle': handle, 'display_name': None}

    @classmethod
    async def fetch_threads_user_info(cls, handle: str) -> dict:
        """
        Threadsのユーザー情報を取得

        Args:
            handle: ユーザーハンドル

        Returns:
            {platform: 'THREADS', handle: str, display_name: Optional[str]}
        """
        cls._rate_limit()

        url = f"https://www.threads.net/@{handle}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        }

        try:
            response = requests.get(url, headers=headers, timeout=10)

            if not response.ok:
                return {'platform': 'THREADS', 'handle': handle, 'display_name': None}

            html = response.text
            display_name = None

            # 方法1: og:titleメタタグから取得
            og_title_match = re.search(r'<meta property="og:title" content="([^"]+)"', html)
            if og_title_match:
                og_title = og_title_match.group(1)
                name_pattern = re.compile(rf'^([^(]+)\s*\(@{handle}\)', re.IGNORECASE)
                match = name_pattern.search(og_title)
                if match:
                    display_name = match.group(1).strip()

            # 方法2: <title>タグから取得
            if not display_name:
                title_match = re.search(r'<title>([^<]+)</title>', html, re.IGNORECASE)
                if title_match:
                    title = title_match.group(1)
                    name_pattern = re.compile(rf'^([^(]+)\s*\(@{handle}\)', re.IGNORECASE)
                    match = name_pattern.search(title)
                    if match:
                        display_name = match.group(1).strip()

            return {
                'platform': 'THREADS',
                'handle': handle,
                'display_name': display_name,
            }

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Failed to fetch Threads user info: {str(e)}")
            return {'platform': 'THREADS', 'handle': handle, 'display_name': None}

    @classmethod
    async def fetch_sns_user_info(cls, platform: Platform, handle: str) -> dict:
        """
        SNSユーザー情報を取得（プラットフォーム自動判定）

        Args:
            platform: SNSプラットフォーム ('X' or 'THREADS')
            handle: ユーザーハンドル

        Returns:
            {platform: Platform, handle: str, display_name: Optional[str]}
        """
        if platform == 'X':
            return await cls.fetch_x_user_info(handle)
        elif platform == 'THREADS':
            return await cls.fetch_threads_user_info(handle)
        else:
            raise ValueError(f"Unsupported platform: {platform}")
