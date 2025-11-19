# Docker開発環境セットアップ作業ログ

**日付**: 2025-11-19
**作業者**: Claude Code
**目的**: Cloud Run本番環境と開発環境の統一、Docker Composeによる開発体験向上

## 背景

### 課題

1. **環境差異のリスク**: ローカル開発とCloud Run本番で異なる依存管理・実行環境
2. **新規開発者のオンボーディング**: Python/Nodeバージョン管理、依存インストールの煩雑さ
3. **Tesseract OCRの環境差異**: ローカルとCloud Runで異なるインストール方法

### 解決方針

- **Docker環境統一**: 開発環境でもCloud Runと同じDockerfileを使用
- **docker-compose.yml**: フロントエンド・バックエンドの同時起動
- **ホットリロード対応**: Volumeマウントで開発体験を損なわない

## 実施内容

### 1. docker-compose.yml の作成

#### プロジェクトルートに配置

**場所:** `/home/sakih/projects/AI-study_quote-collector/docker-compose.yml`

```yaml
services:
  # フロントエンド (Next.js)
  # 注意: ローカル開発専用。Vercelデプロイにはこのコンテナは使われない
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      # 開発環境ではdepsステージまでビルド（ビルドステージをスキップ）
      target: deps
    ports:
      - "3000:3000"
    volumes:
      # ホットリロード用にソースコードをマウント
      - ./frontend:/app
      # node_modulesはコンテナ内のものを優先
      - /app/node_modules
      - /app/.next
    env_file:
      - ./frontend/.env.local
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
    # 開発サーバー起動（Dockerfileのデフォルトコマンドを上書き）
    command: npm run dev
    depends_on:
      - backend

  # バックエンド (FastAPI)
  # 注意: このDockerfileはCloud Run本番デプロイでも使用される（環境統一）
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      # 開発環境ではrunnerステージまでビルド（本番と同じ）
      target: runner
    ports:
      - "8000:8000"
    volumes:
      # ホットリロード用にソースコードをマウント
      - ./backend:/app
      # 仮想環境とキャッシュは除外
      - /app/.venv
    env_file:
      - ./backend/.env
    environment:
      - ENVIRONMENT=development
      - PORT=8000
    # 開発サーバー起動（--reload付き）
    command: /app/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    # ヘルスチェック（開発環境用: port 8000をチェック）
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()"]
      interval: 30s
      timeout: 10s
      start_period: 5s
      retries: 3
```

#### 設計ポイント

**フロントエンド:**
- `target: deps` → ビルドステージをスキップして高速化
- `WATCHPACK_POLLING=true` → WSL/Docker環境でのホットリロード対応
- Vercelデプロイには使用されない（コメント明記）

**バックエンド:**
- `target: runner` → 本番と同じステージを使用（環境統一）
- `--reload` → uvicornのホットリロードで開発効率化
- healthcheck → 開発環境用にport 8000対応

### 2. backend/Dockerfile の統一

#### 変更前（pipベース）

```dockerfile
# Copy dependency files
COPY requirements.lock ./

# Create virtual environment and install dependencies
RUN python -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.lock
```

#### 変更後（uvベース・後述）

※このタイミングではpipベース、後にuv移行

**重要な変更点:**
- Stage名に `AS runner` を追加（docker-composeのtarget指定対応）
- マルチステージビルドで最適化（builder/runner分離）
- Tesseract OCRを自動インストール

```dockerfile
# Stage 1: Build stage
FROM python:3.12-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files and install
COPY requirements.lock ./
RUN python -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.lock

# Stage 2: Runtime stage
FROM python:3.12-slim AS runner  # ← AS runner追加

WORKDIR /app

# Install Tesseract OCR and Japanese language data
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-jpn \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PORT=8080

EXPOSE 8080

# Health check (Cloud Run uses PORT=8080)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health').read()"

# Run the application
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
```

### 3. frontend/Dockerfile の作成

#### 新規作成（ローカル開発専用）

```dockerfile
# Next.js Dockerfile for local development
# Note: Vercel does NOT use this Dockerfile (Next.js native support)
# This is only used for local development with docker-compose
# Multi-stage build for optimized production image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application (skip for development)
RUN npm run build

# Stage 3: Runner (production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
```

**重要:** このファイルは**ローカル開発専用**で、Vercelデプロイでは使用されない。

### 4. infra/cloud-run/deploy.sh の修正

Cloud Runデプロイスクリプトを統一Dockerfile対応に変更：

