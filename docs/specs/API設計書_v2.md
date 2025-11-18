# API設計書 v2.0

## 1. 概要

### 1.1 ベースURL

- 開発環境（FastAPI）: `http://localhost:8000/api`
- 開発環境（Next.js）: `http://localhost:3000`
- 本番環境（FastAPI）: `https://quote-collector-api-3276884015.asia-northeast1.run.app/api`
- 本番環境（Next.js）: `https://your-app.vercel.app`

**注**: v2.0以降、バックエンドAPIはFastAPI（Python）で実装されています。Next.js API Routesは削除されました。

### 1.2 認証

- Supabase Authによる認証
- リクエストヘッダーに `Authorization: Bearer <token>` を含める

### 1.3 レスポンス形式

- すべてのレスポンスはJSON形式
- 日時はISO 8601形式（UTC）

### 1.4 エラーレスポンス

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

---

## 2. エンドポイント一覧

### 2.1 活動領域（Activities）

#### GET /activities

活動領域一覧を取得（システム固定の10個）

**リクエスト:**

```
GET /api/activities
Authorization: Bearer <token>
```

**レスポンス:**

```json
{
  "activities": [
    {
      "id": 1,
      "name": "仕事・キャリア",
      "description": "業務、スキル開発、キャリア形成に関連する活動",
      "icon": "💼",
      "display_order": 1
    },
    ...
  ]
}
```

---

### 2.2 書籍（Books）

#### GET /books

ユーザーの書籍一覧を取得

**リクエスト:**

```
GET /api/books
Authorization: Bearer <token>
```

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|----------|-----|------|------|
| limit | int | No | 取得件数（デフォルト: 50） |
| offset | int | No | オフセット（デフォルト: 0） |
| search | string | No | 検索キーワード（タイトル・著者） |
| has_quotes | bool | No | フレーズが存在する書籍のみ取得（デフォルト: false） |

**レスポンス:**

```json
{
  "books": [
    {
      "id": 1,
      "title": "深い仕事",
      "author": "カル・ニューポート",
      "cover_image_url": "https://...",
      "created_at": "2024-10-27T10:00:00Z"
    },
    ...
  ],
  "total": 25,
  "has_more": true
}
```

#### POST /books

新規書籍を登録

**リクエスト:**

```
POST /api/books
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "深い仕事",
  "author": "カル・ニューポート",
  "cover_image_url": "https://...",
  "isbn": "978-4478108352",
  "asin": "B07PZKQFQL",
  "publisher": "ダイヤモンド社"
}
```

**レスポンス:**

```json
{
  "book": {
    "id": 1,
    "title": "深い仕事",
    "author": "カル・ニューポート",
    ...
  }
}
```

#### POST /books/from-url

Amazon URLから書籍情報を取得

**リクエスト:**

```
POST /api/books/from-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://www.amazon.co.jp/dp/B07PZKQFQL"
}
```

**レスポンス（成功）:**

```json
{
  "success": true,
  "book": {
    "title": "深い仕事",
    "author": "カル・ニューポート",
    "cover_image_url": "https://m.media-amazon.com/...",
    "isbn": "978-4478108352",
    "asin": "B07PZKQFQL",
    "publisher": "ダイヤモンド社"
  }
}
```

**レスポンス（失敗）:**

```json
{
  "success": false,
  "error": "書籍情報の取得に失敗しました",
  "fallback_mode": true
}
```

---

### 2.3 SNSユーザー（SNS Users）

#### GET /sns-users

ユーザーのSNSユーザー一覧を取得

**リクエスト:**

```
GET /api/sns-users
Authorization: Bearer <token>
```

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|----------|-----|------|------|
| limit | int | No | 取得件数（デフォルト: 50） |
| offset | int | No | オフセット（デフォルト: 0） |
| platform | string | No | プラットフォーム（X, THREADS） |
| search | string | No | 検索キーワード（ハンドル・表示名） |

**レスポンス:**

```json
{
  "sns_users": [
    {
      "id": 1,
      "platform": "X",
      "handle": "kentaro_dev",
      "display_name": "Kentaro | エンジニア",
      "created_at": "2024-10-27T10:00:00Z"
    },
    ...
  ],
  "total": 10,
  "has_more": false
}
```

#### POST /sns-users

新規SNSユーザーを登録

**リクエスト:**

```
POST /api/sns-users
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "X",
  "handle": "kentaro_dev",
  "display_name": "Kentaro | エンジニア"
}
```

**レスポンス:**

