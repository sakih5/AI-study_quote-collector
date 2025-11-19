# Vercel デプロイ設定

## モノレポ対応

2025-11-19のモノレポ化により、フロントエンドコードが`frontend/`ディレクトリに移動しました。

## 設定ファイル

### プロジェクトルートの設定

**`/vercel.json`** (プロジェクトルート):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd frontend && npm run build",
  "installCommand": "npm install --prefix frontend",
  "outputDirectory": "frontend/.next"
}
```

**`/package.json`** (プロジェクトルート):

```json
{
  "name": "quote-collector-monorepo",
  "scripts": {
    "vercel-build": "cd frontend && npm run build"
  },
  "workspaces": ["frontend"]
}
```

この構成により、Vercelは：
1. `npm install --prefix frontend` でfrontendの依存をインストール
2. `cd frontend && npm run build` でNext.jsをビルド
3. `frontend/.next` を出力ディレクトリとして認識

## デプロイ方法

### GitHubから自動デプロイ（推奨）

1. Vercelプロジェクトを作成
2. GitHubリポジトリを接続
3. `vercel.json`が自動検出され、ビルド設定が適用される
4. プッシュするたびに自動デプロイ

**重要:** Root Directory設定は**不要**です。`vercel.json`の`buildCommand`が自動的に`frontend/`ディレクトリでビルドを実行します。

### Vercel CLIでデプロイ

```bash
# プロジェクトルートで実行
vercel --prod
```

## 環境変数

Vercel Dashboardで以下の環境変数を設定してください:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (Cloud RunのバックエンドURL)

## トラブルシューティング

### エラー: Couldn't find any `pages` or `app` directory

**原因:** `vercel.json`の`buildCommand`が正しく設定されていない

**解決策:** プロジェクトルートの`vercel.json`を確認し、`buildCommand: "cd frontend && npm run build"`が設定されているか確認

### ビルドが遅い

**原因:** Vercelが毎回すべての依存をインストールしている

**解決策:** Vercelは自動的にnode_modulesをキャッシュします。初回ビルドは遅いですが、2回目以降は高速化されます。

## 参考リンク

- [Vercel Monorepo Documentation](https://vercel.com/docs/monorepos)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Vercel Build Configuration](https://vercel.com/docs/projects/project-configuration)
