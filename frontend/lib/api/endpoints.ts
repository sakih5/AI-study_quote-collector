/**
 * FastAPI エンドポイント関数
 *
 * 各APIエンドポイントを型安全に呼び出すための関数を提供します。
 * types.ts の型定義と組み合わせて使用します。
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
// TODO: OpenAPI型生成後に有効化
// import type { components } from './types';

// ============================================
// Activities API
// ============================================

export const activitiesApi = {
  /**
   * 活動領域一覧を取得
   */
  list: async () => {
    return apiGet<any[]>('/api/activities');
  },
};

// ============================================
// Tags API
// ============================================

export const tagsApi = {
  /**
   * タグ一覧を取得
   */
  list: async () => {
    return apiGet<any[]>('/api/tags');
  },

  /**
   * タグを作成
   */
  create: async (data: { name: string }) => {
    return apiPost<any>('/api/tags', data);
  },

  /**
   * タグを更新
   */
  update: async (id: number, data: { name: string }) => {
    return apiPut<any>(`/api/tags/${id}`, data);
  },

  /**
   * タグを削除
   */
  delete: async (id: number) => {
    return apiDelete<any>(`/api/tags/${id}`);
  },

  /**
   * タグを統合
   */
  merge: async (sourceId: number, targetId: number) => {
    return apiPost<any>(`/api/tags/${sourceId}/merge/${targetId}`, {});
  },
};

// ============================================
// Books API
// ============================================

export const booksApi = {
  /**
   * 書籍一覧を取得
   */
  list: async (params?: { has_quotes?: boolean }) => {
    const query = params?.has_quotes !== undefined
      ? `?has_quotes=${params.has_quotes}`
      : '';
    return apiGet<any[]>(`/api/books${query}`);
  },

  /**
   * 書籍を作成
   */
  create: async (data: {
    title: string;
    author?: string;
    publisher?: string;
    cover_image_url?: string;
    isbn?: string;
    asin?: string;
  }) => {
    return apiPost<any>('/api/books', data);
  },

  /**
   * URLから書籍情報を取得（Amazon等）
   */
  fromUrl: async (data: { url: string }) => {
    return apiPost<any>('/api/books/from-url', data);
  },
};

// ============================================
// SNS Users API
// ============================================

export const snsUsersApi = {
  /**
   * SNSユーザー一覧を取得
   */
  list: async () => {
    return apiGet<any[]>('/api/sns-users');
  },

  /**
   * SNSユーザーを作成
   */
  create: async (data: {
    platform: 'X' | 'THREADS';
    handle: string;
    display_name?: string;
  }) => {
    return apiPost<any>('/api/sns-users', data);
  },

  /**
   * URLからSNSユーザー情報を取得
   */
  fromUrl: async (data: { url: string }) => {
    return apiPost<any>('/api/sns-users/from-url', data);
  },
};

// ============================================
// Quotes API
// ============================================

interface QuoteListParams {
  limit?: number;
  offset?: number;
  search?: string;
  activity_ids?: number[];
  tag_ids?: number[];
}

export const quotesApi = {
  /**
   * グループ化されたフレーズ一覧を取得
   */
  listGrouped: async (params?: QuoteListParams) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.activity_ids) queryParams.append('activity_ids', params.activity_ids.join(','));
    if (params?.tag_ids) queryParams.append('tag_ids', params.tag_ids.join(','));

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiGet<any>(`/api/quotes/grouped${query}`);
  },

  /**
   * 公開フレーズ一覧を取得（認証不要）
   */
  listPublic: async (params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    // 公開エンドポイントなので直接fetch（認証なし）
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quotes/public${query}`);
    return response.json();
  },

  /**
   * フレーズを作成
   */
  create: async (data: {
    text: string;
    activity_ids: number[];
    tag_ids?: number[];
    source_type: 'BOOK' | 'SNS' | 'OTHER';
    book_id?: number;
    sns_user_id?: number;
    page_number?: number;
    source_meta?: Record<string, any>;
    is_public?: boolean;
    reference_link?: string;
  }) => {
    return apiPost<any>('/api/quotes', data);
  },

  /**
   * フレーズを更新
   */
  update: async (id: number, data: {
    text?: string;
    activity_ids?: number[];
    tag_ids?: number[];
    is_public?: boolean;
    reference_link?: string;
  }) => {
    return apiPut<any>(`/api/quotes/${id}`, data);
  },

  /**
   * フレーズを削除
   */
  delete: async (id: number) => {
    return apiDelete<any>(`/api/quotes/${id}`);
  },
};

// ============================================
// Export (CSV) API
// ============================================

export const exportApi = {
  /**
   * CSVエクスポート
   * Note: このAPIはBlobを返すため、別途処理が必要
   */
  csv: async (params?: {
    search?: string;
    activity_ids?: string;
    tag_ids?: string;
  }) => {
    // CSVエクスポートは別途実装（Blobダウンロード処理が必要）
    throw new Error('CSV export should be handled separately with Blob download');
  },
};

// ============================================
// OCR API
// ============================================

export const ocrApi = {
  /**
   * 画像からテキストを抽出
   */
  extractText: async (file: File, language: string = 'jpn') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/ocr/extract-text`,
      {
        method: 'POST',
        body: formData,
        headers: {
          // Content-Typeは自動設定されるため、指定しない
        },
      }
    );

    if (!response.ok) {
      throw new Error('OCR failed');
    }

    return response.json();
  },
};