```json
{
  "sns_user": {
    "id": 1,
    "platform": "X",
    "handle": "kentaro_dev",
    "display_name": "Kentaro | エンジニア",
    "created_at": "2024-10-27T10:00:00Z"
  }
}
```

#### POST /sns-users/fetch-from-url

SNS投稿URLからユーザー情報を取得

**リクエスト:**

```
POST /api/sns-users/fetch-from-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://x.com/kentaro_dev/status/1234567890",
  "platform": "X"
}
```

**レスポンス（成功）:**

```json
{
  "user_info": {
    "platform": "X",
    "handle": "kentaro_dev",
    "display_name": "Kentaro | エンジニア"
  },
  "display_name_fetched": true,
  "warning": null
}
```

**レスポンス（表示名取得失敗）:**

```json
{
  "user_info": {
    "platform": "X",
    "handle": "kentaro_dev",
    "display_name": null
  },
  "display_name_fetched": false,
  "warning": "表示名を自動取得できませんでした。手動で入力してください。"
}
```

**フィールド説明:**
- `user_info`: 抽出されたユーザー情報
- `display_name_fetched`: 表示名の自動取得が成功したかどうか
- `warning`: 警告メッセージ（表示名が取得できなかった場合など）

---

### 2.4 タグ（Tags）

#### GET /tags

ユーザーのタグ一覧を取得

**リクエスト:**

```
GET /api/tags
Authorization: Bearer <token>
```

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|----------|-----|------|------|
| sort | string | No | ソート（usage_count, name, created_at） |
| order | string | No | 順序（asc, desc）デフォルト: desc |
| search | string | No | 検索キーワード |

**レスポンス:**

```json
{
  "tags": [
    {
      "id": 1,
      "name": "#習慣",
      "usage_count": 23,
      "activity_distribution": {
        "1": 10,  // 仕事・キャリア: 10件
        "2": 8,   // 学習・研究: 8件
        "3": 3,   // 創作・制作活動: 3件
        "8": 2    // 生活習慣・セルフケア: 2件
      },
      "created_at": "2024-10-27T10:00:00Z"
    },
    ...
  ],
  "total": 50
}
```

#### POST /tags

新規タグを作成

**リクエスト:**

```
POST /api/tags
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "#生産性"
}
```

**レスポンス:**

```json
{
  "tag": {
    "id": 1,
    "name": "#生産性",
    "created_at": "2024-10-27T10:00:00Z"
  }
}
```

#### PUT /tags/:id

タグ名を変更

**リクエスト:**

```
PUT /api/tags/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "#集中力"
}
```

**レスポンス:**

```json
{
  "tag": {
    "id": 1,
    "name": "#集中力",
    "updated_at": "2024-10-27T11:00:00Z"
  }
}
```

#### POST /tags/:id/merge

タグを統合

**リクエスト:**

```
POST /api/tags/123/merge
Authorization: Bearer <token>
Content-Type: application/json

{
  "target_tag_id": 456
}
```

**説明:**

- タグID 123 をタグID 456 に統合
- タグ123を使用していたすべてのフレーズがタグ456に変更される
- タグ123は削除される

**レスポンス:**

```json
{
  "success": true,
  "merged_count": 15,
  "target_tag": {
    "id": 456,
    "name": "#集中",
    "usage_count": 27
  }
}
```

#### DELETE /tags/:id

タグを削除

**リクエスト:**

```
DELETE /api/tags/1
Authorization: Bearer <token>
```

**レスポンス:**

```json
{
  "success": true
}
```

---

### 2.5 フレーズ（Quotes）

#### GET /quotes

フレーズ一覧を取得（グループ化なし）

**リクエスト:**

```
GET /api/quotes
Authorization: Bearer <token>
```

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|----------|-----|------|------|
| limit | int | No | 取得件数（デフォルト: 50） |
| offset | int | No | オフセット（デフォルト: 0） |
| search | string | No | 検索キーワード |
| source_type | string | No | 出典タイプ（BOOK, SNS, OTHER） |
| activity_ids | string | No | 活動領域ID（カンマ区切り）例: 1,2,3 |
| tag_ids | string | No | タグID（カンマ区切り）例: 10,20,30 |
| sort | string | No | ソート（created_at, updated_at）デフォルト: created_at |
| order | string | No | 順序（asc, desc）デフォルト: desc |

**レスポンス:**

