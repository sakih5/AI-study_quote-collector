/**
 * SNS URL解析機能
 *
 * X（旧Twitter）とThreadsのURLからプラットフォームとハンドル名を抽出
 */

export type Platform = 'X' | 'THREADS';

export interface ParsedSnsUrl {
  platform: Platform;
  handle: string;
  postId?: string;
}

/**
 * X（旧Twitter）のURLを解析
 *
 * 対応パターン:
 * - https://twitter.com/username/status/123456
 * - https://x.com/username/status/123456
 * - https://twitter.com/username
 * - https://x.com/username
 */
function parseXUrl(url: string): ParsedSnsUrl | null {
  const patterns = [
    // ポスト付き
    /(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/,
    // プロフィールのみ
    /(?:twitter\.com|x\.com)\/([^\/\?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const handle = match[1].replace('@', '');
      const postId = match[2];

      // 除外するパス（プロフィール以外）
      const excludedPaths = [
        'i',
        'home',
        'explore',
        'notifications',
        'messages',
        'settings',
        'compose',
        'search',
      ];
      if (excludedPaths.includes(handle.toLowerCase())) {
        continue;
      }

      return {
        platform: 'X',
        handle,
        postId,
      };
    }
  }

  return null;
}

/**
 * ThreadsのURLを解析
 *
 * 対応パターン:
 * - https://www.threads.net/@username/post/ABC123
 * - https://threads.net/@username/post/ABC123
 * - https://www.threads.com/@username/post/ABC123
 * - https://threads.com/@username/post/ABC123?xmt=...
 * - https://www.threads.net/@username
 */
function parseThreadsUrl(url: string): ParsedSnsUrl | null {
  const patterns = [
    // ポスト付き（threads.net または threads.com）
    /threads\.(?:net|com)\/@([^\/]+)\/post\/([A-Za-z0-9_-]+)/,
    // プロフィールのみ
    /threads\.(?:net|com)\/@([^\/\?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        platform: 'THREADS',
        handle: match[1],
        postId: match[2],
      };
    }
  }

  return null;
}

/**
 * SNSのURLを解析してプラットフォームとハンドル名を取得
 */
export function parseSnsUrl(url: string): ParsedSnsUrl | null {
  // Xのパース
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return parseXUrl(url);
  }

  // Threadsのパース
  if (url.includes('threads.net') || url.includes('threads.com')) {
    return parseThreadsUrl(url);
  }

  return null;
}

/**
 * URLがX（旧Twitter）のURLかチェック
 */
export function isXUrl(url: string): boolean {
  return url.includes('twitter.com') || url.includes('x.com');
}

/**
 * URLがThreadsのURLかチェック
 */
export function isThreadsUrl(url: string): boolean {
  return url.includes('threads.net') || url.includes('threads.com');
}

/**
 * URLがSNSのURLかチェック
 */
export function isSnsUrl(url: string): boolean {
  return isXUrl(url) || isThreadsUrl(url);
}
