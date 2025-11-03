# Next.js デプロイ手順（Vercel）

**対象**: Next.jsフロントエンドのVercelへのデプロイ
**所要時間**: 初回 15〜20分、2回目以降 自動

---

## 📋 前提条件

### 必要なもの

1. **Vercelアカウント**
   - 無料枠あり
   - GitHubアカウントで登録可能
   - https://vercel.com/signup

2. **GitHubリポジトリ**
   - プロジェクトがGitHubにプッシュされていること
   - プライベートリポジトリでもOK

3. **環境変数**
   - `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトURL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase匿名キー
   - `NEXT_PUBLIC_API_URL`: FastAPI のURL（Cloud Runデプロイ後）

---

## 🚀 デプロイ手順

### Step 1: Vercelアカウントの作成

1. https://vercel.com/signup にアクセス
2. 「Continue with GitHub」をクリック
3. GitHubアカウントでサインイン
4. Vercelの権限を承認

### Step 2: プロジェクトのインポート

1. Vercelダッシュボードで **「Add New...」** → **「Project」** をクリック
2. **「Import Git Repository」** を選択
3. GitHubリポジトリを選択: `AI-study_quote-collector`
4. **「Import」** をクリック

### Step 3: プロジェクト設定

#### フレームワーク検出

Vercelが自動的に検出：
- **Framework Preset**: Next.js
- **Root Directory**: `./` (ルート)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

特に変更不要。

#### 環境変数の設定

**「Environment Variables」** セクションで以下を追加：

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# FastAPI URL（Cloud Runデプロイ後に設定）
NEXT_PUBLIC_API_URL=https://quote-collector-api-xxx.a.run.app
```

**注意**: `NEXT_PUBLIC_API_URL` は、FastAPIをCloud Runにデプロイした後に設定してください。

### Step 4: デプロイの実行

1. すべての設定を確認
2. **「Deploy」** ボタンをクリック
3. ビルド＆デプロイが自動的に開始（約2〜3分）
4. 完了すると、デプロイURLが表示される

---

## 🔗 デプロイ後の設定

### 1. カスタムドメインの設定（オプション）

1. Vercelダッシュボードで **「Settings」** → **「Domains」**
2. **「Add Domain」** をクリック
3. 所有しているドメインを入力（例: `quote-collector.com`）
4. DNSレコードを設定（Vercelが指示を表示）

### 2. CORS設定の確認

FastAPIの`main.py`で以下を確認：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-app.vercel.app",  # Vercelのドメインを追加
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Vercelのデプロイ後、FastAPIを再デプロイしてCORS設定を更新してください。

### 3. Supabase RLS（行レベルセキュリティ）の確認

Vercelのドメインを Supabase の許可リストに追加（通常は自動）：

1. Supabase Dashboard → **「Settings」** → **「API」**
2. **「URL Configuration」** でドメインを確認

---

## ✅ デプロイ後の確認

### 1. デプロイURLの確認

Vercelダッシュボードで確認：
```
https://your-project-name.vercel.app
```

### 2. 動作テスト

1. デプロイURLにアクセス
2. ログイン機能をテスト
3. フレーズ登録・一覧表示をテスト
4. ブラウザの開発者ツールでエラーがないか確認

### 3. API接続の確認

ブラウザの開発者ツール（Network tab）で：
- FastAPI へのリクエストが成功していることを確認
- 401エラー（認証エラー）がないか確認
- CORS エラーがないか確認

---

## 🔄 自動デプロイの設定（既に有効）

Vercelは GitHubと連携しており、以下の動作が自動実行されます：

### プッシュ時の自動デプロイ

```bash
# ローカルで変更をコミット
git add .
git commit -m "Update feature"
git push origin main

# Vercelが自動的にデプロイを開始
# 2〜3分後、本番環境が更新される
```

### プレビューデプロイ

Pull Request作成時に、自動的にプレビュー環境が作成されます：

1. ブランチを作成: `git checkout -b feature/new-feature`
2. 変更をコミット＆プッシュ
3. GitHub で Pull Request を作成
4. **Vercelが自動的にプレビューURLを作成**
5. PRのコメントにプレビューURLが表示される

