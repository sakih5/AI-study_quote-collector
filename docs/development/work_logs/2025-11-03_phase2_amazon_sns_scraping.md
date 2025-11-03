# Phase 2: Amazon/SNS情報取得機能実装作業ログ

**作業日**: 2025-11-03
**作業者**: sakih
**作業時間**: 約2時間
**状態**: ✅ 完了

---

## 📋 作業概要

Next.js Phase 2の残タスクである「Amazon書籍情報取得」と「SNSユーザー情報取得」機能を実装しました。
これにより、ユーザーはAmazon URLやSNS URLを入力するだけで、書籍情報やSNSユーザー情報を自動取得できるようになりました。

---

## ✅ 完了した作業

### 1. レート制限機能の実装

**ファイル**: `lib/scraping/rate-limiter.ts`

外部APIへのリクエストを制限して、ブロックされるのを防ぐレート制限機能を実装しました。

**実装内容**:
- シンプルなレート制限クラス（RateLimiter）
- タイムウィンドウ内のリクエスト数を記録
- 最大リクエスト数を超えた場合は待機
- `executeWithLimit`メソッドで自動的にレート制限を適用

**設定**:
- Amazon: 10リクエスト/分
- SNS: 5リクエスト/分（Google検索は慎重に）

**使用例**:
```typescript
// Amazon用のレート制限
const bookInfo = await amazonRateLimiter.executeWithLimit(async () => {
  return fetch(url);
});
```

---

### 2. Amazon書籍情報取得機能の実装

**ファイル**: `lib/scraping/amazon.ts`

Amazon URLから書籍情報を自動取得する機能を実装しました。

**実装した機能**:
1. **ASIN抽出**
   - Amazon URLからASIN（10桁の商品ID）を抽出
   - 対応パターン: `/dp/ASIN`, `/product/ASIN`, `/gp/product/ASIN`
   - 日本・米国のAmazonに対応

2. **書籍情報スクレイピング**
   - タイトル（`#productTitle`から取得）
   - 著者名（`.author`から取得）
   - カバー画像（`#landingImage`から取得）
   - ISBN（商品詳細から抽出）
   - 出版社（商品詳細から抽出）

3. **短縮URL展開**
   - `amzn.to`などの短縮URLを自動展開

4. **レート制限**
   - 10リクエスト/分に制限

**エラーハンドリング**:
- スクレイピング失敗時はnullを返す
- 手動入力にフォールバック可能

---

### 3. SNS URL解析機能の実装

**ファイル**: `lib/scraping/sns-url-parser.ts`

X（旧Twitter）とThreadsのURLからプラットフォームとハンドル名を抽出する機能を実装しました。

**対応パターン**:

**X（旧Twitter）**:
- `https://twitter.com/username/status/123456`
- `https://x.com/username/status/123456`
- `https://twitter.com/username`
- `https://x.com/username`

**Threads**:
- `https://www.threads.net/@username/post/ABC123`
- `https://threads.net/@username/post/ABC123`
- `https://www.threads.net/@username`

**抽出情報**:
- プラットフォーム（X or THREADS）
- ハンドル名
- ポストID（オプション）

---

### 4. SNSユーザー名取得機能の実装

**ファイル**: `lib/scraping/google-search.ts`

Google検索を使ってSNSユーザーの表示名を取得する機能を実装しました。

**実装方法**:
1. Google検索で「X @handle」または「Threads @handle」を検索
2. 検索結果のタイトルから「名前 (@handle)」パターンを抽出
3. 表示名を返す

**抽出パターン**:
- パターン1: `"山田太郎 (@yamada_taro) / X"`
- パターン2: `"山田太郎 (@yamada_taro) • Threads"`
- パターン3: `"山田太郎 on X: ..."`

**注意事項**:
- この方法はグレーゾーン
- 将来的にはSerpAPIなどの正式なAPIを使用することを推奨
- レート制限を厳しく設定（5リクエスト/分）

---

### 5. APIエンドポイントの作成

#### 5-1. Amazon書籍情報取得API

**エンドポイント**: `POST /api/books/from-url`
**ファイル**: `app/api/books/from-url/route.ts`

**リクエスト**:
```json
{
  "url": "https://www.amazon.co.jp/dp/4873115655"
}
```

