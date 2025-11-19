# ことばアーカイブ

本・SNS・メモから、大切なフレーズを集めて整理できる、個人用ナレッジベースアプリ

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

- 📝 Webアプリでのスマホレイアウト対応
- 📝 セキュリティチェック
- 📝 パフォーマンス改善
- 📝 Google検索に表示されるように対応
- 📝 モバイルアプリ

## セットアップ

### 前提条件

- Docker & Docker Compose がインストールされていること
- Git がインストールされていること

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd AI-study_quote-collector
```

### 2. Supabaseのセットアップ

詳細は [supabase/README.md](./supabase/README.md) を参照してください。

1. Supabaseプロジェクトを作成
2. データベーススキーマを適用

### 3. 環境変数の設定

```bash
# フロントエンド環境変数
cp frontend/.env.example frontend/.env.local
# frontend/.env.local を編集して Supabase と Backend API の接続情報を設定

# バックエンド環境変数
cp backend/.env.example backend/.env
# backend/.env を編集して Supabase の接続情報を設定
```

### 4. Docker Composeで開発環境を起動

プロジェクトルートで以下のコマンドを実行:

```bash
# 全サービス起動（フロントエンド + バックエンド）
docker compose up

# バックグラウンドで起動
docker compose up -d

# ログを確認
docker compose logs -f

# 停止
docker compose down
```

起動後、以下のURLにアクセス:

- フロントエンド: <http://localhost:3000>
- バックエンドAPI: <http://localhost:8000>
- APIドキュメント: <http://localhost:8000/docs>

### 別の方法: ローカルで直接起動（Docker不使用）

#### フロントエンドのみ起動

```bash
cd frontend
npm install
npm run dev
```

#### バックエンドのみ起動

```bash
cd backend
uv sync  # 依存関係をインストール（初回のみ）
uv run uvicorn main:app --reload
```

## 開発コマンド

### Docker Compose使用時（推奨）

プロジェクトルートで実行:

```bash
# 全サービス起動
docker compose up

# バックグラウンド起動
docker compose up -d

# ログ確認
docker compose logs -f

# 特定サービスのログ確認
docker compose logs -f frontend
docker compose logs -f backend

# サービス再起動
docker compose restart

# サービス停止
docker compose down

# サービス停止 + ボリューム削除
docker compose down -v

# コンテナ内でコマンド実行
docker compose exec frontend npm run lint
docker compose exec backend pytest
```

### フロントエンド（ローカル実行時: `frontend/` ディレクトリ内で実行）

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

# OpenAPI型生成
npm run generate-types       # ローカルバックエンドから生成
npm run generate-types:prod  # 本番バックエンドから生成
```

### バックエンド（ローカル実行時: `backend/` ディレクトリ内で実行）

```bash
# 開発サーバー起動
uv run uvicorn main:app --reload

# テスト実行
uv run pytest

# テスト（詳細表示）
uv run pytest -v

# テスト（カバレッジ付き）
uv run pytest --cov
```

## プロジェクト構造

**モノレポ構造**: フロントエンド・バックエンドを分離し、将来のモバイルアプリ開発に備えた構成

```
.
├── frontend/              # Next.js フロントエンドアプリケーション
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # 認証ルート
│   │   └── (main)/        # メインアプリルート
│   ├── components/        # Reactコンポーネント
│   │   ├── ui/            # 共通UIコンポーネント
│   │   ├── layouts/       # レイアウトコンポーネント
│   │   └── features/      # ドメイン別コンポーネント
│   ├── hooks/             # カスタムReactフック
│   ├── lib/               # ユーティリティ・ライブラリ
│   │   ├── api/           # バックエンドAPIクライアント
│   │   └── supabase/      # Supabaseクライアント
│   └── middleware.ts      # 認証ミドルウェア
├── backend/               # FastAPI バックエンドAPI
│   ├── routes/            # APIルートハンドラ
│   ├── models/            # Pydanticモデル
│   ├── services/          # ビジネスロジック
│   └── tests/             # pytestテスト
├── infra/                 # インフラ・デプロイ設定
│   ├── vercel/            # Vercel設定（フロントエンド）
│   └── cloud-run/         # Cloud Run設定（バックエンド）
├── docs/                  # 設計ドキュメント
│   ├── specs/             # 仕様書
│   └── development/       # 開発ログ
└── supabase/              # Supabaseマイグレーション
```

## 環境変数

### フロントエンド (`frontend/.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# バックエンドAPI URL
NEXT_PUBLIC_API_URL=https://your-backend-url.run.app

# SerpAPI（オプション - SNSユーザー名取得用）
SERPAPI_KEY=your-serpapi-key

# 開発環境設定
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### バックエンド (`backend/.env`)

```env
# Supabase（サービスロールキー）
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# SerpAPI（オプション - SNSユーザー名取得用）
SERPAPI_KEY=your-serpapi-key
```

## 本番環境へのデプロイ

### バックエンド: Google Cloud Run

```bash
cd infra/cloud-run

# 環境変数を設定
export GCP_PROJECT_ID="your-gcp-project-id"
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export FRONTEND_URL="https://your-frontend.vercel.app"

# デプロイ実行
./deploy.sh
```

**デプロイ時の注意点:**

- 本番用Dockerfileは `backend/Dockerfile` を使用
- マルチステージビルドで最適化済み
- 開発環境と同じDockerfileなので環境差異なし
- Tesseract OCRが自動インストール

### フロントエンド: Vercel

**VercelはNext.jsネイティブサポートのため、Dockerコンテナ不要**

#### GitHubから自動デプロイ（推奨）

1. Vercelプロジェクトを作成
2. GitHubリポジトリを接続
3. **Vercel Dashboard** → **Settings** → **General** で以下を設定:
   - **Root Directory**: `frontend` ← **重要: モノレポ対応**
   - **Build Command**: 自動検出（Next.jsが認識される）
   - **Output Directory**: 自動検出
   - **Install Command**: 自動検出
4. 環境変数を設定（**Settings** → **Environment Variables**）:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (Cloud RunのURL)

#### Vercel CLIでデプロイ

```bash
# プロジェクトルートで実行（初回のみ対話式設定）
vercel

# 本番デプロイ
vercel --prod
```

**注意:** モノレポ構成のため、Vercel DashboardでRoot Directoryを`frontend`に設定する必要があります。

**注意**: `frontend/Dockerfile`は**ローカル開発専用**で、Vercelデプロイには使用されません。

## ドキュメント

詳細な設計ドキュメントは `docs/specs/` ディレクトリにあります：

- [要件定義書](./docs/specs/要件定義書_v2.md)
- [画面設計書](./docs/specs/画面設計書_実装版_v2.md)
- [API設計書](./docs/specs/API設計書_v2.md)
- [データベース設計書](./docs/specs/データベース設計書_v2.md)
- [技術仕様書](./docs/specs/技術仕様書_v2.md)

開発ガイドは [CLAUDE.md](./CLAUDE.md) を参照してください。

## ライセンス

Private
