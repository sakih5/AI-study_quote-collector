/**
 * レート制限機能
 *
 * 外部APIへのリクエストを制限して、ブロックされるのを防ぐ
 */

interface RateLimiterOptions {
  maxRequests: number; // 最大リクエスト数
  windowMs: number; // 時間窓（ミリ秒）
}

interface RequestRecord {
  timestamp: number;
}

/**
 * シンプルなレート制限クラス
 */
export class RateLimiter {
  private requests: RequestRecord[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * リクエストが許可されるかチェック
   */
  canMakeRequest(): boolean {
    const now = Date.now();

    // 時間窓外の古いリクエストを削除
    this.requests = this.requests.filter(
      (record) => now - record.timestamp < this.windowMs
    );

    return this.requests.length < this.maxRequests;
  }

  /**
   * リクエストを記録
   */
  recordRequest(): void {
    this.requests.push({ timestamp: Date.now() });
  }

  /**
   * 次のリクエストまでの待機時間を取得（ミリ秒）
   */
  getWaitTime(): number {
    if (this.canMakeRequest()) {
      return 0;
    }

    const now = Date.now();
    const oldestRequest = this.requests[0];

    if (!oldestRequest) {
      return 0;
    }

    return this.windowMs - (now - oldestRequest.timestamp);
  }

  /**
   * レート制限付きでリクエストを実行
   * 必要に応じて待機する
   */
  async executeWithLimit<T>(fn: () => Promise<T>): Promise<T> {
    const waitTime = this.getWaitTime();

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.recordRequest();
    return fn();
  }

  /**
   * リセット
   */
  reset(): void {
    this.requests = [];
  }
}

// デフォルトのレート制限インスタンス
// Amazon: 10リクエスト/分
export const amazonRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1分
});

// SNS: 5リクエスト/分（Google検索は慎重に）
export const snsRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1分
});
