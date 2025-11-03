# Phase 2: フロントエンド統合（部分完了）作業ログ

**作業日**: 2025-11-03
**作業者**: sakih
**作業時間**: 約3時間
**状態**: ⚠️ 部分完了（SNS表示名取得は保留）

---

## 📋 作業概要

Next.js Phase 2で実装したAmazon/SNS情報取得APIをフロントエンド（QuoteModal）に統合する作業を実施しました。
Amazon書籍情報取得は完全に動作していますが、SNS表示名の自動取得については技術的制約により保留となりました。

---

## ✅ 完了した作業

### 1. threads.com ドメインへの対応

**ファイル**: `lib/scraping/sns-url-parser.ts`

ユーザーからの要望で、ThreadsのURLパターンに `threads.com` を追加：

```typescript
// 修正前: threads.net のみ
/threads\.net\/@([^\/]+)\/post\/([A-Za-z0-9_-]+)/

// 修正後: threads.net と threads.com の両方に対応
/threads\.(?:net|com)\/@([^\/]+)\/post\/([A-Za-z0-9_-]+)/
```

**対応URL例**:
- `https://www.threads.com/@zuck/post/DQEmdfkkSNE?xmt=...`
- `https://www.threads.net/@username/post/ABC123`

**変更箇所**:
- `parseThreadsUrl()` 関数の正規表現: `lib/scraping/sns-url-parser.ts:77`
- `parseSnsUrl()` 関数の条件分岐: `lib/scraping/sns-url-parser.ts:106`
- `isThreadsUrl()` 関数の判定: `lib/scraping/sns-url-parser.ts:124`

---

### 2. QuoteModalのUIプレースホルダー更新

**ファイル**: `app/(main)/components/QuoteModal.tsx:927`

SNS URL入力フィールドのプレースホルダーに `threads.com` の例を追加：

```typescript
placeholder="例: https://x.com/username/status/... または https://www.threads.com/@username/post/..."
```

---

## ⚠️ SNS表示名自動取得の試行錯誤

### 試行1: Google検索経由での取得（失敗）

**実装内容**:
- Google検索で「X @handle」を検索
- 検索結果の`<h3>`タグから表示名を抽出

**結果**: 失敗
```
[DEBUG] X User Search Results:
  Query: X @kabasawa
  Found titles: 0
  Extracted display name: (none)
```

**原因**: Googleがbotとして検出し、検索結果をブロック

---

### 試行2: プロフィールページから直接取得（失敗）

**実装内容**:
- `https://x.com/{handle}` に直接アクセス
- HTMLの`<title>`タグから表示名を抽出

**コード** (`lib/scraping/google-search.ts:80-105`):
```typescript
async function fetchXProfilePage(handle: string): Promise<string | null> {
  const url = `https://x.com/${handle}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 ...',
      Accept: 'text/html,application/xhtml+xml,...',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    },
  });
  return response.text();
}
```

**結果**: 失敗
```
[DEBUG] X Profile Page:
  HTML length: 219682
