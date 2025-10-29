# 抜き書きアプリ

書籍やSNS投稿から重要なフレーズを記録・整理する個人用ナレッジベースアプリ

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage)
- **OCR**: Tesseract.js
- **デプロイ**: Vercel

## 機能

### Phase 1（MVP）
- ✅ ユーザー認証（Supabase Auth）
- ⏳ フレーズ登録（テキスト入力）
- ⏳ 出典管理（本・SNS・その他）
- ⏳ 活動領域・タグ管理
- ⏳ ホーム画面（一覧表示）
- ⏳ キーワード検索・フィルター

### Phase 2
- ⏳ OCR機能（画像から文字抽出）
- ⏳ Amazon書籍情報自動取得
- ⏳ SNSユーザー情報自動取得
- ⏳ CSVエクスポート
- ⏳ タグ管理画面（統合・削除）

### Phase 3（将来）
- 📝 AI要約機能
- 📝 モバイルアプリ
- 📝 複数ユーザー間でのフレーズ共有

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd quote-collector
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. Supabaseのセットアップ

詳細は [supabase/README.md](./supabase/README.md) を参照してください。

1. Supabaseプロジェクトを作成
2. `.env.local` ファイルを作成して環境変数を設定
3. データベーススキーマを適用

```bash
cp .env.example .env.local
# .env.local を編集して Supabase の接続情報を設定
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm run start

# Lint実行
npm run lint

# フォーマット実行
npm run format

# テスト実行
npm run test

# E2Eテスト実行
npm run test:e2e
```

## プロジェクト構造

```
.
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証ルート
│   ├── (main)/            # メインアプリルート
│   └── api/               # APIルート
├── lib/                   # ユーティリティ・ライブラリ
│   ├── supabase/          # Supabaseクライアント
│   ├── ocr/               # OCR関連
│   ├── scraping/          # スクレイピング関連
│   └── utils/             # ユーティリティ
├── components/            # 共通コンポーネント
├── styles/                # グローバルスタイル
├── supabase/              # Supabaseマイグレーション
└── docs/                  # 設計ドキュメント
```

## 環境変数

以下の環境変数を `.env.local` に設定する必要があります：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# SerpAPI（オプション - SNSユーザー名取得用）
SERPAPI_KEY=your-serpapi-key

# 開発環境設定
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## ドキュメント

詳細な設計ドキュメントは `docs/` ディレクトリにあります：

- [要件定義書](./docs/要件定義書_v2.md)
- [画面設計書](./docs/画面設計書_実装版_v2.md)
- [API設計書](./docs/API設計書_v2.md)
- [データベース設計書](./docs/データベース設計書_v2.md)
- [技術仕様書](./docs/技術仕様書_v2.md)

## ライセンス

Private

## 作成者

Created with ❤️ using Claude Code
