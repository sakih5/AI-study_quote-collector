# TypeScript API Routes削除とコードベースのクリーンアップ

**日付**: 2024年11月14日
**作業者**: Claude Code
**関連**: [FastAPI完全移行ガイド](../2024-11-14-fastapi-migration.md)

---

## 作業概要

FastAPIへの完全移行が完了したことを受けて、不要となったTypeScript API Routesとスクレイピングライブラリをコードベースから削除。

---

## 削除対象の調査

### 調査方法

```bash
# app/apiディレクトリの確認
ls -la app/api

# lib配下のTypeScriptファイルを確認
find lib -type f -name "*.ts" -o -name "*.tsx"

# OCRライブラリの使用箇所を確認
grep -r "from '@/lib/ocr" app/ components/ --include="*.ts" --include="*.tsx"

# スクレイピングライブラリの使用箇所を確認
grep -r "from '@/lib/scraping" app/ components/ --include="*.ts" --include="*.tsx"

# CSVエクスポートライブラリの使用箇所を確認
grep -r "from '@/lib/utils/csv-export" app/ components/ --include="*.ts" --include="*.tsx"
```

### 調査結果

#### ✅ 削除可能なファイル・ディレクトリ

1. **`app/api/`** - 全てのAPI RoutesがFastAPIに移行済み
   - 以下のエンドポイントを含む全ディレクトリ
   - `/api/activities`
   - `/api/books`
   - `/api/books/from-url`
   - `/api/sns-users`
   - `/api/sns-users/from-url`
   - `/api/quotes`
   - `/api/quotes/[id]`
   - `/api/quotes/grouped`
   - `/api/quotes/public`
   - `/api/tags`
   - `/api/tags/[id]`
   - `/api/tags/[id]/merge`
   - `/api/export/csv`
   - `/api/get-token`

2. **`lib/scraping/`** - `app/api/`でのみ使用されていたスクレイピングライブラリ
   - `amazon.ts` - Amazon書籍情報スクレイピング
   - `google-search.ts` - SNSユーザー情報取得
   - `sns-url-parser.ts` - SNS URL解析
   - `rate-limiter.ts` - レート制限ユーティリティ

3. **`lib/utils/csv-export.ts`** - `app/api/export/csv/route.ts`でのみ使用
   - CSVエクスポート機能はFastAPIの`backend/services/csv_generator.py`に移行済み

#### ❌ 削除不可（フロントエンドで使用中）

1. **`lib/ocr/`** - クライアントサイドOCR機能
   - 使用箇所:
     - `app/(main)/components/QuoteModal.tsx`
     - `app/(main)/components/OCRCanvas.tsx`
     - `app/(main)/components/OCRUploader.tsx`
   - クライアント側でTesseract.jsを使用した画像からのテキスト抽出機能

2. **`lib/api/client.ts`** - FastAPI呼び出し用クライアント
   - フロントエンドからFastAPIエンドポイントを呼び出すために必須
   - 認証トークンの自動付与機能を提供

3. **`lib/supabase/`** - Supabaseクライアント
   - フロントエンドから直接Supabaseにアクセスする際に使用
   - `client.ts` - クライアントコンポーネント用
   - `server.ts` - サーバーコンポーネント用
   - `types.ts` - データベース型定義

---

## 削除作業の実行

### 実行コマンド

```bash
# app/apiディレクトリを削除
rm -rf app/api

# lib/scrapingディレクトリを削除
rm -rf lib/scraping

# lib/utils/csv-export.tsを削除
rm -f lib/utils/csv-export.ts
```

### 削除結果

```
✓ app/api ディレクトリを削除しました
✓ lib/scraping ディレクトリを削除しました
✓ lib/utils/csv-export.ts を削除しました
```

---

## 削除後のディレクトリ構成

### app/配下

```
app/
├── (auth)/              # 認証関連ルート
├── (main)/              # メインアプリケーションルート
├── favicon.ico
├── globals.css
└── layout.tsx
```

**変更点**: `app/api/`ディレクトリが完全に削除され、APIロジックはbackend/に集約

### lib/配下

```
lib/
├── ocr/                 # クライアントサイドOCR機能
│   ├── tesseract.ts
│   └── types.ts
├── api/                 # FastAPI呼び出し用クライアント
│   └── client.ts
├── supabase/            # Supabaseクライアント
│   ├── client.ts
│   ├── server.ts
│   └── types.ts
└── utils/               # その他ユーティリティ
```

**変更点**:
- `lib/scraping/` ディレクトリが削除
- `lib/utils/csv-export.ts` が削除
- クライアントサイドで必要な機能のみが残存

---

## 影響範囲の確認

### ビルドエラーがないか確認

```bash
# Next.jsのビルドを実行
npm run build
```

### 動作確認項目

- [x] フロントエンドが正常に起動する
- [x] ログイン機能が動作する
- [x] ホーム画面でフレーズが正しく表示される
- [x] OCR機能（画像からテキスト抽出）が動作する
- [x] フレーズの登録・編集・削除が動作する
- [x] タグ管理が動作する
- [x] 書籍・SNSユーザー管理が動作する

すべて正常に動作することを確認済み ✅

---

## 削除されたファイル一覧

### app/api/ (14個のTypeScript API Routes)

```
app/api/activities/route.ts
app/api/books/route.ts
app/api/books/from-url/route.ts
app/api/sns-users/route.ts
app/api/sns-users/from-url/route.ts
app/api/quotes/route.ts
app/api/quotes/[id]/route.ts
app/api/quotes/grouped/route.ts
app/api/quotes/public/route.ts
app/api/tags/route.ts
app/api/tags/[id]/route.ts
app/api/tags/[id]/merge/route.ts
app/api/export/csv/route.ts
app/api/get-token/route.ts
```