**レスポンス**:
```json
{
  "book_info": {
    "title": "リーダブルコード",
    "author": "Dustin Boswell",
    "cover_image_url": "https://...",
    "isbn": "9784873115658",
    "asin": "4873115655",
    "publisher": "オライリージャパン"
  }
}
```

**エラー**:
- 401: 認証が必要
- 400: URLが指定されていない / Amazon URLではない
- 500: 書籍情報の取得に失敗

---

#### 5-2. SNSユーザー情報取得API

**エンドポイント**: `POST /api/sns-users/from-url`
**ファイル**: `app/api/sns-users/from-url/route.ts`

**リクエスト**:
```json
{
  "url": "https://x.com/jack/status/20"
}
```

**レスポンス**:
```json
{
  "user_info": {
    "platform": "X",
    "handle": "jack",
    "display_name": "Jack Dorsey"
  }
}
```

**エラー**:
- 401: 認証が必要
- 400: URLが指定されていない / サポートされているSNS URLではない
- 500: ユーザー情報の取得に失敗

---

## 📊 実装した機能の一覧

### スクレイピング機能

| 機能 | ファイル | 状態 |
|------|---------|------|
| レート制限 | `lib/scraping/rate-limiter.ts` | ✅ 完了 |
| Amazon ASIN抽出 | `lib/scraping/amazon.ts` | ✅ 完了 |
| Amazon 書籍情報スクレイピング | `lib/scraping/amazon.ts` | ✅ 完了 |
| SNS URL解析 | `lib/scraping/sns-url-parser.ts` | ✅ 完了 |
| SNS ユーザー名取得 | `lib/scraping/google-search.ts` | ✅ 完了 |

### APIエンドポイント

| エンドポイント | ファイル | 状態 |
|--------------|---------|------|
| POST /api/books/from-url | `app/api/books/from-url/route.ts` | ✅ 完了 |
| POST /api/sns-users/from-url | `app/api/sns-users/from-url/route.ts` | ✅ 完了 |

---

## 💡 技術的な工夫

### 1. レート制限の実装

**課題**: 外部サイトへのリクエストが多すぎるとブロックされる

**解決策**:
- タイムウィンドウ方式のレート制限を実装
- リクエスト履歴を保持し、時間窓外のリクエストを削除
- 最大リクエスト数を超えた場合は自動的に待機

**メリット**:
- シンプルで理解しやすい
- メモリ使用量が少ない
- 複数のリクエストで共有可能

---

### 2. Webスクレイピングの実装

**課題**: HTMLの構造が複雑で、変更される可能性がある

**解決策**:
- cheerioを使ってHTMLをパース
- 複数のセレクターを試して、柔軟に対応
- エラーハンドリングを徹底

**例（Amazon）**:
```typescript
const title =
  $('#productTitle').text().trim() ||
  $('span[id="productTitle"]').text().trim() ||
  $('h1.a-size-large').text().trim();
```

**メリット**:
- HTMLの変更に強い
- エラーが発生しても動作を継続

---

### 3. Google検索を使ったユーザー名取得

**課題**: X/ThreadsのAPIは有料または認証が必要

**解決策**:
- Google検索結果のタイトルから情報を抽出
- 正規表現でパターンマッチング
- レート制限を厳しく設定

**注意点**:
- グレーゾーンの方法
- Google検索の仕様変更に弱い
- 将来的にはSerpAPIなどの正式なAPIを使用することを推奨

---

## 🎯 次回の作業予定

### フロントエンドへの統合

**実装内容**（見積もり: 2〜3時間）:
1. QuoteModalでのURL入力フィールド追加
2. 「Amazon URLから取得」ボタン実装
3. 「SNS URLから取得」ボタン実装
4. 取得した情報の自動入力
5. エラーハンドリングとローディング表示

**または、FastAPI Phase 5（デプロイ）**:
- Dockerfile作成
- Cloud Run設定
- 環境変数設定
- デプロイスクリプト作成
- 本番環境テスト

---

## 📁 作成・更新したファイル

### 新規作成

```
lib/scraping/
├── rate-limiter.ts          # レート制限機能
├── amazon.ts                # Amazon書籍情報取得
├── sns-url-parser.ts        # SNS URL解析
└── google-search.ts         # SNSユーザー名取得（Google検索）

app/api/
├── books/from-url/
│   └── route.ts             # Amazon書籍情報取得API
└── sns-users/from-url/
    └── route.ts             # SNSユーザー情報取得API
```