```bash
# Step 1: Build Docker image
echo -e "${GREEN}Step 1: Building Docker image...${NC}"
# Note: Build from backend directory using production Dockerfile
cd ../../backend
gcloud builds submit --tag ${IMAGE_NAME} --project ${PROJECT_ID}
cd -
```

**変更点:**
- backendディレクトリから直接ビルド
- 開発環境と同じDockerfileを使用（環境統一）

### 5. README.md の更新

#### Docker Composeセクション追加

```markdown
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

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs
```

#### Vercelセクションに明記

```markdown
### フロントエンド: Vercel

**VercelはNext.jsネイティブサポートのため、Dockerコンテナ不要**

**注意**: `frontend/Dockerfile`は**ローカル開発専用**で、Vercelデプロイには使用されません。
```

### 6. CLAUDE.md の更新

開発ガイドにDocker Composeのメリットを追加：

```markdown
### Docker Compose (Recommended - Matches Cloud Run Environment)

**Benefits:**
- **Environment parity**: Same Dockerfile for development and Cloud Run production
- **Isolated dependencies**: No conflicts with local Python/Node versions
- **Tesseract OCR**: Pre-installed in backend container
- **Easy onboarding**: New developers just need Docker
```

## トラブルシューティング

### 問題1: docker-compose version警告

**エラー:**
```
WARN[0000] the attribute 'version' is obsolete
```

**原因:** Docker Compose V2では`version: '3.8'`が不要

**解決策:** `version`フィールドを削除

### 問題2: Dockerfile stage名エラー

**エラー:**
```
target backend: failed to solve: target stage "runner" could not be found
```

**原因:** `FROM python:3.12-slim`にステージ名がなかった

**解決策:** `FROM python:3.12-slim AS runner`に変更

### 問題3: healthcheck port不一致

**現象:** バックエンドが`unhealthy`状態

**原因:** Dockerfileのhealthcheckがport 8080をチェック、開発環境はport 8000使用

**解決策:** docker-compose.ymlにhealthcheck overrideを追加

```yaml
healthcheck:
  test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()"]
```

## 成果

### ✅ 達成されたこと

1. **環境統一**
   - ローカル開発とCloud Run本番で同じDockerfileを使用
   - 「動いていたのにデプロイしたら動かない」問題を根本解決

2. **開発体験向上**
   - `docker compose up`一発で全環境起動
   - ホットリロード対応で開発効率維持

3. **新規開発者のオンボーディング簡素化**
   - Python/Nodeバージョン管理不要
   - Tesseract OCRのインストール不要
   - 必要なのはDocker/Docker Composeのみ

4. **ヘルスチェック実装**
   - コンテナの正常性を自動監視
   - 開発環境でも本番と同じ監視体制

### 検証結果

```bash
# サービス起動確認
$ docker compose ps
NAME                                  STATUS
ai-study_quote-collector-backend-1    Up (healthy)
ai-study_quote-collector-frontend-1   Up

# エンドポイント確認
$ curl http://localhost:8000/health
{"status":"healthy"}

$ curl http://localhost:8000/docs
<Swagger UI HTML>

$ curl http://localhost:3000
<Next.js HTML>
```

## ファイル変更サマリー

| ファイル | 変更内容 |
|---------|---------|
| `docker-compose.yml` | 新規作成（フロントエンド・バックエンド定義） |
| `backend/Dockerfile` | AS runner追加、マルチステージ最適化 |
| `frontend/Dockerfile` | 新規作成（開発専用） |
| `infra/cloud-run/deploy.sh` | 統一Dockerfile対応 |
| `README.md` | Docker Composeセクション追加 |
| `CLAUDE.md` | Docker開発環境ガイド追加 |

## 開発コマンド一覧

### 推奨: Docker Compose使用

```bash
# 全サービス起動
docker compose up -d

# ログ確認
docker compose logs -f

# 特定サービスのログ
docker compose logs -f backend
docker compose logs -f frontend

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

### 代替: ローカル直接実行

フロントエンド:
```bash
cd frontend
npm install
npm run dev
```

バックエンド:
```bash
cd backend
uv sync
uv run uvicorn main:app --reload
```

## 次のステップ

- [ ] CI/CDでDocker環境を使ったテストを追加
- [ ] docker-compose.test.ymlでE2E test環境構築
- [ ] 本番デプロイ前にDocker環境での動作確認を必須化

## 参考リンク

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/best-practices)
- [Next.js Docker Deployment](https://nextjs.org/docs/app/building-your-application/deploying#docker-image)
