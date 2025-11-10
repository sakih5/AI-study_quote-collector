import { createClient } from '@/lib/supabase/client';

/**
 * FastAPI統合用APIクライアント
 *
 * 認証トークンを自動的に付与してFastAPIエンドポイントを呼び出す
 */

// Next.js API Routes用のベースURL（相対パス）
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || '';

/**
 * FastAPI用のfetchラッパー
 * 自動的に認証トークンをヘッダーに付与する
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const supabase = createClient();

  // 認証トークンを取得
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // ヘッダーにトークンを追加
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // FastAPIエンドポイントを呼び出し
  const url = `${FASTAPI_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // エラーハンドリング
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response;
}

/**
 * GET リクエスト
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint, { method: 'GET' });
  return response.json();
}

/**
 * POST リクエスト
 */
export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.json();
}

/**
 * PUT リクエスト
 */
export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return response.json();
}

/**
 * DELETE リクエスト
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint, { method: 'DELETE' });
  return response.json();
}

/**
 * Next.js API Routes用のfetch（後方互換性のため残す）
 */
export async function nextApiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response;
}
