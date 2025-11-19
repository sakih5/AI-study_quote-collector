# Vercel デプロイ設定

## 設定ファイルの場所

**Vercel設定ファイルはプロジェクトルートに移動しました:**

- **設定ファイル**: `/vercel.json`（プロジェクトルート）
- **Root Directory**: `frontend`

## モノレポ対応

2025-11-19のモノレポ化により、Vercelの設定をプロジェクトルートに統一しました。

### vercel.json の内容

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "rootDirectory": "frontend"
}
```

`rootDirectory: "frontend"` により、Vercelは`frontend/`ディレクトリをプロジェクトルートとして扱います。

## デプロイ方法

### GitHubから自動デプロイ（推奨）

1. Vercelプロジェクトを作成
2. GitHubリポジトリを接続
3. Vercelが`vercel.json`を自動検出してビルド設定を適用

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

## 参考リンク

- [Vercel Monorepo Documentation](https://vercel.com/docs/monorepos)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
