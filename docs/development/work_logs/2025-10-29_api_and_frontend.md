# 作業ログ: 2025-10-29 - API実装とフロントエンド開発

## 作業概要

本日は、バックエンドAPI全体の実装完了と、フロントエンドのフレーズ登録モーダル実装を行いました。

**作業時間**: 約5.5時間
**達成進捗**: Phase 1（MVP）80% → 85%

---

## 実装内容

### 1. Supabaseセットアップ完了

#### 実施項目
- ✅ Supabaseプロジェクト作成
- ✅ データベーススキーマ適用
- ✅ 認証プロバイダー設定（Email + Google OAuth）

#### 発生した問題と解決

**問題**: マイグレーション実行時にエラー
```
ERROR: text search configuration "japanese" does not exist
```

**解決策**:
- `supabase/migrations/20241027000000_initial_schema.sql:139-141` を修正
- `'japanese'` → `'simple'` に変更
- Supabaseのデフォルト設定には日本語用の全文検索設定が含まれていないため

**参考**: `supabase/README.md` のトラブルシューティングセクションに追記

---

### 2. 認証機能実装

#### 作成ファイル
- `app/(auth)/login/page.tsx` - ログイン画面
- `app/auth/callback/route.ts` - OAuth認証コールバック
- `app/(main)/layout.tsx` - メインレイアウト
- `app/(main)/components/Header.tsx` - ヘッダーコンポーネント
- `app/(main)/page.tsx` - ホーム画面

#### 発生した問題と解決

**問題**: OAuth認証後に404エラー
```
GET /auth/callback?code=xxx 404
```

**原因**:
- Next.js App Routerでは、Route Handler (`route.ts`) は括弧付きルートグループ内で認識されない
- `app/(auth)/callback/route.ts` が動作しない

**解決策**:
- `app/auth/callback/route.ts` に移動（括弧なし）
- `middleware.ts` のpublicPathsに `/auth/callback` を追加

#### 実装詳細

