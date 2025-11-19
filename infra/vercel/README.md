# Vercel デプロイ設定

## モノレポ対応

2025-11-19のモノレポ化により、フロントエンドコードが`frontend/`ディレクトリに移動しました。

## 設定方法

### 1. Vercel Dashboardで設定（必須）

**Settings** → **General** → **Root Directory** を **`frontend`** に設定してください。

これにより、Vercelは`frontend/`ディレクトリをプロジェクトのルートとして認識します。

### 2. vercel.json の場所

設定ファイルは `frontend/vercel.json` に配置されています（最小限の設定）:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

Next.jsフレームワークとして認識されれば、ビルドコマンドなどは自動検出されます。

## デプロイ方法

### GitHubから自動デプロイ（推奨）

1. Vercelプロジェクトを作成
2. GitHubリポジトリを接続
3. **Settings** → **General** で Root Directory を `frontend` に設定
4. プッシュするたびに自動デプロイ

### Vercel CLIでデプロイ

```bash
# プロジェクトルートで実行
vercel --prod
```

初回実行時は対話式でRoot Directoryを`frontend`に設定してください。

## 環境変数

Vercel Dashboardで以下の環境変数を設定してください:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (Cloud RunのバックエンドURL)

## トラブルシューティング

### エラー: Couldn't find any `pages` or `app` directory

**原因:** Root Directoryが設定されていない、またはプロジェクトルート（`/`）のままになっている

**解決策:** Vercel Dashboard → Settings → General → Root Directory を `frontend` に変更

## 参考リンク

- [Vercel Monorepo Documentation](https://vercel.com/docs/monorepos)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