---

## 🔧 環境変数の更新

デプロイ後に環境変数を更新する場合：

### 方法1: Vercel Dashboard（GUI）

1. **「Settings」** → **「Environment Variables」**
2. 変更したい環境変数を編集
3. **「Save」** をクリック
4. **「Redeploy」** で再デプロイ

### 方法2: Vercel CLI

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# 環境変数を設定
vercel env add NEXT_PUBLIC_API_URL production
# プロンプトで値を入力

# 再デプロイ
vercel --prod
```

---

## 📊 ログの確認

### Vercel Dashboardでログを表示

1. **「Deployments」** タブをクリック
2. デプロイを選択
3. **「Function Logs」** または **「Build Logs」** を確認

### リアルタイムログ（CLI）

```bash
vercel logs --follow
```

---

## 💰 コスト管理

### 無料枠（Hobby Plan）

- **デプロイ**: 無制限
- **帯域幅**: 100 GB/月
- **サーバーレス関数実行時間**: 100 GB-時間/月
- **ビルド時間**: 6,000分/月

個人開発であれば無料枠内で収まる可能性が高い。

### プランのアップグレード

必要に応じて Pro Plan（月$20）にアップグレード可能：
- 帯域幅: 1 TB/月
- サーバーレス関数実行時間: 1,000 GB-時間/月
- チーム機能、カスタムドメイン無制限など

---

## ❌ デプロイの削除

プロジェクトを削除する場合：

1. Vercel Dashboard → **「Settings」** → **「General」**
2. 下にスクロール → **「Delete Project」**
3. プロジェクト名を入力して確認

---

## 🐛 トラブルシューティング

### エラー: "Build failed"

**原因**: ビルドエラー（TypeScriptエラー、依存関係の問題など）

**解決策**:
1. ローカルでビルドを実行: `npm run build`
2. エラーを修正
3. 再度プッシュ

### エラー: "API request failed with CORS error"

**原因**: FastAPIのCORS設定にVercelのドメインが含まれていない

**解決策**:
1. FastAPIの`main.py`を更新:
   ```python
   allow_origins=[
       "https://your-vercel-app.vercel.app",
       "http://localhost:3000",
   ]
   ```
2. FastAPIを再デプロイ

### エラー: "Environment variable not found"

**原因**: 環境変数が設定されていない

**解決策**:
1. Vercel Dashboard → **「Settings」** → **「Environment Variables」**
2. 必要な環境変数を追加
3. **「Redeploy」** で再デプロイ

### エラー: "Function invocation timed out"

**原因**: サーバーレス関数の実行時間が制限を超えた

**解決策**:
1. 処理を最適化（データベースクエリ、API呼び出しなど）
2. 必要に応じてPro Planにアップグレード（タイムアウト制限が緩和）

---

## 🔐 セキュリティのベストプラクティス

### 1. 環境変数の保護

- **絶対に `.env.local` をGitにコミットしない**
- `.gitignore` に `.env.local` が含まれていることを確認

### 2. APIキーの管理

- `NEXT_PUBLIC_` プレフィックスは **ブラウザに公開される**
- シークレットキーは **サーバーサイドのみ** で使用
- Supabaseの `SERVICE_ROLE_KEY` は **使用しない**（クライアントサイド）

### 3. HTTPS の使用

- Vercelは自動的にHTTPSを有効化
- カスタムドメインもHTTPS対応

---

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 📝 デプロイチェックリスト

- [ ] Vercelアカウント作成
- [ ] GitHubリポジトリ連携
- [ ] プロジェクトインポート
- [ ] 環境変数設定（Supabase）
- [ ] 初回デプロイ
- [ ] FastAPI URL設定（`NEXT_PUBLIC_API_URL`）
- [ ] 再デプロイ
- [ ] 動作テスト（ログイン、フレーズ登録）
- [ ] CORS設定確認
- [ ] 本番環境でのエラーチェック

---

**作成日**: 2025-11-03
**最終更新**: 2025-11-03
