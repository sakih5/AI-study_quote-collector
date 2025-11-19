# Cloud Run デプロイガイド - FastAPI Backend

**作成日**: 2025-11-01
**対象**: FastAPI移行 Phase 10（本番環境デプロイ）

このガイドでは、FastAPIバックエンドをGoogle Cloud Runにデプロイする手順を説明します。

---

## 📋 目次

1. [前提条件](#前提条件)
2. [Cloud Runとは](#cloud-runとは)
3. [デプロイ準備](#デプロイ準備)
4. [Dockerfile作成](#dockerfile作成)
5. [Cloud Runデプロイ](#cloud-runデプロイ)
6. [環境変数設定](#環境変数設定)
7. [本番環境設定](#本番環境設定)
8. [無料枠の最適化](#無料枠の最適化)
9. [監視とログ](#監視とログ)
10. [トラブルシューティング](#トラブルシューティング)

---

## 🔧 前提条件

### 必要なアカウント・ツール

- **Google Cloud アカウント**: 無料枠あり（クレジットカード登録必要）
- **gcloud CLI**: Google Cloud SDK
- **Docker**: コンテナ作成用（既に勉強済み✅）
- **プロジェクト**: GCPプロジェクト作成済み

### gcloud CLI インストール確認

```bash
# バージョン確認
gcloud --version
# Google Cloud SDK 450.0.0+

# ログイン
gcloud auth login

# プロジェクト設定
gcloud config set project YOUR_PROJECT_ID
```

**プロジェクトIDの確認**:
```bash
gcloud projects list
```

---

## 🚀 Cloud Runとは

### 特徴

- **サーバーレス**: インフラ管理不要
- **自動スケーリング**: 0→∞まで自動でスケール
- **従量課金**: リクエストがない時は無料
- **Dockerベース**: 任意のコンテナを実行可能
- **HTTPS自動**: 証明書自動発行

### 無料枠（2025年現在）

| リソース | 無料枠 |
|---------|--------|
| リクエスト | 200万回/月 |
| CPU時間 | 180,000 vCPU秒/月 |
| メモリ時間 | 360,000 GiB秒/月 |
| ネットワーク（出力） | 1GB/月 |

**個人用アプリなら無料枠で十分収まる可能性が高い**

---

## 📦 デプロイ準備

### ステップ1: プロジェクトID取得

```bash
# 現在のプロジェクトID確認
gcloud config get-value project

# または新規作成
gcloud projects create quote-collector-api --name="抜き書きアプリAPI"
gcloud config set project quote-collector-api
```

### ステップ2: API有効化

```bash
# Cloud Run API有効化
gcloud services enable run.googleapis.com

# Container Registry API有効化
gcloud services enable containerregistry.googleapis.com

# Artifact Registry API有効化（推奨）
gcloud services enable artifactregistry.googleapis.com
```

### ステップ3: リージョン設定

```bash
# 推奨: asia-northeast1 (東京)
gcloud config set run/region asia-northeast1
```

---

## 🐳 Dockerfile作成

### ステップ1: Dockerfile作成（uv版）

```bash
cd backend
```

```dockerfile
# backend/Dockerfile
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

# 作業ディレクトリ設定
WORKDIR /app

# 依存パッケージファイルコピー（ロックファイル使用）
COPY pyproject.toml requirements.lock ./

# 依存パッケージインストール（uvの高速性を活用）
RUN uv pip install --system -r requirements.lock

# アプリケーションコードコピー
COPY . .

# ポート設定（Cloud Runは環境変数PORTを使用）
ENV PORT=8080

# ヘルスチェック用
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8080/health')"

# 本番用起動コマンド
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
```

**uvベースDockerfileの利点**:

- 公式uvイメージを使用（`ghcr.io/astral-sh/uv`）
- `requirements.lock` で完全な再現性
- ビルド時間が大幅に短縮（pipの10-100倍速）
- `--system` フラグでグローバルにインストール（Dockerコンテナ内では仮想環境不要）

### ステップ2: .dockerignore作成

```bash
# backend/.dockerignore
cat > .dockerignore << 'EOF'
# Virtual environments
.venv/
venv/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# Testing
.pytest_cache/
.coverage

# Environment variables
.env
.env.local

# Logs
*.log

# Git
.git/
.gitignore

# Documentation
README.md
docs/

# Tests
tests/

# uv cache
.python-version

# Keep lock file
!requirements.lock
!pyproject.toml
EOF
```

### ステップ3: ローカルでDockerビルド確認

```bash
# イメージビルド
docker build -t quote-api:test .

# ローカル実行テスト
docker run -p 8080:8080 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_KEY=your-key \
  quote-api:test

# 別のターミナルで確認
curl http://localhost:8080/health
# {"status":"healthy"}
```

**成功したらCtrl+Cで停止**

---

## ☁️ Cloud Runデプロイ

### 方法1: gcloud コマンド（推奨）

```bash
# backendディレクトリで実行
cd /home/sakih/projects/AI-study_quote-collector/backend

# デプロイ（初回）
gcloud run deploy quote-api \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=https://xxx.supabase.co,SUPABASE_KEY=your-anon-key,CORS_ORIGINS=https://your-nextjs-app.vercel.app"
```

**パラメータ説明**:
- `quote-api`: サービス名
- `--source .`: カレントディレクトリをビルド
- `--allow-unauthenticated`: 認証不要（公開API）
- `--set-env-vars`: 環境変数設定

**デプロイ完了後の出力例**:
```
Service [quote-api] revision [quote-api-00001-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://quote-api-xxxxxxxxxx-an.a.run.app
```

### 方法2: Artifact Registry経由（より細かい制御が可能）

```bash
# 1. Artifact Registry リポジトリ作成
gcloud artifacts repositories create quote-api-repo \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Quote Collector API"

# 2. Docker認証設定
gcloud auth configure-docker asia-northeast1-docker.pkg.dev

# 3. イメージビルド＆プッシュ
export PROJECT_ID=$(gcloud config get-value project)
export IMAGE_NAME=asia-northeast1-docker.pkg.dev/${PROJECT_ID}/quote-api-repo/quote-api:v1

docker build -t ${IMAGE_NAME} .
docker push ${IMAGE_NAME}

# 4. Cloud Runデプロイ
gcloud run deploy quote-api \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

---

## 🔐 環境変数設定

### 本番環境用の環境変数

```bash
# 環境変数を個別に設定
gcloud run services update quote-api \
  --region asia-northeast1 \
  --update-env-vars \
SUPABASE_URL=https://xxx.supabase.co,\
SUPABASE_KEY=your-supabase-anon-key,\
CORS_ORIGINS=https://your-nextjs-app.vercel.app,\
JWT_SECRET=your-production-secret-key,\
JWT_ALGORITHM=HS256
```

### 秘密情報はSecret Managerを使う（推奨）

```bash
# Secret Manager API有効化
gcloud services enable secretmanager.googleapis.com

# シークレット作成
echo -n "your-supabase-anon-key" | \
  gcloud secrets create SUPABASE_KEY --data-file=-

# Cloud RunにSecret割り当て
gcloud run services update quote-api \
  --region asia-northeast1 \
  --update-secrets SUPABASE_KEY=SUPABASE_KEY:latest
```

**コード側での利用**:
```python
# config.py
import os

class Settings(BaseSettings):
    supabase_key: str = os.getenv("SUPABASE_KEY")  # Secret Managerから自動注入
```

---

## ⚙️ 本番環境設定

### main.py の本番対応

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="抜き書きアプリ API",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENV") != "production" else None,  # 本番ではSwagger無効化
    redoc_url="/redoc" if os.getenv("ENV") != "production" else None
)

# CORS設定（本番用）
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy", "environment": os.getenv("ENV", "development")}
```

### CORS設定のポイント

```bash
# 開発環境
CORS_ORIGINS=http://localhost:3000

# 本番環境（複数ドメイン対応）
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-preview.vercel.app
```

---

## 💰 無料枠の最適化

### 1. メモリとCPU設定

```bash
# 最小リソース設定（無料枠最適化）
gcloud run services update quote-api \
  --region asia-northeast1 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0
```

**推奨設定**:
- **メモリ**: 512Mi（FastAPIは軽量）
- **CPU**: 1（十分）
- **最小インスタンス**: 0（アクセスない時は停止＝無料）
- **最大インスタンス**: 10（コスト制御）

### 2. リクエストタイムアウト

```bash
gcloud run services update quote-api \
  --region asia-northeast1 \
  --timeout 60
```

### 3. 同時実行数

```bash
gcloud run services update quote-api \
  --region asia-northeast1 \
  --concurrency 80
```

**concurrency**: 1コンテナが同時処理できるリクエスト数（デフォルト80）

### 無料枠内の目安

**個人利用の場合**:
- 月間10万リクエスト程度なら**完全無料**
- 1日3,000リクエスト以下 → 無料枠内

---

## 📊 監視とログ

### Cloud Loggingでログ確認

```bash
# 最新のログを表示
gcloud run services logs read quote-api \
  --region asia-northeast1 \
  --limit 50

# リアルタイムログ表示
gcloud run services logs tail quote-api \
  --region asia-northeast1
```

### Pythonでのログ出力

```python
# main.py
import logging

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.get("/api/activities")
async def get_activities():
    logger.info("Fetching activities")
    # ... 処理
    logger.info(f"Returned {len(activities)} activities")
```

### Cloud Consoleでの確認

1. [Cloud Run コンソール](https://console.cloud.google.com/run)にアクセス
2. `quote-api` サービスをクリック
3. 「ログ」タブでリアルタイムログ確認
4. 「指標」タブでリクエスト数・レイテンシ確認

---

## 🔄 Next.jsからの接続

### Vercelデプロイ時の環境変数

```bash
# Vercelプロジェクトの Environment Variables に追加
NEXT_PUBLIC_API_BASE_URL=https://quote-api-xxxxxxxxxx-an.a.run.app
```

### lib/api-client.ts の修正

```typescript
// lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function fetchActivities() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_BASE}/api/activities`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
```

---

## 🐛 トラブルシューティング

### エラー1: `Error: Failed to start container`

**原因**: Dockerfileの起動コマンドが間違っている

**解決策**:
```dockerfile
# ❌ 間違い
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

# ✅ 正しい（環境変数PORTを使う）
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
```

### エラー2: `CORS policy: No 'Access-Control-Allow-Origin'`

**原因**: CORS設定が不足

**解決策**:
```bash
# Next.jsのドメインを追加
gcloud run services update quote-api \
  --region asia-northeast1 \
  --update-env-vars CORS_ORIGINS=https://your-app.vercel.app
```

### エラー3: `Container failed to start. Failed to start and then listen on the port defined by the PORT environment variable.`

**原因**: アプリがPORTをリッスンしていない

**解決策**:
```python
# main.py の最後に追加
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### エラー4: `401 Unauthorized` from Supabase

**原因**: 環境変数が設定されていない

**解決策**:
```bash
# 環境変数確認
gcloud run services describe quote-api \
  --region asia-northeast1 \
  --format="value(spec.template.spec.containers[0].env)"

# 再設定
gcloud run services update quote-api \
  --region asia-northeast1 \
  --set-env-vars SUPABASE_URL=xxx,SUPABASE_KEY=xxx
```

### エラー5: デプロイが遅い

**原因**: 不要なパッケージが多い、またはuvを使っていない

**解決策**:

```bash
# pyproject.toml を最小限に保つ
[project]
dependencies = [
    "fastapi==0.104.1",
    "uvicorn[standard]==0.24.0",
    "pydantic==2.5.0",
    "pydantic-settings==2.1.0",
    "supabase==2.0.0",
]

# ロックファイル再生成
uv pip compile pyproject.toml -o requirements.lock

# uvベースDockerfileを使用（既に10-100倍速い）
```

---

## 🔄 デプロイフロー（CI/CD）

### 手動デプロイ

```bash
# 1. コード変更後
git add .
git commit -m "Update API"

# 2. Cloud Runに再デプロイ
gcloud run deploy quote-api \
  --source . \
  --region asia-northeast1
```

### GitHub Actions（自動デプロイ）

```yaml
# .github/workflows/deploy-cloud-run.yml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy quote-api \
            --source ./backend \
            --region asia-northeast1 \
            --platform managed \
            --allow-unauthenticated
```

**設定方法**:
1. GCPでサービスアカウント作成
2. JSONキーをダウンロード
3. GitHub Secretsに `GCP_SA_KEY` として登録

---

## ✅ デプロイ完了チェックリスト

- [ ] gcloud CLI インストール・ログイン済み
- [ ] GCPプロジェクト作成・選択済み
- [ ] Cloud Run API 有効化済み
- [ ] Dockerfile 作成・ローカルテスト済み
- [ ] 環境変数設定済み（SUPABASE_URL, SUPABASE_KEY, CORS_ORIGINS）
- [ ] Cloud Runにデプロイ成功
- [ ] Service URLにアクセスして `/health` が返る
- [ ] Next.jsから接続テスト成功
- [ ] ログが正しく出力される
- [ ] リソース制限設定（memory, cpu, max-instances）

---

## 📚 次のステップ

1. **カスタムドメイン設定**
   - Cloud Runでカスタムドメイン設定可能
   - 例: `api.your-domain.com`

2. **モニタリング強化**
   - Cloud Monitoring でアラート設定
   - エラー率が5%超えたら通知

3. **パフォーマンス最適化**
   - Cloud CDN導入
   - レスポンスキャッシュ

4. **セキュリティ強化**
   - Cloud Armorで DDoS対策
   - VPC Connectorでプライベートネットワーク化

---

## 🔗 参考リンク

- [Cloud Run 公式ドキュメント](https://cloud.google.com/run/docs)
- [Cloud Run 料金](https://cloud.google.com/run/pricing)
- [FastAPI on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-service)
- [Secret Manager 使い方](https://cloud.google.com/secret-manager/docs)

---

**作成日**: 2025-11-01
**最終更新**: 2025-11-01