[DEBUG] <title> tag: NOT FOUND
```

**原因**: HTMLは取得できたが、`<title>`タグが存在しない

---

### 試行3: og:titleメタタグとJSONデータから取得（失敗）

**実装内容**:
1. `<meta property="og:title" content="名前 (@handle)" />` から抽出
2. HTMLに埋め込まれたJSONデータから抽出: `"screen_name":"handle","name":"表示名"`

**コード** (`lib/scraping/google-search.ts:67-104`):
```typescript
// 方法1: og:titleメタタグから取得
const ogTitleRegex = /<meta\s+(?:[^>]*?\s+)?property=["']og:title["']\s+content=["']([^"']+)["']/i;
const ogTitleMatch = html.match(ogTitleRegex);

// 方法2: JSONデータから取得
const jsonMatch = html.match(/"screen_name":"([^"]+)","name":"([^"]+)"/);
```

**結果**: 失敗
```
[DEBUG] X Profile Page:
  HTML length: 219682
[DEBUG] og:title search result: NOT FOUND
[DEBUG] og:description: NOT FOUND
[DEBUG] <title> tag: NOT FOUND
```

**原因**: 初期HTMLにはこれらのタグが含まれていない

---

### 根本原因: XはSPA（Single Page Application）

**問題の本質**:
- XはJavaScriptでコンテンツを動的に生成するSPA
- サーバーサイドで`fetch`しても、初期HTMLには最小限の情報しか含まれない
- ブラウザでJavaScriptが実行されて初めてユーザー情報が表示される
- **サーバーサイドからの単純なHTMLスクレイピングでは表示名を取得できない**

**確認されたHTMLの特徴**:
- HTML length: 約220KB（大きいが、ほとんどがJavaScriptコード）
- `<title>`, `og:title`, `og:description` タグが存在しない
- ユーザー情報はJavaScriptで動的に読み込まれる

---

## 🤔 今後の選択肢

### 選択肢1: ヘッドレスブラウザを使用

**方法**: Puppeteer等でブラウザを自動操作し、JavaScriptを実行してから情報を取得

**メリット**:
- 完全な自動化が可能
- ブラウザで見える情報はすべて取得できる

**デメリット**:
- 実装が複雑
- サーバー負荷が高い
- レスポンスが遅い（数秒かかる）
- Vercelなどのサーバーレス環境では使えない可能性

---

### 選択肢2: 公式APIを使用

**方法**: X API v2やThreads APIを使用

**メリット**:
- 公式の方法なので安全
- データが正確

**デメリット**:
- X API: 有料（Basic $100/月）
- Threads API: 認証が複雑、利用条件が厳しい
- 個人開発には向かない

---

### 選択肢3: プラットフォームとハンドルのみ自動取得、表示名は手動入力（推奨）

**方法**:
- URLからプラットフォーム（X/THREADS）とハンドル名を自動抽出
- 表示名はユーザーが手動で入力

**メリット**:
- シンプルで確実
- サーバー負荷が低い
- ユーザーは表示名を知っている場合が多い

**デメリット**:
- 完全な自動化ではない
- 1ステップ増える

---

### 選択肢4: 表示名フィールドをオプションにする

**方法**:
- ハンドル名だけで登録可能にする
- 表示名は空欄でもOK

**メリット**:
- 最もシンプル
- ユーザーの負担が少ない

**デメリット**:
- 表示名がないと誰だか分かりにくい
- UIで `@handle` のみを表示する必要がある

---

## 📊 現在の実装状況

### 動作している機能

| 機能 | 状態 | 備考 |
|------|------|------|
| Amazon URL解析 | ✅ 完全動作 | ASIN抽出、短縮URL展開 |
| Amazon書籍情報取得 | ✅ 完全動作 | タイトル、著者、出版社、ISBN |
| SNS URL解析 | ✅ 完全動作 | X/Threads対応、threads.com対応 |
| SNSプラットフォーム抽出 | ✅ 完全動作 | X/THREADS自動判定 |
| SNSハンドル名抽出 | ✅ 完全動作 | ポストURLからも抽出可能 |
| **SNS表示名取得** | ❌ **保留** | **技術的制約により自動取得不可** |

### 保留中の機能

| 機能 | 状態 | 理由 |
|------|------|------|
| X 表示名自動取得 | ⚠️ 保留 | SPAのためサーバーサイドスクレイピング不可 |
| Threads 表示名自動取得 | ⚠️ 保留 | 同上 |

---

## 📝 試行錯誤で分かったこと

### 1. Google検索スクレイピングの問題点

- Googleはbot対策が厳しく、User-Agentを偽装しても検索結果をブロックする
- CAPTCHAや空の結果ページが返される
- 非常に不安定で本番環境では使えない

### 2. SPAのスクレイピングの難しさ

- XやThreadsのような最新のWebサービスはSPAが主流
- 初期HTMLには最小限の情報しか含まれない
- JavaScriptを実行しないと実際のコンテンツが取得できない
- サーバーサイドでの単純な`fetch`では限界がある

### 3. レート制限の実装の重要性

- 外部APIへのリクエストは慎重に行う必要がある
- 実装したレート制限（5リクエスト/分）は適切に動作
- スクレイピングでブロックされる前にレート制限でコントロールできている

---

## 🎯 次回の作業方針

### 推奨: 選択肢3（プラットフォームとハンドルのみ自動取得）

**実装内容**:
1. `fetchSnsUserInfo` 関数から表示名取得処理を削除
2. APIレスポンスで `display_name` を `undefined` で返す
3. フロントエンドで表示名フィールドを手動入力必須にする
4. UIに「表示名は手動で入力してください」というメッセージを追加

**メリット**:
- 確実に動作する
- シンプルで保守しやすい
- ユーザーは自分が引用したい人の名前を知っている場合が多い

**作業見積もり**: 30分

---

## 📁 変更したファイル

### 修正済み

```
lib/scraping/
├── sns-url-parser.ts         # threads.com対応
└── google-search.ts          # 表示名取得の試行錯誤（保留）

app/(main)/components/
└── QuoteModal.tsx            # プレースホルダー更新
```

### ドキュメント

```
docs/development/work_logs/
└── 2025-11-03_phase2_frontend_integration_partial.md  # 本ファイル
```

---

## 🔧 デバッグログの追加

試行錯誤の過程で、以下のデバッグログを追加しました（`lib/scraping/google-search.ts`）:

```typescript
console.log('[DEBUG] X Profile Page:');
console.log('  HTML length:', html.length);
console.log('[DEBUG] og:title search result:', ogTitleMatch ? ogTitleMatch[1] : 'NOT FOUND');
console.log('[DEBUG] og:description:', ogDescMatch ? ogDescMatch[1].substring(0, 100) : 'NOT FOUND');
console.log('[DEBUG] <title> tag:', titleMatch ? titleMatch[1] : 'NOT FOUND');
console.log('[DEBUG] X User Info:');
console.log('  Handle:', handle);
console.log('  Display Name:', displayName || '(none)');
```

**今後の作業**: 選択肢を決定後、不要なデバッグログは削除すること

---

## ⚠️ 注意事項

### Webスクレイピングの限界

1. **SPAへの対応**
   - 最新のWebサービスはSPAが主流
   - サーバーサイドからの単純なスクレイピングでは情報が取得できない
   - ヘッドレスブラウザは高コスト

2. **bot対策の強化**
   - Google検索などはbot対策が非常に厳しい
   - User-Agentを偽装しても検出される
   - CAPTCHAやブロックを回避することは困難

3. **利用規約の問題**
   - 自動化されたスクレイピングは利用規約違反の可能性
   - 公式APIの使用が推奨される
   - 個人利用の範囲でも注意が必要

### 今後の対応方針

- **Amazon**: 現状のスクレイピングで問題なし（HTML構造がシンプル）
- **SNS**: 表示名は手動入力にして、公式API対応は将来の課題とする
- **代替案**: 将来的に予算があれば公式APIを検討

---

## 📈 Phase 2の進捗

| 機能 | 進捗 | 状態 |
|------|------|------|
| OCR機能 | 100% | ✅ 完了 |
| Amazon書籍情報取得 | 100% | ✅ 完了 |
| SNSハンドル取得 | 100% | ✅ 完了 |
| SNS表示名取得 | 0% | ⚠️ 保留（技術的制約） |
| CSVエクスポート | 100% | ✅ 完了 |
| タグ管理画面 | 100% | ✅ 完了 |
| フロントエンド統合 | 50% | 🚧 部分完了 |

**Phase 2: 90%完了**（SNS表示名自動取得を除く）

---

**作成日**: 2025-11-03
**最終更新**: 2025-11-03
**状態**: 保留（方針決定待ち）
**次回アクション**: 選択肢3の実装 または 他の選択肢の検討