```json
{
  "quotes": [
    {
      "id": 1,
      "text": "集中は筋肉のように鍛えられる。",
      "source_type": "BOOK",
      "page_number": 27,
      "is_public": false,
      "reference_link": "https://example.com/article",
      "book": {
        "id": 1,
        "title": "深い仕事",
        "author": "カル・ニューポート",
        "cover_image_url": "https://..."
      },
      "activities": [
        {
          "id": 2,
          "name": "学習・研究",
          "icon": "📖"
        }
      ],
      "tags": [
        {
          "id": 10,
          "name": "#集中"
        }
      ],
      "created_at": "2024-10-27T10:00:00Z",
      "updated_at": "2024-10-27T10:00:00Z"
    },
    ...
  ],
  "total": 400,
  "has_more": true
}
```

#### GET /quotes/grouped

フレーズ一覧を取得（グループ化あり）

**リクエスト:**

```
GET /api/quotes/grouped
Authorization: Bearer <token>
```

**クエリパラメータ:**
同上（`/quotes` と同じ）

**レスポンス:**

```json
{
  "items": [
    {
      "type": "book",
      "book": {
        "id": 1,
        "title": "深い仕事",
        "author": "カル・ニューポート",
        "cover_image_url": "https://..."
      },
      "quotes": [
        {
          "id": 123,
          "text": "集中は筋肉のように...",
          "page_number": 27,
          "is_public": false,
          "reference_link": null,
          "activities": [
            {
              "id": 2,
              "name": "学習・研究",
              "icon": "📖"
            }
          ],
          "tags": [
            {
              "id": 10,
              "name": "#集中"
            }
          ],
          "created_at": "2024-10-27T10:00:00Z"
        },
        ...
      ]
    },
    {
      "type": "sns",
      "sns_user": {
        "id": 2,
        "platform": "X",
        "handle": "kentaro_dev",
        "display_name": "Kentaro | エンジニア"
      },
      "quotes": [
        {
          "id": 456,
          "text": "完璧を目指すな...",
          "activities": [...],
          "tags": [...],
          "created_at": "2024-10-20T12:00:00Z"
        },
        ...
      ]
    },
    {
      "type": "other",
      "quote": {
        "id": 789,
        "text": "失敗を恐れるより...",
        "source_meta": {
          "source": "社内研修",
          "note": "10月の全社研修での気づき"
        },
        "activities": [...],
        "tags": [...],
        "created_at": "2024-10-20T14:00:00Z"
      }
    }
  ],
  "total": 3,
  "has_more": true
}
```

#### POST /quotes

フレーズを登録

**リクエスト:**

```
POST /api/quotes
Authorization: Bearer <token>
Content-Type: application/json

{
  "quotes": [
    {
      "text": "集中は筋肉のように鍛えられる。",
      "activity_ids": [2],
      "tag_ids": [10, 20]
    },
    {
      "text": "重要な少数へ資源を配分せよ。",
      "activity_ids": [1],
      "tag_ids": [15]
    }
  ],
  "source_type": "BOOK",
  "book_id": 1,
  "page_number": 27,
  "is_public": false,
  "reference_link": "https://example.com/article"
}
```

**レスポンス:**

```json
{
  "quotes": [
    {
      "id": 123,
      "text": "集中は筋肉のように鍛えられる。",
      ...
    },
    {
      "id": 124,
      "text": "重要な少数へ資源を配分せよ。",
      ...
    }
  ],
  "created_count": 2
}
```

#### PUT /quotes/:id

フレーズを更新

**リクエスト:**

```
PUT /api/quotes/123
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "集中は筋肉のように鍛えることができる。",
  "activity_ids": [2, 6],
  "tag_ids": [10],
  "is_public": true,
  "reference_link": "https://example.com/updated-article"
}
```

**レスポンス:**

```json
{
  "quote": {
    "id": 123,
    "text": "集中は筋肉のように鍛えることができる。",
    "activities": [...],
    "tags": [...],
    "updated_at": "2024-10-27T11:00:00Z"
  }
}
```

#### DELETE /quotes/:id

フレーズを削除（論理削除）

**リクエスト:**

```
DELETE /api/quotes/123
Authorization: Bearer <token>
```

**レスポンス:**

```json
{
  "success": true
}
```

#### GET /quotes/public

公開フレーズ一覧を取得（認証不要）

**リクエスト:**

```
GET /api/quotes/public
```

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|----------|-----|------|------|
| limit | int | No | 取得件数（デフォルト: 50） |
| offset | int | No | オフセット（デフォルト: 0） |

**レスポンス:**

