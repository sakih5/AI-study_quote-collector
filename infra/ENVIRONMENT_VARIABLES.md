# 環境変数設定ガイド

**概要**: すべての環境での環境変数設定方法

---

## 📋 環境変数一覧

### Next.js（フロントエンド）

| 変数名 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | ✅ | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー | ✅ | `eyJhbGc...` |
| `NEXT_PUBLIC_API_URL` | FastAPI バックエンドURL | ✅ | `https://api.example.com` |

### FastAPI（バックエンド）

| 変数名 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| `SUPABASE_URL` | SupabaseプロジェクトURL | ✅ | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase匿名キー | ✅ | `eyJhbGc...` |
| `PORT` | サーバーポート | ⚠️ | `8000` (Cloud Runは自動設定) |

---

## 🔧 Supabase設定値の取得

### 1. Supabase Dashboardにアクセス

https://app.supabase.com/ にログイン

### 2. プロジェクト設定を開く

1. 対象プロジェクトを選択
2. 左サイドバーで **「Settings」** → **「API」** をクリック

### 3. 値をコピー

**Project URL**:
```
https://xxx.supabase.co
```
→ `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_URL` に使用

**anon public key**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzd...
```
→ `NEXT_PUBLIC_SUPABASE_ANON_KEY` と `SUPABASE_ANON_KEY` に使用

**⚠️ 注意**: `service_role` キーは絶対に公開しないでください！

---

## 💻 ローカル開発環境

### Next.js（ルートディレクトリ）

`.env.local` ファイルを作成：

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**作成方法**:
```bash
cd /path/to/AI-study_quote-collector
touch .env.local
# エディタで上記内容を記入
```

### FastAPI（backend/ディレクトリ）

`.env` ファイルを作成：

```bash
# .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGc...
PORT=8000
```

**作成方法**:
```bash
cd /path/to/AI-study_quote-collector/backend
touch .env
# エディタで上記内容を記入
```

### .gitignoreの確認

**重要**: 環境変数ファイルをGitにコミットしないこと！

`.gitignore` に以下が含まれているか確認：

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

---

## ☁️ Cloud Run（FastAPI）

### 方法1: デプロイスクリプト経由

環境変数をシェルに設定：

```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_KEY="eyJhbGc..."
```

デプロイスクリプト実行：

```bash
cd backend
./deploy.sh
```

スクリプトが自動的に環境変数をCloud Runに設定します。

### 方法2: gcloudコマンド経由

```bash
gcloud run services update quote-collector-api \
  --platform managed \
  --region asia-northeast1 \
  --update-env-vars="SUPABASE_URL=https://xxx.supabase.co,SUPABASE_KEY=eyJhbGc..."
```

### 方法3: Cloud Console（GUI）

1. https://console.cloud.google.com/run にアクセス
2. `quote-collector-api` サービスを選択
3. **「Edit & Deploy New Revision」** をクリック
4. **「Variables & Secrets」** タブをクリック
5. 環境変数を追加：
   - `SUPABASE_URL`: `https://xxx.supabase.co`
   - `SUPABASE_KEY`: `eyJhbGc...`
6. **「Deploy」** をクリック

---

## 🚀 Vercel（Next.js）

### 方法1: Vercel Dashboard（GUI）

1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. **「Settings」** → **「Environment Variables」** をクリック
4. 以下を追加：

   **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   **Value**: `https://xxx.supabase.co`
   **Environment**: `Production`, `Preview`, `Development` すべてチェック

   **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   **Value**: `eyJhbGc...`
   **Environment**: `Production`, `Preview`, `Development` すべてチェック

   **Name**: `NEXT_PUBLIC_API_URL`
   **Value**: `https://quote-collector-api-xxx.a.run.app`
   **Environment**: `Production`, `Preview`, `Development` すべてチェック

5. **「Save」** をクリック
6. **「Deployments」** タブ → **「Redeploy」** で再デプロイ

### 方法2: Vercel CLI

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# 環境変数を設定（Productionのみ）
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# プロンプトで値を入力: https://xxx.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# プロンプトで値を入力: eyJhbGc...

vercel env add NEXT_PUBLIC_API_URL production
# プロンプトで値を入力: https://quote-collector-api-xxx.a.run.app

# 再デプロイ
vercel --prod
```

---

## 🔄 デプロイフロー

### 推奨順序

1. **FastAPI をCloud Runにデプロイ**
   ```bash
   cd backend
   export SUPABASE_URL="https://xxx.supabase.co"
   export SUPABASE_KEY="eyJhbGc..."
   ./deploy.sh
   ```

2. **FastAPIのURLをメモ**
   ```
   https://quote-collector-api-xxx.a.run.app
   ```

3. **VercelにNext.jsをデプロイ**
   - Vercel Dashboard で環境変数を設定
   - `NEXT_PUBLIC_API_URL` にFastAPIのURLを設定
   - デプロイ

4. **動作確認**
   - Vercelのデプロイ完了を待つ
   - ブラウザでアクセス
   - ログイン・フレーズ登録をテスト

---

## 🔐 セキュリティのベストプラクティス

### 1. 環境変数の保護

- **絶対に `.env` や `.env.local` をGitにコミットしない**
- `.gitignore` に含まれていることを確認
- チームメンバーとは別の方法で共有（1Password、LastPass等）

### 2. キーの種類を理解する

| キーの種類 | 用途 | 公開可否 |
|----------|------|---------|
| `anon key` | フロントエンド | ✅ 公開OK（RLSで保護） |
| `service_role key` | バックエンド | ❌ 絶対に秘密 |

**重要**: `service_role` キーはRLSをバイパスするため、絶対に公開しないこと！

### 3. NEXT_PUBLIC_ プレフィックス

- `NEXT_PUBLIC_` がつく変数は **ブラウザに公開される**
- シークレット情報には使用しない
- 例: APIキー、パスワード等

---

## 🐛 トラブルシューティング

### エラー: "Supabase client failed to initialize"

**原因**: 環境変数が設定されていない、または間違っている

**解決策**:
1. 環境変数の値を確認
2. スペースや改行が含まれていないか確認
3. 再デプロイ

### エラー: "API request failed"

**原因**: `NEXT_PUBLIC_API_URL` が間違っている

**解決策**:
1. FastAPIのURLを確認
2. 末尾の `/` がないことを確認
3. HTTPSであることを確認

### エラー: "Invalid API key"

**原因**: `anon key` の値が間違っている

**解決策**:
1. Supabase Dashboard でキーを再確認
2. コピペミスがないか確認
3. 環境変数を更新して再デプロイ

---

## 📝 チェックリスト

### ローカル開発

- [ ] `.env.local` 作成（Next.js）
- [ ] `.env` 作成（FastAPI）
- [ ] Supabase URLとキーを設定
- [ ] `.gitignore` に `.env*` が含まれている

### FastAPI（Cloud Run）

- [ ] `SUPABASE_URL` 設定
- [ ] `SUPABASE_KEY` 設定
- [ ] デプロイ実行
- [ ] サービスURLをメモ

### Next.js（Vercel）

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 設定
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 設定
- [ ] `NEXT_PUBLIC_API_URL` 設定（FastAPIのURL）
- [ ] デプロイ実行
- [ ] 動作確認

---

## 📚 参考リンク

- [Supabase API Settings](https://app.supabase.com/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**作成日**: 2025-11-03
**最終更新**: 2025-11-03