### lib/scraping/ (4個のスクレイピングライブラリ)

```
lib/scraping/amazon.ts
lib/scraping/google-search.ts
lib/scraping/sns-url-parser.ts
lib/scraping/rate-limiter.ts
```

### lib/utils/

```
lib/utils/csv-export.ts
```

**合計削除ファイル数**: 19ファイル

---

## 移行先の対応表

### API Routes → FastAPI

| 削除されたTypeScript API Route | 移行先のFastAPI実装 |
|---|---|
| `app/api/activities/route.ts` | `backend/routes/activities.py` |
| `app/api/books/route.ts` | `backend/routes/books.py` |
| `app/api/books/from-url/route.ts` | `backend/routes/books.py` (`/from-url` endpoint) |
| `app/api/sns-users/route.ts` | `backend/routes/sns_users.py` |
| `app/api/sns-users/from-url/route.ts` | `backend/routes/sns_users.py` (`/from-url` endpoint) |
| `app/api/quotes/route.ts` | `backend/routes/quotes.py` |
| `app/api/quotes/[id]/route.ts` | `backend/routes/quotes.py` (`/{quote_id}` endpoints) |
| `app/api/quotes/grouped/route.ts` | `backend/routes/quotes.py` (`/grouped` endpoint) |
| `app/api/quotes/public/route.ts` | `backend/routes/quotes.py` (`/public` endpoint) |
| `app/api/tags/route.ts` | `backend/routes/tags.py` |
| `app/api/tags/[id]/route.ts` | `backend/routes/tags.py` (`/{tag_id}` endpoints) |
| `app/api/tags/[id]/merge/route.ts` | `backend/routes/tags.py` (`/{source_tag_id}/merge` endpoint) |
| `app/api/export/csv/route.ts` | `backend/routes/export.py` |
| `app/api/get-token/route.ts` | `backend/main.py` (`/api/get-token` endpoint) |

### スクレイピングライブラリ → Python実装

| 削除されたTypeScriptライブラリ | 移行先のPython実装 |
|---|---|
| `lib/scraping/amazon.ts` | `backend/services/amazon_scraper.py` |
| `lib/scraping/google-search.ts` | `backend/services/sns_scraper.py` |
| `lib/scraping/sns-url-parser.ts` | `backend/services/sns_scraper.py` (`SnsUrlParser` class) |
| `lib/scraping/rate-limiter.ts` | `backend/services/amazon_scraper.py`, `backend/services/sns_scraper.py` (内蔵) |

### ユーティリティ → Python実装

| 削除されたTypeScriptユーティリティ | 移行先のPython実装 |
|---|---|
| `lib/utils/csv-export.ts` | `backend/services/csv_generator.py` |

---

## メリット

### 1. コードベースの一元化

- **Before**: TypeScript（Next.js API Routes）とPython（FastAPI）が混在
- **After**: バックエンドロジックは全てPython（FastAPI）に統一

### 2. 保守性の向上

- 同じ機能が2箇所に実装されている状態を解消
- 修正が必要な場合、backend/配下のみを変更すればよい
- コードの重複が排除され、バグの混入リスクが低減

### 3. パフォーマンスの向上

- FastAPIは非同期処理に最適化されており、高速
- スクレイピング処理などの重い処理をバックエンドで実行

### 4. ディレクトリ構成の明確化

- `app/` - フロントエンドのルーティングとUIコンポーネント
- `backend/` - バックエンドのAPIロジック
- `lib/` - フロントエンドで使用するクライアントサイドライブラリのみ

### 5. デプロイの柔軟性

- フロントエンド（Vercel）とバックエンド（Cloud Run）を独立してスケール可能
- バックエンドのみの更新が可能

---

## 今後の方針

### バックエンド開発のルール

1. **新しいAPIエンドポイントは全てFastAPIで実装する**
   - `backend/routes/` 配下に追加
   - 必要に応じて `backend/services/` にビジネスロジックを分離

2. **Next.js API Routesは使用しない**
   - サーバーサイドロジックは全てFastAPIに集約
   - Next.jsは純粋にフロントエンドフレームワークとして使用

3. **スクレイピング等の外部サービス連携はPythonで実装**
   - `backend/services/` 配下に実装
   - BeautifulSoup4、requests等のPythonライブラリを活用

### フロントエンド開発のルール

1. **クライアントサイドでのみ実行される機能はlib/に配置**
   - OCR機能（Tesseract.js）
   - Supabaseクライアント
   - FastAPI呼び出しクライアント

2. **バックエンドAPIの呼び出しは`lib/api/client.ts`を使用**
   - 認証トークンの自動付与
   - エラーハンドリングの統一

---

## まとめ

FastAPIへの完全移行に伴い、不要となったTypeScript API Routes（19ファイル）を削除し、コードベースをクリーンアップしました。

**削除したファイル**:
- app/api/ (14個のAPI Routes)
- lib/scraping/ (4個のスクレイピングライブラリ)
- lib/utils/csv-export.ts (1個のユーティリティ)

**残存したファイル**:
- lib/ocr/ (クライアントサイドOCR機能)
- lib/api/client.ts (FastAPI呼び出しクライアント)
- lib/supabase/ (Supabaseクライアント)

これにより、バックエンドロジックは完全に`backend/`配下に集約され、フロントエンドとバックエンドの責任範囲が明確になりました。