```json
{
  "items": [
    {
      "type": "book",
      "book": {
        "id": 1,
        "title": "深い仕事",
        "author": "カル・ニューポート",
        "cover_image_url": "https://..."
      },
      "quotes": [
        {
          "id": 123,
          "text": "集中は筋肉のように...",
          "page_number": 27,
          "is_public": true,
          "reference_link": null,
          "activities": [...],
          "tags": [...],
          "created_at": "2024-10-27T10:00:00Z"
        }
      ]
    },
    {
      "type": "sns",
      "sns_user": {
        "id": 2,
        "platform": "X",
        "handle": "kentaro_dev",
        "display_name": "Kentaro | エンジニア"
      },
      "quotes": [...]
    }
  ],
  "total": 25,
  "has_more": true
}
```

**注**: このエンドポイントは認証不要で、`is_public=true`のフレーズのみを返します。

---

### 2.6 OCR

#### POST /ocr/extract

画像からテキストを抽出

**リクエスト:**

```
POST /api/ocr/extract
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: [画像ファイル]
language: jpn
```

**レスポンス:**

```json
{
  "text": "全体のテキスト",
  "words": [
    {
      "text": "集中",
      "confidence": 0.95,
      "bbox": {
        "x": 100,
        "y": 200,
        "width": 50,
        "height": 20
      }
    },
    ...
  ],
  "lines": [
    {
      "text": "集中は筋肉のように鍛えられる。",
      "bbox": {
        "x": 100,
        "y": 200,
        "width": 400,
        "height": 20
      }
    },
    ...
  ],
  "average_confidence": 0.89
}
```

**注**:
- OCRエンジン: Tesseract.js 5.x（日本語対応）
- `average_confidence`: 抽出されたテキスト全体の平均信頼度（0-1）
- 信頼度が低い場合、ユーザーはOCR結果を編集可能

#### POST /ocr/extract-selection

指定範囲のテキストを抽出

**リクエスト:**

```
POST /api/ocr/extract-selection
Authorization: Bearer <token>
Content-Type: application/json

{
  "ocr_result_id": "cache-key-123",
  "selection": {
    "x": 100,
    "y": 200,
    "width": 400,
    "height": 20
  }
}
```

**レスポンス:**

```json
{
  "text": "集中は筋肉内のように鍛えられる。",
  "confidence": 0.94
}
```

---

### 2.7 エクスポート

#### GET /export/csv

フレーズをCSVでエクスポート

**リクエスト:**

```
GET /api/export/csv
Authorization: Bearer <token>
```

**クエリパラメータ:**
同じ検索・フィルター条件（`/quotes` と同じ）

**レスポンス:**

```
Content-Type: text/csv
Content-Disposition: attachment; filename="quotes_export_20241027.csv"

フレーズ,出典,活動領域,タグ,登録日時
"集中は筋肉のように鍛えられる。","深い仕事 - カル・ニューポート (p.27)","学習・研究","#集中,#習慣","2024-10-27 10:00:00"
...
```

---

## 3. エラーコード

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| UNAUTHORIZED | 401 | 認証エラー |
| FORBIDDEN | 403 | アクセス権限なし |
| NOT_FOUND | 404 | リソースが見つからない |
| VALIDATION_ERROR | 400 | バリデーションエラー |
| DUPLICATE_ERROR | 409 | 重複エラー（既に存在） |
| RATE_LIMIT_ERROR | 429 | レート制限超過 |
| EXTERNAL_API_ERROR | 502 | 外部API（Amazon, Google）エラー |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

---

## 4. レート制限

### 4.1 制限値

- 一般エンドポイント：100リクエスト/分/ユーザー
- Amazon書籍情報取得：10リクエスト/分/ユーザー
- SNS情報取得：10リクエスト/分/ユーザー
- OCR：20リクエスト/分/ユーザー

### 4.2 レスポンスヘッダー

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698412800
```

---

## 5. ページネーション

### 5.1 オフセットベース

```
GET /api/quotes?limit=50&offset=100
```

### 5.2 レスポンス

```json
{
  "quotes": [...],
  "total": 400,
  "limit": 50,
  "offset": 100,
  "has_more": true
}
```

---

## 6. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0 | 2024-10-27 | 初版作成 | - |
| 2.0 | 2024-10-27 | 活動領域固定、アイコン画像削除、CSVエクスポート追加 | - |
| 2.1 | 2024-11-14 | FastAPIへ完全移行、Next.js API Routes削除 | - |
| 2.2 | 2024-11-15 | 公開フラグ機能追加（is_public）、参考リンク機能追加（reference_link） | - |
| 2.3 | 2024-11-16 | SNSユーザー情報取得の警告機能追加 | - |
| 2.4 | 2024-11-17 | OCRエンジンをTesseractに変更、average_confidence追加 | - |