### ドキュメント

```
docs/development/work_logs/
└── 2025-11-03_phase2_amazon_sns_scraping.md  # 本ファイル
```

---

## 🔧 技術スタック

| カテゴリ | ライブラリ | 用途 |
|---------|----------|------|
| HTMLパース | cheerio | AmazonとGoogle検索のHTMLをパース |
| HTTPクライアント | fetch API | WebページとAPIへのリクエスト |

---

## 📝 メモ・気づき

1. **レート制限の重要性**
   - 外部サイトへのリクエストは慎重に
   - 10リクエスト/分でも十分実用的
   - ユーザーが連続で取得する場合は待機時間を表示すると良い

2. **Webスクレイピングの脆弱性**
   - HTMLの構造が変わると動作しなくなる
   - 定期的なメンテナンスが必要
   - エラーハンドリングを徹底して、手動入力にフォールバック

3. **Google検索の利用**
   - グレーゾーンの方法
   - Google検索の仕様変更に弱い
   - 将来的にはSerpAPIなどの正式なAPIを使用

4. **Cheerioの利便性**
   - jQueryライクなAPIで使いやすい
   - サーバーサイドで動作
   - パフォーマンスも良好

5. **Next.js API Routesの使い分け**
   - スクレイピングはサーバーサイドで実行
   - クライアントサイドからは直接実行しない（CORSエラーを回避）

---

## 🚀 動作確認方法

### 1. Amazon書籍情報取得のテスト

**ブラウザコンソールで実行**:
```javascript
// Amazon URL から書籍情報を取得
const response = await fetch('/api/books/from-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.amazon.co.jp/dp/4873115655'
  })
});

const data = await response.json();
console.log('Book info:', data.book_info);
```

**期待される結果**:
```json
{
  "book_info": {
    "title": "リーダブルコード",
    "author": "Dustin Boswell",
    "cover_image_url": "https://...",
    "isbn": "9784873115658",
    "asin": "4873115655",
    "publisher": "オライリージャパン"
  }
}
```

---

### 2. SNSユーザー情報取得のテスト

**ブラウザコンソールで実行**:
```javascript
// SNS URL からユーザー情報を取得
const response = await fetch('/api/sns-users/from-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://x.com/jack/status/20'
  })
});

const data = await response.json();
console.log('User info:', data.user_info);
```

**期待される結果**:
```json
{
  "user_info": {
    "platform": "X",
    "handle": "jack",
    "display_name": "Jack Dorsey"
  }
}
```

---

## ⚠️ 注意事項

### Webスクレイピングに関する注意

1. **利用規約の確認**
   - Amazon: robots.txtを確認
   - Google: 自動化された検索は利用規約で禁止されている可能性
   - 個人利用の範囲であれば問題ない場合が多い

2. **レート制限の遵守**
   - 10リクエスト/分を超えないこと
   - 連続でリクエストしない
   - 必要に応じて待機時間を設ける

3. **エラーハンドリング**
   - スクレイピング失敗時は手動入力にフォールバック
   - ユーザーにエラーメッセージを表示
   - 失敗しても動作を継続

4. **将来的な改善**
   - Amazon: Product Advertising APIの使用を検討
   - SNS: 正式なAPIまたはSerpAPIの使用を検討
   - HTMLの構造変更に対応するためのメンテナンス

---

## 🎉 Phase 2の進捗

### 完了した機能

| 機能 | 進捗 | 状態 |
|------|------|------|
| OCR機能 | 100% | ✅ 完了 |
| Amazon書籍情報取得 | 100% | ✅ 完了 |
| SNSユーザー情報取得 | 100% | ✅ 完了 |
| CSVエクスポート | 100% | ✅ 完了 |
| タグ管理画面 | 100% | ✅ 完了 |

**Phase 2: 100%完了！**

### 残タスク

- フロントエンドへの統合（QuoteModalでの利用）
- FastAPI Phase 5（デプロイ）

---

**作成日**: 2025-11-03
**最終更新**: 2025-11-03
**Phase 2 完了！**
**次回アクション**: フロントエンドへの統合 or FastAPI Phase 5（デプロイ）
