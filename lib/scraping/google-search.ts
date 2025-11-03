/**
 * SNSプロフィールページから直接ユーザー情報を取得
 *
 * X（旧Twitter）とThreadsのプロフィールページのHTMLを解析して表示名を取得
 */

import { snsRateLimiter } from './rate-limiter';
import type { Platform } from './sns-url-parser';

export interface SnsUserInfo {
  platform: Platform;
  handle: string;
  display_name?: string;
}

/**
 * Xのプロフィールページから直接ユーザー情報を取得
 */
async function fetchXProfilePage(handle: string): Promise<string | null> {
  return snsRateLimiter.executeWithLimit(async () => {
    const url = `https://x.com/${handle}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        return null;
      }

      return response.text();
    } catch (error) {
      console.error('Error fetching X profile page:', error);
      return null;
    }
  });
}

/**
 * X（旧Twitter）のユーザー情報を取得
 */
export async function fetchXUserInfo(
  handle: string
): Promise<SnsUserInfo | null> {
  try {
    const html = await fetchXProfilePage(handle);

    if (!html) {
      console.log('[DEBUG] Failed to fetch X profile page');
      return {
        platform: 'X',
        handle,
        display_name: undefined,
      };
    }

    // Note: X uses SPA (Single Page Application), so initial HTML doesn't contain
    // user information. Display name extraction is currently not possible via
    // server-side scraping. Consider using official API or manual input instead.

    let displayName: string | undefined;

    // 方法1: og:titleメタタグから取得を試みる
    const ogTitleRegex = /<meta\s+(?:[^>]*?\s+)?property=["']og:title["']\s+content=["']([^"']+)["']/i;
    const ogTitleMatch = html.match(ogTitleRegex);
    if (ogTitleMatch) {
      const ogTitle = ogTitleMatch[1];
      const namePattern = new RegExp(`^([^(]+)\\s*\\(@${handle}\\)`, 'i');
      const match = ogTitle.match(namePattern);
      if (match) {
        displayName = match[1].trim();
      }
    }

    // 方法2: HTMLの中のJSONデータから取得を試みる
    if (!displayName) {
      const jsonMatch = html.match(/"screen_name":"([^"]+)","name":"([^"]+)"/);
      if (jsonMatch && jsonMatch[1].toLowerCase() === handle.toLowerCase()) {
        displayName = jsonMatch[2];
      }
    }

    return {
      platform: 'X',
      handle,
      display_name: displayName,
    };
  } catch (error) {
    console.error('Error fetching X user info:', error);
    return {
      platform: 'X',
      handle,
      display_name: undefined,
    };
  }
}

/**
 * Threadsのプロフィールページから直接ユーザー情報を取得
 */
async function fetchThreadsProfilePage(handle: string): Promise<string | null> {
  return snsRateLimiter.executeWithLimit(async () => {
    const url = `https://www.threads.net/@${handle}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        return null;
      }

      return response.text();
    } catch (error) {
      console.error('Error fetching Threads profile page:', error);
      return null;
    }
  });
}

/**
 * Threadsのユーザー情報を取得
 */
export async function fetchThreadsUserInfo(
  handle: string
): Promise<SnsUserInfo | null> {
  try {
    const html = await fetchThreadsProfilePage(handle);

    if (!html) {
      console.log('[DEBUG] Failed to fetch Threads profile page');
      return {
        platform: 'THREADS',
        handle,
        display_name: undefined,
      };
    }

    // Note: Similar to X, Threads also uses SPA. Display name extraction
    // may not work reliably with server-side scraping.

    let displayName: string | undefined;

    // 方法1: og:titleメタタグから取得を試みる
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch) {
      const ogTitle = ogTitleMatch[1];
      const namePattern = new RegExp(`^([^(]+)\\s*\\(@${handle}\\)`, 'i');
      const match = ogTitle.match(namePattern);
      if (match) {
        displayName = match[1].trim();
      }
    }

    // 方法2: <title>タグから取得を試みる
    if (!displayName) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        const title = titleMatch[1];
        const namePattern = new RegExp(`^([^(]+)\\s*\\(@${handle}\\)`, 'i');
        const match = title.match(namePattern);
        if (match) {
          displayName = match[1].trim();
        }
      }
    }

    return {
      platform: 'THREADS',
      handle,
      display_name: displayName,
    };
  } catch (error) {
    console.error('Error fetching Threads user info:', error);
    return {
      platform: 'THREADS',
      handle,
      display_name: undefined,
    };
  }
}

/**
 * SNSユーザー情報を取得（プラットフォーム自動判定）
 */
export async function fetchSnsUserInfo(
  platform: Platform,
  handle: string
): Promise<SnsUserInfo | null> {
  if (platform === 'X') {
    return fetchXUserInfo(handle);
  } else if (platform === 'THREADS') {
    return fetchThreadsUserInfo(handle);
  }

  return null;
}

/**
 * 複数のSNSユーザー情報を一括取得
 * レート制限を考慮して順次実行
 */
export async function fetchMultipleSnsUserInfo(
  users: Array<{ platform: Platform; handle: string }>
): Promise<Array<SnsUserInfo | null>> {
  const results: Array<SnsUserInfo | null> = [];

  for (const user of users) {
    const info = await fetchSnsUserInfo(user.platform, user.handle);
    results.push(info);
  }

  return results;
}
