/**
 * FastAPI OpenAPI 型定義
 *
 * このファイルはOpenAPIスキーマから自動生成されます。
 * 手動で編集しないでください。
 *
 * 生成コマンド:
 * npm run generate-types
 *
 * または:
 * npx openapi-typescript http://localhost:8000/openapi.json -o lib/api/types.ts
 */

// TODO: OpenAPI型生成で自動生成
// export type { components } from './generated-types';

// プレースホルダー型定義（OpenAPI型生成前の一時的な定義）
export interface Activity {
  id: number;
  name: string;
  description: string;
  icon: string;
  display_order: number;
}

export interface Tag {
  id: number;
  name: string;
  user_id: string;
  created_at: string;
}

export interface Book {
  id: number;
  title: string;
  author?: string;
  publisher?: string;
  cover_image_url?: string;
  isbn?: string;
  asin?: string;
  user_id: string;
  created_at: string;
}

export interface SnsUser {
  id: number;
  platform: 'X' | 'THREADS';
  handle: string;
  display_name?: string;
  user_id: string;
  created_at: string;
}

export interface Quote {
  id: number;
  text: string;
  source_type: 'BOOK' | 'SNS' | 'OTHER';
  book_id?: number;
  sns_user_id?: number;
  page_number?: number;
  source_meta?: Record<string, any>;
  is_public: boolean;
  reference_link?: string;
  activities: Activity[];
  tags: Tag[];
  created_at: string;
}

export interface QuotesGroupedResponse {
  items: Array<
    | { type: 'book'; book: Book; quotes: Quote[] }
    | { type: 'sns'; sns_user: SnsUser; quotes: Quote[] }
    | { type: 'other'; quote: Quote }
  >;
  total: number;
  limit: number;
  offset: number;
}
