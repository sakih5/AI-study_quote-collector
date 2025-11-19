# デプロイガイド

**抜き書きアプリ**の本番環境へのデプロイ手順

---

## 📋 デプロイ概要

### アーキテクチャ

```
┌─────────────────┐
│   ユーザー      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel         │ ← Next.js フロントエンド
│  (Next.js)      │
└────────┬────────┘
         │ API リクエスト
         ▼
┌─────────────────┐
│  Cloud Run      │ ← FastAPI バックエンド
│  (FastAPI)      │
└────────┬────────┘
         │ データアクセス
         ▼
┌─────────────────┐
│  Supabase       │ ← PostgreSQL + Auth
│  (Database)     │
└─────────────────┘
```

### デプロイ先

- **フロントエンド**: Vercel（GitHub連携で自動デプロイ）
- **バックエンド**: Google Cloud Run（手動デプロイ）
- **データベース**: Supabase（既にセットアップ済み）

### 所要時間

- **初回**: 合計 45〜60分
- **2回目以降**: 合計 5〜15分（フロントは自動）

---

## 🚀 クイックスタート

### 1. FastAPIをCloud Runにデプロイ

```bash
# 環境変数を設定
export GCP_PROJECT_ID="your-project-id"
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_KEY="eyJxxx..."

# デプロイ
cd backend
./deploy.sh
```

詳細: [FASTAPI_DEPLOYMENT.md](./FASTAPI_DEPLOYMENT.md)

### 2. Next.jsをVercelにデプロイ

1. https://vercel.com にアクセス
2. GitHubリポジトリをインポート
3. 環境変数を設定
4. デプロイボタンをクリック

詳細: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

---

## 📚 ドキュメント一覧

| ドキュメント | 内容 | 対象 |
|------------|------|------|
| [FASTAPI_DEPLOYMENT.md](./FASTAPI_DEPLOYMENT.md) | FastAPIのCloud Runデプロイ手順 | バックエンド |
| [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) | Next.jsのVercelデプロイ手順 | フロントエンド |
| [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | 環境変数の設定方法 | 全体 |

---

## 🔧 ファイル一覧

### バックエンド（backend/）

| ファイル | 説明 |
|---------|------|
| `Dockerfile` | Cloud Run用Dockerイメージ定義 |
| `.dockerignore` | Dockerビルド時の除外ファイル |
| `deploy.sh` | Cloud Runデプロイスクリプト |

---

## ⚡ デプロイフロー（推奨順序）

### Step 1: Supabase設定の確認

- [ ] Supabase Dashboard で URL と anon key を取得
- [ ] RLSポリシーが有効であることを確認

📖 参考: [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)

### Step 2: FastAPIをデプロイ

```bash
cd backend
./deploy.sh
```

- [ ] ビルド成功
- [ ] デプロイ成功
- [ ] サービスURLをメモ

📖 参考: [FASTAPI_DEPLOYMENT.md](./FASTAPI_DEPLOYMENT.md)

### Step 3: Next.jsをデプロイ

Vercel Dashboard で：

- [ ] リポジトリをインポート
- [ ] 環境変数を設定（Supabase + FastAPI URL）
- [ ] デプロイ実行

📖 参考: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### Step 4: 動作確認

- [ ] ログイン機能
- [ ] フレーズ登録
- [ ] フレーズ一覧表示
- [ ] タグ管理
- [ ] CSVエクスポート

---

## 🔄 更新デプロイ

### フロントエンド（Next.js）

**自動デプロイ**（GitHubプッシュ時）:

```bash
git add .
git commit -m "Update frontend"
git push origin main

# Vercelが自動的にデプロイ開始
```

### バックエンド（FastAPI）

**手動デプロイ**:

```bash
cd backend
./deploy.sh
```

---

## 💰 コスト見積もり

### 無料枠

すべて無料枠内で運用可能（個人開発の場合）：

| サービス | 無料枠 |
|---------|--------|
| **Supabase** | 500 MB データベース、無制限リクエスト |
| **Vercel** | 100 GB 帯域幅/月、無制限デプロイ |
| **Cloud Run** | 200万リクエスト/月、360,000 GB-秒/月 |

### 有料化の目安

- Supabase: データベースが500 MBを超えたら
- Vercel: 帯域幅が100 GB/月を超えたら
- Cloud Run: リクエストが200万/月を超えたら

---

## 🐛 トラブルシューティング

### 共通のエラー

| エラー | 原因 | 解決策 |
|-------|------|--------|
| "CORS error" | FastAPIのCORS設定 | `main.py` で Vercel ドメインを追加 |
| "API request failed" | 環境変数が間違っている | 環境変数を再確認 |
| "Build failed" | TypeScript エラー | ローカルで `npm run build` を実行 |
| "Permission denied" | GCP APIが無効 | `gcloud services enable` を実行 |

詳細は各ドキュメントのトラブルシューティングセクションを参照。

---

## 🔐 セキュリティチェックリスト

- [ ] `.env` や `.env.local` が `.gitignore` に含まれている
- [ ] `service_role` キーを使用していない（フロント）
- [ ] Supabase RLS（行レベルセキュリティ）が有効
- [ ] CORS設定が正しい（本番ドメインのみ許可）
- [ ] HTTPS が有効（Vercel, Cloud Run は自動）

---

## 📊 モニタリング

### Vercel

- **Analytics**: Vercel Dashboard → Analytics
- **ログ**: Vercel Dashboard → Deployments → Function Logs

### Cloud Run

- **メトリクス**: GCP Console → Cloud Run → Metrics
- **ログ**: `gcloud run services logs read quote-collector-api`

### Supabase

- **ダッシュボード**: Supabase Dashboard → Database → Usage
- **API ログ**: Supabase Dashboard → API → Logs

---

## 🎯 次のステップ

デプロイ完了後：

1. **カスタムドメインの設定**（オプション）
   - Vercel: Settings → Domains
   - Cloud Run: GCP Console → Cloud Run → Manage Custom Domains

2. **CI/CDの導入**（将来）
   - GitHub Actions で自動テスト
   - バックエンドの自動デプロイ

3. **モニタリングの強化**（将来）
   - Sentry でエラー追跡
   - Google Analytics でユーザー分析

---

## 📝 チェックリスト

### デプロイ前

- [ ] Supabase設定を確認
- [ ] `.gitignore` に環境変数ファイルが含まれている
- [ ] ローカルでビルドが成功する

### FastAPIデプロイ

- [ ] gcloud CLI インストール
- [ ] GCPプロジェクト作成
- [ ] 環境変数を設定
- [ ] `./deploy.sh` 実行
- [ ] サービスURLをメモ

### Next.jsデプロイ

- [ ] Vercelアカウント作成
- [ ] GitHubリポジトリ連携
- [ ] 環境変数を設定（Supabase + FastAPI URL）
- [ ] デプロイ実行

### デプロイ後

- [ ] ログイン機能の動作確認
- [ ] フレーズ登録の動作確認
- [ ] API接続の確認
- [ ] ブラウザコンソールでエラーがないか確認

---

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

**作成日**: 2025-11-03
**最終更新**: 2025-11-03
