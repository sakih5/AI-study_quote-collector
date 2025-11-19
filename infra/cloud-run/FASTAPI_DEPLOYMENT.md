# FastAPI デプロイ手順（Cloud Run）

**対象**: FastAPIバックエンドのGoogle Cloud Runへのデプロイ
**所要時間**: 初回 30〜40分、2回目以降 5〜10分

---

## 📋 前提条件

### 必要なもの

1. **Google Cloud Platform（GCP）アカウント**
   - 無料枠あり（初回$300クレジット）
   - https://console.cloud.google.com/

2. **gcloud CLI**
   - インストール: https://cloud.google.com/sdk/docs/install
   - バージョン確認: `gcloud version`

3. **環境変数**
   - `SUPABASE_URL`: SupabaseプロジェクトURL
   - `SUPABASE_ANON_KEY`: Supabase匿名キー

---

## 🚀 初回セットアップ

### 1. GCPプロジェクトの作成

```bash
# GCPコンソールでプロジェクトを作成（GUIで実施）
# プロジェクトID例: quote-collector-prod
```

または

```bash
# CLIで作成
gcloud projects create quote-collector-prod --name="Quote Collector"
```

### 2. gcloud CLIの初期化

```bash
# gcloudの初期化
gcloud init

# プロジェクトの設定
gcloud config set project quote-collector-prod

# 認証
gcloud auth login
```

### 3. 必要なAPIの有効化

```bash
# Cloud Run API
gcloud services enable run.googleapis.com

# Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Container Registry API
gcloud services enable containerregistry.googleapis.com
```

### 4. 環境変数の設定

```bash
# プロジェクトID
export GCP_PROJECT_ID="quote-collector-prod"

# リージョン（東京）
export GCP_REGION="asia-northeast1"

# Supabase設定
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_KEY="eyJxxx..."
```

**推奨**: `.bashrc` または `.zshrc` に追加して永続化：

```bash
echo 'export GCP_PROJECT_ID="quote-collector-prod"' >> ~/.bashrc
echo 'export GCP_REGION="asia-northeast1"' >> ~/.bashrc
echo 'export SUPABASE_URL="https://xxx.supabase.co"' >> ~/.bashrc
echo 'export SUPABASE_KEY="eyJxxx..."' >> ~/.bashrc
source ~/.bashrc
```

---

## 📦 デプロイ手順

### 方法1: デプロイスクリプトを使用（推奨）

```bash
cd backend
./deploy.sh
```

スクリプトが以下を自動実行します：
1. Dockerイメージのビルド
2. Container Registryへのプッシュ
3. Cloud Runへのデプロイ
4. サービスURLの表示

### 方法2: 手動デプロイ

#### Step 1: Dockerイメージのビルド

```bash
cd backend

# Cloud Buildを使ってビルド
gcloud builds submit --tag gcr.io/${GCP_PROJECT_ID}/quote-collector-api
```

#### Step 2: Cloud Runへのデプロイ

```bash
gcloud run deploy quote-collector-api \
  --image gcr.io/${GCP_PROJECT_ID}/quote-collector-api \
  --platform managed \
  --region ${GCP_REGION} \
  --allow-unauthenticated \
  --set-env-vars="SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY}"
```

#### Step 3: サービスURLの取得

```bash
gcloud run services describe quote-collector-api \
  --platform managed \
  --region ${GCP_REGION} \
  --format 'value(status.url)'
```

---

## ✅ デプロイ後の確認

### 1. ヘルスチェック

```bash
# サービスURLを取得
SERVICE_URL=$(gcloud run services describe quote-collector-api \
  --platform managed \
  --region ${GCP_REGION} \
  --format 'value(status.url)')

# ヘルスチェック
curl ${SERVICE_URL}/health

# 期待される結果: {"status":"ok"}
```

### 2. Swagger UIの確認

ブラウザで以下のURLを開く：
```
https://YOUR-SERVICE-URL/docs
```

### 3. APIエンドポイントのテスト

```bash
# Activities一覧取得（認証不要）
curl ${SERVICE_URL}/api/activities

# 期待される結果: 活動領域の一覧が返ってくる
```

---

## 🔧 環境変数の更新

デプロイ後に環境変数を更新する場合：

```bash
gcloud run services update quote-collector-api \
  --platform managed \
  --region ${GCP_REGION} \
  --update-env-vars="SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY}"
```

---

## 📊 ログの確認

### Cloud Runのログを表示

```bash
gcloud run services logs read quote-collector-api \
  --platform managed \
  --region ${GCP_REGION} \
  --limit 50
```

### リアルタイムログの監視

```bash
gcloud run services logs tail quote-collector-api \
  --platform managed \
  --region ${GCP_REGION}
```

---

## 🔐 セキュリティ設定（オプション）

### 認証を有効にする

デフォルトでは `--allow-unauthenticated` で誰でもアクセス可能です。
セキュリティを強化する場合：

```bash
gcloud run services update quote-collector-api \
  --platform managed \
  --region ${GCP_REGION} \
  --no-allow-unauthenticated
```

この場合、Next.jsからのリクエスト時にGCP認証が必要になります。

---

## 💰 コスト管理

### 無料枠

Cloud Runの無料枠：
- リクエスト: 200万リクエスト/月
- メモリ: 360,000 GB-秒/月
- CPU: 180,000 vCPU-秒/月

個人開発であれば無料枠内で収まる可能性が高い。

### コストの確認

```bash
# 請求情報の確認（GCPコンソールで確認）
# https://console.cloud.google.com/billing
```

---

## 🔄 更新デプロイ

コードを更新して再デプロイする場合：

```bash
cd backend
./deploy.sh
```

または

```bash
gcloud builds submit --tag gcr.io/${GCP_PROJECT_ID}/quote-collector-api
gcloud run deploy quote-collector-api \
  --image gcr.io/${GCP_PROJECT_ID}/quote-collector-api \
  --platform managed \
  --region ${GCP_REGION}
```

---

## ❌ サービスの削除

デプロイを削除する場合：

```bash
gcloud run services delete quote-collector-api \
  --platform managed \
  --region ${GCP_REGION}
```

---

## 🐛 トラブルシューティング

### エラー: "Permission denied"

**原因**: 必要なAPIが有効化されていない

**解決策**:
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### エラー: "Container failed to start"

**原因**: Dockerイメージのビルドまたは起動に失敗

**解決策**:
1. ログを確認: `gcloud run services logs read quote-collector-api`
2. ローカルでDockerイメージをテスト:
   ```bash
   cd backend
   docker build -t test-api .
   docker run -p 8080:8080 -e SUPABASE_URL=xxx -e SUPABASE_ANON_KEY=xxx test-api
   ```

### エラー: "Environment variable not set"

**原因**: 環境変数が正しく設定されていない

**解決策**:
```bash
# 環境変数を再設定
gcloud run services update quote-collector-api \
  --update-env-vars="SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY}"
```

---

## 📚 参考リンク

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference/run)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**作成日**: 2025-11-03
**最終更新**: 2025-11-03