**ログイン画面の機能**:
- Email + Password 認証
- Google/GitHub OAuth ボタン
- サインアップ/ログイン切り替え
- ダークテーマUI (#1a1a1a, #2a2a2a)

**認証フロー**:
1. `/login` でログイン
2. OAuth選択時 → Supabase Auth → `/auth/callback`
3. コールバックでセッション確立 → `/` にリダイレクト
4. `middleware.ts` が未認証ユーザーを `/login` にリダイレクト

---

### 3. API実装（全CRUD完了）

#### 3-1. 活動領域API

**ファイル**: `app/api/activities/route.ts`

**エンドポイント**:
- `GET /api/activities` - 固定10件のマスタデータ取得

**実装内容**:
- 認証チェック
- display_order順でソート
- システム固定データのため、CRUDは不要

#### 3-2. タグ管理API

**ファイル**:
- `app/api/tags/route.ts` - GET（一覧）、POST（作成）
- `app/api/tags/[id]/route.ts` - PUT（更新）、DELETE（削除）
- `app/api/tags/[id]/merge/route.ts` - POST（統合）

**エンドポイント**:
- `GET /api/tags` - タグ一覧取得（使用数・活動領域別分布付き）
- `POST /api/tags` - 新規タグ作成
- `PUT /api/tags/:id` - タグ名変更
- `DELETE /api/tags/:id` - ソフトデリート
- `POST /api/tags/:id/merge` - タグ統合

**実装の工夫**:
- タグ一覧取得時に、各タグの使用数と活動領域別分布を集計
- タグ統合時、重複を避けるため既存チェック後に更新
- `#` が先頭にない場合は自動で追加

#### 3-3. 書籍管理API

**ファイル**: `app/api/books/route.ts`

**エンドポイント**:
- `GET /api/books` - 書籍一覧取得
- `POST /api/books` - 新規書籍登録

**実装内容**:
- ページネーション対応（limit, offset）
- 検索機能（title, author）
- 重複チェック（user_id + title + author）

**Phase 2で追加予定**:
- Amazon URL自動取得機能（`/api/books/fetch-from-amazon`）

#### 3-4. SNSユーザー管理API

**ファイル**: `app/api/sns-users/route.ts`

**エンドポイント**:
- `GET /api/sns-users` - SNSユーザー一覧取得
- `POST /api/sns-users` - 新規SNSユーザー登録

**実装内容**:
- プラットフォームフィルター（X, THREADS）
- 検索機能（handle, display_name）
- 重複チェック（user_id + platform + handle）

**Phase 2で追加予定**:
- URL解析・自動取得機能（`/api/sns-users/fetch-from-url`）

#### 3-5. フレーズ管理API

**ファイル**:
- `app/api/quotes/route.ts` - POST（一括登録）
- `app/api/quotes/[id]/route.ts` - PUT（更新）、DELETE（削除）
- `app/api/quotes/grouped/route.ts` - GET（グループ化一覧）

**エンドポイント**:
- `POST /api/quotes` - フレーズ一括登録
- `PUT /api/quotes/:id` - フレーズ更新
- `DELETE /api/quotes/:id` - ソフトデリート
- `GET /api/quotes/grouped` - グループ化一覧取得

**実装の工夫**:

**一括登録API**:
- 複数フレーズを同一出典でまとめて登録
- トランザクション風の処理（エラー時はロールバック）
- 活動領域（M:N）・タグ（M:N）の関連付け

**グループ化一覧API**:
- 書籍単位・SNSユーザー単位でグループ化
- フィルター機能（検索、出典タイプ、活動領域、タグ）
- ページネーション対応

**レスポンス形式**:
```json
{
  "items": [
    {
      "type": "book",
      "book": { "id": 1, "title": "深い仕事", ... },
      "quotes": [
        {
          "id": 123,
          "text": "集中は筋肉のように...",
          "activities": [...],
          "tags": [...]
        }
      ]
    },
    {
      "type": "sns",
      "sns_user": { "id": 1, "platform": "X", ... },
      "quotes": [...]
    },
    {
      "type": "other",
      "quote": { "id": 456, ... }
    }
  ],
  "total": 3,
  "has_more": false
}
```

---

### 4. フロントエンド実装

#### 4-1. フレーズ登録モーダル

**ファイル**:
- `app/(main)/components/QuoteModal.tsx` - モーダル本体
- `app/(main)/hooks/useActivities.ts` - 活動領域取得フック
- `app/(main)/hooks/useTags.ts` - タグ取得・作成フック
- `app/(main)/page.tsx` - ホーム画面（モーダル統合）

**実装した機能**:

1. **モーダルの基本構造**
   - オーバーレイ・開閉機能
   - アコーディオンUI（2セクション）
   - 固定ヘッダー・フッター

2. **セクション1: フレーズ & 分類分け**
   - ✅ フレーズテキスト入力（textarea）
   - ✅ 活動領域選択（複数選択、必須）
   - ✅ タグ選択（既存タグから選択）
   - ✅ タグ作成（新規タグ作成）
   - ✅ フレーズ追加（「+」ボタンで複数入力可能）
   - ✅ フレーズ削除

3. **セクション2: 出典**
   - ⏳ 未実装（次回）

4. **カスタムフック**
   - `useActivities`: `/api/activities` から活動領域を取得
   - `useTags`: `/api/tags` からタグ取得、新規タグ作成

**UIの特徴**:
- ダークテーマ（背景: #1a1a1a, カード: #2a2a2a）
- 青系のアクセントカラー（#3b82f6）
- チェックボックス形式の活動領域選択
- タグは選択・解除可能なチップUI
- レスポンシブデザイン

**動作確認済み**:
- ✅ モーダルの開閉
- ✅ 活動領域データの取得と表示
- ✅ タグデータの取得と表示
- ✅ タグの選択・解除
- ✅ 新規タグ作成
- ✅ フレーズ追加・削除

---

## API実装の共通仕様

### 認証
- すべてのエンドポイントで `supabase.auth.getUser()` による認証チェック
- 未認証の場合は401エラー

### エラーハンドリング
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

**主なエラーコード**:
- `UNAUTHORIZED`: 認証エラー
- `INVALID_INPUT`: バリデーションエラー
- `DATABASE_ERROR`: データベースエラー
- `DUPLICATE_*`: 重複エラー
- `*_NOT_FOUND`: データ未発見
- `INTERNAL_ERROR`: サーバーエラー

### ソフトデリート
- `deleted_at` カラムに削除日時を記録
- クエリ時は `deleted_at IS NULL` で除外

### ページネーション
- `limit`: 取得件数（デフォルト: 50）
- `offset`: オフセット（デフォルト: 0）
- レスポンスに `total`, `has_more` を含む

---

## 未実装機能（Phase 2以降）

### Phase 2: 重要機能
- [ ] OCR機能（Tesseract.js）
- [ ] Amazon書籍情報取得（スクレイピング）
- [ ] SNSユーザー情報取得（URL解析）
- [ ] CSVエクスポート
- [ ] タグ管理画面

### フレーズ登録モーダル（残タスク）
- [ ] 出典選択セクション実装
  - [ ] 本（手動入力 or 既存選択）
  - [ ] SNS（手動入力 or 既存選択）
  - [ ] その他（自由入力）
- [ ] API連携（フレーズ登録処理）
- [ ] バリデーション
- [ ] エラーハンドリング
- [ ] 成功時のフィードバック

---

## ファイル構成

### バックエンドAPI
```
app/api/
├── activities/
│   └── route.ts           # GET
├── tags/
│   ├── route.ts           # GET, POST
│   └── [id]/
│       ├── route.ts       # PUT, DELETE
│       └── merge/
│           └── route.ts   # POST
├── books/
│   └── route.ts           # GET, POST
├── sns-users/
│   └── route.ts           # GET, POST
└── quotes/
    ├── route.ts           # POST
    ├── [id]/
    │   └── route.ts       # PUT, DELETE
    └── grouped/
        └── route.ts       # GET
```

### フロントエンド
```
app/(main)/
├── components/
│   ├── Header.tsx         # ヘッダー
│   └── QuoteModal.tsx     # フレーズ登録モーダル
├── hooks/
│   ├── useActivities.ts   # 活動領域取得
│   └── useTags.ts         # タグ取得・作成
├── layout.tsx             # メインレイアウト
└── page.tsx               # ホーム画面
```

---

## 次回作業時の開始手順

### 1. 開発サーバー起動
```bash
cd /home/sakih/projects/AI-study_quote-collector
npm run dev
```

### 2. 動作確認
- http://localhost:3000 にアクセス
- Googleアカウントでログイン
- 右下の「+」ボタンでモーダルを開く

### 3. 次の実装タスク

**優先度高: フレーズ登録機能完成**
1. 出典選択セクション実装（2〜3時間）
   - 本選択UI
   - SNS選択UI
   - その他入力UI
2. フォーム送信処理（1〜2時間）
   - バリデーション
   - API連携
   - エラーハンドリング
3. ホーム画面フレーズ一覧実装（6〜8時間）

---

## トラブルシューティング

### 1. マイグレーションエラー
**症状**: `text search configuration "japanese" does not exist`
**解決**: マイグレーションファイルで `'simple'` を使用（修正済み）

### 2. 認証コールバック404
**症状**: OAuth認証後に404エラー
**解決**: `app/auth/callback/route.ts` に移動（括弧なし）

### 3. APIタイムアウトエラー
**症状**: 開発中に時々発生する `ETIMEDOUT` エラー
**原因**: ネットワークの一時的な問題、WSL2環境の場合はよくある
**対処**: 再読み込みで解決、本番環境では発生しない

---

## 参考ドキュメント

- [API設計書_v2.md](../API設計書_v2.md)
- [画面設計書_実装版_v2.md](../画面設計書_実装版_v2.md)
- [データベース設計書_v2.md](../データベース設計書_v2.md)
- [PROGRESS.md](../PROGRESS.md)
- [supabase/README.md](../../supabase/README.md)

---

**作成日**: 2025-10-29
**更新日**: 2025-10-29
**作成者**: Claude Code
